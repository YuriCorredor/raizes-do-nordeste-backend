const {
  listarUnidades,
  listarProdutos,
  criarProduto,
  cardapioDaUnidade
} = require("../../aplicacao/catalogoServico");

function unidades(req, res) {
  res.json(listarUnidades());
}

function produtos(req, res) {
  res.json(listarProdutos(req.query.page, req.query.limit));
}

function novoProduto(req, res) {
  res.status(201).json(criarProduto(req.body || {}));
}

function cardapio(req, res) {
  res.json(cardapioDaUnidade(req.params.id));
}

module.exports = {
  unidades,
  produtos,
  novoProduto,
  cardapio
};

