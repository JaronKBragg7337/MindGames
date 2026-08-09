import { ASSEMBLY_NODES, BASE_COLLIDERS, ROOM } from '../src/world/layout';
import { BIGREP_ONE, mm, VORON_V0 } from '../src/world/fabricationSpecs';

const errors: string[] = [];
const ids = new Set<string>();
const nodes = new Map(ASSEMBLY_NODES.map((node) => [node.id, node]));

const parentCollider = BASE_COLLIDERS.find((collider) => collider.id === 'printer');
const expectedParentSize = [
  mm(BIGREP_ONE.outerMm.width, BIGREP_ONE.mmToWorld),
  mm(BIGREP_ONE.outerMm.height, BIGREP_ONE.mmToWorld),
  mm(BIGREP_ONE.outerMm.depth, BIGREP_ONE.mmToWorld),
];
if (!parentCollider) {
  errors.push('Measured parent-printer collider is missing.');
} else if (parentCollider.size.some((dimension, index) => Math.abs(dimension - (expectedParentSize[index] ?? 0)) > 0.0005)) {
  errors.push('Parent-printer collider no longer matches the official BigRep ONE.5 envelope.');
}

const scaledBuildPlate = mm(VORON_V0.buildPlateMm, VORON_V0.mmToWorld);
const scaledChildWidth = mm(
  VORON_V0.doorMm.width + VORON_V0.frameSectionMm * 2,
  VORON_V0.mmToWorld,
);
if (scaledBuildPlate >= scaledChildWidth - mm(VORON_V0.frameSectionMm * 2, VORON_V0.mmToWorld)) {
  errors.push('Voron-derived build plate collides with the scaled 1515 frame envelope.');
}
if (Math.abs(mm(VORON_V0.sidePanelMm.thickness, VORON_V0.mmToWorld) - 0.00825) > 0.000001) {
  errors.push('Voron panel scale is no longer uniform with the manufacturing drawings.');
}

for (const node of ASSEMBLY_NODES) {
  if (ids.has(node.id)) errors.push(`Duplicate assembly id: ${node.id}`);
  ids.add(node.id);
  if (node.size.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    errors.push(`${node.id} has a non-positive or invalid dimension.`);
  }

  if (!node.supportId) continue;
  const support = nodes.get(node.supportId);
  if (!support) {
    errors.push(`${node.id} references missing support ${node.supportId}.`);
    continue;
  }

  const bottom = node.center[1] - node.size[1] * 0.5;
  const supportTop = support.center[1] + support.size[1] * 0.5;
  const tolerance = node.supportTolerance ?? 0.012;
  if (Math.abs(bottom - supportTop) > tolerance) {
    errors.push(
      `${node.id} floats or penetrates ${node.supportId}: bottom=${bottom.toFixed(3)}m, support top=${supportTop.toFixed(3)}m.`,
    );
  }

  const xAllowance = support.size[0] * 0.5 + tolerance;
  const zAllowance = support.size[2] * 0.5 + tolerance;
  if (Math.abs(node.center[0] - support.center[0]) > xAllowance) {
    errors.push(`${node.id} center falls outside ${node.supportId} on X.`);
  }
  if (Math.abs(node.center[2] - support.center[2]) > zAllowance) {
    errors.push(`${node.id} center falls outside ${node.supportId} on Z.`);
  }
}

const colliderIds = new Set<string>();
for (const collider of BASE_COLLIDERS) {
  if (colliderIds.has(collider.id)) errors.push(`Duplicate collider id: ${collider.id}`);
  colliderIds.add(collider.id);
  if (collider.size.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)) {
    errors.push(`${collider.id} has a non-positive collider dimension.`);
  }
  const extendsBeyondRoom =
    Math.abs(collider.center[0]) - collider.size[0] * 0.5 > ROOM.width * 0.5 + ROOM.wallThickness ||
    Math.abs(collider.center[2]) - collider.size[2] * 0.5 > ROOM.depth * 0.5 + ROOM.wallThickness;
  if (extendsBeyondRoom) errors.push(`${collider.id} is detached from the authored room bounds.`);
}

// Sample the authored centre route at capsule width. This catches the common
// failure where a visual cabinet or wall collider accidentally seals the only
// path to a portal even though individual bounds look plausible in isolation.
const playerRadius = 0.34;
for (let z = -ROOM.depth * 0.5 + 0.5; z <= ROOM.depth * 0.5 - 0.5; z += 0.1) {
  const blocker = BASE_COLLIDERS.find((collider) => {
    const minX = collider.center[0] - collider.size[0] * 0.5 - playerRadius;
    const maxX = collider.center[0] + collider.size[0] * 0.5 + playerRadius;
    const minZ = collider.center[2] - collider.size[2] * 0.5 - playerRadius;
    const maxZ = collider.center[2] + collider.size[2] * 0.5 + playerRadius;
    return 0 > minX && 0 < maxX && z > minZ && z < maxZ;
  });
  if (blocker) {
    errors.push(`Centre traversal route is blocked by ${blocker.id} near z=${z.toFixed(2)}m.`);
    break;
  }
}

const northOpeningLeft = -ROOM.portalWidth * 0.5;
const northOpeningRight = ROOM.portalWidth * 0.5;
const leftWallRight = BASE_COLLIDERS.find((collider) => collider.id === 'wall.north.left');
const rightWallLeft = BASE_COLLIDERS.find((collider) => collider.id === 'wall.north.right');
if (!leftWallRight || !rightWallLeft) {
  errors.push('Portal wall segments are missing.');
} else {
  const leftEdge = leftWallRight.center[0] + leftWallRight.size[0] * 0.5;
  const rightEdge = rightWallLeft.center[0] - rightWallLeft.size[0] * 0.5;
  if (Math.abs(leftEdge - northOpeningLeft) > 0.001 || Math.abs(rightEdge - northOpeningRight) > 0.001) {
    errors.push(`Portal wall opening is ${Math.abs(rightEdge - leftEdge).toFixed(3)}m, expected ${ROOM.portalWidth.toFixed(3)}m.`);
  }
}

if (errors.length > 0) {
  console.error(`World validation failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`  - ${error}`));
  throw new Error('Authored world layout is invalid.');
} else {
  console.log(
    `World validation passed: ${ASSEMBLY_NODES.length} supported components, ${BASE_COLLIDERS.length} colliders, ${ROOM.portalWidth.toFixed(1)}m portal clearance, measured BigRep/Voron fabrication envelopes.`,
  );
}
