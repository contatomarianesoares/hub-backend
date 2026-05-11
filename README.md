# Hub JuriAlvo Backend - Evolution Webhook Receiver

## Overview

Hub JuriAlvo Backend is a WhatsApp campaign management platform that processes Evolution API webhooks to track message and connection status in real-time.

## Task 10: Evolution Webhook Receiver

This module implements the webhook receiver for the Evolution API, handling:
- **MESSAGES_UPDATE**: Track message delivery status (sent, delivered, read, error)
- **CONNECTION_UPDATE**: Track WhatsApp connection status (connected, disconnected)

## Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
npm run test:coverage
```

## API Endpoints

### POST /webhooks/evolution
Receives webhook events from Evolution API.

**Response**: `200 OK` immediately with `{ success: true }`

**Processing**: Asynchronous (fire-and-forget pattern)

### GET /health
Health check endpoint.

**Response**: `{ status: 'ok', timestamp: '2025-05-06T...' }`

## Webhook Events

### MESSAGES_UPDATE
```json
{
  "event": "MESSAGES_UPDATE",
  "data": {
    "instanceName": "hub_123",
    "messageId": "msg_xyz789",
    "messageStatus": "sent|delivered|read|error|pending"
  }
}
```

Status Mapping:
- `sent` → `enviado`
- `delivered` → `entregue` (with `entregue_at` timestamp)
- `read` → `lido` (with `lido_at` timestamp)
- `error` → `erro` (with error message)
- `pending` → ignored

### CONNECTION_UPDATE
```json
{
  "event": "CONNECTION_UPDATE",
  "data": {
    "instanceName": "hub_456",
    "status": "open|close"
  }
}
```

Status Mapping:
- `open` → `conectado`
- `close` → `desconectado`

## Configuration

Create `.env` file from `.env.example`:

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info
EVOLUTION_API_URL=http://152.67.53.192:8080/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=postgresql://user:password@localhost:5432/hub_db
```

## Database

### Migration
Run the migration to add the `evolution_message_id` column:

```sql
-- migrations/001_add_evolution_message_id.sql
ALTER TABLE hub_disparos ADD COLUMN evolution_message_id TEXT;
CREATE INDEX idx_hub_disparos_evolution_message_id ON hub_disparos(evolution_message_id);
```

### Schema Changes
- **Table**: `hub_disparos`
- **New Column**: `evolution_message_id TEXT` (nullable)
- **Index**: `idx_hub_disparos_evolution_message_id`

## Architecture

```
src/
├── index.js              # Fastify server setup
├── routes/
│   └── webhooks.js       # Webhook handlers
├── services/
│   └── evolutionClient.js # Evolution API client
├── workers/
│   └── feiraoWorker.js   # Message worker
├── database/
│   └── connection.js     # Database connection pool
└── __tests__/
    ├── webhooks.test.js  # Unit tests
    └── webhooks.integration.test.js
```

## Error Handling

All errors are logged but don't crash the server:
- Database errors → logged (ERROR level), returns 200 OK
- Missing records → logged (WARN level), no update
- Unknown events → logged (WARN level), ignored

HTTP response is always 200 OK, processing is asynchronous.

## Logging

All events logged with `[WEBHOOK]` prefix:

```
[WEBHOOK] Received webhook event: MESSAGES_UPDATE
[WEBHOOK] Processing MESSAGES_UPDATE: messageId=msg_xyz789, status=sent
[WEBHOOK] Successfully updated disparo (id=1) status to "enviado"
[WEBHOOK] No disparo found for evolution_message_id: msg_notfound
[WEBHOOK] Error processing MESSAGES_UPDATE: Database connection failed
```

Log levels:
- `info` - Normal operations
- `warn` - Warnings (missing records, invalid format)
- `error` - Errors (exceptions, failures)

## Testing

### Unit Tests
```bash
npm test
# 13 tests covering all status mappings, error cases, and edge cases
```

### Manual Testing
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run webhook tests
bash test-webhook.sh
```

### Individual curl Test
```bash
curl -X POST http://localhost:3000/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPDATE",
    "data": {
      "instanceName": "hub_123",
      "messageId": "msg_xyz789",
      "messageStatus": "sent"
    }
  }'
```

## Security

- All SQL queries parameterized (no injection risk)
- No authentication required (internal VPS network, firewall-protected)
- No sensitive data in logs
- Environment variables for credentials
- Error messages don't expose system details

## Performance

- Database index on `evolution_message_id` for O(1) lookups
- Async webhook processing (doesn't block HTTP thread)
- Fire-and-forget pattern (client gets immediate 200 OK)
- Single UPDATE per webhook (no N+1 queries)

## Dependencies

- **fastify** ^4.24.3 - Fast and low overhead web framework
- **@fastify/cors** ^8.4.2 - CORS support
- **axios** ^1.6.2 - HTTP client for Evolution API
- **@supabase/supabase-js** ^2.38.4 - Supabase client

Dev:
- **vitest** ^0.34.6 - Unit testing framework
- **nodemon** ^3.0.1 - Development auto-reload

## References

- [Fastify Docs](https://www.fastify.io/)
- [Evolution API Docs](https://evolution-api.readme.io/)
- [Vitest Docs](https://vitest.dev/)
- [Supabase Docs](https://supabase.com/docs)

## License

MIT

## Support

For issues or questions, contact the JuriAlvo development team.
