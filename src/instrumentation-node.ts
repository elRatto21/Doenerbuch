import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db";
import { syncReferenceData } from "@/server/reference-data";

// In Docker, apply pending migrations before serving traffic.
if (process.env.RUN_MIGRATIONS === "true") {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[db] migrations applied");
}

try {
  await syncReferenceData(db);
} catch (err) {
  console.error("[db] could not sync badges/types", err);
}
