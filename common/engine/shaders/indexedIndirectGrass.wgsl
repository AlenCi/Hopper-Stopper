override shadowDepthTextureSize: f32 = 2048.0;

struct VertexInput {
    @builtin(instance_index) idx : u32,
    @location(0) position : vec3f,
}

struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0) shadowPos : vec3f,
    @location(1) normal : vec3f,
    @location(2) color : vec4f,

}

struct FragmentInput {
    @location(0) shadowPos: vec3f,
    @location(1) normal : vec3f,
    @location(2) color : vec4f,
    
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


struct GrassUniforms {
    grassWidth: f32,
    grassHeight: f32,
    windIntensity: f32,
    windFrequency: f32,
    baseColor : vec4f,
    groundColor : vec4f,
    windTiling: vec2f,
    windWrap: vec2f,
    randomNormal: f32,
    time: f32,

}



@group(0) @binding(0) var<uniform> camera : CameraUniforms;
@group(0) @binding(1) var<uniform> light : LightUniforms;
@group(0) @binding(2) var shadowMap: texture_depth_2d;
@group(0) @binding(3) var shadowSampler: sampler_comparison;
@group(1) @binding(0) var<uniform> grass : GrassUniforms;

fn xxhash32(n: u32) -> f32 {
    var h32 = n + 374761393u;
    h32 = 668265263u * ((h32 << 17) | (h32 >> (32 - 17)));
    h32 = 2246822519u * (h32 ^ (h32 >> 15));
    h32 = 3266489917u * (h32 ^ (h32 >> 13));
    h32 = h32^(h32 >> 16);

    // Normalize the output to a float in the range [0.0, 1.0]
    return f32(h32) / 4294967295.0; // 4294967295.0 is the maximum value for a 32-bit unsigned integer
}


@vertex
fn vertex(input : VertexInput) -> VertexOutput {
    var output : VertexOutput;
    let idx = input.idx;

    let randomX = xxhash32(idx * 12);
    let randomZ = xxhash32(idx * 78);
    

    let posX = randomX * 200 - 100;
    let posZ = randomZ * 200 - 100;

    // Convert to world space
    let posWSPivot = vec3f(posX, 0, posZ);

    let perGrassHeight = mix(2,5,(sin(posWSPivot.x*23.4643 + posWSPivot.z) * 0.45 + 0.55)) * grass.grassHeight;

    let cameraTransformRightWS = -vec3(camera.viewMatrix[0].x,camera.viewMatrix[1].x,camera.viewMatrix[2].x);
    let cameraTransformUpWS = vec3(camera.viewMatrix[0].y,camera.viewMatrix[1].y,camera.viewMatrix[2].y); 
    let cameraTransformForwardWS = vec3(camera.viewMatrix[0].z,camera.viewMatrix[1].z,camera.viewMatrix[2].z); 

    
    var posOS = input.position.x * cameraTransformRightWS * grass.grassWidth * (sin(posWSPivot.x * 95.4643 + posWSPivot.z) * 0.45 + 0.55);
    posOS += input.position.y * cameraTransformUpWS;

    posOS.y *= perGrassHeight;

    // camera distance scaling

    var posWS = posWSPivot.xyz + posOS;

    // wind
    var wind = (sin(grass.time * grass.windFrequency + posWSPivot.x * grass.windTiling.x + posWSPivot.z * grass.windTiling.y) * grass.windWrap.x ) * grass.windIntensity; //windA
    wind *= input.position.y; //wind only affect top region, don't affect root region
    let windOffset = cameraTransformRightWS * wind; //swing using billboard left right direction
    posWS += windOffset;


    output.position = camera.projectionMatrix * camera.viewMatrix * vec4f(posWS,1.0);


    let randomAddToN = (grass.randomNormal * sin(posWSPivot.x  * 82.32523 + posWSPivot.z)) * cameraTransformRightWS;
    let N = normalize(vec3f(0,1,0) + randomAddToN - cameraTransformForwardWS * 0.5);
    let posFromLight = light.lightViewProjMatrix * vec4f(posWS,1.0);

    let shadowPos = vec3(
      posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
      posFromLight.z
    );
    output.normal = N;
    output.shadowPos = shadowPos;
    

    output.color = mix(grass.groundColor, grass.baseColor, input.position.y);;

    return output;
}

@fragment
fn fragment(input : FragmentInput) -> FragmentOutput {
    var output : FragmentOutput;


   

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
    let L = light.direction;

    let lambert = max(dot(input.normal, L), 0);
    let diffuseLight = lambert;
    let lightingFactor = min(0.2 + visibility * diffuseLight, 1.0);

    const gamma = 2.2;
    let albedo = pow(input.color, vec4f(gamma));
    let finalColor = albedo * lightingFactor;

    output.color = finalColor;

    return output;
}

