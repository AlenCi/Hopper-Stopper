import { quat, vec3, vec4, mat4 } from '../lib/gl-matrix-module.js';
import { Transform } from '../common/engine/core/Transform.js';
import { Model } from '../common/engine/core.js';
import { calculateAxisAlignedBoundingBox, mergeAxisAlignedBoundingBoxes } from '../common/engine/core/MeshUtils.js';
import { Bunny } from './Bunny.js';

export class GameManager {

    constructor(node, numberOfBunnies, numberOfCarrots, numberOfHoles, carrotPlane, bunnyPlane, holePlane) {
        this.node = node;
        this.planeBunny = node.root.find(node => node.name === "Plane Bunny");
        this.planeCarrot = node.root.find(node => node.name === "Plane Carrot");
        this.planeHole = node.root.find(node => node.name === "Plane Hole");
        const planeHoleTransform = this.planeHole.getComponentOfType(Transform);
        planeHoleTransform.scale = [planeHoleTransform.scale[0],planeHoleTransform.scale[1], 0.1]
        this.carrots = node.root.filter(node => node.name.includes("Carrot body"))
        this.holes = node.root.filter(node => node.name.includes("Hole body"))
        this.bunnies = node.root.filter(node => node.name.includes("BunnyFinal"))
        
        this.carrots.forEach(n => {
            n.active = n.visible = false;                 
            if (n.children) 
                n.children[0].active = false;

        })
        this.bunnies.forEach(n => {
            n.active = n.visible = false;                 
            if (n.children) 
                n.children[0].active = false;

        })
        this.holes.forEach(n => {
            n.active = n.visible = false;                 
            if (n.children) 
                n.children[0].active = false;

        })


        // Function to set active status
        this.numberOfBunnies = numberOfBunnies
        this.numberOfCarrots = numberOfCarrots
        this.numberOfHoles = numberOfHoles

        this.carrots = node.root.filter(node => node.name.includes("Carrot body")).slice(0, this.numberOfCarrots);
        this.holes = node.root.filter(node => node.name.includes("Hole body")).slice(0, this.numberOfHoles);
        this.bunnies = node.root.filter(node => node.name.includes("BunnyFinal")).slice(0, this.numberOfBunnies);
        // Function to set active status
        this.carrots.forEach(n => {
            n.active = n.visible = true;                 
            if (n.children) 
                n.children[0].active = true;

        })
        this.bunnies.forEach(n => {
            n.active = n.visible = true;                 
            if (n.children) 
                n.children[0].active = true;

        })
        this.holes.forEach(n => {
            n.active = n.visible = true;                 
            if (n.children) 
                n.children[0].active = true;

        })

    }

    setup() {
        this.randomizePositions();

        this.node.root.traverse(node => {
            const model = node.getComponentOfType(Model);

            if (node.name.startsWith("Bunny")) {
                node.aabb = { min: new Float32Array([-1.2, -1.2, -1.2]), max: new Float32Array([1.2, 1.2, 1.2]) };
                node.isDynamic = true;
                const bunTransform = node.getComponentOfType(Transform);

                node.addComponent(new Bunny(node, bunTransform, 12, 1.2, 3.2));
                const bunny = node.getComponentOfType(Bunny)
                bunny.baits = this.carrots;
                bunny.holes = this.holes;
                bunny.followObject = bunny.findClosest(bunny.baits);
            }
            if (node.name.startsWith("Cube")) {
                // Assuming calculateAxisAlignedBoundingBox and mergeAxisAlignedBoundingBoxes are defined
                const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
                node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
                node.isDynamic = true;
            }
            if (node.name.startsWith("Carrot Cube") || node.name.startsWith("Hole Cube")) {
                const boxes = model.primitives.map(primitive => calculateAxisAlignedBoundingBox(primitive.mesh));
                node.aabb = mergeAxisAlignedBoundingBoxes(boxes);
                node.isDynamic = true;
            }
        });

    }

    placeObjectsRandomly(objects, count, plane, offset = 0) {
        const minDistance = 4; // Minimum distance between objects

        let allPositions = [];
        let activeObjects = [];
        const isTooClose = (position, allPositions) => {
            return allPositions.some(pos => vec3.distance(pos, position) < minDistance);
        };
        for (let i = offset; i < objects.length; i++) {


            if (i < count + offset) {


                const nodeTransform = objects[i].getComponentOfType(Transform);
                let position;
                do {
                    position = this.generateRandomPosition(nodeTransform.translation[1], plane);
                } while (isTooClose(position, allPositions));
                allPositions.push(position);
                nodeTransform.translation = position;
                activeObjects.push(objects[i]);



            } else {
                objects[i].active = false;
                objects[i].visible = false;
                if (objects[i].children) {
                    objects[i].children[0].active = false;

                }
            }
        }

        return activeObjects;
    }

    randomizePositions() {





        this.bunnies = this.placeObjectsRandomly(this.bunnies, this.numberOfBunnies, this.planeBunny);
        this.carrots = this.placeObjectsRandomly(this.carrots, this.numberOfCarrots, this.planeCarrot);
        this.holes = this.placeObjectsRandomly(this.holes, this.numberOfHoles, this.planeHole);

    }

    generateRandomPosition(currentPosY, plane) {
        const planeTransform = plane.getComponentOfType(Transform);
        const actualPlaneSizeX = 10 * planeTransform.scale[0];
        const actualPlaneSizeZ = 10 * planeTransform.scale[2];
        const randomX = Math.random() * actualPlaneSizeX - actualPlaneSizeX / 2;
        const randomZ = Math.random() * actualPlaneSizeZ - actualPlaneSizeZ / 2;
        const posX = randomX + planeTransform.translation[0];
        const posZ = randomZ + planeTransform.translation[2];
        return vec3.fromValues(posX, currentPosY, posZ);
    }



}
