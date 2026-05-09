const express = require("express");
const authController = require("./controllers/authController");
const catalogoController = require("./controllers/catalogoController");
const estoqueController = require("./controllers/estoqueController");
const pedidoController = require("./controllers/pedidoController");
const pagamentoController = require("./controllers/pagamentoController");
const fidelidadeController = require("./controllers/fidelidadeController");
const auditoriaController = require("./controllers/auditoriaController");
const { autenticar, permitirPerfis } = require("./middlewares/auth");

const rotas = express.Router();

function tratar(fn) {
  return (req, res, next) => {
    try {
      fn(req, res, next);
    } catch (erro) {
      next(erro);
    }
  };
}

rotas.get("/health", (req, res) => res.json({ status: "ok", nome: "Raizes do Nordeste API" }));

rotas.post("/auth/cadastro", tratar(authController.cadastro));
rotas.post("/auth/login", tratar(authController.entrar));
rotas.get("/usuarios/me", autenticar, tratar(authController.perfil));

rotas.get("/unidades", tratar(catalogoController.unidades));
rotas.get("/unidades/:id/cardapio", tratar(catalogoController.cardapio));

rotas.get("/produtos", autenticar, tratar(catalogoController.produtos));
rotas.post("/produtos", autenticar, permitirPerfis("GERENTE", "ADMIN"), tratar(catalogoController.novoProduto));

rotas.get("/estoque", autenticar, permitirPerfis("GERENTE", "ADMIN", "COZINHA"), tratar(estoqueController.listar));
rotas.post("/estoque/movimentos", autenticar, permitirPerfis("GERENTE", "ADMIN"), tratar(estoqueController.movimentar));

rotas.get("/pedidos", autenticar, tratar(pedidoController.listar));
rotas.post("/pedidos", autenticar, permitirPerfis("CLIENTE", "ATENDENTE"), tratar(pedidoController.criar));
rotas.get("/pedidos/:id", autenticar, tratar(pedidoController.buscar));
rotas.patch("/pedidos/:id/status", autenticar, permitirPerfis("COZINHA", "GERENTE", "ADMIN"), tratar(pedidoController.status));

rotas.post("/pagamentos/mock", autenticar, permitirPerfis("CLIENTE", "ATENDENTE", "GERENTE", "ADMIN"), tratar(pagamentoController.pagar));

rotas.get("/fidelidade/saldo", autenticar, permitirPerfis("CLIENTE"), tratar(fidelidadeController.saldo));
rotas.post("/fidelidade/resgates", autenticar, permitirPerfis("CLIENTE"), tratar(fidelidadeController.resgatar));

rotas.get("/auditorias", autenticar, permitirPerfis("GERENTE", "ADMIN"), tratar(auditoriaController.listar));

module.exports = rotas;

