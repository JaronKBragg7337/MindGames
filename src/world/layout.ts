import type { ColliderSpec } from '../core/CollisionSystem';

export const ROOM = Object.freeze({
  width: 14,
  depth: 18,
  height: 5.4,
  wallThickness: 0.22,
  portalWidth: 3.4,
  portalHeight: 2.8,
  portalPlaneZ: 8.84,
});

export interface AssemblyNode {
  id: string;
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  supportId?: string;
  supportTolerance?: number;
}

export const ASSEMBLY_NODES: readonly AssemblyNode[] = [
  { id: 'room.floor', center: [0, -0.1, 0], size: [14, 0.2, 18] },
  {
    id: 'terminal.plinth',
    center: [0, 0.12, -7.55],
    size: [4.8, 0.24, 1.45],
    supportId: 'room.floor',
  },
  {
    id: 'terminal.cabinet.left',
    center: [-1.7, 0.69, -7.55],
    size: [1.35, 0.9, 1.12],
    supportId: 'terminal.plinth',
  },
  {
    id: 'terminal.cabinet.right',
    center: [1.7, 0.69, -7.55],
    size: [1.35, 0.9, 1.12],
    supportId: 'terminal.plinth',
  },
  {
    id: 'terminal.worktop',
    center: [0, 1.2, -7.55],
    size: [5, 0.12, 1.6],
    supportId: 'terminal.cabinet.left',
    supportTolerance: 1.75,
  },
  {
    id: 'terminal.monitor-stand',
    center: [0, 1.35, -7.88],
    size: [0.7, 0.18, 0.46],
    supportId: 'terminal.worktop',
  },
  {
    id: 'terminal.monitor-housing',
    center: [0, 1.93, -8.02],
    size: [1.72, 0.98, 0.18],
    supportId: 'terminal.monitor-stand',
    supportTolerance: 0.09,
  },
  {
    id: 'printer.plinth',
    center: [4.75, 0.1, 1.9],
    size: [1.9, 0.2, 2.2],
    supportId: 'room.floor',
  },
  {
    id: 'printer.cabinet',
    center: [4.75, 0.75, 1.9],
    size: [1.65, 1.1, 1.9],
    supportId: 'printer.plinth',
  },
  {
    id: 'printer.chamber',
    center: [4.75, 2.05, 1.9],
    size: [1.55, 1.5, 1.65],
    supportId: 'printer.cabinet',
  },
  {
    id: 'relay.plinth',
    center: [-4.75, 0.1, 0.7],
    size: [1.35, 0.2, 1.35],
    supportId: 'room.floor',
  },
  {
    id: 'relay.pedestal',
    center: [-4.75, 0.72, 0.7],
    size: [1.05, 1.04, 1.05],
    supportId: 'relay.plinth',
  },
  {
    id: 'relay.control',
    center: [-4.75, 1.34, 0.62],
    size: [0.7, 0.2, 0.72],
    supportId: 'relay.pedestal',
  },
] as const;

export const BASE_COLLIDERS: readonly ColliderSpec[] = [
  { id: 'wall.west', center: [-7.11, 2.7, 0], size: [0.22, 5.4, 18.44] },
  { id: 'wall.east', center: [7.11, 2.7, 0], size: [0.22, 5.4, 18.44] },
  { id: 'wall.north.left', center: [-4.45, 2.7, -9.11], size: [5.5, 5.4, 0.22] },
  { id: 'wall.north.right', center: [4.45, 2.7, -9.11], size: [5.5, 5.4, 0.22] },
  { id: 'wall.south.left', center: [-4.45, 2.7, 9.11], size: [5.5, 5.4, 0.22] },
  { id: 'wall.south.right', center: [4.45, 2.7, 9.11], size: [5.5, 5.4, 0.22] },
  { id: 'terminal.left', center: [-1.76, 0.72, -7.55], size: [1.42, 1.44, 1.46] },
  { id: 'terminal.right', center: [1.76, 0.72, -7.55], size: [1.42, 1.44, 1.46] },
  { id: 'printer', center: [4.75, 1.55, 1.9], size: [1.9, 3.1, 2.2] },
  { id: 'relay', center: [-4.75, 0.75, 0.7], size: [1.35, 1.5, 1.35] },
] as const;

