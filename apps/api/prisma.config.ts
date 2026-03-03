import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
import { resolve } from "node:path";

// Load .env from project root (monorepo root)
config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
