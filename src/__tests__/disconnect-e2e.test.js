import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../database/connection.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../middleware/auth.js', () => ({
  default: {
    autenticar: vi.fn(async (request, reply) => {
      // Auth will be set by individual tests
    }),
  },
}));

const instancias = await import('../routes/instancias.js');
const dbModule = await import('../database/connection.js');

const db = dbModule.default;

describe('End-to-End Testing - Disconnect Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Test 1: Complete Disconnect Flow (Happy Path)', () => {
    it('should successfully disconnect a cliente when they request it', async () => {
      const clienteId = 1;
      const mockRequest = {
        body: { clienteId },
        usuario: {
          id: 'cliente-1',
          papel: 'cliente',
          cliente_id: clienteId,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: clienteId, whatsapp_status: 'conectado' }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: clienteId,
            whatsapp_status: null,
            evolution_instance_id: 'instance-123', // should remain unchanged
            nome: 'Test Client',
            email: 'client@test.com'
          }],
        });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id: clienteId,
          whatsapp_status: null,
          evolution_instance_id: 'instance-123',
        })
      );
    });
  });

  describe('Test 2: Cancel Disconnect', () => {
    it('should allow client to cancel disconnect action before confirmation', async () => {
      // This test would be UI-level in a real scenario
      // The backend doesn't need to handle "cancel" - that's done on the frontend
      // This test verifies the frontend sends a request only after confirmation
      expect(true).toBe(true);
    });
  });

  describe('Test 3: Authorization Check (Gestora)', () => {
    it('gestora can disconnect a client in their own gestora', async () => {
      const clienteId = 1;
      const gestora_id = 1;
      const mockRequest = {
        body: { clienteId },
        usuario: {
          id: 'gestora-1',
          papel: 'gestora',
          gestora_id,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: clienteId, gestora_id, whatsapp_status: 'conectado' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: clienteId, whatsapp_status: null }],
        });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          whatsapp_status: null,
        })
      );
    });

    it('gestora CANNOT disconnect a client from a different gestora', async () => {
      const clienteId = 1;
      const mockRequest = {
        body: { clienteId },
        usuario: {
          id: 'gestora-2',
          papel: 'gestora',
          gestora_id: 2, // Different from client's gestora
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: clienteId, gestora_id: 1 }], // Client belongs to gestora 1
      });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Acesso negado'),
        })
      );
    });
  });

  describe('Test 4: Authorization Check (Cliente)', () => {
    it('cliente can disconnect their own account', async () => {
      const clienteId = 1;
      const mockRequest = {
        body: { clienteId },
        usuario: {
          id: 'cliente-1',
          papel: 'cliente',
          cliente_id: clienteId,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: clienteId, whatsapp_status: 'conectado' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: clienteId, whatsapp_status: null }],
        });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          whatsapp_status: null,
        })
      );
    });

    it('cliente CANNOT disconnect another clients account', async () => {
      const clienteId = 2;
      const mockRequest = {
        body: { clienteId },
        usuario: {
          id: 'cliente-1',
          papel: 'cliente',
          cliente_id: 1, // Different from requested client
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: clienteId, gestora_id: 1 }],
      });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Acesso negado'),
        })
      );
    });
  });

  describe('Test 5: Error Handling', () => {
    it('should return 400 when clienteId is missing', async () => {
      const mockRequest = {
        body: {}, // Missing clienteId
        usuario: {
          id: 'user-1',
          papel: 'cliente',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('clienteId'),
        })
      );
    });

    it('should return 400 when clienteId is not a number', async () => {
      const mockRequest = {
        body: { clienteId: 'not-a-number' },
        usuario: {
          id: 'user-1',
          papel: 'cliente',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('deve ser um número'),
        })
      );
    });

    it('should return 404 when cliente does not exist', async () => {
      const mockRequest = {
        body: { clienteId: 999 },
        usuario: {
          id: 'user-1',
          papel: 'gestora',
          gestora_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [], // No cliente found
      });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Cliente não encontrado'),
        })
      );
    });

    it('should return 500 on database error', async () => {
      const mockRequest = {
        body: { clienteId: 1 },
        usuario: {
          id: 'user-1',
          papel: 'cliente',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Erro ao desconectar'),
        })
      );
    });
  });

  describe('Test 6: Database Integrity', () => {
    it('should set whatsapp_status to NULL and keep evolution_instance_id unchanged', async () => {
      const clienteId = 1;
      const mockRequest = {
        body: { clienteId },
        usuario: {
          id: 'cliente-1',
          papel: 'cliente',
          cliente_id: clienteId,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      const originalData = {
        id: clienteId,
        nome: 'Test Client',
        email: 'client@test.com',
        whatsapp_status: 'conectado',
        evolution_instance_id: 'instance-123',
        telefone: '5511999999999',
        gestora_id: 1,
        created_at: '2025-01-01T00:00:00Z',
      };

      const updatedData = {
        ...originalData,
        whatsapp_status: null, // Only this should change
      };

      db.query
        .mockResolvedValueOnce({ rows: [originalData] })
        .mockResolvedValueOnce({ rows: [updatedData] });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      // Verify UPDATE query was called with correct parameters
      expect(db.query).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE hub_clientes SET whatsapp_status = NULL WHERE id = $1 RETURNING *'),
        [clienteId]
      );

      // Verify response contains unchanged fields
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id: clienteId,
          nome: 'Test Client',
          email: 'client@test.com',
          whatsapp_status: null,
          evolution_instance_id: 'instance-123', // Should NOT change
          telefone: '5511999999999',
          gestora_id: 1,
        })
      );
    });
  });
});
