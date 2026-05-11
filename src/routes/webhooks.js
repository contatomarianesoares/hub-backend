const db = require('../database/connection').default;

/**
 * Handle MESSAGES_UPDATE webhook events from Evolution API
 * Updates hub_disparos message status based on Evolution's status
 */
async function handleMessagesUpdate(payload) {
  try {
    const { data } = payload;
    const { messageId, messageStatus } = data;

    // Log the incoming event
    console.info(`[WEBHOOK] Processing MESSAGES_UPDATE: messageId=${messageId}, status=${messageStatus}`);

    // Map Evolution status to Hub status
    let hubStatus, updateQuery, updateParams;

    switch (messageStatus) {
      case 'sent':
        hubStatus = 'enviado';
        updateQuery = `
          UPDATE hub_disparos
          SET status = $1
          WHERE evolution_message_id = $2
          RETURNING id
        `;
        updateParams = [hubStatus, messageId];
        break;

      case 'delivered':
        hubStatus = 'entregue';
        updateQuery = `
          UPDATE hub_disparos
          SET status = $1, entregue_at = NOW()
          WHERE evolution_message_id = $2
          RETURNING id
        `;
        updateParams = [hubStatus, messageId];
        break;

      case 'read':
        hubStatus = 'lido';
        updateQuery = `
          UPDATE hub_disparos
          SET status = $1, lido_at = NOW()
          WHERE evolution_message_id = $2
          RETURNING id
        `;
        updateParams = [hubStatus, messageId];
        break;

      case 'error':
        hubStatus = 'erro';
        updateQuery = `
          UPDATE hub_disparos
          SET status = $1, erro_msg = $2
          WHERE evolution_message_id = $3
          RETURNING id
        `;
        updateParams = [hubStatus, 'Evolution reported error', messageId];
        break;

      case 'pending':
        // No update needed for pending status
        console.info(`[WEBHOOK] Ignoring pending status for messageId=${messageId}`);
        return;

      default:
        console.warn(`[WEBHOOK] Unknown messageStatus: ${messageStatus}`);
        return;
    }

    // Execute update
    const result = await db.query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      console.warn(`[WEBHOOK] No disparo found for evolution_message_id: ${messageId}`);
      return;
    }

    console.info(
      `[WEBHOOK] Successfully updated disparo (id=${result.rows[0].id}) status to "${hubStatus}"`
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

    // Log the incoming event
    console.info(`[WEBHOOK] Processing CONNECTION_UPDATE: instanceName=${instanceName}, status=${status}`);

    // Extract clientId from instanceName format: "hub_${clienteId}"
    const match = instanceName.match(/^hub_(\d+)$/);
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

    // Execute update
    const updateQuery = `
      UPDATE hub_clientes
      SET whatsapp_status = $1
      WHERE id = $2
      RETURNING id
    `;

    const result = await db.query(updateQuery, [hubStatus, clientId]);

    if (result.rows.length === 0) {
      console.warn(`[WEBHOOK] No cliente found with id: ${clientId}`);
      return;
    }

    console.info(
      `[WEBHOOK] Successfully updated cliente (id=${clientId}) whatsapp_status to "${hubStatus}"`
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

    // Log webhook receipt
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
    // Still return 200 OK since we've already sent response
  }
}

module.exports = {
  webhook,
  handleMessagesUpdate,
  handleConnectionUpdate,
};
