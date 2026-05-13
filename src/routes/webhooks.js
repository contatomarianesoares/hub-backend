const { supabase } = require('../database/connection');

/**
 * Handle MESSAGES_UPDATE webhook events from Evolution API
 * Updates hub_disparos message status based on Evolution's status
 */
async function handleMessagesUpdate(payload) {
  try {
    const { data } = payload;
    const { messageId, messageStatus } = data;

    console.info(`[WEBHOOK] Processing MESSAGES_UPDATE: messageId=${messageId}, status=${messageStatus}`);

    // Map Evolution status to Hub status
    let updateData;

    // hub_disparos valid statuses: pendente, enviado, erro
    // Map Evolution statuses to hub statuses
    switch (messageStatus) {
      case 'DELIVERY_ACK':
      case 'delivered':
      case 'sent':
        updateData = { status: 'enviado' };
        break;
      case 'READ':
      case 'read':
        updateData = { status: 'enviado' }; // mark as enviado (READ is a bonus update)
        break;
      case 'ERROR':
      case 'error':
        updateData = { status: 'erro', erro_msg: 'Evolution reported error' };
        break;
      case 'PENDING':
      case 'pending':
        console.info(`[WEBHOOK] Ignoring pending status for messageId=${messageId}`);
        return;
      default:
        console.warn(`[WEBHOOK] Unknown messageStatus: ${messageStatus}`);
        return;
    }

    // Execute update via Supabase
    const { data: updated, error } = await supabase
      .from('hub_disparos')
      .update(updateData)
      .eq('evolution_message_id', messageId)
      .select('id');

    if (error) {
      console.error(`[WEBHOOK] DB error updating disparo: ${error.message}`);
      return;
    }

    if (!updated || updated.length === 0) {
      console.warn(`[WEBHOOK] No disparo found for evolution_message_id: ${messageId}`);
      return;
    }

    console.info(
      `[WEBHOOK] Updated disparo (id=${updated[0].id}) status to "${updateData.status}"`
    );
  } catch (error) {
    console.error(`[WEBHOOK] Error processing MESSAGES_UPDATE: ${error.message}`, error);
    // Don't throw - webhook receiver returns 200 OK regardless
  }
}

/**
 * Handle CONNECTION_UPDATE webhook events from Evolution API
 * Updates hub_clientes WhatsApp connection status
 */
async function handleConnectionUpdate(payload) {
  try {
    const { data } = payload;
    const { instanceName, status } = data;

    console.info(`[WEBHOOK] Processing CONNECTION_UPDATE: instanceName=${instanceName}, status=${status}`);

    // Extract clientId from instanceName format: "hub_${clienteId}"
    const match = instanceName && instanceName.match(/^hub_(\d+)$/);
    if (!match) {
      console.warn(`[WEBHOOK] Invalid instanceName format: ${instanceName}`);
      return;
    }

    const clientId = parseInt(match[1], 10);

    // Map Evolution status to Hub status
    let hubStatus;
    switch (status) {
      case 'open':
        hubStatus = 'conectado';
        break;
      case 'close':
        hubStatus = 'desconectado';
        break;
      default:
        console.warn(`[WEBHOOK] Unknown CONNECTION_UPDATE status: ${status}`);
        return;
    }

    // Execute update via Supabase
    const { data: updated, error } = await supabase
      .from('hub_clientes')
      .update({ whatsapp_status: hubStatus })
      .eq('id', clientId)
      .select('id');

    if (error) {
      console.error(`[WEBHOOK] DB error updating cliente: ${error.message}`);
      return;
    }

    if (!updated || updated.length === 0) {
      console.warn(`[WEBHOOK] No cliente found with id: ${clientId}`);
      return;
    }

    console.info(
      `[WEBHOOK] Updated cliente (id=${clientId}) whatsapp_status to "${hubStatus}"`
    );
  } catch (error) {
    console.error(
      `[WEBHOOK] Error processing CONNECTION_UPDATE: ${error.message}`,
      error
    );
    // Don't throw - webhook receiver returns 200 OK regardless
  }
}

/**
 * Main webhook endpoint handler
 * POST /webhooks/evolution
 * Receives Evolution API webhook events and processes them asynchronously
 */
async function webhook(request, reply) {
  try {
    const payload = request.body;

    console.info(`[WEBHOOK] Received webhook event: ${payload.event}`);

    // Return 200 OK immediately (fire-and-forget pattern)
    reply.status(200).send({ success: true });

    // Process webhook asynchronously
    if (payload.event === 'MESSAGES_UPDATE') {
      await handleMessagesUpdate(payload);
    } else if (payload.event === 'CONNECTION_UPDATE') {
      await handleConnectionUpdate(payload);
    } else {
      console.warn(`[WEBHOOK] Unknown event type: ${payload.event}`);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Unhandled error in webhook receiver: ${error.message}`, error);
  }
}

module.exports = {
  webhook,
  handleMessagesUpdate,
  handleConnectionUpdate,
};
