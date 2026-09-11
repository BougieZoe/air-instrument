import { ANALYSER_FFT_SIZE, ANALYSER_SMOOTHING } from "../config";

export class AudioAnalyser {
  private data: Uint8Array<ArrayBuffer>;

  constructor(private readonly analyser: AnalyserNode) {
    this.analyser.fftSize = ANALYSER_FFT_SIZE;
    this.analyser.smoothingTimeConstant = ANALYSER_SMOOTHING;
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  getLevel(): number {
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    for (let i = 0; i < this.data.length; i++) sum += this.data[i];
    return sum / this.data.length / 255;
  }
}
