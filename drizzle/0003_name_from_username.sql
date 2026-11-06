-- The app only uses the username; Better Auth's required `name` now mirrors it.
UPDATE "user" SET "name" = "username" WHERE "username" IS NOT NULL AND "name" <> "username";
