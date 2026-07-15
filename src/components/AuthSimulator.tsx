import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Shield, Database, Cpu, CheckCircle, HelpCircle } from 'lucide-react';

export default function AuthSimulator() {
  const [authType, setAuthType] = useState<'session' | 'jwt'>('session');
  const [step, setStep] = useState<number>(0); // 0: idle, 1: login, 2: verify/store, 3: resource query, 4: verify resource, 5: authorized
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStepDescription, setActiveStepDescription] = useState<string>('');
  const [diagramLogs, setDiagramLogs] = useState<string[]>([]);

  const handleAuthChange = (type: 'session' | 'jwt') => {
    setAuthType(type);
    resetSimulation();
  };

  const resetSimulation = () => {
    setStep(0);
    setIsPlaying(false);
    setActiveStepDescription('');
    setDiagramLogs([]);
  };

  const startSimulation = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setStep(1);
    setDiagramLogs(['🔑 [Client] Clicked Login. Streaming Username and Password in POST body...']);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setStep(prevStep => {
        const nextStep = prevStep + 1;

        if (nextStep === 2) {
          if (authType === 'session') {
            setDiagramLogs(prev => [
              ...prev,
              '🖥️ [Server] Verified password.',
              '🗄️ [Redis Session DB] Spawning session object: { id: "sess_89a7f", user: "John", roles: ["admin"] }',
              '🍪 [Headers] Sending response with Set-Cookie: connect.sid=sess_89a7f; HttpOnly'
            ]);
          } else {
            setDiagramLogs(prev => [
              ...prev,
              '🖥️ [Server] Verified password.',
              '🔑 [Crypto CPU] Signing payload { id: 42, user: "John", roles: ["admin"] } using process.env.JWT_SECRET',
              '📥 [Body] Returning JSON response: { token: "eyJhbGciOiJIUzI1Ni..." }'
            ]);
          }
        } 
        else if (nextStep === 3) {
          if (authType === 'session') {
            setDiagramLogs(prev => [
              ...prev,
              '🔒 [Client] Saved session cookie in browser store (inaccessible to JS due to HttpOnly).',
              '🚀 [Client] Sending request to GET /api/dashboard with Cookie headers.'
            ]);
          } else {
            setDiagramLogs(prev => [
              ...prev,
              '🔒 [Client] Saved JWT in LocalStorage.',
              '🚀 [Client] Sending request to GET /api/dashboard with headers: Authorization: Bearer <token>'
            ]);
          }
        } 
        else if (nextStep === 4) {
          if (authType === 'session') {
            setDiagramLogs(prev => [
              ...prev,
              '🖥️ [Server] Read cookie connect.sid = "sess_89a7f"',
              '🗄️ [Redis Session DB] Performing query lookup to fetch session record...',
              '✓ [Redis] Session found. Hydrating req.user = John.'
            ]);
          } else {
            setDiagramLogs(prev => [
              ...prev,
              '🖥️ [Server] Read Authorization: Bearer Header.',
              '🔑 [Crypto CPU] Decoded and verified signature in-memory using process.env.JWT_SECRET.',
              '✓ [Crypto] Signature matches. Hydrating req.user = John directly from decrypted token payload (No DB lookup!).'
            ]);
          }
        } 
        else if (nextStep === 5) {
          setDiagramLogs(prev => [
            ...prev,
            '🎉 [Server] Authorization successful! Sending response status 200 OK with dashboard statistics.',
            '✓ Flow complete!'
          ]);
          setIsPlaying(false);
        }

        return nextStep;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [isPlaying, step, authType]);

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      
      {/* Simulation Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Shield className="text-[#68A063] h-4 w-4" /> AUTHENTICATION_ARCHITECTURE_SESSION_VS_JWT.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Observe how the client stores secrets, how the server checks credentials, and if a database lookup is required on subsequent queries.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAuthChange('session')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition cursor-pointer ${
              authType === 'session' 
                ? 'bg-[#68A063] text-white shadow-sm' 
                : 'border border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:text-white'
            }`}
          >
            STATEFUL_SESSIONS
          </button>
          <button
            onClick={() => handleAuthChange('jwt')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition cursor-pointer ${
              authType === 'jwt' 
                ? 'bg-[#68A063] text-white shadow-sm' 
                : 'border border-[#2A2D35] bg-[#111318] text-[#9CA3AF] hover:text-white'
            }`}
          >
            STATELESS_JWT
          </button>
          
          <button
            onClick={startSimulation}
            disabled={isPlaying}
            className="px-3 py-1.5 bg-[#68A063] hover:bg-[#5b8c56] disabled:opacity-50 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Play className="h-3 w-3" /> TRIGGER_FLOW
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

      {/* Visual Board diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step-by-Step Flow diagram */}
        <div className="lg:col-span-2 border border-[#2A2D35] rounded-lg bg-[#111318] p-4 min-h-[300px] flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-mono font-bold uppercase text-[#6B7280]">Sequence Diagram</span>
            <span className="text-[10px] font-bold text-[#68A063] font-mono">
              ACTIVE_STEP: {step === 0 ? 'IDLE' : `STAGE ${step}/5`}
            </span>
          </div>

          {/* Graphical Nodes */}
          <div className="flex justify-around items-center h-40 relative">
            
            {/* Pipeline lines */}
            <div className="absolute left-1/4 right-1/4 h-0.5 border-t border-dashed border-[#2A2D35]"></div>

            {/* Client Node */}
            <div className={`w-24 p-3 border rounded text-center z-10 transition-all ${
              step === 1 || step === 3 ? 'border-[#68A063] bg-[#68A063]/10 ring-2 ring-[#68A063]/20' : 'border-[#2A2D35] bg-[#15171C]'
            }`}>
              <span className="text-xs font-mono font-bold block text-white">CLIENT</span>
              <span className="text-[8px] font-mono text-[#6B7280] block mt-1">Browser / Store</span>
              <span className="text-[9px] font-bold text-[#68A063] font-mono block mt-1 uppercase">
                {step === 1 ? 'Login POST' : (step === 3 ? 'Get Resource' : '')}
              </span>
            </div>

            {/* Server Node */}
            <div className={`w-28 p-3 border rounded text-center z-10 transition-all ${
              step === 2 || step === 4 ? 'border-[#68A063] bg-[#68A063]/10 ring-2 ring-[#68A063]/20' : 'border-[#2A2D35] bg-[#15171C]'
            }`}>
              <span className="text-xs font-mono font-bold block text-white">EXPRESS_SERVER</span>
              <span className="text-[8px] font-mono text-[#6B7280] block mt-1">CPU Verify</span>
              <span className="text-[9px] font-bold text-[#68A063] font-mono block mt-1 uppercase">
                {step === 2 ? 'Verify Password' : (step === 4 ? 'Check Auth' : '')}
              </span>
            </div>

            {/* DB/Store Node (Only active/used differently based on config) */}
            <div className={`w-24 p-3 border rounded text-center z-10 transition-all ${
              authType === 'session' 
                ? (step === 2 || step === 4 ? 'border-[#68A063] bg-[#68A063]/10' : 'border-[#2A2D35] bg-[#15171C]')
                : 'border-[#2A2D35] bg-[#15171C] opacity-20 border-dashed'
            }`}>
              <Database className="h-4 w-4 mx-auto text-[#6B7280] mb-1" />
              <span className="text-[10px] font-mono font-bold block text-white">REDIS DB</span>
              <span className="text-[8px] font-mono text-[#6B7280] block">Session Cache</span>
              {authType === 'session' && (step === 2 || step === 4) && (
                <span className="text-[8px] text-[#68A063] font-bold block font-mono animate-pulse uppercase">Read/Write</span>
              )}
            </div>

          </div>

          <div className="border-t border-[#2A2D35] pt-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#6B7280] font-mono">
              Database overhead per request:
            </span>
            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
              authType === 'session' 
                ? 'bg-[#EAB308]/10 border-[#EAB308]/20 text-[#EAB308]' 
                : 'bg-[#68A063]/10 border-[#68A063]/20 text-[#68A063]'
            }`}>
              {authType === 'session' ? '⚠️ HIGH (1 query lookup / request)' : '✓ NONE (Validated entirely in memory)'}
            </span>
          </div>
        </div>

        {/* Console outputs / Flow steps list */}
        <div className="border border-[#2A2D35] rounded-lg p-4 bg-[#111318] flex flex-col justify-between min-h-[300px]">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6B7280] block mb-3">Runtime Audit trail</span>
            <div className="flex flex-col gap-2 font-mono text-[9px] text-[#9CA3AF] max-h-[220px] overflow-y-auto pr-1">
              {diagramLogs.length === 0 ? (
                <span className="text-[#6B7280] italic py-12 text-center block">Press "Trigger Flow" to observe active handshake sequences.</span>
              ) : (
                diagramLogs.map((log, index) => (
                  <div key={index} className="leading-snug border-l-2 border-[#2A2D35] pl-2 py-0.5">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3 mt-3">
            JWT provides frictionless statelessness perfect for autoscaling groups; sessions provide instant revocation models.
          </div>
        </div>

      </div>

    </div>
  );
}
