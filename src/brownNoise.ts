/**
 * Brown-like noise via leaky integrator + tanh limiting. Mutable state is explicit (`BrownNoiseState`).
 */
const LEAK = 0.99925;
const WHITE_SCALE = 1 - LEAK;

/** Scales integrator state before soft limiting. */
export const INTEGRATOR_SCALE = 5.5;

/** Peak fraction of Int16 full scale before limiting. */
export const DIGITAL_HEADROOM = 0.92;
export const MAX_SAMPLE = Math.floor(32767 * DIGITAL_HEADROOM);

export type BrownNoiseState = {
  brown: number;
};

export function createBrownNoiseState(): BrownNoiseState {
  return { brown: 0 };
}

/**
 * Fill `samples` with mono Int16 PCM. Updates `state.brown`.
 * @param random — inject for tests (default `Math.random`).
 */
export function fillPcmSamples(
  state: BrownNoiseState,
  samples: Int16Array,
  playbackVolume: number,
  random: () => number = Math.random
): void {
  for (let i = 0; i < samples.length; i++) {
    const white = (random() * 2 - 1) * WHITE_SCALE;
    state.brown = state.brown * LEAK + white;
    const w = Math.tanh(state.brown * INTEGRATOR_SCALE);
    const scaled = w * MAX_SAMPLE * playbackVolume;
    samples[i] = Math.round(scaled);
  }
}
