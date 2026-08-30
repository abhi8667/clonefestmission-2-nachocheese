import React, { useState } from 'react';
import { TomSprite } from './TomSprite.tsx';
import { MOOD_TO_ANIMATION } from './tomLizard.ts';
import { useCyberPet, PetMood, PetSkin } from './CyberPetContext.tsx';
import { Sparkles, MessageSquare, Volume2, VolumeX, Bot, Zap, X, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import { playCyberSound } from './audio.ts';

export const CyberPetAvatar: React.FC = () => {
  const {
    mood,
    skin,
    setSkin,
    isAssistantOpen,
    setIsAssistantOpen,
    soundEnabled,
    setSoundEnabled,
    currentThought,
    setThought
  } = useCyberPet();

  const [isHovered, setIsHovered] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const getMoodColor = (m: PetMood) => {
    switch (m) {
      case 'scanning':
        return '#06b6d4'; // Cyan
      case 'alert':
        return '#ef4444'; // Red
      case 'celebrate':
        return '#a855f7'; // Purple
      case 'thinking':
        return '#eab308'; // Amber
      case 'idle':
      default:
        return '#ea580c'; // Neon Orange
    }
  };

  const getPetName = () => {
    if (skin === 'lizard') return 'TOM // CYBER LIZARD';
    if (skin === 'fox') return 'GLITCH // CYBER FOX';
    return 'BYTE // AI SENTINEL';
  };

  const getMoodLabel = (m: PetMood) => {
    switch (m) {
      case 'scanning':
        return skin === 'lizard' ? 'HUNTING BUGS' : 'SCANNING TELEMETRY';
      case 'alert':
        return 'SLA BREACH ALERT';
      case 'celebrate':
        return skin === 'lizard' ? 'BUG CAUGHT & RESOLVED!' : 'COMMIT CELEBRATION';
      case 'thinking':
        return 'AI MATRIX THINKING';
      case 'idle':
      default:
        return skin === 'lizard' ? 'TOM ONLINE 🦎' : 'SENTINEL ONLINE';
    }
  };

  const moodColor = getMoodColor(mood);

  const handleAvatarClick = () => {
    if (soundEnabled) playCyberSound('chirp');
    setIsAssistantOpen(!isAssistantOpen);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-40 p-2 bg-[#0d0d0d] border-2 border-[#22c55e] text-[#22c55e] shadow-lg rounded-sm hover:scale-105 transition-all flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase"
        title="Expand Cyber AI Assistant"
      >
        <span className="text-base">🦎</span>
        <span>{skin === 'lizard' ? 'TOM // LIZARD COPILOT' : 'BYTE // AI COPILOT'}</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 font-mono select-none flex flex-col items-end pointer-events-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Speech Bubble / Thought HUD */}
      {currentThought && (
        <div className="mb-2 max-w-xs p-2.5 bg-[#0d0d0d] border-2 border-border shadow-2xl rounded-sm text-foreground text-[11px] leading-relaxed relative animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-2 mb-1 border-b border-border/50 pb-1">
            <span className="text-[9px] font-bold uppercase flex items-center gap-1" style={{ color: moodColor }}>
              <span className="w-1.5 h-1.5 rounded-full animate-ping motion-reduce:animate-none" style={{ backgroundColor: moodColor }} />
              {getPetName()} // {getMoodLabel(mood)}
            </span>
            <button
              onClick={() => setThought(null)}
              className="text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Dismiss thought"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-foreground/90 font-mono">{currentThought}</p>
          {/* Arrow Pointer */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-[#0d0d0d] border-r-2 border-b-2 border-border rotate-45" />
        </div>
      )}

      {/* Floating Drone / Lizard Avatar & Controls Container */}
      <div className="flex items-end gap-2">
        {/* Floating Quick Action Controls on Hover */}
        {isHovered && (
          <div className="flex flex-col gap-1.5 mb-1 animate-in fade-in duration-150">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 bg-[#121212] border border-border hover:border-foreground text-muted-foreground hover:text-foreground rounded-xs shadow-md"
              title={soundEnabled ? 'Mute Cyber Chimes' : 'Enable Cyber Chimes'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#22c55e]" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 bg-[#121212] border border-border hover:border-foreground text-muted-foreground hover:text-foreground rounded-xs shadow-md"
              title="Minimize Assistant"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* The Animated Cyber Pet Character */}
        <div
          onClick={handleAvatarClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAvatarClick(); }}
          className="relative cursor-pointer group focus:outline-none"
          title={skin === 'lizard' ? 'Click to open Tom the Lizard Copilot' : 'Click to open AI Triage Assistant'}
        >
          {/* Holographic Glowing Aura */}
          <div
            className="absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-80 transition-opacity"
            style={{ backgroundColor: moodColor }}
          />

          {/* SVG Character Chassis */}
          <div className="relative w-14 h-[60px] bg-[#0d0d0d] border-2 rounded-lg p-0.5 flex items-center justify-center overflow-hidden transition-transform motion-reduce:transition-none transform group-hover:scale-110 shadow-2xl hover:border-foreground"
            style={{ borderColor: isAssistantOpen ? '#22c55e' : moodColor }}
          >
            {skin === 'lizard' ? (
              /* Tom Lizard — real sprite sheet, mood-driven clip */
              <TomSprite
                animation={MOOD_TO_ANIMATION[mood]}
                scale={0.25}
                fallback="idle"
                className="pointer-events-none"
              />
            ) : (
              /* BYTE DRONE SVG */
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="50" y1="20" x2="50" y2="6" stroke={moodColor} strokeWidth="4" strokeLinecap="round" />
                <circle cx="50" cy="5" r="4" fill={moodColor} className={mood === 'alert' ? 'animate-ping motion-reduce:animate-none' : ''} />
                <line x1="26" y1="26" x2="16" y2="14" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />
                <circle cx="15" cy="13" r="3" fill={moodColor} />
                <line x1="74" y1="26" x2="84" y2="14" stroke="#52525b" strokeWidth="3" strokeLinecap="round" />
                <circle cx="85" cy="13" r="3" fill={moodColor} />

                <rect x="20" y="24" width="60" height="52" rx="10" fill="#18181b" stroke="#3f3f46" strokeWidth="3" />
                <rect x="26" y="32" width="48" height="24" rx="4" fill="#09090b" stroke={moodColor} strokeWidth="1.5" />

                {mood === 'alert' ? (
                  <>
                    <line x1="42" y1="38" x2="42" y2="48" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="42" cy="51" r="1.5" fill="#ef4444" />
                    <line x1="58" y1="38" x2="58" y2="48" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="58" cy="51" r="1.5" fill="#ef4444" />
                  </>
                ) : mood === 'celebrate' ? (
                  <>
                    <path d="M36 46 Q42 36 48 46" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <path d="M52 46 Q58 36 64 46" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" fill="none" />
                  </>
                ) : mood === 'thinking' ? (
                  <>
                    <circle cx="40" cy="44" r="5" stroke="#eab308" strokeWidth="2" strokeDasharray="3 3" className="animate-spin motion-reduce:animate-none" />
                    <circle cx="60" cy="44" r="5" stroke="#eab308" strokeWidth="2" strokeDasharray="3 3" className="animate-spin motion-reduce:animate-none" />
                  </>
                ) : (
                  <>
                    <circle cx="40" cy="44" r="4.5" fill={moodColor} />
                    <circle cx="41.5" cy="42.5" r="1.5" fill="#ffffff" />
                    <circle cx="60" cy="44" r="4.5" fill={moodColor} />
                    <circle cx="61.5" cy="42.5" r="1.5" fill="#ffffff" />
                  </>
                )}

                <line x1="30" y1="64" x2="70" y2="64" stroke={moodColor} strokeWidth="1" strokeOpacity="0.4" />
                <line x1="38" y1="68" x2="62" y2="68" stroke={moodColor} strokeWidth="1" strokeOpacity="0.6" />

                <path d="M38 76 L44 88 L56 88 L62 76 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="2" />
                <path d="M44 88 L50 96 L56 88 Z" fill={moodColor} className="animate-pulse motion-reduce:animate-none" />
              </svg>
            )}
          </div>

          {/* Online Sentinel Badge */}
          <div
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center"
            style={{ backgroundColor: moodColor }}
          >
            <div className="w-1.5 h-1.5 bg-black rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

