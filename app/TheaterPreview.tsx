"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { createMintGLTFLoader } from "./gltfRuntime";
import { getCinemaAssetUrls } from "./mintAssets";
import {
  findSeat,
  getOverviewPose,
  getVideoCoverUv,
  measureSightline,
  TRAILERS,
  type Seat,
  type Venue,
} from "./seatlineData";

export type CameraMode = "overview" | "seated";

type TheaterPreviewProps = {
  venue: Venue;
  seats: Seat[];
  selectedSeatId: string;
  cameraMode: CameraMode;
  onSelectSeat: (seatId: string) => void;
};

type SeatInstanceLayer = {
  mesh: THREE.InstancedMesh;
  baseMatrices: THREE.Matrix4[];
  seatIds: string[];
};

type SceneController = {
  venueId: string;
  setView: (mode: CameraMode, seatId: string) => void;
};

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    const meshMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of meshMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

function fitImportedRoot(
  root: THREE.Object3D,
  target: THREE.Vector3,
  position: THREE.Vector3,
  rotationY = 0,
) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = Math.min(
    target.x / Math.max(size.x, 0.001),
    target.y / Math.max(size.y, 0.001),
    target.z / Math.max(size.z, 0.001),
  );
  const wrapper = new THREE.Group();
  wrapper.position.copy(position);
  wrapper.rotation.y = rotationY;
  wrapper.scale.setScalar(scale);
  root.position.set(-center.x, -bounds.min.y, -center.z);
  wrapper.add(root);
  return wrapper;
}

function buildInstancedAsset({
  root,
  transforms,
  targetWidth,
  parent,
  colors,
  seatIds = [],
  selectable = false,
}: {
  root: THREE.Object3D;
  transforms: THREE.Matrix4[];
  targetWidth: number;
  parent: THREE.Object3D;
  colors?: THREE.Color[];
  seatIds?: string[];
  selectable?: boolean;
}) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = targetWidth / Math.max(size.x, 0.001);
  const normalize = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(
      new THREE.Matrix4().makeTranslation(
        -center.x,
        -bounds.min.y,
        -center.z,
      ),
    );
  const layers: SeatInstanceLayer[] = [];

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.geometry) return;
    const mesh = new THREE.InstancedMesh(
      object.geometry,
      object.material,
      transforms.length,
    );
    const baseMatrices = transforms.map((transform, index) => {
      const matrix = transform
        .clone()
        .multiply(normalize)
        .multiply(object.matrixWorld);
      mesh.setMatrixAt(index, matrix);
      if (colors?.[index]) mesh.setColorAt(index, colors[index]);
      return matrix;
    });
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.selectableSeatLayer = selectable;
    mesh.userData.seatIds = seatIds;
    mesh.computeBoundingSphere();
    parent.add(mesh);
    layers.push({ mesh, baseMatrices, seatIds });
  });

  return layers;
}

function seatTint(status: Seat["status"]) {
  if (status === "occupied") return new THREE.Color(0.44, 0.44, 0.46);
  if (status === "accessible") return new THREE.Color(0.76, 0.88, 0.82);
  if (status === "companion") return new THREE.Color(0.83, 0.75, 0.62);
  return new THREE.Color(1, 1, 1);
}

function createPlaceholderChair() {
  const chair = new THREE.Group();
  const oxblood = new THREE.MeshStandardMaterial({
    color: 0x6d222d,
    roughness: 0.74,
    metalness: 0.02,
  });
  const charcoal = new THREE.MeshStandardMaterial({
    color: 0x171719,
    roughness: 0.68,
    metalness: 0.12,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xb98c45,
    roughness: 0.42,
    metalness: 0.68,
  });

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.9, 0.18),
    oxblood,
  );
  back.position.set(0, 0.8, 0.16);
  back.rotation.x = -0.09;
  chair.add(back);

  const cushion = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.18, 0.64),
    oxblood,
  );
  cushion.position.set(0, 0.38, -0.1);
  chair.add(cushion);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.22, 0.7),
      charcoal,
    );
    arm.position.set(side * 0.47, 0.48, -0.06);
    chair.add(arm);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.035, 0.48),
      brass,
    );
    cap.position.set(side * 0.47, 0.605, -0.09);
    chair.add(cap);
  }

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.34, 0.22, 20),
    charcoal,
  );
  base.position.y = 0.14;
  chair.add(base);
  return chair;
}

function createPlaceholderFixture() {
  const fixture = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc09a58,
    roughness: 0.38,
    metalness: 0.72,
  });
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffd78a,
    emissive: 0xd08b34,
    emissiveIntensity: 2.2,
    roughness: 0.36,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.16, 0.72, 16),
    brass,
  );
  stem.position.y = 0.36;
  fixture.add(stem);
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 10),
    glow,
  );
  lens.scale.y = 0.55;
  lens.position.y = 0.72;
  fixture.add(lens);
  return fixture;
}

function addPlaceholderRoom(
  world: THREE.Object3D,
  venue: Venue,
  centerZ: number,
  backZ: number,
) {
  const roomDepth = Math.max(venue.roomDepth, backZ - venue.screenZ + 4);
  const charcoal = new THREE.MeshStandardMaterial({
    color: 0x101114,
    roughness: 0.93,
    metalness: 0.02,
  });
  const wall = new THREE.MeshStandardMaterial({
    color: 0x171417,
    roughness: 0.86,
    metalness: 0.04,
  });
  const oxblood = new THREE.MeshStandardMaterial({
    color: 0x3d161e,
    roughness: 0.88,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: 0xa77c3e,
    roughness: 0.46,
    metalness: 0.62,
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(venue.roomWidth, 0.14, roomDepth),
    charcoal,
  );
  floor.position.set(0, -0.09, centerZ);
  floor.receiveShadow = true;
  world.add(floor);

  const frontWall = new THREE.Mesh(
    new THREE.BoxGeometry(
      venue.roomWidth,
      venue.roomHeight,
      0.24,
    ),
    oxblood,
  );
  frontWall.position.set(
    0,
    venue.roomHeight / 2,
    venue.screenZ - 0.34,
  );
  frontWall.receiveShadow = true;
  world.add(frontWall);

  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, venue.roomHeight, roomDepth),
      wall,
    );
    sideWall.position.set(
      side * venue.roomWidth / 2,
      venue.roomHeight / 2,
      centerZ,
    );
    sideWall.receiveShadow = true;
    world.add(sideWall);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, roomDepth * 0.9),
      brass,
    );
    trim.position.set(
      side * (venue.roomWidth / 2 - 0.18),
      venue.roomHeight * 0.56,
      centerZ,
    );
    world.add(trim);
  }

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(venue.roomWidth, 0.12, roomDepth),
    charcoal,
  );
  ceiling.position.set(0, venue.roomHeight, centerZ);
  world.add(ceiling);

  const riserGeometry = new THREE.BoxGeometry(
    venue.roomWidth * 0.88,
    1,
    venue.rowSpacing,
  );
  const risers = new THREE.InstancedMesh(
    riserGeometry,
    charcoal,
    venue.rows,
  );
  for (let rowIndex = 0; rowIndex < venue.rows; rowIndex += 1) {
    const height = Math.max(0.06, rowIndex * venue.rowRise);
    const matrix = new THREE.Matrix4()
      .makeScale(1, height, 1)
      .premultiply(
        new THREE.Matrix4().makeTranslation(
          0,
          height / 2,
          venue.baseZ + rowIndex * venue.rowSpacing,
        ),
      );
    risers.setMatrixAt(rowIndex, matrix);
  }
  risers.instanceMatrix.needsUpdate = true;
  risers.receiveShadow = true;
  world.add(risers);
}

function addPlaceholderScreenFrame(
  world: THREE.Object3D,
  venue: Venue,
  screenHeight: number,
) {
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xb18a4e,
    roughness: 0.42,
    metalness: 0.7,
  });
  const horizontal = new THREE.BoxGeometry(
    venue.screenWidth + 0.5,
    0.18,
    0.18,
  );
  const vertical = new THREE.BoxGeometry(0.18, screenHeight + 0.5, 0.18);
  for (const y of [
    venue.screenBaseY - 0.16,
    venue.screenBaseY + screenHeight + 0.16,
  ]) {
    const frame = new THREE.Mesh(horizontal, frameMaterial);
    frame.position.set(0, y, venue.screenZ);
    world.add(frame);
  }
  for (const x of [
    -venue.screenWidth / 2 - 0.16,
    venue.screenWidth / 2 + 0.16,
  ]) {
    const frame = new THREE.Mesh(vertical, frameMaterial);
    frame.position.set(
      x,
      venue.screenBaseY + screenHeight / 2,
      venue.screenZ,
    );
    world.add(frame);
  }
}

export default function TheaterPreview({
  venue,
  seats,
  selectedSeatId,
  cameraMode,
  onSelectSeat,
}: TheaterPreviewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const selectSeatRef = useRef(onSelectSeat);
  const viewRef = useRef({ cameraMode, selectedSeatId });
  viewRef.current = { cameraMode, selectedSeatId };
  const trailer = TRAILERS[venue.trailerId];
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [trailerError, setTrailerError] = useState("");
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const assetResult = useMemo(() => {
    try {
      return { urls: getCinemaAssetUrls(venue), error: "" };
    } catch (assetError) {
      return {
        urls: null,
        error:
          assetError instanceof Error
            ? assetError.message
            : "Mint asset registry is incomplete.",
      };
    }
  }, [venue]);

  const toggleTrailer = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    if (video.paused) {
      void video.play().catch(() => {
        setTrailerError(`${trailer.title} trailer could not be played.`);
      });
    } else {
      video.pause();
    }
  }, [trailer.title]);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.volume = 1;
    setTrailerError("");
    void video.play().catch(() => setIsTrailerPlaying(false));
  }, [trailer.src, venue.id]);

  useEffect(() => {
    const video = videoRef.current;
    return () => video?.pause();
  }, []);

  useEffect(() => {
    selectSeatRef.current = onSelectSeat;
  }, [onSelectSeat]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller?.venueId === venue.id) {
      controller.setView(cameraMode, selectedSeatId);
    }
  }, [cameraMode, selectedSeatId, venue.id]);

  useEffect(() => {
    const mount = mountRef.current;
    const trailerVideo = videoRef.current;
    if (!mount || !assetResult.urls || !trailerVideo) {
      setError(assetResult.error);
      return;
    }

    let disposed = false;
    let frame = 0;
    let fatalError = "";
    let detachVideoEvents: () => void = () => {};
    let trailerTexture: THREE.VideoTexture | null = null;
    let seatLayers: SeatInstanceLayer[] = [];
    const selectableMeshes: THREE.InstancedMesh[] = [];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050608);
    scene.fog = new THREE.Fog(0x050608, venue.roomDepth * 0.7, venue.roomDepth * 2.5);

    const camera = new THREE.PerspectiveCamera(47, 1, 0.06, 160);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.domElement.setAttribute(
      "aria-label",
      `Interactive 3D sightline preview for ${venue.name}`,
    );
    mount.replaceChildren(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);
    const ambient = new THREE.HemisphereLight(0xd8cbb2, 0x160d10, 1.35);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffd9a3, 3.2);
    key.position.set(9, 16, 11);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 80;
    key.shadow.camera.left = -22;
    key.shadow.camera.right = 22;
    key.shadow.camera.top = 24;
    key.shadow.camera.bottom = -12;
    scene.add(key);
    const rim = new THREE.PointLight(0x879ab0, 11, 45, 2);
    rim.position.set(-venue.roomWidth * 0.4, venue.roomHeight * 0.7, venue.screenZ + 3);
    scene.add(rim);

    const backZ = venue.baseZ + (venue.rows - 1) * venue.rowSpacing;
    const centerZ = (venue.screenZ + backZ) / 2;
    const grid = new THREE.GridHelper(
      venue.roomWidth,
      Math.round(venue.roomWidth),
      0x8f7145,
      0x272329,
    );
    grid.position.set(0, 0.015, centerZ);
    grid.scale.z = venue.roomDepth / venue.roomWidth;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.14;
    world.add(grid);

    const selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.035, 8, 48),
      new THREE.MeshBasicMaterial({
        color: 0xe0b76f,
        transparent: true,
        opacity: 0.94,
        depthTest: false,
      }),
    );
    selectionRing.rotation.x = Math.PI / 2;
    selectionRing.renderOrder = 8;
    world.add(selectionRing);

    const sightlineGeometry = new THREE.BufferGeometry();
    const sightline = new THREE.Line(
      sightlineGeometry,
      new THREE.LineBasicMaterial({
        color: 0xe0b76f,
        transparent: true,
        opacity: 0.76,
        depthTest: false,
      }),
    );
    sightline.renderOrder = 7;
    world.add(sightline);

    const desiredPosition = new THREE.Vector3();
    const desiredLook = new THREE.Vector3();
    const currentLook = new THREE.Vector3();
    let desiredFov = 47;
    let activeMode: CameraMode = "overview";
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const updateSelection = (seatId: string, mode: CameraMode) => {
      const seat = findSeat(seats, seatId);
      selectionRing.position.set(seat.x, seat.y + 0.06, seat.z);
      const metrics = measureSightline(venue, seat, seats);
      sightlineGeometry.setFromPoints([
        new THREE.Vector3(...metrics.eye),
        new THREE.Vector3(...metrics.target),
      ]);
      sightline.visible = mode === "overview";

      const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
      for (const layer of seatLayers) {
        layer.baseMatrices.forEach((matrix, index) => {
          layer.mesh.setMatrixAt(
            index,
            mode === "seated" && layer.seatIds[index] === seatId
              ? hidden
              : matrix,
          );
        });
        layer.mesh.instanceMatrix.needsUpdate = true;
      }
    };

    const setView = (mode: CameraMode, seatId: string) => {
      activeMode = mode;
      if (mode === "seated") {
        const metrics = measureSightline(
          venue,
          findSeat(seats, seatId),
          seats,
        );
        desiredPosition.set(...metrics.eye);
        desiredLook.set(...metrics.target);
        desiredFov = 64;
      } else {
        const overview = getOverviewPose(venue);
        desiredPosition.set(...overview.position);
        desiredLook.set(...overview.target);
        desiredFov = 47;
      }
      updateSelection(seatId, mode);
    };

    const overview = getOverviewPose(venue);
    camera.position.set(...overview.position);
    desiredPosition.copy(camera.position);
    currentLook.set(...overview.target);
    desiredLook.copy(currentLook);
    camera.lookAt(currentLook);

    controllerRef.current = {
      venueId: venue.id,
      setView,
    };

    const manager = new THREE.LoadingManager();
    manager.onStart = () => {
      setError("");
      setProgress(2);
    };
    manager.onProgress = (_url, loaded, total) => {
      if (!fatalError) setProgress(Math.round((loaded / total) * 96));
    };
    manager.onError = (url) => {
      if (fatalError) return;
      fatalError = `Could not load ${url.split("/").at(-1) ?? "Mint asset"}.`;
      setError(fatalError);
    };
    const assetUrls = assetResult.urls;
    const loader =
      assetUrls.mode === "mint" ? createMintGLTFLoader(manager) : null;

    const loadScene = async () => {
      try {
        const screenHeight = venue.screenWidth / venue.screenAspect;
        let chairRoot: THREE.Object3D;
        let fixtureRoot: THREE.Object3D;

        if (assetUrls.mode === "mint" && loader) {
          const [shell, screen, chair, fixture] = await Promise.all([
              loader.loadAsync(assetUrls.shell),
              loader.loadAsync(assetUrls.screen),
              loader.loadAsync(assetUrls.chair),
              loader.loadAsync(assetUrls.fixture),
            ]);
          if (disposed || fatalError) return;

          const shellRoot = fitImportedRoot(
            shell.scene,
            new THREE.Vector3(
              venue.roomWidth,
              venue.roomHeight,
              venue.roomDepth,
            ),
            new THREE.Vector3(0, 0, centerZ),
          );
          shellRoot.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = false;
            object.receiveShadow = true;
          });
          world.add(shellRoot);

          const screenRoot = fitImportedRoot(
            screen.scene,
            new THREE.Vector3(
              venue.screenWidth * 1.04,
              screenHeight * 1.08,
              0.8,
            ),
            new THREE.Vector3(
              0,
              venue.screenBaseY,
              venue.screenZ - 0.12,
            ),
          );
          screenRoot.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = false;
            object.receiveShadow = true;
          });
          world.add(screenRoot);

          chairRoot = chair.scene;
          fixtureRoot = fixture.scene;
        } else {
          addPlaceholderRoom(world, venue, centerZ, backZ);
          addPlaceholderScreenFrame(world, venue, screenHeight);
          chairRoot = createPlaceholderChair();
          fixtureRoot = createPlaceholderFixture();
        }
        if (disposed || fatalError) return;

        trailerTexture = new THREE.VideoTexture(trailerVideo);
        trailerTexture.colorSpace = THREE.SRGBColorSpace;
        trailerTexture.minFilter = THREE.LinearFilter;
        trailerTexture.magFilter = THREE.LinearFilter;
        trailerTexture.generateMipmaps = false;

        const updateVideoCover = () => {
          if (!trailerTexture || !trailerVideo.videoHeight) return;
          const uv = getVideoCoverUv(
            trailerVideo.videoWidth / trailerVideo.videoHeight,
            venue.screenAspect,
          );
          trailerTexture.repeat.set(uv.repeatX, uv.repeatY);
          trailerTexture.offset.set(uv.offsetX, uv.offsetY);
          trailerTexture.needsUpdate = true;
        };
        trailerVideo.addEventListener("loadedmetadata", updateVideoCover);
        detachVideoEvents = () =>
          trailerVideo.removeEventListener("loadedmetadata", updateVideoCover);
        updateVideoCover();

        const projectionPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(venue.screenWidth, screenHeight),
          new THREE.MeshBasicMaterial({
            map: trailerTexture,
            toneMapped: false,
          }),
        );
        projectionPlane.position.set(
          0,
          venue.screenBaseY + screenHeight / 2,
          venue.screenZ + 0.055,
        );
        projectionPlane.renderOrder = 4;
        world.add(projectionPlane);

        const chairRotation = new THREE.Matrix4().makeRotationY(
          assetUrls.mode === "placeholder" ? 0 : Math.PI,
        );
        const chairTransforms = seats.map((seat) =>
          new THREE.Matrix4()
            .makeTranslation(seat.x, seat.y, seat.z)
            .multiply(chairRotation),
        );
        seatLayers = buildInstancedAsset({
          root: chairRoot,
          transforms: chairTransforms,
          targetWidth: venue.chairWidth,
          parent: world,
          colors: seats.map((seat) => seatTint(seat.status)),
          seatIds: seats.map((seat) => seat.id),
          selectable: true,
        });
        selectableMeshes.push(...seatLayers.map((layer) => layer.mesh));

        const frontRow = seats.filter((seat) => seat.rowIndex === 0);
        const aisleXs = [
          -venue.roomWidth * 0.46,
          ...venue.aislesAfter.map((after) => {
            const left = frontRow[after - 1];
            const right = frontRow[after];
            return left && right ? (left.x + right.x) / 2 : 0;
          }),
          venue.roomWidth * 0.46,
        ];
        const fixtureTransforms = Array.from(
          { length: venue.rows },
          (_, rowIndex) =>
            aisleXs.map((x) =>
              new THREE.Matrix4().makeTranslation(
                x,
                venue.seatBaseY + rowIndex * venue.rowRise + 0.08,
                venue.baseZ + rowIndex * venue.rowSpacing - 0.08,
              ),
            ),
        ).flat();
        buildInstancedAsset({
          root: fixtureRoot,
          transforms: fixtureTransforms,
          targetWidth: 0.2,
          parent: world,
        });

        const currentView = viewRef.current;
        updateSelection(currentView.selectedSeatId, currentView.cameraMode);
        setView(currentView.cameraMode, currentView.selectedSeatId);
        setProgress(100);
      } catch (loadError) {
        if (disposed || fatalError) return;
        fatalError =
          loadError instanceof Error
            ? loadError.message
            : "Cinema assets could not be loaded.";
        setError(fatalError);
      }
    };

    void loadScene();

    const pointer = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const handlePointerUp = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(selectableMeshes, false)[0];
      if (!hit || hit.instanceId === undefined) return;
      const seatId = (hit.object.userData.seatIds as string[])[hit.instanceId];
      const seat = seats.find((candidate) => candidate.id === seatId);
      if (seat && seat.status !== "occupied") selectSeatRef.current(seat.id);
    };
    renderer.domElement.addEventListener("pointerup", handlePointerUp);

    const resize = () => {
      const bounds = mount.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let lastFrameAt = performance.now();
    const render = () => {
      const now = performance.now();
      const delta = Math.min((now - lastFrameAt) / 1000, 0.05);
      lastFrameAt = now;
      const smoothing = reducedMotion ? 1 : 1 - Math.exp(-delta * 6.2);
      camera.position.lerp(desiredPosition, smoothing);
      currentLook.lerp(desiredLook, smoothing);
      camera.fov = THREE.MathUtils.lerp(camera.fov, desiredFov, smoothing);
      camera.updateProjectionMatrix();
      camera.lookAt(currentLook);
      if (!reducedMotion && activeMode === "overview") {
        selectionRing.rotation.z += delta * 0.32;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      controllerRef.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      detachVideoEvents();
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [assetResult, retryKey, seats, venue]);

  return (
    <div className="preview-stage">
      <div ref={mountRef} className="preview-canvas" />
      <video
        key={trailer.src}
        ref={videoRef}
        className="preview-trailer-source"
        src={trailer.src}
        data-venue-id={venue.id}
        data-trailer-id={venue.trailerId}
        data-screen-fill="cover"
        autoPlay
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onLoadStart={() => setTrailerError("")}
        onPlay={() => setIsTrailerPlaying(true)}
        onPause={() => setIsTrailerPlaying(false)}
        onError={() =>
          setTrailerError(`${trailer.title} trailer could not be loaded.`)
        }
      />
      <button
        className="preview-trailer-toggle"
        type="button"
        aria-label={`${isTrailerPlaying ? "Pause" : "Play"} ${trailer.title} trailer`}
        aria-pressed={isTrailerPlaying}
        onClick={toggleTrailer}
      >
        <span aria-hidden="true">{isTrailerPlaying ? "Ⅱ" : "▶"}</span>
        {trailer.title}
      </button>
      {trailerError ? (
        <div className="preview-trailer-error" role="status">
          {trailerError}
        </div>
      ) : null}
      {progress < 100 && !error ? (
        <div className="preview-status" role="status" aria-live="polite">
          <span>Building auditorium</span>
          <strong>{progress}%</strong>
        </div>
      ) : null}
      {error ? (
        <div className="preview-error" role="alert">
          <strong>Auditorium unavailable</strong>
          <span>{error}</span>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
            Retry assets
          </button>
        </div>
      ) : null}
      <div className="preview-axis" aria-hidden="true">
        <span>+Y</span>
        <i />
        <b>−Z screen</b>
      </div>
    </div>
  );
}
