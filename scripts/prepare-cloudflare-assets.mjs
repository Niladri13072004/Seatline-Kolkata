import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("dist");
const target = resolve("cloudflare-assets", "_experiences", "seatline-kolkata");

await rm(resolve("cloudflare-assets"), { force: true, recursive: true });
await mkdir(target, { recursive: true });
await cp(source, target, {
  recursive: true,
  filter: (path) => !path.endsWith(".mp4"),
});
