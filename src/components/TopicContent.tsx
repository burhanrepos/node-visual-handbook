import React, { useState } from 'react';
import { Topic, SelfTestQuestion } from '../types';
import { Copy, Check, Info, Award, MessageCircle, HelpCircle, ToggleLeft, Link, Eye } from 'lucide-react';

// Import visualizers
import EventLoopSimulator from './EventLoopSimulator';
import BlockingSimulator from './BlockingSimulator';
import ThreadPoolSimulator from './ThreadPoolSimulator';
import MiddlewareSimulator from './MiddlewareSimulator';
import StreamsSimulator from './StreamsSimulator';
import ScalingSimulator from './ScalingSimulator';
import AuthSimulator from './AuthSimulator';
import DatabasePoolSimulator from './DatabasePoolSimulator';

interface TopicContentProps {
  topic: Topic;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

export default function TopicContent({ topic, isCompleted, onToggleComplete }: TopicContentProps) {
  const [copied, setCopied] = useState(false);
  const [openQuestions, setOpenQuestions] = useState<number[]>([]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(topic.codeExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleQuestion = (idx: number) => {
    setOpenQuestions(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const renderVisualizer = () => {
    switch (topic.visualizerType) {
      case 'event-loop':
        return <EventLoopSimulator />;
      case 'blocking':
        return <BlockingSimulator />;
      case 'thread-pool':
        return <ThreadPoolSimulator />;
      case 'middleware':
        return <MiddlewareSimulator />;
      case 'streams':
        return <StreamsSimulator />;
      case 'scaling':
        return <ScalingSimulator />;
      case 'auth':
        return <AuthSimulator />;
      case 'database':
        return <DatabasePoolSimulator />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-5xl mx-auto space-y-8 bg-[#0F1115] min-h-screen">
      
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[#2A2D35]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
              topic.level === 'beginner' 
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' 
                : (topic.level === 'intermediate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-violet-500/10 text-violet-400 border border-violet-500/30')
            }`}>
              {topic.level} level
            </span>
            {topic.visualizerType && (
              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-[#68A063]/10 text-[#68A063] border border-[#68A063]/30 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Interactive simulation
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-display">
            {topic.title}
          </h2>
          <p className="text-xs text-[#6B7280] font-mono uppercase tracking-widest mt-1">
            {topic.subtitle}
          </p>
        </div>

        {/* Mark as completed Toggle Button */}
        <button
          onClick={onToggleComplete}
          className={`px-3 py-1.5 rounded border font-mono text-xs transition duration-200 cursor-pointer ${
            isCompleted 
              ? 'bg-[#68A063]/10 text-[#68A063] border-[#68A063]/50 hover:bg-[#68A063]/20 shadow-[0_0_10px_rgba(104,160,99,0.15)]' 
              : 'bg-[#15171C] text-[#D1D5DB] border-[#2A2D35] hover:bg-[#1A1D23] hover:text-white'
          }`}
        >
          <div className={`h-2 w-2 rounded-full inline-block mr-2 ${isCompleted ? 'bg-[#68A063] shadow-[0_0_6px_#68A063]' : 'bg-[#4B5563]'}`} />
          {isCompleted ? 'MODULE COMPLETE' : 'MARK COMPLETED'}
        </button>
      </div>

      {/* Description Intro */}
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5">
        <p className="text-xs text-[#D1D5DB] leading-relaxed font-mono">
          <span className="text-[#68A063] font-bold mr-2">&gt;&gt; LOG_INTRO:</span>
          {topic.description}
        </p>
      </div>

      {/* Core Interactive visualizers (The main animations) */}
      {topic.visualizerType && (
        <section className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1 font-mono">
            <Eye className="h-4 w-4 text-[#68A063]" /> Interactive Mechanism Lab
          </div>
          {renderVisualizer()}
        </section>
      )}

      {/* Core bulleted list blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-4 font-mono">SYS_MECHANICS_AUDIT_CHECKLIST</h4>
          <ul className="space-y-3">
            {topic.keyPoints.map((point, idx) => (
              <li key={idx} className="text-xs text-[#9CA3AF] leading-relaxed flex items-start gap-2 border-b border-[#2A2D35] pb-2 last:border-b-0 last:pb-0 font-sans">
                <span className="text-[#68A063] font-bold font-mono mt-0.5">{String(idx + 1).padStart(2, '0')}.</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Frontend Connection note */}
        {topic.frontendConnection && (
          <div className="bg-[#111318] border border-[#2A2D35] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#3B82F6] mb-4 font-mono flex items-center gap-1.5">
                <Link className="h-4 w-4" /> FRONTEND_LIFE_MAPPING.sys
              </h4>
              <p className="text-xs text-[#D1D5DB] leading-relaxed font-medium">
                {topic.frontendConnection}
              </p>
            </div>
            <div className="text-[10px] text-blue-500/80 font-mono mt-4">
              Leverage DOM/browser loop instincts to mentally map low-level server state models.
            </div>
          </div>
        )}
      </div>

      {/* Code Example block */}
      <div className="border border-[#2A2D35] rounded-xl overflow-hidden bg-[#15171C] shadow-md">
        <div className="flex justify-between items-center bg-[#1C1F26] border-b border-[#2A2D35] px-4 py-2.5">
          <span className="text-[10px] font-bold font-mono text-[#6B7280] uppercase tracking-widest">MINIMAL_PRODUCTION_TS_SPEC</span>
          <button
            onClick={handleCopyCode}
            className="p-1 hover:bg-[#2A2D35] text-[#6B7280] hover:text-[#D1D5DB] rounded transition"
            title="Copy code"
          >
            {copied ? <Check className="h-4 w-4 text-[#68A063]" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <div className="p-4 overflow-x-auto bg-[#15171C]">
          <pre className="text-xs font-mono text-[#9CA3AF] leading-relaxed">
            <code>{topic.codeExample}</code>
          </pre>
        </div>
      </div>

      {/* Misconception and Interview Trap banner */}
      <div className="bg-[#15171C] border border-l-4 border-l-red-500 border-[#2A2D35] rounded-xl p-5 flex items-start gap-4">
        <div className="bg-red-500/10 p-2 rounded-lg text-red-400 shrink-0">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-[10px] font-bold font-mono text-red-400 uppercase tracking-widest mb-1">
            CRITICAL_INTERVIEW_TRAP_REPORT
          </h4>
          <p className="text-xs text-[#D1D5DB] leading-relaxed font-medium">
            {topic.misconception}
          </p>
        </div>
      </div>

      {/* Interview One-liner block */}
      <div className="bg-[#111318] border border-l-4 border-l-[#68A063] border-[#2A2D35] rounded-xl p-5 flex items-center gap-4 relative shadow-[0_0_15px_rgba(104,160,99,0.03)]">
        <div className="bg-[#68A063]/10 p-2 rounded-lg text-[#68A063] shrink-0">
          <Award className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <span className="text-[9px] font-bold font-mono text-[#6B7280] uppercase tracking-widest block mb-0.5">SENIOR_INTERVIEW_ONE_LINER</span>
          <blockquote className="text-xs font-semibold font-mono text-white italic leading-snug">
            "{topic.interviewOneLiner}"
          </blockquote>
        </div>
      </div>

      {/* Collapsible Self-Test Question list */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] font-mono flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-blue-400" /> SELF_TEST_MODULE_REVIEWS
        </h3>
        
        <div className="space-y-3">
          {topic.questions.map((q, idx) => {
            const isOpen = openQuestions.includes(idx);
            return (
              <div 
                key={idx} 
                className="border border-[#2A2D35] rounded-lg bg-[#15171C] overflow-hidden"
              >
                <button
                  onClick={() => toggleQuestion(idx)}
                  className="w-full flex items-center justify-between text-left p-4 hover:bg-[#1C1F26] transition cursor-pointer"
                >
                  <span className="text-xs font-bold text-white flex items-start gap-2.5 font-mono">
                    <span className="text-[#68A063] font-mono font-bold">Q{String(idx + 1).padStart(2, '0')}.</span>
                    <span>{q.question}</span>
                  </span>
                  <span className="text-[10px] text-[#68A063] font-bold font-mono pl-3 shrink-0">
                    {isOpen ? 'COLLAPSE' : 'REVEAL CORRECT ANSWER'}
                  </span>
                </button>

                {isOpen && (
                  <div className="p-4 bg-[#0F1115] border-t border-[#2A2D35] text-xs text-[#9CA3AF] leading-relaxed font-mono">
                    {q.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
