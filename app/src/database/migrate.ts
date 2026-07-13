// run: docker-compose exec app sh -c "cd /app && deno run --allow-all src/backend/database/migrate.ts"
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { Database, getDatabaseConfig } from "./config.ts";

async function runMigrations() {
  console.log("🔄 Starting database migrations...");

  const db = new Database(getDatabaseConfig());
  const client = await db.getClient();

  try {
    // Create migrations table if it doesn't exist
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = join(Deno.cwd(), "src/backend/database/migrations");
    const files: string[] = [];

    try {
      for await (const entry of Deno.readDir(migrationsDir)) {
        if (entry.isFile && entry.name.endsWith('.sql')) {
          files.push(entry.name);
        }
      }
    } catch (error) {
      console.error("❌ Migrations directory not found. Creating it...");
      await Deno.mkdir(migrationsDir, { recursive: true });
    }

    // Sort files to ensure they run in order
    files.sort();

    // Get already executed migrations
    const executedResult = await client.queryObject<{ filename: string }>(`
      SELECT filename FROM migrations;
    `);
    const executed = new Set(executedResult.rows.map(row => row.filename));

    // Run pending migrations
    for (const file of files) {
      if (!executed.has(file)) {
        console.log(`📝 Running migration: ${file}`);

        const content = await Deno.readTextFile(join(migrationsDir, file));

        // Execute migration
        await client.queryObject(content);

        // Record migration
        await client.queryObject(`
          INSERT INTO migrations (filename) VALUES ($1);
        `, [file]);

        console.log(`✅ Migration completed: ${file}`);
      } else {
        console.log(`⏭️  Skipping already executed migration: ${file}`);
      }
    }

    console.log("✅ All migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  try {
    await runMigrations();
    Deno.exit(0);
  } catch (error) {
    console.error("Migration process failed:", error);
    Deno.exit(1);
  }
}

export { runMigrations };
