import React, { useEffect, useRef, useState } from 'react';
import {
  TOM_SHEET_URL,
  TOM_FRAME,
  TOM_SHEET,
  TOM_ANIMATIONS,
  TomAnimationName
} from './tomLizard.ts';

interface Props {
  animation: TomAnimationName;
  /** Rendered size relative to the 192×208 source frame. */
  scale?: number;
  /** Where to settle after a one-shot clip finishes. */
  fallback?: TomAnimationName;
  className?: string;
  title?: string;
}

/** Honours the OS "reduce motion" setting, and keeps honouring it if it changes. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Renders one row of the Tom Lizard sheet as a frame-stepped animation.
 *
 * Driven by requestAnimationFrame rather than a CSS keyframe so that
 * non-looping clips can hand control back when they finish.
 */
export const TomSprite: React.FC<Props> = ({
  animation,
  scale = 0.8,
  fallback = 'idle',
  className = '',
  title
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const [current, setCurrent] = useState<TomAnimationName>(animation);
  const [frame, setFrame] = useState(0);

  // Restart whenever the requested clip changes.
  useEffect(() => {
    setCurrent(animation);
    setFrame(0);
  }, [animation]);

  useEffect(() => {
    const clip = TOM_ANIMATIONS[current] ?? TOM_ANIMATIONS.idle;

    // Reduced motion: hold a single representative frame, no stepping at all.
    if (reducedMotion) {
      setFrame(0);
      return;
    }

    let raf = 0;
    let last = performance.now();
    let f = 0;
    const interval = 1000 / clip.fps;

    const tick = (now: number) => {
      if (now - last >= interval) {
        last = now;
        f += 1;

        if (f >= clip.frames) {
          if (clip.loop) {
            f = 0;
          } else {
            // One-shot finished — settle back without leaving a dangling frame.
            setFrame(clip.frames - 1);
            setCurrent(fallback);
            return;
          }
        }
        setFrame(f);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, fallback, reducedMotion]);

  const clip = TOM_ANIMATIONS[current] ?? TOM_ANIMATIONS.idle;
  const col = Math.min(frame, clip.frames - 1);

  return (
    <div
      className={className}
      title={title}
      style={{
        width: TOM_FRAME.width * scale,
        height: TOM_FRAME.height * scale,
        backgroundImage: `url(${TOM_SHEET_URL})`,
        // Scale the whole sheet so one cell fills the box exactly.
        backgroundSize: `${TOM_SHEET.width * scale}px ${TOM_SHEET.height * scale}px`,
        backgroundPosition: `-${col * TOM_FRAME.width * scale}px -${clip.row * TOM_FRAME.height * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'auto'
      }}
    />
  );
};
