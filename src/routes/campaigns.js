const { supabase } = require('../database/connection');
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
    const { data: campaign, error } = await supabase
      .from('hub_campanhas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

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
