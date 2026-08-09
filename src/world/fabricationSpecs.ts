/**
 * Physical source measurements are stored in millimetres and converted once.
 * See public/assets/FABRICATION_REFERENCES.md for the official CAD, drawings,
 * product specifications, license notes, and the deliberate fictional changes.
 */

export const BIGREP_ONE = Object.freeze({
  mmToWorld: 0.001,
  outerMm: Object.freeze({ width: 1848, depth: 1668, height: 2070 }),
  buildMm: Object.freeze({ width: 1005, depth: 1005, height: 1005 }),
  filamentDiameterMm: 2.85,
  nozzleDiameterMm: 1,
  model: 'BigRep ONE.5',
});

export const VORON_V0 = Object.freeze({
  // Enlarged uniformly so its real construction remains readable in a portal scene.
  mmToWorld: 0.00275,
  frameSectionMm: 15,
  buildPlateMm: 120,
  buildVolumeMm: Object.freeze({ width: 120, depth: 120, height: 120 }),
  doorMm: Object.freeze({ width: 212, height: 239, thickness: 3 }),
  sidePanelMm: Object.freeze({ width: 212, height: 230, thickness: 3 }),
  beltWidthMm: 6,
  linearRailWidthMm: 7,
  nozzleDiameterMm: 0.4,
  model: 'Voron V0.2r1 derived child fabricator',
});

export function mm(value: number, scale: number): number {
  return value * scale;
}
