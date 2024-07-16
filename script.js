// import * as THREE from 'three';

// Set up Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('scene-container').appendChild(renderer.domElement);
camera.position.z = 4.5;

const upperLipPoints = [ 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 306, 291, 292, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78, 62, 72, 61]
const lowerLipPoints = [ 61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 306, 292, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 62, 76, 61
]

function createLipGeometry(upperPoints, lowerPoints, face) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    
    // Add upper lip points
    for (let i of upperPoints) {
        vertices.push(face[i].x - 0.5, -(face[i].y - 0.5), -face[i].z);
    }
    
    // Add lower lip points in reverse order
    for (let i = lowerPoints.length - 1; i >= 0; i--) {
        vertices.push(face[lowerPoints[i]].x - 0.5, -(face[lowerPoints[i]].y - 0.5), -face[lowerPoints[i]].z);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    
    return geometry;
}
const lipMaterial = new THREE.MeshPhongMaterial({
    color: 0x00FFFF,
    shininess: 100,
});

const lipMesh = new THREE.Mesh(new THREE.BufferGeometry(), lipMaterial);
scene.add(lipMesh);

// Creating a light source to illuminate the scene and adding it to the scene
const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0x000000, 1);
scene.add(hemiLight);

// Add an ambient light to provide some overall illumination
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// Set up video background
const videoElement = document.createElement('video');
videoElement.style.display = 'none';
document.body.appendChild(videoElement);

const videoTexture = new THREE.VideoTexture(videoElement);
const planeGeometry = new THREE.PlaneGeometry(16, 9);
const planeMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
const backgroundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
backgroundPlane.position.z = -5;
scene.add(backgroundPlane);

// Set up MediaPipe Hands
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


// Handle hand tracking results
function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const face = results.multiFaceLandmarks[0];
        
        // Create lip geometry
        const lipGeometry = createLipGeometry(upperLipPoints, lowerLipPoints, face);
        
        // Update lip mesh
        lipMesh.geometry.dispose();
        lipMesh.geometry = lipGeometry;
        
        // Scale and position the lip mesh
        lipMesh.scale.set(4, 4, 4);  // Adjust scale as needed
        lipMesh.position.set(0, 0, 0);  // Adjust position as needed
    }
}
// Animation loop
function animate(t = 0) {
    requestAnimationFrame(animate);
    if (videoTexture) videoTexture.needsUpdate = true;
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}