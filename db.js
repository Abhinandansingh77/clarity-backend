const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  family: 4
});

pool.on("connect", () => {
  console.log("Postgres connected successfully");
});

pool.on("error", (err) => {
  console.error("Postgres error:", err);
});

module.exports = pool;
