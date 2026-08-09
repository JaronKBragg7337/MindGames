import {
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Vector3,
} from 'three';
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
import { BIGREP_ONE, mm } from '../fabricationSpecs';
import { FABRICATION_LAYOUT } from '../layout';
import type { WorldConfig } from '../WorldConfig';
import { createAssemblerRobot, type AssemblerRobot } from './AssemblerRobot';
import { createMicroFabricator, type MicroFabricator } from './MicroFabricator';

export type FabricationPhase =
  | 'ready'
  | 'printing-printer'
  | 'deploying-printer'
  | 'printing-robot'
  | 'deploying-robot'
  | 'complete';

const PHASE_DURATION = {
  'printing-printer': 5.8,
  'deploying-printer': 3.7,
  'printing-robot': 4.8,
  'deploying-robot': 4.5,
} as const;

const ROBOT_SCALE = 0.42;

export class FabricatorAssembly {
  readonly root = new Group();
  readonly printHead = new Group();

  private readonly statusMaterial: MeshStandardMaterial;
  private readonly buildCore: Group;
  private readonly leftDoor = new Group();
  private readonly rightDoor = new Group();
  private readonly childPrinter: MicroFabricator;
  private readonly robot: AssemblerRobot;
  private readonly childPrintPosition = new Vector3(0, 0.27, 0);
  private readonly childDockPosition = new Vector3(...FABRICATION_LAYOUT.childDockLocal);
  private readonly robotPrintPosition: Vector3;
  private readonly robotRestPosition = new Vector3(-1.24, 0, 1.16);

  private phase: FabricationPhase = 'ready';
  private phaseElapsed = 0;
  private fabricationPulse = 0;

  constructor(parent: Object3D, materials: MaterialLibrary, config: WorldConfig) {
    this.root.name = 'world-printer-bigrep-derived-assembly';
    this.root.position.set(...FABRICATION_LAYOUT.parentPosition);
    parent.add(this.root);

    const outerWidth = mm(BIGREP_ONE.outerMm.width, BIGREP_ONE.mmToWorld);
    const outerDepth = mm(BIGREP_ONE.outerMm.depth, BIGREP_ONE.mmToWorld);
    const outerHeight = mm(BIGREP_ONE.outerMm.height, BIGREP_ONE.mmToWorld);
    const buildWidth = mm(BIGREP_ONE.buildMm.width, BIGREP_ONE.mmToWorld);
    const buildDepth = mm(BIGREP_ONE.buildMm.depth, BIGREP_ONE.mmToWorld);
    const buildHeight = mm(BIGREP_ONE.buildMm.height, BIGREP_ONE.mmToWorld);
    const frameSection = 0.075;
    const footHeight = 0.06;
    const baseBottom = footHeight;
    const baseTop = 0.2;
    const frameTop = outerHeight - 0.19;

    const frameMetal = materials.paint({
      color: 0x46555c,
      roughness: 0.34,
      metalness: 0.9,
      clearcoat: 0.08,
    });
    const cabinet = materials.paint({
      color: 0x2c3a40,
      roughness: 0.58,
      metalness: 0.64,
    });
    const polymer = materials.paint({
      color: 0x293136,
      roughness: 0.76,
      metalness: 0.04,
    });
    const wornMetal = materials.textured('metal_plate', {
      // 1K source at roughly 512 px per world metre on the largest panels.
      repeat: [outerWidth * 2, outerDepth * 2],
      offset: [config.index * 0.17, config.index * 0.09],
      rotation: config.index * 0.17,
      normalStrength: 0.38,
      roughness: 0.82,
      metalness: 0.82,
      tint: 0xaab4b7,
    });
    const rail = materials.edgeSteel;
    const dark = materials.darkSteel;
    this.statusMaterial = materials.emissive(config.accent, 2.8);
    const warningMaterial = materials.emissive(config.secondary, 2.7);

    // Six load-rated feet, bolted lower chassis, edge guards, and service pan.
    for (const x of [-outerWidth * 0.41, 0, outerWidth * 0.41]) {
      for (const z of [-outerDepth * 0.4, outerDepth * 0.4]) {
        addCylinder(this.root, 0.07, footHeight, materials.rubber, [x, footHeight * 0.5, z], [0, 0, 0], 16);
        addCylinder(this.root, 0.035, footHeight + 0.035, rail, [x, footHeight * 0.58, z], [0, 0, 0], 12);
      }
    }
    addRoundedBox(this.root, [outerWidth, baseTop - baseBottom, outerDepth], wornMetal, {
      position: [0, (baseBottom + baseTop) * 0.5, 0],
      radius: 0.045,
      name: 'one5-lower-chassis',
    });
    for (const x of [-outerWidth * 0.47, outerWidth * 0.47]) {
      addRoundedBox(this.root, [0.055, 0.075, outerDepth - 0.12], rail, {
        position: [x, baseTop - 0.012, 0],
        radius: 0.012,
        name: 'one5-chassis-edge-wear-guard',
      });
    }

    // BigRep-sized structural cage, authored from visible T-slot members.
    const columnLength = frameTop - baseTop;
    for (const x of [-outerWidth * 0.455, outerWidth * 0.455]) {
      for (const z of [-outerDepth * 0.445, outerDepth * 0.445]) {
        addTSlotExtrusion(this.root, columnLength, 'y', frameMetal, dark, {
          section: frameSection,
          position: [x, baseTop + columnLength * 0.5, z],
          name: 'one5-vertical-frame-column',
        });
      }
    }
    for (const y of [baseTop, frameTop]) {
      for (const z of [-outerDepth * 0.445, outerDepth * 0.445]) {
        addTSlotExtrusion(this.root, outerWidth * 0.91, 'x', frameMetal, dark, {
          section: frameSection,
          position: [0, y, z],
          name: 'one5-frame-crossmember-x',
        });
      }
      for (const x of [-outerWidth * 0.455, outerWidth * 0.455]) {
        addTSlotExtrusion(this.root, outerDepth * 0.89, 'z', frameMetal, dark, {
          section: frameSection,
          position: [x, y, 0],
          name: 'one5-frame-crossmember-y',
        });
      }
    }

    // 1005 mm square build system: subframe, heated bed, magnetic switchplate,
    // cable strain relief, datum pucks, and corner leveling actuators.
    const bedY = 0.245;
    addRoundedBox(this.root, [buildWidth + 0.14, 0.085, buildDepth + 0.14], dark, {
      position: [0, bedY - 0.045, 0],
      radius: 0.024,
      name: 'one5-bed-subframe',
    });
    addRoundedBox(this.root, [buildWidth, 0.055, buildDepth], wornMetal, {
      position: [0, bedY, 0],
      radius: 0.018,
      name: 'one5-1005mm-heated-build-bed',
    });
    addRoundedBox(this.root, [buildWidth - 0.025, 0.012, buildDepth - 0.025], cabinet, {
      position: [0, bedY + 0.034, 0],
      radius: 0.012,
      name: 'one5-removable-switchplate',
    });
    const bedFasteners: [number, number, number][] = [];
    for (const x of [-buildWidth * 0.45, buildWidth * 0.45]) {
      for (const z of [-buildDepth * 0.45, buildDepth * 0.45]) {
        bedFasteners.push([x, bedY + 0.046, z]);
        addCylinder(this.root, 0.045, 0.075, dark, [x, bedY - 0.085, z], [0, 0, 0], 16);
      }
    }
    this.root.add(createFasteners(bedFasteners, rail, 'up', 0.023));
    this.root.add(createCable([
      [-buildWidth * 0.48, bedY - 0.01, -buildDepth * 0.48],
      [-0.68, 0.22, -0.64],
      [-0.76, 0.18, -0.69],
      [-0.79, 0.14, -0.72],
    ], 0.026, materials.rubber));

    // Independent Y rails, belts, motors, idlers, moving X beam, and dual PEX2
    // carriage establish a believable large-format Cartesian motion system.
    const gantryY = baseTop + buildHeight + 0.42;
    const yRailX = buildWidth * 0.64;
    for (const side of [-1, 1]) {
      addTSlotExtrusion(this.root, buildDepth + 0.38, 'z', frameMetal, dark, {
        section: 0.058,
        position: [side * yRailX, gantryY, 0],
        name: 'one5-y-axis-beam',
      });
      addRoundedBox(this.root, [0.027, 0.024, buildDepth + 0.28], rail, {
        position: [side * yRailX, gantryY - 0.041, 0],
        radius: 0.006,
        name: 'one5-y-linear-rail',
      });
      addRoundedBox(this.root, [0.018, 0.018, buildDepth + 0.2], materials.rubber, {
        position: [side * (yRailX + 0.046), gantryY + 0.025, 0],
        radius: 0.004,
        name: 'one5-y-drive-belt',
        castShadow: false,
      });
      addIndustrialStepper(this.root, [side * yRailX, gantryY, -buildDepth * 0.63], dark, cabinet, rail);
      for (const z of [-buildDepth * 0.59, buildDepth * 0.59]) {
        addCylinder(this.root, 0.052, 0.035, rail, [side * (yRailX + 0.046), gantryY + 0.026, z], [Math.PI * 0.5, 0, 0], 20);
      }
    }
    addTSlotExtrusion(this.root, buildWidth + 0.38, 'x', frameMetal, dark, {
      section: 0.07,
      position: [0, gantryY - 0.055, 0],
      name: 'one5-moving-x-gantry',
    });
    addRoundedBox(this.root, [buildWidth + 0.25, 0.028, 0.026], rail, {
      position: [0, gantryY - 0.102, 0.035],
      radius: 0.006,
      name: 'one5-x-linear-rail',
    });

    this.printHead.name = 'one5-dual-pex2-carriage';
    this.printHead.position.set(0, gantryY - 0.22, 0.035);
    addRoundedBox(this.printHead, [0.42, 0.16, 0.18], cabinet, {
      position: [0, 0.08, 0],
      radius: 0.034,
      name: 'one5-carriage-plate',
    });
    for (const x of [-0.115, 0.115]) {
      addRoundedBox(this.printHead, [0.17, 0.22, 0.16], polymer, {
        position: [x, -0.07, 0.02],
        radius: 0.032,
        name: 'one5-pex2-extruder-housing',
      });
      addCylinder(this.printHead, 0.052, 0.045, rail, [x, -0.03, 0.112], [Math.PI * 0.5, 0, 0], 18);
      addRoundedBox(this.printHead, [0.082, 0.065, 0.072], wornMetal, {
        position: [x, -0.205, 0.025],
        radius: 0.012,
      });
      addCylinder(this.printHead, 0.024, 0.13, rail, [x, -0.3, 0.025], [0, 0, 0], 16);
      addCylinder(this.printHead, 0.011, 0.065, this.statusMaterial, [x, -0.398, 0.025], [0, 0, 0], 12);
    }
    this.root.add(this.printHead);
    this.root.add(createCable([
      [yRailX, gantryY + 0.09, -0.52],
      [0.68, gantryY + 0.18, -0.28],
      [0.48, gantryY + 0.16, -0.02],
      [0.22, gantryY + 0.08, 0.035],
      [0, gantryY - 0.08, 0.035],
    ], 0.024, materials.rubber));

    // Two independently hinged safety doors and separate side/rear sheets.
    const doorWidth = outerWidth * 0.82;
    const doorHeight = 1.47;
    const doorY = baseTop + doorHeight * 0.5;
    const frontZ = outerDepth * 0.5 + 0.006;
    this.leftDoor.position.set(-doorWidth * 0.5, doorY, frontZ);
    const leftGlass = new Mesh(new PlaneGeometry(doorWidth * 0.5 - 0.012, doorHeight), materials.glass);
    leftGlass.position.x = doorWidth * 0.25;
    leftGlass.name = 'one5-left-polycarbonate-door';
    this.leftDoor.add(leftGlass);
    addRoundedBox(this.leftDoor, [0.035, 0.22, 0.035], rail, {
      position: [doorWidth * 0.47, 0, 0.025],
      radius: 0.012,
    });
    this.root.add(this.leftDoor);
    this.rightDoor.position.set(doorWidth * 0.5, doorY, frontZ);
    const rightGlass = new Mesh(new PlaneGeometry(doorWidth * 0.5 - 0.012, doorHeight), materials.glass);
    rightGlass.position.x = -doorWidth * 0.25;
    rightGlass.name = 'one5-right-polycarbonate-door';
    this.rightDoor.add(rightGlass);
    addRoundedBox(this.rightDoor, [0.035, 0.22, 0.035], rail, {
      position: [-doorWidth * 0.47, 0, 0.025],
      radius: 0.012,
    });
    this.root.add(this.rightDoor);
    for (const side of [-1, 1]) {
      const sidePanel = new Mesh(new PlaneGeometry(outerDepth * 0.84, doorHeight), materials.glass);
      sidePanel.position.set(side * (outerWidth * 0.5 - 0.008), doorY, 0);
      sidePanel.rotation.y = side * -Math.PI * 0.5;
      sidePanel.name = 'one5-side-safety-panel';
      this.root.add(sidePanel);
    }
    const rearPanel = new Mesh(new PlaneGeometry(outerWidth * 0.84, doorHeight), materials.glass);
    rearPanel.position.set(0, doorY, -outerDepth * 0.5 + 0.008);
    rearPanel.rotation.y = Math.PI;
    rearPanel.name = 'one5-rear-safety-panel';
    this.root.add(rearPanel);

    // Layer guide hologram shares the exact build-bed datum.
    this.buildCore = new Group();
    this.buildCore.name = 'one5-layer-guide';
    this.buildCore.position.set(0, bedY + 0.05, 0);
    for (let layer = 0; layer < 10; layer += 1) {
      addRoundedBox(this.buildCore, [0.48 - layer * 0.018, 0.018, 0.48 - layer * 0.018], this.statusMaterial, {
        position: [0, layer * 0.025, 0],
        radius: 0.006,
        castShadow: false,
      });
    }
    this.root.add(this.buildCore);

    // Rear electronics, dry-box spools, side console, service decals, warning
    // tower, fasteners, vents, and edge guards add tertiary construction cues.
    for (const x of [-0.53, 0.53]) {
      addRoundedBox(this.root, [0.4, 0.38, 0.17], cabinet, {
        position: [x, 0.48, -outerDepth * 0.39],
        radius: 0.04,
        name: 'one5-electronics-service-module',
      });
      for (let vent = -2; vent <= 2; vent += 1) {
        addRoundedBox(this.root, [0.045, 0.008, 0.012], dark, {
          position: [x + vent * 0.058, 0.5, -outerDepth * 0.493],
          radius: 0.003,
          castShadow: false,
        });
      }
      addCylinder(this.root, 0.16, 0.075, dark, [x, frameTop + 0.08, -0.28], [Math.PI * 0.5, 0, 0], 24);
      addCylinder(this.root, 0.102, 0.082, warningMaterial, [x, frameTop + 0.08, -0.28], [Math.PI * 0.5, 0, 0], 24);
    }

    const consoleRoot = new Group();
    consoleRoot.position.set(0.58, 1.23, frontZ + 0.07);
    consoleRoot.rotation.x = -0.22;
    addRoundedBox(consoleRoot, [0.5, 0.32, 0.11], cabinet, { radius: 0.045 });
    const consoleGlass = materials.paint({
      color: 0x061216,
      roughness: 0.2,
      metalness: 0.14,
      clearcoat: 0.72,
      emissive: config.accent,
      emissiveIntensity: 0.16,
    });
    addRoundedBox(consoleRoot, [0.4, 0.23, 0.018], dark, {
      position: [-0.025, 0, 0.066],
      radius: 0.018,
      castShadow: false,
    });
    addRoundedBox(consoleRoot, [0.365, 0.195, 0.008], consoleGlass, {
      position: [-0.025, 0, 0.078],
      radius: 0.011,
      castShadow: false,
    });
    const consoleDisplay = createLabel('FAB CELL 01', 0.335, 0.16, {
      accent: config.accent,
      subtext: '1005 CUBE / PEX2 DUAL',
    });
    // Keep the decal physically above the glass so mobile depth precision
    // cannot erase its lettering at shallow viewing angles.
    consoleDisplay.position.set(-0.025, 0, 0.092);
    consoleRoot.add(consoleDisplay);
    addCylinder(consoleRoot, 0.052, 0.035, warningMaterial, [0.205, -0.085, 0.075], [Math.PI * 0.5, 0, 0], 16);
    consoleRoot.add(createFasteners([
      [-0.205, -0.13, 0.07],
      [-0.205, 0.13, 0.07],
      [0.205, 0.13, 0.07],
    ], rail, 'front', 0.014));
    this.root.add(consoleRoot);

    const identity = createLabel('RECURSIVE FABRICATOR', 0.92, 0.2, {
      accent: config.accent,
      subtext: 'ONE5 SCALE / 1005MM CUBE',
    });
    identity.position.set(-0.35, 0.5, frontZ + 0.025);
    this.root.add(identity);
    const operation = createLabel('PARENT → CHILD → ROBOT', 0.92, 0.17, {
      accent: config.secondary,
      subtext: 'BOUNDED REPLICATION CELL',
    });
    operation.position.set(-0.35, 0.3, frontZ + 0.026);
    this.root.add(operation);
    const hazard = createHazardStrip(doorWidth, 0.07, config.secondary);
    hazard.position.set(0, baseTop + 0.045, frontZ + 0.024);
    this.root.add(hazard);

    addRoundedBox(this.root, [outerWidth, 0.14, outerDepth], cabinet, {
      position: [0, outerHeight - 0.07, 0],
      radius: 0.04,
      name: 'one5-upper-service-cap',
    });
    addCylinder(this.root, 0.032, 0.18, rail, [0.73, outerHeight + 0.09, 0], [0, 0, 0], 14);
    addCylinder(this.root, 0.062, 0.06, warningMaterial, [0.73, outerHeight + 0.21, 0], [0, 0, 0], 16);
    addCylinder(this.root, 0.054, 0.055, this.statusMaterial, [0.73, outerHeight + 0.27, 0], [0, 0, 0], 16);

    // A service-bay luminaire makes the assembled silhouette legible without
    // adding another shadow map on mobile hardware.
    const inspectionLamp = materials.emissive(0xd8f5ff, 3.4);
    addRoundedBox(this.root, [0.78, 0.055, 0.16], cabinet, {
      position: [0, 1.79, 0.61],
      rotation: [0.18, 0, 0],
      radius: 0.025,
      name: 'one5-inspection-lamp-housing',
    });
    addRoundedBox(this.root, [0.68, 0.018, 0.095], inspectionLamp, {
      position: [0, 1.755, 0.63],
      rotation: [0.18, 0, 0],
      radius: 0.009,
      castShadow: false,
      name: 'one5-inspection-lamp-diffuser',
    });
    const inspectionFill = new PointLight(0xd8f5ff, 24, 4.3, 2);
    inspectionFill.position.set(0, 1.58, 0.68);
    inspectionFill.castShadow = false;
    this.root.add(inspectionFill);

    // A discrete receiving dock keeps the second machine supported and gives
    // the dynamic collider a stable, authored final position.
    addRoundedBox(this.root, FABRICATION_LAYOUT.childDockSize, wornMetal, {
      position: FABRICATION_LAYOUT.childDockLocal,
      radius: 0.03,
      name: 'child-fabricator-floor-dock',
    });
    for (const z of [-0.255, 0.255]) {
      addRoundedBox(this.root, [0.64, 0.03, 0.038], rail, {
        position: [FABRICATION_LAYOUT.childDockLocal[0], 0.09, z],
        radius: 0.009,
      });
    }
    for (const z of [-0.29, 0.29]) {
      addCylinder(this.root, 0.045, 0.055, this.statusMaterial, [1.62, 0.12, z], [0, 0, 0], 14);
    }

    this.childPrinter = createMicroFabricator(materials, config);
    this.childPrinter.root.visible = false;
    this.childPrinter.root.position.copy(this.childPrintPosition);
    this.root.add(this.childPrinter.root);

    this.robot = createAssemblerRobot(materials, config);
    this.robot.root.visible = false;
    this.robot.root.scale.setScalar(ROBOT_SCALE);
    this.robotPrintPosition = new Vector3(
      this.childDockPosition.x,
      this.childDockPosition.y + 0.255,
      this.childDockPosition.z,
    );
    this.robot.root.position.copy(this.robotPrintPosition);
    this.root.add(this.robot.root);
  }

  getInteractionPosition(target = new Vector3()): Vector3 {
    target.set(0.35, 1.15, 1.22);
    return this.root.localToWorld(target);
  }

  getInteractionLabel(): string {
    switch (this.phase) {
      case 'ready':
        return 'PRINT A PRINTER';
      case 'printing-printer':
        return `PRINTING CHILD · ${this.getPhasePercent()}%`;
      case 'deploying-printer':
        return 'DEPLOYING CHILD PRINTER';
      case 'printing-robot':
        return `CHILD PRINTING ROBOT · ${this.getPhasePercent()}%`;
      case 'deploying-robot':
        return 'ROBOT INITIALIZING';
      case 'complete':
        return 'REPLAY PRINTER → ROBOT';
    }
  }

  beginFabrication(): boolean {
    if (this.phase !== 'ready' && this.phase !== 'complete') {
      this.pulse();
      return false;
    }
    this.resetSequenceVisuals();
    this.phase = 'printing-printer';
    this.phaseElapsed = 0;
    this.fabricationPulse = 1;
    return true;
  }

  isChildDeployed(): boolean {
    return this.phase === 'printing-robot' || this.phase === 'deploying-robot' || this.phase === 'complete';
  }

  pulse(): void {
    this.fabricationPulse = 1;
  }

  update(delta: number, time: number, timeRate: number): void {
    const localTime = time * Math.min(timeRate, 18);
    const isPrinting = this.phase === 'printing-printer' || this.phase === 'printing-robot';
    const headSpeed = isPrinting ? 2.1 : 0.72;
    this.printHead.position.x = Math.sin(localTime * headSpeed) * 0.36;
    this.printHead.position.z = 0.035 + Math.cos(localTime * headSpeed * 0.71) * 0.34;
    this.fabricationPulse = MathUtils.damp(this.fabricationPulse, 0, 2.4, delta);

    if (this.phase !== 'ready' && this.phase !== 'complete') this.phaseElapsed += delta;
    this.updateSequence(time);

    const activity = isPrinting ? 1 : 0;
    const pulse = 1 + this.fabricationPulse * 0.48 + activity * Math.sin(localTime * 2.2) * 0.055;
    this.buildCore.scale.set(pulse, 0.72 + pulse * 0.28, pulse);
    this.statusMaterial.emissiveIntensity = 2.2 + activity * 2.4 + this.fabricationPulse * 5 + Math.sin(localTime * 3.1) * 0.3;
  }

  private updateSequence(time: number): void {
    switch (this.phase) {
      case 'ready':
        this.setDoorOpen(0);
        this.childPrinter.setDoorOpen(0);
        this.childPrinter.update(time, 0);
        this.robot.update(time, 0, 0);
        break;
      case 'printing-printer': {
        const progress = this.getPhaseProgress();
        const eased = smooth(progress);
        this.childPrinter.root.visible = true;
        this.childPrinter.root.position.copy(this.childPrintPosition);
        this.childPrinter.root.scale.set(0.88 + eased * 0.12, Math.max(0.015, eased), 0.88 + eased * 0.12);
        this.childPrinter.setDoorOpen(0);
        this.childPrinter.update(time, 0);
        this.setDoorOpen(0);
        if (progress >= 1) this.advanceTo('deploying-printer');
        break;
      }
      case 'deploying-printer': {
        const progress = this.getPhaseProgress();
        this.childPrinter.root.visible = true;
        this.childPrinter.root.scale.setScalar(1);
        this.positionChildForDeployment(progress);
        const open = MathUtils.smoothstep(progress, 0, 0.2) * (1 - MathUtils.smoothstep(progress, 0.82, 1));
        this.setDoorOpen(open);
        this.childPrinter.setDoorOpen(0);
        this.childPrinter.update(time, 0.25);
        if (progress >= 1) {
          this.childPrinter.root.position.copy(this.childDockPosition);
          this.advanceTo('printing-robot');
        }
        break;
      }
      case 'printing-robot': {
        const progress = this.getPhaseProgress();
        const eased = smooth(progress);
        this.childPrinter.root.position.copy(this.childDockPosition);
        this.childPrinter.root.scale.setScalar(1);
        this.childPrinter.setDoorOpen(0);
        this.childPrinter.update(time, 1);
        this.robot.root.visible = true;
        this.robot.root.position.copy(this.robotPrintPosition);
        this.robot.root.rotation.set(0, 0, 0);
        this.robot.root.scale.set(
          ROBOT_SCALE * (0.88 + eased * 0.12),
          ROBOT_SCALE * Math.max(0.015, eased),
          ROBOT_SCALE * (0.88 + eased * 0.12),
        );
        this.robot.update(time, 0, MathUtils.smoothstep(progress, 0.72, 1));
        this.setDoorOpen(0);
        if (progress >= 1) this.advanceTo('deploying-robot');
        break;
      }
      case 'deploying-robot': {
        const progress = this.getPhaseProgress();
        this.childPrinter.update(time, 0.35);
        const childDoorOpen = MathUtils.smoothstep(progress, 0, 0.16) * (1 - MathUtils.smoothstep(progress, 0.84, 1));
        this.childPrinter.setDoorOpen(childDoorOpen);
        this.robot.root.visible = true;
        this.robot.root.scale.setScalar(ROBOT_SCALE);
        this.positionRobotForDeployment(progress, time);
        this.robot.update(time, MathUtils.smoothstep(progress, 0.18, 0.95), 1);
        if (progress >= 1) {
          this.robot.root.position.copy(this.robotRestPosition);
          this.robot.root.rotation.y = -Math.PI * 0.5;
          this.childPrinter.setDoorOpen(0);
          this.advanceTo('complete');
        }
        break;
      }
      case 'complete':
        this.childPrinter.root.position.copy(this.childDockPosition);
        this.childPrinter.root.scale.setScalar(1);
        this.childPrinter.setDoorOpen(0);
        this.childPrinter.update(time, 0.12);
        this.robot.root.visible = true;
        this.robot.root.position.copy(this.robotRestPosition);
        this.robot.root.scale.setScalar(ROBOT_SCALE);
        this.robot.root.rotation.y = -Math.PI * 0.5;
        this.robot.update(time, 0, 1);
        this.setDoorOpen(0);
        break;
    }
  }

  private positionChildForDeployment(progress: number): void {
    if (progress < 0.38) {
      const segment = smooth(progress / 0.38);
      this.childPrinter.root.position.set(
        0,
        MathUtils.lerp(this.childPrintPosition.y, 0.16, segment),
        MathUtils.lerp(0, 1.12, segment),
      );
      return;
    }
    if (progress < 0.72) {
      const segment = smooth((progress - 0.38) / 0.34);
      this.childPrinter.root.position.set(
        MathUtils.lerp(0, this.childDockPosition.x, segment),
        MathUtils.lerp(0.16, this.childDockPosition.y, segment),
        1.12,
      );
      return;
    }
    const segment = smooth((progress - 0.72) / 0.28);
    this.childPrinter.root.position.set(
      this.childDockPosition.x,
      this.childDockPosition.y,
      MathUtils.lerp(1.12, this.childDockPosition.z, segment),
    );
  }

  private positionRobotForDeployment(progress: number, time: number): void {
    if (progress < 0.32) {
      const segment = smooth(progress / 0.32);
      this.robot.root.position.set(
        this.robotPrintPosition.x,
        MathUtils.lerp(this.robotPrintPosition.y, 0, segment),
        MathUtils.lerp(0, 0.62, segment),
      );
      this.robot.root.rotation.y = 0;
    } else {
      const segment = smooth((progress - 0.32) / 0.68);
      this.robot.root.position.set(
        MathUtils.lerp(this.robotPrintPosition.x, this.robotRestPosition.x, segment),
        0,
        MathUtils.lerp(0.62, this.robotRestPosition.z, segment),
      );
      this.robot.root.rotation.y = MathUtils.lerp(0, -Math.PI * 0.5, MathUtils.smoothstep(segment, 0, 0.22));
    }
    const walking = MathUtils.smoothstep(progress, 0.2, 0.92) * (1 - MathUtils.smoothstep(progress, 0.92, 1));
    this.robot.root.position.y += Math.abs(Math.sin(time * 7.2)) * 0.018 * walking;
  }

  private setDoorOpen(amount: number): void {
    const open = MathUtils.clamp(amount, 0, 1);
    this.leftDoor.rotation.y = -Math.PI * 0.52 * open;
    this.rightDoor.rotation.y = Math.PI * 0.52 * open;
  }

  private advanceTo(next: FabricationPhase): void {
    this.phase = next;
    this.phaseElapsed = 0;
    this.fabricationPulse = 1;
  }

  private getPhaseProgress(): number {
    if (this.phase === 'ready' || this.phase === 'complete') return 1;
    return MathUtils.clamp(this.phaseElapsed / PHASE_DURATION[this.phase], 0, 1);
  }

  private getPhasePercent(): number {
    return Math.round(this.getPhaseProgress() * 100);
  }

  private resetSequenceVisuals(): void {
    this.childPrinter.root.visible = false;
    this.childPrinter.root.position.copy(this.childPrintPosition);
    this.childPrinter.root.scale.set(1, 0.015, 1);
    this.childPrinter.setDoorOpen(0);
    this.robot.root.visible = false;
    this.robot.root.position.copy(this.robotPrintPosition);
    this.robot.root.rotation.set(0, 0, 0);
    this.robot.root.scale.set(ROBOT_SCALE, ROBOT_SCALE * 0.015, ROBOT_SCALE);
    this.setDoorOpen(0);
  }
}

function addIndustrialStepper(
  parent: Group,
  position: readonly [number, number, number],
  bodyMaterial: MeshStandardMaterial,
  capMaterial: MeshStandardMaterial,
  shaftMaterial: MeshStandardMaterial,
): void {
  const motor = new Group();
  motor.position.set(...position);
  addRoundedBox(motor, [0.14, 0.14, 0.16], bodyMaterial, { radius: 0.018 });
  addRoundedBox(motor, [0.125, 0.125, 0.018], capMaterial, {
    position: [0, 0, 0.089],
    radius: 0.012,
  });
  addCylinder(motor, 0.022, 0.065, shaftMaterial, [0, 0, 0.115], [Math.PI * 0.5, 0, 0], 16);
  motor.add(createFasteners([
    [-0.045, -0.045, 0.101],
    [0.045, -0.045, 0.101],
    [-0.045, 0.045, 0.101],
    [0.045, 0.045, 0.101],
  ], shaftMaterial, 'front', 0.008));
  parent.add(motor);
}

function smooth(value: number): number {
  const clamped = MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}
