import sql from "mssql";
import { config } from "./config";

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) return pool;

  const dbConfig: sql.config = {
    server: config.db.server,
    database: config.db.database,
    authentication: {
      type: "azure-active-directory-default",
      options: {
      },
    },
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  return await new sql.ConnectionPool(dbConfig).connect();
}

export { sql };
