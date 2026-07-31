import registryJson from "../mint-assets.json";
import type { Venue } from "./seatlineData";

export const APP_BASE_PATH = "/_experiences/seatline-kolkata";
export const AUDITORIUM_PACK_KEY = "auditorium-pack";
export const POSTER_ASSET_KEY = "mythic-sea-poster";
export const VENUE_IMAGE_KEYS = [
  "venue-nandan",
  "venue-rdb",
  "venue-south-city",
  "venue-quest",
  "venue-avani",
  "venue-cinepolis-lake",
] as const;

export type MintArtifact = {
  artifactId: string;
  role: string;
  format: string;
  contentType: string;
  filename: string;
  localPath: string;
  loaderHint: string;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  usesDraco?: boolean;
  requiresDraco?: boolean;
  usesMeshopt?: boolean;
  requiresMeshopt?: boolean;
  usesKtx2?: boolean;
  requiresKtx2?: boolean;
};

export type MintAssetRecord = {
  mode: "local_files" | "local_placeholders";
  placeholder?: boolean;
  artifacts: Record<string, MintArtifact>;
};

export type MintAssetRegistry = {
  registryVersion: 1;
  assetRoot: string;
  assets: Record<string, MintAssetRecord>;
};

export const MINT_ASSET_REGISTRY =
  registryJson as unknown as MintAssetRegistry;

export const PLACEHOLDER_ASSETS_ACTIVE = [
  AUDITORIUM_PACK_KEY,
  POSTER_ASSET_KEY,
  ...VENUE_IMAGE_KEYS,
].some((key) => MINT_ASSET_REGISTRY.assets[key]?.placeholder);

export function toBrowserAssetUrl(localPath: string) {
  const relativePath = localPath.replaceAll("\\", "/").replace(/^public\//, "");
  return `${APP_BASE_PATH}/${relativePath}`;
}

export function findMintArtifact(assetKey: string, hint?: string) {
  const asset = MINT_ASSET_REGISTRY.assets[assetKey];
  if (!asset) throw new Error(`Mint asset is missing: ${assetKey}`);
  if (
    asset.mode !== "local_files" &&
    asset.mode !== "local_placeholders"
  ) {
    throw new Error(`Unsupported asset mode for ${assetKey}`);
  }

  const artifacts = Object.values(asset.artifacts ?? {});
  const normalizedHint = hint?.toLowerCase();
  const artifact = normalizedHint
    ? artifacts.find((candidate) =>
        `${candidate.artifactId} ${candidate.filename}`
          .toLowerCase()
          .includes(normalizedHint),
      )
    : artifacts.find((candidate) => candidate.role === "image_file") ??
      artifacts[0];

  if (!artifact) {
    throw new Error(
      `Mint artifact is missing: ${assetKey}${hint ? `/${hint}` : ""}`,
    );
  }
  return artifact;
}

export function getMintArtifactUrl(assetKey: string, hint?: string) {
  return toBrowserAssetUrl(findMintArtifact(assetKey, hint).localPath);
}

export function getCinemaAssetUrls(venue: Venue) {
  const pack = MINT_ASSET_REGISTRY.assets[AUDITORIUM_PACK_KEY];
  if (!pack) {
    throw new Error(`Mint asset is missing: ${AUDITORIUM_PACK_KEY}`);
  }
  if (pack.mode === "local_placeholders") {
    return {
      mode: "placeholder" as const,
      poster: getMintArtifactUrl(POSTER_ASSET_KEY),
    };
  }

  return {
    mode: "mint" as const,
    shell: getMintArtifactUrl(
      AUDITORIUM_PACK_KEY,
      venue.shellArtifactHint,
    ),
    screen: getMintArtifactUrl(
      AUDITORIUM_PACK_KEY,
      venue.screenArtifactHint,
    ),
    chair: getMintArtifactUrl(
      AUDITORIUM_PACK_KEY,
      venue.chairArtifactHint,
    ),
    fixture: getMintArtifactUrl(
      AUDITORIUM_PACK_KEY,
      venue.fixtureArtifactHint,
    ),
    poster: getMintArtifactUrl(POSTER_ASSET_KEY),
  };
}
