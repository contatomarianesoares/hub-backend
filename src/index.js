import Fastify from 'fastify';
import cors from '@fastify/cors';
import webhooksRouter from './routes/webhooks.js';
import instanciasRouter from './routes/instancias.js';
import authRouter from './routes/auth.js';
import authMiddleware from './middleware/auth.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',
  },
});

fastify.register(cors, {
  origin: true,
});

fastify.post('/auth/login', authRouter.login);

fastify.post('/webhooks/evolution', webhooksRouter.webhook);

fastify.post('/instancias/desconectar', {
  preHandler: authMiddleware.autenticar,
}, instanciasRouter.desconectar);

fastify.get('/instancias/qr', {
  preHandler: authMiddleware.autenticar,
}, instanciasRouter.obterQR);

fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

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

export { fastify, start };

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
