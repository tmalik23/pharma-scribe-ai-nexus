import React from 'react';
import { Search, Database, MessageSquare, Settings, Tag, BarChart3, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const menuItems = [
    { id: 'home', icon: Home, label: 'Overview' },
    { id: 'chat', icon: MessageSquare, label: 'AI Assistant' },
    { id: 'search', icon: Search, label: 'Paper Search' },
    { id: 'database', icon: Database, label: 'Database' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'tags', icon: Tag, label: 'Topics' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shadow-xl z-20 font-sans">
      <div className="p-6 mb-2 cursor-pointer" onClick={() => onTabChange('home')}>
        <div className="flex items-center space-x-2 mb-1">
          <img src="/favicon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
          <h1 className="text-xl font-bold text-white tracking-tight">Project Vejovis</h1>
        </div>
        <p className="text-xs text-slate-500 ml-10 font-medium">A Victor Ying Project</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
              activeTab === item.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                : "hover:bg-slate-800 hover:text-white"
            )}
          >
            <item.icon size={18} className={cn(
              "transition-colors",
              activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-white"
            )} />
            <span>{item.label}</span>
            {activeTab === item.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-l-full opacity-20" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto">
        <button
          onClick={() => onTabChange('settings')}
          className={cn(
            "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
          )}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
