import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  getNodeAutoInstrumentations
} from '@opentelemetry/auto-instrumentations-node';

import {
  OTLPTraceExporter
} from '@opentelemetry/exporter-trace-otlp-http';

export const initTelemetry = () => {
  const traceExporter =
    new OTLPTraceExporter({
      url: 'http://jaeger:4318/v1/traces'
    });

  const sdk = new NodeSDK({
    traceExporter,
    resource: resourceFromAttributes({
      'service.name': process.env.SERVICE_NAME || 'unknown-service'
    }),
    instrumentations: [
      getNodeAutoInstrumentations()
    ]
  });

  sdk.start();

  console.log(
    `Tracing initialized for ${process.env.SERVICE_NAME || 'unknown-service'}`
  );

}