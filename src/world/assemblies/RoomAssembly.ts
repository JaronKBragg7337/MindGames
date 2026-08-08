import {
  AmbientLight,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Scene,
} from 'three';
import { addCylinder, addRoundedBox, createCable, createFasteners, createHazardStrip, createLabel } from '../../art/GeometryKit';
import type { MaterialLibrary } from '../../art/MaterialLibrary';
import type { WorldConfig } from '../WorldConfig';
import { ROOM } from '../layout';

export interface RoomAssembly {
  foldingRig: Group;
  signalMaterials: MeshStandardMaterial[];
  signalLights: PointLight[];
  clockHands: Group[];
  update(time: number, foldAmount: number, causalityActive: boolean): void;
}

export function buildRoom(
  scene: Scene,
  materials: MaterialLibrary,
  config: WorldConfig,
): RoomAssembly {
  scene.background = new Color(config.sky);
  scene.fog = new FogExp2(config.fog, 0.027);

  const structure = new Group();
  structure.name = 'architectural-shell';
  scene.add(structure);

  const paintedSteel = materials.paint({ color: 0x26333a, roughness: 0.58, metalness: 0.62 });
  const darkPanel = materials.paint({ color: 0x11191e, roughness: 0.7, metalness: 0.38 });
  const edge = materials.edgeSteel;
  const accent = materials.emissive(config.accent, 2.4);
  const secondary = materials.emissive(config.secondary, 1.8);
  const concreteTrim = materials.textured('concrete_floor_01', {
    repeat: [7, 9],
    normalStrength: 0.62,
    roughness: 0.96,
    metalness: 0.02,
    tint: config.index === 1 ? 0xd9c8dc : 0xd7dcda,
  });

  buildFloor(structure, materials, config, concreteTrim);
  buildWalls(structure, materials, config, darkPanel, paintedSteel, edge);
  const foldingRig = buildCeiling(structure, darkPanel, paintedSteel, edge, accent);
  buildUtilities(structure, materials, config, darkPanel, paintedSteel, edge);
  const { signalMaterials, signalLights } = buildLighting(scene, structure, materials, config, accent, secondary);
  const clockHands = buildWorldClocks(structure, materials, config);

  const hemisphere = new HemisphereLight(0xa7d5df, 0x161c1e, 0.95);
  scene.add(hemisphere);
  const ambient = new AmbientLight(0x78909a, 0.68);
  scene.add(ambient);
  const key = new DirectionalLight(0xcdeeff, config.index === 1 ? 1.85 : 2.15);
  key.position.set(-4.5, 7.5, 3.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 28;
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 12;
  key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.00035;
  scene.add(key);
  const terminalFill = new PointLight(0xc9efff, 30, 7, 2);
  terminalFill.position.set(0, 3.5, -5.7);
  scene.add(terminalFill);

  return {
    foldingRig,
    signalMaterials,
    signalLights,
    clockHands,
    update(time, foldAmount, causalityActive) {
      updateFoldingRig(foldingRig, foldAmount, time, config.index);
      signalMaterials.forEach((material, index) => {
        const pulse = 1.5 + Math.sin(time * 2.1 + index * 0.73) * 0.35;
        material.emissiveIntensity = causalityActive ? pulse * 2.4 : pulse;
        material.emissive.setHex(causalityActive ? config.secondary : config.accent);
      });
      signalLights.forEach((light, index) => {
        light.color.setHex(causalityActive ? config.secondary : config.accent);
        light.intensity = (causalityActive ? 7.5 : 3.8) + Math.sin(time * 1.8 + index) * 0.5;
      });
      clockHands.forEach((hand, index) => {
        hand.rotation.z = -time * config.timeRate * (0.03 + index * 0.012);
      });
    },
  };
}

function buildFloor(
  parent: Object3D,
  materials: MaterialLibrary,
  config: WorldConfig,
  baseMaterial: MeshStandardMaterial,
): void {
  const underlay = new Mesh(new PlaneGeometry(ROOM.width, ROOM.depth), baseMaterial);
  underlay.rotation.x = -Math.PI * 0.5;
  underlay.position.y = -0.002;
  underlay.receiveShadow = true;
  parent.add(underlay);

  const columns = 4;
  const rows = 5;
  const panelWidth = ROOM.width / columns - 0.035;
  const panelDepth = ROOM.depth / rows - 0.035;
  const panelMaterial = materials.textured('concrete_floor_01', {
    repeat: [panelWidth / 2, panelDepth / 2],
    normalStrength: 0.52,
    roughness: 0.98,
    metalness: 0.015,
    tint: 0xf4f7f5,
  });
  panelMaterial.vertexColors = true;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const seed = row * columns + column + config.index * 23;
      const geometry = new PlaneGeometry(panelWidth, panelDepth);
      const uv = geometry.getAttribute('uv');
      const offsetX = (seed * 0.137) % 1;
      const offsetY = (seed * 0.271) % 1;
      for (let index = 0; index < uv.count; index += 1) {
        uv.setXY(index, uv.getX(index) + offsetX, uv.getY(index) + offsetY);
      }
      const shade = new Color(0xffffff).offsetHSL(0, 0, ((seed % 5) - 2) * 0.015);
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let index = 0; index < colors.length; index += 3) {
        colors[index] = shade.r;
        colors[index + 1] = shade.g;
        colors[index + 2] = shade.b;
      }
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
      const panel = new Mesh(geometry, panelMaterial);
      panel.rotation.x = -Math.PI * 0.5;
      panel.rotation.z = seed % 2 === 0 ? 0 : Math.PI;
      panel.position.set(
        -ROOM.width * 0.5 + (column + 0.5) * (ROOM.width / columns),
        0.006 + ((seed % 3) - 1) * 0.0006,
        -ROOM.depth * 0.5 + (row + 0.5) * (ROOM.depth / rows),
      );
      panel.receiveShadow = true;
      parent.add(panel);
    }
  }

  const seamMaterial = materials.paint({ color: 0x11171a, roughness: 0.78, metalness: 0.35 });
  for (let column = 1; column < columns; column += 1) {
    addRoundedBox(parent, [0.026, 0.018, ROOM.depth], seamMaterial, {
      position: [-ROOM.width * 0.5 + column * (ROOM.width / columns), 0.002, 0],
      radius: 0.006,
      castShadow: false,
    });
  }
  for (let row = 1; row < rows; row += 1) {
    addRoundedBox(parent, [ROOM.width, 0.018, 0.026], seamMaterial, {
      position: [0, 0.002, -ROOM.depth * 0.5 + row * (ROOM.depth / rows)],
      radius: 0.006,
      castShadow: false,
    });
  }

  const perimeterMaterial = materials.textured('metal_plate', {
    repeat: [18, 0.7],
    normalStrength: 0.45,
    roughness: 0.8,
    metalness: 0.82,
    tint: config.index === 2 ? 0xc9d7b4 : 0xd7dcdf,
  });
  addRoundedBox(parent, [ROOM.width, 0.035, 0.32], perimeterMaterial, { position: [0, 0.025, -8.72], radius: 0.01 });
  addRoundedBox(parent, [ROOM.width, 0.035, 0.32], perimeterMaterial, { position: [0, 0.025, 8.72], radius: 0.01 });
  addRoundedBox(parent, [0.32, 0.035, ROOM.depth - 0.64], perimeterMaterial, { position: [-6.82, 0.025, 0], radius: 0.01 });
  addRoundedBox(parent, [0.32, 0.035, ROOM.depth - 0.64], perimeterMaterial, { position: [6.82, 0.025, 0], radius: 0.01 });
}

function buildWalls(
  parent: Object3D,
  materials: MaterialLibrary,
  config: WorldConfig,
  darkPanel: MeshStandardMaterial,
  paintedSteel: MeshStandardMaterial,
  edge: MeshStandardMaterial,
): void {
  const brick = materials.textured('painted_brick', {
    repeat: [ROOM.depth / 1.8, ROOM.height / 1.8],
    normalStrength: 0.5,
    roughness: 0.95,
    metalness: 0.01,
    tint: config.index === 1 ? 0xc7a8c7 : config.index === 2 ? 0xbac4a9 : 0xb9c8ce,
  });

  const west = new Mesh(new PlaneGeometry(ROOM.depth, ROOM.height), brick);
  west.rotation.set(0, Math.PI * 0.5, 0);
  west.position.set(-6.99, ROOM.height * 0.5, 0);
  west.receiveShadow = true;
  parent.add(west);
  const east = west.clone();
  east.rotation.y = -Math.PI * 0.5;
  east.position.x = 6.99;
  parent.add(east);

  const wallMaterial = materials.paint({ color: 0x202a2f, roughness: 0.72, metalness: 0.42 });
  const segmentWidth = (ROOM.width - ROOM.portalWidth) * 0.5;
  for (const z of [-8.99, 8.99]) {
    for (const side of [-1, 1]) {
      const wall = new Mesh(new PlaneGeometry(segmentWidth, ROOM.height), wallMaterial);
      wall.position.set(side * (ROOM.portalWidth * 0.5 + segmentWidth * 0.5), ROOM.height * 0.5, z);
      wall.rotation.y = z > 0 ? Math.PI : 0;
      wall.receiveShadow = true;
      parent.add(wall);
    }
  }

  const bays = 6;
  for (const side of [-1, 1]) {
    for (let bay = 0; bay < bays; bay += 1) {
      const z = -ROOM.depth * 0.5 + (bay + 0.5) * (ROOM.depth / bays);
      const panel = addRoundedBox(parent, [0.11, 2.65, 2.5], darkPanel, {
        position: [side * 6.91, 2.34, z],
        radius: 0.025,
      });
      panel.rotation.y = side > 0 ? 0 : Math.PI;
      addRoundedBox(parent, [0.14, 0.08, 2.54], edge, {
        position: [side * 6.84, 1.0, z],
        radius: 0.012,
      });
      addRoundedBox(parent, [0.14, 0.08, 2.54], edge, {
        position: [side * 6.84, 3.68, z],
        radius: 0.012,
      });
      const label = createLabel(`BAY ${String(bay + 1).padStart(2, '0')}`, 0.72, 0.18, {
        accent: config.accent,
        subtext: `${config.code}`,
      });
      label.position.set(side * 6.83, 3.17, z - 0.62);
      label.rotation.y = side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
      parent.add(label);
    }
  }

  for (let z = -7.5; z <= 7.5; z += 3) {
    for (const side of [-1, 1]) {
      const rib = new Group();
      rib.position.set(side * 6.76, 0, z);
      addRoundedBox(rib, [0.34, ROOM.height, 0.24], paintedSteel, { position: [0, ROOM.height * 0.5, 0], radius: 0.025 });
      addRoundedBox(rib, [0.41, 0.13, 0.34], edge, { position: [0, 0.34, 0], radius: 0.018 });
      addRoundedBox(rib, [0.41, 0.13, 0.34], edge, { position: [0, ROOM.height - 0.34, 0], radius: 0.018 });
      const bolts = createFasteners(
        [[-side * 0.18, 0.35, -0.1], [-side * 0.18, 0.35, 0.1], [-side * 0.18, ROOM.height - 0.35, -0.1], [-side * 0.18, ROOM.height - 0.35, 0.1]],
        edge,
        'front',
        0.026,
      );
      bolts.rotation.y = side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      rib.add(bolts);
      parent.add(rib);
    }
  }
}

function buildCeiling(
  parent: Object3D,
  darkPanel: MeshStandardMaterial,
  paintedSteel: MeshStandardMaterial,
  edge: MeshStandardMaterial,
  accent: MeshStandardMaterial,
): Group {
  const ceiling = addRoundedBox(parent, [ROOM.width, 0.18, ROOM.depth], darkPanel, {
    position: [0, ROOM.height + 0.09, 0],
    radius: 0.025,
    receiveShadow: true,
  });
  ceiling.receiveShadow = true;

  for (let z = -7.5; z <= 7.5; z += 3) {
    addRoundedBox(parent, [ROOM.width - 0.5, 0.16, 0.42], edge, {
      position: [0, ROOM.height - 0.12, z],
      radius: 0.018,
    });
    addRoundedBox(parent, [ROOM.width - 0.7, 0.38, 0.11], paintedSteel, {
      position: [0, ROOM.height - 0.33, z],
      radius: 0.016,
    });
    addRoundedBox(parent, [ROOM.width - 0.5, 0.1, 0.32], edge, {
      position: [0, ROOM.height - 0.56, z],
      radius: 0.015,
    });
  }

  const rig = new Group();
  rig.name = 'folding-architecture-rig';
  rig.position.set(0, ROOM.height - 0.66, 0);
  parent.add(rig);
  for (const side of [-1, 1]) {
    const wing = new Group();
    wing.name = side < 0 ? 'fold-wing-west' : 'fold-wing-east';
    wing.position.x = side * 4.2;
    addRoundedBox(wing, [3.8, 0.16, 7.1], paintedSteel, { position: [-side * 1.9, 0, 0], radius: 0.045 });
    for (let z = -3; z <= 3; z += 1.5) {
      addRoundedBox(wing, [3.65, 0.11, 0.08], edge, { position: [-side * 1.9, -0.12, z], radius: 0.012 });
    }
    for (let z = -2.8; z <= 2.8; z += 1.4) {
      const strip = addRoundedBox(wing, [0.09, 0.08, 0.65], accent, { position: [-side * 3.55, -0.15, z], radius: 0.02 });
      strip.castShadow = false;
    }
    rig.add(wing);
  }
  return rig;
}

function buildUtilities(
  parent: Object3D,
  materials: MaterialLibrary,
  config: WorldConfig,
  darkPanel: MeshStandardMaterial,
  paintedSteel: MeshStandardMaterial,
  edge: MeshStandardMaterial,
): void {
  const duct = new Group();
  duct.position.set(-5.75, 4.35, 0);
  addRoundedBox(duct, [0.7, 0.62, 15.6], paintedSteel, { radius: 0.055 });
  for (let z = -7.25; z <= 7.25; z += 1.45) {
    addRoundedBox(duct, [0.78, 0.69, 0.055], edge, { position: [0, 0, z], radius: 0.01 });
  }
  parent.add(duct);

  const pipeMaterial = materials.paint({ color: 0x59666b, roughness: 0.39, metalness: 0.84 });
  const warningPipe = materials.paint({ color: config.secondary, roughness: 0.48, metalness: 0.68 });
  for (let z = -7; z <= 7; z += 2) {
    addCylinder(parent, 0.095, 1.9, pipeMaterial, [5.95, 4.58, z], [Math.PI * 0.5, 0, 0], 18);
    addCylinder(parent, 0.13, 0.08, warningPipe, [5.95, 4.58, z - 0.92], [Math.PI * 0.5, 0, 0], 18);
    addCylinder(parent, 0.13, 0.08, warningPipe, [5.95, 4.58, z + 0.92], [Math.PI * 0.5, 0, 0], 18);
  }

  const cableMaterial = materials.paint({ color: 0x101417, roughness: 0.9, metalness: 0.02 });
  const dataCableMaterial = materials.paint({ color: config.accent, roughness: 0.64, metalness: 0.15 });
  parent.add(createCable([[-5.7, 3.95, -8], [-5.55, 3.75, -4], [-5.8, 3.82, 0], [-5.55, 3.67, 4], [-5.7, 3.92, 8]], 0.035, cableMaterial));
  parent.add(createCable([[5.72, 4.1, -8], [5.5, 3.94, -3], [5.76, 3.82, 1], [5.46, 3.9, 5], [5.7, 4.05, 8]], 0.021, dataCableMaterial));

  const ventGroup = new Group();
  ventGroup.position.set(6.82, 2.6, -3.6);
  addRoundedBox(ventGroup, [0.12, 1.35, 2.1], darkPanel, { radius: 0.04 });
  for (let i = -5; i <= 5; i += 1) {
    addRoundedBox(ventGroup, [0.15, 0.055, 1.75], edge, { position: [-0.08, i * 0.105, 0], radius: 0.01 });
  }
  parent.add(ventGroup);

  for (const z of [-5.8, 5.8]) {
    const hazard = createHazardStrip(2.4, 0.13, config.secondary);
    hazard.rotation.x = -Math.PI * 0.5;
    hazard.position.set(0, 0.035, z);
    parent.add(hazard);
  }
}

function buildLighting(
  scene: Scene,
  parent: Object3D,
  materials: MaterialLibrary,
  config: WorldConfig,
  accent: MeshStandardMaterial,
  secondary: MeshStandardMaterial,
): { signalMaterials: MeshStandardMaterial[]; signalLights: PointLight[] } {
  const signalMaterials: MeshStandardMaterial[] = [];
  const signalLights: PointLight[] = [];
  const housing = materials.paint({ color: 0x121b20, roughness: 0.48, metalness: 0.7 });

  for (let z = -5.6; z <= 5.6; z += 3.75) {
    const bank = new Group();
    bank.position.set(0, 4.88, z);
    addRoundedBox(bank, [3.3, 0.18, 0.64], housing, { radius: 0.07 });
    const lampMaterial = (Math.abs(z) < 1 ? secondary : accent).clone();
    signalMaterials.push(lampMaterial);
    addRoundedBox(bank, [2.86, 0.055, 0.4], lampMaterial, { position: [0, -0.12, 0], radius: 0.035, castShadow: false });
    for (const x of [-1.5, 1.5]) {
      addCylinder(bank, 0.055, 0.1, materials.edgeSteel, [x, 0.03, -0.25], [Math.PI * 0.5, 0, 0], 12);
      addCylinder(bank, 0.055, 0.1, materials.edgeSteel, [x, 0.03, 0.25], [Math.PI * 0.5, 0, 0], 12);
    }
    parent.add(bank);
  }

  for (const [x, z] of [[-4.2, -3.8], [4.2, 3.8]] as const) {
    const light = new PointLight(config.accent, 3.8, 8, 2);
    light.position.set(x, 3.7, z);
    scene.add(light);
    signalLights.push(light);
  }
  return { signalMaterials, signalLights };
}

function buildWorldClocks(
  parent: Object3D,
  materials: MaterialLibrary,
  config: WorldConfig,
): Group[] {
  const clockHands: Group[] = [];
  for (let index = 0; index < 3; index += 1) {
    const clock = new Group();
    clock.position.set(-6.78, 2.15, -2.1 + index * 2.1);
    clock.rotation.y = Math.PI * 0.5;
    addCylinder(clock, 0.44, 0.08, materials.darkSteel, [0, 0, 0], [Math.PI * 0.5, 0, 0], 32);
    addCylinder(clock, 0.39, 0.012, materials.paint({ color: 0x1e292e, roughness: 0.62, metalness: 0.42 }), [0, 0, -0.052], [Math.PI * 0.5, 0, 0], 32);
    for (let tick = 0; tick < 12; tick += 1) {
      const angle = tick / 12 * Math.PI * 2;
      addRoundedBox(clock, [0.018, tick % 3 === 0 ? 0.09 : 0.055, 0.012], materials.edgeSteel, {
        position: [Math.sin(angle) * 0.32, Math.cos(angle) * 0.32, -0.066],
        rotation: [0, 0, -angle],
        radius: 0.004,
      });
    }
    const hands = new Group();
    addRoundedBox(hands, [0.025, 0.27, 0.014], materials.emissive(index === config.index ? config.accent : 0x79949d, 2.2), {
      position: [0, 0.12, -0.074],
      radius: 0.006,
      castShadow: false,
    });
    clock.add(hands);
    clockHands.push(hands);
    parent.add(clock);
  }
  return clockHands;
}

function updateFoldingRig(rig: Group, foldAmount: number, time: number, worldIndex: number): void {
  rig.children.forEach((wing, index) => {
    const direction = index === 0 ? -1 : 1;
    const ambientFold = worldIndex === 2 ? 0.18 + Math.sin(time * 0.24 + index) * 0.12 : 0;
    wing.rotation.z = direction * (foldAmount * 1.03 + ambientFold);
    wing.rotation.y = worldIndex === 2 ? Math.sin(time * 0.17 + index * 1.8) * 0.08 : 0;
  });
}
