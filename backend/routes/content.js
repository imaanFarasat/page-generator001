const express = require('express');
const Content = require('../models/Content');
const router = express.Router();

// Get all content (for dashboard)
router.get('/', async (req, res) => {
  try {
    const contents = await Content.findAll({
      order: [['created_at', 'DESC']]
    });

    // Transform JSON data back to dashboard format
    const transformedContents = contents.map(content => {
      const fullContent = content.full_content;
      
      // Handle both old and new data structures
      let title, handle, category, tags, wordCount, faqCount, generationTime, createdAt, updatedAt;
      
      if (fullContent) {
        // New JSON structure
        title = fullContent.body?.h1 || content.title || 'Untitled';
        handle = fullContent.identifier?.handle || content.handle || '';
        category = fullContent.classification?.category || content.category || 'general';
        tags = fullContent.classification?.tags || (content.tags ? content.tags.split(',').map(tag => tag.trim()) : []);
        wordCount = fullContent.metadata?.word_count || content.word_count || 0;
        faqCount = fullContent.metadata?.faq_count || content.faq_count || 0;
        generationTime = fullContent.metadata?.generation_time || content.generation_time || 0;
        createdAt = fullContent.metadata?.created_at || content.created_at;
        updatedAt = fullContent.metadata?.updated_at || content.updated_at;
      } else {
        // Fallback to old structure
        title = content.title || 'Untitled';
        handle = content.handle || '';
        category = content.category || 'general';
        tags = content.tags ? content.tags.split(',').map(tag => tag.trim()) : [];
        wordCount = content.word_count || 0;
        faqCount = content.faq_count || 0;
        generationTime = content.generation_time || 0;
        createdAt = content.created_at;
        updatedAt = content.updated_at;
      }

      return {
        id: content.id,
        public_id: content.public_id,
        title: title,
        handle: handle,
        category: category,
        tags: tags,
        status: content.status,
        word_count: wordCount,
        faq_count: faqCount,
        generation_time: generationTime,
        created_at: createdAt,
        updated_at: updatedAt,
        // Include the full content for compatibility
        content: fullContent || content.content
      };
    });

    res.json(transformedContents);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content', details: error.message });
  }
});

// Get content by public_id
router.get('/:public_id', async (req, res) => {
  try {
    const content = await Content.findOne({
      where: { public_id: req.params.public_id }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Return both new and old format for compatibility
    const fullContent = content.full_content;
    const response = {
      success: true,
      public_id: content.public_id,
      status: content.status,
      // New format
      content: fullContent,
      // Old format for compatibility
      title: fullContent?.body?.h1 || content.title,
      handle: fullContent?.identifier?.handle || content.handle,
      category: fullContent?.classification?.category || content.category,
      tags: fullContent?.classification?.tags || (content.tags ? content.tags.split(',').map(tag => tag.trim()) : [])
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content', details: error.message });
  }
});

// Update content status
router.patch('/:public_id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const content = await Content.findOne({
      where: { public_id: req.params.public_id }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await content.update({ status });

    res.json({
      success: true,
      message: 'Status updated successfully',
      status: content.status
    });
  } catch (error) {
    console.error('Error updating content status:', error);
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
});

// Delete content
router.delete('/:public_id', async (req, res) => {
  try {
    const content = await Content.findOne({
      where: { public_id: req.params.public_id }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await content.destroy();

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(500).json({ error: 'Failed to delete content', details: error.message });
  }
});

module.exports = router;
