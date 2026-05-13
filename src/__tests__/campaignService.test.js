import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../database/connection.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../services/evolutionClient.js', () => ({
  default: {
    enviarTexto: vi.fn(),
  },
}));

const campaignService = await import('../services/campaignService.js');
const { default: db } = await import('../database/connection.js');
const { default: evolution } = await import('../services/evolutionClient.js');

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

      const result = await campaignService.default.sendCampaign(campaignData);

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

      const result = await campaignService.default.sendCampaign(campaignData);

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

      const result = await campaignService.default.getCampaignStatus(1);

      expect(result).toEqual(
        expect.objectContaining({
          titulo: 'Test Campaign',
          total: 10,
        })
      );
    });
  });
});

