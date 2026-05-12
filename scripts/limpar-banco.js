const fs = require("node:fs");
const path = require("node:path");
const { caminhoBanco, fecharBanco } = require("../src/infraestrutura/banco");

fecharBanco();

const arquivo = path.resolve(caminhoBanco);
const pastaProjeto = process.cwd();

// Cuidado simples para nao apagar nada fora do projeto sem querer
if (!arquivo.startsWith(pastaProjeto)) {
  throw new Error("Caminho do banco fora do projeto.");
}

if (fs.existsSync(arquivo)) {
  fs.rmSync(arquivo);
  console.log(`Banco removido: ${arquivo}`);
} else {
  console.log("Banco ainda nao existia.");
}

