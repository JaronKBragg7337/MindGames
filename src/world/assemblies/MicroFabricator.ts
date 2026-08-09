import { Group, MathUtils, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import {
  addCylinder,
  addRoundedBox,
  addTSlotExtrusion,
  createCable,
  createFasteners,
  createHazardStrip,
  createLabel,
} from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import { mm, VORON_V0 } from '../fabricationSpecs';
import type { WorldConfig } from '../WorldConfig';

export interface MicroFabricator {
  root: Group;
  printHead: Group;
  glow: MeshStandardMaterial;
  setDoorOpen(amount: number): void;
  update(time: number, printLoad: number): void;
}

/**
 * A uniformly enlarged, game-authored interpretation of a Voron V0.2r1.
 * Every dimension below originates from the official drawing scale rather
 * than being independently eyeballed. The geometry itself is original.
 */
export function createMicroFabricator(
  materials: MaterialLibrary,
  config: WorldConfig,
): MicroFabricator {
  const root = new Group();
  root.name = 'fabricated-printer-generation-01-voron-derived';

  const scale = VORON_V0.mmToWorld;
  const frame = mm(VORON_V0.frameSectionMm, scale);
  const plate = mm(VORON_V0.buildPlateMm, scale);
  const doorWidth = mm(VORON_V0.doorMm.width, scale);
  const doorHeight = mm(VORON_V0.doorMm.height, scale);
  const panelWidth = mm(VORON_V0.sidePanelMm.width, scale);
  const panelHeight = mm(VORON_V0.sidePanelMm.height, scale);
  const panelThickness = mm(VORON_V0.sidePanelMm.thickness, scale);
  const beltWidth = mm(VORON_V0.beltWidthMm, scale);
  const railWidth = mm(VORON_V0.linearRailWidthMm, scale);
  const machineWidth = doorWidth + frame * 2;
  const machineDepth = panelWidth + frame * 2;
  const chamberBottom = 0.18;
  const chamberTop = chamberBottom + doorHeight;
  const chamberCenter = (chamberBottom + chamberTop) * 0.5;

  const extrusion = materials.paint({
    color: 0x48545a,
    roughness: 0.32,
    metalness: 0.9,
    clearcoat: 0.08,
  });
  const printedPrimary = materials.paint({
    color: 0x252d31,
    roughness: 0.72,
    metalness: 0.04,
  });
  const printedAccent = materials.paint({
    color: config.index === 1 ? 0x762d67 : 0x3c5b48,
    roughness: 0.68,
    metalness: 0.05,
  });
  const sheetMetal = materials.paint({
    color: 0x687277,
    roughness: 0.46,
    metalness: 0.82,
  });
  const rail = materials.edgeSteel;
  const dark = materials.darkSteel;
  const glow = materials.emissive(config.accent, 3.2);
  const warning = materials.emissive(config.secondary, 2.5);

  // Elastomer feet and ventilated electronics skirt.
  for (const x of [-machineWidth * 0.41, machineWidth * 0.41]) {
    for (const z of [-machineDepth * 0.41, machineDepth * 0.41]) {
      addCylinder(root, 0.044, 0.038, materials.rubber, [x, 0.019, z], [0, 0, 0], 12);
    }
  }
  addRoundedBox(root, [machineWidth, 0.12, machineDepth], printedPrimary, {
    position: [0, 0.095, 0],
    radius: 0.028,
    name: 'v0-electronics-skirt',
  });
  for (let vent = -2; vent <= 2; vent += 1) {
    addRoundedBox(root, [0.052, 0.008, 0.018], dark, {
      position: [vent * 0.067, 0.105, machineDepth * 0.502],
      radius: 0.004,
      castShadow: false,
    });
  }
  addRoundedBox(root, [machineWidth - 0.07, 0.025, machineDepth - 0.07], sheetMetal, {
    position: [0, 0.1625, 0],
    radius: 0.009,
    name: 'v0-deck-panel',
  });

  // Official 1515 rail proportion, including visible T-slot channels.
  const uprightLength = chamberTop - chamberBottom;
  for (const x of [-doorWidth * 0.5, doorWidth * 0.5]) {
    for (const z of [-panelWidth * 0.5, panelWidth * 0.5]) {
      addTSlotExtrusion(root, uprightLength, 'y', extrusion, dark, {
        section: frame,
        position: [x, chamberCenter, z],
        name: 'v0-1515-upright',
      });
    }
  }
  for (const y of [chamberBottom, chamberTop]) {
    for (const z of [-panelWidth * 0.5, panelWidth * 0.5]) {
      addTSlotExtrusion(root, doorWidth, 'x', extrusion, dark, {
        section: frame,
        position: [0, y, z],
        name: 'v0-1515-crossmember-x',
      });
    }
    for (const x of [-doorWidth * 0.5, doorWidth * 0.5]) {
      addTSlotExtrusion(root, panelWidth, 'z', extrusion, dark, {
        section: frame,
        position: [x, y, 0],
        name: 'v0-1515-crossmember-y',
      });
    }
  }

  // The scaled official 120 mm build plate, its magnetic sheet, three screws,
  // cantilever, rear Z rail, lead screw, and stepper are modeled separately.
  addRoundedBox(root, [plate, 0.032, plate], sheetMetal, {
    position: [0, 0.23, 0.015],
    radius: 0.012,
    name: 'v0-120mm-aluminium-buildplate',
  });
  addRoundedBox(root, [plate - 0.018, 0.009, plate - 0.018], printedAccent, {
    position: [0, 0.251, 0.015],
    radius: 0.007,
    name: 'v0-spring-steel-build-sheet',
  });
  root.add(createFasteners([
    [-plate * 0.405, 0.258, -plate * 0.405],
    [plate * 0.405, 0.258, -plate * 0.405],
    [0, 0.258, plate * 0.405],
  ], rail, 'up', 0.012));
  addRoundedBox(root, [0.12, 0.045, 0.31], dark, {
    position: [0, 0.197, -0.115],
    radius: 0.014,
    name: 'v0-cantilever-bed-carrier',
  });
  addRoundedBox(root, [railWidth, panelHeight * 0.78, 0.016], rail, {
    position: [0, 0.45, -panelWidth * 0.5 + 0.022],
    radius: 0.005,
    name: 'v0-mgn7-z-rail',
  });
  addCylinder(root, mm(8, scale) * 0.5, panelHeight * 0.75, rail, [0.09, 0.44, -panelWidth * 0.5 + 0.025], [0, 0, 0], 14);
  addStepperMotor(root, [0.09, 0.205, -panelWidth * 0.5 + 0.035], mm(42, scale), dark, printedPrimary, rail);

  // CoreXY gantry: twin rear motors, side rails, 6 mm belts, X beam, linear rail,
  // idlers, carriage, direct-drive toolhead, fans, heater block, and nozzle.
  const gantryY = chamberTop - 0.12;
  for (const side of [-1, 1]) {
    addStepperMotor(root, [side * 0.22, gantryY + 0.03, -panelWidth * 0.5 + 0.04], mm(35, scale), dark, printedPrimary, rail);
    addRoundedBox(root, [beltWidth, 0.012, panelWidth - 0.08], materials.rubber, {
      position: [side * 0.235, gantryY, 0],
      radius: 0.004,
      name: 'v0-6mm-corexy-belt',
      castShadow: false,
    });
    for (const z of [-0.225, 0.225]) {
      addCylinder(root, 0.027, 0.024, rail, [side * 0.235, gantryY + 0.012, z], [0, 0, 0], 16);
    }
  }
  addTSlotExtrusion(root, doorWidth - 0.075, 'x', extrusion, dark, {
    section: frame,
    position: [0, gantryY - 0.045, 0],
    name: 'v0-corexy-x-beam',
  });
  addRoundedBox(root, [doorWidth - 0.095, railWidth, 0.014], rail, {
    position: [0, gantryY - 0.068, panelWidth * 0.08],
    radius: 0.004,
    name: 'v0-mgn7-x-rail',
  });

  const printHead = new Group();
  printHead.name = 'v0-mini-stealthburner-toolhead';
  printHead.position.set(0, gantryY - 0.145, panelWidth * 0.07);
  addRoundedBox(printHead, [0.145, 0.16, 0.118], printedAccent, { radius: 0.032 });
  addRoundedBox(printHead, [0.082, 0.1, 0.128], printedPrimary, {
    position: [0, 0.005, 0.022],
    radius: 0.023,
  });
  for (const side of [-1, 1]) {
    addCylinder(printHead, 0.034, 0.024, dark, [side * 0.056, -0.012, 0.075], [Math.PI * 0.5, 0, 0], 16);
    addCylinder(printHead, 0.021, 0.027, rail, [side * 0.056, -0.012, 0.09], [Math.PI * 0.5, 0, 0], 12);
  }
  addRoundedBox(printHead, [0.055, 0.045, 0.05], sheetMetal, {
    position: [0, -0.103, 0.008],
    radius: 0.009,
  });
  addCylinder(printHead, 0.014, 0.072, rail, [0, -0.155, 0.008], [0, 0, 0], 14);
  addCylinder(printHead, 0.006, 0.032, glow, [0, -0.207, 0.008], [0, 0, 0], 10);
  root.add(printHead);

  // Official panel dimensions represented as their own 3 mm sheets.
  for (const side of [-1, 1]) {
    const panel = new Mesh(new PlaneGeometry(panelWidth, panelHeight), materials.glass);
    panel.name = 'v0-212x230x3-side-panel';
    panel.position.set(side * (doorWidth * 0.5 + panelThickness), chamberCenter, 0);
    panel.rotation.y = side * -Math.PI * 0.5;
    root.add(panel);
  }
  const rearPanel = new Mesh(new PlaneGeometry(doorWidth, panelHeight), materials.glass);
  rearPanel.name = 'v0-rear-panel';
  rearPanel.position.set(0, chamberCenter, -panelWidth * 0.5 - panelThickness);
  rearPanel.rotation.y = Math.PI;
  root.add(rearPanel);

  const doorHinge = new Group();
  doorHinge.name = 'v0-212x239x3-front-door-hinge';
  doorHinge.position.set(-doorWidth * 0.5, chamberCenter, panelWidth * 0.5 + panelThickness);
  const door = new Mesh(new PlaneGeometry(doorWidth, doorHeight), materials.glass);
  door.position.x = doorWidth * 0.5;
  doorHinge.add(door);
  for (const y of [-doorHeight * 0.32, doorHeight * 0.32]) {
    addCylinder(doorHinge, 0.016, 0.055, rail, [0, y, 0.006], [0, 0, 0], 12);
  }
  addRoundedBox(doorHinge, [0.025, 0.115, 0.028], printedAccent, {
    position: [doorWidth - 0.028, 0, 0.018],
    radius: 0.009,
  });
  root.add(doorHinge);

  // Hinged top hat, spool, display, labels, wiring, and user-service details.
  const topHatBase = chamberTop + 0.018;
  for (const x of [-doorWidth * 0.5, doorWidth * 0.5]) {
    for (const z of [-panelWidth * 0.5, panelWidth * 0.5]) {
      addTSlotExtrusion(root, 0.125, 'y', extrusion, dark, {
        section: frame,
        position: [x, topHatBase + 0.0625, z],
        name: 'v0-hinged-tophat-upright',
      });
    }
  }
  addRoundedBox(root, [machineWidth, 0.045, machineDepth], printedPrimary, {
    position: [0, 0.982, 0],
    radius: 0.022,
    name: 'v0-tophat-cap',
  });
  addCylinder(root, 0.105, 0.055, dark, [0.22, 0.91, -0.23], [Math.PI * 0.5, 0, 0], 20);
  addCylinder(root, 0.067, 0.061, warning, [0.22, 0.91, -0.23], [Math.PI * 0.5, 0, 0], 20);
  addRoundedBox(root, [0.31, 0.135, 0.04], printedPrimary, {
    position: [-0.1, 0.105, machineDepth * 0.505],
    radius: 0.02,
  });
  addRoundedBox(root, [0.245, 0.082, 0.012], glow, {
    position: [-0.1, 0.105, machineDepth * 0.54],
    radius: 0.009,
    castShadow: false,
  });
  addCylinder(root, 0.03, 0.035, warning, [0.24, 0.105, machineDepth * 0.535], [Math.PI * 0.5, 0, 0], 14);
  const generationLabel = createLabel('GEN-01 / V0', 0.34, 0.1, {
    accent: config.secondary,
    subtext: 'COREXY CHILD FABRICATOR',
  });
  generationLabel.position.set(-0.08, 0.955, panelWidth * 0.5 + 0.024);
  root.add(generationLabel);
  const hazard = createHazardStrip(doorWidth, 0.048, config.secondary);
  hazard.position.set(0, chamberBottom + 0.032, panelWidth * 0.5 + 0.026);
  root.add(hazard);
  root.add(createCable([
    [0.24, gantryY + 0.04, -0.2],
    [0.2, gantryY + 0.105, -0.08],
    [0.1, gantryY + 0.08, 0.02],
    [0.02, gantryY - 0.02, 0.035],
    [0, gantryY - 0.11, 0.035],
  ], 0.01, materials.rubber));

  return {
    root,
    printHead,
    glow,
    setDoorOpen(amount) {
      doorHinge.rotation.y = -Math.PI * 0.62 * MathUtils.clamp(amount, 0, 1);
    },
    update(time, printLoad) {
      const load = MathUtils.clamp(printLoad, 0, 1);
      printHead.position.x = Math.sin(time * 2.15) * (doorWidth * 0.34) * load;
      printHead.position.z = panelWidth * 0.07 + Math.cos(time * 1.73) * (panelWidth * 0.26) * load;
      glow.emissiveIntensity = 2.7 + load * 3.8 + Math.sin(time * 4.1) * 0.32;
    },
  };
}

function addStepperMotor(
  parent: Group,
  position: readonly [number, number, number],
  size: number,
  bodyMaterial: MeshStandardMaterial,
  capMaterial: MeshStandardMaterial,
  shaftMaterial: MeshStandardMaterial,
): void {
  const motor = new Group();
  motor.position.set(...position);
  addRoundedBox(motor, [size, size, size * 0.82], bodyMaterial, { radius: size * 0.08 });
  addRoundedBox(motor, [size * 0.88, size * 0.88, size * 0.06], capMaterial, {
    position: [0, 0, size * 0.44],
    radius: size * 0.05,
  });
  addCylinder(motor, size * 0.12, size * 0.24, shaftMaterial, [0, 0, size * 0.52], [Math.PI * 0.5, 0, 0], 14);
  motor.add(createFasteners([
    [-size * 0.32, -size * 0.32, size * 0.47],
    [size * 0.32, -size * 0.32, size * 0.47],
    [-size * 0.32, size * 0.32, size * 0.47],
    [size * 0.32, size * 0.32, size * 0.47],
  ], shaftMaterial, 'front', size * 0.045));
  parent.add(motor);
}
