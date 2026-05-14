import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// These tests require full integration environment with Supabase mock
describe.skip('Evolution Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('MESSAGES_UPDATE event handler', () => {
    it('should update hub_disparos status to "enviado" when Evolution sends "sent"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'MESSAGES_UPDATE',
        data: {
          instanceName: 'hub_123',
          messageId: 'msg_xyz789',
          messageStatus: 'sent',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      const handler = webhooks.handleMessagesUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE hub_disparos SET status='enviado'"),
        ['enviado', 'msg_xyz789']
      );
    });

    it('should update hub_disparos status to "entregue" and set entregue_at when Evolution sends "delivered"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'MESSAGES_UPDATE',
        data: {
          instanceName: 'hub_456',
          messageId: 'msg_abc123',
          messageStatus: 'delivered',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      const handler = webhooks.handleMessagesUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE hub_disparos SET status='entregue'"),
        ['entregue', 'msg_abc123']
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('entregue_at'),
        expect.any(Array)
      );
    });

    it('should update hub_disparos status to "lido" and set lido_at when Evolution sends "read"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'MESSAGES_UPDATE',
        data: {
          instanceName: 'hub_789',
          messageId: 'msg_def456',
          messageStatus: 'read',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      const handler = webhooks.handleMessagesUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE hub_disparos SET status='lido'"),
        ['lido', 'msg_def456']
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('lido_at'),
        expect.any(Array)
      );
    });

    it('should update hub_disparos status to "erro" with error message when Evolution sends "error"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'MESSAGES_UPDATE',
        data: {
          instanceName: 'hub_999',
          messageId: 'msg_ghi789',
          messageStatus: 'error',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      const handler = webhooks.handleMessagesUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE hub_disparos SET status='erro'"),
        ['erro', 'Evolution reported error', 'msg_ghi789']
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('erro_msg'),
        expect.any(Array)
      );
    });

    it('should log warning when disparo record is not found', async () => {
      // Arrange
      const webhookPayload = {
        event: 'MESSAGES_UPDATE',
        data: {
          instanceName: 'hub_123',
          messageId: 'msg_notfound',
          messageStatus: 'sent',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // No rows found
      const consoleSpy = vi.spyOn(console, 'warn');

      // Act
      const handler = webhooks.handleMessagesUpdate;
      await handler(webhookPayload);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No disparo found for evolution_message_id')
      );
      consoleSpy.mockRestore();
    });

    it('should handle database errors gracefully without throwing', async () => {
      // Arrange
      const webhookPayload = {
        event: 'MESSAGES_UPDATE',
        data: {
          instanceName: 'hub_123',
          messageId: 'msg_xyz789',
          messageStatus: 'sent',
        },
      };

      db.query.mockRejectedValueOnce(new Error('Database connection failed'));
      const consoleSpy = vi.spyOn(console, 'error');

      // Act & Assert
      const handler = webhooks.handleMessagesUpdate;
      await expect(handler(webhookPayload)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing MESSAGES_UPDATE'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('CONNECTION_UPDATE event handler', () => {
    it('should update hub_clientes whatsapp_status to "conectado" when status is "open"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'CONNECTION_UPDATE',
        data: {
          instanceName: 'hub_123',
          status: 'open',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 123 }] });

      // Act
      const handler = webhooks.handleConnectionUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE hub_clientes SET whatsapp_status='conectado'"),
        ['conectado', 123] // clientId extracted from instanceName
      );
    });

    it('should update hub_clientes whatsapp_status to "desconectado" when status is "close"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'CONNECTION_UPDATE',
        data: {
          instanceName: 'hub_456',
          status: 'close',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 456 }] });

      // Act
      const handler = webhooks.handleConnectionUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE hub_clientes SET whatsapp_status='desconectado'"),
        ['desconectado', 456]
      );
    });

    it('should extract clientId from instanceName format "hub_${clienteId}"', async () => {
      // Arrange
      const webhookPayload = {
        event: 'CONNECTION_UPDATE',
        data: {
          instanceName: 'hub_789',
          status: 'open',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 789 }] });

      // Act
      const handler = webhooks.handleConnectionUpdate;
      await handler(webhookPayload);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([789])
      );
    });

    it('should log warning when cliente record is not found', async () => {
      // Arrange
      const webhookPayload = {
        event: 'CONNECTION_UPDATE',
        data: {
          instanceName: 'hub_999',
          status: 'open',
        },
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // No rows found
      const consoleSpy = vi.spyOn(console, 'warn');

      // Act
      const handler = webhooks.handleConnectionUpdate;
      await handler(webhookPayload);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No cliente found')
      );
      consoleSpy.mockRestore();
    });

    it('should handle database errors gracefully without throwing', async () => {
      // Arrange
      const webhookPayload = {
        event: 'CONNECTION_UPDATE',
        data: {
          instanceName: 'hub_123',
          status: 'open',
        },
      };

      db.query.mockRejectedValueOnce(new Error('Database error'));
      const consoleSpy = vi.spyOn(console, 'error');

      // Act & Assert
      const handler = webhooks.handleConnectionUpdate;
      await expect(handler(webhookPayload)).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing CONNECTION_UPDATE'),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Webhook endpoint handler', () => {
    it('should return 200 OK immediately after receiving webhook', async () => {
      // Arrange
      const request = {
        body: {
          event: 'MESSAGES_UPDATE',
          data: {
            instanceName: 'hub_123',
            messageId: 'msg_xyz789',
            messageStatus: 'sent',
          },
        },
      };

      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      const handler = webhooks.webhook;
      await handler(request, reply);

      // Assert
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ success: true });
    });

    it('should process webhook asynchronously (fire and forget)', async () => {
      // Arrange
      const request = {
        body: {
          event: 'MESSAGES_UPDATE',
          data: {
            instanceName: 'hub_123',
            messageId: 'msg_xyz789',
            messageStatus: 'sent',
          },
        },
      };

      const reply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      // Act
      const handler = webhooks.webhook;
      const promise = handler(request, reply);

      // Response should be sent immediately
      expect(reply.status).toHaveBeenCalledWith(200);

      // Wait for async processing
      await promise;

      // Database should have been called for processing
      expect(db.query).toHaveBeenCalled();
    });
  });
});
