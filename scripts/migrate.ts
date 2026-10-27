import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/db";
import { syncReferenceData } from "@/server/reference-data";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await syncReferenceData(db);
  console.log("Migrations applied.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
