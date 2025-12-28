import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Tag, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4f46e5', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const ResearchAnalytics = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>({});
    const [yearlyData, setYearlyData] = useState<any[]>([]);
    const [decadeData, setDecadeData] = useState<any[]>([]);
    const [topEntities, setTopEntities] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);

            // Get overall stats
            const { count: totalPapers } = await supabase
                .from('papers')
                .select('*', { count: 'exact', head: true });

            // Get year range
            const { data: yearData } = await supabase.rpc('execute_sql', {
                query: `SELECT MIN(pub_year) as min_year, MAX(pub_year) as max_year FROM papers WHERE pub_year IS NOT NULL`
            });

            // Get papers by year
            const { data: yearly } = await supabase
                .from('papers')
                .select('pub_year')
                .not('pub_year', 'is', null);

            const yearCounts = yearly?.reduce((acc: any, paper: any) => {
                acc[paper.pub_year] = (acc[paper.pub_year] || 0) + 1;
                return acc;
            }, {});

            const yearlyChartData = Object.entries(yearCounts || {})
                .map(([year, count]) => ({ year: parseInt(year), count }))
                .sort((a, b) => a.year - b.year);

            setYearlyData(yearlyChartData);

            // Get decade data
            const { data: decades } = await supabase.rpc('get_papers_by_decade');
            setDecadeData(decades || []);

            // Get top entities
            const { data: entities } = await supabase.rpc('get_entity_stats');
            setTopEntities((entities || []).slice(0, 20));

            setStats({
                totalPapers: totalPapers || 0,
                yearRange: yearData?.[0] ? `${yearData[0].min_year}-${yearData[0].max_year}` : 'N/A'
            });

        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
                    <p className="text-slate-500">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 bg-slate-50 h-full overflow-auto font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Research Analytics</h2>
                    <p className="text-slate-500">Comprehensive insights into your research database</p>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Total Papers</p>
                                    <p className="text-3xl font-bold text-slate-800">{stats.totalPapers?.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-indigo-50 rounded-xl">
                                    <BarChart3 size={24} className="text-indigo-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Year Range</p>
                                    <p className="text-2xl font-bold text-slate-800">{stats.yearRange}</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-xl">
                                    <Calendar size={24} className="text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Unique Tags</p>
                                    <p className="text-3xl font-bold text-slate-800">{topEntities.length}</p>
                                </div>
                                <div className="p-3 bg-teal-50 rounded-xl">
                                    <Tag size={24} className="text-teal-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-medium">Avg per Year</p>
                                    <p className="text-3xl font-bold text-slate-800">
                                        {yearlyData.length > 0 ? Math.round(stats.totalPapers / yearlyData.length) : 0}
                                    </p>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-xl">
                                    <TrendingUp size={24} className="text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Publications Timeline */}
                    <Card className="border-slate-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-800">Publications Over Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={yearlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="year"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#4f46e5"
                                        strokeWidth={3}
                                        dot={false}
                                        activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Publications by Decade */}
                    <Card className="border-slate-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-800">Publications by Decade</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={decadeData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="decade"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="paper_count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Top Research Topics */}
                <Card className="border-slate-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800">Top 20 Research Topics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={500}>
                            <BarChart data={topEntities} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="entity"
                                    type="category"
                                    width={200}
                                    tick={{ fill: '#475569', fontSize: 13 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="paper_count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ResearchAnalytics;
