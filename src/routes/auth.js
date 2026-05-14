import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_troque_em_producao';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

async function login(request, reply) {
  try {
    const { email, senha } = request.body;

    // Validar entrada
    if (!email || !senha) {
      return reply.status(400).send({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário por email
    const { rows: usuarios } = await db.query(
      'SELECT id, nome, email, senha_hash, papel, cliente_id, gestora_id FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarios.length === 0) {
      return reply.status(401).send({ error: 'Email ou senha incorretos' });
    }

    const usuario = usuarios[0];

    // Verificar senha
    let senhaValida = false;
    try {
      senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    } catch (err) {
      console.error('[Login] Erro ao verificar senha:', err.message);
      return reply.status(500).send({ error: 'Erro ao verificar credenciais' });
    }

    if (!senhaValida) {
      return reply.status(401).send({ error: 'Email ou senha incorretos' });
    }

    // Gerar JWT token
    const payload = {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      papel: usuario.papel,
      cliente_id: usuario.cliente_id,
      gestora_id: usuario.gestora_id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

    // Retornar token e dados do usuário
    return reply.send({
      token,
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        papel: usuario.papel,
      },
    });
  } catch (error) {
    console.error('[Login] Erro:', error.message);
    return reply.status(500).send({ error: 'Erro ao processar login' });
  }
}

export default {
  login,
};
