import {
  Group,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Mesh,
  Vector3,
} from 'three';
import { addCylinder, addRoundedBox, createFasteners, createHazardStrip, createLabel } from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import type { WorldConfig } from '../WorldConfig';

export class CausalityRelay {
  readonly root = new Group();
  readonly rings: Group[] = [];
  active = false;

  private readonly glow: MeshStandardMaterial;
  private press = 0;

  constructor(parent: Object3D, materials: MaterialLibrary, config: WorldConfig) {
    this.root.name = 'cross-reality-causality-relay';
    this.root.position.set(-4.75, 0, 0.7);
    parent.add(this.root);

    const base = materials.textured('metal_plate', {
      repeat: [2.6, 2.6],
      normalStrength: 0.38,
      roughness: 0.84,
      metalness: 0.8,
      tint: 0xa5b1b3,
    });
    const housing = materials.paint({ color: 0x10191e, roughness: 0.58, metalness: 0.64 });
    const rail = materials.edgeSteel;
    this.glow = materials.emissive(config.accent, 2.8);

    addRoundedBox(this.root, [1.35, 0.2, 1.35], base, { position: [0, 0.1, 0], radius: 0.055 });
    addRoundedBox(this.root, [1.05, 1.04, 1.05], housing, { position: [0, 0.72, 0], radius: 0.095 });
    addRoundedBox(this.root, [0.7, 0.2, 0.72], base, {
      position: [0, 1.34, -0.08],
      rotation: [-0.22, 0, 0],
      radius: 0.055,
    });

    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
      const ring = new Group();
      const mesh = new Mesh(new TorusGeometry(0.32 + ringIndex * 0.1, 0.018, 8, 36), ringIndex === 1 ? rail : this.glow);
      mesh.castShadow = true;
      ring.add(mesh);
      ring.position.y = 1.82;
      ring.rotation.x = Math.PI * 0.5 + ringIndex * 0.38;
      ring.rotation.y = ringIndex * 0.62;
      this.root.add(ring);
      this.rings.push(ring);
    }
    addCylinder(this.root, 0.12, 0.8, this.glow, [0, 1.82, 0], [0, 0, 0], 20);
    addCylinder(this.root, 0.16, 0.09, this.glow, [0, 1.44, 0.08], [-0.22, 0, 0], 24);
    addCylinder(this.root, 0.24, 0.1, housing, [0, 1.39, 0.1], [-0.22, 0, 0], 24);

    this.root.add(createFasteners([[-0.42, 1.24, 0.4], [0.42, 1.24, 0.4], [-0.42, 0.28, 0.5], [0.42, 0.28, 0.5]], rail, 'front', 0.03));
    const label = createLabel('REALITY LINK', 1.0, 0.24, {
      accent: config.accent,
      subtext: 'INNER ACTION → OUTER LIGHTING',
    });
    label.position.set(0, 0.88, 0.536);
    this.root.add(label);
    const hazard = createHazardStrip(1.0, 0.09, config.secondary);
    hazard.position.set(0, 0.3, 0.54);
    this.root.add(hazard);
  }

  getInteractionPosition(target = new Vector3()): Vector3 {
    target.set(0, 1.35, 1.05);
    return this.root.localToWorld(target);
  }

  toggle(): boolean {
    this.active = !this.active;
    this.press = 1;
    return this.active;
  }

  update(delta: number, time: number): void {
    this.press = MathUtils.damp(this.press, 0, 5, delta);
    this.rings.forEach((ring, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      ring.rotation.z += delta * direction * (this.active ? 1.3 + index * 0.4 : 0.18);
      ring.scale.setScalar(1 + Math.sin(time * 2.4 + index) * 0.02 + this.press * 0.13);
    });
    this.glow.emissiveIntensity = (this.active ? 5.4 : 2.2) + this.press * 4 + Math.sin(time * 3.5) * 0.35;
  }
}

