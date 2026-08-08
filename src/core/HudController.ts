export class HudController {
  private readonly hud = this.requireElement('hud');
  private readonly worldName = this.requireElement('world-name');
  private readonly worldRules = this.requireElement('world-rules');
  private readonly depthValue = this.requireElement('depth-value');
  private readonly action = this.requireElement<HTMLButtonElement>('action');
  private readonly actionLabel = this.requireElement('action-label');
  private readonly message = this.requireElement('message');
  private readonly crosshair = this.requireElement('crosshair');
  private messageTimer = 0;

  show(): void {
    this.hud.classList.remove('is-hidden');
  }

  setWorld(name: string, rules: string, depth: number, accent: string): void {
    this.worldName.textContent = name;
    this.worldRules.textContent = rules;
    this.depthValue.textContent = depth.toString().padStart(2, '0');
    document.documentElement.style.setProperty('--cyan', accent);
  }

  setAction(label: string | null): void {
    this.action.classList.toggle('is-hidden', !label);
    this.crosshair.classList.toggle('is-active', Boolean(label));
    if (label) this.actionLabel.textContent = label;
  }

  announce(text: string, duration = 2.8): void {
    this.message.textContent = text;
    this.message.classList.add('is-visible');
    this.messageTimer = duration;
  }

  update(delta: number): void {
    if (this.messageTimer <= 0) return;
    this.messageTimer -= delta;
    if (this.messageTimer <= 0) this.message.classList.remove('is-visible');
  }

  private requireElement<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing interface element #${id}`);
    return element as T;
  }
}

