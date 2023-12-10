override shadowDepthTextureSize: f32 = 4096.0;

struct VertexInput {
    @builtin(instance_index) idx : u32,
    @location(0) position : vec3f,
    @location(1) normal : vec3f,
}

struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) shadowPos: vec3f,
    @location(1) normal : vec4f,
}

struct FragmentInput {
    @location(0) shadowPos : vec3f,
    @location(1) normal : vec4f,
}

struct FragmentOutput {
    @location(0) color : vec4f,
}





struct CameraUniforms {
    viewMatrix : mat4x4f,
    projectionMatrix : mat4x4f,
}

struct LightUniforms {
    color : vec3f,
    direction : vec3f,
    lightViewProjMatrix : mat4x4f, 
}


struct MaterialUniforms {
    baseFactor : vec4f,
}




@group(0) @binding(0) var<uniform> camera : CameraUniforms;
@group(0) @binding(1) var<uniform> light : LightUniforms;
@group(0) @binding(2) var shadowMap: texture_depth_2d;
@group(0) @binding(3) var shadowSampler: sampler_comparison;
@group(1) @binding(0) var<storage> model : array<mat4x4f>;
@group(1) @binding(1) var<storage> normal : array<mat4x4f>;
@group(2) @binding(0) var<uniform> material : MaterialUniforms;





@vertex
fn vertex(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;
    let posFromLight = light.lightViewProjMatrix * model[input.idx] * vec4(input.position, 1.0);

    output.shadowPos = vec3(
      posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
      posFromLight.z
    );
    output.position = camera.projectionMatrix * camera.viewMatrix * model[input.idx]  * vec4(input.position, 1);
    output.normal = normal[input.idx]  * vec4(input.normal,1.0);
    return output;
}

@fragment
fn fragment(input : FragmentInput) -> FragmentOutput {

    var visibility = 0.0;
  let oneOverShadowDepthTextureSize = 1.0 / shadowDepthTextureSize;
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let offset = vec2f(vec2(x, y)) * oneOverShadowDepthTextureSize;

      visibility += textureSampleCompare(
        shadowMap, shadowSampler,
        input.shadowPos.xy + offset, input.shadowPos.z - 0.007
      );
    }
  }
  visibility /= 9.0;


    var output : FragmentOutput;

    let N = normalize(input.normal.xyz);
    let L = light.direction;

    let NoL = dot(N, L);

    // Parameters for cel shading effect
    let celShadeMidPoint = 0.38; // Adjust this value as needed
    let celShadeSoftness = 0.442; // Adjust this value as needed

    // Smoothstep for cel shading
    var litOrShadowArea = smoothstep(celShadeMidPoint - celShadeSoftness, celShadeMidPoint + celShadeSoftness, NoL);

    // TODO: Replace with actual occlusion data if available
    let occlusion = 1.0; // Placeholder for occlusion, adjust as needed
    litOrShadowArea *= occlusion;
    litOrShadowArea *= visibility;
    // TODO: Replace with logic to determine if it's a face or not
    let isFace = false; // Placeholder, set to true or false as needed
    litOrShadowArea =  litOrShadowArea;

    // Color calculations (simplified for cel shading)
    let baseColor = material.baseFactor;
    let shadowColor = vec4(material.baseFactor.x - 0.5, material.baseFactor.y - 0.5, material.baseFactor.z - 0.4, 1.0); // Adjust shadow color as needed
    let finalColor = mix(shadowColor.rgb, baseColor.rgb, litOrShadowArea);

    output.color = vec4(finalColor, baseColor.a);
    return output;


}
