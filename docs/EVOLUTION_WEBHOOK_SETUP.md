# Evolution API Webhook Setup Guide

## Overview

Hub-Backend receives webhooks from Evolution API to track message delivery status and connection state.

## Prerequisites

- Hub-Backend deployed and running at: `https://hub.jurialvo.com.br`
- Evolution API instance: `http://152.67.53.192:8080`
- Client WhatsApp instance created in Evolution API (format: `hub_${clientId}`)

## Webhook URL

The webhook endpoint that Evolution API sends events to:

```
POST https://hub.jurialvo.com.br/webhooks/evolution
```

## Supported Events

Hub-Backend processes two event types from Evolution API:

### 1. MESSAGES_UPDATE

Sent when message status changes (sent, delivered, read, error).

**Payload:**
```json
{
  "event": "MESSAGES_UPDATE",
  "data": {
    "instanceName": "hub_123",
    "messageId": "msg_abc123",
    "messageStatus": "delivered"
  }
}
```

**Status Mapping:**
- `sent` → `enviado` (sent)
- `delivered` → `entregue` (delivered)
- `read` → `lido` (read)
- `error` → `erro` (error)

### 2. CONNECTION_UPDATE

Sent when WhatsApp connection status changes (connected/disconnected).

**Payload:**
```json
{
  "event": "CONNECTION_UPDATE",
  "data": {
    "instanceName": "hub_123",
    "status": "open"
  }
}
```

**Status Mapping:**
- `open` → `conectado` (connected)
- `close` → `desconectado` (disconnected)

## Manual Webhook Registration

To register a webhook for an instance manually via Evolution API:

```bash
curl -X POST http://152.67.53.192:8080/api/webhook/save/hub_123 \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hub.jurialvo.com.br/webhooks/evolution",
    "events": ["MESSAGES_UPDATE", "CONNECTION_UPDATE"]
  }'
```

## Database Updates

When webhooks are processed, the following tables are updated:

### hub_disparos (Message Status)

```sql
UPDATE hub_disparos
SET status = 'entregue', entregue_at = NOW()
WHERE evolution_message_id = 'msg_abc123'
```

### hub_clientes (Connection Status)

```sql
UPDATE hub_clientes
SET whatsapp_status = 'conectado'
WHERE id = 123
```

## Monitoring Webhooks

View recent webhook events in server logs:

```bash
ssh ubuntu@152.67.53.192
pm2 logs hub-backend --lines 100
```

Look for lines starting with `[WEBHOOK]` to see webhook processing.

## Troubleshooting

### Webhook not arriving

1. Check Evolution API instance is connected:
   ```bash
   curl http://152.67.53.192:8080/api/instance/info/hub_123
   ```

2. Verify webhook URL is registered:
   ```bash
   curl http://152.67.53.192:8080/api/webhook/list/hub_123
   ```

3. Check server firewall allows port 443:
   ```bash
   curl -v https://hub.jurialvo.com.br/hub-health
   ```

### Webhook arriving but not processing

1. Check database connection:
   ```bash
   pm2 logs hub-backend --err
   ```

2. Verify hub_disparos table exists:
   ```sql
   SELECT * FROM hub_disparos LIMIT 1;
   ```

3. Verify evolution_message_id field exists:
   ```sql
   \d hub_disparos
   ```

## Testing Webhooks

Send a test webhook from your local machine:

```bash
curl -X POST https://hub.jurialvo.com.br/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{
    "event": "MESSAGES_UPDATE",
    "data": {
      "instanceName": "hub_123",
      "messageId": "test_msg_001",
      "messageStatus": "delivered"
    }
  }'
```

Expected response:
```json
{"success":true}
```

## Server Logs

To monitor webhooks in real-time:

```bash
pm2 logs hub-backend | grep WEBHOOK
```

Example log output:
```
[WEBHOOK] Received webhook event: MESSAGES_UPDATE
[WEBHOOK] Processing MESSAGES_UPDATE: messageId=msg_abc123, status=delivered
[WEBHOOK] Successfully updated disparo (id=1) status to "entregue"
```
