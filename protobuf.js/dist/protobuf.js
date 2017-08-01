/*!
 * protobuf.js v6.0.0-dev (c) 2016 Daniel Wirtz
 * Compiled Mon, 21 Nov 2016 18:21:34 UTC
 * Licensed under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/protobuf.js for details
 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) 2008, Fair Oaks Labs, Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright notice,
//    this list of conditions and the following disclaimer.
//
//  * Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
//  * Neither the name of Fair Oaks Labs, Inc. nor the names of its contributors
//    may be used to endorse or promote products derived from this software
//    without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
//
//
// Modifications to writeIEEE754 to support negative zeroes made by Brian White

// ref: https://github.com/nodejs/node/blob/87286cc7371886d9856edf424785aaa890ba05a9/lib/buffer_ieee754.js

exports.read = function readIEEE754(buffer, offset, isBE, mLen, nBytes) {
    var e, m,
        eLen = nBytes * 8 - mLen - 1,
        eMax = (1 << eLen) - 1,
        eBias = eMax >> 1,
        nBits = -7,
        i = isBE ? 0 : (nBytes - 1),
        d = isBE ? 1 : -1,
        s = buffer[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

    if (e === 0) {
        e = 1 - eBias;
    } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity);
    } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function writeIEEE754(buffer, value, offset, isBE, mLen, nBytes) {
    var e, m, c,
        eLen = nBytes * 8 - mLen - 1,
        eMax = (1 << eLen) - 1,
        eBias = eMax >> 1,
        rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
        i = isBE ? (nBytes - 1) : 0,
        d = isBE ? -1 : 1,
        s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
    } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
            e--;
            c *= 2;
        }
        if (e + eBias >= 1) {
            value += rt / c;
        } else {
            value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
            e++;
            c /= 2;
        }

        if (e + eBias >= eMax) {
            m = 0;
            e = eMax;
        } else if (e + eBias >= 1) {
            m = (value * c - 1) * Math.pow(2, mLen);
            e = e + eBias;
        } else {
            m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
            e = 0;
        }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

    buffer[offset + i - d] |= s * 128;
};

},{}],2:[function(require,module,exports){
"use strict";
module.exports = Decoder;

var Enum   = require(4),
    Reader = require(14),
    types  = require(19),
    util   = require(20);

/**
 * Constructs a new decoder for the specified message type.
 * @classdesc Wire format decoder using code generation on top of reflection.
 * @constructor
 * @param {Type} type Message type
 */
function Decoder(type) {

    /**
     * Message type.
     * @type {Type}
     */
    this.type = type;
}

/** @alias Decoder.prototype */
var DecoderPrototype = Decoder.prototype;

// This is here to mimic Type so that fallback functions work without having to bind()
Object.defineProperties(DecoderPrototype, {

    /**
     * Fields of this decoder's message type by id for lookups.
     * @name Decoder#fieldsById
     * @type {Object.<number,Field>}
     * @readonly
     */
    fieldsById: {
        get: function() {
            return this.type.fieldsById;
        }
    },

    /**
     * With this decoder's message type registered constructor, if any registered, otherwise a generic constructor.
     * @name Decoder#ctor
     * @type {Prototype}
     */
    ctor: {
        get: function() {
            return this.type.ctor;
        }
    }
});

/**
 * Decodes a message of this decoder's message type.
 * @param {Reader} reader Reader to decode from
 * @param {number} [length] Length of the message, if known beforehand
 * @returns {Prototype} Populated runtime message
 */
DecoderPrototype.decode = function decode_fallback(reader, length) { // codegen reference and fallback
    /* eslint-disable no-invalid-this, block-scoped-var, no-redeclare */
    var fields  = this.fieldsById,
        reader  = reader instanceof Reader ? reader : Reader(reader),
        limit   = length === undefined ? reader.len : reader.pos + length,
        message = new this.ctor();
    while (reader.pos < limit) {
        var tag      = reader.tag(),
            field    = fields[tag.id].resolve(),
            type     = field.resolvedType instanceof Enum ? "uint32" : field.type;
        
        // Known fields
        if (field) {

            // Map fields
            if (field.map) {
                var keyType = field.resolvedKeyType /* only valid is enum */ ? "uint32" : field.keyType,
                    length  = reader.uint32();
                var map = message[field.name] = {};
                if (length) {
                    length += reader.pos;
                    var ks = [], vs = [];
                    while (reader.pos < length) {
                        if (reader.tag().id === 1)
                            ks[ks.length] = reader[keyType]();
                        else if (types.basic[type] !== undefined)
                            vs[vs.length] = reader[type]();
                        else
                            vs[vs.length] = field.resolvedType.decode(reader, reader.uint32());
                    }
                    for (var i = 0; i < ks.length; ++i)
                        map[typeof ks[i] === 'object' ? util.longToHash(ks[i]) : ks[i]] = vs[i];
                }

            // Repeated fields
            } else if (field.repeated) {
                var values = message[field.name] || (message[field.name] = []);

                // Packed
                if (field.packed && types.packed[type] !== undefined && tag.wireType === 2) {
                    var plimit = reader.uint32() + reader.pos;
                    while (reader.pos < plimit)
                        values[values.length] = reader[type]();

                // Non-packed
                } else if (types.basic[type] !== undefined)
                    values[values.length] = reader[type]();
                  else
                    values[values.length] = field.resolvedType.decode(reader, reader.uint32());

            // Non-repeated
            } else if (types.basic[type] !== undefined)
                message[field.name] = reader[type]();
              else
                message[field.name] = field.resolvedType.decode(reader, reader.uint32());

        // Unknown fields
        } else
            reader.skipType(tag.wireType);
    }
    return message;
    /* eslint-enable no-invalid-this, block-scoped-var, no-redeclare */
};

/**
 * Generates a decoder specific to this decoder's message type.
 * @returns {function} Decoder function with an identical signature to {@link Decoder#decode}
 */
DecoderPrototype.generate = function generate() {
    /* eslint-disable no-unexpected-multiline */
    var fields = this.type.fieldsArray;    
    var gen = util.codegen("r", "l")

    ("r instanceof Reader||(r=Reader(r))")
    ("var c=l===undefined?r.len:r.pos+l,m=new this.ctor()")
    ("while(r.pos<c){")
        ("var t=r.tag()")
        ("switch(t.id){");
    
    for (var i = 0; i < fields.length; ++i) {
        var field = fields[i].resolve(),
            type  = field.resolvedType instanceof Enum ? "uint32" : field.type,
            prop  = util.safeProp(field.name);
        gen
            ("case %d:", field.id);

        if (field.map) {
            var keyType = field.resolvedKeyType /* only valid is enum */ ? "uint32" : field.keyType;
            gen
                ("var n=r.uint32(),o={}")
                ("if(n){")
                    ("n+=r.pos")
                    ("var k=[],v=[]")
                    ("while(r.pos<n){")
                        ("if(r.tag().id===1)")
                            ("k[k.length]=r.%s()", keyType);

                        if (types.basic[type] !== undefined) gen

                        ("else")
                            ("v[v.length]=r.%s()", type);

                        else gen

                        ("else")
                            ("v[v.length]=types[%d].decode(r,r.uint32())", i, i);
                    gen
                    ("}")
                    ("for(var i=0;i<k.length;++i)")
                        ("o[typeof(k[i])==='object'?util.longToHash(k[i]):k[i]]=v[i]")
                ("}")
                ("m%s=o", prop);

        } else if (field.repeated) { gen

                ("m%s||(m%s=[])", prop, prop);

            if (field.packed && types.packed[type] !== undefined) { gen

                ("if(t.wireType===2){")
                    ("var e=r.uint32()+r.pos")
                    ("while(r.pos<e)")
                        ("m%s[m%s.length]=r.%s()", prop, prop, type)
                ("}else");
            }

            if (types.basic[type] !== undefined) gen

                    ("m%s[m%s.length]=r.%s()", prop, prop, type);

            else gen

                    ("m%s[m%s.length]=types[%d].decode(r,r.uint32())", prop, prop, i, i);

        } else if (types.basic[type] !== undefined) { gen

                ("m%s=r.%s()", prop, type);

        } else { gen

                ("m%s=types[%d].decode(r,r.uint32())", prop, i, i);

        } gen
                ("break");
    } gen
            ("default:")
                ("r.skipType(t.wireType)")
                ("break")
        ("}")
    ("}")
    ("return m");
    return gen
    .eof(this.type.fullName + "$decode", {
        Reader : Reader,
        types  : fields.map(function(fld) { return fld.resolvedType; }),
        util   : util.toHash
    });
    /* eslint-enable no-unexpected-multiline */
};

},{"14":14,"19":19,"20":20,"4":4}],3:[function(require,module,exports){
"use strict";
module.exports = Encoder;

var Enum   = require(4),
    Writer = require(24),
    types  = require(19),
    util   = require(20);

/**
 * Constructs a new encoder for the specified message type.
 * @classdesc Wire format encoder using code generation on top of reflection
 * @constructor
 * @param {Type} type Message type
 */
function Encoder(type) {

    /**
     * Message type.
     * @type {Type}
     */
    this.type = type;
}

/** @alias Encoder.prototype */
var EncoderPrototype = Encoder.prototype;

// This is here to mimic Type so that fallback functions work without having to bind()
Object.defineProperties(EncoderPrototype, {

    /**
     * Fields of this encoder's message type as an array for iteration.
     * @name Encoder#fieldsArray
     * @type {Field[]}
     * @readonly
     */
    fieldsArray: {
        get: function() {
            return this.type.fieldsArray;
        }
    }
});

/**
 * Encodes a message of this encoder's message type.
 * @param {Prototype|Object} message Runtime message or plain object to encode
 * @param {Writer} [writer] Writer to encode to
 * @returns {Writer} writer
 */
EncoderPrototype.encode = function encode_fallback(message, writer) { // codegen reference and fallback
    /* eslint-disable block-scoped-var, no-redeclare */
    if (!writer)
        writer = Writer();
    var fields = this.fieldsArray, fi = 0;
    while (fi < fields.length) {
        var field    = fields[fi++].resolve(),
            type     = field.resolvedType instanceof Enum ? "uint32" : field.type,
            wireType = types.basic[type];

        // Map fields
        if (field.map) {
            var keyType = field.resolvedKeyType /* only valid is enum */ ? "uint32" : field.keyType;
            var value, keys;
            if ((value = message[field.name]) && (keys = Object.keys(value)).length) {
                writer.fork();
                for (var i = 0; i < keys.length; ++i) {
                    writer.tag(1, types.mapKey[keyType])[keyType](keys[i]);
                    if (wireType !== undefined)
                        writer.tag(2, wireType)[type](value[keys[i]]);
                    else
                        field.resolvedType.encode(value[keys[i]], writer.tag(2,2).fork()).ldelim();
                }
                writer.ldelim(field.id);
            }

        // Repeated fields
        } else if (field.repeated) {
            var values = message[field.name];
            if (values && values.length) {

                // Packed repeated
                if (field.packed && types.packed[type] !== undefined) {
                    writer.fork();
                    var i = 0;
                    while (i < values.length)
                        writer[type](values[i++]);
                    writer.ldelim(field.id);

                // Non-packed
                } else {
                    var i = 0;
                    while (i < values.length)
                        field.resolvedType.encode(values[i++], writer.tag(field.id,2).fork()).ldelim();
                }

            }

        // Non-repeated
        } else {
            var value = message[field.name];
            if (field.required || value !== undefined && field.long ? util.longNeq(value, field.defaultValue) : value !== field.defaultValue) {
                if (wireType !== undefined)
                    writer.tag(field.id, wireType)[type](value);
                else {
                    field.resolvedType.encode(value, writer.fork());
                    if (writer.len || field.required)
                        writer.ldelim(field.id);
                    else
                        writer.reset();
                }
            }
        }
    }
    return writer;
    /* eslint-enable block-scoped-var, no-redeclare */
};

/**
 * Generates an encoder specific to this encoder's message type.
 * @returns {function} Encoder function with an identical signature to {@link Encoder#encode}
 */
EncoderPrototype.generate = function generate() {
    /* eslint-disable no-unexpected-multiline */
    var fields = this.type.fieldsArray;
    var gen = util.codegen("m", "w")
    ("w||(w=Writer())");

    for (var i = 0; i < fields.length; ++i) {
        var field    = fields[i].resolve(),
            type     = field.resolvedType instanceof Enum ? "uint32" : field.type,
            wireType = types.basic[type],
            prop     = util.safeProp(field.name);
        
        // Map fields
        if (field.map) {
            var keyType     = field.resolvedKeyType /* only valid is enum */ ? "uint32" : field.keyType,
                keyWireType = types.mapKey[keyType];
            gen

    ("if(m%s){", prop)
        ("w.fork()")
        ("for(var i=0,ks=Object.keys(m%s);i<ks.length;++i){", prop)
            ("w.tag(1,%d).%s(ks[i])", keyWireType, keyType);

            if (wireType !== undefined) gen

            ("w.tag(2,%d).%s(m%s[ks[i]])", wireType, type, prop);

            else gen
            
            ("types[%d].encode(m%s[ks[i]],w.tag(2,2).fork()).ldelim()", i, prop);

            gen
        ("}")
        ("w.len&&w.ldelim(%d)||w.reset()", field.id)
    ("}");

        // Repeated fields
        } else if (field.repeated) {

            // Packed repeated
            if (field.packed && types.packed[type] !== undefined) { gen

    ("if(m%s&&m%s.length){", prop, prop)
        ("w.fork()")
        ("for(var i=0;i<m%s.length;++i)", prop)
            ("w.%s(m%s[i])", type, prop)
        ("w.ldelim(%d)", field.id)
    ("}");

            // Non-packed
            } else { gen

    ("if(m%s)", prop)
        ("for(var i=0;i<m%s.length;++i)", prop)
            ("types[%d].encode(m%s[i],w.tag(%d,2).fork()).ldelim()", i, prop, field.id);

            }

        // Non-repeated
        } else {
            if (!field.required) {

                if (field.long) gen
    ("if(m%s!==undefined&&util.longNeq(m%s,%j))", prop, prop, field.defaultValue);
                else gen
    ("if(m%s!==undefined&&m%s!==%j)", prop, prop, field.defaultValue);

            }

            if (wireType !== undefined) gen

        ("w.tag(%d,%d).%s(m%s)", field.id, wireType, type, prop);

            else if (field.required) gen
            
        ("types[%d].encode(m%s,w.tag(%d,2).fork()).ldelim()", i, prop, field.id);
        
            else gen

        ("types[%d].encode(m%s,w.fork()).len&&w.ldelim(%d)||w.reset()", i, prop, field.id);
    
        }
    }
    return gen
    ("return w")

    .eof(this.type.fullName + "$encode", {
        Writer : Writer,
        types  : fields.map(function(fld) { return fld.resolvedType; }),
        util   : util
    });
    /* eslint-enable no-unexpected-multiline */
};

},{"19":19,"20":20,"24":24,"4":4}],4:[function(require,module,exports){
"use strict";
module.exports = Enum;

var ReflectionObject = require(10);
/** @alias Enum.prototype */
var EnumPrototype = ReflectionObject.extend(Enum);

var util = require(20);

var _TypeError = util._TypeError;

/**
 * Constructs a new enum.
 * @classdesc Reflected enum.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Unique name within its namespace
 * @param {Object.<string,number>} [values] Enum values as an object, by name
 * @param {Object} [options] Declared options
 */
function Enum(name, values, options) {
    ReflectionObject.call(this, name, options);

    /**
     * Enum values by name.
     * @type {Object.<string,number>}
     */
    this.values = values || {}; // toJSON, marker

    /**
     * Cached values by id.
     * @type {?Object.<number,string>}
     * @private
     */
    this._valuesById = null;
}

Object.defineProperties(EnumPrototype, {

    /**
     * Enum values by id.
     * @name Enum#valuesById
     * @type {Object.<number,string>}
     * @readonly
     */
    valuesById: {
        get: function() {
            if (!this._valuesById) {
                this._valuesById = {};
                Object.keys(this.values).forEach(function(name) {
                    var id = this.values[name];
                    if (this._valuesById[id])
                        throw Error("duplicate id " + id + " in " + this);
                    this._valuesById[id] = name;
                }, this);
            }
            return this._valuesById;
        }
    },

    // override
    object: {
        get: function() {
            return this._object || (this._object = util.merge({}, this.values));
        }
    }
});

function clearCache(enm) {
    enm._valuesById = null;
    return enm;
}

/**
 * Tests if the specified JSON object describes an enum.
 * @param {*} json JSON object to test
 * @returns {boolean} `true` if the object describes an enum
 */
Enum.testJSON = function testJSON(json) {
    return Boolean(json && json.values);
};

/**
 * Creates an enum from JSON.
 * @param {string} name Enum name
 * @param {Object.<string,*>} json JSON object
 * @returns {Enum} Created enum
 * @throws {TypeError} If arguments are invalid
 */
Enum.fromJSON = function fromJSON(name, json) {
    return new Enum(name, json.values, json.options);
};

/**
 * @override
 */
EnumPrototype.toJSON = function toJSON() {
    return this.visible && {
        options : this.options,
        values  : this.values
    } || undefined;
};

/**
 * Adds a value to this enum.
 * @param {string} name Value name
 * @param {number} id Value id
 * @returns {Enum} `this`
 */
EnumPrototype.add = function(name, id) {
    if (!util.isString(name))
        throw _TypeError("name");
    if (!util.isInteger(id) || id < 0)
        throw _TypeError("id", "a non-negative integer");
    this.values[name] = id;
    return clearCache(this);
};

/**
 * Removes a value from this enum
 * @param {string} name Value name
 * @returns {Enum} `this`
 */
EnumPrototype.remove = function(name) {
    if (!util.isString(name))
        throw _TypeError("name");
    delete this.values[name];
    return clearCache(this);
};

},{"10":10,"20":20}],5:[function(require,module,exports){
"use strict";
module.exports = Field;

var ReflectionObject = require(10);
/** @alias Field.prototype */
var FieldPrototype = ReflectionObject.extend(Field);

var Type      = require(18),
    Enum      = require(4),
    MapField  = require(7),
    types     = require(19),
    util      = require(20);

var _TypeError = util._TypeError;

/**
 * Constructs a new message field. Note that {@link MapField|map fields} have their own class.
 * @classdesc Reflected message field.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Unique name within its namespace
 * @param {number} id Unique id within its namespace
 * @param {string} type Value type
 * @param {string} [rule=optional] Field rule
 * @param {string} [extend] Extended type if different from parent
 * @param {Object} [options] Declared options
 */
function Field(name, id, type, rule, extend, options) {
    if (util.isObject(rule)) {
        options = rule;
        rule = extend = undefined;
    } else if (util.isObject(extend)) {
        options = extend;
        extend = undefined;
    }
    ReflectionObject.call(this, name, options);
    if (!util.isInteger(id) || id < 0)
        throw _TypeError("id", "a non-negative integer");
    if (!util.isString(type))
        throw _TypeError("type");
    if (extend !== undefined && !util.isString(extend))
        throw _TypeError("extend");
    if (rule !== undefined && !/^required|optional|repeated$/.test(rule = rule.toString().toLowerCase()))
        throw _TypeError("rule", "a valid rule string");

    /**
     * Field rule, if any.
     * @type {string|undefined}
     */
    this.rule = rule && rule !== 'optional' ? rule : undefined; // toJSON

    /**
     * Field type.
     * @type {string}
     */
    this.type = type; // toJSON

    /**
     * Unique field id.
     * @type {number}
     */
    this.id = id; // toJSON, marker

    /**
     * Extended type if different from parent.
     * @type {string|undefined}
     */
    this.extend = extend || undefined; // toJSON

    /**
     * Whether this field is required.
     * @type {boolean}
     */
    this.required = rule === "required";

    /**
     * Whether this field is optional.
     * @type {boolean}
     */
    this.optional = !this.required;

    /**
     * Whether this field is repeated.
     * @type {boolean}
     */
    this.repeated = rule === "repeated";

    /**
     * Whether this field is a map or not.
     * @type {boolean}
     */
    this.map = false;

    /**
     * Message this field belongs to.
     * @type {?Type}
     */
    this.message = null;

    /**
     * OneOf this field belongs to, if any,
     * @type {?OneOf}
     */
    this.partOf = null;

    /**
     * The field's default value. Only relevant when working with proto2.
     * @type {*}
     */
    this.defaultValue = null;

    /**
     * Whether this field's value should be treated as a long.
     * @type {boolean}
     */
    this.long = util.Long ? types.long[type] !== undefined : false;

    /**
     * Resolved type if not a basic type.
     * @type {?(Type|Enum)}
     */
    this.resolvedType = null;

    /**
     * Sister-field within the extended type if a declaring extension field.
     * @type {?Field}
     */
    this.extensionField = null;

    /**
     * Sister-field within the declaring namespace if an extended field.
     * @type {?Field}
     */
    this.declaringField = null;

    /**
     * Internally remembers whether this field is packed.
     * @type {?boolean}
     * @private
     */
    this._packed = null;
}

Object.defineProperties(FieldPrototype, {

    /**
     * Determines whether this field is packed. Only relevant when repeated and working with proto2.
     * @name Field#packed
     * @type {boolean}
     * @readonly
     */
    packed: {
        get: function() {
            if (this._packed === null)
                this._packed = this.getOption("packed") !== false;
            return this._packed;
        }
    }

});

/**
 * @override
 */
FieldPrototype.setOption = function setOption(name, value, ifNotSet) {
    if (name === "packed")
        this._packed = null;
    return ReflectionObject.prototype.setOption.call(this, name, value, ifNotSet);
};

/**
 * Tests if the specified JSON object describes a field.
 * @param {*} json Any JSON object to test
 * @returns {boolean} `true` if the object describes a field
 */
Field.testJSON = function testJSON(json) {
    return Boolean(json && json.id !== undefined);
};

/**
 * Constructs a field from JSON.
 * @param {string} name Field name
 * @param {Object} json JSON object
 * @returns {Field} Created field
 * @throws {TypeError} If arguments are invalid
 */
Field.fromJSON = function fromJSON(name, json) {
    if (json.keyType !== undefined)
        return MapField.fromJSON(name, json);
    return new Field(name, json.id, json.type, json.role, json.extend, json.options);
};

/**
 * @override
 */
FieldPrototype.toJSON = function toJSON() {
    return this.visible && {
        rule    : this.rule !== "optional" && this.rule || undefined,
        type    : this.type,
        id      : this.id,
        extend  : this.extend,
        options : this.options
    } || undefined;
};

/**
 * Resolves this field's type references.
 * @returns {Field} `this`
 * @throws {Error} If any reference cannot be resolved
 */
FieldPrototype.resolve = function resolve() {
    if (this.resolved)
        return this;

    var typeDefault = types.defaults[this.type];

    // if not a basic type, resolve it
    if (typeDefault === undefined) {
        var resolved = this.parent.lookup(this.type);
        if (resolved instanceof Type) {
            this.resolvedType = resolved;
            typeDefault = null;
        } else if (resolved instanceof Enum) {
            this.resolvedType = resolved;
            typeDefault = 0;
        } else
            throw Error("unresolvable field type: " + this.type);
    }

    // when everything is resolved determine the default value
    var optionDefault;
    if (this.map)
        this.defaultValue = {};
    else if (this.repeated)
        this.defaultValue = [];
    else if (this.options && (optionDefault = this.options.default) !== undefined)
        this.defaultValue = optionDefault;
    else
        this.defaultValue = typeDefault;

    if (this.long)
        this.defaultValue = util.Long.fromValue(this.defaultValue);
    
    return ReflectionObject.prototype.resolve.call(this);
};

/**
 * Converts a field value to JSON using the specified options. Note that this method does not account for repeated fields and must be called once for each repeated element instead.
 * @param {*} value Field value
 * @param {Object.<string,*>} [options] Conversion options
 * @returns {*} Converted value
 * @see {@link Prototype#asJSON}
 */
FieldPrototype.jsonConvert = function(value, options) {
    if (options) {
        if (this.resolvedType instanceof Enum && options.enum === String)
            return this.resolvedType.valuesById[value];
        else if (this.long && options.long)
            return options.long === Number
                ? typeof value === 'number'
                ? value
                : util.Long.fromValue(value).toNumber()
                : util.Long.fromValue(value, this.type.charAt(0) === 'u').toString();
    }
    return value;
};

},{"10":10,"18":18,"19":19,"20":20,"4":4,"7":7}],6:[function(require,module,exports){
"use strict";
module.exports = inherits;

var Prototype = require(13),
    Type      = require(18),
    util      = require(20);

var _TypeError = util._TypeError;

/**
 * Options passed to {@link inherits}, modifying its behavior.
 * @typedef InheritanceOptions
 * @type {Object}
 * @property {boolean} [noStatics=false] Skips adding the default static methods on top of the constructor
 * @property {boolean} [noRegister=false] Skips registering the constructor with the reflected type
 */

/**
 * Inherits a custom class from the message prototype of the specified message type.
 * @param {Function} clazz Inheriting class
 * @param {Type} type Inherited message type
 * @param {InheritanceOptions} [options] Inheritance options
 * @returns {Prototype} Created prototype
 */
function inherits(clazz, type, options) {
    if (typeof clazz !== 'function')
        throw _TypeError("clazz", "a function");
    if (!(type instanceof Type))
        throw _TypeError("type", "a Type");
    if (!options)
        options = {};

    /**
     * This is not an actual type but stands as a reference for any constructor of a custom message class that you pass to the library.
     * @name Class
     * @extends Prototype
     * @constructor
     * @param {Object.<string,*>} [properties] Properties to set on the message
     * @see {@link inherits}
     */

    var classProperties = {
        
        /**
         * Reference to the reflected type.
         * @name Class.$type
         * @type {Type}
         * @readonly
         */
        $type: {
            value: type
        }
    };

    if (!options.noStatics)
        util.merge(classProperties, {

            /**
             * Encodes a message of this type to a buffer.
             * @name Class.encode
             * @function
             * @param {Prototype|Object} message Message to encode
             * @param {Writer} [writer] Writer to use
             * @returns {number[]} Encoded message
             */
            encode: {
                value: function encode(message, writer) {
                    return this.$type.encode(message, writer).finish();
                }
            },

            /**
             * Encodes a message of this type preceeded by its length as a varint to a buffer.
             * @name Class.encodeDelimited
             * @function
             * @param {Prototype|Object} message Message to encode
             * @param {Writer} [writer] Writer to use
             * @returns {number[]} Encoded message
             */
            encodeDelimited: {
                value: function encodeDelimited(message, writer) {
                    return this.$type.encodeDelimited(message, writer).finish();
                }
            },

            /**
             * Decodes a message of this type from a buffer.
             * @name Class.decode
             * @function
             * @param {number[]} buffer Buffer to decode
             * @returns {Prototype} Decoded message
             */
            decode: {
                value: function decode(buffer) {
                    return this.$type.decode(buffer);
                }
            },

            /**
             * Decodes a message of this type preceeded by its length as a varint from a buffer.
             * @name Class.decodeDelimited
             * @function
             * @param {number[]} buffer Buffer to decode
             * @returns {Prototype} Decoded message
             */
            decodeDelimited: {
                value: function decodeDelimited(buffer) {
                    return this.$type.decodeDelimited(buffer);
                }
            },

            /**
             * Verifies a message of this type.
             * @name Class.verify
             * @function
             * @param {Prototype|Object} message Message or plain object to verify
             * @returns {?string} `null` if valid, otherwise the reason why it is not
             */
            verify: {
                value: function verify(message) {
                    return this.$type.verify(message);
                }
            }

        }, true);

    Object.defineProperties(clazz, classProperties);
    var prototype = inherits.defineProperties(new Prototype(), type);
    clazz.prototype = prototype;
    prototype.constructor = clazz;

    if (!options.noRegister)
        type.ctor = clazz;

    return prototype;
}

/**
 * Defines the reflected type's default values and virtual oneof properties on the specified prototype.
 * @memberof inherits
 * @param {Prototype} prototype Prototype to define properties upon
 * @param {Type} type Reflected message type
 * @returns {Prototype} The specified prototype
 */
inherits.defineProperties = function defineProperties(prototype, type) {

    var prototypeProperties = {

        /**
         * Reference to the reflected type.
         * @name Prototype#$type
         * @type {Type}
         * @readonly
         */
        $type: {
            value: type
        }
    };

    // Initialize default values
    type.fieldsArray.forEach(function(field) {
        field.resolve();
        if (!util.isObject(field.defaultValue))
            // objects are mutable (i.e. would modify the array on the prototype, not the instance)
            prototype[field.name] = field.defaultValue;
    });

    // Define each oneof with a non-enumerable getter and setter for the present field
    type.oneofsArray.forEach(function(oneof) {
        prototypeProperties[oneof.resolve().name] = {
            get: function() {
                var keys = oneof.oneof;
                for (var i = 0; i < keys.length; ++i) {
                    var field = oneof.parent.fields[keys[i]];
                    if (this[keys[i]] != field.defaultValue) // eslint-disable-line eqeqeq
                        return keys[i];
                }
                return undefined;
            },
            set: function(value) {
                var keys = oneof.oneof;
                for (var i = 0; i < keys.length; ++i) {
                    if (keys[i] !== value)
                        delete this[keys[i]];
                }
            }
        };
    });

    Object.defineProperties(prototype, prototypeProperties);
    return prototype;
};

},{"13":13,"18":18,"20":20}],7:[function(require,module,exports){
"use strict";
module.exports = MapField;

var Field = require(5);
/** @alias Field.prototype */
var FieldPrototype = Field.prototype;
/** @alias MapField.prototype */
var MapFieldPrototype = Field.extend(MapField);

var Enum    = require(4),
    types   = require(19),
    util    = require(20);

/**
 * Constructs a new map field.
 * @classdesc Reflected map field.
 * @extends Field
 * @constructor
 * @param {string} name Unique name within its namespace
 * @param {number} id Unique id within its namespace
 * @param {string} keyType Key type
 * @param {string} type Value type
 * @param {Object} [options] Declared options
 */
function MapField(name, id, keyType, type, options) {
    Field.call(this, name, id, type, options);
    if (!util.isString(keyType))
        throw util._TypeError("keyType");
    
    /**
     * Key type.
     * @type {string}
     */
    this.keyType = keyType; // toJSON, marker

    /**
     * Resolved key type if not a basic type.
     * @type {?ReflectionObject}
     */
    this.resolvedKeyType = null;

    // Overrides Field#map
    this.map = true;
}

/**
 * Tests if the specified JSON object describes a map field.
 * @param {Object} json JSON object to test
 * @returns {boolean} `true` if the object describes a field
 */
MapField.testJSON = function testJSON(json) {
    return Field.testJSON(json) && json.keyType !== undefined;
};

/**
 * Constructs a map field from JSON.
 * @param {string} name Field name
 * @param {Object} json JSON object
 * @returns {MapField} Created map field
 * @throws {TypeError} If arguments are invalid
 */
MapField.fromJSON = function fromJSON(name, json) {
    return new MapField(name, json.id, json.keyType, json.type, json.options);
};

/**
 * @override
 */
MapFieldPrototype.toJSON = function toJSON() {
    return this.visible && {
        keyType : this.keyType,
        type    : this.type,
        id      : this.id,
        extend  : this.extend,
        options : this.options
    } || undefined;
};

/**
 * @override
 */
MapFieldPrototype.resolve = function resolve() {
    if (this.resolved)
        return this;
    
    // Besides a value type, map fields have a key type to resolve
    var keyWireType = types.mapKey[this.keyType];
    if (keyWireType === undefined) {
        var resolved = this.parent.lookup(this.keyType);
        if (!(resolved instanceof Enum))
            throw Error("unresolvable map key type: " + this.keyType);
        this.resolvedKeyType = resolved;
    }

    return FieldPrototype.resolve.call(this);
};

},{"19":19,"20":20,"4":4,"5":5}],8:[function(require,module,exports){
"use strict";
module.exports = Method;

var ReflectionObject = require(10);
/** @alias Method.prototype */
var MethodPrototype = ReflectionObject.extend(Method);

var Type = require(18),
    util = require(20);

var _TypeError = util._TypeError;

/**
 * Constructs a new service method.
 * @classdesc Reflected service method.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Method name
 * @param {string|undefined} type Method type, usually `"rpc"`
 * @param {string} requestType Request message type
 * @param {string} responseType Response message type
 * @param {boolean} [requestStream] Whether the request is streamed
 * @param {boolean} [responseStream] Whether the response is streamed
 * @param {Object} [options] Declared options
 */
function Method(name, type, requestType, responseType, requestStream, responseStream, options) {
    if (util.isObject(requestStream)) {
        options = requestStream;
        requestStream = responseStream = undefined;
    } else if (util.isObject(responseStream)) {
        options = responseStream;
        responseStream = undefined;
    }
    if (!util.isString(type))
        throw _TypeError("type");
    if (!util.isString(requestType))
        throw _TypeError("requestType");
    if (!util.isString(responseType))
        throw _TypeError("responseType");
    
    ReflectionObject.call(this, name, options);

    /**
     * Method type.
     * @type {string}
     */
    this.type = type || "rpc"; // toJSON

    /**
     * Request type.
     * @type {string}
     */
    this.requestType = requestType; // toJSON, marker

    /**
     * Whether requests are streamed or not.
     * @type {boolean|undefined}
     */
    this.requestStream = requestStream ? true : undefined; // toJSON

    /**
     * Response type.
     * @type {string}
     */
    this.responseType = responseType; // toJSON

    /**
     * Whether responses are streamed or not.
     * @type {boolean|undefined}
     */
    this.responseStream = responseStream ? true : undefined; // toJSON

    /**
     * Resolved request type.
     * @type {?Type}
     */
    this.resolvedRequestType = null;

    /**
     * Resolved response type.
     * @type {?Type}
     */
    this.resolvedResponseType = null;
}

Object.defineProperties(MethodPrototype, {

    // override
    object: {
        get: function() {
            return this._object || (this._object = MethodPrototype.call.bind(this));
        }
    }
});

/**
 * Tests if the specified JSON object describes a service method.
 * @param {Object} json JSON object
 * @returns {boolean} `true` if the object describes a map field
 */
Method.testJSON = function testJSON(json) {
    return Boolean(json && json.requestType !== undefined);
};

/**
 * Constructs a service method from JSON.
 * @param {string} name Method name
 * @param {Object} json JSON object
 * @returns {Method} Created method
 * @throws {TypeError} If arguments are invalid
 */
Method.fromJSON = function fromJSON(name, json) {
    return new Method(name, json.type, json.requestType, json.responseType, json.requestStream, json.responseStream, json.options);
};

/**
 * @override
 */
MethodPrototype.toJSON = function toJSON() {
    return this.visible && {
        type           : this.type !== "rpc" && this.type || undefined,
        requestType    : this.requestType,
        requestStream  : this.requestStream,
        responseType   : this.responseType,
        responseStream : this.responseStream,
        options        : this.options
    } || undefined;
};

/**
 * @override
 */
MethodPrototype.resolve = function resolve() {
    if (this.resolved)
        return this;
    var resolved = this.parent.lookup(this.requestType);
    if (!(resolved && resolved instanceof Type))
        throw Error("unresolvable request type: " + this.requestType);
    this.resolvedRequestType = resolved;
    resolved = this.parent.lookup(this.responseType);
    if (!(resolved && resolved instanceof Type))
        throw Error("unresolvable response type: " + this.requestType);
    return ReflectionObject.prototype.resolve.call(this);
};

/**
 * Calls this method.
 * @param {Prototype|Object} message Request message
 * @param {function(number[], function(?Error, (number[])=))} performRequest A function performing the request on binary level, taking a buffer and a node-style callback for the response buffer as its parameters.
 * @param {function(Error, Prototype=)} [callback] Node-style callback function
 * @returns {Promise<Prototype>|undefined} A promise if `callback` has been omitted
 */
MethodPrototype.call = function call(message, performRequest, callback) {
    if (!callback)
        return util.asPromise(call, this, message, performRequest);
    var requestBuffer;
    try {
        requestBuffer = this.resolve().resolvedRequestType.encode(message);
    } catch (e1) {
        setTimeout(function() {
            callback(e1);
        });
        return undefined;
    }
    var self = this;
    performRequest(requestBuffer, function(err, responseBuffer) {
        if (!err) {
            try {
                callback(null, self.resolvedResponseType.decode(responseBuffer));
                return;
            } catch (e2) {
                err = e2;
            }
        }
        callback(err);
    });
    return undefined;
};

},{"10":10,"18":18,"20":20}],9:[function(require,module,exports){
"use strict";
module.exports = Namespace;

var ReflectionObject = require(10);
/** @alias Namespace.prototype */
var NamespacePrototype = ReflectionObject.extend(Namespace);

var Enum    = require(4),
    Type    = require(18),
    Field   = require(5),
    Service = require(16),
    util    = require(20);

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

},{"10":10,"16":16,"18":18,"20":20,"4":4,"5":5}],10:[function(require,module,exports){
"use strict";
module.exports = ReflectionObject;

ReflectionObject.extend = extend;

var Root = require(15),
    util = require(20);

var _TypeError = util._TypeError;

/**
 * Constructs a new reflection object.
 * @classdesc Base class of all reflection objects.
 * @constructor
 * @param {string} name Object name
 * @param {Object} [options] Declared options
 * @abstract
 */
function ReflectionObject(name, options) {
    if (!util.isString(name))
        throw _TypeError("name");
    if (options && !util.isObject(options))
        throw _TypeError("options", "an object");

    /**
     * Options.
     * @type {Object.<string,*>|undefined}
     */
    this.options = options; // toJSON

    /**
     * Unique name within its namespace.
     * @type {string}
     */
    this.name = name;

    /**
     * Parent namespace.
     * @type {?Namespace}
     */
    this.parent = null;

    /**
     * Whether already resolved or not.
     * @type {boolean}
     */
    this.resolved = false;

    /**
     * Internally stores whether this object is visible.
     * @type {?boolean}
     * @private
     */
    this._visible = null;

    /**
     * Cached object representation.
     * @type {Object|undefined}
     * @private
     */
    this._object = undefined;
}

/** @alias ReflectionObject.prototype */
var ReflectionObjectPrototype = ReflectionObject.prototype;

Object.defineProperties(ReflectionObjectPrototype, {

    /**
     * Reference to the root namespace.
     * @name ReflectionObject#root
     * @type {Root}
     * @readonly
     */
    root: {
        get: function() {
            var ptr = this;
            while (ptr.parent !== null)
                ptr = ptr.parent;
            return ptr;
        }
    },

    /**
     * Full name including leading dot.
     * @name ReflectionObject#fullName
     * @type {string}
     * @readonly
     */
    fullName: {
        get: function() {
            var path = [ this.name ],
                ptr = this.parent;
            while (ptr) {
                path.unshift(ptr.name);
                ptr = ptr.parent;
            }
            return path.join('.');
        }
    },

    /**
     * Whether this object is visible when exporting definitions. Possible values are `true` to be visible, `false` to be not and `null` (setter only) to inherit from parent.
     * @name ReflectionObject#visible
     * @type {?boolean}
     */
    visible: {
        get: function() {
            var ptr = this;
            do {
                if (ptr._visible !== null)
                    return ptr._visible;
            } while ((ptr = ptr.parent) !== null);
            return true; // visible by default
        },
        set: function(value) {
            if (value !== null && typeof value !== 'boolean')
                throw _TypeError("value", "a boolean or null");
            this._visible = value;
        }
    },

    /**
     * Gets this object as a plain JavaScript object composed of messages, enums etc.
     * @name ReflectionObject#object
     * @type {Object|undefined}
     * @readonly
     */
    object: {
        get: function() {
            return this._object;
        }
    }

});

/**
 * Lets the specified constructor extend this class.
 * @memberof ReflectionObject
 * @param {Function} constructor Extending constructor
 * @returns {Object} Prototype
 * @this ReflectionObject
 */
function extend(constructor) {
    var proto = constructor.prototype = Object.create(this.prototype);
    proto.constructor = constructor;
    constructor.extend = extend;
    return proto;
}

/**
 * Converts this reflection object to its JSON representation.
 * @returns {Object|undefined} JSON object or `undefined` if not visible
 * @abstract
 */
ReflectionObjectPrototype.toJSON = function toJSON() {
    throw Error("not implemented");
};

/**
 * Called when this object is added to a parent.
 * @param {ReflectionObject} parent Parent added to
 * @returns {undefined}
 */
ReflectionObjectPrototype.onAdd = function onAdd(parent) {
    if (this.parent && this.parent !== parent)
        this.parent.remove(this);
    this.parent = parent;
    parent._object = undefined;
    this.resolved = false;
    var root = parent.root;
    if (root instanceof Root)
        root._handleAdd(this);
};

/**
 * Called when this object is removed from a parent.
 * @param {ReflectionObject} parent Parent removed from
 * @returns {undefined}
 */
ReflectionObjectPrototype.onRemove = function onRemove(parent) {
    var root = parent.root;
    if (root instanceof Root)
        root._handleRemove(this);
    this.parent = null;
    parent._object = undefined;
    this.resolved = false;
};

/**
 * Resolves this objects type references.
 * @returns {ReflectionObject} `this`
 */
ReflectionObjectPrototype.resolve = function resolve() {
    if (this.resolved)
        return this;
    var root = this.root;
    if (root instanceof Root)
        this.resolved = true; // only if part of a root
    return this;
};

/**
 * Changes this object's visibility when exporting definitions.
 * @param {?boolean} visible `true` for public, `false` for private, `null` to inherit from parent
 * @returns {ReflectionObject} `this`
 * @throws {TypeError} If arguments are invalid
 */
ReflectionObjectPrototype.visibility = function visibility(visible) {
    this.visible = visible;
    return this;
};

/**
 * Gets an option value.
 * @param {string} name Option name
 * @returns {*} Option value or `undefined` if not set
 */
ReflectionObjectPrototype.getOption = function getOption(name) {
    if (this.options)
        return this.options[name];
    return undefined;
};

/**
 * Sets an option.
 * @param {string} name Option name
 * @param {*} value Option value
 * @param {boolean} [ifNotSet] Sets the option only if it isn't currently set
 * @returns {ReflectionObject} `this`
 */
ReflectionObjectPrototype.setOption = function setOption(name, value, ifNotSet) {
    if (!ifNotSet || !this.options || this.options[name] === undefined)
        (this.options || (this.options = {}))[name] = value;
    return this;
};

/**
 * Sets multiple options.
 * @param {Object.<string,*>} options Options to set
 * @returns {ReflectionObject} `this`
 */
ReflectionObjectPrototype.setOptions = function setOptions(options) {
    if (options)
        Object.keys(options).forEach(function(name) {
            this.setOption(name, options[name]);
        }, this);
    return this;
};

/**
 * Converts this instance to its string representation.
 * @returns {string} Constructor name, space, full name
 */
ReflectionObjectPrototype.toString = function toString() {
    return this.constructor.name + " " + this.fullName;
};

},{"15":15,"20":20}],11:[function(require,module,exports){
"use strict";
module.exports = OneOf;

var ReflectionObject = require(10);
/** @alias OneOf.prototype */
var OneOfPrototype = ReflectionObject.extend(OneOf);

var Field = require(5),
    util  = require(20);

var _TypeError = util._TypeError;

/**
 * Constructs a new oneof.
 * @classdesc Reflected oneof.
 * @extends ReflectionObject
 * @constructor
 * @param {string} name Oneof name
 * @param {string[]} [fieldNames] Field names
 * @param {Object} [options] Declared options
 */
function OneOf(name, fieldNames, options) {
    if (!Array.isArray(fieldNames)) {
        options = fieldNames;
        fieldNames = undefined;
    }
    ReflectionObject.call(this, name, options);
    if (fieldNames && !Array.isArray(fieldNames))
        throw _TypeError("fieldNames", "an Array");

    /**
     * Field names that belong to this oneof.
     * @type {Array.<string>}
     */
    this.oneof = fieldNames || []; // toJSON, marker

    /**
     * Fields that belong to this oneof and are possibly not yet added to its parent.
     * @type {Array.<Field>}
     * @private
     */
    this._fields = [];
}

/**
 * Tests if the specified JSON object describes a oneof.
 * @param {*} json JSON object
 * @returns {boolean} `true` if the object describes a oneof
 */
OneOf.testJSON = function testJSON(json) {
    return Boolean(json.oneof);
};

/**
 * Constructs a oneof from JSON.
 * @param {string} name Oneof name
 * @param {Object} json JSON object
 * @returns {MapField} Created oneof
 * @throws {TypeError} If arguments are invalid
 */
OneOf.fromJSON = function fromJSON(name, json) {
    return new OneOf(name, json.oneof, json.options);
};

/**
 * @override
 */
OneOfPrototype.toJSON = function toJSON() {
    return this.visible && {
        oneof   : this.oneof,
        options : this.options
    } || undefined;
};

/**
 * Adds the fields of the specified oneof to the parent if not already done so.
 * @param {OneOf} oneof The oneof
 * @returns {undefined}
 * @inner
 * @ignore
 */
function addFieldsToParent(oneof) {
    if (oneof.parent)
        oneof._fields.forEach(function(field) {
            if (!field.parent)
                oneof.parent.add(field);
        });
}

/**
 * Adds a field to this oneof.
 * @param {Field} field Field to add
 * @returns {OneOf} `this`
 */
OneOfPrototype.add = function add(field) {
    if (!(field instanceof Field))
        throw _TypeError("field", "a Field");
    if (field.parent)
        field.parent.remove(field);
    this.oneof.push(field.name);
    this._fields.push(field);
    field.partOf = this; // field.parent remains null
    addFieldsToParent(this);
    return this;
};

/**
 * Removes a field from this oneof.
 * @param {Field} field Field to remove
 * @returns {OneOf} `this`
 */
OneOfPrototype.remove = function remove(field) {
    if (!(field instanceof Field))
        throw _TypeError("field", "a Field");
    var index = this._fields.indexOf(field);
    if (index < 0)
        throw Error(field + " is not a member of " + this);
    this._fields.splice(index, 1);
    index = this.oneof.indexOf(field.name);
    if (index > -1)
        this.oneof.splice(index, 1);
    if (field.parent)
        field.parent.remove(field);
    field.partOf = null;
    return this;
};

/**
 * @override
 */
OneOfPrototype.onAdd = function onAdd(parent) {
    ReflectionObject.prototype.onAdd.call(this, parent);
    addFieldsToParent(this);
};

/**
 * @override
 */
OneOfPrototype.onRemove = function onRemove(parent) {
    this._fields.forEach(function(field) {
        if (field.parent)
            field.parent.remove(field);
    });
    ReflectionObject.prototype.onRemove.call(this, parent);
};

},{"10":10,"20":20,"5":5}],12:[function(require,module,exports){
"use strict";
module.exports = parse;

var tokenize = require(17),
    Root     = require(15),
    Type     = require(18),
    Field    = require(5),
    MapField = require(7),
    OneOf    = require(11),
    Enum     = require(4),
    Service  = require(16),
    Method   = require(8),
    types    = require(19);

var nameRe      = /^[a-zA-Z_][a-zA-Z_0-9]*$/,
    typeRefRe   = /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)+$/,
    fqTypeRefRe = /^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/;

function lower(token) {
    return token === null ? null : token.toLowerCase();
}

function camelCase(name) {
    return name.substring(0,1)
         + name.substring(1)
               .replace(/_([a-z])(?=[a-z]|$)/g, function($0, $1) { return $1.toUpperCase(); });
}

var s_required = "required",
    s_repeated = "repeated",
    s_optional = "optional",
    s_option   = "option",
    s_name     = "name",
    s_type     = "type";
var s_open     = "{",
    s_close    = "}",
    s_bopen    = '(',
    s_bclose   = ')',
    s_semi     = ";",
    s_dq       = '"',
    s_sq       = "'";

/**
 * Result object returned from {@link parse}.
 * @typedef ParserResult
 * @type {Object}
 * @property {string|undefined} package Package name, if declared
 * @property {string[]|undefined} imports Imports, if any
 * @property {string[]|undefined} publicImports Public imports, if any
 * @property {string[]|undefined} weakImports Weak imports, if any
 * @property {string|undefined} syntax Syntax, if specified (either `"proto2"` or `"proto3"`)
 * @property {Root} root Populated root instance
 */

/**
 * Parses the given .proto source and returns an object with the parsed contents.
 * @param {string} source Source contents
 * @param {Root} [root] Root to populate
 * @param {boolean} [visible=true] Whether types from this file are visible when exporting definitions
 * @returns {ParserResult} Parser result
 */
function parse(source, root, visible) {
    /* eslint-disable default-case, callback-return */
    if (typeof root === 'boolean') {
        visible = root;
        root = undefined;
    }

    var tn = tokenize(source),
        next = tn.next,
        push = tn.push,
        peek = tn.peek,
        skip = tn.skip;

    var head = true,
        pkg,
        imports,
        publicImports,
        weakImports,
        syntax,
        isProto3 = false;

    if (!root)
        root = new Root();

    var ptr = root;

    function illegal(token, name) {
        return Error("illegal " + (name || "token") + " '" + token + "' (line " + tn.line() + s_bclose);
    }

    function readString() {
        var values = [],
            token;
        do {
            if ((token = next()) !== s_dq && token !== s_sq)
                throw illegal(token);
            values.push(next());
            skip(token);
            token = peek();
        } while (token === s_dq || token === s_sq);
        return values.join('');
    }

    function readValue(acceptTypeRef) {
        var token = next();
        switch (lower(token)) {
            case s_sq:
            case s_dq:
                push(token);
                return readString();
            case "true":
                return true;
            case "false":
                return false;
        }
        try {
            return parseNumber(token);
        } catch (e) {
            if (acceptTypeRef && typeRefRe.test(token))
                return token;
            throw illegal(token, "value");
        }
    }

    function readRange() {
        var start = parseId(next());
        var end = start;
        if (skip("to", true))
            end = parseId(next());
        skip(s_semi);
        return [ start, end ];
    }

    function parseNumber(token) {
        var sign = 1;
        if (token.charAt(0) === '-') {
            sign = -1;
            token = token.substring(1);
        }
        var tokenLower = lower(token);
        switch (tokenLower) {
            case "inf": return sign * Infinity;
            case "nan": return NaN;
            case "0": return 0;
        }
        if (/^[1-9][0-9]*$/.test(token))
            return sign * parseInt(token, 10);
        if (/^0[x][0-9a-f]+$/.test(tokenLower))
            return sign * parseInt(token, 16);
        if (/^0[0-7]+$/.test(token))
            return sign * parseInt(token, 8);
        if (/^[0-9]*(?:\.[0-9]*)?(?:[e][+-]?[0-9]+)?$/.test(tokenLower))
            return sign * parseFloat(token);
        throw illegal(token, 'number');
    }

    function parseId(token) {
        var tokenLower = lower(token);
        switch (tokenLower) {
            case "min": return 1;
            case "max": return 0x1FFFFFFF;
            case "0": return 0;
        }
        if (/^[1-9][0-9]*$/.test(token))
            return parseInt(token, 10);
        if (/^0[x][0-9a-f]+$/.test(tokenLower))
            return parseInt(token, 16);
        if (/^0[0-7]+$/.test(token))
            return parseInt(token, 8);
        throw illegal(token, "id");
    }

    function parsePackage() {
        if (pkg !== undefined)
            throw illegal("package");
        pkg = next();
        if (!typeRefRe.test(pkg))
            throw illegal(pkg, s_name);
        ptr = ptr.define(pkg, visible);
        skip(s_semi);
    }

    function parseImport() {
        var token = peek();
        var whichImports;
        switch (token) {
            case "public":
                whichImports = publicImports || (publicImports = []);
                next();
                break;
            case "weak":
                whichImports = weakImports || (weakImports = []);
                next();
                break;
        }
        if (!whichImports)
            whichImports = imports || (imports = []);
        token = readString();
        skip(s_semi);
        whichImports.push(token);
    }

    function parseSyntax() {
        skip("=");
        syntax = lower(readString());
        var p3;
        if ([ "proto2", p3 = "proto3" ].indexOf(syntax) < 0)
            throw illegal(syntax, "syntax");
        isProto3 = syntax === p3;
        skip(s_semi);
    }

    function parseCommon(parent, token) {
        switch (token) {

            case s_option:
                parseOption(parent, token);
                skip(s_semi);
                return true;

            case "message":
                parseType(parent, token);
                return true;

            case "enum":
                parseEnum(parent, token);
                return true;

            case "service":
                parseService(parent, token);
                return true;

            case "extend":
                parseExtension(parent, token);
                return true;
        }
        return false;
    }

    function parseType(parent, token) {
        var name = next();
        if (!nameRe.test(name))
            throw illegal(name, "type name");
        var type = new Type(name);
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                var tokenLower = lower(token);
                if (parseCommon(type, token))
                    continue;
                switch (tokenLower) {
                    case "map":
                        parseMapField(type, tokenLower);
                        break;
                    case s_required:
                    case s_optional:
                    case s_repeated:
                        parseField(type, tokenLower);
                        break;
                    case "oneof":
                        parseOneOf(type, tokenLower);
                        break;
                    case "extensions":
                        (type.extensions || (type.extensions = [])).push(readRange(type, tokenLower));
                        break;
                    case "reserved":
                        (type.reserved || (type.reserved = [])).push(readRange(type, tokenLower));
                        break;
                    default:
                        if (!isProto3 || !typeRefRe.test(token))
                            throw illegal(token);
                        push(token);
                        parseField(type, s_optional);
                        break;
                }
            }
            skip(s_semi, true);
        } else
            skip(s_semi);
        type.visible = visible;
        parent.add(type);
    }

    function parseField(parent, rule, extend) {
        var type = next();
        if (!typeRefRe.test(type))
            throw illegal(type, s_type);
        var name = next();
        if (!nameRe.test(name))
            throw illegal(name, s_name);
        name = camelCase(name);
        skip("=");
        var id = parseNumber(next());
        var field = parseInlineOptions(new Field(name, id, type, rule, extend));
        if (field.repeated)
            field.setOption("packed", isProto3, /* ifNotSet */ true);
        parent.add(field);
    }

    function parseMapField(parent) {
        skip("<");
        var keyType = next();
        if (types.mapKey[keyType] === undefined)
            throw illegal(keyType, s_type);
        skip(",");
        var valueType = next();
        if (!typeRefRe.test(valueType))
            throw illegal(valueType, s_type);
        skip(">");
        var name = next();
        if (!nameRe.test(name))
            throw illegal(name, s_name);
        name = camelCase(name);
        skip("=");
        var id = parseId(next());
        parent.add(parseInlineOptions(new MapField(name, id, keyType, valueType)));
    }

    function parseOneOf(parent, token) {
        var name = next();
        if (!nameRe.test(name))
            throw illegal(name, s_name);
        name = camelCase(name);
        var oneof = new OneOf(name);
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                if (token === s_option) {
                    parseOption(oneof, token);
                    skip(s_semi);
                } else {
                    push(token);
                    parseField(oneof, s_optional);
                }
            }
            skip(s_semi, true);
        } else
            skip(s_semi);
        parent.add(oneof);
    }

    function parseEnum(parent, token) {
        var name = next();
        if (!nameRe.test(name))
            throw illegal(name, s_name);
        var values = {};
        var enm = new Enum(name, values);
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                if (lower(token) === s_option)
                    parseOption(enm);
                else
                    parseEnumField(enm, token);
            }
            skip(s_semi, true);
        } else
            skip(s_semi);
        parent.add(enm);
    }

    function parseEnumField(parent, token) {
        if (!nameRe.test(token))
            throw illegal(token, s_name);
        var name = token;
        skip("=");
        var value = parseId(next());
        parseInlineOptions(parent.values[name] = new Number(value)); // eslint-disable-line no-new-wrappers
    }

    function parseOption(parent, token) {
        var custom = skip(s_bopen, true);
        var name = next();
        if (!typeRefRe.test(name))
            throw illegal(name, s_name);
        if (custom) {
            skip(s_bclose);
            name = s_bopen + name + s_bclose;
            token = peek();
            if (fqTypeRefRe.test(token)) {
                name += token;
                next();
            }
        }
        skip("=");
        parseOptionValue(parent, name);
    }

    function parseOptionValue(parent, name) {
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                if (!nameRe.test(token))
                    throw illegal(token, s_name);
                name = name + "." + token;
                if (skip(":", true))
                    setOption(parent, name, readValue(true));
                else
                    parseOptionValue(parent, name);
            }
            skip(s_semi, true);
        } else
            setOption(parent, name, readValue(true));
        // Does not enforce a delimiter to be universal
    }

    function setOption(parent, name, value) {
        if (parent.setOption)
            parent.setOption(name, value);
        else
            parent[name] = value;
    }

    function parseInlineOptions(parent) {
        if (skip("[", true)) {
            do {
                parseOption(parent, s_option);
            } while (skip(",", true));
            skip("]");
        }
        skip(s_semi);
        return parent;
    }

    function parseService(parent, token) {
        token = next();
        if (!nameRe.test(token))
            throw illegal(token, "service name");
        var name = token;
        var service = new Service(name);
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                var tokenLower = lower(token);
                switch (tokenLower) {
                    case s_option:
                        parseOption(service, tokenLower);
                        skip(s_semi);
                        break;
                    case "rpc":
                        parseMethod(service, tokenLower);
                        break;
                    default:
                        throw illegal(token);
                }
            }
            skip(s_semi, true);
        } else
            skip(s_semi);
        parent.add(service);
    }

    function parseMethod(parent, token) {
        var type = token;
        var name = next();
        if (!nameRe.test(name))
            throw illegal(name, s_name);
        var requestType, requestStream,
            responseType, responseStream;
        skip(s_bopen);
        var st;
        if (skip(st = "stream", true))
            requestStream = true;
        if (!typeRefRe.test(token = next()))
            throw illegal(token);
        requestType = token;
        skip(s_bclose); skip("returns"); skip(s_bopen);
        if (skip(st, true))
            responseStream = true;
        if (!typeRefRe.test(token = next()))
            throw illegal(token);
        responseType = token;
        skip(s_bclose);
        var method = new Method(name, type, requestType, responseType, requestStream, responseStream);
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                var tokenLower = lower(token);
                switch (tokenLower) {
                    case s_option:
                        parseOption(method, tokenLower);
                        skip(s_semi);
                        break;
                    default:
                        throw illegal(token);
                }
            }
            skip(s_semi, true);
        } else
            skip(s_semi);
        parent.add(method);
    }

    function parseExtension(parent, token) {
        var reference = next();
        if (!typeRefRe.test(reference))
            throw illegal(reference, "reference");
        if (skip(s_open, true)) {
            while ((token = next()) !== s_close) {
                var tokenLower = lower(token);
                switch (tokenLower) {
                    case s_required:
                    case s_repeated:
                    case s_optional:
                        parseField(parent, tokenLower, reference);
                        break;
                    default:
                        if (!isProto3 || !typeRefRe.test(token))
                            throw illegal(token);
                        push(token);
                        parseField(parent, s_optional, reference);
                        break;
                }
            }
            skip(s_semi, true);
        } else
            skip(s_semi);
    }

    var token;
    while ((token = next()) !== null) {
        var tokenLower = lower(token);
        switch (tokenLower) {

            case "package":
                if (!head)
                    throw illegal(token);
                parsePackage();
                break;

            case "import":
                if (!head)
                    throw illegal(token);
                parseImport();
                break;

            case "syntax":
                if (!head)
                    throw illegal(token);
                parseSyntax();
                break;

            case s_option:
                if (!head)
                    throw illegal(token);
                parseOption(ptr, token);
                skip(s_semi);
                break;

            default:
                if (parseCommon(ptr, token)) {
                    head = false;
                    continue;
                }
                throw illegal(token);
        }
    }
    return {
        package       : pkg,
        imports       : imports,
        publicImports : publicImports,
        weakImports   : weakImports,
        syntax        : syntax,
        root          : root
    };
}

},{"11":11,"15":15,"16":16,"17":17,"18":18,"19":19,"4":4,"5":5,"7":7,"8":8}],13:[function(require,module,exports){
"use strict";
module.exports = Prototype;

/**
 * Options passed to the {@link Prototype|prototype constructor}, modifying its behavior.
 * @typedef PrototypeOptions
 * @type {Object}
 * @property {boolean} [fieldsOnly=false] Sets only properties that reference a field
 */

/**
 * Constructs a new prototype.
 * This method should be called from your custom constructors, i.e. `Prototype.call(this, properties)`.
 * @classdesc Runtime message prototype ready to be extended by custom classes or generated code.
 * @constructor
 * @param {Object.<string,*>} [properties] Properties to set
 * @param {PrototypeOptions} [options] Prototype options
 * @abstract
 * @see {@link inherits}
 * @see {@link Class}
 */
function Prototype(properties, options) {
    if (properties) {
        var any    = !(options && options.fieldsOnly),
            fields = this.constructor.$type.fields,
            keys   = Object.keys(properties);
        for (var i = 0; i < keys.length; ++i)
            if (fields[keys[i]] || any)
                this[keys[i]] = properties[keys[i]];
    }
}

/**
 * Converts a runtime message to a JSON object.
 * @param {Object.<string,*>} [options] Conversion options
 * @param {boolean} [options.fieldsOnly=false] Converts only properties that reference a field
 * @param {Function} [options.long] Long conversion type. Only relevant with a long library.
 * Valid values are `String` and `Number` (the global types).
 * Defaults to a possibly unsafe number without, and a `Long` with a long library.
 * @param {Function} [options.enum=Number] Enum value conversion type.
 * Valid values are `String` and `Number` (the global types).
 * Defaults to the values' numeric ids.
 * @returns {Object.<string,*>} JSON object
 */
Prototype.prototype.asJSON = function asJSON(options) {
    var any    = !(options && options.fieldsOnly),
        fields = this.constructor.$type.fields,
        json   = {};
    var keys   = Object.keys(this);
    for (var i = 0, key; i < keys.length; ++i) {
        var field = fields[key = keys[i]],
            value = this[key];
        if (field) {
            if (field.repeated) {
                if (value && value.length) {
                    var array = new Array(value.length);
                    for (var j = 0, l = value.length; j < l; ++j)
                        array[j] = field.jsonConvert(value[j], options);
                    json[key] = array;
                }
            } else
                json[key] = field.jsonConvert(value, options);
        } else if (any)
            json[key] = value;
    }
    return json;
};

},{}],14:[function(require,module,exports){
"use strict";
module.exports = Reader;

Reader.BufferReader = BufferReader;

var util     = require(20),
    ieee754  = require(1);
var LongBits = util.LongBits;

function indexOutOfRange(reader, writeLength) {
    return "index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len;
}

/**
 * Constructs a new reader using the specified buffer.
 * When called as a function, returns an appropriate reader for the specified buffer.
 * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 * @param {number[]} buffer Buffer to read from
 */
function Reader(buffer) {
    if (!(this instanceof Reader))
        return util.Buffer && (!buffer || util.Buffer.isBuffer(buffer))
            ? new BufferReader(buffer)
            : new Reader(buffer);

    /**
     * Read buffer.
     * @type {number[]}
     */
    this.buf = buffer;

    /**
     * Read buffer position.
     * @type {number}
     */
    this.pos = 0;

    /**
     * Read buffer length.
     * @type {number}
     */
    this.len = buffer.length;
}

/** @alias Reader.prototype */
var ReaderPrototype = Reader.prototype;

var ArrayImpl = typeof Uint8Array !== 'undefined'
    ? Uint8Array
    : Array;
ReaderPrototype._slice = ArrayImpl.prototype.slice || ArrayImpl.prototype.subarray;

/**
 * Tag read.
 * @constructor
 * @param {number} id Field id
 * @param {number} wireType Wire type
 * @ignore
 */
function Tag(id, wireType) {
    this.id = id;
    this.wireType = wireType;
}

/**
 * Reads a tag.
 * @returns {{id: number, wireType: number}} Field id and wire type
 */
ReaderPrototype.tag = function read_tag() {
    if (this.pos >= this.len)
        throw RangeError(indexOutOfRange(this));
    var octet = this.buf[this.pos++];
    return new Tag(octet >>> 3, octet & 7);
};

/**
 * Reads a varint as a signed 32 bit value.
 * @returns {number} Value read
 */
ReaderPrototype.int32 = function read_int32() {
    var value = 0,
        shift = 0,
        octet = 0;
    do {
        if (this.pos >= this.len)
            throw RangeError(indexOutOfRange(this));
        octet = this.buf[this.pos++];
        if (shift < 32)
            value |= (octet & 127) << shift;
        shift += 7;
    } while (octet & 128);
    return value;
};

/**
 * Reads a varint as an unsigned 32 bit value.
 * @returns {number} Value read
 */
ReaderPrototype.uint32 = function read_uint32() {
    return this.int32() >>> 0;
};

/**
 * Reads a zig-zag encoded varint as a signed 32 bit value.
 * @returns {number} Value read
 */
ReaderPrototype.sint32 = function read_sint32() {
    var value = this.int32();
    return value >>> 1 ^ -(value & 1);
};

/**
 * Reads a possibly 64 bits varint.
 * @returns {LongBits} Long bits
 * @this {Reader}
 * @inner
 * @ignore
 */
function readLongVarint() {
    var lo = 0, hi = 0,
        i  = 0, b  = 0;
    if (this.len - this.pos > 9) { // fast route
        for (i = 0; i < 4; ++i) {
            b = this.buf[this.pos++];
            lo |= (b & 127) << i * 7;
            if (b < 128)
                return new LongBits(lo >>> 0, hi >>> 0);
        }
        b = this.buf[this.pos++];
        lo |= (b & 127) << 28;
        hi |= (b & 127) >> 4;
        if (b < 128)
            return new LongBits(lo >>> 0, hi >>> 0);
        for (i = 0; i < 5; ++i) {
            b = this.buf[this.pos++];
            hi |= (b & 127) << i * 7 + 3;
            if (b < 128)
                return new LongBits(lo >>> 0, hi >>> 0);
        }
    } else {
        for (i = 0; i < 4; ++i) {
            if (this.pos >= this.len)
                throw RangeError(indexOutOfRange(this));
            b = this.buf[this.pos++];
            lo |= (b & 127) << i * 7;
            if (b < 128)
                return new LongBits(lo >>> 0, hi >>> 0);
        }
        if (this.pos >= this.len)
            throw RangeError(indexOutOfRange(this));
        b = this.buf[this.pos++];
        lo |= (b & 127) << 28;
        hi |= (b & 127) >> 4;
        if (b < 128)
            return new LongBits(lo >>> 0, hi >>> 0);
        for (i = 0; i < 5; ++i) {
            if (this.pos >= this.len)
                throw RangeError(indexOutOfRange(this));
            b = this.buf[this.pos++];
            hi |= (b & 127) << i * 7 + 3;
            if (b < 128)
                return new LongBits(lo >>> 0, hi >>> 0);
        }
    }
    throw Error("invalid varint encoding");
}

/**
 * Reads a varint as a signed 64 bit value.
 * @returns {Long|number} Value read
 */
ReaderPrototype.int64 = function read_int64() {
    var bits = readLongVarint.call(this);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, false);
    return bits.toNumber(false);
};

/**
 * Reads a varint as an unsigned 64 bit value.
 * @returns {Long|number} Value read
 */
ReaderPrototype.uint64 = function read_uint64() {
    var bits = readLongVarint.call(this);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, true);
    return bits.toNumber(true);
};

/**
 * Reads a zig-zag encoded varint as a signed 64 bit value.
 * @returns {Long|number} Value read
 */
ReaderPrototype.sint64 = function read_sint64() {
    var bits = readLongVarint.call(this).zzDecode();
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, false);
    return bits.toNumber(false);
};

/**
 * Reads a varint as a boolean.
 * @returns {boolean} Value read
 */
ReaderPrototype.bool = function read_bool() {
    return this.int32() !== 0;
};

/**
 * Reads fixed 32 bits as a number.
 * @returns {number} Value read
 */
ReaderPrototype.fixed32 = function read_fixed32() {
    if (this.pos + 4 > this.len)
        throw RangeError(indexOutOfRange(this, 4));
    this.pos += 4;
    return this.buf[this.pos - 4]
         | this.buf[this.pos - 3] << 8
         | this.buf[this.pos - 2] << 16
         | this.buf[this.pos - 1] << 24;
};

/**
 * Reads zig-zag encoded fixed 32 bits as a number.
 * @returns {number} Value read
 */
ReaderPrototype.sfixed32 = function read_sfixed32() {
    var value = this.fixed32();
    return value >>> 1 ^ -(value & 1);
};

/**
 * Reads a 64 bit value.
 * @returns {LongBits} Long bits
 * @this {Reader}
 * @inner 
 * @ignore
 */
function readLongFixed() {
    if (this.pos + 8 > this.len)
        throw RangeError(indexOutOfRange(this, 8));
    return new LongBits(
      ( this.buf[this.pos++]
      | this.buf[this.pos++] << 8
      | this.buf[this.pos++] << 16
      | this.buf[this.pos++] << 24 ) >>> 0
    ,
      ( this.buf[this.pos++]
      | this.buf[this.pos++] << 8
      | this.buf[this.pos++] << 16
      | this.buf[this.pos++] << 24 ) >>> 0
    );
}

/**
 * Reads fixed 64 bits as a Long.
 * @returns {Long|number} Value read
 */
ReaderPrototype.fixed64 = function read_fixed64() {
    var bits = readLongFixed.call(this);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, true);
    return bits.toNumber(true);
};

/**
 * Reads zig-zag encoded fixed 64 bits as a Long.
 * @returns {Long|number} Value read
 */
ReaderPrototype.sfixed64 = function read_sfixed64() {
    var bits = readLongFixed.call(this).zzDecode();
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, false);
    return bits.toNumber(false);
};

/**
 * Reads a float (32 bit) as a number.
 * @function
 * @returns {number} Value read
 */
ReaderPrototype.float = function read_float() {
    if (this.pos + 4 > this.len)
        throw RangeError(indexOutOfRange(this, 4));
    var value = ieee754.read(this.buf, this.pos, false, 23, 4);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number.
 * @function
 * @returns {number} Value read
 */
ReaderPrototype.double = function read_double() {
    if (this.pos + 8 > this.len)
        throw RangeError(indexOutOfRange(this, 4));
    var value = ieee754.read(this.buf, this.pos, false, 52, 8);
    this.pos += 8;
    return value;
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @returns {number[]} Value read
 */
ReaderPrototype.bytes = function read_bytes() {
    var length = this.int32() >>> 0,
        start  = this.pos,
        end    = this.pos + length;
    if (end > this.len)
        throw RangeError(indexOutOfRange(this, length));
    this.pos += length;
    return this._slice.call(this.buf, start, end);
};

/**
 * Reads a string preceeded by its byte length as a varint.
 * @returns {string} Value read
 */
ReaderPrototype.string = function read_string() {
    // ref: https://github.com/google/closure-library/blob/master/closure/goog/crypt/crypt.js
    var bytes = this.bytes(),
        len = bytes.length;
    if (len) {
        var out = new Array(len), p = 0, c = 0;
        while (p < len) {
            var c1 = bytes[p++];
            if (c1 < 128)
                out[c++] = c1;
            else if (c1 > 191 && c1 < 224)
                out[c++] = (c1 & 31) << 6 | bytes[p++] & 63;
            else if (c1 > 239 && c1 < 365) {
                var u = ((c1 & 7) << 18 | (bytes[p++] & 63) << 12 | (bytes[p++] & 63) << 6 | bytes[p++] & 63) - 0x10000;
                out[c++] = 0xD800 + (u >> 10);
                out[c++] = 0xDC00 + (u & 1023);
            } else
                out[c++] = (c1 & 15) << 12 | (bytes[p++] & 63) << 6 | bytes[p++] & 63;
        }
        return String.fromCharCode.apply(String, out.slice(0, c));
    }
    return "";
};

/**
 * Skips the specified number of bytes if specified, otherwise skips a varint.
 * @param {number} [length] Length if known, otherwise a varint is assumed
 * @returns {Reader} `this`
 */
ReaderPrototype.skip = function skip(length) {
    if (length === undefined) {
        do {
            if (this.pos >= this.len)
                throw RangeError(indexOutOfRange(this));
        } while (this.buf[this.pos++] & 128);
    } else {
        if (this.pos + length > this.len)
            throw RangeError(indexOutOfRange(this, length));
        this.pos += length;
    }
    return this;
};

/**
 * Skips the next element of the specified wire type.
 * @param {number} wireType Wire type received
 * @returns {Reader} `this`
 */
ReaderPrototype.skipType = function(wireType) {
    switch (wireType) {
        case 0:
            this.skip();
            break;
        case 1:
            this.skip(8);
            break;
        case 2:
            this.skip(this.uint32());
            break;
        case 3:
            do { // eslint-disable-line no-constant-condition
                var tag = this.tag();
                if (tag.wireType === 4)
                    break;
                this.skipType(tag.wireType);
            } while (true);
            break;
        case 5:
            this.skip(4);
            break;
        default:
            throw Error("invalid wire type: " + wireType);
    }
    return this;
};

/**
 * Resets this instance and frees all resources.
 * @param {number[]} [buffer] New buffer for a new sequence of read operations
 * @returns {Reader} `this`
 */
ReaderPrototype.reset = function reset(buffer) {
    if (buffer) {
        this.buf = buffer;
        this.len = buffer.length;
    } else {
        this.buf = null; // makes it throw
        this.len = 0;
    }
    this.pos = 0;
    return this;
};

/**
 * Finishes the current sequence of read operations, frees all resources and returns the remaining buffer.
 * @param {number[]} [buffer] New buffer for a new sequence of read operations
 * @returns {number[]} Finished buffer
 */
ReaderPrototype.finish = function finish(buffer) {
    var remain = this.pos
        ? this._slice.call(this.buf, this.pos)
        : this.buf;
    this.reset(buffer);
    return remain;
};

// One time function to initialize BufferReader with the now-known buffer implementation's slice method
var initBufferReader = function() {
    if (!util.Buffer)
        throw Error("Buffer is not supported");
    BufferReaderPrototype._slice = util.Buffer.prototype.slice;
    initBufferReader = false;
};

/**
 * Constructs a new buffer reader.
 * @classdesc Wire format reader using node buffers.
 * @extends Reader
 * @constructor
 * @param {Buffer} buffer Buffer to read from
 */
function BufferReader(buffer) {
    if (initBufferReader)
        initBufferReader();
    Reader.call(this, buffer);
}

/** @alias BufferReader.prototype */
var BufferReaderPrototype = BufferReader.prototype = Object.create(Reader.prototype);

BufferReaderPrototype.constructor = BufferReader;

/**
 * Reads a float (32 bit) as a number using node buffers.
 * @returns {number} Value read
 */
BufferReaderPrototype.float = function read_float_buffer() {
    if (this.pos + 4 > this.len)
        throw RangeError(indexOutOfRange(this, 4));
    var value = this.buf.readFloatLE(this.pos, true);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number using node buffers.
 * @returns {number} Value read
 */
BufferReaderPrototype.double = function read_double_buffer() {
    if (this.pos + 8 > this.len)
        throw RangeError(indexOutOfRange(this, 8));
    var value = this.buf.readDoubleLE(this.pos, true);
    this.pos += 8;
    return value;
};

/**
 * Reads a string.
 * @returns {string} Value read
 */
BufferReaderPrototype.string = function read_string_buffer() {
    var length = this.int32() >>> 0,
        start = this.pos,
        end   = this.pos + length;
    if (end > this.len)
        throw RangeError(indexOutOfRange(this, length));
    this.pos += length;
    return this.buf.toString("utf8", start, end);
};

/**
 * Finishes the current sequence of read operations using node buffers, frees all resources and returns the remaining buffer.
 * @param {Buffer} [buffer] New buffer for a new sequence of read operations
 * @returns {Buffer} Finished buffer
 */
BufferReaderPrototype.finish = function finish_buffer(buffer) {
    var remain = this.pos ? this.buf.slice(this.pos) : this.buf;
    this.reset(buffer);
    return remain;
};

},{"1":1,"20":20}],15:[function(require,module,exports){
"use strict";
module.exports = Root;

var Namespace = require(9);
/** @alias Namespace.prototype */
var NamespacePrototype = Namespace.prototype; 
/** @alias Root.prototype */
var RootPrototype = Namespace.extend(Root);

var Type      = require(18),
    Field     = require(5),
    // OneOf     = require("./oneof"),
    // Enum      = require("./enum"),
    util      = require(20);

/**
 * Options provided to a {@link Root|root namespace}, modifying its behavior.
 * @typedef RootOptions
 * @type {Object}
 * @property {boolean} [noGoogleTypes=false] Skips loading of common Google types like `google.protobuf.Any`.
 */

/**
 * Constructs a new root namespace.
 * @classdesc Root namespace wrapping all types, enums, services, sub-namespaces etc. that belong together.
 * @extends Namespace
 * @constructor
 * @param {RootOptions} [rootOptions] Root options
 * @param {Object} [options] Declared options
 */
function Root(rootOptions, options) {
    Namespace.call(this, "", options);

    if (!rootOptions)
        rootOptions = {};

    /**
     * References to common google types.
     * @type {Object.<string, Type|Enum>}
     */
    this.common = {};

    /**
     * Array of yet unprocessed and thus pending extension fields.
     * @type {Field[]}
     */
    this.pendingExtensions = [];

    /**
     * Already loaded file names.
     * @type {string[]}
     * @private
     */
    this._loaded = []; // use addLoaded/isLoaded instead

    if (!rootOptions.noGoogleTypes)
        importGoogleTypes(this, false);
}

/**
 * Checks if a specific file has already been loaded.
 * @param {string} filename File name to test
 * @returns {boolean} `true` if already loaded
 */
RootPrototype.isLoaded = function isLoaded(filename) {
    filename = util.normalizePath(filename);
    var index = filename.indexOf("google/protobuf/");
    if (index > 0 /* not -1 */)
        filename = filename.substring(index);
    return this._loaded.indexOf(filename) > -1;
};

/**
 * Lets the root know of a loaded file, i.e. when added programmatically.
 * @param {string} filename File name to add
 * @returns {boolean} `false` if this file has already been loaded before
 */
RootPrototype.addLoaded = function addLoaded(filename) {
    if (this.isLoaded(filename))
        return false;
    filename = util.normalizePath(filename);
    this._loaded.push(filename);
    return true;
};

/**
 * @override
 */
RootPrototype.toJSON = function toJSON() {
    // TODO: Export imports, but first a Root needs to know what's weak and what's public.
    return NamespacePrototype.toJSON.call(this);
};

/**
 * Imports common google types to the specified root.
 * @memberof Root
 * @param {Root} root The root to import to
 * @param {?boolean} [visible] Whether visible when exporting definitions. Defaults to inherit from parent.
 * @returns {undefined}
 */
function importGoogleTypes(root, visible) {
    if (visible === undefined)
        visible = null;
    else if (visible !== null && typeof visible !== 'boolean')
        throw util._TypeError("visible", "a boolean or null");

    var // bool     = "bool",
        int32    = "int32",
        // uint32   = "uint32",
        int64    = "int64",
        // uint64   = "uint64",
        // float    = "float",
        // double   = "double",
        string   = "string",
        bytes    = "bytes",
        // repeated = "repeated",
        value    = "value",
        // name     = "name",
        // number   = "number",
        // options  = "options",
        seconds  = "seconds",
        nanos    = "nanos";

    // NOTE: It is important to create new instances for each root
    var types = {

        "empty": [

            new Type("Empty")
        ],
        "any": [

            new Type("Any")
            .add(new Field("type_url", 1, string))
            .add(new Field( value    , 2, bytes))
        ],
        "timestamp": [

            new Type("Timestamp")
            .add(new Field(seconds, 1, int64))
            .add(new Field(nanos  , 2, int32))
        ],
        "duration": [

            new Type("Duration")
            .add(new Field(seconds, 1, int64))
            .add(new Field(nanos  , 2, int32))
        ],
        /* "wrappers": [

            new Type("DoubleValue")
            .add(new Field(value, 1, double)),

            new Type("FloatValue")
            .add(new Field(value, 1, float)),

            new Type("Int64Value")
            .add(new Field(value, 1, int64)),

            new Type("UInt64Value")
            .add(new Field(value, 1, uint64)),

            new Type("Int32Value")
            .add(new Field(value, 1, int32)),

            new Type("UInt32Value")
            .add(new Field(value, 1, uint32)),

            new Type("BoolValue")
            .add(new Field(value, 1, bool)),

            new Type("StringValue")
            .add(new Field(value, 1, string)),

            new Type("BytesValue")
            .add(new Field(value, 1, bytes))
        ],
        "struct": [

            new Type("Value")
            .add(new OneOf("kind")
                .add(new Field("null_"       + value, 1, "NullValue"))
                .add(new Field( number + "_" + value, 2,  double))
                .add(new Field( string + "_" + value, 3,  string))
                .add(new Field( bool   + "_" + value, 4,  bool))
                .add(new Field("struct_"     + value, 5, "Struct"))
                .add(new Field("list_"       + value, 6, "ListValue"))
            ),
            new Enum("NullValue", { NULL_VALUE: 0 }),

            new Type("ListValue")
            .add(new Field("values", 1, "Value", repeated))
        ],
        "source_context": [

            new Type("SourceContext")
            .add(new Field("file_name", 1, string))
        ],
        "type": [

            new Type("Type")
            .add(new Field( name           , 1, string))
            .add(new Field("fields"        , 2, "Field", repeated))
            .add(new Field("oneofs"        , 3, string, repeated))
            .add(new Field( options        , 4, "Option", repeated))
            .add(new Field("source_context", 5, "SourceContext"))
            .add(new Field("syntax"        , 6, "Syntax")),

            new Type("Field")
            .add(new Enum("Kind", {
                TYPE_UNKNOWN  : 0,
                TYPE_DOUBLE   : 1,
                TYPE_FLOAT    : 2,
                TYPE_INT64    : 3,
                TYPE_UINT64   : 4,
                TYPE_INT32    : 5,
                TYPE_FIXED64  : 6,
                TYPE_FIXED32  : 7,
                TYPE_BOOL     : 8,
                TYPE_STRING   : 9,
                TYPE_GROUP    : 10,
                TYPE_MESSAGE  : 11,
                TYPE_BYTES    : 12,
                TYPE_UINT32   : 13,
                TYPE_ENUM     : 14,
                TYPE_SFIXED32 : 15,
                TYPE_SFIXED64 : 16,
                TYPE_SINT32   : 17,
                TYPE_SINT64   : 18
            }))
            .add(new Enum("Cardinality", {
                CARDINALITY_UNKNOWN  : 0,
                CARDINALITY_OPTIONAL : 1,
                CARDINALITY_REQUIRED : 2,
                CARDINALITY_REPEATED : 3
            }))
            .add(new Field("kind"         , 1 , "Kind"))
            .add(new Field("cardinality"  , 2 , "Cardinality"))
            .add(new Field( number        , 3 ,  int32))
            .add(new Field( name          , 4 ,  string))
            .add(new Field("type_url"     , 6 ,  string))
            .add(new Field("oneof_index"  , 7 ,  int32))
            .add(new Field("packed"       , 8 ,  bool))
            .add(new Field( options       , 9 , "Option"))
            .add(new Field("json_name"    , 10,  string))
            .add(new Field("default_value", 11,  string)),

            new Type("Enum")
            .add(new Field( name           , 1,  string))
            .add(new Field("enum" + value  , 2, "EnumValue", repeated))
            .add(new Field( options        , 3, "Option", repeated))
            .add(new Field("source_context", 4, "SourceContext"))
            .add(new Field("syntax"        , 5, "Syntax")),

            new Type("EnumValue")
            .add(new Field( name    , 1,  string))
            .add(new Field( number  , 2,  int32))
            .add(new Field( options , 3, "Option", repeated )),

            new Type("Option")
            .add(new Field(name , 1,  string ))
            .add(new Field(value, 2, "Any"   )),

            new Enum("Syntax", { SYNTAX_PROTO2 : 0, SYNTAX_PROTO3 : 1 })
        ],
        "field_mask": [

            new Type("FieldMask")
            .add(new Field("paths", 1, string, repeated))
        ] */
    };

    var gp = "google/protobuf";
    var ns = root.define(gp.split('/'), visible);
    Object.keys(types).forEach(function(protoName) {
        if (!root.addLoaded(gp + "/" + protoName + ".proto"))
            return;
        types[protoName].forEach(function(type) {
            type.visible = visible;
            ns.add(type);
            root.common[type.name] = type;
        });
    });
}

Root.importGoogleTypes = importGoogleTypes;

/**
 * Resolves the path of an imported file, relative to the importing origin.
 * This method exists so you can override it with your own logic in case your imports are scattered over multiple directories.
 * @function
 * @param {string} origin The file name of the importing file
 * @param {string} target The file name being imported
 * @returns {string} Resolved path to `target`
 */
RootPrototype.resolvePath = util.resolvePath;

/**
 * Options provided to {@link Root#load}, modifying its behavior.
 * @typedef LoaderOptions
 * @type {Object}
 * @property {boolean} [public=false] Whether this is a public import
 * @property {boolean} [weak=false} Whether this is a weak import]
 */

/**
 * Loads one or multiple .proto or preprocessed .json files into this root namespace.
 * @param {string|string[]} filename Names of one or multiple files to load
 * @param {LoaderOptions} [options] Load options
 * @param {function(?Error, Root=)} [callback] Node-style callback function
 * @returns {Promise<Root>|undefined} A promise if `callback` has been omitted
 * @throws {TypeError} If arguments are invalid
 */
RootPrototype.load = function load(filename, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    var self = this;
    if (!callback)
        return util.asPromise(load, self, filename, options);

    // Finishes loading by calling the callback (exactly once)
    function finish(err, root) {
        if (!callback)
            return;
        var cb = callback;
        callback = null;
        cb(err, root);
    }

    // Processes a single file
    function process(origin, source, visible) {
        try {
            if (source.charAt(0) === "{") {
                var json = JSON.parse(source);
                self.setOptions(json.options).addJSON(json.nested);
            } else {
                var parsed = require(12)(source, self, visible);
                if (parsed.publicImports)
                    parsed.publicImports.forEach(function(file) {
                        fetch(self.resolvePath(origin, file), visible, false);
                    });
                if (parsed.imports)
                    parsed.imports.forEach(function(file) {
                        fetch(self.resolvePath(origin, file), false, false);
                    });
                if (parsed.weakImports)
                    parsed.weakImports.forEach(function(file) {
                        fetch(self.resolvePath(origin, file), false, true);
                    });
            }
        } catch (err) {
            finish(err);
            return;
        }
        if (!queued)
            finish(null, self);
    }

    // Fetches a single file
    function fetch(file, visible, weak) {
        if (!self.addLoaded(file))
            return;
        ++queued;
        util.fetch(file, function(err, source) {
            --queued;
            if (!callback)
                return;
            if (!err) {
                process(file, source, visible);
                return;
            }
            if (!weak)
                finish(err);
        });
    }
    var queued = 0;

    // Assembling the root namespace doesn't require working type
    // references anymore, so we can load everything in parallel
    if (Array.isArray(filename))
        filename.forEach(function(file) {
            fetch(file, true, false);
        });
    else if (util.isString(filename))
        fetch(filename, true, false);
    else
        throw util._TypeError("filename", "a string or array");

    if (!queued)
        finish(null);
    return undefined;
};

/**
 * Handles a (pending) declaring extension field by creating a sister field to represent it
 * within its extended type.
 * @param {Field} field Declaring extension field witin the declaring type
 * @returns {boolean} `true` if successfully added to the extended type, `false` otherwise
 * @inner
 * @ignore
 */
function handleExtension(field) {
    var extendedType = field.parent.lookup(field.extend);
    if (extendedType) {
        var sisterField = new Field(field.fullName, field.id, field.type, field.rule, undefined, field.options);
        sisterField.declaringField = field;
        sisterField.visible = false;
        field.extensionField = sisterField;
        extendedType.add(sisterField);
        return true;
    }
    return false;
}

/**
 * Called when any object is added to this root or its sub-namespaces.
 * @param {ReflectionObject} object Object added
 * @returns {undefined}
 * @private
 */
RootPrototype._handleAdd = function handleAdd(object) {
    // Try to handle any pending extensions
    var newPendingExtensions = this.pendingExtensions.slice();
    this.pendingExtensions = []; // because the loop calls handleAdd
    var i = 0;
    while (i < newPendingExtensions.length)
        if (handleExtension(newPendingExtensions[i]))
            newPendingExtensions.splice(i, 1);
        else
            ++i;
    this.pendingExtensions = newPendingExtensions;
    // Handle new declaring extension fields without a sister field yet
    if (object instanceof Field && object.extend !== undefined && !object.extensionField && !handleExtension(object) && this.pendingExtensions.indexOf(object) < 0)
        this.pendingExtensions.push(object);
    else if (object instanceof Namespace) {
        var nested = object.nestedArray;
        for (i = 0; i < nested.length; ++i) // recurse into the namespace
            this._handleAdd(nested[i]);
    }
};

/**
 * Called when any object is removed from this root or its sub-namespaces.
 * @param {ReflectionObject} object Object removed
 * @returns {undefined}
 * @private
 */
RootPrototype._handleRemove = function handleRemove(object) {
    if (object instanceof Field) {
        // If a pending declaring extension field, cancel the extension
        if (object.extend !== undefined && !object.extensionField) {
            var index = this.pendingExtensions.indexOf(object);
            if (index > -1)
                this.pendingExtensions.splice(index, 1);
        }
        // If a declaring extension field with a sister field, remove its sister field
        if (object.extensionField) {
            object.extensionField.parent.remove(object.extensionField);
            object.extensionField = null;
        }
    } else if (object instanceof Namespace) {
        var nested = object.nestedArray;
        for (var i = 0; i < nested.length; ++i) // recurse into the namespace
            this._handleRemove(nested[i]);
    }
};

/**
 * @override
 */
RootPrototype.toString = function toString() {
    return this.constructor.name;
};

},{"12":12,"18":18,"20":20,"5":5,"9":9}],16:[function(require,module,exports){
"use strict";
module.exports = Service;

var Namespace = require(9);
/** @alias Namespace.prototype */
var NamespacePrototype = Namespace.prototype;
/** @alias Service.prototype */
var ServicePrototype = Namespace.extend(Service);

var Method = require(8),
    util   = require(20);

/**
 * Constructs a new service.
 * @classdesc Reflected service.
 * @extends Namespace
 * @constructor
 * @param {string} name Service name
 * @param {Object.<string,*>} [options] Service options
 * @throws {TypeError} If arguments are invalid
 */
function Service(name, options) {
    Namespace.call(this, name, options);

    /**
     * Service methods.
     * @type {Object.<string,Method>}
     */
    this.methods = {}; // toJSON, marker

    /**
     * Cached methods as an array.
     * @type {?Method[]}
     * @private
     */
    this._methodsArray = null;
}

Object.defineProperties(ServicePrototype, {

    /**
     * Methods of this service as an array for iteration.
     * @name Service#methodsArray
     * @type {Method[]}
     * @readonly
     */
    methodsArray: {
        get: function() {
            return this._methodsArray || (this._methodsArray = util.toArray(this.methods));
        }
    },

    // override
    object: {
        get: function() {
            if (this._object)
                return this._object;
            this._object = Object.create(this);
            var nested = this.methodsArray, i = 0, obj;
            while (i < nested.length)
                this._object[(obj = nested[i++]).name] = obj.object;
            nested = this.nestedArray; i = 0;
            while (i < nested.length)
                this._object[(obj = nested[i++]).name] = obj.object;
            return this._object;
        }
    }

});

function clearCache(service) {
    service._methodsArray = null;
    return service;
}

/**
 * Tests if the specified JSON object describes a service.
 * @param {Object} json JSON object to test
 * @returns {boolean} `true` if the object describes a service
 */
Service.testJSON = function testJSON(json) {
    return Boolean(json && json.methods);
};

/**
 * Constructs a service from JSON.
 * @param {string} name Service name
 * @param {Object} json JSON object
 * @returns {Service} Created service
 * @throws {TypeError} If arguments are invalid
 */
Service.fromJSON = function fromJSON(name, json) {
    return new Service(name, json.options);
};

/**
 * @override
 */
ServicePrototype.toJSON = function toJSON() {
    var methods = {}, anyVisible = false;
    this.methodsArray.forEach(function(obj) {
        var json = obj.toJSON();
        if (json) {
            methods[obj.name] = json;
            anyVisible = true;
        }
    });
    if (!anyVisible) methods = undefined;
    
    var inherited = NamespacePrototype.toJSON.call(this);
    return (inherited || methods) && {
        options : inherited && inherited.options || undefined,
        methods : methods,
        nested  : inherited && inherited.nested || undefined
    } || undefined;
};

/**
 * @override
 */
ServicePrototype.get = function get(name) {
    return NamespacePrototype.get.call(this, name) || this.methods[name] || null;
};

/**
 * @override
 */
ServicePrototype.resolveAll = function resolve() {
    var methods = this.methodsArray;
    for (var i = 0; i < methods.length; ++i)
        methods[i].resolve();
    return NamespacePrototype.resolve.call(this);
};

/**
 * @override
 */
ServicePrototype.add = function add(object) {
    if (this.get(object.name))
        throw Error("duplicate name '" + object.name + '" in ' + this);
    if (object instanceof Method) {
        this.methods[object.name] = object;
        object.parent = this;
        return clearCache(this);
    }
    return NamespacePrototype.add.call(this, object);
};

/**
 * @override
 */
ServicePrototype.remove = function remove(object) {
    if (object instanceof Method) {
        if (this.methods[object.name] !== object)
            throw Error(object + " is not a member of " + this);
        delete this.methods[object.name];
        object.parent = null;
        return clearCache(this);
    }
    return NamespacePrototype.remove.call(this, object);
};

},{"20":20,"8":8,"9":9}],17:[function(require,module,exports){
"use strict";
/* eslint-disable default-case, callback-return */
module.exports = tokenize;

var delimRe        = /[\s{}=;:\[\],'"\(\)<>]/g,
    stringDoubleRe = /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,
    stringSingleRe = /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g;

/**
 * Handle object returned from {@link tokenize}.
 * @typedef {Object} TokenizerHandle
 * @property {function():number} line Gets the current line number
 * @property {function():?string} next Gets the next token and advances (`null` on eof)
 * @property {function():?string} peek Peeks for the next token (`null` on eof)
 * @property {function(string)} push Pushes a token back to the stack
 * @property {function(string, boolean=):boolean} skip Skips a token, returns its presence and advances or, if non-optional and not present, throws
 */

var s_nl = "\n",
    s_sl = '/',
    s_as = '*';

/**
 * Tokenizes the given .proto source and returns an object with useful utility functions.
 * @param {string} source Source contents
 * @returns {TokenizerHandle} Tokenizer handle
 */
function tokenize(source) {
    source = source.toString();
    
    var offset = 0,
        length = source.length,
        line = 1;
    
    var stack = [];

    var stringDelim = null;

    /**
     * Creates an error for illegal syntax.
     * @param {string} subject Subject
     * @returns {Error} Error created
     * @inner
     */
    function illegal(subject) {
        return Error("illegal " + subject + " (line " + line + ")");
    }

    /**
     * Reads a string till its end.
     * @returns {string} String read
     * @inner
     */
    function readString() {
        var re = stringDelim === '"' ? stringDoubleRe : stringSingleRe;
        re.lastIndex = offset - 1;
        var match = re.exec(source);
        if (!match)
            throw illegal("string");
        offset = re.lastIndex;
        push(stringDelim);
        stringDelim = null;
        return match[1];
    }

    /**
     * Gets the character at `pos` within the source.
     * @param {number} pos Position
     * @returns {string} Character
     * @inner
     */
    function charAt(pos) {
        return source.charAt(pos);
    }

    /**
     * Obtains the next token.
     * @returns {?string} Next token or `null` on eof
     * @inner
     */
    function next() {
        if (stack.length > 0)
            return stack.shift();
        if (stringDelim)
            return readString();
        var repeat,
            prev,
            curr;
        do {
            if (offset === length)
                return null;
            repeat = false;
            while (/\s/.test(curr = charAt(offset))) {
                if (curr === s_nl)
                    ++line;
                if (++offset === length)
                    return null;
            }
            if (charAt(offset) === s_sl) {
                if (++offset === length)
                    throw illegal("comment");
                if (charAt(offset) === s_sl) { // Line
                    while (charAt(++offset) !== s_nl)
                        if (offset === length)
                            return null;
                    ++offset;
                    ++line;
                    repeat = true;
                } else if ((curr = charAt(offset)) === s_as) { /* Block */
                    do {
                        if (curr === s_nl)
                            ++line;
                        if (++offset === length)
                            return null;
                        prev = curr;
                        curr = charAt(offset);
                    } while (prev !== s_as || curr !== s_sl);
                    ++offset;
                    repeat = true;
                } else
                    return s_sl;
            }
        } while (repeat);

        if (offset === length)
            return null;
        var end = offset;
        delimRe.lastIndex = 0;
        var delim = delimRe.test(charAt(end++));
        if (!delim)
            while (end < length && !delimRe.test(charAt(end)))
                ++end;
        var token = source.substring(offset, offset = end);
        if (token === '"' || token === "'")
            stringDelim = token;
        return token;
    }

    /**
     * Pushes a token back to the stack.
     * @param {string} token Token
     * @returns {undefined}
     * @inner
     */
    function push(token) {
        stack.push(token);
    }

    /**
     * Peeks for the next token.
     * @returns {?string} Token or `null` on eof
     * @inner
     */
    function peek() {
        if (!stack.length) {
            var token = next();
            if (token === null)
                return null;
            push(token);
        }
        return stack[0];
    }

    /**
     * Skips a token.
     * @param {string} expected Expected token
     * @param {boolean} [optional=false] Whether the token is optional
     * @returns {boolean} `true` when skipped, `false` if not
     * @throws {Error} When a required token is not present
     * @inner
     */
    function skip(expected, optional) {
        var actual = peek(),
            equals = actual === expected;
        if (equals) {
            next();
            return true;
        }
        if (!optional)
            throw illegal("token '" + actual + "', '" + expected + "' expected");
        return false;
    }

    return {
        line: function() { return line; },
        next: next,
        peek: peek,
        push: push,
        skip: skip
    };
}
},{}],18:[function(require,module,exports){
"use strict";
module.exports = Type; 

var Namespace = require(9);
/** @alias Namespace.prototype */
var NamespacePrototype = Namespace.prototype;
/** @alias Type.prototype */
var TypePrototype = Namespace.extend(Type);

var Enum      = require(4),
    OneOf     = require(11),
    Field     = require(5),
    Service   = require(16),
    Prototype = require(13),
    inherits  = require(6),
    util      = require(20),
    Reader    = require(14),
    Encoder   = require(3),
    Decoder   = require(2),
    Verifier  = require(23);
var codegen   = util.codegen;

/**
 * Constructs a new message type.
 * @classdesc Reflected message type.
 * @extends Namespace
 * @constructor
 * @param {string} name Message name
 * @param {Object} [options] Declared options
 */
function Type(name, options) {
    Namespace.call(this, name, options);

    /**
     * Message fields.
     * @type {Object.<string,Field>}
     */
    this.fields = {};  // toJSON, marker

    /**
     * Oneofs declared within this namespace, if any.
     * @type {Object.<string,OneOf>}
     */
    this.oneofs = undefined; // toJSON

    /**
     * Extension ranges, if any.
     * @type {number[][]}
     */
    this.extensions = undefined; // toJSON

    /**
     * Reserved ranges, if any.
     * @type {number[][]}
     */
    this.reserved = undefined; // toJSON

    /**
     * Cached fields by id.
     * @type {?Object.<number,Field>}
     * @private
     */
    this._fieldsById = null;

    /**
     * Cached fields as an array.
     * @type {?Field[]}
     * @private
     */
    this._fieldsArray = null;

    /**
     * Cached required fields as an array.
     * @type {?Field[]}
     * @private
     */
    this._requiredFieldsArray = null;

    /**
     * Cached oneofs as an array.
     * @type {?OneOf[]}
     * @private
     */
    this._oneofsArray = null;

    /**
     * Cached constructor.
     * @type {?Function}
     * @private
     */
    this._ctor = null;
}

Object.defineProperties(TypePrototype, {

    /**
     * Message fields by id.
     * @name Type#fieldsById
     * @type {Object.<number,Field>}
     * @readonly
     */
    fieldsById: {
        get: function() {
            if (this._fieldsById)
                return this._fieldsById;
            this._fieldsById = {};
            var names = Object.keys(this.fields);
            for (var i = 0; i < names.length; ++i) {
                var field = this.fields[names[i]],
                    id = field.id;
                if (this._fieldsById[id])
                    throw Error("duplicate id " + id + " in " + this);
                this._fieldsById[id] = field;
            }
            return this._fieldsById;
        }
    },

    /**
     * Fields of this message as an array for iteration.
     * @name Type#fieldsArray
     * @type {Field[]}
     * @readonly
     */
    fieldsArray: {
        get: function() {
            return this._fieldsArray || (this._fieldsArray = util.toArray(this.fields));
        }
    },

    /**
     * Required fields of thiss message as an array for iteration.
     * @name Type#requiredFieldsArray
     * @type {Field[]}
     * @readonly
     */
    requiredFieldsArray: {
        get: function() {
            if (this._requiredFieldsArray)
                return this._requiredFieldsArray;
            var fields   = this.fieldsArray,
                required = this._requiredFieldsArray = [];
            for (var i = 0; i < fields.length; ++i)
                if (fields[i].required)
                    required[required.length] = fields[i];
            return required;
        }
    },

    /**
     * Oneofs of this message as an array for iteration.
     * @name Type#oneofsArray
     * @type {OneOf[]}
     * @readonly
     */
    oneofsArray: {
        get: function() {
            return this._oneofsArray || (this._oneofsArray = util.toArray(this.oneofs));
        }
    },

    /**
     * The registered constructor, if any registered, otherwise a generic constructor.
     * @name Type#ctor
     * @type {Prototype}
     */
    ctor: {
        get: function() {
            if (this._ctor)
                return this._ctor;
            var ctor;
            if (codegen.supported)
                ctor = codegen("p")("P.call(this,p)").eof(this.fullName + "$ctor", {
                    P: Prototype
                });
            else
                ctor = function GenericMessage(properties) {
                    Prototype.call(this, properties);
                };
            ctor.prototype = inherits(ctor, this);
            this._ctor = ctor;
            return ctor;
        },
        set: function(ctor) {
            if (ctor && !(ctor.prototype instanceof Prototype))
                throw util._TypeError("ctor", "a constructor inheriting from Prototype");
            this._ctor = ctor;
        }
    }
});

function clearCache(type) {
    type._fieldsById = type._fieldsArray = type._requiredFieldsArray = type._oneofsArray = type._ctor = null;
    delete type.encode;
    delete type.decode;
    return type;
}

/**
 * Tests if the specified JSON object describes a message type.
 * @param {*} json JSON object to test
 * @returns {boolean} `true` if the object describes a message type
 */
Type.testJSON = function testJSON(json) {
    return Boolean(json && json.fields);
};

var nestedTypes = [ Enum, Type, Field, Service ];

/**
 * Creates a type from JSON.
 * @param {string} name Message name
 * @param {Object} json JSON object
 * @returns {Type} Created message type
 */
Type.fromJSON = function fromJSON(name, json) {
    var type = new Type(name, json.options);
    type.extensions = json.extensions;
    type.reserved = json.reserved;
    if (json.fields)
        Object.keys(json.fields).forEach(function(fieldName) {
            type.add(Field.fromJSON(fieldName, json.fields[fieldName]));
        });
    if (json.oneofs)
        Object.keys(json.oneofs).forEach(function(oneOfName) {
            type.add(OneOf.fromJSON(oneOfName, json.oneofs[oneOfName]));
        });
    if (json.nested)
        Object.keys(json.nested).forEach(function(nestedName) {
            var nested = json.nested[nestedName];
            for (var i = 0; i < nestedTypes.length; ++i) {
                if (nestedTypes[i].testJSON(nested)) {
                    type.add(nestedTypes[i].fromJSON(nestedName, nested));
                    break;
                }
            }
            throw Error("invalid nested object in " + type + ": " + nestedName);
        });
    return type;
};

/**
 * @override
 */
TypePrototype.toJSON = function toJSON() {
    var fields = {}, anyVisible = false;
    this.fieldsArray.forEach(function(obj) {
        if (obj.declaringField)
            return;
        var json = obj.toJSON();
        if (json) {
            fields[obj.name] = json;
            anyVisible = true;
        }
    });
    if (!anyVisible) fields = undefined;

    var oneofs = {}; anyVisible = false;
    this.oneofsArray.forEach(function(obj) {
        var json = obj.toJSON();
        if (json) {
            oneofs[obj.name] = json;
            anyVisible = true;
        }
    });
    if (!anyVisible) oneofs = undefined;
    
    var inherited = NamespacePrototype.toJSON.call(this);
    return (inherited || fields || oneofs) && {
        options : inherited && inherited.options || undefined,
        oneofs  : oneofs,
        fields  : fields,
        nested  : inherited && inherited.nested || undefined
    } || undefined;
};

/**
 * @override
 */
TypePrototype.resolveAll = function resolve() {
    var fields = this.fieldsArray, i = 0;
    while (i < fields.length)
        fields[i++].resolve();
    var oneofs = this.oneofsArray; i = 0;
    while (i < oneofs.length)
        oneofs[i++].resolve();
    return NamespacePrototype.resolve.call(this);
};

/**
 * @override
 */
TypePrototype.get = function get(name) {
    return NamespacePrototype.get.call(this, name) || this.fields && this.fields[name] || this.oneofs && this.oneofs[name] || null;
};

/**
 * @override
 */
TypePrototype.add = function add(object) {
    if (this.get(object.name))
        throw Error("duplicate name '" + object.name + '" in ' + this);
    if (object instanceof Field && object.extend === undefined) {
        // NOTE: Extension fields aren't actual fields on the declaring type, but nested objects.
        // The root object takes care of adding distinct sister-fields to the respective extended
        // type instead.
        if (object.parent)
            object.parent.remove(object);
        this.fields[object.name] = object;
        object.message = this;
        object.onAdd(this);
        return clearCache(this);
    }
    if (object instanceof OneOf) {
        if (!this.oneofs)
            this.oneofs = {};
        this.oneofs[object.name] = object;
        object.onAdd(this);
        return clearCache(this);
    }
    return NamespacePrototype.add.call(this, object);
};

/**
 * @override
 */
TypePrototype.remove = function remove(object) {
    if (object instanceof Field && object.extend === undefined) {
        // See Type#add for the reason why extension fields are excluded here.
        if (this.fields[object.name] !== object)
            throw Error(object + " is not a member of " + this);
        delete this.fields[object.name];
        object.message = null;
        return clearCache(this);
    }
    return NamespacePrototype.remove.call(this, object);
};

/**
 * Creates a new message of this type using the specified properties.
 * @param {Object} [properties] Properties to set
 * @param {?Function} [ctor] Constructor to use.
 * Defaults to use the internal constuctor.
 * @returns {Prototype} Message instance
 */
TypePrototype.create = function create(properties, ctor) {
    if (typeof properties === 'function') {
        ctor = properties;
        properties = undefined;
    } else if (properties /* already */ instanceof Prototype)
        return properties;
    if (ctor) {
        if (!(ctor.prototype instanceof Prototype))
            throw util._TypeError("ctor", "a constructor inheriting from Prototype");
    } else
        ctor = this.ctor;
    return new ctor(properties);
};

/**
 * Encodes a message of this type.
 * @param {Prototype|Object} message Message instance or plain object
 * @param {Writer} [writer] Writer to encode to
 * @returns {Writer} writer
 */
TypePrototype.encode = function encode(message, writer) {
    var encoder = new Encoder(this);
    this.encode = codegen.supported
        ? encoder.generate()
        : encoder.encode;
    return this.encode(message, writer);
};

/**
 * Encodes a message of this type preceeded by its byte length as a varint.
 * @param {Prototype|Object} message Message instance or plain object
 * @param {Writer} [writer] Writer to encode to
 * @returns {Writer} writer
 */
TypePrototype.encodeDelimited = function encodeDelimited(message, writer) {
    return this.encode(message, writer).ldelim();
};

/**
 * Decodes a message of this type.
 * @param {Reader|number[]} readerOrBuffer Reader or buffer to decode from
 * @param {number} [length] Length of the message, if known beforehand
 * @returns {Prototype} Decoded message
 */
TypePrototype.decode = function decode(readerOrBuffer, length) {
    var decoder = new Decoder(this);
    this.decode = codegen.supported
        ? decoder.generate()
        : decoder.decode;
    return this.decode(readerOrBuffer, length);
};

/**
 * Decodes a message of this type preceeded by its byte length as a varint.
 * @param {Reader|number[]} readerOrBuffer Reader or buffer to decode from
 * @returns {Prototype} Decoded message
 */
TypePrototype.decodeDelimited = function decodeDelimited(readerOrBuffer) {
    readerOrBuffer = readerOrBuffer instanceof Reader ? readerOrBuffer : Reader(readerOrBuffer);
    return this.decode(readerOrBuffer, readerOrBuffer.uint32());
};

/**
 * Verifies that enum values are valid and that any required fields are present.
 * @param {Prototype|Object} message Message to verify
 * @returns {?string} `null` if valid, otherwise the reason why it is not
 */
TypePrototype.verify = function verify(message) {
    var verifier = new Verifier(this);
    this.verify = codegen.supported
        ? verifier.generate()
        : verifier.verify;
    return this.verify(message);
};

},{"11":11,"13":13,"14":14,"16":16,"2":2,"20":20,"23":23,"3":3,"4":4,"5":5,"6":6,"9":9}],19:[function(require,module,exports){
"use strict";

/**
 * Common type constants.
 * @namespace
 */
var types = module.exports = {};

var s = [
    "double",   // 0
    "float",    // 1
    "int32",    // 2
    "uint32",   // 3
    "sint32",   // 4
    "fixed32",  // 5
    "sfixed32", // 6
    "int64",    // 7
    "uint64",   // 8
    "sint64",   // 9
    "fixed64",  // 10
    "sfixed64", // 11
    "bool",     // 12
    "string",   // 13
    "bytes"     // 14
];

function bake(values, offset) {
    var i = 0, o = {};
    offset |= 0;
    while (i < values.length) o[s[i + offset]] = values[i++];
    return o;
}

/**
 * Basic type wire types.
 * @type {Object.<string,number>}
 */
types.basic = bake([
    /* double   */ 1,
    /* float    */ 5,
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 5,
    /* sfixed32 */ 5,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1,
    /* bool     */ 0,
    /* string   */ 2,
    /* bytes    */ 2
]);

var emptyArray = [];
if (Object.freeze)
    Object.freeze(emptyArray);

/**
 * Basic type defaults.
 * @type {Object.<string,*>}
 */
types.defaults = bake([
    /* double   */ 0,
    /* float    */ 0,
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 0,
    /* sfixed32 */ 0,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 0,
    /* sfixed64 */ 0,
    /* bool     */ false,
    /* string   */ "",
    /* bytes    */ emptyArray
]);

/**
 * Basic long type wire types.
 * @type {Object.<string,number>}
 */
types.long = bake([
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1
], 7);

/**
 * Allowed types for map keys with their associated wire type.
 * @type {Object.<string,number>}
 */
types.mapKey = bake([
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 5,
    /* sfixed32 */ 5,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1,
    /* bool     */ 0,
    /* string   */ 2
], 2);

/**
 * Allowed types for packed repeated fields with their associated wire type.
 * @type {Object.<string,number>}
 */
types.packed = bake([
    /* int32    */ 0,
    /* uint32   */ 0,
    /* sint32   */ 0,
    /* fixed32  */ 5,
    /* sfixed32 */ 5,
    /* int64    */ 0,
    /* uint64   */ 0,
    /* sint64   */ 0,
    /* fixed64  */ 1,
    /* sfixed64 */ 1,
    /* bool     */ 0
], 2);

},{}],20:[function(require,module,exports){
"use strict";

/**
 * Utility functions.
 * @namespace
 */
var util = module.exports = {};

var codegen  = require(21),
    LongBits = require(22);

util.codegen  = codegen;
util.LongBits = LongBits;

/**
 * Optional buffer class to use.
 * If you assign any compatible buffer implementation to this property, the library will use it.
 * @type {?Function}
 */
util.Buffer = null;

try { util.Buffer = require("buffer").Buffer; } catch (e) {} // eslint-disable-line no-empty

/**
 * Optional Long class to use.
 * If you assign any compatible long implementation to this property, the library will use it.
 * @type {?Function}
 */
util.Long = null;

try { util.Long = require("long"); } catch (e) {} // eslint-disable-line no-empty

/**
 * Tests if the specified value is a string.
 * @memberof util
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a string
 */
function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

util.isString = isString;

/**
 * Tests if the specified value is a non-null object.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a non-null object
 */
util.isObject = function isObject(value) {
    return Boolean(value && typeof value === 'object');
};

/**
 * Tests if the specified value is an integer.
 * @function
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is an integer
 */
util.isInteger = Number.isInteger || function isInteger(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
};

/**
 * Converts an object's values to an array.
 * @param {Object.<string,*>} object Object to convert
 * @returns {Array.<*>} Converted array
 */
util.toArray = function toArray(object) {
    if (!object)
        return [];
    var names = Object.keys(object),
        length = names.length;
    var array = new Array(length);
    for (var i = 0; i < length; ++i)
        array[i] = object[names[i]];
    return array;
};

/**
 * Creates a type error.
 * @param {string} name Argument name
 * @param {string} [description=a string] Expected argument descripotion
 * @returns {TypeError} Created type error
 * @private
 */
util._TypeError = function(name, description) {
    return TypeError(name + " must be " + (description || "a string"));
};

/**
 * Returns a promise from a node-style function.
 * @memberof util
 * @param {function(Error, ...*)} fn Function to call
 * @param {Object} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
function asPromise(fn, ctx/*, varargs */) {
    var args = [];
    for (var i = 2; i < arguments.length; ++i)
        args.push(arguments[i]);
    return new Promise(function(resolve, reject) {
        fn.apply(ctx, args.concat(
            function(err/*, varargs */) {
                if (err) reject(err);
                else resolve.apply(null, Array.prototype.slice.call(arguments, 1));
            }
        ));
    });
}

util.asPromise = asPromise;

/**
 * Fetches the contents of a file.
 * @memberof util
 * @param {string} path File path or url
 * @param {function(?Error, string=)} [callback] Node-style callback
 * @returns {Promise<string>|undefined} Promise if callback has been omitted 
 */
function fetch(path, callback) {
    if (!callback)
        return asPromise(fetch, util, path);
    var fs; try { fs = require("fs"); } catch (e) {} // eslint-disable-line no-empty
    if (fs && fs.readFile)
        return fs.readFile(path, "utf8", callback);
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        if (xhr.status !== 0 && xhr.status !== 200)
            return callback(Error("status " + xhr.status));
        if (isString(xhr.responseText))
            return callback(null, xhr.responseText);
        return callback(Error("request failed"));
    };
    xhr.onerror = function() {
        return callback(Error("request failed"));
    };
    xhr.open("GET", path, true);
    xhr.send();
    return undefined;
}

util.fetch = fetch;

/**
 * Tests if the specified path is absolute.
 * @memberof util
 * @param {string} path Path to test
 * @returns {boolean} `true` if path is absolute
 */
function isAbsolutePath(path) {
    return /^(?:\/|[a-zA-Z0-9]+:)/.test(path);
}

util.isAbsolutePath = isAbsolutePath;

/**
 * Normalizes the specified path.
 * @memberof util
 * @param {string} path Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(path) {
    path = path.replace(/\\/g, '/')
               .replace(/\/{2,}/g, '/');
    var parts = path.split('/');
    var abs = isAbsolutePath(path);
    var prefix = "";
    if (abs)
        prefix = parts.shift() + '/';
    for (var i = 0; i < parts.length;) {
        if (parts[i] === '..') {
            if (i > 0)
                parts.splice(--i, 2);
            else if (abs)
                parts.splice(i, 1);
            else
                ++i;
        } else if (parts[i] === '.')
            parts.splice(i, 1);
        else
            ++i;
    }
    return prefix + parts.join('/');
}

util.normalizePath = normalizePath;

/**
 * Resolves the specified include path against the specified origin path.
 * @param {string} originPath Path that was used to fetch the origin file
 * @param {string} importPath Import path specified in the origin file
 * @param {boolean} [alreadyNormalized] `true` if both paths are already known to be normalized
 * @returns {string} Path to the imported file
 */
util.resolvePath = function resolvePath(originPath, importPath, alreadyNormalized) {
    if (!alreadyNormalized)
        importPath = normalizePath(importPath);
    if (isAbsolutePath(importPath))
        return importPath;
    if (!alreadyNormalized)
        originPath = normalizePath(originPath);
    originPath = originPath.replace(/\/[^/]+$/, '');
    return originPath.length ? normalizePath(originPath + '/' + importPath) : importPath;
};

/**
 * Converts a number or long to an 8 characters long hash string.
 * @param {Long|number} value Value to convert
 * @returns {string} Hash
 */
util.longToHash = function longToHash(value) {
    return value
        ? LongBits.from(value).toHash()
        : '\0\0\0\0\0\0\0\0';
};

/**
 * Converts an 8 characters long hash string to a long or number.
 * @param {string} hash Hash
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long|number} Original value
 */
util.longFromHash = function longFromHash(hash, unsigned) {
    var bits = LongBits.fromHash(hash);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
};

/**
 * Tests if two possibly long values are not equal.
 * @param {number|Long} a First value
 * @param {number|Long} b Second value
 * @returns {boolean} `true` if not equal
 */
util.longNeq = function longNeq(a, b) {
    return typeof a === 'number'
         ? typeof b === 'number'
            ? a !== b
            : (a = LongBits.fromNumber(a)).lo !== b.low || a.hi !== b.high
         : typeof b === 'number'
            ? (b = LongBits.fromNumber(b)).lo !== a.low || b.hi !== a.high
            : a.low !== b.low || a.high !== b.high;
};

/**
 * Merges the properties of the source object into the destination object.
 * @param {Object} dst Destination object
 * @param {Object} src Source object
 * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
 * @returns {Object} Destination object
 */
util.merge = function merge(dst, src, ifNotSet) {
    if (src) {
        var keys = Object.keys(src);
        for (var i = 0; i < keys.length; ++i)
            if (dst[keys[i]] === undefined || !ifNotSet)
                dst[keys[i]] = src[keys[i]];
    }
    return dst;
};

/**
 * Returns a safe property accessor for the specified properly name.
 * @param {string} prop Property name
 * @returns {string} Safe accessor
 */
util.safeProp = function safeProp(prop) {
    return /^[a-z_$][a-z0-9_$]*$/i.test(prop) ? "." + prop : "['" + prop.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "']";
};

},{"21":21,"22":22,"buffer":"buffer","long":"long","undefined":undefined}],21:[function(require,module,exports){
"use strict";
module.exports = codegen;

var blockOpenRe  = /[\{\[]$/,
    blockCloseRe = /^[\}\]]/,
    casingRe     = /[\:]$/,
    branchRe     = /^\s*(?:if|else if|while|for)\b|\b(?:else)\s*$/,
    breakRe      = /\b(?:break|continue);?$|^\s*return\b/;

/**
 * Programmatically generates a function.
 * @memberof util
 * @param {...string} params Function parameter names
 * @returns {util.CodegenAppender} Printf-like appender function
 * @property {boolean} supported Whether code generation is supported by the environment.
 * @property {boolean} verbose=false When set to true, codegen will log generated code to console. Useful for debugging.
 */
function codegen(/* varargs */) {
    var args   = Array.prototype.slice.call(arguments),
        src    = ['\t"use strict";'];

    var indent = 1,
        inCase = false;

    /**
     * Appends a printf-like formatted line to the generated source. Returned when calling {@link util.codegen}.
     * @typedef CodegenAppender
     * @memberof util
     * @type {function}
     * @param {string} format A printf-like format string
     * @param {...*} params Format replacements
     * @returns {util.CodegenAppender} Itself
     * @property {util.CodegenStringer} str
     * @property {util.CodegenEnder} eof
     * @see {@link https://nodejs.org/docs/latest/api/util.html#util_util_format_format_args}
     */
    /**/
    function gen() {
        var fmt = [];
        for (var i = 0; i < arguments.length; ++i)
            fmt[i] = arguments[i];
        var line = gen.fmt.apply(null, fmt);
        var level = indent;
        if (src.length) {
            var prev = src[src.length - 1];

            // block open or one time branches
            if (blockOpenRe.test(prev))
                level = ++indent; // keep
            else if (branchRe.test(prev))
                ++level; // once
            
            // casing
            if (casingRe.test(prev) && !casingRe.test(line)) {
                level = ++indent;
                inCase = true;
            } else if (inCase && breakRe.test(prev)) {
                level = --indent;
                inCase = false;
            }

            // block close
            if (blockCloseRe.test(line)) {
                level = --indent;
                if (inCase) {
                    level = --indent;
                    inCase = false;
                }
            }
        }
        for (var index = 0; index < level; ++index)
            line = "\t" + line;
        src.push(line);
        return gen;
    }

    gen.fmt = function fmt(format) {
        var params = Array.prototype.slice.call(arguments, 1),
            index  = 0;
        return format.replace(/%([djs])/g, function($0, $1) {
            var param = params[index++];
            return $1 === "j"
                ? JSON.stringify(param)
                : String(param);
        });
    };

    /**
     * Stringifies the so far generated function source.
     * @typedef CodegenStringer
     * @memberof util
     * @type {function}
     * @param {string} [name] Function name, defaults to generate an anonymous function
     * @returns {string} Function source using tabs for indentation
     */
    /**/
    gen.str = function str(name) {
        return "function " + (name ? name.replace(/[^\w_$]/g, "_") : "") + "(" + args.join(",") + ") {\n" + src.join("\n") + "\n}";
    };

    /**
     * Ends generation and builds the function.
     * @typedef CodegenEnder
     * @memberof util
     * @type {function}
     * @param {string} [name] Function name, defaults to generate an anonymous function
     * @param {Object|Array.<string>} [scope] Function scope
     * @returns {function} A function to apply the scope manually when `scope` is an array, otherwise the generated function with scope applied
     */
    /**/
    gen.eof = function eof(name, scope) {
        if (name && typeof name === 'object') {
            scope = name;
            name = undefined;
        }
        var code = gen.str(name);
        if (codegen.verbose)
            console.log("--- codegen ---\n" + code.replace(/^/mg, "> ").replace(/\t/g, "  ")); // eslint-disable-line no-console
        code = "return " + code;
        var params, values = [];
        if (Array.isArray(scope)) {
            params = scope.slice();
        } else if (scope) {
            params = Object.keys(scope);
            values = params.map(function(key) { return scope[key]; });
        } else
            params = [];
        var fn = Function.apply(null, params.concat(code)); // eslint-disable-line no-new-func
        return values ? fn.apply(null, values) : fn();
    };

    return gen;
}

codegen.supported = false;
try { codegen.supported = codegen("a","b")("return a-b").eof()(2,1) === 1; } catch (e) {} // eslint-disable-line no-empty

codegen.verbose = false;

},{}],22:[function(require,module,exports){
"use strict";
module.exports = LongBits;

/**
 * Constructs new long bits.
 * @classdesc Helper class for working with the low and high bits of a 64 bit value.
 * @memberof util
 * @constructor
 * @param {number} lo Low bits
 * @param {number} hi High bits
 */
function LongBits(lo, hi) {
    // make sure to always call this with unsigned 32bits for proper optimization

    /**
     * Low bits.
     * @type {number}
     */
    this.lo = lo;

    /**
     * High bits.
     * @type {number}
     */
    this.hi = hi;
}

/** @alias util.LongBits.prototype */
var LongBitsPrototype = LongBits.prototype;

/**
 * Zero bits.
 * @memberof util.LongBits
 * @type {util.LongBits}
 */
var zero = new LongBits(0, 0);

zero.toNumber = function() { return 0; };
zero.zzEncode = zero.zzDecode = function() { return this; };
zero.length = function() { return 1; };

/**
 * Constructs new long bits from the specified number.
 * @param {number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.fromNumber = function fromNumber(value) {
    if (value === 0)
        return zero;
    var sign  = value < 0;
        value = Math.abs(value);
    var lo = value >>> 0,
        hi = (value - lo) / 4294967296 >>> 0;
    if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
            lo = 0;
            if (++hi > 4294967295)
                hi = 0;
        }
    }
    return new LongBits(lo, hi);
};

/**
 * Constrcuts new long bits from a number or long.
 * @param {Long|number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.from = function from(value) {
    return typeof value === 'number'
        ? LongBits.fromNumber(value)
        : new LongBits(value.low >>> 0, value.high >>> 0);
};

/**
 * Converts this long bits to a possibly unsafe JavaScript number.
 * @param {boolean} unsigned Whether unsigned or not
 * @returns {number} Possibly unsafe number
 */
LongBitsPrototype.toNumber = function toNumber(unsigned) {
    if (!unsigned && this.hi >>> 31) {
        this.lo = ~this.lo + 1 >>> 0;
        this.hi = ~this.hi     >>> 0;
        if (!this.lo)
            this.hi = this.hi + 1 >>> 0;
        return -(this.lo + this.hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
};

var charCodeAt = String.prototype.charCodeAt;

/**
 * Constructs new long bits from the specified 8 characters long hash.
 * @param {string} hash Hash
 * @returns {util.LongBits} Bits
 */
LongBits.fromHash = function fromHash(hash) {
    return new LongBits(
        ( charCodeAt.call(hash, 0)
        | charCodeAt.call(hash, 1) << 8
        | charCodeAt.call(hash, 2) << 16
        | charCodeAt.call(hash, 3) << 24) >>> 0
    ,
        ( charCodeAt.call(hash, 4)
        | charCodeAt.call(hash, 5) << 8
        | charCodeAt.call(hash, 6) << 16
        | charCodeAt.call(hash, 7) << 24) >>> 0
    );
};

/**
 * Converts this long bits to a 8 characters long hash.
 * @returns {string} Hash
 */
LongBitsPrototype.toHash = function toHash() {
    return String.fromCharCode(
        this.lo        & 255,
        this.lo >>> 8  & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24 & 255,
        this.hi        & 255,
        this.hi >>> 8  & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24 & 255
    );
};

/**
 * Zig-zag encodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBitsPrototype.zzEncode = function zzEncode() {
    var mask = -(this.hi >>> 31);
    this.hi  = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
    this.lo  = ( this.lo << 1                   ^ mask) >>> 0;
    return this;
};

/**
 * Zig-zag decodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBitsPrototype.zzDecode = function zzDecode() {
    var mask = -(this.lo & 1);
    this.lo  = ((this.lo >>> 1 | (this.hi & 1) << 31) ^ mask) >>> 0;
    this.hi  = ( this.hi >>> 1                        ^ mask) >>> 0;
    return this;
};

/**
 * Calculates the length of this longbits when encoded as a varint.
 * @returns {number} Length
 */
LongBitsPrototype.length = function length() {
    var part0 =  this.lo,
        part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
        part2 =  this.hi >>> 24;
    if (part2 === 0) {
        if (part1 === 0)
            return part0 < 1 << 14
                ? part0 < 1 << 7 ? 1 : 2
                : part0 < 1 << 21 ? 3 : 4;
        return part1 < 1 << 14
            ? part1 < 1 << 7 ? 5 : 6
            : part1 < 1 << 21 ? 7 : 8;
    }
    return part2 < 1 << 7 ? 9 : 10;
};

},{}],23:[function(require,module,exports){
"use strict";
module.exports = Verifier;

var Enum = require(4),
    Type = require(18),
    util = require(20);

/**
 * Constructs a new verifier for the specified message type.
 * @classdesc Runtime message verifier using code generation on top of reflection
 * @constructor
 * @param {Type} type Message type
 */
function Verifier(type) {

    /**
     * Message type.
     * @type {Type}
     */
    this.type = type;
}

/** @alias Verifier.prototype */
var VerifierPrototype = Verifier.prototype;

// This is here to mimic Type so that fallback functions work without having to bind()
Object.defineProperties(VerifierPrototype, {

    /**
     * Fields of this verifier's message type as an array for iteration.
     * @name Verifier#fieldsArray
     * @type {Field[]}
     * @readonly
     */
    fieldsArray: {
        get: function() {
            return this.type.fieldsArray;
        }
    },

    /**
     * Full name of this verifier's message type.
     * @name Verifier#fullName
     * @type {string}
     * @readonly
     */
    fullName: {
        get: function() {
            return this.type.fullName;
        }
    }
});

/**
 * Verifies a runtime message of this verifier's message type.
 * @param {Prototype|Object} message Runtime message or plain object to verify
 * @returns {?string} `null` if valid, otherwise the reason why it is not
 */
VerifierPrototype.verify = function verify_fallback(message) {
    var fields = this.fieldsArray,
        i = 0;
    while (i < fields.length) {
        var field = fields[i++].resolve(),
            value = message[field.name];

        if (value === undefined) {
            if (field.required)
                return "missing required field " + field.name + " in " + this.fullName;

        } else if (field.resolvedType instanceof Enum && field.resolvedType.valuesById[value] === undefined) {
            return "invalid enum value " + field.name + " = " + value + " in " + this.fullName;

        } else if (field.resolvedType instanceof Type) {
            if (!value && field.required)
                return "missing required field " + field.name + " in " + this.fullName;
            var reason;
            if ((reason = field.resolvedType.verify(value)) !== null)
                return reason;
        }
    }
    return null;
};

/**
 * Generates a verifier specific to this verifier's message type.
 * @returns {function} Verifier function with an identical signature to {@link Verifier#verify}
 */
VerifierPrototype.generate = function generate() {
    /* eslint-disable no-unexpected-multiline */
    var fields = this.type.fieldsArray;
    var gen = util.codegen("m");
    var hasReasonVar = false;

    for (var i = 0; i < fields.length; ++i) {
        var field = fields[i].resolve(),
            prop  = util.safeProp(field.name);
        if (field.required) { gen

            ("if(m%s===undefined)", prop)
                ("return 'missing required field %s in %s'", field.name, this.type.fullName);

        } else if (field.resolvedType instanceof Enum) {
            var values = util.toArray(field.resolvedType.values); gen

            ("switch(m%s){", prop)
                ("default:")
                    ("return 'invalid enum value %s = '+m%s+' in %s'", field.name, prop, this.type.fullName);

            for (var j = 0, l = values.length; j < l; ++j) gen
                ("case %d:", values[j]); gen
            ("}");

        } else if (field.resolvedType instanceof Type) {
            if (field.required) gen

            ("if(!m%s)", prop)
                ("return 'missing required field %s in %s'", field.name, this.type.fullName);

            if (!hasReasonVar) { gen("var r"); hasReasonVar = true; } gen

            ("if((r=types[%d].verify(m%s))!==null)", i, prop)
                ("return r");
        }
    }
    return gen
    ("return null")

    .eof(this.type.fullName + "$verify", {
        types : fields.map(function(fld) { return fld.resolvedType; })
    });
    /* eslint-enable no-unexpected-multiline */
};

},{"18":18,"20":20,"4":4}],24:[function(require,module,exports){
"use strict";
module.exports = Writer;

Writer.BufferWriter = BufferWriter;

var util     = require(20),
    ieee754  = require(1);
var LongBits = util.LongBits;

/**
 * Operation function.
 * @typedef Fn
 * @memberof Writer.Op
 * @function
 * @param {number[]} buf Buffer to write to
 * @param {number} pos Position to write at
 * @param {*} val Value to write
 * @returns {undefined}
 */

/**
 * Constructs a new writer operation.
 * @classdesc Scheduled writer operation.
 * @memberof Writer
 * @constructor
 * @param {Writer.Op.Fn} fn Function to call
 * @param {*} val Value to write
 * @param {number} len Value byte length
 * @private
 * @ignore
 */
function Op(fn, val, len) {

    /**
     * Function to call.
     * @type {Writer.Op.Fn}
     */
    this.fn = fn;

    /**
     * Value to write.
     * @type {*}
     */
    this.val = val;

    /**
     * Value byte length.
     * @type {number}
     */
    this.len = len;

    /**
     * Next operation.
     * @type {?Writer.Op}
     */
    this.next = null;
}

Writer.Op = Op;

function noop() {} // eslint-disable-line no-empty-function

/**
 * Constructs a new writer state.
 * @classdesc Copied writer state.
 * @memberof Writer
 * @constructor
 * @param {Writer} writer Writer to copy state from
 * @private
 * @ignore
 */
function State(writer) {

    /**
     * Current head.
     * @type {Writer.Op}
     */
    this.head = writer.head;

    /**
     * Current tail.
     * @type {Writer.Op}
     */
    this.tail = writer.tail;

    /**
     * Current buffer length.
     * @type {number}
     */
    this.len = writer.len;
}

Writer.State = State;

var ArrayImpl =  typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

/**
 * Constructs a new writer.
 * When called as a function, returns an appropriate writer for the current environment.
 * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
 * @exports Writer
 * @constructor
 */
function Writer() {
    if (!(this instanceof Writer))
        return util.Buffer
            ? new BufferWriter()
            : new Writer();

    /**
     * Current length.
     * @type {number}
     */
    this.len = 0;

    /**
     * Operations head.
     * @type {Object}
     */
    this.head = new Op(noop, 0, 0);

    /**
     * Operations tail
     * @type {Object}
     */
    this.tail = this.head;

    /**
     * State stack.
     * @type {Object[]}
     */
    this.stack = [];

    // When a value is written, the writer calculates its byte length and puts it into a linked
    // list of operations to perform when finish() is called. This both allows us to allocate
    // buffers of the exact required size and reduces the amount of work we have to do compared
    // to first calculating over objects and then encoding over objects. In our case, the encoding
    // part is just a linked list walk calling linked operations with already prepared values.
}

/** @alias Writer.prototype */
var WriterPrototype = Writer.prototype;

/**
 * Pushes a new operation to the queue.
 * @param {function} fn Function to call
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.push = function push(fn, len, val) {
    var op = new Op(fn, val, len);
    this.tail.next = op;
    this.tail = op;
    this.len += len;
    return this;
};

function writeByte(buf, pos, val) {
    buf[pos] = val;
}

/**
 * Writes a tag.
 * @param {number} id Field id
 * @param {number} wireType Wire type
 * @returns {Writer} `this`
 */
WriterPrototype.tag = function write_tag(id, wireType) {
    return this.push(writeByte, 1, (id << 3 | wireType & 7) & 255);
};

function writeVarint32(buf, pos, val) {
    while (val > 127) {
        buf[pos++] = val & 127 | 128;
        val >>>= 7;
    }
    buf[pos] = val;
}

/**
 * Writes an unsigned 32 bit value as a varint.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.uint32 = function write_uint32(value) {
    value >>>= 0;
    return this.push(writeVarint32,
          value < 128       ? 1
        : value < 16384     ? 2
        : value < 2097152   ? 3
        : value < 268435456 ? 4
        :                     5
    , value);
};

/**
 * Writes a signed 32 bit value as a varint.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.int32 = WriterPrototype.uint32;

/**
 * Writes a 32 bit value as a varint, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.sint32 = function write_sint32(value) {
    return this.uint32(value << 1 ^ value >> 31);
};

function writeVarint64(buf, pos, val) {
    // tends to deoptimize. stays optimized when using bits directly.
    while (val.hi || val.lo > 127) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
    }
    buf[pos++] = val.lo;
}

/**
 * Writes an unsigned 64 bit value as a varint.
 * @param {Long|number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.uint64 = function write_uint64(value) {
    var bits;
    if (typeof value === 'number')
        bits = value ? LongBits.fromNumber(value) : LongBits.zero;
    else
        bits = new LongBits(value.low >>> 0, value.high >>> 0);
    return this.push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a signed 64 bit value as a varint.
 * @function
 * @param {Long|number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.int64 = WriterPrototype.uint64;

/**
 * Writes a signed 64 bit value as a varint, zig-zag encoded.
 * @param {Long|number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.sint64 = function sint64(value) {
    var bits = LongBits.from(value).zzEncode();
    return this.push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a boolish value as a varint.
 * @param {boolean} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.bool = function write_bool(value) {
    return this.push(writeByte, 1, value ? 1 : 0);
};

function writeFixed32(buf, pos, val) {
    buf[pos++] =  val         & 255;
    buf[pos++] =  val >>> 8   & 255;
    buf[pos++] =  val >>> 16  & 255;
    buf[pos  ] =  val >>> 24  & 255;
}

/**
 * Writes a 32 bit value as fixed 32 bits.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.fixed32 = function write_fixed32(value) {
    return this.push(writeFixed32, 4, value >>> 0);
};

/**
 * Writes a 32 bit value as fixed 32 bits, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.sfixed32 = function write_sfixed32(value) {
    return this.push(writeFixed32, 4, value << 1 ^ value >> 31);
};

function writeFixed64(buf, pos, val) {
    buf[pos++] = val.lo        & 255;
    buf[pos++] = val.lo >>> 8  & 255;
    buf[pos++] = val.lo >>> 16 & 255;
    buf[pos++] = val.lo >>> 24      ;
    buf[pos++] = val.hi        & 255;
    buf[pos++] = val.hi >>> 8  & 255;
    buf[pos++] = val.hi >>> 16 & 255;
    buf[pos  ] = val.hi >>> 24      ;
}

/**
 * Writes a 64 bit value as fixed 64 bits.
 * @param {Long|number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.fixed64 = function write_fixed64(value) {
    return this.push(writeFixed64, 8, LongBits.from(value));
};

/**
 * Writes a 64 bit value as fixed 64 bits, zig-zag encoded.
 * @param {Long|number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.sfixed64 = function write_sfixed64(value) {
    return this.push(writeFixed64, 8, LongBits.from(value).zzEncode());
};

function writeFloat(buf, pos, val) {
    ieee754.write(buf, val, pos, false, 23, 4);
}

/**
 * Writes a float (32 bit).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.float = function write_float(value) {
    return this.push(writeFloat, 4, value);
};

function writeDouble(buf, pos, val) {
    ieee754.write(buf, val, pos, false, 52, 8);
}

/**
 * Writes a double (64 bit float).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.double = function write_double(value) {
    return this.push(writeDouble, 8, value);
};

var writeBytes = ArrayImpl.prototype.set
    ? function writeBytesSet(buf, pos, val) { buf.set(val, pos); }
    : function writeBytesFor(buf, pos, val) { for (var i = 0; i < val.length; ++i) buf[pos + i] = val[i]; };

/**
 * Writes a sequence of bytes.
 * @param {number[]} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.bytes = function write_bytes(value) {
    var len = value.length >>> 0;
    return len
        ? this.uint32(len).push(writeBytes, len, value)
        : this.push(writeByte, 1, 0);
};

function writeString(buf, pos, val) {
    for (var i = 0, len = val.length, c1, c2; i < len; ++i) {
        c1 = val.charCodeAt(i);
        if (c1 < 128) {
            buf[pos++] = c1;
        } else if (c1 < 2048) {
            buf[pos++] = c1 >> 6 | 192;
            buf[pos++] = c1 & 63 | 128;
        } else if ((c1 & 0xFC00) === 0xD800 && i + 1 < len && ((c2 = val.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buf[pos++] = c1 >> 18      | 240;
            buf[pos++] = c1 >> 12 & 63 | 128;
            buf[pos++] = c1 >> 6  & 63 | 128;
            buf[pos++] = c1       & 63 | 128;
        } else {
            buf[pos++] = c1 >> 12      | 224;
            buf[pos++] = c1 >> 6  & 63 | 128;
            buf[pos++] = c1       & 63 | 128;
        }
    }
}

function byteLength(val) {
    var strlen = val.length >>> 0;
    if (strlen) {
        var len = 0;
        for (var i = 0, c1; i < strlen; ++i) {
            c1 = val.charCodeAt(i);
            if (c1 < 128)
                len += 1;
            else if (c1 < 2048)
                len += 2;
            else if ((c1 & 0xFC00) === 0xD800 && i + 1 < strlen && (val.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
                ++i;
                len += 4;
            } else
                len += 3;
        }
        return len;
    }
    return 0;
}

/**
 * Writes a string.
 * @param {string} value Value to write
 * @returns {Writer} `this`
 */
WriterPrototype.string = function write_string(value) {
    var len = byteLength(value);
    return len
        ? this.uint32(len).push(writeString, len, value)
        : this.push(writeByte, 1, 0);
};

/**
 * Forks this writer's state by pushing it to a stack and reusing the remaining buffer
 * for a new set of write operations. A call to {@link Writer#reset} or {@link Writer#finish}
 * resets the writer to the previous state.
 * @returns {Writer} `this`
 */
WriterPrototype.fork = function fork() {
    this.stack.push(new State(this));
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
};

/**
 * Resets this instance to the last state. If there is no last state, all references
 * to previous buffers will be cleared.
 * @returns {Writer} `this`
 */
WriterPrototype.reset = function reset() {
    if (this.stack.length) {
        var state = this.stack.pop();
        this.head = state.head;
        this.tail = state.tail;
        this.len  = state.len;
    } else {
        this.head = this.tail = new Op(noop, 0, 0);
        this.len  = 0;
    }
    return this;
};

/**
 * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
 * @param {number} [id] Id with wire type 2 to prepend where applicable
 * @returns {Writer} `this`
 */
WriterPrototype.ldelim = function ldelim(id) {
    var head = this.head,
        tail = this.tail,
        len  = this.len;
    this.reset();
    if (id !== undefined)
        this.tag(id, 2);
    this.uint32(len);
    this.tail.next = head.next; // skip noop
    this.tail = tail;
    this.len += len;
    return this;
};

/**
 * Finishes the current sequence of write operations and frees all resources.
 * @returns {number[]} Finished buffer
 */
WriterPrototype.finish = function finish() {
    var head = this.head.next, // skip noop
        buf  = new ArrayImpl(this.len),
        pos  = 0;
    this.reset();
    while (head) {
        head.fn(buf, pos, head.val);
        pos += head.len;
        head = head.next;
    }
    return buf;
};

/**
 * Constructs a new buffer writer.
 * @classdesc Wire format writer using node buffers.
 * @exports BufferWriter
 * @extends Writer
 * @constructor
 */
function BufferWriter() {
    Writer.call(this);
}

/** @alias BufferWriter.prototype */
var BufferWriterPrototype = BufferWriter.prototype = Object.create(Writer.prototype);
BufferWriterPrototype.constructor = BufferWriter;

function writeFloatBuffer(buf, pos, val) {
    buf.writeFloatLE(val, pos, true);
}

/**
 * Writes a float (32 bit) using node buffers.
 * @param {number} value Value to write
 * @returns {BufferWriter} `this`
 */
BufferWriterPrototype.float = function write_float_buffer(value) {
    return this.push(writeFloatBuffer, 4, value);
};

function writeDoubleBuffer(buf, pos, val) {
    buf.writeDoubleLE(val, pos, true);
}

/**
 * Writes a double (64 bit float) using node buffers.
 * @param {number} value Value to write
 * @returns {BufferWriter} `this`
 */
BufferWriterPrototype.double = function write_double_buffer(value) {
    return this.push(writeDoubleBuffer, 8, value);
};

function writeBytesBuffer(buf, pos, val) {
    if (val.length)
        val.copy(buf, pos, 0, val.length);
}

/**
 * Writes a sequence of bytes using node buffers.
 * @param {Buffer} value Value to write
 * @returns {BufferWriter} `this`
 */
BufferWriterPrototype.bytes = function write_bytes_buffer(value) {
    var len = value.length >>> 0;
    return len
        ? this.uint32(len).push(writeBytesBuffer, len, value)
        : this.push(writeByte, 1, 0);
};

function writeStringBuffer(buf, pos, val) {
    buf.write(val, pos);
}

/**
 * Writes a string using node buffers.
 * @param {string} value Value to write
 * @returns {BufferWriter} `this`
 */
BufferWriterPrototype.string = function write_string_buffer(value) {
    var len = byteLength(value);
    return len
        ? this.uint32(len).push(writeStringBuffer, len, value)
        : this.push(writeByte, 1, 0);
};

/**
 * Finishes the current sequence of write operations using node buffers and frees all resources.
 * @returns {Buffer} Finished buffer
 */
BufferWriterPrototype.finish = function finish_buffer() {
    var head = this.head.next, // skip noop
        buf  = util.Buffer.allocUnsafe && util.Buffer.allocUnsafe(this.len) || new util.Buffer(this.len),
        pos  = 0;
    this.reset();
    while (head) {
        head.fn(buf, pos, head.val);
        pos += head.len;
        head = head.next;
    }
    return buf;
};

},{"1":1,"20":20}],25:[function(require,module,exports){
(function (global){
"use strict";
var protobuf = global.protobuf = exports;

var util = require(20);

/**
 * Loads one or multiple .proto or preprocessed .json files into a common root namespace.
 * @param {string|string[]} filename One or multiple files to load
 * @param {Root} [root] Root namespace, defaults to create a new one if omitted.
 * @param {function(?Error, Root=)} [callback] Callback function
 * @returns {Promise<Root>|Object} A promise if callback has been omitted, otherwise the protobuf namespace
 * @throws {TypeError} If arguments are invalid
 */
function load(filename, root, callback) {
    if (typeof root === 'function') {
        callback = root;
        root = new protobuf.Root();
    } else if (!root)
        root = new protobuf.Root();
    return root.load(filename, callback) || protobuf;
}

protobuf.load = load;

// Parser
protobuf.tokenize         = require(17);
protobuf.parse            = require(12);

// Serialization
protobuf.Writer           = require(24);
protobuf.BufferWriter     = protobuf.Writer.BufferWriter;
protobuf.Reader           = require(14);
protobuf.BufferReader     = protobuf.Reader.BufferReader;
protobuf.Encoder          = require(3);
protobuf.Decoder          = require(2);

// Reflection
protobuf.ReflectionObject = require(10);
protobuf.Namespace        = require(9);
protobuf.Root             = require(15);
protobuf.Enum             = require(4);
protobuf.Type             = require(18);
protobuf.Field            = require(5);
protobuf.OneOf            = require(11);
protobuf.MapField         = require(7);
protobuf.Service          = require(16);
protobuf.Method           = require(8);

// Runtime
protobuf.Prototype        = require(13);
protobuf.inherits         = require(6);

// Utility
protobuf.types            = require(19);
protobuf.util             = util;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"10":10,"11":11,"12":12,"13":13,"14":14,"15":15,"16":16,"17":17,"18":18,"19":19,"2":2,"20":20,"24":24,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9}]},{},[25])


//# sourceMappingURL=protobuf.js.map
