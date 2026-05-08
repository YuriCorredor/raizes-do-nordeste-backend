const { migrar } = require("../src/infraestrutura/migracoes");
const { fecharBanco, caminhoBanco } = require("../src/infraestrutura/banco");

migrar();
console.log(`Migrations executadas em ${caminhoBanco}`);
fecharBanco();

