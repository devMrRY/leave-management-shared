# leave-management-shared

Shared utilities and clients used across leave-management microservices.

## Contents
- `consul/` — Consul client & service registry helpers
- `httpClient/` — lightweight HTTP client helpers
- `logger/` — pino-based logger setup
- `rabbitMQ/` — publisher/consumer helpers for RabbitMQ
- `telemetry/` — OpenTelemetry initialization helpers

## Install
This package is referenced by services via the Git URL in `package.json`:

```json
"@myorg/shared": "git+https://github.com/devMrRY/leave-management-shared.git"
```

Alternatively, add it to your workspace and use TypeScript path mappings during development.

## Usage
Import helpers where needed, e.g.:

```ts
import { serviceRegistry } from "@myorg/shared";
import { connectChannel } from "@myorg/shared/rabbitMQ";
```

Note: consumers/builds assume compiled output when running services in production. Use the service `rebuild` script (or TypeScript build) before creating Docker images.

## Build
From the `leave-management-shared` folder:

```bash
npm ci
npm run build
```

## Contributing
Keep exports stable; add new helpers under clear folders and export them via `src/index.ts`.

## License
Proprietary/internal (follow repo guidelines).
