const criarApp = require("./app");
const config = require("./config");
const { migrar } = require("./infraestrutura/migracoes");

migrar();

const app = criarApp();

app.listen(config.porta, () => {
  console.log(`API rodando em http://localhost:${config.porta}`);
  console.log(`Swagger em http://localhost:${config.porta}/docs`);
});

