const db = require('../database/connection').default;
const { enviarTexto } = require('../services/evolutionClient');

/**
 * Process message sends and store Evolution message ID for webhook tracking
 */
async function processMessageSend(disparoId, clientId, telefone, mensagem) {
  try {
    console.info(`[WORKER] Processing disparo ${disparoId} for cliente ${clientId}`);

    // Send message via Evolution API
    const response = await enviarTexto({
      clientId,
      telefone,
      mensagem,
    });

    // Capture Evolution's message ID from response
    const evolution_message_id = response?.data?.id || null;

    if (evolution_message_id) {
      console.info(
        `[WORKER] Received evolution_message_id: ${evolution_message_id} for disparo ${disparoId}`
      );

      // Store evolution_message_id in hub_disparos for webhook tracking
      const updateQuery = `
        UPDATE hub_disparos
        SET evolution_message_id = $1
        WHERE id = $2
        RETURNING id
      `;

      const result = await db.query(updateQuery, [evolution_message_id, disparoId]);

      if (result.rows.length === 0) {
        console.warn(`[WORKER] Could not find disparo ${disparoId} to update evolution_message_id`);
      } else {
        console.info(
          `[WORKER] Successfully stored evolution_message_id for disparo ${disparoId}`
        );
      }
    } else {
      console.warn(
        `[WORKER] No evolution_message_id returned from Evolution API for disparo ${disparoId}`
      );
    }

    return response;
  } catch (error) {
    console.error(
      `[WORKER] Error processing message send for disparo ${disparoId}: ${error.message}`,
      error
    );
    throw error;
  }
}

/**
 * Process batch of disparos (messages) from queue
 */
async function processBatch(disparos) {
  try {
    console.info(`[WORKER] Processing batch of ${disparos.length} disparos`);

    const results = [];

    for (const disparo of disparos) {
      try {
        const result = await processMessageSend(
          disparo.id,
          disparo.cliente_id,
          disparo.telefone,
          disparo.mensagem
        );
        results.push({ disparoId: disparo.id, success: true, result });
      } catch (error) {
        console.error(
          `[WORKER] Failed to process disparo ${disparo.id}: ${error.message}`
        );
        results.push({ disparoId: disparo.id, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error(`[WORKER] Error processing batch: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  processMessageSend,
  processBatch,
};
