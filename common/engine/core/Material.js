export class Material {

    constructor({
        baseTexture,
        emissionTexture,
        normalTexture,
        occlusionTexture,
        roughnessTexture,
        metalnessTexture,

        baseFactor = [1, 1, 1, 1],
        emissionFactor = [0, 0, 0],
        normalFactor = 1,
        occlusionFactor = 1,
        roughnessFactor = 1,
        metalnessFactor = 1,
        baseColor256,  // New parameter for 8-bit color components
        
    } = {}) {
        if (baseColor256) {
            baseFactor = this.normalizeColor(baseColor256);
        }
        this.baseTexture = baseTexture;
        this.emissionTexture = emissionTexture;
        this.normalTexture = normalTexture;
        this.occlusionTexture = occlusionTexture;
        this.roughnessTexture = roughnessTexture;
        this.metalnessTexture = metalnessTexture;

        this.baseFactor = baseFactor;
        this.emissionFactor = emissionFactor;
        this.normalFactor = normalFactor;
        this.occlusionFactor = occlusionFactor;
        this.roughnessFactor = roughnessFactor;
        this.metalnessFactor = metalnessFactor;
    }
    normalizeColor(color) {
        return color.map(component => component / 255);
    }

}
