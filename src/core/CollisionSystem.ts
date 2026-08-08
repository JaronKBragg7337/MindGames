import { Vector3 } from 'three';

export interface ColliderSpec {
  id: string;
  center: readonly [number, number, number];
  size: readonly [number, number, number];
  enabled?: () => boolean;
}

interface Bounds {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  enabled?: () => boolean;
}

export class CollisionSystem {
  private readonly bounds: Bounds[];

  constructor(specs: readonly ColliderSpec[]) {
    this.bounds = specs.map((spec) => ({
      id: spec.id,
      minX: spec.center[0] - spec.size[0] * 0.5,
      maxX: spec.center[0] + spec.size[0] * 0.5,
      minZ: spec.center[2] - spec.size[2] * 0.5,
      maxZ: spec.center[2] + spec.size[2] * 0.5,
      enabled: spec.enabled,
    }));
  }

  resolve(position: Vector3, displacement: Vector3, radius: number): Vector3 {
    const resolved = position.clone();

    resolved.x += displacement.x;
    if (this.intersects(resolved.x, position.z, radius)) {
      resolved.x = position.x;
    }

    resolved.z += displacement.z;
    if (this.intersects(resolved.x, resolved.z, radius)) {
      resolved.z = position.z;
    }

    return resolved;
  }

  private intersects(x: number, z: number, radius: number): boolean {
    for (const bound of this.bounds) {
      if (bound.enabled && !bound.enabled()) continue;
      if (
        x > bound.minX - radius &&
        x < bound.maxX + radius &&
        z > bound.minZ - radius &&
        z < bound.maxZ + radius
      ) {
        return true;
      }
    }
    return false;
  }
}

