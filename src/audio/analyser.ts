export class AudioAnalyser {
  private data: Uint8Array<ArrayBuffer>;

  constructor(private readonly analyser: AnalyserNode) {
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.82;
    this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  getLevel() {
    this.analyser.getByteFrequencyData(this.data);
    let sum = 0;
    for (let index = 0; index < this.data.length; index += 1) {
      sum += this.data[index];
    }
    return sum / this.data.length / 255;
  }
}
