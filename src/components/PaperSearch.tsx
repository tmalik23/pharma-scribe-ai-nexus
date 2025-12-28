import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Tag, FileText, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

const PaperSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .limit(20);

      if (error) throw error;
      setPapers(data || []);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    // If empty query, just fetch recent
    if (!searchQuery.trim()) {
      fetchPapers();
      return;
    }

    // For now, simple text search or we could use the edge function search for semantic
    // Let's implement simple text match on title/summary first for the UI search bar
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('papers')
        .select('*')
        .ilike('title', `%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setPapers(data || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 h-full">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Research Paper Search</h2>
          <p className="text-gray-600">Search through research papers</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex space-x-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search papers by title..."
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Filter size={20} className="mr-2" />}
              Search
            </Button>
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Search Results ({papers.length})</h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            papers.map(paper => (
              <Card key={paper.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 hover:text-blue-600 cursor-pointer">
                        {paper.title}
                      </CardTitle>
                      <div className="text-sm text-gray-600 mb-2">
                        {/* Display ID or other metadata since we don't have explicit authors column in list view */}
                        Paper ID: {paper.id}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4 line-clamp-3">{paper.summary || "No summary available"}</p>
                  <div className="flex space-x-3">
                    <Button size="sm" variant="outline">
                      <FileText size={16} className="mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperSearch;
