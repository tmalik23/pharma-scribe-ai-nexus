import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import PaperSearch from '@/components/PaperSearch';
import DatabaseBrowser from '@/components/DatabaseBrowser';
import ResearchAnalytics from '@/components/ResearchAnalytics';
import AITagsManager from '@/components/AITagsManager';
import LandingDashboard from '@/components/LandingDashboard';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <LandingDashboard onNavigate={setActiveTab} />;
      case 'chat':
        return <ChatInterface />;
      case 'search':
        return <PaperSearch />;
      case 'database':
        return <DatabaseBrowser />;
      case 'analytics':
        return <ResearchAnalytics />;
      case 'tags':
        return <AITagsManager />;
      case 'settings':
        return (
          <div className="p-6 bg-slate-50 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <p className="text-slate-600">System configuration options coming soon...</p>
            </div>
          </div>
        );
      default:
        return <LandingDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen flex bg-slate-100 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
