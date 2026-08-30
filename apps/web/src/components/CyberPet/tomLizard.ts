import { PetMood } from './CyberPetContext.tsx';

/**
 * Sprite sheet metadata for Tom Lizard.
 *
 * Mirrors public/pet/tom-lizard/pet.json. It is duplicated here rather than
 * fetched so the animator has the frame geometry on first paint — a fetch
 * would leave the pet blank for a frame or two on every mount.
 */

export const TOM_SHEET_URL = '/pet/tom-lizard/spritesheet.webp';

export const TOM_FRAME = { width: 192, height: 208 } as const;
export const TOM_SHEET = { columns: 8, rows: 9, width: 1536, height: 1872 } as const;
export const TOM_DEFAULT_SCALE = 0.8;

export interface SpriteAnimation {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
}

export type TomAnimationName =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review';

export const TOM_ANIMATIONS: Record<TomAnimationName, SpriteAnimation> = {
  idle:            { row: 0, frames: 6, fps: 6,  loop: true },
  'running-right': { row: 1, frames: 8, fps: 10, loop: true },
  'running-left':  { row: 2, frames: 8, fps: 10, loop: true },
  waving:          { row: 3, frames: 4, fps: 8,  loop: false },
  jumping:         { row: 4, frames: 5, fps: 10, loop: false },
  failed:          { row: 5, frames: 8, fps: 8,  loop: false },
  waiting:         { row: 6, frames: 6, fps: 6,  loop: true },
  running:         { row: 7, frames: 6, fps: 10, loop: true },
  review:          { row: 8, frames: 6, fps: 6,  loop: false }
};

/**
 * Mood → animation. Non-looping clips play once and the animator falls back
 * to `idle`, which reads as Tom reacting and then settling.
 */
export const MOOD_TO_ANIMATION: Record<PetMood, TomAnimationName> = {
  idle: 'idle',
  scanning: 'running',   // head-down, hunting through the queue
  alert: 'failed',       // something needs attention
  celebrate: 'jumping',
  thinking: 'waiting'
};

/** Greeting clip, used once when the pet first appears. */
export const TOM_GREETING: TomAnimationName = 'waving';
