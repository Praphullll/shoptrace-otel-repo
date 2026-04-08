'use strict'

const express = require('express')
const { Pool } = require('pg')
const { trace, metrics } = require('@opentelemetry/api')
const { logs, SeverityNumber } = require('@opentelemetry/api-logs')

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// ── OTel Logger ───────────────────────────────────────────────
//  Uses the LoggerProvider registered in tracing.js.
//  Each log record is automatically correlated to the active
//  trace via traceId + spanId — this is "Logs in Context".
const logger = logs.getLogger('shoptrace-simple', '1.0.0')

function log(level, message, attributes = {}) {
  const span = trace.getActiveSpan()
  const spanCtx = span?.spanContext()

  const severityNumber = level === 'error' ? SeverityNumber.ERROR
    : level === 'warn' ? SeverityNumber.WARN
      : SeverityNumber.INFO

  // Emit structured log record to New Relic via OTel pipeline
  logger.emit({
    severityNumber,
    severityText: level.toUpperCase(),
    body: message,
    attributes: {
      'service.name': process.env.SERVICE_NAME || 'shoptrace-simple',
      ...attributes,
    },
  })

  // Also print to stdout so docker logs still shows output
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    traceId: spanCtx?.traceId || '',
    spanId: spanCtx?.spanId || '',
    ...attributes,
  }))
}

// ── Custom Metrics ────────────────────────────────────────────
const meter = metrics.getMeter('shoptrace-simple')
const orderCounter = meter.createCounter('orders.created', { description: 'Total orders placed' })
const errorCounter = meter.createCounter('app.errors', { description: 'Total errors' })
const orderValueHisto = meter.createHistogram('order.value', { description: 'Order value in USD' })

// ── PostgreSQL pool ───────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    'postgres://shoptrace:shoptrace123@localhost:5432/shoptrace',
})
pool.on('error', (err) => log('error', 'DB pool error', { error: err.message }))

// ─────────────────────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────────────────────

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    log('info', 'Health check OK')
    res.json({ status: 'ok', service: 'shoptrace-simple', db: 'ok' })
  } catch (err) {
    log('error', 'Health check failed', { error: err.message })
    res.status(503).json({ status: 'error', db: 'unreachable' })
  }
})

app.get('/products', async (req, res) => {
  log('info', 'Fetching product list')
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, price, stock FROM products ORDER BY name'
    )
    log('info', 'Products returned', { count: rows.length })
    res.json(rows)
  } catch (err) {
    errorCounter.add(1, { route: '/products' })
    log('error', 'Failed to fetch products', { error: err.message })
    res.status(500).json({ error: 'Could not fetch products' })
  }
})

app.post('/orders', async (req, res) => {
  const { customer_email, product_id, quantity } = req.body

  if (!customer_email || !product_id || !quantity) {
    return res.status(400).json({
      error: 'customer_email, product_id, and quantity are required'
    })
  }

  const activeSpan = trace.getActiveSpan()
  activeSpan?.setAttribute('customer.email', customer_email)
  activeSpan?.setAttribute('order.product_id', product_id)
  activeSpan?.setAttribute('order.quantity', quantity)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    log('info', 'Checking product stock', { product_id, quantity })
    const { rows: [product] } = await client.query(
      'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    )
    if (!product) {
      await client.query('ROLLBACK')
      log('warn', 'Product not found', { product_id })
      return res.status(404).json({ error: 'Product not found' })
    }
    if (product.stock < quantity) {
      await client.query('ROLLBACK')
      log('warn', 'Insufficient stock', { product_id, requested: quantity, available: product.stock })
      return res.status(409).json({ error: 'Insufficient stock', available: product.stock })
    }

    const total = (parseFloat(product.price) * quantity).toFixed(2)
    const { rows: [order] } = await client.query(
      `INSERT INTO orders (customer_email, product_id, product_name, quantity, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, 'confirmed') RETURNING *`,
      [customer_email, product_id, product.name, quantity, total]
    )

    await client.query(
      'UPDATE products SET stock = stock - $1 WHERE id = $2',
      [quantity, product_id]
    )

    await client.query('COMMIT')

    orderCounter.add(1, { product: product.name })
    orderValueHisto.record(parseFloat(total))
    activeSpan?.setAttribute('order.id', order.id)
    activeSpan?.setAttribute('order.total', parseFloat(total))

    log('info', 'Order created', {
      order_id: order.id,
      product: product.name,
      total,
      customer_email,
    })

    res.status(201).json(order)

  } catch (err) {
    await client.query('ROLLBACK')
    errorCounter.add(1, { route: '/orders' })
    activeSpan?.recordException(err)
    activeSpan?.setStatus({ code: 2, message: err.message })
    log('error', 'Order failed', { error: err.message })
    res.status(500).json({ error: 'Order processing failed' })
  } finally {
    client.release()
  }
})

app.get('/orders/:id', async (req, res) => {
  try {
    const { rows: [order] } = await pool.query(
      'SELECT * FROM orders WHERE id = $1', [req.params.id]
    )
    if (!order) return res.status(404).json({ error: 'Order not found' })
    log('info', 'Order fetched', { order_id: req.params.id })
    res.json(order)
  } catch (err) {
    log('error', 'Failed to fetch order', { error: err.message })
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

app.get('/simulate/error', (req, res) => {
  const activeSpan = trace.getActiveSpan()
  const err = new Error('Simulated error — testing New Relic error tracking')
  activeSpan?.recordException(err)
  activeSpan?.setStatus({ code: 2, message: err.message })
  errorCounter.add(1, { route: '/simulate/error' })
  log('error', 'Simulated error triggered', { intentional: true })
  res.status(500).json({ error: err.message })
})

app.get('/simulate/slow', async (req, res) => {
  const delay = parseInt(req.query.ms) || 3000
  log('info', 'Simulating slow response', { delay_ms: delay })
  await new Promise(r => setTimeout(r, delay))
  log('info', 'Slow response completed', { delay_ms: delay })
  res.json({ message: `Responded after ${delay}ms` })
})

app.listen(PORT, () => {
  log('info', `ShopTrace Simple started on port ${PORT}`)
  console.log(`[App] Listening on http://localhost:${PORT}`)
})
