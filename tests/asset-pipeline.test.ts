import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const registry = JSON.parse(
  await readFile(path.join(root, "mint-assets.json"), "utf8"),
);
const fileManifest = JSON.parse(
  await readFile(path.join(root, "asset-manifest.json"), "utf8"),
);
const expectedKeys = [
  "auditorium-pack",
  "mythic-sea-poster",
  "venue-nandan",
  "venue-rdb",
  "venue-south-city",
  "venue-quest",
  "venue-avani",
  "venue-cinepolis-lake",
];
const trailerPaths = [
  "public/media/dhurandhar-trailer.mp4",
  "public/media/ramayana-trailer.mp4",
  "public/media/spiderman-trailer.mp4",
];

test("placeholder registry is explicit and keeps stable Mint keys", () => {
  assert.equal(registry.registryVersion, 1);
  assert.equal(registry.assetRoot, "public/assets/mint");
  assert.deepEqual(Object.keys(registry.assets), expectedKeys);
  for (const key of expectedKeys) {
    const asset = registry.assets[key];
    assert.equal(asset.mode, "local_placeholders");
    assert.equal(asset.placeholder, true);
    assert.equal(asset.source.kind, "local_placeholder");
    assert.equal(asset.source.reason, "mint_downloads_disabled");
  }
});

test("every local asset and trailer exists and matches its recorded hash", async () => {
  const recorded = new Map(
    fileManifest.assets.map((asset: { path: string; sha256: string }) => [
      asset.path,
      asset,
    ]),
  );
  const artifactPaths = Object.values(registry.assets)
    .flatMap((asset: any) => Object.values(asset.artifacts ?? {}))
    .map((artifact: any) => artifact.localPath);
  const localPaths = [...artifactPaths, ...trailerPaths];

  assert.equal(artifactPaths.length, 7);
  assert.equal(recorded.size, localPaths.length);

  for (const localPath of localPaths) {
    const absolutePath = path.join(root, localPath);
    const bytes = await readFile(absolutePath);
    const metadata = await stat(absolutePath);
    const manifestRecord = recorded.get(localPath) as
      | { bytes: number; sha256: string }
      | undefined;
    assert.ok(manifestRecord);
    assert.equal(manifestRecord.bytes, metadata.size);
    assert.equal(
      manifestRecord.sha256,
      createHash("sha256").update(bytes).digest("hex"),
    );
  }
});

test("runtime keeps MCP out of browser code and preserves Draco branch", async () => {
  const runtime = await readFile(
    path.join(root, "app", "gltfRuntime.ts"),
    "utf8",
  );
  const preview = await readFile(
    path.join(root, "app", "TheaterPreview.tsx"),
    "utf8",
  );
  const interfaceSource = await readFile(
    path.join(root, "app", "SeatlineKolkata.tsx"),
    "utf8",
  );

  assert.match(
    runtime,
    /https:\/\/cdn\.mint\.gg\/runtime\/draco\/gltf\/three-0\.184\.0\//,
  );
  assert.match(runtime, /setDRACOLoader/);
  assert.match(preview, /createMintGLTFLoader/);
  assert.match(preview, /desiredPosition\.set\(\.\.\.metrics\.eye\)/);
  assert.match(preview, /desiredLook\.set\(\.\.\.metrics\.target\)/);
  assert.match(interfaceSource, /Local placeholder assets/);
  assert.doesNotMatch(
    `${runtime}\n${preview}\n${interfaceSource}`,
    /mcp\.mint\.gg/,
  );
});

test("GLB metadata must declare runtime extensions when Mint sync replaces placeholders", () => {
  const artifacts = Object.values(registry.assets).flatMap((asset: any) =>
    Object.values(asset.artifacts ?? {}),
  ) as any[];
  const glbs = artifacts.filter((artifact) => artifact.format === "glb");

  assert.equal(glbs.length, 0);
  for (const glb of glbs) {
    assert.ok(Array.isArray(glb.extensionsUsed));
    assert.ok(Array.isArray(glb.extensionsRequired));
    if (glb.requiresDraco) {
      assert.ok(
        glb.extensionsRequired.includes("KHR_draco_mesh_compression"),
      );
    }
  }
});
