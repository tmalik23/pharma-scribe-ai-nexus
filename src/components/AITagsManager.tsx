import React, { useState, useEffect } from 'react';
import { Tag, Search, Loader2, TrendingUp, Hash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

const AITagsManager = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [allTags, setAllTags] = useState<any[]>([]);
    const [filteredTags, setFilteredTags] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [tagPapers, setTagPapers] = useState<any[]>([]);

    useEffect(() => {
        fetchTags();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            setFilteredTags(
                allTags.filter(tag =>
                    tag.entity.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        } else {
            setFilteredTags(allTags);
        }
    }, [searchTerm, allTags]);

    const fetchTags = async () => {
        try {
            setIsLoading(true);
            const { data } = await supabase.rpc('get_entity_stats');
            setAllTags(data || []);
            setFilteredTags(data || []);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTagClick = async (tagName: string) => {
        setSelectedTag(tagName);

        // Fetch papers with this tag
        const { data } = await supabase
            .from('papers')
            .select('id, title, pub_year, entities')
            .contains('entities', [tagName])
            .limit(10);

        setTagPapers(data || []);
    };

    const getTagSize = (count: number, maxCount: number) => {
        const ratio = count / maxCount;
        if (ratio > 0.7) return 'text-2xl px-5 py-2.5';
        if (ratio > 0.4) return 'text-xl px-4 py-2';
        if (ratio > 0.2) return 'text-lg px-3 py-1.5';
        return 'text-sm px-2.5 py-1';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
                    <p className="text-slate-500">Loading topics...</p>
                </div>
            </div>
        );
    }

    const maxCount = allTags[0]?.paper_count || 1;

    return (
        <div className="p-6 md:p-8 bg-slate-50 h-full overflow-auto font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Topic Manager</h2>
                    <p className="text-slate-500">Explore and analyze research topics across your database</p>
                </div>

                {/* Stats Cards - Keeping clean white style for consistency with new design */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Total Unique Topics</p>
                                    <p className="text-3xl font-bold text-slate-800">{allTags.length}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <Tag size={24} className="text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Most Popular</p>
                                    <p className="text-xl font-bold text-slate-800 truncate" title={allTags[0]?.entity}>{allTags[0]?.entity || 'N/A'}</p>
                                    <p className="text-xs text-slate-400 mt-1">{allTags[0]?.paper_count || 0} papers</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-xl">
                                    <TrendingUp size={24} className="text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Avg Papers per Topic</p>
                                    <p className="text-3xl font-bold text-slate-800">
                                        {Math.round(allTags.reduce((sum, tag) => sum + tag.paper_count, 0) / allTags.length)}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <Hash size={24} className="text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Tag Explorer */}
                    <div className="lg:col-span-2">
                        <Card className="border-slate-100 shadow-sm h-full">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-slate-800">Topic Cloud</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                    <Input
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search topics..."
                                        className="pl-9 h-9 bg-slate-50 border-slate-200"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="min-h-[400px]">
                                <div className="flex flex-wrap gap-2 justify-center items-center p-4">
                                    {filteredTags.slice(0, 100).map((tag) => (
                                        <Badge
                                            key={tag.entity}
                                            variant={selectedTag === tag.entity ? "default" : "secondary"}
                                            className={`
                                                cursor-pointer transition-all hover:scale-105
                                                ${selectedTag === tag.entity
                                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-transparent'}
                                                ${getTagSize(tag.paper_count, maxCount)}
                                            `}
                                            onClick={() => handleTagClick(tag.entity)}
                                        >
                                            {tag.entity}
                                            <span className="ml-1.5 opacity-40 text-[0.8em]">{tag.paper_count}</span>
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Tag Details */}
                    <div>
                        <Card className="border-slate-100 shadow-sm mb-6 sticky top-6">
                            <CardHeader>
                                <CardTitle className="text-slate-800">Topic Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {selectedTag ? (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-xl text-slate-900">{selectedTag}</h3>
                                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0">
                                                {allTags.find(t => t.entity === selectedTag)?.paper_count || 0} papers
                                            </Badge>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-500">Papers with this topic</h4>
                                            {tagPapers.map(paper => (
                                                <div key={paper.id} className="group relative border-l-2 border-indigo-200 pl-4 py-1 hover:border-indigo-600 transition-colors">
                                                    <p className="font-medium text-sm text-slate-700 group-hover:text-indigo-700 transition-colors cursor-pointer leading-snug">
                                                        {paper.title}
                                                    </p>
                                                    {paper.pub_year && (
                                                        <p className="text-xs text-slate-400 mt-1">{paper.pub_year}</p>
                                                    )}
                                                </div>
                                            ))}
                                            <Button variant="outline" className="w-full mt-4 text-xs text-slate-500 border-slate-200">
                                                View all in Search
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 py-12">
                                        <Tag size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-sm">Select a topic from the cloud to view detailed paper lists</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Top Tags List */}
                        <Card className="border-slate-100 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-slate-800">Top 10 Topics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {allTags.slice(0, 10).map((tag, index) => (
                                        <div
                                            key={tag.entity}
                                            className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer group transition-colors"
                                            onClick={() => handleTagClick(tag.entity)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`
                                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                                    ${index < 3 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}
                                                `}>
                                                    {index + 1}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 truncate max-w-[150px]">
                                                    {tag.entity}
                                                </span>
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm">
                                                {tag.paper_count}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AITagsManager;
