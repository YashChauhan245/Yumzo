/* eslint-disable no-console */
const prisma = require('../config/prisma');

(async () => {
  try {
    console.log('Fetching all tables in the public schema...');
    const tables = await prisma.$queryRawUnsafe(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    );

    if (tables.length === 0) {
      console.log('No tables found in the public schema.');
      return;
    }

    console.log(`Found ${tables.length} tables. Enabling Row-Level Security (RLS)...`);

    for (const row of tables) {
      const tableName = row.tablename;
      console.log(`Enabling RLS on table: "${tableName}"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
      
      console.log(`Revoking direct API and GraphQL access from anon/authenticated roles on table: "${tableName}"`);
      await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE "${tableName}" FROM anon, authenticated;`);
    }

    console.log('Row-Level Security (RLS) successfully enabled and API access revoked on all tables.');
  } catch (error) {
    console.error('Failed to enable RLS:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
