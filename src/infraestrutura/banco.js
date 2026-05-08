const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const config = require("../config");

let banco;

function pegarBanco() {
  if (!banco) {
    fs.mkdirSync(path.dirname(config.bancoArquivo), { recursive: true });
    banco = new DatabaseSync(config.bancoArquivo);
    banco.exec("PRAGMA foreign_keys = ON");
  }

  return banco;
}

function fecharBanco() {
  if (banco) {
    banco.close();
    banco = null;
  }
}

module.exports = {
  pegarBanco,
  fecharBanco,
  caminhoBanco: config.bancoArquivo
};

