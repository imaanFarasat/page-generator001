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
  full_content: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Complete structured content in JSON format including all metadata'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    allowNull: false
  }
}, {
  tableName: 'contents',
  indexes: [
    {
      fields: ['public_id']
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
      
      // Generate handle if not provided in full_content
      if (content.full_content && content.full_content.identifier && !content.full_content.identifier.handle) {
        const title = content.full_content.body?.h1 || 'untitled';
        content.full_content.identifier = {
          ...content.full_content.identifier,
          handle: slugify(title, { 
            lower: true, 
            strict: true,
            remove: /[*+~.()'"!:@]/g
          })
        };
      }
    }
  }
});

module.exports = Content;
