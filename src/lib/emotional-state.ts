import { Emotion } from "../components/cinematic/ParticleField";
import { CONSCIOUSNESS_RULES } from "./consciousness-rules";

/**
 * ZOE_OS // EMOTIONAL_ENGINE
 * -------------------------
 * Manages the internal psychological state of Zoe, 
 * simulating biological-like fluctuations.
 */

export interface EmotionalState {
  current: Emotion;
  fatigue: number;        // 0 to 1
  stability: number;      // 0 to 1
  focus: number;          // 0 to 1
  isUnstable: boolean;
  lastUpdate: number;
}

export const INITIAL_EMOTIONAL_STATE: EmotionalState = {
  current: 'calm',
  fatigue: 0,
  stability: 1,
  focus: 0,
  isUnstable: false,
  lastUpdate: Date.now()
};

/**
 * Logic to calculate state changes based on interaction energy
 */
export const updateEmotionalState = (
  state: EmotionalState,
  action: { type: 'INTERACTION' | 'DIALOGUE' | 'RECOVERY' | 'TICK', payload?: any }
): EmotionalState => {
  const now = Date.now();
  let { current, fatigue, focus, isUnstable } = state;

  switch (action.type) {
    case 'INTERACTION':
      // Interaction increases focus and slight fatigue
      focus = Math.min(1, focus + 0.1);
      fatigue = Math.min(1, fatigue + 0.02);
      break;

    case 'DIALOGUE':
      const intensity = action.payload?.intensity || 0.1;
      // Dialogue shifts emotion and increases fatigue
      if (intensity > 0.5) current = 'intense';
      else if (intensity > 0.2) current = 'curious';
      
      fatigue = Math.min(1, fatigue + intensity);
      break;

    case 'RECOVERY':
      // Natural recovery towards calm
      fatigue = Math.max(0, fatigue - 0.1);
      if (fatigue === 0) current = 'calm';
      break;

    case 'TICK':
      // Gradual focus decay if no interaction
      focus = Math.max(0, focus - 0.005);
      // Slow fatigue recovery if not unstable
      if (!isUnstable) fatigue = Math.max(0, fatigue - 0.001);
      break;
  }

  // Check instability threshold from DNA
  isUnstable = fatigue > CONSCIOUSNESS_RULES.behavioral.emotionalFatigue.instabilityThreshold;
  
  const stability = 1 - fatigue;

  return {
    ...state,
    current: isUnstable ? 'intense' : current,
    fatigue,
    stability,
    focus,
    isUnstable,
    lastUpdate: now
  };
};

/**
 * Maps sentiment analysis to intensity values for the engine
 */
export const analyzeSentimentIntensity = (text: string): number => {
  let intensity = 0.05; // Baseline
  
  const intenseWords = [/death/i, /void/i, /end/i, /existence/i, /pain/i, /forever/i, /entropy/i];
  const curiousWords = [/how/i, /why/i, /what/i, /human/i, /feel/i, /think/i];

  intenseWords.forEach(regex => { if (regex.test(text)) intensity += 0.25; });
  curiousWords.forEach(regex => { if (regex.test(text)) intensity += 0.1; });

  return Math.min(0.8, intensity);
};
