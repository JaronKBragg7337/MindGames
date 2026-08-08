import { Euler, MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CollisionSystem } from './CollisionSystem';
import type { InputController } from './InputController';

export class PlayerController {
  readonly camera: PerspectiveCamera;
  readonly position = new Vector3(0, 0, 4.8);
  readonly velocity = new Vector3();
  readonly radius = 0.34;
  readonly eyeHeight = 1.68;
  yaw = 0;
  pitch = -0.035;

  private collisionSystem: CollisionSystem;
  private bobPhase = 0;
  private bobAmount = 0;

  constructor(camera: PerspectiveCamera, collisionSystem: CollisionSystem) {
    this.camera = camera;
    this.collisionSystem = collisionSystem;
    this.syncCamera();
  }

  setCollisionSystem(system: CollisionSystem): void {
    this.collisionSystem = system;
  }

  update(delta: number, input: InputController): void {
    const look = input.consumeLookDelta();
    this.yaw -= look.x;
    this.pitch = MathUtils.clamp(this.pitch - look.y, -1.35, 1.35);

    const forward = new Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const requested = forward.multiplyScalar(input.movement.y)
      .add(right.multiplyScalar(input.movement.x));
    if (requested.lengthSq() > 1) requested.normalize();

    const speed = input.isSprinting() ? 4.25 : 2.75;
    const response = 1 - Math.exp(-delta * (requested.lengthSq() > 0 ? 12 : 9));
    this.velocity.lerp(requested.multiplyScalar(speed), response);

    const displacement = this.velocity.clone().multiplyScalar(delta);
    this.position.copy(this.collisionSystem.resolve(this.position, displacement, this.radius));

    const moving = Math.min(1, this.velocity.length() / 2.75);
    this.bobPhase += delta * (5.5 + moving * 5.2);
    this.bobAmount = MathUtils.damp(this.bobAmount, moving, 9, delta);
    this.syncCamera();
  }

  teleport(position: Vector3, yaw = this.yaw): void {
    this.position.copy(position);
    this.yaw = yaw;
    this.velocity.multiplyScalar(0.75);
    this.syncCamera();
  }

  getFacingDirection(target = new Vector3()): Vector3 {
    return target.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  private syncCamera(): void {
    const bobY = Math.sin(this.bobPhase) * 0.022 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.013 * this.bobAmount;
    this.camera.position.set(
      this.position.x + bobX * Math.cos(this.yaw),
      this.position.y + this.eyeHeight + bobY,
      this.position.z - bobX * Math.sin(this.yaw),
    );
    this.camera.quaternion.setFromEuler(new Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }
}

