const { pegarBanco } = require("../infraestrutura/banco");
const { erroValidacao } = require("../api/middlewares/erro");

function centavosParaReais(valor) {
  return Number((valor / 100).toFixed(2));
}

function listarUnidades() {
  return pegarBanco()
    .prepare("SELECT id, nome, cidade, ativa FROM unidades ORDER BY id")
    .all()
    .map((unidade) => ({ ...unidade, ativa: Boolean(unidade.ativa) }));
}

function listarProdutos(page = 1, limit = 10) {
  const db = pegarBanco();
  const pagina = Math.max(Number(page || 1), 1);
  const limite = Math.min(Math.max(Number(limit || 10), 1), 50);
  const offset = (pagina - 1) * limite;
  const total = db.prepare("SELECT COUNT(*) AS total FROM produtos").get().total;

  const dados = db.prepare(`
    SELECT id, nome, descricao, preco_centavos AS precoCentavos, ativo
    FROM produtos
    ORDER BY id
    LIMIT ? OFFSET ?
  `).all(limite, offset).map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    preco: centavosParaReais(produto.precoCentavos),
    ativo: Boolean(produto.ativo)
  }));

  return { page: pagina, limit: limite, total, dados };
}

function criarProduto(dados) {
  const detalhes = [];
  if (!dados.nome) detalhes.push({ field: "nome", issue: "Nome e obrigatorio." });
  if (typeof dados.preco !== "number" || dados.preco <= 0) detalhes.push({ field: "preco", issue: "Preco deve ser maior que zero." });

  if (detalhes.length) {
    throw erroValidacao("Dados invalidos para produto.", detalhes);
  }

  const db = pegarBanco();
  const resultado = db.prepare(`
    INSERT INTO produtos (nome, descricao, preco_centavos, ativo)
    VALUES (?, ?, ?, 1)
  `).run(dados.nome, dados.descricao || "", Math.round(dados.preco * 100));

  return {
    id: resultado.lastInsertRowid,
    nome: dados.nome,
    descricao: dados.descricao || "",
    preco: dados.preco,
    ativo: true
  };
}

function cardapioDaUnidade(unidadeId) {
  const db = pegarBanco();

  return db.prepare(`
    SELECT p.id, p.nome, p.descricao, p.preco_centavos AS precoCentavos,
           e.quantidade AS estoque, c.disponivel
    FROM cardapios c
    JOIN produtos p ON p.id = c.produto_id
    LEFT JOIN estoques e ON e.produto_id = p.id AND e.unidade_id = c.unidade_id
    WHERE c.unidade_id = ? AND p.ativo = 1
    ORDER BY p.nome
  `).all(Number(unidadeId)).map((produto) => ({
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    preco: centavosParaReais(produto.precoCentavos),
    disponivel: Boolean(produto.disponivel) && produto.estoque > 0,
    estoque: produto.estoque || 0
  }));
}

module.exports = {
  listarUnidades,
  listarProdutos,
  criarProduto,
  cardapioDaUnidade
};

