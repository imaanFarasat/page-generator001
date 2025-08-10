const { sequelize } = require('./database/connection');
const { Content } = require('./models');

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');
    
    // Test model sync
    console.log('🔄 Syncing models...');
    await sequelize.sync({ force: false });
    console.log('✅ Models synced successfully!');
    
    // Test basic operations
    console.log('🧪 Testing basic operations...');
    
    // Create test content
    const testContent = await Content.create({
      title: 'Test Content',
      category: 'test',
      topic: 'This is a test topic',
      content: {
        h1: 'Test Content',
        intro: 'This is a test introduction.',
        sections: [
          {
            h2: 'Test Section',
            paragraphs: ['This is a test paragraph.'],
            bullets: ['Test bullet point 1', 'Test bullet point 2']
          }
        ],
        faqs: [
          {
            question: 'What is this?',
            answer: 'This is a test FAQ.'
          }
        ]
      },
      status: 'draft'
    });
    
    console.log('✅ Test content created:', testContent.id);
    
    // Read test content
    const readContent = await Content.findByPk(testContent.id);
    console.log('✅ Test content read:', readContent.title);
    
    // Delete test content
    await testContent.destroy();
    console.log('✅ Test content deleted');
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };
