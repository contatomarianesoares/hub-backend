import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_troque_em_producao';

function verificarToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function autenticar(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ erro: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verificarToken(token);

    request.usuario = {
      id: payload.id,
      email: payload.email,
      papel: payload.papel,
      nome: payload.nome,
      cliente_id: payload.cliente_id,
      gestora_id: payload.gestora_id,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.code(401).send({ erro: 'Token expirado' });
    }
    return reply.code(401).send({ erro: 'Token inválido' });
  }
}

export default {
  verificarToken,
  autenticar,
};
