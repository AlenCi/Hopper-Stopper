struct VertexInput {
    @builtin(instance_index) idx : u32,
    @location(0) position : vec3f,
}

struct VertexOutput {
    @builtin(position) position : vec4f,
}

struct FragmentOutput {
    @location(0) color : vec4f,
}


struct CameraUniforms {
    viewMatrix : mat4x4f,
    projectionMatrix : mat4x4f,
}

struct MaterialUniforms {
    baseFactor : vec4f,
}


@group(0) @binding(0) var<uniform> camera : CameraUniforms;
@group(1) @binding(0) var<storage> model : array<mat4x4f>;
@group(1) @binding(1) var<storage> normal : array<mat4x4f>;
@group(2) @binding(0) var<uniform> material : MaterialUniforms;





@vertex
fn vertex(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;
    output.position = camera.projectionMatrix * camera.viewMatrix * model[input.idx]  * vec4(input.position, 1);
    return output;
}

@fragment
fn fragment() -> FragmentOutput {
    var output : FragmentOutput;
    output.color = material.baseFactor;
    return output;
}
