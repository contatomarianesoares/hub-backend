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

/**
 * Create a new WhatsApp instance on Evolution API
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID
 * @returns {Promise<Object>} Response from Evolution API
 */
async function createInstance({ clientId }) {
  try {
    const instanceName = `hub_${clientId}`;
    console.info(`[EVOLUTION] Creating instance: ${instanceName}`);

    const response = await evolutionClient.post(`/instance/create`, {
      instanceName,
      token: process.env.EVOLUTION_API_TOKEN || 'webhook_token',
      qrcode: true,
    });

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error creating instance: ${error.message}`, error);
    throw error;
  }
}

/**
 * List all instances on Evolution API
 * @returns {Promise<Object>} List of instances
 */
async function listInstances() {
  try {
    console.info('[EVOLUTION] Listing all instances');
    const response = await evolutionClient.get(`/instance/list`);
    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error listing instances: ${error.message}`, error);
    throw error;
  }
}

/**
 * Register webhook for an instance
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID
 * @param {string} options.webhookUrl - Webhook URL
 * @param {Array<string>} options.events - Events to receive
 * @returns {Promise<Object>} Response from Evolution API
 */
async function registerWebhook({ clientId, webhookUrl, events = [] }) {
  try {
    const instanceName = `hub_${clientId}`;
    console.info(`[EVOLUTION] Registering webhook for ${instanceName}: ${webhookUrl}`);

    const response = await evolutionClient.post(`/webhook/save/${instanceName}`, {
      url: webhookUrl,
      events: events.length > 0 ? events : ['MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
    });

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error registering webhook: ${error.message}`, error);
    throw error;
  }
}

/**
 * Update webhook configuration for an instance
 * @param {Object} options
 * @param {number} options.clientId - Hub client ID
 * @param {string} options.webhookUrl - New webhook URL
 * @returns {Promise<Object>} Response from Evolution API
 */
async function updateWebhook({ clientId, webhookUrl }) {
  try {
    const instanceName = `hub_${clientId}`;
    console.info(`[EVOLUTION] Updating webhook for ${instanceName}: ${webhookUrl}`);

    const response = await evolutionClient.put(`/webhook/save/${instanceName}`, {
      url: webhookUrl,
    });

    return response.data;
  } catch (error) {
    console.error(`[EVOLUTION] Error updating webhook: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  enviarTexto,
  getInstanceStatus,
  createInstance,
  listInstances,
  registerWebhook,
  updateWebhook,
  evolutionClient,
};
