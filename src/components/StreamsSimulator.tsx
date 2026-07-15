import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ArrowRight, Gauge, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface DataChunk {
  id: number;
  val: string;
  status: 'reading' | 'transforming' | 'writing' | 'written';
  x: number; // percentage from left to right (0 to 100)
}

export default function StreamsSimulator() {
  const [chunks, setChunks] = useState<DataChunk[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [consumerSpeed, setConsumerSpeed] = useState<'fast' | 'normal' | 'slow'>('slow');
  const [writableBuffer, setWritableBuffer] = useState<number>(0);
  const [readableStatus, setReadableStatus] = useState<'flowing' | 'paused' | 'idle'>('idle');
  const [backpressureActive, setBackpressureActive] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const nextChunkId = useRef(1);
  const speedRef = useRef(consumerSpeed);
  const isPlayingRef = useRef(isPlaying);
  const writableBufferRef = useRef(writableBuffer);

  useEffect(() => {
    speedRef.current = consumerSpeed;
  }, [consumerSpeed]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    writableBufferRef.current = writableBuffer;
  }, [writableBuffer]);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConsumerSpeed(e.target.value as any);
  };

  const startSimulation = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setReadableStatus('paused');
    } else {
      setIsPlaying(true);
      setReadableStatus('flowing');
      if (chunks.length === 0) {
        setTerminalLogs(['🚀 Stream pipeline initialized: readable.pipe(transform).pipe(writable)']);
      }
    }
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setChunks([]);
    setWritableBuffer(0);
    setReadableStatus('idle');
    setBackpressureActive(false);
    setTerminalLogs([]);
    nextChunkId.current = 1;
  };

  // Chunk Spawner (Readable Stream emitting chunks)
  useEffect(() => {
    if (!isPlaying) return;

    const spawnInterval = setInterval(() => {
      // If backpressure is active, we pause producing chunks
      if (writableBufferRef.current >= 80) {
        setBackpressureActive(true);
        setReadableStatus('paused');
        setTerminalLogs(prev => [...prev, '⚠️ [Writable] Buffer Full! Returning false on write(). Triggering BACKPRESSURE (Pause Readable).']);
        return;
      }

      setReadableStatus('flowing');
      setBackpressureActive(false);

      const id = nextChunkId.current++;
      const lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz';
      const randomChar = lowercaseLetters[Math.floor(Math.random() * lowercaseLetters.length)];
      
      const newChunk: DataChunk = {
        id,
        val: randomChar,
        status: 'reading',
        x: 10
      };

      setChunks(prev => [...prev, newChunk]);
      setTerminalLogs(prev => [...prev, `[Readable] Emitted chunk "${randomChar}" (size: 64KB)`].slice(-6));
    }, 1000);

    return () => clearInterval(spawnInterval);
  }, [isPlaying]);

  // Physics animation loop (moving chunks and draining buffer)
  useEffect(() => {
    const animationInterval = setInterval(() => {
      if (!isPlayingRef.current) return;

      // 1. Progress active chunks across pipeline
      setChunks(prevChunks => {
        return prevChunks.map(chunk => {
          let nextX = chunk.x + 4;
          let nextStatus = chunk.status;

          // Milestone triggers
          if (chunk.x < 45 && nextX >= 45) {
            nextStatus = 'transforming';
          } else if (chunk.x < 75 && nextX >= 75) {
            nextStatus = 'writing';
          } else if (chunk.x >= 95 && chunk.status !== 'written') {
            nextStatus = 'written';
            // Chunk enters writable buffer!
            setWritableBuffer(buf => {
              const maxBuffer = 100;
              const nextBuf = Math.min(buf + 20, maxBuffer);
              return nextBuf;
            });
          }

          return {
            ...chunk,
            x: Math.min(nextX, 100),
            val: nextStatus === 'transforming' || nextStatus === 'writing' || nextStatus === 'written' ? chunk.val.toUpperCase() : chunk.val,
            status: nextStatus
          };
        }).filter(chunk => chunk.status !== 'written'); // Remove completed chunks from timeline
      });

      // 2. Drain Writable buffer depending on consumption speed
      setWritableBuffer(buf => {
        if (buf === 0) return 0;
        
        let drainAmount = 0;
        if (speedRef.current === 'fast') drainAmount = 15;
        else if (speedRef.current === 'normal') drainAmount = 8;
        else if (speedRef.current === 'slow') drainAmount = 3;

        const nextBuf = Math.max(buf - drainAmount, 0);

        // Backpressure release threshold (drain event)
        if (nextBuf <= 40 && writableBufferRef.current > 40 && backpressureActive) {
          setBackpressureActive(false);
          setReadableStatus('flowing');
          setTerminalLogs(prev => [...prev, '⚡ [Writable] Buffer cleared below threshold. Emitted "drain" event. Resuming Readable source.']);
        }

        return nextBuf;
      });

    }, 150);

    return () => clearInterval(animationInterval);
  }, [backpressureActive]);

  return (
    <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-6 shadow-sm">
      
      {/* Configuration Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-[#2A2D35] pb-4">
        <div>
          <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
            <Gauge className="text-[#68A063] h-4 w-4" /> STREAMS_BACKPRESSURE_PIPELINE.sys
          </h4>
          <p className="text-[11px] text-[#6B7280] font-mono mt-1">
            Slow down the consumer client speed to see backpressure trigger dynamically to protect memory limits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={consumerSpeed}
            onChange={handleSpeedChange}
            className="px-2.5 py-1.5 bg-[#111318] border border-[#2A2D35] text-xs text-white rounded font-mono outline-none focus:ring-1 focus:ring-[#68A063] cursor-pointer"
          >
            <option value="fast">Client: Fast (No Backpressure)</option>
            <option value="normal">Client: Normal (Medium)</option>
            <option value="slow">Client: Slow Network (Triggers Backpressure)</option>
          </select>
          <button
            onClick={startSimulation}
            className={`px-3 py-1.5 text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#68A063] hover:bg-[#5b8c56]'
            }`}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPlaying ? 'PAUSE_STREAM' : 'START_PIPE'}
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

      {/* Visual Canvas Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Stream Visual tracks */}
        <div className="lg:col-span-3 border border-[#2A2D35] rounded-lg bg-[#111318] p-4 relative min-h-[220px] flex flex-col justify-between overflow-hidden">
          
          <div className="flex justify-between items-center text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6B7280] border-b border-[#2A2D35] pb-2">
            <span>Readable Stream</span>
            <span>Transform Stream</span>
            <span>Writable Stream</span>
          </div>

          {/* Active Flow Pipeline Area */}
          <div className="relative h-24 flex items-center my-4">
            
            {/* The Connecting Pipe line */}
            <div className="absolute left-8 right-8 h-3 bg-[#15171C] rounded-full border border-[#2A2D35] flex items-center overflow-hidden">
              <div className={`h-full bg-[#15171C] transition-all ${isPlaying && readableStatus === 'flowing' ? 'animate-pulse bg-gradient-to-r from-blue-500/10 via-[#68A063]/10 to-emerald-500/10' : ''}`} style={{ width: '100%' }} />
            </div>

            {/* Left Node: Readable (File) */}
            <div className={`absolute left-0 w-16 h-16 rounded-full border flex flex-col justify-center items-center p-1 shadow-sm transition-all duration-300 z-10 ${
              readableStatus === 'flowing' 
                ? 'bg-[#68A063]/10 border-[#68A063] text-white' 
                : (readableStatus === 'paused' ? 'bg-amber-500/15 border-amber-500 text-amber-400 animate-pulse' : 'bg-[#15171C] border-[#2A2D35] text-[#6B7280]')
            }`}>
              <span className="text-[9px] font-bold font-mono">READABLE</span>
              <span className="text-[8px] opacity-75 font-mono">{readableStatus === 'flowing' ? 'Flowing' : (readableStatus === 'paused' ? 'PAUSED' : 'Idle')}</span>
            </div>

            {/* Center Node: Transform (UpperCase) */}
            <div className="absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full border border-[#2A2D35] bg-[#15171C] flex flex-col justify-center items-center p-1 shadow-sm z-10">
              <span className="text-[8px] font-bold font-mono uppercase text-[#6B7280]">TRANSFORM</span>
              <span className="text-[9px] font-bold text-white font-mono">A → A_CASE</span>
            </div>

            {/* Right Node: Writable (Socket) */}
            <div className={`absolute right-0 w-16 h-16 rounded-full border flex flex-col justify-center items-center p-1 shadow-sm transition-all duration-300 z-10 ${
              writableBuffer >= 80 
                ? 'bg-rose-500/15 border-rose-500 text-rose-400' 
                : 'bg-[#68A063]/15 border-[#68A063] text-white'
            }`}>
              <span className="text-[9px] font-bold font-mono">WRITABLE</span>
              <span className="text-[8px] opacity-75 font-mono">Buf: {Math.round(writableBuffer)}%</span>
            </div>

            {/* Flowing Chunks (Visual bubbles) */}
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className={`absolute h-6 w-6 rounded-full flex items-center justify-center font-mono font-bold text-xs text-white border-2 border-[#111318] shadow transition-all duration-300 z-20 ${
                  chunk.status === 'reading' 
                    ? 'bg-blue-500' 
                    : (chunk.status === 'transforming' ? 'bg-amber-500' : 'bg-[#68A063]')
                }`}
                style={{ left: `${chunk.x}%`, transform: 'translateX(-50%)' }}
              >
                {chunk.val}
              </div>
            ))}
          </div>

          {/* Bottom Alerts */}
          <div className="border-t border-[#2A2D35] pt-3">
            {backpressureActive ? (
              <p className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 p-2 rounded">
                <AlertTriangle className="h-3.5 w-3.5 animate-bounce text-amber-500" />
                Backpressure Active! Consumer queue saturated (HWM reached). Readable paused to prevent RAM leakage.
              </p>
            ) : (
              <p className="text-[10px] text-[#68A063] font-mono flex items-center gap-1.5 bg-[#68A063]/10 border border-[#68A063]/20 p-2 rounded">
                <ShieldCheck className="h-3.5 w-3.5 text-[#68A063]" />
                Streaming normally. Consumer keeps up with production speed. Memory utilization steady.
              </p>
            )}
          </div>
        </div>

        {/* Stream metrics */}
        <div className="border border-[#2A2D35] rounded-lg p-4 bg-[#111318] flex flex-col justify-between">
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6B7280] block mb-3">Live Stream Buffers</span>
          
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Writable Internal Cache</span>
              <div className="w-full bg-[#15171C] border border-[#2A2D35] h-6 rounded overflow-hidden mt-1 relative flex items-center">
                <div 
                  className={`h-full transition-all duration-300 ${writableBuffer >= 80 ? 'bg-rose-500' : 'bg-[#68A063]'}`}
                  style={{ width: `${writableBuffer}%` }}
                />
                <span className="absolute right-2 text-[10px] font-mono font-bold text-white">
                  {Math.round(writableBuffer)}% / 100%
                </span>
              </div>
              <span className="text-[8px] text-[#6B7280] mt-1 block font-mono">highWaterMark: 16KB</span>
            </div>

            <div>
              <span className="text-[10px] text-[#6B7280] uppercase font-mono block">Consumer Speed</span>
              <span className="text-base font-bold font-mono capitalize text-white flex items-center gap-1.5 mt-1">
                <RefreshCw className={`h-3.5 w-3.5 text-[#68A063] ${isPlaying && readableStatus === 'flowing' ? 'animate-spin' : ''}`} />
                {consumerSpeed} Network
              </span>
            </div>
          </div>

          <div className="text-[9px] text-[#6B7280] font-mono border-t border-[#2A2D35] pt-3 mt-3">
            Real streams pipe safely using Node:
            <code className="block bg-[#15171C] border border-[#2A2D35] text-[8px] p-1 rounded mt-1 text-[#9CA3AF]">
              readable.pipe(writable);
            </code>
          </div>
        </div>

      </div>

      {/* Terminal logs */}
      <div className="border border-[#2A2D35] rounded bg-[#111318] p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280] font-mono block mb-2">Internal Pipeline Event Log</span>
        <div className="flex flex-col gap-1 font-mono text-[9.5px] text-[#9CA3AF] overflow-y-auto max-h-24 min-h-[48px]">
          {terminalLogs.length === 0 ? (
            <span className="text-[#6B7280] italic">Press "START_PIPE" to begin reading binary streams...</span>
          ) : (
            terminalLogs.map((log, index) => (
              <div key={index} className="leading-normal">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
