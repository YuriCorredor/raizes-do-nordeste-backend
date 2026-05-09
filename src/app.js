const express = require("express");
const swaggerUi = require("swagger-ui-express");
const rotas = require("./api/rotas");
const openapi = require("./api/openapi");
const { naoEncontrado, tratadorDeErro } = require("./api/middlewares/erro");

function criarApp() {
  const app = express();

  app.use(express.json());

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  app.get("/openapi.json", (req, res) => res.json(openapi));
  app.use("/", rotas);

  app.use(naoEncontrado);
  app.use(tratadorDeErro);

  return app;
}

module.exports = criarApp;

