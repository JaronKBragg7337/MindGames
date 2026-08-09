# Fabrication Geometry References

The Recursive Fabricator models are original, procedural Three.js geometry.
They do not redistribute manufacturer meshes. Dimensions and construction logic
are anchored to the following real machines and open-hardware drawings.

## Parent fabricator - BigRep ONE.5 reference

- Official product specifications: <https://bigrep.com/bigrep-one/>
- Official 2025 brochure: <https://bigrep.com/wp-content/uploads/2025/04/BigRep_ONE5_Brochure_2025-03_EN_A4_web.pdf>
- Reference envelope: 1,848 mm wide x 1,668 mm deep x 2,070 mm high.
- Reference build volume: 1,005 x 1,005 x 1,005 mm.
- Reference filament diameter: 2.85 mm; modeled PEX2 nozzle: 1.0 mm.
- In-game scale: 1 mm = 0.001 world metres (1:1).

The game's parent printer is not a branded replica. Its frame, doors, gantry,
carriage, cabinets, dock, and replication mechanisms are original assemblies
informed by those published dimensions and by conventional industrial FFF
construction.

## Child fabricator - Voron V0.2r1 construction reference

- Official repository and GPL-3.0 license: <https://github.com/VoronDesign/Voron-0>
- Official master CAD: <https://github.com/VoronDesign/Voron-0/tree/Voron0.2r1/CAD>
- Official manufacturing drawings: <https://github.com/VoronDesign/Voron-0/tree/Voron0.2r1/Drawings>
- Official V0.2r1 assembly manual: <https://github.com/VoronDesign/Voron-0/blob/Voron0.2r1/Manuals/Assembly_Manual_0.2r1.pdf>
- Official design highlights: 120 x 120 x 120 mm CoreXY build volume, 1515
  MakerBeam XL frame, Mini Stealthburner direct drive, enclosed chamber.
- Drawing measurements represented in the model: 120 mm build plate; 212 x
  239 mm front door; 212 x 230 mm side panels; 3 mm panel thickness.
- Official motion-component references represented in the model: 6 mm belts
  and MGN7-class 7 mm linear rails.
- In-game scale: every source millimetre is multiplied uniformly by 0.00275
  world metres. The enlarged scale makes real construction readable through a
  recursive portal without altering component proportions.

The child printer is original game geometry and is described as
"Voron-derived," not as an exact product replica. No Voron CAD or STL mesh is
bundled in the game. The source project's GPL-3.0 license remains attached to
the linked source files; this repository's original geometry is separately
licensed under its root license.

## Material and scale rules

- Authored coordinates use metres.
- Major textured metal surfaces target approximately 512 source pixels per
  world metre from the bundled 1K CC0 texture sets.
- Repeated panels receive per-world UV offset and rotation to reduce visible
  repetition.
- Painted metal uses deterministic roughness variation; exposed structural
  edges use separate steel guards, channels, caps, and fasteners to communicate
  wear without baking unique proprietary textures.
- Parts are separate meshes at their real assembly interfaces: frames, rails,
  panels, motors, shafts, pulleys, belts, toolheads, heater blocks, nozzles,
  hinges, handles, cable runs, beds, and fasteners.
- `npm run validate:world` checks the measured parent envelope, child scale,
  supports, collider alignment, portal clearance, and center traversal route.
