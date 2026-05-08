const bcrypt = require("bcryptjs");
const { migrar } = require("../src/infraestrutura/migracoes");
const { pegarBanco, fecharBanco } = require("../src/infraestrutura/banco");

migrar();
const db = pegarBanco();

function criarUsuario(nome, email, perfil, consentimento = true) {
  const senhaHash = bcrypt.hashSync("123456", 10);
  db.prepare(`
    INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, perfil, consentimento_lgpd, pontos)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(nome, email, senhaHash, perfil, consentimento ? 1 : 0);
}

function inserir(sql, params = []) {
  db.prepare(sql).run(...params);
}

db.exec("BEGIN");
try {
  criarUsuario("Admin Geral", "admin@raizes.com", "ADMIN", true);
  criarUsuario("Gerente Centro", "gerente@raizes.com", "GERENTE", true);
  criarUsuario("Cozinha Centro", "cozinha@raizes.com", "COZINHA", true);
  criarUsuario("Cliente Maria", "cliente@raizes.com", "CLIENTE", true);
  criarUsuario("Atendente Joao", "atendente@raizes.com", "ATENDENTE", true);

  inserir("INSERT OR IGNORE INTO unidades (id, nome, cidade, ativa) VALUES (1, 'Unidade Centro', 'Recife', 1)");
  inserir("INSERT OR IGNORE INTO unidades (id, nome, cidade, ativa) VALUES (2, 'Unidade Praia', 'Natal', 1)");

  inserir("INSERT OR IGNORE INTO produtos (id, nome, descricao, preco_centavos, ativo) VALUES (1, 'Tapioca de queijo', 'Tapioca simples com queijo coalho', 1200, 1)");
  inserir("INSERT OR IGNORE INTO produtos (id, nome, descricao, preco_centavos, ativo) VALUES (2, 'Cuscuz recheado', 'Cuscuz com carne de sol', 1800, 1)");
  inserir("INSERT OR IGNORE INTO produtos (id, nome, descricao, preco_centavos, ativo) VALUES (3, 'Suco de caju', 'Suco natural gelado', 700, 1)");

  [1, 2].forEach((unidadeId) => {
    [1, 2, 3].forEach((produtoId) => {
      inserir("INSERT OR IGNORE INTO cardapios (unidade_id, produto_id, disponivel) VALUES (?, ?, 1)", [unidadeId, produtoId]);
    });
  });

  inserir("INSERT OR IGNORE INTO estoques (unidade_id, produto_id, quantidade) VALUES (1, 1, 30)");
  inserir("INSERT OR IGNORE INTO estoques (unidade_id, produto_id, quantidade) VALUES (1, 2, 20)");
  inserir("INSERT OR IGNORE INTO estoques (unidade_id, produto_id, quantidade) VALUES (1, 3, 50)");
  inserir("INSERT OR IGNORE INTO estoques (unidade_id, produto_id, quantidade) VALUES (2, 1, 15)");
  inserir("INSERT OR IGNORE INTO estoques (unidade_id, produto_id, quantidade) VALUES (2, 2, 10)");
  inserir("INSERT OR IGNORE INTO estoques (unidade_id, produto_id, quantidade) VALUES (2, 3, 30)");

  db.exec("COMMIT");
  console.log("Seed finalizado.");
  console.log("Usuarios: admin@raizes.com, gerente@raizes.com, cozinha@raizes.com, atendente@raizes.com, cliente@raizes.com");
  console.log("Senha padrao: 123456");
} catch (erro) {
  db.exec("ROLLBACK");
  throw erro;
} finally {
  fecharBanco();
}

