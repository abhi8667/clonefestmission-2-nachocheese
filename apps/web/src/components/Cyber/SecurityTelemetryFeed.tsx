import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Shield,
  Radio,
  Minimize2,
  Maximize2,
  Trash2,
  Pause,
  Play,
  Sparkles,
  AlertTriangle,
  Lock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useSSE } from '../../context/SSEContext.tsx';

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'SECURE' | 'SCAN' | 'TRAFFIC' | 'ANOMALY' | 'THREAT' | 'AUTH' | 'WARN';
  message: string;
  details?: string;
}

const SEED_LOGS: Array<Omit<LogEntry, 'id' | 'timestamp'>> = [
  { type: 'SCAN', message: 'INITIALIZING SECURITY RADAR SCAN...', details: 'memory_buffer: 0x7FFF92' },
  { type: 'TRAFFIC', message: 'ANALYZING TELEMETRY NETWORK TRAFFIC', details: 'port: 3001/stream' },
  { type: 'SECURE', message: 'ENCRYPTED SSE CHANNEL VERIFIED (TLS 1.3)', details: 'cipher: AES-256-GCM' },
  { type: 'TRAFFIC', message: 'PACKET STREAM ACTIVE', details: 'throughput: 1.4 MB/s' },
  { type: 'SECURE', message: 'RBAC CLEARANCE VERIFIED FOR ACTIVE SESSION' },
  { type: 'SCAN', message: 'DUPLICATE RADAR VECTOR INDEX WARMED', details: 'dimensions: 384-dim TF-IDF' },
  { type: 'SECURE', message: 'SYSTEM INTEGRITY: ALL NODES OPERATIONAL' }
];

const PERIODIC_LOG_TEMPLATES = [
  { type: 'TRAFFIC', message: 'INSPECTING INCOMING REPO WEBHOOK PACKETS', details: 'github/sha: e8f2a1...' },
  { type: 'SCAN', message: 'SCANNING OPEN REVIEW QUEUE FOR STALLED PRs', details: 'threshold: 24.0h' },
  { type: 'SECURE', message: 'CRYPTOGRAPHIC JWT TOKEN CLAIMS VALIDATED', details: 'role_guard: satisfied' },
  { type: 'TRAFFIC', message: 'CUMULATIVE FLOW TELEMETRY REFRESHED', details: 'velocity: 4.8 bugs/day' },
  { type: 'SECURE', message: 'ISOLATED SECURITY GROUP ROW-LEVEL ENCRYPTION ACTIVE', details: 'grp_sec' },
  { type: 'WARN', message: 'DETECTED 1 IN REVIEW STALL EXCEEDING 24H BENCHMARK', details: 'bug #412' },
  { type: 'SCAN', message: 'REALTIME MEMORY INTEGRITY & SQLITE TRANSACTION SANITY PASS' }
];

interface SecurityTelemetryFeedProps {
  onSelectBug?: (bugId: number) => void;
}

export const SecurityTelemetryFeed: React.FC<SecurityTelemetryFeedProps> = ({ onSelectBug }) => {
  const { lastEvent, isConnected } = useSSE();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'THREAT' | 'SCAN' | 'SECURE'>('ALL');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const formatTime = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  // Initial seed logs
  useEffect(() => {
    const initial = SEED_LOGS.map((item, idx) => ({
      id: `init-${idx}`,
      timestamp: formatTime(),
      ...item
    }));
    setLogs(initial);
  }, []);

  // Ingest live SSE Events into Telemetry Stream
  useEffect(() => {
    if (!lastEvent) return;

    let type: LogEntry['type'] = 'TRAFFIC';
    let message = `LIVE SSE EVENT: ${lastEvent.type}`;
    let details = '';

    if (lastEvent.type === 'bug:created') {
      type = 'SCAN';
      message = `NEW BUG LOGGED: #${lastEvent.data?.id} - "${lastEvent.data?.title?.substring(0, 30)}..."`;
    } else if (lastEvent.type === 'bug:updated') {
      type = 'TRAFFIC';
      message = `STATE TRANSITION TRIGGERED: Bug #${lastEvent.data?.id} -> ${lastEvent.data?.status || 'UPDATED'}`;
    } else if (lastEvent.type === 'flag:created') {
      type = 'WARN';
      message = `REQUEST FLAG SUBMITTED: ${lastEvent.data?.name}? for @${lastEvent.data?.requestee?.username || 'user'}`;
    } else if (lastEvent.type === 'flag:resolved') {
      type = 'SECURE';
      message = `FLAG RESOLVED: ${lastEvent.data?.name}${lastEvent.data?.status} by @${lastEvent.data?.setter?.username || 'user'}`;
    } else if (lastEvent.type === 'import:progress') {
      type = 'TRAFFIC';
      message = `GITHUB INGEST PROGRESS: ${lastEvent.data?.message || 'Ingesting repository data'}`;
    } else if (lastEvent.type === 'import:complete') {
      type = 'SECURE';
      message = `GITHUB IMPORT COMPLETE: ${lastEvent.data?.total || 0} issues materialized into flow`;
    }

    const newEntry: LogEntry = {
      id: `sse-${Date.now()}-${Math.random()}`,
      timestamp: formatTime(),
      type,
      message,
      details
    };

    setLogs((prev) => [...prev.slice(-99), newEntry]);
  }, [lastEvent]);

  // Periodic random background telemetry generator
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const template = PERIODIC_LOG_TEMPLATES[Math.floor(Math.random() * PERIODIC_LOG_TEMPLATES.length)];
      const newEntry: LogEntry = {
        id: `gen-${Date.now()}-${Math.random()}`,
        timestamp: formatTime(),
        type: template.type as any,
        message: template.message,
        details: template.details
      };

      setLogs((prev) => [...prev.slice(-99), newEntry]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current && isExpanded && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded, isPaused]);

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALL') return true;
    if (filter === 'THREAT') return l.type === 'THREAT' || l.type === 'WARN' || l.type === 'ANOMALY';
    if (filter === 'SCAN') return l.type === 'SCAN' || l.type === 'TRAFFIC';
    if (filter === 'SECURE') return l.type === 'SECURE' || l.type === 'AUTH';
    return true;
  });

  const getBadgeStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'SECURE':
      case 'AUTH':
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80';
      case 'SCAN':
      case 'TRAFFIC':
        return 'text-cyan-400 bg-cyan-950/80 border-cyan-800/80';
      case 'WARN':
        return 'text-amber-400 bg-amber-950/80 border-amber-800/80';
      case 'THREAT':
      case 'ANOMALY':
        return 'text-red-400 bg-red-950/80 border-red-800/80';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  const latestLog = logs[logs.length - 1];

  return (
    <aside
      aria-label="Security Telemetry and Activity Terminal"
      className="fixed bottom-4 right-4 z-40 max-w-lg w-full transition-all duration-300 pointer-events-auto"
    >
      <div className="bg-slate-950/95 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl cyber-corners">
        {/* Terminal Header */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3.5 py-2 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/90 transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Terminal className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                SOC TELEMETRY STREAM
              </span>
              <span className="flex items-center space-x-1 px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isExpanded && latestLog && (
              <span className="text-[10px] font-mono text-slate-400 truncate max-w-[180px] hidden sm:inline">
                [{latestLog.timestamp.split('.')[0]}] {latestLog.message}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded hover:bg-slate-800 transition-colors"
              aria-label={isExpanded ? 'Collapse terminal' : 'Expand terminal'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Console Window */}
        {isExpanded && (
          <div className="p-3 space-y-2.5 animate-slide-up">
            {/* Filter Toolbar */}
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80 flex-wrap gap-2">
              <div className="flex items-center space-x-1">
                {(['ALL', 'THREAT', 'SCAN', 'SECURE'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
                      filter === f
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-mono">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                >
                  {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={() => setLogs([])}
                  className="flex items-center space-x-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Log Output Stream */}
            <div
              ref={scrollRef}
              tabIndex={0}
              role="log"
              aria-label="Real-time SOC telemetry terminal log output"
              className="h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px] select-text focus:outline-none focus:ring-1 focus:ring-cyan-500/40 rounded-lg"
            >
              {filteredLogs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No telemetry events matching filter
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-2 py-0.5 hover:bg-slate-900/60 rounded px-1 transition-colors leading-relaxed"
                  >
                    <span className="text-slate-500 flex-shrink-0 text-[10px] select-none">
                      [{log.timestamp}]
                    </span>
                    <span
                      className={`px-1 py-0.2 rounded text-[9px] font-bold border flex-shrink-0 select-none ${getBadgeStyle(
                        log.type
                      )}`}
                    >
                      {log.type}
                    </span>
                    <span className="text-slate-200 break-all flex-1">
                      {log.message}
                      {log.details && (
                        <span className="text-slate-400 text-[10px] ml-1.5 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                          {log.details}
                        </span>
                      )}
                    </span>
                  </div>
                ))
              )}
              {/* Blinking Terminal Prompt Cursor */}
              <div className="flex items-center space-x-1.5 text-cyan-400 pt-1 text-xs">
                <span className="text-emerald-400 select-none">triarc@soc-node-01:~$</span>
                <span className="w-2 h-3.5 bg-cyan-400 animate-terminal-blink" />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
