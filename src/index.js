require('dotenv').config();

const Fastify = require('fastify');
const cors = require('@fastify/cors');
const webhooksRouter = require('./routes/webhooks');
const campaignsRouter = require('./routes/campaigns');

// Initialize Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register CORS
fastify.register(cors, {
  origin: true, // Allow all origins (restrict in production)
});

// Register webhook route
fastify.post('/webhooks/evolution', webhooksRouter.webhook);

// Register campaign routes
fastify.post('/campaigns/:id/send', campaignsRouter.sendCampaign);
fastify.get('/campaigns/:id/status', campaignsRouter.getCampaignStatus);

// Root endpoint - API info
fastify.get('/', async (request, reply) => {
  return {
    name: 'Hub Backend',
    version: '1.0.0',
    description: 'JuriAlvo WhatsApp Campaign Management Hub',
    status: 'ok',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      webhooks: '/webhooks/evolution',
      campaigns: '/campaigns/:id/send, /campaigns/:id/status',
    },
  };
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Hub health endpoint
fastify.get('/hub-health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
async function start() {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.info(`[SERVER] Hub backend listening on http://${host}:${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.info('[SERVER] SIGTERM received, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('[SERVER] SIGINT received, shutting down gracefully');
  await fastify.close();
  process.exit(0);
});

// Export for testing
module.exports = { fastify, start };

// Start if not imported as module
if (require.main === module) {
  start();
}
