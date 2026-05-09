const { consultarSaldo, resgatarPontos } = require("../../aplicacao/fidelidadeServico");

function saldo(req, res) {
  res.json(consultarSaldo(req.usuario));
}

function resgatar(req, res) {
  res.json(resgatarPontos(req.usuario, req.body || {}));
}

module.exports = {
  saldo,
  resgatar
};

