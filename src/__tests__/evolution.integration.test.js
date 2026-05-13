import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../database/connection.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

const { fastify } = await import('../index.js');
const { default: db } = await import('../database/connection.js');

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

  it('should handle /health endpoint', async () => {
    // Act
    const response = await fastify.inject({
      method: 'GET',
      url: '/health',
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual(
      expect.objectContaining({
        status: 'ok',
      })
    );
  });

  it('should accept webhook with all required fields', async () => {
    // Arrange
    const webhookPayload = {
      event: 'MESSAGES_UPDATE',
      data: {
        instanceName: 'hub_integration_001',
        messageId: 'msg_integration_123',
        messageStatus: 'read',
        timestamp: new Date().toISOString(),
      },
    };

    // Act
    const response = await fastify.inject({
      method: 'POST',
      url: '/webhooks/evolution',
      payload: webhookPayload,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    const responseData = JSON.parse(response.payload);
    expect(responseData).toHaveProperty('success');
    expect(responseData.success).toBe(true);
  });
});
