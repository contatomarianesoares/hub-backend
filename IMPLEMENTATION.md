# Task 10: Evolution Webhook Receiver - Implementation Report

## Overview
Successfully implemented the Evolution API webhook receiver that processes incoming webhook events to update campaign and message status in real-time. This follows a Test-Driven Development (TDD) approach.

## Files Created

### 1. Database Migration
- **File**: `migrations/001_add_evolution_message_id.sql`
- **Changes**:
  - Added `evolution_message_id TEXT` column to `hub_disparos` table
  - Created index: `idx_hub_disparos_evolution_message_id` for webhook lookups
  - Backfilled existing records with NULL values

### 2. Webhook Route Handler
- **File**: `src/routes/webhooks.js`
- **Functions**:
  - `webhook(request, reply)` - Main endpoint handler for `/webhooks/evolution`
  - `handleMessagesUpdate(payload)` - Processes MESSAGES_UPDATE events
  - `handleConnectionUpdate(payload)` - Processes CONNECTION_UPDATE events

#### Message Status Mapping Logic
```
Evolution Status → Hub Status Mapping:
- "sent" → status='enviado'
- "delivered" → status='entregue', entregue_at=NOW()
- "read" → status='lido', lido_at=NOW()
- "error" → status='erro', erro_msg='Evolution reported error'
- "pending" → No update (ignored)
```

#### Connection Status Mapping Logic
```
Evolution Status → Hub Status Mapping:
- "open" → whatsapp_status='conectado'
- "close" → whatsapp_status='desconectado'

Instance Name Format: hub_{clientId}
Example: hub_123 extracts clientId=123
```

### 3. Unit Tests (TDD)
- **File**: `src/__tests__/webhooks.test.js`
- **Test Coverage**:
  - MESSAGES_UPDATE handler for all statuses (sent, delivered, read, error, pending)
  - CONNECTION_UPDATE handler for both statuses (open, close)
  - Error handling and graceful degradation
  - Warning logging when records not found
  - Database error resilience (no throwing)
  - Webhook endpoint returns 200 OK immediately
  - Async processing (fire-and-forget pattern)

- **Tests Count**: 15+ test cases
- **Key Features**:
  - All tests use vitest
  - Mock database queries
  - Verify correct SQL generation
  - Verify logging calls
  - Verify async error handling

### 4. Integration Tests
- **File**: `src/__tests__/webhooks.integration.test.js`
- **Scope**: HTTP endpoint integration tests (commented for real server scenario)
- **Test Endpoints**:
  - POST /webhooks/evolution (MESSAGES_UPDATE)
  - POST /webhooks/evolution (CONNECTION_UPDATE)
  - GET /health (status check)

### 5. Backend Server Setup
- **File**: `src/index.js`
- **Features**:
  - Fastify server with CORS enabled
  - Webhook route registration
  - Health check endpoint (GET /health)
  - Graceful shutdown handlers (SIGTERM/SIGINT)
  - Structured logging

### 6. Database Connection
- **File**: `src/database/connection.js`
- **Features**:
  - Supabase client initialization
  - Parameterized query wrapper
  - IPv4-first network preference
  - Error handling and logging

### 7. Evolution API Client
- **File**: `src/services/evolutionClient.js`
- **Functions**:
  - `enviarTexto(options)` - Send messages via Evolution API
  - `getInstanceStatus(clientId)` - Get instance status
  - Uses instance name format: `hub_{clientId}`
  - Returns evolution_message_id in response

### 8. Message Worker
- **File**: `src/workers/feiraoWorker.js`
- **Functions**:
  - `processMessageSend()` - Captures evolution_message_id after send
  - `processBatch()` - Process multiple messages
  - **Integration**: Stores evolution_message_id in hub_disparos for webhook tracking
  - SQL: `UPDATE hub_disparos SET evolution_message_id=$1 WHERE id=$2`

### 9. Project Configuration
- **File**: `package.json`
  - Dependencies: fastify, axios, @supabase/supabase-js, @fastify/cors
  - DevDependencies: vitest, nodemon
  - Scripts: start, dev, test, test:watch, test:coverage

- **File**: `.env.example`
  - Configuration template for local development
  - Includes Evolution API URL, Supabase credentials, database connection

### 10. Testing Script
- **File**: `test-webhook.sh`
- **Purpose**: Manual curl-based webhook testing
- **Tests Included**:
  1. MESSAGES_UPDATE - sent status
  2. MESSAGES_UPDATE - delivered status
  3. MESSAGES_UPDATE - read status
  4. MESSAGES_UPDATE - error status
  5. CONNECTION_UPDATE - open status
  6. CONNECTION_UPDATE - close status
  7. Health check endpoint

## Implementation Details

### Webhook Endpoint
```
POST /webhooks/evolution
```

**Features**:
- No authentication required (internal VPS network, firewall-protected)
- Returns 200 OK immediately (async processing)
- Fire-and-forget pattern: response sent before processing
- All errors logged but don't crash server

### Error Handling Strategy
1. Database query failures: Log ERROR, continue, return 200 OK
2. Missing records: Log WARNING, continue, return 200 OK
3. Unknown event types: Log WARN, return 200 OK
4. Invalid payload format: Log ERROR, return 200 OK
5. No exceptions propagate to HTTP response

### Logging Structure
```
[WEBHOOK] Received webhook event: MESSAGES_UPDATE
[WEBHOOK] Processing MESSAGES_UPDATE: messageId=msg_xyz789, status=sent
[WEBHOOK] Successfully updated disparo (id=1) status to "enviado"

[WEBHOOK] Processing CONNECTION_UPDATE: instanceName=hub_123, status=open
[WEBHOOK] Successfully updated cliente (id=123) whatsapp_status to "conectado"

[WEBHOOK] Error processing MESSAGES_UPDATE: Database connection failed
[WEBHOOK] No disparo found for evolution_message_id: msg_notfound
```

## Database Schema Changes

### hub_disparos Table
```sql
ALTER TABLE hub_disparos ADD COLUMN evolution_message_id TEXT;
CREATE INDEX idx_hub_disparos_evolution_message_id ON hub_disparos(evolution_message_id);
```

**New Column**: `evolution_message_id TEXT`
- Stores Evolution API message UUID
- Nullable (for legacy messages without Evolution ID)
- Indexed for fast webhook lookups

## Worker Integration

### Message Sending Flow
1. `feiraoWorker.processMessageSend()` called
2. Calls `evolutionClient.enviarTexto()`
3. Evolution API returns response with `data.id`
4. Capture: `evolution_message_id = response?.data?.id`
5. Update: `UPDATE hub_disparos SET evolution_message_id=$1 WHERE id=$2`
6. Return response to caller

## Environment Variables Required

```
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info
EVOLUTION_API_URL=http://152.67.53.192:8080/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
DATABASE_URL=postgresql://user:password@localhost:5432/hub_db
```

## Test Execution

### Run Unit Tests
```bash
npm install
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Manual Testing (Local)
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run webhook tests
bash test-webhook.sh
```

## API Response Format

### Success Response
```json
{
  "success": true
}
```

**HTTP Status**: 200 OK

### Webhook Event Payload Examples

#### MESSAGES_UPDATE
```json
{
  "event": "MESSAGES_UPDATE",
  "data": {
    "instanceName": "hub_123",
    "messageId": "msg_xyz789",
    "messageStatus": "sent"
  }
}
```

#### CONNECTION_UPDATE
```json
{
  "event": "CONNECTION_UPDATE",
  "data": {
    "instanceName": "hub_456",
    "status": "open"
  }
}
```

## SQL Operations Generated

### MESSAGES_UPDATE Processing
```sql
-- For "sent" status
UPDATE hub_disparos
SET status = 'enviado'
WHERE evolution_message_id = $1
RETURNING id;

-- For "delivered" status
UPDATE hub_disparos
SET status = 'entregue', entregue_at = NOW()
WHERE evolution_message_id = $1
RETURNING id;

-- For "read" status
UPDATE hub_disparos
SET status = 'lido', lido_at = NOW()
WHERE evolution_message_id = $1
RETURNING id;

-- For "error" status
UPDATE hub_disparos
SET status = 'erro', erro_msg = $1
WHERE evolution_message_id = $2
RETURNING id;
```

### CONNECTION_UPDATE Processing
```sql
UPDATE hub_clientes
SET whatsapp_status = $1
WHERE id = $2
RETURNING id;
```

## Spec Compliance Checklist

- [x] Webhook endpoint at POST /webhooks/evolution
- [x] Receives Evolution API webhook payload
- [x] No auth required (internal network)
- [x] Returns 200 OK immediately
- [x] MESSAGES_UPDATE event handling
- [x] Message status mapping (sent/delivered/read/error)
- [x] Hub_disparos status updates with timestamps
- [x] CONNECTION_UPDATE event handling
- [x] Connection status mapping (open/close)
- [x] Hub_clientes status updates
- [x] ClientId extraction from instanceName
- [x] evolution_message_id column added to hub_disparos
- [x] Index created for webhook lookups
- [x] Worker integration to capture evolution_message_id
- [x] Error handling (no crashes, all logged)
- [x] Webhook route registered in index.js
- [x] TDD approach with failing tests first
- [x] Async processing (fire-and-forget)
- [x] Comprehensive logging (INFO/WARN/ERROR levels)

## File Structure

```
hub-backend/
├── src/
│   ├── __tests__/
│   │   ├── webhooks.test.js
│   │   └── webhooks.integration.test.js
│   ├── database/
│   │   └── connection.js
│   ├── routes/
│   │   └── webhooks.js
│   ├── services/
│   │   └── evolutionClient.js
│   ├── workers/
│   │   └── feiraoWorker.js
│   └── index.js
├── migrations/
│   └── 001_add_evolution_message_id.sql
├── test-webhook.sh
├── package.json
├── .env.example
├── IMPLEMENTATION.md (this file)
└── README.md (to be created)
```

## Next Steps

1. **Deploy Migration**: Run `001_add_evolution_message_id.sql` on production database
2. **Environment Setup**: Configure .env with actual credentials
3. **Dependency Installation**: `npm install`
4. **Run Tests**: `npm test` to verify all tests pass
5. **Start Server**: `npm start` for production or `npm run dev` for development
6. **Configure Evolution Webhook**: Point Evolution API webhook URL to `https://your-hub-domain.com/webhooks/evolution`
7. **Monitor Logs**: Watch for [WEBHOOK] log messages

## Code Quality Notes

- All code follows parameterized queries (no SQL injection risk)
- Comprehensive error handling with graceful degradation
- Structured logging with prefixes for easy filtering
- DRY principle applied (reused database connection, shared error handling)
- Async/await pattern for clean asynchronous code
- Well-documented functions with JSDoc comments
- Test coverage for happy paths and edge cases
- Fire-and-forget pattern ensures HTTP response is always 200 OK
