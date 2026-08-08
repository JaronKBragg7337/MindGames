import {
  AdditiveBlending,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Texture,
  Vector3,
} from 'three';
import { addCylinder, addRoundedBox, createFasteners, createHazardStrip, createLabel } from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import type { WorldConfig } from '../WorldConfig';
import { ROOM } from '../layout';

export type PortalSide = 'north' | 'south';

export class PortalTerminal {
  readonly root = new Group();
  readonly screenMaterial: MeshBasicMaterial;
  readonly side: PortalSide;
  readonly destinationIndex: number;
  readonly hasConsole: boolean;
  targetOpen = 0;
  openAmount = 0;

  private readonly screenAssembly = new Group();
  private readonly leftConsole = new Group();
  private readonly rightConsole = new Group();
  private readonly keyboard = new Group();
  private readonly irisSegments: Group[] = [];
  private readonly glowMaterials: MeshStandardMaterial[] = [];
  private readonly closedScale = new Vector3(0.5, 0.36, 1);
  private readonly openScale = new Vector3(1, 1, 1);

  constructor(
    parent: Object3D,
    materials: MaterialLibrary,
    config: WorldConfig,
    side: PortalSide,
    destinationIndex: number,
    hasConsole: boolean,
  ) {
    this.side = side;
    this.destinationIndex = destinationIndex;
    this.hasConsole = hasConsole;
    this.root.name = `${side}-recursive-terminal`;
    this.root.position.z = side === 'north' ? -ROOM.portalPlaneZ : ROOM.portalPlaneZ;
    this.root.rotation.y = side === 'north' ? 0 : Math.PI;
    parent.add(this.root);

    this.screenMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      side: DoubleSide,
      toneMapped: false,
    });

    this.buildScreen(materials, config);
    if (hasConsole) this.buildConsole(materials, config);
    else {
      this.targetOpen = 1;
      this.openAmount = 1;
      this.screenAssembly.position.y = 1.45;
      this.screenAssembly.scale.copy(this.openScale);
    }
  }

  setTexture(texture: Texture): void {
    this.screenMaterial.map = texture;
    this.screenMaterial.needsUpdate = true;
  }

  arm(): boolean {
    if (this.targetOpen >= 1) return false;
    this.targetOpen = 1;
    return true;
  }

  isOpen(): boolean {
    return this.openAmount > 0.94;
  }

  getInteractionPosition(target = new Vector3()): Vector3 {
    target.set(0, 1.05, 2.25);
    return this.root.localToWorld(target);
  }

  update(delta: number, time: number): void {
    this.openAmount = MathUtils.damp(this.openAmount, this.targetOpen, 3.4, delta);
    const smooth = this.openAmount * this.openAmount * (3 - 2 * this.openAmount);
    this.screenAssembly.scale.lerpVectors(this.closedScale, this.openScale, smooth);
    this.screenAssembly.position.y = MathUtils.lerp(1.76, 1.45, smooth);
    this.leftConsole.position.x = -smooth * 1.2;
    this.rightConsole.position.x = smooth * 1.2;
    this.leftConsole.rotation.y = smooth * -0.08;
    this.rightConsole.rotation.y = smooth * 0.08;
    this.keyboard.position.y = -smooth * 1.05;
    this.keyboard.rotation.x = smooth * Math.PI * 0.47;
    this.keyboard.scale.setScalar(1 - smooth * 0.3);

    this.irisSegments.forEach((segment, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      segment.rotation.z = direction * smooth * 0.22;
      segment.position.x = (index < 2 ? -1 : 1) * smooth * 0.12;
    });
    this.glowMaterials.forEach((material, index) => {
      material.emissiveIntensity = 2.1 + smooth * 2.9 + Math.sin(time * 4.2 + index) * 0.34;
    });
  }

  private buildScreen(materials: MaterialLibrary, config: WorldConfig): void {
    this.screenAssembly.name = 'transforming-monitor-aperture';
    this.screenAssembly.position.y = 1.76;
    this.screenAssembly.scale.copy(this.closedScale);
    this.root.add(this.screenAssembly);

    const housing = materials.paint({ color: 0x111a20, roughness: 0.48, metalness: 0.78 });
    const wornEdge = materials.textured('metal_plate', {
      repeat: [2.3, 0.28],
      normalStrength: 0.42,
      roughness: 0.82,
      metalness: 0.9,
      tint: 0xbcc8cc,
    });
    const glow = materials.emissive(config.accent, 3.1);
    const secondaryGlow = materials.emissive(config.secondary, 2.4);
    this.glowMaterials.push(glow, secondaryGlow);

    addRoundedBox(this.screenAssembly, [3.5, 2.92, 0.24], housing, {
      position: [0, 0, -0.09],
      radius: 0.12,
      name: 'monitor-rear-housing',
    });
    addRoundedBox(this.screenAssembly, [3.34, 2.76, 0.16], wornEdge, {
      position: [0, 0, 0.01],
      radius: 0.08,
      name: 'monitor-metal-bezel',
    });
    addRoundedBox(this.screenAssembly, [3.16, 2.58, 0.13], housing, {
      position: [0, 0, 0.08],
      radius: 0.055,
      name: 'monitor-inner-bezel',
    });

    const screen = new Mesh(new PlaneGeometry(3.04, 2.46), this.screenMaterial);
    screen.position.z = 0.155;
    screen.name = 'live-world-surface';
    this.screenAssembly.add(screen);

    const glassMaterial = materials.glass.clone();
    glassMaterial.opacity = 0.16;
    const glass = new Mesh(new PlaneGeometry(3.02, 2.44), glassMaterial);
    glass.position.z = 0.17;
    this.screenAssembly.add(glass);

    for (const x of [-1.61, 1.61]) {
      addRoundedBox(this.screenAssembly, [0.045, 2.42, 0.035], glow, {
        position: [x, 0, 0.19],
        radius: 0.02,
        castShadow: false,
      });
    }
    for (const y of [-1.31, 1.31]) {
      addRoundedBox(this.screenAssembly, [3.1, 0.045, 0.035], glow, {
        position: [0, y, 0.19],
        radius: 0.02,
        castShadow: false,
      });
    }

    const corners: readonly (readonly [number, number, number])[] = [
      [-1.64, -1.35, 0.18], [1.64, -1.35, 0.18], [-1.64, 1.35, 0.18], [1.64, 1.35, 0.18],
    ];
    this.screenAssembly.add(createFasteners(corners, materials.edgeSteel, 'front', 0.038));

    for (const side of [-1, 1]) {
      const iris = new Group();
      iris.position.x = side * 1.82;
      addRoundedBox(iris, [0.22, 1.72, 0.18], housing, { radius: 0.055 });
      for (let y = -0.65; y <= 0.65; y += 0.26) {
        addRoundedBox(iris, [0.25, 0.06, 0.075], wornEdge, { position: [0, y, 0.1], radius: 0.01 });
      }
      this.screenAssembly.add(iris);
      this.irisSegments.push(iris);
    }
    for (const side of [-1, 1]) {
      const iris = new Group();
      iris.position.y = side * 1.54;
      addRoundedBox(iris, [1.9, 0.16, 0.18], housing, { radius: 0.055 });
      for (let x = -0.72; x <= 0.72; x += 0.24) {
        addRoundedBox(iris, [0.055, 0.19, 0.075], wornEdge, { position: [x, 0, 0.1], radius: 0.01 });
      }
      this.screenAssembly.add(iris);
      this.irisSegments.push(iris);
    }

    const status = createLabel(`LIVE / W-${String(this.destinationIndex).padStart(2, '0')}`, 1.22, 0.22, {
      accent: config.accent,
      subtext: 'RENDER TARGET SYNCHRONIZED',
    });
    status.position.set(-1.08, 1.62, 0.11);
    this.screenAssembly.add(status);

    const depthMarker = createLabel('NOT A VIDEO', 0.94, 0.2, {
      accent: config.secondary,
      subtext: 'SPATIAL BOUNDARY',
    });
    depthMarker.position.set(1.22, -1.61, 0.11);
    this.screenAssembly.add(depthMarker);

    const halo = new Mesh(
      new PlaneGeometry(3.55, 2.97),
      new MeshBasicMaterial({
        color: config.accent,
        transparent: true,
        opacity: 0.035,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    );
    halo.position.z = 0.21;
    this.screenAssembly.add(halo);
  }

  private buildConsole(materials: MaterialLibrary, config: WorldConfig): void {
    const cabinetMaterial = materials.textured('metal_plate', {
      repeat: [2.5, 2.2],
      normalStrength: 0.38,
      roughness: 0.8,
      metalness: 0.78,
      tint: 0x9ba7aa,
    });
    const dark = materials.paint({ color: 0x10181d, roughness: 0.62, metalness: 0.57 });
    const rail = materials.edgeSteel;
    const wood = materials.textured('wood_table_worn', {
      repeat: [7.6, 2.2],
      normalStrength: 0.42,
      roughness: 0.78,
      metalness: 0.01,
      tint: config.index === 1 ? 0xbaa7b4 : 0xc3b8a6,
    });
    const keyMaterial = materials.paint({ color: 0x192328, roughness: 0.68, metalness: 0.35 });
    const activeKey = materials.emissive(config.accent, 2.2);

    for (const [group, side] of [[this.leftConsole, -1], [this.rightConsole, 1]] as const) {
      group.position.set(0, 0, 1.22);
      addRoundedBox(group, [1.42, 0.24, 1.45], cabinetMaterial, {
        position: [side * 1.76, 0.12, 0],
        radius: 0.04,
      });
      addRoundedBox(group, [1.34, 0.9, 1.12], dark, {
        position: [side * 1.76, 0.69, 0],
        radius: 0.055,
      });
      addRoundedBox(group, [1.54, 0.12, 1.58], wood, {
        position: [side * 1.76, 1.2, 0],
        radius: 0.035,
      });
      for (let drawer = 0; drawer < 3; drawer += 1) {
        addRoundedBox(group, [1.1, 0.19, 0.06], cabinetMaterial, {
          position: [side * 1.76, 0.46 + drawer * 0.23, 0.57],
          radius: 0.018,
        });
        addRoundedBox(group, [0.42, 0.035, 0.07], rail, {
          position: [side * 1.76, 0.46 + drawer * 0.23, 0.62],
          radius: 0.014,
        });
      }
      for (const z of [-0.48, 0.48]) {
        addCylinder(group, 0.07, 0.09, materials.rubber, [side * 2.22, 0.04, z], [0, 0, 0], 16);
        addCylinder(group, 0.07, 0.09, materials.rubber, [side * 1.3, 0.04, z], [0, 0, 0], 16);
      }
      this.root.add(group);
    }

    this.keyboard.position.set(0, 0, 2.18);
    addRoundedBox(this.keyboard, [2.05, 0.11, 0.72], dark, { position: [0, 1.22, -0.72], radius: 0.045 });
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 12; column += 1) {
        const material = row === 0 && (column === 1 || column === 10) ? activeKey : keyMaterial;
        addRoundedBox(this.keyboard, [0.115, 0.045, 0.105], material, {
          position: [-0.73 + column * 0.134, 1.3, -0.95 + row * 0.13],
          rotation: [-0.12, 0, 0],
          radius: 0.012,
        });
      }
    }
    addRoundedBox(this.keyboard, [0.62, 0.045, 0.105], keyMaterial, {
      position: [0, 1.3, -0.43],
      rotation: [-0.12, 0, 0],
      radius: 0.012,
    });
    this.root.add(this.keyboard);

    const hazard = createHazardStrip(4.75, 0.12, config.secondary);
    hazard.position.set(0, 0.25, 2.0);
    this.root.add(hazard);

    const pedestalLabel = createLabel('RECURSION CONSOLE', 1.12, 0.21, {
      accent: config.accent,
      subtext: 'PRESS USE TO UNFOLD APERTURE',
    });
    pedestalLabel.position.set(0, 0.72, 1.955);
    this.root.add(pedestalLabel);

    addCylinder(this.root, 0.095, 0.065, activeKey, [0, 1.02, 2.0], [Math.PI * 0.5, 0, 0], 24);
    addCylinder(this.root, 0.15, 0.085, dark, [0, 1.02, 1.96], [Math.PI * 0.5, 0, 0], 24);
  }
}
