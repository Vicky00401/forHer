import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.129.0/build/three.module.js';
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";
import { gsap } from 'https://cdn.skypack.dev/gsap';

const body_width = window.innerWidth;
const body_height = window.innerHeight;

const scene = new THREE.Scene();
let object1;
let mixer1;
let sparkleParticles;

const camera = new THREE.PerspectiveCamera(75, body_width / body_height, 0.1, 1000);
camera.position.set(0, 0, 2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(body_width, body_height);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
controls.minDistance = 1;
controls.maxDistance = 10;
controls.enablePan = true;
controls.maxPolarAngle = Math.PI / 2;
controls.update();

const topLight = new THREE.SpotLight(0xffffff, 0.8);
topLight.position.set(100, 100, 100);
scene.add(topLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

loader.load(
    './model/video_screening/scene.gltf',
    function (gltf) {
        object1 = gltf.scene;
        object1.scale.set(20, 20, 20);
        object1.position.set(0, -5, 0);
        object1.rotation.set(0, THREE.MathUtils.degToRad(-150), 0);
        scene.add(object1);
        // mixer1 = new THREE.AnimationMixer(object1);
        // mixer1.clipAction(gltf.animations[0]).play();

        // Add sparkles around object
        addSparklesAroundPentagon(object1);

    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error happened', error);
    }
);

function animateSparkles(sparkleParticles) {
    const positions = sparkleParticles.geometry.attributes.position;
    const time = performance.now() * 0.001;

    for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        positions.setY(i, y + Math.sin(time + i) * 0.002);
    }

    positions.needsUpdate = true;
}


function createPentagonShape() {
    const shape = new THREE.Shape();
    const radius = 0.2;
    const sides = 5;
    for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    return shape;
}

function addSparklesAroundPentagon(target) {
    const sparkleCount = 150;
    const positions = [];

    const pentagonSides = 5;
    const radius = 3;

    for (let i = 0; i < sparkleCount; i++) {
        const side = i % pentagonSides;
        const t = (side / pentagonSides) * 2 * Math.PI;
        const nextT = ((side + 1) % pentagonSides) / pentagonSides * 2 * Math.PI;

        const interp = Math.random();
        const angle = t + interp * (nextT - t);

        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.5;
        const y = (Math.random() - 0.5) * 2; // vertical spread
        const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.5;

        positions.push(x, y, z);
    }

    const sparkleGeometry = new THREE.BufferGeometry();
    sparkleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const sparkleMaterial = new THREE.PointsMaterial({
        color: 0xc0c0c0,               // silver
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const sparkleParticles = new THREE.Points(sparkleGeometry, sparkleMaterial);
    target.add(sparkleParticles);
}


let arrpositionmodel2 = [
    { id: 'main_content', position: { x: 0, y: -5, z: 0 }, rotation: { x: 0, y: -150, z: 0 } },
    { id: 'second_section', position: { x: 1, y: -4, z: 0 }, rotation: { x: 0, y: -200, z: 0 } },
    { id: 'third_section', position: { x: 0, y: -2.5, z: 0 }, rotation: { x: 0, y: -50, z: 0 } },
    { id: 'fourth_section', position: { x: 0, y: -2.5, z: 0 }, rotation: { x: 0, y: -50, z: 0 } },
    { id: 'popular_section', position: { x: 0, y: -2.5, z: 0 }, rotation: { x: 0, y: -50, z: 0 } },
];

const modelmove = () => {
    const divisions = document.querySelectorAll('section');
    let currentSection;

    for (let i = divisions.length - 1; i >= 0; i--) {
        const rect = divisions[i].getBoundingClientRect();
        if (rect.top <= window.innerHeight / 3) {
            currentSection = divisions[i].id;
            break;
        }
    }

    if (!currentSection) return;
    console.log(currentSection)
    let position_active = arrpositionmodel2.findIndex(val => val.id === currentSection);

    if (position_active >= 0) {
        let new_coordinates = arrpositionmodel2[position_active];

        gsap.to(object1.position, {
            x: new_coordinates.position.x,
            y: new_coordinates.position.y,
            z: new_coordinates.position.z,
            duration: 3,
            ease: "power1.out"
        });

        gsap.to(object1.rotation, {
            x: THREE.MathUtils.degToRad(new_coordinates.rotation.x),
            y: THREE.MathUtils.degToRad(new_coordinates.rotation.y),
            z: THREE.MathUtils.degToRad(new_coordinates.rotation.z),
            duration: 3,
            ease: "power1.out"
        });
    }
};

window.addEventListener('scroll', modelmove);

function addRandomPentagons(count = 300) {
    const material = new THREE.MeshStandardMaterial({
        color: '#d609ce',
        transparent: true,
        opacity: 0.4,
        depthWrite: false
    });

    for (let i = 0; i < count; i++) {
        const shape = createPentagonShape();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 80,
            -30 - Math.random() * 100
        );
        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        mesh.scale.setScalar(0.2 + Math.random() * 1.2);
        scene.add(mesh);
    }
}
addRandomPentagons();

function animate() {
    requestAnimationFrame(animate);
    // if (mixer1) mixer1.update(0.01);
    if (sparkleParticles) sparkleParticles.rotation.y += 0.001;
    if (sparkleParticles) {
    animateSparkles(sparkleParticles);
}

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
});


//   var video = document.getElementById('video_play');
//   var videoSrc = "{{ content.program_sample_videos|escapejs }}";

//   if (Hls.isSupported()) {
//     var hls = new Hls();
//     hls.loadSource(videoSrc);
//     hls.attachMedia(video);
//     hls.on(Hls.Events.MANIFEST_PARSED, function () {
//       video.play();
//     });
//   } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
//     video.src = videoSrc;
//     video.addEventListener('loadedmetadata', function () {
//       video.play();
//     });
//   }