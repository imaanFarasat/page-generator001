import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Eye, Edit, Trash2, Plus, Calendar, FileText, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const ContentList = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [itemsPerPage] = useState(10);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        category: selectedCategory || undefined,
        search: searchTerm || undefined
      };
      
      const response = await axios.get('/api/content', { params });
      setContent(response.data.content);
      setTotalPages(Math.ceil(response.data.total / itemsPerPage));
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to fetch content');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedCategory, searchTerm, itemsPerPage]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/content/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchContent();
  }, [fetchContent]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchContent();
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await axios.delete(`/api/content/${id}`);
        toast.success('Content deleted successfully');
        fetchContent();
      } catch (error) {
        console.error('Error deleting content:', error);
        toast.error('Failed to delete content');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getWordCount = (contentData) => {
    if (!contentData || typeof contentData !== 'object') return 0;
    
    let count = 0;
    if (contentData.intro) count += contentData.intro.split(' ').length;
    if (contentData.sections) {
      contentData.sections.forEach(section => {
        if (section.paragraphs) {
          section.paragraphs.forEach(paragraph => {
            count += paragraph.split(' ').length;
          });
        }
        if (section.bullets) {
          section.bullets.forEach(bullet => {
            count += bullet.split(' ').length;
          });
        }
      });
    }
    if (contentData.faqs) {
      contentData.faqs.forEach(faq => {
        count += faq.question.split(' ').length + faq.answer.split(' ').length;
      });
    }
    return count;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
        <Link
          to="/generate"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Generate New Content
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="card mb-6">
        <div className="p-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search content by title, topic, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Content List */}
      {content.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No content found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search criteria or filters.'
              : 'Get started by generating your first piece of content.'
            }
          </p>
          {!searchTerm && !selectedCategory && (
            <Link to="/generate" className="btn btn-primary">
              Generate Content
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {content.map((item) => (
              <div key={item.id} className="card hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 mb-3">{item.topic}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Tag className="w-4 h-4" />
                          {item.category}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {getWordCount(item.content)} words
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link
                        to={`/content/${item.id}`}
                        className="btn btn-outline btn-sm"
                        title="View Content"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/content/${item.id}/edit`}
                        className="btn btn-outline btn-sm"
                        title="Edit Content"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="btn btn-outline btn-danger btn-sm"
                        title="Delete Content"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {item.seo_description && (
                    <p className="text-gray-600 text-sm">
                      {item.seo_description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn btn-sm ${
                      currentPage === page ? 'btn-primary' : 'btn-outline'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline btn-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentList;
