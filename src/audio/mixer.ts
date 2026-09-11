export const createGain = (context: AudioContext, value: number) => {
  const gain = context.createGain();
  gain.gain.value = value;
  return gain;
};

export const dbToGain = (db: number) => Math.pow(10, db / 20);
