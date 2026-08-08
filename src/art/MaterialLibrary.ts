import {
  CanvasTexture,
  Color,
  LinearFilter,
  LoadingManager,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from 'three';

export type PbrAssetId =
  | 'concrete_floor_01'
  | 'metal_plate'
  | 'painted_brick'
  | 'wood_table_worn';

interface TextureSet {
  color: Texture;
  normal: Texture;
  arm: Texture;
}

interface TexturedMaterialOptions {
  repeat?: readonly [number, number];
  offset?: readonly [number, number];
  rotation?: number;
  tint?: number;
  normalStrength?: number;
  roughness?: number;
  metalness?: number;
}

interface PaintOptions {
  color: number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  emissive?: number;
  emissiveIntensity?: number;
}

const textureFiles: Record<PbrAssetId, readonly [string, string, string]> = {
  concrete_floor_01: [
    'concrete_floor_01_diff_1k.jpg',
    'concrete_floor_01_nor_gl_1k.jpg',
    'concrete_floor_01_arm_1k.jpg',
  ],
  metal_plate: [
    'metal_plate_diff_1k.jpg',
    'metal_plate_nor_gl_1k.jpg',
    'metal_plate_arm_1k.jpg',
  ],
  painted_brick: [
    'painted_brick_diff_1k.jpg',
    'painted_brick_nor_gl_1k.jpg',
    'painted_brick_arm_1k.jpg',
  ],
  wood_table_worn: [
    'wood_table_worn_diff_1k.jpg',
    'wood_table_worn_nor_gl_1k.jpg',
    'wood_table_worn_arm_1k.jpg',
  ],
};

export class MaterialLibrary {
  readonly darkSteel: MeshPhysicalMaterial;
  readonly edgeSteel: MeshPhysicalMaterial;
  readonly rubber: MeshStandardMaterial;
  readonly glass: MeshPhysicalMaterial;

  private readonly sets = new Map<PbrAssetId, TextureSet>();
  private readonly texturedCache = new Map<string, MeshStandardMaterial>();
  private readonly paintCache = new Map<string, MeshPhysicalMaterial>();
  private readonly roughnessNoise: CanvasTexture;

  constructor() {
    this.roughnessNoise = this.createRoughnessNoise();
    this.darkSteel = this.paint({ color: 0x111920, roughness: 0.42, metalness: 0.78 });
    this.edgeSteel = this.paint({ color: 0x87949a, roughness: 0.27, metalness: 0.92 });
    this.rubber = new MeshStandardMaterial({ color: 0x101214, roughness: 0.86, metalness: 0.02 });
    this.glass = new MeshPhysicalMaterial({
      color: 0xc2f5ff,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.28,
      transparent: true,
      opacity: 0.38,
      thickness: 0.018,
      ior: 1.47,
      clearcoat: 1,
    });
  }

  async load(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const manager = new LoadingManager();
    manager.onProgress = (_url, loaded, total) => onProgress?.(loaded, total);
    const loader = new TextureLoader(manager);
    const base = `${import.meta.env.BASE_URL}assets/textures`;

    await Promise.all(
      (Object.entries(textureFiles) as [PbrAssetId, readonly [string, string, string]][])
        .map(async ([id, files]) => {
          const root = `${base}/${id}`;
          const [color, normal, arm] = await Promise.all([
            loader.loadAsync(`${root}/${files[0]}`),
            loader.loadAsync(`${root}/${files[1]}`),
            loader.loadAsync(`${root}/${files[2]}`),
          ]);
          color.colorSpace = SRGBColorSpace;
          normal.colorSpace = '';
          arm.colorSpace = '';
          this.sets.set(id, { color, normal, arm });
        }),
    );
  }

  textured(id: PbrAssetId, options: TexturedMaterialOptions = {}): MeshStandardMaterial {
    const cacheKey = `${id}:${JSON.stringify(options)}`;
    const cached = this.texturedCache.get(cacheKey);
    if (cached) return cached;
    const source = this.sets.get(id);
    if (!source) throw new Error(`PBR asset ${id} was used before loading completed.`);
    const repeat = options.repeat ?? [1, 1];
    const offset = options.offset ?? [0, 0];
    const rotation = options.rotation ?? 0;
    const color = this.prepareTexture(source.color, repeat, offset, rotation);
    const normal = this.prepareTexture(source.normal, repeat, offset, rotation);
    const arm = this.prepareTexture(source.arm, repeat, offset, rotation);

    const material = new MeshStandardMaterial({
      color: options.tint ?? 0xffffff,
      map: color,
      normalMap: normal,
      normalScale: new Vector2(
        options.normalStrength ?? 0.68,
        options.normalStrength ?? 0.68,
      ),
      roughnessMap: arm,
      metalnessMap: arm,
      roughness: options.roughness ?? 0.94,
      metalness: options.metalness ?? 0.08,
    });
    this.texturedCache.set(cacheKey, material);
    return material;
  }

  paint(options: PaintOptions): MeshPhysicalMaterial {
    const cacheKey = JSON.stringify(options);
    const cached = this.paintCache.get(cacheKey);
    if (cached) return cached;
    const roughnessMap = this.roughnessNoise.clone();
    roughnessMap.needsUpdate = true;
    roughnessMap.repeat.set(3.7, 3.7);
    const material = new MeshPhysicalMaterial({
      color: options.color,
      roughness: options.roughness ?? 0.58,
      roughnessMap,
      metalness: options.metalness ?? 0.18,
      clearcoat: options.clearcoat ?? 0.08,
      clearcoatRoughness: 0.55,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });
    this.paintCache.set(cacheKey, material);
    return material;
  }

  emissive(color: number, intensity = 3): MeshStandardMaterial {
    return new MeshStandardMaterial({
      color: new Color(color).multiplyScalar(0.16),
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 0.34,
      metalness: 0.12,
      toneMapped: true,
    });
  }

  private prepareTexture(
    source: Texture,
    repeat: readonly [number, number],
    offset: readonly [number, number],
    rotation: number,
  ): Texture {
    const texture = source.clone();
    texture.needsUpdate = true;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.offset.set(offset[0], offset[1]);
    texture.center.set(0.5, 0.5);
    texture.rotation = rotation;
    texture.anisotropy = 4;
    texture.minFilter = LinearFilter;
    return texture;
  }

  private createRoughnessNoise(): CanvasTexture {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable.');
    const image = context.createImageData(size, size);

    let seed = 0x51f15e;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    for (let i = 0; i < image.data.length; i += 4) {
      const broad = Math.sin((i / 4 % size) * 0.23) * 7;
      const value = Math.max(118, Math.min(225, 174 + broad + (random() - 0.5) * 34));
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    return texture;
  }
}
