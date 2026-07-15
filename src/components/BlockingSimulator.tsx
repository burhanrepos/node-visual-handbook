import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Flame, Cpu, Users } from 'lucide-react';

interface RequestItem {
  id: string;
  type: 'async' | 'blocking';
  status: 'queued' | 'processing' | 'completed' | 'timeout';
  enqueuedAt: number;
  processedAt?: number;
  completedAt?: number;
  x: number; // visual animation coordinate
  y: number;
}

export default function BlockingSimulator() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [threadStatus, setThreadStatus] = useState<'idle' | 'busy' | 'blocked'>('idle');
  const [activeRequest, setActiveRequest] = useState<RequestItem | null>(null);
  const [systemMetrics, setSystemMetrics] = useState({
    processedCount: 0,
    averageLatency: 0,
    totalLatency: 0,
    activeClients: 0
  });

  const nextIdRef = useRef(1);
  const threadStateRef = useRef(threadStatus);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    threadStateRef.current = threadStatus;
  }, [threadStatus]);

  // Request spawning & flow simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Clean completed/timeout requests after some time
      setRequests((prev) => {
        const now = Date.now();
        return prev.filter(req => {
          if (req.status === 'completed' || req.status === 'timeout') {
            return now - (req.completedAt || 0) < 5000;
          }
          return true;
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update client count
  useEffect(() => {
    const active = requests.filter(r => r.status === 'queued' || r.status === 'processing').length;
    setSystemMetrics(prev => ({ ...prev, activeClients: active }));
  }, [requests]);

  const addRequest = (type: 'async' | 'blocking') => {
    const id = `REQ-${nextIdRef.current++}`;
    const newReq: RequestItem = {
      id,
      type,
      status: 'queued',
      enqueuedAt: Date.now(),
      x: 10,
      y: type === 'async' ? 30 : 70
    };

    setRequests((prev) => [...prev, newReq]);

    // Trigger processing tick
    processNextRequest();
  };

  const processNextRequest = () => {
    setRequests((prev) => {
      // Find the first queued request
      const nextQueued = prev.find(r => r.status === 'queued');
      if (!nextQueued) return prev;

      // If thread is blocked, we cannot process anything
      if (threadStateRef.current === 'blocked' || threadStateRef.current === 'busy') {
        return prev;
      }

      // Handle async vs blocking
      if (nextQueued.type === 'async') {
        // Start processing async
        setThreadStatus('busy');
        setActiveRequest(nextQueued);

        // Async is fast - takes 500ms (simulate OS offloading)
        setTimeout(() => {
          setRequests((curr) => 
            curr.map((r) => {
              if (r.id === nextQueued.id) {
                const now = Date.now();
                const latency = now - r.enqueuedAt;
                updateMetrics(latency);
                return { ...r, status: 'completed', processedAt: now, completedAt: now, x: 90 };
              }
              return r;
            })
          );
          setThreadStatus('idle');
          setActiveRequest(null);
          // Check if more are queued
          setTimeout(processNextRequest, 50);
        }, 500);

        return prev.map(r => r.id === nextQueued.id ? { ...r, status: 'processing', x: 50 } : r);
      } else {
        // CPU-blocking request! Will freeze main thread for 3 seconds
        setThreadStatus('blocked');
        setActiveRequest(nextQueued);

        // Run a blocking computation simulation
        const duration = 3000;
        const blockStart = Date.now();

        // We use a real timeout in the app to simulate visual block, 
        // but let's make it block visually while keeping React alive.
        // We will transition queued requests to high-latency state
        setTimeout(() => {
          setRequests((curr) => 
            curr.map((r) => {
              if (r.id === nextQueued.id) {
                const now = Date.now();
                const latency = now - r.enqueuedAt;
                updateMetrics(latency);
                return { ...r, status: 'completed', processedAt: now, completedAt: now, x: 90 };
              }
              return r;
            })
          );
          setThreadStatus('idle');
          setActiveRequest(null);

          // Once thread unblocks, process the backlog immediately
          setTimeout(() => {
            processNextRequest();
          }, 100);
        }, duration);

        return prev.map(r => r.id === nextQueued.id ? { ...r, status: 'processing', x: 50 } : r);
      }
    });
  };

  const updateMetrics = (latency: number) => {
    setSystemMetrics(prev => {
      const newTotal = prev.totalLatency + latency;
      const newCount = prev.processedCount + 1;
      return {
        processedCount: newCount,
        totalLatency: newTotal,
        averageLatency: Math.round(newTotal / newCount)
      };
    });
  };

  const handleReset = () => {
    setRequests([]);
    setThreadStatus('idle');
    setActiveRequest(null);
    setSystemMetrics({
      processedCount: 0,
      averageLatency: 0,
      totalLatency: 0,
      activeClients: 0
    });
  };

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Cpu className="text-[#68A063] h-4 w-4" /> THREAD_BLOCKING_AUDITOR.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Simulate asynchronous non-blocking delegates versus synchronous CPU-blocking operations.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => addRequest('async')}
            className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Users className="h-3 w-3" /> FIRE_ASYNC_REQ
          </button>
          <button
            onClick={() => addRequest('blocking')}
            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Flame className="h-3 w-3" /> FIRE_BLOCKING_REQ
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Visual Pipeline */}
        <div className="lg:col-span-3 border border-[#2A2D35] rounded-lg bg-[#0F1115] p-4 relative min-h-[220px] overflow-hidden flex flex-col justify-between">
          
          {/* Thread Status Banner */}
          <div className="flex justify-between items-center border-b border-[#2A2D35] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280]">V8 SINGLE_THREAD_ENGINE</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#6B7280]">THREAD_STATUS:</span>
              {threadStatus === 'idle' && (
                <span className="px-2.5 py-0.5 bg-[#68A063]/10 border border-[#68A063]/30 text-[#68A063] rounded text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#68A063] animate-pulse"></span> IDLE
                </span>
              )}
              {threadStatus === 'busy' && (
                <span className="px-2.5 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-spin"></span> I/O_DELEGATED
                </span>
              )}
              {threadStatus === 'blocked' && (
                <span className="px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="h-3 w-3 text-rose-400" /> BLOCKED
                </span>
              )}
            </div>
          </div>

          {/* Core Animation Area */}
          <div className="relative h-28 flex items-center my-2">
            
            {/* Horizontal tracks */}
            <div className="absolute left-0 right-0 h-[1px] bg-dashed border-t border-[#2A2D35] top-1/4"></div>
            <div className="absolute left-0 right-0 h-[1px] bg-dashed border-t border-[#2A2D35] top-3/4"></div>

            {/* Left Lane: Queue */}
            <div className="absolute left-0 w-24 h-full border-r border-[#2A2D35] flex flex-col justify-around py-1 pr-2 bg-[#15171C]/10 z-10">
              <span className="text-[9px] text-[#6B7280] font-mono font-medium text-right uppercase">IN_QUEUE</span>
              <div className="flex flex-col gap-1 items-end min-h-[40px] justify-center overflow-y-auto max-h-24">
                {requests.filter(r => r.status === 'queued').slice(0, 3).map((req) => (
                  <div
                    key={req.id}
                    className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-none border ${
                      req.type === 'async' ? 'bg-blue-950/40 text-blue-400 border-blue-900/50' : 'bg-rose-950/40 text-rose-400 border-rose-900/50'
                    }`}
                  >
                    {req.id}
                  </div>
                ))}
                {requests.filter(r => r.status === 'queued').length > 3 && (
                  <span className="text-[8px] text-rose-400 font-bold font-mono">
                    +{requests.filter(r => r.status === 'queued').length - 3} MORE
                  </span>
                )}
              </div>
            </div>

            {/* Center: Main Thread Core */}
            <div className="absolute left-1/2 -translate-x-1/2 w-32 h-20 rounded-xl border flex flex-col justify-center items-center p-2 transition-all duration-300 z-10 bg-[#15171C] border-[#2A2D35] shadow-inner">
              <span className="text-[10px] text-[#6B7280] font-bold font-mono tracking-wider uppercase mb-1">CALL_STACK</span>
              {activeRequest ? (
                <div className={`w-full py-1.5 rounded text-center text-[9px] font-bold font-mono shadow-sm animate-pulse border ${
                  activeRequest.type === 'async' ? 'bg-blue-950/40 text-blue-400 border-blue-500/30' : 'bg-rose-950 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                }`}>
                  {activeRequest.type === 'async' ? 'async_db_query()' : 'block_thread(3s)'}
                </div>
              ) : (
                <div className="text-[9px] text-[#6B7280] font-medium font-mono">Empty (Idle)</div>
              )}
            </div>

            {/* Right Lane: Completed */}
            <div className="absolute right-0 w-24 h-full border-l border-[#2A2D35] flex flex-col justify-around py-1 pl-2 bg-[#15171C]/10 z-10">
              <span className="text-[9px] text-[#6B7280] font-mono font-medium text-left uppercase">STABLE_DONE</span>
              <div className="flex flex-col gap-1 items-start justify-center min-h-[40px]">
                {requests.filter(r => r.status === 'completed').slice(-3).map((req) => {
                  const latency = (req.completedAt || 0) - req.enqueuedAt;
                  return (
                    <div
                      key={req.id}
                      className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-none border ${
                        req.type === 'async' ? 'bg-[#68A063]/10 text-[#68A063] border-[#68A063]/20' : 'bg-[#15171C] text-[#9CA3AF] border-[#2A2D35]'
                      }`}
                    >
                      {req.id} ({latency}ms)
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating Visual Spheres */}
            {requests.map((req) => {
              if (req.status === 'completed' || req.status === 'timeout') return null;
              
              // Map visual x/y coordinates
              let style: React.CSSProperties = { top: req.type === 'async' ? '25%' : '75%', left: '15%' };
              if (req.status === 'processing') {
                style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.1)' };
              }

              return (
                <div
                  key={req.id}
                  style={style}
                  className={`absolute h-3.5 w-3.5 rounded-full border border-[#0F1115] shadow-md transition-all duration-300 z-20 ${
                    req.type === 'async' ? 'bg-blue-500' : 'bg-rose-500'
                  }`}
                  title={`${req.id} (${req.type})`}
                />
              );
            })}
          </div>

          {/* Dynamic Warning Indicator */}
          <div className="border-t border-[#2A2D35] pt-3">
            {threadStatus === 'blocked' ? (
              <p className="text-[10px] text-rose-400 font-mono font-semibold flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 p-2 rounded">
                <AlertTriangle className="h-3.5 w-3.5 animate-bounce" />
                V8 ENGINE FROZEN: Incoming clients stuck. Queue latency accumulating.
              </p>
            ) : (
              <p className="text-[10px] text-[#68A063] font-mono font-semibold flex items-center gap-1.5 bg-[#68A063]/10 border border-[#68A063]/20 p-2 rounded">
                <ShieldCheck className="h-3.5 w-3.5" />
                THREAD STABLE: Non-blocking delegation operating correctly.
              </p>
            )}
          </div>
        </div>

        {/* System Metrics Panel */}
        <div className="border border-[#2A2D35] rounded-lg p-4 bg-[#111318] flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B7280] block mb-3">TELEMETRY_STATS</span>
          
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[9px] text-[#6B7280] uppercase font-mono block">Average Latency</span>
              <span className={`text-xl font-mono font-bold ${systemMetrics.averageLatency > 1000 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {systemMetrics.averageLatency} ms
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#6B7280] uppercase font-mono block">Requests Processed</span>
              <span className="text-xl font-mono font-bold text-white">
                {systemMetrics.processedCount}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-[#6B7280] uppercase font-mono block">Active Queue Backlog</span>
              <span className={`text-xl font-mono font-bold ${systemMetrics.activeClients > 0 && threadStatus === 'blocked' ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {systemMetrics.activeClients} clients
              </span>
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3 mt-3">
            Simulates a single-threaded execution context under compute-heavy blocking operations.
          </div>
        </div>

      </div>
    </div>
  );
}
