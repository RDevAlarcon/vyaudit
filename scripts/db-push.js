const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

function parseDotEnv(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const parsed = parseDotEnv(fs.readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function run() {
  loadLocalEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL no esta definida. Revisa tu archivo .env");
    process.exit(1);
  }

  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.error("No se encontro db/schema.sql");
    process.exit(1);
  }

  const child = spawn("psql", [databaseUrl, "-f", schemaPath], {
    stdio: "inherit",
    env: process.env,
    shell: false
  });

  child.on("error", (error) => {
    console.error(`No fue posible ejecutar psql: ${error.message}`);
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code ?? 1);
  });
}

run();
