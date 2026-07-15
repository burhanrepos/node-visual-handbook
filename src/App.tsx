import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopicContent from './components/TopicContent';
import { topics } from './data/topics';

export default function App() {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topics[0]?.id || '');
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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
    <div className="flex h-screen bg-[#0F1115] text-[#D1D5DB] font-sans transition-colors duration-200">
      
      {/* Group Left Sidebar */}
      <Sidebar
        topics={topics}
        selectedTopicId={selectedTopicId}
        onSelectTopic={handleSelectTopic}
        completedTopics={completedTopics}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Learning Canvas Panel */}
      <main className="flex-1 overflow-y-auto">
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

