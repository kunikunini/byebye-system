import dotenv from 'dotenv';
import postgres from 'postgres';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function main() {
    console.log('Running manual migration...');
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS saved_views (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        filters jsonb NOT NULL,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `;
        console.log('Migration successful: saved_views table created.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await sql.end();
    }
}

main();
