import React, { useState, useRef, useEffect } from 'react';
import { useCyberPet, ChatMessage, PetSkin } from './CyberPetContext.tsx';
import {
  Bot,
  Send,
  Sparkles,
  Terminal,
  X,
  Volume2,
  VolumeX,
  Trash2,
  Shield,
  Activity,
  Layers,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Zap,
  HelpCircle
} from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap.ts';

export const CyberAssistantDrawer: React.FC = () => {
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    mood,
    skin,
    setSkin,
    soundEnabled,
    setSoundEnabled,
    chatMessages,
    sendUserMessage,
    runAssistantAction,
    clearChat
  } = useCyberPet();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const drawerRef = useFocusTrap({
    isOpen: isAssistantOpen,
    onClose: () => setIsAssistantOpen(false),
    initialFocusRef: inputRef
  });

  useEffect(() => {
    if (isAssistantOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAssistantOpen]);

  if (!isAssistantOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput('');
    sendUserMessage(text);
  };

  const getSkinTheme = () => {
    if (skin === 'lizard') {
      return {
        accent: '#22c55e',
        border: 'border-[#22c55e]',
        bgAccent: 'bg-[#22c55e]',
        textAccent: 'text-[#22c55e]',
        badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-500',
        name: 'TOM // CYBER LIZARD COPILOT',
        tagline: 'BUG HUNTER · REPTILIAN RADAR · FLOW COPILOT',
        senderLabel: 'TOM LIZARD',
        icon: '🦎',
        placeholder: "Ask Tom anything... (e.g. 'Show blockers', 'Duplicates for #412', 'Flow SLA')"
      };
    }
    if (skin === 'fox') {
      return {
        accent: '#06b6d4',
        border: 'border-[#06b6d4]',
        bgAccent: 'bg-[#06b6d4]',
        textAccent: 'text-[#06b6d4]',
        badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-500',
        name: 'GLITCH FOX // RUNTIME SENTINEL',
        tagline: 'ANOMALY DETECTOR · TELEMETRY MATRIX · AUDIT BOT',
        senderLabel: 'GLITCH FOX',
        icon: '🦊',
        placeholder: "Ask Fox anything... (e.g. 'RBAC audit', 'Workspace brief')"
      };
    }
    return {
      accent: '#B497CF',
      border: 'border-[#B497CF]',
      bgAccent: 'bg-[#B497CF]',
      textAccent: 'text-[#B497CF]',
      badgeBg: 'bg-purple-950 text-purple-300 border-purple-500',
      name: 'BYTE // AUTONOMOUS AI SENTINEL',
      tagline: 'TRIAGE RADAR · FLOW WATCHDOG · GIT TELEMETRY COPILOT',
      senderLabel: 'BYTE SENTINEL',
      icon: '🤖',
      placeholder: "Ask Byte anything... (e.g. 'Show stalled reviews', 'Check duplicates')"
    };
  };

  const theme = getSkinTheme();

  const quickActions = [
    {
      id: 'duplicate_radar',
      label: 'DUPLICATE RADAR',
      desc: 'Scan issues for vector embedding matches',
      icon: <Layers className="w-3 h-3 text-[#22c55e]" />
    },
    {
      id: 'bottleneck_analysis',
      label: 'SLA BOTTLENECK ADVISOR',
      desc: 'Identify stalled reviews > 24h',
      icon: <Clock className="w-3 h-3 text-amber-400" />
    },
    {
      id: 'incident_brief',
      label: 'EXECUTIVE BRIEF',
      desc: 'Generate workspace health briefing',
      icon: <Activity className="w-3 h-3 text-emerald-400" />
    },
    {
      id: 'commit_sim',
      label: 'SIMULATE COMMIT',
      desc: 'Test real-time webhook flow',
      icon: <Zap className="w-3 h-3 text-cyan-400" />
    },
    {
      id: 'clearance_audit',
      label: 'RBAC AUDIT',
      desc: 'Verify confidential security groups',
      icon: <Shield className="w-3 h-3 text-purple-400" />
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs font-mono animate-in fade-in duration-150"
      onClick={() => setIsAssistantOpen(false)}
    >
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg h-full bg-[#0a0a0a] border-l-2 ${theme.border} shadow-2xl flex flex-col justify-between text-foreground animate-in slide-in-from-right duration-200`}
      >
        {/* Terminal Header */}
        <div className="p-3.5 bg-[#121212] border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 ${theme.bgAccent} text-black font-bold flex items-center justify-center rounded-xs`}>
              <span className="text-base">{theme.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {theme.name}
                </h2>
                <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase border rounded-xs ${theme.badgeBg}`}>
                  ONLINE
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground uppercase">
                {theme.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 border border-border hover:border-foreground text-muted-foreground hover:text-foreground rounded-xs transition-colors"
              title={soundEnabled ? 'Mute' : 'Unmute'}
            >
              {soundEnabled ? (
                <Volume2 className={`w-3.5 h-3.5 ${theme.textAccent}`} />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={clearChat}
              className="p-1.5 border border-border hover:border-red-500 text-muted-foreground hover:text-red-400 rounded-xs transition-colors"
              title="Clear Session"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsAssistantOpen(false)}
              className="p-1.5 border border-border hover:border-foreground text-muted-foreground hover:text-foreground rounded-xs transition-colors"
              title="Close Drawer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pet Avatar Skin Switcher */}
        <div className="px-3 py-1.5 bg-[#0e0e0e] border-b border-border flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground uppercase font-bold">ACTIVE AI COPILOT:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSkin('lizard')}
              className={`px-2 py-0.5 border rounded-xs transition-all uppercase font-bold flex items-center gap-1 ${
                skin === 'lizard'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-500 shadow-xs'
                  : 'bg-[#181818] text-muted-foreground border-border hover:border-foreground'
              }`}
            >
              <span>🦎</span>
              <span>TOM LIZARD</span>
            </button>
            <button
              onClick={() => setSkin('drone')}
              className={`px-2 py-0.5 border rounded-xs transition-all uppercase font-bold flex items-center gap-1 ${
                skin === 'drone'
                  ? 'bg-purple-950 text-[#B497CF] border-[#B497CF] shadow-xs'
                  : 'bg-[#181818] text-muted-foreground border-border hover:border-foreground'
              }`}
            >
              <span>🤖</span>
              <span>BYTE DRONE</span>
            </button>
            <button
              onClick={() => setSkin('fox')}
              className={`px-2 py-0.5 border rounded-xs transition-all uppercase font-bold flex items-center gap-1 ${
                skin === 'fox'
                  ? 'bg-cyan-950 text-cyan-400 border-cyan-500 shadow-xs'
                  : 'bg-[#181818] text-muted-foreground border-border hover:border-foreground'
              }`}
            >
              <span>🦊</span>
              <span>GLITCH FOX</span>
            </button>
          </div>
        </div>

        {/* Quick Action Chips Bar */}
        <div className="p-2.5 bg-[#0f0f0f] border-b border-border space-y-1.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
            ⚡ AI COPILOT QUICK DIAGNOSTICS:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((act) => (
              <button
                key={act.id}
                onClick={() => runAssistantAction(act.id as any)}
                className="px-2 py-1 bg-[#181818] hover:bg-[#222222] border border-border hover:border-foreground text-[10px] uppercase font-bold text-foreground flex items-center gap-1.5 transition-all rounded-xs shadow-xs"
              >
                {act.icon}
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversational Terminal Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground mb-1 uppercase">
                {msg.sender === 'user' ? (
                  <span>YOU // OPERATOR</span>
                ) : (
                  <span className={`${theme.textAccent} font-bold flex items-center gap-1`}>
                    <Sparkles className="w-2.5 h-2.5" />
                    {theme.senderLabel}
                  </span>
                )}
                <span>· {msg.timestamp}</span>
              </div>

              <div
                className={`p-3 rounded-xs max-w-[90%] whitespace-pre-wrap leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#181818] border border-border text-foreground font-mono'
                    : `bg-[#111111] border ${skin === 'lizard' ? 'border-[#22c55e]/40' : 'border-[#B497CF]/50'} text-foreground shadow-md`
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Command Line Input Footer */}
        <form onSubmit={handleSend} className="p-3 bg-[#121212] border-t border-border flex items-center gap-2">
          <div className="relative flex-1">
            <span className={`absolute left-2.5 top-2.5 ${theme.textAccent} font-bold text-xs`}>&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={theme.placeholder}
              className="w-full pl-6 pr-3 py-2 bg-[#080808] border border-border focus:border-foreground text-foreground text-xs font-mono outline-none rounded-xs uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim()}
            className={`px-3.5 py-2 ${theme.bgAccent} hover:opacity-90 text-black font-bold text-xs uppercase flex items-center gap-1.5 transition-all rounded-xs disabled:opacity-40 shadow-sm`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>SEND</span>
          </button>
        </form>
      </div>
    </div>
  );
};
