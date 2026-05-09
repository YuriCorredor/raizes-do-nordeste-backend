const jwt = require("jsonwebtoken");
const config = require("../../config");
const { pegarBanco } = require("../../infraestrutura/banco");
const { erroNaoAutenticado, erroSemPermissao } = require("./erro");

function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || "";
  const [tipo, token] = cabecalho.split(" ");

  if (tipo !== "Bearer" || !token) {
    return next(erroNaoAutenticado());
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const usuario = pegarBanco()
      .prepare("SELECT id, nome, email, perfil, consentimento_lgpd, pontos FROM usuarios WHERE id = ?")
      .get(payload.sub);

    if (!usuario) {
      return next(erroNaoAutenticado());
    }

    req.usuario = usuario;
    next();
  } catch (erro) {
    next(erroNaoAutenticado());
  }
}

function permitirPerfis(...perfis) {
  return function (req, res, next) {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return next(erroSemPermissao());
    }

    next();
  };
}

module.exports = {
  autenticar,
  permitirPerfis
};

