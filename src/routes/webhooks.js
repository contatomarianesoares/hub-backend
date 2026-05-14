import db from '../database/connection.js';

async function handleMessagesUpdate(payload) {
  try {
    const { data } = payload;
    const { messageId, messageStatus } = data;

    console.info(`[WEBHOOK] Processing MESSAGES_UPDATE: messageId=${messageId}, status=${messageStatus}`);

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
        console.info(`[WEBHOOK] Ignoring pending status for messageId=${messageId}`);
        return;

      default:
        console.warn(`[WEBHOOK] Unknown messageStatus: ${messageStatus}`);
        return;
    }

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
  }
}

async function handleConnectionUpdate(payload) {
  try {
    const { data } = payload;
    const { instanceName, status } = data;

    console.info(`[WEBHOOK] Processing CONNECTION_UPDATE: instanceName=${instanceName}, status=${status}`);

    const match = instanceName.match(/^hub_(\d+)$/);
    if (!match) {
      console.warn(`[WEBHOOK] Invalid instanceName format: ${instanceName}`);
      return;
    }

    const clientId = parseInt(match[1], 10);

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
  }
}

async function webhook(request, reply) {
  try {
    const payload = request.body;

    console.info(`[WEBHOOK] Received webhook event: ${payload.event}`);

    reply.status(200).send({ success: true });

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

export default {
  webhook,
  handleMessagesUpdate,
  handleConnectionUpdate,
};
