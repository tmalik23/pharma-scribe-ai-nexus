
import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import PaperSearch from '@/components/PaperSearch';
import DatabaseBrowser from '@/components/DatabaseBrowser';

const Index = () => {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface />;
      case 'search':
        return <PaperSearch />;
      case 'database':
        return <DatabaseBrowser />;
      case 'analytics':
        return (
          <div className="p-6 bg-gray-50 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Research Analytics</h2>
              <p className="text-gray-600">Advanced analytics dashboard coming soon...</p>
            </div>
          </div>
        );
      case 'tags':
        return (
          <div className="p-6 bg-gray-50 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">AI Tag Management</h2>
              <p className="text-gray-600">AI tagging system interface coming soon...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 bg-gray-50 h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <p className="text-gray-600">System configuration options coming soon...</p>
            </div>
          </div>
        );
      default:
        return <ChatInterface />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

export default Index;
