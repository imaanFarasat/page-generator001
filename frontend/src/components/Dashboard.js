import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import axios from 'axios';


const Dashboard = () => {
  const [stats, setStats] = useState({
    totalContent: 0,
    totalWords: 0,
    todayContent: 0
  });
  const [recentContent, setRecentContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get stats
      const statsResponse = await axios.get('/api/generate/status');
      setStats(statsResponse.data);

      // Get recent content (demo mode)
      const contentResponse = await axios.get('/api/content?limit=5');
      setRecentContent(contentResponse.data.data.content);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use demo data if API fails
      setStats({
        totalContent: 0,
        totalWords: 0,
        todayContent: 0
      });
      setRecentContent([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your AI Content Generator dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Content</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalContent}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Words</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalWords.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Content</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.todayContent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Content */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Content</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BarChart3 className="w-4 h-4" />
            <span>Demo Mode</span>
          </div>
        </div>

        {recentContent.length > 0 ? (
          <div className="space-y-4">
            {recentContent.map((content) => (
              <div key={content.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{content.title}</h3>
                <p className="text-gray-600 text-sm">
                  {content.content?.intro || content.topic || 'Content preview not available'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No content generated yet</p>
            <p className="text-sm text-gray-400">Start by generating your first piece of content!</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 mb-4">Ready to create amazing content?</p>
        <a
          href="/generate"
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          Generate New Content
        </a>
      </div>
    </div>
  );
};

export default Dashboard;
