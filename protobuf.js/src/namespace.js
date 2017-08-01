"use strict";
module.exports = Namespace;

var ReflectionObject = require("./object");
/** @alias Namespace.prototype */
var NamespacePrototype = ReflectionObject.extend(Namespace);

var Enum    = require("./enum"),
    Type    = require("./type"),
    Field   = require("./field"),
    Service = require("./service"),
    util    = require("./util");

var _TypeError = util._TypeError;

var nestedTypes = [ Enum, Type, Service, Field, Namespace ],
    nestedError = "one of " + nestedTypes.map(function(ctor) { return ctor.name; }).join(', ');

/**
 * Constructs a new namespace.
 * @classdesc Reflected namespace and base class of all reflection objects containing nested objects.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Namespace name
 * @param {Object} [options] Declared options
 */
function Namespace(name, options) {
    ReflectionObject.call(this, name, options);

    /**
     * Nested objects by name.
     * @type {Object.<string,ReflectionObject>|undefined}
     */
    this.nested = undefined; // toJSON

    /**
     * Cached nested objects as an array.
     * @type {?ReflectionObject[]}
     * @private
     */
    this._nestedArray = null;
}

function clearCache(namespace) {
    namespace._nestedArray = null;
    return namespace;
}

Object.defineProperties(NamespacePrototype, {

    /**
     * Determines whether this namespace is empty.
     * @name Namespace#empty
     * @type {boolean}
     * @readonly
     */
    empty: {
        get: function() {
            return Boolean(this.nested && Object.keys(this.nested).length);
        }
    },

    /**
     * Nested objects of this namespace as an array for iteration.
     * @name Namespace#nestedArray
     * @type {ReflectionObject[]}
     * @readonly
     */
    nestedArray: {
        get: function() {
            return this._nestedArray || (this._nestedArray = util.toArray(this.nested));
        }
    },

    // override
    object: {
        get: function() {
            if (this._object)
                return this._object;
            this._object = Object.create(this);
            var nested = this.nestedArray;
            for (var i = 0; i < nested.length; ++i)
                this._object[nested[i].name] = nested[i].object;
            return this._object;
        }
    },

    /**
     * Determines whether this is a plain namespace and not a type or service.
     * @name Namespace#plain
     * @type {boolean}
     * @readonly
     */
    plain: {
        get: function() {
            return !(this instanceof Type || this instanceof Service);
        }
    }
});

/**
 * Tests if the specified JSON object describes not another reflection object.
 * @param {*} json JSON object
 * @returns {boolean} `true` if the object describes not another reflection object
 */
Namespace.testJSON = function testJSON(json) {
    return Boolean(json
        && !json.fields                   // Type
        && !json.values                   // Enum
        && json.id === undefined          // Field, MapField
        && !json.oneof                    // OneOf
        && !json.methods                  // Service
        && json.requestType === undefined // Method
    );
};

/**
 * Constructs a namespace from JSON.
 * @param {string} name Namespace name
 * @param {Object} json JSON object
 * @returns {Namespace} Created namespace
 * @throws {TypeError} If arguments are invalid
 */
Namespace.fromJSON = function fromJSON(name, json) {
    return new Namespace(name, json.options).addJSON(json.nested);
};

/**
 * @override
 */
NamespacePrototype.toJSON = function toJSON() {
    var nested = {}, anyVisible = false;
    this.nestedArray.forEach(function(obj) {
        var json = obj.toJSON();
        if (json) {
            nested[obj.name] = json;
            anyVisible = true;
        }
    });
    return anyVisible && {
        options : this.options,
        nested  : nested
    } || undefined;
};

/**
 * Adds nested elements to this namespace from JSON.
 * @param {Object.<string,*>} json Nested JSON
 * @returns {Namespace} `this`
 */
NamespacePrototype.addJSON = function addJSON(json) {
    if (json) {
        var keys = Object.keys(json);
        for (var i = 0; i < keys.length; ++i) {
            var nested = json[keys[i]];
            for (var j = 0; j < nestedTypes.length; ++j)
                if (nestedTypes[j].testJSON(nested)) {
                    this.add(nestedTypes[j].fromJSON(keys[i], nested));
                    break;
                }
            throw _TypeError("json." + keys[i], "JSON for " + nestedError);
        }
    }
    return this;
};

/**
 * Gets the nested object of the specified name.
 * @param {string} name Nested object name
 * @returns {?ReflectionObject} The reflection object or `null` if it doesn't exist
 */
NamespacePrototype.get = function get(name) {
    if (this.nested === undefined) // prevents deopt
        return null;
    return this.nested[name] || null;
};

/**
 * Adds a nested object to this namespace.
 * @param {ReflectionObject} object Nested object to add
 * @returns {Namespace} `this`
 */
NamespacePrototype.add = function add(object) {
    if (!object || nestedTypes.indexOf(object.constructor) < 0)
        throw _TypeError("object", nestedError);
    if (object instanceof Field && object.extend === undefined)
        throw _TypeError("object", "an extension field when not part of a type");
    if (!this.nested)
        this.nested = {};
    else {
        var prev = this.get(object.name);
        if (prev) {
            if (prev instanceof Namespace && !(prev instanceof Type) && object instanceof Type) {
                // move existing nested objects to the message type and remove the previous namespace
                var nested = prev.nestedArray;
                for (var i = 0; i < nested.length; ++i)
                    object.add(nested[i]);
                this.remove(prev);
            } else
                throw Error("duplicate name '" + object.name + "' in " + this);
        }
    }
    this.nested[object.name] = object;
    object.onAdd(this);
    return clearCache(this);
};

/**
 * Removes a nested object from this namespace.
 * @param {ReflectionObject} object Nested object to remove
 * @returns {Namespace} `this`
 */
NamespacePrototype.remove = function remove(object) {
    if (!(object instanceof ReflectionObject))
        throw _TypeError("object", "a ReflectionObject");
    if (object.parent !== this)
        throw Error(object + " is not a member of " + this);
    delete this.nested[object.name];
    if (this.empty)
        this.nested = undefined;
    object.onRemove(this);
    return clearCache(this);
};

/**
 * Defines additial namespaces within this one if not yet existing.
 * @param {string|string[]} path Path to create
 * @param {*} [json] Nested types to create from JSON
 * @param {?boolean} [visible=null] Whether visible when exporting definitions. Defaults to inherit from parent.
 * @returns {Namespace} Pointer to the last namespace created or `this` if path is empty
 */
NamespacePrototype.define = function define(path, json, visible) {
    if (util.isString(path))
        path = path.split('.');
    else if (!Array.isArray(path)) {
        visible = json;
        json = path;
        path = undefined;
    }
    if (typeof json === 'boolean') {
        visible = json;
        json = undefined;
    }
    if (visible === undefined)
        visible = null;
    var ptr = this;
    if (path)
        while (path.length > 0) {
            var part = path.shift();
            if (ptr.nested && ptr.nested[part]) {
                ptr = ptr.nested[part];
                if (!(ptr instanceof Namespace))
                    throw Error("path conflicts with non-namespace objects");
                if (visible) // make visible when new namespaces are
                    ptr.visible = true;
            } else {
                ptr.add(ptr = new Namespace(part));
                ptr.visible = visible;
            }
        }
    if (json)
        ptr.addJSON(json);
    return ptr;
};

/**
 * Resolves this namespace's and all its nested objects' type references. Useful to validate a reflection tree.
 * @returns {Namespace} `this`
 */
NamespacePrototype.resolveAll = function resolve() {
    var nested = this.nestedArray, i = 0;
    while (i < nested.length)
        nested[i++].resolve();
    return ReflectionObject.prototype.resolve.call(this);
};

/**
 * Looks up the reflection object specified by path, relative to this namespace.
 * @param {string|string[]} path Path to look up
 * @param {boolean} [parentAlreadyChecked] Whether the parent has already been checked
 * @returns {?ReflectionObject} Looked up object or `null` if none could be found
 */
NamespacePrototype.lookup = function lookup(path, parentAlreadyChecked) {
    if (util.isString(path)) {
        if (!path.length)
            return null;
        path = path.split('.');
    } else if (!path.length)
        return null;
    // Start at root if path is absolute
    if (path[0] === "")
        return this.root.lookup(path.slice(1));
    // Test if the first part matches any nested object, and if so, traverse if path contains more
    var found = this.get(path[0]);
    if (found && (path.length === 1 || found.lookup && (found = found.lookup(path.slice(1), true))))
        return found;
    // If there hasn't been a match, try again at the parent
    if (this.parent === null || parentAlreadyChecked)
        return null;
    return this.parent.lookup(path);
};
