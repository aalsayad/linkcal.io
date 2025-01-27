import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use the connection pooler URL from Supabase
const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });

try {
  await client`SELECT 1`; // Use template literal syntax instead of .query()
  console.log("Database connection successful");
} catch (error) {
  console.error("Database connection failed:", error);
}
