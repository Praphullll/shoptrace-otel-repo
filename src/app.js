'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// app.js — ShopTrace Express application
//
// Every route creates a MANUAL span so we control:
//   • span name and attributes
//   • error recording
//   • log correlation (trace_id + span_id stamped on every log line)
//   • custom metrics (order counter, order duration histogram)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// OTel API handles — these are always safe to call even before the SDK starts
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const { metrics } = require('@opentelemetry/api');
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(cors()); // Allow the React dev server (localhost:5173) to call this API

// ── OTel handles ──────────────────────────────────────────────────────────────
const tracer = trace.getTracer('shoptrace-simple', '1.0.0');
const meter = metrics.getMeter('shoptrace-simple', '1.0.0');
const logger = logs.getLogger('shoptrace-simple', '1.0.0');

// ── Custom metrics ─────────────────────────────────────────────────────────
// Counter: increments each time an order is created
const ordersCreated = meter.createCounter('orders.created.total', {
  description: 'Total number of orders created',
});

// Histogram: records how long the full order-create path takes (ms)
const orderDurationMs = meter.createHistogram('orders.processing.duration_ms', {
  description: 'End-to-end order processing time in milliseconds',
  unit: 'ms',
});

// Counter: tracks product list views
const productViews = meter.createCounter('products.views.total', {
  description: 'Number of times the product list was fetched',
});

// ── Database pool ─────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Emit a structured log record that is automatically correlated to the
 * currently-active OTel span (trace_id + span_id stamped on every record).
 * SigNoz uses these fields to link logs → traces in the UI.
 */
function emitLog(severityNumber, message, attributes = {}) {
  const activeSpan = trace.getActiveSpan();
  const spanCtx = activeSpan?.spanContext();

  logger.emit({
    severityNumber,
    severityText: Object.keys(SeverityNumber).find(
      k => SeverityNumber[k] === severityNumber
    ) ?? 'INFO',
    body: message,
    attributes: {
      'service.name': process.env.OTEL_SERVICE_NAME || 'shoptrace-simple',
      ...(spanCtx ? { trace_id: spanCtx.traceId, span_id: spanCtx.spanId } : {}),
      ...attributes,
    },
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /health  — liveness + DB connectivity check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    emitLog(SeverityNumber.INFO, 'Health check passed');
    res.json({ status: 'ok', service: 'shoptrace-simple', db: 'ok' });
  } catch (err) {
    emitLog(SeverityNumber.ERROR, 'Health check failed', { error: err.message });
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// GET /products  — list all products
app.get('/products', async (req, res) => {
  // Start a manual span so we can attach custom attributes
  const span = tracer.startSpan('list-products');

  await context.with(trace.setSpan(context.active(), span), async () => {
    try {
      productViews.add(1);
      const result = await pool.query('SELECT * FROM products ORDER BY name');

      span.setAttribute('products.count', result.rows.length);
      emitLog(SeverityNumber.INFO, 'Products listed', { count: result.rows.length });

      res.json(result.rows);
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      emitLog(SeverityNumber.ERROR, 'Failed to list products', { error: err.message });
      res.status(500).json({ error: err.message });
    } finally {
      span.end();
    }
  });
});

// POST /orders  — place an order (main trace to watch in SigNoz)
app.post('/orders', async (req, res) => {
  const { customer_email, product_id, quantity } = req.body;

  if (!customer_email || !product_id || !quantity) {
    return res.status(400).json({ error: 'customer_email, product_id and quantity are required' });
  }

  const orderId = uuidv4();
  const start = Date.now();

  // This span becomes the parent of the two pg child spans below
  const span = tracer.startSpan('create-order');

  await context.with(trace.setSpan(context.active(), span), async () => {
    // Stamp what we know up front so SigNoz shows it even if we error later
    span.setAttributes({
      'order.id': orderId,
      'order.customer_email': customer_email,
      'order.product_id': product_id,
      'order.quantity': Number(quantity),
    });

    try {
      // Child span #1 — SELECT product (auto-created by PgInstrumentation)
      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1', [product_id]
      );

      if (productResult.rows.length === 0) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Product not found' });
        emitLog(SeverityNumber.WARN, 'Order rejected: product not found', { product_id });
        span.end();
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = productResult.rows[0];
      const total_amount = parseFloat(product.price) * Number(quantity);

      // Child span #2 — INSERT order (auto-created by PgInstrumentation)
      await pool.query(
        `INSERT INTO orders (id, customer_email, product_id, quantity, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, 'confirmed')`,
        [orderId, customer_email, product_id, quantity, total_amount]
      );

      const duration = Date.now() - start;

      // Record custom metrics with product label
      ordersCreated.add(1, { 'product.name': product.name });
      orderDurationMs.record(duration, { 'product.name': product.name });

      // Enrich the span with result data
      span.setAttributes({
        'order.total_amount': total_amount,
        'order.product_name': product.name,
        'order.duration_ms': duration,
        'order.status': 'confirmed',
      });

      // Grab the trace ID so we can return it to the caller
      const traceId = span.spanContext().traceId;

      emitLog(SeverityNumber.INFO, 'Order created', {
        order_id: orderId,
        product: product.name,
        total_amount,
        duration_ms: duration,
      });

      res.status(201).json({
        order_id: orderId,
        product: product.name,
        quantity: Number(quantity),
        total_amount,
        status: 'confirmed',
        trace_id: traceId,  // ← React frontend uses this to deep-link into SigNoz
      });
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      emitLog(SeverityNumber.ERROR, 'Order creation failed', {
        error: err.message,
        order_id: orderId,
      });
      res.status(500).json({ error: err.message });
    } finally {
      span.end();
    }
  });
});

// GET /simulate/error  — trigger a recorded error span (useful for SigNoz alert testing)
app.get('/simulate/error', (req, res) => {
  const span = tracer.startSpan('simulate-error');
  context.with(trace.setSpan(context.active(), span), () => {
    const err = new Error('Simulated error — for observability testing only');
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    emitLog(SeverityNumber.ERROR, err.message, { simulated: true });
    const traceId = span.spanContext().traceId;
    span.end();
    res.status(500).json({ error: err.message, trace_id: traceId });
  });
});

// GET /simulate/slow?ms=3000  — create an artificial latency span
app.get('/simulate/slow', async (req, res) => {
  const ms = Math.min(parseInt(req.query.ms) || 2000, 10_000); // cap at 10 s
  const span = tracer.startSpan('simulate-slow-response');

  await context.with(trace.setSpan(context.active(), span), async () => {
    span.setAttribute('simulate.delay_ms', ms);
    await new Promise(resolve => setTimeout(resolve, ms));
    emitLog(SeverityNumber.WARN, 'Slow response simulation complete', { delay_ms: ms });
    const traceId = span.spanContext().traceId;
    span.end();
    res.json({ message: `Responded after ${ms} ms`, trace_id: traceId });
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`[app] ShopTrace listening on http://localhost:${PORT}`);
});