export class Node {

    constructor() {
        this.children = [];
        this.parent = null;
        this.components = [];
        this.name = "SCENE"
        this.root = this; 
        this.active = true;
        this.visible = true;
        this.id = 0
    }

    addChild(node) {
        node.parent?.removeChild(node);
        this.children.push(node);
        node.parent = this;
        node.root = this.root; // all children get the root of the current node
        for (const child of node.children) {
            child.updateRoot(this.root); // update all descendants' root
        }
    }
    
    updateRoot(newRoot) {
        this.root = newRoot;
        for (const child of this.children) {
            child.updateRoot(newRoot); // recursively update all children's root
        }
    }

    removeChild(node) {
        
        const index = this.children.indexOf(node);
        if (index >= 0) {

            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    traverse(before, after) {
        before?.(this);
        for (const child of this.children) {
            child.traverse(before, after);
        }
        after?.(this);
    }

    linearize() {
        const array = [];
        this.traverse(node => array.push(node));
        return array;
    }

    printTree(level = 0) {
        console.log("  ".repeat(level) + this.name);
        for (const child of this.children) {
            child.printTree(level + 1);
        }
    }
    
    

    filter(predicate) {
        return this.linearize().filter(predicate);
    }

    find(predicate) {
        return this.linearize().find(predicate);
    }

    map(transform) {
        return this.linearize().map(transform);
    }

    addComponent(component) {
        this.components.push(component);
        return component;
    }

    removeComponent(component) {
        this.components = this.components.filter(c => c !== component);
    }

    removeComponentsOfType(type) {
        this.components = this.components.filter(component => !(component instanceof type));
    }

    getComponentOfType(type) {
        return this.components.find(component => component instanceof type);
    }

    getComponentsOfType(type) {
        return this.components.filter(component => component instanceof type);
    }

}
