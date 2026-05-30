"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const isEnabled = process.env.OTEL_ENABLED !== 'false';
let sdk = null;
exports.sdk = sdk;
if (isEnabled) {
    const exporter = new exporter_jaeger_1.JaegerExporter({
        endpoint: process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ?? 'http://localhost:14268/api/traces',
    });
    exports.sdk = sdk = new sdk_node_1.NodeSDK({
        serviceName: process.env.OTEL_SERVICE_NAME ?? 'ats-analyzer-backend',
        traceExporter: exporter,
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': { enabled: false },
                '@opentelemetry/instrumentation-dns': { enabled: false },
                '@opentelemetry/instrumentation-net': { enabled: false },
            }),
        ],
    });
    sdk.start();
    console.log('[OpenTelemetry] Tracing enabled → Jaeger at', process.env.OTEL_EXPORTER_JAEGER_ENDPOINT ?? 'http://localhost:14268');
}
process.on('SIGTERM', () => {
    sdk?.shutdown().finally(() => process.exit(0));
});
//# sourceMappingURL=tracing.js.map