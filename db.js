const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

pool.on("connect", () => {
  console.log("Postgres connected successfully");
});

pool.on("error", (err) => {
  console.error("Postgres connection error:", err);
});
