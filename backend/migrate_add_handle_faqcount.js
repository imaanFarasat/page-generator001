const { sequelize } = require('./database/connection');

async function migrateAddHandleAndFaqCount() {
  try {
    console.log('🔄 Starting migration: Adding handle and faq_count fields...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Add handle column
    console.log('📝 Adding handle column...');
    await sequelize.query(`
      ALTER TABLE contents 
      ADD COLUMN handle VARCHAR(100) NULL COMMENT 'URL-friendly handle for routing (e.g., "agate-beads")'
    `);
    console.log('✅ handle column added successfully!');
    
    // Add faq_count column
    console.log('📝 Adding faq_count column...');
    await sequelize.query(`
      ALTER TABLE contents 
      ADD COLUMN faq_count INT NULL COMMENT 'Number of FAQs generated to avoid recalculation at render time'
    `);
    console.log('✅ faq_count column added successfully!');
    
    // Update existing records to have default values
    console.log('🔄 Updating existing records...');
    
    // Generate handles for existing records based on title
    await sequelize.query(`
      UPDATE contents 
      SET handle = LOWER(REPLACE(REPLACE(title, ' ', '-'), '[^a-z0-9\\-]', ''))
      WHERE handle IS NULL
    `);
    console.log('✅ Generated handles for existing records');
    
    // Set default faq_count for existing records
    await sequelize.query(`
      UPDATE contents 
      SET faq_count = 20
      WHERE faq_count IS NULL
    `);
    console.log('✅ Set default faq_count for existing records');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const [results] = await sequelize.query(`
      DESCRIBE contents
    `);
    
    const hasHandle = results.some(col => col.Field === 'handle');
    const hasFaqCount = results.some(col => col.Field === 'faq_count');
    
    if (hasHandle && hasFaqCount) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 New table structure:');
      results.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
    } else {
      console.log('❌ Migration verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('💡 Fields already exist. Migration may have been run before.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Table does not exist. Please create the contents table first.');
    }
    
  } finally {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  }
}

// Run the migration
migrateAddHandleAndFaqCount();
