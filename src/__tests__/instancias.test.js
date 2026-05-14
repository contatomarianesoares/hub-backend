import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../database/connection.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../middleware/auth.js', () => ({
  default: {
    autenticar: vi.fn(async (request, reply) => {
      request.usuario = {
        id: 'user-123',
        email: 'user@example.com',
        papel: 'gestora',
        nome: 'Test User',
      };
    }),
  },
}));

vi.mock('../services/evolutionClient.js', () => ({
  default: {
    getInstanceStatus: vi.fn(),
  },
}));

const instancias = await import('../routes/instancias.js');
const dbModule = await import('../database/connection.js');
const evolutionModule = await import('../services/evolutionClient.js');

const db = dbModule.default;
const evo = evolutionModule.default;

describe('Instâncias Routes - Disconnect Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /instancias/desconectar', () => {
    it('should disconnect a cliente when gestora disconnects a client in their gestora', async () => {
      const mockRequest = {
        body: { clienteId: 1 },
        usuario: {
          id: 'user-123',
          papel: 'gestora',
          gestora_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, gestora_id: 1, whatsapp_status: 'conectado' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, gestora_id: 1, whatsapp_status: null }],
        });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('hub_clientes WHERE id = $1'),
        [1]
      );
      expect(db.query).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE hub_clientes SET whatsapp_status = NULL WHERE id = $1 RETURNING *'),
        [1]
      );
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          whatsapp_status: null,
        })
      );
    });

    it('should allow cliente to disconnect their own account', async () => {
      const mockRequest = {
        body: { clienteId: 1 },
        usuario: {
          id: 'cliente-1',
          papel: 'cliente',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, whatsapp_status: 'conectado' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, whatsapp_status: null }],
        });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          whatsapp_status: null,
        })
      );
    });

    it('should return 403 when cliente tries to disconnect another clients account', async () => {
      const mockRequest = {
        body: { clienteId: 2 },
        usuario: {
          id: 'cliente-1',
          papel: 'cliente',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 2, gestora_id: 1 }],
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

    it('should return 403 when gestora tries to disconnect client from another gestora', async () => {
      const mockRequest = {
        body: { clienteId: 1 },
        usuario: {
          id: 'user-123',
          papel: 'gestora',
          gestora_id: 2,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, gestora_id: 1 }],
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

    it('should return 404 when cliente not found', async () => {
      const mockRequest = {
        body: { clienteId: 999 },
        usuario: {
          id: 'user-123',
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
        rows: [],
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

    it('should return updated cliente with whatsapp_status: null', async () => {
      const mockRequest = {
        body: { clienteId: 1 },
        usuario: {
          id: 'user-123',
          papel: 'gestora',
          gestora_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      const updatedCliente = {
        id: 1,
        nome: 'Test Cliente',
        email: 'cliente@test.com',
        whatsapp_status: null,
      };

      db.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, gestora_id: 1, whatsapp_status: 'conectado' }],
        })
        .mockResolvedValueOnce({
          rows: [updatedCliente],
        });

      const handler = instancias.default.desconectar;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(updatedCliente);
    });

    it('should handle database errors gracefully', async () => {
      const mockRequest = {
        body: { clienteId: 1 },
        usuario: {
          id: 'user-123',
          papel: 'gestora',
          gestora_id: 1,
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

  describe('GET /instancias/qr', () => {
    it('should return conectado: true when instance state is open', async () => {
      const mockRequest = {
        usuario: {
          id: 'cliente-1',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, evolution_instance_id: 'hub_1' }],
      });

      evo.getInstanceStatus.mockResolvedValueOnce({
        instance: { instanceName: 'hub_1' },
        state: 'open',
      });

      const handler = instancias.default.obterQR;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          conectado: true,
          status: 'conectado',
          instanceName: 'hub_1',
        })
      );
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should return QR code when instance is not connected', async () => {
      const mockRequest = {
        usuario: {
          id: 'cliente-1',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, evolution_instance_id: 'hub_1' }],
      });

      evo.getInstanceStatus.mockResolvedValueOnce({
        instance: { instanceName: 'hub_1' },
        state: 'disconnected',
        qrcode: {
          base64: 'data:image/png;base64,iVBORw0KGgo...',
        },
      });

      const handler = instancias.default.obterQR;
      await handler(mockRequest, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          conectado: false,
          qr: 'data:image/png;base64,iVBORw0KGgo...',
          qrcode: 'data:image/png;base64,iVBORw0KGgo...',
          instanceName: 'hub_1',
        })
      );
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should return 404 when cliente not found', async () => {
      const mockRequest = {
        usuario: {
          id: 'cliente-1',
          cliente_id: 999,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [],
      });

      const handler = instancias.default.obterQR;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Cliente não encontrado'),
        })
      );
    });

    it('should handle Evolution API errors gracefully', async () => {
      const mockRequest = {
        usuario: {
          id: 'cliente-1',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, evolution_instance_id: 'hub_1' }],
      });

      evo.getInstanceStatus.mockRejectedValueOnce(new Error('Evolution API error'));

      const handler = instancias.default.obterQR;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Erro ao obter QR code'),
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockRequest = {
        usuario: {
          id: 'cliente-1',
          cliente_id: 1,
        },
      };

      const mockReply = {
        status: vi.fn(() => mockReply),
        send: vi.fn(),
        code: vi.fn(() => mockReply),
      };

      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const handler = instancias.default.obterQR;
      await handler(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          erro: expect.stringContaining('Erro ao obter QR code'),
        })
      );
    });
  });
});
