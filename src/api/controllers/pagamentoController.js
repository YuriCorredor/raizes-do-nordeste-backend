const { simularPagamento } = require("../../aplicacao/pagamentoServico");

function pagar(req, res) {
  res.status(201).json(simularPagamento(req.usuario, req.body || {}));
}

module.exports = {
  pagar
};

