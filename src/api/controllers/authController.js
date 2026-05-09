const { cadastrarCliente, login, usuarioPublico } = require("../../aplicacao/authServico");

function cadastro(req, res) {
  const usuario = cadastrarCliente(req.body || {});
  res.status(201).json(usuario);
}

function entrar(req, res) {
  const resposta = login(req.body.email, req.body.senha);
  res.json(resposta);
}

function perfil(req, res) {
  res.json(usuarioPublico({
    ...req.usuario,
    consentimento_lgpd: req.usuario.consentimento_lgpd
  }));
}

module.exports = {
  cadastro,
  entrar,
  perfil
};

