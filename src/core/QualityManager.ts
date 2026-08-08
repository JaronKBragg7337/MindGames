import type { WebGLRenderer } from 'three';

export interface QualityProfile {
  mobile: boolean;
  pixelRatio: number;
  portalResolution: number;
  shadowResolution: number;
  portalFrameInterval: number;
}

export class QualityManager {
  readonly profile: QualityProfile;

  private renderer: WebGLRenderer | null = null;
  private elapsed = 0;
  private frames = 0;
  private cooldown = 0;

  constructor() {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
    const mobile = coarse || narrow;
    this.profile = {
      mobile,
      pixelRatio: Math.min(window.devicePixelRatio, mobile ? 1.35 : 1.8),
      portalResolution: mobile ? 320 : 512,
      shadowResolution: mobile ? 1024 : 1536,
      portalFrameInterval: mobile ? 2 : 1,
    };
  }

  attach(renderer: WebGLRenderer): void {
    this.renderer = renderer;
    renderer.setPixelRatio(this.profile.pixelRatio);
  }

  sample(delta: number): void {
    if (!this.renderer || document.hidden) return;
    this.elapsed += delta;
    this.frames += 1;
    this.cooldown = Math.max(0, this.cooldown - delta);

    if (this.elapsed < 2.5) return;
    const fps = this.frames / this.elapsed;
    this.elapsed = 0;
    this.frames = 0;

    if (fps < 38 && this.profile.pixelRatio > 0.82 && this.cooldown === 0) {
      this.profile.pixelRatio = Math.max(0.8, this.profile.pixelRatio - 0.15);
      this.renderer.setPixelRatio(this.profile.pixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.cooldown = 5;
    } else if (fps > 56 && this.profile.pixelRatio < Math.min(window.devicePixelRatio, 1.6) && this.cooldown === 0) {
      this.profile.pixelRatio = Math.min(1.6, this.profile.pixelRatio + 0.08);
      this.renderer.setPixelRatio(this.profile.pixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.cooldown = 7;
    }
  }
}

