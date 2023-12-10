
struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) texcoords : vec2f,

}

struct FragmentInput {
    @location(0) texcoords : vec2f,

 
}

struct FragmentOutput {
    @location(0) color : vec4f,
}

struct OutlineUniforms {
    outlineColor : vec4f,
    outlineWidth : f32,
    outlineBias : f32,
    outlineMultiplier : f32,
}

@group(0) @binding(0) var cameraTextureMap: texture_2d<f32>;
@group(0) @binding(1) var cameraTextureSampler: sampler;
@group(0) @binding(2) var colorTextureMap: texture_2d<f32>;
@group(0) @binding(3) var colorTextureSampler: sampler;
@group(1) @binding(0) var<storage> model : array<mat4x4f>;
@group(1) @binding(1) var<storage> normal : array<mat4x4f>;
@group(2) @binding(0) var<uniform> outline : OutlineUniforms;

@vertex
fn vertex(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  const pos = array(
    vec2( 1.0,  1.0),
    vec2( 1.0, -1.0),
    vec2(-1.0, -1.0),
    vec2( 1.0,  1.0),
    vec2(-1.0, -1.0),
    vec2(-1.0,  1.0),
  );

  const uv = array(
    vec2(1.0, 0.0),
    vec2(1.0, 1.0),
    vec2(0.0, 1.0),
    vec2(1.0, 0.0),
    vec2(0.0, 1.0),
    vec2(0.0, 0.0),
  );

  var output : VertexOutput;
  output.position = vec4(pos[VertexIndex], 0.0, 1.0);
  output.texcoords = uv[VertexIndex];
  return output;
}

@fragment
fn fragment(input : FragmentInput) -> FragmentOutput {

    var output : FragmentOutput;

    var dimensions = vec2<f32>(1920,1080);

    let offset = vec3f((1.0 / dimensions.x), (1.0 / dimensions.y), 0.0) * outline.outlineWidth;

    let sceneColor = textureSample(cameraTextureMap, cameraTextureSampler, input.texcoords).rgb;

    let pixelCenter = textureSample(colorTextureMap, colorTextureSampler, input.texcoords);
    let pixelLeft = textureSample(colorTextureMap, colorTextureSampler, input.texcoords - offset.xz);
    let pixelRight = textureSample(colorTextureMap, colorTextureSampler, input.texcoords + offset.xz);
    let pixelUp = textureSample(colorTextureMap, colorTextureSampler, input.texcoords + offset.zy);
    let pixelDown = textureSample(colorTextureMap, colorTextureSampler, input.texcoords - offset.zy);

    let sumPixels = abs(pixelLeft - pixelCenter) + abs(pixelRight - pixelCenter) + abs(pixelUp - pixelCenter) + abs(pixelDown - pixelCenter);
    var sobelTotal = sumPixels.x + sumPixels.y + sumPixels.z;
    sobelTotal = pow(sobelTotal * outline.outlineMultiplier, outline.outlineBias);

    let sobelOutline = (sobelTotal);
    let outlineColor = mix(sceneColor, outline.outlineColor.rgb, outline.outlineColor.a);
    let color = mix(sceneColor, outlineColor, sobelOutline);

    
    output.color = vec4(color, 1.0);

    return output;


}
