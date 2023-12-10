import { vec2, vec3, vec4, mat3, mat4 } from '../../../lib/gl-matrix-module.js';

import * as WebGPU from '../WebGPU.js';

import { Camera, Model, Transform } from '../core.js';
import { BaseRenderer } from './BaseRenderer.js';

import {
    getLocalModelMatrix,
    getGlobalViewMatrix,
    getProjectionMatrix,
    getModels,
} from '../core/SceneUtils.js';

import {
    createVertexBuffer,
} from '../core/VertexUtils.js';

import { Light } from '../../../components/Light.js';
import { GrassUtils } from '../../../components/GrassUtils.js';


const vertexBufferLayout = {
    arrayStride: 28,

    attributes: [
        {
            name: 'position',
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
        },

        {
            name: 'normal',
            shaderLocation: 1,
            offset: 12,
            format: 'float32x4',
        },

    ],
};

const grassVertexBufferLayout = {
    arrayStride: 12,

    attributes: [
        {
            name: 'position',
            shaderLocation: 0,
            offset: 0,
            format: 'float32x3',
        },

    ],
};

const singleUniformGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
            },
        },

    ]
}

const storageGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
                type: "read-only-storage"
            },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
                type: "read-only-storage"
            },
        },
    ]
}

const outlineTextureGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: 'float',
            },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {
                type: 'filtering',
            },
        },
        {
            binding: 2,
            visibility: GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: 'float',
            },
        },
        {
            binding: 3,
            visibility: GPUShaderStage.FRAGMENT,
            sampler: {
                type: 'filtering',
            },
        },
    ]
}





const litBindGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {},
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {},
        },
        {
            binding: 2,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            texture: {
                sampleType: 'depth',
            },
        },
        {
            binding: 3,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            sampler: {
                type: 'comparison',
            },
        },

    ],
}




const shadowDepthTextureSize = 4096;

export class LitRendererTest extends BaseRenderer {

    constructor(canvas, light, camera, scene) {
        super(canvas);
        this.light = light
        this.scene = scene
        this.camera = camera
        this.lastUsedMaterial = null;
        this.totalModels = 0;
        this.currentModelCount = 0;
        this.modelGroups = new Map();


    }

    arraysAreEqual(arr1, arr2) {

        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) {
                return false;
            }
        }

        return true;
    }


    async initialize() {
        await super.initialize();


        const codePerFragment = await fetch(new URL('../shaders/lambertPerFragmentTest.wgsl', import.meta.url))
            .then(response => response.text());

        const codeShadow = await fetch(new URL('../shaders/lambertShadowTest.wgsl', import.meta.url))
            .then(response => response.text());

        const codeGrass = await fetch(new URL('../shaders/indexedIndirectGrass.wgsl', import.meta.url))
            .then(response => response.text());

        const codeOutlineBlit = await fetch(new URL('../shaders/outlineTextureBlit.wgsl', import.meta.url))
            .then(response => response.text());

        const codeOutlinePass = await fetch(new URL('../shaders/sobelOutline.wgsl', import.meta.url))
            .then(response => response.text());

        const modulePerFragment = this.device.createShaderModule({ code: codePerFragment });
        const moduleShadow = this.device.createShaderModule({ code: codeShadow });
        const moduleGrass = this.device.createShaderModule({ code: codeGrass });
        const moduleOutlineBlit = this.device.createShaderModule({ code: codeOutlineBlit });
        const moduleOutlinePass = this.device.createShaderModule({ code: codeOutlinePass });

        this.litBindGroupLayout = this.device.createBindGroupLayout(litBindGroupLayout);
        this.singleUniformGroupLayout = this.device.createBindGroupLayout(singleUniformGroupLayout);
        this.storageGroupLayout = this.device.createBindGroupLayout(storageGroupLayout);
        this.outlineTextureGroupLayout = this.device.createBindGroupLayout(outlineTextureGroupLayout);



        this.doInitialPrepare()


        

        this.grass = this.scene.getComponentOfType(GrassUtils)
        this.grassMesh = this.grass.getGrassMeshCache();



        const primitive = {
            topology: 'triangle-list',
            cullMode: 'back'
        };

        const layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.litBindGroupLayout, this.storageGroupLayout, this.singleUniformGroupLayout
            ],
        });

        const shadowLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.singleUniformGroupLayout, this.storageGroupLayout
            ],
        });


        const outlineTextureLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.singleUniformGroupLayout, this.storageGroupLayout, this.singleUniformGroupLayout,
            ],
        });

        const outlinePassLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.outlineTextureGroupLayout, this.storageGroupLayout, this.singleUniformGroupLayout,
            ],
        });

        const grassPassLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.litBindGroupLayout, this.singleUniformGroupLayout
            ],
        });

        this.pipelinePerFragment = await this.device.createRenderPipelineAsync({
            vertex: {
                module: modulePerFragment,
                entryPoint: 'vertex',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: modulePerFragment,
                entryPoint: 'fragment',
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus-stencil8',
                depthWriteEnabled: true,
                depthCompare: 'less',
                stencilFront: {
                    compare: "always",
                    passOp: "replace"
                }
            },
            layout,
            primitive
        });

        this.pipelineOutlineTexture = await this.device.createRenderPipelineAsync({
            vertex: {
                module: moduleOutlineBlit,
                entryPoint: 'vertex',
                buffers: [vertexBufferLayout],
            },
            fragment: {
                module: moduleOutlineBlit,
                entryPoint: 'fragment',
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus-stencil8',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },

            layout: outlineTextureLayout,
            primitive
        });

        this.pipelineOutlinePass = await this.device.createRenderPipelineAsync({
            vertex: {
                module: moduleOutlinePass,
                entryPoint: 'vertex',
            },
            fragment: {
                module: moduleOutlinePass,
                entryPoint: 'fragment',
                targets: [{ format: this.format }],
            },


            layout: outlinePassLayout,
        });

        this.pipelineShadow = await this.device.createRenderPipelineAsync({
            vertex: {
                module: moduleShadow,
                entryPoint: 'vertex',
                buffers: [vertexBufferLayout],
            },
            depthStencil: {
                format: 'depth24plus',
                depthWriteEnabled: true,
                depthCompare: 'less',
            },
            layout: shadowLayout,
            primitive
        });

        this.pipelineGrass = await this.device.createRenderPipelineAsync({
            vertex: {
                module: moduleGrass,
                entryPoint: 'vertex',
                buffers: [grassVertexBufferLayout],
            },
            fragment: {
                module: moduleGrass,
                entryPoint: 'fragment',
                targets: [{ format: this.format }],
            },
            depthStencil: {
                format: 'depth24plus-stencil8',
                depthWriteEnabled: true,
                depthCompare: 'less',
                stencilFront: {
                    compare: "equal"
                }
            },
            layout: grassPassLayout,
            primitive
        });

        this.cameraUniformBuffer = this.device.createBuffer({
            size: 128,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        this.lightUniformBuffer = this.device.createBuffer({
            size: 32 + 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.shadowLightUniformBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.grassUniformBuffer = this.device.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        this.outlineUniformBuffer = this.device.createBuffer({
            size: 16 + 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        this.recreateDepthTexture();
        this.createShadowTexture();
        this.createOutlineTexture();
        this.createTempTexture();


        this.litBindGroup = this.device.createBindGroup({
            layout: this.litBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.cameraUniformBuffer } },
                { binding: 1, resource: { buffer: this.lightUniformBuffer } },
                {
                    binding: 2,
                    resource: this.shadowDepthTextureView,
                },
                {
                    binding: 3,
                    resource: this.device.createSampler({
                        compare: 'less',
                    }),
                },
            ]
        })

        this.shadowlitBindGroup = this.device.createBindGroup({
            layout: this.singleUniformGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.shadowLightUniformBuffer } },

            ]
        })

        this.cameraOnlyBindGroup = this.device.createBindGroup({
            layout: this.singleUniformGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.cameraUniformBuffer } },

            ]
        })
        const lightComponent = this.light.getComponentOfType(Light);
        const lightColor = vec3.scale(vec3.create(), lightComponent.color, 1 / 255);
        const lightDirection = vec3.normalize(vec3.create(), lightComponent.direction);


        this.device.queue.writeBuffer(this.lightUniformBuffer, 0, lightColor);
        this.device.queue.writeBuffer(this.lightUniformBuffer, 16, lightDirection);
        this.device.queue.writeBuffer(this.lightUniformBuffer, 32, lightComponent.lightViewProjMat);
        this.device.queue.writeBuffer(this.shadowLightUniformBuffer, 0, lightComponent.lightViewProjMat);
        let bufferData = new Float32Array(4);
        bufferData[0] = 1;
        bufferData[1] = 0.2;
        bufferData[2] = 1.77;
        bufferData[3] = 4.0;

        this.device.queue.writeBuffer(this.grassUniformBuffer, 0, bufferData);
        this.device.queue.writeBuffer(this.grassUniformBuffer, 16, vec4.fromValues(120 / 256, 236 / 256, 115 / 256, 1));
        this.device.queue.writeBuffer(this.grassUniformBuffer, 32, vec4.fromValues(10 / 256, 144 / 256, 41 / 256, 1));

        this.device.queue.writeBuffer(this.grassUniformBuffer, 48, vec4.fromValues(0, 0.1));
        this.device.queue.writeBuffer(this.grassUniformBuffer, 56, vec2.fromValues(0.2, 0.2));

        this.modelBindGroup = this.device.createBindGroup({
            layout: this.storageGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.modelBuffer } },
                { binding: 1, resource: { buffer: this.normalBuffer } },
            ],
        });




        this.grassBindGroup = this.device.createBindGroup({
            layout: this.singleUniformGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.grassUniformBuffer } },
            ],
        });

        bufferData = new Float32Array(3);
        bufferData[0] = 1;
        bufferData[1] = 1;
        bufferData[2] = 1;

        this.device.queue.writeBuffer(this.outlineUniformBuffer, 0, vec4.fromValues(0, 0, 0, 1));
        this.device.queue.writeBuffer(this.outlineUniformBuffer, 16, bufferData);


        this.outlineBindGroup = this.device.createBindGroup({
            layout: this.singleUniformGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.outlineUniformBuffer } },
            ],
        });



        this.grassVertexBuffer = WebGPU.createBuffer(this.device, {
            data: this.grassMesh.vertices.buffer,
            usage: GPUBufferUsage.VERTEX,
        });

        this.grassIndexBuffer = WebGPU.createBuffer(this.device, {
            data: this.grassMesh.indices.buffer,
            usage: GPUBufferUsage.INDEX,
        });


    }

    doInitialPrepare(){
        this.totalModels = 0;
        this.currentModelCount = 0;
        this.modelGroups = new Map();
        this.prepareModelGroups(this.scene);
        this.countTotalModels();
        this.modelBufferData = new Float32Array(16 * this.totalModels);
        this.normalBufferData = new Float32Array(16 * this.totalModels);
        this.updateModelMatrices(this.scene);

        this.prepareModelData(this.scene);
        this.modelBuffer = this.device.createBuffer({
            size: 64 * this.totalModels,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });
        this.normalBuffer = this.device.createBuffer({
            size: 64 * this.totalModels,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
        });


        this.prepareNodeBigBuffer(this.scene);

    }

    prepareModelGroups(node) {
        if (node.name.includes("Cube") || !node.visible) {
            return;
        }
        let model = getModels(node);  // Assuming getModels(node) retrieves models for the node
        if (model.length > 0) {
            // Split the node.name by space and use the first word as the key
            let firstWord = node.name.split(' ')[0];
            if (!this.modelGroups.has(firstWord)) {
                this.modelGroups.set(firstWord, []);
            }
            let group = this.modelGroups.get(firstWord);
            group.push({
                modelMat: mat4.create(),
                normalMat: mat4.create(),
                node: node
            });

        }

        for (const child of node.children) {
            this.prepareModelGroups(child);
        }
    }

    updateModelMatrices(node, modelMatrix = mat4.create()) {
        let firstWord = node.name.split(' ')[0];
        const localMatrix = getLocalModelMatrix(node);
        modelMatrix = mat4.multiply(mat4.create(), modelMatrix, localMatrix);
        const normalMatrix = this.mat3tomat4(mat3.normalFromMat4(mat3.create(), modelMatrix));
        if (this.modelGroups.has(firstWord)) {

            let group = this.modelGroups.get(firstWord);
            for (let i = 0; i < group.length; i++) {
                if (group[i].node.id === node.id) { // Replace 'identifier' with the property you're checking
                    // Modify the modelMat of this node



                    group[i].modelMat = modelMatrix /* new matrix value */; // Assign the new mat4 value here
                    group[i].normalMat = normalMatrix
                    break; // Break the loop if the node is found and modified
                }
            }



        }




        for (const child of node.children) {
            this.updateModelMatrices(child, modelMatrix);
        }




    }
    prepareModelData() {
        this.currentModelCount = 0;
        this.modelGroups.forEach(group => {

            for (let i = group.length - 1; i >= 0; i--) {
                const item = group[i];
                if (!item.node.parent.active || !item.node.active) {
                    group.splice(i, 1);
                } else {
                    this.modelBufferData.set(item.modelMat, this.currentModelCount * 16);
                    this.normalBufferData.set(item.normalMat, this.currentModelCount * 16);
                    this.currentModelCount++;
                }
            }

        });

    }

    countTotalModels() {

        let totalCount = 0;
        for (const models of this.modelGroups.values()) {
            totalCount += models.length;
        }
        this.totalModels = totalCount;

    }


    recreateDepthTexture() {
        this.depthTexture?.destroy();
        this.depthTexture = this.device.createTexture({
            format: 'depth24plus-stencil8',
            size: [this.canvas.width, this.canvas.height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
    }

    createShadowTexture() {
        this.shadowDepthTexture = this.device.createTexture({
            size: [shadowDepthTextureSize, shadowDepthTextureSize],
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: 'depth24plus',
        });
        this.shadowDepthTextureView = this.shadowDepthTexture.createView();

    }

    createTempTexture() {
        this.tempTexture?.destroy();
        this.tempTexture = this.device.createTexture({
            size: { width: this.canvas.width, height: this.canvas.height },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
            format: 'bgra8unorm',
        });
        this.tempTextureView = this.tempTexture.createView();

    }

    createOutlineTexture() {
        this.outlineTexture?.destroy();
        this.outlineTexture = this.device.createTexture({
            size: { width: this.canvas.width, height: this.canvas.height },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: 'bgra8unorm',
        });
        this.outlineTextureView = this.outlineTexture.createView();
    }

    prepareNodeBigBuffer() {
        this.device.queue.writeBuffer(this.modelBuffer, 0, this.modelBufferData);
        this.device.queue.writeBuffer(this.normalBuffer, 0, this.normalBufferData);
    }




    prepareMaterial(material) {
        if (this.materialCache.has(material)) {
            return this.materialCache.get(material);
        }


        const materialUniformBuffer = this.device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });


        const materialBindGroup = this.device.createBindGroup({
            layout: this.singleUniformGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: materialUniformBuffer } },

            ],
        });

        const materialCache = { materialUniformBuffer, materialBindGroup };
        this.materialCache.set(material, materialCache);
        return materialCache;
    }

    render(scene, camera) {
        if (this.depthTexture.width !== this.canvas.width || this.depthTexture.height !== this.canvas.height) {
            this.recreateDepthTexture();
            this.createOutlineTexture();
            this.createTempTexture();
        }

        this.updateModelMatrices(scene);

        this.prepareModelData(scene);
        this.prepareNodeBigBuffer(scene);


        const viewMatrix = getGlobalViewMatrix(camera);
        const projectionMatrix = getProjectionMatrix(camera);

        this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, viewMatrix);
        this.device.queue.writeBuffer(this.cameraUniformBuffer, 64, projectionMatrix);


        const encoder = this.device.createCommandEncoder();


        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [],
            depthStencilAttachment: {
                view: this.shadowDepthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        });
        this.renderPass.setPipeline(this.pipelineShadow);
        this.renderPass.setBindGroup(0, this.shadowlitBindGroup);
        this.renderPass.setBindGroup(1, this.modelBindGroup);
        this.renderGroups();
        this.renderPass.end();



        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: [132 / 256, 221 / 256, 252 / 256, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                }
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                stencilLoadOp: 'clear',
                stencilStoreOp: 'store',

            },
        });
        this.renderPass.setPipeline(this.pipelinePerFragment);
        this.renderPass.setStencilReference(1);
        this.renderPass.setBindGroup(0, this.litBindGroup);
        this.renderPass.setBindGroup(1, this.modelBindGroup);
        this.renderGroups();
        this.renderPass.end();
        if (this.grass.count !== 0) {
            this.renderPass = encoder.beginRenderPass({
                colorAttachments: [
                    {
                        view: this.context.getCurrentTexture().createView(),
                        clearValue: [1, 1, 1, 1],
                        loadOp: 'load',
                        storeOp: 'store',
                    }
                ],
                depthStencilAttachment: {
                    view: this.depthTexture.createView(),
                    depthClearValue: 1,
                    depthLoadOp: 'load',
                    depthStoreOp: 'store',
                    stencilLoadOp: 'load',
                    stencilStoreOp: 'store',
                },
            });


            this.renderPass.setPipeline(this.pipelineGrass);
            const bufferData = new Float32Array(2);
            bufferData[0] = 0.35;
            bufferData[1] = performance.now() / 1000.0;
            this.device.queue.writeBuffer(this.grassUniformBuffer, 64, bufferData);

            this.renderPass.setBindGroup(0, this.litBindGroup);
            this.renderPass.setBindGroup(1, this.grassBindGroup);
            this.renderPass.setVertexBuffer(0, this.grassVertexBuffer);
            this.renderPass.setIndexBuffer(this.grassIndexBuffer, 'uint32');
            this.renderPass.drawIndexed(3, this.grass.count);
            this.renderPass.end();
        }

        encoder.copyTextureToTexture({ texture: this.context.getCurrentTexture() }, { texture: this.tempTexture }, { width: this.canvas.width, height: this.canvas.height })

        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.outlineTextureView,
                    clearValue: [0, 0, 0, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                }
            ],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                stencilLoadOp: 'load',
                stencilStoreOp: 'discard',
            },
        });
        this.renderPass.setPipeline(this.pipelineOutlineTexture);
        this.renderPass.setBindGroup(0, this.cameraOnlyBindGroup);
        this.renderPass.setBindGroup(1, this.modelBindGroup);
        this.renderGroups();
        this.renderPass.end();

        this.renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: [0, 0, 0, 1],
                    loadOp: 'load',
                    storeOp: 'store',
                }
            ],


        });
        this.renderPass.setPipeline(this.pipelineOutlinePass);



        this.outlineTexturesBindGroup = this.device.createBindGroup({
            layout: this.outlineTextureGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.tempTexture.createView(),
                },
                {
                    binding: 1,
                    resource: this.device.createSampler(),
                },
                {
                    binding: 2,
                    resource: this.outlineTextureView,
                },
                {
                    binding: 3,
                    resource: this.device.createSampler(),
                },
            ],
        });
        this.renderPass.setBindGroup(0, this.outlineTexturesBindGroup);
        this.renderPass.setBindGroup(1, this.modelBindGroup);
        this.renderPass.setBindGroup(2, this.outlineBindGroup);



        this.renderPass.draw(6);
        this.renderPass.end();



        this.device.queue.submit([encoder.finish()]);
    }

    renderGroups() {
        let offset = 0;
        this.modelGroups.forEach(group => {
            if (group.length != 0) {
                if(this.started || group[0].node.parent.name === "AvtoFinal" || group[0].node.name === "Plane"){
                    const model = group[0].node.getComponentOfType(Model);

                    this.renderModel(model, group.length, offset);
                    offset += group.length;
                }

            }

        });


    }


    renderModel(model, count, offset) {
        for (const primitive of model.primitives) {
            this.renderPrimitive(primitive, count, offset);
        }
    }



    renderPrimitive(primitive, count, offset) {
        const { materialUniformBuffer, materialBindGroup } = this.prepareMaterial(primitive.material);
        if (!this.lastUsedMaterial) {

            this.device.queue.writeBuffer(materialUniformBuffer, 0, new Float32Array(primitive.material.baseFactor));
            this.lastUsedMaterial = primitive.material;


        }
        else if (this.arraysAreEqual(primitive.material.baseFactor, this.lastUsedMaterial.baseFactor)) {

        }
        else {
            this.device.queue.writeBuffer(materialUniformBuffer, 0, new Float32Array(primitive.material.baseFactor));
            this.lastUsedMaterial = primitive.material;

        }
        this.renderPass.setBindGroup(2, materialBindGroup);


        const { vertexBuffer, indexBuffer } = this.prepareMesh(primitive.mesh, vertexBufferLayout);
        this.renderPass.setVertexBuffer(0, vertexBuffer);
        this.renderPass.setIndexBuffer(indexBuffer, 'uint32');


        this.renderPass.drawIndexed(primitive.mesh.indices.length, count, 0, 0, offset);
    }

}
