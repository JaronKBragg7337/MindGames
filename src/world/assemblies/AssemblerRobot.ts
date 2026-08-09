import { Group, MathUtils, MeshStandardMaterial } from 'three';
import { addCylinder, addRoundedBox, createCable, createFasteners } from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import type { WorldConfig } from '../WorldConfig';

export interface AssemblerRobot {
  root: Group;
  glow: MeshStandardMaterial;
  update(time: number, walkStrength: number, wakeProgress: number): void;
}

/** A 0.78m service robot assembled around visible pivots and replaceable plates. */
export function createAssemblerRobot(
  materials: MaterialLibrary,
  config: WorldConfig,
): AssemblerRobot {
  const root = new Group();
  root.name = 'fabricated-robot-unit-r01';

  const shell = materials.paint({
    color: config.index === 0 ? 0xc2c8c9 : 0x9da5a2,
    roughness: 0.58,
    metalness: 0.48,
    clearcoat: 0.1,
  });
  const armor = materials.paint({
    color: config.index === 1 ? 0x5b254f : 0x26363b,
    roughness: 0.49,
    metalness: 0.62,
  });
  const dark = materials.darkSteel;
  const rail = materials.edgeSteel;
  const glow = materials.emissive(config.accent, 3.4);
  const secondary = materials.emissive(config.secondary, 2.6);

  const pelvis = new Group();
  pelvis.position.y = 0.37;
  root.add(pelvis);
  addRoundedBox(pelvis, [0.31, 0.13, 0.2], armor, { radius: 0.032, name: 'robot-pelvis' });
  addCylinder(pelvis, 0.052, 0.36, rail, [0, 0, 0], [0, 0, Math.PI * 0.5], 14);

  const legs: Group[] = [];
  for (const [index, x] of [-0.115, 0.115].entries()) {
    const leg = new Group();
    leg.name = `robot-leg-${index}`;
    leg.position.set(x, -0.03, 0);
    pelvis.add(leg);
    addRoundedBox(leg, [0.085, 0.17, 0.09], shell, {
      position: [0, -0.085, 0],
      radius: 0.021,
    });
    addCylinder(leg, 0.05, 0.105, dark, [0, -0.18, 0], [0, 0, Math.PI * 0.5], 14);
    addRoundedBox(leg, [0.075, 0.16, 0.075], armor, {
      position: [0, -0.27, 0],
      radius: 0.018,
    });
    addRoundedBox(leg, [0.15, 0.065, 0.23], shell, {
      position: [0, -0.355, 0.045],
      radius: 0.025,
      name: 'robot-foot',
    });
    addRoundedBox(leg, [0.09, 0.018, 0.16], materials.rubber, {
      position: [0, -0.392, 0.055],
      radius: 0.008,
    });
    legs.push(leg);
  }

  const torso = new Group();
  torso.position.y = 0.54;
  root.add(torso);
  addRoundedBox(torso, [0.39, 0.27, 0.23], armor, { radius: 0.048, name: 'robot-torso-frame' });
  addRoundedBox(torso, [0.31, 0.19, 0.035], shell, {
    position: [0, 0.01, 0.133],
    radius: 0.025,
    name: 'robot-removable-chest-plate',
  });
  addRoundedBox(torso, [0.18, 0.065, 0.018], glow, {
    position: [0, 0.025, 0.155],
    radius: 0.013,
    castShadow: false,
  });
  torso.add(createFasteners([
    [-0.12, -0.055, 0.158],
    [0.12, -0.055, 0.158],
    [-0.12, 0.08, 0.158],
    [0.12, 0.08, 0.158],
  ], rail, 'front', 0.012));

  const arms: Group[] = [];
  for (const [index, side] of [-1, 1].entries()) {
    const arm = new Group();
    arm.name = `robot-arm-${index}`;
    arm.position.set(side * 0.245, 0.08, 0);
    torso.add(arm);
    addCylinder(arm, 0.058, 0.09, dark, [0, 0, 0], [0, 0, Math.PI * 0.5], 14);
    addRoundedBox(arm, [0.085, 0.18, 0.085], shell, {
      position: [0, -0.105, 0],
      radius: 0.023,
    });
    addCylinder(arm, 0.046, 0.09, rail, [0, -0.21, 0], [0, 0, Math.PI * 0.5], 14);
    addRoundedBox(arm, [0.07, 0.17, 0.07], armor, {
      position: [0, -0.3, 0],
      radius: 0.019,
    });
    addRoundedBox(arm, [0.09, 0.08, 0.1], dark, {
      position: [0, -0.405, 0.02],
      radius: 0.025,
    });
    arms.push(arm);
  }

  const neck = new Group();
  neck.position.set(0, 0.7, 0);
  root.add(neck);
  addCylinder(neck, 0.055, 0.08, rail, [0, 0, 0], [0, 0, 0], 14);
  const head = new Group();
  head.position.y = 0.075;
  neck.add(head);
  addRoundedBox(head, [0.27, 0.17, 0.21], shell, { radius: 0.046, name: 'robot-sensor-head' });
  addRoundedBox(head, [0.215, 0.085, 0.026], dark, {
    position: [0, 0, 0.117],
    radius: 0.016,
  });
  for (const x of [-0.064, 0.064]) {
    addCylinder(head, 0.025, 0.03, glow, [x, 0.008, 0.137], [Math.PI * 0.5, 0, 0], 12);
  }
  addCylinder(head, 0.018, 0.14, rail, [0, 0.155, 0], [0, 0, 0], 10);
  addCylinder(head, 0.036, 0.035, secondary, [0, 0.24, 0], [0, 0, 0], 12);
  head.add(createCable([
    [-0.09, -0.04, -0.1],
    [-0.05, -0.1, -0.13],
    [0.02, -0.13, -0.12],
    [0.08, -0.1, -0.08],
  ], 0.009, materials.rubber));

  return {
    root,
    glow,
    update(time, walkStrength, wakeProgress) {
      const walk = MathUtils.clamp(walkStrength, 0, 1);
      const wake = MathUtils.clamp(wakeProgress, 0, 1);
      const stride = Math.sin(time * 7.2) * 0.46 * walk;
      legs[0]?.rotation.set(stride, 0, 0);
      legs[1]?.rotation.set(-stride, 0, 0);
      arms[0]?.rotation.set(-stride * 0.72, 0, 0.05);
      arms[1]?.rotation.set(stride * 0.72, 0, -0.05);
      head.rotation.y = Math.sin(time * 0.72) * 0.28 * wake;
      head.rotation.x = Math.sin(time * 1.1) * 0.035 * wake;
      torso.rotation.z = Math.sin(time * 7.2) * 0.025 * walk;
      glow.emissiveIntensity = 0.15 + wake * (3.5 + Math.sin(time * 4.8) * 0.55);
    },
  };
}
