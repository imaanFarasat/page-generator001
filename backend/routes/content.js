const express = require('express');
const Content = require('../models/Content');
const router = express.Router();

// Save new content to database
router.post('/', async (req, res) => {
  try {
    const {
      title,
      topic,
      content,
      category = 'general',
      status = 'draft',
      handle,
      faq_count,
      seo_title,
      seo_description
    } = req.body;

    // Validate required fields
    if (!title || !topic || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, topic, and content are required'
      });
    }

    // Truncate SEO fields if they exceed database constraints
    const truncatedSeoTitle = seo_title && seo_title.length > 60 
      ? seo_title.substring(0, 57) + '...' 
      : seo_title;
    
    const truncatedSeoDescription = seo_description && seo_description.length > 160 
      ? seo_description.substring(0, 157) + '...' 
      : seo_description;

    // Create new content
    const newContent = await Content.create({
      title,
      topic,
      content,
      category,
      status,
      handle,
      faq_count,
      seo_title: truncatedSeoTitle,
      seo_description: truncatedSeoDescription
    });

    console.log('✅ Content saved to database:', {
      id: newContent.id,
      title: newContent.title,
      handle: newContent.handle,
      seo_title_length: truncatedSeoTitle?.length || 0,
      seo_description_length: truncatedSeoDescription?.length || 0
    });

    res.status(201).json({
      success: true,
      message: 'Content saved successfully',
      data: newContent
    });

  } catch (error) {
    console.error('❌ Error saving content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save content',
      details: error.message
    });
  }
});

// Get all content with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Content.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        content: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: limit,
          has_next: page < Math.ceil(count / limit),
          has_prev: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
      details: error.message
    });
  }
});

// Search content
router.get('/search', async (req, res) => {
  try {
    const { q, category, status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    
    if (q) {
      whereClause = {
        [require('sequelize').Op.or]: [
          { title: { [require('sequelize').Op.like]: `%${q}%` } },
          { topic: { [require('sequelize').Op.like]: `%${q}%` } },
          { category: { [require('sequelize').Op.like]: `%${q}%` } }
        ]
      };
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await Content.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        content: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_items: count,
          items_per_page: parseInt(limit),
          has_next: parseInt(page) < Math.ceil(count / limit),
          has_prev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to search content',
      details: error.message
    });
  }
});

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    const content = await Content.findByPk(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content',
      details: error.message
    });
  }
});

// Update content status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const content = await Content.findByPk(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    await content.update({ status });
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      details: error.message
    });
  }
});

// Delete content
router.delete('/:id', async (req, res) => {
  try {
    const content = await Content.findByPk(req.params.id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    await content.destroy();
    
    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete content',
      details: error.message
    });
  }
});

module.exports = router;
