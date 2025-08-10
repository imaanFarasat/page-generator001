const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');
const slugify = require('slugify');

const Content = sequelize.define('Content', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  public_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'SEO-friendly public ID for URLs (e.g., "1703123456789_abc")'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [1, 255]
    }
  },
  handle: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      len: [1, 100]
    },
    comment: 'URL-friendly handle for routing (e.g., "agate-beads")'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'general'
  },
  topic: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'The original topic/prompt used to generate content'
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Structured JSON content from Gemini AI'
  },
  html: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Rendered HTML version of the content'
  },
  seo_title: {
    type: DataTypes.STRING(60),
    allowNull: true,
    comment: 'SEO optimized title (max 60 chars)'
  },
  seo_description: {
    type: DataTypes.STRING(160),
    allowNull: true,
    comment: 'SEO meta description (max 160 chars)'
  },
  seo_keywords: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comma-separated SEO keywords'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    allowNull: false
  },
  word_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Approximate word count of the content'
  },
  generation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken to generate content in milliseconds'
  },
  gemini_model: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'gemini-pro',
    comment: 'Gemini model used for generation'
  },
  gemini_tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of tokens used in generation'
  },

  faq_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Number of FAQs generated to avoid recalculation at render time'
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Comma-separated tags for content categorization'
  }
}, {
  tableName: 'contents',
  indexes: [
    {
      fields: ['public_id']
    },
    {
      fields: ['handle']
    },
    {
      fields: ['category']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ],
  hooks: {
    beforeValidate: (content) => {
      // Generate public_id if not provided
      if (!content.public_id) {
        content.public_id = Date.now() + '_' + Math.random().toString(36).substr(2, 3);
      }
      
      if (content.title && !content.handle) {
        content.handle = slugify(content.title, { 
          lower: true, 
          strict: true,
          remove: /[*+~.()'"!:@]/g
        });
      }
      
      // Generate SEO title if not provided
      if (content.title && !content.seo_title) {
        content.seo_title = content.title.length > 60 
          ? content.title.substring(0, 57) + '...' 
          : content.title;
      }
      
      // Generate SEO description if not provided
      if (content.content && content.content.intro && !content.seo_description) {
        const intro = content.content.intro;
        content.seo_description = intro.length > 160 
          ? intro.substring(0, 157) + '...' 
          : intro;
      }
      
      // Calculate word count
      if (content.content) {
        let wordCount = 0;
        if (content.content.intro) {
          wordCount += content.content.intro.split(' ').length;
        }
        if (content.content.sections) {
          content.content.sections.forEach(section => {
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
        if (content.content.faqs) {
          content.content.faqs.forEach(faq => {
            wordCount += faq.question.split(' ').length;
            wordCount += faq.answer.split(' ').length;
          });
        }
        content.word_count = wordCount;
      }
    }
  }
});

module.exports = Content;
