import {
  ACESFilmicToneMapping,
  Color,
  PCFShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import { MaterialLibrary } from '../art/MaterialLibrary';
import { AudioSystem } from '../core/AudioSystem';
import { HudController } from '../core/HudController';
import { InputController } from '../core/InputController';
import { PlayerController } from '../core/PlayerController';
import { QualityManager } from '../core/QualityManager';
import { RealityWorld, type InteractionKind, type WorldInteraction } from '../world/RealityWorld';
import { WORLD_CONFIGS } from '../world/WorldConfig';
import { createRealityKey, type RealityKey } from '../world/assemblies/RealityKey';
import { ROOM } from '../world/layout';

export class RecursiveRealityApp {
  private readonly viewport: HTMLElement;
  private readonly boot: HTMLElement;
  private readonly enterButton: HTMLButtonElement;
  private readonly renderer: WebGLRenderer;
  private readonly quality = new QualityManager();
  private readonly hud = new HudController();
  private readonly audio = new AudioSystem();
  private readonly timer = new Timer();
  private readonly camera = new PerspectiveCamera(67, window.innerWidth / window.innerHeight, 0.05, 70);
  private readonly input: InputController;
  private readonly worlds: RealityWorld[] = [];
  private readonly key: RealityKey;
  private readonly player: PlayerController;

  private activeWorldIndex = 0;
  private relicWorldIndex = 2;
  private relicHeld = false;
  private interaction: WorldInteraction | null = null;
  private started = false;
  private elapsed = 0;
  private frame = 0;
  private portalCooldown = 0;
  private pointerHintTimer = 9;

  private constructor(renderer: WebGLRenderer, materials: MaterialLibrary) {
    this.renderer = renderer;
    this.viewport = this.requireElement('viewport');
    this.boot = this.requireElement('boot');
    this.enterButton = this.requireElement<HTMLButtonElement>('enter');

    this.viewport.appendChild(renderer.domElement);
    this.quality.attach(renderer);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;

    const targetSamples = this.quality.profile.mobile ? 0 : 2;
    for (const config of WORLD_CONFIGS) {
      this.worlds.push(
        new RealityWorld(
          config,
          materials,
          this.quality.profile.portalResolution,
          targetSamples,
        ),
      );
    }
    this.worlds.forEach((world, index) => {
      const previous = this.worlds[(index - 1 + this.worlds.length) % this.worlds.length];
      const next = this.worlds[(index + 1) % this.worlds.length];
      if (!previous || !next) throw new Error('Recursive world ring is incomplete.');
      world.linkPortalTextures(previous, next);
    });

    const query = new URLSearchParams(window.location.search);
    const requestedWorld = Number.parseInt(query.get('world') ?? '0', 10);
    if (Number.isInteger(requestedWorld) && requestedWorld >= 0 && requestedWorld < this.worlds.length) {
      this.activeWorldIndex = requestedWorld;
    }
    const initialWorld = this.worlds[this.activeWorldIndex];
    const relicWorld = this.worlds[this.relicWorldIndex];
    if (!initialWorld || !relicWorld) throw new Error('Initial reality layers are unavailable.');
    this.player = new PlayerController(this.camera, initialWorld.collision);
    const spawn = query.get('spawn');
    if (spawn === 'terminal') {
      this.player.teleport(new Vector3(0, 0, -5.2));
    } else if (spawn === 'relay') {
      this.player.teleport(new Vector3(-4.75, 0, 2.25));
    } else if (spawn === 'printer') {
      this.player.teleport(new Vector3(4.75, 0, 3.65));
    } else if (spawn === 'fold') {
      this.player.teleport(new Vector3(5.25, 0, -2.25), -Math.PI * 0.5);
    } else if (spawn === 'relic' && this.activeWorldIndex === this.relicWorldIndex) {
      this.player.teleport(new Vector3(3.32, 0, 1.85));
    }
    this.input = new InputController(renderer.domElement);
    this.key = createRealityKey(materials, WORLD_CONFIGS[2]);
    relicWorld.scene.add(this.key.root);

    this.enterButton.addEventListener('click', this.start);
    window.addEventListener('resize', this.onResize);
    renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.timer.connect(document);
    renderer.setAnimationLoop(this.tick);
    this.syncHud();
  }

  static async create(): Promise<RecursiveRealityApp> {
    const viewport = document.getElementById('viewport');
    if (!viewport) throw new Error('Viewport element is unavailable.');
    const quality = new QualityManager();
    const renderer = new WebGLRenderer({
      antialias: !quality.profile.mobile,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    renderer.domElement.setAttribute('aria-label', 'Recursive Reality 3D viewport');

    const materials = new MaterialLibrary();
    const meter = document.getElementById('load-meter');
    const status = document.getElementById('load-status');
    await materials.load((loaded, total) => {
      const progress = total > 0 ? loaded / total : 0;
      if (meter) meter.style.width = `${Math.round(6 + progress * 84)}%`;
      if (status) status.textContent = `Loading calibrated PBR maps ${loaded}/${total}…`;
    });

    if (meter) meter.style.width = '92%';
    if (status) status.textContent = 'Assembling recursive world ring…';
    const app = new RecursiveRealityApp(renderer, materials);
    if (meter) meter.style.width = '100%';
    if (status) status.textContent = 'Three reality layers synchronized.';
    app.enterButton.disabled = false;
    return app;
  }

  private readonly start = async (): Promise<void> => {
    if (this.started) return;
    this.started = true;
    await this.audio.start();
    this.input.setEnabled(true);
    this.boot.classList.add('is-dismissed');
    this.hud.show();
    this.timer.reset();
    this.hud.announce('Observe the live monitor. Approach the console and unfold its boundary.', 5.5);

  };

  private readonly tick = (): void => {
    this.timer.update();
    const delta = Math.min(0.05, Math.max(0.001, this.timer.getDelta()));
    this.elapsed += delta;
    this.frame += 1;
    this.portalCooldown = Math.max(0, this.portalCooldown - delta);

    if (this.started) {
      this.updatePlayer(delta);
      this.updateInteraction();
      this.updateRelic(delta);
      this.checkPortalCrossing();
      this.hud.update(delta);
      this.quality.sample(delta);
      this.pointerHintTimer -= delta;
      if (this.pointerHintTimer <= 0) {
        const hint = document.getElementById('desktop-hint');
        if (hint) hint.style.opacity = '0';
      }
    }

    for (const world of this.worlds) world.update(delta, this.elapsed);
    this.updatePortalCameras();
    this.render();
  };

  private updatePlayer(delta: number): void {
    const world = this.currentWorld();
    this.player.setCollisionSystem(world.collision);
    this.input.update();
    this.player.update(delta, this.input);
  }

  private updateInteraction(): void {
    const world = this.currentWorld();
    const relicPosition = !this.relicHeld && this.relicWorldIndex === this.activeWorldIndex
      ? this.key.root.position
      : null;
    this.interaction = world.getInteraction(this.player.position, {
      relicPosition,
      relicHeld: this.relicHeld,
    });
    this.hud.setAction(this.interaction?.label ?? null);

    if (this.input.consumeInteract() && this.interaction) {
      this.performInteraction(this.interaction.kind);
    }
  }

  private performInteraction(kind: InteractionKind): void {
    const world = this.currentWorld();
    this.audio.interact();

    if (kind === 'relic') {
      this.relicHeld = true;
      this.key.root.scale.multiplyScalar(0.8);
      this.hud.announce('RELIC–292 acquired. Object identity will persist across reality levels.', 4.2);
      return;
    }
    if (kind === 'drop') {
      this.dropRelic();
      return;
    }
    if (kind === 'enter') {
      this.transferReality('forward');
      return;
    }
    if (kind === 'return') {
      this.transferReality('backward');
      return;
    }

    const message = world.performLocalInteraction(kind);
    if (kind === 'relay') {
      const outerIndex = (this.activeWorldIndex - 1 + this.worlds.length) % this.worlds.length;
      const outerWorld = this.worlds[outerIndex];
      if (outerWorld) outerWorld.causalityActive = world.relay.active;
    }
    if (message) this.hud.announce(message, 4);
  }

  private updateRelic(delta: number): void {
    this.key.update(this.elapsed, this.relicHeld);
    if (!this.relicHeld) return;

    const direction = new Vector3();
    this.camera.getWorldDirection(direction);
    const target = this.camera.position.clone()
      .addScaledVector(direction, 1.05)
      .add(new Vector3(0, -0.32, 0));
    this.key.root.position.lerp(target, 1 - Math.exp(-delta * 13));
    this.key.root.rotation.y = MathUtilsAngle(this.player.yaw + Math.PI * 0.15);
    this.key.root.rotation.x = Math.sin(this.elapsed * 1.9) * 0.07;
  }

  private dropRelic(): void {
    const forward = this.player.getFacingDirection();
    this.key.root.position.copy(this.player.position).addScaledVector(forward, 1.05);
    this.key.root.position.y = 0.4;
    this.relicHeld = false;
    this.relicWorldIndex = this.activeWorldIndex;
    this.hud.announce(`RELIC–292 registered to ${this.currentWorld().config.name}.`, 3);
  }

  private checkPortalCrossing(): void {
    if (this.portalCooldown > 0 || Math.abs(this.player.position.x) > ROOM.portalWidth * 0.5 - this.player.radius) return;
    const world = this.currentWorld();
    if (this.player.position.z < -ROOM.portalPlaneZ + 0.02 && world.forwardTerminal.isOpen()) {
      this.transferReality('forward');
    } else if (this.player.position.z > ROOM.portalPlaneZ - 0.02 && world.returnTerminal.isOpen()) {
      this.transferReality('backward');
    }
  }

  private transferReality(direction: 'forward' | 'backward'): void {
    const source = this.currentWorld();
    const destinationIndex = direction === 'forward'
      ? (this.activeWorldIndex + 1) % this.worlds.length
      : (this.activeWorldIndex - 1 + this.worlds.length) % this.worlds.length;
    const destination = this.worlds[destinationIndex];
    if (!destination) return;

    const transferRatio = source.config.transferScale / destination.config.transferScale;
    this.activeWorldIndex = destinationIndex;
    const arrivalZ = direction === 'forward' ? ROOM.portalPlaneZ - 0.72 : -ROOM.portalPlaneZ + 0.72;
    this.player.teleport(new Vector3(this.player.position.x * 0.82, 0, arrivalZ));
    this.player.setCollisionSystem(destination.collision);
    this.portalCooldown = 0.72;
    this.audio.portal();
    this.audio.setWorld(destinationIndex);

    if (this.relicHeld) {
      source.scene.remove(this.key.root);
      destination.scene.add(this.key.root);
      this.relicWorldIndex = destinationIndex;
      const nextScale = Math.min(2.2, Math.max(0.42, this.key.root.scale.x * transferRatio));
      this.key.root.scale.setScalar(nextScale);
    }

    this.syncHud();
    const sizeText = this.relicHeld
      ? ` RELIC–292 rescaled to ${Math.round(this.key.root.scale.x * 100)}%.`
      : '';
    this.hud.announce(
      `${direction === 'forward' ? 'Descended into' : 'Returned through'} ${destination.config.name}.${sizeText}`,
      4.4,
    );
    this.renderer.toneMappingExposure = 1.75;
    window.setTimeout(() => {
      this.renderer.toneMappingExposure = 1.05;
    }, 180);
  }

  private updatePortalCameras(): void {
    for (const world of this.worlds) world.updateCaptureViews(null, null, this.elapsed);
    const next = this.worlds[(this.activeWorldIndex + 1) % this.worlds.length];
    const previous = this.worlds[(this.activeWorldIndex - 1 + this.worlds.length) % this.worlds.length];
    next?.updateCaptureViews(this.player.position, 'north', this.elapsed);
    previous?.updateCaptureViews(this.player.position, 'south', this.elapsed);
  }

  private render(): void {
    const shouldRefreshPortals = this.frame % this.quality.profile.portalFrameInterval === 0;
    if (shouldRefreshPortals) {
      this.renderer.shadowMap.enabled = false;
      const renderSouth = Math.floor(this.frame / this.quality.profile.portalFrameInterval) % 2 === 0;
      for (const world of this.worlds) {
        this.renderer.setRenderTarget(renderSouth ? world.southTarget : world.northTarget);
        this.renderer.setClearColor(new Color(world.config.sky), 1);
        this.renderer.render(world.scene, renderSouth ? world.southCamera : world.northCamera);
      }
      this.renderer.shadowMap.enabled = true;
    }

    const active = this.currentWorld();
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(new Color(active.config.sky), 1);
    this.renderer.render(active.scene, this.camera);
  }

  private syncHud(): void {
    const config = this.currentWorld().config;
    this.hud.setWorld(config.name, config.rules, config.index, config.accentCss);
  }

  private currentWorld(): RealityWorld {
    const world = this.worlds[this.activeWorldIndex];
    if (!world) throw new Error(`Reality ${this.activeWorldIndex} is unavailable.`);
    return world;
  }

  private readonly onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    const fatal = document.getElementById('fatal');
    const detail = document.getElementById('fatal-detail');
    fatal?.classList.remove('is-hidden');
    if (detail) detail.textContent = 'Graphics context was lost. Reload to restore the reality ring.';
  };

  private requireElement<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing interface element #${id}`);
    return element as T;
  }
}

function MathUtilsAngle(value: number): number {
  const tau = Math.PI * 2;
  return ((value + Math.PI) % tau + tau) % tau - Math.PI;
}
