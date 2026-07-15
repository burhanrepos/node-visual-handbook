import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ArrowRight, RotateCcw, Cpu, Trash2, HelpCircle, Terminal } from 'lucide-react';

interface EventLoopTask {
  id: string;
  type: 'sync' | 'nextTick' | 'promise' | 'timeout' | 'fs' | 'immediate';
  name: string;
  status: 'queued' | 'active' | 'completed' | 'threadpool';
  timerMs?: number;
}

type PhaseId = 'idle' | 'timers' | 'poll' | 'check' | 'microtasks';

export default function EventLoopSimulator() {
  const [callStack, setCallStack] = useState<string | null>(null);
  const [nextTickQueue, setNextTickQueue] = useState<EventLoopTask[]>([]);
  const [promiseQueue, setPromiseQueue] = useState<EventLoopTask[]>([]);
  const [timersQueue, setTimersQueue] = useState<EventLoopTask[]>([]);
  const [pollQueue, setPollQueue] = useState<EventLoopTask[]>([]);
  const [checkQueue, setCheckQueue] = useState<EventLoopTask[]>([]);
  const [threadPool, setThreadPool] = useState<EventLoopTask[]>([]);

  const [activePhase, setActivePhase] = useState<PhaseId>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1000); // ms per tick
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const taskCounter = useRef(1);
  const logsRef = useRef<string[]>([]);

  const addConsoleLog = (msg: string) => {
    setConsoleLogs(prev => {
      const updated = [...prev, `> ${msg}`].slice(-8);
      logsRef.current = updated;
      return updated;
    });
  };

  const getNextId = () => {
    const id = `cb_${taskCounter.current++}`;
    return id;
  };

  const addTask = (type: 'sync' | 'nextTick' | 'promise' | 'timeout' | 'fs' | 'immediate') => {
    const id = getNextId();
    
    if (type === 'sync') {
      // Sync tasks go straight to the call stack if empty, otherwise we queue them in console logs
      addConsoleLog(`[Trigger] console.log('Sync ${id}')`);
      setCallStack(`console.log('Sync ${id}')`);
      setTimeout(() => {
        addConsoleLog(`[Execute] Synchronous output of ${id}`);
        setCallStack(null);
        // After synchronous, drain microtasks
        triggerStep();
      }, 600);
    } 
    else if (type === 'nextTick') {
      addConsoleLog(`[Queue] process.nextTick(${id})`);
      setNextTickQueue(prev => [...prev, { id, type, name: `nextTick(${id})`, status: 'queued' }]);
    } 
    else if (type === 'promise') {
      addConsoleLog(`[Queue] Promise.then(${id})`);
      setPromiseQueue(prev => [...prev, { id, type, name: `Promise.then(${id})`, status: 'queued' }]);
    } 
    else if (type === 'timeout') {
      addConsoleLog(`[Queue] setTimeout(${id}, 0)`);
      setTimersQueue(prev => [...prev, { id, type, name: `setTimeout(${id})`, status: 'queued' }]);
    } 
    else if (type === 'fs') {
      addConsoleLog(`[Offload] fs.readFile(${id}) -> Dispatched to libuv Thread Pool`);
      setThreadPool(prev => [...prev, { id, type, name: `fs.readFile(${id})`, status: 'threadpool' }]);
      
      // Threadpool task executes for 2 seconds, then moves to Poll Queue
      setTimeout(() => {
        setThreadPool(prev => prev.filter(t => t.id !== id));
        addConsoleLog(`[Callback] Disk Read Completed. Pushing ${id} callback to Poll phase Queue`);
        setPollQueue(prev => [...prev, { id, type, name: `fs_cb(${id})`, status: 'queued' }]);
      }, 2000);
    } 
    else if (type === 'immediate') {
      addConsoleLog(`[Queue] setImmediate(${id})`);
      setCheckQueue(prev => [...prev, { id, type, name: `setImmediate(${id})`, status: 'queued' }]);
    }
  };

  const resetAll = () => {
    setCallStack(null);
    setNextTickQueue([]);
    setPromiseQueue([]);
    setTimersQueue([]);
    setPollQueue([]);
    setCheckQueue([]);
    setThreadPool([]);
    setActivePhase('idle');
    setIsPlaying(false);
    setConsoleLogs([]);
    taskCounter.current = 1;
  };

  // The Event Loop Engine Core - Step transition
  const triggerStep = () => {
    // 1. If Call Stack is active, finish executing it first
    if (callStack) {
      return;
    }

    // 2. High priority: drain process.nextTick Queue before moving to other things
    if (nextTickQueue.length > 0) {
      setActivePhase('microtasks');
      const nextTask = nextTickQueue[0];
      setCallStack(`Executing: ${nextTask.name}`);
      setNextTickQueue(prev => prev.slice(1));

      setTimeout(() => {
        addConsoleLog(`[Execute] process.nextTick output for ${nextTask.id}`);
        setCallStack(null);
      }, 400);
      return;
    }

    // 3. Medium priority: drain Promises (microtasks) before moving to next loop phase
    if (promiseQueue.length > 0) {
      setActivePhase('microtasks');
      const nextTask = promiseQueue[0];
      setCallStack(`Executing: ${nextTask.name}`);
      setPromiseQueue(prev => prev.slice(1));

      setTimeout(() => {
        addConsoleLog(`[Execute] Promise.then output for ${nextTask.id}`);
        setCallStack(null);
      }, 400);
      return;
    }

    // 4. If we are idle, let's start the event loop loop phases
    if (activePhase === 'idle' || activePhase === 'microtasks') {
      setActivePhase('timers');
      return;
    }

    // --- Timers Phase ---
    if (activePhase === 'timers') {
      if (timersQueue.length > 0) {
        const nextTask = timersQueue[0];
        setCallStack(`Executing: ${nextTask.name}`);
        setTimersQueue(prev => prev.slice(1));

        setTimeout(() => {
          addConsoleLog(`[Execute] Timer expired: ${nextTask.id} executed`);
          setCallStack(null);
        }, 400);
      } else {
        // Move to Poll phase if timers are clean
        setActivePhase('poll');
      }
      return;
    }

    // --- Poll Phase (Disk / I/O) ---
    if (activePhase === 'poll') {
      if (pollQueue.length > 0) {
        const nextTask = pollQueue[0];
        setCallStack(`Executing: ${nextTask.name}`);
        setPollQueue(prev => prev.slice(1));

        setTimeout(() => {
          addConsoleLog(`[Execute] I/O callback ${nextTask.id} complete`);
          setCallStack(null);
        }, 400);
      } else {
        // Move to Check phase if clean
        setActivePhase('check');
      }
      return;
    }

    // --- Check Phase (setImmediate) ---
    if (activePhase === 'check') {
      if (checkQueue.length > 0) {
        const nextTask = checkQueue[0];
        setCallStack(`Executing: ${nextTask.name}`);
        setCheckQueue(prev => prev.slice(1));

        setTimeout(() => {
          addConsoleLog(`[Execute] setImmediate ${nextTask.id} fired`);
          setCallStack(null);
        }, 400);
      } else {
        // Wrap back around to idle/microtasks check
        setActivePhase('idle');
      }
      return;
    }
  };

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      triggerStep();
    }, playSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, activePhase, callStack, nextTickQueue, promiseQueue, timersQueue, pollQueue, checkQueue, playSpeed]);

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      
      {/* Handlers Configuration Panel */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Cpu className="text-[#68A063] h-4 w-4" /> EVENT_LOOP_ENGINE.playground
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Dispatch tasks dynamically to observe priority phases, tick buffers, and microtask queues.
          </p>
        </div>

        {/* Dispatch Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => addTask('sync')} className="px-2 py-1 bg-[#2A2D35] hover:bg-[#374151] text-white rounded text-[10px] font-bold font-mono transition cursor-pointer">
            + Sync log
          </button>
          <button onClick={() => addTask('nextTick')} className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-bold font-mono transition cursor-pointer">
            + process.nextTick()
          </button>
          <button onClick={() => addTask('promise')} className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-[10px] font-bold font-mono transition cursor-pointer">
            + Promise.then()
          </button>
          <button onClick={() => addTask('timeout')} className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold font-mono transition cursor-pointer">
            + setTimeout(0)
          </button>
          <button onClick={() => addTask('fs')} className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[10px] font-bold font-mono transition cursor-pointer">
            + fs.readFile()
          </button>
          <button onClick={() => addTask('immediate')} className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold font-mono transition cursor-pointer">
            + setImmediate()
          </button>
        </div>
      </div>

      {/* Simulator Playback controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-[#0F1115] p-3 rounded-lg border border-[#2A2D35]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold text-white transition flex items-center gap-1 cursor-pointer ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#68A063] hover:bg-[#5b8c56]'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? 'PAUSE_ENGINE' : 'START_ENGINE'}
          </button>
          
          <button
            onClick={triggerStep}
            disabled={isPlaying}
            className="px-3 py-1.5 border border-[#2A2D35] bg-[#15171C] hover:bg-[#1C1F26] text-white disabled:opacity-45 rounded text-xs font-mono transition cursor-pointer"
          >
            STEP_PHASE
          </button>

          <button
            onClick={resetAll}
            className="p-1.5 border border-[#2A2D35] bg-[#15171C] hover:bg-[#1C1F26] text-[#6B7280] hover:text-white rounded transition cursor-pointer"
            title="Clear all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Speed slider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#6B7280]">SPEED_TICKS:</span>
          <input 
            type="range" 
            min="400" 
            max="3000" 
            step="200"
            value={playSpeed} 
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="w-24 h-1 bg-[#2A2D35] rounded-lg appearance-none cursor-pointer accent-[#68A063]"
          />
          <span className="text-[10px] font-mono font-bold text-white">
            {(playSpeed / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Play board Loop */}
        <div className="lg:col-span-3 border border-[#2A2D35] rounded-lg bg-[#0F1115] p-4 relative min-h-[350px] flex flex-col justify-between">
          
          {/* Top segment: Call stack and Microtask buffers */}
          <div className="grid grid-cols-3 gap-4 border-b border-[#2A2D35] pb-4">
            
            {/* Call Stack */}
            <div className="border border-[#2A2D35] rounded p-2.5 bg-[#15171C]/50">
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-[#6B7280] block mb-2">V8 Call Stack</span>
              <div className="h-14 flex items-center justify-center border border-dashed border-[#2A2D35] rounded bg-[#0F1115]">
                {callStack ? (
                  <div className="text-[9px] font-mono font-bold text-center bg-[#68A063] text-white p-1.5 rounded shadow-[0_0_8px_#68A063] max-w-full truncate">
                    {callStack}
                  </div>
                ) : (
                  <span className="text-[8px] text-[#6B7280] font-mono italic">Empty Stack</span>
                )}
              </div>
            </div>

            {/* process.nextTick Queue */}
            <div className="border border-[#2A2D35] rounded p-2.5 bg-[#15171C]/50">
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-red-400 block mb-2">nextTick Queue</span>
              <div className="h-14 flex gap-1 items-center justify-start overflow-x-auto p-1 border border-dashed border-[#2A2D35] rounded bg-[#0F1115]">
                {nextTickQueue.length === 0 ? (
                  <span className="text-[8px] text-[#6B7280] font-mono italic mx-auto">Empty</span>
                ) : (
                  nextTickQueue.map(t => (
                    <div key={t.id} className="text-[8px] font-mono font-bold px-1 py-0.5 bg-red-950 text-red-400 rounded border border-red-900 shrink-0">
                      {t.id}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Promise queue */}
            <div className="border border-[#2A2D35] rounded p-2.5 bg-[#15171C]/50">
              <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-yellow-500 block mb-2">Promise Queue</span>
              <div className="h-14 flex gap-1 items-center justify-start overflow-x-auto p-1 border border-dashed border-[#2A2D35] rounded bg-[#0F1115]">
                {promiseQueue.length === 0 ? (
                  <span className="text-[8px] text-[#6B7280] font-mono italic mx-auto">Empty</span>
                ) : (
                  promiseQueue.map(t => (
                    <div key={t.id} className="text-[8px] font-mono font-bold px-1 py-0.5 bg-yellow-950 text-yellow-400 rounded border border-yellow-900 shrink-0">
                      {t.id}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Circular Event Loop Phase ring */}
          <div className="relative h-44 flex items-center justify-center my-4">
            
            {/* Phase Node 1: Timers */}
            <div className={`absolute top-0 w-24 p-2 border rounded-lg text-center transition-all ${
              activePhase === 'timers' ? 'border-[#68A063] bg-[#68A063]/10 ring-2 ring-[#68A063]/20 shadow-[0_0_12px_rgba(104,160,99,0.2)]' : 'border-[#2A2D35] bg-[#111318]'
            }`}>
              <span className="text-[9px] font-mono font-bold block text-white uppercase tracking-wider">1. Timers</span>
              <div className="flex gap-1 justify-center mt-1.5 overflow-x-auto min-h-[14px]">
                {timersQueue.slice(0, 2).map(t => <span key={t.id} className="text-[7.5px] font-mono bg-blue-950 text-blue-400 px-1 border border-blue-900/40 rounded">{t.id}</span>)}
                {timersQueue.length > 2 && <span className="text-[7px] text-blue-400 font-bold">+{timersQueue.length - 2}</span>}
              </div>
            </div>

            {/* Phase Node 2: Poll (Disk / Socket I/O) */}
            <div className={`absolute right-4 w-24 p-2 border rounded-lg text-center transition-all ${
              activePhase === 'poll' ? 'border-[#68A063] bg-[#68A063]/10 ring-2 ring-[#68A063]/20 shadow-[0_0_12px_rgba(104,160,99,0.2)]' : 'border-[#2A2D35] bg-[#111318]'
            }`}>
              <span className="text-[9px] font-mono font-bold block text-white uppercase tracking-wider">2. Poll (I/O)</span>
              <div className="flex gap-1 justify-center mt-1.5 overflow-x-auto min-h-[14px]">
                {pollQueue.slice(0, 2).map(t => <span key={t.id} className="text-[7.5px] font-mono bg-indigo-950 text-indigo-400 px-1 border border-indigo-900/40 rounded">{t.id}</span>)}
                {pollQueue.length > 2 && <span className="text-[7px] text-indigo-400 font-bold">+{pollQueue.length - 2}</span>}
              </div>
            </div>

            {/* Phase Node 3: Check (setImmediate) */}
            <div className={`absolute bottom-0 w-24 p-2 border rounded-lg text-center transition-all ${
              activePhase === 'check' ? 'border-[#68A063] bg-[#68A063]/10 ring-2 ring-[#68A063]/20 shadow-[0_0_12px_rgba(104,160,99,0.2)]' : 'border-[#2A2D35] bg-[#111318]'
            }`}>
              <span className="text-[9px] font-mono font-bold block text-white uppercase tracking-wider">3. Check</span>
              <div className="flex gap-1 justify-center mt-1.5 overflow-x-auto min-h-[14px]">
                {checkQueue.slice(0, 2).map(t => <span key={t.id} className="text-[7.5px] font-mono bg-emerald-950 text-emerald-400 px-1 border border-emerald-900/40 rounded">{t.id}</span>)}
                {checkQueue.length > 2 && <span className="text-[7px] text-emerald-400 font-bold">+{checkQueue.length - 2}</span>}
              </div>
            </div>

            {/* Libuv Threadpool (External Box) */}
            <div className="absolute left-4 w-28 p-2 border border-[#2A2D35] bg-[#111318] rounded-lg">
              <span className="text-[9px] font-mono font-bold block text-[#6B7280] uppercase tracking-wider mb-1">Threadpool (OS)</span>
              <div className="flex flex-col gap-1 min-h-[24px] justify-center">
                {threadPool.length === 0 ? (
                  <span className="text-[7.5px] text-[#6B7280] font-mono italic block text-center">Idle Workers</span>
                ) : (
                  threadPool.map(t => (
                    <div key={t.id} className="text-[7px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-900/50 px-1 py-0.5 rounded flex justify-between animate-pulse">
                      <span>{t.id}</span>
                      <span>Worker Thread</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rotating central ring graphic */}
            <div className="h-16 w-16 rounded-full border border-[#2A2D35] flex items-center justify-center">
              <span className="text-[9px] font-mono font-bold text-[#6B7280] uppercase tracking-wider">EVENT LOOP</span>
            </div>

          </div>

          {/* Microtask Warning notice */}
          <div className="border-t border-[#2A2D35] pt-3 flex justify-between text-[10px] text-[#6B7280] font-mono">
            <span>ACTIVE_PHASE: <strong className="text-[#68A063] uppercase">{activePhase}</strong></span>
            <span>Microtasks are checked on every step progression!</span>
          </div>

        </div>

        {/* Right Output Console log */}
        <div className="border border-[#2A2D35] rounded-lg p-4 bg-[#111318] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 border-b border-[#2A2D35] pb-3 mb-4">
              <Terminal className="h-4 w-4 text-[#68A063]" />
              <span className="text-xs font-bold font-mono text-white uppercase">Console Trace</span>
            </div>

            <div className="flex flex-col gap-1.5 font-mono text-[9.5px] text-[#9CA3AF] overflow-y-auto max-h-[220px]">
              {consoleLogs.length === 0 ? (
                <div className="text-[#6B7280] italic py-16 text-center font-mono">Awaiting execution ticks...</div>
              ) : (
                consoleLogs.map((log, index) => (
                  <div key={index} className="leading-snug">
                    <span className="text-[#68A063] mr-1">&gt;</span>
                    {log.replace(/^>\s*/, '')}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3">
            Traces loop callbacks aligning with V8's asynchronous scheduler mechanics.
          </div>
        </div>

      </div>

    </div>
  );
}
