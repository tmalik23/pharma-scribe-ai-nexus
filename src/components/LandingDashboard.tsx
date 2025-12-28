import React, { useState, useEffect } from 'react';
import { FileText, Database, TrendingUp, Search, MessageSquare, ArrowRight, Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

interface LandingDashboardProps {
    onNavigate: (tab: string) => void;
}

const LandingDashboard = ({ onNavigate }: LandingDashboardProps) => {
    const [stats, setStats] = useState({
        totalPapers: 0,
        topTopic: '',
        latestYear: ''
    });
    const [recentPapers, setRecentPapers] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        // Parallel fetch for speed
        const [papersCount, recent, tags] = await Promise.all([
            supabase.from('papers').select('*', { count: 'exact', head: true }),
            supabase.from('papers').select('*').order('created_at', { ascending: false }).limit(4),
            supabase.rpc('get_entity_stats')
        ]);

        setStats({
            totalPapers: papersCount.count || 0,
            topTopic: tags.data?.[0]?.entity || 'N/A',
            latestYear: '2023' // Hardcoded for now or fetch max year
        });

        setRecentPapers(recent.data || []);
    };

    return (
        <div className="h-full bg-slate-50 overflow-auto animate-fade-in">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-12 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        <div className="md:w-1/2 space-y-6 animate-slide-up">
                            <Badge className="bg-blue-500/30 text-blue-100 hover:bg-blue-500/40 border-0 px-3 py-1">A Victor Ying Project</Badge>
                            <h1 className="text-5xl font-bold tracking-tight leading-tight">
                                Project Vejovis <br />
                                <span className="text-blue-300">Research Oracle</span>
                            </h1>
                            <p className="text-blue-100 text-lg max-w-lg">
                                Advanced scientific research platform powered by vector search and Large Language Models.
                            </p>
                            <div className="flex space-x-4 pt-4">
                                <Button
                                    size="lg"
                                    className="bg-white text-blue-700 hover:bg-blue-50 border-0 font-semibold"
                                    onClick={() => onNavigate('chat')}
                                >
                                    <MessageSquare className="mr-2 h-5 w-5" />
                                    Start AI Chat
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-blue-400 text-blue-100 hover:bg-blue-800 hover:text-white"
                                    onClick={() => onNavigate('search')}
                                >
                                    Search Database
                                </Button>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <div className="md:w-1/3 mt-10 md:mt-0 grid grid-cols-1 gap-4">
                            <Card className="bg-white/10 border-white/20 backdrop-blur-md text-white">
                                <CardContent className="p-6 flex items-center space-x-4">
                                    <div className="p-3 bg-blue-500/20 rounded-full">
                                        <Database className="h-6 w-6 text-blue-300" />
                                    </div>
                                    <div>
                                        <p className="text-blue-200 text-sm">Indexed Papers</p>
                                        <p className="text-3xl font-bold">{stats.totalPapers.toLocaleString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/10 border-white/20 backdrop-blur-md text-white">
                                <CardContent className="p-6 flex items-center space-x-4">
                                    <div className="p-3 bg-purple-500/20 rounded-full">
                                        <Activity className="h-6 w-6 text-purple-300" />
                                    </div>
                                    <div>
                                        <p className="text-blue-200 text-sm">Top Research Topic</p>
                                        <p className="text-xl font-bold truncate max-w-[200px]">{stats.topTopic}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8 space-y-12">
                {/* Quick Actions Grid */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Research Tools</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 border-slate-200" onClick={() => onNavigate('search')}>
                            <CardHeader>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                                    <Search className="h-6 w-6 text-blue-600 group-hover:text-white" />
                                </div>
                                <CardTitle>Semantic Search</CardTitle>
                                <CardDescription>Find papers using natural language queries and filters.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-blue-600 font-medium text-sm">
                                    Explore Database <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 border-slate-200" onClick={() => onNavigate('analytics')}>
                            <CardHeader>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                                    <TrendingUp className="h-6 w-6 text-purple-600 group-hover:text-white" />
                                </div>
                                <CardTitle>Analytics</CardTitle>
                                <CardDescription>Visualize research trends, topic growth, and insights.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-purple-600 font-medium text-sm">
                                    View Dashboard <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1 border-slate-200" onClick={() => onNavigate('database')}>
                            <CardHeader>
                                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-600 transition-colors">
                                    <FileText className="h-6 w-6 text-teal-600 group-hover:text-white" />
                                </div>
                                <CardTitle>Database Browser</CardTitle>
                                <CardDescription>Browse the complete collection by year and category.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-teal-600 font-medium text-sm">
                                    Browse Papers <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Recent Activity */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">Recently Indexed</h2>
                        <Button variant="ghost" onClick={() => onNavigate('database')}>View All</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recentPapers.map((paper) => (
                            <Card key={paper.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
                                <CardContent className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs">
                                            {paper.pub_year || 'Unknown Year'}
                                        </Badge>
                                        <Clock className="h-4 w-4 text-slate-300" />
                                    </div>
                                    <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 leading-snug">
                                        {paper.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                                        {paper.summary || 'No summary available...'}
                                    </p>

                                    <div className="mt-auto pt-4 border-t border-slate-100">
                                        <div className="flex flex-wrap gap-1">
                                            {paper.entities && paper.entities.slice(0, 2).map((tag: string) => (
                                                <span key={tag} className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LandingDashboard;
