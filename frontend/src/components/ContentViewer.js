import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Edit, Eye, Code, Globe, Copy, Check, Download, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ContentViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('html'); // 'html' or 'json'
  const [copied, setCopied] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const [contentResponse, htmlResponse] = await Promise.all([
        axios.get(`/api/content/${id}`),
        axios.get(`/api/content/${id}/html`)
      ]);
      
      setContent(contentResponse.data);
      setHtmlContent(htmlResponse.data.html);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to fetch content');
      navigate('/content');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/content/${id}`);
        toast.success('Content deleted successfully');
        navigate('/content');
      } catch (error) {
        console.error('Error deleting content:', error);
        toast.error('Failed to delete content');
      }
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${type} copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadHTML = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${content?.slug || 'content'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('HTML file downloaded!');
  };

  const shareContent = () => {
    if (navigator.share) {
      navigator.share({
        title: content?.title,
        text: content?.seo_description,
        url: window.location.href
      });
    } else {
      copyToClipboard(window.location.href, 'URL');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!content) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Content not found</h3>
          <p className="text-gray-500 mb-4">The content you're looking for doesn't exist or has been deleted.</p>
          <Link to="/content" className="btn btn-primary">
            Back to Content Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/content" className="btn btn-outline btn-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{content.title}</h1>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={shareContent}
            className="btn btn-outline btn-sm"
            title="Share Content"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            onClick={downloadHTML}
            className="btn btn-outline btn-sm"
            title="Download HTML"
          >
            <Download className="w-4 h-4" />
          </button>
          <Link
            to={`/content/${id}/edit`}
            className="btn btn-primary btn-sm"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Content Metadata */}
      <div className="card mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <p className="text-gray-900">{content.category}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Topic</label>
              <p className="text-gray-900">{content.topic}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Word Count</label>
              <p className="text-gray-900">{getWordCount(content.content)} words</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <p className="text-gray-900">{formatDate(content.createdAt)}</p>
            </div>
          </div>
          
          {content.seo_description && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">SEO Description</label>
              <p className="text-gray-900">{content.seo_description}</p>
            </div>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('html')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'html'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Rendered HTML
          </button>
          <button
            onClick={() => setViewMode('json')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'json'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            JSON Structure
          </button>
        </div>
      </div>

      {/* Content Display */}
      {viewMode === 'html' ? (
        <div className="card">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Rendered HTML</h2>
              <button
                onClick={() => copyToClipboard(htmlContent, 'HTML')}
                className="btn btn-outline btn-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy HTML'}
              </button>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50">
              <div 
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">JSON Structure</h2>
              <button
                onClick={() => copyToClipboard(JSON.stringify(content.content, null, 2), 'JSON')}
                className="btn btn-outline btn-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-900 text-gray-100 overflow-x-auto">
              <pre className="text-sm">
                {JSON.stringify(content.content, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* SEO Information */}
      <div className="card mt-6">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            SEO Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">SEO Title</label>
              <p className="text-gray-900">{content.seo_title || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">SEO Keywords</label>
              <p className="text-gray-900">{content.seo_keywords || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Slug</label>
              <p className="text-gray-900 font-mono text-sm">{content.slug}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Last Updated</label>
              <p className="text-gray-900">{formatDate(content.updatedAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-8">
        <Link to="/generate" className="btn btn-primary">
          Generate New Content
        </Link>
        <Link to="/content" className="btn btn-outline">
          Back to Library
        </Link>
        <button
          onClick={handleDelete}
          className="btn btn-outline btn-danger"
        >
          Delete Content
        </button>
      </div>
    </div>
  );
};

export default ContentViewer;
