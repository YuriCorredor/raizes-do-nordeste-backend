const path = require("node:path");
require("dotenv").config({ quiet: true });

const config = {
  porta: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "segredo_dev_raizes",
  jwtExpiraEm: process.env.JWT_EXPIRES_IN || "2h",
  bancoArquivo: path.resolve(process.cwd(), process.env.DB_ARQUIVO || "database/raizes.db")
};

module.exports = config;
