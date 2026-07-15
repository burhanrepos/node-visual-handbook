import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Cpu, Users, Layers, AlertCircle, CheckCircle } from 'lucide-react';

interface Request {
  id: string;
  status: 'pending' | 'completed' | 'timeout';
  workerId?: number;
  enqueuedAt: number;
  completedAt?: number;
}

interface Core {
  id: number;
  status: 'idle' | 'busy' | 'blocked';
  cpuUsage: number;
}

export default function ScalingSimulator() {
  const [isClustered, setIsClustered] = useState<boolean>(false);
  const [cores, setCores] = useState<Core[]>([
    { id: 1, status: 'idle', cpuUsage: 0 }
  ]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [metrics, setMetrics] = useState({
    successCount: 0,
    failCount: 0,
    avgLatency: 0,
    totalLatency: 0
  });

  const nextReqId = useRef(1);
  const isClusteredRef = useRef(isClustered);

  useEffect(() => {
    isClusteredRef.current = isClustered;
    // Reset state on mode change
    handleReset();
    if (isClustered) {
      setCores([
        { id: 1, status: 'idle', cpuUsage: 0 },
        { id: 2, status: 'idle', cpuUsage: 0 },
        { id: 3, status: 'idle', cpuUsage: 0 },
        { id: 4, status: 'idle', cpuUsage: 0 }
      ]);
    } else {
      setCores([
        { id: 1, status: 'idle', cpuUsage: 0 }
      ]);
    }
  }, [isClustered]);

  const sendRequest = () => {
    const id = `REQ-${nextReqId.current++}`;
    const newReq: Request = {
      id,
      status: 'pending',
      enqueuedAt: Date.now()
    };

    setRequests(prev => [...prev, newReq]);

    // Process request
    setTimeout(() => {
      processRequest(id);
    }, 100);
  };

  const triggerCPUBlock = () => {
    // Blocks Core 1 for 3 seconds
    setCores(prev => 
      prev.map(c => c.id === 1 ? { ...c, status: 'blocked', cpuUsage: 100 } : c)
    );

    setTimeout(() => {
      setCores(prev => 
        prev.map(c => c.id === 1 ? { ...c, status: 'idle', cpuUsage: 0 } : c)
      );
    }, 3000);
  };

  const processRequest = (reqId: string) => {
    setCores(currentCores => {
      // Find an available core
      const targetCore = currentCores.find(c => c.status === 'idle');

      if (!targetCore) {
        // If no core is idle, request is delayed or fails if blocked
        const hasBlockedCore = currentCores.some(c => c.status === 'blocked');
        
        if (hasBlockedCore && !isClusteredRef.current) {
          // In single core mode, if core is blocked, requests wait and eventually timeout
          setTimeout(() => {
            setRequests(prev => 
              prev.map(r => r.id === reqId && r.status === 'pending' ? { ...r, status: 'timeout', completedAt: Date.now() } : r)
            );
            setMetrics(m => ({ ...m, failCount: m.failCount + 1 }));
          }, 2000);
        } else {
          // If just temporarily busy, try again in 200ms
          setTimeout(() => {
            processRequest(reqId);
          }, 200);
        }
        return currentCores;
      }

      // Allocate request to target core
      setCores(prevCores => 
        prevCores.map(c => c.id === targetCore.id ? { ...c, status: 'busy', cpuUsage: 60 } : c)
      );

      setRequests(prev => 
        prev.map(r => r.id === reqId ? { ...r, status: 'completed', workerId: targetCore.id, completedAt: Date.now() } : r)
      );

      // Complete execution on core in 400ms
      setTimeout(() => {
        setCores(prevCores => 
          prevCores.map(c => c.id === targetCore.id && c.status === 'busy' ? { ...c, status: 'idle', cpuUsage: 0 } : c)
        );

        setRequests(prev => {
          const req = prev.find(r => r.id === reqId);
          if (req && req.status === 'completed') {
            const latency = (req.completedAt || 0) - req.enqueuedAt;
            setMetrics(m => {
              const count = m.successCount + 1;
              const tot = m.totalLatency + latency;
              return {
                ...m,
                successCount: count,
                totalLatency: tot,
                avgLatency: Math.round(tot / count)
              };
            });
          }
          return prev;
        });
      }, 400);

      return currentCores;
    });
  };

  const handleReset = () => {
    setRequests([]);
    setMetrics({
      successCount: 0,
      failCount: 0,
      avgLatency: 0,
      totalLatency: 0
    });
    setCores(isClustered ? [
      { id: 1, status: 'idle', cpuUsage: 0 },
      { id: 2, status: 'idle', cpuUsage: 0 },
      { id: 3, status: 'idle', cpuUsage: 0 },
      { id: 4, status: 'idle', cpuUsage: 0 }
    ] : [
      { id: 1, status: 'idle', cpuUsage: 0 }
    ]);
  };

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      
      {/* Settings control bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Layers className="text-[#68A063] h-4 w-4" /> CLUSTER_LOAD_BALANCER_SCALING.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Compare a single-threaded server to a multi-process cluster that shares incoming loads across multiple CPU cores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsClustered(false)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition cursor-pointer ${
              !isClustered 
                ? 'bg-[#68A063] text-white shadow-sm' 
                : 'border border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:text-white'
            }`}
          >
            SINGLE_THREAD
          </button>
          <button
            onClick={() => setIsClustered(true)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition cursor-pointer ${
              isClustered 
                ? 'bg-[#68A063] text-white shadow-sm' 
                : 'border border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:text-white'
            }`}
          >
            CLUSTER_MODE
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Playboard Area */}
        <div className="lg:col-span-3 border border-[#2A2D35] rounded-lg bg-[#111318] p-4 relative min-h-[250px] flex flex-col justify-between">
          
          <div className="flex justify-between items-center pb-2 border-b border-[#2A2D35] mb-4">
            <span className="text-[10px] font-mono font-bold uppercase text-[#6B7280]">
              {isClustered ? '🔄 ROUND-ROBIN LOAD BALANCER' : '⚠️ DIRECT TCP BINDING'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={sendRequest}
                className="px-2.5 py-1 bg-[#68A063] hover:bg-[#5b8c56] text-white rounded text-[10px] font-mono font-bold shadow-sm cursor-pointer"
              >
                + SEND_TRAFFIC
              </button>
              <button
                onClick={triggerCPUBlock}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-mono font-bold shadow-sm cursor-pointer"
              >
                🔥 BLOCK_EVENT_LOOP
              </button>
            </div>
          </div>

          {/* Visual of process cores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-auto py-2">
            {cores.map((core) => {
              let borderCol = 'border-[#2A2D35] bg-[#15171C] text-[#9CA3AF]';
              if (core.status === 'busy') borderCol = 'border-sky-500/50 bg-sky-500/5 text-white';
              if (core.status === 'blocked') borderCol = 'border-rose-500/50 bg-rose-500/5 text-white';

              return (
                <div 
                  key={core.id} 
                  className={`border rounded p-4 flex flex-col justify-between min-h-[120px] transition duration-300 ${borderCol}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-white">
                        Worker {core.id}
                      </span>
                      <span className="text-[9px] text-[#6B7280] block font-mono">
                        PID: {2300 + core.id}
                      </span>
                    </div>
                    <Cpu className={`h-4 w-4 ${
                      core.status === 'blocked' ? 'text-rose-500 animate-pulse' : (core.status === 'busy' ? 'text-sky-500' : 'text-[#6B7280]')
                    }`} />
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[9px] font-mono text-[#6B7280] mb-1">
                      <span>CPU usage</span>
                      <span>{core.cpuUsage}%</span>
                    </div>
                    <div className="w-full bg-[#111318] border border-[#2A2D35]/50 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${core.status === 'blocked' ? 'bg-rose-500' : 'bg-sky-500'}`}
                        style={{ width: `${core.cpuUsage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* In single core, display empty filler nodes representing idle unused processor cores */}
            {!isClustered && [2, 3, 4].map(idx => (
              <div 
                key={idx} 
                className="border border-[#2A2D35]/30 rounded p-4 flex flex-col justify-center items-center min-h-[120px] bg-[#15171C]/20 opacity-30 border-dashed"
              >
                <span className="text-[10px] text-[#6B7280] font-mono">Core {idx} Unused</span>
                <span className="text-[8px] text-[#6B7280]/80 font-mono uppercase mt-1">Single Thread Mode</span>
              </div>
            ))}
          </div>

          {/* Pending / Stuck queue feedback */}
          <div className="border-t border-[#2A2D35] pt-3 flex gap-2 overflow-x-auto min-h-[36px] items-center">
            <span className="text-[9px] text-[#6B7280] font-mono font-bold uppercase tracking-wider">Queue:</span>
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <span className="text-[10px] text-[#6B7280] italic font-mono">Backlog Empty</span>
            ) : (
              requests.filter(r => r.status === 'pending').map(r => (
                <div key={r.id} className="text-[8px] font-mono px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded animate-pulse">
                  {r.id}
                </div>
              ))
            )}
          </div>

        </div>

        {/* Live scaling metrics */}
        <div className="border border-[#2A2D35] rounded-lg p-4 bg-[#111318] flex flex-col justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6B7280] block mb-3">Scaling Audit</span>
          
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Average Latency</span>
              <span className={`text-xl font-mono font-bold ${metrics.avgLatency > 500 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {metrics.avgLatency} ms
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Successful Handshakes</span>
              <span className="text-xl font-mono font-bold text-[#68A063] flex items-center gap-1 mt-0.5">
                <CheckCircle className="h-4 w-4 text-[#68A063]" /> {metrics.successCount}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Dropped (504 Timeout)</span>
              <span className={`text-xl font-mono font-bold flex items-center gap-1 mt-0.5 ${metrics.failCount > 0 ? 'text-rose-400' : 'text-[#6B7280]'}`}>
                <AlertCircle className="h-4 w-4" /> {metrics.failCount}
              </span>
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3 mt-3">
            In Cluster mode, the master core forks worker processes, dividing network loops.
          </div>
        </div>

      </div>

    </div>
  );
}
