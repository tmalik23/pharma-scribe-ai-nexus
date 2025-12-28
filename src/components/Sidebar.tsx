
import React from 'react';
import { Search, Database, MessageSquare, Settings, FileText, Tag, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const menuItems = [
    { id: 'chat', icon: MessageSquare, label: 'AI Research Chat' },
    { id: 'search', icon: Search, label: 'Paper Search' },
    { id: 'database', icon: Database, label: 'Browse Database' },
    { id: 'analytics', icon: BarChart3, label: 'Research Analytics' },
    { id: 'tags', icon: Tag, label: 'AI Tags' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold">PharmaResearch AI</h1>
        <p className="text-sm text-gray-400 mt-1">Research Database</p>
      </div>

      <nav className="flex-1 px-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-3 rounded-lg mb-2 text-left transition-colors",
              activeTab === item.id
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            )}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => onTabChange('settings')}
          className={cn(
            "w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors",
            activeTab === 'settings'
              ? "bg-gray-700 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          )}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
