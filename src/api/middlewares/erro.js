class ErroApi extends Error {
  constructor(status, codigo, mensagem, detalhes = []) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

function erroValidacao(mensagem, detalhes = []) {
  return new ErroApi(422, "VALIDACAO_ERRO", mensagem, detalhes);
}

function erroNaoEncontrado(mensagem, detalhes = []) {
  return new ErroApi(404, "NAO_ENCONTRADO", mensagem, detalhes);
}

function erroConflito(codigo, mensagem, detalhes = []) {
  return new ErroApi(409, codigo, mensagem, detalhes);
}

function erroNaoAutenticado(mensagem = "Token ausente ou invalido.") {
  return new ErroApi(401, "NAO_AUTENTICADO", mensagem);
}

function erroSemPermissao() {
  return new ErroApi(403, "SEM_PERMISSAO", "Seu perfil nao pode acessar este recurso.");
}

function naoEncontrado(req, res, next) {
  next(new ErroApi(404, "ROTA_NAO_ENCONTRADA", "Rota nao encontrada."));
}

function tratadorDeErro(err, req, res, next) {
  const status = err.status || 500;
  const codigo = err.codigo || "ERRO_INTERNO";
  const mensagem = status === 500 ? "Erro interno no servidor." : err.message;

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({
    error: codigo,
    message: mensagem,
    details: err.detalhes || [],
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
}

module.exports = {
  ErroApi,
  erroValidacao,
  erroNaoEncontrado,
  erroConflito,
  erroNaoAutenticado,
  erroSemPermissao,
  naoEncontrado,
  tratadorDeErro
};

