// db.ts
import { Pool } from "pg";

export const pool = new Pool({
  host: "db", // Use "db" if you're inside Docker; use "localhost" if Jest runs on host
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "postgres"
});
