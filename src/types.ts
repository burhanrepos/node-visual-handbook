export type TopicLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SelfTestQuestion {
  question: string;
  answer: string;
}

export interface Topic {
  id: string;
  title: string;
  level: TopicLevel;
  subtitle: string;
  description: string;
  keyPoints: string[];
  codeExample: string;
  misconception: string;
  interviewOneLiner: string;
  questions: SelfTestQuestion[];
  frontendConnection?: string;
  visualizerType?: 'event-loop' | 'blocking' | 'thread-pool' | 'middleware' | 'streams' | 'scaling' | 'auth' | 'database';
}

// Event Loop Simulation Types
export type TaskType = 
  | 'sync' 
  | 'setTimeout_0' 
  | 'setTimeout_100' 
  | 'promise' 
  | 'nextTick' 
  | 'fs_readFile' 
  | 'setImmediate';

export interface SimulatorTask {
  id: string;
  type: TaskType;
  label: string;
  status: 'queued' | 'running' | 'completed' | 'threadpool' | 'polling';
  delayRemaining?: number; // for timer simulation
}

export type EventLoopPhase = 
  | 'idle'
  | 'timers' 
  | 'pending' 
  | 'poll' 
  | 'check' 
  | 'close';
