const { pegarBanco } = require("../infraestrutura/banco");

function registrarAuditoria(usuarioId, acao, entidade, entidadeId, dados = {}) {
  const db = pegarBanco();
  db.prepare(`
    INSERT INTO auditorias (usuario_id, acao, entidade, entidade_id, dados)
    VALUES (?, ?, ?, ?, ?)
  `).run(usuarioId || null, acao, entidade, entidadeId || null, JSON.stringify(dados));
}

function listarAuditorias(page = 1, limit = 20) {
  const db = pegarBanco();
  const offset = (page - 1) * limit;

  return db.prepare(`
    SELECT a.id, a.acao, a.entidade, a.entidade_id AS entidadeId,
           a.dados, a.criado_em AS criadoEm,
           u.id AS usuarioId, u.nome AS usuarioNome, u.perfil AS usuarioPerfil
    FROM auditorias a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset).map((linha) => ({
    ...linha,
    dados: linha.dados ? JSON.parse(linha.dados) : {}
  }));
}

module.exports = {
  registrarAuditoria,
  listarAuditorias
};

