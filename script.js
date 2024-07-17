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

const upperLipPoints = [  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 306, 291, 292, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78, 62, 76, 61];
const lowerLipPoints = [  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 306, 292, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 62, 76, 61
];

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

function createLipGeometry(upperPoints, lowerPoints, face) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  // Add upper lip points
  for (let i of upperPoints) {
    vertices.push(face[i].x - 0.5, -face[i].y + 0.5, face[i].z);
  }

  // Add lower lip points
  for (let i of lowerPoints) {
    vertices.push(face[i].x - 0.5, -face[i].y + 0.5, face[i].z);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

  // Create a line between all points
  const indices = [];
  for (let i = 0; i < vertices.length / 3 - 1; i++) {
    indices.push(i, i + 1);
  }
  // Close the loop
  indices.push(vertices.length / 3 - 1, 0);

  geometry.setIndex(indices);

  return geometry;
}

const lipMaterial = new THREE.LineBasicMaterial({
  color: 0xFF0000,
  linewidth: 2
});

const lipMesh = new THREE.Line(new THREE.BufferGeometry(), lipMaterial);
scene.add(lipMesh);

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
    // Create lip geometry
    const lipGeometry = createLipGeometry(upperLipPoints, lowerLipPoints, face);
    // Update lip mesh
    lipMesh.geometry.dispose();
    lipMesh.geometry = lipGeometry;
    
    // Adjust the position and scale of the lip mesh
    lipMesh.position.set(0, 0, 0);
    lipMesh.scale.set(1, 1, 1);
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