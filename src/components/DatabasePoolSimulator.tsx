import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, Link2, Database, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

interface ConnectionSlot {
  id: number;
  status: 'idle' | 'active';
  queryId: string | null;
}

interface DBQuery {
  id: string;
  status: 'queued' | 'handshake' | 'executing' | 'completed';
  enqueuedAt: number;
  completedAt?: number;
  type: 'standard' | 'n_plus_one';
}

export default function DatabasePoolSimulator() {
  const [mode, setMode] = useState<'pooling' | 'no_pooling'>('pooling');
  const [nPlusOneSelected, setNPlusOneSelected] = useState<boolean>(false);
  const [connections, setConnections] = useState<ConnectionSlot[]>([
    { id: 1, status: 'idle', queryId: null },
    { id: 2, status: 'idle', queryId: null },
    { id: 3, status: 'idle', queryId: null },
  ]);
  const [queries, setQueries] = useState<DBQuery[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [avgQueryLatency, setAvgQueryLatency] = useState(0);

  const queryCounter = useRef(1);
  const logsRef = useRef<string[]>([]);

  const addLog = (msg: string) => {
    setConsoleLogs(prev => {
      const updated = [...prev, `[DB-AUDIT] ${msg}`].slice(-8);
      logsRef.current = updated;
      return updated;
    });
  };

  const handleModeChange = (selectedMode: 'pooling' | 'no_pooling') => {
    setMode(selectedMode);
    resetSimulation();
  };

  const resetSimulation = () => {
    setQueries([]);
    setConnections([
      { id: 1, status: 'idle', queryId: null },
      { id: 2, status: 'idle', queryId: null },
      { id: 3, status: 'idle', queryId: null },
    ]);
    setConsoleLogs([]);
    setAvgQueryLatency(0);
    queryCounter.current = 1;
  };

  const runNPlusOneDemo = (type: 'join' | 'nplusone') => {
    resetSimulation();
    addLog(`Running query pattern demo: ${type.toUpperCase()}`);

    if (type === 'join') {
      // 1 single query
      const id = `Q-JOIN-${queryCounter.current++}`;
      const newQuery: DBQuery = {
        id,
        status: 'queued',
        enqueuedAt: Date.now(),
        type: 'standard'
      };
      setQueries([newQuery]);
      addLog(`[JOIN] dispatching single query: SELECT * FROM articles INNER JOIN users...`);
      executeDemoQuery(id, 300); // Fast
    } else {
      // N+1 queries. 1 main query, plus 5 child queries
      addLog(`[N+1] Dispatching parent query...`);
      const parentId = `Q-PARENT`;
      const parentQuery: DBQuery = {
        id: parentId,
        status: 'queued',
        enqueuedAt: Date.now(),
        type: 'n_plus_one'
      };

      setQueries([parentQuery]);
      executeDemoQuery(parentId, 300, () => {
        // Once parent completes, spawn 5 child queries sequentially or concurrently
        addLog(`[N+1] Parent loaded! Spawning 5 sequential subqueries for author names...`);
        
        let delay = 100;
        for (let i = 1; i <= 5; i++) {
          const childId = `Q-CHILD-${i}`;
          setTimeout(() => {
            const childQuery: DBQuery = {
              id: childId,
              status: 'queued',
              enqueuedAt: Date.now(),
              type: 'n_plus_one'
            };
            setQueries(prev => [...prev, childQuery]);
            addLog(`[N+1 Loop] Query ${i}/5: SELECT * FROM users WHERE id = ?`);
            executeDemoQuery(childId, 350);
          }, delay);
          delay += 400; // sequential
        }
      });
    }
  };

  const executeDemoQuery = (queryId: string, duration: number, callback?: () => void) => {
    setQueries(prev => prev.map(q => q.id === queryId ? { ...q, status: 'executing' } : q));

    setTimeout(() => {
      setQueries(prev => prev.map(q => q.id === queryId ? { ...q, status: 'completed', completedAt: Date.now() } : q));
      if (callback) callback();
    }, duration);
  };

  const triggerQuery = () => {
    const id = `Q-${queryCounter.current++}`;
    const newQuery: DBQuery = {
      id,
      status: 'queued',
      enqueuedAt: Date.now(),
      type: 'standard'
    };

    setQueries(prev => [...prev, newQuery]);
    addLog(`Incoming database query request: ${id}`);

    if (mode === 'no_pooling') {
      // No pooling: Handshake penalty first!
      addLog(`${id} requires raw TCP Handshake (No Connection Pool)`);
      setQueries(prev => prev.map(q => q.id === id ? { ...q, status: 'handshake' } : q));

      setTimeout(() => {
        addLog(`${id} Handshake completed. Spawning dynamic container socket...`);
        allocateSocket(id, 500); // Process query after handshake
      }, 800); // 800ms handshake overhead!
    } else {
      // Connection pooling: Rent from pool immediately!
      allocateSocket(id, 400);
    }
  };

  const allocateSocket = (queryId: string, duration: number) => {
    setConnections(currentPool => {
      const idleConn = currentPool.find(c => c.status === 'idle');

      if (!idleConn) {
        addLog(`⚠️ Pool fully occupied! Queuing query ${queryId} inside lease manager...`);
        return currentPool;
      }

      setQueries(prev => prev.map(q => q.id === queryId ? { ...q, status: 'executing' } : q));
      
      // Update Slot
      setTimeout(() => {
        // Finish query execution and release slot
        setConnections(releasePool => 
          releasePool.map(c => c.id === idleConn.id ? { ...c, status: 'idle', queryId: null } : c)
        );

        setQueries(prev => {
          const finished = prev.map(q => q.id === queryId ? { ...q, status: 'completed', completedAt: Date.now() } : q);
          // Recalculate latency averages
          const list = finished.filter(q => q.status === 'completed');
          if (list.length > 0) {
            const sum = list.reduce((acc, curr) => acc + ((curr.completedAt || 0) - curr.enqueuedAt), 0);
            setAvgQueryLatency(Math.round(sum / list.length));
          }
          return finished;
        });

        addLog(`Query ${queryId} completed. Database socket connection released.`);

        // Pick up next queued query
        setTimeout(() => {
          setQueries(currQueries => {
            const nextInLine = currQueries.find(q => q.status === 'queued');
            if (nextInLine) {
              allocateSocket(nextInLine.id, duration);
            }
            return currQueries;
          });
        }, 50);

      }, duration);

      return currentPool.map(c => c.id === idleConn.id ? { ...c, status: 'active', queryId } : c);
    });
  };

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      
      {/* Visual Configuration Toggles */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Database className="text-[#68A063] h-4 w-4" /> DATABASE_POOLING_AND_QUERY_OPTIMIZATION.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Compare Connection Pooling mechanics to raw sockets, or run an N+1 loop audit simulation.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleModeChange('pooling')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition cursor-pointer ${
              mode === 'pooling' && !nPlusOneSelected 
                ? 'bg-[#68A063] text-white shadow-sm' 
                : 'border border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:text-white'
            }`}
          >
            CONNECTION_POOLING
          </button>
          <button
            onClick={() => handleModeChange('no_pooling')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition cursor-pointer ${
              mode === 'no_pooling' && !nPlusOneSelected 
                ? 'bg-[#68A063] text-white shadow-sm' 
                : 'border border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:text-white'
            }`}
          >
            RAW_TCP_SOCKETS
          </button>
          
          <div className="h-5 w-[1px] bg-[#2A2D35] mx-1"></div>

          <button
            onClick={() => runNPlusOneDemo('join')}
            className="px-2.5 py-1.5 border border-[#2A2D35] bg-[#111318] hover:bg-[#1C1F26] text-[#9CA3AF] hover:text-white rounded text-xs font-mono font-semibold transition cursor-pointer"
          >
            DEMO: OPTIMIZED JOIN
          </button>
          <button
            onClick={() => runNPlusOneDemo('nplusone')}
            className="px-2.5 py-1.5 border border-[#2A2D35] bg-[#111318] hover:bg-[#1C1F26] text-rose-400 hover:text-rose-300 rounded text-xs font-mono font-semibold transition cursor-pointer"
          >
            DEMO: N+1 BOTTLENECK
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left/Middle: Database slots */}
        <div className="lg:col-span-2 border border-[#2A2D35] rounded-lg bg-[#111318] p-4 min-h-[250px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-mono font-bold uppercase text-[#6B7280]">Database Server Pool</span>
              <button
                onClick={triggerQuery}
                disabled={queries.some(q => q.status === 'handshake' || q.status === 'executing')}
                className="px-3 py-1 bg-[#68A063] hover:bg-[#5b8c56] disabled:opacity-50 text-white rounded text-[10px] font-mono font-semibold shadow-sm cursor-pointer"
              >
                + DISPATCH_QUERY
              </button>
            </div>

            {/* Connection Slots */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {connections.map((slot) => (
                <div 
                  key={slot.id} 
                  className={`border rounded p-3 text-center min-h-[90px] flex flex-col justify-between transition ${
                    slot.status === 'active' 
                      ? 'border-[#68A063] bg-[#68A063]/10' 
                      : 'border-[#2A2D35] bg-[#15171C] border-dashed'
                  }`}
                >
                  <span className="text-[10px] font-mono font-semibold text-[#6B7280]">Socket #{slot.id}</span>
                  {slot.status === 'active' ? (
                    <div className="my-1 animate-pulse">
                      <Link2 className="h-4 w-4 mx-auto text-[#68A063]" />
                      <span className="text-[9px] font-mono font-bold text-white block mt-1">{slot.queryId}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-[#6B7280] italic block my-auto font-mono">Idle (Pre-warmed)</span>
                  )}
                  <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-[#6B7280]">{mode === 'pooling' ? 'Pooled' : 'Raw TCP'}</span>
                </div>
              ))}
            </div>

            {/* Running Queries Pipeline */}
            <span className="text-[10px] font-bold font-mono text-[#6B7280] uppercase tracking-wider block mb-2">Request Execution</span>
            <div className="flex gap-2 p-2 bg-[#15171C] rounded border border-[#2A2D35] min-h-[48px] items-center overflow-x-auto">
              {queries.filter(q => q.status !== 'completed').length === 0 ? (
                <span className="text-[10px] text-[#6B7280] italic mx-auto font-mono">No pending database requests</span>
              ) : (
                queries.filter(q => q.status !== 'completed').map(q => {
                  let badge = 'bg-[#15171C] border-[#2A2D35] text-[#9CA3AF]';
                  if (q.status === 'handshake') badge = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse';
                  if (q.status === 'executing') badge = 'bg-[#68A063]/10 border-[#68A063]/20 text-[#68A063] animate-pulse';

                  return (
                    <div key={q.id} className={`text-[8.5px] px-2 py-1 rounded font-mono border font-semibold whitespace-nowrap ${badge}`}>
                      {q.id}: {q.status.toUpperCase()}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-[10px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3 mt-4">
            {mode === 'no_pooling' ? (
              <span className="text-yellow-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5 text-yellow-400" /> Raw connection socket takes ~800ms TCP handshaking on each call!</span>
            ) : (
              <span className="text-[#68A063] flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#68A063]" /> Pre-warmed pooling leases active connections instantly.</span>
            )}
          </div>
        </div>

        {/* Right Audit/Latency logs */}
        <div className="border border-[#2A2D35] rounded-lg p-4 bg-[#111318] flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6B7280] block mb-3">Database Auditing</span>
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Avg Socket Turnaround</span>
                <span className="text-xl font-mono font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-4 w-4 text-[#68A063]" /> {avgQueryLatency} ms
                </span>
              </div>
            </div>

            <span className="text-[10px] font-bold font-mono text-[#6B7280] uppercase block mb-2 border-t border-[#2A2D35] pt-3 mt-3">Live Query Logs</span>
            <div className="flex flex-col gap-1 font-mono text-[9px] text-[#9CA3AF] max-h-[140px] overflow-y-auto">
              {consoleLogs.length === 0 ? (
                <span className="text-[#6B7280] italic">No query traffic audited.</span>
              ) : (
                consoleLogs.map((log, idx) => <div key={idx} className="leading-snug">{log}</div>)
              )}
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3 mt-3">
            Pooling blocks TCP handshake costs. optimized JOIN queries block N+1 network iteration congestion.
          </div>
        </div>

      </div>

    </div>
  );
}
