const express = require('express');
const { GeminiService } = require('../utils/gemini');
const Content = require('../models/Content');

const router = express.Router();

// Helper function to generate unique handle
const generateUniqueHandle = async (baseHandle, maxAttempts = 10) => {
  let handle = baseHandle;
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    const existingContent = await Content.findOne({
      where: { handle: handle }
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

    // Check for duplicate handle and generate unique one if needed
    if (handle) {
      const existingContent = await Content.findOne({
        where: { handle: handle }
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

    // Generate content using Gemini AI
    const content = await geminiService.generateContent(h1, validH2s, faqCount, location, handle, category, tags);
    
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
    console.error('Error generating content:', error);
    
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

    // Create the content object using the correct model structure
    const contentData = {
      title: h1,
      handle: handle,
      topic: `${h1} - ${h2s.join(', ')}`,
      content: structuredContent,
      category: 'general',
      status: 'draft',
      gemini_model: 'gemini-1.5-pro',
      generation_time: Date.now(),
      tags: tags ? (Array.isArray(tags) ? tags.join(', ') : tags) : null
    };

    // Save to database
    const savedContent = await Content.create(contentData);

    console.log('=== CONTENT SAVED SUCCESSFULLY ===');
    console.log('Content ID:', savedContent.id);
    console.log('Public ID:', savedContent.public_id);
    console.log('Structured content keys:', Object.keys(savedContent.content));

    res.json({
      success: true,
      content: savedContent.content,
      handle: handle,
      public_id: savedContent.public_id,
      message: 'Content saved to database successfully',
      id: savedContent.id,
      originalH2s: h2s,
      cleanedH2s: h2s
    });

  } catch (error) {
    console.error('Error saving content to database:', error);
    res.status(500).json({ 
      error: 'Failed to save content to database',
      details: error.message 
    });
  }
});

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
