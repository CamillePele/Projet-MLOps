import { config } from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// Load environment variables
config({ path: path.join(__dirname, '../../../.env') });

async function clearDatabase() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mlops_db',
    });

    try {
        console.log('🔌 Connecting to database...');
        await dataSource.initialize();

        console.log('🗑️  Dropping all tables...');
        await dataSource.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);

        console.log('✅ Database cleared successfully!');
        console.log('💡 Run "pnpm run migration:run" to recreate tables');
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    } finally {
        await dataSource.destroy();
    }
}

clearDatabase();
