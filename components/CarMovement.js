import { quat, vec3, vec4, mat4 } from '../lib/gl-matrix-module.js';
import { Transform } from '../common/engine/core/Transform.js';

export class CarMovement {

    constructor(node) {
        this.node = node;
        this.yaw = 0;
        this.pitch = 0;
        this.velocity = vec3.fromValues(0, 0, 0);
        this.acceleration = 0.18;
        this.currentSpeed = 0;
        this.decay = 0.05;
        this.maxSpeed = 0.5;
        this.mouseSensitivity = 0.005;
        this.keys = {};
        const plane = node.root.find(node => node.name === "Plane")
        const planeTransform = plane.getComponentOfType(Transform);
        this.actualPlaneSizeX = 10 * planeTransform.scale[0];
        this.actualPlaneSizeZ = 10 * planeTransform.scale[2];
        //By doing this, you've set the initial position of the cube to the origin of your world (0, 0, 0).
        this.position = vec3.fromValues(0, 0, 0);  // Initialize the position vector here
        this.wheels = node.root.filter(node => node.name.includes("gume") )
        document.addEventListener('keydown', this.keydownHandler.bind(this));
        document.addEventListener('keyup', this.keyupHandler.bind(this));
    }

    keydownHandler(e) {
        this.keys[e.code] = true;
    }

    keyupHandler(e) {
        this.keys[e.code] = false;
    }
    /*The update method updates the cube's rotation 
    and positioning based on time and user inputs.*/
    update(t, dt) {

        const transform = this.node.getComponentOfType(Transform);
        if (transform) {
            this.velocity = vec3.fromValues(0, 0, 0);


            // Update yaw for rotation
            const someConstant = 2.5;
            if (this.keys['KeyD']) {
                this.yaw -= someConstant * dt;
            }
            if (this.keys['KeyA']) {
                this.yaw += someConstant * dt;
            }

            // Update rotation based on the Euler angles.
            const rotation = quat.create();
            quat.rotateY(rotation, rotation, this.yaw);
            transform.rotation = rotation;



            // Step 2: Transform to world space
            const rotMat = mat4.create();
            mat4.fromQuat(rotMat, transform.rotation);
            const worldForward = vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, 1), rotMat);
            if (this.keys['KeyW']) {
                this.currentSpeed += this.acceleration * dt;
            }
            if (this.keys['KeyS']) {
                this.currentSpeed -= this.acceleration * dt;
           }
            if (!this.keys['KeyW'] && !this.keys['KeyS']) {
                this.currentSpeed *= (1 - this.decay);
            } 

            
            this.currentSpeed = Math.max(Math.min(this.currentSpeed, this.maxSpeed), -this.maxSpeed);

            vec3.scale(worldForward, worldForward, this.currentSpeed);
            vec3.add(this.velocity, this.velocity, worldForward);
        
            // Step 7: Update the Object's Position
            const newPos = vec3.create();
            vec3.add(newPos, transform.translation, this.velocity);
        
            // Clamping the new position
            const offset = 5
            const MinOffset = 7
            newPos[0] = Math.max(-this.actualPlaneSizeX / 2 + offset, Math.min(newPos[0], this.actualPlaneSizeX / 2 - MinOffset));
            newPos[2] = Math.max(-this.actualPlaneSizeZ / 2 + offset, Math.min(newPos[2], this.actualPlaneSizeZ / 2 - MinOffset));
        
            transform.translation = newPos;
        }

        if (Math.abs(this.currentSpeed) > 0) {
            const wheelRotationSpeed = 250; // Determine how fast the wheels should rotate
        
            this.wheels.forEach(wheel => {
                const wheelTransform = wheel.getComponentOfType(Transform);
                if (wheelTransform) {
                    // This example assumes the wheels rotate on the X axis.
                    // You will need to adjust the axis based on how your model is oriented.
                    const wheelRotation = quat.create();
                    quat.rotateX(wheelRotation, wheelTransform.rotation, wheelRotationSpeed * this.currentSpeed * dt);
                    wheelTransform.rotation = wheelRotation;

                }
            });
        }
    }




}
