import { Mesh, Vertex, Material, Primitive } from '../core.js';
import { MTLLoader } from './MTLLoader.js';

export class OBJLoader {

    async loadMesh(url) {
        const response = await fetch(url);
        const text = await response.text();

        const lines = text.split('\n');

        const vRegex = /v\s+(\S+)\s+(\S+)\s+(\S+)\s*/;
        const vData = lines
            .filter(line => vRegex.test(line))
            .map(line => [...line.match(vRegex)].slice(1))
            .map(entry => entry.map(entry => Number(entry)));

        const vnRegex = /vn\s+(\S+)\s+(\S+)\s+(\S+)\s*/;
        const vnData = lines
            .filter(line => vnRegex.test(line))
            .map(line => [...line.match(vnRegex)].slice(1))
            .map(entry => entry.map(entry => Number(entry)));

        const vtRegex = /vt\s+(\S+)\s+(\S+)\s*/;
        const vtData = lines
            .filter(line => vtRegex.test(line))
            .map(line => [...line.match(vtRegex)].slice(1))
            .map(entry => entry.map(entry => Number(entry)));

        function triangulate(list) {
            const triangles = [];
            for (let i = 2; i < list.length; i++) {
                triangles.push(list[0], list[i - 1], list[i]);
            }
            return triangles;
        }

        const fRegex = /f\s+(.*)/;
        const fData = lines
            .filter(line => fRegex.test(line))
            .map(line => line.match(fRegex)[1])
            .map(line => line.trim().split(/\s+/))
            .flatMap(face => triangulate(face));

        const mtlRegex = /mtllib\s+(.*)/;

        const useMtlRegex = /usemtl\s+(.*)/;

        const indicesRegex = /(\d+)(\/(\d+))?(\/(\d+))?/;

        let currentMaterial = null;
        const groupedFaces = {};
        let mtlObject = {};
        const mtloader = new MTLLoader();


        for (const line of lines) {
            if (mtlRegex.test(line)) {
                const mtlFileName = line.match(mtlRegex)[1];
                const mtlURL = url.replace(/[^/]*$/, mtlFileName);
                mtlObject = await mtloader.parseMTL(mtlURL);
            }
            else if (useMtlRegex.test(line)) {
                currentMaterial = line.match(useMtlRegex)[1];
            } else if (fRegex.test(line)) {
                if (currentMaterial) {
                    const faceData = line.match(fRegex)[1].trim().split(/\s+/);
                    const triangulatedFaceData = triangulate(faceData);

                    if (!groupedFaces[currentMaterial]) {
                        groupedFaces[currentMaterial] = [];
                    }

                    groupedFaces[currentMaterial].push(...triangulatedFaceData);
                }
            }
        }
        const primitives = [];
        for (const [materialName, faceGroup] of Object.entries(groupedFaces)) {
            const vertices = [];
            const indices = [];
            const cache = {};
            let cacheLength = 0;

            for (const id of faceGroup) {
                if (id in cache) {
                    indices.push(cache[id]);
                } else {
                    cache[id] = cacheLength;
                    indices.push(cacheLength);
                    const [, vIndex, , vtIndex, , vnIndex] = [...id.match(indicesRegex)]
                        .map(entry => Number(entry) - 1);
                    vertices.push(new Vertex({
                        position: vData[vIndex],
                        normal: vnData[vnIndex],
                        texcoords: vtData[vtIndex],
                    }));
                    cacheLength++;
                }
            }
            const mesh = new Mesh({ vertices, indices });
            const mtlMat = mtlObject[materialName]
            const material = new Material(this.mapMTLToMaterial(mtlMat));
            primitives.push(new Primitive({ mesh, material }));
        }
        return primitives;
    }

    mapMTLToMaterial(mtl) {
        return new Material({
            baseTexture: null,  // Handle separately if your MTL has a texture map
            emissionTexture: null,  // Handle separately if your MTL has an emission map
            normalTexture: null,  // Handle separately if your MTL has a normal map
            occlusionTexture: null,  // Handle separately if your MTL has an occlusion map
            roughnessTexture: null,  // Handle separately if your MTL has a roughness map
            metalnessTexture: null,  // Handle separately if your MTL has a metalness map

            baseFactor: [...mtl.diffuse, mtl.opacity],  // Assuming RGBA for baseFactor
            emissionFactor: mtl.emissive,
            normalFactor: 1,  // Default to 1 since MTL doesn't specify
            occlusionFactor: 1,  // Default to 1 since MTL doesn't specify
            roughnessFactor: 1 - mtl.shininess / 1000,  // Assuming 0-1000 scale for shininess
            metalnessFactor: 1  // Default to 1 since MTL doesn't specify
        });
    }
}
