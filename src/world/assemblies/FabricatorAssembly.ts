import {
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
} from 'three';
import { addCylinder, addRoundedBox, createCable, createFasteners, createHazardStrip, createLabel } from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import type { WorldConfig } from '../WorldConfig';

export class FabricatorAssembly {
  readonly root = new Group();
  readonly printHead = new Group();

  private readonly statusMaterial: MeshStandardMaterial;
  private readonly buildCore: Group;
  private fabricationPulse = 0;

  constructor(parent: Object3D, materials: MaterialLibrary, config: WorldConfig) {
    this.root.name = 'world-printer-assembly';
    this.root.position.set(4.75, 0, 1.9);
    parent.add(this.root);

    const cabinet = materials.paint({ color: 0x182126, roughness: 0.55, metalness: 0.66 });
    const wornMetal = materials.textured('metal_plate', {
      repeat: [3.4, 3.8],
      normalStrength: 0.38,
      roughness: 0.82,
      metalness: 0.82,
      tint: 0xaab4b7,
    });
    const rail = materials.edgeSteel;
    const dark = materials.darkSteel;
    this.statusMaterial = materials.emissive(config.accent, 2.8);

    addRoundedBox(this.root, [1.9, 0.2, 2.2], wornMetal, { position: [0, 0.1, 0], radius: 0.055 });
    addRoundedBox(this.root, [1.65, 1.1, 1.9], cabinet, { position: [0, 0.75, 0], radius: 0.08 });
    addRoundedBox(this.root, [1.55, 0.16, 1.78], wornMetal, { position: [0, 1.36, 0], radius: 0.04 });

    for (let drawer = 0; drawer < 3; drawer += 1) {
      addRoundedBox(this.root, [1.27, 0.23, 0.08], dark, {
        position: [0, 0.42 + drawer * 0.29, 0.97],
        radius: 0.025,
      });
      addRoundedBox(this.root, [0.48, 0.035, 0.09], rail, {
        position: [0, 0.42 + drawer * 0.29, 1.03],
        radius: 0.014,
      });
    }

    const chamber = new Group();
    chamber.position.y = 1.42;
    this.root.add(chamber);
    for (const x of [-0.73, 0.73]) {
      for (const z of [-0.77, 0.77]) {
        addRoundedBox(chamber, [0.1, 1.5, 0.1], rail, { position: [x, 0.75, z], radius: 0.025 });
        addCylinder(chamber, 0.07, 0.055, dark, [x, 0.08, z], [0, 0, 0], 14);
      }
    }
    addRoundedBox(chamber, [1.55, 0.12, 1.65], wornMetal, { position: [0, 1.48, 0], radius: 0.045 });
    addRoundedBox(chamber, [1.44, 0.08, 1.52], dark, { position: [0, 0.06, 0], radius: 0.035 });

    const glassFront = new Mesh(new PlaneGeometry(1.35, 1.3), materials.glass);
    glassFront.position.set(0, 0.76, 0.825);
    chamber.add(glassFront);
    const glassBack = glassFront.clone();
    glassBack.position.z = -0.825;
    glassBack.rotation.y = Math.PI;
    chamber.add(glassBack);
    const glassSideLeft = new Mesh(new PlaneGeometry(1.35, 1.3), materials.glass);
    glassSideLeft.position.set(-0.775, 0.76, 0);
    glassSideLeft.rotation.y = Math.PI * 0.5;
    chamber.add(glassSideLeft);
    const glassSideRight = glassSideLeft.clone();
    glassSideRight.position.x = 0.775;
    glassSideRight.rotation.y = -Math.PI * 0.5;
    chamber.add(glassSideRight);

    const railX = addRoundedBox(chamber, [1.28, 0.075, 0.09], rail, { position: [0, 1.18, 0], radius: 0.016 });
    railX.castShadow = true;
    addRoundedBox(this.printHead, [0.26, 0.16, 0.3], dark, { radius: 0.035 });
    addCylinder(this.printHead, 0.055, 0.28, rail, [0, -0.21, 0], [0, 0, 0], 16);
    addCylinder(this.printHead, 0.024, 0.19, this.statusMaterial, [0, -0.43, 0], [0, 0, 0], 12);
    this.printHead.position.set(0, 1.08, 0);
    chamber.add(this.printHead);

    this.buildCore = new Group();
    this.buildCore.position.set(0, 0.16, 0);
    for (let layer = 0; layer < 8; layer += 1) {
      addRoundedBox(this.buildCore, [0.54 - layer * 0.025, 0.025, 0.54 - layer * 0.025], this.statusMaterial, {
        position: [0, layer * 0.035, 0],
        radius: 0.008,
        castShadow: false,
      });
    }
    chamber.add(this.buildCore);

    const control = new Group();
    control.position.set(0, 1.13, 1.06);
    control.rotation.x = -0.38;
    addRoundedBox(control, [1.3, 0.16, 0.52], cabinet, { radius: 0.055 });
    addRoundedBox(control, [0.68, 0.025, 0.3], this.statusMaterial, { position: [-0.18, 0.095, 0], radius: 0.02, castShadow: false });
    addCylinder(control, 0.105, 0.055, materials.emissive(config.secondary, 2.6), [0.43, 0.12, 0], [0, 0, 0], 20);
    const buttonFasteners = createFasteners([[-0.56, 0.1, -0.18], [-0.56, 0.1, 0.18], [0.56, 0.1, -0.18], [0.56, 0.1, 0.18]], rail, 'up', 0.025);
    control.add(buttonFasteners);
    this.root.add(control);

    const label = createLabel('WORLD PRINTER', 1.42, 0.28, {
      accent: config.accent,
      subtext: 'FABRICATES PERSISTENT OBJECT IDENTITY',
    });
    label.position.set(0, 0.85, 1.025);
    this.root.add(label);
    const hazard = createHazardStrip(1.52, 0.1, config.secondary);
    hazard.position.set(0, 1.48, 0.91);
    this.root.add(hazard);

    const cable = createCable([[0.55, 2.82, -0.58], [0.8, 3.23, -0.35], [0.7, 3.56, 0.1], [0.32, 3.55, 0.42], [0.06, 3.12, 0.12]], 0.026, materials.rubber);
    this.root.add(cable);
  }

  getInteractionPosition(target = new Vector3()): Vector3 {
    target.set(0, 1.2, 1.48);
    return this.root.localToWorld(target);
  }

  pulse(): void {
    this.fabricationPulse = 1;
  }

  update(delta: number, time: number, timeRate: number): void {
    const localTime = time * Math.min(timeRate, 18);
    this.printHead.position.x = Math.sin(localTime * 0.72) * 0.46;
    this.printHead.position.z = Math.cos(localTime * 0.51) * 0.38;
    this.fabricationPulse = MathUtils.damp(this.fabricationPulse, 0, 2.4, delta);
    const pulse = 1 + this.fabricationPulse * 0.48 + Math.sin(localTime * 2.2) * 0.035;
    this.buildCore.scale.set(pulse, 0.72 + pulse * 0.28, pulse);
    this.statusMaterial.emissiveIntensity = 2.6 + this.fabricationPulse * 5 + Math.sin(localTime * 3.1) * 0.4;
  }
}

