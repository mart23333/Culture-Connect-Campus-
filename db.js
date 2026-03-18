const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "app.db");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const db = new sqlite3.Database(DB_PATH);

function initDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema, (err) => {
    if (err) {
      console.error("DB schema init failed:", err);
      process.exit(1);
    }
  });
}

module.exports = { db, initDb };