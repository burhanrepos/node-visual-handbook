import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopicContent from './components/TopicContent';
import { topics } from './data/topics';

export default function App() {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id || '');
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load progress and theme preference from LocalStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('node_handbook_progress');
    if (savedProgress) {
      try {
        setCompletedTopics(JSON.parse(savedProgress));
      } catch (e) {
        console.error('Failed to parse progress', e);
      }
    }

    const savedTheme = localStorage.getItem('node_handbook_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else {
      setTheme('dark');
    }
  }, []);

  // Sync theme changes with DOM element classList
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('node_handbook_theme', theme);
  }, [theme]);

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleToggleComplete = () => {
    if (!selectedTopicId) return;

    setCompletedTopics((prev) => {
      let updated: string[];
      if (prev.includes(selectedTopicId)) {
        updated = prev.filter((id) => id !== selectedTopicId);
      } else {
        updated = [...prev, selectedTopicId];
      }
      localStorage.setItem('node_handbook_progress', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0F1115] text-[#D1D5DB] font-sans transition-colors duration-200">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={handleCloseSidebar}
          aria-hidden="true"
        />
      )}

      {/* Group Left Sidebar */}
      <Sidebar
        topics={topics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={handleSelectTopic}
        completedTopics={completedTopics}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
      />

      {/* Main Learning Canvas Panel */}
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden sticky top-0 z-20 bg-[#0F1115] border-b border-[#2A2D35] px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleToggleSidebar}
            className="px-3 py-2 rounded-md bg-[#15171C] border border-[#2A2D35] text-sm text-[#D1D5DB] hover:bg-[#1A1D23] transition"
            aria-label="Open sidebar"
          >
            MENU
          </button>
          <div className="text-xs font-mono uppercase tracking-widest text-[#6B7280]">
            {currentTopic?.title}
          </div>
        </div>
        {currentTopic ? (
          <TopicContent
            topic={currentTopic}
            isCompleted={completedTopics.includes(currentTopic.id)}
            onToggleComplete={handleToggleComplete}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400 italic">No topic selected. Choose a topic from the sidebar.</p>
          </div>
        )}
      </main>

    </div>
  );
}

