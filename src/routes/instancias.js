import db from '../database/connection.js';

async function desconectar(request, reply) {
  try {
    const { clienteId } = request.body;
    const usuario = request.usuario;

    if (!clienteId || typeof clienteId !== 'number') {
      return reply.status(400).send({ erro: 'clienteId é obrigatório e deve ser um número' });
    }

    const { rows: clientes } = await db.query(
      'SELECT id, gestora_id, whatsapp_status FROM hub_clientes WHERE id = $1',
      [clienteId]
    );

    if (clientes.length === 0) {
      return reply.status(404).send({ erro: 'Cliente não encontrado' });
    }

    const cliente = clientes[0];

    if (usuario.papel === 'gestora') {
      if (cliente.gestora_id !== usuario.gestora_id) {
        return reply.status(403).send({ erro: 'Acesso negado: cliente não pertence à sua gestora' });
      }
    } else if (usuario.papel === 'cliente') {
      if (clienteId !== usuario.cliente_id) {
        return reply.status(403).send({ erro: 'Acesso negado: você pode apenas desconectar sua própria conta' });
      }
    } else {
      return reply.status(403).send({ erro: 'Acesso negado: papel de usuário inválido' });
    }

    const { rows: updated } = await db.query(
      'UPDATE hub_clientes SET whatsapp_status = NULL WHERE id = $1 RETURNING *',
      [clienteId]
    );

    if (updated.length === 0) {
      return reply.status(500).send({ erro: 'Falha ao desconectar: nenhuma linha atualizada' });
    }

    return reply.send(updated[0]);
  } catch (error) {
    console.error(`[Instâncias] Erro ao desconectar cliente: ${error.message}`, error);
    return reply.status(500).send({ erro: `Erro ao desconectar: ${error.message}` });
  }
}

export default {
  desconectar,
};
