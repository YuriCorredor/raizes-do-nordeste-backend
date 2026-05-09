const { pegarBanco } = require("../infraestrutura/banco");
const { erroValidacao, erroConflito } = require("../api/middlewares/erro");
const { registrarAuditoria } = require("./auditoriaServico");

function consultarSaldo(usuario) {
  const linha = pegarBanco()
    .prepare("SELECT pontos, consentimento_lgpd AS consentimentoLgpd FROM usuarios WHERE id = ?")
    .get(usuario.id);

  return {
    usuarioId: usuario.id,
    pontos: linha.pontos,
    consentimentoLgpd: Boolean(linha.consentimentoLgpd)
  };
}

function resgatarPontos(usuario, dados) {
  if (!Number.isInteger(dados.pontos) || dados.pontos <= 0) {
    throw erroValidacao("Quantidade de pontos invalida.", [{ field: "pontos", issue: "Informe inteiro maior que zero." }]);
  }

  const db = pegarBanco();
  const atual = consultarSaldo(usuario);

  if (atual.pontos < dados.pontos) {
    throw erroConflito("PONTOS_INSUFICIENTES", "Saldo de pontos insuficiente.");
  }

  db.prepare("UPDATE usuarios SET pontos = pontos - ? WHERE id = ?").run(dados.pontos, usuario.id);
  registrarAuditoria(usuario.id, "RESGATAR_PONTOS", "usuarios", usuario.id, { pontos: dados.pontos });

  return consultarSaldo(usuario);
}

module.exports = {
  consultarSaldo,
  resgatarPontos
};

