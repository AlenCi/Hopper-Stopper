import { quat, vec3, vec4, mat4 } from '../lib/gl-matrix-module.js';
import { Transform } from '../common/engine/core/Transform.js';

export class Bunny {

    constructor(node, transform, moveSpeed, hopDuration, hopHeight) {
        this.node = node
        this.transform = transform;
        this.moveSpeed = moveSpeed;
        this.hopDuration = hopDuration;
        this.hopHeight = hopHeight;
        this.hopTimer = 0;
        this.basePosition = vec3.clone(transform.translation);
        this.isHolding = false;
        const plane = node.root.find(node => node.name === "Plane")
        const planeTransform = plane.getComponentOfType(Transform);
        this.actualPlaneSizeX = 10 * planeTransform.scale[0];
        this.actualPlaneSizeZ = 10 * planeTransform.scale[2];

    }
    update(t, dt) {


        // Hopping
        this.hopTimer += dt;
        const normalizedTime = (this.hopTimer % this.hopDuration) / this.hopDuration;
        const yOffset = Math.sin(normalizedTime * Math.PI) * this.hopHeight;
        if (this.followObject) {
            if (normalizedTime > 0.2 && normalizedTime < 0.8) {
                const followTransform = this.followObject.getComponentOfType(Transform);
                if (this.followObject.name.startsWith("BunnyFinal")) {

                    if (!this.followObject.getComponentOfType(Bunny).isHolding) {
                        this.direction = vec3.create();

                        this.followObject = this.findClosest(this.baits)
  
                    }
                    else {
                        this.direction = this.followObject.getComponentOfType(Bunny).direction;
                    }

                }
                else {

                    // Calculate the direction vector from the bunny to the bait
                    this.direction = vec3.create();
                    vec3.subtract(this.direction, followTransform.translation, this.transform.translation);
                    this.direction[1] = 0; // Remove vertical component for rotation calculation
                    vec3.normalize(this.direction, this.direction);
                }
                const horizontalMovement = vec3.scale(vec3.create(), this.direction, this.moveSpeed * dt);
                const newPos = vec3.create();

                vec3.add(newPos, this.transform.translation, horizontalMovement);
                const offset = 1
                newPos[0] = Math.max(-this.actualPlaneSizeX / 2 + offset, Math.min(newPos[0], this.actualPlaneSizeX / 2 - offset));
                newPos[2] = Math.max(-this.actualPlaneSizeZ / 2 + offset, Math.min(newPos[2], this.actualPlaneSizeZ / 2 - offset));
                this.transform.translation[0] = newPos[0];
                this.transform.translation[2] = newPos[2];

                // Calculate the angle for the rotation
                let angle = Math.atan2(-this.direction[2], this.direction[0]);
                angle -= Math.PI / 2;
                // Create the target rotation quaternion
                let targetRotation = quat.create();
                quat.rotateY(targetRotation, targetRotation, angle);

                // Apply a smooth rotation towards the target rotation
                quat.slerp(this.transform.rotation, this.transform.rotation, targetRotation, dt * this.moveSpeed);

            }

        }

        this.transform.translation[1] = this.basePosition[1] + yOffset + 0.5;
    }

    findClosest(group) {
        let closestEl = null;
        let minDistance = Number.MAX_VALUE;

        group.forEach(el => {
            const distance = vec3.distance(this.transform.translation, el.getComponentOfType(Transform).translation);
            if (distance < minDistance) {
                minDistance = distance;
                closestEl = el;
            }
        });

        return closestEl;
    }



}
