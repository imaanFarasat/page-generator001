const { sequelize } = require('./database/connection');

async function migrateAddTagsField() {
  try {
    console.log('🔄 Starting migration: Adding tags field...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Add tags column
    console.log('📝 Adding tags column...');
    await sequelize.query(`
      ALTER TABLE contents 
      ADD COLUMN tags TEXT NULL COMMENT 'Comma-separated tags for content categorization'
    `);
    console.log('✅ tags column added successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const [results] = await sequelize.query(`
      DESCRIBE contents
    `);
    
    const hasTags = results.some(col => col.Field === 'tags');
    
    if (hasTags) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Updated table structure:');
      results.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('❌ Migration verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('💡 tags field already exists. Migration may have been run before.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Table does not exist. Please create the contents table first.');
    }
    
  } finally {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  }
}

// Run the migration
migrateAddTagsField();
