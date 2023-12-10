import { Transform } from "../common/engine/core/Transform.js";
import { quat, vec3, vec4, mat4 } from '../lib/gl-matrix-module.js';

export class Light {

    constructor({
        color = [255, 255, 255],
        direction = [0, 0, 1],
 
        node
    } = {}) {
        this.node = node;
        this.color = color;
        this.direction = direction;
        this.left = -115;
        this.right = 113;
        this.bottom = -89;
        this.top = 106;
        this.near = -300;
        this.far = 108;
        this.lightViewProjMat = mat4.create();
    }


    update() {
        let lightViewMatrix = mat4.create();
        const lightPosition = this.node.getComponentOfType(Transform).translation;
        mat4.lookAt(lightViewMatrix, vec3.fromValues(lightPosition[0], lightPosition[1], lightPosition[2]), vec3.fromValues(0, 0, 0), vec3.fromValues(this.direction[0], this.direction[1], this.direction[2]));
        const lightProjectionMatrix = mat4.create();
        mat4.ortho(lightProjectionMatrix, this.left, this.right, this.bottom, this.top, this.near, this.far, lightProjectionMatrix);
        const lightViewProjMatrix = mat4.create();
        mat4.multiply(lightViewProjMatrix, lightProjectionMatrix, lightViewMatrix);
        this.lightViewProjMat = lightViewProjMatrix;
    }


}
