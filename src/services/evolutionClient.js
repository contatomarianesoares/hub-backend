const axios = require('axios');

/**
 * Evolution API client
 * Connects to Evolution API at 152.67.53.192:8080
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://152.67.53.192:8080/api';

const evolutionClient = axios.create({
  baseURL: EVOLUTION_API_URL,
  timeout: 30000,
  validateStatus: () => true, // Don't throw on any status
});

/**
 * Send text message via Evolution API
 *
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID (used to identify instance)
 * @param {string} options.telefone - Recipient phone number (Brazil format: 55XXXXXXXXXXX)
 * @param {string} options.mensagem - Message text to send
 * @returns {Promise<Object>} Evolution API response with messageId
 */
async function enviarTexto({ clientId, telefone, mensagem }) {
  try {
    const instanceName = `hub_${clientId}`;

    const payload = {
      number: telefone,
      text: mensagem,
      delay: 1000, // 1 second delay between messages
    };

    console.info(
      `[EVOLUTION] Sending message via instance ${instanceName} to ${telefone}`
    );

    const response = await evolutionClient.post(
      `/message/sendText/${instanceName}`,
      payload
    );

    if (response.status === 200 && response.data?.id) {
      console.info(
        `[EVOLUTION] Message sent successfully. messageId: ${response.data.id}`
      );
      return response;
    } else {
      console.error(
        `[EVOLUTION] Failed to send message. Status: ${response.status}`,
        response.data
      );
      return response;
    }
  } catch (error) {
    console.error(`[EVOLUTION] Error sending message: ${error.message}`, error);
    throw error;
  }
}

/**
 * Get instance status from Evolution API
 *
 * @param {number} clientId - Hub client ID
 * @returns {Promise<Object>} Instance status from Evolution
 */
async function getInstanceStatus(clientId) {
  try {
    const instanceName = `hub_${clientId}`;

    const response = await evolutionClient.get(`/instance/info/${instanceName}`);

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error getting instance status: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  enviarTexto,
  getInstanceStatus,
  evolutionClient,
};
