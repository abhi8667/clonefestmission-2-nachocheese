import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TomSprite } from './TomSprite.tsx';
import { TomAnimationName } from './tomLizard.ts';
import { useCyberPet } from './CyberPetContext.tsx';
import { playCyberSound } from './audio.ts';
import { Sparkles, MessageSquare, Volume2, VolumeX, X, Heart, Apple, Trophy } from 'lucide-react';

interface BugCatch {
  id: number;
  x: number;
  y: number;
}

export const TomLizardPet: React.FC = () => {
  const {
    mood,
    setMood,
    skin,
    isAssistantOpen,
    setIsAssistantOpen,
    soundEnabled,
    setSoundEnabled,
    currentThought,
    setThought
  } = useCyberPet();

  // Position and State of Tom the Lizard
  const [posX, setPosX] = useState(120); // offset from right (px)
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [action, setAction] = useState<'idle' | 'walk' | 'eat' | 'sleep' | 'chase'>('idle');
  const [frame, setFrame] = useState(0);
  const [bugsCaught, setBugsCaught] = useState(3);
  const [activeBug, setActiveBug] = useState<BugCatch | null>(null);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [isHungry, setIsHungry] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Animation Frame Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % 8);
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // Autonomous Roaming AI Behavior Loop
  useEffect(() => {
    if (activeBug || ballPos || isAssistantOpen) return;

    const roamingInterval = setInterval(() => {
      const rand = Math.random();

      if (rand < 0.35) {
        // Walk left or right
        const newDir = Math.random() > 0.5 ? 'left' : 'right';
        setDirection(newDir);
        setAction('walk');

        const step = newDir === 'left' ? 40 : -40;
        setPosX((prev) => {
          const next = prev + step;
          // Bounds: stay between 40px and 450px from right
          if (next < 40) {
            setDirection('left');
            return 60;
          }
          if (next > 420) {
            setDirection('right');
            return 380;
          }
          return next;
        });

        setTimeout(() => {
          setAction('idle');
        }, 1800);
      } else if (rand < 0.55) {
        // Idle looking around or tail flick
        setAction('idle');
      } else if (rand < 0.65) {
        // Cute sleep nap
        setAction('sleep');
        setTimeout(() => setAction('idle'), 4000);
      }
    }, 5000);

    return () => clearInterval(roamingInterval);
  }, [activeBug, ballPos, isAssistantOpen]);

  // Feed a Bug to Tom
  const spawnBugForTom = useCallback(() => {
    const targetOffset = Math.max(60, Math.min(380, posX + (Math.random() > 0.5 ? 80 : -80)));
    setActiveBug({ id: Date.now(), x: targetOffset, y: 15 });
    setDirection(targetOffset > posX ? 'left' : 'right');
    setAction('chase');
    if (soundEnabled) playCyberSound('beep');
    setThought('🦎 Sensed a software bug! Target locked!');

    // Tom moves to the bug
    setTimeout(() => {
      setPosX(targetOffset);
      setAction('eat');
      if (soundEnabled) playCyberSound('chirp');

      setTimeout(() => {
        setActiveBug(null);
        setBugsCaught((b) => b + 1);
        setAction('idle');
        setMood('celebrate');
        if (soundEnabled) playCyberSound('celebrate');
        setThought('😋 *NOM!* Bug squashed and digested! +10 XP');
        setTimeout(() => setMood('idle'), 3000);
      }, 700);
    }, 1200);
  }, [posX, soundEnabled, setThought, setMood]);

  // Throw Ball for Tom
  const throwBall = useCallback(() => {
    const targetOffset = Math.max(50, Math.min(400, posX + (direction === 'left' ? 120 : -120)));
    setBallPos({ x: targetOffset, y: 12 });
    setDirection(targetOffset > posX ? 'left' : 'right');
    setAction('chase');
    if (soundEnabled) playCyberSound('beep');
    setThought('🎾 Chasing the test ball!');

    setTimeout(() => {
      setPosX(targetOffset);
      setAction('idle');
      setBallPos(null);
      if (soundEnabled) playCyberSound('celebrate');
      setThought('🐾 Caught the ball! Good boy Tom!');
    }, 1400);
  }, [posX, direction, soundEnabled, setThought]);

  const handleTomClick = () => {
    if (soundEnabled) playCyberSound('chirp');
    setIsAssistantOpen(!isAssistantOpen);
  };

  // Behaviour drives the clip; mood overrides it for reactions. The sheet has
  // real directional run cycles, so `direction` maps straight onto them.
  const spriteAnimation: TomAnimationName =
    mood === 'alert' ? 'failed'
    : mood === 'celebrate' ? 'jumping'
    : action === 'eat' ? 'waving'
    : action === 'chase' ? (direction === 'left' ? 'running-left' : 'running-right')
    : action === 'walk' ? (direction === 'left' ? 'running-left' : 'running-right')
    : action === 'sleep' ? 'waiting'
    : mood === 'thinking' ? 'waiting'
    : mood === 'scanning' ? 'running'
    : 'idle';

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 right-0 z-40 font-mono select-none pointer-events-none w-full max-w-xl h-24"
    >
      {/* Tom the Lizard Stage Container */}
      <div
        className="absolute bottom-2 pointer-events-auto transition-all duration-700 ease-out flex flex-col items-center"
        style={{
          right: `${posX}px`
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Speech / Thought HUD */}
        {currentThought && (
          <div
            className="absolute -top-16 z-50 p-2 bg-[#0a0a0a] border-2 border-[#22c55e] text-foreground text-[11px] shadow-2xl rounded-sm whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="flex items-center gap-1.5 font-bold text-[#22c55e] text-[9px] uppercase">
              <span>🦎 TOM</span>
              <span>·</span>
              <span className="text-muted-foreground">{action.toUpperCase()}</span>
            </div>
            <p className="font-mono text-white text-xs">{currentThought}</p>
            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-[#0a0a0a] border-r-2 border-b-2 border-[#22c55e] rotate-45" />
          </div>
        )}

        {/* Pet Floating Action Bar on Hover */}
        {isHovered && (
          <div
            className="absolute -top-7 flex items-center gap-1 bg-[#121212] p-1 border border-border rounded-sm shadow-xl z-50 animate-in fade-in duration-100"
          >
            <button
              onClick={spawnBugForTom}
              className="px-1.5 py-0.5 bg-[#1a1a1a] hover:bg-[#22c55e] text-white hover:text-black text-[9px] font-bold uppercase border border-border rounded-xs flex items-center gap-1"
              title="Feed a software bug to Tom"
            >
              <span>🪲 FEED BUG</span>
            </button>
            <button
              onClick={throwBall}
              className="px-1.5 py-0.5 bg-[#1a1a1a] hover:bg-[#eab308] text-white hover:text-black text-[9px] font-bold uppercase border border-border rounded-xs flex items-center gap-1"
              title="Throw ball for Tom"
            >
              <span>🎾 PLAY</span>
            </button>
            <button
              onClick={handleTomClick}
              className="px-1.5 py-0.5 bg-[#22c55e] text-black text-[9px] font-bold uppercase rounded-xs flex items-center gap-1"
              title="Open AI Copilot Terminal"
            >
              <span>💬 CHAT</span>
            </button>
          </div>
        )}

        {/* Pixel-Art / Clay Toy Sprite Lizard Character */}
        <div
          onClick={handleTomClick}
          className="relative cursor-pointer group flex items-center justify-center"
          title="Click to interact with Tom the Lizard Copilot"
        >
          {/* Real Tom Lizard official sprite sheet */}
          <TomSprite
            animation={spriteAnimation}
            scale={0.45}
            fallback="idle"
            className="pointer-events-none drop-shadow-[0_4px_12px_rgba(34,197,94,0.4)]"
          />

          {/* Floating Zzz when sleeping */}
          {action === 'sleep' && (
            <div className="absolute -top-3 right-0 text-[#22c55e] font-bold text-xs animate-bounce">
              Zzz...
            </div>
          )}
        </div>


        {/* Floor Shadow */}
        <div className="w-14 h-1.5 bg-black/40 rounded-full blur-[1px] -mt-1" />
      </div>

      {/* Render Active Bug Target on Stage */}
      {activeBug && (
        <div
          className="absolute bottom-4 animate-bounce z-40"
          style={{ right: `${activeBug.x}px` }}
        >
          <div className="p-1 bg-red-950 border border-red-500 rounded-full text-xs shadow-lg animate-spin">
            🪲
          </div>
        </div>
      )}

      {/* Render Thrown Ball on Stage */}
      {ballPos && (
        <div
          className="absolute bottom-3 animate-bounce z-40"
          style={{ right: `${ballPos.x}px` }}
        >
          <div className="w-4 h-4 rounded-full bg-[#facc15] border-2 border-black shadow-md flex items-center justify-center text-[8px] font-bold">
            🎾
          </div>
        </div>
      )}
    </div>
  );
};
