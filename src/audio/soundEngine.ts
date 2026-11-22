import { AnimationConfig, SoundConfig } from '../types/vitrocash';

class VitroSoundEngine {
  private ctx: AudioContext | null = null;
  private lastScratchAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType,
    volume: number,
    delaySec = 0,
    endFreq?: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + durationSec);
    }
    gain.gain.setValueAtTime(Math.max(0.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  public triggerHaptic(anim: AnimationConfig, pattern: number | number[] = 15): void {
    if (!anim.hapticsEnabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    const mult = anim.hapticsIntensity === 'light' ? 0.6 : anim.hapticsIntensity === 'strong' ? 1.5 : 1;
    try {
      if (Array.isArray(pattern)) {
        navigator.vibrate(pattern.map((v) => Math.round(v * mult)));
      } else {
        navigator.vibrate(Math.round(pattern * mult));
      }
    } catch {
      // Ignore unsupported environments
    }
  }

  public playTap(sounds: SoundConfig): void {
    if (!sounds.masterEnabled) return;
    this.playTone(540, 0.045, 'sine', 0.08 * sounds.volume, 0, 380);
  }

  public playScratchTick(sounds: SoundConfig): void {
    if (!sounds.masterEnabled || !sounds.ticketsEnabled) return;
    const now = performance.now();
    if (now - this.lastScratchAt < 65) return;
    this.lastScratchAt = now;
    this.playTone(900 + Math.random() * 400, 0.03, 'triangle', 0.05 * sounds.volume);
  }

  public playWheelPeg(sounds: SoundConfig): void {
    if (!sounds.masterEnabled || !sounds.wheelEnabled) return;
    this.playTone(720, 0.035, 'triangle', 0.09 * sounds.volume, 0, 360);
  }

  public playSlotTick(sounds: SoundConfig): void {
    if (!sounds.masterEnabled || !sounds.slotsEnabled) return;
    this.playTone(320, 0.04, 'square', 0.05 * sounds.volume);
  }

  public playSlotReelStop(sounds: SoundConfig, reelIndex: number): void {
    if (!sounds.masterEnabled || !sounds.slotsEnabled) return;
    this.playTone(220 + reelIndex * 70, 0.09, 'triangle', 0.14 * sounds.volume, 0, 140);
  }

  public playLotteryPick(sounds: SoundConfig): void {
    if (!sounds.masterEnabled || !sounds.lotteryEnabled) return;
    this.playTone(620, 0.06, 'sine', 0.1 * sounds.volume, 0, 780);
  }

  public playWin(sounds: SoundConfig, isBig = false): void {
    if (!sounds.masterEnabled || !sounds.victoryEnabled) return;
    const v = 0.14 * sounds.volume;
    const notes = isBig ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.22, 'triangle', v, idx * 0.08);
    });
  }

  public playZero(sounds: SoundConfig, game: 'tickets' | 'wheel' | 'slots' | 'lottery'): void {
    if (!sounds.masterEnabled) return;
    const allowed =
      (game === 'tickets' && sounds.ticketsEnabled) ||
      (game === 'wheel' && sounds.wheelEnabled) ||
      (game === 'slots' && sounds.slotsEnabled) ||
      (game === 'lottery' && sounds.lotteryEnabled);
    if (!allowed) return;
    this.playTone(280, 0.14, 'sine', 0.08 * sounds.volume, 0, 190);
  }
}

export const soundEngine = new VitroSoundEngine();
