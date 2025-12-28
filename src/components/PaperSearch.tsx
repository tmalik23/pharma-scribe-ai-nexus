import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, FileText, ChevronLeft, ChevronRight, Calendar, X, BookOpen, TrendingUp, Lightbulb, Tag, Eye, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

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

const PaperSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allEntities, setAllEntities] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [minYear, setMinYear] = useState<number | null>(null);
  const [maxYear, setMaxYear] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;
  const r2BucketUrl = import.meta.env.VITE_R2_BUCKET_URL || '';

  useEffect(() => {
    fetchPapers();
    fetchEntities();
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [currentPage, selectedEntities, minYear, maxYear]);

  const fetchEntities = async () => {
    const { data } = await supabase.rpc('get_entity_stats');
    const topTags = (data || []).slice(0, 30).map((e: any) => e.entity);
    setAllEntities(topTags);
  };

  const fetchPapers = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('papers')
        .select('*', { count: 'exact' });

      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      if (minYear) {
        query = query.gte('pub_year', minYear);
      }

      if (maxYear) {
        query = query.lte('pub_year', maxYear);
      }

      if (selectedEntities.length > 0) {
        selectedEntities.forEach(entity => {
          query = query.contains('entities', [entity]);
        });
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (error) throw error;
      setPapers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPapers();
  };

  const toggleEntity = (entity: string) => {
    setSelectedEntities(prev =>
      prev.includes(entity)
        ? prev.filter(e => e !== entity)
        : [...prev, entity]
    );
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex h-full bg-slate-50 font-sans">
      {/* Main Content */}
      <div className={`flex-1 overflow-auto ${selectedPaper ? 'w-1/2' : 'w-full'} transition-all`}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Research Paper Search</h2>
              <p className="text-slate-500">Search and filter through {totalCount.toLocaleString()} research papers</p>
            </div>

            {/* Search Bar */}
            <Card className="mb-6 border-slate-100 shadow-sm">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search papers by title, abstract, or keywords..."
                      className="pl-10 border-slate-200 bg-slate-50 focus:bg-white h-12"
                    />
                  </div>
                  <Button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-6">
                    <Search size={18} className="mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="mb-6 border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Filter size={16} />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <Input
                      type="number"
                      placeholder="From year"
                      value={minYear || ''}
                      onChange={(e) => setMinYear(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-28 h-9 text-sm border-slate-200"
                    />
                    <span className="text-slate-300">—</span>
                    <Input
                      type="number"
                      placeholder="To year"
                      value={maxYear || ''}
                      onChange={(e) => setMaxYear(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-28 h-9 text-sm border-slate-200"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allEntities.map(entity => (
                    <Badge
                      key={entity}
                      variant={selectedEntities.includes(entity) ? "default" : "outline"}
                      className={`cursor-pointer text-xs ${selectedEntities.includes(entity)
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-indigo-50 border-slate-200'
                        }`}
                      onClick={() => toggleEntity(entity)}
                    >
                      {entity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Results Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-700 font-medium">{totalCount} Papers Found</h3>
              {(selectedEntities.length > 0 || minYear || maxYear || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedEntities([]);
                    setMinYear(null);
                    setMaxYear(null);
                    setSearchQuery('');
                  }}
                  className="text-slate-500 hover:text-red-500"
                >
                  Clear all filters
                </Button>
              )}
            </div>

            {/* Search Results */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
                <p className="text-slate-500">Searching database...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {papers.map(paper => (
                  <Card
                    key={paper.id}
                    className={`cursor-pointer transition-all border group ${selectedPaper?.id === paper.id
                        ? 'border-indigo-300 bg-indigo-50 shadow-md'
                        : 'border-slate-200 hover:border-indigo-200 hover:shadow-md'
                      }`}
                    onClick={() => setSelectedPaper(paper)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2 text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight">
                            {paper.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            {paper.pub_year && (
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                                <Calendar size={14} className="mr-1.5" />
                                {paper.pub_year}
                              </Badge>
                            )}
                            {paper.entities && paper.entities.slice(0, 4).map((entity: string) => (
                              <Badge key={entity} variant="outline" className="text-xs border-slate-200 text-slate-500">
                                {entity}
                              </Badge>
                            ))}
                            {paper.entities?.length > 4 && (
                              <span className="text-xs text-slate-400">+{paper.entities.length - 4} more</span>
                            )}
                          </div>
                          <p className="text-slate-600 line-clamp-2 leading-relaxed">
                            {paper.summary || paper.findings || "No summary available"}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                            <FileText size={20} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {papers.length === 0 && !isLoading && (
                  <div className="text-center py-20 bg-white rounded-xl border border-slate-100 border-dashed">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No papers found</h3>
                    <p className="text-slate-500">Try adjusting your filters or search terms</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="border-slate-200"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="px-4 py-2 text-sm text-slate-600 bg-white rounded border border-slate-200">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="border-slate-200"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
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
                      <p className="text-sm text-indigo-600 truncate max-w-[200px]">{selectedPaper.filename}</p>
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
                <p className="text-sm text-slate-500 mb-2">Want to explore this paper further?</p>
                <Button
                  variant="outline"
                  onClick={() => {
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

export default PaperSearch;
