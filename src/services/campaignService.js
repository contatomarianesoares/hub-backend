const { supabase } = require('../database/connection');
const evolution = require('./evolutionClient');

/**
 * Send a campaign to all recipients
 * hub_contatos.campanha_id links contacts to campaigns
 * hub_disparos: contato_id, step, status, evolution_message_id, enviado_at, erro_msg
 *
 * @param {Object} campaign - Campaign data from hub_campanhas
 * @returns {Promise<Object>} Campaign send result
 */
async function sendCampaign(campaign) {
  const { id: campaignId, cliente_id: clientId } = campaign;

  try {
    console.info(`[CAMPAIGN] Starting campaign ${campaignId} send`);

    // Get contatos linked to this campaign
    const { data: contatos, error: contatosError } = await supabase
      .from('hub_contatos')
      .select('id, telefone, nome')
      .eq('campanha_id', campaignId);

    if (contatosError) throw contatosError;

    if (!contatos || contatos.length === 0) {
      return { campaignId, totalRecipients: 0, sent: 0, failed: 0 };
    }

    // Use the cliente's evolution_instance_id
    const { data: cliente, error: clienteError } = await supabase
      .from('hub_clientes')
      .select('id, evolution_instance_id')
      .eq('id', clientId)
      .single();

    if (clienteError) throw clienteError;

    const instanceName = cliente?.evolution_instance_id || `hub_${clientId}`;

    let sent = 0;
    let failed = 0;

    for (const contato of contatos) {
      try {
        const response = await evolution.enviarTexto({
          clientId: instanceName,
          telefone: contato.telefone,
          mensagem: campaign.nome || 'Campanha',
        });

        const evolutionMessageId = response?.data?.key?.id || response?.data?.id || null;

        // Insert disparo record
        const { error: insertError } = await supabase
          .from('hub_disparos')
          .insert({
            contato_id: contato.id,
            step: 1,
            status: evolutionMessageId ? 'enviado' : 'erro',
            evolution_message_id: evolutionMessageId,
            enviado_at: new Date().toISOString(),
            erro_msg: evolutionMessageId ? null : 'No message ID returned',
          });

        if (insertError) {
          console.warn(`[CAMPAIGN] Failed to log disparo: ${insertError.message}`);
        }

        if (evolutionMessageId) {
          sent++;
          console.info(`[CAMPAIGN] Sent to ${contato.telefone}`);
        } else {
          failed++;
          console.warn(`[CAMPAIGN] No message ID for ${contato.telefone}`);
        }
      } catch (error) {
        failed++;
        console.error(`[CAMPAIGN] Error sending to ${contato.telefone}: ${error.message}`);
      }
    }

    console.info(`[CAMPAIGN] Campaign ${campaignId} done. Sent: ${sent}, Failed: ${failed}`);

    return {
      campaignId,
      totalRecipients: contatos.length,
      sent,
      failed,
    };
  } catch (error) {
    console.error(`[CAMPAIGN] Error in sendCampaign: ${error.message}`, error);
    throw error;
  }
}

/**
 * Get campaign status with message statistics
 * Uses hub_contatos.campanha_id → hub_disparos.contato_id join
 *
 * @param {string} campaignId - Campaign UUID
 * @returns {Promise<Object>} Campaign status
 */
async function getCampaignStatus(campaignId) {
  try {
    // Get campaign info
    const { data: campaign, error: campaignError } = await supabase
      .from('hub_campanhas')
      .select('id, nome, status, banco, desconto_max, evento_at')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) return null;

    // Get all contatos for this campaign
    const { data: contatos, error: contatosError } = await supabase
      .from('hub_contatos')
      .select('id')
      .eq('campanha_id', campaignId);

    if (contatosError) throw contatosError;

    const contatoIds = (contatos || []).map(c => c.id);
    let disparoCounts = { enviado: 0, erro: 0, pendente: 0, total: 0 };

    if (contatoIds.length > 0) {
      const { data: disparos, error: disparosError } = await supabase
        .from('hub_disparos')
        .select('status')
        .in('contato_id', contatoIds);

      if (!disparosError && disparos) {
        disparoCounts.total = disparos.length;
        for (const d of disparos) {
          if (disparoCounts[d.status] !== undefined) disparoCounts[d.status]++;
          else disparoCounts[d.status] = 1;
        }
      }
    }

    return {
      nome: campaign.nome,
      status: campaign.status,
      banco: campaign.banco,
      desconto_max: campaign.desconto_max,
      evento_at: campaign.evento_at,
      totalContatos: contatoIds.length,
      disparos: disparoCounts,
    };
  } catch (error) {
    console.error(`[CAMPAIGN] Error getting status: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  sendCampaign,
  getCampaignStatus,
};
