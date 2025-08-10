const { GeminiService } = require('./utils/gemini');

async function testFAQCount() {
  console.log('🧪 Testing FAQ Count Generation...\n');
  
  const geminiService = new GeminiService();
  
  // Test with different FAQ counts
  const testCases = [
    { h1: 'Test Topic', h2s: ['Section 1', 'Section 2'], faqCount: 2 },
    { h1: 'Another Topic', h2s: ['Section 1'], faqCount: 5 },
    { h1: 'Third Topic', h2s: ['Section 1', 'Section 2', 'Section 3'], faqCount: 10 }
  ];
  
  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.h1} with ${testCase.faqCount} FAQs`);
    
    try {
      // Just test the prompt generation to see the FAQ count
      const prompt = geminiService.buildPrompt(testCase.h1, testCase.h2s, testCase.faqCount);
      
      // Count the number of FAQ questions in the prompt
      const faqMatches = prompt.match(/Q\d+:/g);
      const actualFaqCount = faqMatches ? faqMatches.length : 0;
      
      console.log(`Expected FAQs: ${testCase.faqCount}`);
      console.log(`Actual FAQs in prompt: ${actualFaqCount}`);
      console.log(`✅ ${actualFaqCount === testCase.faqCount ? 'PASS' : 'FAIL'}\n`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('✅ FAQ Count Testing Complete!');
}

// Run the test
testFAQCount().catch(console.error);
