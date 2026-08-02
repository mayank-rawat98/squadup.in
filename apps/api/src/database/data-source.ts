import { resolve } from 'node:path';
import { config as loadEnvFile } from 'dotenv';
import { DataSource } from 'typeorm';

// Mirrors the app's own resolution order (AppModule uses
// `envFilePath: ['.env.local', '.env']`) so the CLI and the running API read
// the same configuration. dotenv never overwrites an already-set variable, so
// the first file listed wins and a real environment variable beats both —
// which is what CI and production rely on.
// DOTENV_CONFIG_PATH still overrides everything, for pointing at a scratch DB.
const envFiles = process.env.DOTENV_CONFIG_PATH
  ? [process.env.DOTENV_CONFIG_PATH]
  : ['.env.local', '.env'];

for (const file of envFiles) {
  loadEnvFile({ path: resolve(process.cwd(), file) });
}

const sslMode = process.env.PGSSLMODE;
const useSsl = sslMode === 'require' || process.env.POSTGRES_SSL === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  ssl: useSsl
    ? {
        rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : false,
  // Required by `migration:generate`, which diffs entity metadata against the
  // live schema. The app itself uses autoLoadEntities and never reads this.
  entities: [resolve(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [resolve(__dirname, 'migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
