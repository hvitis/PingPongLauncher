import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { advanceSpring } from './spring.js';

// One network request, independent scenes/materials. The mesh positions are actual CAD positions.
let modelPromise;
const loadModel = () =>
  (modelPromise ??= new GLTFLoader().loadAsync(
    new URL('./assets/models/launcher.glb', import.meta.url).href,
  ));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const offsets = {
  base: [0, -0.02, 0],
  body: [0, 0.03, 0],
  feed: [0, 0.02, -0.1],
  wheels: [0, 0.015, 0.05],
  hopper: [0, 0.12, 0],
  hardware: [0, 0, 0],
  ball: [0, 0.015, 0.03],
};

export class LauncherViewer {
  constructor(element, { onSelect = () => {}, compact = false } = {}) {
    this.element = element;
    this.onSelect = onSelect;
    this.compact = compact;
    this.targets = new Map();
    this.velocities = new Map();
    this.restTargets = new Map();
    this.replayLift = new Set();
    this.cameraVelocity = new THREE.Vector3();
    this.meshes = [];
    this.exploded = false;
    this.stage = 'all';
    this.disposed = false;
    this.ready = this.initialize().catch((error) => this.showFallback(error));
  }

  async initialize() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute(
      'aria-label',
      '3D launcher. Drag to rotate, scroll to zoom, arrow keys to orbit.',
    );
    this.element.append(renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.01, 5);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 1.3;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.autoRotateSpeed = 0.65;
    this.controls.addEventListener('start', () => {
      this.cameraResetTarget = null;
      this.cameraVelocity.set(0, 0, 0);
    });
    this.controls.target.set(0, 0.13, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x888e99, 3.1));
    const key = new THREE.DirectionalLight(0xfffbf5, 4.4);
    key.position.set(-0.4, 0.8, 0.7);
    const fill = new THREE.DirectionalLight(0xe5f0ff, 2.2);
    fill.position.set(0.5, 0.4, -0.3);
    this.scene.add(key, fill);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 96),
      new THREE.MeshBasicMaterial({
        color: 0xd7d9de,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    this.scene.add(floor);
    const rings = new THREE.GridHelper(0.55, 11, 0xd4d6dc, 0xe0e2e7);
    rings.position.y = -0.003;
    rings.material.transparent = true;
    rings.material.opacity = 0.18;
    this.scene.add(rings);
    this.reset();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.element);
    this.resize();
    this.visible = true;
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
    });
    this.intersection.observe(this.element);
    this.draw = this.draw.bind(this);
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame(this.draw);
    const gltf = await loadModel();
    if (this.disposed) return;
    this.model = gltf.scene.clone(true);
    // Center the model horizontally and retain its original ground level.
    const bounds = new THREE.Box3().setFromObject(this.model);
    const center = bounds.getCenter(new THREE.Vector3());
    this.model.position.set(-center.x, -bounds.min.y, -center.z);
    this.model.traverse((object) => {
      if (!object.isMesh) return;
      object.material = object.material.clone();
      object.userData.originalColor = object.material.color.clone();
      object.geometry.computeBoundingBox();
      object.userData.center = object.geometry.boundingBox.getCenter(new THREE.Vector3());
      object.userData.home = object.position.clone();
      this.velocities.set(object, new THREE.Vector3());
      this.meshes.push(object);
    });
    this.scene.add(this.model);
    this.element.classList.add('loaded');
    this.setStage(this.stage, { animate: false });
    this.bindPicking();
    this.element.dataset.ready = 'true';
    this.onMotionPreferenceChange = () => {
      if (reducedMotion.matches) this.controls.autoRotate = false;
      this.setStage(this.stage, { animate: false });
    };
    reducedMotion.addEventListener('change', this.onMotionPreferenceChange);
  }

  resize() {
    const { width, height } = this.element.getBoundingClientRect();
    if (!width || !height || !this.renderer) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  reset() {
    if (!this.camera) return;
    const target = new THREE.Vector3(-0.43, 0.35, 0.57);
    if (!this.initialCameraSet || reducedMotion.matches) {
      this.camera.position.copy(target);
      this.cameraResetTarget = null;
      this.cameraVelocity.set(0, 0, 0);
    } else {
      this.cameraResetTarget = target;
    }
    this.initialCameraSet = true;
    this.controls.target.set(0, 0.13, 0);
    this.controls.autoRotate = false;
    this.controls.update();
  }

  setRotation(enabled) {
    const active = Boolean(enabled && !reducedMotion.matches && this.controls);
    if (this.controls) this.controls.autoRotate = active;
    return active;
  }

  setExploded(enabled) {
    this.exploded = enabled;
    this.setStage(this.stage, { animate: false });
  }

  setStage(stage, { animate = true } = {}) {
    this.stage = stage;
    const focus = typeof stage === 'object' ? stage.group : 'all';
    const phase = typeof stage === 'object' ? stage.id : 'all';
    const available =
      phase === 'base'
        ? ['base']
        : phase === 'body'
          ? ['base', 'body', 'hardware']
          : phase === 'drive'
            ? ['base', 'body', 'hardware', 'feed']
            : phase === 'wheels' || phase === 'outlet'
              ? ['base', 'body', 'hardware', 'feed', 'wheels']
              : null;
    this.meshes.forEach((mesh) => {
      const group = mesh.userData.group;
      const active = focus === 'all' || group === focus;
      mesh.visible = !available || available.includes(group);
      mesh.material.color.copy(mesh.userData.originalColor);
      mesh.material.transparent = !active;
      mesh.material.opacity = active ? 1 : 0.18;
      mesh.material.depthWrite = active;
      // Explode vectors separate functional groups. They are illustrations, not manufacturing paths.
      const target = mesh.userData.home.clone();
      if (this.exploded || phase === 'print') {
        const offset = offsets[group] ?? [0, 0, 0];
        target.add(new THREE.Vector3(...offset));
        if (group === 'wheels' || group === 'body')
          target.x += Math.sign(mesh.userData.center.x || 1) * 0.045;
      }
      this.targets.set(mesh, target);
      this.restTargets.set(mesh, target);
      this.replayLift.delete(mesh);
      if (animate && active && mesh.visible && !reducedMotion.matches) {
        // A replay changes the spring target; it never teleports a moving part.
        this.targets.set(mesh, target.clone().add(new THREE.Vector3(0, 0.025, 0)));
        this.replayLift.add(mesh);
      }
      if (reducedMotion.matches) {
        mesh.position.copy(target);
        this.velocities.get(mesh).set(0, 0, 0);
      }
    });
  }

  bindPicking() {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = null;
    this.onPointerDown = (event) => {
      down = [event.clientX, event.clientY];
    };
    this.onPointerUp = (event) => {
      if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return;
      const rect = this.element.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, this.camera);
      const hit = raycaster.intersectObjects(
        this.meshes.filter((mesh) => mesh.visible && mesh.material.opacity > 0.5),
      )[0];
      if (hit) this.onSelect(hit.object.name.replaceAll('_', ' '));
    };
    this.onKeyDown = (event) => {
      const directions = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (!directions[event.key]) return;
      event.preventDefault();
      this.cameraResetTarget = null;
      this.cameraVelocity.set(0, 0, 0);
      const [horizontal, vertical] = directions[event.key];
      const offset = this.camera.position.clone().sub(this.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += horizontal * 0.13;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical * 0.13, 0.1, Math.PI * 0.52);
      this.camera.position
        .copy(this.controls.target)
        .add(new THREE.Vector3().setFromSpherical(spherical));
      this.controls.update();
    };
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('keydown', this.onKeyDown);
  }

  draw(now) {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.draw);
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    if (!this.visible || document.hidden) return;
    for (const [mesh, target] of this.targets) {
      const velocity = this.velocities.get(mesh);
      if (reducedMotion.matches) {
        mesh.position.copy(this.restTargets.get(mesh));
        velocity.set(0, 0, 0);
      } else {
        advanceSpring(mesh.position, velocity, target, dt);
        if (
          this.replayLift.has(mesh) &&
          mesh.position.distanceToSquared(target) < 0.000001 &&
          velocity.lengthSq() < 0.0004
        ) {
          this.replayLift.delete(mesh);
          this.targets.set(mesh, this.restTargets.get(mesh));
        }
      }
    }
    if (this.cameraResetTarget) {
      if (reducedMotion.matches) this.camera.position.copy(this.cameraResetTarget);
      else advanceSpring(this.camera.position, this.cameraVelocity, this.cameraResetTarget, dt);
      if (this.camera.position.distanceToSquared(this.cameraResetTarget) < 0.0000001)
        this.cameraResetTarget = null;
    }
    this.controls.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  showFallback(error) {
    console.warn('3D viewer unavailable:', error);
    this.dispose();
    this.element.classList.remove('loaded');
    this.element.dataset.ready = 'fallback';
    this.element.querySelector('.model-loading').textContent =
      '3D is unavailable. Use the CAD reference image and written guide.';
    this.onSelect('CAD reference image · 3D unavailable in this browser');
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.intersection?.disconnect();
    this.controls?.dispose();
    if (this.onMotionPreferenceChange)
      reducedMotion.removeEventListener('change', this.onMotionPreferenceChange);
    this.meshes.forEach((mesh) => mesh.material.dispose());
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
