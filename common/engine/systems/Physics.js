import { quat, vec3, mat4 } from '../../../lib/gl-matrix-module.js';
import { getGlobalModelMatrix } from '../../../common/engine/core/SceneUtils.js';
import { Transform } from '../../../common/engine/core.js';
import { Bunny } from '../../../components/Bunny.js';
import { CarMovement } from '../../../components/CarMovement.js';
import { GameManager } from '../../../components/GameManager.js';
const COLLISION_DISTANCE_THRESHOLD = 2.2;
const CARROT_COLLISION_DISTANCE_THRESHOLD = 3.4;
const CAR_COLLISION_DISTANCE_THRESHOLD = 10;
export class Physics {

    constructor(scene) {
        this.scene = scene;

        this.carObj = scene.find(node => node.name === "PhysicsAvto")
        this.car = this.carObj.getComponentOfType(CarMovement)
        this.gameManager = scene.getComponentOfType(GameManager)

        // Initialize caches
        this.dynamicObjects = [];
        this.bunnies = [];
        this.carrots = [];
        this.holes = [];
        this.cubes = [];
        this.holes = this.scene.filter(node => node.name.startsWith("Hole Cube")&& node.active);
        this.bunnies = this.scene.filter(node => node.name.startsWith("BunnyFinal") && node.active);
        this.cubes = this.scene.filter(node => node.name.startsWith("Cube")&& node.active);
        this.carrots = this.scene.filter(node => node.name.startsWith("Carrot Cube")&& node.active);
        this.updateCounts()

    }


    updateCounts() {
        this.bunnies = this.scene.filter(node => node.name.startsWith("BunnyFinal") && node.active);
        this.carrots = this.scene.filter(node => node.name.startsWith("Carrot Cube") && node.active);

        this.bunniesLength = this.bunnies.length;
        this.carrotLength = this.carrots.length;

        document.getElementById('bunnyCount').textContent = this.bunniesLength;
        document.getElementById('carrotCount').textContent = this.carrotLength;
    }

    checkCondition(){
        const rabbitCount = this.bunniesLength;
        const carrotCount = this.carrotLength;
        const gameWon = document.getElementById('gameWon');
        const gameLost = document.getElementById('gameOver');
        if(carrotCount === 0){
            this.car.disabled = true;
            gameLost.style.display = "flex"
        }

        if(rabbitCount === 0){
            this.car.disabled = true;
            gameWon.style.display = "flex"
        }

    }


    update(t, dt) {

        // Instead of traversing the whole scene, iterate over cached lists

        this.bunnies.forEach((bunny, index) => {
            if (bunny.isDynamic) {
                const bunnyTransform = bunny.getComponentOfType(Transform);

                this.carrots.forEach(carrot => {
                    if (carrot.isDynamic) {
                        const carrotTransform = carrot.parent.getComponentOfType(Transform)
                        if(vec3.distance(carrotTransform.translation,bunnyTransform.translation) < CARROT_COLLISION_DISTANCE_THRESHOLD){
                            this.resolveCollisionBunnyCarrot(bunny, carrot);

                        }

                    }
                });

                this.holes.forEach(hole => {
                    const holeTransform = hole.parent.getComponentOfType(Transform)
                    if(vec3.distance(holeTransform.translation,bunnyTransform.translation) < CARROT_COLLISION_DISTANCE_THRESHOLD){
                        this.resolveCollisionBunnyHole(bunny, hole);

                    }
                });

                for (let i = index + 1; i < this.bunnies.length; i++) {
                    const otherBunny = this.bunnies[i];
                    const otherBunnyTransform = otherBunny.getComponentOfType(Transform)
                    if (otherBunny.isDynamic) {
                        if(vec3.distance(otherBunnyTransform.translation,bunnyTransform.translation) < COLLISION_DISTANCE_THRESHOLD){
                            this.resolveCollisionBunnyBunny(bunny, otherBunny);
                        }
                    }
                }

                this.cubes.forEach(cube => {
                    const cubeTransform = cube.parent.getComponentOfType(Transform)
                    if(vec3.distance(cubeTransform.translation,bunnyTransform.translation) < CAR_COLLISION_DISTANCE_THRESHOLD){

                        this.resolveCollisionCarBunny(cube, bunny);
                    }
                });
            }
        });


    }
    intervalIntersection(min1, max1, min2, max2) {
        return !(min1 > max2 || min2 > max1);
    }

    aabbIntersection(aabb1, aabb2) {
        return this.intervalIntersection(aabb1.min[0], aabb1.max[0], aabb2.min[0], aabb2.max[0])
            && this.intervalIntersection(aabb1.min[1], aabb1.max[1], aabb2.min[1], aabb2.max[1])
            && this.intervalIntersection(aabb1.min[2], aabb1.max[2], aabb2.min[2], aabb2.max[2]);
    }

    getTransformedAABB(node) {
        // Transform all vertices of the AABB from local to global space.
        const matrix = getGlobalModelMatrix(node);
        const { min, max } = node.aabb;
        const vertices = [
            [min[0], min[1], min[2]],
            [min[0], min[1], max[2]],
            [min[0], max[1], min[2]],
            [min[0], max[1], max[2]],
            [max[0], min[1], min[2]],
            [max[0], min[1], max[2]],
            [max[0], max[1], min[2]],
            [max[0], max[1], max[2]],
        ].map(v => vec3.transformMat4(v, v, matrix));

        // Find new min and max by component.
        const xs = vertices.map(v => v[0]);
        const ys = vertices.map(v => v[1]);
        const zs = vertices.map(v => v[2]);
        const newmin = [Math.min(...xs), Math.min(...ys), Math.min(...zs)];
        const newmax = [Math.max(...xs), Math.max(...ys), Math.max(...zs)];
        return { min: newmin, max: newmax };
    }

    resolveCollisionCarBunny(a, b) {

        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.

        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }

        // Car's forward direction in world space.
        const carForward = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, 1), a.getComponentOfType(Transform).rotation);
        const bunnyComponent = b.getComponentOfType(Bunny)
        // Vector from car to bunny.
        const carToBunny = vec3.subtract(vec3.create(), b.getComponentOfType(Transform).translation, a.getComponentOfType(Transform).translation);

        // Normalize the vectors.
        vec3.normalize(carForward, carForward);
        vec3.normalize(carToBunny, carToBunny);

        // Calculate dot product.
        const dotProduct = vec3.dot(carForward, carToBunny);


        // Remove bunny or apply offset.
        if (this.car.currentSpeed > 0.55 * (1.01 - Math.abs(dotProduct) * 0.5)) {
            this.car.currentSpeed *= 0.85;
            if (bunnyComponent.isHolding) {
                bunnyComponent.isHolding = false;

                const carrot = b.children[b.children.length - 1];
                const bunnyTransform = b.getComponentOfType(Transform);
                const carrotTransform = carrot.getComponentOfType(Transform);

                const carrotCollider = carrot.children[0];
                carrotCollider.isDynamic = true;


                b.removeChild(carrot);
                this.scene.addChild(carrot);
                carrotTransform.translation = [bunnyTransform.translation[0], carrotTransform.translation[1], bunnyTransform.translation[2]]
                console.log("Removing carrot from bunny, adding it as child of scene")



                // Update all bunnies
                this.scene.traverse(node => {
                    if (node.getComponentOfType(Bunny)) {
                        const otherBunny = node.getComponentOfType(Bunny);
                        otherBunny.baits.push(carrot);
                        if (node.children.length !== 4) {
                            otherBunny.followObject = otherBunny.findClosest(otherBunny.baits);

                        }
                    }
                });


            }


            this.scene.removeChild(b);
            b.active = false
            b.isDynamic = false;
            this.updateCounts()
            this.checkCondition()

            const splashSound = new Audio('Splash.mp3');
            splashSound.volume = 0.3; // 50% volume
            splashSound.play();
        } else {
            const offset = this.calculateCollisionOffset(aBox, bBox);
            const bTransform = b.getComponentOfType(Transform);
            vec3.subtract(bTransform.translation, bTransform.translation, offset);
        }



    }

    resolveCollisionBunnyBunny(a, b) {
        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }

        // Calculate the offset needed to resolve collision
        const offset = this.calculateCollisionOffset(aBox, bBox);
        // Apply offset to each bunny's position
        const aTransform = a.getComponentOfType(Transform);
        const bTransform = b.getComponentOfType(Transform);


        vec3.add(aTransform.translation, aTransform.translation, offset);
        vec3.subtract(bTransform.translation, bTransform.translation, offset);
    }

    resolveCollisionBunnyCarrot(a, b) {

        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }
        const bunnyComponent = a.getComponentOfType(Bunny)
        if (!bunnyComponent.isHolding) {
            bunnyComponent.isHolding = true;
            const carrotTransform = b.parent.getComponentOfType(Transform);
            const carrotCollider = b;
            const carrot = b.parent;
            carrotTransform.translation = [0, 0.3, -0.8]; // Set desired position

            carrotCollider.isDynamic = false


            this.scene.removeChild(carrot);
            a.addChild(carrot);
            console.log("Removing carrot from scene, adding it as child of bunny")

            // Get Bunny component from 'a'
            const bunny = a.getComponentOfType(Bunny);



            // Update all bunnies
            this.scene.traverse(node => {
                if (node.getComponentOfType(Bunny)) {
                    const otherBunny = node.getComponentOfType(Bunny);
                    otherBunny.baits = otherBunny.baits.filter(bait => bait.name !== carrot.name);
                    if (otherBunny.followObject && otherBunny.followObject.name === carrot.name) {
                        if (otherBunny.baits.length > 0) {
                            otherBunny.followObject = otherBunny.findClosest(otherBunny.baits);
                        }
                        else {
                            otherBunny.followObject = otherBunny.findClosest(this.gameManager.bunnies.filter(bunny => bunny !== otherBunny && bunny.getComponentOfType(Bunny).isHolding));

                        }
                    }

                }
            });

            // Assign a new bait to the bunny if necessary
            bunny.followObject = bunny.findClosest(bunny.holes); // Or any other logic for new bait assignment
        }

    }

    resolveCollisionBunnyHole(a, b) {

        // Get global space AABBs.
        const aBox = this.getTransformedAABB(a);
        const bBox = this.getTransformedAABB(b);

        // Check if there is collision.
        const isColliding = this.aabbIntersection(aBox, bBox);
        if (!isColliding) {
            return;
        }


        const bunny = a.getComponentOfType(Bunny);


        if (bunny.isHolding) {
            console.log("Bunny hole interaction")
            bunny.isHolding = false;
            const carrot = a.children[a.children.length - 1];
            a.removeChild(carrot);
            const carrotTransform = carrot.getComponentOfType(Transform);

            carrotTransform.translation = [0, 0.8, 0];
            const carrotRotation = quat.create();
            quat.rotateZ(carrotRotation, carrotTransform.rotation, Math.PI / 2);
            carrotTransform.rotation = carrotRotation;
            carrotTransform.scale = [.1, 10, .1];

            b.parent.addChild(carrot);
            carrot.children[0].active = false;
            this.updateCounts()
            this.checkCondition()
            bunny.followObject = bunny.findClosest(bunny.baits); // Or any other logic for new bait assignment
        }
    }

    calculateCollisionOffset(aBox, bBox) {
        // Calculate the minimum distance needed to move the AABBs apart
        // This is a simple example, and can be expanded for more accurate collision response
        const offset = vec3.create();
        for (let i = 0; i < 3; i++) {
            const delta = (aBox.max[i] - bBox.min[i]) - (bBox.max[i] - aBox.min[i]);
            offset[i] = delta * .014;

        }
        return offset;
    }

}
