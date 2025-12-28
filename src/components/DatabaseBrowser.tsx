import React, { useState, useEffect } from 'react';
import { Database, FileText, Tag, Calendar, TrendingUp, Users, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

const DatabaseBrowser = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPapers: 0,
    totalAuthors: 0, // We might not have an authors table, so this is tricky to get exactly without heavy query
    totalTags: 0,    // Same for tags if they are in jsonb
    newThisMonth: 0
  });
  const [recentPapers, setRecentPapers] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // 1. Get Total Papers
      const { count: totalPapers, error: countError } = await supabase
        .from('papers')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // 2. Get Recent Papers
      const { data: papers, error: papersError } = await supabase
        .from('papers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (papersError) throw papersError;

      setRecentPapers(papers || []);

      // 3. Estimate other stats (since we don't have separate tables for authors/tags yet)
      // For now, we'll just show the paper count which is the most important one.
      setStats({
        totalPapers: totalPapers || 0,
        totalAuthors: 0, // Placeholder until we analyze authors
        totalTags: 0,    // Placeholder
        newThisMonth: 0  // Placeholder
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">Loading database statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Database Overview</h2>
          <p className="text-gray-600">Browse and analyze your pharmaceutical research database</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Papers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPapers.toLocaleString()}</p>
                </div>
                <FileText className="text-blue-500" size={24} />
              </div>
            </CardContent>
          </Card>

          {/* Other cards kept static for now as we don't have the data easily accessible without expensive queries */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Database Status</p>
                  <p className="text-xl font-bold text-green-600">Active</p>
                </div>
                <Database className="text-green-500" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Papers */}
          <Card className="col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText size={20} />
                <span>Recently Added Papers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPapers.map(paper => (
                  <div key={paper.id} className="border-b pb-4 last:border-b-0">
                    <h4 className="font-medium text-gray-900 mb-2 hover:text-blue-600 cursor-pointer truncate">
                      {paper.title}
                    </h4>
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      {/* Display available metadata if exists */}
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">ID: {paper.id.slice(0, 8)}...</span>
                    </div>

                    {/* Display summary snippet if available */}
                    {paper.summary && (
                      <p className="text-sm text-gray-600 line-clamp-2">{paper.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DatabaseBrowser;
