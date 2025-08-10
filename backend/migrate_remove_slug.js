const { sequelize } = require('./database/connection');

async function migrateRemoveSlug() {
  try {
    console.log('🔄 Starting migration: Removing duplicate slug field...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // First, ensure all records have a handle value
    console.log('📝 Ensuring all records have handle values...');
    const [results] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM contents 
      WHERE handle IS NULL OR handle = ''
    `);
    
    if (results[0].count > 0) {
      console.log(`⚠️  Found ${results[0].count} records without handle values. Generating handles...`);
      
      // Generate handles for records that don't have them
      await sequelize.query(`
        UPDATE contents 
        SET handle = LOWER(REPLACE(REPLACE(title, ' ', '-'), '[^a-z0-9\\-]', ''))
        WHERE handle IS NULL OR handle = ''
      `);
      console.log('✅ Generated handles for missing records');
    }
    
    // Remove slug column
    console.log('📝 Removing slug column...');
    await sequelize.query(`
      ALTER TABLE contents 
      DROP COLUMN slug
    `);
    console.log('✅ slug column removed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const [columns] = await sequelize.query(`
      DESCRIBE contents
    `);
    
    const hasSlug = columns.some(col => col.Field === 'slug');
    const hasHandle = columns.some(col => col.Field === 'handle');
    
    if (!hasSlug && hasHandle) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 New table structure:');
      columns.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('❌ Migration verification failed!');
      if (hasSlug) {
        console.log('   slug column still exists');
      }
      if (!hasHandle) {
        console.log('   handle column missing');
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_CANT_DROP_FIELD') {
      console.log('💡 slug column may not exist or cannot be dropped.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Table does not exist. Please create the contents table first.');
    }
    
  } finally {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  }
}

// Run the migration
migrateRemoveSlug();
