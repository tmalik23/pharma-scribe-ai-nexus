import React, { useEffect, useState } from 'react';
import { Database, FileText, Calendar, Tag, TrendingUp, Search, X, Download, BookOpen, Lightbulb, Eye, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Paper {
  id: string;
  filename: string;
  title: string;
  pub_year: number | null;
  summary: string;
  findings: string;
  hypothesis: string;
  entities: string[];
}

const DatabaseBrowser = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [selectedDecade, setSelectedDecade] = useState<string | null>(null);
  const r2BucketUrl = import.meta.env.VITE_R2_BUCKET_URL || '';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = papers;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(query) ||
        p.summary?.toLowerCase().includes(query) ||
        p.entities?.some(e => e.toLowerCase().includes(query))
      );
    }

    if (selectedDecade) {
      const decadeStart = parseInt(selectedDecade);
      filtered = filtered.filter(p =>
        p.pub_year && p.pub_year >= decadeStart && p.pub_year < decadeStart + 10
      );
    }

    setFilteredPapers(filtered);
  }, [papers, searchQuery, selectedDecade]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get stats
      const { count: totalPapers } = await supabase.from('papers').select('*', { count: 'exact', head: true });
      const { count: totalChunks } = await supabase.from('paper_chunks').select('*', { count: 'exact', head: true });
      const { data: entities } = await supabase.rpc('get_entity_stats');

      setStats({
        totalPapers: totalPapers || 0,
        totalChunks: totalChunks || 0,
        totalEntities: entities?.length || 0
      });

      // Get all papers
      const { data: allPapers } = await supabase
        .from('papers')
        .select('id, filename, title, pub_year, summary, findings, hypothesis, entities')
        .order('pub_year', { ascending: false });

      setPapers(allPapers || []);
      setFilteredPapers(allPapers || []);

      // Build yearly data for chart
      const yearCounts: Record<number, number> = {};
      allPapers?.forEach(p => {
        if (p.pub_year) {
          yearCounts[p.pub_year] = (yearCounts[p.pub_year] || 0) + 1;
        }
      });

      const chartData = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year);

      setYearlyData(chartData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique decades for filtering
  const decades = [...new Set(papers.filter(p => p.pub_year).map(p => Math.floor(p.pub_year! / 10) * 10))].sort((a, b) => b - a);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
          <p className="text-slate-500">Loading database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      {/* Main Content */}
      <div className={`flex-1 overflow-hidden flex flex-col ${selectedPaper ? 'w-1/2' : 'w-full'} transition-all`}>
        <div className="p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Paper Database</h2>
            <p className="text-slate-500">Browse and explore your research collection</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalPapers?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Papers</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Database className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalChunks?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Text Chunks</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Tag className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.totalEntities?.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Topics</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card className="mb-6 border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">Publications Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Search & Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search papers by title, summary, or topic..."
                className="pl-10 bg-white border-slate-200"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={selectedDecade === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDecade(null)}
                className={selectedDecade === null ? "bg-indigo-600" : ""}
              >
                All
              </Button>
              {decades.slice(0, 5).map(decade => (
                <Button
                  key={decade}
                  variant={selectedDecade === String(decade) ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDecade(selectedDecade === String(decade) ? null : String(decade))}
                  className={selectedDecade === String(decade) ? "bg-indigo-600" : ""}
                >
                  {decade}s
                </Button>
              ))}
            </div>
          </div>

          {/* Papers List */}
          <div className="space-y-2">
            <p className="text-sm text-slate-500 mb-2">
              Showing {filteredPapers.length} of {papers.length} papers
              {searchQuery && ` matching "${searchQuery}"`}
              {selectedDecade && ` from ${selectedDecade}s`}
            </p>
            {filteredPapers.slice(0, 50).map((paper) => (
              <Card
                key={paper.id}
                className={`cursor-pointer transition-all hover:shadow-md border ${selectedPaper?.id === paper.id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-100 bg-white hover:border-indigo-200'
                  }`}
                onClick={() => setSelectedPaper(paper)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">{paper.title || 'Untitled'}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{paper.summary || 'No summary available'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {paper.pub_year && (
                          <Badge variant="secondary" className="text-xs bg-slate-100">
                            <Calendar className="w-3 h-3 mr-1" />
                            {paper.pub_year}
                          </Badge>
                        )}
                        {paper.entities?.slice(0, 2).map((entity, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {entity}
                          </Badge>
                        ))}
                        {paper.entities?.length > 2 && (
                          <span className="text-xs text-slate-400">+{paper.entities.length - 2} more</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredPapers.length > 50 && (
              <p className="text-center text-sm text-slate-400 py-4">
                Showing first 50 results. Use search to narrow down.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Paper Detail Panel */}
      {selectedPaper && (
        <div className="w-1/2 border-l border-slate-200 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between z-10">
            <h3 className="font-semibold text-slate-800">Paper Details</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedPaper(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedPaper.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                {selectedPaper.pub_year && (
                  <Badge className="bg-indigo-100 text-indigo-700">
                    <Calendar className="w-3 h-3 mr-1" />
                    {selectedPaper.pub_year}
                  </Badge>
                )}
                {selectedPaper.filename && (
                  <Badge variant="outline" className="text-xs">
                    {selectedPaper.filename}
                  </Badge>
                )}
              </div>
            </div>

            {/* PDF Download/View */}
            {selectedPaper.filename && (
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-indigo-600" />
                    <div>
                      <p className="font-medium text-indigo-900">Original PDF</p>
                      <p className="text-sm text-indigo-600">{selectedPaper.filename}</p>
                    </div>
                  </div>
                  {r2BucketUrl ? (
                    <a
                      href={`${r2BucketUrl}/${selectedPaper.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View PDF
                    </a>
                  ) : (
                    <Button variant="outline" disabled className="text-slate-400">
                      <Download className="w-4 h-4 mr-2" />
                      PDF Not Linked
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {selectedPaper.summary && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Summary
                </h4>
                <p className="text-slate-600 leading-relaxed">{selectedPaper.summary}</p>
              </div>
            )}

            {/* Findings */}
            {selectedPaper.findings && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Key Findings
                </h4>
                <p className="text-slate-600 leading-relaxed">{selectedPaper.findings}</p>
              </div>
            )}

            {/* Hypothesis */}
            {selectedPaper.hypothesis && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Hypothesis / Future Directions
                </h4>
                <p className="text-slate-600 leading-relaxed">{selectedPaper.hypothesis}</p>
              </div>
            )}

            {/* Topics/Entities */}
            {selectedPaper.entities && selectedPaper.entities.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold text-slate-700 mb-2">
                  <Tag className="w-4 h-4 text-purple-500" />
                  Research Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPaper.entities.map((entity, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                      {entity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ask AI Button */}
            <Card className="border-dashed border-slate-300 bg-slate-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500 mb-2">Want to learn more about this paper?</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Could navigate to chat with pre-filled question
                    navigator.clipboard.writeText(`Tell me more about the paper "${selectedPaper.title}"`);
                    alert('Prompt copied! Paste it in the AI Chat.');
                  }}
                >
                  Ask the Research Oracle
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseBrowser;
