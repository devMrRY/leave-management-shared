"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const initTelemetry = () => {
    const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
        url: 'http://jaeger:4318/v1/traces'
    });
    const sdk = new sdk_node_1.NodeSDK({
        traceExporter,
        resource: (0, resources_1.resourceFromAttributes)({
            'service.name': process.env.SERVICE_NAME || 'unknown-service'
        }),
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)()
        ]
    });
    sdk.start();
    console.log(`Tracing initialized for ${process.env.SERVICE_NAME || 'unknown-service'}`);
};
exports.initTelemetry = initTelemetry;
