import db from '../database/connection.js';
import evolution from './evolutionClient.js';

/**
 * Send a campaign to all recipients
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

export default {
  sendCampaign,
  getCampaignStatus,
};
