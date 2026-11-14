import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // CLI/migrate memakai user DDL; runtime aplikasi memakai DATABASE_URL (user DML-only)
    url: env('MIGRATION_DATABASE_URL'),
    shadowDatabaseUrl: env('MIGRATION_SHADOW_DATABASE_URL'),
  },
})
