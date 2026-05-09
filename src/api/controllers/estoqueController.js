const { consultarEstoque, movimentarEstoque } = require("../../aplicacao/estoqueServico");

function listar(req, res) {
  res.json(consultarEstoque(req.query.unidadeId));
}

function movimentar(req, res) {
  res.status(201).json(movimentarEstoque(req.usuario, req.body || {}));
}

module.exports = {
  listar,
  movimentar
};

