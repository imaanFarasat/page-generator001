const { sequelize } = require('./database/connection');

async function migrateAddPublicId() {
  try {
    console.log('🔄 Starting migration: Adding public_id field...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Add public_id column
    console.log('📝 Adding public_id column...');
    await sequelize.query(`
      ALTER TABLE contents 
      ADD COLUMN public_id VARCHAR(50) NULL COMMENT 'SEO-friendly public ID for URLs (e.g., "1703123456789_abc")'
    `);
    console.log('✅ public_id column added successfully!');
    
    // Update existing records to have public_id values
    console.log('🔄 Updating existing records with public_id...');
    
    // Get all existing records
    const [existingRecords] = await sequelize.query(`
      SELECT id FROM contents WHERE public_id IS NULL
    `);
    
    console.log(`Found ${existingRecords.length} records to update`);
    
    // Update each record with a unique public_id
    for (const record of existingRecords) {
      const public_id = Date.now() + '_' + Math.random().toString(36).substr(2, 3);
      
      await sequelize.query(`
        UPDATE contents 
        SET public_id = ? 
        WHERE id = ?
      `, {
        replacements: [public_id, record.id]
      });
      
      console.log(`Updated record ${record.id} with public_id: ${public_id}`);
    }
    
    // Make public_id NOT NULL and UNIQUE after populating
    console.log('📝 Making public_id NOT NULL and UNIQUE...');
    await sequelize.query(`
      ALTER TABLE contents 
      MODIFY COLUMN public_id VARCHAR(50) NOT NULL COMMENT 'SEO-friendly public ID for URLs (e.g., "1703123456789_abc")'
    `);
    
    await sequelize.query(`
      ALTER TABLE contents 
      ADD UNIQUE INDEX idx_public_id (public_id)
    `);
    
    console.log('✅ public_id field is now NOT NULL and UNIQUE!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const [results] = await sequelize.query(`
      DESCRIBE contents
    `);
    
    const hasPublicId = results.some(col => col.Field === 'public_id');
    
    if (hasPublicId) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 New table structure:');
      results.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Show sample public_ids
      const [sampleRecords] = await sequelize.query(`
        SELECT id, title, public_id FROM contents ORDER BY created_at DESC LIMIT 5
      `);
      
      console.log('📋 Sample records with public_id:');
      sampleRecords.forEach(record => {
        console.log(`   ID: ${record.id}, Title: ${record.title}, Public ID: ${record.public_id}`);
      });
    } else {
      console.log('❌ Migration verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('💡 public_id field already exists. Migration may have been run before.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Table does not exist. Please create the contents table first.');
    }
    
  } finally {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  }
}

// Run the migration
migrateAddPublicId();
