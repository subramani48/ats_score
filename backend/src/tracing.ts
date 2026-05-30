/**
 * OpenTelemetry tracing setup.
 * This file must be imported BEFORE any NestJS/Express modules.
 *
 * Usage: add `--require ./dist/tracing` to the node start command, or
 *        import this at the very top of main.ts for development.
 *
 * Traces are exported to Jaeger (default: http://localhost:14268/api/traces).
 * Set OTEL_EXPORTER_JAEGER_ENDPOINT env var to override.
 * Set OTEL_ENABLED=false to disable tracing entirely.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const isEnabled = process.env.OTEL_ENABLED !== 'false';

let sdk: NodeSDK | null = null;

if (isEnabled) {
  const exporter = new JaegerExporter({
    endpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ?? 'http://localhost:14268/api/traces',
  });

  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'ats-analyzer-backend',
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Reduce noise — only instrument HTTP, PostgreSQL, Redis
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log('[OpenTelemetry] Tracing enabled → Jaeger at', process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ?? 'http://localhost:14268');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk?.shutdown().finally(() => process.exit(0));
});

export { sdk };
