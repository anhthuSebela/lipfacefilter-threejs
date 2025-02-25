// import * as THREE from 'three';
// Set up Three.js scene
const scene = new THREE.Scene();
let renderer, camera;

// Set up video background
const videoElement = document.createElement('video');
videoElement.style.display = 'none';
document.body.appendChild(videoElement);

let videoTexture, backgroundPlane;
let videoAspect;

const upperLipPoints = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78, 62];
const lowerLipPoints = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 62];

function initThreeJS() {
  videoAspect = videoElement.videoWidth / videoElement.videoHeight;
  updateCameraAndRenderer();

  // Create video texture
  videoTexture = new THREE.VideoTexture(videoElement);
  
  // Create a plane for the video background
  const planeGeometry = new THREE.PlaneGeometry(1, 1);
  const planeMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
  backgroundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
  backgroundPlane.position.z = -1;
  scene.add(backgroundPlane);

  addLipLighting();
}

function addLipLighting() {
  const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x000000, 2.4);
  upperLipMesh.add(hemiLight);
  lowerLipMesh.add(hemiLight);
}

function updateCameraAndRenderer() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Calculate the aspect ratio of the container
  const containerAspect = width / height;

  let scaleWidth = 1;
  let scaleHeight = 1;

  if (containerAspect > videoAspect) {
    // Container is wider than video
    scaleHeight = 1;
    scaleWidth = (height * videoAspect) / width;
  } else {
    // Container is taller than video
    scaleWidth = 1;
    scaleHeight = (width / videoAspect) / height;
  }

  camera = new THREE.OrthographicCamera(
    -0.5 * scaleWidth, 0.5 * scaleWidth,
    0.5 * scaleHeight, -0.5 * scaleHeight,
    0.1, 1000
  );
  camera.position.z = 5;

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(width, height);
  document.getElementById('scene-container').appendChild(renderer.domElement);

  // Update background plane size
  if (backgroundPlane) {
    backgroundPlane.scale.set(scaleWidth, scaleHeight, 1);
  }
}

function createFilledLipGeometry(points, face) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  const uvs = [];

  // Find the bounding box of the lip points
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i of points) {
    minX = Math.min(minX, face[i].x);
    maxX = Math.max(maxX, face[i].x);
    minY = Math.min(minY, face[i].y);
    maxY = Math.max(maxY, face[i].y);
  }

  for (let i of points) {
    vertices.push(face[i].x - 0.5, -face[i].y + 0.5, face[i].z);
    // Generate UV coordinates based on the normalized position within the bounding box
    uvs.push((face[i].x - minX) / (maxX - minX), (face[i].y - minY) / (maxY - minY));
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  // Use THREE.ShapeGeometry to create a filled shape
  const shape = new THREE.Shape();
  shape.moveTo(vertices[0], vertices[1]);
  for (let i = 3; i < vertices.length; i += 3) {
    shape.lineTo(vertices[i], vertices[i + 1]);
  }
  shape.closePath();

  const shapeGeometry = new THREE.ShapeGeometry(shape);
  shapeGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  return shapeGeometry;
}

const textureLoader = new THREE.TextureLoader();
const plasterAmbientOcclusionMap = textureLoader.load('textures/rough-plaster-ao.png');
const plasterNormalMap = textureLoader.load('textures/rough-plaster-normal-dx.png');

const lipMaterial = new THREE.MeshStandardMaterial({
  color: 0xb76046,
  normalMap: plasterNormalMap,
  aoMap: plasterAmbientOcclusionMap,
  transparent: true,
  opacity: 0.55,
});

const upperLipMesh = new THREE.Mesh(new THREE.BufferGeometry(), lipMaterial);
const lowerLipMesh = new THREE.Mesh(new THREE.BufferGeometry(), lipMaterial);
scene.add(upperLipMesh);
scene.add(lowerLipMesh);

// Set up MediaPipe Face Mesh
const faceMesh = new FaceMesh({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
  }
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera2 = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera2.start();

// Handle face tracking results
function onResults(results) {
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    const face = results.multiFaceLandmarks[0];
    
    // Create upper lip geometry
    const upperLipGeometry = createFilledLipGeometry(upperLipPoints, face);
    upperLipMesh.geometry.dispose();
    upperLipMesh.geometry = upperLipGeometry;
    
    // Create lower lip geometry
    const lowerLipGeometry = createFilledLipGeometry(lowerLipPoints, face);
    lowerLipMesh.geometry.dispose();
    lowerLipMesh.geometry = lowerLipGeometry;
    
    // Update UV attributes
    upperLipMesh.geometry.attributes.uv = upperLipGeometry.attributes.uv;
    lowerLipMesh.geometry.attributes.uv = lowerLipGeometry.attributes.uv;

    // Add aoMap attribute (uv2)
    upperLipMesh.geometry.setAttribute('uv2', upperLipGeometry.attributes.uv);
    lowerLipMesh.geometry.setAttribute('uv2', lowerLipGeometry.attributes.uv);
    
    // Adjust the position and scale of the lip meshes
    upperLipMesh.position.set(0, 0, 0);
    upperLipMesh.scale.set(1, 1, 1);
    lowerLipMesh.position.set(0, 0, 0);
    lowerLipMesh.scale.set(1, 1, 1);
  }
}
// Animation loop
function animate() {
  requestAnimationFrame(animate);
  if (videoTexture) videoTexture.needsUpdate = true;
  renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  updateCameraAndRenderer();
  camera.updateProjectionMatrix();
}

videoElement.addEventListener('loadedmetadata', () => {
  initThreeJS();
  animate();
});