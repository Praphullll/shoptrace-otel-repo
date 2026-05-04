'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// tracing.js — OTel SDK bootstrap for ShopTrace → SigNoz
//
// MUST be the first file Node.js loads (`node src/tracing.js`).
// It wires up Traces, Metrics, and Logs, then requires app.js.
// ─────────────────────────────────────────────────────────────────────────────

const { NodeSDK }                        = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter }             = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter }            = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter }               = require('@opentelemetry/exporter-logs-otlp-http');
const { Resource }                       = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME,
        SEMRESATTRS_SERVICE_VERSION }    = require('@opentelemetry/semantic-conventions');
const { BatchSpanProcessor }            = require('@opentelemetry/sdk-trace-base');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor }       = require('@opentelemetry/sdk-logs');

// Specific instrumentations — only what ShopTrace actually uses.
// We do NOT use getNodeAutoInstrumentations() because:
//  (a) it pulls in ~40 packages you don't need
//  (b) custom spans give you full control over what gets traced and how
const { HttpInstrumentation }     = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation }  = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation }       = require('@opentelemetry/instrumentation-pg');

// ── Config ────────────────────────────────────────────────────────────────────
const ENDPOINT     = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME            || 'shoptrace-simple';
const ENV          = process.env.NODE_ENV                      || 'development';

// ── Resource: who we are ─────────────────────────────────────────────────────
const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]:    SERVICE_NAME,
  [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
  'deployment.environment':      ENV,
});

// ── SDK ───────────────────────────────────────────────────────────────────────
const sdk = new NodeSDK({
  resource,

  // Traces → OTLP HTTP → OTel Collector → SigNoz
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({ url: `${ENDPOINT}/v1/traces` })
  ),

  // Metrics → OTLP HTTP, exported every 10 s
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${ENDPOINT}/v1/metrics` }),
    exportIntervalMillis: 10_000,
  }),

  // Logs → OTLP HTTP
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({ url: `${ENDPOINT}/v1/logs` })
  ),

  // Only instrument the three libraries ShopTrace actually uses
  instrumentations: [
    new HttpInstrumentation(),    // auto-traces every Express HTTP req/res
    new ExpressInstrumentation(), // adds route, method attributes to spans
    new PgInstrumentation(),      // wraps every pool.query() in a child span
  ],
});

sdk.start();
console.log(`[tracing] OTel SDK started — exporting to ${ENDPOINT}`);

// Graceful shutdown on SIGTERM (Docker stop / k8s pod eviction)
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[tracing] SDK shut down cleanly'))
    .catch(err => console.error('[tracing] SDK shutdown error', err))
    .finally(() => process.exit(0));
});

// Boot the actual application now that instrumentation is active
require('./app');
