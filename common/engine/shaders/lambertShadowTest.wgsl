
struct VertexInput {
    @builtin(instance_index) idx : u32,
    @location(0) position : vec3f,
}

struct VertexOutput {
    @builtin(position) position : vec4f,
}


struct LightUniforms {
    lightViewProjMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> light : LightUniforms;
@group(1) @binding(0) var<storage> model : array<mat4x4f>;
@group(1) @binding(1) var<storage> normal : array<mat4x4f>;

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;
  output.position = light.lightViewProjMatrix * model[input.idx] * vec4(input.position, 1.0);
  return output;
}

