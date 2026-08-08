import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  await readFile(join(projectRoot, 'assets.manifest.json'), 'utf8'),
);
const checkOnly = process.argv.includes('--check');
const textureRoot = join(projectRoot, 'public', 'assets', 'textures');

async function digest(path) {
  const file = await readFile(path);
  return createHash('md5').update(file).digest('hex');
}

async function isValid(path, expected) {
  try {
    const details = await stat(path);
    return details.size > 0 && (await digest(path)) === expected;
  } catch {
    return false;
  }
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const temporary = `${destination}.download`;
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(temporary, Buffer.from(await response.arrayBuffer()));
  await rename(temporary, destination);
}

let failures = 0;
let verified = 0;

for (const asset of manifest.assets) {
  for (const [mapType, map] of Object.entries(asset.maps)) {
    const destination = join(textureRoot, asset.id, map.file);
    let valid = await isValid(destination, map.md5);

    if (!valid && !checkOnly) {
      await rm(destination, { force: true });
      process.stdout.write(`Downloading ${asset.id}/${mapType}... `);
      await download(map.url, destination);
      valid = await isValid(destination, map.md5);
      process.stdout.write(valid ? 'verified\n' : 'checksum mismatch\n');
    }

    if (valid) {
      verified += 1;
    } else {
      failures += 1;
      console.error(`Invalid or missing asset: ${asset.id}/${map.file}`);
    }
  }
}

if (failures > 0) {
  console.error(`${failures} asset file(s) failed validation.`);
  process.exitCode = 1;
} else {
  console.log(`${verified} CC0 texture maps verified.`);
}

