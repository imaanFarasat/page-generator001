const { sequelize } = require('./database/connection');

async function migrateToFullJSON() {
  try {
    console.log('🔄 Starting migration: Converting to full JSON storage...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Add full_content column
    console.log('📝 Adding full_content column...');
    await sequelize.query(`
      ALTER TABLE contents 
      ADD COLUMN full_content JSON NULL COMMENT 'Complete structured content in JSON format'
    `);
    console.log('✅ full_content column added successfully!');
    
    // Get all existing records
    console.log('🔄 Migrating existing records...');
    const [existingRecords] = await sequelize.query(`
      SELECT * FROM contents
    `);
    
    console.log(`Found ${existingRecords.length} records to migrate`);
    
    // Migrate each record
    for (const record of existingRecords) {
      console.log(`Migrating record ${record.id}: ${record.title}`);
      
      // Build the full JSON structure
      const fullContent = {
        head: {
          title: record.seo_title || record.title,
          meta: {
            description: record.seo_description || '',
            keywords: record.seo_keywords || ''
          }
        },
        body: {
          h1: record.title,
          intro: record.content?.body?.intro || '',
          sections: record.content?.body?.sections || [],
          faqs: record.content?.body?.faqs || []
        },
        identifier: {
          id: record.public_id,
          handle: record.handle
        },
        classification: {
          category: record.category || 'general',
          tags: record.tags ? record.tags.split(',').map(tag => tag.trim()) : []
        },
        metadata: {
          generation_time: record.generation_time || 0,
          word_count: record.word_count || 0,
          faq_count: record.faq_count || 0,
          gemini_model: record.gemini_model || 'gemini-1.5-pro',
          gemini_tokens_used: record.gemini_tokens_used || 0,
          created_at: record.created_at?.toISOString() || new Date().toISOString(),
          updated_at: record.updated_at?.toISOString() || new Date().toISOString()
        }
      };
      
      // Update the record with full_content
      await sequelize.query(`
        UPDATE contents 
        SET full_content = ? 
        WHERE id = ?
      `, {
        replacements: [JSON.stringify(fullContent), record.id]
      });
      
      console.log(`✅ Migrated record ${record.id}`);
    }
    
    // Make full_content NOT NULL after populating
    console.log('📝 Making full_content NOT NULL...');
    await sequelize.query(`
      ALTER TABLE contents 
      MODIFY COLUMN full_content JSON NOT NULL COMMENT 'Complete structured content in JSON format'
    `);
    console.log('✅ full_content field is now NOT NULL!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const [results] = await sequelize.query(`
      DESCRIBE contents
    `);
    
    const hasFullContent = results.some(col => col.Field === 'full_content');
    
    if (hasFullContent) {
      console.log('✅ Migration completed successfully!');
      console.log('📊 New table structure:');
      results.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Show sample migrated data
      const [sampleRecords] = await sequelize.query(`
        SELECT id, public_id, full_content FROM contents ORDER BY created_at DESC LIMIT 2
      `);
      
      console.log('📋 Sample migrated records:');
      sampleRecords.forEach(record => {
        const content = JSON.parse(record.full_content);
        console.log(`   ID: ${record.id}`);
        console.log(`   Public ID: ${record.public_id}`);
        console.log(`   Title: ${content.body.h1}`);
        console.log(`   Handle: ${content.identifier.handle}`);
        console.log(`   Tags: ${content.classification.tags.join(', ')}`);
        console.log(`   Word Count: ${content.metadata.word_count}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ Migration verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('💡 full_content field already exists. Migration may have been run before.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('💡 Table does not exist. Please create the contents table first.');
    }
    
  } finally {
    await sequelize.close();
    console.log('🔒 Database connection closed.');
  }
}

// Run the migration
migrateToFullJSON();
