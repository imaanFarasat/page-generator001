const { GeminiService } = require('./utils/gemini');

async function testSEOValidation() {
  console.log('🧪 Testing SEO Validation...\n');
  
  const geminiService = new GeminiService();
  
  // Test cases for meta field validation
  const testCases = [
    {
      name: 'Perfect Length Meta Fields',
      content: {
        head: {
          title: 'Best Test Content Guide - Complete Information',
          meta: {
            description: 'Discover everything about Test Content. Get expert insights, tips, and comprehensive information. Learn the best practices and latest trends.'
          }
        },
        body: {
          h1: 'Test Content',
          intro: 'This is a test introduction.',
          sections: [{ h2: 'Test Section', paragraphs: ['Para 1', 'Para 2'], bullets: ['Point 1', 'Point 2', 'Point 3'] }],
          faqs: [{ question: 'Test Q?', answer: 'Test A.' }]
        },
        identifier: {
          id: '',
          handle: 'test-content'
        },
        classification: {
          category: 'General'
        }
      }
    },
    {
      name: 'Too Long Title',
      content: {
        head: {
          title: 'This is a very long title that exceeds the maximum allowed length of 60 characters and should cause a validation error',
          meta: {
            description: 'Short description.'
          }
        },
        body: {
          h1: 'Test Content',
          intro: 'This is a test introduction.',
          sections: [{ h2: 'Test Section', paragraphs: ['Para 1', 'Para 2'], bullets: ['Point 1', 'Point 2', 'Point 3'] }],
          faqs: [{ question: 'Test Q?', answer: 'Test A.' }]
        },
        identifier: {
          id: '',
          handle: 'test-content'
        },
        classification: {
          category: 'General'
        }
      }
    },
    {
      name: 'Too Long Meta Description',
      content: {
        head: {
          title: 'Short Title',
          meta: {
            description: 'This is a very long meta description that exceeds the maximum allowed length of 160 characters and should cause a validation error because it contains too many words and characters that go beyond the acceptable limit for search engine optimization purposes.'
          }
        },
        body: {
          h1: 'Test Content',
          intro: 'This is a test introduction.',
          sections: [{ h2: 'Test Section', paragraphs: ['Para 1', 'Para 2'], bullets: ['Point 1', 'Point 2', 'Point 3'] }],
          faqs: [{ question: 'Test Q?', answer: 'Test A.' }]
        },
        identifier: {
          id: '',
          handle: 'test-content'
        },
        classification: {
          category: 'General'
        }
      }
    },
    {
      name: 'Content with Location Data',
      content: {
        head: {
          title: 'Best Toronto Nail Salons Guide',
          meta: {
            description: 'Discover the best nail salons in Toronto. Get expert recommendations, reviews, and tips for finding quality nail services in the GTA.',
            geo: {
              region: 'CA-ON',
              placename: 'Toronto',
              position: '43.6532;-79.3832'
            }
          }
        },
        body: {
          h1: 'Toronto Nail Salons',
          intro: 'This is a comprehensive guide to nail salons in Toronto.',
          sections: [{ h2: 'Best Salons', paragraphs: ['Para 1', 'Para 2'], bullets: ['Point 1', 'Point 2', 'Point 3'] }],
          faqs: [{ question: 'Test Q?', answer: 'Test A.' }]
        },
        identifier: {
          id: '',
          handle: 'toronto-nail-salons'
        },
        classification: {
          category: 'Lifestyle'
        }
      }
    },
    {
      name: 'Content with Identifier and Classification',
      content: {
        head: {
          title: 'Complete Guide to Digital Marketing',
          meta: {
            description: 'Master digital marketing strategies for business growth. Learn SEO, social media, content marketing, and PPC techniques to boost your online presence.'
          }
        },
        body: {
          h1: 'Digital Marketing',
          intro: 'Digital marketing encompasses all marketing efforts that use electronic devices or the internet.',
          sections: [{ h2: 'SEO Strategies', paragraphs: ['Para 1', 'Para 2'], bullets: ['Point 1', 'Point 2', 'Point 3'] }],
          faqs: [{ question: 'What is SEO?', answer: 'Search Engine Optimization is the practice of optimizing your website to rank higher in search results.' }]
        },
        identifier: {
          id: 'dm-001',
          handle: 'digital-marketing-guide'
        },
        classification: {
          category: 'Business'
        }
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`Title Length: ${testCase.content.head.title.length}/60`);
    console.log(`Meta Description Length: ${testCase.content.head.meta.description.length}/160`);
    
    // Show location info if present
    if (testCase.content.head.meta.geo) {
      console.log(`Location: ${testCase.content.head.meta.geo.placename}, ${testCase.content.head.meta.geo.region}`);
    }
    
    // Show identifier and classification info if present
    if (testCase.content.identifier) {
      console.log(`Identifier: ID=${testCase.content.identifier.id}, Handle=${testCase.content.identifier.handle}`);
    }
    if (testCase.content.classification) {
      console.log(`Classification: Category=${testCase.content.classification.category}`);
    }
    
    try {
      geminiService.validateContentStructure(testCase.content);
      console.log('✅ Validation PASSED\n');
    } catch (error) {
      console.log(`❌ Validation FAILED: ${error.message}\n`);
    }
  }
  
  // Test the SEO-compliant generation methods
  console.log('🔧 Testing SEO-Compliant Generation Methods...\n');
  
  const testH1 = 'Very Long Title That Exceeds Normal Length Limits';
  console.log(`Test H1: "${testH1}"`);
  
  const generatedTitle = geminiService.generateSEOCompliantTitle(testH1, 60);
  console.log(`Generated Title: "${generatedTitle}" (${generatedTitle.length}/60)`);
  
  const generatedDescription = geminiService.generateSEOCompliantDescription(testH1, 160);
  console.log(`Generated Description: "${generatedDescription}" (${generatedDescription.length}/160)`);
  
  console.log('\n✅ SEO Validation Testing Complete!');
}

// Run the test
testSEOValidation().catch(console.error);
