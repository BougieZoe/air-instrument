import { useEffect, useRef, useCallback } from 'react';
import { Emotion } from '../components/cinematic/ParticleField';

export const useAmbientAudio = (emotion: Emotion) => {
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillators = useRef<OscillatorNode[]>([]);
  const gainNodes = useRef<GainNode[]>([]);
  const initialized = useRef(false);

  const init = useCallback(() => {
    if (initialized.current) return;
    
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a base "Void" drone - 3 low oscillators
    const freqs = [55, 110, 165]; // Low A and its harmonics
    
    freqs.forEach((freq, i) => {
      const osc = audioCtx.current!.createOscillator();
      const gain = audioCtx.current!.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.current!.currentTime);
      
      gain.gain.setValueAtTime(0, audioCtx.current!.currentTime);
      
      osc.connect(gain);
      gain.connect(audioCtx.current!.destination);
      
      osc.start();
      oscillators.current.push(osc);
      gainNodes.current.push(gain);
    });

    initialized.current = true;
  }, []);

  useEffect(() => {
    if (!initialized.current || !audioCtx.current) return;

    const ctx = audioCtx.current;
    const now = ctx.currentTime;

    // Adjust drone based on emotion
    gainNodes.current.forEach((gain, i) => {
      let targetGain = 0.02; // Very subtle base
      if (emotion === 'curious') targetGain = 0.04;
      if (emotion === 'intense') targetGain = 0.08;
      
      gain.gain.exponentialRampToValueAtTime(targetGain, now + 2);
    });

    oscillators.current.forEach((osc, i) => {
      const baseFreq = [55, 110, 165][i];
      let detune = 0;
      if (emotion === 'curious') detune = 5;
      if (emotion === 'intense') detune = 20;
      
      osc.detune.exponentialRampToValueAtTime(detune, now + 2);
    });
  }, [emotion]);

  const resume = useCallback(() => {
    if (audioCtx.current?.state === 'suspended') {
      audioCtx.current.resume();
    }
  }, []);

  return { init, resume };
};
