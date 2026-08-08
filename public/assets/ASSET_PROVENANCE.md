# Asset provenance

All third-party art assets in this directory are distributed by
[Poly Haven](https://polyhaven.com/) under the
[CC0 1.0 license](https://polyhaven.com/license). Attribution is not required
by CC0, but the project records it for provenance and gratitude.

| Local material | Source | Authors | Native physical width | Included maps |
| --- | --- | --- | ---: | --- |
| `concrete_floor_01` | [Concrete Floor 01](https://polyhaven.com/a/concrete_floor_01) | Rob Tuytel | 2.0 m | 1K color, OpenGL normal, ARM |
| `metal_plate` | [Metal Plate](https://polyhaven.com/a/metal_plate) | Rob Tuytel | 0.5 m | 1K color, OpenGL normal, ARM |
| `painted_brick` | [Painted Brick](https://polyhaven.com/a/painted_brick) | Amal Kumar | 1.8 m | 1K color, OpenGL normal, ARM |
| `wood_table_worn` | [Wood Table Worn](https://polyhaven.com/a/wood_table_worn) | Dimitrios Savva, Rico Cilliers | 0.55 m | 1K color, OpenGL normal, ARM |

The ARM image uses the red, green, and blue channels for ambient occlusion,
roughness, and metalness respectively. Browser delivery uses the 1K JPEGs to
keep the mobile payload reasonable. Material repetition is calibrated from each
asset's published physical width; floor slabs also receive per-slab UV rotation
and tint variation to break visible tiling.

Exact download URLs and publisher-provided MD5 integrity hashes are recorded in
the repository-root `assets.manifest.json`. Run `npm run assets` to reproduce the
files or `npm run validate:assets` to verify an existing checkout.

