# Hub-Backend Evolution API Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Evolution API integration with webhook handling, campaign management, and observability for WhatsApp message distribution.

**Architecture:** Hub-Backend uses Fastify as HTTP server with Supabase for persistence. Evolution API client handles WhatsApp communication. Webhook events update message status in hub_disparos and connection status in hub_clientes. Campaign service orchestrates message sending.

**Tech Stack:** Node.js 20, Fastify 4, Supabase, axios, vitest, Evolution API 2.0

---

## File Structure

**Files to create:**
- `src/services/campaignService.js` - Campaign orchestration logic
- `src/routes/campaigns.js` - Campaign REST endpoints
- `src/utils/logger.js` - Structured logging with correlation IDs
- `src/utils/evolutionWebhookRegistry.js` - Webhook registration helper
- `src/__tests__/campaignService.test.js` - Campaign service unit tests
- `src/__tests__/evolution.integration.test.js` - Evolution API integration tests
- `docs/EVOLUTION_WEBHOOK_SETUP.md` - Webhook configuration guide

**Files to modify:**
- `src/services/evolutionClient.js` - Add functions for instance and webhook management
- `src/index.js` - Add new routes, logging middleware
- `src/routes/webhooks.js` - Add logging utility

---

### Task 1: Add utility function for structured logging

**Files:**
- Create: `src/utils/logger.js`
- Modify: `src/index.js`
- Modify: `src/routes/webhooks.js`

- [ ] **Step 1: Write test for logger utility**

```javascript
// src/__tests__/logger.test.js
const { describe, it, expect, vi, beforeEach } = require('vitest');
const { createLogger } = require('../utils/logger');

describe('Logger utility', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info');
  });

  it('should create logger with correlation ID', () => {
    const logger = createLogger('TEST_CONTEXT');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  it('should include context in log messages', () => {
    const logger = createLogger('WEBHOOK');
    const correlationId = 'corr_123';
    logger.info('Test message', { correlationId });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('WEBHOOK'),
      expect.objectContaining({ correlationId })
    );
  });

  it('should include timestamp in every log', () => {
    const logger = createLogger('API');
    logger.info('Test event', { event: 'test' });
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        timestamp: expect.any(String),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/marianesoares/Desktop/BACKUP\ JURIALVO/hub-backend
npm test -- src/__tests__/logger.test.js
```

Expected: FAIL - "createLogger is not exported"

- [ ] **Step 3: Implement logger utility**

```javascript
// src/utils/logger.js
/**
 * Create a logger with context and correlation ID support
 * @param {string} context - Logger context (e.g., 'WEBHOOK', 'API')
 * @returns {Object} Logger with info, warn, error methods
 */
function createLogger(context) {
  return {
    info(message, data = {}) {
      console.info(
        `[${context}] ${message}`,
        {
          ...data,
          timestamp: new Date().toISOString(),
        }
      );
    },

    warn(message, data = {}) {
      console.warn(
        `[${context}] ${message}`,
        {
          ...data,
          timestamp: new Date().toISOString(),
        }
      );
    },

    error(message, error, data = {}) {
      console.error(
        `[${context}] ${message}`,
        {
          ...data,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString(),
        }
      );
    },
  };
}

module.exports = { createLogger };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/logger.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/logger.js src/__tests__/logger.test.js
git commit -m "feat: add structured logging utility with correlation ID support"
```

---

### Task 2: Expand evolutionClient with instance management functions

**Files:**
- Modify: `src/services/evolutionClient.js`
- Create: `src/__tests__/evolutionClient.test.js`

- [ ] **Step 1: Write test for createInstance function**

```javascript
// src/__tests__/evolutionClient.test.js
const { describe, it, expect, vi, beforeEach } = require('vitest');
const evolutionClient = require('../services/evolutionClient');

// Mock axios
vi.mock('axios');
const axios = require('axios');

describe('Evolution API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInstance', () => {
    it('should create a new WhatsApp instance', async () => {
      const mockResponse = {
        status: 201,
        data: {
          instance: {
            instanceName: 'hub_123',
            instanceId: 'inst_abc123',
            status: 'disconnected',
          },
        },
      };

      axios.create().post.mockResolvedValueOnce(mockResponse);

      const result = await evolutionClient.createInstance({ clientId: 123 });

      expect(result).toEqual(mockResponse.data);
    });

    it('should return error response if creation fails', async () => {
      const mockResponse = {
        status: 400,
        data: { message: 'Invalid request' },
      };

      axios.create().post.mockResolvedValueOnce(mockResponse);

      const result = await evolutionClient.createInstance({ clientId: 999 });

      expect(result.data?.message).toBe('Invalid request');
    });
  });

  describe('listInstances', () => {
    it('should list all instances', async () => {
      const mockResponse = {
        status: 200,
        data: {
          instances: [
            { instanceName: 'hub_123', status: 'open' },
            { instanceName: 'hub_456', status: 'closed' },
          ],
        },
      };

      axios.create().get.mockResolvedValueOnce(mockResponse);

      const result = await evolutionClient.listInstances();

      expect(result.data.instances).toHaveLength(2);
    });
  });

  describe('registerWebhook', () => {
    it('should register webhook URL for instance', async () => {
      const mockResponse = {
        status: 200,
        data: { message: 'Webhook registered' },
      };

      axios.create().post.mockResolvedValueOnce(mockResponse);

      const result = await evolutionClient.registerWebhook({
        clientId: 123,
        webhookUrl: 'https://hub.jurialvo.com.br/webhooks/evolution',
        events: ['MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
      });

      expect(result.data?.message).toBe('Webhook registered');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/evolutionClient.test.js
```

Expected: FAIL - "createInstance is not a function"

- [ ] **Step 3: Add functions to evolutionClient**

Add these functions to the end of `src/services/evolutionClient.js` before `module.exports`:

```javascript
/**
 * Create a new WhatsApp instance on Evolution API
 *
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID
 * @returns {Promise<Object>} Response from Evolution API
 */
async function createInstance({ clientId }) {
  try {
    const instanceName = `hub_${clientId}`;

    console.info(`[EVOLUTION] Creating instance: ${instanceName}`);

    const response = await evolutionClient.post(`/instance/create`, {
      instanceName,
      token: process.env.EVOLUTION_API_TOKEN || 'webhook_token',
      qrcode: true,
    });

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error creating instance: ${error.message}`, error);
    throw error;
  }
}

/**
 * List all instances on Evolution API
 *
 * @returns {Promise<Object>} List of instances
 */
async function listInstances() {
  try {
    console.info('[EVOLUTION] Listing all instances');

    const response = await evolutionClient.get(`/instance/list`);

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error listing instances: ${error.message}`, error);
    throw error;
  }
}

/**
 * Register webhook for an instance
 *
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID
 * @param {string} options.webhookUrl - Webhook URL
 * @param {Array<string>} options.events - Events to receive (MESSAGES_UPDATE, CONNECTION_UPDATE, etc)
 * @returns {Promise<Object>} Response from Evolution API
 */
async function registerWebhook({ clientId, webhookUrl, events = [] }) {
  try {
    const instanceName = `hub_${clientId}`;

    console.info(
      `[EVOLUTION] Registering webhook for ${instanceName}: ${webhookUrl}`
    );

    const response = await evolutionClient.post(
      `/webhook/save/${instanceName}`,
      {
        url: webhookUrl,
        events: events.length > 0 ? events : ['MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
      }
    );

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error registering webhook: ${error.message}`, error);
    throw error;
  }
}

/**
 * Update webhook configuration for an instance
 *
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID
 * @param {string} options.webhookUrl - New webhook URL
 * @returns {Promise<Object>} Response from Evolution API
 */
async function updateWebhook({ clientId, webhookUrl }) {
  try {
    const instanceName = `hub_${clientId}`;

    console.info(
      `[EVOLUTION] Updating webhook for ${instanceName}: ${webhookUrl}`
    );

    const response = await evolutionClient.put(
      `/webhook/save/${instanceName}`,
      {
        url: webhookUrl,
      }
    );

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error updating webhook: ${error.message}`, error);
    throw error;
  }
}
```

- [ ] **Step 4: Update exports in evolutionClient.js**

Change the last line of `src/services/evolutionClient.js` from:

```javascript
module.exports = {
  enviarTexto,
  getInstanceStatus,
  evolutionClient,
};
```

To:

```javascript
module.exports = {
  enviarTexto,
  getInstanceStatus,
  createInstance,
  listInstances,
  registerWebhook,
  updateWebhook,
  evolutionClient,
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- src/__tests__/evolutionClient.test.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/evolutionClient.js src/__tests__/evolutionClient.test.js
git commit -m "feat: add instance and webhook management to evolutionClient"
```

---

### Task 3: Create campaign service for message orchestration

**Files:**
- Create: `src/services/campaignService.js`
- Create: `src/__tests__/campaignService.test.js`

- [ ] **Step 1: Write test for campaign service**

```javascript
// src/__tests__/campaignService.test.js
const { describe, it, expect, vi, beforeEach } = require('vitest');
const campaignService = require('../services/campaignService');

vi.mock('../database/connection');
vi.mock('../services/evolutionClient');

const db = require('../database/connection').default;
const evolution = require('../services/evolutionClient');

describe('Campaign Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendCampaign', () => {
    it('should send campaign to all recipients', async () => {
      const campaignData = {
        id: 1,
        titulo: 'Test Campaign',
        mensagem: 'Hello World',
        clientId: 123,
      };

      const recipients = [
        { id: 1, telefone: '5511999999999' },
        { id: 2, telefone: '5511888888888' },
      ];

      db.query.mockResolvedValueOnce({ rows: recipients });
      evolution.enviarTexto.mockResolvedValue({ data: { id: 'msg_123' } });

      const result = await campaignService.sendCampaign(campaignData);

      expect(result).toEqual({
        campaignId: 1,
        totalRecipients: 2,
        sent: 2,
        failed: 0,
      });
    });

    it('should handle partially failed sends', async () => {
      const campaignData = {
        id: 2,
        titulo: 'Campaign 2',
        mensagem: 'Test message',
        clientId: 456,
      };

      const recipients = [
        { id: 1, telefone: '5511999999999' },
        { id: 2, telefone: '5511888888888' },
      ];

      db.query.mockResolvedValueOnce({ rows: recipients });
      evolution.enviarTexto
        .mockResolvedValueOnce({ data: { id: 'msg_456' } })
        .mockRejectedValueOnce(new Error('API error'));

      const result = await campaignService.sendCampaign(campaignData);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getCampaignStatus', () => {
    it('should return campaign status with message stats', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          {
            titulo: 'Test Campaign',
            total: 10,
            enviado: 8,
            entregue: 6,
            lido: 3,
            erro: 2,
          },
        ],
      });

      const result = await campaignService.getCampaignStatus(1);

      expect(result).toEqual(
        expect.objectContaining({
          titulo: 'Test Campaign',
          total: 10,
        })
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/__tests__/campaignService.test.js
```

Expected: FAIL - "campaignService is not exported"

- [ ] **Step 3: Implement campaign service**

```javascript
// src/services/campaignService.js
const db = require('../database/connection').default;
const evolution = require('./evolutionClient');

/**
 * Send a campaign to all recipients
 *
 * @param {Object} campaign - Campaign data
 * @param {number} campaign.id - Campaign ID
 * @param {number} campaign.clientId - Hub client ID
 * @param {string} campaign.mensagem - Message text
 * @returns {Promise<Object>} Campaign send result
 */
async function sendCampaign(campaign) {
  const { id: campaignId, clientId, mensagem } = campaign;

  try {
    console.info(`[CAMPAIGN] Starting campaign ${campaignId} send`);

    // Get recipients from database
    const { rows: recipients } = await db.query(
      `SELECT id, telefone FROM hub_contatos WHERE ativo = true LIMIT 1000`
    );

    let sent = 0;
    let failed = 0;

    // Send message to each recipient
    for (const recipient of recipients) {
      try {
        const response = await evolution.enviarTexto({
          clientId,
          telefone: recipient.telefone,
          mensagem,
        });

        if (response?.data?.id) {
          // Log disparo
          await db.query(
            `INSERT INTO hub_disparos (campanha_id, contato_id, cliente_id, evolution_message_id, status)
             VALUES ($1, $2, $3, $4, 'enviando')`,
            [campaignId, recipient.id, clientId, response.data.id]
          );

          sent++;
          console.info(`[CAMPAIGN] Message sent to ${recipient.telefone}`);
        } else {
          failed++;
          console.warn(`[CAMPAIGN] Failed to send to ${recipient.telefone}`);
        }
      } catch (error) {
        failed++;
        console.error(
          `[CAMPAIGN] Error sending to ${recipient.telefone}: ${error.message}`
        );
      }
    }

    console.info(
      `[CAMPAIGN] Campaign ${campaignId} complete. Sent: ${sent}, Failed: ${failed}`
    );

    return {
      campaignId,
      totalRecipients: recipients.length,
      sent,
      failed,
    };
  } catch (error) {
    console.error(
      `[CAMPAIGN] Error in sendCampaign: ${error.message}`,
      error
    );
    throw error;
  }
}

/**
 * Get campaign status with message statistics
 *
 * @param {number} campaignId - Campaign ID
 * @returns {Promise<Object>} Campaign status
 */
async function getCampaignStatus(campaignId) {
  try {
    const { rows } = await db.query(
      `SELECT
        hc.titulo,
        COUNT(*) as total,
        SUM(CASE WHEN hd.status = 'enviado' THEN 1 ELSE 0 END) as enviado,
        SUM(CASE WHEN hd.status = 'entregue' THEN 1 ELSE 0 END) as entregue,
        SUM(CASE WHEN hd.status = 'lido' THEN 1 ELSE 0 END) as lido,
        SUM(CASE WHEN hd.status = 'erro' THEN 1 ELSE 0 END) as erro
      FROM hub_campanhas hc
      LEFT JOIN hub_disparos hd ON hc.id = hd.campanha_id
      WHERE hc.id = $1
      GROUP BY hc.id, hc.titulo`,
      [campaignId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error(
      `[CAMPAIGN] Error getting status: ${error.message}`,
      error
    );
    throw error;
  }
}

module.exports = {
  sendCampaign,
  getCampaignStatus,
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/__tests__/campaignService.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/campaignService.js src/__tests__/campaignService.test.js
git commit -m "feat: add campaign service for orchestrating message sending"
```

---

### Task 4: Add campaign REST endpoints

**Files:**
- Create: `src/routes/campaigns.js`
- Modify: `src/index.js`

- [ ] **Step 1: Create campaigns routes file**

```javascript
// src/routes/campaigns.js
const campaignService = require('../services/campaignService');

/**
 * POST /campaigns/:id/send
 * Send a campaign to all recipients
 */
async function sendCampaign(request, reply) {
  try {
    const { id } = request.params;

    console.info(`[API] Send campaign request for campaign ${id}`);

    // Get campaign from database
    const db = require('../database/connection').default;
    const { rows: campaigns } = await db.query(
      'SELECT * FROM hub_campanhas WHERE id = $1',
      [id]
    );

    if (campaigns.length === 0) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Send campaign asynchronously
    const result = await campaignService.sendCampaign(campaign);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(`[API] Error in sendCampaign: ${error.message}`, error);
    return reply.status(500).send({
      error: 'Failed to send campaign',
      message: error.message,
    });
  }
}

/**
 * GET /campaigns/:id/status
 * Get campaign status with message statistics
 */
async function getCampaignStatus(request, reply) {
  try {
    const { id } = request.params;

    console.info(`[API] Get campaign status for campaign ${id}`);

    const status = await campaignService.getCampaignStatus(id);

    if (!status) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    return reply.status(200).send({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error(`[API] Error in getCampaignStatus: ${error.message}`, error);
    return reply.status(500).send({
      error: 'Failed to get campaign status',
      message: error.message,
    });
  }
}

module.exports = {
  sendCampaign,
  getCampaignStatus,
};
```

- [ ] **Step 2: Register routes in index.js**

Modify `src/index.js` to add the campaign routes. Replace the webhooks router section with:

```javascript
require('dotenv').config();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const webhooksRouter = require('./routes/webhooks');
const campaignsRouter = require('./routes/campaigns');

// Initialize Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register CORS
fastify.register(cors, {
  origin: true,
});

// Register webhook route
fastify.post('/webhooks/evolution', webhooksRouter.webhook);

// Register campaign routes
fastify.post('/campaigns/:id/send', campaignsRouter.sendCampaign);
fastify.get('/campaigns/:id/status', campaignsRouter.getCampaignStatus);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Hub health endpoint
fastify.get('/hub-health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
async function start() {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.info(`[SERVER] Hub backend listening on http://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.info('[SERVER] SIGTERM received, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('[SERVER] SIGINT received, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

// Export for testing
module.exports = { fastify, start };

// Start if not imported as module
if (require.main === module) {
  start();
}
```

- [ ] **Step 3: Test the endpoints**

```bash
cd /Users/marianesoares/Desktop/BACKUP\ JURIALVO/hub-backend
npm start
```

In another terminal, test the health endpoints:

```bash
curl -s http://localhost:3002/hub-health | jq .
curl -s http://localhost:3002/health | jq .
```

Expected: Both return `{"status":"ok","timestamp":"..."}`

- [ ] **Step 4: Commit**

```bash
git add src/routes/campaigns.js src/index.js
git commit -m "feat: add campaign REST endpoints for sending and monitoring"
```

---

### Task 5: Create integration test for webhook e2e

**Files:**
- Create: `src/__tests__/evolution.integration.test.js`

- [ ] **Step 1: Write integration test**

```javascript
// src/__tests__/evolution.integration.test.js
const { describe, it, expect, beforeEach, vi } = require('vitest');
const { fastify } = require('../index');

vi.mock('../database/connection');
const db = require('../database/connection').default;

describe('Evolution Webhook Integration (E2E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should receive and process MESSAGES_UPDATE webhook', async () => {
    // Arrange
    const webhookPayload = {
      event: 'MESSAGES_UPDATE',
      data: {
        instanceName: 'hub_123',
        messageId: 'msg_e2e_001',
        messageStatus: 'delivered',
      },
    };

    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    // Act
    const response = await fastify.inject({
      method: 'POST',
      url: '/webhooks/evolution',
      payload: webhookPayload,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ success: true });
    
    // Verify database was called
    expect(db.query).toHaveBeenCalled();
  });

  it('should receive and process CONNECTION_UPDATE webhook', async () => {
    // Arrange
    const webhookPayload = {
      event: 'CONNECTION_UPDATE',
      data: {
        instanceName: 'hub_456',
        status: 'open',
      },
    };

    db.query.mockResolvedValueOnce({ rows: [{ id: 456 }] });

    // Act
    const response = await fastify.inject({
      method: 'POST',
      url: '/webhooks/evolution',
      payload: webhookPayload,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ success: true });
  });

  it('should return 200 OK immediately even on processing errors', async () => {
    // Arrange
    const webhookPayload = {
      event: 'MESSAGES_UPDATE',
      data: {
        instanceName: 'hub_789',
        messageId: 'msg_error',
        messageStatus: 'sent',
      },
    };

    db.query.mockRejectedValueOnce(new Error('Database error'));

    // Act
    const response = await fastify.inject({
      method: 'POST',
      url: '/webhooks/evolution',
      payload: webhookPayload,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({ success: true });
  });

  it('should handle health check endpoint', async () => {
    // Act
    const response = await fastify.inject({
      method: 'GET',
      url: '/hub-health',
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(
      expect.objectContaining({
        status: 'ok',
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- src/__tests__/evolution.integration.test.js
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/evolution.integration.test.js
git commit -m "test: add e2e integration tests for evolution webhooks"
```

---

### Task 6: Document webhook setup and configuration

**Files:**
- Create: `docs/EVOLUTION_WEBHOOK_SETUP.md`

- [ ] **Step 1: Create webhook setup documentation**

```markdown
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
```

- [ ] **Step 2: Verify documentation is clear**

Read the documentation and confirm it covers:
- What webhooks are
- How to register them
- What events are supported
- How to debug issues

- [ ] **Step 3: Commit**

```bash
git add docs/EVOLUTION_WEBHOOK_SETUP.md
git commit -m "docs: add evolution webhook setup and troubleshooting guide"
```

---

### Task 7: Run all tests and verify integration

**Files:**
- Run tests for all changes

- [ ] **Step 1: Run all unit tests**

```bash
cd /Users/marianesoares/Desktop/BACKUP\ JURIALVO/hub-backend
npm test
```

Expected: All tests passing (let tests run to completion, may take 30-60 seconds)

- [ ] **Step 2: Check test coverage**

```bash
npm test -- --coverage
```

Expected: Coverage reported for all new files

- [ ] **Step 3: Start server and verify endpoints respond**

In one terminal:
```bash
npm start
```

In another terminal:
```bash
# Test health endpoints
curl http://localhost:3002/health
curl http://localhost:3002/hub-health

# Test webhook endpoint (will return 404 without POST data)
curl -X POST http://localhost:3002/webhooks/evolution \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
```

Expected: Health returns `{"status":"ok"}`, webhook returns `{"success":true}`

- [ ] **Step 4: Verify no console errors**

Check that server starts with no errors:
- Should see: `[SERVER] Hub backend listening on http://0.0.0.0:3002`
- Should NOT see: error, undefined, or failed

- [ ] **Step 5: Commit final verification**

```bash
git add -A
git commit -m "chore: all tests passing, endpoints verified"
```

---

## Summary

This plan implements the complete Evolution API integration:

✅ **Task 1** - Structured logging utility for correlation tracking  
✅ **Task 2** - evolutionClient expansion (instance/webhook management)  
✅ **Task 3** - Campaign service for orchestrating sends  
✅ **Task 4** - Campaign REST endpoints  
✅ **Task 5** - E2E integration tests  
✅ **Task 6** - Webhook setup documentation  
✅ **Task 7** - Test and verification  

All code follows TDD, is fully tested, and includes no placeholders.
