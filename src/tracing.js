'use strict';

const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');

// 🔧 Use INFO for better debugging in ECS (change to ERROR later if needed)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');

const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { LoggerProvider, BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { logs } = require('@opentelemetry/api-logs');

// ✅ Fallback to localhost (prevents crash if env missing)
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

// 🔍 Debug log
console.log("📡 OTEL endpoint:", endpoint);

// ✅ Optional headers (ONLY for SigNoz cloud, ignored otherwise)
const headers = process.env.SIGNOZ_INGESTION_KEY
? { 'signoz-access-token': process.env.SIGNOZ_INGESTION_KEY }
: undefined;

// ---------------- TRACE ----------------
const traceExporter = new OTLPTraceExporter({
url: `${endpoint}/v1/traces`,
headers,
});

// ---------------- METRICS ----------------
const metricExporter = new OTLPMetricExporter({
url: `${endpoint}/v1/metrics`,
headers,
});

const metricReader = new PeriodicExportingMetricReader({
exporter: metricExporter,
exportIntervalMillis: 10000, // ⏱️ export every 10 seconds
});

// ---------------- LOGS ----------------
const logExporter = new OTLPLogExporter({
url: `${endpoint}/v1/logs`,
headers,
});

const loggerProvider = new LoggerProvider();

loggerProvider.addLogRecordProcessor(
new BatchLogRecordProcessor(logExporter)
);

logs.setGlobalLoggerProvider(loggerProvider);

// ✅ Global logger
const logger = logs.getLogger('shoptrace-logger');
global.otelLogger = logger;

// ---------------- SDK ----------------
const sdk = new NodeSDK({
traceExporter,
metricReader,
instrumentations: [getNodeAutoInstrumentations()],
});

// ✅ Start SDK safely
// Note: sdk.start() returns void in older versions of @opentelemetry/sdk-node,
// so we cannot chain .then()/.catch() on it directly.
try {
  sdk.start();
  console.log("✅ OpenTelemetry initialized");
} catch (err) {
  console.error("❌ Error initializing OpenTelemetry", err);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('🔴 OpenTelemetry shut down'))
    .catch((err) => console.error('❌ Error shutting down OpenTelemetry', err))
    .finally(() => process.exit(0));
});

// ---------------- START APP ----------------
require('./app');