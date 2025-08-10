const { sequelize } = require('./database/connection');

async function removeOldColumns() {
  try {
    console.log('🔄 Starting migration to remove old columns...');
    
    // List of columns to remove (all the old columns that are now in full_content)
    const columnsToRemove = [
      'title',
      'category', 
      'topic',
      'content', // old JSON column
      'html',
      'seo_title',
      'seo_description', 
      'seo_keywords',
      'word_count',
      'generation_time',
      'gemini_model',
      'gemini_tokens_used',
      'handle',
      'faq_count',
      'tags'
    ];

    console.log('📋 Columns to remove:', columnsToRemove);

    // Remove each column
    for (const column of columnsToRemove) {
      try {
        console.log(`🗑️  Removing column: ${column}`);
        await sequelize.query(`ALTER TABLE contents DROP COLUMN ${column}`);
        console.log(`✅ Successfully removed column: ${column}`);
      } catch (error) {
        if (error.message.includes('doesn\'t exist')) {
          console.log(`⚠️  Column ${column} doesn't exist, skipping...`);
        } else {
          console.error(`❌ Error removing column ${column}:`, error.message);
          throw error;
        }
      }
    }

    // Show final table structure
    console.log('\n📊 Final table structure:');
    const [results] = await sequelize.query('DESCRIBE contents');
    results.forEach(row => {
      console.log(`  ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('📝 The contents table now only has: id, public_id, full_content, status, created_at, updated_at');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
removeOldColumns().catch(console.error);
