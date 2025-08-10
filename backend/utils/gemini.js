const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required in environment variables');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    this.maxRetries = 3;
    
    console.log('✅ Gemini service initialized with model: gemini-1.5-pro');
  }

  async generateContent(h1, h2s, faqCount = 20, location = null, handle = null, category = 'General', retryCount = 0) {
    try {
      const prompt = this.buildPrompt(h1, h2s, faqCount);
      console.log('Generated prompt:', prompt);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('=== RAW AI RESPONSE START ===');
      console.log(text);
      console.log('=== RAW AI RESPONSE END ===');
      console.log('Response length:', text.length);
      
      // Restructure plain content into JSON format
      const content = this.restructureContent(text, h1, h2s, faqCount, location, handle, category);
      console.log('Restructured content:', JSON.stringify(content, null, 2));
      
      // Validate content structure
      this.validateContentStructure(content);
      
      // Return both raw and structured content
      return {
        rawContent: text, // Original AI response
        content: content  // Structured content
      };
    } catch (error) {
      console.error('Content generation error:', error);
      
      if (retryCount < this.maxRetries) {
        console.log(`Retrying content generation (attempt ${retryCount + 1}/${this.maxRetries})`);
        return this.generateContent(h1, h2s, faqCount, location, handle, category, retryCount + 1);
      }
      
      throw new Error(`Content generation failed after ${this.maxRetries} attempts: ${error.message}`);
    }
  }

  buildPrompt(h1, h2s, faqCount = 20) {
    const h2List = h2s.map(h2 => `- ${h2}`).join('\n');
    
    return `Generate SEO-friendly content for the following topic. You MUST follow this EXACT format:

H1 Title: ${h1}
H2 Sections:
${h2List}

FORMAT REQUIREMENTS - FOLLOW EXACTLY:

META TITLE:
[Write an SEO-optimized meta title for ${h1} - EXACTLY 50-60 characters, include primary keyword, compelling and clickable]

META DESCRIPTION:
[Write an SEO-optimized meta description for ${h1} - EXACTLY 150-160 characters, compelling and descriptive, include primary keyword]

INTRODUCTION:
[Write exactly 1 engaging introduction paragraph about ${h1} - 3-4 sentences only]

SECTION 1: ${h2s[0]}
[Write exactly 2 detailed paragraphs about ${h2s[0]} - 3-4 sentences each paragraph]
BULLET POINTS:
• [First key point about ${h2s[0]}]
• [Second key point about ${h2s[0]}]
• [Third key point about ${h2s[0]}]
• [Fourth key point about ${h2s[0]}]

${h2s.length > 1 ? `SECTION 2: ${h2s[1]}
[Write exactly 2 detailed paragraphs about ${h2s[1]} - 3-4 sentences each paragraph]
BULLET POINTS:
• [First key point about ${h2s[1]}]
• [Second key point about ${h2s[1]}]
• [Third key point about ${h2s[1]}]
• [Fourth key point about ${h2s[1]}]

` : ''}${h2s.length > 2 ? `SECTION 3: ${h2s[2]}
[Write exactly 2 detailed paragraphs about ${h2s[2]} - 3-4 sentences each paragraph]
BULLET POINTS:
• [First key point about ${h2s[2]}]
• [Second key point about ${h2s[2]}]
• [Third key point about ${h2s[2]}]
• [Fourth key point about ${h2s[2]}]

` : ''}FAQS:
${Array.from({length: Math.min(faqCount, 20)}, (_, i) => `Q${i + 1}: [Write a relevant question about ${h1}]
[Write a clear, helpful answer about ${h1} - 2-3 sentences]

`).join('')}CRITICAL REQUIREMENTS:
1. META TITLE must be EXACTLY 50-60 characters (not 59, not 61)
2. META DESCRIPTION must be EXACTLY 150-160 characters (not 149, not 161)
3. Include the primary keyword "${h1}" in both meta title and description
4. Make meta title compelling and clickable
5. Make meta description descriptive and engaging
6. Follow the exact format above - do not add extra sections or modify the structure
7. Each section must have exactly 2 paragraphs and 4 bullet points
8. Each FAQ must have a clear question and 2-3 sentence answer
9. Content should be informative, engaging, and SEO-optimized

Generate high-quality, informative content that provides real value to readers while following these strict formatting requirements.`;
  }

  // Method to restructure plain content into the expected JSON format
  restructureContent(plainContent, h1, h2s, faqCount, location = null, handle = null, category = 'General') {
    console.log('=== CONTENT RESTRUCTURING START ===');
    console.log('Input H2s:', h2s);
    console.log('FAQ count:', faqCount);
    
    // Generate public_id for the identifier
    const public_id = Date.now() + '_' + Math.random().toString(36).substr(2, 3);
    
    try {
      // Split content into sections - be more flexible with section detection
      const sections = plainContent.split(/(?=SECTION \d+:|SECTION:|H2:|##)/);
      console.log('Split sections count:', sections.length);
      console.log('Section splits:', sections.map((s, i) => `Section ${i}: ${s.substring(0, 100)}...`));
      
      let metaTitle = '';
      let metaDescription = '';
      let intro = '';
      let sectionsArray = [];
      let faqsArray = [];
      
      // Process each section
      sections.forEach((section, index) => {
        const trimmedSection = section.trim();
        console.log(`Processing section ${index}:`, trimmedSection.substring(0, 200));
        
        if (trimmedSection.startsWith('META TITLE:') || trimmedSection.startsWith('META TITLE')) {
          // Extract meta title
          metaTitle = trimmedSection.replace(/^META TITLE:?/i, '').trim();
          console.log('Extracted meta title:', metaTitle.substring(0, 100));
        } else if (trimmedSection.startsWith('META DESCRIPTION:') || trimmedSection.startsWith('META DESCRIPTION')) {
          // Extract meta description
          metaDescription = trimmedSection.replace(/^META DESCRIPTION:?/i, '').trim();
          console.log('Extracted meta description:', metaDescription.substring(0, 100));
        } else if (trimmedSection.startsWith('INTRODUCTION:') || trimmedSection.startsWith('INTRODUCTION') || trimmedSection.startsWith('INTRO:')) {
          // Extract introduction - be more flexible
          intro = trimmedSection.replace(/^INTRODUCTION:?/i, '').trim();
          console.log('Extracted intro:', intro.substring(0, 100));
        } else if (trimmedSection.match(/^(SECTION \d+:|SECTION:|H2:|##)/)) {
          console.log('Found section header:', trimmedSection.substring(0, 100));
          
          // Extract section content - be more flexible with section headers
          let h2Title = '';
          let sectionContent = '';
          
          // Try different section header patterns
          if (trimmedSection.match(/^SECTION \d+:/)) {
            const sectionMatch = trimmedSection.match(/^SECTION \d+:\s*(.+?)(?=\n|$)/);
            if (sectionMatch) {
              h2Title = sectionMatch[1].trim();
              sectionContent = trimmedSection.replace(/^SECTION \d+:\s*.+?\n/, '');
              console.log('Extracted H2 title (SECTION X):', h2Title);
            }
          } else if (trimmedSection.match(/^SECTION:/)) {
            const sectionMatch = trimmedSection.match(/^SECTION:\s*(.+?)(?=\n|$)/);
            if (sectionMatch) {
              h2Title = sectionMatch[1].trim();
              sectionContent = trimmedSection.replace(/^SECTION:\s*.+?\n/, '');
              console.log('Extracted H2 title (SECTION):', h2Title);
            }
          } else if (trimmedSection.match(/^H2:/)) {
            const sectionMatch = trimmedSection.match(/^H2:\s*(.+?)(?=\n|$)/);
            if (sectionMatch) {
              h2Title = sectionMatch[1].trim();
              sectionContent = trimmedSection.replace(/^H2:\s*.+?\n/, '');
              console.log('Extracted H2 title (H2):', h2Title);
            }
          } else if (trimmedSection.match(/^##/)) {
            const sectionMatch = trimmedSection.match(/^##\s*(.+?)(?=\n|$)/);
            if (sectionMatch) {
              h2Title = sectionMatch[1].trim();
              sectionContent = trimmedSection.replace(/^##\s*.+?\n/, '');
              console.log('Extracted H2 title (##):', h2Title);
            }
          }
          
          // If we still don't have a title, try to extract from the first line
          if (!h2Title) {
            const lines = trimmedSection.split('\n');
            if (lines.length > 0) {
              h2Title = lines[0].replace(/^[#\-\*]\s*/, '').trim();
              sectionContent = lines.slice(1).join('\n');
              console.log('Extracted H2 title (first line):', h2Title);
            }
          }
          
          // If we still don't have a title, use the corresponding H2 from the input
          if (!h2Title && h2s[index - 1]) {
            h2Title = h2s[index - 1];
            sectionContent = trimmedSection;
            console.log('Using H2 from input array:', h2Title);
          }
          
          if (h2Title) {
            console.log('Processing section with title:', h2Title);
            
            // Extract paragraphs and bullets more flexibly
            const content = sectionContent || trimmedSection;
            
            // Try to find paragraphs by looking for sentence patterns
            const sentences = content.match(/[^.!?]+[.!?]/g) || [];
            console.log('Found sentences:', sentences.length);
            let paragraphs = [];
            
            if (sentences.length >= 2) {
              // Group sentences into paragraphs (try to find natural breaks)
              let currentParagraph = '';
              for (let i = 0; i < sentences.length; i++) {
                currentParagraph += sentences[i] + ' ';
                if (currentParagraph.length > 100 || i === sentences.length - 1) {
                  paragraphs.push(currentParagraph.trim());
                  currentParagraph = '';
                  if (paragraphs.length >= 2) break;
                }
              }
            }
            
            // If we don't have enough paragraphs, try to split by double newlines
            if (paragraphs.length < 2) {
              const paragraphBlocks = content.split(/\n\s*\n/);
              paragraphs = paragraphBlocks
                .filter(block => block.trim().length > 50)
                .slice(0, 2)
                .map(block => block.trim());
              console.log('Extracted paragraphs from blocks:', paragraphs.length);
            }
            
            // Extract bullets more flexibly
            let bullets = [];
            const bulletPatterns = [
              /^[•\-\*]\s*(.+?)(?=\n|$)/gm,
              /^(\d+\.)\s*(.+?)(?=\n|$)/gm,
              /^([a-z]\.)\s*(.+?)(?=\n|$)/gm
            ];
            
            for (const pattern of bulletPatterns) {
              const matches = content.match(pattern);
              if (matches && matches.length > 0) {
                bullets = matches
                  .map(match => match.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, '').replace(/^[a-z]\.\s*/, '').trim())
                  .filter(bullet => bullet.length > 10);
                if (bullets.length >= 3) {
                  console.log('Found bullets with pattern:', bullets.length);
                  break;
                }
              }
            }
            
            // If we still don't have bullets, try to find key points in the text
            if (bullets.length < 3) {
              const keyPoints = content.match(/[^.!?]*(?:key|important|essential|main|primary)[^.!?]*[.!?]/gi);
              if (keyPoints && keyPoints.length > 0) {
                bullets = keyPoints.slice(0, 3).map(point => point.trim());
                console.log('Found key points:', bullets.length);
              }
            }
            
            console.log('Final paragraphs count:', paragraphs.length);
            console.log('Final bullets count:', bullets.length);
            
            // Ensure we have at least 2 paragraphs and 3 bullets
            if (paragraphs.length < 2) {
              // Try to create paragraphs from the content
              const words = content.split(/\s+/);
              if (words.length > 20) {
                const midPoint = Math.floor(words.length / 2);
                paragraphs = [
                  words.slice(0, midPoint).join(' '),
                  words.slice(midPoint).join(' ')
                ];
              } else {
                paragraphs = [
                  content.length > 100 ? content.substring(0, content.length / 2) : content,
                  content.length > 100 ? content.substring(content.length / 2) : content
                ];
              }
              console.log('Created fallback paragraphs');
            }
            
            if (bullets.length < 3) {
              // Create more meaningful bullets from the content
              const sentences = content.match(/[^.!?]+[.!?]/g) || [];
              if (sentences.length >= 3) {
                bullets = sentences.slice(0, 3).map(s => s.trim());
              } else {
                // Split content into key points
                const parts = content.split(/[.!?]/).filter(part => part.trim().length > 20);
                bullets = parts.slice(0, 3).map(part => part.trim());
              }
              console.log('Created fallback bullets');
            }
            
            sectionsArray.push({
              h2: h2Title,
              paragraphs: paragraphs.slice(0, 2),
              bullets: bullets.slice(0, 4)
            });
            
            console.log('Added section to array:', h2Title);
          }
        } else if (trimmedSection.startsWith('FAQS:') || trimmedSection.startsWith('FAQ:') || trimmedSection.startsWith('FREQUENTLY ASKED QUESTIONS:')) {
          console.log('Found FAQ section');
          // Extract FAQs more flexibly
          const faqContent = trimmedSection.replace(/^FAQS?:?/i, '').replace(/^FREQUENTLY ASKED QUESTIONS:?/i, '').trim();
          
          // Try different FAQ patterns
          const faqPatterns = [
            /(?:Q\d*[:\-]?\s*|Question\s*\d*[:\-]?\s*)(.+?)(?=\n|$)/gi,
            /(?:Q\d*[:\-]?\s*|Question\s*\d*[:\-]?\s*)(.+?)(?=\n|$)/gi,
            /^(.+?)(?=\n|$)/gm
          ];
          
          for (const pattern of faqPatterns) {
            const faqMatches = faqContent.match(pattern);
            if (faqMatches && faqMatches.length > 0) {
              faqsArray = faqMatches.slice(0, faqCount).map((faq, index) => {
                const question = faq.replace(/^(?:Q\d*[:\-]?\s*|Question\s*\d*[:\-]?\s*)/i, '').trim();
                // Try to find the answer in the next line or create a meaningful one
                const lines = faqContent.split('\n');
                const faqIndex = lines.findIndex(line => line.includes(question));
                let answer = '';
                
                if (faqIndex >= 0 && faqIndex + 1 < lines.length) {
                  answer = lines[faqIndex + 1].trim();
                }
                
                if (!answer || answer.length < 20) {
                  answer = `Comprehensive answer about ${question.toLowerCase()}`;
                }
                
                return { question, answer };
              });
              console.log('Extracted FAQs:', faqsArray.length);
              break;
            }
          }
        }
      });
      
      console.log('=== SECTION PROCESSING COMPLETE ===');
      console.log('Sections found:', sectionsArray.length);
      console.log('FAQs found:', faqsArray.length);
      console.log('Intro found:', !!intro);
      
      // If we couldn't extract enough content, try to parse the entire content more intelligently
      if (sectionsArray.length === 0) {
        console.log('No sections extracted, trying alternative parsing...');
        
        // Try to find H2 sections by looking for patterns in the content
        const contentLines = plainContent.split('\n');
        let currentSection = null;
        
        for (let i = 0; i < contentLines.length; i++) {
          const line = contentLines[i].trim();
          
          // Look for section headers
          if (line.match(/^(SECTION|H2|##|\d+\.|[A-Z][A-Z\s]+:)/)) {
            if (currentSection) {
              sectionsArray.push(currentSection);
            }
            
            const h2Title = line.replace(/^(SECTION|H2|##|\d+\.|[A-Z][A-Z\s]+:)/, '').trim();
            currentSection = {
              h2: h2Title || `Section ${sectionsArray.length + 1}`,
              paragraphs: [],
              bullets: []
            };
          } else if (currentSection && line.length > 50) {
            // This might be a paragraph
            if (currentSection.paragraphs.length < 2) {
              currentSection.paragraphs.push(line);
            }
          } else if (currentSection && line.match(/^[•\-\*]/)) {
            // This might be a bullet point
            if (currentSection.bullets.length < 4) {
              currentSection.bullets.push(line.replace(/^[•\-\*]\s*/, ''));
            }
          }
        }
        
        // Add the last section
        if (currentSection) {
          sectionsArray.push(currentSection);
        }
        
        console.log('Alternative parsing found sections:', sectionsArray.length);
      }
      
      // If we still don't have sections, create them from the H2s with the actual content
      if (sectionsArray.length === 0) {
        console.log('Creating sections from H2s with actual content...');
        
        // Split the content into roughly equal parts for each H2
        const contentParts = this.splitContentForH2s(plainContent, h2s);
        
        h2s.forEach((h2, index) => {
          const content = contentParts[index] || plainContent;
          const paragraphs = this.extractParagraphs(content);
          const bullets = this.extractBullets(content);
          
          sectionsArray.push({
            h2: h2,
            paragraphs: paragraphs.length >= 2 ? paragraphs.slice(0, 2) : [
              content.substring(0, Math.min(200, content.length)),
              content.substring(Math.min(200, content.length))
            ],
            bullets: bullets.length >= 3 ? bullets.slice(0, 4) : [
              `Key insight about ${h2}`,
              `Important consideration for ${h2}`,
              `Benefit of ${h2}`
            ]
          });
        });
        
        console.log('Created sections from H2s:', sectionsArray.length);
      }
      
      // Ensure we have the right number of FAQs
      if (faqsArray.length === 0) {
        console.log('No FAQs extracted, creating from content...');
        faqsArray = this.createFAQsFromContent(plainContent, h1, faqCount);
      }
      
      // Ensure we have an intro
      if (!intro) {
        console.log('No intro extracted, creating from content...');
        intro = this.extractIntroFromContent(plainContent, h1);
      }

      // ENFORCE STRICT SEO LENGTH LIMITS
      const MAX_META_TITLE = 60;
      const MAX_META_DESCRIPTION = 160;
      
      // Truncate meta title if too long
      if (metaTitle && metaTitle.length > MAX_META_TITLE) {
        console.log(`⚠️ Meta title too long (${metaTitle.length} chars), truncating to ${MAX_META_TITLE}`);
        metaTitle = metaTitle.substring(0, MAX_META_TITLE - 3) + '...';
      }
      
      // Truncate meta description if too long
      if (metaDescription && metaDescription.length > MAX_META_DESCRIPTION) {
        console.log(`⚠️ Meta description too long (${metaDescription.length} chars), truncating to ${MAX_META_DESCRIPTION}`);
        metaDescription = metaDescription.substring(0, MAX_META_DESCRIPTION - 3) + '...';
      }
      
      // Generate SEO-compliant fallbacks if missing
      if (!metaTitle) {
        metaTitle = this.generateSEOCompliantTitle(h1, MAX_META_TITLE);
        console.log('Generated fallback meta title:', metaTitle);
      }
      
      if (!metaDescription) {
        metaDescription = this.generateSEOCompliantDescription(h1, MAX_META_DESCRIPTION);
        console.log('Generated fallback meta description:', metaDescription);
      }
      
      // Log final meta field lengths for verification
      console.log(`✅ Final meta title: ${metaTitle.length}/${MAX_META_TITLE} chars`);
      console.log(`✅ Final meta description: ${metaDescription.length}/${MAX_META_DESCRIPTION} chars`);
      
      const restructuredContent = {
        head: {
          title: metaTitle,
          meta: {
            description: metaDescription
          }
        },
        body: {
          h1: h1,
          intro: intro,
          sections: sectionsArray,
          faqs: faqsArray
        },
        identifier: {
          id: public_id,
          handle: handle || this.generateHandle(h1)
        },
        classification: {
          category: category,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : []
        }
      };

      // Add location to meta if provided
      if (location) {
        restructuredContent.head.meta.geo = location;
      }
      
      console.log('=== FINAL RESTRUCTURED CONTENT ===');
      console.log('H1:', restructuredContent.body.h1);
      console.log('Title:', restructuredContent.head.title);
      console.log('Meta Description:', restructuredContent.head.meta.description);
      console.log('Intro length:', restructuredContent.body.intro.length);
      console.log('Sections:', restructuredContent.body.sections.length);
      console.log('FAQs:', restructuredContent.body.faqs.length);
      console.log('Public ID:', public_id);
      
      return restructuredContent;
      
    } catch (error) {
      console.error('Error restructuring content:', error);
      
      // Return SEO-compliant fallback structured content
      const fallbackContent = {
        head: {
          title: this.generateSEOCompliantTitle(h1, 60),
          meta: {
            description: this.generateSEOCompliantDescription(h1, 160)
          }
        },
        body: {
          h1: h1,
          intro: `Comprehensive guide about ${h1}`,
          sections: h2s.map(h2 => ({
            h2: h2,
            paragraphs: [
              `Detailed information about ${h2}`,
              `Additional insights about ${h2}`
            ],
            bullets: [
              `Key point 1 about ${h2}`,
              `Key point 2 about ${h2}`,
              `Key point 3 about ${h2}`,
              `Key point 4 about ${h2}`
            ]
          })),
          faqs: Array.from({ length: faqCount }, (_, i) => {
            const ordinal = this.getOrdinal(i + 1);
            return {
              question: `${ordinal} common question about ${h1}`,
              answer: `Clear, helpful answer about ${h1} (2-3 sentences)`
            };
          })
        },
        identifier: {
          id: public_id,
          handle: handle || this.generateHandle(h1)
        },
        classification: {
          category: category,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : []
        }
      };

      // Add location to meta if provided
      if (location) {
        fallbackContent.head.meta.geo = location;
      }
      
      return fallbackContent;
    }
  }

  // Helper method to split content for multiple H2s
  splitContentForH2s(content, h2s) {
    const parts = [];
    const totalLength = content.length;
    const partLength = Math.floor(totalLength / h2s.length);
    
    for (let i = 0; i < h2s.length; i++) {
      const start = i * partLength;
      const end = i === h2s.length - 1 ? totalLength : (i + 1) * partLength;
      parts.push(content.substring(start, end));
    }
    
    return parts;
  }

  // Helper method to extract paragraphs from content
  extractParagraphs(content) {
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    return paragraphs.slice(0, 2);
  }

  // Helper method to extract bullets from content
  extractBullets(content) {
    const bullets = content.match(/^[•\-\*]\s*(.+?)(?=\n|$)/gm) || [];
    return bullets.map(b => b.replace(/^[•\-\*]\s*/, '').trim()).slice(0, 4);
  }

  // Helper method to create FAQs from content
  createFAQsFromContent(content, h1, faqCount) {
    const faqs = [];
    const sentences = content.match(/[^.!?]+[.!?]/g) || [];
    
    // Limit to the requested FAQ count
    const actualFaqCount = Math.min(faqCount, sentences.length);
    
    for (let i = 0; i < actualFaqCount; i++) {
      const question = sentences[i].trim();
      const answer = sentences[i + 1] ? sentences[i + 1].trim() : `Comprehensive answer about ${h1}`;
      
      faqs.push({ question, answer });
    }
    
    return faqs;
  }

  // Helper method to extract intro from content
  extractIntroFromContent(content, h1) {
    const firstParagraph = content.split(/\n\s*\n/)[0];
    if (firstParagraph && firstParagraph.length > 50) {
      return firstParagraph;
    }
    
    const sentences = content.match(/[^.!?]+[.!?]/g) || [];
    if (sentences.length > 0) {
      return sentences[0].trim();
    }
    
    return `Welcome to our comprehensive guide about ${h1}. This article will provide you with detailed information and insights to help you understand everything you need to know.`;
  }

  // NEW METHOD: Generate SEO-compliant meta title
  generateSEOCompliantTitle(h1, maxLength = 60) {
    const baseTitle = `Best ${h1} Guide - Complete Information`;
    if (baseTitle.length <= maxLength) {
      return baseTitle;
    }
    
    // Try shorter versions
    const shorterVersions = [
      `Best ${h1} Guide`,
      `${h1} Guide - Complete Info`,
      `${h1} - Complete Guide`,
      `${h1} Guide`,
      h1
    ];
    
    for (const version of shorterVersions) {
      if (version.length <= maxLength) {
        return version;
      }
    }
    
    // If still too long, truncate the H1
    return h1.substring(0, maxLength - 3) + '...';
  }

  // NEW METHOD: Generate SEO-compliant meta description
  generateSEOCompliantDescription(h1, maxLength = 160) {
    const baseDescription = `Discover everything about ${h1}. Get expert insights, tips, and comprehensive information. Learn the best practices and latest trends.`;
    
    if (baseDescription.length <= maxLength) {
      return baseDescription;
    }
    
    // Try shorter versions
    const shorterVersions = [
      `Discover everything about ${h1}. Get expert insights, tips, and comprehensive information.`,
      `Learn everything about ${h1} - expert insights, tips, and best practices.`,
      `Complete guide to ${h1} with expert tips and insights.`,
      `Expert guide to ${h1} - tips, insights, and best practices.`,
      `Everything you need to know about ${h1}. Expert tips and insights.`
    ];
    
    for (const version of shorterVersions) {
      if (version.length <= maxLength) {
        return version;
      }
    }
    
    // If still too long, create a very short one
    return `Complete guide to ${h1} with expert tips and insights.`;
  }

  // Helper method to get ordinal numbers (1st, 2nd, 3rd, etc.)
  getOrdinal(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) {
      return num + "st";
    }
    if (j === 2 && k !== 12) {
      return num + "nd";
    }
    if (j === 3 && k !== 13) {
      return num + "rd";
    }
    return num + "th";
  }

  // Helper method to generate URL-friendly handles
  generateHandle(h1) {
    return h1
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  validateContentStructure(content) {
    const required = ['head', 'body'];
    
    for (const field of required) {
      if (!content[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // STRICT SEO LENGTH VALIDATION
    const MAX_META_TITLE = 60;
    const MAX_META_DESCRIPTION = 160;
    
    if (content.head.title.length > MAX_META_TITLE) {
      throw new Error(`Title too long: ${content.head.title.length} characters (max ${MAX_META_TITLE})`);
    }
    
    if (content.head.meta.description.length > MAX_META_DESCRIPTION) {
      throw new Error(`Meta description too long: ${content.head.meta.description.length} characters (max ${MAX_META_DESCRIPTION})`);
    }
    
    // Log validation results
    console.log(`✅ Title validation: ${content.head.title.length}/${MAX_META_TITLE} characters`);
    console.log(`✅ Meta description validation: ${content.head.meta.description.length}/${MAX_META_DESCRIPTION} characters`);

    if (!Array.isArray(content.body.sections) || content.body.sections.length === 0) {
      throw new Error('Sections must be a non-empty array');
    }

    if (!Array.isArray(content.body.faqs) || content.body.faqs.length === 0) {
      throw new Error('FAQs must be a non-empty array');
    }

    // Validate each section
    content.body.sections.forEach((section, index) => {
      if (!section.h2 || !section.paragraphs || !section.bullets) {
        throw new Error(`Section ${index + 1} missing required fields`);
      }
      
      if (!Array.isArray(section.paragraphs) || section.paragraphs.length !== 2) {
        throw new Error(`Section ${index + 1} must have exactly 2 paragraphs`);
      }
      
      if (!Array.isArray(section.bullets) || section.bullets.length < 3) {
        throw new Error(`Section ${index + 1} must have at least 3 bullets`);
      }
    });

    // Validate each FAQ
    content.body.faqs.forEach((faq, index) => {
      if (!faq.question || !faq.answer) {
        throw new Error(`FAQ ${index + 1} missing question or answer`);
      }
    });

    // Check for at least 1 FAQ (minimum requirement)
    if (content.body.faqs.length < 1) {
      throw new Error(`Expected at least 1 FAQ, got ${content.body.faqs.length}`);
    }
  }
}

module.exports = { GeminiService };

