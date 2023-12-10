import { mat4 } from '../../../lib/gl-matrix-module.js';

import * as WebGPU from '../../../common/engine/WebGPU.js';

import { createVertexBuffer } from '../../../common/engine/core/VertexUtils.js';


export class BaseRenderer {

    constructor(canvas) {
        this.canvas = canvas;
        this.nodeCache = new Map();
        this.materialCache = new Map();
        this.meshCache = new Map();
    }

    async initialize() {
        const adapter = await navigator.gpu.requestAdapter();
        const device = await adapter.requestDevice();
        const context = this.canvas.getContext('webgpu');
        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device, format, alphaMode: 'opaque',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        });
        this.background = { r: 0.009, g: 0.0125, b: 0.0164, a: 1.0 };
        this.device = device;
        this.context = context;
        this.format = format;
    }



    

    mat3tomat4(matrix) {

        return mat4.fromValues(
            matrix[0], matrix[1], matrix[2], 0,
            matrix[3], matrix[4], matrix[5], 0,
            matrix[6], matrix[7], matrix[8], 0,
            0, 0, 0, 1,
        );
    }

    prepareImage(image) {
        if (this.gpuObjects.has(image)) {
            return this.gpuObjects.get(image);
        }

        const gpuTexture = WebGPU.createTexture(this.device, { source: image });

        const gpuObjects = { gpuTexture };
        this.gpuObjects.set(image, gpuObjects);
        return gpuObjects;
    }

    prepareSampler(sampler) {
        if (this.gpuObjects.has(sampler)) {
            return this.gpuObjects.get(sampler);
        }

        const gpuSampler = this.device.createSampler(sampler);

        const gpuObjects = { gpuSampler };
        this.gpuObjects.set(sampler, gpuObjects);
        return gpuObjects;
    }

    prepareMesh(mesh, layout) {
        if (this.meshCache.has(mesh)) {
            return this.meshCache.get(mesh);
        }

        const vertexBufferArrayBuffer = createVertexBuffer(mesh.vertices, layout);
        const vertexBuffer = WebGPU.createBuffer(this.device, {
            data: vertexBufferArrayBuffer,
            usage: GPUBufferUsage.VERTEX,
        });

        const indexBufferArrayBuffer = new Uint32Array(mesh.indices).buffer;
        const indexBuffer = WebGPU.createBuffer(this.device, {
            data: indexBufferArrayBuffer,
            usage: GPUBufferUsage.INDEX,
        });

        const meshCache = { vertexBuffer, indexBuffer };
        this.meshCache.set(mesh, meshCache);
        console.log(this.meshCache)
        return meshCache;
    }

}
