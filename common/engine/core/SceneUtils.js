import { mat4 } from '../../../lib/gl-matrix-module.js';

import { Camera } from './Camera.js';
import { Model } from './Model.js';
import { Transform } from './Transform.js';

export function getLocalModelMatrix(node) {
    const matrix = mat4.create();
    for (const transform of node.getComponentsOfType(Transform)) {
        mat4.mul(matrix, matrix, transform.matrix);
    }
    return matrix;
}

export function getGlobalModelMatrix(node) {
    if (node.parent) {
        const parentMatrix = getGlobalModelMatrix(node.parent);
        const modelMatrix = getLocalModelMatrix(node);
        return mat4.multiply(parentMatrix, parentMatrix, modelMatrix);
    } else {
        return getLocalModelMatrix(node);
    }
}

export function getLocalViewMatrix(node) {
    const matrix = getLocalModelMatrix(node);
    return mat4.invert(matrix, matrix);
}

export function getGlobalViewMatrix(node) {
    const matrix = getGlobalModelMatrix(node);
    return mat4.invert(matrix, matrix);
}

export function getProjectionMatrix(node) {
    const camera = node.getComponentOfType(Camera);
    return camera ? camera.projectionMatrix : mat4.create();
}
export function getVPMatrix(node){
    const vpMat = mat4.create();
    const projection = getProjectionMatrix(node)
    const view = getGlobalViewMatrix(node)
    mat4.multiply(vpMat, projection, view);
    return vpMat;
}


export function getMVPMatrix(node,modelMat){
    const mvpMat = mat4.create();
    const projection = getProjectionMatrix(node)
    const view = getGlobalViewMatrix(node)
    mat4.multiply(mvpMat, view, modelMat);
    mat4.multiply(mvpMat, projection, mvpMat);
    return mvpMat;
}

export function getModels(node) {
    return node.getComponentsOfType(Model);
}
