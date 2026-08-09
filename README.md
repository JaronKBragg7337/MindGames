# MindGames — Recursive Reality

**Live build:** https://jaronkbragg7337.github.io/MindGames/

MindGames is a mobile-first Three.js experiment about live worlds nested inside
other worlds. A computer display begins as a screen, becomes a perspective-aware
window, and unfolds into a traversable portal. The current vertical slice is the
foundation for recursive worlds, cross-reality causality, scale shifts, folding
architecture, and variable gravity.

The Reality Lab also contains a complete recursive fabrication event: a
real-scale industrial parent printer manufactures a smaller CoreXY printer,
which docks, powers up, and manufactures an articulated service robot. The
sequence is deliberately bounded to one child and one robot per world for
mobile performance, while every world continues simulating off-camera.

No installation or account is needed to play the public build.

## Controls

- **Phone / tablet:** press and drag anywhere on the left side to reveal the
  temporary movement stick. Drag the right side to look. The contextual action
  button appears only when an object can be used.
- **Desktop:** click to capture the pointer, use `WASD` to move, the mouse to
  look, `Shift` to move faster, and `E` to interact. Press `Esc` to release the
  pointer.

Landscape orientation and headphones are recommended, but portrait layouts are
fully supported.

## Development

```bash
npm install
npm run assets
npm run dev
```

Before a build is published:

```bash
npm run check
```

`check` type-checks the project, validates the authored world dimensions and
collision/support rules, confirms all CC0 material files and checksums, and
creates a production build.

## Asset policy

Geometry is authored procedurally in real-world metres so visual parts and
collision bounds come from the same assemblies. Third-party textures are CC0
assets fetched reproducibly from Poly Haven. Full source, license, physical
scale, and checksum data lives in [`public/assets/ASSET_PROVENANCE.md`](public/assets/ASSET_PROVENANCE.md)
and [`assets.manifest.json`](assets.manifest.json).

Printer proportions and mechanical construction are grounded in official
BigRep specifications and the open-hardware Voron V0.2r1 CAD/drawings. The
original procedural models, exact measurements, scaling rules, and source links
are documented in
[`public/assets/FABRICATION_REFERENCES.md`](public/assets/FABRICATION_REFERENCES.md).

## License

Project code and original procedural assets are dedicated to the public domain
under [CC0 1.0](LICENSE). Third-party CC0 assets retain their own provenance as
documented above.
