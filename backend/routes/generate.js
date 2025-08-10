const express = require('express');
const { GeminiService } = require('../utils/gemini');
const Content = require('../models/Content');
const { sequelize } = require('../database/connection');

const router = express.Router();

// Helper function to generate unique handle
const generateUniqueHandle = async (baseHandle, maxAttempts = 10) => {
  let handle = baseHandle;
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    // Query using JSON path to check handle inside full_content
    const existingContent = await Content.findOne({
      where: sequelize.literal(`JSON_EXTRACT(full_content, '$.identifier.handle') = '${handle}'`)
    });
    
    if (!existingContent) {
      return handle; // Handle is unique
    }
    
    // Try with number suffix
    handle = `${baseHandle}-${attempt}`;
    attempt++;
  }
  
  // If all attempts fail, add timestamp
  return `${baseHandle}-${Date.now()}`;
};

// Initialize Gemini service
const geminiService = new GeminiService();

// Generate content
router.post('/content', async (req, res) => {
  try {
    console.log('=== CONTENT GENERATION REQUEST ===');
    console.log('Request body:', req.body);
    
    const { h1, h2s, handle, faqCount = 20, location, category, tags } = req.body;
    const startTime = Date.now();

    // Enhanced validation
    if (!h1 || !h1.trim()) {
      return res.status(400).json({
        error: 'H1 title is required and cannot be empty'
      });
    }

    if (!h2s || !Array.isArray(h2s) || h2s.length === 0) {
      return res.status(400).json({
        error: 'H2 sections must be an array with at least one section',
        received: h2s,
        type: typeof h2s
      });
    }

    // Validate each H2 section
    const validH2s = h2s.filter(h2 => h2 && h2.trim().length > 0);
    if (validH2s.length === 0) {
      return res.status(400).json({
        error: 'All H2 sections must contain valid text'
      });
    }

    console.log('=== VALIDATION PASSED ===');
    console.log('H1:', h1);
    console.log('Valid H2s:', validH2s);
    console.log('FAQ Count:', faqCount);

    // Check for duplicate handle and generate unique one if needed
    if (handle) {
      const existingContent = await Content.findOne({
        where: sequelize.literal(`JSON_EXTRACT(full_content, '$.identifier.handle') = '${handle}'`)
      });
      
      if (existingContent) {
        // Generate a unique handle
        const uniqueHandle = await generateUniqueHandle(handle);
        
        // Update the handle to the unique one
        handle = uniqueHandle;
        
        console.log(`Handle "${handle}" was duplicate, using unique handle: "${uniqueHandle}"`);
      }
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
      return res.status(500).json({
        error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.'
      });
    }

    console.log('=== CALLING GEMINI SERVICE ===');
    
    // Generate content using Gemini AI
    const content = await geminiService.generateContent(h1, validH2s, faqCount, location, handle, category, tags);
    
    console.log('=== GEMINI RESPONSE ===');
    console.log('Content keys:', Object.keys(content));
    console.log('Raw content length:', content.rawContent?.length || 0);
    
    // Return raw content for user review instead of saving immediately
    res.json({
      success: true,
      rawContent: content.rawContent || content.content, // ← Send raw content for review
      handle: handle,
      message: 'Content generated successfully. Review and save to database when ready.',
      handleModified: handle !== req.body.handle, // ← Indicate if handle was modified
      originalH2s: validH2s, // ← Show original H2s
      cleanedH2s: validH2s, // ← Show H2s (no longer cleaned)
      faqCount: faqCount
    });

  } catch (error) {
    console.error('=== CONTENT GENERATION ERROR ===');
    console.error('Error generating content:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.message.includes('GEMINI_API_KEY')) {
      return res.status(500).json({
        error: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.'
      });
    }
    
    if (error.message.includes('Content generation failed')) {
      return res.status(500).json({
        error: 'AI content generation failed. Please try again or check your input.',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to generate content',
      details: error.message
    });
  }
});

// New route for saving plain content to database
router.post('/save', async (req, res) => {
  try {
    const { plainContent, h1, h2s, handle, faqCount, location, category, tags } = req.body;
    const startTime = Date.now();

    if (!plainContent || !h1 || !h2s || !Array.isArray(h2s) || h2s.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: plainContent, h1, h2s (array)' 
      });
    }

    console.log('=== SAVING PLAIN CONTENT TO DATABASE ===');
    console.log('H1:', h1);
    console.log('H2s:', h2s);
    console.log('FAQ count:', faqCount);
    console.log('Plain content length:', plainContent.length);

    // Process the plain content into structured format
    const geminiService = new GeminiService();
    const structuredContent = await geminiService.restructureContent(plainContent, h1, h2s, faqCount, location, handle, category, tags);

    console.log('=== STRUCTURED CONTENT ===');
    console.log('Structured content keys:', Object.keys(structuredContent));
    console.log('Has body:', !!structuredContent.body);
    console.log('Has identifier:', !!structuredContent.identifier);

    // Calculate metadata
    const generationTime = Date.now() - startTime;
    const wordCount = calculateWordCount(structuredContent);
    const faqCountActual = structuredContent.body?.faqs?.length || 0;

    // Build the complete full_content JSON
    const fullContent = {
      ...structuredContent,
      metadata: {
        generation_time: generationTime,
        word_count: wordCount,
        faq_count: faqCountActual,
        gemini_model: 'gemini-1.5-pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    console.log('=== FULL CONTENT ===');
    console.log('Full content keys:', Object.keys(fullContent));
    console.log('Public ID:', structuredContent.identifier?.id);

    // Create the content object using the new model structure
    const contentData = {
      public_id: structuredContent.identifier.id,
      full_content: fullContent,
      status: 'draft'
    };

    console.log('=== CONTENT DATA ===');
    console.log('Content data keys:', Object.keys(contentData));
    console.log('Public ID value:', contentData.public_id);
    console.log('Full content type:', typeof contentData.full_content);
    console.log('Full content is valid JSON:', JSON.stringify(contentData.full_content).substring(0, 200) + '...');

    // Save to database
    let savedContent;
    try {
      savedContent = await Content.create(contentData);
      console.log('=== CONTENT SAVED SUCCESSFULLY ===');
      console.log('Content ID:', savedContent.id);
      console.log('Public ID:', savedContent.public_id);
      console.log('Generation Time:', generationTime + 'ms');
      console.log('Word Count:', wordCount);
      console.log('FAQ Count:', faqCountActual);
    } catch (createError) {
      console.error('=== CONTENT CREATE ERROR ===');
      console.error('Create error:', createError);
      console.error('Create error message:', createError.message);
      console.error('Create error stack:', createError.stack);
      throw createError;
    }

    res.json({
      success: true,
      content: fullContent,
      public_id: savedContent.public_id,
      message: 'Content saved to database successfully',
      id: savedContent.id,
      metadata: {
        generation_time: generationTime,
        word_count: wordCount,
        faq_count: faqCountActual
      }
    });

  } catch (error) {
    console.error('Error saving content to database:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save content to database',
      details: error.message 
    });
  }
});

// Helper function to calculate word count
function calculateWordCount(content) {
  let wordCount = 0;
  
  // Count intro
  if (content.body.intro) {
    wordCount += content.body.intro.split(' ').length;
  }
  
  // Count sections
  if (content.body.sections) {
    content.body.sections.forEach(section => {
      if (section.paragraphs) {
        section.paragraphs.forEach(paragraph => {
          wordCount += paragraph.split(' ').length;
        });
      }
      if (section.bullets) {
        section.bullets.forEach(bullet => {
          wordCount += bullet.split(' ').length;
        });
      }
    });
  }
  
  // Count FAQs
  if (content.body.faqs) {
    content.body.faqs.forEach(faq => {
      wordCount += faq.question.split(' ').length;
      wordCount += faq.answer.split(' ').length;
    });
  }
  
  return wordCount;
}

// Simple status endpoint (no database)
router.get('/status', async (req, res) => {
  res.json({
    totalContent: 0,
    totalWords: 0,
    todayContent: 0,
    message: 'Status retrieved successfully (demo mode)'
  });
});

module.exports = router;
