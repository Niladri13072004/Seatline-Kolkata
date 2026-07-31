import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const registry = JSON.parse(
  await readFile(path.join(root, "mint-assets.json"), "utf8"),
);
const registeredPaths = Object.values(registry.assets)
  .flatMap((asset) => Object.values(asset.artifacts ?? {}))
  .map((artifact) => artifact.localPath)
  .filter(Boolean);
const paths = [
  ...new Set([
    ...registeredPaths,
    "public/media/dhurandhar-trailer.mp4",
    "public/media/ramayana-trailer.mp4",
    "public/media/spiderman-trailer.mp4",
  ]),
].sort();
const assets = [];

for (const relativePath of paths) {
  const absolutePath = path.join(root, relativePath);
  const bytes = await readFile(absolutePath);
  assets.push({
    path: relativePath,
    bytes: (await stat(absolutePath)).size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

await writeFile(
  path.join(root, "asset-manifest.json"),
  `${JSON.stringify(
    {
      manifestVersion: 1,
      totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
      assets,
    },
    null,
    2,
  )}\n`,
);
