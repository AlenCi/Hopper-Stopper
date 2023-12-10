import { quat, vec3, vec4, mat4 } from '../lib/gl-matrix-module.js';
import { Transform } from '../common/engine/core/Transform.js';

export class FollowObject {

    constructor(node, followedObject) {
        this.node = node;
        this.followedObject = followedObject;
    }

    update(t, dt) {
        const followedTransform = this.followedObject.getComponentOfType(Transform);

        const transform = this.node.getComponentOfType(Transform);

        const offset = vec3.fromValues(-20, -followedTransform.translation[1] + transform.translation[1], -20 );  // X, Y, and Z offset

        vec3.add(transform.translation, followedTransform.translation, offset);
        transform.translation[1] = 30

    }




}
