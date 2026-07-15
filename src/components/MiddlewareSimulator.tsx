import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, ArrowRight, Shield, ShieldX, Terminal, FileCode, CheckCircle, AlertTriangle } from 'lucide-react';

type MiddlewareNodeId = 'req' | 'logger' | 'parser' | 'auth' | 'controller' | 'errorHandler' | 'res';

interface MiddlewareNode {
  id: MiddlewareNodeId;
  name: string;
  type: 'io' | 'app' | 'auth' | 'route' | 'error';
  status: 'idle' | 'active' | 'passed' | 'failed' | 'skipped';
  log: string;
}

export default function MiddlewareSimulator() {
  const [nodes, setNodes] = useState<MiddlewareNode[]>([
    { id: 'req', name: 'Incoming Request', type: 'io', status: 'idle', log: 'GET /api/users/42' },
    { id: 'logger', name: 'Logger Middleware', type: 'app', status: 'idle', log: 'app.use((req, res, next) => { console.log(req.url); next(); })' },
    { id: 'parser', name: 'JSON Parser', type: 'app', status: 'idle', log: 'express.json() parses body stream' },
    { id: 'auth', name: 'Auth Guard', type: 'auth', status: 'idle', log: 'Checks req.headers.authorization' },
    { id: 'controller', name: 'User Controller', type: 'route', status: 'idle', log: 'Queries DB and returns profile object' },
    { id: 'errorHandler', name: 'Error Handler', type: 'error', status: 'idle', log: 'app.use((err, req, res, next) => { res.json({ error: err }) })' },
    { id: 'res', name: 'Response Sent', type: 'io', status: 'idle', log: 'HTTP/1.1 200 OK' }
  ]);

  const [scenario, setScenario] = useState<'success' | 'auth_fail' | 'not_found'>('success');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setScenario(e.target.value as any);
    resetSimulation();
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setTerminalLogs([]);
    setNodes(prev => prev.map(node => {
      // Default logs
      let log = '';
      if (node.id === 'req') log = 'GET /api/users/42';
      else if (node.id === 'logger') log = 'app.use((req, res, next) => { console.log(req.url); next(); })';
      else if (node.id === 'parser') log = 'express.json() parses body stream';
      else if (node.id === 'auth') log = 'Checks req.headers.authorization';
      else if (node.id === 'controller') log = 'Queries DB and returns profile object';
      else if (node.id === 'errorHandler') log = 'app.use((err, req, res, next) => { ... })';
      else if (node.id === 'res') log = 'HTTP/1.1 200 OK';

      return {
        ...node,
        status: 'idle',
        log
      };
    }));
  };

  const startSimulation = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setCurrentStep(1);
    setTerminalLogs(['🚀 Connection established. Reading TCP stream...']);
  };

  // Step sequence loop
  useEffect(() => {
    if (!isPlaying || currentStep === 0) return;

    const stepInterval = setTimeout(() => {
      setNodes(prevNodes => {
        const nextNodes = [...prevNodes];
        const stepIndex = currentStep - 1;
        const currentNode = nextNodes[stepIndex];

        if (!currentNode) return prevNodes;

        // Determine next steps based on scenario
        if (currentNode.id === 'req') {
          currentNode.status = 'passed';
          setTerminalLogs(prev => [...prev, `[Incoming] HTTP Request matching router trie`]);
          setCurrentStep(2);
        } 
        else if (currentNode.id === 'logger') {
          currentNode.status = 'passed';
          setTerminalLogs(prev => [...prev, `[Logger] Request printed: GET /api/users/42`]);
          setCurrentStep(3);
        } 
        else if (currentNode.id === 'parser') {
          currentNode.status = 'passed';
          setTerminalLogs(prev => [...prev, `[Parser] Body parsing parsed { size: 0 }`]);
          setCurrentStep(4);
        } 
        else if (currentNode.id === 'auth') {
          if (scenario === 'auth_fail') {
            currentNode.status = 'failed';
            setTerminalLogs(prev => [...prev, `[Auth] ❌ Invalid Token! Throwing Error('Unauthorized')`]);
            // Jump straight to Error Handler (index 5)
            nextNodes[4].status = 'skipped'; // Skip Controller
            setCurrentStep(6); // Error Handler index is 5, but step count is 6
          } else {
            currentNode.status = 'passed';
            setTerminalLogs(prev => [...prev, `[Auth] ✓ Token verified. Decoded user payload.`]);
            setCurrentStep(5);
          }
        } 
        else if (currentNode.id === 'controller') {
          if (scenario === 'not_found') {
            currentNode.status = 'failed';
            setTerminalLogs(prev => [...prev, `[Controller] User "42" not in DB. calling next(new AppError('Not Found', 404))`]);
            setCurrentStep(6); // Go to Error Handler
          } else {
            currentNode.status = 'passed';
            setTerminalLogs(prev => [...prev, `[Controller] Found user profile in cache. Preparing res.json(user)`]);
            nextNodes[5].status = 'skipped'; // Skip error handler
            setCurrentStep(7); // Go to response
          }
        } 
        else if (currentNode.id === 'errorHandler') {
          currentNode.status = 'passed';
          const errorMsg = scenario === 'auth_fail' ? 'Unauthorized' : 'Not Found';
          const errorStatus = scenario === 'auth_fail' ? 401 : 404;
          currentNode.log = `app.use((err, req, res, next) => { res.status(${errorStatus}).json({ error: "${errorMsg}" }) })`;
          setTerminalLogs(prev => [...prev, `[ErrorHandler] Captured error: "${errorMsg}". Setting status ${errorStatus} & returning JSON.`]);
          setCurrentStep(7);
        } 
        else if (currentNode.id === 'res') {
          currentNode.status = 'passed';
          const statusHeader = scenario === 'success' ? 'HTTP/1.1 200 OK' : (scenario === 'auth_fail' ? 'HTTP/1.1 401 Unauthorized' : 'HTTP/1.1 404 Not Found');
          currentNode.log = statusHeader;
          setTerminalLogs(prev => [...prev, `[Out] Connection terminated. Header sent: ${statusHeader}`]);
          setIsPlaying(false);
        }

        // Apply visual highlights
        nextNodes[stepIndex] = {
          ...currentNode,
          status: currentNode.status === 'idle' ? 'active' : currentNode.status
        };

        return nextNodes;
      });
    }, 1200);

    return () => clearTimeout(stepInterval);
  }, [isPlaying, currentStep, scenario]);

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <FileCode className="text-[#68A063] h-4 w-4" /> MIDDLEWARE_CHAIN_EXECUTION.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Choose a scenario, run a mock pipeline, and track error bubbling down the middleware callstack.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={scenario}
            onChange={handleScenarioChange}
            disabled={isPlaying}
            className="px-2.5 py-1.5 bg-[#111318] border border-[#2A2D35] text-xs text-white rounded font-mono outline-none focus:ring-1 focus:ring-[#68A063] cursor-pointer"
          >
            <option value="success">Success Route (200 OK)</option>
            <option value="auth_fail">Auth Failure (401 Error)</option>
            <option value="not_found">User Not Found (404 Error)</option>
          </select>
          <button
            onClick={startSimulation}
            disabled={isPlaying}
            className="px-3 py-1.5 bg-[#68A063] hover:bg-[#5b8c56] disabled:opacity-50 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Play className="h-3 w-3" /> SEND_REQUEST
          </button>
          <button
            onClick={resetSimulation}
            className="p-1.5 border border-[#2A2D35] bg-[#15171C] hover:bg-[#1C1F26] text-[#6B7280] hover:text-white rounded transition cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Visual Pipeline flow */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        
        {/* Middleware Nodes Pipeline */}
        <div className="flex-1 flex flex-col gap-4">
          {nodes.map((node, idx) => {
            let statusStyle = 'border-[#2A2D35] bg-[#111318] text-[#9CA3AF]';
            if (node.status === 'active') {
              statusStyle = 'border-[#68A063] bg-[#68A063]/10 text-white shadow-[0_0_12px_rgba(104,160,99,0.15)] ring-1 ring-[#68A063]/20 scale-[1.01]';
            } else if (node.status === 'passed') {
              statusStyle = 'border-[#2A2D35]/60 bg-[#111318]/40 text-[#9CA3AF]';
            } else if (node.status === 'failed') {
              statusStyle = 'border-rose-500/50 bg-rose-500/10 text-rose-400';
            } else if (node.status === 'skipped') {
              statusStyle = 'border-[#2A2D35]/30 bg-[#111318]/10 text-[#6B7280] border-dashed opacity-40';
            }

            return (
              <div key={node.id} className="flex items-center gap-3">
                
                {/* Visual Step Indicator Number */}
                <div className={`h-6 w-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  node.status === 'active' 
                    ? 'bg-[#68A063] text-white animate-bounce shadow-[0_0_8px_#68A063]' 
                    : (node.status === 'passed' ? 'bg-[#68A063]/15 text-[#68A063] border border-[#68A063]/30' : 'bg-[#111318] border border-[#2A2D35] text-[#6B7280]')
                }`}>
                  {idx + 1}
                </div>

                {/* Node Container Card */}
                <div className={`flex-1 border p-3 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-all duration-300 ${statusStyle}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">{node.name}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold border uppercase ${
                        node.type === 'io' 
                          ? 'bg-[#2A2D35] text-white border-[#4B5563]/30' 
                          : (node.type === 'error' ? 'bg-rose-950/40 text-rose-400 border-rose-900/40' : 'bg-[#68A063]/15 text-[#68A063] border-[#68A063]/20')
                      }`}>
                        {node.type}
                      </span>
                    </div>
                    <code className="text-[9px] font-mono text-[#6B7280] mt-1 block max-w-lg overflow-x-auto whitespace-nowrap">
                      {node.log}
                    </code>
                  </div>

                  <div className="text-xs font-mono">
                    {node.status === 'active' && <span className="text-[#68A063] font-bold animate-pulse">RUNNING_NODE...</span>}
                    {node.status === 'passed' && <span className="text-[#68A063] font-bold flex items-center gap-1"><CheckCircle className="h-3 w-3" /> next()</span>}
                    {node.status === 'failed' && <span className="text-rose-400 font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> throw err</span>}
                    {node.status === 'skipped' && <span className="text-[#6B7280] italic">skipped</span>}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Real-time Server Console logs */}
        <div className="w-full lg:w-80 border border-[#2A2D35] rounded-lg bg-[#111318] p-4 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex items-center gap-1.5 border-b border-[#2A2D35] pb-3 mb-4">
              <Terminal className="h-4 w-4 text-[#68A063]" />
              <span className="text-xs font-bold font-mono text-white uppercase">Express Runtime Log</span>
            </div>

            <div className="flex flex-col gap-2 font-mono text-[10px] text-[#9CA3AF] overflow-y-auto max-h-[260px] pr-1">
              {terminalLogs.length === 0 ? (
                <div className="text-[#6B7280] italic py-10 text-center font-mono">Awaiting incoming request...</div>
              ) : (
                terminalLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed border-l border-[#2A2D35] pl-2 font-mono text-[9.5px]">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono pt-3 border-t border-[#2A2D35]">
            Notice how throwing an error bypasses intermediate handlers and jumps straight to the 4-argument error middleware!
          </div>
        </div>

      </div>
    </div>
  );
}
