
import {
    Camera,

    Transform,
} from './common/engine/core.js';
import { ResizeSystem } from './common/engine/systems/ResizeSystem.js';
import { UpdateSystem } from './common/engine/systems/UpdateSystem.js';
import { LitRendererTest } from './common/engine/renderers/LitRendererTest.js';
import { GLTFLoader } from './common/engine/loaders/GLTFLoader.js';
import { CarMovement } from './components/CarMovement.js';
import { FollowObject } from './components/FollowObject.js';
import { Light } from './components/Light.js';

import { Physics } from './common/engine/systems/Physics.js';
import { GameManager } from './components/GameManager.js';
import { GrassUtils } from './components/GrassUtils.js';

const canvas = document.querySelector('canvas');



const loader = new GLTFLoader();
await loader.load('./models/Rescale.gltf');


const scene = loader.loadScene(loader.defaultScene);
const camera = scene.find(node => node.getComponentOfType(Camera));
const light = scene.find(node => node.name === "Directional Light")
const cameraComponent = camera.getComponentOfType(Camera);
cameraComponent.near = 0.01;
cameraComponent.far = 90;

light.addComponent(new Light({
    direction: [0.3, 1, -0.4],
    node: light,

}));

const lightPos = light.getComponentOfType(Transform);
lightPos.translation = [0, .17, -.33]
const lightComponent = light.getComponentOfType(Light)
lightComponent.update()

const car = scene.find(node => node.name === "PhysicsAvto")
const plane = scene.find(node => node.name === "Plane")
const mainCamera = scene.find(node => node.name === "Main Camera")
const grassUtils = scene.addComponent(new GrassUtils(scene, plane));

const carPos = car.getComponentOfType(Transform);

carPos.translation = [0, 1.35, 0]



mainCamera.addComponent(new FollowObject(mainCamera, car))
light.getComponentOfType(Light);
let physics;
const gm = scene.addComponent(new GameManager(scene, 100, 10, 5, plane));


const renderer = new LitRendererTest(canvas, light, camera, scene);
await renderer.initialize();

let componentCache = [];

function cacheComponents(scene) {
    scene.traverse(node => {
        if (node.active) {
            node.components.forEach(component => {
                if (!componentCache.includes(component)) {
                    componentCache.push(component);
                }
            });
        }
    });
}
cacheComponents(scene)

function update(t, dt) {
    for (const component of componentCache) {
        if(!component.disabled){
            component.update?.(t, dt);            
        }
    }
    physics?.update(t, dt);

}


scene.printTree()
function render() {
    renderer.render(scene, camera, light);
}


function resize({ displaySize: { width, height } }) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

var audioPlayer = null; // Initialize audioPlayer variable
var gameRunning = false;
var gameTitle = false;
async function startGame() {
    audioPlayer.pause();
    audioPlayer = new Audio('levelMusic.mp3')
    audioPlayer.loop = true;
    audioPlayer.volume = 0.4; // 50% volume
    audioPlayer.play();
    physics = new Physics(scene)
    gm.setup()
    cacheComponents(scene);
    renderer.started = true;
}

function loadGame() {
    new ResizeSystem({ canvas, resize }).start();
    new UpdateSystem({ update, render }).start();

}
const titlescreen = document.getElementById('titlescreen');
const overlay = document.getElementById('overlay');
const gameStats = document.getElementById('gameStats');
const gameWon = document.getElementById('gameWon');
const gameLost = document.getElementById('gameOver');

overlay.style.display = "none"
gameStats.style.display = "none"
gameWon.style.display = "none"
gameLost.style.display = "none"


document.addEventListener('keydown', function (event) {

    if ((event.key === 'Enter' || event.keyCode === 32) && !gameRunning && gameTitle) {

        console.log('Space key was pressed');
        // You can add your logic here
        overlay.style.display = 'none';
        startGame();
        gameRunning = true;

    }
});


document.addEventListener('keydown', function (event) {

    if (!gameTitle) {
        if(event.key === '1'){
            plane.active = true;
            
        }

        if (event.key === '2') {

            plane.active = false;
            grassUtils.count = 2000000

        }

        if (event.key === '1' || event.key === '2') {
            gameStats.style.display = "block"
            overlay.style.display = "block"
            titlescreen.style.display = "none"
            gameTitle = true;
            audioPlayer = new Audio('waitMusic.mp3')
            audioPlayer.loop = true;
            audioPlayer.volume = 0.4; // 50% volume
            audioPlayer.play();
            car.addComponent(new CarMovement(car));
            cacheComponents(scene)

        }
    }
});

loadGame();
