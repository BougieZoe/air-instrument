export const createGain = (context: AudioContext, value: number): GainNode => {
  const gain = context.createGain();
  gain.gain.value = value;
  return gain;
};
