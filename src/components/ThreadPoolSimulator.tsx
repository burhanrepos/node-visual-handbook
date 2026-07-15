import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Cpu, CpuIcon, Database, ArrowRight, Activity } from 'lucide-react';

interface WorkerThread {
  id: number;
  status: 'idle' | 'working';
  activeTask: string | null;
  progress: number;
}

interface LibuvTask {
  id: string;
  type: 'crypto' | 'fs';
  label: string;
  status: 'queued' | 'threadpool' | 'callback_queued' | 'completed';
  assignedWorker?: number;
}

export default function ThreadPoolSimulator() {
  const [tasks, setTasks] = useState<LibuvTask[]>([]);
  const [workers, setWorkers] = useState<WorkerThread[]>([
    { id: 1, status: 'idle', activeTask: null, progress: 0 },
    { id: 2, status: 'idle', activeTask: null, progress: 0 },
    { id: 3, status: 'idle', activeTask: null, progress: 0 },
    { id: 4, status: 'idle', activeTask: null, progress: 0 },
  ]);
  const [mainThreadStatus, setMainThreadStatus] = useState<'idle' | 'polling'>('idle');
  const [completedCallbacks, setCompletedCallbacks] = useState<string[]>([]);

  // Task dispatcher ID reference
  const nextTaskId = React.useRef(1);

  const dispatchTask = (type: 'crypto' | 'fs') => {
    const id = `TASK-${nextTaskId.current++}`;
    const label = type === 'crypto' ? 'Bcrypt Hash (CPU)' : 'Read Large File (Disk)';
    
    const newTask: LibuvTask = {
      id,
      type,
      label,
      status: 'queued'
    };

    setTasks(prev => [...prev, newTask]);
    setMainThreadStatus('polling');
    setTimeout(() => setMainThreadStatus('idle'), 300);
  };

  // Libuv task distribution engine
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(currentTasks => {
        // Find the first queued task
        const nextQueuedIndex = currentTasks.findIndex(t => t.status === 'queued');
        if (nextQueuedIndex === -1) return currentTasks;

        const nextTask = currentTasks[nextQueuedIndex];

        // Find an idle worker
        let idleWorkerId = -1;
        setWorkers(currWorkers => {
          const idleWorker = currWorkers.find(w => w.status === 'idle');
          if (idleWorker) {
            idleWorkerId = idleWorker.id;
            return currWorkers.map(w => 
              w.id === idleWorker.id 
                ? { ...w, status: 'working', activeTask: nextTask.id, progress: 0 } 
                : w
            );
          }
          return currWorkers;
        });

        // If no worker is idle, task remains in queue
        if (idleWorkerId === -1) return currentTasks;

        // Assign task to worker
        return currentTasks.map((t, idx) => 
          idx === nextQueuedIndex 
            ? { ...t, status: 'threadpool', assignedWorker: idleWorkerId } 
            : t
        );
      });
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Worker progress tick
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setWorkers(currWorkers => {
        let workersToUpdate = [...currWorkers];
        let taskCompletedId: string | null = null;
        let workerIdCompleted = -1;

        workersToUpdate = workersToUpdate.map(worker => {
          if (worker.status === 'working') {
            const nextProgress = worker.progress + 20;
            if (nextProgress >= 100) {
              taskCompletedId = worker.activeTask;
              workerIdCompleted = worker.id;
              return { ...worker, status: 'idle', activeTask: null, progress: 0 };
            }
            return { ...worker, progress: nextProgress };
          }
          return worker;
        });

        // If a task was completed by a worker
        if (taskCompletedId && workerIdCompleted !== -1) {
          const finalTaskId = taskCompletedId;
          const finalWorkerId = workerIdCompleted;

          // Transition task status to callback_queued
          setTasks(currentTasks => 
            currentTasks.map(t => 
              t.id === finalTaskId 
                ? { ...t, status: 'callback_queued' } 
                : t
            )
          );

          // Simulate main event loop poll phase draining the callback
          setTimeout(() => {
            setMainThreadStatus('polling');
            setTasks(currentTasks => 
              currentTasks.map(t => 
                t.id === finalTaskId 
                  ? { ...t, status: 'completed' } 
                  : t
              )
            );
            setCompletedCallbacks(prev => [...prev, `${finalTaskId} cb()`].slice(-4));
            setTimeout(() => setMainThreadStatus('idle'), 600);
          }, 800);
        }

        return workersToUpdate;
      });
    }, 300);

    return () => clearInterval(progressInterval);
  }, []);

  const handleReset = () => {
    setTasks([]);
    setWorkers([
      { id: 1, status: 'idle', activeTask: null, progress: 0 },
      { id: 2, status: 'idle', activeTask: null, progress: 0 },
      { id: 3, status: 'idle', activeTask: null, progress: 0 },
      { id: 4, status: 'idle', activeTask: null, progress: 0 },
    ]);
    setCompletedCallbacks([]);
    setMainThreadStatus('idle');
  };

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Activity className="text-[#68A063] h-4 w-4" /> LIBUV_POOL_MANAGER.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Observe the offloading of crypto operations and filesystem IO streams onto worker threads.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => dispatchTask('fs')}
            className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Database className="h-3 w-3" /> DISPATCH_FS
          </button>
          <button
            onClick={() => dispatchTask('crypto')}
            className="px-2.5 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Cpu className="h-3 w-3" /> DISPATCH_CRYPTO
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 border border-[#2A2D35] bg-[#15171C] hover:bg-[#1C1F26] text-[#6B7280] hover:text-white rounded transition cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Event Loop (Producer/Consumer of Callbacks) */}
        <div className="border border-[#2A2D35] rounded-lg bg-[#0F1115] p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B7280] mb-3 flex items-center gap-1.5">
              <CpuIcon className="h-3.5 w-3.5 text-sky-400" /> V8 JS_EXEC_CORE
            </h5>
            <div className="flex items-center justify-between p-3 bg-[#111318] rounded-lg mb-4 border border-[#2A2D35]">
              <span className="text-[10px] font-mono text-[#6B7280]">V8_LOOP_STATE:</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                mainThreadStatus === 'polling' 
                  ? 'bg-[#68A063]/10 text-[#68A063] border-[#68A063]/30 animate-pulse' 
                  : 'bg-[#2A2D35]/30 text-[#6B7280] border-[#2A2D35]/50'
              }`}>
                {mainThreadStatus === 'polling' ? 'DRAINING_CALLBACKS' : 'WAITING_EVENTS'}
              </span>
            </div>

            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-2 font-mono">Drained Callbacks</span>
            <div className="flex flex-col gap-1 min-h-[120px] justify-start bg-[#111318]/50 p-2 rounded border border-dashed border-[#2A2D35]">
              {completedCallbacks.length === 0 ? (
                <span className="text-[9.5px] font-mono text-[#6B7280] italic text-center my-auto">Waiting callback logs...</span>
              ) : (
                completedCallbacks.map((cb, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px] bg-[#68A063]/10 text-[#68A063] px-2 py-1.5 rounded font-mono border border-[#68A063]/20">
                    <span>{cb}</span>
                    <span className="text-[9px] font-bold">✓ DISPATCHED</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono pt-3 border-t border-[#2A2D35] mt-2">
            Callbacks are scheduled on the main tick pipeline once Libuv workers yield the results.
          </div>
        </div>

        {/* Libuv Queue & Workers */}
        <div className="xl:col-span-2 border border-[#2A2D35] rounded-lg bg-[#0F1115] p-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B7280] mb-4 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[#68A063]" /> LIBUV_C_CORE_SUBPROCESSOR
            </h5>

            {/* Task Waiting Queue */}
            <div className="mb-6">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6B7280] block mb-2 font-mono">QUEUE_BACKLOG</span>
              <div className="flex gap-2 p-2 bg-[#111318] rounded border border-[#2A2D35] min-h-[48px] items-center overflow-x-auto">
                {tasks.filter(t => t.status === 'queued').length === 0 ? (
                  <span className="text-[9.5px] font-mono text-[#6B7280] italic mx-auto">No backlog queued</span>
                ) : (
                  tasks.filter(t => t.status === 'queued').map(task => (
                    <div 
                      key={task.id} 
                      className={`text-[9px] px-2 py-1 rounded font-mono font-bold whitespace-nowrap border flex items-center gap-1 ${
                        task.type === 'fs' 
                          ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50' 
                          : 'bg-violet-950/40 text-violet-400 border-violet-900/50'
                      }`}
                    >
                      {task.id}: {task.type === 'fs' ? 'DISK_IO' : 'CRYPT_WORK'}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Workers grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {workers.map((worker) => (
                <div 
                  key={worker.id} 
                  className={`border rounded-lg p-3 flex flex-col justify-between min-h-[110px] transition ${
                    worker.status === 'working' 
                      ? 'border-indigo-500/40 bg-indigo-950/10' 
                      : 'border-[#2A2D35] bg-[#111318]/50'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold font-mono text-[#6B7280]">WORKER_{worker.id}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        worker.status === 'working' ? 'bg-indigo-400 animate-pulse' : 'bg-[#2A2D35]'
                      }`} />
                    </div>
                    {worker.status === 'working' ? (
                      <div className="mt-1">
                        <span className="text-[9px] font-mono font-bold block text-indigo-300">{worker.activeTask}</span>
                        <span className="text-[8px] text-[#6B7280] block font-mono">EXECUTING_UV</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-[#6B7280] font-mono italic block mt-2">UV_SLEEP_IDLE</span>
                    )}
                  </div>

                  {worker.status === 'working' && (
                    <div className="w-full bg-[#2A2D35] h-1 rounded overflow-hidden mt-2">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300"
                        style={{ width: `${worker.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#2A2D35] pt-3 mt-4 flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
            <span>Pool Size: 4 Workers</span>
            <span className="text-right">UV_THREADPOOL_SIZE=4</span>
          </div>
        </div>

      </div>
    </div>
  );
}
