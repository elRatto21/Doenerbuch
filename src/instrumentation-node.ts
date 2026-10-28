import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db";
import { syncReferenceData } from "@/server/reference-data";

// In production, apply pending migrations before serving traffic (opt out with RUN_MIGRATIONS=false).
const runMigrations = process.env.RUN_MIGRATIONS ? process.env.RUN_MIGRATIONS === "true" : process.env.NODE_ENV === "production";
if (runMigrations) {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[db] migrations applied");
}

try {
  await syncReferenceData(db);
} catch (err) {
  console.error("[db] could not sync badges/types", err);
}
