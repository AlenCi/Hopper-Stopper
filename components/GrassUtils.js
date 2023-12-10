
import { quat, vec2, vec3, vec4, mat4 } from '../lib/gl-matrix-module.js';
import { Transform } from '../common/engine/core/Transform.js';
import { Mesh } from '../common/engine/core.js';

export class GrassUtils {

    
    constructor(node, plane) {
        this.node = node;
        this.plane = plane;
        this.count = 0;
                     

    }

 

    getGrassMeshCache() {
        // Check if the cachedGrassMesh exists
        if (!this.cachedGrassMesh) {
          // Create the vertices using Float32Array for better performance and alignment with GLTF
          const vertices = new Float32Array([
            -0.25, 0.0, 0.0,  // Vertex 0
             0.25, 0.0, 0.0,  // Vertex 1
             0.0,  1.0, 0.0   // Vertex 2
          ]);
      
          // Create the indices (triangles) using Uint16Array or Uint32Array
          const indices = new Uint32Array([
            2, 1, 0,  // Triangle indices
          ]);
      
          // Set the vertices and indices to the mesh
          this.cachedGrassMesh = new Mesh({ vertices, indices });
        }
      
        // Return the cached mesh
        return this.cachedGrassMesh;
      }





}
