const { listarAuditorias } = require("../../aplicacao/auditoriaServico");

function listar(req, res) {
  res.json(listarAuditorias(Number(req.query.page || 1), Number(req.query.limit || 20)));
}

module.exports = {
  listar
};

