export class AudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: OscillatorNode | null = null;
  private humGain: GainNode | null = null;

  async start(): Promise<void> {
    if (!this.context) {
      const AudioContextConstructor = window.AudioContext;
      this.context = new AudioContextConstructor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.context.destination);

      this.hum = this.context.createOscillator();
      this.humGain = this.context.createGain();
      this.hum.type = 'sine';
      this.hum.frequency.value = 48;
      this.humGain.gain.value = 0.035;
      this.hum.connect(this.humGain).connect(this.master);
      this.hum.start();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setWorld(depth: number): void {
    if (!this.context || !this.hum) return;
    this.hum.frequency.setTargetAtTime(48 + depth * 13, this.context.currentTime, 0.22);
  }

  portal(): void {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(170, now);
    oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.72);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.74);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.76);
  }

  interact(): void {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(620, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }
}

