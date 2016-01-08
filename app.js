(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
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
},{"min-document":1}],3:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],4:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":8}],5:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":25}],6:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":11}],7:[function(require,module,exports){
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

},{"../vnode/is-vhook.js":16,"is-object":3}],8:[function(require,module,exports){
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

},{"../vnode/handle-thunk.js":14,"../vnode/is-vnode.js":17,"../vnode/is-vtext.js":18,"../vnode/is-widget.js":19,"./apply-properties":7,"global/document":2}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"../vnode/is-widget.js":19,"../vnode/vpatch.js":22,"./apply-properties":7,"./update-widget":12}],11:[function(require,module,exports){
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

},{"./create-element":8,"./dom-index":9,"./patch-op":10,"global/document":2,"x-is-array":26}],12:[function(require,module,exports){
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

},{"../vnode/is-widget.js":19}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{"./is-thunk":15,"./is-vnode":17,"./is-vtext":18,"./is-widget":19}],15:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],16:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],17:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":20}],18:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":20}],19:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],20:[function(require,module,exports){
module.exports = "2"

},{}],21:[function(require,module,exports){
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

},{"./is-thunk":15,"./is-vhook":16,"./is-vnode":17,"./is-widget":19,"./version":20}],22:[function(require,module,exports){
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

},{"./version":20}],23:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":20}],24:[function(require,module,exports){
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

},{"../vnode/is-vhook":16,"is-object":3}],25:[function(require,module,exports){
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

},{"../vnode/handle-thunk":14,"../vnode/is-thunk":15,"../vnode/is-vnode":17,"../vnode/is-vtext":18,"../vnode/is-widget":19,"../vnode/vpatch":22,"./diff-props":24,"x-is-array":26}],26:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],27:[function(require,module,exports){
// Generated by psc-bundle 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var $$return = function (__dict_Applicative_2) {
      return pure(__dict_Applicative_2);
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
  var $less$dollar$greater = function (__dict_Functor_5) {
      return map(__dict_Functor_5);
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
  var eqChar = new Eq($foreign.refEq);
  var eq = function (dict) {
      return dict.eq;
  };
  var $eq$eq = function (__dict_Eq_7) {
      return eq(__dict_Eq_7);
  };
  var disj = function (dict) {
      return dict.disj;
  };
  var $$const = function (a) {
      return function (_3) {
          return a;
      };
  };
  var $$void = function (__dict_Functor_12) {
      return function (fa) {
          return $less$dollar$greater(__dict_Functor_12)($$const(unit))(fa);
      };
  };
  var conj = function (dict) {
      return dict.conj;
  };
  var compose = function (dict) {
      return dict.compose;
  };
  var $greater$greater$greater = function (__dict_Semigroupoid_15) {
      return flip(compose(__dict_Semigroupoid_15));
  };
  var compare = function (dict) {
      return dict.compare;
  };
  var $less = function (__dict_Ord_17) {
      return function (a1) {
          return function (a2) {
              var _47 = compare(__dict_Ord_17)(a1)(a2);
              if (_47 instanceof LT) {
                  return true;
              };
              return false;
          };
      };
  };
  var $less$eq = function (__dict_Ord_18) {
      return function (a1) {
          return function (a2) {
              var _48 = compare(__dict_Ord_18)(a1)(a2);
              if (_48 instanceof GT) {
                  return false;
              };
              return true;
          };
      };
  };
  var $greater$eq = function (__dict_Ord_20) {
      return function (a1) {
          return function (a2) {
              var _50 = compare(__dict_Ord_20)(a1)(a2);
              if (_50 instanceof LT) {
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
  var $div$eq = function (__dict_Eq_9) {
      return function (x) {
          return function (y) {
              return not(booleanAlgebraBoolean)($eq$eq(__dict_Eq_9)(x)(y));
          };
      };
  };
  var bind = function (dict) {
      return dict.bind;
  };
  var liftM1 = function (__dict_Monad_23) {
      return function (f) {
          return function (a) {
              return bind(__dict_Monad_23["__superclass_Prelude.Bind_1"]())(a)(function (_0) {
                  return $$return(__dict_Monad_23["__superclass_Prelude.Applicative_0"]())(f(_0));
              });
          };
      };
  };
  var $greater$greater$eq = function (__dict_Bind_24) {
      return bind(__dict_Bind_24);
  }; 
  var apply = function (dict) {
      return dict.apply;
  };
  var $less$times$greater = function (__dict_Apply_25) {
      return apply(__dict_Apply_25);
  };
  var liftA1 = function (__dict_Applicative_26) {
      return function (f) {
          return function (a) {
              return $less$times$greater(__dict_Applicative_26["__superclass_Prelude.Apply_0"]())(pure(__dict_Applicative_26)(f))(a);
          };
      };
  }; 
  var append = function (dict) {
      return dict.append;
  };
  var $plus$plus = function (__dict_Semigroup_27) {
      return append(__dict_Semigroup_27);
  };
  var $less$greater = function (__dict_Semigroup_28) {
      return append(__dict_Semigroup_28);
  };
  var ap = function (__dict_Monad_30) {
      return function (f) {
          return function (a) {
              return bind(__dict_Monad_30["__superclass_Prelude.Bind_1"]())(f)(function (_2) {
                  return bind(__dict_Monad_30["__superclass_Prelude.Bind_1"]())(a)(function (_1) {
                      return $$return(__dict_Monad_30["__superclass_Prelude.Applicative_0"]())(_2(_1));
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
  exports["/="] = $div$eq;
  exports["=="] = $eq$eq;
  exports["eq"] = eq;
  exports["sub"] = sub;
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
  exports[">>>"] = $greater$greater$greater;
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
  exports["eqChar"] = eqChar;
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Console"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["log"] = $foreign.log;;
 
})(PS["Control.Monad.Eff.Console"] = PS["Control.Monad.Eff.Console"] || {});
(function(exports) {
  /* global exports */
  "use strict";

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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var $times$greater = function (__dict_Apply_1) {
      return function (a) {
          return function (b) {
              return Prelude["<*>"](__dict_Apply_1)(Prelude["<$>"](__dict_Apply_1["__superclass_Prelude.Functor_0"]())(Prelude["const"](Prelude.id(Prelude.categoryFn)))(a))(b);
          };
      };
  };
  exports["*>"] = $times$greater;;
 
})(PS["Control.Apply"] = PS["Control.Apply"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var maybe = function (b) {
      return function (f) {
          return function (_0) {
              if (_0 instanceof Nothing) {
                  return b;
              };
              if (_0 instanceof Just) {
                  return f(_0.value0);
              };
              throw new Error("Failed pattern match at Data.Maybe line 26, column 1 - line 27, column 1: " + [ b.constructor.name, f.constructor.name, _0.constructor.name ]);
          };
      };
  };                                                
  var functorMaybe = new Prelude.Functor(function (fn) {
      return function (_2) {
          if (_2 instanceof Just) {
              return new Just(fn(_2.value0));
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
  // Generated by psc version 0.7.6.1
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
  var semigroupFirst = new Prelude.Semigroup(function (_11) {
      return function (second) {
          if (_11 instanceof Data_Maybe.Just) {
              return _11;
          };
          return second;
      };
  });
  var runFirst = function (_0) {
      return _0;
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Data_Monoid = PS["Data.Monoid"];     
  var Disj = function (x) {
      return x;
  };
  var semigroupDisj = function (__dict_BooleanAlgebra_2) {
      return new Prelude.Semigroup(function (_10) {
          return function (_11) {
              return Prelude.disj(__dict_BooleanAlgebra_2)(_10)(_11);
          };
      });
  };
  var runDisj = function (_0) {
      return _0;
  };
  var monoidDisj = function (__dict_BooleanAlgebra_4) {
      return new Data_Monoid.Monoid(function () {
          return semigroupDisj(__dict_BooleanAlgebra_4);
      }, Prelude.bottom(__dict_BooleanAlgebra_4["__superclass_Prelude.Bounded_0"]()));
  };
  exports["Disj"] = Disj;
  exports["runDisj"] = runDisj;
  exports["semigroupDisj"] = semigroupDisj;
  exports["monoidDisj"] = monoidDisj;;
 
})(PS["Data.Monoid.Disj"] = PS["Data.Monoid.Disj"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var traverse_ = function (__dict_Applicative_0) {
      return function (__dict_Foldable_1) {
          return function (f) {
              return foldr(__dict_Foldable_1)(function (_109) {
                  return Control_Apply["*>"](__dict_Applicative_0["__superclass_Prelude.Apply_0"]())(f(_109));
              })(Prelude.pure(__dict_Applicative_0)(Prelude.unit));
          };
      };
  };
  var for_ = function (__dict_Applicative_2) {
      return function (__dict_Foldable_3) {
          return Prelude.flip(traverse_(__dict_Applicative_2)(__dict_Foldable_3));
      };
  };
  var foldl = function (dict) {
      return dict.foldl;
  }; 
  var foldMapDefaultR = function (__dict_Foldable_26) {
      return function (__dict_Monoid_27) {
          return function (f) {
              return function (xs) {
                  return foldr(__dict_Foldable_26)(function (x) {
                      return function (acc) {
                          return Prelude["<>"](__dict_Monoid_27["__superclass_Prelude.Semigroup_0"]())(f(x))(acc);
                      };
                  })(Data_Monoid.mempty(__dict_Monoid_27))(xs);
              };
          };
      };
  };
  var foldableArray = new Foldable(function (__dict_Monoid_28) {
      return foldMapDefaultR(foldableArray)(__dict_Monoid_28);
  }, $foreign.foldlArray, $foreign.foldrArray);
  var foldMap = function (dict) {
      return dict.foldMap;
  };
  var any = function (__dict_Foldable_38) {
      return function (__dict_BooleanAlgebra_39) {
          return function (p) {
              return function (_112) {
                  return Data_Monoid_Disj.runDisj(foldMap(__dict_Foldable_38)(Data_Monoid_Disj.monoidDisj(__dict_BooleanAlgebra_39))(function (_113) {
                      return Data_Monoid_Disj.Disj(p(_113));
                  })(_112));
              };
          };
      };
  };
  var elem = function (__dict_Foldable_40) {
      return function (__dict_Eq_41) {
          return function (_114) {
              return any(__dict_Foldable_40)(Prelude.booleanAlgebraBoolean)(Prelude["=="](__dict_Eq_41)(_114));
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
  // Generated by psc version 0.7.6.1
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
  var sequenceDefault = function (__dict_Traversable_12) {
      return function (__dict_Applicative_13) {
          return function (tma) {
              return traverse(__dict_Traversable_12)(__dict_Applicative_13)(Prelude.id(Prelude.categoryFn))(tma);
          };
      };
  };
  var traversableArray = new Traversable(function () {
      return Data_Foldable.foldableArray;
  }, function () {
      return Prelude.functorArray;
  }, function (__dict_Applicative_15) {
      return sequenceDefault(traversableArray)(__dict_Applicative_15);
  }, function (__dict_Applicative_14) {
      return $foreign.traverseArrayImpl(Prelude.apply(__dict_Applicative_14["__superclass_Prelude.Apply_0"]()))(Prelude.map((__dict_Applicative_14["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]()))(Prelude.pure(__dict_Applicative_14));
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var Bifunctor = function (bimap) {
      this.bimap = bimap;
  };
  var bimap = function (dict) {
      return dict.bimap;
  };
  var rmap = function (__dict_Bifunctor_1) {
      return bimap(__dict_Bifunctor_1)(Prelude.id(Prelude.categoryFn));
  };
  exports["Bifunctor"] = Bifunctor;
  exports["rmap"] = rmap;
  exports["bimap"] = bimap;;
 
})(PS["Data.Bifunctor"] = PS["Data.Bifunctor"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
      return function (_5) {
          return f(_5.value0)(_5.value1);
      };
  };
  var lookup = function (__dict_Foldable_19) {
      return function (__dict_Eq_20) {
          return function (a) {
              return function (f) {
                  return Data_Maybe_First.runFirst(Data_Foldable.foldMap(__dict_Foldable_19)(Data_Maybe_First.monoidFirst)(function (_2) {
                      var _105 = Prelude["=="](__dict_Eq_20)(a)(_2.value0);
                      if (_105) {
                          return new Data_Maybe.Just(_2.value1);
                      };
                      if (!_105) {
                          return Data_Maybe.Nothing.value;
                      };
                      throw new Error("Failed pattern match at Data.Tuple line 173, column 1 - line 174, column 1: " + [ _105.constructor.name ]);
                  })(f));
              };
          };
      };
  };
  var functorTuple = new Prelude.Functor(function (f) {
      return function (_31) {
          return new Tuple(_31.value0, f(_31.value1));
      };
  });
  var bifunctorTuple = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (_32) {
              return new Tuple(f(_32.value0), g(_32.value1));
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Maybe.Unsafe"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];     
  var fromJust = function (_0) {
      if (_0 instanceof Data_Maybe.Just) {
          return _0.value0;
      };
      if (_0 instanceof Data_Maybe.Nothing) {
          return $foreign.unsafeThrow("Data.Maybe.Unsafe.fromJust called on Nothing");
      };
      throw new Error("Failed pattern match at Data.Maybe.Unsafe line 10, column 1 - line 11, column 1: " + [ _0.constructor.name ]);
  };
  exports["fromJust"] = fromJust;
  exports["unsafeThrow"] = $foreign.unsafeThrow;;
 
})(PS["Data.Maybe.Unsafe"] = PS["Data.Maybe.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var tail = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (_7) {
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
                  var _21 = uncons(xs);
                  if (_21 instanceof Data_Maybe.Just && p(_21.value0.head)) {
                      var __tco_acc = $colon(_21.value0.head)(acc);
                      acc = __tco_acc;
                      xs = _21.value0.tail;
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
      return function (_6) {
          return new Data_Maybe.Just(x);
      };
  });
  var concatMap = Prelude.flip(Prelude.bind(Prelude.bindArray));
  var mapMaybe = function (f) {
      return concatMap(function (_48) {
          return Data_Maybe.maybe([  ])(singleton)(f(_48));
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
  exports["length"] = $foreign.length;;
 
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var functorEither = new Prelude.Functor(function (f) {
      return function (_2) {
          if (_2 instanceof Left) {
              return new Left(_2.value0);
          };
          if (_2 instanceof Right) {
              return new Right(f(_2.value0));
          };
          throw new Error("Failed pattern match at Data.Either line 52, column 1 - line 56, column 1: " + [ f.constructor.name, _2.constructor.name ]);
      };
  });
  var either = function (f) {
      return function (g) {
          return function (_1) {
              if (_1 instanceof Left) {
                  return f(_1.value0);
              };
              if (_1 instanceof Right) {
                  return g(_1.value0);
              };
              throw new Error("Failed pattern match at Data.Either line 28, column 1 - line 29, column 1: " + [ f.constructor.name, g.constructor.name, _1.constructor.name ]);
          };
      };
  };
  var bifunctorEither = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          return function (_3) {
              if (_3 instanceof Left) {
                  return new Left(f(_3.value0));
              };
              if (_3 instanceof Right) {
                  return new Right(g(_3.value0));
              };
              throw new Error("Failed pattern match at Data.Either line 56, column 1 - line 92, column 1: " + [ f.constructor.name, g.constructor.name, _3.constructor.name ]);
          };
      };
  });
  var applyEither = new Prelude.Apply(function () {
      return functorEither;
  }, function (_4) {
      return function (r) {
          if (_4 instanceof Left) {
              return new Left(_4.value0);
          };
          if (_4 instanceof Right) {
              return Prelude["<$>"](functorEither)(_4.value0)(r);
          };
          throw new Error("Failed pattern match at Data.Either line 92, column 1 - line 116, column 1: " + [ _4.constructor.name, r.constructor.name ]);
      };
  });
  var bindEither = new Prelude.Bind(function () {
      return applyEither;
  }, either(function (e) {
      return function (_0) {
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
  // Generated by psc version 0.7.6.1
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

  exports.log = Math.log;

  exports.pow = function (n) {
    return function (p) {
      return Math.pow(n, p);
    };
  };                         
 
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Math"];
  exports["pow"] = $foreign.pow;
  exports["log"] = $foreign.log;;
 
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Char"];
  var Prelude = PS["Prelude"];
  exports["toCharCode"] = $foreign.toCharCode;
  exports["fromCharCode"] = $foreign.fromCharCode;;
 
})(PS["Data.Char"] = PS["Data.Char"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
          if (Prelude["=="](Prelude.eqString)($foreign.tagOf(value))(tag)) {
              return Prelude.pure(Data_Either.applicativeEither)($foreign.unsafeFromForeign(value));
          };
          return new Data_Either.Left(new TypeMismatch(tag, $foreign.tagOf(value)));
      };
  };                                          
  var readNumber = unsafeReadTagged("Number");
  var readInt = function (value) {
      var error = Data_Either.Left.create(new TypeMismatch("Int", $foreign.tagOf(value)));
      var fromNumber = function (_30) {
          return Data_Maybe.maybe(error)(Prelude.pure(Data_Either.applicativeEither))(Data_Int.fromNumber(_30));
      };
      return Data_Either.either(Prelude["const"](error))(fromNumber)(readNumber(value));
  };
  var parseJSON = function (json) {
      return $foreign.parseJSONImpl(function (_32) {
          return Data_Either.Left.create(JSONError.create(_32));
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
  // Generated by psc version 0.7.6.1
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
  var $bang = function (__dict_Index_0) {
      return ix(__dict_Index_0);
  };                         
  var hasPropertyImpl = function (p) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("object") || Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("function")) {
              return $foreign.unsafeHasProperty(p, value);
          };
          return false;
      };
  };
  var hasProperty = function (dict) {
      return dict.hasProperty;
  };
  var hasOwnPropertyImpl = function (p) {
      return function (value) {
          if (Data_Foreign.isNull(value)) {
              return false;
          };
          if (Data_Foreign.isUndefined(value)) {
              return false;
          };
          if (Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("object") || Prelude["=="](Prelude.eqString)(Data_Foreign.typeOf(value))("function")) {
              return $foreign.unsafeHasOwnProperty(p, value);
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
  // Generated by psc version 0.7.6.1
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
  var readWith = function (__dict_IsForeign_1) {
      return function (f) {
          return function (value) {
              return Data_Either.either(function (_0) {
                  return Data_Either.Left.create(f(_0));
              })(Data_Either.Right.create)(read(__dict_IsForeign_1)(value));
          };
      };
  };
  var readProp = function (__dict_IsForeign_2) {
      return function (__dict_Index_3) {
          return function (prop) {
              return function (value) {
                  return Prelude[">>="](Data_Either.bindEither)(Data_Foreign_Index["!"](__dict_Index_3)(value)(prop))(readWith(__dict_IsForeign_2)(Data_Foreign_Index.errorAt(__dict_Index_3)(prop)));
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
  // Generated by psc version 0.7.6.1
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
  var storageLocalStorage = new Storage(function (_5) {
      return $foreign.unsafeClear($foreign.localStorage);
  }, function (_2) {
      return function (k) {
          return $foreign.unsafeGetItem(null2Maybe, $foreign.localStorage, k);
      };
  }, function (_1) {
      return function (n) {
          return $foreign.unsafeKey(null2Maybe, $foreign.localStorage, n);
      };
  }, function (_0) {
      return $foreign.unsafeLength($foreign.localStorage);
  }, function (_4) {
      return function (k) {
          return $foreign.unsafeRemoveItem($foreign.localStorage, k);
      };
  }, function (_3) {
      return function (k) {
          return function (v) {
              return $foreign.unsafeSetItem($foreign.localStorage, k, v);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Unsafe.Coerce"];
  exports["unsafeCoerce"] = $foreign.unsafeCoerce;;
 
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // module Text.Browser.Base64

  exports.encode64 = function (str) {
    return btoa(str);
  }

  exports.decode64 = function (code) {
    return atob(code);
  }
 
})(PS["Text.Browser.Base64"] = PS["Text.Browser.Base64"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Text.Browser.Base64"];
  exports["encode64"] = $foreign.encode64;
  exports["decode64"] = $foreign.decode64;;
 
})(PS["Text.Browser.Base64"] = PS["Text.Browser.Base64"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
          return function (__copy__41) {
              var acc = __copy_acc;
              var _41 = __copy__41;
              tco: while (true) {
                  var acc_1 = acc;
                  if (_41 instanceof Nil) {
                      return acc_1;
                  };
                  if (_41 instanceof Cons) {
                      var __tco_acc = new Cons(_41.value0, acc);
                      var __tco__41 = _41.value1;
                      acc = __tco_acc;
                      _41 = __tco__41;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.List line 365, column 1 - line 366, column 1: " + [ acc.constructor.name, _41.constructor.name ]);
              };
          };
      };
      return go(Nil.value);
  })();
  var foldableList = new Data_Foldable.Foldable(function (__dict_Monoid_16) {
      return function (f) {
          return Data_Foldable.foldl(foldableList)(function (acc) {
              return function (_319) {
                  return Prelude.append(__dict_Monoid_16["__superclass_Prelude.Semigroup_0"]())(acc)(f(_319));
              };
          })(Data_Monoid.mempty(__dict_Monoid_16));
      };
  }, (function () {
      var go = function (__copy_o) {
          return function (__copy_b) {
              return function (__copy__66) {
                  var o = __copy_o;
                  var b = __copy_b;
                  var _66 = __copy__66;
                  tco: while (true) {
                      var b_1 = b;
                      if (_66 instanceof Nil) {
                          return b_1;
                      };
                      if (_66 instanceof Cons) {
                          var __tco_o = o;
                          var __tco_b = o(b)(_66.value0);
                          var __tco__66 = _66.value1;
                          o = __tco_o;
                          b = __tco_b;
                          _66 = __tco__66;
                          continue tco;
                      };
                      throw new Error("Failed pattern match: " + [ o.constructor.name, b.constructor.name, _66.constructor.name ]);
                  };
              };
          };
      };
      return go;
  })(), function (o) {
      return function (b) {
          return function (_65) {
              if (_65 instanceof Nil) {
                  return b;
              };
              if (_65 instanceof Cons) {
                  return o(_65.value0)(Data_Foldable.foldr(foldableList)(o)(b)(_65.value1));
              };
              throw new Error("Failed pattern match: " + [ o.constructor.name, b.constructor.name, _65.constructor.name ]);
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Exception"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["throwException"] = $foreign.throwException;
  exports["error"] = $foreign.error;;
 
})(PS["Control.Monad.Eff.Exception"] = PS["Control.Monad.Eff.Exception"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var $less$dollar = function (__dict_Functor_0) {
      return function (x) {
          return function (f) {
              return Prelude["<$>"](__dict_Functor_0)(Prelude["const"](x))(f);
          };
      };
  };
  var $dollar$greater = function (__dict_Functor_1) {
      return function (f) {
          return function (x) {
              return Prelude["<$>"](__dict_Functor_1)(Prelude["const"](x))(f);
          };
      };
  };
  exports["$>"] = $dollar$greater;
  exports["<$"] = $less$dollar;;
 
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var runIdentity = function (_0) {
      return _0;
  };
  var functorIdentity = new Prelude.Functor(function (f) {
      return function (_23) {
          return f(_23);
      };
  });
  var applyIdentity = new Prelude.Apply(function () {
      return functorIdentity;
  }, function (_24) {
      return function (_25) {
          return _24(_25);
      };
  });
  var bindIdentity = new Prelude.Bind(function () {
      return applyIdentity;
  }, function (_26) {
      return function (f) {
          return f(_26);
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
  // Generated by psc version 0.7.6.1
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
  var forever = function (__dict_MonadRec_2) {
      return function (ma) {
          return tailRecM(__dict_MonadRec_2)(function (u) {
              return Data_Functor["<$"]((((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(new Data_Either.Left(u))(ma);
          })(Prelude.unit);
      };
  };
  exports["MonadRec"] = MonadRec;
  exports["forever"] = forever;
  exports["tailRecM"] = tailRecM;;
 
})(PS["Control.Monad.Rec.Class"] = PS["Control.Monad.Rec.Class"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
              return function (f_1) {
                  return function (a_1) {
                      return Prelude.bind(bindAff)(f_1(a_1))(function (_1) {
                          if (_1 instanceof Data_Either.Left) {
                              if (size < 100) {
                                  return go(size + 1 | 0)(f_1)(_1.value0);
                              };
                              if (Prelude.otherwise) {
                                  return later(Control_Monad_Rec_Class.tailRecM(monadRecAff)(f_1)(_1.value0));
                              };
                          };
                          if (_1 instanceof Data_Either.Right) {
                              return Prelude.pure(applicativeAff)(_1.value0);
                          };
                          throw new Error("Failed pattern match: " + [ _1.constructor.name ]);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Text_Browser_Base64 = PS["Text.Browser.Base64"];
  var $$Math = PS["Math"];
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
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];     
  var $up = $$Math.pow;
  var transformDigits = function (f) {
      return Prelude[">>>"](Prelude.semigroupoidFn)(Prelude.show(Prelude.showNumber))(Prelude[">>>"](Prelude.semigroupoidFn)(Data_String.toCharArray)(Prelude[">>>"](Prelude.semigroupoidFn)(f)(Data_String.fromCharArray)));
  };
  var sigFigs = function (n) {
      var arr = Data_String.toCharArray(Prelude.show(Prelude.showNumber)(n));
      var split = Data_Array.span(function (_0) {
          return Prelude["/="](Prelude.eqChar)(_0)(".");
      })(arr);
      return Data_Array.length(split.init);
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
          throw new Error("Failed pattern match at Util line 35, column 5 - line 36, column 5: " + [ c.constructor.name ]);
      };
      return function (_29) {
          return Data_String.fromCharArray(Prelude.map(Prelude.functorArray)(rotate)(Data_String.toCharArray(_29)));
      };
  })();
  var scramble = function (_30) {
      return rot13(Text_Browser_Base64.encode64(rot13(_30)));
  };
  var unscramble = function (_31) {
      return rot13(Text_Browser_Base64.decode64(rot13(_31)));
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
  var foldGCD = function (__dict_Foldable_0) {
      var foldGCD$prime = function (_6) {
          return function (y) {
              if (_6 instanceof Data_Maybe.Nothing) {
                  return new Data_Maybe.Just(y);
              };
              if (_6 instanceof Data_Maybe.Just) {
                  return new Data_Maybe.Just(gcd(_6.value0)(y));
              };
              throw new Error("Failed pattern match at Util line 88, column 5 - line 89, column 5: " + [ _6.constructor.name, y.constructor.name ]);
          };
      };
      return Data_Foldable.foldl(__dict_Foldable_0)(foldGCD$prime)(Data_Maybe.Nothing.value);
  };
  var extractFsts = function (__dict_Foldable_1) {
      return Data_Foldable.foldl(__dict_Foldable_1)(function (acc) {
          return function (_4) {
              return new Data_List.Cons(_4.value0, acc);
          };
      })(Data_List.Nil.value);
  };
  var schedule = function (arr) {
      var timers = extractFsts(Data_Foldable.foldableArray)(arr);
      var theGCD = Data_Maybe_Unsafe.fromJust(foldGCD(Data_List.foldableList)(timers));
      var goElt = function (_5) {
          var _17 = _5.numbalert >= _5.timer;
          if (_17) {
              return Prelude.bind(Control_Monad_Aff.bindAff)(_5.comp)(function () {
                  return Prelude.pure(Control_Monad_Aff.applicativeAff)((function () {
                      var _18 = {};
                      for (var _19 in _5) {
                          if (_5.hasOwnProperty(_19)) {
                              _18[_19] = _5[_19];
                          };
                      };
                      _18.numbalert = theGCD;
                      return _18;
                  })());
              });
          };
          if (!_17) {
              return Prelude.pure(Control_Monad_Aff.applicativeAff)((function () {
                  var _20 = {};
                  for (var _21 in _5) {
                      if (_5.hasOwnProperty(_21)) {
                          _20[_21] = _5[_21];
                      };
                  };
                  _20.numbalert = _5.numbalert + theGCD | 0;
                  return _20;
              })());
          };
          throw new Error("Failed pattern match at Util line 64, column 1 - line 65, column 1: " + [ _17.constructor.name ]);
      };
      var go = function (comps) {
          return Prelude.bind(Control_Monad_Aff.bindAff)(Data_Traversable.traverse(Data_Traversable.traversableArray)(Control_Monad_Aff.applicativeAff)(goElt)(comps))(function (_2) {
              return Control_Monad_Aff["later'"](theGCD)(Prelude.pure(Control_Monad_Aff.applicativeAff)(new Data_Either.Left(_2)));
          });
      };
      return Control_Monad_Rec_Class.tailRecM(Control_Monad_Aff.monadRecAff)(go)(Prelude.map(Prelude.functorArray)(function (_3) {
          return {
              timer: _3.value0, 
              comp: _3.value1, 
              numbalert: theGCD
          };
      })(arr));
  };
  var chopDigits = function (n) {
      return function (arr) {
          var split = Data_Array.span(function (_1) {
              return Prelude["/="](Prelude.eqChar)(_1)(".");
          })(arr);
          var small = Data_Array.take(n)(split.rest);
          return Prelude["++"](Prelude.semigroupArray)(split.init)(small);
      };
  };
  var noDecimal = transformDigits(chopDigits(0));
  var oneDecimal = transformDigits(chopDigits(2));
  exports["gcd"] = gcd;
  exports["extractFsts"] = extractFsts;
  exports["foldGCD"] = foldGCD;
  exports["schedule"] = schedule;
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff_Console = PS["Control.Monad.Eff.Console"];
  var Control_Monad_Eff_Random = PS["Control.Monad.Eff.Random"];
  var Data_Array = PS["Data.Array"];
  var Data_Generic = PS["Data.Generic"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Browser_WebStorage = PS["Browser.WebStorage"];
  var Halogen = PS["Halogen"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];
  var Util = PS["Util"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];     
  var CPS1 = (function () {
      function CPS1(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CPS1.create = function (value0) {
          return function (value1) {
              return new CPS1(value0, value1);
          };
      };
      return CPS1;
  })();
  var CPS2 = (function () {
      function CPS2(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CPS2.create = function (value0) {
          return function (value1) {
              return new CPS2(value0, value1);
          };
      };
      return CPS2;
  })();
  var CPS3 = (function () {
      function CPS3(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CPS3.create = function (value0) {
          return function (value1) {
              return new CPS3(value0, value1);
          };
      };
      return CPS3;
  })();
  var CPS4 = (function () {
      function CPS4(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CPS4.create = function (value0) {
          return function (value1) {
              return new CPS4(value0, value1);
          };
      };
      return CPS4;
  })();
  var CPS5 = (function () {
      function CPS5(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      CPS5.create = function (value0) {
          return function (value1) {
              return new CPS5(value0, value1);
          };
      };
      return CPS5;
  })();
  var Burst1 = (function () {
      function Burst1(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Burst1.create = function (value0) {
          return function (value1) {
              return new Burst1(value0, value1);
          };
      };
      return Burst1;
  })();
  var Burst2 = (function () {
      function Burst2(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Burst2.create = function (value0) {
          return function (value1) {
              return new Burst2(value0, value1);
          };
      };
      return Burst2;
  })();
  var Burst3 = (function () {
      function Burst3(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Burst3.create = function (value0) {
          return function (value1) {
              return new Burst3(value0, value1);
          };
      };
      return Burst3;
  })();
  var Burst4 = (function () {
      function Burst4(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Burst4.create = function (value0) {
          return function (value1) {
              return new Burst4(value0, value1);
          };
      };
      return Burst4;
  })();
  var Burst5 = (function () {
      function Burst5(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Burst5.create = function (value0) {
          return function (value1) {
              return new Burst5(value0, value1);
          };
      };
      return Burst5;
  })();
  var ClicksPerSecond = function (x) {
      return x;
  };
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
  var tagCPS5 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagCPS4 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagCPS3 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagCPS2 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagCPS1 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagBurst5 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagBurst4 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagBurst3 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagBurst2 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);
  var tagBurst1 = Unsafe_Coerce.unsafeCoerce(Prelude.unit);           
  var serializeInt = new Serialize(Prelude.show(Prelude.showInt));
  var serialize = function (dict) {
      return dict.serialize;
  };
  var serializeUpgrade = new Serialize(function (_37) {
      if (_37 instanceof CPS1) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof CPS2) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof CPS3) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof CPS4) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof CPS5) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof Burst1) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof Burst2) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof Burst3) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof Burst4) {
          return serialize(serializeInt)(_37.value0);
      };
      if (_37 instanceof Burst5) {
          return serialize(serializeInt)(_37.value0);
      };
      throw new Error("Failed pattern match at Types line 284, column 1 - line 296, column 1: " + [ _37.constructor.name ]);
  });
  var serializeUpgrades = new Serialize(function (_38) {
      return "{ \"cps1\": " + (serialize(serializeUpgrade)(_38.cps1) + (", \"cps2\": " + (serialize(serializeUpgrade)(_38.cps2) + (", \"cps3\": " + (serialize(serializeUpgrade)(_38.cps3) + (", \"cps4\": " + (serialize(serializeUpgrade)(_38.cps4) + (", \"cps5\": " + (serialize(serializeUpgrade)(_38.cps5) + (", \"burst1\": " + (serialize(serializeUpgrade)(_38.burst1) + (", \"burst2\": " + (serialize(serializeUpgrade)(_38.burst2) + (", \"burst3\": " + (serialize(serializeUpgrade)(_38.burst3) + (", \"burst4\": " + (serialize(serializeUpgrade)(_38.burst4) + (", \"burst5\": " + (serialize(serializeUpgrade)(_38.burst5) + "}")))))))))))))))))));
  });      
  var semiringClicks = new Prelude.Semiring(function (_20) {
      return function (_21) {
          return _20 + _21;
      };
  }, function (_18) {
      return function (_19) {
          return _18 * _19;
      };
  }, 1, 0);
  var ringClicks = new Prelude.Ring(function () {
      return semiringClicks;
  }, function (_26) {
      return function (_27) {
          return _26 - _27;
      };
  });
  var prettyNumber = new Pretty(function (n) {
      if (Util.sigFigs(n) <= 3) {
          return Util.oneDecimal(n);
      };
      if (Util.sigFigs(n) <= 5) {
          return Util.noDecimal(n);
      };
      if (Util.sigFigs(n) <= 6) {
          return Util.transformDigits(Data_Array.take(3))(n) + "k";
      };
      if (Util.sigFigs(n) <= 7) {
          return Util.transformDigits(Data_Array.take(4))(n) + "k";
      };
      if (Util.sigFigs(n) <= 8) {
          return Util.transformDigits(Data_Array.take(5))(n) + "k";
      };
      if (Util.sigFigs(n) <= 9) {
          return Util.transformDigits(Data_Array.take(3))(n) + "m";
      };
      if (Util.sigFigs(n) <= 10) {
          return Util.transformDigits(Data_Array.take(4))(n) + "m";
      };
      if (Util.sigFigs(n) <= 11) {
          return Util.transformDigits(Data_Array.take(5))(n) + "m";
      };
      if (Prelude.otherwise) {
          return "Your civilization can't count this high!";
      };
      throw new Error("Failed pattern match at Types line 239, column 1 - line 251, column 1: " + [ n.constructor.name ]);
  });                                                       
  var prettify = function (dict) {
      return dict.prettify;
  }; 
  var prettyClicks = new Pretty(function (_33) {
      return prettify(prettyNumber)(_33) + " c";
  });
  var prettyClicksPerSecond = new Pretty(function (_34) {
      return prettify(prettyNumber)(_34) + " cps";
  });
  var prettyPopulation = new Pretty(function (_30) {
      return prettify(prettyNumber)(_30) + " clickers";
  });
  var serializeClicks = new Serialize(function (_35) {
      return prettify(prettyNumber)(_35);
  });
  var serializeClicksPerSecond = new Serialize(function (_36) {
      return prettify(prettyNumber)(_36);
  });                                                         
  var isForeignUpgrades = new Data_Foreign_Class.IsForeign(function (value) {
      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("cps1")(value))(function (_9) {
          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("cps2")(value))(function (_8) {
              return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("cps3")(value))(function (_7) {
                  return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("cps4")(value))(function (_6) {
                      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("cps5")(value))(function (_5) {
                          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("burst1")(value))(function (_4) {
                              return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("burst2")(value))(function (_3) {
                                  return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("burst3")(value))(function (_2) {
                                      return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("burst4")(value))(function (_1) {
                                          return Prelude.bind(Data_Either.bindEither)(Data_Foreign_Class.readProp(Data_Foreign_Class.intIsForeign)(Data_Foreign_Index.indexString)("burst5")(value))(function (_0) {
                                              return Prelude.pure(Data_Either.applicativeEither)({
                                                  cps1: new CPS1(_9, tagCPS1), 
                                                  cps2: new CPS2(_8, tagCPS2), 
                                                  cps3: new CPS3(_7, tagCPS3), 
                                                  cps4: new CPS4(_6, tagCPS4), 
                                                  cps5: new CPS5(_5, tagCPS5), 
                                                  burst1: new Burst1(_4, tagBurst1), 
                                                  burst2: new Burst2(_3, tagBurst2), 
                                                  burst3: new Burst3(_2, tagBurst3), 
                                                  burst4: new Burst4(_1, tagBurst4), 
                                                  burst5: new Burst5(_0, tagBurst5)
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
      cps1: new CPS1(0, tagCPS1), 
      cps2: new CPS2(0, tagCPS2), 
      cps3: new CPS3(0, tagCPS3), 
      cps4: new CPS4(0, tagCPS4), 
      cps5: new CPS5(0, tagCPS5), 
      burst1: new Burst1(0, tagBurst1), 
      burst2: new Burst2(0, tagBurst2), 
      burst3: new Burst3(0, tagBurst3), 
      burst4: new Burst4(0, tagBurst4), 
      burst5: new Burst5(0, tagBurst5)
  };
  var initialState = {
      currentClicks: 0.0, 
      totalClicks: 0.0, 
      cps: 0.0, 
      age: Stone.value, 
      burst: 1.0, 
      upgrades: initialUpgrades, 
      message: ""
  }; 
  var eqClicks = new Prelude.Eq(function (_10) {
      return function (_11) {
          return _10 === _11;
      };
  });
  var ordClicks = new Prelude.Ord(function () {
      return eqClicks;
  }, function (_14) {
      return function (_15) {
          return Prelude.compare(Prelude.ordNumber)(_14)(_15);
      };
  });
  var ageShow = new Prelude.Show(function (_31) {
      if (_31 instanceof Stone) {
          return "Stone";
      };
      if (_31 instanceof Bronze) {
          return "Bronze";
      };
      if (_31 instanceof Iron) {
          return "Iron";
      };
      if (_31 instanceof Classical) {
          return "Classical";
      };
      if (_31 instanceof Dark) {
          return "Dark";
      };
      if (_31 instanceof Medieval) {
          return "Medieval";
      };
      if (_31 instanceof Renaissance) {
          return "Renaissance";
      };
      if (_31 instanceof Imperial) {
          return "Imperial";
      };
      if (_31 instanceof Industrial) {
          return "Industrial";
      };
      if (_31 instanceof Nuclear) {
          return "Nuclear";
      };
      if (_31 instanceof Information) {
          return "Information";
      };
      if (_31 instanceof Global) {
          return "Global";
      };
      if (_31 instanceof Space) {
          return "Space";
      };
      if (_31 instanceof Solar) {
          return "Solar";
      };
      throw new Error("Failed pattern match at Types line 208, column 1 - line 224, column 1: " + [ _31.constructor.name ]);
  });
  var prettyAge = new Pretty(Prelude.show(ageShow));
  var serializeAge = new Serialize(prettify(prettyAge));
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
  exports["CPS1"] = CPS1;
  exports["CPS2"] = CPS2;
  exports["CPS3"] = CPS3;
  exports["CPS4"] = CPS4;
  exports["CPS5"] = CPS5;
  exports["Burst1"] = Burst1;
  exports["Burst2"] = Burst2;
  exports["Burst3"] = Burst3;
  exports["Burst4"] = Burst4;
  exports["Burst5"] = Burst5;
  exports["ClicksPerSecond"] = ClicksPerSecond;
  exports["Clicks"] = Clicks;
  exports["Click"] = Click;
  exports["Autoclick"] = Autoclick;
  exports["Reset"] = Reset;
  exports["Save"] = Save;
  exports["Buy"] = Buy;
  exports["Suffer"] = Suffer;
  exports["Unmessage"] = Unmessage;
  exports["Serialize"] = Serialize;
  exports["Pretty"] = Pretty;
  exports["initialUpgrades"] = initialUpgrades;
  exports["initialState"] = initialState;
  exports["serialize"] = serialize;
  exports["prettify"] = prettify;
  exports["tagBurst5"] = tagBurst5;
  exports["tagBurst4"] = tagBurst4;
  exports["tagBurst3"] = tagBurst3;
  exports["tagBurst2"] = tagBurst2;
  exports["tagBurst1"] = tagBurst1;
  exports["tagCPS5"] = tagCPS5;
  exports["tagCPS4"] = tagCPS4;
  exports["tagCPS3"] = tagCPS3;
  exports["tagCPS2"] = tagCPS2;
  exports["tagCPS1"] = tagCPS1;
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
  exports["prettyAge"] = prettyAge;
  exports["serializeInt"] = serializeInt;
  exports["serializeClicks"] = serializeClicks;
  exports["serializeClicksPerSecond"] = serializeClicksPerSecond;
  exports["serializeAge"] = serializeAge;
  exports["serializeUpgrade"] = serializeUpgrade;
  exports["serializeUpgrades"] = serializeUpgrades;;
 
})(PS["Types"] = PS["Types"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var ageDescription = function (_0) {
      if (_0 instanceof Types.Stone) {
          return "You are a member of the hardy but technologically primitive Clickonian\n  people. The other Clickonians generally defer to you when it comes to making\n  important decisions. It is your task to shepherd your people through the\n  Stone Age into a brighter, more prosperous future.";
      };
      throw new Error("Failed pattern match at Age line 8, column 1 - line 9, column 1: " + [ _0.constructor.name ]);
  };
  exports["ageDescription"] = ageDescription;;
 
})(PS["Age"] = PS["Age"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var $eq$less$less = function (__dict_Bind_1) {
      return function (f) {
          return function (m) {
              return Prelude[">>="](__dict_Bind_1)(m)(f);
          };
      };
  };
  var $less$eq$less = function (__dict_Bind_2) {
      return function (f) {
          return function (g) {
              return function (a) {
                  return $eq$less$less(__dict_Bind_2)(f)(g(a));
              };
          };
      };
  };
  exports["<=<"] = $less$eq$less;
  exports["=<<"] = $eq$less$less;;
 
})(PS["Control.Bind"] = PS["Control.Bind"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];     
  var Profunctor = function (dimap) {
      this.dimap = dimap;
  };
  var profunctorFn = new Profunctor(function (a2b) {
      return function (c2d) {
          return function (b2c) {
              return Prelude[">>>"](Prelude.semigroupoidFn)(a2b)(Prelude[">>>"](Prelude.semigroupoidFn)(b2c)(c2d));
          };
      };
  });
  var dimap = function (dict) {
      return dict.dimap;
  };
  var rmap = function (__dict_Profunctor_1) {
      return function (b2c) {
          return dimap(__dict_Profunctor_1)(Prelude.id(Prelude.categoryFn))(b2c);
      };
  };
  exports["Profunctor"] = Profunctor;
  exports["rmap"] = rmap;
  exports["dimap"] = dimap;
  exports["profunctorFn"] = profunctorFn;;
 
})(PS["Data.Profunctor"] = PS["Data.Profunctor"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["Data.Exists"];
  var Prelude = PS["Prelude"];
  exports["runExists"] = $foreign.runExists;
  exports["mkExists"] = $foreign.mkExists;;
 
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var monadTransFreeT = function (__dict_Functor_4) {
      return new Control_Monad_Trans.MonadTrans(function (__dict_Monad_5) {
          return function (ma) {
              return new FreeT(function (_11) {
                  return Prelude.map(((__dict_Monad_5["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Left.create)(ma);
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
  var functorFreeT = function (__dict_Functor_12) {
      return function (__dict_Functor_13) {
          return new Prelude.Functor(function (f) {
              return function (_17) {
                  if (_17 instanceof FreeT) {
                      return new FreeT(function (_5) {
                          return Prelude.map(__dict_Functor_13)(Data_Bifunctor.bimap(Data_Either.bifunctorEither)(f)(Prelude.map(__dict_Functor_12)(Prelude.map(functorFreeT(__dict_Functor_12)(__dict_Functor_13))(f))))(_17.value0(Prelude.unit));
                      });
                  };
                  if (_17 instanceof Bind) {
                      return Data_Exists.runExists(function (_6) {
                          return bound(_6.value0)(function (_72) {
                              return Prelude.map(functorFreeT(__dict_Functor_12)(__dict_Functor_13))(f)(_6.value1(_72));
                          });
                      })(_17.value0);
                  };
                  throw new Error("Failed pattern match: " + [ f.constructor.name, _17.constructor.name ]);
              };
          });
      };
  };
  var bimapFreeT = function (__dict_Functor_16) {
      return function (__dict_Functor_17) {
          return function (nf) {
              return function (nm) {
                  return function (_15) {
                      if (_15 instanceof Bind) {
                          return Data_Exists.runExists(function (_13) {
                              return bound(function (_73) {
                                  return bimapFreeT(__dict_Functor_16)(__dict_Functor_17)(nf)(nm)(_13.value0(_73));
                              })(function (_74) {
                                  return bimapFreeT(__dict_Functor_16)(__dict_Functor_17)(nf)(nm)(_13.value1(_74));
                              });
                          })(_15.value0);
                      };
                      if (_15 instanceof FreeT) {
                          return new FreeT(function (_14) {
                              return Prelude["<$>"](__dict_Functor_17)(Prelude.map(Data_Either.functorEither)(function (_75) {
                                  return nf(Prelude.map(__dict_Functor_16)(bimapFreeT(__dict_Functor_16)(__dict_Functor_17)(nf)(nm))(_75));
                              }))(nm(_15.value0(Prelude.unit)));
                          });
                      };
                      throw new Error("Failed pattern match: " + [ nf.constructor.name, nm.constructor.name, _15.constructor.name ]);
                  };
              };
          };
      };
  };
  var hoistFreeT = function (__dict_Functor_18) {
      return function (__dict_Functor_19) {
          return bimapFreeT(__dict_Functor_18)(__dict_Functor_19)(Prelude.id(Prelude.categoryFn));
      };
  };
  var monadFreeT = function (__dict_Functor_8) {
      return function (__dict_Monad_9) {
          return new Prelude.Monad(function () {
              return applicativeFreeT(__dict_Functor_8)(__dict_Monad_9);
          }, function () {
              return bindFreeT(__dict_Functor_8)(__dict_Monad_9);
          });
      };
  };
  var bindFreeT = function (__dict_Functor_14) {
      return function (__dict_Monad_15) {
          return new Prelude.Bind(function () {
              return applyFreeT(__dict_Functor_14)(__dict_Monad_15);
          }, function (_18) {
              return function (f) {
                  if (_18 instanceof Bind) {
                      return Data_Exists.runExists(function (_9) {
                          return bound(_9.value0)(function (x) {
                              return bound(function (_8) {
                                  return _9.value1(x);
                              })(f);
                          });
                      })(_18.value0);
                  };
                  return bound(function (_10) {
                      return _18;
                  })(f);
              };
          });
      };
  };
  var applyFreeT = function (__dict_Functor_22) {
      return function (__dict_Monad_23) {
          return new Prelude.Apply(function () {
              return functorFreeT(__dict_Functor_22)(((__dict_Monad_23["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
          }, Prelude.ap(monadFreeT(__dict_Functor_22)(__dict_Monad_23)));
      };
  };
  var applicativeFreeT = function (__dict_Functor_24) {
      return function (__dict_Monad_25) {
          return new Prelude.Applicative(function () {
              return applyFreeT(__dict_Functor_24)(__dict_Monad_25);
          }, function (a) {
              return new FreeT(function (_7) {
                  return Prelude.pure(__dict_Monad_25["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(a));
              });
          });
      };
  };
  var liftFreeT = function (__dict_Functor_10) {
      return function (__dict_Monad_11) {
          return function (fa) {
              return new FreeT(function (_12) {
                  return Prelude["return"](__dict_Monad_11["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(Prelude.map(__dict_Functor_10)(Prelude.pure(applicativeFreeT(__dict_Functor_10)(__dict_Monad_11)))(fa)));
              });
          };
      };
  };
  var resume = function (__dict_Functor_0) {
      return function (__dict_MonadRec_1) {
          var go = function (_16) {
              if (_16 instanceof FreeT) {
                  return Prelude.map((((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(_16.value0(Prelude.unit));
              };
              if (_16 instanceof Bind) {
                  return Data_Exists.runExists(function (_4) {
                      var _51 = _4.value0(Prelude.unit);
                      if (_51 instanceof FreeT) {
                          return Prelude.bind((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(_51.value0(Prelude.unit))(function (_0) {
                              if (_0 instanceof Data_Either.Left) {
                                  return Prelude["return"]((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_4.value1(_0.value0)));
                              };
                              if (_0 instanceof Data_Either.Right) {
                                  return Prelude["return"]((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(new Data_Either.Right(Prelude.map(__dict_Functor_0)(function (h) {
                                      return Prelude[">>="](bindFreeT(__dict_Functor_0)(__dict_MonadRec_1["__superclass_Prelude.Monad_0"]()))(h)(_4.value1);
                                  })(_0.value0))));
                              };
                              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ _0.constructor.name ]);
                          });
                      };
                      if (_51 instanceof Bind) {
                          return Data_Exists.runExists(function (_3) {
                              return Prelude["return"]((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(Prelude.bind(bindFreeT(__dict_Functor_0)(__dict_MonadRec_1["__superclass_Prelude.Monad_0"]()))(_3.value0(Prelude.unit))(function (z) {
                                  return Prelude[">>="](bindFreeT(__dict_Functor_0)(__dict_MonadRec_1["__superclass_Prelude.Monad_0"]()))(_3.value1(z))(_4.value1);
                              })));
                          })(_51.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ _51.constructor.name ]);
                  })(_16.value0);
              };
              throw new Error("Failed pattern match at Control.Monad.Free.Trans line 43, column 3 - line 44, column 3: " + [ _16.constructor.name ]);
          };
          return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_1)(go);
      };
  };
  var runFreeT = function (__dict_Functor_2) {
      return function (__dict_MonadRec_3) {
          return function (interp) {
              var go = function (_19) {
                  if (_19 instanceof Data_Either.Left) {
                      return Prelude["return"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_19.value0));
                  };
                  if (_19 instanceof Data_Either.Right) {
                      return Prelude.bind((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(interp(_19.value0))(function (_2) {
                          return Prelude["return"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_2));
                      });
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free.Trans line 103, column 3 - line 104, column 3: " + [ _19.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_3)(Control_Bind["<=<"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(go)(resume(__dict_Functor_2)(__dict_MonadRec_3)));
          };
      };
  };
  var monadRecFreeT = function (__dict_Functor_6) {
      return function (__dict_Monad_7) {
          return new Control_Monad_Rec_Class.MonadRec(function () {
              return monadFreeT(__dict_Functor_6)(__dict_Monad_7);
          }, function (f) {
              var go = function (s) {
                  return Prelude.bind(bindFreeT(__dict_Functor_6)(__dict_Monad_7))(f(s))(function (_1) {
                      if (_1 instanceof Data_Either.Left) {
                          return go(_1.value0);
                      };
                      if (_1 instanceof Data_Either.Right) {
                          return Prelude["return"](applicativeFreeT(__dict_Functor_6)(__dict_Monad_7))(_1.value0);
                      };
                      throw new Error("Failed pattern match at Control.Monad.Free.Trans line 73, column 1 - line 83, column 1: " + [ _1.constructor.name ]);
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
  // Generated by psc version 0.7.6.1
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
          return function (_22) {
              return Data_Profunctor.dimap(Data_Profunctor.profunctorFn)(f)(g)(_22);
          };
      };
  });
  var fuseWith = function (__dict_Functor_4) {
      return function (__dict_Functor_5) {
          return function (__dict_Functor_6) {
              return function (__dict_MonadRec_7) {
                  return function (zap) {
                      return function (fs) {
                          return function (gs) {
                              var go = function (_20) {
                                  return Prelude.bind((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(Control_Monad_Free_Trans.resume(__dict_Functor_5)(__dict_MonadRec_7)(_20.value1))(function (_1) {
                                      return Prelude.bind((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(Control_Monad_Free_Trans.resume(__dict_Functor_4)(__dict_MonadRec_7)(_20.value0))(function (_0) {
                                          var _31 = Prelude["<*>"](Data_Either.applyEither)(Prelude["<$>"](Data_Either.functorEither)(zap(Data_Tuple.Tuple.create))(_0))(_1);
                                          if (_31 instanceof Data_Either.Left) {
                                              return Prelude["return"]((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_31.value0));
                                          };
                                          if (_31 instanceof Data_Either.Right) {
                                              return Prelude["return"]((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(Prelude.map(__dict_Functor_6)(function (t) {
                                                  return Control_Monad_Free_Trans.freeT(function (_5) {
                                                      return go(t);
                                                  });
                                              })(_31.value0)));
                                          };
                                          throw new Error("Failed pattern match at Control.Coroutine line 49, column 1 - line 54, column 1: " + [ _31.constructor.name ]);
                                      });
                                  });
                              };
                              return Control_Monad_Free_Trans.freeT(function (_6) {
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
  var await = function (__dict_Monad_16) {
      return Control_Monad_Free_Trans.liftFreeT(functorAwait)(__dict_Monad_16)(Prelude.id(Prelude.categoryFn));
  };
  exports["await"] = await;
  exports["fuseWith"] = fuseWith;
  exports["profunctorAwait"] = profunctorAwait;
  exports["functorAwait"] = functorAwait;;
 
})(PS["Control.Coroutine"] = PS["Control.Coroutine"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var put = function (__dict_MonadState_0) {
      return function (s) {
          return state(__dict_MonadState_0)(function (_0) {
              return new Data_Tuple.Tuple(Prelude.unit, s);
          });
      };
  };
  var modify = function (__dict_MonadState_1) {
      return function (f) {
          return state(__dict_MonadState_1)(function (s) {
              return new Data_Tuple.Tuple(Prelude.unit, f(s));
          });
      };
  };
  var gets = function (__dict_MonadState_2) {
      return function (f) {
          return state(__dict_MonadState_2)(function (s) {
              return new Data_Tuple.Tuple(f(s), s);
          });
      };
  };
  var get = function (__dict_MonadState_3) {
      return state(__dict_MonadState_3)(function (s) {
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
  // Generated by psc version 0.7.6.1
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
  var runMaybeT = function (_5) {
      return _5;
  };
  var monadMaybeT = function (__dict_Monad_7) {
      return new Prelude.Monad(function () {
          return applicativeMaybeT(__dict_Monad_7);
      }, function () {
          return bindMaybeT(__dict_Monad_7);
      });
  };
  var functorMaybeT = function (__dict_Monad_14) {
      return new Prelude.Functor(Prelude.liftA1(applicativeMaybeT(__dict_Monad_14)));
  };
  var bindMaybeT = function (__dict_Monad_15) {
      return new Prelude.Bind(function () {
          return applyMaybeT(__dict_Monad_15);
      }, function (x) {
          return function (f) {
              return MaybeT(Prelude.bind(__dict_Monad_15["__superclass_Prelude.Bind_1"]())(runMaybeT(x))(function (_0) {
                  if (_0 instanceof Data_Maybe.Nothing) {
                      return Prelude["return"](__dict_Monad_15["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value);
                  };
                  if (_0 instanceof Data_Maybe.Just) {
                      return runMaybeT(f(_0.value0));
                  };
                  throw new Error("Failed pattern match: " + [ _0.constructor.name ]);
              }));
          };
      });
  };
  var applyMaybeT = function (__dict_Monad_16) {
      return new Prelude.Apply(function () {
          return functorMaybeT(__dict_Monad_16);
      }, Prelude.ap(monadMaybeT(__dict_Monad_16)));
  };
  var applicativeMaybeT = function (__dict_Monad_17) {
      return new Prelude.Applicative(function () {
          return applyMaybeT(__dict_Monad_17);
      }, function (_28) {
          return MaybeT(Prelude.pure(__dict_Monad_17["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Just.create(_28)));
      });
  };
  var monadRecMaybeT = function (__dict_MonadRec_3) {
      return new Control_Monad_Rec_Class.MonadRec(function () {
          return monadMaybeT(__dict_MonadRec_3["__superclass_Prelude.Monad_0"]());
      }, function (f) {
          return function (_31) {
              return MaybeT(Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_3)(function (a) {
                  return Prelude.bind((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runMaybeT(f(a)))(function (_2) {
                      return Prelude["return"]((__dict_MonadRec_3["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                          if (_2 instanceof Data_Maybe.Nothing) {
                              return new Data_Either.Right(Data_Maybe.Nothing.value);
                          };
                          if (_2 instanceof Data_Maybe.Just && _2.value0 instanceof Data_Either.Left) {
                              return new Data_Either.Left(_2.value0.value0);
                          };
                          if (_2 instanceof Data_Maybe.Just && _2.value0 instanceof Data_Either.Right) {
                              return new Data_Either.Right(new Data_Maybe.Just(_2.value0.value0));
                          };
                          throw new Error("Failed pattern match at Control.Monad.Maybe.Trans line 78, column 1 - line 86, column 1: " + [ _2.constructor.name ]);
                      })());
                  });
              })(_31));
          };
      });
  };
  var altMaybeT = function (__dict_Monad_19) {
      return new Control_Alt.Alt(function () {
          return functorMaybeT(__dict_Monad_19);
      }, function (m1) {
          return function (m2) {
              return Prelude.bind(__dict_Monad_19["__superclass_Prelude.Bind_1"]())(runMaybeT(m1))(function (_1) {
                  if (_1 instanceof Data_Maybe.Nothing) {
                      return runMaybeT(m2);
                  };
                  return Prelude["return"](__dict_Monad_19["__superclass_Prelude.Applicative_0"]())(_1);
              });
          };
      });
  };
  var plusMaybeT = function (__dict_Monad_0) {
      return new Control_Plus.Plus(function () {
          return altMaybeT(__dict_Monad_0);
      }, Prelude.pure(__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value));
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
  // Generated by psc version 0.7.6.1
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
  var runStallingProcess = function (__dict_MonadRec_2) {
      return function (_19) {
          return Control_Monad_Maybe_Trans.runMaybeT(Control_Monad_Free_Trans.runFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.monadRecMaybeT(__dict_MonadRec_2))(Data_Maybe.maybe(Control_Plus.empty(Control_Monad_Maybe_Trans.plusMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())))(Prelude.pure(Control_Monad_Maybe_Trans.applicativeMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]()))))(Control_Monad_Free_Trans.hoistFreeT(Data_Maybe.functorMaybe)(Control_Monad_Maybe_Trans.functorMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]()))(function (_20) {
              return Control_Monad_Maybe_Trans.MaybeT(Prelude.map((((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)(_20));
          })(_19)));
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
  var $dollar$dollar$qmark = function (__dict_MonadRec_0) {
      return Control_Coroutine.fuseWith(functorStallF)(Control_Coroutine.functorAwait)(Data_Maybe.functorMaybe)(__dict_MonadRec_0)(function (f) {
          return function (q) {
              return function (_0) {
                  if (q instanceof Emit) {
                      return new Data_Maybe.Just(f(q.value1)(_0(q.value0)));
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var runStateT = function (_6) {
      return _6;
  };
  var monadStateT = function (__dict_Monad_5) {
      return new Prelude.Monad(function () {
          return applicativeStateT(__dict_Monad_5);
      }, function () {
          return bindStateT(__dict_Monad_5);
      });
  };
  var functorStateT = function (__dict_Monad_14) {
      return new Prelude.Functor(Prelude.liftM1(monadStateT(__dict_Monad_14)));
  };
  var bindStateT = function (__dict_Monad_17) {
      return new Prelude.Bind(function () {
          return applyStateT(__dict_Monad_17);
      }, function (_7) {
          return function (f) {
              return function (s) {
                  return Prelude.bind(__dict_Monad_17["__superclass_Prelude.Bind_1"]())(_7(s))(function (_0) {
                      return runStateT(f(_0.value0))(_0.value1);
                  });
              };
          };
      });
  };
  var applyStateT = function (__dict_Monad_18) {
      return new Prelude.Apply(function () {
          return functorStateT(__dict_Monad_18);
      }, Prelude.ap(monadStateT(__dict_Monad_18)));
  };
  var applicativeStateT = function (__dict_Monad_19) {
      return new Prelude.Applicative(function () {
          return applyStateT(__dict_Monad_19);
      }, function (a) {
          return StateT(function (s) {
              return Prelude["return"](__dict_Monad_19["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(a, s));
          });
      });
  };
  var monadStateStateT = function (__dict_Monad_6) {
      return new Control_Monad_State_Class.MonadState(function () {
          return monadStateT(__dict_Monad_6);
      }, function (f) {
          return StateT(function (_39) {
              return Prelude["return"](__dict_Monad_6["__superclass_Prelude.Applicative_0"]())(f(_39));
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
  // Generated by psc version 0.7.6.1
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
  var runWriterT = function (_7) {
      return _7;
  };
  var mapWriterT = function (f) {
      return function (m) {
          return WriterT(f(runWriterT(m)));
      };
  };
  var functorWriterT = function (__dict_Functor_22) {
      return new Prelude.Functor(function (f) {
          return mapWriterT(Prelude["<$>"](__dict_Functor_22)(function (_6) {
              return new Data_Tuple.Tuple(f(_6.value0), _6.value1);
          }));
      });
  };
  var applyWriterT = function (__dict_Semigroup_26) {
      return function (__dict_Apply_27) {
          return new Prelude.Apply(function () {
              return functorWriterT(__dict_Apply_27["__superclass_Prelude.Functor_0"]());
          }, function (f) {
              return function (v) {
                  return WriterT((function () {
                      var k = function (_8) {
                          return function (_9) {
                              return new Data_Tuple.Tuple(_8.value0(_9.value0), Prelude["<>"](__dict_Semigroup_26)(_8.value1)(_9.value1));
                          };
                      };
                      return Prelude["<*>"](__dict_Apply_27)(Prelude["<$>"](__dict_Apply_27["__superclass_Prelude.Functor_0"]())(k)(runWriterT(f)))(runWriterT(v));
                  })());
              };
          });
      };
  };
  var applicativeWriterT = function (__dict_Monoid_28) {
      return function (__dict_Applicative_29) {
          return new Prelude.Applicative(function () {
              return applyWriterT(__dict_Monoid_28["__superclass_Prelude.Semigroup_0"]())(__dict_Applicative_29["__superclass_Prelude.Apply_0"]());
          }, function (a) {
              return WriterT(Prelude.pure(__dict_Applicative_29)(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_28))));
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var uncons = function (__copy__2) {
      var _2 = __copy__2;
      tco: while (true) {
          if (_2.value0 instanceof Data_List.Nil && _2.value1 instanceof Data_List.Nil) {
              return Data_Maybe.Nothing.value;
          };
          if (_2.value0 instanceof Data_List.Nil) {
              var __tco__2 = new CatQueue(Data_List.reverse(_2.value1), Data_List.Nil.value);
              _2 = __tco__2;
              continue tco;
          };
          if (_2.value0 instanceof Data_List.Cons) {
              return new Data_Maybe.Just(new Data_Tuple.Tuple(_2.value0.value0, new CatQueue(_2.value0.value1, _2.value1)));
          };
          throw new Error("Failed pattern match: " + [ _2.constructor.name ]);
      };
  };
  var snoc = function (_1) {
      return function (a) {
          return new CatQueue(_1.value0, new Data_List.Cons(a, _1.value1));
      };
  };
  var $$null = function (_0) {
      if (_0.value0 instanceof Data_List.Nil && _0.value1 instanceof Data_List.Nil) {
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
  // Generated by psc version 0.7.6.1
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
  var link = function (_4) {
      return function (cat) {
          if (_4 instanceof CatNil) {
              return cat;
          };
          if (_4 instanceof CatCons) {
              return new CatCons(_4.value0, Data_CatQueue.snoc(_4.value1)(cat));
          };
          throw new Error("Failed pattern match at Data.CatList line 88, column 1 - line 89, column 1: " + [ _4.constructor.name, cat.constructor.name ]);
      };
  };
  var foldr = function (k) {
      return function (b) {
          return function (q) {
              var foldl = function (__copy_k_1) {
                  return function (__copy_c) {
                      return function (__copy__5) {
                          var k_1 = __copy_k_1;
                          var c = __copy_c;
                          var _5 = __copy__5;
                          tco: while (true) {
                              var c_1 = c;
                              if (_5 instanceof Data_List.Nil) {
                                  return c_1;
                              };
                              if (_5 instanceof Data_List.Cons) {
                                  var __tco_k_1 = k_1;
                                  var __tco_c = k_1(c)(_5.value0);
                                  var __tco__5 = _5.value1;
                                  k_1 = __tco_k_1;
                                  c = __tco_c;
                                  _5 = __tco__5;
                                  continue tco;
                              };
                              throw new Error("Failed pattern match at Data.CatList line 95, column 1 - line 96, column 1: " + [ k_1.constructor.name, c.constructor.name, _5.constructor.name ]);
                          };
                      };
                  };
              };
              var go = function (__copy_xs) {
                  return function (__copy_ys) {
                      var xs = __copy_xs;
                      var ys = __copy_ys;
                      tco: while (true) {
                          var _20 = Data_CatQueue.uncons(xs);
                          if (_20 instanceof Data_Maybe.Nothing) {
                              return foldl(function (x) {
                                  return function (i) {
                                      return i(x);
                                  };
                              })(b)(ys);
                          };
                          if (_20 instanceof Data_Maybe.Just) {
                              var __tco_ys = new Data_List.Cons(k(_20.value0.value0), ys);
                              xs = _20.value0.value1;
                              ys = __tco_ys;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.CatList line 95, column 1 - line 96, column 1: " + [ _20.constructor.name ]);
                      };
                  };
              };
              return go(q)(Data_List.Nil.value);
          };
      };
  };
  var uncons = function (_3) {
      if (_3 instanceof CatNil) {
          return Data_Maybe.Nothing.value;
      };
      if (_3 instanceof CatCons) {
          return new Data_Maybe.Just(new Data_Tuple.Tuple(_3.value0, (function () {
              var _25 = Data_CatQueue["null"](_3.value1);
              if (_25) {
                  return CatNil.value;
              };
              if (!_25) {
                  return foldr(link)(CatNil.value)(_3.value1);
              };
              throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 80, column 1: " + [ _25.constructor.name ]);
          })()));
      };
      throw new Error("Failed pattern match at Data.CatList line 79, column 1 - line 80, column 1: " + [ _3.constructor.name ]);
  };
  var empty = CatNil.value;
  var append = function (_1) {
      return function (_2) {
          if (_2 instanceof CatNil) {
              return _1;
          };
          if (_1 instanceof CatNil) {
              return _2;
          };
          return link(_1)(_2);
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
  // Generated by psc version 0.7.6.1
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
  var toView = function (__copy__0) {
      var _0 = __copy__0;
      tco: while (true) {
          var runExpF = function (_3) {
              return _3;
          };
          var concatF = function (_2) {
              return function (r) {
                  return new Free(_2.value0, Prelude["<>"](Data_CatList.semigroupCatList)(_2.value1)(r));
              };
          };
          if (_0.value0 instanceof Return) {
              var _11 = Data_CatList.uncons(_0.value1);
              if (_11 instanceof Data_Maybe.Nothing) {
                  return new Return(Unsafe_Coerce.unsafeCoerce(_0.value0.value0));
              };
              if (_11 instanceof Data_Maybe.Just) {
                  var __tco__0 = Unsafe_Coerce.unsafeCoerce(concatF(runExpF(_11.value0.value0)(_0.value0.value0))(_11.value0.value1));
                  _0 = __tco__0;
                  continue tco;
              };
              throw new Error("Failed pattern match: " + [ _11.constructor.name ]);
          };
          if (_0.value0 instanceof Bind) {
              return new Bind(_0.value0.value0, function (a) {
                  return Unsafe_Coerce.unsafeCoerce(concatF(_0.value0.value1(a))(_0.value1));
              });
          };
          throw new Error("Failed pattern match: " + [ _0.value0.constructor.name ]);
      };
  };
  var runFreeM = function (__dict_Functor_0) {
      return function (__dict_MonadRec_1) {
          return function (k) {
              var go = function (f) {
                  var _20 = toView(f);
                  if (_20 instanceof Return) {
                      return Prelude["<$>"]((((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(Prelude.pure((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())(_20.value0));
                  };
                  if (_20 instanceof Bind) {
                      return Prelude["<$>"]((((__dict_MonadRec_1["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Left.create)(k(Prelude["<$>"](__dict_Functor_0)(_20.value1)(_20.value0)));
                  };
                  throw new Error("Failed pattern match at Control.Monad.Free line 123, column 3 - line 124, column 3: " + [ _20.constructor.name ]);
              };
              return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_1)(go);
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
          return Prelude[">>="](freeBind)(f)(function (_35) {
              return Prelude["return"](freeApplicative)(k(_35));
          });
      };
  });
  var freeBind = new Prelude.Bind(function () {
      return freeApply;
  }, function (_1) {
      return function (k) {
          return new Free(_1.value0, Data_CatList.snoc(_1.value1)(Unsafe_Coerce.unsafeCoerce(k)));
      };
  });
  var freeApply = new Prelude.Apply(function () {
      return freeFunctor;
  }, Prelude.ap(freeMonad));
  var freeApplicative = new Prelude.Applicative(function () {
      return freeApply;
  }, function (_36) {
      return fromView(Return.create(_36));
  });
  var liftF = function (f) {
      return fromView(new Bind(Unsafe_Coerce.unsafeCoerce(f), function (_37) {
          return Prelude.pure(freeApplicative)(Unsafe_Coerce.unsafeCoerce(_37));
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Control_Monad_State_Trans = PS["Control.Monad.State.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];                   
  var runState = function (s) {
      return function (_0) {
          return Data_Identity.runIdentity(Control_Monad_State_Trans.runStateT(s)(_0));
      };
  };
  exports["runState"] = runState;;
 
})(PS["Control.Monad.State"] = PS["Control.Monad.State"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Monad_Writer_Class = PS["Control.Monad.Writer.Class"];
  var Control_Monad_Writer_Trans = PS["Control.Monad.Writer.Trans"];
  var Data_Identity = PS["Data.Identity"];
  var Data_Tuple = PS["Data.Tuple"];     
  var runWriter = function (_0) {
      return Data_Identity.runIdentity(Control_Monad_Writer_Trans.runWriterT(_0));
  };
  exports["runWriter"] = runWriter;;
 
})(PS["Control.Monad.Writer"] = PS["Control.Monad.Writer"] || {});
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var DOM_Event_Types = PS["DOM.Event.Types"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                           
  var elementToNode = Unsafe_Coerce.unsafeCoerce;
  exports["elementToNode"] = elementToNode;;
 
})(PS["DOM.Node.Types"] = PS["DOM.Node.Types"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var $foreign = PS["DOM.Node.ParentNode"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_Node_Types = PS["DOM.Node.Types"];
  exports["querySelector"] = $foreign.querySelector;;
 
})(PS["DOM.Node.ParentNode"] = PS["DOM.Node.ParentNode"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var getConst = function (_0) {
      return _0;
  };
  var functorConst = new Prelude.Functor(function (_10) {
      return function (_11) {
          return _11;
      };
  });
  var contravariantConst = new Data_Functor_Contravariant.Contravariant(function (_17) {
      return function (_18) {
          return _18;
      };
  });
  var applyConst = function (__dict_Semigroup_10) {
      return new Prelude.Apply(function () {
          return functorConst;
      }, function (_12) {
          return function (_13) {
              return Prelude["<>"](__dict_Semigroup_10)(_12)(_13);
          };
      });
  };
  var applicativeConst = function (__dict_Monoid_11) {
      return new Prelude.Applicative(function () {
          return applyConst(__dict_Monoid_11["__superclass_Prelude.Semigroup_0"]());
      }, function (_16) {
          return Data_Monoid.mempty(__dict_Monoid_11);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Unsafe_Coerce = PS["Unsafe.Coerce"];     
  var runExistsR = Unsafe_Coerce.unsafeCoerce;
  var mkExistsR = Unsafe_Coerce.unsafeCoerce;
  exports["runExistsR"] = runExistsR;
  exports["mkExistsR"] = mkExistsR;;
 
})(PS["Data.ExistsR"] = PS["Data.ExistsR"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var getMap = function (__dict_Monoid_0) {
      return function (f) {
          return function (g) {
              return function (_3) {
                  return Data_Const.getConst(g(Data_Const.contravariantConst)(Data_Const.applicativeConst(__dict_Monoid_0))(function (_4) {
                      return Data_Const.Const(f(_4));
                  })(_3));
              };
          };
      };
  };
  var get = function (g) {
      return function (_5) {
          return Data_Maybe_First.runFirst(getMap(Data_Maybe_First.monoidFirst)(function (_6) {
              return Data_Maybe_First.First(Data_Maybe.Just.create(_6));
          })(function (__dict_Contravariant_1) {
              return function (__dict_Applicative_2) {
                  return g(__dict_Contravariant_1)(__dict_Applicative_2);
              };
          })(_5));
      };
  };
  var coerce = function (__dict_Contravariant_3) {
      return function (__dict_Functor_4) {
          var absurd = function (__copy_a) {
              var a = __copy_a;
              tco: while (true) {
                  var __tco_a = a;
                  a = __tco_a;
                  continue tco;
              };
          };
          return function (_7) {
              return Prelude.map(__dict_Functor_4)(absurd)(Data_Functor_Contravariant.cmap(__dict_Contravariant_3)(absurd)(_7));
          };
      };
  };
  var getter = function (f) {
      return function (__dict_Contravariant_5) {
          return function (__dict_Applicative_6) {
              return function (g) {
                  return function (s) {
                      var _0 = f(s);
                      if (_0 instanceof Data_Either.Left) {
                          return coerce(__dict_Contravariant_5)((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Prelude.pure(__dict_Applicative_6)(Prelude.unit));
                      };
                      if (_0 instanceof Data_Either.Right) {
                          return coerce(__dict_Contravariant_5)((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(g(_0.value0));
                      };
                      throw new Error("Failed pattern match at Data.Foreign.Lens line 54, column 1 - line 55, column 1: " + [ _0.constructor.name ]);
                  };
              };
          };
      };
  };
  var json = function (__dict_Contravariant_11) {
      return function (__dict_Applicative_12) {
          return getter(Data_Foreign.parseJSON)(__dict_Contravariant_11)(__dict_Applicative_12);
      };
  };
  var number = function (__dict_Contravariant_15) {
      return function (__dict_Applicative_16) {
          return getter(Data_Foreign.readNumber)(__dict_Contravariant_15)(__dict_Applicative_16);
      };
  };
  exports["number"] = number;
  exports["json"] = json;
  exports["getMap"] = getMap;
  exports["get"] = get;
  exports["getter"] = getter;;
 
})(PS["Data.Foreign.Lens"] = PS["Data.Foreign.Lens"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Traversable = PS["Data.Traversable"];     
  var Coproduct = function (x) {
      return x;
  };
  var right = function (_2) {
      return Coproduct(Data_Either.Right.create(_2));
  };
  var left = function (_3) {
      return Coproduct(Data_Either.Left.create(_3));
  };
  exports["Coproduct"] = Coproduct;
  exports["right"] = right;
  exports["left"] = left;;
 
})(PS["Data.Functor.Coproduct"] = PS["Data.Functor.Coproduct"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
      return function (_0) {
          return new Data_Tuple.Tuple(a2b(_0.value0), _0.value1);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Either = PS["Data.Either"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Profunctor_Choice = PS["Data.Profunctor.Choice"];
  var runStar = function (_3) {
      return _3;
  };
  var profunctorStar = function (__dict_Functor_1) {
      return new Data_Profunctor.Profunctor(function (f) {
          return function (g) {
              return function (_4) {
                  return Prelude[">>>"](Prelude.semigroupoidFn)(f)(Prelude[">>>"](Prelude.semigroupoidFn)(_4)(Prelude.map(__dict_Functor_1)(g)));
              };
          };
      });
  };
  var strongStar = function (__dict_Functor_0) {
      return new Data_Profunctor_Strong.Strong(function () {
          return profunctorStar(__dict_Functor_0);
      }, function (_5) {
          return function (_1) {
              return Prelude.map(__dict_Functor_0)(function (_0) {
                  return new Data_Tuple.Tuple(_0, _1.value1);
              })(_5(_1.value0));
          };
      }, function (_6) {
          return function (_2) {
              return Prelude.map(__dict_Functor_0)(Data_Tuple.Tuple.create(_2.value0))(_6(_2.value1));
          };
      });
  };
  exports["runStar"] = runStar;
  exports["profunctorStar"] = profunctorStar;
  exports["strongStar"] = strongStar;;
 
})(PS["Data.Profunctor.Star"] = PS["Data.Profunctor.Star"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var to = function (__dict_Contravariant_0) {
      return function (f) {
          return function (p) {
              return function (_0) {
                  return Data_Functor_Contravariant.cmap(__dict_Contravariant_0)(f)(Data_Profunctor_Star.runStar(p)(f(_0)));
              };
          };
      };
  };
  exports["to"] = to;
  exports["view"] = view;
  exports["^."] = $up$dot;;
 
})(PS["Data.Lens.Getter"] = PS["Data.Lens.Getter"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Profunctor = PS["Data.Profunctor"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Lens_Internal_Shop = PS["Data.Lens.Internal.Shop"];
  var Data_Lens_Types = PS["Data.Lens.Types"];
  var lens$prime = function (to) {
      return function (__dict_Strong_0) {
          return function (pab) {
              return Data_Profunctor.dimap(__dict_Strong_0["__superclass_Data.Profunctor.Profunctor_0"]())(to)(function (_0) {
                  return _0.value1(_0.value0);
              })(Data_Profunctor_Strong.first(__dict_Strong_0)(pab));
          };
      };
  };
  var lens = function (get) {
      return function (set) {
          return function (__dict_Strong_1) {
              return lens$prime(function (s) {
                  return new Data_Tuple.Tuple(get(s), function (b) {
                      return set(s)(b);
                  });
              })(__dict_Strong_1);
          };
      };
  };
  exports["lens"] = lens;;
 
})(PS["Data.Lens.Lens"] = PS["Data.Lens.Lens"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var $plus$tilde = function (__dict_Semiring_3) {
      return function (p) {
          return function (_4) {
              return over(p)(Prelude.add(__dict_Semiring_3)(_4));
          };
      };
  };
  var $minus$tilde = function (__dict_Ring_4) {
      return function (p) {
          return function (_5) {
              return over(p)(Prelude.flip(Prelude.sub(__dict_Ring_4))(_5));
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
  // Generated by psc version 0.7.6.1
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
  var lookup = function (__copy___dict_Ord_6) {
      return function (__copy_k) {
          return function (__copy__4) {
              var __dict_Ord_6 = __copy___dict_Ord_6;
              var k = __copy_k;
              var _4 = __copy__4;
              tco: while (true) {
                  if (_4 instanceof Leaf) {
                      return Data_Maybe.Nothing.value;
                  };
                  var k_1 = k;
                  if (_4 instanceof Two && Prelude["=="](__dict_Ord_6["__superclass_Prelude.Eq_0"]())(k_1)(_4.value1)) {
                      return new Data_Maybe.Just(_4.value2);
                  };
                  var k_1 = k;
                  if (_4 instanceof Two && Prelude["<"](__dict_Ord_6)(k_1)(_4.value1)) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value0;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  var k_1 = k;
                  if (_4 instanceof Two) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value3;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && Prelude["=="](__dict_Ord_6["__superclass_Prelude.Eq_0"]())(k_1)(_4.value1)) {
                      return new Data_Maybe.Just(_4.value2);
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && Prelude["=="](__dict_Ord_6["__superclass_Prelude.Eq_0"]())(k_1)(_4.value4)) {
                      return new Data_Maybe.Just(_4.value5);
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && Prelude["<"](__dict_Ord_6)(k_1)(_4.value1)) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value0;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  var k_1 = k;
                  if (_4 instanceof Three && (Prelude["<"](__dict_Ord_6)(_4.value1)(k_1) && Prelude["<="](__dict_Ord_6)(k_1)(_4.value4))) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco__4 = _4.value3;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = k_1;
                      _4 = __tco__4;
                      continue tco;
                  };
                  if (_4 instanceof Three) {
                      var __tco___dict_Ord_6 = __dict_Ord_6;
                      var __tco_k = k;
                      var __tco__4 = _4.value6;
                      __dict_Ord_6 = __tco___dict_Ord_6;
                      k = __tco_k;
                      _4 = __tco__4;
                      continue tco;
                  };
                  throw new Error("Failed pattern match: " + [ k.constructor.name, _4.constructor.name ]);
              };
          };
      };
  }; 
  var fromZipper = function (__copy___dict_Ord_8) {
      return function (__copy__5) {
          return function (__copy__6) {
              var __dict_Ord_8 = __copy___dict_Ord_8;
              var _5 = __copy__5;
              var _6 = __copy__6;
              tco: while (true) {
                  if (_5 instanceof Data_List.Nil) {
                      return _6;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof TwoLeft) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Two(_6, _5.value0.value0, _5.value0.value1, _5.value0.value2);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof TwoRight) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Two(_5.value0.value0, _5.value0.value1, _5.value0.value2, _6);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof ThreeLeft) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Three(_6, _5.value0.value0, _5.value0.value1, _5.value0.value2, _5.value0.value3, _5.value0.value4, _5.value0.value5);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof ThreeMiddle) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Three(_5.value0.value0, _5.value0.value1, _5.value0.value2, _6, _5.value0.value3, _5.value0.value4, _5.value0.value5);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  if (_5 instanceof Data_List.Cons && _5.value0 instanceof ThreeRight) {
                      var __tco___dict_Ord_8 = __dict_Ord_8;
                      var __tco__5 = _5.value1;
                      var __tco__6 = new Three(_5.value0.value0, _5.value0.value1, _5.value0.value2, _5.value0.value3, _5.value0.value4, _5.value0.value5, _6);
                      __dict_Ord_8 = __tco___dict_Ord_8;
                      _5 = __tco__5;
                      _6 = __tco__6;
                      continue tco;
                  };
                  throw new Error("Failed pattern match: " + [ _5.constructor.name, _6.constructor.name ]);
              };
          };
      };
  };
  var insert = function (__dict_Ord_9) {
      var up = function (__copy__13) {
          return function (__copy__14) {
              var _13 = __copy__13;
              var _14 = __copy__14;
              tco: while (true) {
                  if (_13 instanceof Data_List.Nil) {
                      return new Two(_14.value0, _14.value1, _14.value2, _14.value3);
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof TwoLeft) {
                      return fromZipper(__dict_Ord_9)(_13.value1)(new Three(_14.value0, _14.value1, _14.value2, _14.value3, _13.value0.value0, _13.value0.value1, _13.value0.value2));
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof TwoRight) {
                      return fromZipper(__dict_Ord_9)(_13.value1)(new Three(_13.value0.value0, _13.value0.value1, _13.value0.value2, _14.value0, _14.value1, _14.value2, _14.value3));
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof ThreeLeft) {
                      var __tco__13 = _13.value1;
                      var __tco__14 = new KickUp(new Two(_14.value0, _14.value1, _14.value2, _14.value3), _13.value0.value0, _13.value0.value1, new Two(_13.value0.value2, _13.value0.value3, _13.value0.value4, _13.value0.value5));
                      _13 = __tco__13;
                      _14 = __tco__14;
                      continue tco;
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof ThreeMiddle) {
                      var __tco__13 = _13.value1;
                      var __tco__14 = new KickUp(new Two(_13.value0.value0, _13.value0.value1, _13.value0.value2, _14.value0), _14.value1, _14.value2, new Two(_14.value3, _13.value0.value3, _13.value0.value4, _13.value0.value5));
                      _13 = __tco__13;
                      _14 = __tco__14;
                      continue tco;
                  };
                  if (_13 instanceof Data_List.Cons && _13.value0 instanceof ThreeRight) {
                      var __tco__13 = _13.value1;
                      var __tco__14 = new KickUp(new Two(_13.value0.value0, _13.value0.value1, _13.value0.value2, _13.value0.value3), _13.value0.value4, _13.value0.value5, new Two(_14.value0, _14.value1, _14.value2, _14.value3));
                      _13 = __tco__13;
                      _14 = __tco__14;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.Map line 150, column 1 - line 151, column 1: " + [ _13.constructor.name, _14.constructor.name ]);
              };
          };
      };
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy_v) {
                  return function (__copy__12) {
                      var ctx = __copy_ctx;
                      var k = __copy_k;
                      var v = __copy_v;
                      var _12 = __copy__12;
                      tco: while (true) {
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Leaf) {
                              return up(ctx_1)(new KickUp(Leaf.value, k_1, v_1, Leaf.value));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Two && Prelude["=="](__dict_Ord_9["__superclass_Prelude.Eq_0"]())(k_1)(_12.value1)) {
                              return fromZipper(__dict_Ord_9)(ctx_1)(new Two(_12.value0, k_1, v_1, _12.value3));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Two && Prelude["<"](__dict_Ord_9)(k_1)(_12.value1)) {
                              var __tco_ctx = new Data_List.Cons(new TwoLeft(_12.value1, _12.value2, _12.value3), ctx_1);
                              var __tco__12 = _12.value0;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Two) {
                              var __tco_ctx = new Data_List.Cons(new TwoRight(_12.value0, _12.value1, _12.value2), ctx_1);
                              var __tco__12 = _12.value3;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && Prelude["=="](__dict_Ord_9["__superclass_Prelude.Eq_0"]())(k_1)(_12.value1)) {
                              return fromZipper(__dict_Ord_9)(ctx_1)(new Three(_12.value0, k_1, v_1, _12.value3, _12.value4, _12.value5, _12.value6));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && Prelude["=="](__dict_Ord_9["__superclass_Prelude.Eq_0"]())(k_1)(_12.value4)) {
                              return fromZipper(__dict_Ord_9)(ctx_1)(new Three(_12.value0, _12.value1, _12.value2, _12.value3, k_1, v_1, _12.value6));
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && Prelude["<"](__dict_Ord_9)(k_1)(_12.value1)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeLeft(_12.value1, _12.value2, _12.value3, _12.value4, _12.value5, _12.value6), ctx_1);
                              var __tco__12 = _12.value0;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          var ctx_1 = ctx;
                          var k_1 = k;
                          var v_1 = v;
                          if (_12 instanceof Three && (Prelude["<"](__dict_Ord_9)(_12.value1)(k_1) && Prelude["<="](__dict_Ord_9)(k_1)(_12.value4))) {
                              var __tco_ctx = new Data_List.Cons(new ThreeMiddle(_12.value0, _12.value1, _12.value2, _12.value4, _12.value5, _12.value6), ctx_1);
                              var __tco__12 = _12.value3;
                              ctx = __tco_ctx;
                              k = k_1;
                              v = v_1;
                              _12 = __tco__12;
                              continue tco;
                          };
                          if (_12 instanceof Three) {
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(_12.value0, _12.value1, _12.value2, _12.value3, _12.value4, _12.value5), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco__12 = _12.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              _12 = __tco__12;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.Map line 150, column 1 - line 151, column 1: " + [ ctx.constructor.name, k.constructor.name, v.constructor.name, _12.constructor.name ]);
                      };
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var empty = Leaf.value;
  var $$delete = function (__dict_Ord_17) {
      var up = function (__copy__16) {
          return function (__copy__17) {
              var _16 = __copy__16;
              var _17 = __copy__17;
              tco: while (true) {
                  if (_16 instanceof Data_List.Nil) {
                      return _17;
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoLeft && (_16.value0.value2 instanceof Leaf && _17 instanceof Leaf))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(Leaf.value, _16.value0.value0, _16.value0.value1, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoRight && (_16.value0.value0 instanceof Leaf && _17 instanceof Leaf))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(Leaf.value, _16.value0.value1, _16.value0.value2, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoLeft && _16.value0.value2 instanceof Two)) {
                      var __tco__16 = _16.value1;
                      var __tco__17 = new Three(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0, _16.value0.value2.value1, _16.value0.value2.value2, _16.value0.value2.value3);
                      _16 = __tco__16;
                      _17 = __tco__17;
                      continue tco;
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoRight && _16.value0.value0 instanceof Two)) {
                      var __tco__16 = _16.value1;
                      var __tco__17 = new Three(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3, _16.value0.value1, _16.value0.value2, _17);
                      _16 = __tco__16;
                      _17 = __tco__17;
                      continue tco;
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoLeft && _16.value0.value2 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Two(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0), _16.value0.value2.value1, _16.value0.value2.value2, new Two(_16.value0.value2.value3, _16.value0.value2.value4, _16.value0.value2.value5, _16.value0.value2.value6)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof TwoRight && _16.value0.value0 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Two(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3), _16.value0.value0.value4, _16.value0.value0.value5, new Two(_16.value0.value0.value6, _16.value0.value1, _16.value0.value2, _17)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeLeft && (_16.value0.value2 instanceof Leaf && (_16.value0.value5 instanceof Leaf && _17 instanceof Leaf)))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(Leaf.value, _16.value0.value0, _16.value0.value1, Leaf.value, _16.value0.value3, _16.value0.value4, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && (_16.value0.value0 instanceof Leaf && (_16.value0.value5 instanceof Leaf && _17 instanceof Leaf)))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(Leaf.value, _16.value0.value1, _16.value0.value2, Leaf.value, _16.value0.value3, _16.value0.value4, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeRight && (_16.value0.value0 instanceof Leaf && (_16.value0.value3 instanceof Leaf && _17 instanceof Leaf)))) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(Leaf.value, _16.value0.value1, _16.value0.value2, Leaf.value, _16.value0.value4, _16.value0.value5, Leaf.value));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeLeft && _16.value0.value2 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Three(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0, _16.value0.value2.value1, _16.value0.value2.value2, _16.value0.value2.value3), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value0 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(new Three(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3, _16.value0.value1, _16.value0.value2, _17), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value5 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Three(_17, _16.value0.value3, _16.value0.value4, _16.value0.value5.value0, _16.value0.value5.value1, _16.value0.value5.value2, _16.value0.value5.value3)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeRight && _16.value0.value3 instanceof Two)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Two(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Three(_16.value0.value3.value0, _16.value0.value3.value1, _16.value0.value3.value2, _16.value0.value3.value3, _16.value0.value4, _16.value0.value5, _17)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeLeft && _16.value0.value2 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(new Two(_17, _16.value0.value0, _16.value0.value1, _16.value0.value2.value0), _16.value0.value2.value1, _16.value0.value2.value2, new Two(_16.value0.value2.value3, _16.value0.value2.value4, _16.value0.value2.value5, _16.value0.value2.value6), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value0 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(new Two(_16.value0.value0.value0, _16.value0.value0.value1, _16.value0.value0.value2, _16.value0.value0.value3), _16.value0.value0.value4, _16.value0.value0.value5, new Two(_16.value0.value0.value6, _16.value0.value1, _16.value0.value2, _17), _16.value0.value3, _16.value0.value4, _16.value0.value5));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeMiddle && _16.value0.value5 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Two(_17, _16.value0.value3, _16.value0.value4, _16.value0.value5.value0), _16.value0.value5.value1, _16.value0.value5.value2, new Two(_16.value0.value5.value3, _16.value0.value5.value4, _16.value0.value5.value5, _16.value0.value5.value6)));
                  };
                  if (_16 instanceof Data_List.Cons && (_16.value0 instanceof ThreeRight && _16.value0.value3 instanceof Three)) {
                      return fromZipper(__dict_Ord_17)(_16.value1)(new Three(_16.value0.value0, _16.value0.value1, _16.value0.value2, new Two(_16.value0.value3.value0, _16.value0.value3.value1, _16.value0.value3.value2, _16.value0.value3.value3), _16.value0.value3.value4, _16.value0.value3.value5, new Two(_16.value0.value3.value6, _16.value0.value4, _16.value0.value5, _17)));
                  };
                  return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'up'");
              };
          };
      };
      var removeMaxNode = function (__copy_ctx) {
          return function (__copy__19) {
              var ctx = __copy_ctx;
              var _19 = __copy__19;
              tco: while (true) {
                  var ctx_1 = ctx;
                  if (_19 instanceof Two && (_19.value0 instanceof Leaf && _19.value3 instanceof Leaf)) {
                      return up(ctx_1)(Leaf.value);
                  };
                  var ctx_1 = ctx;
                  if (_19 instanceof Two) {
                      var __tco_ctx = new Data_List.Cons(new TwoRight(_19.value0, _19.value1, _19.value2), ctx_1);
                      var __tco__19 = _19.value3;
                      ctx = __tco_ctx;
                      _19 = __tco__19;
                      continue tco;
                  };
                  var ctx_1 = ctx;
                  if (_19 instanceof Three && (_19.value0 instanceof Leaf && (_19.value3 instanceof Leaf && _19.value6 instanceof Leaf))) {
                      return up(new Data_List.Cons(new TwoRight(Leaf.value, _19.value1, _19.value2), ctx_1))(Leaf.value);
                  };
                  if (_19 instanceof Three) {
                      var __tco_ctx = new Data_List.Cons(new ThreeRight(_19.value0, _19.value1, _19.value2, _19.value3, _19.value4, _19.value5), ctx);
                      var __tco__19 = _19.value6;
                      ctx = __tco_ctx;
                      _19 = __tco__19;
                      continue tco;
                  };
                  if (_19 instanceof Leaf) {
                      return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'removeMaxNode'");
                  };
                  throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ ctx.constructor.name, _19.constructor.name ]);
              };
          };
      };
      var maxNode = function (__copy__18) {
          var _18 = __copy__18;
          tco: while (true) {
              if (_18 instanceof Two && _18.value3 instanceof Leaf) {
                  return {
                      key: _18.value1, 
                      value: _18.value2
                  };
              };
              if (_18 instanceof Two) {
                  var __tco__18 = _18.value3;
                  _18 = __tco__18;
                  continue tco;
              };
              if (_18 instanceof Three && _18.value6 instanceof Leaf) {
                  return {
                      key: _18.value4, 
                      value: _18.value5
                  };
              };
              if (_18 instanceof Three) {
                  var __tco__18 = _18.value6;
                  _18 = __tco__18;
                  continue tco;
              };
              if (_18 instanceof Leaf) {
                  return Data_Maybe_Unsafe.unsafeThrow("Impossible case in 'maxNode'");
              };
              throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ _18.constructor.name ]);
          };
      };
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy__15) {
                  var ctx = __copy_ctx;
                  var k = __copy_k;
                  var _15 = __copy__15;
                  tco: while (true) {
                      var ctx_1 = ctx;
                      if (_15 instanceof Leaf) {
                          return fromZipper(__dict_Ord_17)(ctx_1)(Leaf.value);
                      };
                      var ctx_1 = ctx;
                      var k_1 = k;
                      if (_15 instanceof Two && (_15.value0 instanceof Leaf && (_15.value3 instanceof Leaf && Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value1)))) {
                          return up(ctx_1)(Leaf.value);
                      };
                      var ctx_1 = ctx;
                      var k_1 = k;
                      if (_15 instanceof Two) {
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value1)) {
                              var max = maxNode(_15.value0);
                              return removeMaxNode(new Data_List.Cons(new TwoLeft(max.key, max.value, _15.value3), ctx_1))(_15.value0);
                          };
                          if (Prelude["<"](__dict_Ord_17)(k_1)(_15.value1)) {
                              var __tco_ctx = new Data_List.Cons(new TwoLeft(_15.value1, _15.value2, _15.value3), ctx_1);
                              var __tco__15 = _15.value0;
                              ctx = __tco_ctx;
                              k = k_1;
                              _15 = __tco__15;
                              continue tco;
                          };
                          if (Prelude.otherwise) {
                              var __tco_ctx = new Data_List.Cons(new TwoRight(_15.value0, _15.value1, _15.value2), ctx_1);
                              var __tco__15 = _15.value3;
                              ctx = __tco_ctx;
                              k = k_1;
                              _15 = __tco__15;
                              continue tco;
                          };
                      };
                      var ctx_1 = ctx;
                      var k_1 = k;
                      if (_15 instanceof Three && (_15.value0 instanceof Leaf && (_15.value3 instanceof Leaf && _15.value6 instanceof Leaf))) {
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value1)) {
                              return fromZipper(__dict_Ord_17)(ctx_1)(new Two(Leaf.value, _15.value4, _15.value5, Leaf.value));
                          };
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k_1)(_15.value4)) {
                              return fromZipper(__dict_Ord_17)(ctx_1)(new Two(Leaf.value, _15.value1, _15.value2, Leaf.value));
                          };
                      };
                      if (_15 instanceof Three) {
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k)(_15.value1)) {
                              var max = maxNode(_15.value0);
                              return removeMaxNode(new Data_List.Cons(new ThreeLeft(max.key, max.value, _15.value3, _15.value4, _15.value5, _15.value6), ctx))(_15.value0);
                          };
                          if (Prelude["=="](__dict_Ord_17["__superclass_Prelude.Eq_0"]())(k)(_15.value4)) {
                              var max = maxNode(_15.value3);
                              return removeMaxNode(new Data_List.Cons(new ThreeMiddle(_15.value0, _15.value1, _15.value2, max.key, max.value, _15.value6), ctx))(_15.value3);
                          };
                          if (Prelude["<"](__dict_Ord_17)(k)(_15.value1)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeLeft(_15.value1, _15.value2, _15.value3, _15.value4, _15.value5, _15.value6), ctx);
                              var __tco_k = k;
                              var __tco__15 = _15.value0;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              _15 = __tco__15;
                              continue tco;
                          };
                          if (Prelude["<"](__dict_Ord_17)(_15.value1)(k) && Prelude["<"](__dict_Ord_17)(k)(_15.value4)) {
                              var __tco_ctx = new Data_List.Cons(new ThreeMiddle(_15.value0, _15.value1, _15.value2, _15.value4, _15.value5, _15.value6), ctx);
                              var __tco_k = k;
                              var __tco__15 = _15.value3;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              _15 = __tco__15;
                              continue tco;
                          };
                          if (Prelude.otherwise) {
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(_15.value0, _15.value1, _15.value2, _15.value3, _15.value4, _15.value5), ctx);
                              var __tco_k = k;
                              var __tco__15 = _15.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              _15 = __tco__15;
                              continue tco;
                          };
                      };
                      throw new Error("Failed pattern match at Data.Map line 173, column 1 - line 174, column 1: " + [ ctx.constructor.name, k.constructor.name, _15.constructor.name ]);
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var alter = function (__dict_Ord_18) {
      return function (f) {
          return function (k) {
              return function (m) {
                  var _553 = f(lookup(__dict_Ord_18)(k)(m));
                  if (_553 instanceof Data_Maybe.Nothing) {
                      return $$delete(__dict_Ord_18)(k)(m);
                  };
                  if (_553 instanceof Data_Maybe.Just) {
                      return insert(__dict_Ord_18)(k)(_553.value0)(m);
                  };
                  throw new Error("Failed pattern match at Data.Map line 235, column 1 - line 236, column 1: " + [ _553.constructor.name ]);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var suffer = function (_0) {
      return Prelude.id(Prelude.categoryFn);
  };
  exports["suffer"] = suffer;;
 
})(PS["Disaster"] = PS["Disaster"] || {});
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
  // Generated by psc version 0.7.6.1
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
  var runEventHandler = function (__dict_Monad_0) {
      return function (__dict_MonadEff_1) {
          return function (e) {
              return function (_1) {
                  var applyUpdate = function (_6) {
                      if (_6 instanceof PreventDefault) {
                          return $foreign.preventDefaultImpl(e);
                      };
                      if (_6 instanceof StopPropagation) {
                          return $foreign.stopPropagationImpl(e);
                      };
                      if (_6 instanceof StopImmediatePropagation) {
                          return $foreign.stopImmediatePropagationImpl(e);
                      };
                      throw new Error("Failed pattern match at Halogen.HTML.Events.Handler line 88, column 3 - line 89, column 3: " + [ _6.constructor.name ]);
                  };
                  var _11 = Control_Monad_Writer.runWriter(_1);
                  return Control_Monad_Eff_Class.liftEff(__dict_MonadEff_1)(Control_Apply["*>"](Control_Monad_Eff.applyEff)(Data_Foldable.for_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)(_11.value1)(applyUpdate))(Prelude["return"](Control_Monad_Eff.applicativeEff)(_11.value0)));
              };
          };
      };
  };                                                                                                                                                                                                                                                                                                          
  var functorEventHandler = new Prelude.Functor(function (f) {
      return function (_2) {
          return Prelude["<$>"](Control_Monad_Writer_Trans.functorWriterT(Data_Identity.functorIdentity))(f)(_2);
      };
  });
  var applyEventHandler = new Prelude.Apply(function () {
      return functorEventHandler;
  }, function (_3) {
      return function (_4) {
          return Prelude["<*>"](Control_Monad_Writer_Trans.applyWriterT(Prelude.semigroupArray)(Data_Identity.applyIdentity))(_3)(_4);
      };
  });
  var applicativeEventHandler = new Prelude.Applicative(function () {
      return applyEventHandler;
  }, function (_21) {
      return EventHandler(Prelude.pure(Control_Monad_Writer_Trans.applicativeWriterT(Data_Monoid.monoidArray)(Data_Identity.applicativeIdentity))(_21));
  });
  exports["runEventHandler"] = runEventHandler;
  exports["functorEventHandler"] = functorEventHandler;
  exports["applyEventHandler"] = applyEventHandler;
  exports["applicativeEventHandler"] = applicativeEventHandler;;
 
})(PS["Halogen.HTML.Events.Handler"] = PS["Halogen.HTML.Events.Handler"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var stringIsProp = new IsProp(function (_10) {
      return function (_11) {
          return function (s) {
              return s;
          };
      };
  });
  var runTagName = function (_3) {
      return _3;
  };
  var runPropName = function (_4) {
      return _4;
  };
  var runNamespace = function (_2) {
      return _2;
  };
  var runEventName = function (_6) {
      return _6;
  };
  var runClassName = function (_7) {
      return _7;
  };
  var runAttrName = function (_5) {
      return _5;
  };
  var propName = PropName;
  var prop = function (__dict_IsProp_0) {
      return function (name) {
          return function (attr) {
              return function (v) {
                  return new Prop(Data_Exists.mkExists(new PropF(name, v, Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(toPropString(__dict_IsProp_0)))(attr))));
              };
          };
      };
  };
  var handler = function (name) {
      return function (k) {
          return new Handler(Data_ExistsR.mkExistsR(new HandlerF(name, function (_56) {
              return Prelude.map(Halogen_HTML_Events_Handler.functorEventHandler)(Data_Maybe.Just.create)(k(_56));
          })));
      };
  };
  var functorProp = new Prelude.Functor(function (f) {
      return function (_9) {
          if (_9 instanceof Prop) {
              return new Prop(_9.value0);
          };
          if (_9 instanceof Key) {
              return new Key(_9.value0);
          };
          if (_9 instanceof Attr) {
              return new Attr(_9.value0, _9.value1, _9.value2);
          };
          if (_9 instanceof Handler) {
              return Data_ExistsR.runExistsR(function (_0) {
                  return new Handler(Data_ExistsR.mkExistsR(new HandlerF(_0.value0, function (_57) {
                      return Prelude.map(Halogen_HTML_Events_Handler.functorEventHandler)(Prelude.map(Data_Maybe.functorMaybe)(f))(_0.value1(_57));
                  })));
              })(_9.value0);
          };
          if (_9 instanceof Initializer) {
              return new Initializer(function (_58) {
                  return f(_9.value0(_58));
              });
          };
          if (_9 instanceof Finalizer) {
              return new Finalizer(function (_59) {
                  return f(_9.value0(_59));
              });
          };
          throw new Error("Failed pattern match at Halogen.HTML.Core line 101, column 1 - line 111, column 1: " + [ f.constructor.name, _9.constructor.name ]);
      };
  });
  var fillSlot = function (__dict_Applicative_1) {
      return function (f) {
          return function (g) {
              return function (_1) {
                  if (_1 instanceof Text) {
                      return Prelude.pure(__dict_Applicative_1)(new Text(_1.value0));
                  };
                  if (_1 instanceof Element) {
                      return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Element.create(_1.value0)(_1.value1)(Prelude["<$>"](Prelude.functorArray)(Prelude["<$>"](functorProp)(g))(_1.value2)))(Data_Traversable.traverse(Data_Traversable.traversableArray)(__dict_Applicative_1)(fillSlot(__dict_Applicative_1)(f)(g))(_1.value3));
                  };
                  if (_1 instanceof Slot) {
                      return f(_1.value0);
                  };
                  throw new Error("Failed pattern match: " + [ f.constructor.name, g.constructor.name, _1.constructor.name ]);
              };
          };
      };
  };
  var eventName = EventName;
  var element = Element.create(Data_Maybe.Nothing.value);
  var className = ClassName;
  var bifunctorHTML = new Data_Bifunctor.Bifunctor(function (f) {
      return function (g) {
          var go = function (_8) {
              if (_8 instanceof Text) {
                  return new Text(_8.value0);
              };
              if (_8 instanceof Element) {
                  return new Element(_8.value0, _8.value1, Prelude["<$>"](Prelude.functorArray)(Prelude["<$>"](functorProp)(g))(_8.value2), Prelude["<$>"](Prelude.functorArray)(go)(_8.value3));
              };
              if (_8 instanceof Slot) {
                  return new Slot(f(_8.value0));
              };
              throw new Error("Failed pattern match at Halogen.HTML.Core line 62, column 1 - line 69, column 1: " + [ _8.constructor.name ]);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Coroutine_Aff = PS["Control.Coroutine.Aff"];
  var Control_Coroutine_Stalling = PS["Control.Coroutine.Stalling"];
  var Control_Monad_Aff = PS["Control.Monad.Aff"];
  var Control_Monad_Aff_AVar = PS["Control.Monad.Aff.AVar"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Rec_Class = PS["Control.Monad.Rec.Class"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Const = PS["Data.Const"];
  var Data_Either = PS["Data.Either"];
  var Data_Functor_Coproduct = PS["Data.Functor.Coproduct"];
  var Data_Maybe = PS["Data.Maybe"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];             
  var runEventSource = function (_0) {
      return _0;
  };
  exports["runEventSource"] = runEventSource;;
 
})(PS["Halogen.Query.EventSource"] = PS["Halogen.Query.EventSource"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Control_Monad_State_Class = PS["Control.Monad.State.Class"];
  var Prelude = PS["Prelude"];
  var Control_Monad_State = PS["Control.Monad.State"];
  var Data_Functor = PS["Data.Functor"];
  var Data_NaturalTransformation = PS["Data.NaturalTransformation"];     
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
  var stateN = function (__dict_Monad_0) {
      return function (__dict_MonadState_1) {
          return function (_3) {
              if (_3 instanceof Get) {
                  return Prelude[">>="](__dict_Monad_0["__superclass_Prelude.Bind_1"]())(Control_Monad_State_Class.get(__dict_MonadState_1))(function (_20) {
                      return Prelude.pure(__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(_3.value0(_20));
                  });
              };
              if (_3 instanceof Modify) {
                  return Data_Functor["$>"](((__dict_Monad_0["__superclass_Prelude.Bind_1"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Control_Monad_State_Class.modify(__dict_MonadState_1)(_3.value0))(_3.value1);
              };
              throw new Error("Failed pattern match at Halogen.Query.StateF line 33, column 1 - line 34, column 1: " + [ _3.constructor.name ]);
          };
      };
  };
  var functorStateF = new Prelude.Functor(function (f) {
      return function (_4) {
          if (_4 instanceof Get) {
              return new Get(function (_22) {
                  return f(_4.value0(_22));
              });
          };
          if (_4 instanceof Modify) {
              return new Modify(_4.value0, f(_4.value1));
          };
          throw new Error("Failed pattern match at Halogen.Query.StateF line 21, column 1 - line 27, column 1: " + [ f.constructor.name, _4.constructor.name ]);
      };
  });
  exports["Get"] = Get;
  exports["Modify"] = Modify;
  exports["stateN"] = stateN;
  exports["functorStateF"] = functorStateF;;
 
})(PS["Halogen.Query.StateF"] = PS["Halogen.Query.StateF"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Plus = PS["Control.Plus"];
  var Control_Monad_Free_Trans = PS["Control.Monad.Free.Trans"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
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
  var functorHalogenF = function (__dict_Functor_4) {
      return new Prelude.Functor(function (f) {
          return function (h) {
              if (h instanceof StateHF) {
                  return new StateHF(Prelude.map(Halogen_Query_StateF.functorStateF)(f)(h.value0));
              };
              if (h instanceof SubscribeHF) {
                  return new SubscribeHF(h.value0, f(h.value1));
              };
              if (h instanceof QueryHF) {
                  return new QueryHF(Prelude.map(__dict_Functor_4)(f)(h.value0));
              };
              if (h instanceof HaltHF) {
                  return HaltHF.value;
              };
              throw new Error("Failed pattern match at Halogen.Query.HalogenF line 31, column 1 - line 39, column 1: " + [ h.constructor.name ]);
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
  // Generated by psc version 0.7.6.1
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
  var liftH = function (_0) {
      return Control_Monad_Free.liftF(Halogen_Query_HalogenF.QueryHF.create(_0));
  };
  var liftEff$prime = function (__dict_MonadEff_0) {
      return function (_1) {
          return liftH(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_0)(_1));
      };
  };
  var liftAff$prime = function (__dict_MonadAff_1) {
      return function (_2) {
          return liftH(Control_Monad_Aff_Class.liftAff(__dict_MonadAff_1)(_2));
      };
  };
  var gets = function (_3) {
      return Control_Monad_Free.liftF(Halogen_Query_HalogenF.StateHF.create(Halogen_Query_StateF.Get.create(_3)));
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
  // Generated by psc version 0.7.6.1
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
  var renderComponent = function (_14) {
      return Control_Monad_State.runState(_14.render);
  };
  var render = function (__dict_Ord_2) {
      return function (rc) {
          var renderChild$prime = function (p) {
              return function (c) {
                  return function (s) {
                      var _36 = renderComponent(c)(s);
                      return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.modify(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(function (_8) {
                          return {
                              parent: _8.parent, 
                              children: Data_Map.insert(__dict_Ord_2)(p)(new Data_Tuple.Tuple(c, _36.value1))(_8.children), 
                              memo: _8.memo
                          };
                      }))(function () {
                          return Prelude.pure(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(Prelude["<$>"](Halogen_HTML_Core.functorHTML)(function (_82) {
                              return Data_Functor_Coproduct.right(ChildF.create(p)(_82));
                          })(_36.value0));
                      });
                  };
              };
          };
          var renderChild = function (_17) {
              return function (_18) {
                  var childState = Data_Map.lookup(__dict_Ord_2)(_18.value0)(_17.children);
                  var _42 = Data_Map.lookup(__dict_Ord_2)(_18.value0)(_17.memo);
                  if (_42 instanceof Data_Maybe.Just) {
                      return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.modify(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(function (_7) {
                          return {
                              parent: _7.parent, 
                              children: Data_Map.alter(__dict_Ord_2)(Prelude["const"](childState))(_18.value0)(_7.children), 
                              memo: Data_Map.insert(__dict_Ord_2)(_18.value0)(_42.value0)(_7.memo)
                          };
                      }))(function () {
                          return Prelude.pure(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(_42.value0);
                      });
                  };
                  if (_42 instanceof Data_Maybe.Nothing) {
                      if (childState instanceof Data_Maybe.Just) {
                          return renderChild$prime(_18.value0)(childState.value0.value0)(childState.value0.value1);
                      };
                      if (childState instanceof Data_Maybe.Nothing) {
                          var def$prime = _18.value1(Prelude.unit);
                          return renderChild$prime(_18.value0)(def$prime.component)(def$prime.initialState);
                      };
                      throw new Error("Failed pattern match at Halogen.Component line 244, column 1 - line 249, column 1: " + [ childState.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Halogen.Component line 244, column 1 - line 249, column 1: " + [ _42.constructor.name ]);
              };
          };
          return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.get(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity)))(function (_1) {
              var html = rc(_1.parent);
              return Prelude.bind(Control_Monad_State_Trans.bindStateT(Data_Identity.monadIdentity))(Control_Monad_State_Class.put(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))({
                  parent: _1.parent, 
                  children: Data_Map.empty, 
                  memo: Data_Map.empty
              }))(function () {
                  return Halogen_HTML_Core.fillSlot(Control_Monad_State_Trans.applicativeStateT(Data_Identity.monadIdentity))(renderChild(_1))(Data_Functor_Coproduct.left)(html);
              });
          });
      };
  };
  var queryComponent = function (_15) {
      return _15["eval"];
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
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var renderProp = function (dr) {
      return function (_2) {
          if (_2 instanceof Halogen_HTML_Core.Prop) {
              return Data_Exists.runExists(function (_0) {
                  return Halogen_Internal_VirtualDOM.prop(Halogen_HTML_Core.runPropName(_0.value0), _0.value1);
              })(_2.value0);
          };
          if (_2 instanceof Halogen_HTML_Core.Attr) {
              var attrName = Data_Maybe.maybe("")(function (ns$prime) {
                  return Halogen_HTML_Core.runNamespace(ns$prime) + ":";
              })(_2.value0) + Halogen_HTML_Core.runAttrName(_2.value1);
              return Halogen_Internal_VirtualDOM.attr(attrName, _2.value2);
          };
          if (_2 instanceof Halogen_HTML_Core.Handler) {
              return Data_ExistsR.runExistsR(function (_1) {
                  return Halogen_Internal_VirtualDOM.handlerProp(Halogen_HTML_Core.runEventName(_1.value0), function (ev) {
                      return handleAff(Prelude[">>="](Control_Monad_Aff.bindAff)(Halogen_HTML_Events_Handler.runEventHandler(Control_Monad_Aff.monadAff)(Control_Monad_Aff.monadEffAff)(ev)(_1.value1(ev)))(Data_Maybe.maybe(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))(dr)));
                  });
              })(_2.value0);
          };
          if (_2 instanceof Halogen_HTML_Core.Initializer) {
              return Halogen_Internal_VirtualDOM.initProp(function (_31) {
                  return handleAff(dr(_2.value0(_31)));
              });
          };
          if (_2 instanceof Halogen_HTML_Core.Finalizer) {
              return Halogen_Internal_VirtualDOM.finalizerProp(function (_32) {
                  return handleAff(dr(_2.value0(_32)));
              });
          };
          return Data_Monoid.mempty(Halogen_Internal_VirtualDOM.monoidProps);
      };
  };
  var findKey = function (r) {
      return function (_3) {
          if (_3 instanceof Halogen_HTML_Core.Key) {
              return new Data_Maybe.Just(_3.value0);
          };
          return r;
      };
  };
  var renderHTML = function (f) {
      var go = function (_4) {
          if (_4 instanceof Halogen_HTML_Core.Text) {
              return Halogen_Internal_VirtualDOM.vtext(_4.value0);
          };
          if (_4 instanceof Halogen_HTML_Core.Element) {
              var tag = Halogen_HTML_Core.runTagName(_4.value1);
              var ns$prime = Data_Nullable.toNullable(Prelude["<$>"](Data_Maybe.functorMaybe)(Halogen_HTML_Core.runNamespace)(_4.value0));
              var key = Data_Nullable.toNullable(Data_Foldable.foldl(Data_Foldable.foldableArray)(findKey)(Data_Maybe.Nothing.value)(_4.value2));
              return Halogen_Internal_VirtualDOM.vnode(ns$prime)(tag)(key)(Data_Foldable.foldMap(Data_Foldable.foldableArray)(Halogen_Internal_VirtualDOM.monoidProps)(renderProp(f))(_4.value2))(Prelude.map(Prelude.functorArray)(go)(_4.value3));
          };
          if (_4 instanceof Halogen_HTML_Core.Slot) {
              return Halogen_Internal_VirtualDOM.vtext("");
          };
          throw new Error("Failed pattern match at Halogen.HTML.Renderer.VirtualDOM line 27, column 1 - line 28, column 1: " + [ _4.constructor.name ]);
      };
      return go;
  };
  exports["renderHTML"] = renderHTML;;
 
})(PS["Halogen.HTML.Renderer.VirtualDOM"] = PS["Halogen.HTML.Renderer.VirtualDOM"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
              return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (_3) {
                  var _6 = !_3.renderPending;
                  if (_6) {
                      return Control_Monad_Aff_AVar.putVar(ref)(_3);
                  };
                  if (!_6) {
                      var _7 = Halogen_Component.renderComponent(c)(_3.state);
                      var vtree$prime = Halogen_HTML_Renderer_VirtualDOM.renderHTML(driver(ref))(_7.value0);
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(Halogen_Internal_VirtualDOM.patch(Halogen_Internal_VirtualDOM.diff(_3.vtree)(vtree$prime))(_3.node)))(function (_2) {
                          return Control_Monad_Aff_AVar.putVar(ref)({
                              node: _2, 
                              vtree: vtree$prime, 
                              state: _7.value1, 
                              renderPending: false
                          });
                      });
                  };
                  throw new Error("Failed pattern match at Halogen.Driver line 56, column 1 - line 61, column 1: " + [ _6.constructor.name ]);
              });
          };
          var $$eval = function (ref) {
              return function (h) {
                  if (h instanceof Halogen_Query_HalogenF.StateHF) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.takeVar(ref))(function (_1) {
                          var _13 = Control_Monad_State.runState(Halogen_Query_StateF.stateN(Control_Monad_State_Trans.monadStateT(Data_Identity.monadIdentity))(Control_Monad_State_Trans.monadStateStateT(Data_Identity.monadIdentity))(h.value0))(_1.state);
                          return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(ref)({
                              node: _1.node, 
                              vtree: _1.vtree, 
                              state: _13.value1, 
                              renderPending: true
                          }))(function () {
                              return Prelude.pure(Control_Monad_Aff.applicativeAff)(_13.value0);
                          });
                      });
                  };
                  if (h instanceof Halogen_Query_HalogenF.SubscribeHF) {
                      var producer = Halogen_Query_EventSource.runEventSource(h.value0);
                      var consumer = Control_Monad_Rec_Class.forever(Control_Monad_Free_Trans.monadRecFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(Control_Bind["=<<"](Control_Monad_Free_Trans.bindFreeT(Control_Coroutine.functorAwait)(Control_Monad_Aff.monadAff))(function (_25) {
                          return Control_Monad_Trans.lift(Control_Monad_Free_Trans.monadTransFreeT(Control_Coroutine.functorAwait))(Control_Monad_Aff.monadAff)(driver(ref)(_25));
                      })(Control_Coroutine.await(Control_Monad_Aff.monadAff)));
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
                  return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Free.runFreeM(Halogen_Query_HalogenF.functorHalogenF(Control_Monad_Aff.functorAff))(Control_Monad_Aff.monadRecAff)($$eval(ref))(Halogen_Component.queryComponent(c)(q)))(function (_0) {
                      return Prelude.bind(Control_Monad_Aff.bindAff)(render(ref))(function () {
                          return Prelude.pure(Control_Monad_Aff.applicativeAff)(_0);
                      });
                  });
              };
          };
          var _21 = Halogen_Component.renderComponent(c)(s);
          return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.makeVar)(function (_4) {
              var vtree = Halogen_HTML_Renderer_VirtualDOM.renderHTML(driver(_4))(_21.value0);
              var node = Halogen_Internal_VirtualDOM.createElement(vtree);
              return Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Aff_AVar.putVar(_4)({
                  node: node, 
                  vtree: vtree, 
                  state: _21.value1, 
                  renderPending: false
              }))(function () {
                  return Prelude.pure(Control_Monad_Aff.applicativeAff)({
                      node: node, 
                      driver: driver(_4)
                  });
              });
          });
      };
  };
  exports["runUI"] = runUI;;
 
})(PS["Halogen.Driver"] = PS["Halogen.Driver"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var span = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("span"))(xs);
  };
  var i = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("i"))(xs);
  };                 
  var h1 = function (xs) {
      return Halogen_HTML_Core.element(Halogen_HTML_Core.tagName("h1"))(xs);
  };
  var h1_ = h1([  ]);
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
  exports["i"] = i;
  exports["h1_"] = h1_;
  exports["h1"] = h1;
  exports["div_"] = div_;
  exports["div"] = div;
  exports["br_"] = br_;
  exports["br"] = br;
  exports["a"] = a;;
 
})(PS["Halogen.HTML.Elements"] = PS["Halogen.HTML.Elements"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_String = PS["Data.String"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];                                                                                                                   
  var title = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("title"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("title")));
  var id_ = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("id"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("id")));
  var href = Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("href"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("href")));
  var class_ = function (_9) {
      return Halogen_HTML_Core.prop(Halogen_HTML_Core.stringIsProp)(Halogen_HTML_Core.propName("className"))(Data_Maybe.Just.create(Halogen_HTML_Core.attrName("class")))(Halogen_HTML_Core.runClassName(_9));
  };
  exports["title"] = title;
  exports["id_"] = id_;
  exports["href"] = href;
  exports["class_"] = class_;;
 
})(PS["Halogen.HTML.Properties"] = PS["Halogen.HTML.Properties"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  var id_ = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.id_);
  var href = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.href);      
  var class_ = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Properties.class_);
  exports["title"] = title;
  exports["id_"] = id_;
  exports["href"] = href;
  exports["class_"] = class_;;
 
})(PS["Halogen.HTML.Properties.Indexed"] = PS["Halogen.HTML.Properties.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Properties_Indexed = PS["Halogen.HTML.Properties.Indexed"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Unsafe_Coerce = PS["Unsafe.Coerce"];                              
  var span = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.span);    
  var i = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.i);  
  var div = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.div);
  var a = Unsafe_Coerce.unsafeCoerce(Halogen_HTML_Elements.a);
  exports["span"] = span;
  exports["i"] = i;
  exports["div"] = div;
  exports["a"] = a;;
 
})(PS["Halogen.HTML.Elements.Indexed"] = PS["Halogen.HTML.Elements.Indexed"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Halogen_Query = PS["Halogen.Query"];
  var Halogen_HTML_Events_Handler = PS["Halogen.HTML.Events.Handler"];
  var Halogen_HTML_Events_Types = PS["Halogen.HTML.Events.Types"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];                                        
  var onMouseDown = Halogen_HTML_Core.handler(Halogen_HTML_Core.eventName("mousedown"));
  var input_ = function (f) {
      return function (_0) {
          return Prelude.pure(Halogen_HTML_Events_Handler.applicativeEventHandler)(Halogen_Query.action(f));
      };
  };
  exports["onMouseDown"] = onMouseDown;
  exports["input_"] = input_;;
 
})(PS["Halogen.HTML.Events"] = PS["Halogen.HTML.Events"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
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
  // Generated by psc version 0.7.6.1
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
  var onLoad = function (__dict_MonadEff_0) {
      return function (callback) {
          return Control_Monad_Eff_Class.liftEff(__dict_MonadEff_0)(Control_Bind["=<<"](Control_Monad_Eff.bindEff)(function (_6) {
              return DOM_Event_EventTarget.addEventListener(DOM_Event_EventTypes.load)(DOM_Event_EventTarget.eventListener(function (_1) {
                  return callback;
              }))(false)(DOM_HTML_Types.windowToEventTarget(_6));
          })(DOM_HTML.window));
      };
  };
  var appendTo = function (__dict_MonadEff_1) {
      return function (query) {
          return function (elem) {
              return Control_Monad_Eff_Class.liftEff(__dict_MonadEff_1)(function __do() {
                  var _0 = Prelude["<$>"](Control_Monad_Eff.functorEff)(Data_Nullable.toMaybe)(Control_Bind["=<<"](Control_Monad_Eff.bindEff)(Control_Bind["<=<"](Control_Monad_Eff.bindEff)(function (_7) {
                      return DOM_Node_ParentNode.querySelector(query)(DOM_HTML_Types.htmlDocumentToParentNode(_7));
                  })(DOM_HTML_Window.document))(DOM_HTML.window))();
                  return (function () {
                      if (_0 instanceof Data_Maybe.Nothing) {
                          return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit);
                      };
                      if (_0 instanceof Data_Maybe.Just) {
                          return Prelude["void"](Control_Monad_Eff.functorEff)(DOM_Node_Node.appendChild(DOM_HTML_Types.htmlElementToNode(elem))(DOM_Node_Types.elementToNode(_0.value0)));
                      };
                      throw new Error("Failed pattern match at Halogen.Util line 28, column 1 - line 30, column 1: " + [ _0.constructor.name ]);
                  })()();
              });
          };
      };
  };
  var appendToBody = function (__dict_MonadEff_2) {
      return appendTo(__dict_MonadEff_2)("body");
  };
  exports["onLoad"] = onLoad;
  exports["appendToBody"] = appendToBody;
  exports["appendTo"] = appendTo;;
 
})(PS["Halogen.Util"] = PS["Halogen.Util"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Lens = PS["Data.Lens.Lens"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Prelude = PS["Prelude"];
  var Data_Lens = PS["Data.Lens"];
  var Types = PS["Types"];
  var Data_Const = PS["Data.Const"];     
  var viewLevel = (function () {
      var viewLevel$prime = function (_46) {
          if (_46 instanceof Types.CPS1) {
              return _46.value0;
          };
          if (_46 instanceof Types.CPS2) {
              return _46.value0;
          };
          if (_46 instanceof Types.CPS3) {
              return _46.value0;
          };
          if (_46 instanceof Types.CPS4) {
              return _46.value0;
          };
          if (_46 instanceof Types.CPS5) {
              return _46.value0;
          };
          if (_46 instanceof Types.Burst1) {
              return _46.value0;
          };
          if (_46 instanceof Types.Burst2) {
              return _46.value0;
          };
          if (_46 instanceof Types.Burst3) {
              return _46.value0;
          };
          if (_46 instanceof Types.Burst4) {
              return _46.value0;
          };
          if (_46 instanceof Types.Burst5) {
              return _46.value0;
          };
          throw new Error("Failed pattern match at Lenses line 81, column 5 - line 82, column 5: " + [ _46.constructor.name ]);
      };
      return Data_Lens_Getter.to(Data_Const.contravariantConst)(viewLevel$prime);
  })();
  var upgrades = function (__dict_Strong_0) {
      return Data_Lens_Lens.lens(function (_18) {
          return _18.upgrades;
      })(function (_19) {
          return function (_20) {
              var _68 = {};
              for (var _69 in _19) {
                  if (_19.hasOwnProperty(_69)) {
                      _68[_69] = _19[_69];
                  };
              };
              _68.upgrades = _20;
              return _68;
          };
      })(__dict_Strong_0);
  };
  var totalClicks = function (__dict_Strong_1) {
      return Data_Lens_Lens.lens(function (_3) {
          return _3.totalClicks;
      })(function (_4) {
          return function (_5) {
              var _70 = {};
              for (var _71 in _4) {
                  if (_4.hasOwnProperty(_71)) {
                      _70[_71] = _4[_71];
                  };
              };
              _70.totalClicks = _5;
              return _70;
          };
      })(__dict_Strong_1);
  };
  var runUpgrades = function (_45) {
      return _45;
  };
  var message = function (__dict_Strong_2) {
      return Data_Lens_Lens.lens(function (_15) {
          return _15.message;
      })(function (_16) {
          return function (_17) {
              var _73 = {};
              for (var _74 in _16) {
                  if (_16.hasOwnProperty(_74)) {
                      _73[_74] = _16[_74];
                  };
              };
              _73.message = _17;
              return _73;
          };
      })(__dict_Strong_2);
  };
  var currentClicks = function (__dict_Strong_3) {
      return Data_Lens_Lens.lens(function (_0) {
          return _0.currentClicks;
      })(function (_1) {
          return function (_2) {
              var _75 = {};
              for (var _76 in _1) {
                  if (_1.hasOwnProperty(_76)) {
                      _75[_76] = _1[_76];
                  };
              };
              _75.currentClicks = _2;
              return _75;
          };
      })(__dict_Strong_3);
  };
  var cps5 = function (__dict_Strong_4) {
      return Data_Lens_Lens.lens(function (_117) {
          return (function (_25) {
              return _25.cps5;
          })(runUpgrades(_117));
      })(function (_39) {
          return function (v) {
              var _78 = {};
              for (var _79 in _39) {
                  if (_39.hasOwnProperty(_79)) {
                      _78[_79] = _39[_79];
                  };
              };
              _78.cps5 = v;
              return _78;
          };
      })(__dict_Strong_4);
  };
  var cps4 = function (__dict_Strong_5) {
      return Data_Lens_Lens.lens(function (_118) {
          return (function (_24) {
              return _24.cps4;
          })(runUpgrades(_118));
      })(function (_38) {
          return function (v) {
              var _81 = {};
              for (var _82 in _38) {
                  if (_38.hasOwnProperty(_82)) {
                      _81[_82] = _38[_82];
                  };
              };
              _81.cps4 = v;
              return _81;
          };
      })(__dict_Strong_5);
  };
  var cps3 = function (__dict_Strong_6) {
      return Data_Lens_Lens.lens(function (_119) {
          return (function (_23) {
              return _23.cps3;
          })(runUpgrades(_119));
      })(function (_37) {
          return function (v) {
              var _84 = {};
              for (var _85 in _37) {
                  if (_37.hasOwnProperty(_85)) {
                      _84[_85] = _37[_85];
                  };
              };
              _84.cps3 = v;
              return _84;
          };
      })(__dict_Strong_6);
  };
  var cps2 = function (__dict_Strong_7) {
      return Data_Lens_Lens.lens(function (_120) {
          return (function (_22) {
              return _22.cps2;
          })(runUpgrades(_120));
      })(function (_36) {
          return function (v) {
              var _87 = {};
              for (var _88 in _36) {
                  if (_36.hasOwnProperty(_88)) {
                      _87[_88] = _36[_88];
                  };
              };
              _87.cps2 = v;
              return _87;
          };
      })(__dict_Strong_7);
  };
  var cps1 = function (__dict_Strong_8) {
      return Data_Lens_Lens.lens(function (_121) {
          return (function (_21) {
              return _21.cps1;
          })(runUpgrades(_121));
      })(function (_35) {
          return function (v) {
              var _90 = {};
              for (var _91 in _35) {
                  if (_35.hasOwnProperty(_91)) {
                      _90[_91] = _35[_91];
                  };
              };
              _90.cps1 = v;
              return _90;
          };
      })(__dict_Strong_8);
  };
  var cps = function (__dict_Strong_9) {
      return Data_Lens_Lens.lens(function (_6) {
          return _6.cps;
      })(function (_7) {
          return function (_8) {
              var _92 = {};
              for (var _93 in _7) {
                  if (_7.hasOwnProperty(_93)) {
                      _92[_93] = _7[_93];
                  };
              };
              _92.cps = _8;
              return _92;
          };
      })(__dict_Strong_9);
  };
  var clicksPerSecond = function (__dict_Strong_10) {
      return Data_Lens_Lens.lens(function (_33) {
          return _33;
      })(function (_34) {
          return function (m) {
              return m;
          };
      })(__dict_Strong_10);
  };
  var cpsNumber = function (__dict_Strong_11) {
      return function (_122) {
          return cps(__dict_Strong_11)(clicksPerSecond(__dict_Strong_11)(_122));
      };
  };
  var clicks = function (__dict_Strong_12) {
      return Data_Lens_Lens.lens(function (_31) {
          return _31;
      })(function (_32) {
          return function (m) {
              return m;
          };
      })(__dict_Strong_12);
  };
  var currentClicksNumber = function (__dict_Strong_13) {
      return function (_123) {
          return currentClicks(__dict_Strong_13)(clicks(__dict_Strong_13)(_123));
      };
  };
  var totalClicksNumber = function (__dict_Strong_14) {
      return function (_124) {
          return totalClicks(__dict_Strong_14)(clicks(__dict_Strong_14)(_124));
      };
  };
  var burst5 = function (__dict_Strong_15) {
      return Data_Lens_Lens.lens(function (_125) {
          return (function (_30) {
              return _30.burst5;
          })(runUpgrades(_125));
      })(function (_44) {
          return function (v) {
              var _99 = {};
              for (var _100 in _44) {
                  if (_44.hasOwnProperty(_100)) {
                      _99[_100] = _44[_100];
                  };
              };
              _99.burst5 = v;
              return _99;
          };
      })(__dict_Strong_15);
  };
  var burst4 = function (__dict_Strong_16) {
      return Data_Lens_Lens.lens(function (_126) {
          return (function (_29) {
              return _29.burst4;
          })(runUpgrades(_126));
      })(function (_43) {
          return function (v) {
              var _102 = {};
              for (var _103 in _43) {
                  if (_43.hasOwnProperty(_103)) {
                      _102[_103] = _43[_103];
                  };
              };
              _102.burst4 = v;
              return _102;
          };
      })(__dict_Strong_16);
  };
  var burst3 = function (__dict_Strong_17) {
      return Data_Lens_Lens.lens(function (_127) {
          return (function (_28) {
              return _28.burst3;
          })(runUpgrades(_127));
      })(function (_42) {
          return function (v) {
              var _105 = {};
              for (var _106 in _42) {
                  if (_42.hasOwnProperty(_106)) {
                      _105[_106] = _42[_106];
                  };
              };
              _105.burst3 = v;
              return _105;
          };
      })(__dict_Strong_17);
  };
  var burst2 = function (__dict_Strong_18) {
      return Data_Lens_Lens.lens(function (_128) {
          return (function (_27) {
              return _27.burst2;
          })(runUpgrades(_128));
      })(function (_41) {
          return function (v) {
              var _108 = {};
              for (var _109 in _41) {
                  if (_41.hasOwnProperty(_109)) {
                      _108[_109] = _41[_109];
                  };
              };
              _108.burst2 = v;
              return _108;
          };
      })(__dict_Strong_18);
  };
  var burst1 = function (__dict_Strong_19) {
      return Data_Lens_Lens.lens(function (_129) {
          return (function (_26) {
              return _26.burst1;
          })(runUpgrades(_129));
      })(function (_40) {
          return function (v) {
              var _111 = {};
              for (var _112 in _40) {
                  if (_40.hasOwnProperty(_112)) {
                      _111[_112] = _40[_112];
                  };
              };
              _111.burst1 = v;
              return _111;
          };
      })(__dict_Strong_19);
  };
  var burst = function (__dict_Strong_20) {
      return Data_Lens_Lens.lens(function (_9) {
          return _9.burst;
      })(function (_10) {
          return function (_11) {
              var _113 = {};
              for (var _114 in _10) {
                  if (_10.hasOwnProperty(_114)) {
                      _113[_114] = _10[_114];
                  };
              };
              _113.burst = _11;
              return _113;
          };
      })(__dict_Strong_20);
  };
  var burstNumber = function (__dict_Strong_21) {
      return function (_130) {
          return burst(__dict_Strong_21)(clicks(__dict_Strong_21)(_130));
      };
  };
  exports["viewLevel"] = viewLevel;
  exports["burst5"] = burst5;
  exports["burst4"] = burst4;
  exports["burst3"] = burst3;
  exports["burst2"] = burst2;
  exports["burst1"] = burst1;
  exports["cps5"] = cps5;
  exports["cps4"] = cps4;
  exports["cps3"] = cps3;
  exports["cps2"] = cps2;
  exports["cps1"] = cps1;
  exports["runUpgrades"] = runUpgrades;
  exports["upgrades"] = upgrades;
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Prelude = PS["Prelude"];
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
  var Util = PS["Util"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var storageKeys = Prelude.map(Prelude.functorArray)(Util.scramble)([ "totalClicks", "currentClicks", "cps", "burst", "age", "upgrades" ]);
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
      var makeTuple = function (__dict_Serialize_0) {
          return function (key) {
              return function (_9) {
                  return Data_Bifunctor.bimap(Data_Tuple.bifunctorTuple)(Util.scramble)(function (_10) {
                      return Util.scramble(Types.serialize(__dict_Serialize_0)(_10));
                  })(Data_Tuple.Tuple.create(key)(_9));
              };
          };
      };
      return [ makeTuple(Types.serializeClicks)("currentClicks")(state.currentClicks), makeTuple(Types.serializeClicks)("totalClicks")(state.totalClicks), makeTuple(Types.serializeClicksPerSecond)("cps")(state.cps), makeTuple(Types.serializeUpgrades)("upgrades")(state.upgrades), makeTuple(Types.serializeAge)("age")(state.age), makeTuple(Types.serializeClicks)("burst")(state.burst) ];
  };
  var saveSingleState = Data_Tuple.uncurry(Browser_WebStorage.setItem(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage));
  var saveState = function (_11) {
      return Data_Foldable.traverse_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)(saveSingleState)(stateTuples(_11));
  };
  var parseUpgrades = (function () {
      var ups = function (__dict_Contravariant_1) {
          return function (__dict_Applicative_2) {
              return Data_Foreign_Lens.getter(Data_Foreign_Class.read(Types.isForeignUpgrades))(__dict_Contravariant_1)(__dict_Applicative_2);
          };
      };
      return function (_12) {
          return Data_Maybe.maybe(Types.initialState.upgrades)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (__dict_Contravariant_3) {
              return function (__dict_Applicative_4) {
                  return function (_13) {
                      return Data_Foreign_Lens.json(__dict_Contravariant_3)(__dict_Applicative_4)(ups(__dict_Contravariant_3)(__dict_Applicative_4)(_13));
                  };
              };
          })(Util.unscramble(_12)));
      };
  })();
  var parseAge = (function () {
      var age = function (_6) {
          if (_6 === "Stone") {
              return new Data_Either.Right(Types.Stone.value);
          };
          if (_6 === "Bronze") {
              return new Data_Either.Right(Types.Bronze.value);
          };
          if (_6 === "Iron") {
              return new Data_Either.Right(Types.Iron.value);
          };
          if (_6 === "Classical") {
              return new Data_Either.Right(Types.Classical.value);
          };
          if (_6 === "Dark") {
              return new Data_Either.Right(Types.Dark.value);
          };
          if (_6 === "Medieval") {
              return new Data_Either.Right(Types.Medieval.value);
          };
          if (_6 === "Renaissance") {
              return new Data_Either.Right(Types.Renaissance.value);
          };
          if (_6 === "Imperial") {
              return new Data_Either.Right(Types.Imperial.value);
          };
          if (_6 === "Industrial") {
              return new Data_Either.Right(Types.Industrial.value);
          };
          if (_6 === "Nuclear") {
              return new Data_Either.Right(Types.Nuclear.value);
          };
          if (_6 === "Information") {
              return new Data_Either.Right(Types.Information.value);
          };
          if (_6 === "Global") {
              return new Data_Either.Right(Types.Global.value);
          };
          if (_6 === "Space") {
              return new Data_Either.Right(Types.Space.value);
          };
          if (_6 === "Solar") {
              return new Data_Either.Right(Types.Solar.value);
          };
          return new Data_Either.Left(Prelude.unit);
      };
      return function (_14) {
          return Data_Maybe.maybe(Types.initialState.age)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (__dict_Contravariant_5) {
              return function (__dict_Applicative_6) {
                  return Data_Foreign_Lens.getter(age)(__dict_Contravariant_5)(__dict_Applicative_6);
              };
          })(Util.unscramble(_14)));
      };
  })();
  var getNumber = function ($$default) {
      return function (_15) {
          return Data_Maybe.maybe($$default)(Prelude.id(Prelude.categoryFn))(Data_Foreign_Lens.get(function (__dict_Contravariant_7) {
              return function (__dict_Applicative_8) {
                  return function (_16) {
                      return Data_Foreign_Lens.json(__dict_Contravariant_7)(__dict_Applicative_8)(Data_Foreign_Lens.number(__dict_Contravariant_7)(__dict_Applicative_8)(_16));
                  };
              };
          })(Util.unscramble(_15)));
      };
  };
  var parseBurst = function (_17) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(function (_18) {
          return Lenses.burst(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.clicks(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_18));
      }))(_17));
  };
  var parseCPS = function (_19) {
      return Types.ClicksPerSecond(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.cpsNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(_19));
  };
  var parseCurrentClicks = function (_20) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.currentClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(_20));
  };
  var parseTotalClicks = function (_21) {
      return Types.Clicks(getNumber(Data_Lens_Getter["^."](Types.initialState)(Lenses.totalClicksNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(_21));
  };
  var getSavedState = function __do() {
      var _5 = Prelude["<$>"](Control_Monad_Eff.functorEff)(function (_22) {
          return Data_Array.zip(storageKeys)(Data_Array.catMaybes(_22));
      })(Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Prelude["<$>"](Prelude.functorArray)(Browser_WebStorage.getItem(Browser_WebStorage.storageLocalStorage)(Browser_WebStorage.localStorage))(storageKeys)))();
      return {
          currentClicks: stateValueMaker(function (_0) {
              return _0.currentClicks;
          })(parseCurrentClicks)("currentClicks")(_5), 
          totalClicks: stateValueMaker(function (_1) {
              return _1.totalClicks;
          })(parseTotalClicks)("totalClicks")(_5), 
          cps: stateValueMaker(function (_2) {
              return _2.cps;
          })(parseCPS)("cps")(_5), 
          upgrades: stateValueMaker(Data_Lens_Getter.view(Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(parseUpgrades)("upgrades")(_5), 
          age: stateValueMaker(function (_3) {
              return _3.age;
          })(parseAge)("age")(_5), 
          burst: stateValueMaker(function (_4) {
              return _4.burst;
          })(parseBurst)("burst")(_5), 
          message: ""
      };
  };
  exports["saveState"] = saveState;
  exports["getSavedState"] = getSavedState;;
 
})(PS["Save"] = PS["Save"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Data_Lens_Setter = PS["Data.Lens.Setter"];
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Int = PS["Data.Int"];
  var Data_Lens = PS["Data.Lens"];
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Util = PS["Util"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var upgradeName = function (_1) {
      return function (_2) {
          if (_1 instanceof Types.CPS1 && _2 instanceof Types.Stone) {
              return "fire!";
          };
          if (_1 instanceof Types.CPS2 && _2 instanceof Types.Stone) {
              return "spear tips";
          };
          if (_1 instanceof Types.CPS3 && _2 instanceof Types.Stone) {
              return "basic fishing";
          };
          if (_1 instanceof Types.CPS4 && _2 instanceof Types.Stone) {
              return "rudimentary farming";
          };
          if (_1 instanceof Types.CPS5 && _2 instanceof Types.Stone) {
              return "stone tools";
          };
          if (_1 instanceof Types.Burst1 && _2 instanceof Types.Stone) {
              return "animal skin clothing";
          };
          if (_1 instanceof Types.Burst2 && _2 instanceof Types.Stone) {
              return "pottery";
          };
          if (_1 instanceof Types.Burst3 && _2 instanceof Types.Stone) {
              return "funeral rites";
          };
          if (_1 instanceof Types.Burst4 && _2 instanceof Types.Stone) {
              return "mammoth bone huts";
          };
          if (_1 instanceof Types.Burst5 && _2 instanceof Types.Stone) {
              return "cave paintings";
          };
          throw new Error("Failed pattern match at Upgrades line 45, column 1 - line 46, column 1: " + [ _1.constructor.name, _2.constructor.name ]);
      };
  };
  var upgradeDescription = function (_3) {
      return function (_4) {
          if (_3 instanceof Types.CPS1 && _4 instanceof Types.Stone) {
              return "we DID start the fire";
          };
          if (_3 instanceof Types.CPS2 && _4 instanceof Types.Stone) {
              return "tip: a well-balanced spear is crucial for hunting";
          };
          if (_3 instanceof Types.CPS3 && _4 instanceof Types.Stone) {
              return "fishing for landsharks?";
          };
          if (_3 instanceof Types.CPS4 && _4 instanceof Types.Stone) {
              return "Can I interest you in some delicious BEETS!?";
          };
          if (_3 instanceof Types.CPS5 && _4 instanceof Types.Stone) {
              return "never leave the Stone Age without 'em";
          };
          if (_3 instanceof Types.Burst1 && _4 instanceof Types.Stone) {
              return "no more wearing leaves as underwear";
          };
          if (_3 instanceof Types.Burst2 && _4 instanceof Types.Stone) {
              return "Oh, my love, my darling, I've hungered for your touch ... ";
          };
          if (_3 instanceof Types.Burst3 && _4 instanceof Types.Stone) {
              return "funerals are a basic human rite";
          };
          if (_3 instanceof Types.Burst4 && _4 instanceof Types.Stone) {
              return "are the huts made out of mammoth bone, or are they just really large bone huts?";
          };
          if (_3 instanceof Types.Burst5 && _4 instanceof Types.Stone) {
              return "is that a painting of a spaceship ... ?";
          };
          throw new Error("Failed pattern match at Upgrades line 57, column 1 - line 58, column 1: " + [ _3.constructor.name, _4.constructor.name ]);
      };
  };
  var upgradeCostModifier = function (n) {
      if (n <= 10) {
          return 1.0;
      };
      if (n <= 25) {
          return 0.8;
      };
      if (n <= 50) {
          return 0.5;
      };
      if (n <= 75) {
          return 0.25;
      };
      if (n <= 100) {
          return 0.125;
      };
      if (Prelude.otherwise) {
          return 6.25e-2;
      };
      throw new Error("Failed pattern match at Upgrades line 36, column 1 - line 37, column 1: " + [ n.constructor.name ]);
  };
  var upgradeCostPolynomial = function (coeff) {
      return function (level) {
          return upgradeCostModifier(level) * coeff * Util["^"](1.2)(Data_Int.toNumber(level));
      };
  };
  var upgradeCost = function (_0) {
      if (_0 instanceof Types.CPS1) {
          return upgradeCostPolynomial(25.0)(_0.value0);
      };
      if (_0 instanceof Types.CPS2) {
          return upgradeCostPolynomial(5000.0)(_0.value0);
      };
      if (_0 instanceof Types.CPS3) {
          return upgradeCostPolynomial(750000.0)(_0.value0);
      };
      if (_0 instanceof Types.CPS4) {
          return upgradeCostPolynomial(9.5e7)(_0.value0);
      };
      if (_0 instanceof Types.CPS5) {
          return upgradeCostPolynomial(8.25e9)(_0.value0);
      };
      if (_0 instanceof Types.Burst1) {
          return upgradeCostPolynomial(10.0)(_0.value0);
      };
      if (_0 instanceof Types.Burst2) {
          return upgradeCostPolynomial(6000.0)(_0.value0);
      };
      if (_0 instanceof Types.Burst3) {
          return upgradeCostPolynomial(850000.0)(_0.value0);
      };
      if (_0 instanceof Types.Burst4) {
          return upgradeCostPolynomial(7.2e7)(_0.value0);
      };
      if (_0 instanceof Types.Burst5) {
          return upgradeCostPolynomial(7.5e9)(_0.value0);
      };
      throw new Error("Failed pattern match at Upgrades line 21, column 1 - line 22, column 1: " + [ _0.constructor.name ]);
  };
  var upgradeBoostModifier = function (n) {
      if (n <= 10) {
          return 1.0;
      };
      if (n <= 25) {
          return 1.5;
      };
      if (n <= 50) {
          return 3.0;
      };
      if (n <= 75) {
          return 5.0;
      };
      if (n <= 100) {
          return 10.0;
      };
      if (Prelude.otherwise) {
          return 15.0;
      };
      throw new Error("Failed pattern match at Upgrades line 101, column 1 - line 102, column 1: " + [ n.constructor.name ]);
  };
  var upgradeBoost = function (_6) {
      if (_6 instanceof Types.CPS1) {
          return 0.1 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.CPS2) {
          return 100.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.CPS3) {
          return 40000.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.CPS4) {
          return 6000000.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.CPS5) {
          return 8.0e8 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Burst1) {
          return 0.2 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Burst2) {
          return 400.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Burst3) {
          return 55000.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Burst4) {
          return 5900000.0 * upgradeBoostModifier(_6.value0);
      };
      if (_6 instanceof Types.Burst5) {
          return 1.0e8 * upgradeBoostModifier(_6.value0);
      };
      throw new Error("Failed pattern match at Upgrades line 89, column 1 - line 90, column 1: " + [ _6.constructor.name ]);
  };
  var recordPurchase = function (up) {
      return function (optic) {
          return function (_138) {
              return Data_Lens_Setter["-~"](Types.ringClicks)(Lenses.currentClicks(Data_Profunctor_Strong.strongFn))(upgradeCost(up))(Data_Lens_Setter[".~"](function (_139) {
                  return Lenses.upgrades(Data_Profunctor_Strong.strongFn)(optic(Data_Profunctor_Strong.strongFn)(_139));
              })(up)(_138));
          };
      };
  };
  var nextUpgrade = function (_5) {
      if (_5 instanceof Types.CPS1) {
          return new Types.CPS1(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.CPS2) {
          return new Types.CPS2(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.CPS3) {
          return new Types.CPS3(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.CPS4) {
          return new Types.CPS4(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.CPS5) {
          return new Types.CPS5(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.Burst1) {
          return new Types.Burst1(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.Burst2) {
          return new Types.Burst2(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.Burst3) {
          return new Types.Burst3(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.Burst4) {
          return new Types.Burst4(_5.value0 + 1 | 0, _5.value1);
      };
      if (_5 instanceof Types.Burst5) {
          return new Types.Burst5(_5.value0 + 1 | 0, _5.value1);
      };
      throw new Error("Failed pattern match at Upgrades line 69, column 1 - line 70, column 1: " + [ _5.constructor.name ]);
  };
  var isInflectionUpgrade = function (up) {
      return Data_Foldable.elem(Data_Foldable.foldableArray)(Prelude.eqInt)(Data_Lens_Getter["^."](up)(Lenses.viewLevel))([ 10, 25, 50, 75, 100 ]);
  };
  var installUpgrade = function (up) {
      return function (optic) {
          return Data_Lens_Setter["+~"](Prelude.semiringNumber)(optic(Data_Profunctor_Strong.strongFn))(upgradeBoost(up));
      };
  };
  var inflectionUpgradeMessage = function (up) {
      return function (age) {
          return upgradeName(up)(age) + " cost down, boost up";
      };
  };
  var canBuyUpgrade = function (state) {
      return function (optic) {
          var currUpgrade = Data_Lens_Getter["^."](state)(function (_140) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(optic(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_140));
          });
          var next = nextUpgrade(currUpgrade);
          var nextCost = upgradeCost(next);
          var currClicks = Data_Lens_Getter["^."](state)(Lenses.currentClicks(Data_Profunctor_Star.strongStar(Data_Const.functorConst)));
          return Prelude[">="](Types.ordClicks)(currClicks)(nextCost);
      };
  };
  var buyUpgrade = function (_7) {
      if (_7 instanceof Types.CPS1) {
          return function (_141) {
              return installUpgrade(_7)(function (__dict_Strong_0) {
                  return Lenses.cpsNumber(__dict_Strong_0);
              })(recordPurchase(_7)(function (__dict_Strong_1) {
                  return Lenses.cps1(__dict_Strong_1);
              })(_141));
          };
      };
      if (_7 instanceof Types.CPS2) {
          return function (_142) {
              return installUpgrade(_7)(function (__dict_Strong_2) {
                  return Lenses.cpsNumber(__dict_Strong_2);
              })(recordPurchase(_7)(function (__dict_Strong_3) {
                  return Lenses.cps2(__dict_Strong_3);
              })(_142));
          };
      };
      if (_7 instanceof Types.CPS3) {
          return function (_143) {
              return installUpgrade(_7)(function (__dict_Strong_4) {
                  return Lenses.cpsNumber(__dict_Strong_4);
              })(recordPurchase(_7)(function (__dict_Strong_5) {
                  return Lenses.cps3(__dict_Strong_5);
              })(_143));
          };
      };
      if (_7 instanceof Types.CPS4) {
          return function (_144) {
              return installUpgrade(_7)(function (__dict_Strong_6) {
                  return Lenses.cpsNumber(__dict_Strong_6);
              })(recordPurchase(_7)(function (__dict_Strong_7) {
                  return Lenses.cps4(__dict_Strong_7);
              })(_144));
          };
      };
      if (_7 instanceof Types.CPS5) {
          return function (_145) {
              return installUpgrade(_7)(function (__dict_Strong_8) {
                  return Lenses.cpsNumber(__dict_Strong_8);
              })(recordPurchase(_7)(function (__dict_Strong_9) {
                  return Lenses.cps5(__dict_Strong_9);
              })(_145));
          };
      };
      if (_7 instanceof Types.Burst1) {
          return function (_146) {
              return installUpgrade(_7)(function (__dict_Strong_10) {
                  return Lenses.burstNumber(__dict_Strong_10);
              })(recordPurchase(_7)(function (__dict_Strong_11) {
                  return Lenses.burst1(__dict_Strong_11);
              })(_146));
          };
      };
      if (_7 instanceof Types.Burst2) {
          return function (_147) {
              return installUpgrade(_7)(function (__dict_Strong_12) {
                  return Lenses.burstNumber(__dict_Strong_12);
              })(recordPurchase(_7)(function (__dict_Strong_13) {
                  return Lenses.burst2(__dict_Strong_13);
              })(_147));
          };
      };
      if (_7 instanceof Types.Burst3) {
          return function (_148) {
              return installUpgrade(_7)(function (__dict_Strong_14) {
                  return Lenses.burstNumber(__dict_Strong_14);
              })(recordPurchase(_7)(function (__dict_Strong_15) {
                  return Lenses.burst3(__dict_Strong_15);
              })(_148));
          };
      };
      if (_7 instanceof Types.Burst4) {
          return function (_149) {
              return installUpgrade(_7)(function (__dict_Strong_16) {
                  return Lenses.burstNumber(__dict_Strong_16);
              })(recordPurchase(_7)(function (__dict_Strong_17) {
                  return Lenses.burst4(__dict_Strong_17);
              })(_149));
          };
      };
      if (_7 instanceof Types.Burst5) {
          return function (_150) {
              return installUpgrade(_7)(function (__dict_Strong_18) {
                  return Lenses.burstNumber(__dict_Strong_18);
              })(recordPurchase(_7)(function (__dict_Strong_19) {
                  return Lenses.burst5(__dict_Strong_19);
              })(_150));
          };
      };
      throw new Error("Failed pattern match at Upgrades line 113, column 1 - line 114, column 1: " + [ _7.constructor.name ]);
  };
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];     
  var reset = function (_0) {
      return Types.initialState;
  };
  exports["reset"] = reset;;
 
})(PS["Reset"] = PS["Reset"] || {});
(function(exports) {
  // Generated by psc version 0.7.6.1
  "use strict";
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Prelude = PS["Prelude"];
  var Types = PS["Types"];
  var $$Math = PS["Math"];
  var Lenses = PS["Lenses"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Int = PS["Data.Int"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];     
  var sumUpgrades = function (u) {
      var g = function (acc) {
          return function (cpsn) {
              return acc + Data_Lens_Getter["^."](u)(function (_0) {
                  return cpsn(Lenses.viewLevel(_0));
              }) | 0;
          };
      };
      var $$int = Data_Foldable.foldl(Data_Foldable.foldableArray)(g)(0)([ Lenses.cps1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.cps2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.cps3(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.cps4(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.cps5(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.burst1(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.burst2(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.burst3(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.burst4(Data_Profunctor_Star.strongStar(Data_Const.functorConst)), Lenses.burst5(Data_Profunctor_Star.strongStar(Data_Const.functorConst)) ]);
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
  // Generated by psc version 0.7.6.1
  "use strict";
  var Halogen_Component = PS["Halogen.Component"];
  var Halogen_HTML_Elements = PS["Halogen.HTML.Elements"];
  var Halogen_HTML = PS["Halogen.HTML"];
  var Halogen_HTML_Elements_Indexed = PS["Halogen.HTML.Elements.Indexed"];
  var Halogen_HTML_Core = PS["Halogen.HTML.Core"];
  var Halogen_HTML_Events = PS["Halogen.HTML.Events"];
  var Data_Lens_Getter = PS["Data.Lens.Getter"];
  var Halogen_Query = PS["Halogen.Query"];
  var Data_Lens_Setter = PS["Data.Lens.Setter"];
  var Halogen_Driver = PS["Halogen.Driver"];
  var Prelude = PS["Prelude"];
  var Data_Lens = PS["Data.Lens"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_String = PS["Data.String"];
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
  var Types = PS["Types"];
  var Lenses = PS["Lenses"];
  var Save = PS["Save"];
  var Upgrades = PS["Upgrades"];
  var Reset = PS["Reset"];
  var Disaster = PS["Disaster"];
  var Age = PS["Age"];
  var Util = PS["Util"];
  var Population = PS["Population"];
  var Data_Profunctor_Star = PS["Data.Profunctor.Star"];
  var Data_Const = PS["Data.Const"];
  var Control_Monad_Free = PS["Control.Monad.Free"];
  var Data_Profunctor_Strong = PS["Data.Profunctor.Strong"];
  var Control_Monad_Aff_Class = PS["Control.Monad.Aff.Class"];     
  var upgradeProps = function (cpsn) {
      return function (state) {
          var hoverText = function (state_1) {
              return function (cpsn_1) {
                  return [ Halogen_HTML_Properties_Indexed.title(Upgrades.upgradeDescription(Data_Lens_Getter["^."](state_1)(function (_20) {
                      return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(cpsn_1(_20));
                  }))(state_1.age)) ];
              };
          };
          var clickAction = Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Buy.create(Upgrades.nextUpgrade(Data_Lens_Getter["^."](state)(function (_21) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(cpsn(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_21));
          })))));
          return Prelude["++"](Prelude.semigroupArray)(hoverText(state)(cpsn(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))((function () {
              var _4 = Upgrades.canBuyUpgrade(state)(function (__dict_Strong_0) {
                  return cpsn(__dict_Strong_0);
              });
              if (_4) {
                  return [ clickAction, Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("upgrade")) ];
              };
              if (!_4) {
                  return [ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("upgrade disabled")) ];
              };
              throw new Error("Failed pattern match at Main line 142, column 1 - line 143, column 1: " + [ _4.constructor.name ]);
          })());
      };
  };
  var upgradeButton = function (cpsn) {
      return function (state) {
          return Halogen_HTML_Elements_Indexed.div(upgradeProps(function (__dict_Strong_1) {
              return cpsn(__dict_Strong_1);
          })(state))([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("name")) ])([ Halogen_HTML.text(Upgrades.upgradeName(Data_Lens_Getter["^."](state)(function (_22) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(cpsn(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_22));
          }))(state.age)), Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("level")) ])([ Halogen_HTML.text(" " + Prelude.show(Prelude.showInt)(Data_Lens_Getter["^."](state)(function (_23) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(cpsn(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(Lenses.viewLevel(_23)));
          }))) ]) ]), Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("cost")) ])([ Halogen_HTML.text(Types.prettify(Types.prettyClicks)(Upgrades.upgradeCost(Upgrades.nextUpgrade(Data_Lens_Getter["^."](state)(function (_24) {
              return Lenses.upgrades(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(cpsn(Data_Profunctor_Star.strongStar(Data_Const.functorConst))(_24));
          }))))) ]) ]);
      };
  };
  var upgradesComponent = function (state) {
      return Halogen_HTML_Elements.div_([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("upgrades cps")) ])([ Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("category")) ])([ Halogen_HTML.text("CPS") ]), upgradeButton(function (__dict_Strong_2) {
          return Lenses.cps1(__dict_Strong_2);
      })(state), upgradeButton(function (__dict_Strong_3) {
          return Lenses.cps2(__dict_Strong_3);
      })(state), upgradeButton(function (__dict_Strong_4) {
          return Lenses.cps3(__dict_Strong_4);
      })(state), upgradeButton(function (__dict_Strong_5) {
          return Lenses.cps4(__dict_Strong_5);
      })(state), upgradeButton(function (__dict_Strong_6) {
          return Lenses.cps5(__dict_Strong_6);
      })(state) ]), Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("upgrades burst")) ])([ Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("category")) ])([ Halogen_HTML.text("Burst") ]), upgradeButton(function (__dict_Strong_7) {
          return Lenses.burst1(__dict_Strong_7);
      })(state), upgradeButton(function (__dict_Strong_8) {
          return Lenses.burst2(__dict_Strong_8);
      })(state), upgradeButton(function (__dict_Strong_9) {
          return Lenses.burst3(__dict_Strong_9);
      })(state), upgradeButton(function (__dict_Strong_10) {
          return Lenses.burst4(__dict_Strong_10);
      })(state), upgradeButton(function (__dict_Strong_11) {
          return Lenses.burst5(__dict_Strong_11);
      })(state) ]) ]);
  };
  var render = function (state) {
      var top = Halogen_HTML_Elements.h1_([ Halogen_HTML.text("clicker builder: the " + (Prelude.show(Types.ageShow)(state.age) + " Age.")) ]);
      var side = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("side") ])([ Halogen_HTML_Elements.div_([ Halogen_HTML.text("Current clicks:"), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("bold")) ])([ Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.currentClicks)) ]), Halogen_HTML_Elements.br_, Halogen_HTML.text("Total clicks:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.totalClicks)), Halogen_HTML_Elements.br_, Halogen_HTML.text("Burst:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicks)(state.burst)), Halogen_HTML_Elements.br_, Halogen_HTML.text("CPS:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyClicksPerSecond)(state.cps)), Halogen_HTML_Elements.br_, Halogen_HTML.text("Population:"), Halogen_HTML_Elements.br_, Halogen_HTML.text(Types.prettify(Types.prettyPopulation)(Population.population(state))) ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("clicker-wrapper") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Click.create)), Halogen_HTML_Properties_Indexed.id_("the-button") ])([ Halogen_HTML_Elements_Indexed.a([ Halogen_HTML_Properties_Indexed.href("#") ])([ Halogen_HTML_Elements_Indexed.i([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("fa fa-hand-pointer-o")) ])([  ]) ]) ]) ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Save.create)), Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("button")) ])([ Halogen_HTML.text("Save") ]), Halogen_HTML_Elements.br_, Halogen_HTML_Elements_Indexed.span([ Halogen_HTML_Events_Indexed.onMouseDown(Halogen_HTML_Events.input_(Types.Reset.create)), Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("button")) ])([ Halogen_HTML.text("Reset") ]) ]);
      var main$prime = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("main") ])([ Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("upgrades") ])([ upgradesComponent(state) ]), (function () {
          var _5 = Data_String["null"](state.message);
          if (_5) {
              return Halogen_HTML_Elements.div_([  ]);
          };
          if (!_5) {
              return Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.class_(Halogen_HTML_Core.className("fade messages")) ])([ Halogen_HTML.text(state.message) ]);
          };
          throw new Error("Failed pattern match at Main line 38, column 1 - line 39, column 1: " + [ _5.constructor.name ]);
      })() ]);
      var bottom = Halogen_HTML_Elements_Indexed.div([ Halogen_HTML_Properties_Indexed.id_("bottom") ])([ Halogen_HTML.text(Age.ageDescription(state.age)), Halogen_HTML_Elements.br_, Halogen_HTML_Elements.br_, Halogen_HTML.text("Changelog: Version so-alpha-it-doesn't-get-a-version-number."), Halogen_HTML_Elements.br_, Halogen_HTML.text("Upcoming:"), Halogen_HTML_Elements.br_, Halogen_HTML.text("Bronze Age, population, randomly occurring disasters, 'graphics'.") ]);
      return Halogen_HTML_Elements.div_([ top, side, main$prime, bottom ]);
  };
  var $$eval = function (_3) {
      if (_3 instanceof Types.Click) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(function (state) {
              return Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.currentClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.burstNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.totalClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.burstNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))))(state));
          }))(function () {
              return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value0);
          });
      };
      if (_3 instanceof Types.Autoclick) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(function (state) {
              return Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.currentClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.cpsNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))) / 10.0)(Data_Lens_Setter["+~"](Prelude.semiringNumber)(Lenses.totalClicksNumber(Data_Profunctor_Strong.strongFn))(Data_Lens_Getter["^."](state)(Lenses.cpsNumber(Data_Profunctor_Star.strongStar(Data_Const.functorConst))) / 10.0)(state));
          }))(function () {
              return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value0);
          });
      };
      if (_3 instanceof Types.Reset) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Reset.reset))(function () {
              return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value0);
          });
      };
      if (_3 instanceof Types.Save) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.get)(function (_0) {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Control_Monad_Eff_Console.log("Saving game ... ")))(function () {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftEff'"](Control_Monad_Aff.monadEffAff)(Save.saveState(_0)))(function () {
                      return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value0);
                  });
              });
          });
      };
      if (_3 instanceof Types.Buy) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("")))(function () {
              return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query["liftAff'"](Control_Monad_Aff_Class.monadAffAff)(Control_Monad_Aff.later(Prelude.pure(Control_Monad_Aff.applicativeAff)(Prelude.unit))))(function () {
                  return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Upgrades.buyUpgrade(_3.value0)))(function () {
                      return Prelude.bind(Control_Monad_Free.freeBind)((function () {
                          var _12 = Upgrades.isInflectionUpgrade(_3.value0);
                          if (_12) {
                              return Halogen_Query.modify(function (state) {
                                  return Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))(Upgrades.inflectionUpgradeMessage(_3.value0)(state.age))(state);
                              });
                          };
                          if (!_12) {
                              return Halogen_Query.modify(function (state) {
                                  return Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("Bought " + Upgrades.upgradeName(_3.value0)(state.age))(state);
                              });
                          };
                          throw new Error("Failed pattern match at Main line 153, column 1 - line 154, column 1: " + [ _12.constructor.name ]);
                      })())(function () {
                          return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value1);
                      });
                  });
              });
          });
      };
      if (_3 instanceof Types.Suffer) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Disaster.suffer(_3.value0)))(function () {
              return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value1);
          });
      };
      if (_3 instanceof Types.Unmessage) {
          return Prelude.bind(Control_Monad_Free.freeBind)(Halogen_Query.modify(Data_Lens_Setter.set(Lenses.message(Data_Profunctor_Strong.strongFn))("")))(function () {
              return Prelude.pure(Control_Monad_Free.freeApplicative)(_3.value0);
          });
      };
      throw new Error("Failed pattern match at Main line 153, column 1 - line 154, column 1: " + [ _3.constructor.name ]);
  };
  var $$interface = Halogen_Component.component(render)($$eval);
  var main = Control_Monad_Aff.runAff(Control_Monad_Eff_Exception.throwException)(Prelude["const"](Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit)))(Prelude.bind(Control_Monad_Aff.bindAff)(Control_Monad_Eff_Class.liftEff(Control_Monad_Aff.monadEffAff)(Save.getSavedState))(function (_2) {
      return Prelude.bind(Control_Monad_Aff.bindAff)(Halogen_Driver.runUI($$interface)(_2))(function (_1) {
          return Prelude.bind(Control_Monad_Aff.bindAff)(Halogen_Util.onLoad(Control_Monad_Aff.monadEffAff)(Halogen_Util.appendToBody(Control_Monad_Eff_Class.monadEffEff)(_1.node)))(function () {
              return Util.schedule([ new Data_Tuple.Tuple(100, _1.driver(Halogen_Query.action(Types.Autoclick.create))), new Data_Tuple.Tuple(15000, _1.driver(Halogen_Query.action(Types.Save.create))) ]);
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

},{"virtual-dom/create-element":4,"virtual-dom/diff":5,"virtual-dom/patch":6,"virtual-dom/virtual-hyperscript/hooks/soft-set-hook":13,"virtual-dom/vnode/vnode":21,"virtual-dom/vnode/vtext":23}]},{},[27]);
