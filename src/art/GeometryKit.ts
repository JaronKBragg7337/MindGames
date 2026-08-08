import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Material } from 'three';

export interface BoxOptions {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  radius?: number;
  segments?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  name?: string;
}

export function addRoundedBox(
  parent: Object3D,
  size: readonly [number, number, number],
  material: Material,
  options: BoxOptions = {},
): Mesh {
  const geometry = new RoundedBoxGeometry(
    size[0],
    size[1],
    size[2],
    options.segments ?? 2,
    Math.min(options.radius ?? 0.025, Math.min(...size) * 0.45),
  );
  const mesh = new Mesh(geometry, material);
  if (options.position) mesh.position.set(...options.position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}

export function addCylinder(
  parent: Object3D,
  radius: number,
  depth: number,
  material: Material,
  position: readonly [number, number, number],
  rotation: readonly [number, number, number] = [0, 0, 0],
  radialSegments = 16,
): Mesh {
  const mesh = new Mesh(new CylinderGeometry(radius, radius, depth, radialSegments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createFasteners(
  positions: readonly (readonly [number, number, number])[],
  material: Material,
  facing: 'front' | 'up' = 'front',
  radius = 0.026,
): InstancedMesh {
  const geometry = new CylinderGeometry(radius, radius * 0.88, 0.018, 10);
  const mesh = new InstancedMesh(geometry, material, positions.length);
  const matrix = new Matrix4();
  const quaternion = new Quaternion().setFromEuler(
    new Euler(facing === 'front' ? Math.PI * 0.5 : 0, 0, 0, 'XYZ'),
  );
  positions.forEach((position, index) => {
    matrix.compose(new Vector3(...position), quaternion, new Vector3(1, 1, 1));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createCable(
  points: readonly (readonly [number, number, number])[],
  radius: number,
  material: Material,
): Mesh {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
  const geometry = new TubeGeometry(curve, Math.max(12, points.length * 7), radius, 8, false);
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

export function createLabel(
  text: string,
  width: number,
  height: number,
  options: {
    accent?: number;
    background?: string;
    foreground?: string;
    subtext?: string;
    align?: CanvasTextAlign;
  } = {},
): Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = Math.max(128, Math.round(768 * (height / width)));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');

  const accent = new Color(options.accent ?? 0x53e8ff).getStyle();
  context.fillStyle = options.background ?? 'rgba(3, 10, 14, 0.94)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = accent;
  context.fillRect(0, 0, 12, canvas.height);
  context.fillRect(32, 24, 86, 4);
  context.textAlign = options.align ?? 'left';
  context.textBaseline = 'middle';
  context.font = '700 66px Arial, sans-serif';
  context.fillStyle = options.foreground ?? '#e9fbff';
  const x = options.align === 'center' ? canvas.width * 0.5 : 34;
  context.fillText(text.toUpperCase(), x, canvas.height * (options.subtext ? 0.43 : 0.54));
  if (options.subtext) {
    context.font = '500 29px monospace';
    context.fillStyle = '#77949d';
    context.fillText(options.subtext.toUpperCase(), x, canvas.height * 0.72);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map: texture, transparent: true, side: DoubleSide });
  return new Mesh(new PlaneGeometry(width, height), material);
}

export function createHazardStrip(width: number, height: number, accent = 0xffad45): Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.fillStyle = '#111619';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = new Color(accent).getStyle();
  for (let x = -80; x < canvas.width + 80; x += 104) {
    context.beginPath();
    context.moveTo(x, canvas.height);
    context.lineTo(x + 42, 0);
    context.lineTo(x + 92, 0);
    context.lineTo(x + 50, canvas.height);
    context.closePath();
    context.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const material = new MeshStandardMaterial({ map: texture, roughness: 0.64, metalness: 0.25 });
  return new Mesh(new PlaneGeometry(width, height), material);
}

export function createGroup(name: string): Group {
  const group = new Group();
  group.name = name;
  return group;
}
