const {
  criarPedido,
  listarPedidos,
  buscarPedido,
  atualizarStatus
} = require("../../aplicacao/pedidoServico");

function criar(req, res) {
  res.status(201).json(criarPedido(req.usuario, req.body || {}));
}

function listar(req, res) {
  res.json(listarPedidos(req.query, req.usuario));
}

function buscar(req, res) {
  res.json(buscarPedido(req.params.id, req.usuario));
}

function status(req, res) {
  res.json(atualizarStatus(req.params.id, req.body.status, req.usuario));
}

module.exports = {
  criar,
  listar,
  buscar,
  status
};

