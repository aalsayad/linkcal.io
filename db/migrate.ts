import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, testConnection } from "./index";

// Wrap in async function to use await
async function runMigrations() {
  await testConnection();
  try {
    await migrate(db, {
      migrationsFolder: "./db/migrations",
    });
    console.log("Migrations completed");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
