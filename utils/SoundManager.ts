
// Procedural Audio System to avoid external assets and ensure fast loading
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private sfxVolume: number = 0.5;

  constructor() {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  public init() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(master: number, sfx: number) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number = 1, slideTo: number | null = null) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    const finalVol = vol * this.masterVolume * this.sfxVolume;
    gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, vol: number = 1) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    
    // Lowpass filter to make it sound like an explosion/impact
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const finalVol = vol * this.masterVolume * this.sfxVolume;
    gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  // --- PUBLIC SFX METHODS ---

  public playShoot(type: 'pistol' | 'sniper' | 'laser' | 'shotgun') {
    if (type === 'pistol') this.playTone(600, 'square', 0.1, 0.3, 300);
    else if (type === 'sniper') this.playTone(150, 'sawtooth', 0.4, 0.5, 50);
    else if (type === 'laser') this.playTone(800, 'sine', 0.15, 0.2, 100);
    else if (type === 'shotgun') {
        this.playNoise(0.2, 0.4);
        this.playTone(200, 'sawtooth', 0.2, 0.3, 50);
    }
  }

  public playHit() {
    this.playTone(200, 'square', 0.1, 0.3, 100);
  }

  public playKill() {
    this.playTone(440, 'sine', 0.1, 0.4);
    setTimeout(() => this.playTone(554, 'sine', 0.1, 0.4), 100);
    setTimeout(() => this.playTone(659, 'sine', 0.2, 0.4), 200);
  }

  public playExplosion() {
    this.playNoise(0.5, 0.6);
    this.playTone(100, 'sawtooth', 0.4, 0.5, 10);
  }

  public playStep() {
    this.playNoise(0.05, 0.1);
  }

  public playClick() {
    this.playTone(800, 'sine', 0.05, 0.1);
  }
}

export const sfx = new SoundManager();
