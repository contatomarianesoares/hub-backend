const { supabase } = require('../database/connection');
const evolution = require('./evolutionClient');

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
    const { data: recipients, error: recipientsError } = await supabase
      .from('hub_contatos')
      .select('id, telefone')
      .eq('ativo', true)
      .limit(1000);

    if (recipientsError) throw recipientsError;

    let sent = 0;
    let failed = 0;

    // Send message to each recipient
    for (const recipient of recipients || []) {
      try {
        const response = await evolution.enviarTexto({
          clientId,
          telefone: recipient.telefone,
          mensagem,
        });

        if (response?.data?.id) {
          // Log disparo
          const { error: insertError } = await supabase
            .from('hub_disparos')
            .insert({
              campanha_id: campaignId,
              contato_id: recipient.id,
              cliente_id: clientId,
              evolution_message_id: response.data.id,
              status: 'enviando',
            });

          if (insertError) {
            console.warn(`[CAMPAIGN] Failed to log disparo: ${insertError.message}`);
          }

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
      totalRecipients: (recipients || []).length,
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
    // Get campaign info
    const { data: campaign, error: campaignError } = await supabase
      .from('hub_campanhas')
      .select('id, titulo')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) return null;

    // Get disparo counts grouped by status
    const { data: disparos, error: disparosError } = await supabase
      .from('hub_disparos')
      .select('status')
      .eq('campanha_id', campaignId);

    if (disparosError) throw disparosError;

    const counts = { enviado: 0, entregue: 0, lido: 0, erro: 0 };
    for (const d of disparos || []) {
      if (counts[d.status] !== undefined) counts[d.status]++;
    }

    return {
      titulo: campaign.titulo,
      total: (disparos || []).length,
      enviado: counts.enviado,
      entregue: counts.entregue,
      lido: counts.lido,
      erro: counts.erro,
    };
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
