const { sequelize } = require('./database/connection');
const Content = require('./models/Content');

async function checkDatabase() {
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!\n');

    // Check if the contents table exists and has data
    console.log('📊 Checking contents table...');
    
    // Get total count of records
    const totalCount = await Content.count();
    console.log(`📈 Total content records: ${totalCount}`);

    if (totalCount === 0) {
      console.log('❌ No content records found in the database.');
      console.log('💡 This could mean:');
      console.log('   - No content has been saved yet');
      console.log('   - The table might be empty');
      console.log('   - There might be an issue with the save process');
      return;
    }

    // Get all content records with basic info
    console.log('\n📋 Content Records Found:');
    console.log('─'.repeat(80));
    
    const allContent = await Content.findAll({
      attributes: [
        'id', 
        'title', 
        'handle',
        'category', 
        'status', 
        'faq_count',
        'word_count',
        'created_at',
        'updated_at'
      ],
      order: [['created_at', 'DESC']]
    });

    allContent.forEach((content, index) => {
      console.log(`${index + 1}. ID: ${content.id}`);
      console.log(`   Title: ${content.title}`);
      console.log(`   Slug: ${content.slug}`);
      console.log(`   Category: ${content.category}`);
      console.log(`   Status: ${content.status}`);
      console.log(`   Word Count: ${content.word_count || 'N/A'}`);
      console.log(`   Created: ${content.created_at}`);
      console.log(`   Updated: ${content.updated_at}`);
      console.log('─'.repeat(80));
    });

    // Get detailed info for the most recent content
    if (totalCount > 0) {
      console.log('\n🔍 Detailed View of Most Recent Content:');
      console.log('─'.repeat(80));
      
      const latestContent = await Content.findOne({
        order: [['created_at', 'DESC']]
      });

      console.log(`Title: ${latestContent.title}`);
      console.log(`Handle: ${latestContent.handle || 'N/A'}`);
      console.log(`Category: ${latestContent.category}`);
      console.log(`Status: ${latestContent.status}`);
      console.log(`FAQ Count: ${latestContent.faq_count || 'N/A'}`);
      console.log(`Word Count: ${latestContent.word_count || 'N/A'} ms`);
      console.log(`Generation Time: ${latestContent.generation_time || 'N/A'} ms`);
      console.log(`Gemini Model: ${latestContent.gemini_model || 'N/A'}`);
      console.log(`Tokens Used: ${latestContent.gemini_tokens_used || 'N/A'}`);
      console.log(`Created: ${latestContent.created_at}`);
      console.log(`Updated: ${latestContent.updated_at}`);
      
      // Show content structure
      if (latestContent.content) {
        console.log('\n📝 Content Structure:');
        console.log(`  H1: ${latestContent.content.h1 || 'N/A'}`);
        console.log(`  Intro: ${latestContent.content.intro ? latestContent.content.intro.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`  Sections: ${latestContent.content.sections ? latestContent.content.sections.length : 0}`);
        console.log(`  FAQs: ${latestContent.content.faqs ? latestContent.content.faqs.length : 0}`);
        
        // Show sections details
        if (latestContent.content.sections && latestContent.content.sections.length > 0) {
          console.log('\n  📑 Sections Details:');
          latestContent.content.sections.forEach((section, idx) => {
            console.log(`    Section ${idx + 1}: ${section.h2}`);
            console.log(`      Paragraphs: ${section.paragraphs ? section.paragraphs.length : 0}`);
            console.log(`      Bullets: ${section.bullets ? section.bullets.length : 0}`);
          });
        }
      }

      // Check if HTML was generated
      if (latestContent.html) {
        console.log(`\n🌐 HTML Generated: ${latestContent.html.length} characters`);
      } else {
        console.log('\n❌ No HTML content generated');
      }
    }

    // Database table info
    console.log('\n🗄️  Database Table Information:');
    console.log('─'.repeat(80));
    
    const [results] = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        (DATA_LENGTH + INDEX_LENGTH) as TOTAL_SIZE
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'contents'
    `);
    
    if (results.length > 0) {
      const tableInfo = results[0];
      console.log(`Table Name: ${tableInfo.TABLE_NAME}`);
      console.log(`Estimated Rows: ${tableInfo.TABLE_ROWS}`);
      console.log(`Data Size: ${(tableInfo.DATA_LENGTH / 1024).toFixed(2)} KB`);
      console.log(`Index Size: ${(tableInfo.INDEX_LENGTH / 1024).toFixed(2)} KB`);
      console.log(`Total Size: ${((tableInfo.DATA_LENGTH + tableInfo.INDEX_LENGTH) / 1024).toFixed(2)} KB`);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.log('\n💡 Connection Error - Check:');
      console.log('   - Database server is running');
      console.log('   - Database credentials in .env file');
      console.log('   - Database name exists');
      console.log('   - Network connectivity');
    }
    
    if (error.name === 'SequelizeValidationError') {
      console.log('\n💡 Validation Error - Check:');
      console.log('   - Data types in your model');
      console.log('   - Required fields');
    }
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('\n🔒 Database connection closed.');
  }
}

// Run the check
checkDatabase();
