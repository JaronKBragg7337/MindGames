import {
  HalfFloatType,
  MathUtils,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import { addCylinder, addRoundedBox, createLabel } from '../art/GeometryKit';
import type { MaterialLibrary } from '../art/MaterialLibrary';
import { CollisionSystem } from '../core/CollisionSystem';
import { WORLD_CONFIGS, type WorldConfig } from './WorldConfig';
import { CausalityRelay } from './assemblies/CausalityRelay';
import { FabricatorAssembly } from './assemblies/FabricatorAssembly';
import { PortalTerminal } from './assemblies/PortalTerminal';
import { buildRoom, type RoomAssembly } from './assemblies/RoomAssembly';
import { BASE_COLLIDERS, FABRICATION_LAYOUT, ROOM } from './layout';

export type InteractionKind = 'portal' | 'enter' | 'return' | 'relay' | 'printer' | 'fold' | 'relic' | 'drop';

export interface WorldInteraction {
  kind: InteractionKind;
  label: string;
  distance: number;
}

export interface InteractionContext {
  relicPosition: Vector3 | null;
  relicHeld: boolean;
}

export class RealityWorld {
  readonly config: WorldConfig;
  readonly scene = new Scene();
  readonly northCamera = new PerspectiveCamera(58, 3.04 / 2.46, 0.05, 48);
  readonly southCamera = new PerspectiveCamera(58, 3.04 / 2.46, 0.05, 48);
  readonly northTarget: WebGLRenderTarget;
  readonly southTarget: WebGLRenderTarget;
  readonly collision: CollisionSystem;
  readonly forwardTerminal: PortalTerminal;
  readonly returnTerminal: PortalTerminal;
  readonly relay: CausalityRelay;
  readonly fabricator: FabricatorAssembly;

  causalityActive = false;
  foldTarget = 0;
  foldAmount = 0;

  private readonly room: RoomAssembly;
  private readonly foldControlPosition = new Vector3(5.85, 1.25, -2.25);
  private readonly foldGlow: MeshStandardMaterial;
  private elapsed = 0;

  constructor(
    config: WorldConfig,
    materials: MaterialLibrary,
    portalResolution: number,
    renderTargetSamples: number,
  ) {
    this.config = config;
    this.scene.name = `reality-${config.index}-${config.name.toLowerCase().replaceAll(' ', '-')}`;
    this.room = buildRoom(this.scene, materials, config);

    const nextIndex = (config.index + 1) % WORLD_CONFIGS.length;
    const previousIndex = (config.index - 1 + WORLD_CONFIGS.length) % WORLD_CONFIGS.length;
    this.forwardTerminal = new PortalTerminal(this.scene, materials, config, 'north', nextIndex, true);
    this.returnTerminal = new PortalTerminal(this.scene, materials, config, 'south', previousIndex, false);
    this.relay = new CausalityRelay(this.scene, materials, config);
    this.fabricator = new FabricatorAssembly(this.scene, materials, config);
    this.foldGlow = this.buildFoldControl(materials);

    this.northTarget = this.createTarget(portalResolution, renderTargetSamples);
    this.southTarget = this.createTarget(portalResolution, renderTargetSamples);
    this.northCamera.position.set(0, 1.66, -7.9);
    this.northCamera.lookAt(0, 1.5, 0);
    this.southCamera.position.set(0, 1.66, 7.9);
    this.southCamera.lookAt(0, 1.5, 0);

    const portalThickness = 0.26;
    this.collision = new CollisionSystem([
      ...BASE_COLLIDERS,
      {
        id: 'portal.north.barrier',
        center: [0, 1.4, -ROOM.portalPlaneZ],
        size: [ROOM.portalWidth, ROOM.portalHeight, portalThickness],
        enabled: () => !this.forwardTerminal.isOpen(),
      },
      {
        id: 'portal.south.barrier',
        center: [0, 1.4, ROOM.portalPlaneZ],
        size: [ROOM.portalWidth, ROOM.portalHeight, portalThickness],
        enabled: () => !this.returnTerminal.isOpen(),
      },
      {
        id: 'printer.child-fabricator',
        center: FABRICATION_LAYOUT.childCenter,
        size: FABRICATION_LAYOUT.childSize,
        enabled: () => this.fabricator.isChildDeployed(),
      },
    ]);
  }

  linkPortalTextures(previous: RealityWorld, next: RealityWorld): void {
    this.forwardTerminal.setTexture(next.southTarget.texture);
    this.returnTerminal.setTexture(previous.northTarget.texture);
  }

  update(delta: number, globalTime: number): void {
    this.elapsed += delta * this.config.timeRate;
    this.foldAmount = MathUtils.damp(this.foldAmount, this.foldTarget, 2.2, delta);
    this.forwardTerminal.update(delta, globalTime);
    this.returnTerminal.update(delta, globalTime);
    this.relay.update(delta, globalTime * Math.min(5, this.config.timeRate));
    this.fabricator.update(delta, globalTime, this.config.timeRate);
    this.room.update(globalTime, this.foldAmount, this.causalityActive);
    this.foldGlow.emissiveIntensity = 2.4 + this.foldAmount * 3.2 + Math.sin(globalTime * 3.2) * 0.3;
    this.foldGlow.emissive.setHex(this.foldAmount > 0.5 ? this.config.secondary : this.config.accent);
  }

  updateCaptureViews(
    sourcePosition: Vector3 | null,
    sourceSide: 'north' | 'south' | null,
    time: number,
  ): void {
    const idleX = Math.sin(time * 0.13 + this.config.index) * 0.08;
    const idleY = Math.sin(time * 0.17 + this.config.index * 1.7) * 0.025;
    let offsetX = idleX;
    let offsetY = idleY;
    let offsetDepth = 0;
    if (sourcePosition && sourceSide) {
      offsetX = MathUtils.clamp(sourcePosition.x * 0.33, -1.1, 1.1);
      offsetY = MathUtils.clamp((sourcePosition.y + 1.68 - 1.45) * 0.25, -0.38, 0.5);
      const plane = sourceSide === 'north' ? -ROOM.portalPlaneZ : ROOM.portalPlaneZ;
      offsetDepth = MathUtils.clamp(Math.abs(sourcePosition.z - plane) * 0.08, 0, 0.38);
    }

    this.southCamera.position.set(offsetX, 1.66 + offsetY, 7.9 - offsetDepth);
    this.southCamera.lookAt(offsetX * 0.18, 1.48 + offsetY * 0.12, 0);
    this.northCamera.position.set(-offsetX, 1.66 + offsetY, -7.9 + offsetDepth);
    this.northCamera.lookAt(-offsetX * 0.18, 1.48 + offsetY * 0.12, 0);
  }

  getInteraction(playerPosition: Vector3, context: InteractionContext): WorldInteraction | null {
    const interactions: WorldInteraction[] = [];
    if (!this.forwardTerminal.isOpen()) {
      const distance = horizontalDistance(playerPosition, this.forwardTerminal.getInteractionPosition());
      if (distance < 2.55) interactions.push({ kind: 'portal', label: `UNFOLD WORLD ${this.forwardTerminal.destinationIndex}`, distance });
    } else {
      const distance = horizontalDistance(playerPosition, this.forwardTerminal.getInteractionPosition());
      if (distance < 2.25) interactions.push({ kind: 'enter', label: `STEP THROUGH WORLD ${this.forwardTerminal.destinationIndex}`, distance });
    }

    const returnDistance = horizontalDistance(playerPosition, this.returnTerminal.getInteractionPosition());
    if (this.returnTerminal.isOpen() && returnDistance < 2.05) {
      interactions.push({ kind: 'return', label: `RETURN TO WORLD ${this.returnTerminal.destinationIndex}`, distance: returnDistance });
    }

    const relayDistance = horizontalDistance(playerPosition, this.relay.getInteractionPosition());
    if (relayDistance < 1.65) {
      interactions.push({ kind: 'relay', label: this.relay.active ? 'DISCONNECT REALITY LINK' : 'LINK TO OUTER WORLD', distance: relayDistance });
    }

    const printerDistance = horizontalDistance(playerPosition, this.fabricator.getInteractionPosition());
    if (printerDistance < 1.7) {
      interactions.push({
        kind: 'printer',
        label: this.fabricator.getInteractionLabel(),
        distance: printerDistance,
      });
    }

    const foldDistance = horizontalDistance(playerPosition, this.foldControlPosition);
    if (foldDistance < 1.55) {
      interactions.push({ kind: 'fold', label: this.foldTarget > 0.5 ? 'UNFOLD ARCHITECTURE' : 'FOLD ARCHITECTURE', distance: foldDistance });
    }

    if (!context.relicHeld && context.relicPosition) {
      const relicDistance = horizontalDistance(playerPosition, context.relicPosition);
      if (relicDistance < 1.45) interactions.push({ kind: 'relic', label: 'PICK UP RELIC–292', distance: relicDistance });
    }
    if (context.relicHeld && interactions.length === 0) {
      interactions.push({ kind: 'drop', label: 'DROP RELIC–292', distance: 0 });
    }

    interactions.sort((a, b) => a.distance - b.distance);
    return interactions[0] ?? null;
  }

  performLocalInteraction(kind: InteractionKind): string | null {
    switch (kind) {
      case 'portal':
        if (this.forwardTerminal.arm()) return `Monitor aperture unfolding into World ${this.forwardTerminal.destinationIndex}.`;
        return null;
      case 'relay': {
        const active = this.relay.toggle();
        return active
          ? `Causality link established. World ${this.config.index} is modifying its apparent container.`
          : 'Causality link released.';
      }
      case 'printer':
        return this.fabricator.beginFabrication()
          ? 'Recursive fabrication started: parent printer → child printer → robot unit R–01.'
          : 'Fabrication chain is already running. Live worlds continue building when unobserved.';
      case 'fold':
        this.foldTarget = this.foldTarget > 0.5 ? 0 : 1;
        return this.foldTarget > 0.5
          ? 'Architectural hinges unlocked. Ceiling planes are becoming walls.'
          : 'Architectural frame returned to local Euclidean alignment.';
      default:
        return null;
    }
  }

  private createTarget(resolution: number, samples: number): WebGLRenderTarget {
    const target = new WebGLRenderTarget(resolution, Math.round(resolution / (3.04 / 2.46)), {
      type: HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.samples = samples;
    target.texture.colorSpace = 'srgb';
    return target;
  }

  private buildFoldControl(materials: MaterialLibrary): MeshStandardMaterial {
    const root = new Vector3(6.86, 1.55, -2.25);
    const housing = materials.paint({ color: 0x11191e, roughness: 0.58, metalness: 0.68 });
    const glow = materials.emissive(this.config.accent, 2.8);
    addRoundedBox(this.scene, [0.16, 1.35, 1.48], housing, { position: [root.x, root.y, root.z], radius: 0.07 });
    addRoundedBox(this.scene, [0.06, 0.68, 0.98], glow, { position: [6.76, 1.62, -2.25], radius: 0.035, castShadow: false });
    for (const z of [-2.57, -2.25, -1.93]) {
      addCylinder(this.scene, 0.08, 0.08, materials.edgeSteel, [6.72, 1.14, z], [0, 0, Math.PI * 0.5], 18);
    }
    const label = createLabel('FOLD', 0.72, 0.23, {
      accent: this.config.accent,
      subtext: 'ARTICULATED ARCHITECTURE',
      align: 'center',
    });
    label.position.set(6.7, 2.02, -2.25);
    label.rotation.y = -Math.PI * 0.5;
    this.scene.add(label);
    return glow;
  }
}

function horizontalDistance(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
