import React from 'react';
import { Topic, TopicLevel } from '../types';
import { BookOpen, CheckCircle, ChevronRight, Moon, Sun, Award } from 'lucide-react';

interface SidebarProps {
  topics: Topic[];
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
  completedTopics: string[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  topics,
  selectedTopicId,
  onSelectTopic,
  completedTopics,
  theme,
  onToggleTheme,
  isOpen = true,
  onClose,
}: SidebarProps) {
  const levels: { id: TopicLevel; name: string; color: string }[] = [
    { id: 'beginner', name: '01. Beginner Core', color: 'text-[#6B7280]' },
    { id: 'intermediate', name: '02. Intermediate Web', color: 'text-[#6B7280]' },
    { id: 'advanced', name: '03. Advanced Systems', color: 'text-[#6B7280]' }
  ];

  const getProgressPercent = () => {
    if (topics.length === 0) return 0;
    return Math.round((completedTopics.length / topics.length) * 100);
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-80 bg-[#15171C] border-r border-[#2A2D35] flex flex-col justify-between h-screen shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] md:sticky md:top-0 md:static md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="md:hidden p-4 flex items-center justify-between border-b border-[#2A2D35]">
        <div className="flex items-center gap-2">
          <BookOpen className="text-[#68A063] h-5 w-5 shrink-0" />
          <h1 className="text-[#68A063] font-mono font-bold text-lg tracking-tighter">
            NODE_UNDER_HOOD.sys
          </h1>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-2 rounded-md bg-[#15171C] border border-[#2A2D35] text-sm text-[#D1D5DB] hover:bg-[#1A1D23] transition"
          aria-label="Close sidebar"
        >
          CLOSE
        </button>
      </div>

      {/* Brand & Progress Header */}
      <div className="p-6 border-b border-[#2A2D35] md:p-6">
        <div className="hidden md:flex items-center gap-2 mb-4">
          <BookOpen className="text-[#68A063] h-5 w-5 shrink-0" />
          <h1 className="text-[#68A063] font-mono font-bold text-lg tracking-tighter">
            NODE_UNDER_HOOD.sys
          </h1>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-[#6B7280] mb-1.5">
            <span>Progress Status</span>
            <span className="text-[#68A063] font-mono font-bold">{getProgressPercent()}%</span>
          </div>
          <div className="w-full bg-[#0F1115] h-1.5 rounded-full overflow-hidden border border-[#2A2D35]">
            <div 
              className="bg-[#68A063] h-full transition-all duration-300 shadow-[0_0_8px_#68A063]"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
          <span className="text-[9px] text-[#6B7280] mt-1.5 font-mono block">
            {completedTopics.length} / {topics.length} MODULES STABLE
          </span>
        </div>
      </div>

      {/* Nav List divided by levels */}
      <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {levels.map((level) => {
          const levelTopics = topics.filter((t) => t.level === level.id);
          
          return (
            <div key={level.id} className="flex flex-col gap-1.5">
              <h3 className={`text-[10px] font-mono font-bold uppercase tracking-widest ${level.color} px-3 mb-2`}>
                {level.name}
              </h3>
              
              <div className="flex flex-col gap-1">
                {levelTopics.map((topic) => {
                  const isSelected = topic.id === selectedTopicId;
                  const isCompleted = completedTopics.includes(topic.id);

                  return (
                    <button
                      key={topic.id}
                      onClick={() => onSelectTopic(topic.id)}
                      className={`w-full flex items-center justify-between text-left px-3 py-2 rounded text-xs font-mono transition-all group border ${
                        isSelected 
                          ? 'bg-[#1A1D23] text-white border-l-2 border-[#2A2D35] border-l-[#68A063] border-[#374151]' 
                          : 'text-[#9CA3AF] hover:text-white hover:bg-[#1A1D23]/40 border-transparent hover:border-[#2A2D35]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isCompleted ? (
                          <CheckCircle className="h-3.5 w-3.5 text-[#68A063] shrink-0" />
                        ) : (
                          <div className={`h-3 w-3 rounded-full border shrink-0 ${
                            isSelected ? 'bg-[#68A063]/30 border-[#68A063]' : 'border-[#4B5563]'
                          }`} />
                        )}
                        <span className="truncate">{topic.title.replace(/^\d+\.\s+/, '')}</span>
                      </div>
                      <ChevronRight className={`h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition ${
                        isSelected ? 'opacity-100 text-[#68A063]' : 'text-slate-500'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Footer & Theme Toggle */}
      <div className="p-4 border-t border-[#2A2D35] flex items-center justify-between bg-[#111318]">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#6B7280]">
          <Award className="h-3.5 w-3.5 text-[#68A063]" />
          <span>RUNTIME: STABLE</span>
        </div>
        
        <button
          onClick={onToggleTheme}
          className="p-1.5 hover:bg-[#1A1D23] text-[#6B7280] hover:text-white rounded border border-[#2A2D35] bg-[#0F1115] transition cursor-pointer"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

    </aside>
  );
}
