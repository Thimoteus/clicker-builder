(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":1,"ieee754":5,"isarray":4}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":2}],7:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],8:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":12}],9:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":29}],10:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":15}],11:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":20,"is-object":7}],12:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":18,"../vnode/is-vnode.js":21,"../vnode/is-vtext.js":22,"../vnode/is-widget.js":23,"./apply-properties":11,"global/document":6}],13:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],14:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":23,"../vnode/vpatch.js":26,"./apply-properties":11,"./update-widget":16}],15:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":12,"./dom-index":13,"./patch-op":14,"global/document":6,"x-is-array":30}],16:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":23}],17:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],18:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":19,"./is-vnode":21,"./is-vtext":22,"./is-widget":23}],19:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],20:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],21:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":24}],22:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":24}],23:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],24:[function(require,module,exports){
module.exports = "2"

},{}],25:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":19,"./is-vhook":20,"./is-vnode":21,"./is-widget":23,"./version":24}],26:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":24}],27:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":24}],28:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":20,"is-object":7}],29:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":18,"../vnode/is-thunk":19,"../vnode/is-vnode":21,"../vnode/is-vtext":22,"../vnode/is-widget":23,"../vnode/vpatch":26,"./diff-props":28,"x-is-array":30}],30:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],31:[function(require,module,exports){
(function (Buffer){
// Generated by psc-bundle 0.8.0.0
var PS = { };
(function(exports) {
  /* global exports */
  "use strict";

  // module Prelude

  //- Functor --------------------------------------------------------------------

  exports.arrayMap = function (f) {
    return function (arr) {
      var l = arr.length;
      var result = new Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(arr[i]);
      }
      return result;
    };
  };

  //- Bind -----------------------------------------------------------------------

  exports.arrayBind = function (arr) {
    return function (f) {
      var result = [];
      for (var i = 0, l = arr.length; i < l; i++) {
        Array.prototype.push.apply(result, f(arr[i]));
      }
      return result;
    };
  };

  exports.concatArray = function (xs) {
    return function (ys) {
      return xs.concat(ys);
    };
  };

  exports.numAdd = function (n1) {
    return function (n2) {
      return n1 + n2;
    };
  };

  exports.numMul = function (n1) {
    return function (n2) {
      return n1 * n2;
    };
  };

  //- Eq -------------------------------------------------------------------------

  exports.refEq = function (r1) {
    return function (r2) {
      return r1 === r2;
    };
  };

  //- Ord ------------------------------------------------------------------------

  exports.unsafeCompareImpl = function (lt) {
    return function (eq) {
      return function (gt) {
        return function (x) {
          return function (y) {
            return x < y ? lt : x > y ? gt : eq;
          };
        };
      };
    };
  };                                          

  //- BooleanAlgebra -------------------------------------------------------------

  exports.boolOr = function (b1) {
    return function (b2) {
      return b1 || b2;
    };
  };

  exports.boolAnd = function (b1) {
    return function (b2) {
      return b1 && b2;
    };
  };

  exports.boolNot = function (b) {
    return !b;
  };

  //- Show -----------------------------------------------------------------------

  exports.showIntImpl = function (n) {
    return n.toString();
  };

  exports.showNumberImpl = function (n) {
    /* jshint bitwise: false */
    return n === (n | 0) ? n + ".0" : n.toString();
  };
 
})(PS["Prelude"] = PS["Prelude"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Prelude"];
  var LT = (function () {
      function LT() {

      };
      LT.value = new LT();
      return LT;
  })();
  var GT = (function () {
      function GT() {

      };
      GT.value = new GT();
      return GT;
  })();
  var EQ = (function () {
      function EQ() {

      };
      EQ.value = new EQ();
      return EQ;
  })();
  var Semigroupoid = function (compose) {
      this.compose = compose;
  };
  var Category = function (__superclass_Prelude$dotSemigroupoid_0, id) {
      this["__superclass_Prelude.Semigroupoid_0"] = __superclass_Prelude$dotSemigroupoid_0;
      this.id = id;
  };
  var Functor = function (map) {
      this.map = map;
  };
  var Apply = function (__superclass_Prelude$dotFunctor_0, apply) {
      this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
      this.apply = apply;
  };
  var Applicative = function (__superclass_Prelude$dotApply_0, pure) {
      this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
      this.pure = pure;
  };
  var Bind = function (__superclass_Prelude$dotApply_0, bind) {
      this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
      this.bind = bind;
  };
  var Monad = function (__superclass_Prelude$dotApplicative_0, __superclass_Prelude$dotBind_1) {
      this["__superclass_Prelude.Applicative_0"] = __superclass_Prelude$dotApplicative_0;
      this["__superclass_Prelude.Bind_1"] = __superclass_Prelude$dotBind_1;
  };
  var Semigroup = function (append) {
      this.append = append;
  };
  var Semiring = function (add, mul, one, zero) {
      this.add = add;
      this.mul = mul;
      this.one = one;
      this.zero = zero;
  };
  var Ring = function (__superclass_Prelude$dotSemiring_0, sub) {
      this["__superclass_Prelude.Semiring_0"] = __superclass_Prelude$dotSemiring_0;
      this.sub = sub;
  };
  var Eq = function (eq) {
      this.eq = eq;
  };
  var Ord = function (__superclass_Prelude$dotEq_0, compare) {
      this["__superclass_Prelude.Eq_0"] = __superclass_Prelude$dotEq_0;
      this.compare = compare;
  };
  var Bounded = function (bottom, top) {
      this.bottom = bottom;
      this.top = top;
  };
  var BooleanAlgebra = function (__superclass_Prelude$dotBounded_0, conj, disj, not) {
      this["__superclass_Prelude.Bounded_0"] = __superclass_Prelude$dotBounded_0;
      this.conj = conj;
      this.disj = disj;
      this.not = not;
  };
  var Show = function (show) {
      this.show = show;
  };
  var zero = function (dict) {
      return dict.zero;
  };
  var unsafeCompare = $foreign.unsafeCompareImpl(LT.value)(EQ.value)(GT.value);
  var unit = {};
  var top = function (dict) {
      return dict.top;
  };
  var sub = function (dict) {
      return dict.sub;
  };
  var $minus = function (dictRing) {
      return sub(dictRing);
  }; 
  var showNumber = new Show($foreign.showNumberImpl);
  var showInt = new Show($foreign.showIntImpl);
  var show = function (dict) {
      return dict.show;
  };             
  var semiringNumber = new Semiring($foreign.numAdd, $foreign.numMul, 1.0, 0.0);
  var semigroupoidFn = new Semigroupoid(function (f) {
      return function (g) {
          return function (x) {
              return f(g(x));
          };
      };
  });
  var semigroupArray = new Semigroup($foreign.concatArray);
  var pure = function (dict) {
      return dict.pure;
  };
  var $$return = function (dictApplicative) {
      return pure(dictApplicative);
  };
  var otherwise = true;
  var one = function (dict) {
      return dict.one;
  };
  var not = function (dict) {
      return dict.not;
  };
  var mul = function (dict) {
      return dict.mul;
  };
  var map = function (dict) {
      return dict.map;
  };
  var $less$dollar$greater = function (dictFunctor) {
      return map(dictFunctor);
  };
  var id = function (dict) {
      return dict.id;
  };
  var functorArray = new Functor($foreign.arrayMap);
  var flip = function (f) {
      return function (b) {
          return function (a) {
              return f(a)(b);
          };
      };
  }; 
  var eqString = new Eq($foreign.refEq);
  var eqNumber = new Eq($foreign.refEq);
  var ordNumber = new Ord(function () {
      return eqNumber;
  }, unsafeCompare);
  var eqInt = new Eq($foreign.refEq);
  var eq = function (dict) {
      return dict.eq;
  };
  var $eq$eq = function (dictEq) {
      return eq(dictEq);
  };
  var disj = function (dict) {
      return dict.disj;
  };
  var $$const = function (a) {
      return function (v) {
          return a;
      };
  };
  var $$void = function (dictFunctor) {
      return function (fa) {
          return $less$dollar$greater(dictFunctor)($$const(unit))(fa);
      };
  };
  var conj = function (dict) {
      return dict.conj;
  };
  var compose = function (dict) {
      return dict.compose;
  };
  var compare = function (dict) {
      return dict.compare;
  };
  var $less = function (dictOrd) {
      return function (a1) {
          return function (a2) {
              var $80 = compare(dictOrd)(a1)(a2);
              if ($80 instanceof LT) {
                  return true;
              };
              return false;
          };
      };
  };
  var $less$eq = function (dictOrd) {
      return function (a1) {
          return function (a2) {
              var $81 = compare(dictOrd)(a1)(a2);
              if ($81 instanceof GT) {
                  return false;
              };
              return true;
          };
      };
  };
  var $greater$eq = function (dictOrd) {
      return function (a1) {
          return function (a2) {
              var $83 = compare(dictOrd)(a1)(a2);
              if ($83 instanceof LT) {
                  return false;
              };
              return true;
          };
      };
  };
  var categoryFn = new Category(function () {
      return semigroupoidFn;
  }, function (x) {
      return x;
  });
  var boundedBoolean = new Bounded(false, true);
  var bottom = function (dict) {
      return dict.bottom;
  };
  var booleanAlgebraBoolean = new BooleanAlgebra(function () {
      return boundedBoolean;
  }, $foreign.boolAnd, $foreign.boolOr, $foreign.boolNot);
  var bind = function (dict) {
      return dict.bind;
  };
  var liftM1 = function (dictMonad) {
      return function (f) {
          return function (a) {
              return bind(dictMonad["__superclass_Prelude.Bind_1"]())(a)(function (v) {
                  return $$return(dictMonad["__superclass_Prelude.Applicative_0"]())(f(v));
              });
          };
      };
  };
  var $greater$greater$eq = function (dictBind) {
      return bind(dictBind);
  }; 
  var apply = function (dict) {
      return dict.apply;
  };
  var $less$times$greater = function (dictApply) {
      return apply(dictApply);
  };
  var liftA1 = function (dictApplicative) {
      return function (f) {
          return function (a) {
              return $less$times$greater(dictApplicative["__superclass_Prelude.Apply_0"]())(pure(dictApplicative)(f))(a);
          };
      };
  }; 
  var append = function (dict) {
      return dict.append;
  };
  var $plus$plus = function (dictSemigroup) {
      return append(dictSemigroup);
  };
  var $less$greater = function (dictSemigroup) {
      return append(dictSemigroup);
  };
  var ap = function (dictMonad) {
      return function (f) {
          return function (a) {
              return bind(dictMonad["__superclass_Prelude.Bind_1"]())(f)(function (v) {
                  return bind(dictMonad["__superclass_Prelude.Bind_1"]())(a)(function (v1) {
                      return $$return(dictMonad["__superclass_Prelude.Applicative_0"]())(v(v1));
                  });
              });
          };
      };
  };
  var monadArray = new Monad(function () {
      return applicativeArray;
  }, function () {
      return bindArray;
  });
  var bindArray = new Bind(function () {
      return applyArray;
  }, $foreign.arrayBind);
  var applyArray = new Apply(function () {
      return functorArray;
  }, ap(monadArray));
  var applicativeArray = new Applicative(function () {
      return applyArray;
  }, function (x) {
      return [ x ];
  });
  var add = function (dict) {
      return dict.add;
  };
  var $plus = function (dictSemiring) {
      return add(dictSemiring);
  };
  exports["LT"] = LT;
  exports["GT"] = GT;
  exports["EQ"] = EQ;
  exports["Show"] = Show;
  exports["BooleanAlgebra"] = BooleanAlgebra;
  exports["Bounded"] = Bounded;
  exports["Ord"] = Ord;
  exports["Eq"] = Eq;
  exports["Ring"] = Ring;
  exports["Semiring"] = Semiring;
  exports["Semigroup"] = Semigroup;
  exports["Monad"] = Monad;
  exports["Bind"] = Bind;
  exports["Applicative"] = Applicative;
  exports["Apply"] = Apply;
  exports["Functor"] = Functor;
  exports["Category"] = Category;
  exports["Semigroupoid"] = Semigroupoid;
  exports["show"] = show;
  exports["not"] = not;
  exports["disj"] = disj;
  exports["conj"] = conj;
  exports["bottom"] = bottom;
  exports["top"] = top;
  exports["unsafeCompare"] = unsafeCompare;
  exports[">="] = $greater$eq;
  exports["<="] = $less$eq;
  exports["<"] = $less;
  exports["compare"] = compare;
  exports["=="] = $eq$eq;
  exports["eq"] = eq;
  exports["-"] = $minus;
  exports["sub"] = sub;
  exports["+"] = $plus;
  exports["one"] = one;
  exports["mul"] = mul;
  exports["zero"] = zero;
  exports["add"] = add;
  exports["++"] = $plus$plus;
  exports["<>"] = $less$greater;
  exports["append"] = append;
  exports["ap"] = ap;
  exports["liftM1"] = liftM1;
  exports["return"] = $$return;
  exports[">>="] = $greater$greater$eq;
  exports["bind"] = bind;
  exports["liftA1"] = liftA1;
  exports["pure"] = pure;
  exports["<*>"] = $less$times$greater;
  exports["apply"] = apply;
  exports["void"] = $$void;
  exports["<$>"] = $less$dollar$greater;
  exports["map"] = map;
  exports["id"] = id;
  exports["compose"] = compose;
  exports["otherwise"] = otherwise;
  exports["const"] = $$const;
  exports["flip"] = flip;
  exports["unit"] = unit;
  exports["semigroupoidFn"] = semigroupoidFn;
  exports["categoryFn"] = categoryFn;
  exports["functorArray"] = functorArray;
  exports["applyArray"] = applyArray;
  exports["applicativeArray"] = applicativeArray;
  exports["bindArray"] = bindArray;
  exports["monadArray"] = monadArray;
  exports["semigroupArray"] = semigroupArray;
  exports["semiringNumber"] = semiringNumber;
  exports["eqInt"] = eqInt;
  exports["eqNumber"] = eqNumber;
  exports["eqString"] = eqString;
  exports["ordNumber"] = ordNumber;
  exports["boundedBoolean"] = boundedBoolean;
  exports["booleanAlgebraBoolean"] = booleanAlgebraBoolean;
  exports["showInt"] = showInt;
  exports["showNumber"] = showNumber;;
 
})(PS["Prelude"] = PS["Prelude"] || {});
(function(exports) {
  /* global exports, console */
  "use strict";

  // module Control.Monad.Eff.Console

  exports.log = function (s) {
    return function () {
      console.log(s);
      return {};
    };
  };
 
})(PS["Control.Monad.Eff.Console"] = PS["Control.Monad.Eff.Console"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Control.Monad.Eff

  exports.returnE = function (a) {
    return function () {
      return a;
    };
  };

  exports.bindE = function (a) {
    return function (f) {
      return function () {
        return f(a())();
      };
    };
  };
 
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Control.Monad.Eff"];
  var Prelude = PS["Prelude"];     
  var monadEff = new Prelude.Monad(function () {
      return applicativeEff;
  }, function () {
      return bindEff;
  });
  var bindEff = new Prelude.Bind(function () {
      return applyEff;
  }, $foreign.bindE);
  var applyEff = new Prelude.Apply(function () {
      return functorEff;
  }, Prelude.ap(monadEff));
  var applicativeEff = new Prelude.Applicative(function () {
      return applyEff;
  }, $foreign.returnE);
  var functorEff = new Prelude.Functor(Prelude.liftA1(applicativeEff));
  exports["functorEff"] = functorEff;
  exports["applyEff"] = applyEff;
  exports["applicativeEff"] = applicativeEff;
  exports["bindEff"] = bindEff;
  exports["monadEff"] = monadEff;;
 
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Console"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["log"] = $foreign.log;;
 
})(PS["Control.Monad.Eff.Console"] = PS["Control.Monad.Eff.Console"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Array

  //------------------------------------------------------------------------------
  // Array creation --------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.range = function (start) {
    return function (end) {
      var step = start > end ? -1 : 1;
      var result = [];
      for (var i = start, n = 0; i !== end; i += step) {
        result[n++] = i;
      }
      result[n] = i;
      return result;
    };
  };

  //------------------------------------------------------------------------------
  // Array size ------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.length = function (xs) {
    return xs.length;
  };

  //------------------------------------------------------------------------------
  // Extending arrays ------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.cons = function (e) {
    return function (l) {
      return [e].concat(l);
    };
  };

  //------------------------------------------------------------------------------
  // Non-indexed reads -----------------------------------------------------------
  //------------------------------------------------------------------------------

  exports["uncons'"] = function (empty) {
    return function (next) {
      return function (xs) {
        return xs.length === 0 ? empty({}) : next(xs[0])(xs.slice(1));
      };
    };
  };

  //------------------------------------------------------------------------------
  // Transformations -------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.reverse = function (l) {
    return l.slice().reverse();
  };

  exports.concat = function (xss) {
    var result = [];
    for (var i = 0, l = xss.length; i < l; i++) {
      var xs = xss[i];
      for (var j = 0, m = xs.length; j < m; j++) {
        result.push(xs[j]);
      }
    }
    return result;
  };

  //------------------------------------------------------------------------------
  // Subarrays -------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.slice = function (s) {
    return function (e) {
      return function (l) {
        return l.slice(s, e);
      };
    };
  };

  exports.drop = function (n) {
    return function (l) {
      return n < 1 ? l : l.slice(n);
    };
  };

  //------------------------------------------------------------------------------
  // Zipping ---------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.zipWith = function (f) {
    return function (xs) {
      return function (ys) {
        var l = xs.length < ys.length ? xs.length : ys.length;
        var result = new Array(l);
        for (var i = 0; i < l; i++) {
          result[i] = f(xs[i])(ys[i]);
        }
        return result;
      };
    };
  };
 
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];     
  var Alt = function (__superclass_Prelude$dotFunctor_0, alt) {
      this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
      this.alt = alt;
  };                                         
  var alt = function (dict) {
      return dict.alt;
  };
  exports["Alt"] = Alt;
  exports["alt"] = alt;;
 
})(PS["Control.Alt"] = PS["Control.Alt"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];     
  var Plus = function (__superclass_Control$dotAlt$dotAlt_0, empty) {
      this["__superclass_Control.Alt.Alt_0"] = __superclass_Control$dotAlt$dotAlt_0;
      this.empty = empty;
  };       
  var empty = function (dict) {
      return dict.empty;
  };
  exports["Plus"] = Plus;
  exports["empty"] = empty;;
 
})(PS["Control.Plus"] = PS["Control.Plus"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foldable

  exports.foldrArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = len - 1; i >= 0; i--) {
          acc = f(xs[i])(acc);
        }
        return acc;
      };
    };
  };

  exports.foldlArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = 0; i < len; i++) {
          acc = f(acc)(xs[i]);
        }
        return acc;
      };
    };
  };
 
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var $times$greater = function (dictApply) {
      return function (a) {
          return function (b) {
              return Prelude["<*>"](dictApply)(Prelude["<$>"](dictApply["__superclass_Prelude.Functor_0"]())(Prelude["const"](Prelude.id(Prelude.categoryFn)))(a))(b);
          };
      };
  };
  exports["*>"] = $times$greater;;
 
})(PS["Control.Apply"] = PS["Control.Apply"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];     
  var Monoid = function (__superclass_Prelude$dotSemigroup_0, mempty) {
      this["__superclass_Prelude.Semigroup_0"] = __superclass_Prelude$dotSemigroup_0;
      this.mempty = mempty;
  };     
  var monoidArray = new Monoid(function () {
      return Prelude.semigroupArray;
  }, [  ]);
  var mempty = function (dict) {
      return dict.mempty;
  };
  exports["Monoid"] = Monoid;
  exports["mempty"] = mempty;
  exports["monoidArray"] = monoidArray;;
 
})(PS["Data.Monoid"] = PS["Data.Monoid"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Extend = PS["Control.Extend"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];     
  var Nothing = (function () {
      function Nothing() {

      };
      Nothing.value = new Nothing();
      return Nothing;
  })();
  var Just = (function () {
      function Just(value0) {
          this.value0 = value0;
      };
      Just.create = function (value0) {
          return new Just(value0);
      };
      return Just;
  })();
  var maybe = function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Nothing) {
                  return v;
              };
              if (v2 instanceof Just) {
                  return v1(v2.value0);
              };
              throw new Error("Failed pattern match at Data.Maybe line 26, column 1 - line 27, column 1: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  };                                                
  var functorMaybe = new Prelude.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Just) {
              return new Just(v(v1.value0));
          };
          return Nothing.value;
      };
  });
  exports["Nothing"] = Nothing;
  exports["Just"] = Just;
  exports["maybe"] = maybe;
  exports["functorMaybe"] = functorMaybe;;
 
})(PS["Data.Maybe"] = PS["Data.Maybe"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];     
  var First = function (x) {
      return x;
  };
  var semigroupFirst = new Prelude.Semigroup(function (v) {
      return function (v1) {
          if (v instanceof Data_Maybe.Just) {
              return v;
          };
          return v1;
      };
  });
  var runFirst = function (v) {
      return v;
  };
  var monoidFirst = new Data_Monoid.Monoid(function () {
      return semigroupFirst;
  }, Data_Maybe.Nothing.value);
  exports["First"] = First;
  exports["runFirst"] = runFirst;
  exports["semigroupFirst"] = semigroupFirst;
  exports["monoidFirst"] = monoidFirst;;
 
})(PS["Data.Maybe.First"] = PS["Data.Maybe.First"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Monoid = PS["Data.Monoid"];     
  var Disj = function (x) {
      return x;
  };
  var semigroupDisj = function (dictBooleanAlgebra) {
      return new Prelude.Semigroup(function (v) {
          return function (v1) {
              return Prelude.disj(dictBooleanAlgebra)(v)(v1);
          };
      });
  };
  var runDisj = function (v) {
      return v;
  };
  var monoidDisj = function (dictBooleanAlgebra) {
      return new Data_Monoid.Monoid(function () {
          return semigroupDisj(dictBooleanAlgebra);
      }, Prelude.bottom(dictBooleanAlgebra["__superclass_Prelude.Bounded_0"]()));
  };
  exports["Disj"] = Disj;
  exports["runDisj"] = runDisj;
  exports["semigroupDisj"] = semigroupDisj;
  exports["monoidDisj"] = monoidDisj;;
 
})(PS["Data.Monoid.Disj"] = PS["Data.Monoid.Disj"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Foldable"];
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Maybe_Last = PS["Data.Maybe.Last"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Monoid_Additive = PS["Data.Monoid.Additive"];
  var Data_Monoid_Conj = PS["Data.Monoid.Conj"];
  var Data_Monoid_Disj = PS["Data.Monoid.Disj"];
  var Data_Monoid_Dual = PS["Data.Monoid.Dual"];
  var Data_Monoid_Endo = PS["Data.Monoid.Endo"];
  var Data_Monoid_Multiplicative = PS["Data.Monoid.Multiplicative"];     
  var Foldable = function (foldMap, foldl, foldr) {
      this.foldMap = foldMap;
      this.foldl = foldl;
      this.foldr = foldr;
  };
  var foldr = function (dict) {
      return dict.foldr;
  };
  var traverse_ = function (dictApplicative) {
      return function (dictFoldable) {
          return function (f) {
              return foldr(dictFoldable)(function ($161) {
                  return Control_Apply["*>"](dictApplicative["__superclass_Prelude.Apply_0"]())(f($161));
              })(Prelude.pure(dictApplicative)(Prelude.unit));
          };
      };
  };
  var for_ = function (dictApplicative) {
      return function (dictFoldable) {
          return Prelude.flip(traverse_(dictApplicative)(dictFoldable));
      };
  };
  var foldl = function (dict) {
      return dict.foldl;
  }; 
  var foldMapDefaultR = function (dictFoldable) {
      return function (dictMonoid) {
          return function (f) {
              return function (xs) {
                  return foldr(dictFoldable)(function (x) {
                      return function (acc) {
                          return Prelude["<>"](dictMonoid["__superclass_Prelude.Semigroup_0"]())(f(x))(acc);
                      };
                  })(Data_Monoid.mempty(dictMonoid))(xs);
              };
          };
      };
  };
  var foldableArray = new Foldable(function (dictMonoid) {
      return foldMapDefaultR(foldableArray)(dictMonoid);
  }, $foreign.foldlArray, $foreign.foldrArray);
  var foldMap = function (dict) {
      return dict.foldMap;
  };
  var any = function (dictFoldable) {
      return function (dictBooleanAlgebra) {
          return function (p) {
              return function ($164) {
                  return Data_Monoid_Disj.runDisj(foldMap(dictFoldable)(Data_Monoid_Disj.monoidDisj(dictBooleanAlgebra))(function ($165) {
                      return Data_Monoid_Disj.Disj(p($165));
                  })($164));
              };
          };
      };
  };
  var elem = function (dictFoldable) {
      return function (dictEq) {
          return function ($166) {
              return any(dictFoldable)(Prelude.booleanAlgebraBoolean)(Prelude["=="](dictEq)($166));
          };
      };
  };
  exports["Foldable"] = Foldable;
  exports["elem"] = elem;
  exports["any"] = any;
  exports["for_"] = for_;
  exports["traverse_"] = traverse_;
  exports["foldMapDefaultR"] = foldMapDefaultR;
  exports["foldMap"] = foldMap;
  exports["foldl"] = foldl;
  exports["foldr"] = foldr;
  exports["foldableArray"] = foldableArray;;
 
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Traversable

  // jshint maxparams: 3

  exports.traverseArrayImpl = function () {
    function Cont (fn) {
      this.fn = fn;
    }

    var emptyList = {};

    var ConsCell = function (head, tail) {
      this.head = head;
      this.tail = tail;
    };

    function consList (x) {
      return function (xs) {
        return new ConsCell(x, xs);
      };
    }

    function listToArray (list) {
      var arr = [];
      while (list !== emptyList) {
        arr.push(list.head);
        list = list.tail;
      }
      return arr;
    }

    return function (apply) {
      return function (map) {
        return function (pure) {
          return function (f) {
            var buildFrom = function (x, ys) {
              return apply(map(consList)(f(x)))(ys);
            };

            var go = function (acc, currentLen, xs) {
              if (currentLen === 0) {
                return acc;
              } else {
                var last = xs[currentLen - 1];
                return new Cont(function () {
                  return go(buildFrom(last, acc), currentLen - 1, xs);
                });
              }
            };

            return function (array) {
              var result = go(pure(emptyList), array.length, array);
              while (result instanceof Cont) {
                result = result.fn();
              }

              return map(listToArray)(result);
            };
          };
        };
      };
    };
  }();
 
})(PS["Data.Traversable"] = PS["Data.Traversable"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Traversable"];
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Maybe_Last = PS["Data.Maybe.Last"];
  var Data_Monoid_Additive = PS["Data.Monoid.Additive"];
  var Data_Monoid_Conj = PS["Data.Monoid.Conj"];
  var Data_Monoid_Disj = PS["Data.Monoid.Disj"];
  var Data_Monoid_Dual = PS["Data.Monoid.Dual"];
  var Data_Monoid_Multiplicative = PS["Data.Monoid.Multiplicative"];
  var Traversable = function (__superclass_Data$dotFoldable$dotFoldable_1, __superclass_Prelude$dotFunctor_0, sequence, traverse) {
      this["__superclass_Data.Foldable.Foldable_1"] = __superclass_Data$dotFoldable$dotFoldable_1;
      this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
      this.sequence = sequence;
      this.traverse = traverse;
  };
  var traverse = function (dict) {
      return dict.traverse;
  };
  var sequenceDefault = function (dictTraversable) {
      return function (dictApplicative) {
          return function (tma) {
              return traverse(dictTraversable)(dictApplicative)(Prelude.id(Prelude.categoryFn))(tma);
          };
      };
  };
  var traversableArray = new Traversable(function () {
      return Data_Foldable.foldableArray;
  }, function () {
      return Prelude.functorArray;
  }, function (dictApplicative) {
      return sequenceDefault(traversableArray)(dictApplicative);
  }, function (dictApplicative) {
      return $foreign.traverseArrayImpl(Prelude.apply(dictApplicative["__superclass_Prelude.Apply_0"]()))(Prelude.map((dictApplicative["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]()))(Prelude.pure(dictApplicative));
  });
  var sequence = function (dict) {
      return dict.sequence;
  };
  exports["Traversable"] = Traversable;
  exports["sequenceDefault"] = sequenceDefault;
  exports["sequence"] = sequence;
  exports["traverse"] = traverse;
  exports["traversableArray"] = traversableArray;;
 
})(PS["Data.Traversable"] = PS["Data.Traversable"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];     
  var Bifunctor = function (bimap) {
      this.bimap = bimap;
  };
  var bimap = function (dict) {
      return dict.bimap;
  };
  var rmap = function (dictBifunctor) {
      return bimap(dictBifunctor)(Prelude.id(Prelude.categoryFn));
  };
  exports["Bifunctor"] = Bifunctor;
  exports["rmap"] = rmap;
  exports["bimap"] = bimap;;
 
})(PS["Data.Bifunctor"] = PS["Data.Bifunctor"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Biapplicative = PS["Control.Biapplicative"];
  var Control_Biapply = PS["Control.Biapply"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Lazy = PS["Control.Lazy"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Tuple = (function () {
      function Tuple(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Tuple.create = function (value0) {
          return function (value1) {
              return new Tuple(value0, value1);
          };
      };
      return Tuple;
  })();
  var uncurry = function (f) {
      return function (v) {
          return f(v.value0)(v.value1);
      };
  };
  var lookup = function (dictFoldable) {
      return function (dictEq) {
          return function (a) {
              return function (f) {
                  return Data_Maybe_First.runFirst(Data_Foldable.foldMap(dictFoldable)(Data_Maybe_First.monoidFirst)(function (v) {
                      var $145 = Prelude["=="](dictEq)(a)(v.value0);
                      if ($145) {
                          return new Data_Maybe.Just(v.value1);
                      };
                      if (!$145) {
                          return Data_Maybe.Nothing.value;
                      };
                      throw new Error("Failed pattern match at Data.Tuple line 173, column 1 - line 174, column 1: " + [ $145.constructor.name ]);
                  })(f));
              };
          };
      };
  };
  var functorTuple = new Prelude.Functor(function (f) {
      return function (v) {
          return new Tuple(v.value0, f(v.value1));
      };
  });
  var bifunctorTuple = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (v) {
              return new Tuple(f(v.value0), g(v.value1));
          };
      };
  });
  exports["Tuple"] = Tuple;
  exports["lookup"] = lookup;
  exports["uncurry"] = uncurry;
  exports["functorTuple"] = functorTuple;
  exports["bifunctorTuple"] = bifunctorTuple;;
 
})(PS["Data.Tuple"] = PS["Data.Tuple"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Maybe.Unsafe

  exports.unsafeThrow = function (msg) {
    throw new Error(msg);
  };
 
})(PS["Data.Maybe.Unsafe"] = PS["Data.Maybe.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Maybe.Unsafe"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];     
  var fromJust = function (v) {
      if (v instanceof Data_Maybe.Just) {
          return v.value0;
      };
      if (v instanceof Data_Maybe.Nothing) {
          return $foreign.unsafeThrow("Data.Maybe.Unsafe.fromJust called on Nothing");
      };
      throw new Error("Failed pattern match at Data.Maybe.Unsafe line 10, column 1 - line 11, column 1: " + [ v.constructor.name ]);
  };
  exports["fromJust"] = fromJust;
  exports["unsafeThrow"] = $foreign.unsafeThrow;;
 
})(PS["Data.Maybe.Unsafe"] = PS["Data.Maybe.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Array"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];     
  var $colon = $foreign.cons;
  var zip = $foreign.zipWith(Data_Tuple.Tuple.create);
  var uncons = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (x) {
      return function (xs) {
          return new Data_Maybe.Just({
              head: x, 
              tail: xs
          });
      };
  });
  var take = $foreign.slice(0);
  var tail = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (v) {
      return function (xs) {
          return new Data_Maybe.Just(xs);
      };
  });
  var span = function (p) {
      var go = function (__copy_acc) {
          return function (__copy_xs) {
              var acc = __copy_acc;
              var xs = __copy_xs;
              tco: while (true) {
                  var $42 = uncons(xs);
                  if ($42 instanceof Data_Maybe.Just && p($42.value0.head)) {
                      var __tco_acc = $colon($42.value0.head)(acc);
                      acc = __tco_acc;
                      xs = $42.value0.tail;
                      continue tco;
                  };
                  return {
                      init: $foreign.reverse(acc), 
                      rest: xs
                  };
              };
          };
      };
      return go([  ]);
  };
  var singleton = function (a) {
      return [ a ];
  };
  var $$null = function (xs) {
      return $foreign.length(xs) === 0;
  };                                                                                  
  var init = function (xs) {
      if ($$null(xs)) {
          return Data_Maybe.Nothing.value;
      };
      if (Prelude.otherwise) {
          return new Data_Maybe.Just($foreign.slice(0)($foreign.length(xs) - 1)(xs));
      };
      throw new Error("Failed pattern match at Data.Array line 226, column 1 - line 227, column 1: " + [ xs.constructor.name ]);
  };
  var head = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (x) {
      return function (v) {
          return new Data_Maybe.Just(x);
      };
  });
  var concatMap = Prelude.flip(Prelude.bind(Prelude.bindArray));
  var mapMaybe = function (f) {
      return concatMap(function ($69) {
          return Data_Maybe.maybe([  ])(singleton)(f($69));
      });
  };
  var catMaybes = mapMaybe(Prelude.id(Prelude.categoryFn));
  exports["zip"] = zip;
  exports["span"] = span;
  exports["take"] = take;
  exports["catMaybes"] = catMaybes;
  exports["mapMaybe"] = mapMaybe;
  exports["concatMap"] = concatMap;
  exports["uncons"] = uncons;
  exports["init"] = init;
  exports["tail"] = tail;
  exports["head"] = head;
  exports["singleton"] = singleton;
  exports["drop"] = $foreign.drop;
  exports["concat"] = $foreign.concat;
  exports["length"] = $foreign.length;
  exports["range"] = $foreign.range;;
 
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Left = (function () {
      function Left(value0) {
          this.value0 = value0;
      };
      Left.create = function (value0) {
          return new Left(value0);
      };
      return Left;
  })();
  var Right = (function () {
      function Right(value0) {
          this.value0 = value0;
      };
      Right.create = function (value0) {
          return new Right(value0);
      };
      return Right;
  })();
  var functorEither = new Prelude.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Left) {
              return new Left(v1.value0);
          };
          if (v1 instanceof Right) {
              return new Right(v(v1.value0));
          };
          throw new Error("Failed pattern match at Data.Either line 52, column 1 - line 56, column 1: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var either = function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Left) {
                  return v(v2.value0);
              };
              if (v2 instanceof Right) {
                  return v1(v2.value0);
              };
              throw new Error("Failed pattern match at Data.Either line 28, column 1 - line 29, column 1: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  };
  var bifunctorEither = new Data_Bifunctor.Bifunctor(function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Left) {
                  return new Left(v(v2.value0));
              };
              if (v2 instanceof Right) {
                  return new Right(v1(v2.value0));
              };
              throw new Error("Failed pattern match at Data.Either line 56, column 1 - line 92, column 1: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  });
  var applyEither = new Prelude.Apply(function () {
      return functorEither;
  }, function (v) {
      return function (v1) {
          if (v instanceof Left) {
              return new Left(v.value0);
          };
          if (v instanceof Right) {
              return Prelude["<$>"](functorEither)(v.value0)(v1);
          };
          throw new Error("Failed pattern match at Data.Either line 92, column 1 - line 116, column 1: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var bindEither = new Prelude.Bind(function () {
      return applyEither;
  }, either(function (e) {
      return function (v) {
          return new Left(e);
      };
  })(function (a) {
      return function (f) {
          return f(a);
      };
  }));
  var applicativeEither = new Prelude.Applicative(function () {
      return applyEither;
  }, Right.create);
  exports["Left"] = Left;
  exports["Right"] = Right;
  exports["either"] = either;
  exports["functorEither"] = functorEither;
  exports["bifunctorEither"] = bifunctorEither;
  exports["applyEither"] = applyEither;
  exports["applicativeEither"] = applicativeEither;
  exports["bindEither"] = bindEither;;
 
})(PS["Data.Either"] = PS["Data.Either"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foreign

  // jshint maxparams: 3
  exports.parseJSONImpl = function (left, right, str) {
    try {
      return right(JSON.parse(str));
    } catch (e) {
      return left(e.toString());
    }
  };

  exports.unsafeFromForeign = function (value) {
    return value;
  };

  exports.typeOf = function (value) {
    return typeof value;
  };

  exports.tagOf = function (value) {
    return Object.prototype.toString.call(value).slice(8, -1);
  };

  exports.isNull = function (value) {
    return value === null;
  };

  exports.isUndefined = function (value) {
    return value === undefined;
  };
 
})(PS["Data.Foreign"] = PS["Data.Foreign"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.runFn2 = function (fn) {
    return function (a) {
      return function (b) {
        return fn(a, b);
      };
    };
  };
 
})(PS["Data.Function"] = PS["Data.Function"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Function"];
  var Prelude = PS["Prelude"];
  exports["runFn2"] = $foreign.runFn2;;
 
})(PS["Data.Function"] = PS["Data.Function"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Int

  exports.fromNumberImpl = function (just) {
    return function (nothing) {
      return function (n) {
        /* jshint bitwise: false */
        return (n | 0) === n ? just(n) : nothing;
      };
    };
  };

  exports.toNumber = function (n) {
    return n;
  };
 
})(PS["Data.Int"] = PS["Data.Int"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Math

  exports.abs = Math.abs;    

  exports.log = Math.log;

  exports.pow = function (n) {
    return function (p) {
      return Math.pow(n, p);
    };
  };                         
 
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Math"];
  exports["pow"] = $foreign.pow;
  exports["log"] = $foreign.log;
  exports["abs"] = $foreign.abs;;
 
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Int"];
  var Prelude = PS["Prelude"];
  var Data_Int_Bits = PS["Data.Int.Bits"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var $$Math = PS["Math"];                                                                   
  var fromNumber = $foreign.fromNumberImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
  exports["fromNumber"] = fromNumber;
  exports["toNumber"] = $foreign.toNumber;;
 
})(PS["Data.Int"] = PS["Data.Int"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.fromCharArray = function (a) {
    return a.join("");
  };

  exports.length = function (s) {
    return s.length;
  };

  exports.split = function (sep) {
    return function (s) {
      return s.split(sep);
    };
  };

  exports.toCharArray = function (s) {
    return s.split("");
  };
 
})(PS["Data.String"] = PS["Data.String"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.toCharCode = function (c) {
    return c.charCodeAt(0);
  };

  exports.fromCharCode = function (c) {
    return String.fromCharCode(c);
  };
 
})(PS["Data.Char"] = PS["Data.Char"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Char"];
  var Prelude = PS["Prelude"];
  exports["toCharCode"] = $foreign.toCharCode;
  exports["fromCharCode"] = $foreign.fromCharCode;;
 
})(PS["Data.Char"] = PS["Data.Char"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.String"];
  var Prelude = PS["Prelude"];
  var Data_Char = PS["Data.Char"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_String_Unsafe = PS["Data.String.Unsafe"];
  var $$null = function (s) {
      return $foreign.length(s) === 0;
  };
  exports["null"] = $$null;
  exports["toCharArray"] = $foreign.toCharArray;
  exports["fromCharArray"] = $foreign.fromCharArray;;
 
})(PS["Data.String"] = PS["Data.String"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Foreign"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Function = PS["Data.Function"];
  var Data_Int = PS["Data.Int"];
  var Data_String = PS["Data.String"];     
  var TypeMismatch = (function () {
      function TypeMismatch(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      TypeMismatch.create = function (value0) {
          return function (value1) {
              return new TypeMismatch(value0, value1);
          };
      };
      return TypeMismatch;
  })();
  var ErrorAtProperty = (function () {
      function ErrorAtProperty(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      ErrorAtProperty.create = function (value0) {
          return function (value1) {
              return new ErrorAtProperty(value0, value1);
          };
      };
      return ErrorAtProperty;
  })();
  var JSONError = (function () {
      function JSONError(value0) {
          this.value0 = value0;
      };
      JSONError.create = function (value0) {
          return new JSONError(value0);
      };
      return JSONError;
  })();
  var unsafeReadTagged = function (tag) {
      return function (value) {
          if ($foreign.tagOf(value) === tag) {
              return Prelude.pure(Data_Either.applicativeEither)($foreign.unsafeFromForeign(value));
          };
          return new Data_Either.Left(new TypeMismatch(tag, $foreign.tagOf(value)));
      };
  };                                          
  var readNumber = unsafeReadTagged("Number");
  var readInt = function (value) {
      var error = Data_Either.Left.create(new TypeMismatch("Int", $foreign.tagOf(value)));
      var fromNumber = function ($30) {
          return Data_Maybe.maybe(error)(Prelude.pure(Data_Either.applicativeEither))(Data_Int.fromNumber($30));
      };
      return Data_Either.either(Prelude["const"](error))(fromNumber)(readNumber(value));
  };
  var parseJSON = function (json) {
      return $foreign.parseJSONImpl(function ($32) {
          return Data_Either.Left.create(JSONError.create($32));
      }, Data_Either.Right.create, json);
  };
  exports["TypeMismatch"] = TypeMismatch;
  exports["ErrorAtProperty"] = ErrorAtProperty;
  exports["JSONError"] = JSONError;
  exports["readInt"] = readInt;
  exports["readNumber"] = readNumber;
  exports["unsafeReadTagged"] = unsafeReadTagged;
  exports["parseJSON"] = parseJSON;
  exports["isUndefined"] = $foreign.isUndefined;
  exports["isNull"] = $foreign.isNull;
  exports["typeOf"] = $foreign.typeOf;;
 
})(PS["Data.Foreign"] = PS["Data.Foreign"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Foreign.Index

  // jshint maxparams: 4
  exports.unsafeReadPropImpl = function (f, s, key, value) {
    return value == null ? f : s(value[key]);
  };

  // jshint maxparams: 2
  exports.unsafeHasOwnProperty = function (prop, value) {
    return Object.prototype.hasOwnProperty.call(value, prop);
  };

  exports.unsafeHasProperty = function (prop, value) {
    return prop in value;
  };
 
})(PS["Data.Foreign.Index"] = PS["Data.Foreign.Index"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Foreign.Index"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Function = PS["Data.Function"];
  var Data_Int = PS["Data.Int"];     
  var Index = function (errorAt, hasOwnProperty, hasProperty, ix) {
      this.errorAt = errorAt;
      this.hasOwnProperty = hasOwnProperty;
      this.hasProperty = hasProperty;
      this.ix = ix;
  };
  var unsafeReadProp = function (k) {
      return function (value) {
          return $foreign.unsafeReadPropImpl(new Data_Either.Left(new Data_Foreign.TypeMismatch("object", Data_Foreign.typeOf(value))), Prelude.pure(Data_Either.applicativeEither), k, value);
      };
  };
  var prop = unsafeReadProp;
  var ix = function (dict) {
      return dict.ix;
  };
  var $bang = function (dictIndex) {
      return ix(dictIndex);
  };                         
  var hasPropertyImpl = function (v) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Data_Foreign.typeOf(value) === "object" || Data_Foreign.typeOf(value) === "function") {
              return $foreign.unsafeHasProperty(v, value);
          };
          return false;
      };
  };
  var hasProperty = function (dict) {
      return dict.hasProperty;
  };
  var hasOwnPropertyImpl = function (v) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Data_Foreign.typeOf(value) === "object" || Data_Foreign.typeOf(value) === "function") {
              return $foreign.unsafeHasOwnProperty(v, value);
          };
          return false;
      };
  };                                                                                                                   
  var indexString = new Index(Data_Foreign.ErrorAtProperty.create, hasOwnPropertyImpl, hasPropertyImpl, Prelude.flip(prop));
  var hasOwnProperty = function (dict) {
      return dict.hasOwnProperty;
  };
  var errorAt = function (dict) {
      return dict.errorAt;
  };
  exports["Index"] = Index;
  exports["errorAt"] = errorAt;
  exports["hasOwnProperty"] = hasOwnProperty;
  exports["hasProperty"] = hasProperty;
  exports["!"] = $bang;
  exports["ix"] = ix;
  exports["prop"] = prop;
  exports["indexString"] = indexString;;
 
})(PS["Data.Foreign.Index"] = PS["Data.Foreign.Index"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Array = PS["Data.Array"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];
  var Data_Foreign_Null = PS["Data.Foreign.Null"];
  var Data_Foreign_NullOrUndefined = PS["Data.Foreign.NullOrUndefined"];
  var Data_Foreign_Undefined = PS["Data.Foreign.Undefined"];
  var Data_Int = PS["Data.Int"];
  var Data_Traversable = PS["Data.Traversable"];     
  var IsForeign = function (read) {
      this.read = read;
  };                                                           
  var read = function (dict) {
      return dict.read;
  };
  var readWith = function (dictIsForeign) {
      return function (f) {
          return function (value) {
              return Data_Either.either(function ($8) {
                  return Data_Either.Left.create(f($8));
              })(Data_Either.Right.create)(read(dictIsForeign)(value));
          };
      };
  };
  var readProp = function (dictIsForeign) {
      return function (dictIndex) {
          return function (prop) {
              return function (value) {
                  return Prelude[">>="](Data_Either.bindEither)(Data_Foreign_Index["!"](dictIndex)(value)(prop))(readWith(dictIsForeign)(Data_Foreign_Index.errorAt(dictIndex)(prop)));
              };
          };
      };
  };
  var intIsForeign = new IsForeign(Data_Foreign.readInt);
  exports["IsForeign"] = IsForeign;
  exports["readProp"] = readProp;
  exports["readWith"] = readWith;
  exports["read"] = read;
  exports["intIsForeign"] = intIsForeign;;
 
})(PS["Data.Foreign.Class"] = PS["Data.Foreign.Class"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Date

  exports.nowEpochMilliseconds = function () {
    return Date.now();
  };
 
})(PS["Data.Date"] = PS["Data.Date"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Milliseconds = function (x) {
      return x;
  };           
  var semiringMilliseconds = new Prelude.Semiring(function (v) {
      return function (v1) {
          return v + v1;
      };
  }, function (v) {
      return function (v1) {
          return v * v1;
      };
  }, 1.0, 0.0);
  var ringMilliseconds = new Prelude.Ring(function () {
      return semiringMilliseconds;
  }, function (v) {
      return function (v1) {
          return v - v1;
      };
  });
  exports["Milliseconds"] = Milliseconds;
  exports["semiringMilliseconds"] = semiringMilliseconds;
  exports["ringMilliseconds"] = ringMilliseconds;;
 
})(PS["Data.Time"] = PS["Data.Time"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Date"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Enum = PS["Data.Enum"];
  var Data_Function = PS["Data.Function"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Time = PS["Data.Time"];
  var Global = PS["Global"];
  exports["nowEpochMilliseconds"] = $foreign.nowEpochMilliseconds;;
 
})(PS["Data.Date"] = PS["Data.Date"] || {});
(function(exports) {
  "use strict";

  // module Browser.WebStorage

  exports.localStorage = window.localStorage;    

  exports.unsafeLength= function(storage) {
    return function(){
      return storage.length;
    }
  };

  exports.unsafeKey = function(null2Maybe,storage,num) {
    return function(){
      return null2Maybe(storage.key(num));
    }
  };

  exports.unsafeGetItem = function(null2Maybe,storage,str) {
    return function(){
      return null2Maybe(storage.getItem(str));
    }
  };

  exports.unsafeSetItem = function(storage,str,val) {
    return function(){
      storage.setItem(str, val);
      return {};
    }
  };

  exports.unsafeRemoveItem = function(storage,str) {
    return function(){
      storage.removeItem(str);
      return {};
    }
  };

  exports.unsafeClear = function(storage) {
    return function(){
      storage.clear();
      return {};
    }
  };

  exports.null2MaybeImpl = function(just, nothing, n) {
    return n == null ? nothing : just(n);
  };

 
})(PS["Browser.WebStorage"] = PS["Browser.WebStorage"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Browser.WebStorage"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Function = PS["Data.Function"];     
  var Storage = function (clear, getItem, key, length, removeItem, setItem) {
      this.clear = clear;
      this.getItem = getItem;
      this.key = key;
      this.length = length;
      this.removeItem = removeItem;
      this.setItem = setItem;
  };
  var setItem = function (dict) {
      return dict.setItem;
  };
  var removeItem = function (dict) {
      return dict.removeItem;
  };
  var null2Maybe = function (n) {
      return $foreign.null2MaybeImpl(Data_Maybe.Just.create, Data_Maybe.Nothing.value, n);
  };
  var storageLocalStorage = new Storage(function (v) {
      return $foreign.unsafeClear($foreign.localStorage);
  }, function (v) {
      return function (k) {
          return $foreign.unsafeGetItem(null2Maybe, $foreign.localStorage, k);
      };
  }, function (v) {
      return function (n) {
          return $foreign.unsafeKey(null2Maybe, $foreign.localStorage, n);
      };
  }, function (v) {
      return $foreign.unsafeLength($foreign.localStorage);
  }, function (v) {
      return function (k) {
          return $foreign.unsafeRemoveItem($foreign.localStorage, k);
      };
  }, function (v) {
      return function (k) {
          return function (v1) {
              return $foreign.unsafeSetItem($foreign.localStorage, k, v1);
          };
      };
  });
  var length = function (dict) {
      return dict.length;
  };
  var key = function (dict) {
      return dict.key;
  };
  var getItem = function (dict) {
      return dict.getItem;
  };
  var clear = function (dict) {
      return dict.clear;
  };
  exports["Storage"] = Storage;
  exports["setItem"] = setItem;
  exports["removeItem"] = removeItem;
  exports["length"] = length;
  exports["key"] = key;
  exports["getItem"] = getItem;
  exports["clear"] = clear;
  exports["storageLocalStorage"] = storageLocalStorage;
  exports["localStorage"] = $foreign.localStorage;;
 
})(PS["Browser.WebStorage"] = PS["Browser.WebStorage"] || {});
(function(exports) {
  "use strict";

  // module Unsafe.Coerce

  exports.unsafeCoerce = function(x) { return x; }
 
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Unsafe.Coerce"];
  exports["unsafeCoerce"] = $foreign.unsafeCoerce;;
 
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // module Text.Base64

  exports.encode64 = function (str) {
    if (typeof(btoa) == 'undefined') {
      var btoa = null;
      var atob = null;
      return new Buffer(str).toString('base64');
    } else {
      return btoa(str);
    }
  }

  exports.decode64 = function (code) {
    if (typeof(atob) == 'undefined') {
      var btoa = null;
      var atob = null;
      return new Buffer(code, 'base64').toString('ascii');
    } else {
      return atob(code);
    }
  }
 
})(PS["Text.Base64"] = PS["Text.Base64"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Text.Base64"];
  exports["encode64"] = $foreign.encode64;
  exports["decode64"] = $foreign.decode64;;
 
})(PS["Text.Base64"] = PS["Text.Base64"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Exists

  exports.mkExists = function (fa) {
    return fa;
  };

  exports.runExists = function (f) {
    return function (fa) {
      return f(fa);
    };
  };
 
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Exists"];
  var Prelude = PS["Prelude"];
  exports["runExists"] = $foreign.runExists;
  exports["mkExists"] = $foreign.mkExists;;
 
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Unsafe_Coerce = PS["Unsafe.Coerce"];     
  var runExistsR = Unsafe_Coerce.unsafeCoerce;
  var mkExistsR = Unsafe_Coerce.unsafeCoerce;
  exports["runExistsR"] = runExistsR;
  exports["mkExistsR"] = mkExistsR;;
 
})(PS["Data.ExistsR"] = PS["Data.ExistsR"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                           
  var elementToNode = Unsafe_Coerce.unsafeCoerce;
  exports["elementToNode"] = elementToNode;;
 
})(PS["DOM.Node.Types"] = PS["DOM.Node.Types"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["DOM.HTML.Types"];
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];     
  var windowToEventTarget = Unsafe_Coerce.unsafeCoerce;                  
  var htmlElementToNode = Unsafe_Coerce.unsafeCoerce;   
  var htmlDocumentToParentNode = Unsafe_Coerce.unsafeCoerce;
  exports["htmlElementToNode"] = htmlElementToNode;
  exports["htmlDocumentToParentNode"] = htmlDocumentToParentNode;
  exports["windowToEventTarget"] = windowToEventTarget;;
 
})(PS["DOM.HTML.Types"] = PS["DOM.HTML.Types"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Halogen.HTML.Events.Handler

  exports.preventDefaultImpl = function (e) {
    return function () {
      e.preventDefault();
    };
  };

  exports.stopPropagationImpl = function (e) {
    return function () {
      e.stopPropagation();
    };
  };

  exports.stopImmediatePropagationImpl = function (e) {
    return function () {
      e.stopImmediatePropagation();
    };
  };
 
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];     
  var MonadEff = function (__superclass_Prelude$dotMonad_0, liftEff) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.liftEff = liftEff;
  };
  var monadEffEff = new MonadEff(function () {
      return Control_Monad_Eff.monadEff;
  }, Prelude.id(Prelude.categoryFn));
  var liftEff = function (dict) {
      return dict.liftEff;
  };
  exports["MonadEff"] = MonadEff;
  exports["liftEff"] = liftEff;
  exports["monadEffEff"] = monadEffEff;;
 
})(PS["Control.Monad.Eff.Class"] = PS["Control.Monad.Eff.Class"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Either = PS["Data.Either"];     
  var MonadError = function (__superclass_Prelude$dotMonad_0, catchError, throwError) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.catchError = catchError;
      this.throwError = throwError;
  };
  var throwError = function (dict) {
      return dict.throwError;
  };                          
  var catchError = function (dict) {
      return dict.catchError;
  };
  exports["MonadError"] = MonadError;
  exports["catchError"] = catchError;
  exports["throwError"] = throwError;;
 
})(PS["Control.Monad.Error.Class"] = PS["Control.Monad.Error.Class"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];     
  var $less$dollar = function (dictFunctor) {
      return function (x) {
          return function (f) {
              return Prelude["<$>"](dictFunctor)(Prelude["const"](x))(f);
          };
      };
  };
  var $dollar$greater = function (dictFunctor) {
      return function (f) {
          return function (x) {
              return Prelude["<$>"](dictFunctor)(Prelude["const"](x))(f);
          };
      };
  };
  exports["$>"] = $dollar$greater;
  exports["<$"] = $less$dollar;;
 
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Identity = function (x) {
      return x;
  };
  var runIdentity = function (v) {
      return v;
  };
  var functorIdentity = new Prelude.Functor(function (f) {
      return function (v) {
          return f(v);
      };
  });
  var applyIdentity = new Prelude.Apply(function () {
      return functorIdentity;
  }, function (v) {
      return function (v1) {
          return v(v1);
      };
  });
  var bindIdentity = new Prelude.Bind(function () {
      return applyIdentity;
  }, function (v) {
      return function (f) {
          return f(v);
      };
  });
  var applicativeIdentity = new Prelude.Applicative(function () {
      return applyIdentity;
  }, Identity);
  var monadIdentity = new Prelude.Monad(function () {
      return applicativeIdentity;
  }, function () {
      return bindIdentity;
  });
  exports["Identity"] = Identity;
  exports["runIdentity"] = runIdentity;
  exports["functorIdentity"] = functorIdentity;
  exports["applyIdentity"] = applyIdentity;
  exports["applicativeIdentity"] = applicativeIdentity;
  exports["bindIdentity"] = bindIdentity;
  exports["monadIdentity"] = monadIdentity;;
 
})(PS["Data.Identity"] = PS["Data.Identity"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_ST = PS["Control.Monad.ST"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Monad_Eff_Unsafe = PS["Control.Monad.Eff.Unsafe"];
  var Data_Either_Unsafe = PS["Data.Either.Unsafe"];     
  var MonadRec = function (__superclass_Prelude$dotMonad_0, tailRecM) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.tailRecM = tailRecM;
  };
  var tailRecM = function (dict) {
      return dict.tailRecM;
  };             
  var forever = function (dictMonadRec) {
      return function (ma) {
          return tailRecM(dictMonadRec)(function (u) {
              return Data_Functor["<$"]((((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(new Data_Either.Left(u))(ma);
          })(Prelude.unit);
      };
  };
  exports["MonadRec"] = MonadRec;
  exports["forever"] = forever;
  exports["tailRecM"] = tailRecM;;
 
})(PS["Control.Monad.Rec.Class"] = PS["Control.Monad.Rec.Class"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];     
  var MonadState = function (__superclass_Prelude$dotMonad_0, state) {
      this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
      this.state = state;
  };
  var state = function (dict) {
      return dict.state;
  };
  var put = function (dictMonadState) {
      return function (s) {
          return state(dictMonadState)(function (v) {
              return new Data_Tuple.Tuple(Prelude.unit, s);
          });
      };
  };
  var modify = function (dictMonadState) {
      return function (f) {
          return state(dictMonadState)(function (s) {
              return new Data_Tuple.Tuple(Prelude.unit, f(s));
          });
      };
  };
  var gets = function (dictMonadState) {
      return function (f) {
          return state(dictMonadState)(function (s) {
              return new Data_Tuple.Tuple(f(s), s);
          });
      };
  };
  var get = function (dictMonadState) {
      return state(dictMonadState)(function (s) {
          return new Data_Tuple.Tuple(s, s);
      });
  };
  exports["MonadState"] = MonadState;
  exports["modify"] = modify;
  exports["put"] = put;
  exports["gets"] = gets;
  exports["get"] = get;
  exports["state"] = state;;
 
})(PS["Control.Monad.State.Class"] = PS["Control.Monad.State.Class"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];     
  var MonadTrans = function (lift) {
      this.lift = lift;
  };
  var lift = function (dict) {
      return dict.lift;
  };
  exports["MonadTrans"] = MonadTrans;
  exports["lift"] = lift;;
 
})(PS["Control.Monad.Trans"] = PS["Control.Monad.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Tuple = PS["Data.Tuple"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];     
  var WriterT = function (x) {
      return x;
  };
  var runWriterT = function (v) {
      return v;
  };
  var mapWriterT = function (f) {
      return function (m) {
          return WriterT(f(runWriterT(m)));
      };
  };
  var functorWriterT = function (dictFunctor) {
      return new Prelude.Functor(function (f) {
          return mapWriterT(Prelude["<$>"](dictFunctor)(function (v) {
              return new Data_Tuple.Tuple(f(v.value0), v.value1);
          }));
      });
  };
  var applyWriterT = function (dictSemigroup) {
      return function (dictApply) {
          return new Prelude.Apply(function () {
              return functorWriterT(dictApply["__superclass_Prelude.Functor_0"]());
          }, function (f) {
              return function (v) {
                  return WriterT((function () {
                      var k = function (v1) {
                          return function (v2) {
                              return new Data_Tuple.Tuple(v1.value0(v2.value0), Prelude["<>"](dictSemigroup)(v1.value1)(v2.value1));
                          };
                      };
                      return Prelude["<*>"](dictApply)(Prelude["<$>"](dictApply["__superclass_Prelude.Functor_0"]())(k)(runWriterT(f)))(runWriterT(v));
                  })());
              };
          });
      };
  };
  var applicativeWriterT = function (dictMonoid) {
      return function (dictApplicative) {
          return new Prelude.Applicative(function () {
              return applyWriterT(dictMonoid["__superclass_Prelude.Semigroup_0"]())(dictApplicative["__superclass_Prelude.Apply_0"]());
          }, function (a) {
              return WriterT(Prelude.pure(dictApplicative)(new Data_Tuple.Tuple(a, Data_Monoid.mempty(dictMonoid))));
          });
      };
  };
  exports["WriterT"] = WriterT;
  exports["mapWriterT"] = mapWriterT;
  exports["runWriterT"] = runWriterT;
  exports["functorWriterT"] = functorWriterT;
  exports["applyWriterT"] = applyWriterT;
  exports["applicativeWriterT"] = applicativeWriterT;;
 
})(PS["Control.Monad.Writer.Trans"] = PS["Control.Monad.Writer.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];     
  var runWriter = function ($0) {
      return Data_Identity.runIdentity(Control_Monad_Writer_Trans.runWriterT($0));
  };
  exports["runWriter"] = runWriter;;
 
})(PS["Control.Monad.Writer"] = PS["Control.Monad.Writer"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Halogen.HTML.Events.Handler"];
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Writer = PS["Control.Monad.Writer"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM = PS["DOM"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Data_Monoid = PS["Data.Monoid"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Identity = PS["Data.Identity"];     
  var PreventDefault = (function () {
      function PreventDefault() {

      };
      PreventDefault.value = new PreventDefault();
      return PreventDefault;
  })();
  var StopPropagation = (function () {
      function StopPropagation() {

      };
      StopPropagation.value = new StopPropagation();
      return StopPropagation;
  })();
  var StopImmediatePropagation = (function () {
      function StopImmediatePropagation() {

      };
      StopImmediatePropagation.value = new StopImmediatePropagation();
      return StopImmediatePropagation;
  })();
  var EventHandler = function (x) {
      return x;
  };                                                                                                                                                                                                                                                                                                                              
  var runEventHandler = function (dictMonad) {
      return function (dictMonadEff) {
          return function (e) {
              return function (v) {
                  var applyUpdate = function (v1) {
                      if (v1 instanceof PreventDefault) {
                          return $foreign.preventDefaultImpl(e);
                      };
                      if (v1 instanceof StopPropagation) {
                          return $foreign.stopPropagationImpl(e);
                      };
                      if (v1 instanceof StopImmediatePropagation) {
                          return $foreign.stopImmediatePropagationImpl(e);
                      };
                      throw new Error("Failed pattern match at Halogen.HTML.Events.Handler line 88, column 3 - line 89, column 3: " + [ v1.constructor.name ]);
                  };
                  var $13 = Control_Monad_Writer.runWriter(v);
                  return Control_Monad_Eff_Class.liftEff(dictMonadEff)(Control_Apply["*>"](Control_Monad_Eff.applyEff)(Data_Foldable.for_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)($13.value1)(applyUpdate))(Prelude["return"](Control_Monad_Eff.applicativeEff)($13.value0)));
              };
          };
      };
  };                                                                                                                                                                                                                                                                                                          
  var functorEventHandler = new Prelude.Functor(function (f) {
      return function (v) {
          return Prelude["<$>"](Control_Monad_Writer_Trans.functorWriterT(Data_Identity.functorIdentity))(f)(v);
      };
  });
  var applyEventHandler = new Prelude.Apply(function () {
      return functorEventHandler;
  }, function (v) {
      return function (v1) {
          return Prelude["<*>"](Control_Monad_Writer_Trans.applyWriterT(Prelude.semigroupArray)(Data_Identity.applyIdentity))(v)(v1);
      };
  });
  var applicativeEventHandler = new Prelude.Applicative(function () {
      return applyEventHandler;
  }, function ($23) {
      return EventHandler(Prelude.pure(Control_Monad_Writer_Trans.applicativeWriterT(Data_Monoid.monoidArray)(Data_Identity.applicativeIdentity))($23));
  });
  exports["runEventHandler"] = runEventHandler;
  exports["functorEventHandler"] = functorEventHandler;
  exports["applyEventHandler"] = applyEventHandler;
  exports["applicativeEventHandler"] = applicativeEventHandler;;
 
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Exists = PS["Data.Exists"];
  var Data_ExistsR = PS["Data.ExistsR"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];     
  var TagName = function (x) {
      return x;
  };
  var PropName = function (x) {
      return x;
  };
  var EventName = function (x) {
      return x;
  };
  var HandlerF = (function () {
      function HandlerF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      HandlerF.create = function (value0) {
          return function (value1) {
              return new HandlerF(value0, value1);
          };
      };
      return HandlerF;
  })();
  var ClassName = function (x) {
      return x;
  };
  var AttrName = function (x) {
      return x;
  };
  var PropF = (function () {
      function PropF(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      PropF.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new PropF(value0, value1, value2);
              };
          };
      };
      return PropF;
  })();
  var Prop = (function () {
      function Prop(value0) {
          this.value0 = value0;
      };
      Prop.create = function (value0) {
          return new Prop(value0);
      };
      return Prop;
  })();
  var Attr = (function () {
      function Attr(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      Attr.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new Attr(value0, value1, value2);
              };
          };
      };
      return Attr;
  })();
  var Key = (function () {
      function Key(value0) {
          this.value0 = value0;
      };
      Key.create = function (value0) {
          return new Key(value0);
      };
      return Key;
  })();
  var Handler = (function () {
      function Handler(value0) {
          this.value0 = value0;
      };
      Handler.create = function (value0) {
          return new Handler(value0);
      };
      return Handler;
  })();
  var Initializer = (function () {
      function Initializer(value0) {
          this.value0 = value0;
      };
      Initializer.create = function (value0) {
          return new Initializer(value0);
      };
      return Initializer;
  })();
  var Finalizer = (function () {
      function Finalizer(value0) {
          this.value0 = value0;
      };
      Finalizer.create = function (value0) {
          return new Finalizer(value0);
      };
      return Finalizer;
  })();
  var Text = (function () {
      function Text(value0) {
          this.value0 = value0;
      };
      Text.create = function (value0) {
          return new Text(value0);
      };
      return Text;
  })();
  var Element = (function () {
      function Element(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Element.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Element(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Element;
  })();
  var Slot = (function () {
      function Slot(value0) {
          this.value0 = value0;
      };
      Slot.create = function (value0) {
          return new Slot(value0);
      };
      return Slot;
  })();
  var IsProp = function (toPropString) {
      this.toPropString = toPropString;
  };
  var toPropString = function (dict) {
      return dict.toPropString;
  };
  var tagName = TagName;
  var stringIsProp = new IsProp(function (v) {
      return function (v1) {
          return function (s) {
              return s;
          };
      };
  });
  var runTagName = function (v) {
      return v;
  };
  var runPropName = function (v) {
      return v;
  };
  var runNamespace = function (v) {
      return v;
  };
  var runEventName = function (v) {
      return v;
  };
  var runClassName = function (v) {
      return v;
  };
  var runAttrName = function (v) {
      return v;
  };
  var propName = PropName;
  var prop = function (dictIsProp) {
      return function (name) {
          return function (attr) {
              return function (v) {
                  return new Prop(Data_Exists.mkExists(new PropF(name, v, Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(toPropString(dictIsProp)))(attr))));
              };
          };
      };
  };
  var handler = function (name) {
      return function (k) {
          return new Handler(Data_ExistsR.mkExistsR(new HandlerF(name, function ($62) {
              return Prelude.map(Halogen_HTML_Events_Handler.functorEventHandler)(Data_Maybe.Just.create)(k($62));
          })));
      };
  };
  var functorProp = new Prelude.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Prop) {
              return new Prop(v1.value0);
          };
          if (v1 instanceof Key) {
              return new Key(v1.value0);
          };
          if (v1 instanceof Attr) {
              return new Attr(v1.value0, v1.value1, v1.value2);
          };
          if (v1 instanceof Handler) {
              return Data_ExistsR.runExistsR(function (v2) {
                  return new Handler(Data_ExistsR.mkExistsR(new HandlerF(v2.value0, function ($63) {
                      return Prelude.map(Halogen_HTML_Events_Handler.functorEventHandler)(Prelude.map(Data_Maybe.functorMaybe)(v))(v2.value1($63));
                  })));
              })(v1.value0);
          };
          if (v1 instanceof Initializer) {
              return new Initializer(function ($64) {
                  return v(v1.value0($64));
              });
          };
          if (v1 instanceof Finalizer) {
              return new Finalizer(function ($65) {
                  return v(v1.value0($65));
              });
          };
          throw new Error("Failed pattern match at Halogen.HTML.Core line 101, column 1 - line 111, column 1: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var fillSlot = function (dictApplicative) {
      return function (v) {
          return function (v1) {
              return function (v2) {
                  if (v2 instanceof Text) {
                      return Prelude.pure(dictApplicative)(new Text(v2.value0));
                  };
                  if (v2 instanceof Element) {
                      return Prelude["<$>"]((dictApplicative["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Element.create(v2.value0)(v2.value1)(Prelude["<$>"](Prelude.functorArray)(Prelude["<$>"](functorProp)(v1))(v2.value2)))(Data_Traversable.traverse(Data_Traversable.traversableArray)(dictApplicative)(fillSlot(dictApplicative)(v)(v1))(v2.value3));
                  };
                  if (v2 instanceof Slot) {
                      return v(v2.value0);
                  };
                  throw new Error("Failed pattern match: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
              };
          };
      };
  };
  var eventName = EventName;
  var element = Element.create(Data_Maybe.Nothing.value);
  var className = ClassName;
  var bifunctorHTML = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          var go = function (v) {
              if (v instanceof Text) {
                  return new Text(v.value0);
              };
              if (v instanceof Element) {
                  return new Element(v.value0, v.value1, Prelude["<$>"](Prelude.functorArray)(Prelude["<$>"](functorProp)(g))(v.value2), Prelude["<$>"](Prelude.functorArray)(go)(v.value3));
              };
              if (v instanceof Slot) {
                  return new Slot(f(v.value0));
              };
              throw new Error("Failed pattern match at Halogen.HTML.Core line 62, column 1 - line 69, column 1: " + [ v.constructor.name ]);
          };
          return go;
      };
  });
  var functorHTML = new Prelude.Functor(Data_Bifunctor.rmap(bifunctorHTML));
  var attrName = AttrName;
  exports["HandlerF"] = HandlerF;
  exports["PropF"] = PropF;
  exports["Prop"] = Prop;
  exports["Attr"] = Attr;
  exports["Key"] = Key;
  exports["Handler"] = Handler;
  exports["Initializer"] = Initializer;
  exports["Finalizer"] = Finalizer;
  exports["Text"] = Text;
  exports["Element"] = Element;
  exports["Slot"] = Slot;
  exports["IsProp"] = IsProp;
  exports["runClassName"] = runClassName;
  exports["className"] = className;
  exports["runEventName"] = runEventName;
  exports["eventName"] = eventName;
  exports["runAttrName"] = runAttrName;
  exports["attrName"] = attrName;
  exports["runPropName"] = runPropName;
  exports["propName"] = propName;
  exports["runTagName"] = runTagName;
  exports["tagName"] = tagName;
  exports["runNamespace"] = runNamespace;
  exports["toPropString"] = toPropString;
  exports["handler"] = handler;
  exports["prop"] = prop;
  exports["fillSlot"] = fillSlot;
  exports["element"] = element;
  exports["bifunctorHTML"] = bifunctorHTML;
  exports["functorHTML"] = functorHTML;
  exports["functorProp"] = functorProp;
  exports["stringIsProp"] = stringIsProp;;
 
})(PS["Halogen.HTML.Core"] = PS["Halogen.HTML.Core"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];                                                                                                                   
  var title = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("title"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("title")));   
  var src = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("src"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("src")));
  var id_ = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("id"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("id")));
  var href = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("href"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("href")));
  var class_ = function ($9) {
      return Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("className"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("class")))(Halogen_HTML_Core.runClassName($9));
  };
  var alt = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("alt"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("alt")));
  exports["title"] = title;
  exports["src"] = src;
  exports["id_"] = id_;
  exports["href"] = href;
  exports["class_"] = class_;
  exports["alt"] = alt;;
 
})(PS["Halogen.HTML.Properties"] = PS["Halogen.HTML.Properties"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Array = PS["Data.Array"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties = PS["Halogen.HTML.Properties"];
  var Data_Monoid = PS["Data.Monoid"];                                  
  var title = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.title);  
  var src = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.src);                
  var id_ = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.id_);
  var href = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.href);      
  var class_ = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.class_);            
  var alt = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.alt);
  exports["title"] = title;
  exports["src"] = src;
  exports["id_"] = id_;
  exports["href"] = href;
  exports["class_"] = class_;
  exports["alt"] = alt;;
 
})(PS["Halogen.HTML.Properties.Indexed"] = PS["Halogen.HTML.Properties.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unfoldable = PS["Data.Unfoldable"];     
  var Nil = (function () {
      function Nil() {

      };
      Nil.value = new Nil();
      return Nil;
  })();
  var Cons = (function () {
      function Cons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Cons.create = function (value0) {
          return function (value1) {
              return new Cons(value0, value1);
          };
      };
      return Cons;
  })();
  var reverse = (function () {
      var go = function (__copy_acc) {
          return function (__copy_v) {
              var acc = __copy_acc;
              var v = __copy_v;
              tco: while (true) {
                  if (v instanceof Nil) {
                      return acc;
                  };
                  if (v instanceof Cons) {
                      var __tco_acc = new Cons(v.value0, acc);
                      var __tco_v = v.value1;
                      acc = __tco_acc;
                      v = __tco_v;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.List line 368, column 1 - line 369, column 1: " + [ acc.constructor.name, v.constructor.name ]);
              };
          };
      };
      return go(Nil.value);
  })();
  var foldableList = new Data_Foldable.Foldable(function (dictMonoid) {
      return function (f) {
          return Data_Foldable.foldl(foldableList)(function (acc) {
              return function ($365) {
                  return Prelude.append(dictMonoid["__superclass_Prelude.Semigroup_0"]())(acc)(f($365));
              };
          })(Data_Monoid.mempty(dictMonoid));
      };
  }, (function () {
      var go = function (__copy_v) {
          return function (__copy_b) {
              return function (__copy_v1) {
                  var v = __copy_v;
                  var b = __copy_b;
                  var v1 = __copy_v1;
                  tco: while (true) {
                      if (v1 instanceof Nil) {
                          return b;
                      };
                      if (v1 instanceof Cons) {
                          var __tco_v = v;
                          var __tco_b = v(b)(v1.value0);
                          var __tco_v1 = v1.value1;
                          v = __tco_v;
                          b = __tco_b;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      throw new Error("Failed pattern match: " + [ v.constructor.name, b.constructor.name, v1.constructor.name ]);
                  };
              };
          };
      };
      return go;
  })(), function (v) {
      return function (b) {
          return function (v1) {
              if (v1 instanceof Nil) {
                  return b;
              };
              if (v1 instanceof Cons) {
                  return v(v1.value0)(Data_Foldable.foldr(foldableList)(v)(b)(v1.value1));
              };
              throw new Error("Failed pattern match: " + [ v.constructor.name, b.constructor.name, v1.constructor.name ]);
          };
      };
  });
  exports["Nil"] = Nil;
  exports["Cons"] = Cons;
  exports["reverse"] = reverse;
  exports["foldableList"] = foldableList;;
 
})(PS["Data.List"] = PS["Data.List"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports._setTimeout = function (nonCanceler, millis, aff) {
    var set = setTimeout, clear = clearTimeout;
    if (millis <= 0 && typeof setImmediate === "function") {
      set = setImmediate;
      clear = clearImmediate;
    }
    return function(success, error) {
      var canceler;

      var timeout = set(function() {
        canceler = aff(success, error);
      }, millis);

      return function(e) {
        return function(s, f) {
          if (canceler !== undefined) {
            return canceler(e)(s, f);
          } else {
            clear(timeout);

            try {
              s(true);
            } catch (e) {
              f(e);
            }

            return nonCanceler;
          }
        };
      };
    };
  }

  exports._forkAff = function (nonCanceler, aff) {
    var voidF = function(){};

    return function(success, error) {
      var canceler = aff(voidF, voidF);

      try {
        success(canceler);
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    };
  }

  exports._pure = function (nonCanceler, v) {
    return function(success, error) {
      try {
        success(v);
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    };
  }

  exports._throwError = function (nonCanceler, e) {
    return function(success, error) {
      error(e);

      return nonCanceler;
    };
  }

  exports._fmap = function (f, aff) {
    return function(success, error) {
      return aff(function(v) {
        try {
          success(f(v));
        } catch (e) {
          error(e);
        }
      }, error);
    };
  }

  exports._bind = function (alwaysCanceler, aff, f) {
    return function(success, error) {
      var canceler1, canceler2;

      var isCanceled    = false;
      var requestCancel = false;

      var onCanceler = function(){};

      canceler1 = aff(function(v) {
        if (requestCancel) {
          isCanceled = true;

          return alwaysCanceler;
        } else {
          canceler2 = f(v)(success, error);

          onCanceler(canceler2);

          return canceler2;
        }
      }, error);

      return function(e) {
        return function(s, f) {
          requestCancel = true;

          if (canceler2 !== undefined) {
            return canceler2(e)(s, f);
          } else {
            return canceler1(e)(function(bool) {
              if (bool || isCanceled) {
                try {
                  s(true);
                } catch (e) {
                  f(e);
                }
              } else {
                onCanceler = function(canceler) {
                  canceler(e)(s, f);
                };
              }
            }, f);
          }
        };
      };
    };
  }

  exports._attempt = function (Left, Right, aff) {
    return function(success, error) {
      return aff(function(v) {
        try {
          success(Right(v));
        } catch (e) {
          error(e);
        }
      }, function(e) {
        try {
          success(Left(e));
        } catch (e) {
          error(e);
        }
      });
    };
  }

  exports._runAff = function (errorT, successT, aff) {
    return function() {
      return aff(function(v) {
        try {
          successT(v)();
        } catch (e) {
          errorT(e)();
        }
      }, function(e) {
        errorT(e)();
      });
    };
  }

  exports._liftEff = function (nonCanceler, e) {
    return function(success, error) {
      try {
        success(e());
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    };
  }
 
})(PS["Control.Monad.Aff"] = PS["Control.Monad.Aff"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.error = function (msg) {
    return new Error(msg);
  };

  exports.throwException = function (e) {
    return function () {
      throw e;
    };
  };
 
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Exception"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["throwException"] = $foreign.throwException;
  exports["error"] = $foreign.error;;
 
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Control.Monad.Aff"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Either = PS["Data.Either"];
  var Data_Function = PS["Data.Function"];
  var Data_Monoid = PS["Data.Monoid"];
  var runAff = function (ex) {
      return function (f) {
          return function (aff) {
              return $foreign._runAff(ex, f, aff);
          };
      };
  };
  var functorAff = new Prelude.Functor(function (f) {
      return function (fa) {
          return $foreign._fmap(f, fa);
      };
  });
  var attempt = function (aff) {
      return $foreign._attempt(Data_Either.Left.create, Data_Either.Right.create, aff);
  };
  var applyAff = new Prelude.Apply(function () {
      return functorAff;
  }, function (ff) {
      return function (fa) {
          return $foreign._bind(alwaysCanceler, ff, function (f) {
              return Prelude["<$>"](functorAff)(f)(fa);
          });
      };
  });
  var applicativeAff = new Prelude.Applicative(function () {
      return applyAff;
  }, function (v) {
      return $foreign._pure(nonCanceler, v);
  });
  var nonCanceler = Prelude["const"](Prelude.pure(applicativeAff)(false));
  var alwaysCanceler = Prelude["const"](Prelude.pure(applicativeAff)(true));
  var forkAff = function (aff) {
      return $foreign._forkAff(nonCanceler, aff);
  };
  var later$prime = function (n) {
      return function (aff) {
          return $foreign._setTimeout(nonCanceler, n, aff);
      };
  };
  var later = later$prime(0);                              
  var bindAff = new Prelude.Bind(function () {
      return applyAff;
  }, function (fa) {
      return function (f) {
          return $foreign._bind(alwaysCanceler, fa, f);
      };
  });
  var monadAff = new Prelude.Monad(function () {
      return applicativeAff;
  }, function () {
      return bindAff;
  });
  var monadEffAff = new Control_Monad_Eff_Class.MonadEff(function () {
      return monadAff;
  }, function (eff) {
      return $foreign._liftEff(nonCanceler, eff);
  });
  var monadErrorAff = new Control_Monad_Error_Class.MonadError(function () {
      return monadAff;
  }, function (aff) {
      return function (ex) {
          return Prelude[">>="](bindAff)(attempt(aff))(Data_Either.either(ex)(Prelude.pure(applicativeAff)));
      };
  }, function (e) {
      return $foreign._throwError(nonCanceler, e);
  });
  var monadRecAff = new Control_Monad_Rec_Class.MonadRec(function () {
      return monadAff;
  }, function (f) {
      return function (a) {
          var go = function (size) {
              return function (f1) {
                  return function (a1) {
                      return Prelude.bind(bindAff)(f1(a1))(function (v) {
                          if (v instanceof Data_Either.Left) {
                              if (size < 100) {
                                  return go(size + 1 | 0)(f1)(v.value0);
                              };
                              if (Prelude.otherwise) {
                                  return later(Control_Monad_Rec_Class.tailRecM(monadRecAff)(f1)(v.value0));
                              };
                          };
                          if (v instanceof Data_Either.Right) {
                              return Prelude.pure(applicativeAff)(v.value0);
                          };
                          throw new Error("Failed pattern match: " + [ v.constructor.name ]);
                      });
                  };
              };
          };
          return go(0)(f)(a);
      };
  });
  var altAff = new Control_Alt.Alt(function () {
      return functorAff;
  }, function (a1) {
      return function (a2) {
          return Prelude[">>="](bindAff)(attempt(a1))(Data_Either.either(Prelude["const"](a2))(Prelude.pure(applicativeAff)));
      };
  });
  var plusAff = new Control_Plus.Plus(function () {
      return altAff;
  }, Control_Monad_Error_Class.throwError(monadErrorAff)(Control_Monad_Eff_Exception.error("Always fails")));
  exports["runAff"] = runAff;
  exports["nonCanceler"] = nonCanceler;
  exports["later'"] = later$prime;
  exports["later"] = later;
  exports["forkAff"] = forkAff;
  exports["attempt"] = attempt;
  exports["functorAff"] = functorAff;
  exports["applyAff"] = applyAff;
  exports["applicativeAff"] = applicativeAff;
  exports["bindAff"] = bindAff;
  exports["monadAff"] = monadAff;
  exports["monadEffAff"] = monadEffAff;
  exports["monadErrorAff"] = monadErrorAff;
  exports["altAff"] = altAff;
  exports["plusAff"] = plusAff;
  exports["monadRecAff"] = monadRecAff;;
 
})(PS["Control.Monad.Aff"] = PS["Control.Monad.Aff"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var span = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("span"))(xs);
  };
  var p = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("p"))(xs);
  };
  var p_ = p([  ]);
  var img = function (props) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("img"))(props)([  ]);
  };
  var i = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("i"))(xs);
  };                 
  var h3 = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("h3"))(xs);
  };
  var h3_ = h3([  ]);
  var h1 = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("h1"))(xs);
  };                 
  var div = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("div"))(xs);
  };
  var div_ = div([  ]);      
  var br = function (props) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("br"))(props)([  ]);
  };
  var br_ = br([  ]);    
  var a = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("a"))(xs);
  };
  exports["span"] = span;
  exports["p_"] = p_;
  exports["p"] = p;
  exports["img"] = img;
  exports["i"] = i;
  exports["h3_"] = h3_;
  exports["h3"] = h3;
  exports["h1"] = h1;
  exports["div_"] = div_;
  exports["div"] = div;
  exports["br_"] = br_;
  exports["br"] = br;
  exports["a"] = a;;
 
})(PS["Halogen.HTML.Elements"] = PS["Halogen.HTML.Elements"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var $eq$less$less = function (dictBind) {
      return function (f) {
          return function (m) {
              return Prelude[">>="](dictBind)(m)(f);
          };
      };
  };
  var $less$eq$less = function (dictBind) {
      return function (f) {
          return function (g) {
              return function (a) {
                  return $eq$less$less(dictBind)(f)(g(a));
              };
          };
      };
  };
  exports["<=<"] = $less$eq$less;
  exports["=<<"] = $eq$less$less;;
 
})(PS["Control.Bind"] = PS["Control.Bind"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];     
  var CatQueue = (function () {
      function CatQueue(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CatQueue.create = function (value0) {
          return function (value1) {
              return new CatQueue(value0, value1);
          };
      };
      return CatQueue;
  })();
  var uncons = function (__copy_v) {
      var v = __copy_v;
      tco: while (true) {
          if (v.value0 instanceof Data_List.Nil && v.value1 instanceof Data_List.Nil) {
              return Data_Maybe.Nothing.value;
          };
          if (v.value0 instanceof Data_List.Nil) {
              var __tco_v = new CatQueue(Data_List.reverse(v.value1), Data_List.Nil.value);
              v = __tco_v;
              continue tco;
          };
          if (v.value0 instanceof Data_List.Cons) {
              return new Data_Maybe.Just(new Data_Tuple.Tuple(v.value0.value0, new CatQueue(v.value0.value1, v.value1)));
          };
          throw new Error("Failed pattern match: " + [ v.constructor.name ]);
      };
  };
  var snoc = function (v) {
      return function (a) {
          return new CatQueue(v.value0, new Data_List.Cons(a, v.value1));
      };
  };
  var $$null = function (v) {
      if (v.value0 instanceof Data_List.Nil && v.value1 instanceof Data_List.Nil) {
          return true;
      };
      return false;
  };
  var empty = new CatQueue(Data_List.Nil.value, Data_List.Nil.value);
  exports["CatQueue"] = CatQueue;
  exports["uncons"] = uncons;
  exports["snoc"] = snoc;
  exports["null"] = $$null;
  exports["empty"] = empty;;
 
})(PS["Data.CatQueue"] = PS["Data.CatQueue"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_CatQueue = PS["Data.CatQueue"];
  var Data_List = PS["Data.List"];     
  var CatNil = (function () {
      function CatNil() {

      };
      CatNil.value = new CatNil();
      return CatNil;
  })();
  var CatCons = (function () {
      function CatCons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CatCons.create = function (value0) {
          return function (value1) {
              return new CatCons(value0, value1);
          };
      };
      return CatCons;
  })();
  var link = function (v) {
      return function (cat) {
          if (v instanceof CatNil) {
              return cat;
          };
          if (v instanceof CatCons) {
              return new CatCons(v.value0, Data_CatQueue.snoc(v.value1)(cat));
          };
          throw new Error("Failed pattern match at Data.CatList line 88, column 1 - line 89, column 1: " + [ v.constructor.name, cat.constructor.name ]);
      };
  };
  var foldr = function (k) {
      return function (b) {
          return function (q) {
              var foldl = function (__copy_v) {
                  return function (__copy_c) {
                      return function (__copy_v1) {
                          var v = __copy_v;
                          var c = __copy_c;
                          var v1 = __copy_v1;
                          tco: while (true) {
                              if (v1 instanceof Data_List.Nil) {
                                  return c;
                              };
                              if (v1 instanceof Data_List.Cons) {
                                  var __tco_v = v;
                                  var __tco_c = v(c)(v1.value0);
                                  var __tco_v1 = v1.value1;
                                  v = __tco_v;
                                  c = __tco_c;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              throw new Error("Failed pattern match at Data.CatList line 95, column 1 - line 96, column 1: " + [ v.constructor.name, c.constructor.name, v1.constructor.name ]);
                          };
                      };
                  };
              };
              var go = function (__copy_xs) {
                  return function (__copy_ys) {
                      var xs = __copy_xs;
                      var ys = __copy_ys;
                      tco: while (true) {
                          var $22 = Data_CatQueue.uncons(xs);
                          if ($22 instanceof Data_Maybe.Nothing) {
                              return foldl(function (x) {
                                  return function (i) {
                                      return i(x);
                                  };
                              })(b)(ys);
                          };
                          if ($22 instanceof Data_Maybe.Just) {
                              var __tco_ys = new Data_List.Cons(k($22.value0.value0), ys);
                              xs = $22.value0.value1;
                              ys = __tco_ys;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.CatList line 95, column 1 - line 96, column 1: " + [ $22.constructor.name ]);
                      };
                  };
              };
              return go(q)(Data_List.Nil.value);
          };
      };
  };
  var uncons = function (v) {
      if (v instanceof CatNil) {
          return Data_Maybe.Nothing.value;
      };
      if (v instanceof CatCons) {
          return new Data_Maybe.Just(new Data_Tuple.Tuple(v.value0, (function () {
              var $27 = Data_CatQueue["null"](v.value1);
              if ($27) {
                  return CatNil.value;
              };
              if (!$27) {
                  return foldr(link)(CatNil.value)(v.value1);
              };
              throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 80, column 1: " + [ $27.constructor.name ]);
          })()));
      };
      throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 80, column 1: " + [ v.constructor.name ]);
  };
  var empty = CatNil.value;
  var append = function (v) {
      return function (v1) {
          if (v1 instanceof CatNil) {
              return v;
          };
          if (v instanceof CatNil) {
              return v1;
          };
          return link(v)(v1);
      };
  };
  var semigroupCatList = new Prelude.Semigroup(append);
  var snoc = function (cat) {
      return function (a) {
          return append(cat)(new CatCons(a, Data_CatQueue.empty));
      };
  };
  exports["CatNil"] = CatNil;
  exports["CatCons"] = CatCons;
  exports["uncons"] = uncons;
  exports["snoc"] = snoc;
  exports["append"] = append;
  exports["empty"] = empty;
  exports["semigroupCatList"] = semigroupCatList;;
 
})(PS["Data.CatList"] = PS["Data.CatList"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Data_CatList = PS["Data.CatList"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Inject = PS["Data.Inject"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Data_Tuple = PS["Data.Tuple"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Free = (function () {
      function Free(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Free.create = function (value0) {
          return function (value1) {
              return new Free(value0, value1);
          };
      };
      return Free;
  })();
  var Return = (function () {
      function Return(value0) {
          this.value0 = value0;
      };
      Return.create = function (value0) {
          return new Return(value0);
      };
      return Return;
  })();
  var Bind = (function () {
      function Bind(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Bind.create = function (value0) {
          return function (value1) {
              return new Bind(value0, value1);
          };
      };
      return Bind;
  })();
  var toView = function (__copy_v) {
      var v = __copy_v;
      tco: while (true) {
          var runExpF = function (v2) {
              return v2;
          };
          var concatF = function (v2) {
              return function (r) {
                  return new Free(v2.value0, Prelude["<>"](Data_CatList.semigroupCatList)(v2.value1)(r));
              };
          };
          if (v.value0 instanceof Return) {
              var $19 = Data_CatList.uncons(v.value1);
              if ($19 instanceof Data_Maybe.Nothing) {
                  return new Return(Unsafe_Coerce.unsafeCoerce(v.value0.value0));
              };
              if ($19 instanceof Data_Maybe.Just) {
                  var __tco_v = Unsafe_Coerce.unsafeCoerce(concatF(runExpF($19.value0.value0)(v.value0.value0))($19.value0.value1));
                  v = __tco_v;
                  continue tco;
              };
              throw new Error("Failed pattern match: " + [ $19.constructor.name ]);
          };
          if (v.value0 instanceof Bind) {
              return new Bind(v.value0.value0, function (a) {
                  return Unsafe_Coerce.unsafeCoerce(concatF(v.value0.value1(a))(v.value1));
              });
          };
          throw new Error("Failed pattern match: " + [ v.value0.constructor.name ]);
      };
  };
  var runFreeM = function (dictFunctor) {
      return function (dictMonadRec) {
          return function (k) {
              var go = function (f) {
                  var $28 = toView(f);
                  if ($28 instanceof Return) {
                      return Prelude["<$>"]((((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(Prelude.pure((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())($28.value0));
                  };
                  if ($28 instanceof Bind) {
                      return Prelude["<$>"]((((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Left.create)(k(Prelude["<$>"](dictFunctor)($28.value1)($28.value0)));
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free line 123, column 3 - line 124, column 3: " + [ $28.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(dictMonadRec)(go);
          };
      };
  };
  var fromView = function (f) {
      return new Free(Unsafe_Coerce.unsafeCoerce(f), Data_CatList.empty);
  };
  var freeMonad = new Prelude.Monad(function () {
      return freeApplicative;
  }, function () {
      return freeBind;
  });
  var freeFunctor = new Prelude.Functor(function (k) {
      return function (f) {
          return Prelude[">>="](freeBind)(f)(function ($43) {
              return Prelude["return"](freeApplicative)(k($43));
          });
      };
  });
  var freeBind = new Prelude.Bind(function () {
      return freeApply;
  }, function (v) {
      return function (k) {
          return new Free(v.value0, Data_CatList.snoc(v.value1)(Unsafe_Coerce.unsafeCoerce(k)));
      };
  });
  var freeApply = new Prelude.Apply(function () {
      return freeFunctor;
  }, Prelude.ap(freeMonad));
  var freeApplicative = new Prelude.Applicative(function () {
      return freeApply;
  }, function ($44) {
      return fromView(Return.create($44));
  });
  var liftF = function (f) {
      return fromView(new Bind(Unsafe_Coerce.unsafeCoerce(f), function ($45) {
          return Prelude.pure(freeApplicative)(Unsafe_Coerce.unsafeCoerce($45));
      }));
  };
  exports["runFreeM"] = runFreeM;
  exports["liftF"] = liftF;
  exports["freeFunctor"] = freeFunctor;
  exports["freeBind"] = freeBind;
  exports["freeApplicative"] = freeApplicative;
  exports["freeApply"] = freeApply;
  exports["freeMonad"] = freeMonad;;
 
})(PS["Control.Monad.Free"] = PS["Control.Monad.Free"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Exists = PS["Data.Exists"];
  var Data_Either = PS["Data.Either"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];     
  var Bound = (function () {
      function Bound(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Bound.create = function (value0) {
          return function (value1) {
              return new Bound(value0, value1);
          };
      };
      return Bound;
  })();
  var FreeT = (function () {
      function FreeT(value0) {
          this.value0 = value0;
      };
      FreeT.create = function (value0) {
          return new FreeT(value0);
      };
      return FreeT;
  })();
  var Bind = (function () {
      function Bind(value0) {
          this.value0 = value0;
      };
      Bind.create = function (value0) {
          return new Bind(value0);
      };
      return Bind;
  })();
  var monadTransFreeT = function (dictFunctor) {
      return new Control_Monad_Trans.MonadTrans(function (dictMonad) {
          return function (ma) {
              return new FreeT(function (v) {
                  return Prelude.map(((dictMonad["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Left.create)(ma);
              });
          };
      });
  };
  var freeT = FreeT.create;
  var bound = function (m) {
      return function (f) {
          return new Bind(Data_Exists.mkExists(new Bound(m, f)));
      };
  };
  var functorFreeT = function (dictFunctor) {
      return function (dictFunctor1) {
          return new Prelude.Functor(function (f) {
              return function (v) {
                  if (v instanceof FreeT) {
                      return new FreeT(function (v1) {
                          return Prelude.map(dictFunctor1)(Data_Bifunctor.bimap(Data_Either.bifunctorEither)(f)(Prelude.map(dictFunctor)(Prelude.map(functorFreeT(dictFunctor)(dictFunctor1))(f))))(v.value0(Prelude.unit));
                      });
                  };
                  if (v instanceof Bind) {
                      return Data_Exists.runExists(function (v1) {
                          return bound(v1.value0)(function ($98) {
                              return Prelude.map(functorFreeT(dictFunctor)(dictFunctor1))(f)(v1.value1($98));
                          });
                      })(v.value0);
                  };
                  throw new Error("Failed pattern match: " + [ f.constructor.name, v.constructor.name ]);
              };
          });
      };
  };
  var bimapFreeT = function (dictFunctor) {
      return function (dictFunctor1) {
          return function (nf) {
              return function (nm) {
                  return function (v) {
                      if (v instanceof Bind) {
                          return Data_Exists.runExists(function (v1) {
                              return bound(function ($99) {
                                  return bimapFreeT(dictFunctor)(dictFunctor1)(nf)(nm)(v1.value0($99));
                              })(function ($100) {
                                  return bimapFreeT(dictFunctor)(dictFunctor1)(nf)(nm)(v1.value1($100));
                              });
                          })(v.value0);
                      };
                      if (v instanceof FreeT) {
                          return new FreeT(function (v1) {
                              return Prelude["<$>"](dictFunctor1)(Prelude.map(Data_Either.functorEither)(function ($101) {
                                  return nf(Prelude.map(dictFunctor)(bimapFreeT(dictFunctor)(dictFunctor1)(nf)(nm))($101));
                              }))(nm(v.value0(Prelude.unit)));
                          });
                      };
                      throw new Error("Failed pattern match: " + [ nf.constructor.name, nm.constructor.name, v.constructor.name ]);
                  };
              };
          };
      };
  };
  var hoistFreeT = function (dictFunctor) {
      return function (dictFunctor1) {
          return bimapFreeT(dictFunctor)(dictFunctor1)(Prelude.id(Prelude.categoryFn));
      };
  };
  var monadFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Prelude.Monad(function () {
              return applicativeFreeT(dictFunctor)(dictMonad);
          }, function () {
              return bindFreeT(dictFunctor)(dictMonad);
          });
      };
  };
  var bindFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Prelude.Bind(function () {
              return applyFreeT(dictFunctor)(dictMonad);
          }, function (v) {
              return function (f) {
                  if (v instanceof Bind) {
                      return Data_Exists.runExists(function (v1) {
                          return bound(v1.value0)(function (x) {
                              return bound(function (v2) {
                                  return v1.value1(x);
                              })(f);
                          });
                      })(v.value0);
                  };
                  return bound(function (v1) {
                      return v;
                  })(f);
              };
          });
      };
  };
  var applyFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Prelude.Apply(function () {
              return functorFreeT(dictFunctor)(((dictMonad["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
          }, Prelude.ap(monadFreeT(dictFunctor)(dictMonad)));
      };
  };
  var applicativeFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Prelude.Applicative(function () {
              return applyFreeT(dictFunctor)(dictMonad);
          }, function (a) {
              return new FreeT(function (v) {
                  return Prelude.pure(dictMonad["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(a));
              });
          });
      };
  };
  var liftFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return function (fa) {
              return new FreeT(function (v) {
                  return Prelude["return"](dictMonad["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(Prelude.map(dictFunctor)(Prelude.pure(applicativeFreeT(dictFunctor)(dictMonad)))(fa)));
              });
          };
      };
  };
  var resume = function (dictFunctor) {
      return function (dictMonadRec) {
          var go = function (v) {
              if (v instanceof FreeT) {
                  return Prelude.map((((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(v.value0(Prelude.unit));
              };
              if (v instanceof Bind) {
                  return Data_Exists.runExists(function (v1) {
                      var $77 = v1.value0(Prelude.unit);
                      if ($77 instanceof FreeT) {
                          return Prelude.bind((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())($77.value0(Prelude.unit))(function (v2) {
                              if (v2 instanceof Data_Either.Left) {
                                  return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(v1.value1(v2.value0)));
                              };
                              if (v2 instanceof Data_Either.Right) {
                                  return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(new Data_Either.Right(Prelude.map(dictFunctor)(function (h) {
                                      return Prelude[">>="](bindFreeT(dictFunctor)(dictMonadRec["__superclass_Prelude.Monad_0"]()))(h)(v1.value1);
                                  })(v2.value0))));
                              };
                              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ v2.constructor.name ]);
                          });
                      };
                      if ($77 instanceof Bind) {
                          return Data_Exists.runExists(function (v2) {
                              return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(Prelude.bind(bindFreeT(dictFunctor)(dictMonadRec["__superclass_Prelude.Monad_0"]()))(v2.value0(Prelude.unit))(function (z) {
                                  return Prelude[">>="](bindFreeT(dictFunctor)(dictMonadRec["__superclass_Prelude.Monad_0"]()))(v2.value1(z))(v1.value1);
                              })));
                          })($77.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ $77.constructor.name ]);
                  })(v.value0);
              };
              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ v.constructor.name ]);
          };
          return Control_Monad_Rec_Class.tailRecM(dictMonadRec)(go);
      };
  };
  var runFreeT = function (dictFunctor) {
      return function (dictMonadRec) {
          return function (interp) {
              var go = function (v) {
                  if (v instanceof Data_Either.Left) {
                      return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(v.value0));
                  };
                  if (v instanceof Data_Either.Right) {
                      return Prelude.bind((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(interp(v.value0))(function (v1) {
                          return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(v1));
                      });
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free.Trans line 103, column 3 - line 104, column 3: " + [ v.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(dictMonadRec)(Control_Bind["<=<"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(go)(resume(dictFunctor)(dictMonadRec)));
          };
      };
  };
  var monadRecFreeT = function (dictFunctor) {
      return function (dictMonad) {
          return new Control_Monad_Rec_Class.MonadRec(function () {
              return monadFreeT(dictFunctor)(dictMonad);
          }, function (f) {
              var go = function (s) {
                  return Prelude.bind(bindFreeT(dictFunctor)(dictMonad))(f(s))(function (v) {
                      if (v instanceof Data_Either.Left) {
                          return go(v.value0);
                      };
                      if (v instanceof Data_Either.Right) {
                          return Prelude["return"](applicativeFreeT(dictFunctor)(dictMonad))(v.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 73, column 1 - line 83, column 1: " + [ v.constructor.name ]);
                  });
              };
              return go;
          });
      };
  };
  exports["runFreeT"] = runFreeT;
  exports["resume"] = resume;
  exports["bimapFreeT"] = bimapFreeT;
  exports["hoistFreeT"] = hoistFreeT;
  exports["liftFreeT"] = liftFreeT;
  exports["freeT"] = freeT;
  exports["functorFreeT"] = functorFreeT;
  exports["applyFreeT"] = applyFreeT;
  exports["applicativeFreeT"] = applicativeFreeT;
  exports["bindFreeT"] = bindFreeT;
  exports["monadFreeT"] = monadFreeT;
  exports["monadTransFreeT"] = monadTransFreeT;
  exports["monadRecFreeT"] = monadRecFreeT;;
 
})(PS["Control.Monad.Free.Trans"] = PS["Control.Monad.Free.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];     
  var StateT = function (x) {
      return x;
  };
  var runStateT = function (v) {
      return v;
  };
  var monadStateT = function (dictMonad) {
      return new Prelude.Monad(function () {
          return applicativeStateT(dictMonad);
      }, function () {
          return bindStateT(dictMonad);
      });
  };
  var functorStateT = function (dictMonad) {
      return new Prelude.Functor(Prelude.liftM1(monadStateT(dictMonad)));
  };
  var bindStateT = function (dictMonad) {
      return new Prelude.Bind(function () {
          return applyStateT(dictMonad);
      }, function (v) {
          return function (f) {
              return function (s) {
                  return Prelude.bind(dictMonad["__superclass_Prelude.Bind_1"]())(v(s))(function (v1) {
                      return runStateT(f(v1.value0))(v1.value1);
                  });
              };
          };
      });
  };
  var applyStateT = function (dictMonad) {
      return new Prelude.Apply(function () {
          return functorStateT(dictMonad);
      }, Prelude.ap(monadStateT(dictMonad)));
  };
  var applicativeStateT = function (dictMonad) {
      return new Prelude.Applicative(function () {
          return applyStateT(dictMonad);
      }, function (a) {
          return StateT(function (s) {
              return Prelude["return"](dictMonad["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(a, s));
          });
      });
  };
  var monadStateStateT = function (dictMonad) {
      return new Control_Monad_State_Class.MonadState(function () {
          return monadStateT(dictMonad);
      }, function (f) {
          return StateT(function ($63) {
              return Prelude["return"](dictMonad["__superclass_Prelude.Applicative_0"]())(f($63));
          });
      });
  };
  exports["StateT"] = StateT;
  exports["runStateT"] = runStateT;
  exports["functorStateT"] = functorStateT;
  exports["applyStateT"] = applyStateT;
  exports["applicativeStateT"] = applicativeStateT;
  exports["bindStateT"] = bindStateT;
  exports["monadStateT"] = monadStateT;
  exports["monadStateStateT"] = monadStateStateT;;
 
})(PS["Control.Monad.State.Trans"] = PS["Control.Monad.State.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];                   
  var runState = function (s) {
      return function ($0) {
          return Data_Identity.runIdentity(Control_Monad_State_Trans.runStateT(s)($0));
      };
  };
  exports["runState"] = runState;;
 
})(PS["Control.Monad.State"] = PS["Control.Monad.State"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Coproduct = function (x) {
      return x;
  };
  var right = function ($11) {
      return Coproduct(Data_Either.Right.create($11));
  };
  var left = function ($12) {
      return Coproduct(Data_Either.Left.create($12));
  };
  exports["Coproduct"] = Coproduct;
  exports["right"] = right;
  exports["left"] = left;;
 
})(PS["Data.Functor.Coproduct"] = PS["Data.Functor.Coproduct"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];     
  var Leaf = (function () {
      function Leaf() {

      };
      Leaf.value = new Leaf();
      return Leaf;
  })();
  var Two = (function () {
      function Two(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Two.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Two(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Two;
  })();
  var Three = (function () {
      function Three(value0, value1, value2, value3, value4, value5, value6) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
          this.value6 = value6;
      };
      Three.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return function (value6) {
                                  return new Three(value0, value1, value2, value3, value4, value5, value6);
                              };
                          };
                      };
                  };
              };
          };
      };
      return Three;
  })();
  var TwoLeft = (function () {
      function TwoLeft(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoLeft(value0, value1, value2);
              };
          };
      };
      return TwoLeft;
  })();
  var TwoRight = (function () {
      function TwoRight(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoRight(value0, value1, value2);
              };
          };
      };
      return TwoRight;
  })();
  var ThreeLeft = (function () {
      function ThreeLeft(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeLeft(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeLeft;
  })();
  var ThreeMiddle = (function () {
      function ThreeMiddle(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeMiddle.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeMiddle(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeMiddle;
  })();
  var ThreeRight = (function () {
      function ThreeRight(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeRight(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeRight;
  })();
  var KickUp = (function () {
      function KickUp(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      KickUp.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new KickUp(value0, value1, value2, value3);
                  };
              };
          };
      };
      return KickUp;
  })();
  var lookup = function (__copy_dictOrd) {
      return function (__copy_v) {
          return function (__copy_v1) {
              var dictOrd = __copy_dictOrd;
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v1 instanceof Leaf) {
                      return Data_Maybe.Nothing.value;
                  };
                  if (v1 instanceof Two && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value1)) {
                      return new Data_Maybe.Just(v1.value2);
                  };
                  if (v1 instanceof Two && Prelude["<"](dictOrd)(v)(v1.value1)) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v;
                      var __tco_v1 = v1.value0;
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v1 instanceof Two) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v;
                      var __tco_v1 = v1.value3;
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v1 instanceof Three && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value1)) {
                      return new Data_Maybe.Just(v1.value2);
                  };
                  if (v1 instanceof Three && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value4)) {
                      return new Data_Maybe.Just(v1.value5);
                  };
                  if (v1 instanceof Three && Prelude["<"](dictOrd)(v)(v1.value1)) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v;
                      var __tco_v1 = v1.value0;
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v1 instanceof Three && (Prelude["<"](dictOrd)(v1.value1)(v) && Prelude["<="](dictOrd)(v)(v1.value4))) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v;
                      var __tco_v1 = v1.value3;
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v1 instanceof Three) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v;
                      var __tco_v1 = v1.value6;
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  throw new Error("Failed pattern match: " + [ v.constructor.name, v1.constructor.name ]);
              };
          };
      };
  }; 
  var fromZipper = function (__copy_dictOrd) {
      return function (__copy_v) {
          return function (__copy_v1) {
              var dictOrd = __copy_dictOrd;
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return v1;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof TwoLeft) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v.value1;
                      var __tco_v1 = new Two(v1, v.value0.value0, v.value0.value1, v.value0.value2);
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof TwoRight) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v.value1;
                      var __tco_v1 = new Two(v.value0.value0, v.value0.value1, v.value0.value2, v1);
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof ThreeLeft) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v.value1;
                      var __tco_v1 = new Three(v1, v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5);
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof ThreeMiddle) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v.value1;
                      var __tco_v1 = new Three(v.value0.value0, v.value0.value1, v.value0.value2, v1, v.value0.value3, v.value0.value4, v.value0.value5);
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof ThreeRight) {
                      var __tco_dictOrd = dictOrd;
                      var __tco_v = v.value1;
                      var __tco_v1 = new Three(v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5, v1);
                      dictOrd = __tco_dictOrd;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  throw new Error("Failed pattern match: " + [ v.constructor.name, v1.constructor.name ]);
              };
          };
      };
  };
  var insert = function (dictOrd) {
      var up = function (__copy_v) {
          return function (__copy_v1) {
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return new Two(v1.value0, v1.value1, v1.value2, v1.value3);
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof TwoLeft) {
                      return fromZipper(dictOrd)(v.value1)(new Three(v1.value0, v1.value1, v1.value2, v1.value3, v.value0.value0, v.value0.value1, v.value0.value2));
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof TwoRight) {
                      return fromZipper(dictOrd)(v.value1)(new Three(v.value0.value0, v.value0.value1, v.value0.value2, v1.value0, v1.value1, v1.value2, v1.value3));
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof ThreeLeft) {
                      var __tco_v = v.value1;
                      var __tco_v1 = new KickUp(new Two(v1.value0, v1.value1, v1.value2, v1.value3), v.value0.value0, v.value0.value1, new Two(v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5));
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof ThreeMiddle) {
                      var __tco_v = v.value1;
                      var __tco_v1 = new KickUp(new Two(v.value0.value0, v.value0.value1, v.value0.value2, v1.value0), v1.value1, v1.value2, new Two(v1.value3, v.value0.value3, v.value0.value4, v.value0.value5));
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && v.value0 instanceof ThreeRight) {
                      var __tco_v = v.value1;
                      var __tco_v1 = new KickUp(new Two(v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3), v.value0.value4, v.value0.value5, new Two(v1.value0, v1.value1, v1.value2, v1.value3));
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.Map line 150, column 1 - line 151, column 1: " + [ v.constructor.name, v1.constructor.name ]);
              };
          };
      };
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy_v) {
                  return function (__copy_v1) {
                      var ctx = __copy_ctx;
                      var k = __copy_k;
                      var v = __copy_v;
                      var v1 = __copy_v1;
                      tco: while (true) {
                          if (v1 instanceof Leaf) {
                              return up(ctx)(new KickUp(Leaf.value, k, v, Leaf.value));
                          };
                          if (v1 instanceof Two && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(k)(v1.value1)) {
                              return fromZipper(dictOrd)(ctx)(new Two(v1.value0, k, v, v1.value3));
                          };
                          if (v1 instanceof Two && Prelude["<"](dictOrd)(k)(v1.value1)) {
                              var __tco_ctx = new Data_List.Cons(new TwoLeft(v1.value1, v1.value2, v1.value3), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value0;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (v1 instanceof Two) {
                              var __tco_ctx = new Data_List.Cons(new TwoRight(v1.value0, v1.value1, v1.value2), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value3;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (v1 instanceof Three && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(k)(v1.value1)) {
                              return fromZipper(dictOrd)(ctx)(new Three(v1.value0, k, v, v1.value3, v1.value4, v1.value5, v1.value6));
                          };
                          if (v1 instanceof Three && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(k)(v1.value4)) {
                              return fromZipper(dictOrd)(ctx)(new Three(v1.value0, v1.value1, v1.value2, v1.value3, k, v, v1.value6));
                          };
                          if (v1 instanceof Three && Prelude["<"](dictOrd)(k)(v1.value1)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeLeft(v1.value1, v1.value2, v1.value3, v1.value4, v1.value5, v1.value6), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value0;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (v1 instanceof Three && (Prelude["<"](dictOrd)(v1.value1)(k) && Prelude["<="](dictOrd)(k)(v1.value4))) {
                              var __tco_ctx = new Data_List.Cons(new ThreeMiddle(v1.value0, v1.value1, v1.value2, v1.value4, v1.value5, v1.value6), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value3;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (v1 instanceof Three) {
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(v1.value0, v1.value1, v1.value2, v1.value3, v1.value4, v1.value5), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.Map line 150, column 1 - line 151, column 1: " + [ ctx.constructor.name, k.constructor.name, v.constructor.name, v1.constructor.name ]);
                      };
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var empty = Leaf.value;
  var $$delete = function (dictOrd) {
      var up = function (__copy_v) {
          return function (__copy_v1) {
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return v1;
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof TwoLeft && (v.value0.value2 instanceof Leaf && v1 instanceof Leaf))) {
                      return fromZipper(dictOrd)(v.value1)(new Two(Leaf.value, v.value0.value0, v.value0.value1, Leaf.value));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof TwoRight && (v.value0.value0 instanceof Leaf && v1 instanceof Leaf))) {
                      return fromZipper(dictOrd)(v.value1)(new Two(Leaf.value, v.value0.value1, v.value0.value2, Leaf.value));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof TwoLeft && v.value0.value2 instanceof Two)) {
                      var __tco_v = v.value1;
                      var __tco_v1 = new Three(v1, v.value0.value0, v.value0.value1, v.value0.value2.value0, v.value0.value2.value1, v.value0.value2.value2, v.value0.value2.value3);
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof TwoRight && v.value0.value0 instanceof Two)) {
                      var __tco_v = v.value1;
                      var __tco_v1 = new Three(v.value0.value0.value0, v.value0.value0.value1, v.value0.value0.value2, v.value0.value0.value3, v.value0.value1, v.value0.value2, v1);
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof TwoLeft && v.value0.value2 instanceof Three)) {
                      return fromZipper(dictOrd)(v.value1)(new Two(new Two(v1, v.value0.value0, v.value0.value1, v.value0.value2.value0), v.value0.value2.value1, v.value0.value2.value2, new Two(v.value0.value2.value3, v.value0.value2.value4, v.value0.value2.value5, v.value0.value2.value6)));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof TwoRight && v.value0.value0 instanceof Three)) {
                      return fromZipper(dictOrd)(v.value1)(new Two(new Two(v.value0.value0.value0, v.value0.value0.value1, v.value0.value0.value2, v.value0.value0.value3), v.value0.value0.value4, v.value0.value0.value5, new Two(v.value0.value0.value6, v.value0.value1, v.value0.value2, v1)));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeLeft && (v.value0.value2 instanceof Leaf && (v.value0.value5 instanceof Leaf && v1 instanceof Leaf)))) {
                      return fromZipper(dictOrd)(v.value1)(new Three(Leaf.value, v.value0.value0, v.value0.value1, Leaf.value, v.value0.value3, v.value0.value4, Leaf.value));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeMiddle && (v.value0.value0 instanceof Leaf && (v.value0.value5 instanceof Leaf && v1 instanceof Leaf)))) {
                      return fromZipper(dictOrd)(v.value1)(new Three(Leaf.value, v.value0.value1, v.value0.value2, Leaf.value, v.value0.value3, v.value0.value4, Leaf.value));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeRight && (v.value0.value0 instanceof Leaf && (v.value0.value3 instanceof Leaf && v1 instanceof Leaf)))) {
                      return fromZipper(dictOrd)(v.value1)(new Three(Leaf.value, v.value0.value1, v.value0.value2, Leaf.value, v.value0.value4, v.value0.value5, Leaf.value));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeLeft && v.value0.value2 instanceof Two)) {
                      return fromZipper(dictOrd)(v.value1)(new Two(new Three(v1, v.value0.value0, v.value0.value1, v.value0.value2.value0, v.value0.value2.value1, v.value0.value2.value2, v.value0.value2.value3), v.value0.value3, v.value0.value4, v.value0.value5));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeMiddle && v.value0.value0 instanceof Two)) {
                      return fromZipper(dictOrd)(v.value1)(new Two(new Three(v.value0.value0.value0, v.value0.value0.value1, v.value0.value0.value2, v.value0.value0.value3, v.value0.value1, v.value0.value2, v1), v.value0.value3, v.value0.value4, v.value0.value5));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeMiddle && v.value0.value5 instanceof Two)) {
                      return fromZipper(dictOrd)(v.value1)(new Two(v.value0.value0, v.value0.value1, v.value0.value2, new Three(v1, v.value0.value3, v.value0.value4, v.value0.value5.value0, v.value0.value5.value1, v.value0.value5.value2, v.value0.value5.value3)));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeRight && v.value0.value3 instanceof Two)) {
                      return fromZipper(dictOrd)(v.value1)(new Two(v.value0.value0, v.value0.value1, v.value0.value2, new Three(v.value0.value3.value0, v.value0.value3.value1, v.value0.value3.value2, v.value0.value3.value3, v.value0.value4, v.value0.value5, v1)));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeLeft && v.value0.value2 instanceof Three)) {
                      return fromZipper(dictOrd)(v.value1)(new Three(new Two(v1, v.value0.value0, v.value0.value1, v.value0.value2.value0), v.value0.value2.value1, v.value0.value2.value2, new Two(v.value0.value2.value3, v.value0.value2.value4, v.value0.value2.value5, v.value0.value2.value6), v.value0.value3, v.value0.value4, v.value0.value5));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeMiddle && v.value0.value0 instanceof Three)) {
                      return fromZipper(dictOrd)(v.value1)(new Three(new Two(v.value0.value0.value0, v.value0.value0.value1, v.value0.value0.value2, v.value0.value0.value3), v.value0.value0.value4, v.value0.value0.value5, new Two(v.value0.value0.value6, v.value0.value1, v.value0.value2, v1), v.value0.value3, v.value0.value4, v.value0.value5));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeMiddle && v.value0.value5 instanceof Three)) {
                      return fromZipper(dictOrd)(v.value1)(new Three(v.value0.value0, v.value0.value1, v.value0.value2, new Two(v1, v.value0.value3, v.value0.value4, v.value0.value5.value0), v.value0.value5.value1, v.value0.value5.value2, new Two(v.value0.value5.value3, v.value0.value5.value4, v.value0.value5.value5, v.value0.value5.value6)));
                  };
                  if (v instanceof Data_List.Cons && (v.value0 instanceof ThreeRight && v.value0.value3 instanceof Three)) {
                      return fromZipper(dictOrd)(v.value1)(new Three(v.value0.value0, v.value0.value1, v.value0.value2, new Two(v.value0.value3.value0, v.value0.value3.value1, v.value0.value3.value2, v.value0.value3.value3), v.value0.value3.value4, v.value0.value3.value5, new Two(v.value0.value3.value6, v.value0.value4, v.value0.value5, v1)));
                  };
                  return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'up'");
              };
          };
      };
      var removeMaxNode = function (__copy_v) {
          return function (__copy_v1) {
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v1 instanceof Two && (v1.value0 instanceof Leaf && v1.value3 instanceof Leaf)) {
                      return up(v)(Leaf.value);
                  };
                  if (v1 instanceof Two) {
                      var __tco_v = new Data_List.Cons(new TwoRight(v1.value0, v1.value1, v1.value2), v);
                      var __tco_v1 = v1.value3;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v1 instanceof Three && (v1.value0 instanceof Leaf && (v1.value3 instanceof Leaf && v1.value6 instanceof Leaf))) {
                      return up(new Data_List.Cons(new TwoRight(Leaf.value, v1.value1, v1.value2), v))(Leaf.value);
                  };
                  if (v1 instanceof Three) {
                      var __tco_v = new Data_List.Cons(new ThreeRight(v1.value0, v1.value1, v1.value2, v1.value3, v1.value4, v1.value5), v);
                      var __tco_v1 = v1.value6;
                      v = __tco_v;
                      v1 = __tco_v1;
                      continue tco;
                  };
                  if (v1 instanceof Leaf) {
                      return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'removeMaxNode'");
                  };
                  throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ v.constructor.name, v1.constructor.name ]);
              };
          };
      };
      var maxNode = function (__copy_v) {
          var v = __copy_v;
          tco: while (true) {
              if (v instanceof Two && v.value3 instanceof Leaf) {
                  return {
                      key: v.value1, 
                      value: v.value2
                  };
              };
              if (v instanceof Two) {
                  var __tco_v = v.value3;
                  v = __tco_v;
                  continue tco;
              };
              if (v instanceof Three && v.value6 instanceof Leaf) {
                  return {
                      key: v.value4, 
                      value: v.value5
                  };
              };
              if (v instanceof Three) {
                  var __tco_v = v.value6;
                  v = __tco_v;
                  continue tco;
              };
              if (v instanceof Leaf) {
                  return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'maxNode'");
              };
              throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ v.constructor.name ]);
          };
      };
      var down = function (__copy_ctx) {
          return function (__copy_v) {
              return function (__copy_v1) {
                  var ctx = __copy_ctx;
                  var v = __copy_v;
                  var v1 = __copy_v1;
                  tco: while (true) {
                      if (v1 instanceof Leaf) {
                          return fromZipper(dictOrd)(ctx)(Leaf.value);
                      };
                      if (v1 instanceof Two && (v1.value0 instanceof Leaf && (v1.value3 instanceof Leaf && Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value1)))) {
                          return up(ctx)(Leaf.value);
                      };
                      if (v1 instanceof Two) {
                          if (Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value1)) {
                              var max = maxNode(v1.value0);
                              return removeMaxNode(new Data_List.Cons(new TwoLeft(max.key, max.value, v1.value3), ctx))(v1.value0);
                          };
                          if (Prelude["<"](dictOrd)(v)(v1.value1)) {
                              var __tco_ctx = new Data_List.Cons(new TwoLeft(v1.value1, v1.value2, v1.value3), ctx);
                              var __tco_v = v;
                              var __tco_v1 = v1.value0;
                              ctx = __tco_ctx;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (Prelude.otherwise) {
                              var __tco_ctx = new Data_List.Cons(new TwoRight(v1.value0, v1.value1, v1.value2), ctx);
                              var __tco_v = v;
                              var __tco_v1 = v1.value3;
                              ctx = __tco_ctx;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                      };
                      if (v1 instanceof Three && (v1.value0 instanceof Leaf && (v1.value3 instanceof Leaf && v1.value6 instanceof Leaf))) {
                          if (Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value1)) {
                              return fromZipper(dictOrd)(ctx)(new Two(Leaf.value, v1.value4, v1.value5, Leaf.value));
                          };
                          if (Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value4)) {
                              return fromZipper(dictOrd)(ctx)(new Two(Leaf.value, v1.value1, v1.value2, Leaf.value));
                          };
                      };
                      if (v1 instanceof Three) {
                          if (Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value1)) {
                              var max = maxNode(v1.value0);
                              return removeMaxNode(new Data_List.Cons(new ThreeLeft(max.key, max.value, v1.value3, v1.value4, v1.value5, v1.value6), ctx))(v1.value0);
                          };
                          if (Prelude["=="](dictOrd["__superclass_Prelude.Eq_0"]())(v)(v1.value4)) {
                              var max = maxNode(v1.value3);
                              return removeMaxNode(new Data_List.Cons(new ThreeMiddle(v1.value0, v1.value1, v1.value2, max.key, max.value, v1.value6), ctx))(v1.value3);
                          };
                          if (Prelude["<"](dictOrd)(v)(v1.value1)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeLeft(v1.value1, v1.value2, v1.value3, v1.value4, v1.value5, v1.value6), ctx);
                              var __tco_v = v;
                              var __tco_v1 = v1.value0;
                              ctx = __tco_ctx;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (Prelude["<"](dictOrd)(v1.value1)(v) && Prelude["<"](dictOrd)(v)(v1.value4)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeMiddle(v1.value0, v1.value1, v1.value2, v1.value4, v1.value5, v1.value6), ctx);
                              var __tco_v = v;
                              var __tco_v1 = v1.value3;
                              ctx = __tco_ctx;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (Prelude.otherwise) {
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(v1.value0, v1.value1, v1.value2, v1.value3, v1.value4, v1.value5), ctx);
                              var __tco_v = v;
                              var __tco_v1 = v1.value6;
                              ctx = __tco_ctx;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                      };
                      throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ ctx.constructor.name, v.constructor.name, v1.constructor.name ]);
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var alter = function (dictOrd) {
      return function (f) {
          return function (k) {
              return function (m) {
                  var $588 = f(lookup(dictOrd)(k)(m));
                  if ($588 instanceof Data_Maybe.Nothing) {
                      return $$delete(dictOrd)(k)(m);
                  };
                  if ($588 instanceof Data_Maybe.Just) {
                      return insert(dictOrd)(k)($588.value0)(m);
                  };
                  throw new Error("Failed pattern match at Data.Map line 235, column 1 - line 236, column 1: " + [ $588.constructor.name ]);
              };
          };
      };
  };
  exports["alter"] = alter;
  exports["lookup"] = lookup;
  exports["insert"] = insert;
  exports["empty"] = empty;;
 
})(PS["Data.Map"] = PS["Data.Map"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Monoid = PS["Data.Monoid"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Monad_Cont_Class = PS["Control.Monad.Cont.Class"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Error_Class = PS["Control.Monad.Error.Class"];
  var Control_Monad_Reader_Class = PS["Control.Monad.Reader.Class"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_RWS_Class = PS["Control.Monad.RWS.Class"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_Plus = PS["Control.Plus"];     
  var MaybeT = function (x) {
      return x;
  };
  var runMaybeT = function (v) {
      return v;
  };
  var monadMaybeT = function (dictMonad) {
      return new Prelude.Monad(function () {
          return applicativeMaybeT(dictMonad);
      }, function () {
          return bindMaybeT(dictMonad);
      });
  };
  var functorMaybeT = function (dictMonad) {
      return new Prelude.Functor(Prelude.liftA1(applicativeMaybeT(dictMonad)));
  };
  var bindMaybeT = function (dictMonad) {
      return new Prelude.Bind(function () {
          return applyMaybeT(dictMonad);
      }, function (x) {
          return function (f) {
              return MaybeT(Prelude.bind(dictMonad["__superclass_Prelude.Bind_1"]())(runMaybeT(x))(function (v) {
                  if (v instanceof Data_Maybe.Nothing) {
                      return Prelude["return"](dictMonad["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value);
                  };
                  if (v instanceof Data_Maybe.Just) {
                      return runMaybeT(f(v.value0));
                  };
                  throw new Error("Failed pattern match: " + [ v.constructor.name ]);
              }));
          };
      });
  };
  var applyMaybeT = function (dictMonad) {
      return new Prelude.Apply(function () {
          return functorMaybeT(dictMonad);
      }, Prelude.ap(monadMaybeT(dictMonad)));
  };
  var applicativeMaybeT = function (dictMonad) {
      return new Prelude.Applicative(function () {
          return applyMaybeT(dictMonad);
      }, function ($48) {
          return MaybeT(Prelude.pure(dictMonad["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Just.create($48)));
      });
  };
  var monadRecMaybeT = function (dictMonadRec) {
      return new Control_Monad_Rec_Class.MonadRec(function () {
          return monadMaybeT(dictMonadRec["__superclass_Prelude.Monad_0"]());
      }, function (f) {
          return function ($51) {
              return MaybeT(Control_Monad_Rec_Class.tailRecM(dictMonadRec)(function (a) {
                  return Prelude.bind((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runMaybeT(f(a)))(function (v) {
                      return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                          if (v instanceof Data_Maybe.Nothing) {
                              return new Data_Either.Right(Data_Maybe.Nothing.value);
                          };
                          if (v instanceof Data_Maybe.Just && v.value0 instanceof Data_Either.Left) {
                              return new Data_Either.Left(v.value0.value0);
                          };
                          if (v instanceof Data_Maybe.Just && v.value0 instanceof Data_Either.Right) {
                              return new Data_Either.Right(new Data_Maybe.Just(v.value0.value0));
                          };
                          throw new Error("Failed pattern match at Control.Monad.Maybe.Trans line 78, column 1 - line 86, column 1: " + [ v.constructor.name ]);
                      })());
                  });
              })($51));
          };
      });
  };
  var altMaybeT = function (dictMonad) {
      return new Control_Alt.Alt(function () {
          return functorMaybeT(dictMonad);
      }, function (m1) {
          return function (m2) {
              return Prelude.bind(dictMonad["__superclass_Prelude.Bind_1"]())(runMaybeT(m1))(function (v) {
                  if (v instanceof Data_Maybe.Nothing) {
                      return runMaybeT(m2);
                  };
                  return Prelude["return"](dictMonad["__superclass_Prelude.Applicative_0"]())(v);
              });
          };
      });
  };
  var plusMaybeT = function (dictMonad) {
      return new Control_Plus.Plus(function () {
          return altMaybeT(dictMonad);
      }, Prelude.pure(dictMonad["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value));
  };
  exports["MaybeT"] = MaybeT;
  exports["runMaybeT"] = runMaybeT;
  exports["functorMaybeT"] = functorMaybeT;
  exports["applyMaybeT"] = applyMaybeT;
  exports["applicativeMaybeT"] = applicativeMaybeT;
  exports["bindMaybeT"] = bindMaybeT;
  exports["monadMaybeT"] = monadMaybeT;
  exports["altMaybeT"] = altMaybeT;
  exports["plusMaybeT"] = plusMaybeT;
  exports["monadRecMaybeT"] = monadRecMaybeT;;
 
})(PS["Control.Monad.Maybe.Trans"] = PS["Control.Monad.Maybe.Trans"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Cont_Trans = PS["Control.Monad.Cont.Trans"];
  var Control_Monad_Except_Trans = PS["Control.Monad.Except.Trans"];
  var Control_Monad_List_Trans = PS["Control.Monad.List.Trans"];
  var Control_Monad_Maybe_Trans = PS["Control.Monad.Maybe.Trans"];
  var Control_Monad_Reader_Trans = PS["Control.Monad.Reader.Trans"];
  var Control_Monad_RWS_Trans = PS["Control.Monad.RWS.Trans"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Monoid = PS["Data.Monoid"];     
  var MonadAff = function (liftAff) {
      this.liftAff = liftAff;
  };
  var monadAffAff = new MonadAff(Prelude.id(Prelude.categoryFn));
  var liftAff = function (dict) {
      return dict.liftAff;
  };
  exports["MonadAff"] = MonadAff;
  exports["liftAff"] = liftAff;
  exports["monadAffAff"] = monadAffAff;;
 
})(PS["Control.Monad.Aff.Class"] = PS["Control.Monad.Aff.Class"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];     
  var Profunctor = function (dimap) {
      this.dimap = dimap;
  };
  var profunctorFn = new Profunctor(function (a2b) {
      return function (c2d) {
          return function (b2c) {
              return function ($4) {
                  return c2d(b2c(a2b($4)));
              };
          };
      };
  });
  var dimap = function (dict) {
      return dict.dimap;
  };
  var rmap = function (dictProfunctor) {
      return function (b2c) {
          return dimap(dictProfunctor)(Prelude.id(Prelude.categoryFn))(b2c);
      };
  };
  exports["Profunctor"] = Profunctor;
  exports["rmap"] = rmap;
  exports["dimap"] = dimap;
  exports["profunctorFn"] = profunctorFn;;
 
})(PS["Data.Profunctor"] = PS["Data.Profunctor"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var profunctorAwait = new Data_Profunctor.Profunctor(function (f) {
      return function (g) {
          return function (v) {
              return Data_Profunctor.dimap(Data_Profunctor.profunctorFn)(f)(g)(v);
          };
      };
  });
  var fuseWith = function (dictFunctor) {
      return function (dictFunctor1) {
          return function (dictFunctor2) {
              return function (dictMonadRec) {
                  return function (zap) {
                      return function (fs) {
                          return function (gs) {
                              var go = function (v) {
                                  return Prelude.bind((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(Control_Monad_Free_Trans.resume(dictFunctor1)(dictMonadRec)(v.value1))(function (v1) {
                                      return Prelude.bind((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(Control_Monad_Free_Trans.resume(dictFunctor)(dictMonadRec)(v.value0))(function (v2) {
                                          var $49 = Prelude["<*>"](Data_Either.applyEither)(Prelude["<$>"](Data_Either.functorEither)(zap(Data_Tuple.Tuple.create))(v2))(v1);
                                          if ($49 instanceof Data_Either.Left) {
                                              return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left($49.value0));
                                          };
                                          if ($49 instanceof Data_Either.Right) {
                                              return Prelude["return"]((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(Prelude.map(dictFunctor2)(function (t) {
                                                  return Control_Monad_Free_Trans.freeT(function (v3) {
                                                      return go(t);
                                                  });
                                              })($49.value0)));
                                          };
                                          throw new Error("Failed pattern match at Control.Coroutine line 49, column 1 - line 54, column 1: " + [ $49.constructor.name ]);
                                      });
                                  });
                              };
                              return Control_Monad_Free_Trans.freeT(function (v) {
                                  return go(new Data_Tuple.Tuple(fs, gs));
                              });
                          };
                      };
                  };
              };
          };
      };
  };
  var functorAwait = new Prelude.Functor(Data_Profunctor.rmap(profunctorAwait));
  var $$await = function (dictMonad) {
      return Control_Monad_Free_Trans.liftFreeT(functorAwait)(dictMonad)(Prelude.id(Prelude.categoryFn));
  };
  exports["await"] = $$await;
  exports["fuseWith"] = fuseWith;
  exports["profunctorAwait"] = profunctorAwait;
  exports["functorAwait"] = functorAwait;;
 
})(PS["Control.Coroutine"] = PS["Control.Coroutine"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Coroutine = PS["Control.Coroutine"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_Maybe_Trans = PS["Control.Monad.Maybe.Trans"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Either = PS["Data.Either"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Maybe = PS["Data.Maybe"];     
  var Emit = (function () {
      function Emit(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Emit.create = function (value0) {
          return function (value1) {
              return new Emit(value0, value1);
          };
      };
      return Emit;
  })();
  var Stall = (function () {
      function Stall(value0) {
          this.value0 = value0;
      };
      Stall.create = function (value0) {
          return new Stall(value0);
      };
      return Stall;
  })();
  var runStallingProcess = function (dictMonadRec) {
      return function ($28) {
          return Control_Monad_Maybe_Trans.runMaybeT(Control_Monad_Free_Trans.runFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.monadRecMaybeT(dictMonadRec))(Data_Maybe.maybe(Control_Plus.empty(Control_Monad_Maybe_Trans.plusMaybeT(dictMonadRec["__superclass_Prelude.Monad_0"]())))(Prelude.pure(Control_Monad_Maybe_Trans.applicativeMaybeT(dictMonadRec["__superclass_Prelude.Monad_0"]()))))(Control_Monad_Free_Trans.hoistFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.functorMaybeT(dictMonadRec["__superclass_Prelude.Monad_0"]()))(function ($29) {
              return Control_Monad_Maybe_Trans.MaybeT(Prelude.map((((dictMonadRec["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)($29));
          })($28)));
      };
  };
  var bifunctorStallF = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (q) {
              if (q instanceof Emit) {
                  return new Emit(f(q.value0), g(q.value1));
              };
              if (q instanceof Stall) {
                  return new Stall(g(q.value0));
              };
              throw new Error("Failed pattern match at Control.Coroutine.Stalling line 50, column 1 - line 56, column 1: " + [ q.constructor.name ]);
          };
      };
  });
  var functorStallF = new Prelude.Functor(function (f) {
      return Data_Bifunctor.rmap(bifunctorStallF)(f);
  });
  var $dollar$dollar$qmark = function (dictMonadRec) {
      return Control_Coroutine.fuseWith(functorStallF)(Control_Coroutine.functorAwait)(Data_Maybe.functorMaybe)(dictMonadRec)(function (f) {
          return function (q) {
              return function (v) {
                  if (q instanceof Emit) {
                      return new Data_Maybe.Just(f(q.value1)(v(q.value0)));
                  };
                  if (q instanceof Stall) {
                      return Data_Maybe.Nothing.value;
                  };
                  throw new Error("Failed pattern match at Control.Coroutine.Stalling line 79, column 1 - line 85, column 1: " + [ q.constructor.name ]);
              };
          };
      });
  };
  exports["Emit"] = Emit;
  exports["Stall"] = Stall;
  exports["$$?"] = $dollar$dollar$qmark;
  exports["runStallingProcess"] = runStallingProcess;
  exports["bifunctorStallF"] = bifunctorStallF;
  exports["functorStallF"] = functorStallF;;
 
})(PS["Control.Coroutine.Stalling"] = PS["Control.Coroutine.Stalling"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Control.Monad.Aff.AVar

  exports._makeVar = function (nonCanceler) {
    return function(success, error) {
      try {
        success({
          consumers: [],
          producers: [],
          error: undefined 
        });
      } catch (e) {
        error(e);
      }

      return nonCanceler;
    }
  }

  exports._takeVar = function (nonCanceler, avar) {
    return function(success, error) {
      if (avar.error !== undefined) {
        error(avar.error);
      } else if (avar.producers.length > 0) {
        var producer = avar.producers.shift();

        producer(success, error);
      } else {
        avar.consumers.push({success: success, error: error});
      }

      return nonCanceler;
    } 
  }

  exports._putVar = function (nonCanceler, avar, a) {
    return function(success, error) {
      if (avar.error !== undefined) {
        error(avar.error);
      } else if (avar.consumers.length === 0) {
        avar.producers.push(function(success, error) {
          try {
            success(a);
          } catch (e) {
            error(e);
          }
        });

        success({});
      } else {
        var consumer = avar.consumers.shift();

        try {
          consumer.success(a);
        } catch (e) {
          error(e);

          return;                  
        }

        success({});
      }

      return nonCanceler;
    }
  }
 
})(PS["Control.Monad.Aff.AVar"] = PS["Control.Monad.Aff.AVar"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Control.Monad.Aff.AVar"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Function = PS["Data.Function"];     
  var takeVar = function (q) {
      return $foreign._takeVar(Control_Monad_Aff.nonCanceler, q);
  };
  var putVar = function (q) {
      return function (a) {
          return $foreign._putVar(Control_Monad_Aff.nonCanceler, q, a);
      };
  };
  var makeVar = $foreign._makeVar(Control_Monad_Aff.nonCanceler);
  exports["takeVar"] = takeVar;
  exports["putVar"] = putVar;
  exports["makeVar"] = makeVar;;
 
})(PS["Control.Monad.Aff.AVar"] = PS["Control.Monad.Aff.AVar"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Contravariant = function (cmap) {
      this.cmap = cmap;
  };
  var cmap = function (dict) {
      return dict.cmap;
  };
  exports["Contravariant"] = Contravariant;
  exports["cmap"] = cmap;;
 
})(PS["Data.Functor.Contravariant"] = PS["Data.Functor.Contravariant"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Functor_Contravariant = PS["Data.Functor.Contravariant"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Const = function (x) {
      return x;
  };
  var getConst = function (v) {
      return v;
  };
  var functorConst = new Prelude.Functor(function (v) {
      return function (v1) {
          return v1;
      };
  });
  var contravariantConst = new Data_Functor_Contravariant.Contravariant(function (v) {
      return function (v1) {
          return v1;
      };
  });
  var applyConst = function (dictSemigroup) {
      return new Prelude.Apply(function () {
          return functorConst;
      }, function (v) {
          return function (v1) {
              return Prelude["<>"](dictSemigroup)(v)(v1);
          };
      });
  };
  var applicativeConst = function (dictMonoid) {
      return new Prelude.Applicative(function () {
          return applyConst(dictMonoid["__superclass_Prelude.Semigroup_0"]());
      }, function (v) {
          return Data_Monoid.mempty(dictMonoid);
      });
  };
  exports["Const"] = Const;
  exports["getConst"] = getConst;
  exports["functorConst"] = functorConst;
  exports["applyConst"] = applyConst;
  exports["applicativeConst"] = applicativeConst;
  exports["contravariantConst"] = contravariantConst;;
 
})(PS["Data.Const"] = PS["Data.Const"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine_Aff = PS["Control.Coroutine.Aff"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Const = PS["Data.Const"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Maybe = PS["Data.Maybe"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];             
  var runEventSource = function (v) {
      return v;
  };
  exports["runEventSource"] = runEventSource;;
 
})(PS["Halogen.Query.EventSource"] = PS["Halogen.Query.EventSource"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Data_Functor = PS["Data.Functor"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];     
  var Get = (function () {
      function Get(value0) {
          this.value0 = value0;
      };
      Get.create = function (value0) {
          return new Get(value0);
      };
      return Get;
  })();
  var Modify = (function () {
      function Modify(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Modify.create = function (value0) {
          return function (value1) {
              return new Modify(value0, value1);
          };
      };
      return Modify;
  })();
  var stateN = function (dictMonad) {
      return function (dictMonadState) {
          return function (v) {
              if (v instanceof Get) {
                  return Prelude[">>="](dictMonad["__superclass_Prelude.Bind_1"]())(Control_Monad_State_Class.get(dictMonadState))(function ($22) {
                      return Prelude.pure(dictMonad["__superclass_Prelude.Applicative_0"]())(v.value0($22));
                  });
              };
              if (v instanceof Modify) {
                  return Data_Functor["$>"](((dictMonad["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Control_Monad_State_Class.modify(dictMonadState)(v.value0))(v.value1);
              };
              throw new Error("Failed pattern match at Halogen.Query.StateF line 33, column 1 - line 34, column 1: " + [ v.constructor.name ]);
          };
      };
  };
  var functorStateF = new Prelude.Functor(function (f) {
      return function (v) {
          if (v instanceof Get) {
              return new Get(function ($24) {
                  return f(v.value0($24));
              });
          };
          if (v instanceof Modify) {
              return new Modify(v.value0, f(v.value1));
          };
          throw new Error("Failed pattern match at Halogen.Query.StateF line 21, column 1 - line 27, column 1: " + [ f.constructor.name, v.constructor.name ]);
      };
  });
  exports["Get"] = Get;
  exports["Modify"] = Modify;
  exports["stateN"] = stateN;
  exports["functorStateF"] = functorStateF;;
 
})(PS["Halogen.Query.StateF"] = PS["Halogen.Query.StateF"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Plus = PS["Control.Plus"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Functor_Aff = PS["Data.Functor.Aff"];
  var Data_Functor_Eff = PS["Data.Functor.Eff"];
  var Data_Inject = PS["Data.Inject"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];     
  var StateHF = (function () {
      function StateHF(value0) {
          this.value0 = value0;
      };
      StateHF.create = function (value0) {
          return new StateHF(value0);
      };
      return StateHF;
  })();
  var SubscribeHF = (function () {
      function SubscribeHF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      SubscribeHF.create = function (value0) {
          return function (value1) {
              return new SubscribeHF(value0, value1);
          };
      };
      return SubscribeHF;
  })();
  var QueryHF = (function () {
      function QueryHF(value0) {
          this.value0 = value0;
      };
      QueryHF.create = function (value0) {
          return new QueryHF(value0);
      };
      return QueryHF;
  })();
  var HaltHF = (function () {
      function HaltHF() {

      };
      HaltHF.value = new HaltHF();
      return HaltHF;
  })();
  var functorHalogenF = function (dictFunctor) {
      return new Prelude.Functor(function (f) {
          return function (h) {
              if (h instanceof StateHF) {
                  return new StateHF(Prelude.map(Halogen_Query_StateF.functorStateF)(f)(h.value0));
              };
              if (h instanceof SubscribeHF) {
                  return new SubscribeHF(h.value0, f(h.value1));
              };
              if (h instanceof QueryHF) {
                  return new QueryHF(Prelude.map(dictFunctor)(f)(h.value0));
              };
              if (h instanceof HaltHF) {
                  return HaltHF.value;
              };
              throw new Error("Failed pattern match at Halogen.Query.HalogenF line 33, column 1 - line 41, column 1: " + [ h.constructor.name ]);
          };
      });
  };
  exports["StateHF"] = StateHF;
  exports["SubscribeHF"] = SubscribeHF;
  exports["QueryHF"] = QueryHF;
  exports["HaltHF"] = HaltHF;
  exports["functorHalogenF"] = functorHalogenF;;
 
})(PS["Halogen.Query.HalogenF"] = PS["Halogen.Query.HalogenF"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Inject = PS["Data.Inject"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var modify = function (f) {
      return Control_Monad_Free.liftF(new Halogen_Query_HalogenF.StateHF(new Halogen_Query_StateF.Modify(f, Prelude.unit)));
  };
  var liftH = function ($3) {
      return Control_Monad_Free.liftF(Halogen_Query_HalogenF.QueryHF.create($3));
  };
  var liftEff$prime = function (dictMonadEff) {
      return function ($4) {
          return liftH(Control_Monad_Eff_Class.liftEff(dictMonadEff)($4));
      };
  };
  var liftAff$prime = function (dictMonadAff) {
      return function ($5) {
          return liftH(Control_Monad_Aff_Class.liftAff(dictMonadAff)($5));
      };
  };
  var gets = function ($6) {
      return Control_Monad_Free.liftF(Halogen_Query_HalogenF.StateHF.create(Halogen_Query_StateF.Get.create($6)));
  };
  var get = gets(Prelude.id(Prelude.categoryFn));
  var action = function (act) {
      return act(Prelude.unit);
  };
  exports["liftEff'"] = liftEff$prime;
  exports["liftAff'"] = liftAff$prime;
  exports["liftH"] = liftH;
  exports["modify"] = modify;
  exports["gets"] = gets;
  exports["get"] = get;
  exports["action"] = action;;
 
})(PS["Halogen.Query"] = PS["Halogen.Query"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Map = PS["Data.Map"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Data_Profunctor_Choice = PS["Data.Profunctor.Choice"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Void = PS["Data.Void"];
  var Halogen_Component_ChildPath = PS["Halogen.Component.ChildPath"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var ChildF = (function () {
      function ChildF(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      ChildF.create = function (value0) {
          return function (value1) {
              return new ChildF(value0, value1);
          };
      };
      return ChildF;
  })();
  var renderComponent = function (v) {
      return Control_Monad_State.runState(v.render);
  };
  var render = function (dictOrd) {
      return function (rc) {
          var renderChild$prime = function (p) {
              return function (c) {
                  return function (s) {
                      var $60 = renderComponent(c)(s);
                      return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.modify(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(function (v) {
                          return {
                              parent: v.parent, 
                              children: Data_Map.insert(dictOrd)(p)(new Data_Tuple.Tuple(c, $60.value1))(v.children), 
                              memo: v.memo
                          };
                      }))(function () {
                          return Prelude.pure(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(Prelude["<$>"](Halogen_HTML_Core.functorHTML)(function ($106) {
                              return Data_Functor_Coproduct.right(ChildF.create(p)($106));
                          })($60.value0));
                      });
                  };
              };
          };
          var renderChild = function (v) {
              return function (v1) {
                  var childState = Data_Map.lookup(dictOrd)(v1.value0)(v.children);
                  var $66 = Data_Map.lookup(dictOrd)(v1.value0)(v.memo);
                  if ($66 instanceof Data_Maybe.Just) {
                      return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.modify(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(function (v2) {
                          return {
                              parent: v2.parent, 
                              children: Data_Map.alter(dictOrd)(Prelude["const"](childState))(v1.value0)(v2.children), 
                              memo: Data_Map.insert(dictOrd)(v1.value0)($66.value0)(v2.memo)
                          };
                      }))(function () {
                          return Prelude.pure(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))($66.value0);
                      });
                  };
                  if ($66 instanceof Data_Maybe.Nothing) {
                      if (childState instanceof Data_Maybe.Just) {
                          return renderChild$prime(v1.value0)(childState.value0.value0)(childState.value0.value1);
                      };
                      if (childState instanceof Data_Maybe.Nothing) {
                          var def$prime = v1.value1(Prelude.unit);
                          return renderChild$prime(v1.value0)(def$prime.component)(def$prime.initialState);
                      };
                      throw new Error("Failed pattern match at Halogen.Component line 244, column 1 - line 249, column 1: " + [ childState.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Halogen.Component line 244, column 1 - line 249, column 1: " + [ $66.constructor.name ]);
              };
          };
          return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.get(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(function (v) {
              var html = rc(v.parent);
              return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.put(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))({
                  parent: v.parent, 
                  children: Data_Map.empty, 
                  memo: Data_Map.empty
              }))(function () {
                  return Halogen_HTML_Core.fillSlot(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(renderChild(v))(Data_Functor_Coproduct.left)(html);
              });
          });
      };
  };
  var queryComponent = function (v) {
      return v["eval"];
  };
  var component = function (r) {
      return function (e) {
          return {
              render: Control_Monad_State_Class.gets(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(r), 
              "eval": e
          };
      };
  };
  exports["ChildF"] = ChildF;
  exports["queryComponent"] = queryComponent;
  exports["renderComponent"] = renderComponent;
  exports["component"] = component;;
 
})(PS["Halogen.Component"] = PS["Halogen.Component"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Component_ChildPath = PS["Halogen.Component.ChildPath"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];     
  var text = Halogen_HTML_Core.Text.create;
  exports["text"] = text;;
 
})(PS["Halogen.HTML"] = PS["Halogen.HTML"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Text_Base64 = PS["Text.Base64"];
  var $$Math = PS["Math"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Indexed = PS["Halogen.HTML.Indexed"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Data_Array = PS["Data.Array"];
  var Data_Either = PS["Data.Either"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_List = PS["Data.List"];
  var Data_String = PS["Data.String"];
  var Data_Char = PS["Data.Char"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Time = PS["Data.Time"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Halogen_HTML = PS["Halogen.HTML"];     
  var $up = $$Math.pow;
  var $dot$dot$dot = function (inf) {
      return function (sup) {
          if (inf <= sup) {
              return Data_Array.range(inf)(sup);
          };
          if (Prelude.otherwise) {
              return [  ];
          };
          throw new Error("Failed pattern match at Util line 118, column 1 - line 119, column 1: " + [ inf.constructor.name, sup.constructor.name ]);
      };
  };
  var transformDigits = function (f) {
      return function ($35) {
          return (function ($36) {
              return Data_String.fromCharArray(f($36));
          })(Data_String.toCharArray(Prelude.show(Prelude.showNumber)($35)));
      };
  };
  var sigFigs = function (n) {
      var arr = Data_String.toCharArray(Prelude.show(Prelude.showNumber)(n));
      var split = Data_Array.span(function (v) {
          return v !== ".";
      })(arr);
      return Data_Array.length(split.init);
  };
  var secondsMS = function (v) {
      return v / 1000.0;
  };
  var rot13 = (function () {
      var rotate = function (c) {
          if (Data_Char.toCharCode(c) <= 90 && Data_Char.toCharCode(c) >= 65) {
              return Data_Char.fromCharCode(65 + (Data_Char.toCharCode(c) - 52) % 26 | 0);
          };
          if (Data_Char.toCharCode(c) <= 122 && Data_Char.toCharCode(c) >= 97) {
              return Data_Char.fromCharCode(97 + (Data_Char.toCharCode(c) - 84) % 26 | 0);
          };
          if (Prelude.otherwise) {
              return c;
          };
          throw new Error("Failed pattern match at Util line 41, column 5 - line 42, column 5: " + [ c.constructor.name ]);
      };
      return function ($37) {
          return Data_String.fromCharArray(Prelude.map(Prelude.functorArray)(rotate)(Data_String.toCharArray($37)));
      };
  })();
  var scramble = function ($38) {
      return rot13(Text_Base64.encode64(rot13($38)));
  };
  var unscramble = function ($39) {
      return rot13(Text_Base64.decode64(rot13($39)));
  };
  var renderParagraphs = function ($40) {
      return Halogen_HTML_Elements.div_(Prelude.map(Prelude.functorArray)(function ($41) {
          return Halogen_HTML_Elements.p_(Prelude.pure(Prelude.applicativeArray)(Halogen_HTML.text($41)));
      })($40));
  };
  var mkClass = function ($42) {
      return Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className($42));
  };
  var minutesMS = function (n) {
      return secondsMS(n) / 60.0;
  };
  var insertDecimal = function (i) {
      return function (num) {
          var shown = Data_Array.take(i + 1 | 0)(Data_String.toCharArray(Prelude.show(Prelude.showNumber)(num)));
          var len = Data_Array.length(shown);
          var small = Prelude["++"](Prelude.semigroupArray)([ "." ])(Data_Array.drop(len - 1)(shown));
          var large = Data_Array.take(len - 1)(shown);
          return Data_String.fromCharArray(Prelude["++"](Prelude.semigroupArray)(large)(small));
      };
  };
  var hoursMS = function (n) {
      return minutesMS(n) / 60.0;
  };
  var gcd = function (__copy_m) {
      return function (__copy_n) {
          var m = __copy_m;
          var n = __copy_n;
          tco: while (true) {
              if (n === 0) {
                  return m;
              };
              if (Prelude.otherwise) {
                  var __tco_m = n;
                  var __tco_n = m % n;
                  m = __tco_m;
                  n = __tco_n;
                  continue tco;
              };
              throw new Error("Failed pattern match: " + [ m.constructor.name, n.constructor.name ]);
          };
      };
  };
  var foldGCD = function (dictFoldable) {
      var foldGCD$prime = function (v) {
          return function (y) {
              if (v instanceof Data_Maybe.Nothing) {
                  return new Data_Maybe.Just(y);
              };
              if (v instanceof Data_Maybe.Just) {
                  return new Data_Maybe.Just(gcd(v.value0)(y));
              };
              throw new Error("Failed pattern match at Util line 103, column 5 - line 104, column 5: " + [ v.constructor.name, y.constructor.name ]);
          };
      };
      return Data_Foldable.foldl(dictFoldable)(foldGCD$prime)(Data_Maybe.Nothing.value);
  };
  var extractFsts = function (dictFoldable) {
      return Data_Foldable.foldl(dictFoldable)(function (acc) {
          return function (v) {
              return new Data_List.Cons(v.value0, acc);
          };
      })(Data_List.Nil.value);
  };
  var schedule = function (arr) {
      var timers = extractFsts(Data_Foldable.foldableArray)(arr);
      var theGCD = Data_Maybe_Unsafe.fromJust(foldGCD(Data_List.foldableList)(timers));
      var goElt = function (v) {
          var $23 = v.numbalert >= v.timer;
          if ($23) {
              return Prelude.bind(Control_Monad_Aff.bindAff)(v.comp)(function () {
                  return Prelude.pure(Control_Monad_Aff.applicativeAff)((function () {
                      var $24 = {};
                      for (var $25 in v) {
                          if (v.hasOwnProperty($25)) {
                              $24[$25] = v[$25];
                          };
                      };
                      $24.numbalert = theGCD;
                      return $24;
                  })());
              });
          };
          if (!$23) {
              return Prelude.pure(Control_Monad_Aff.applicativeAff)((function () {
                  var $26 = {};
                  for (var $27 in v) {
                      if (v.hasOwnProperty($27)) {
                          $26[$27] = v[$27];
                      };
                  };
                  $26.numbalert = v.numbalert + theGCD | 0;
                  return $26;
              })());
          };
          throw new Error("Failed pattern match at Util line 79, column 1 - line 80, column 1: " + [ $23.constructor.name ]);
      };
      var go = function (comps) {
          return Prelude.bind(Control_Monad_Aff.bindAff)(Data_Traversable.traverse(Data_Traversable.traversableArray)(Control_Monad_Aff.applicativeAff)(goElt)(comps))(function (v) {
              return Control_Monad_Aff["later'"](theGCD)(Prelude.pure(Control_Monad_Aff.applicativeAff)(new Data_Either.Left(v)));
          });
      };
      return Control_Monad_Rec_Class.tailRecM(Control_Monad_Aff.monadRecAff)(go)(Prelude.map(Prelude.functorArray)(function (v) {
          return {
              timer: v.value0, 
              comp: v.value1, 
              numbalert: theGCD
          };
      })(arr));
  };
  var daysMS = function (n) {
      return hoursMS(n) / 24.0;
  };   
  var chopDigits = function (n) {
      return function (arr) {
          var split = Data_Array.span(function (v) {
              return v !== ".";
          })(arr);
          var small = Data_Array.take(n)(split.rest);
          return Prelude["++"](Prelude.semigroupArray)(split.init)(small);
      };
  };
  var noDecimal = transformDigits(chopDigits(0));
  var oneDecimal = transformDigits(chopDigits(2));
  exports["daysMS"] = daysMS;
  exports["hoursMS"] = hoursMS;
  exports["minutesMS"] = minutesMS;
  exports["secondsMS"] = secondsMS;
  exports["mkClass"] = mkClass;
  exports["renderParagraphs"] = renderParagraphs;
  exports["..."] = $dot$dot$dot;
  exports["gcd"] = gcd;
  exports["extractFsts"] = extractFsts;
  exports["foldGCD"] = foldGCD;
  exports["schedule"] = schedule;
  exports["insertDecimal"] = insertDecimal;
  exports["transformDigits"] = transformDigits;
  exports["noDecimal"] = noDecimal;
  exports["oneDecimal"] = oneDecimal;
  exports["chopDigits"] = chopDigits;
  exports["sigFigs"] = sigFigs;
  exports["rot13"] = rot13;
  exports["unscramble"] = unscramble;
  exports["scramble"] = scramble;
  exports["^"] = $up;;
 
})(PS["Util"] = PS["Util"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Control_Monad_Eff_Random = PS["Control.Monad.Eff.Random"];
  var Data_Array = PS["Data.Array"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Data_Date = PS["Data.Date"];
  var Data_Time = PS["Data.Time"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Halogen = PS["Halogen"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Util = PS["Util"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];     
  var Misc1 = (function () {
      function Misc1(value0) {
          this.value0 = value0;
      };
      Misc1.create = function (value0) {
          return new Misc1(value0);
      };
      return Misc1;
  })();
  var Misc2 = (function () {
      function Misc2(value0) {
          this.value0 = value0;
      };
      Misc2.create = function (value0) {
          return new Misc2(value0);
      };
      return Misc2;
  })();
  var Tech1 = (function () {
      function Tech1(value0) {
          this.value0 = value0;
      };
      Tech1.create = function (value0) {
          return new Tech1(value0);
      };
      return Tech1;
  })();
  var Tech2 = (function () {
      function Tech2(value0) {
          this.value0 = value0;
      };
      Tech2.create = function (value0) {
          return new Tech2(value0);
      };
      return Tech2;
  })();
  var Phil1 = (function () {
      function Phil1(value0) {
          this.value0 = value0;
      };
      Phil1.create = function (value0) {
          return new Phil1(value0);
      };
      return Phil1;
  })();
  var Phil2 = (function () {
      function Phil2(value0) {
          this.value0 = value0;
      };
      Phil2.create = function (value0) {
          return new Phil2(value0);
      };
      return Phil2;
  })();
  var Poli1 = (function () {
      function Poli1(value0) {
          this.value0 = value0;
      };
      Poli1.create = function (value0) {
          return new Poli1(value0);
      };
      return Poli1;
  })();
  var Poli2 = (function () {
      function Poli2(value0) {
          this.value0 = value0;
      };
      Poli2.create = function (value0) {
          return new Poli2(value0);
      };
      return Poli2;
  })();
  var Science1 = (function () {
      function Science1(value0) {
          this.value0 = value0;
      };
      Science1.create = function (value0) {
          return new Science1(value0);
      };
      return Science1;
  })();
  var Science2 = (function () {
      function Science2(value0) {
          this.value0 = value0;
      };
      Science2.create = function (value0) {
          return new Science2(value0);
      };
      return Science2;
  })();
  var Clicks = function (x) {
      return x;
  };
  var Stone = (function () {
      function Stone() {

      };
      Stone.value = new Stone();
      return Stone;
  })();
  var Bronze = (function () {
      function Bronze() {

      };
      Bronze.value = new Bronze();
      return Bronze;
  })();
  var Iron = (function () {
      function Iron() {

      };
      Iron.value = new Iron();
      return Iron;
  })();
  var Classical = (function () {
      function Classical() {

      };
      Classical.value = new Classical();
      return Classical;
  })();
  var Dark = (function () {
      function Dark() {

      };
      Dark.value = new Dark();
      return Dark;
  })();
  var Medieval = (function () {
      function Medieval() {

      };
      Medieval.value = new Medieval();
      return Medieval;
  })();
  var Renaissance = (function () {
      function Renaissance() {

      };
      Renaissance.value = new Renaissance();
      return Renaissance;
  })();
  var Imperial = (function () {
      function Imperial() {

      };
      Imperial.value = new Imperial();
      return Imperial;
  })();
  var Industrial = (function () {
      function Industrial() {

      };
      Industrial.value = new Industrial();
      return Industrial;
  })();
  var Nuclear = (function () {
      function Nuclear() {

      };
      Nuclear.value = new Nuclear();
      return Nuclear;
  })();
  var Information = (function () {
      function Information() {

      };
      Information.value = new Information();
      return Information;
  })();
  var Global = (function () {
      function Global() {

      };
      Global.value = new Global();
      return Global;
  })();
  var Space = (function () {
      function Space() {

      };
      Space.value = new Space();
      return Space;
  })();
  var Solar = (function () {
      function Solar() {

      };
      Solar.value = new Solar();
      return Solar;
  })();
  var Click = (function () {
      function Click(value0) {
          this.value0 = value0;
      };
      Click.create = function (value0) {
          return new Click(value0);
      };
      return Click;
  })();
  var Autoclick = (function () {
      function Autoclick(value0) {
          this.value0 = value0;
      };
      Autoclick.create = function (value0) {
          return new Autoclick(value0);
      };
      return Autoclick;
  })();
  var Reset = (function () {
      function Reset(value0) {
          this.value0 = value0;
      };
      Reset.create = function (value0) {
          return new Reset(value0);
      };
      return Reset;
  })();
  var Save = (function () {
      function Save(value0) {
          this.value0 = value0;
      };
      Save.create = function (value0) {
          return new Save(value0);
      };
      return Save;
  })();
  var Autosave = (function () {
      function Autosave(value0) {
          this.value0 = value0;
      };
      Autosave.create = function (value0) {
          return new Autosave(value0);
      };
      return Autosave;
  })();
  var Buy = (function () {
      function Buy(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Buy.create = function (value0) {
          return function (value1) {
              return new Buy(value0, value1);
          };
      };
      return Buy;
  })();
  var Suffer = (function () {
      function Suffer(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Suffer.create = function (value0) {
          return function (value1) {
              return new Suffer(value0, value1);
          };
      };
      return Suffer;
  })();
  var Unmessage = (function () {
      function Unmessage(value0) {
          this.value0 = value0;
      };
      Unmessage.create = function (value0) {
          return new Unmessage(value0);
      };
      return Unmessage;
  })();
  var Pretty = function (prettify) {
      this.prettify = prettify;
  };
  var Serialize = function (serialize) {
      this.serialize = serialize;
  };
  var welcomeMessage = "";                                            
  var serializeNumber = new Serialize(Util.oneDecimal);
  var serializeInt = new Serialize(Prelude.show(Prelude.showInt));
  var serialize = function (dict) {
      return dict.serialize;
  };
  var serializeClicks = new Serialize(function (v) {
      return serialize(serializeNumber)(v);
  });
  var serializeMilliseconds = new Serialize(function (v) {
      return serialize(serializeNumber)(v);
  });
  var serializeUpgrade = new Serialize(function (v) {
      if (v instanceof Misc1) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Misc2) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Tech1) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Tech2) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Phil1) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Phil2) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Poli1) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Poli2) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Science1) {
          return serialize(serializeInt)(v.value0);
      };
      if (v instanceof Science2) {
          return serialize(serializeInt)(v.value0);
      };
      throw new Error("Failed pattern match at Types line 258, column 1 - line 270, column 1: " + [ v.constructor.name ]);
  });
  var serializeUpgrades = new Serialize(function (v) {
      return "{ \"misc1\": " + (serialize(serializeUpgrade)(v.misc1) + (", \"misc2\": " + (serialize(serializeUpgrade)(v.misc2) + (", \"tech1\": " + (serialize(serializeUpgrade)(v.tech1) + (", \"tech2\": " + (serialize(serializeUpgrade)(v.tech2) + (", \"phil1\": " + (serialize(serializeUpgrade)(v.phil1) + (", \"phil2\": " + (serialize(serializeUpgrade)(v.phil2) + (", \"poli1\": " + (serialize(serializeUpgrade)(v.poli1) + (", \"poli2\": " + (serialize(serializeUpgrade)(v.poli2) + (", \"science1\": " + (serialize(serializeUpgrade)(v.science1) + (", \"science2\": " + (serialize(serializeUpgrade)(v.science2) + "}")))))))))))))))))));
  });      
  var semiringClicks = new Prelude.Semiring(function (v) {
      return function (v1) {
          return v + v1;
      };
  }, function (v) {
      return function (v1) {
          return v * v1;
      };
  }, 1, 0);
  var ringClicks = new Prelude.Ring(function () {
      return semiringClicks;
  }, function (v) {
      return function (v1) {
          return v - v1;
      };
  });
  var prettyNumber = new Pretty(function (n) {
      if (Util.sigFigs(n) <= 3) {
          return Util.oneDecimal(n);
      };
      if (Util.sigFigs(n) <= 4) {
          return Util.noDecimal(n);
      };
      if (Util.sigFigs(n) <= 5) {
          return Util.insertDecimal(2)(n) + "k";
      };
      if (Util.sigFigs(n) <= 6) {
          return Util.insertDecimal(3)(n) + "k";
      };
      if (Util.sigFigs(n) <= 7) {
          return Util.insertDecimal(4)(n) + "k";
      };
      if (Util.sigFigs(n) <= 8) {
          return Util.insertDecimal(2)(n) + "m";
      };
      if (Util.sigFigs(n) <= 9) {
          return Util.insertDecimal(3)(n) + "m";
      };
      if (Util.sigFigs(n) <= 10) {
          return Util.insertDecimal(4)(n) + "m";
      };
      if (Util.sigFigs(n) <= 11) {
          return Util.insertDecimal(2)(n) + "b";
      };
      if (Util.sigFigs(n) <= 12) {
          return Util.insertDecimal(3)(n) + "b";
      };
      if (Util.sigFigs(n) <= 13) {
          return Util.insertDecimal(4)(n) + "b";
      };
      if (Util.sigFigs(n) <= 14) {
          return Util.insertDecimal(2)(n) + "t";
      };
      if (Util.sigFigs(n) <= 15) {
          return Util.insertDecimal(3)(n) + "t";
      };
      if (Util.sigFigs(n) <= 16) {
          return Util.insertDecimal(4)(n) + "t";
      };
      if (Util.sigFigs(n) <= 17) {
          return Util.insertDecimal(2)(n) + "q";
      };
      if (Util.sigFigs(n) <= 18) {
          return Util.insertDecimal(3)(n) + "q";
      };
      if (Util.sigFigs(n) <= 19) {
          return Util.insertDecimal(4)(n) + "q";
      };
      if (Util.sigFigs(n) <= 20) {
          return Util.insertDecimal(2)(n) + "qi";
      };
      if (Util.sigFigs(n) <= 21) {
          return Util.insertDecimal(3)(n) + "qi";
      };
      if (Util.sigFigs(n) <= 22) {
          return Util.insertDecimal(4)(n) + "qi";
      };
      if (Prelude.otherwise) {
          return "Your civilization can't count this high!";
      };
      throw new Error("Failed pattern match at Types line 201, column 1 - line 225, column 1: " + [ n.constructor.name ]);
  });                                                       
  var prettify = function (dict) {
      return dict.prettify;
  }; 
  var prettyClicks = new Pretty(function (v) {
      return prettify(prettyNumber)(v) + " c";
  });
  var prettyClicksPerSecond = new Pretty(function (v) {
      return prettify(prettyNumber)(v) + " cps";
  });
  var prettyPopulation = new Pretty(function (v) {
      return prettify(prettyNumber)(v) + " Clickonians";
  });
  var isForeignUpgrades = new Data_Foreign_Class.IsForeign(function (value) {
      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("misc1")(value))(function (v) {
          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("misc2")(value))(function (v1) {
              return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("tech1")(value))(function (v2) {
                  return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("tech2")(value))(function (v3) {
                      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("phil1")(value))(function (v4) {
                          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("phil2")(value))(function (v5) {
                              return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("poli1")(value))(function (v6) {
                                  return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("poli2")(value))(function (v7) {
                                      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("science1")(value))(function (v8) {
                                          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("science2")(value))(function (v9) {
                                              return Prelude.pure(Data_Either.applicativeEither)({
                                                  misc1: new Misc1(v), 
                                                  misc2: new Misc2(v1), 
                                                  tech1: new Tech1(v2), 
                                                  tech2: new Tech2(v3), 
                                                  phil1: new Phil1(v4), 
                                                  phil2: new Phil2(v5), 
                                                  poli1: new Poli1(v6), 
                                                  poli2: new Poli2(v7), 
                                                  science1: new Science1(v8), 
                                                  science2: new Science2(v9)
                                              });
                                          });
                                      });
                                  });
                              });
                          });
                      });
                  });
              });
          });
      });
  });
  var initialUpgrades = {
      misc1: new Misc1(0), 
      misc2: new Misc2(0), 
      tech1: new Tech1(0), 
      tech2: new Tech2(0), 
      phil1: new Phil1(0), 
      phil2: new Phil2(0), 
      poli1: new Poli1(0), 
      poli2: new Poli2(0), 
      science1: new Science1(0), 
      science2: new Science2(0)
  };
  var initialState = {
      currentClicks: 0.0, 
      totalClicks: 0.0, 
      cps: 0.0, 
      age: Stone.value, 
      burst: 1.0, 
      upgrades: initialUpgrades, 
      message: welcomeMessage, 
      now: Prelude.zero(Data_Time.semiringMilliseconds)
  }; 
  var eqClicks = new Prelude.Eq(function (v) {
      return function (v1) {
          return v === v1;
      };
  });
  var ordClicks = new Prelude.Ord(function () {
      return eqClicks;
  }, function (v) {
      return function (v1) {
          return Prelude.compare(Prelude.ordNumber)(v)(v1);
      };
  });
  var ageShow = new Prelude.Show(function (v) {
      if (v instanceof Stone) {
          return "Stone";
      };
      if (v instanceof Bronze) {
          return "Bronze";
      };
      if (v instanceof Iron) {
          return "Iron";
      };
      if (v instanceof Classical) {
          return "Classical";
      };
      if (v instanceof Dark) {
          return "Dark";
      };
      if (v instanceof Medieval) {
          return "Medieval";
      };
      if (v instanceof Renaissance) {
          return "Renaissance";
      };
      if (v instanceof Imperial) {
          return "Imperial";
      };
      if (v instanceof Industrial) {
          return "Industrial";
      };
      if (v instanceof Nuclear) {
          return "Nuclear";
      };
      if (v instanceof Information) {
          return "Information";
      };
      if (v instanceof Global) {
          return "Global";
      };
      if (v instanceof Space) {
          return "Space";
      };
      if (v instanceof Solar) {
          return "Solar";
      };
      throw new Error("Failed pattern match at Types line 170, column 1 - line 186, column 1: " + [ v.constructor.name ]);
  });                                               
  var serializeAge = new Serialize(Prelude.show(ageShow));
  exports["Stone"] = Stone;
  exports["Bronze"] = Bronze;
  exports["Iron"] = Iron;
  exports["Classical"] = Classical;
  exports["Dark"] = Dark;
  exports["Medieval"] = Medieval;
  exports["Renaissance"] = Renaissance;
  exports["Imperial"] = Imperial;
  exports["Industrial"] = Industrial;
  exports["Nuclear"] = Nuclear;
  exports["Information"] = Information;
  exports["Global"] = Global;
  exports["Space"] = Space;
  exports["Solar"] = Solar;
  exports["Misc1"] = Misc1;
  exports["Misc2"] = Misc2;
  exports["Tech1"] = Tech1;
  exports["Tech2"] = Tech2;
  exports["Phil1"] = Phil1;
  exports["Phil2"] = Phil2;
  exports["Poli1"] = Poli1;
  exports["Poli2"] = Poli2;
  exports["Science1"] = Science1;
  exports["Science2"] = Science2;
  exports["Clicks"] = Clicks;
  exports["Click"] = Click;
  exports["Autoclick"] = Autoclick;
  exports["Reset"] = Reset;
  exports["Save"] = Save;
  exports["Autosave"] = Autosave;
  exports["Buy"] = Buy;
  exports["Suffer"] = Suffer;
  exports["Unmessage"] = Unmessage;
  exports["Serialize"] = Serialize;
  exports["Pretty"] = Pretty;
  exports["initialUpgrades"] = initialUpgrades;
  exports["welcomeMessage"] = welcomeMessage;
  exports["initialState"] = initialState;
  exports["serialize"] = serialize;
  exports["prettify"] = prettify;
  exports["eqClicks"] = eqClicks;
  exports["ordClicks"] = ordClicks;
  exports["semiringClicks"] = semiringClicks;
  exports["ringClicks"] = ringClicks;
  exports["prettyPopulation"] = prettyPopulation;
  exports["isForeignUpgrades"] = isForeignUpgrades;
  exports["ageShow"] = ageShow;
  exports["prettyNumber"] = prettyNumber;
  exports["prettyClicks"] = prettyClicks;
  exports["prettyClicksPerSecond"] = prettyClicksPerSecond;
  exports["serializeInt"] = serializeInt;
  exports["serializeNumber"] = serializeNumber;
  exports["serializeClicks"] = serializeClicks;
  exports["serializeAge"] = serializeAge;
  exports["serializeUpgrade"] = serializeUpgrade;
  exports["serializeUpgrades"] = serializeUpgrades;
  exports["serializeMilliseconds"] = serializeMilliseconds;;
 
})(PS["Types"] = PS["Types"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var ageDescription = function (v) {
      if (v instanceof Types.Stone) {
          return [ "You are a member of the hardy but technologically primitive Clickonian\n  people. The other Clickonians generally defer to you when it comes to making\n  important decisions. It is your task to shepherd your people through the\n  Stone Age into a brighter, more prosperous future.", "The tribe must develop various technologies and cultural achievements\n  to stand any hope of surviving more than a few years." ];
      };
      throw new Error("Failed pattern match at Age line 8, column 1 - line 9, column 1: " + [ v.constructor.name ]);
  };
  exports["ageDescription"] = ageDescription;;
 
})(PS["Age"] = PS["Age"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module DOM.Event.EventTarget

  exports.eventListener = function (fn) {
    return function (event) {
      return fn(event)();
    };
  };

  exports.addEventListener = function (type) {
    return function (listener) {
      return function (useCapture) {
        return function (target) {
          return function () {
            target.addEventListener(type, listener, useCapture);
            return {};
          };
        };
      };
    };
  };
 
})(PS["DOM.Event.EventTarget"] = PS["DOM.Event.EventTarget"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["DOM.Event.EventTarget"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var DOM = PS["DOM"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  exports["addEventListener"] = $foreign.addEventListener;
  exports["eventListener"] = $foreign.eventListener;;
 
})(PS["DOM.Event.EventTarget"] = PS["DOM.Event.EventTarget"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var load = "load";
  exports["load"] = load;;
 
})(PS["DOM.Event.EventTypes"] = PS["DOM.Event.EventTypes"] || {});
(function(exports) {
  /* global exports, window */
  "use strict";

  // module DOM.HTML

  exports.window = function () {
    return window;
  };
 
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["DOM.HTML"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["window"] = $foreign.window;;
 
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module DOM.HTML.Window

  exports.document = function (window) {
    return function () {
      return window.document;
    };
  };
 
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["DOM.HTML.Window"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["document"] = $foreign.document;;
 
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports.appendChild = function (node) {
    return function (parent) {
      return function () {
        return parent.appendChild(node);
      };
    };
  };
 
})(PS["DOM.Node.Node"] = PS["DOM.Node.Node"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Nullable

  exports["null"] = null;

  exports.nullable = function(a, r, f) {
      return a == null ? r : f(a);
  };

  exports.notNull = function(x) {
      return x;
  }; 
 
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Data.Nullable"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Function = PS["Data.Function"];     
  var toNullable = Data_Maybe.maybe($foreign["null"])($foreign.notNull);
  var toMaybe = function (n) {
      return $foreign.nullable(n, Data_Maybe.Nothing.value, Data_Maybe.Just.create);
  };
  exports["toNullable"] = toNullable;
  exports["toMaybe"] = toMaybe;;
 
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["DOM.Node.Node"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Enum = PS["Data.Enum"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Maybe_Unsafe = PS["Data.Maybe.Unsafe"];
  var DOM = PS["DOM"];
  var DOM_Node_NodeType = PS["DOM.Node.NodeType"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  exports["appendChild"] = $foreign.appendChild;;
 
})(PS["DOM.Node.Node"] = PS["DOM.Node.Node"] || {});
(function(exports) {
  /* global exports */
  "use strict";                                               

  exports.querySelector = function (selector) {
    return function (node) {
      return function () {
        return node.querySelector(selector);
      };
    };
  };
 
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["DOM.Node.ParentNode"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  exports["querySelector"] = $foreign.querySelector;;
 
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Const = PS["Data.Const"];
  var Data_Either = PS["Data.Either"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Functor_Contravariant = PS["Data.Functor.Contravariant"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];
  var Data_Foreign_Keys = PS["Data.Foreign.Keys"];
  var getMap = function (dictMonoid) {
      return function (f) {
          return function (g) {
              return function ($30) {
                  return Data_Const.getConst(g(Data_Const.contravariantConst)(Data_Const.applicativeConst(dictMonoid))(function ($31) {
                      return Data_Const.Const(f($31));
                  })($30));
              };
          };
      };
  };
  var get = function (g) {
      return function ($32) {
          return Data_Maybe_First.runFirst(getMap(Data_Maybe_First.monoidFirst)(function ($33) {
              return Data_Maybe_First.First(Data_Maybe.Just.create($33));
          })(function (dictContravariant) {
              return function (dictApplicative) {
                  return g(dictContravariant)(dictApplicative);
              };
          })($32));
      };
  };
  var coerce = function (dictContravariant) {
      return function (dictFunctor) {
          var absurd = function (__copy_a) {
              var a = __copy_a;
              tco: while (true) {
                  var __tco_a = a;
                  a = __tco_a;
                  continue tco;
              };
          };
          return function ($34) {
              return Prelude.map(dictFunctor)(absurd)(Data_Functor_Contravariant.cmap(dictContravariant)(absurd)($34));
          };
      };
  };
  var getter = function (f) {
      return function (dictContravariant) {
          return function (dictApplicative) {
              return function (g) {
                  return function (s) {
                      var $27 = f(s);
                      if ($27 instanceof Data_Either.Left) {
                          return coerce(dictContravariant)((dictApplicative["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Prelude.pure(dictApplicative)(Prelude.unit));
                      };
                      if ($27 instanceof Data_Either.Right) {
                          return coerce(dictContravariant)((dictApplicative["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(g($27.value0));
                      };
                      throw new Error("Failed pattern match at Data.Foreign.Lens line 54, column 1 - line 55, column 1: " + [ $27.constructor.name ]);
                  };
              };
          };
      };
  };
  var json = function (dictContravariant) {
      return function (dictApplicative) {
          return getter(Data_Foreign.parseJSON)(dictContravariant)(dictApplicative);
      };
  };
  var number = function (dictContravariant) {
      return function (dictApplicative) {
          return getter(Data_Foreign.readNumber)(dictContravariant)(dictApplicative);
      };
  };
  exports["number"] = number;
  exports["json"] = json;
  exports["getMap"] = getMap;
  exports["get"] = get;
  exports["getter"] = getter;;
 
})(PS["Data.Foreign.Lens"] = PS["Data.Foreign.Lens"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Tuple = PS["Data.Tuple"];     
  var Strong = function (__superclass_Data$dotProfunctor$dotProfunctor_0, first, second) {
      this["__superclass_Data.Profunctor.Profunctor_0"] = __superclass_Data$dotProfunctor$dotProfunctor_0;
      this.first = first;
      this.second = second;
  };
  var strongFn = new Strong(function () {
      return Data_Profunctor.profunctorFn;
  }, function (a2b) {
      return function (v) {
          return new Data_Tuple.Tuple(a2b(v.value0), v.value1);
      };
  }, Prelude["<$>"](Data_Tuple.functorTuple));
  var second = function (dict) {
      return dict.second;
  };
  var first = function (dict) {
      return dict.first;
  };
  exports["Strong"] = Strong;
  exports["second"] = second;
  exports["first"] = first;
  exports["strongFn"] = strongFn;;
 
})(PS["Data.Profunctor.Strong"] = PS["Data.Profunctor.Strong"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Profunctor_Choice = PS["Data.Profunctor.Choice"];
  var runStar = function (v) {
      return v;
  };
  var profunctorStar = function (dictFunctor) {
      return new Data_Profunctor.Profunctor(function (f) {
          return function (g) {
              return function (v) {
                  return function ($26) {
                      return Prelude.map(dictFunctor)(g)(v(f($26)));
                  };
              };
          };
      });
  };
  var strongStar = function (dictFunctor) {
      return new Data_Profunctor_Strong.Strong(function () {
          return profunctorStar(dictFunctor);
      }, function (v) {
          return function (v1) {
              return Prelude.map(dictFunctor)(function (v2) {
                  return new Data_Tuple.Tuple(v2, v1.value1);
              })(v(v1.value0));
          };
      }, function (v) {
          return function (v1) {
              return Prelude.map(dictFunctor)(Data_Tuple.Tuple.create(v1.value0))(v(v1.value1));
          };
      });
  };
  exports["runStar"] = runStar;
  exports["profunctorStar"] = profunctorStar;
  exports["strongStar"] = strongStar;;
 
})(PS["Data.Profunctor.Star"] = PS["Data.Profunctor.Star"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Const = PS["Data.Const"];
  var Data_Functor_Contravariant = PS["Data.Functor.Contravariant"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Lens_Types = PS["Data.Lens.Types"];     
  var view = function (l) {
      return function (s) {
          return Data_Const.getConst(Data_Profunctor_Star.runStar(l(Data_Const.Const))(s));
      };
  };
  var $up$dot = function (s) {
      return function (l) {
          return view(l)(s);
      };
  };
  var to = function (dictContravariant) {
      return function (f) {
          return function (p) {
              return function ($1) {
                  return Data_Functor_Contravariant.cmap(dictContravariant)(f)(Data_Profunctor_Star.runStar(p)(f($1)));
              };
          };
      };
  };
  exports["to"] = to;
  exports["view"] = view;
  exports["^."] = $up$dot;;
 
})(PS["Data.Lens.Getter"] = PS["Data.Lens.Getter"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Lens_Internal_Shop = PS["Data.Lens.Internal.Shop"];
  var Data_Lens_Types = PS["Data.Lens.Types"];
  var lens$prime = function (to) {
      return function (dictStrong) {
          return function (pab) {
              return Data_Profunctor.dimap(dictStrong["__superclass_Data.Profunctor.Profunctor_0"]())(to)(function (v) {
                  return v.value1(v.value0);
              })(Data_Profunctor_Strong.first(dictStrong)(pab));
          };
      };
  };
  var lens = function (get) {
      return function (set) {
          return function (dictStrong) {
              return lens$prime(function (s) {
                  return new Data_Tuple.Tuple(get(s), function (b) {
                      return set(s)(b);
                  });
              })(dictStrong);
          };
      };
  };
  exports["lens"] = lens;;
 
})(PS["Data.Lens.Lens"] = PS["Data.Lens.Lens"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Lens_Types = PS["Data.Lens.Types"];     
  var over = function (l) {
      return l;
  };
  var set = function (l) {
      return function (b) {
          return over(l)(Prelude["const"](b));
      };
  };
  var $dot$tilde = set;
  var $plus$tilde = function (dictSemiring) {
      return function (p) {
          return function ($12) {
              return over(p)(Prelude.add(dictSemiring)($12));
          };
      };
  };
  var $minus$tilde = function (dictRing) {
      return function (p) {
          return function ($13) {
              return over(p)(Prelude.flip(Prelude.sub(dictRing))($13));
          };
      };
  };
  exports["set"] = set;
  exports["over"] = over;
  exports["-~"] = $minus$tilde;
  exports["+~"] = $plus$tilde;
  exports[".~"] = $dot$tilde;;
 
})(PS["Data.Lens.Setter"] = PS["Data.Lens.Setter"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var suffer = function (v) {
      return Prelude.id(Prelude.categoryFn);
  };
  exports["suffer"] = suffer;;
 
})(PS["Disaster"] = PS["Disaster"] || {});
(function(exports) {
  /* global exports, require */
  "use strict";

  // module Halogen.Internal.VirtualDOM

  // jshint maxparams: 2
  exports.prop = function (key, value) {
    var props = {};
    props[key] = value;
    return props;
  };

  // jshint maxparams: 2
  exports.attr = function (key, value) {
    var props = { attributes: {} };
    props.attributes[key] = value;
    return props;
  };

  function HandlerHook (key, f) {
    this.key = key;
    this.callback = function (e) {
      f(e)();
    };
  }

  HandlerHook.prototype = {
    hook: function (node) {
      node.addEventListener(this.key, this.callback);
    },
    unhook: function (node) {
      node.removeEventListener(this.key, this.callback);
    }
  };

  // jshint maxparams: 2
  exports.handlerProp = function (key, f) {
    var props = {};
    props["halogen-hook-" + key] = new HandlerHook(key, f);
    return props;
  };

  // jshint maxparams: 3
  function ifHookFn (node, prop, diff) {
    // jshint validthis: true
    if (typeof diff === "undefined") {
      this.f(node)();
    }
  }

  // jshint maxparams: 1
  function InitHook (f) {
    this.f = f;
  }

  InitHook.prototype = {
    hook: ifHookFn
  };

  exports.initProp = function (f) {
    return { "halogen-init": new InitHook(f) };
  };

  function FinalHook (f) {
    this.f = f;
  }

  FinalHook.prototype = {
    unhook: ifHookFn
  };

  exports.finalizerProp = function (f) {
    return { "halogen-final": new FinalHook(f) };
  };

  exports.concatProps = function () {
    // jshint maxparams: 2
    var hOP = Object.prototype.hasOwnProperty;
    var copy = function (props, result) {
      for (var key in props) {
        if (hOP.call(props, key)) {
          if (key === "attributes") {
            var attrs = props[key];
            var resultAttrs = result[key] || (result[key] = {});
            for (var attr in attrs) {
              if (hOP.call(attrs, attr)) {
                resultAttrs[attr] = attrs[attr];
              }
            }
          } else {
            result[key] = props[key];
          }
        }
      }
      return result;
    };
    return function (p1, p2) {
      return copy(p2, copy(p1, {}));
    };
  }();

  exports.emptyProps = {};

  exports.createElement = function () {
    var vcreateElement = require("virtual-dom/create-element");
    return function (vtree) {
      return vcreateElement(vtree);
    };
  }();

  exports.diff = function () {
    var vdiff = require("virtual-dom/diff");
    return function (vtree1) {
      return function (vtree2) {
        return vdiff(vtree1, vtree2);
      };
    };
  }();

  exports.patch = function () {
    var vpatch = require("virtual-dom/patch");
    return function (p) {
      return function (node) {
        return function () {
          return vpatch(node, p);
        };
      };
    };
  }();

  exports.vtext = function () {
    var VText = require("virtual-dom/vnode/vtext");
    return function (s) {
      return new VText(s);
    };
  }();

  exports.vnode = function () {
    var VirtualNode = require("virtual-dom/vnode/vnode");
    var SoftSetHook = require("virtual-dom/virtual-hyperscript/hooks/soft-set-hook");
    return function (namespace) {
      return function (name) {
        return function (key) {
          return function (props) {
            return function (children) {
              if (name === "input" && props.value !== undefined) {
                props.value = new SoftSetHook(props.value);
              }
              return new VirtualNode(name, props, children, key, namespace);
            };
          };
        };
      };
    };
  }();
 
})(PS["Halogen.Internal.VirtualDOM"] = PS["Halogen.Internal.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var $foreign = PS["Halogen.Internal.VirtualDOM"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Nullable = PS["Data.Nullable"];
  var Data_Function = PS["Data.Function"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];     
  var semigroupProps = new Prelude.Semigroup(Data_Function.runFn2($foreign.concatProps));
  var monoidProps = new Data_Monoid.Monoid(function () {
      return semigroupProps;
  }, $foreign.emptyProps);
  exports["semigroupProps"] = semigroupProps;
  exports["monoidProps"] = monoidProps;
  exports["vnode"] = $foreign.vnode;
  exports["vtext"] = $foreign.vtext;
  exports["patch"] = $foreign.patch;
  exports["diff"] = $foreign.diff;
  exports["createElement"] = $foreign.createElement;
  exports["finalizerProp"] = $foreign.finalizerProp;
  exports["initProp"] = $foreign.initProp;
  exports["handlerProp"] = $foreign.handlerProp;
  exports["attr"] = $foreign.attr;
  exports["prop"] = $foreign.prop;;
 
})(PS["Halogen.Internal.VirtualDOM"] = PS["Halogen.Internal.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Data_Exists = PS["Data.Exists"];
  var Data_ExistsR = PS["Data.ExistsR"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function = PS["Data.Function"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Nullable = PS["Data.Nullable"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_Internal_VirtualDOM = PS["Halogen.Internal.VirtualDOM"];     
  var handleAff = Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Prelude["const"](Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit)));
  var renderProp = function (v) {
      return function (v1) {
          if (v1 instanceof Halogen_HTML_Core.Prop) {
              return Data_Exists.runExists(function (v2) {
                  return Halogen_Internal_VirtualDOM.prop(Halogen_HTML_Core.runPropName(v2.value0), v2.value1);
              })(v1.value0);
          };
          if (v1 instanceof Halogen_HTML_Core.Attr) {
              var attrName = Data_Maybe.maybe("")(function (ns$prime) {
                  return Halogen_HTML_Core.runNamespace(ns$prime) + ":";
              })(v1.value0) + Halogen_HTML_Core.runAttrName(v1.value1);
              return Halogen_Internal_VirtualDOM.attr(attrName, v1.value2);
          };
          if (v1 instanceof Halogen_HTML_Core.Handler) {
              return Data_ExistsR.runExistsR(function (v2) {
                  return Halogen_Internal_VirtualDOM.handlerProp(Halogen_HTML_Core.runEventName(v2.value0), function (ev) {
                      return handleAff(Prelude[">>="](Control_Monad_Aff.bindAff)(Halogen_HTML_Events_Handler.runEventHandler(Control_Monad_Aff.monadAff)(Control_Monad_Aff.monadEffAff)(ev)(v2.value1(ev)))(Data_Maybe.maybe(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))(v)));
                  });
              })(v1.value0);
          };
          if (v1 instanceof Halogen_HTML_Core.Initializer) {
              return Halogen_Internal_VirtualDOM.initProp(function ($33) {
                  return handleAff(v(v1.value0($33)));
              });
          };
          if (v1 instanceof Halogen_HTML_Core.Finalizer) {
              return Halogen_Internal_VirtualDOM.finalizerProp(function ($34) {
                  return handleAff(v(v1.value0($34)));
              });
          };
          return Data_Monoid.mempty(Halogen_Internal_VirtualDOM.monoidProps);
      };
  };
  var findKey = function (v) {
      return function (v1) {
          if (v1 instanceof Halogen_HTML_Core.Key) {
              return new Data_Maybe.Just(v1.value0);
          };
          return v;
      };
  };
  var renderHTML = function (f) {
      var go = function (v) {
          if (v instanceof Halogen_HTML_Core.Text) {
              return Halogen_Internal_VirtualDOM.vtext(v.value0);
          };
          if (v instanceof Halogen_HTML_Core.Element) {
              var tag = Halogen_HTML_Core.runTagName(v.value1);
              var ns$prime = Data_Nullable.toNullable(Prelude["<$>"](Data_Maybe.functorMaybe)(Halogen_HTML_Core.runNamespace)(v.value0));
              var key = Data_Nullable.toNullable(Data_Foldable.foldl(Data_Foldable.foldableArray)(findKey)(Data_Maybe.Nothing.value)(v.value2));
              return Halogen_Internal_VirtualDOM.vnode(ns$prime)(tag)(key)(Data_Foldable.foldMap(Data_Foldable.foldableArray)(Halogen_Internal_VirtualDOM.monoidProps)(renderProp(f))(v.value2))(Prelude.map(Prelude.functorArray)(go)(v.value3));
          };
          if (v instanceof Halogen_HTML_Core.Slot) {
              return Halogen_Internal_VirtualDOM.vtext("");
          };
          throw new Error("Failed pattern match at Halogen.HTML.Renderer.VirtualDOM line 27, column 1 - line 28, column 1: " + [ v.constructor.name ]);
      };
      return go;
  };
  exports["renderHTML"] = renderHTML;;
 
})(PS["Halogen.HTML.Renderer.VirtualDOM"] = PS["Halogen.HTML.Renderer.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine = PS["Control.Coroutine"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Control_Plus = PS["Control.Plus"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];
  var Data_Tuple = PS["Data.Tuple"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Effects = PS["Halogen.Effects"];
  var Halogen_HTML_Renderer_VirtualDOM = PS["Halogen.HTML.Renderer.VirtualDOM"];
  var Halogen_Internal_VirtualDOM = PS["Halogen.Internal.VirtualDOM"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_Query_StateF = PS["Halogen.Query.StateF"];
  var Halogen_Query_EventSource = PS["Halogen.Query.EventSource"];
  var Halogen_Query_HalogenF = PS["Halogen.Query.HalogenF"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];     
  var runUI = function (c) {
      return function (s) {
          var render = function (ref) {
              return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (v) {
                  var $6 = !v.renderPending;
                  if ($6) {
                      return Control_Monad_Aff_AVar.putVar(ref)(v);
                  };
                  if (!$6) {
                      var $7 = Halogen_Component.renderComponent(c)(v.state);
                      var vtree$prime = Halogen_HTML_Renderer_VirtualDOM.renderHTML(driver(ref))($7.value0);
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(Halogen_Internal_VirtualDOM.patch(Halogen_Internal_VirtualDOM.diff(v.vtree)(vtree$prime))(v.node)))(function (v1) {
                          return Control_Monad_Aff_AVar.putVar(ref)({
                              node: v1, 
                              vtree: vtree$prime, 
                              state: $7.value1, 
                              renderPending: false
                          });
                      });
                  };
                  throw new Error("Failed pattern match at Halogen.Driver line 56, column 1 - line 61, column 1: " + [ $6.constructor.name ]);
              });
          };
          var $$eval = function (ref) {
              return function (h) {
                  if (h instanceof Halogen_Query_HalogenF.StateHF) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (v) {
                          var $13 = Control_Monad_State.runState(Halogen_Query_StateF.stateN(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity))(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(h.value0))(v.state);
                          return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(ref)({
                              node: v.node, 
                              vtree: v.vtree, 
                              state: $13.value1, 
                              renderPending: true
                          }))(function () {
                              return Prelude.pure(Control_Monad_Aff.applicativeAff)($13.value0);
                          });
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.SubscribeHF) {
                      var producer = Halogen_Query_EventSource.runEventSource(h.value0);
                      var consumer = Control_Monad_Rec_Class.forever(Control_Monad_Free_Trans.monadRecFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(Control_Bind["=<<"](Control_Monad_Free_Trans.bindFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(function ($25) {
                          return Control_Monad_Trans.lift(Control_Monad_Free_Trans.monadTransFreeT(Control_Coroutine.functorAwait))(Control_Monad_Aff.monadAff)(driver(ref)($25));
                      })(Control_Coroutine["await"](Control_Monad_Aff.monadAff)));
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff.forkAff(Control_Coroutine_Stalling.runStallingProcess(Control_Monad_Aff.monadRecAff)(Control_Coroutine_Stalling["$$?"](Control_Monad_Aff.monadRecAff)(producer)(consumer))))(function () {
                          return Prelude.pure(Control_Monad_Aff.applicativeAff)(h.value1);
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.QueryHF) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(render(ref))(function () {
                          return h.value0;
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.HaltHF) {
                      return Control_Plus.empty(Control_Monad_Aff.plusAff);
                  };
                  throw new Error("Failed pattern match at Halogen.Driver line 56, column 1 - line 61, column 1: " + [ h.constructor.name ]);
              };
          };
          var driver = function (ref) {
              return function (q) {
                  return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Free.runFreeM(Halogen_Query_HalogenF.functorHalogenF(Control_Monad_Aff.functorAff))(Control_Monad_Aff.monadRecAff)($$eval(ref))(Halogen_Component.queryComponent(c)(q)))(function (v) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(render(ref))(function () {
                          return Prelude.pure(Control_Monad_Aff.applicativeAff)(v);
                      });
                  });
              };
          };
          var $21 = Halogen_Component.renderComponent(c)(s);
          return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.makeVar)(function (v) {
              var vtree = Halogen_HTML_Renderer_VirtualDOM.renderHTML(driver(v))($21.value0);
              var node = Halogen_Internal_VirtualDOM.createElement(vtree);
              return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(v)({
                  node: node, 
                  vtree: vtree, 
                  state: $21.value1, 
                  renderPending: false
              }))(function () {
                  return Prelude.pure(Control_Monad_Aff.applicativeAff)({
                      node: node, 
                      driver: driver(v)
                  });
              });
          });
      };
  };
  exports["runUI"] = runUI;;
 
})(PS["Halogen.Driver"] = PS["Halogen.Driver"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                              
  var span = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.span);  
  var img = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.img);      
  var i = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.i);  
  var h3 = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.h3);
  var h1 = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.h1);
  var div = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.div);
  var a = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.a);
  exports["span"] = span;
  exports["img"] = img;
  exports["i"] = i;
  exports["h3"] = h3;
  exports["h1"] = h1;
  exports["div"] = div;
  exports["a"] = a;;
 
})(PS["Halogen.HTML.Elements.Indexed"] = PS["Halogen.HTML.Elements.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];                                        
  var onMouseDown = Halogen_HTML_Core.handler(Halogen_HTML_Core.eventName("mousedown"));
  var input_ = function (f) {
      return function (v) {
          return Prelude.pure(Halogen_HTML_Events_Handler.applicativeEventHandler)(Halogen_Query.action(f));
      };
  };
  exports["onMouseDown"] = onMouseDown;
  exports["input_"] = input_;;
 
})(PS["Halogen.HTML.Events"] = PS["Halogen.HTML.Events"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_HTML_Events = PS["Halogen.HTML.Events"];
  var Halogen_HTML_Events_Forms = PS["Halogen.HTML.Events.Forms"];                
  var onMouseDown = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Events.onMouseDown);
  exports["onMouseDown"] = onMouseDown;;
 
})(PS["Halogen.HTML.Events.Indexed"] = PS["Halogen.HTML.Events.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_Event_EventTarget = PS["DOM.Event.EventTarget"];
  var DOM_Event_EventTypes = PS["DOM.Event.EventTypes"];
  var DOM_HTML = PS["DOM.HTML"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var DOM_HTML_Window = PS["DOM.HTML.Window"];
  var DOM_Node_Node = PS["DOM.Node.Node"];
  var DOM_Node_ParentNode = PS["DOM.Node.ParentNode"];
  var DOM_Node_Types = PS["DOM.Node.Types"];     
  var onLoad = function (dictMonadEff) {
      return function (callback) {
          return Control_Monad_Eff_Class.liftEff(dictMonadEff)(Control_Bind["=<<"](Control_Monad_Eff.bindEff)(function ($9) {
              return DOM_Event_EventTarget.addEventListener(DOM_Event_EventTypes.load)(DOM_Event_EventTarget.eventListener(function (v) {
                  return callback;
              }))(false)(DOM_HTML_Types.windowToEventTarget($9));
          })(DOM_HTML.window));
      };
  };
  var appendTo = function (dictMonadEff) {
      return function (query) {
          return function (elem) {
              return Control_Monad_Eff_Class.liftEff(dictMonadEff)(function __do() {
                  var v = Prelude["<$>"](Control_Monad_Eff.functorEff)(Data_Nullable.toMaybe)(Control_Bind["=<<"](Control_Monad_Eff.bindEff)(Control_Bind["<=<"](Control_Monad_Eff.bindEff)(function ($10) {
                      return DOM_Node_ParentNode.querySelector(query)(DOM_HTML_Types.htmlDocumentToParentNode($10));
                  })(DOM_HTML_Window.document))(DOM_HTML.window))();
                  if (v instanceof Data_Maybe.Nothing) {
                      return Prelude.unit;
                  };
                  if (v instanceof Data_Maybe.Just) {
                      return Prelude["void"](Control_Monad_Eff.functorEff)(DOM_Node_Node.appendChild(DOM_HTML_Types.htmlElementToNode(elem))(DOM_Node_Types.elementToNode(v.value0)))();
                  };
                  throw new Error("Failed pattern match at Halogen.Util line 28, column 1 - line 30, column 1: " + [ v.constructor.name ]);
              });
          };
      };
  };
  var appendToBody = function (dictMonadEff) {
      return appendTo(dictMonadEff)("body");
  };
  exports["onLoad"] = onLoad;
  exports["appendToBody"] = appendToBody;
  exports["appendTo"] = appendTo;;
 
})(PS["Halogen.Util"] = PS["Halogen.Util"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Time = PS["Data.Time"];
  var Types = PS["Types"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Const = PS["Data.Const"];
  var Data_Lens_Lens = PS["Data.Lens.Lens"];     
  var viewLevel = (function () {
      var viewLevel$prime = function (v) {
          if (v instanceof Types.Misc1) {
              return v.value0;
          };
          if (v instanceof Types.Misc2) {
              return v.value0;
          };
          if (v instanceof Types.Tech1) {
              return v.value0;
          };
          if (v instanceof Types.Tech2) {
              return v.value0;
          };
          if (v instanceof Types.Phil1) {
              return v.value0;
          };
          if (v instanceof Types.Phil2) {
              return v.value0;
          };
          if (v instanceof Types.Poli1) {
              return v.value0;
          };
          if (v instanceof Types.Poli2) {
              return v.value0;
          };
          if (v instanceof Types.Science1) {
              return v.value0;
          };
          if (v instanceof Types.Science2) {
              return v.value0;
          };
          throw new Error("Failed pattern match at Lenses line 85, column 5 - line 86, column 5: " + [ v.constructor.name ]);
      };
      return Data_Lens_Getter.to(Data_Const.contravariantConst)(viewLevel$prime);
  })();
  var upgrades = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.upgrades;
      })(function (v) {
          return function (v1) {
              var $85 = {};
              for (var $86 in v) {
                  if (v.hasOwnProperty($86)) {
                      $85[$86] = v[$86];
                  };
              };
              $85.upgrades = v1;
              return $85;
          };
      })(dictStrong);
  };
  var totalClicks = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.totalClicks;
      })(function (v) {
          return function (v1) {
              var $87 = {};
              for (var $88 in v) {
                  if (v.hasOwnProperty($88)) {
                      $87[$88] = v[$88];
                  };
              };
              $87.totalClicks = v1;
              return $87;
          };
      })(dictStrong);
  };
  var runUpgrades = function (v) {
      return v;
  };
  var science1 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($136) {
          return (function (v) {
              return v.science1;
          })(runUpgrades($136));
      })(function (v) {
          return function (v1) {
              var $91 = {};
              for (var $92 in v) {
                  if (v.hasOwnProperty($92)) {
                      $91[$92] = v[$92];
                  };
              };
              $91.science1 = v1;
              return $91;
          };
      })(dictStrong);
  };
  var science2 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($137) {
          return (function (v) {
              return v.science2;
          })(runUpgrades($137));
      })(function (v) {
          return function (v1) {
              var $94 = {};
              for (var $95 in v) {
                  if (v.hasOwnProperty($95)) {
                      $94[$95] = v[$95];
                  };
              };
              $94.science2 = v1;
              return $94;
          };
      })(dictStrong);
  };
  var tech1 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($138) {
          return (function (v) {
              return v.tech1;
          })(runUpgrades($138));
      })(function (v) {
          return function (v1) {
              var $97 = {};
              for (var $98 in v) {
                  if (v.hasOwnProperty($98)) {
                      $97[$98] = v[$98];
                  };
              };
              $97.tech1 = v1;
              return $97;
          };
      })(dictStrong);
  };
  var tech2 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($139) {
          return (function (v) {
              return v.tech2;
          })(runUpgrades($139));
      })(function (v) {
          return function (v1) {
              var $100 = {};
              for (var $101 in v) {
                  if (v.hasOwnProperty($101)) {
                      $100[$101] = v[$101];
                  };
              };
              $100.tech2 = v1;
              return $100;
          };
      })(dictStrong);
  };
  var poli2 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($140) {
          return (function (v) {
              return v.poli2;
          })(runUpgrades($140));
      })(function (v) {
          return function (v1) {
              var $103 = {};
              for (var $104 in v) {
                  if (v.hasOwnProperty($104)) {
                      $103[$104] = v[$104];
                  };
              };
              $103.poli2 = v1;
              return $103;
          };
      })(dictStrong);
  };
  var poli1 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($141) {
          return (function (v) {
              return v.poli1;
          })(runUpgrades($141));
      })(function (v) {
          return function (v1) {
              var $106 = {};
              for (var $107 in v) {
                  if (v.hasOwnProperty($107)) {
                      $106[$107] = v[$107];
                  };
              };
              $106.poli1 = v1;
              return $106;
          };
      })(dictStrong);
  };
  var phil2 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($142) {
          return (function (v) {
              return v.phil2;
          })(runUpgrades($142));
      })(function (v) {
          return function (v1) {
              var $109 = {};
              for (var $110 in v) {
                  if (v.hasOwnProperty($110)) {
                      $109[$110] = v[$110];
                  };
              };
              $109.phil2 = v1;
              return $109;
          };
      })(dictStrong);
  };
  var phil1 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($143) {
          return (function (v) {
              return v.phil1;
          })(runUpgrades($143));
      })(function (v) {
          return function (v1) {
              var $112 = {};
              for (var $113 in v) {
                  if (v.hasOwnProperty($113)) {
                      $112[$113] = v[$113];
                  };
              };
              $112.phil1 = v1;
              return $112;
          };
      })(dictStrong);
  };
  var now = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.now;
      })(function (v) {
          return function (v1) {
              var $114 = {};
              for (var $115 in v) {
                  if (v.hasOwnProperty($115)) {
                      $114[$115] = v[$115];
                  };
              };
              $114.now = v1;
              return $114;
          };
      })(dictStrong);
  };
  var misc2 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($144) {
          return (function (v) {
              return v.misc2;
          })(runUpgrades($144));
      })(function (v) {
          return function (v1) {
              var $117 = {};
              for (var $118 in v) {
                  if (v.hasOwnProperty($118)) {
                      $117[$118] = v[$118];
                  };
              };
              $117.misc2 = v1;
              return $117;
          };
      })(dictStrong);
  };
  var misc1 = function (dictStrong) {
      return Data_Lens_Lens.lens(function ($145) {
          return (function (v) {
              return v.misc1;
          })(runUpgrades($145));
      })(function (v) {
          return function (v1) {
              var $120 = {};
              for (var $121 in v) {
                  if (v.hasOwnProperty($121)) {
                      $120[$121] = v[$121];
                  };
              };
              $120.misc1 = v1;
              return $120;
          };
      })(dictStrong);
  };
  var message = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.message;
      })(function (v) {
          return function (v1) {
              var $122 = {};
              for (var $123 in v) {
                  if (v.hasOwnProperty($123)) {
                      $122[$123] = v[$123];
                  };
              };
              $122.message = v1;
              return $122;
          };
      })(dictStrong);
  };
  var currentClicks = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.currentClicks;
      })(function (v) {
          return function (v1) {
              var $124 = {};
              for (var $125 in v) {
                  if (v.hasOwnProperty($125)) {
                      $124[$125] = v[$125];
                  };
              };
              $124.currentClicks = v1;
              return $124;
          };
      })(dictStrong);
  };
  var cps = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.cps;
      })(function (v) {
          return function (v1) {
              var $126 = {};
              for (var $127 in v) {
                  if (v.hasOwnProperty($127)) {
                      $126[$127] = v[$127];
                  };
              };
              $126.cps = v1;
              return $126;
          };
      })(dictStrong);
  };
  var clicksPerSecond = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v;
      })(function (v) {
          return function (m) {
              return m;
          };
      })(dictStrong);
  };
  var cpsNumber = function (dictStrong) {
      return function ($146) {
          return cps(dictStrong)(clicksPerSecond(dictStrong)($146));
      };
  };
  var clicks = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v;
      })(function (v) {
          return function (m) {
              return m;
          };
      })(dictStrong);
  };
  var currentClicksNumber = function (dictStrong) {
      return function ($147) {
          return currentClicks(dictStrong)(clicks(dictStrong)($147));
      };
  };
  var totalClicksNumber = function (dictStrong) {
      return function ($148) {
          return totalClicks(dictStrong)(clicks(dictStrong)($148));
      };
  };
  var burst = function (dictStrong) {
      return Data_Lens_Lens.lens(function (v) {
          return v.burst;
      })(function (v) {
          return function (v1) {
              var $132 = {};
              for (var $133 in v) {
                  if (v.hasOwnProperty($133)) {
                      $132[$133] = v[$133];
                  };
              };
              $132.burst = v1;
              return $132;
          };
      })(dictStrong);
  };
  var burstNumber = function (dictStrong) {
      return function ($149) {
          return burst(dictStrong)(clicks(dictStrong)($149));
      };
  };
  exports["viewLevel"] = viewLevel;
  exports["science2"] = science2;
  exports["science1"] = science1;
  exports["poli2"] = poli2;
  exports["poli1"] = poli1;
  exports["phil2"] = phil2;
  exports["phil1"] = phil1;
  exports["tech2"] = tech2;
  exports["tech1"] = tech1;
  exports["misc2"] = misc2;
  exports["misc1"] = misc1;
  exports["runUpgrades"] = runUpgrades;
  exports["upgrades"] = upgrades;
  exports["now"] = now;
  exports["message"] = message;
  exports["burstNumber"] = burstNumber;
  exports["burst"] = burst;
  exports["cpsNumber"] = cpsNumber;
  exports["cps"] = cps;
  exports["totalClicksNumber"] = totalClicksNumber;
  exports["totalClicks"] = totalClicks;
  exports["currentClicksNumber"] = currentClicksNumber;
  exports["currentClicks"] = currentClicks;
  exports["clicksPerSecond"] = clicksPerSecond;
  exports["clicks"] = clicks;;
 
})(PS["Lenses"] = PS["Lenses"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Array = PS["Data.Array"];
  var Data_Int = PS["Data.Int"];
  var Data_Lens = PS["Data.Lens"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Util = PS["Util"];
  var Data_Lens_Setter = PS["Data.Lens.Setter"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var upgradeName = function (v) {
      return function (v1) {
          if (v instanceof Types.Misc1 && v1 instanceof Types.Stone) {
              return "language";
          };
          if (v instanceof Types.Misc2 && v1 instanceof Types.Stone) {
              return "spear tips";
          };
          if (v instanceof Types.Tech1 && v1 instanceof Types.Stone) {
              return "fire!";
          };
          if (v instanceof Types.Tech2 && v1 instanceof Types.Stone) {
              return "stone tools";
          };
          if (v instanceof Types.Phil1 && v1 instanceof Types.Stone) {
              return "funeral rites";
          };
          if (v instanceof Types.Phil2 && v1 instanceof Types.Stone) {
              return "cave paintings";
          };
          if (v instanceof Types.Poli1 && v1 instanceof Types.Stone) {
              return "basic fishing";
          };
          if (v instanceof Types.Poli2 && v1 instanceof Types.Stone) {
              return "rudimentary farming";
          };
          if (v instanceof Types.Science1 && v1 instanceof Types.Stone) {
              return "dog domestication";
          };
          if (v instanceof Types.Science2 && v1 instanceof Types.Stone) {
              return "abstract numbers";
          };
          throw new Error("Failed pattern match at Upgrades line 48, column 1 - line 49, column 1: " + [ v.constructor.name, v1.constructor.name ]);
      };
  };
  var upgradeDescription = function (v) {
      return function (v1) {
          if (v instanceof Types.Misc1 && v1 instanceof Types.Stone) {
              return "No more grunt-and-point for you!";
          };
          if (v instanceof Types.Misc2 && v1 instanceof Types.Stone) {
              return "Tip: a well-balanced spear is crucial for hunting.";
          };
          if (v instanceof Types.Tech1 && v1 instanceof Types.Stone) {
              return "We DID start the fire.";
          };
          if (v instanceof Types.Tech2 && v1 instanceof Types.Stone) {
              return "Never leave the Stone Age without 'em.";
          };
          if (v instanceof Types.Phil1 && v1 instanceof Types.Stone) {
              return "Funerals are a basic human rite.";
          };
          if (v instanceof Types.Phil2 && v1 instanceof Types.Stone) {
              return "You're no Picasso, but your paintings will last longer.";
          };
          if (v instanceof Types.Poli1 && v1 instanceof Types.Stone) {
              return "Fishing for landsharks?";
          };
          if (v instanceof Types.Poli2 && v1 instanceof Types.Stone) {
              return "Can I interest you in some delicious BEETS?";
          };
          if (v instanceof Types.Science1 && v1 instanceof Types.Stone) {
              return "A Clickonian's best friend.";
          };
          if (v instanceof Types.Science2 && v1 instanceof Types.Stone) {
              return "You've discovered that two clicks and two dogs both share 'twoness.' You also almost discovered the ultrafilter lemma, but you couldn't write it down fast enough. Because you haven't discovered writing yet.";
          };
          throw new Error("Failed pattern match at Upgrades line 60, column 1 - line 61, column 1: " + [ v.constructor.name, v1.constructor.name ]);
      };
  };
  var upgradeCostModifier = function (n) {
      if (n <= 10) {
          return 1.5;
      };
      if (n <= 25) {
          return 1.0;
      };
      if (n <= 50) {
          return 0.75;
      };
      if (n <= 75) {
          return 0.5;
      };
      if (n <= 100) {
          return 0.25;
      };
      if (Prelude.otherwise) {
          return 0.125;
      };
      throw new Error("Failed pattern match at Upgrades line 39, column 1 - line 40, column 1: " + [ n.constructor.name ]);
  };
  var upgradeCostPolynomial = function (coeff) {
      return function (level) {
          return upgradeCostModifier(level) * coeff * Util["^"](1.2)(Data_Int.toNumber(level));
      };
  };
  var upgradeCost = function (v) {
      if (v instanceof Types.Misc1) {
          return upgradeCostPolynomial(10.0)(v.value0);
      };
      if (v instanceof Types.Misc2) {
          return upgradeCostPolynomial(500.0)(v.value0);
      };
      if (v instanceof Types.Tech1) {
          return upgradeCostPolynomial(7500.0)(v.value0);
      };
      if (v instanceof Types.Tech2) {
          return upgradeCostPolynomial(950000.0)(v.value0);
      };
      if (v instanceof Types.Phil1) {
          return upgradeCostPolynomial(8250000.0)(v.value0);
      };
      if (v instanceof Types.Phil2) {
          return upgradeCostPolynomial(5.2e7)(v.value0);
      };
      if (v instanceof Types.Poli1) {
          return upgradeCostPolynomial(8.0e8)(v.value0);
      };
      if (v instanceof Types.Poli2) {
          return upgradeCostPolynomial(6.05e9)(v.value0);
      };
      if (v instanceof Types.Science1) {
          return upgradeCostPolynomial(6.00500004e11)(v.value0);
      };
      if (v instanceof Types.Science2) {
          return upgradeCostPolynomial(6.50000700008e12)(v.value0);
      };
      throw new Error("Failed pattern match at Upgrades line 24, column 1 - line 25, column 1: " + [ v.constructor.name ]);
  };
  var upgradeBoostModifier = function (n) {
      if (n <= 10) {
          return 1.0;
      };
      if (n <= 25) {
          return 4.0;
      };
      if (n <= 50) {
          return 16.0;
      };
      if (n <= 75) {
          return 64.0;
      };
      if (n <= 100) {
          return 256.0;
      };
      if (Prelude.otherwise) {
          return 1024.0;
      };
      throw new Error("Failed pattern match at Upgrades line 104, column 1 - line 105, column 1: " + [ n.constructor.name ]);
  };
  var upgradeBoost = function (v) {
      if (v instanceof Types.Misc1) {
          return 0.5 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Misc2) {
          return 4.0 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Tech1) {
          return 30.0 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Tech2) {
          return 400.0 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Phil1) {
          return 6000.0 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Phil2) {
          return 12220.5 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Poli1) {
          return 214592.6 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Poli2) {
          return 1712818.2 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Science1) {
          return 4.9e7 * upgradeBoostModifier(v.value0);
      };
      if (v instanceof Types.Science2) {
          return 1.0e8 * upgradeBoostModifier(v.value0);
      };
      throw new Error("Failed pattern match at Upgrades line 92, column 1 - line 93, column 1: " + [ v.constructor.name ]);
  };
  var recordPurchase = function (up) {
      return function (optic) {
          return function ($108) {
              return Data_Lens_Setter["-~"](Types.ringClicks)(Lenses.currentClicks(Data_Profunctor_Strong.strongFn))(upgradeCost(up))(Data_Lens_Setter[".~"](function ($109) {
                  return Lenses.upgrades(Data_Profunctor_Strong.strongFn)(optic(Data_Profunctor_Strong.strongFn)($109));
              })(up)($108));
          };
      };
  };
  var nextUpgrade = function (v) {
      if (v instanceof Types.Misc1) {
          return new Types.Misc1(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Misc2) {
          return new Types.Misc2(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Tech1) {
          return new Types.Tech1(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Tech2) {
          return new Types.Tech2(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Phil1) {
          return new Types.Phil1(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Phil2) {
          return new Types.Phil2(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Poli1) {
          return new Types.Poli1(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Poli2) {
          return new Types.Poli2(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Science1) {
          return new Types.Science1(v.value0 + 1 | 0);
      };
      if (v instanceof Types.Science2) {
          return new Types.Science2(v.value0 + 1 | 0);
      };
      throw new Error("Failed pattern match at Upgrades line 72, column 1 - line 73, column 1: " + [ v.constructor.name ]);
  };
  var isInflectionUpgrade = function (up) {
      return Data_Foldable.elem(Data_Foldable.foldableArray)(Prelude.eqInt)(Data_Lens_Getter["^."](up)(Lenses.viewLevel))([ 10, 25, 50, 75, 100 ]);
  };
  var installUpgrade = function (up) {
      return function (optic) {
          return function (coeff) {
              return Data_Lens_Setter["+~"](Prelude.semiringNumber)(optic(Data_Profunctor_Strong.strongFn))(coeff * upgradeBoost(up));
          };
      };
  };
  var inflectionUpgradeMessage = function (up) {
      return function (age) {
          return upgradeName(up)(age) + " cost down, boost up";
      };
  };
  var canBuyUpgrade = function (state) {
      return function (optic) {
          var currUpgrade = Data_Lens_Getter["^."](state)(function ($110) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(optic(Data_Profunctor_Star.strongStar(Data_Const.functorConst))($110));
          });
          var next = nextUpgrade(currUpgrade);
          var nextCost = upgradeCost(next);
          var currClicks = Data_Lens_Getter["^."](state)(Lenses.currentClicks(Data_Profunctor_Star.strongStar(Data_Const.functorConst)));
          return Prelude[">="](Types.ordClicks)(currClicks)(nextCost);
      };
  };
  var buyUpgrade = function (v) {
      if (v instanceof Types.Misc1) {
          return function ($111) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.misc1(dictStrong);
              })($111)));
          };
      };
      if (v instanceof Types.Misc2) {
          return function ($112) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.misc2(dictStrong);
              })($112)));
          };
      };
      if (v instanceof Types.Tech1) {
          return function ($113) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.tech1(dictStrong);
              })($113)));
          };
      };
      if (v instanceof Types.Tech2) {
          return function ($114) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.tech2(dictStrong);
              })($114)));
          };
      };
      if (v instanceof Types.Phil1) {
          return function ($115) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.phil1(dictStrong);
              })($115)));
          };
      };
      if (v instanceof Types.Phil2) {
          return function ($116) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.phil2(dictStrong);
              })($116)));
          };
      };
      if (v instanceof Types.Poli1) {
          return function ($117) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.poli1(dictStrong);
              })($117)));
          };
      };
      if (v instanceof Types.Poli2) {
          return function ($118) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.poli2(dictStrong);
              })($118)));
          };
      };
      if (v instanceof Types.Science1) {
          return function ($119) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.science1(dictStrong);
              })($119)));
          };
      };
      if (v instanceof Types.Science2) {
          return function ($120) {
              return installUpgrade(v)(function (dictStrong) {
                  return Lenses.cpsNumber(dictStrong);
              })(0.75)(installUpgrade(v)(function (dictStrong) {
                  return Lenses.burstNumber(dictStrong);
              })(0.3)(recordPurchase(v)(function (dictStrong) {
                  return Lenses.science2(dictStrong);
              })($120)));
          };
      };
      throw new Error("Failed pattern match at Upgrades line 113, column 1 - line 114, column 1: " + [ v.constructor.name ]);
  };
  var makeUpgradedState = function (u) {
      var tech2arr = Prelude["<$>"](Prelude.functorArray)(Types.Tech2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($121) {
          return Lenses.tech2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($121));
      })));
      var tech1arr = Prelude["<$>"](Prelude.functorArray)(Types.Tech1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($122) {
          return Lenses.tech1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($122));
      })));
      var science2arr = Prelude["<$>"](Prelude.functorArray)(Types.Science2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($123) {
          return Lenses.science2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($123));
      })));
      var science1arr = Prelude["<$>"](Prelude.functorArray)(Types.Science1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($124) {
          return Lenses.science1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($124));
      })));
      var poli2arr = Prelude["<$>"](Prelude.functorArray)(Types.Poli2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($125) {
          return Lenses.poli2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($125));
      })));
      var poli1arr = Prelude["<$>"](Prelude.functorArray)(Types.Poli1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($126) {
          return Lenses.poli1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($126));
      })));
      var phil2arr = Prelude["<$>"](Prelude.functorArray)(Types.Phil2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($127) {
          return Lenses.phil2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($127));
      })));
      var phil1arr = Prelude["<$>"](Prelude.functorArray)(Types.Phil1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($128) {
          return Lenses.phil1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($128));
      })));
      var misc2arr = Prelude["<$>"](Prelude.functorArray)(Types.Misc2.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($129) {
          return Lenses.misc2(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($129));
      })));
      var misc1arr = Prelude["<$>"](Prelude.functorArray)(Types.Misc1.create)(Util["..."](1)(Data_Lens_Getter["^."](u)(function ($130) {
          return Lenses.misc1(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($130));
      })));
      var upArray = Data_Array.concat([ misc1arr, misc2arr, tech1arr, tech2arr, phil1arr, phil2arr, poli1arr, poli2arr, science1arr, science2arr ]);
      return Data_Foldable.foldl(Data_Foldable.foldableArray)(Prelude.flip(buyUpgrade))(Types.initialState)(upArray);
  };
  var cpsFromUpgrades = function ($131) {
      return Data_Lens_Getter.view(Lenses.cps(Data_Profunctor_Star.strongStar(Data_Const.functorConst)))(makeUpgradedState($131));
  };
  var burstFromUpgrades = function ($132) {
      return Data_Lens_Getter.view(Lenses.burst(Data_Profunctor_Star.strongStar(Data_Const.functorConst)))(makeUpgradedState($132));
  };
  exports["burstFromUpgrades"] = burstFromUpgrades;
  exports["cpsFromUpgrades"] = cpsFromUpgrades;
  exports["inflectionUpgradeMessage"] = inflectionUpgradeMessage;
  exports["isInflectionUpgrade"] = isInflectionUpgrade;
  exports["buyUpgrade"] = buyUpgrade;
  exports["upgradeDescription"] = upgradeDescription;
  exports["canBuyUpgrade"] = canBuyUpgrade;
  exports["nextUpgrade"] = nextUpgrade;
  exports["upgradeName"] = upgradeName;
  exports["upgradeCost"] = upgradeCost;;
 
})(PS["Upgrades"] = PS["Upgrades"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var $$Math = PS["Math"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Array = PS["Data.Array"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Either = PS["Data.Either"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Data_Foreign_Lens = PS["Data.Foreign.Lens"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Date = PS["Data.Date"];
  var Data_Time = PS["Data.Time"];
  var Util = PS["Util"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Upgrades = PS["Upgrades"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var storageKeys = Prelude.map(Prelude.functorArray)(Util.scramble)([ "totalClicks", "currentClicks", "age", "upgrades", "now" ]);
  var stateValueMaker = function ($$default) {
      return function (parser) {
          return function (key) {
              return function (arr) {
                  return Data_Maybe.maybe($$default(Types.initialState))(parser)(Data_Tuple.lookup(Data_Foldable.foldableArray)(Prelude.eqString)(Util.scramble(key))(arr));
              };
          };
      };
  };
  var stateTuples = function (state) {
      var makeTuple = function (dictSerialize) {
          return function (key) {
              return function ($23) {
                  return Data_Bifunctor.bimap(Data_Tuple.bifunctorTuple)(Util.scramble)(function ($24) {
                      return Util.scramble(Types.serialize(dictSerialize)($24));
                  })(Data_Tuple.Tuple.create(key)($23));
              };
          };
      };
      return [ makeTuple(Types.serializeClicks)("currentClicks")(state.currentClicks), makeTuple(Types.serializeClicks)("totalClicks")(state.totalClicks), makeTuple(Types.serializeUpgrades)("upgrades")(state.upgrades), makeTuple(Types.serializeAge)("age")(state.age), makeTuple(Types.serializeMilliseconds)("now")(state.now) ];
  };
  var saveSingleState = Data_Tuple.uncurry(Browser_WebStorage.setItem(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage));
  var saveState = function ($25) {
      return Data_Foldable.traverse_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)(saveSingleState)(stateTuples($25));
  };
  var parseUpgrades = (function () {
      var ups = function (dictContravariant) {
          return function (dictApplicative) {
              return Data_Foreign_Lens.getter(Data_Foreign_Class.read(Types.isForeignUpgrades))(dictContravariant)(dictApplicative);
          };
      };
      return function ($26) {
          return Data_Maybe.maybe(Types.initialState.upgrades)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (dictContravariant) {
              return function (dictApplicative) {
                  return function ($27) {
                      return Data_Foreign_Lens.json(dictContravariant)(dictApplicative)(ups(dictContravariant)(dictApplicative)($27));
                  };
              };
          })(Util.unscramble($26)));
      };
  })();
  var parseAge = (function () {
      var age = function (v) {
          if (v === "Stone") {
              return new Data_Either.Right(Types.Stone.value);
          };
          if (v === "Bronze") {
              return new Data_Either.Right(Types.Bronze.value);
          };
          if (v === "Iron") {
              return new Data_Either.Right(Types.Iron.value);
          };
          if (v === "Classical") {
              return new Data_Either.Right(Types.Classical.value);
          };
          if (v === "Dark") {
              return new Data_Either.Right(Types.Dark.value);
          };
          if (v === "Medieval") {
              return new Data_Either.Right(Types.Medieval.value);
          };
          if (v === "Renaissance") {
              return new Data_Either.Right(Types.Renaissance.value);
          };
          if (v === "Imperial") {
              return new Data_Either.Right(Types.Imperial.value);
          };
          if (v === "Industrial") {
              return new Data_Either.Right(Types.Industrial.value);
          };
          if (v === "Nuclear") {
              return new Data_Either.Right(Types.Nuclear.value);
          };
          if (v === "Information") {
              return new Data_Either.Right(Types.Information.value);
          };
          if (v === "Global") {
              return new Data_Either.Right(Types.Global.value);
          };
          if (v === "Space") {
              return new Data_Either.Right(Types.Space.value);
          };
          if (v === "Solar") {
              return new Data_Either.Right(Types.Solar.value);
          };
          return new Data_Either.Left(Prelude.unit);
      };
      return function ($28) {
          return Data_Maybe.maybe(Types.initialState.age)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (dictContravariant) {
              return function (dictApplicative) {
                  return Data_Foreign_Lens.getter(age)(dictContravariant)(dictApplicative);
              };
          })(Util.unscramble($28)));
      };
  })();
  var getNumber = function ($$default) {
      return function ($29) {
          return Data_Maybe.maybe($$default)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (dictContravariant) {
              return function (dictApplicative) {
                  return function ($30) {
                      return Data_Foreign_Lens.json(dictContravariant)(dictApplicative)(Data_Foreign_Lens.number(dictContravariant)(dictApplicative)($30));
                  };
              };
          })(Util.unscramble($29)));
      };
  };
  var parseCurrentClicks = function ($31) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.currentClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))($31));
  };
  var parseNow = function ($32) {
      return Data_Time.Milliseconds(getNumber(0)($32));
  };
  var parseTotalClicks = function ($33) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.totalClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))($33));
  };
  var calculateTimeDifferential = function (delta) {
      return function (v) {
          var clickDebt = v * $$Math.abs(Util.secondsMS(delta));
          var f = function (t) {
              if (Util.minutesMS(t) < 5.0) {
                  return clickDebt;
              };
              if (Util.hoursMS(t) < 1.0) {
                  return clickDebt * 0.9;
              };
              if (Util.hoursMS(t) < 12.0) {
                  return clickDebt * 0.75;
              };
              if (Util.daysMS(t) < 1.0) {
                  return clickDebt * 0.6;
              };
              if (Prelude.otherwise) {
                  return clickDebt * 0.5;
              };
              throw new Error("Failed pattern match at Save line 126, column 1 - line 127, column 1: " + [ t.constructor.name ]);
          };
          return f(delta);
      };
  };
  var getSavedState = function __do() {
      var v = Prelude["<$>"](Control_Monad_Eff.functorEff)(function ($34) {
          return Data_Array.zip(storageKeys)(Data_Array.catMaybes($34));
      })(Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Prelude["<$>"](Prelude.functorArray)(Browser_WebStorage.getItem(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage))(storageKeys)))();
      var v1 = Data_Date.nowEpochMilliseconds();
      var _upgrades = stateValueMaker(Data_Lens_Getter.view(Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(parseUpgrades)("upgrades")(v);
      var _totalClicks = stateValueMaker(function (v2) {
          return v2.totalClicks;
      })(parseTotalClicks)("totalClicks")(v);
      var _now = stateValueMaker(function (v2) {
          return v2.now;
      })(parseNow)("now")(v);
      var _currentClicks = stateValueMaker(function (v2) {
          return v2.currentClicks;
      })(parseCurrentClicks)("currentClicks")(v);
      var _cps = Upgrades.cpsFromUpgrades(_upgrades);
      var _cc = calculateTimeDifferential(Prelude["-"](Data_Time.ringMilliseconds)(_now)(v1))(_cps);
      var _burst = Upgrades.burstFromUpgrades(_upgrades);
      var _age = stateValueMaker(function (v2) {
          return v2.age;
      })(parseAge)("age")(v);
      return {
          currentClicks: Prelude["+"](Types.semiringClicks)(_currentClicks)(_cc), 
          totalClicks: Prelude["+"](Types.semiringClicks)(_totalClicks)(_cc), 
          upgrades: _upgrades, 
          age: _age, 
          message: Types.welcomeMessage, 
          cps: _cps, 
          burst: _burst, 
          now: v1
      };
  };
  exports["calculateTimeDifferential"] = calculateTimeDifferential;
  exports["saveState"] = saveState;
  exports["getSavedState"] = getSavedState;;
 
})(PS["Save"] = PS["Save"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];     
  var resetState = function (v) {
      return Types.initialState;
  };
  var resetSave = Browser_WebStorage.clear(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage);
  exports["resetSave"] = resetSave;
  exports["resetState"] = resetState;;
 
})(PS["Reset"] = PS["Reset"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var $$Math = PS["Math"];
  var Lenses = PS["Lenses"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Int = PS["Data.Int"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var sumUpgrades = function (u) {
      var g = function (acc) {
          return function (uplens) {
              return acc + Data_Lens_Getter["^."](u)(function ($0) {
                  return uplens(Lenses.viewLevel($0));
              }) | 0;
          };
      };
      var $$int = Data_Foldable.foldl(Data_Foldable.foldableArray)(g)(0)([ Lenses.misc1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.misc2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.tech1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.tech2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.phil1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.phil2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.poli1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.poli2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.science1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.science2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)) ]);
      return Data_Int.toNumber($$int);
  };
  var population = function (state) {
      var c = sumUpgrades(state.upgrades);
      var a = $$Math.log($$Math.log(1.0 + Data_Lens_Getter["^."](state)(Lenses.totalClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst)))) + 1.0);
      return 2.0 * a + c + 2.0;
  };
  exports["population"] = population;;
 
})(PS["Population"] = PS["Population"] || {});
(function(exports) {
  // Generated by psc version 0.8.0.0
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Save = PS["Save"];
  var Upgrades = PS["Upgrades"];
  var Reset = PS["Reset"];
  var Disaster = PS["Disaster"];
  var Age = PS["Age"];
  var Util = PS["Util"];
  var Population = PS["Population"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_String = PS["Data.String"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Date = PS["Data.Date"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Class = PS["Control.Monad.Eff.Class"];
  var Control_Monad_Eff_Exception = PS["Control.Monad.Eff.Exception"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Halogen = PS["Halogen"];
  var Halogen_Util = PS["Halogen.Util"];
  var Halogen_HTML_Indexed = PS["Halogen.HTML.Indexed"];
  var Halogen_HTML_Events_Indexed = PS["Halogen.HTML.Events.Indexed"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];
  var Halogen_HTML_Events = PS["Halogen.HTML.Events"];
  var Halogen_HTML_Elements_Indexed = PS["Halogen.HTML.Elements.Indexed"];
  var Halogen_HTML = PS["Halogen.HTML"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Halogen_Query = PS["Halogen.Query"];
  var Data_Lens_Setter = PS["Data.Lens.Setter"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Time = PS["Data.Time"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_Driver = PS["Halogen.Driver"];     
  var upgradeProps = function (uplens) {
      return function (state) {
          var hoverText = function (state1) {
              return function (uplens1) {
                  return [ Halogen_HTML_Properties_Indexed.title(Upgrades.upgradeDescription(Data_Lens_Getter["^."](state1)(function ($43) {
                      return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens1($43));
                  }))(state1.age)) ];
              };
          };
          var clickAction = Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Buy.create(Upgrades.nextUpgrade(Data_Lens_Getter["^."](state)(function ($44) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))($44));
          })))));
          return Prelude["++"](Prelude.semigroupArray)(hoverText(state)(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))((function () {
              var $22 = Upgrades.canBuyUpgrade(state)(function (dictStrong) {
                  return uplens(dictStrong);
              });
              if ($22) {
                  return [ clickAction, Util.mkClass("upgrade") ];
              };
              if (!$22) {
                  return [ Util.mkClass("upgrade disabled") ];
              };
              throw new Error("Failed pattern match at Main line 160, column 1 - line 161, column 1: " + [ $22.constructor.name ]);
          })());
      };
  };
  var upgradeButton = function (uplens) {
      return function (state) {
          return Halogen_HTML_Elements_Indexed.div(upgradeProps(function (dictStrong) {
              return uplens(dictStrong);
          })(state))([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("name") ])([ Halogen_HTML.text(Upgrades.upgradeName(Data_Lens_Getter["^."](state)(function ($45) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))($45));
          }))(state.age)), Halogen_HTML_Elements_Indexed.span([ Util.mkClass("level") ])([ Halogen_HTML.text(" " + Prelude.show(Prelude.showInt)(Data_Lens_Getter["^."](state)(function ($46) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel($46)));
          }))) ]) ]), Halogen_HTML_Elements_Indexed.div([ Util.mkClass("cost") ])([ Halogen_HTML.text(Types.prettify(Types.prettyClicks)(Upgrades.upgradeCost(Upgrades.nextUpgrade(Data_Lens_Getter["^."](state)(function ($47) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(uplens(Data_Profunctor_Star.strongStar(Data_Const.functorConst))($47));
          }))))) ]) ]);
      };
  };
  var upgradesComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Util.mkClass("upgrades") ])([ upgradeButton(function (dictStrong) {
          return Lenses.misc1(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.misc2(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.tech1(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.tech2(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.phil1(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.phil2(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.poli1(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.poli2(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.science1(dictStrong);
      })(state), upgradeButton(function (dictStrong) {
          return Lenses.science2(dictStrong);
      })(state) ]) ]);
  };
  var render = function (state) {
      var top = Halogen_HTML_Elements_Indexed.h1([ Halogen_HTML_Properties_Indexed.id_("title") ])([ Halogen_HTML.text("clicker builder: the "), Halogen_HTML_Elements_Indexed.span([ Util.mkClass(Prelude.show(Types.ageShow)(state.age)) ])([ Halogen_HTML.text(Prelude.show(Types.ageShow)(state.age)) ]), Halogen_HTML.text(" Age.") ]);
      var side = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("side") ])([ Halogen_HTML_Elements.div_([ Halogen_HTML.text("Current clicks:"), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Util.mkClass("current-clicks bold") ])([ Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.currentClicks)) ]), Halogen_HTML_Elements.br_, Halogen_HTML.text("Total clicks:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.totalClicks)), Halogen_HTML_Elements.br_, Halogen_HTML.text("My click power:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.burst)), Halogen_HTML_Elements.br_, Halogen_HTML.text("Tribal click power:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicksPerSecond)(state.cps)), Halogen_HTML_Elements.br_, Halogen_HTML.text("Population:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyPopulation)(Population.population(state))) ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("clicker-wrapper") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Click.create)), Halogen_HTML_Properties_Indexed.id_("the-button") ])([ Halogen_HTML_Elements_Indexed.a([ Halogen_HTML_Properties_Indexed.href("#") ])([ Halogen_HTML_Elements_Indexed.i([ Util.mkClass("fa fa-hand-pointer-o") ])([  ]) ]) ]) ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Save.create)), Util.mkClass("button") ])([ Halogen_HTML.text("Save") ]), Halogen_HTML.text(" | "), Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Reset.create)), Util.mkClass("button") ])([ Halogen_HTML.text("Reset") ]) ]);
      var main$prime = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("main") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("upgrades") ])([ Halogen_HTML_Elements_Indexed.h3([ Util.mkClass("title") ])([ Halogen_HTML.text("Upgrades") ]), upgradesComponent(state) ]), (function () {
          var $23 = Data_String["null"](state.message);
          if ($23) {
              return Halogen_HTML_Elements.div_([  ]);
          };
          if (!$23) {
              return Halogen_HTML_Elements_Indexed.div([ Util.mkClass("fade messages") ])([ Halogen_HTML.text(state.message) ]);
          };
          throw new Error("Failed pattern match at Main line 40, column 1 - line 41, column 1: " + [ $23.constructor.name ]);
      })() ]);
      var bottom = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("bottom") ])([ Halogen_HTML_Elements.h3_([ Halogen_HTML.text("About") ]), Util.renderParagraphs(Age.ageDescription(state.age)), Halogen_HTML_Elements.h3_([ Halogen_HTML.text("Changelog") ]), Halogen_HTML_Elements.p_([ Halogen_HTML.text("First beta!") ]), Halogen_HTML_Elements.h3_([ Halogen_HTML.text("Upcoming") ]), Halogen_HTML_Elements.p_([ Halogen_HTML.text("Bronze Age, population, disasters") ]), Halogen_HTML_Elements.h3_([ Halogen_HTML.text("Credits") ]), Util.renderParagraphs([ "Font: Silkscreen by Jason Kottke.", "Icons: fontawesome by Dave Gandy.", "Ideas and feedback: Himrin." ]) ]);
      return Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("body"), Util.mkClass(Prelude.show(Types.ageShow)(state.age)) ])([ Halogen_HTML_Elements_Indexed.a([ Halogen_HTML_Properties_Indexed.href("https://github.com/thimoteus/clicker-builder"), Halogen_HTML_Properties_Indexed.id_("fork-me") ])([ Halogen_HTML_Elements_Indexed.img([ Halogen_HTML_Properties_Indexed.src("https://camo.githubusercontent.com/365986a132ccd6a44c23a9169022c0b5c890c387/68747470733a2f2f73332e616d617a6f6e6177732e636f6d2f6769746875622f726962626f6e732f666f726b6d655f72696768745f7265645f6161303030302e706e67"), Halogen_HTML_Properties_Indexed.alt("Fork me on Github") ]) ]), Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("container") ])([ top, side, main$prime, bottom ]) ]);
  };
  var $$eval = function (v) {
      if (v instanceof Types.Click) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value0)(Halogen_Query.modify(function (state) {
              return Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.currentClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.burstNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.totalClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.burstNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(state));
          }));
      };
      if (v instanceof Types.Autoclick) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.gets(function (v1) {
              return v1.now;
          }))(function (v1) {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.gets(function (v2) {
                  return v2.cps;
              }))(function (v2) {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Data_Date.nowEpochMilliseconds))(function (v3) {
                      var delta = Prelude["-"](Data_Time.ringMilliseconds)(v3)(v1);
                      var summand = Save.calculateTimeDifferential(delta)(v2);
                      return Halogen_Query.modify(function ($48) {
                          return Data_Lens_Setter["+~"](Types.semiringClicks)(Lenses.currentClicks(Data_Profunctor_Strong.strongFn))(summand)(Data_Lens_Setter["+~"](Types.semiringClicks)(Lenses.totalClicks(Data_Profunctor_Strong.strongFn))(summand)(Data_Lens_Setter[".~"](Lenses.now(Data_Profunctor_Strong.strongFn))(v3)($48)));
                      });
                  });
              });
          }));
      };
      if (v instanceof Types.Reset) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Reset.resetState))(function () {
              return Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Reset.resetSave);
          }));
      };
      if (v instanceof Types.Save) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.get)(function (v1) {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("")))(function () {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftAff'"](Control_Monad_Aff_Class.monadAffAff)(Control_Monad_Aff.later(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))))(function () {
                      return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Save.saveState(v1)))(function () {
                          return Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("Game saved"));
                      });
                  });
              });
          }));
      };
      if (v instanceof Types.Autosave) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value0)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.get)(function (v1) {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Control_Monad_Eff_Console.log("Autosaving game ... ")))(function () {
                  return Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Save.saveState(v1));
              });
          }));
      };
      if (v instanceof Types.Buy) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value1)(Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("")))(function () {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftAff'"](Control_Monad_Aff_Class.monadAffAff)(Control_Monad_Aff.later(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))))(function () {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Upgrades.buyUpgrade(v.value0)))(function () {
                      var $35 = Upgrades.isInflectionUpgrade(v.value0);
                      if ($35) {
                          return Halogen_Query.modify(function (state) {
                              return Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))(Upgrades.inflectionUpgradeMessage(v.value0)(state.age))(state);
                          });
                      };
                      if (!$35) {
                          return Halogen_Query.modify(function (state) {
                              return Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("Upgraded " + Upgrades.upgradeName(v.value0)(state.age))(state);
                          });
                      };
                      throw new Error("Failed pattern match at Main line 171, column 1 - line 172, column 1: " + [ $35.constructor.name ]);
                  });
              });
          }));
      };
      if (v instanceof Types.Suffer) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value1)(Halogen_Query.modify(Disaster.suffer(v.value0)));
      };
      if (v instanceof Types.Unmessage) {
          return Data_Functor["<$"](Control_Monad_Free.freeFunctor)(v.value0)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("")));
      };
      throw new Error("Failed pattern match at Main line 171, column 1 - line 172, column 1: " + [ v.constructor.name ]);
  };
  var $$interface = Halogen_Component.component(render)($$eval);
  var main = Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Prelude["const"](Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit)))(Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(Save.getSavedState))(function (v) {
      return Prelude.bind(Control_Monad_Aff.bindAff)(Halogen_Driver.runUI($$interface)(v))(function (v1) {
          return Prelude.bind(Control_Monad_Aff.bindAff)(Halogen_Util.onLoad(Control_Monad_Aff.monadEffAff)(Halogen_Util.appendToBody(Control_Monad_Eff_Class.monadEffEff)(v1.node)))(function () {
              return Util.schedule([ Data_Tuple.Tuple.create(100)(v1.driver(Halogen_Query.action(Types.Autoclick.create))), Data_Tuple.Tuple.create(15000)(v1.driver(Halogen_Query.action(Types.Autosave.create))) ]);
          });
      });
  }));
  exports["main"] = main;
  exports["eval"] = $$eval;
  exports["upgradeProps"] = upgradeProps;
  exports["upgradeButton"] = upgradeButton;
  exports["upgradesComponent"] = upgradesComponent;
  exports["render"] = render;
  exports["interface"] = $$interface;;
 
})(PS["Main"] = PS["Main"] || {});

PS["Main"].main();

}).call(this,require("buffer").Buffer)
},{"buffer":3,"virtual-dom/create-element":8,"virtual-dom/diff":9,"virtual-dom/patch":10,"virtual-dom/virtual-hyperscript/hooks/soft-set-hook":17,"virtual-dom/vnode/vnode":25,"virtual-dom/vnode/vtext":27}]},{},[31]);
