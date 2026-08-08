import {
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  TorusGeometry,
} from 'three';
import { addCylinder, addRoundedBox, createFasteners } from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import type { WorldConfig } from '../WorldConfig';

export interface RealityKey {
  id: string;
  root: Group;
  glow: MeshStandardMaterial;
  rings: Group[];
  update(time: number, held: boolean): void;
}

export function createRealityKey(materials: MaterialLibrary, config: WorldConfig): RealityKey {
  const root = new Group();
  root.name = 'persistent-object-chair-292-proxy';
  const housing = materials.paint({ color: 0x172126, roughness: 0.42, metalness: 0.76 });
  const rail = materials.edgeSteel;
  const glow = materials.emissive(config.accent, 3.6);
  const secondary = materials.emissive(config.secondary, 2.4);
  const rings: Group[] = [];

  const core = new Mesh(new IcosahedronGeometry(0.18, 2), glow);
  core.castShadow = true;
  root.add(core);
  const inner = new Mesh(new OctahedronGeometry(0.105, 1), secondary);
  inner.rotation.y = Math.PI * 0.25;
  root.add(inner);

  for (let index = 0; index < 3; index += 1) {
    const ring = new Group();
    const mesh = new Mesh(new TorusGeometry(0.27 + index * 0.045, 0.018, 8, 32), index === 1 ? rail : housing);
    mesh.castShadow = true;
    ring.add(mesh);
    ring.rotation.set(index * 0.67, index * 0.82, index * 0.38);
    root.add(ring);
    rings.push(ring);
  }

  for (const x of [-0.28, 0.28]) {
    for (const z of [-0.28, 0.28]) {
      addRoundedBox(root, [0.045, 0.58, 0.045], housing, { position: [x, 0, z], radius: 0.012 });
      addCylinder(root, 0.038, 0.08, rail, [x, -0.31, z], [0, 0, 0], 12);
      addCylinder(root, 0.038, 0.08, rail, [x, 0.31, z], [0, 0, 0], 12);
    }
  }
  addRoundedBox(root, [0.68, 0.065, 0.68], housing, { position: [0, -0.36, 0], radius: 0.045 });
  addRoundedBox(root, [0.54, 0.035, 0.54], rail, { position: [0, -0.32, 0], radius: 0.025 });
  root.add(createFasteners([[-0.25, -0.29, -0.25], [0.25, -0.29, -0.25], [-0.25, -0.29, 0.25], [0.25, -0.29, 0.25]], rail, 'up', 0.025));
  root.position.set(3.32, 0.4, 0.48);

  return {
    id: 'RELIC–292',
    root,
    glow,
    rings,
    update(time, held) {
      rings.forEach((ring, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        ring.rotation.z += direction * (held ? 0.018 : 0.008);
        ring.rotation.x += direction * 0.003;
      });
      glow.emissiveIntensity = 3.2 + Math.sin(time * 3.4) * 0.45 + (held ? 1.8 : 0);
      if (!held) root.position.y = 0.4 + Math.sin(time * 1.7) * 0.035;
    },
  };
}

