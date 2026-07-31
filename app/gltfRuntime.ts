import { LoadingManager } from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const MINT_DRACO_DECODER_PATH =
  "https://cdn.mint.gg/runtime/draco/gltf/three-0.184.0/";

const sharedDracoLoader = new DRACOLoader();
sharedDracoLoader.setDecoderPath(MINT_DRACO_DECODER_PATH);

export function createMintGLTFLoader(manager?: LoadingManager) {
  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(sharedDracoLoader);
  return loader;
}
