import { Vector2 } from 'three';

interface PointerRecord {
  id: number;
  lastX: number;
  lastY: number;
}

export class InputController {
  readonly movement = new Vector2();
  readonly isCoarsePointer = matchMedia('(pointer: coarse)').matches;

  private readonly canvas: HTMLCanvasElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly joystick: HTMLElement;
  private readonly joystickKnob: HTMLElement;
  private readonly keys = new Set<string>();
  private readonly touchMove = new Vector2();
  private readonly lookDelta = new Vector2();
  private joystickPointer: PointerRecord | null = null;
  private lookPointer: PointerRecord | null = null;
  private joystickOrigin = new Vector2();
  private interactQueued = false;
  private enabled = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.actionButton = this.requireElement<HTMLButtonElement>('action');
    this.joystick = this.requireElement('joystick');
    this.joystickKnob = this.requireElement('joystick-knob');

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.reset);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    this.canvas.addEventListener('pointermove', this.onPointerMove, { passive: false });
    this.canvas.addEventListener('pointerup', this.onPointerUp, { passive: false });
    this.canvas.addEventListener('pointercancel', this.onPointerUp, { passive: false });
    this.actionButton.addEventListener('pointerdown', this.onAction, { passive: false });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  update(): void {
    const keyboardX = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) -
      Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const keyboardY = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));

    this.movement.set(keyboardX + this.touchMove.x, keyboardY + this.touchMove.y);
    if (this.movement.lengthSq() > 1) this.movement.normalize();
  }

  consumeLookDelta(): Vector2 {
    const delta = this.lookDelta.clone();
    this.lookDelta.set(0, 0);
    return delta;
  }

  consumeInteract(): boolean {
    const queued = this.interactQueued;
    this.interactQueued = false;
    return queued;
  }

  isSprinting(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    this.keys.add(event.code);
    if (event.code === 'KeyE' && !event.repeat) this.interactQueued = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();

    if (event.pointerType === 'mouse') {
      if (document.pointerLockElement !== this.canvas) {
        void this.canvas.requestPointerLock();
      }
      return;
    }

    this.canvas.setPointerCapture(event.pointerId);
    if (event.clientX < window.innerWidth * 0.5 && !this.joystickPointer) {
      this.joystickPointer = { id: event.pointerId, lastX: event.clientX, lastY: event.clientY };
      this.joystickOrigin.set(event.clientX, event.clientY);
      this.joystick.style.left = `${event.clientX}px`;
      this.joystick.style.top = `${event.clientY}px`;
      this.joystick.classList.add('is-active');
      this.updateJoystick(event.clientX, event.clientY);
    } else if (!this.lookPointer) {
      this.lookPointer = { id: event.pointerId, lastX: event.clientX, lastY: event.clientY };
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled || event.pointerType === 'mouse') return;
    event.preventDefault();

    if (this.joystickPointer?.id === event.pointerId) {
      this.updateJoystick(event.clientX, event.clientY);
      return;
    }

    if (this.lookPointer?.id === event.pointerId) {
      const scale = Math.max(0.62, Math.min(1.15, window.devicePixelRatio * 0.72));
      this.lookDelta.x += (event.clientX - this.lookPointer.lastX) * 0.0033 * scale;
      this.lookDelta.y += (event.clientY - this.lookPointer.lastY) * 0.0028 * scale;
      this.lookPointer.lastX = event.clientX;
      this.lookPointer.lastY = event.clientY;
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.joystickPointer?.id === event.pointerId) {
      this.joystickPointer = null;
      this.touchMove.set(0, 0);
      this.joystick.classList.remove('is-active');
      this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    if (this.lookPointer?.id === event.pointerId) this.lookPointer = null;
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || document.pointerLockElement !== this.canvas) return;
    this.lookDelta.x += event.movementX * 0.00175;
    this.lookDelta.y += event.movementY * 0.00155;
  };

  private readonly onPointerLockChange = (): void => {
    if (document.pointerLockElement !== this.canvas) this.keys.clear();
  };

  private readonly onAction = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (this.enabled) this.interactQueued = true;
  };

  private readonly reset = (): void => {
    this.keys.clear();
    this.touchMove.set(0, 0);
    this.movement.set(0, 0);
    this.lookDelta.set(0, 0);
    this.joystickPointer = null;
    this.lookPointer = null;
    this.joystick.classList.remove('is-active');
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
  };

  private updateJoystick(x: number, y: number): void {
    const maximum = 43;
    const offset = new Vector2(x, y).sub(this.joystickOrigin);
    if (offset.length() > maximum) offset.setLength(maximum);
    const normalized = offset.clone().divideScalar(maximum);
    const deadZone = 0.08;

    this.touchMove.set(
      Math.abs(normalized.x) < deadZone ? 0 : normalized.x,
      Math.abs(normalized.y) < deadZone ? 0 : -normalized.y,
    );
    this.joystickKnob.style.transform =
      `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`;
  }

  private requireElement<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing interface element #${id}`);
    return element as T;
  }
}

