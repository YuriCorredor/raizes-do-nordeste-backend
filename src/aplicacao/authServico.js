const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { pegarBanco } = require("../infraestrutura/banco");
const { erroValidacao, ErroApi } = require("../api/middlewares/erro");
const { registrarAuditoria } = require("./auditoriaServico");

function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    consentimentoLgpd: Boolean(usuario.consentimento_lgpd),
    pontos: usuario.pontos || 0
  };
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function criarToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, perfil: usuario.perfil, nome: usuario.nome },
    config.jwtSecret,
    { expiresIn: config.jwtExpiraEm }
  );
}

function cadastrarCliente(dados) {
  const detalhes = [];
  if (!dados.nome) detalhes.push({ field: "nome", issue: "Nome e obrigatorio." });
  if (!validarEmail(dados.email)) detalhes.push({ field: "email", issue: "E-mail invalido." });
  if (!dados.senha || dados.senha.length < 6) detalhes.push({ field: "senha", issue: "Senha deve ter 6 caracteres ou mais." });
  if (dados.consentimentoLgpd !== true) detalhes.push({ field: "consentimentoLgpd", issue: "Consentimento precisa ser true." });

  if (detalhes.length) {
    throw erroValidacao("Dados invalidos para cadastro.", detalhes);
  }

  const db = pegarBanco();
  const existe = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(dados.email);
  if (existe) {
    throw new ErroApi(409, "EMAIL_JA_CADASTRADO", "Ja existe usuario com este e-mail.");
  }

  const senhaHash = bcrypt.hashSync(dados.senha, 10);
  const resultado = db.prepare(`
    INSERT INTO usuarios (nome, email, senha_hash, perfil, consentimento_lgpd)
    VALUES (?, ?, ?, 'CLIENTE', 1)
  `).run(dados.nome, dados.email, senhaHash);

  const usuario = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(resultado.lastInsertRowid);
  registrarAuditoria(usuario.id, "CADASTRO_CLIENTE", "usuarios", usuario.id, { email: usuario.email });

  return usuarioPublico(usuario);
}

function login(email, senha) {
  const db = pegarBanco();
  const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email || "");

  if (!usuario || !bcrypt.compareSync(senha || "", usuario.senha_hash)) {
    throw new ErroApi(401, "CREDENCIAIS_INVALIDAS", "E-mail ou senha invalidos.");
  }

  registrarAuditoria(usuario.id, "LOGIN", "usuarios", usuario.id, { email: usuario.email });

  return {
    accessToken: criarToken(usuario),
    tokenType: "Bearer",
    expiresIn: config.jwtExpiraEm,
    user: usuarioPublico(usuario)
  };
}

module.exports = {
  cadastrarCliente,
  login,
  usuarioPublico
};

