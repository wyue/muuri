/**
* Muuri v0.9.0
* https://github.com/haltu/muuri
* Copyright (c) 2015-present, Haltu Oy
* Released under the MIT license
* https://github.com/haltu/muuri/blob/master/LICENSE.md
* @license MIT
*
* Muuri Packer
* Copyright (c) 2016-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*
* Muuri Ticker / Muuri Emitter / Muuri Queue / Muuri Dragger
* Copyright (c) 2018-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*
* Muuri AutoScroller
* Copyright (c) 2019-present, Niklas Rämö <inramo@gmail.com>
* @license MIT
*/

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.Muuri = factory());
}(this, (function () { 'use strict';

  var GRID_INSTANCES = {};

  var ACTION_SWAP = 'swap';
  var ACTION_MOVE = 'move';

  var EVENT_SYNCHRONIZE = 'synchronize';
  var EVENT_LAYOUT_START = 'layoutStart';
  var EVENT_LAYOUT_END = 'layoutEnd';
  var EVENT_LAYOUT_ABORT = 'layoutAbort';
  var EVENT_ADD = 'add';
  var EVENT_REMOVE = 'remove';
  var EVENT_SHOW_START = 'showStart';
  var EVENT_SHOW_END = 'showEnd';
  var EVENT_HIDE_START = 'hideStart';
  var EVENT_HIDE_END = 'hideEnd';
  var EVENT_FILTER = 'filter';
  var EVENT_SORT = 'sort';
  var EVENT_MOVE = 'move';
  var EVENT_SEND = 'send';
  var EVENT_BEFORE_SEND = 'beforeSend';
  var EVENT_RECEIVE = 'receive';
  var EVENT_BEFORE_RECEIVE = 'beforeReceive';
  var EVENT_DRAG_INIT = 'dragInit';
  var EVENT_DRAG_START = 'dragStart';
  var EVENT_DRAG_MOVE = 'dragMove';
  var EVENT_DRAG_SCROLL = 'dragScroll';
  var EVENT_DRAG_END = 'dragEnd';
  var EVENT_DRAG_RELEASE_START = 'dragReleaseStart';
  var EVENT_DRAG_RELEASE_END = 'dragReleaseEnd';
  var EVENT_DESTROY = 'destroy';

  var HAS_TOUCH_EVENTS = 'ontouchstart' in window;
  var HAS_POINTER_EVENTS = !!window.PointerEvent;
  var HAS_MS_POINTER_EVENTS = !!window.navigator.msPointerEnabled;

  /**
   * Event emitter constructor.
   *
   * @class
   */
  function Emitter() {
    this._events = {};
    this._queue = [];
    this._counter = 0;
    this._isDestroyed = false;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Emitter}
   */
  Emitter.prototype.on = function(event, listener) {
    if (this._isDestroyed) return this;

    // Get listeners queue and create it if it does not exist.
    var listeners = this._events[event];
    if (!listeners) listeners = this._events[event] = [];

    // Add the listener to the queue.
    listeners.push(listener);

    return this;
  };

  /**
   * Unbind all event listeners that match the provided listener function.
   *
   * @public
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {Function} [listener]
   * @returns {Emitter}
   */
  Emitter.prototype.off = function(event, listener) {
    if (this._isDestroyed) return this;

    // Get listeners and return immediately if none is found.
    var listeners = this._events[event];
    if (!listeners || !listeners.length) return this;

    // If no specific listener is provided remove all listeners.
    if (!listener) {
      listeners.length = 0;
      return this;
    }

    // Remove all matching listeners.
    var i = listeners.length;
    while (i--) {
      if (listener === listeners[i]) listeners.splice(i, 1);
    }

    return this;
  };

  /**
   * Emit all listeners in a specified event with the provided arguments.
   *
   * @public
   * @memberof Emitter.prototype
   * @param {String} event
   * @param {*} [arg1]
   * @param {*} [arg2]
   * @param {*} [arg3]
   * @returns {Emitter}
   */
  Emitter.prototype.emit = function(event, arg1, arg2, arg3) {
    if (this._isDestroyed) return this;

    // Get event listeners and quit early if there's no listeners.
    var listeners = this._events[event];
    if (!listeners || !listeners.length) return this;

    var queue = this._queue;
    var qLength = queue.length;
    var aLength = arguments.length - 1;
    var i;

    // Add the current listeners to the callback queue before we process them.
    // This is necessary to guarantee that all of the listeners are called in
    // correct order even if new event listeners are removed/added during
    // processing and/or events are emitted during processing.
    for (i = 0; i < listeners.length; i++) {
      queue.push(listeners[i]);
    }

    // Increment queue counter. This is needed for the scenarios where emit is
    // triggered while the queue is already processing. We need to keep track of
    // how many "queue processors" there are active so that we can safely reset
    // the queue in the end when the last queue processor is finished.
    ++this._counter;

    // Process the queue (the specific part of it for this emit).
    for (i = qLength, qLength = queue.length; i < qLength; i++) {
      // prettier-ignore
      aLength === 0 ? queue[i]() :
      aLength === 1 ? queue[i](arg1) :
      aLength === 2 ? queue[i](arg1, arg2) :
                      queue[i](arg1, arg2, arg3);

      // Stop processing if the emitter is destroyed.
      if (this._isDestroyed) return this;
    }

    // Decrement queue process counter.
    --this._counter;

    // Reset the queue if there are no more queue processes running.
    if (!this._counter) queue.length = 0;

    return this;
  };

  /**
   * Destroy emitter instance. Basically just removes all bound listeners.
   *
   * @public
   * @memberof Emitter.prototype
   * @returns {Emitter}
   */
  Emitter.prototype.destroy = function() {
    if (this._isDestroyed) return this;

    var events = this._events;
    var event;

    // Flag as destroyed.
    this._isDestroyed = true;

    // Reset queue (if queue is currently processing this will also stop that).
    this._queue.length = this._counter = 0;

    // Remove all listeners.
    for (event in events) {
      if (events[event]) {
        events[event].length = 0;
        events[event] = undefined;
      }
    }

    return this;
  };

  var pointerout = HAS_POINTER_EVENTS ? 'pointerout' : HAS_MS_POINTER_EVENTS ? 'MSPointerOut' : '';
  var waitDuration = 100;

  /**
   * If you happen to use Edge or IE on a touch capable device there is a
   * a specific case where pointercancel and pointerend events are never emitted,
   * even though one them should always be emitted when you release your finger
   * from the screen. The bug appears specifically when Muuri shifts the dragged
   * element's position in the DOM after pointerdown event, IE and Edge don't like
   * that behaviour and quite often forget to emit the pointerend/pointercancel
   * event. But, they do emit pointerout event so we utilize that here.
   * Specifically, if there has been no pointermove event within 100 milliseconds
   * since the last pointerout event we force cancel the drag operation. This hack
   * works surprisingly well 99% of the time. There is that 1% chance there still
   * that dragged items get stuck but it is what it is.
   *
   * @class
   * @param {Dragger} dragger
   */
  function EdgeHack(dragger) {
    if (!pointerout) return;

    this._dragger = dragger;
    this._timeout = null;
    this._outEvent = null;
    this._isActive = false;

    this._addBehaviour = this._addBehaviour.bind(this);
    this._removeBehaviour = this._removeBehaviour.bind(this);
    this._onTimeout = this._onTimeout.bind(this);
    this._resetData = this._resetData.bind(this);
    this._onStart = this._onStart.bind(this);
    this._onOut = this._onOut.bind(this);

    this._dragger.on('start', this._onStart);
  }

  /**
   * @private
   * @memberof EdgeHack.prototype
   */
  EdgeHack.prototype._addBehaviour = function() {
    if (this._isActive) return;
    this._isActive = true;
    this._dragger.on('move', this._resetData);
    this._dragger.on('cancel', this._removeBehaviour);
    this._dragger.on('end', this._removeBehaviour);
    window.addEventListener(pointerout, this._onOut);
  };

  /**
   * @private
   * @memberof EdgeHack.prototype
   */
  EdgeHack.prototype._removeBehaviour = function() {
    if (!this._isActive) return;
    this._dragger.off('move', this._resetData);
    this._dragger.off('cancel', this._removeBehaviour);
    this._dragger.off('end', this._removeBehaviour);
    window.removeEventListener(pointerout, this._onOut);
    this._resetData();
    this._isActive = false;
  };

  /**
   * @private
   * @memberof EdgeHack.prototype
   */
  EdgeHack.prototype._resetData = function() {
    window.clearTimeout(this._timeout);
    this._timeout = null;
    this._outEvent = null;
  };

  /**
   * @private
   * @memberof EdgeHack.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  EdgeHack.prototype._onStart = function(e) {
    if (e.pointerType === 'mouse') return;
    this._addBehaviour();
  };

  /**
   * @private
   * @memberof EdgeHack.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  EdgeHack.prototype._onOut = function(e) {
    if (!this._dragger._getTrackedTouch(e)) return;
    this._resetData();
    this._outEvent = e;
    this._timeout = window.setTimeout(this._onTimeout, waitDuration);
  };

  /**
   * @private
   * @memberof EdgeHack.prototype
   */
  EdgeHack.prototype._onTimeout = function() {
    var e = this._outEvent;
    this._resetData();
    if (this._dragger.isActive()) this._dragger._onCancel(e);
  };

  /**
   * @public
   * @memberof EdgeHack.prototype
   */
  EdgeHack.prototype.destroy = function() {
    if (!pointerout) return;
    this._dragger.off('start', this._onStart);
    this._removeBehaviour();
  };

  // Playing it safe here, test all potential prefixes capitalized and lowercase.
  var vendorPrefixes = ['', 'webkit', 'moz', 'ms', 'o', 'Webkit', 'Moz', 'MS', 'O'];

  /**
   * Get prefixed CSS property name when given a non-prefixed CSS property name.
   * Returns null if the property is not supported at all.
   *
   * @param {Object} styleObject
   * @param {String} prop
   * @returns {?String}
   */
  function getPrefixedPropName(styleObject, prop) {
    var camelProp = prop[0].toUpperCase() + prop.slice(1);
    var i = 0;
    var prefixedProp;

    while (i < vendorPrefixes.length) {
      prefixedProp = vendorPrefixes[i] ? vendorPrefixes[i] + camelProp : prop;
      if (prefixedProp in styleObject) return prefixedProp;
      ++i;
    }

    return null;
  }

  /**
   * Check if passive events are supported.
   * https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md#feature-detection
   *
   * @returns {Boolean}
   */
  function hasPassiveEvents() {
    var isPassiveEventsSupported = false;

    try {
      var passiveOpts = Object.defineProperty({}, 'passive', {
        get: function() {
          isPassiveEventsSupported = true;
        }
      });
      window.addEventListener('testPassive', null, passiveOpts);
      window.removeEventListener('testPassive', null, passiveOpts);
    } catch (e) {}

    return isPassiveEventsSupported;
  }

  var ua = window.navigator.userAgent.toLowerCase();
  var isEdge = ua.indexOf('edge') > -1;
  var isIE = ua.indexOf('trident') > -1;
  var isFirefox = ua.indexOf('firefox') > -1;
  var isAndroid = ua.indexOf('android') > -1;

  var listenerOptions = hasPassiveEvents() ? { passive: true } : false;

  var taProp = 'touchAction';
  var taPropPrefixed = getPrefixedPropName(document.documentElement.style, taProp);
  var taDefaultValue = 'auto';

  /**
   * Creates a new Dragger instance for an element.
   *
   * @public
   * @class
   * @param {HTMLElement} element
   * @param {Object} [cssProps]
   */
  function Dragger(element, cssProps) {
    this._element = element;
    this._emitter = new Emitter();
    this._isDestroyed = false;
    this._cssProps = {};
    this._touchAction = '';
    this._isActive = false;

    this._pointerId = null;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;

    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onCancel = this._onCancel.bind(this);
    this._onEnd = this._onEnd.bind(this);

    // Can't believe had to build a freaking class for a hack!
    this._edgeHack = null;
    if ((isEdge || isIE) && (HAS_POINTER_EVENTS || HAS_MS_POINTER_EVENTS)) {
      this._edgeHack = new EdgeHack(this);
    }

    // Apply initial css props.
    this.setCssProps(cssProps);

    // If touch action was not provided with initial css props let's assume it's
    // auto.
    if (!this._touchAction) {
      this.setTouchAction(taDefaultValue);
    }

    // Prevent native link/image dragging for the item and it's children.
    element.addEventListener('dragstart', Dragger._preventDefault, false);

    // Listen to start event.
    element.addEventListener(Dragger._inputEvents.start, this._onStart, listenerOptions);
  }

  /**
   * Protected properties
   * ********************
   */

  Dragger._pointerEvents = {
    start: 'pointerdown',
    move: 'pointermove',
    cancel: 'pointercancel',
    end: 'pointerup'
  };

  Dragger._msPointerEvents = {
    start: 'MSPointerDown',
    move: 'MSPointerMove',
    cancel: 'MSPointerCancel',
    end: 'MSPointerUp'
  };

  Dragger._touchEvents = {
    start: 'touchstart',
    move: 'touchmove',
    cancel: 'touchcancel',
    end: 'touchend'
  };

  Dragger._mouseEvents = {
    start: 'mousedown',
    move: 'mousemove',
    cancel: '',
    end: 'mouseup'
  };

  Dragger._inputEvents = (function() {
    if (HAS_TOUCH_EVENTS) return Dragger._touchEvents;
    if (HAS_POINTER_EVENTS) return Dragger._pointerEvents;
    if (HAS_MS_POINTER_EVENTS) return Dragger._msPointerEvents;
    return Dragger._mouseEvents;
  })();

  Dragger._emitter = new Emitter();

  Dragger._emitterEvents = {
    start: 'start',
    move: 'move',
    end: 'end',
    cancel: 'cancel'
  };

  Dragger._activeInstances = [];

  /**
   * Protected static methods
   * ************************
   */

  Dragger._preventDefault = function(e) {
    if (e.preventDefault && e.cancelable !== false) e.preventDefault();
  };

  Dragger._activateInstance = function(instance) {
    var index = Dragger._activeInstances.indexOf(instance);
    if (index > -1) return;

    Dragger._activeInstances.push(instance);
    Dragger._emitter.on(Dragger._emitterEvents.move, instance._onMove);
    Dragger._emitter.on(Dragger._emitterEvents.cancel, instance._onCancel);
    Dragger._emitter.on(Dragger._emitterEvents.end, instance._onEnd);

    if (Dragger._activeInstances.length === 1) {
      Dragger._bindListeners();
    }
  };

  Dragger._deactivateInstance = function(instance) {
    var index = Dragger._activeInstances.indexOf(instance);
    if (index === -1) return;

    Dragger._activeInstances.splice(index, 1);
    Dragger._emitter.off(Dragger._emitterEvents.move, instance._onMove);
    Dragger._emitter.off(Dragger._emitterEvents.cancel, instance._onCancel);
    Dragger._emitter.off(Dragger._emitterEvents.end, instance._onEnd);

    if (!Dragger._activeInstances.length) {
      Dragger._unbindListeners();
    }
  };

  Dragger._bindListeners = function() {
    window.addEventListener(Dragger._inputEvents.move, Dragger._onMove, listenerOptions);
    window.addEventListener(Dragger._inputEvents.end, Dragger._onEnd, listenerOptions);
    if (Dragger._inputEvents.cancel) {
      window.addEventListener(Dragger._inputEvents.cancel, Dragger._onCancel, listenerOptions);
    }
  };

  Dragger._unbindListeners = function() {
    window.removeEventListener(Dragger._inputEvents.move, Dragger._onMove, listenerOptions);
    window.removeEventListener(Dragger._inputEvents.end, Dragger._onEnd, listenerOptions);
    if (Dragger._inputEvents.cancel) {
      window.removeEventListener(Dragger._inputEvents.cancel, Dragger._onCancel, listenerOptions);
    }
  };

  Dragger._getEventPointerId = function(event) {
    // If we have pointer id available let's use it.
    if (typeof event.pointerId === 'number') {
      return event.pointerId;
    }

    // For touch events let's get the first changed touch's identifier.
    if (event.changedTouches) {
      return event.changedTouches[0] ? event.changedTouches[0].identifier : null;
    }

    // For mouse/other events let's provide a static id.
    return 1;
  };

  Dragger._getTouchById = function(event, id) {
    // If we have a pointer event return the whole event if there's a match, and
    // null otherwise.
    if (typeof event.pointerId === 'number') {
      return event.pointerId === id ? event : null;
    }

    // For touch events let's check if there's a changed touch object that matches
    // the pointerId in which case return the touch object.
    if (event.changedTouches) {
      for (var i = 0; i < event.changedTouches.length; i++) {
        if (event.changedTouches[i].identifier === id) {
          return event.changedTouches[i];
        }
      }
      return null;
    }

    // For mouse/other events let's assume there's only one pointer and just
    // return the event.
    return event;
  };

  Dragger._onMove = function(e) {
    Dragger._emitter.emit(Dragger._emitterEvents.move, e);
  };

  Dragger._onCancel = function(e) {
    Dragger._emitter.emit(Dragger._emitterEvents.cancel, e);
  };

  Dragger._onEnd = function(e) {
    Dragger._emitter.emit(Dragger._emitterEvents.end, e);
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Reset current drag operation (if any).
   *
   * @private
   * @memberof Dragger.prototype
   */
  Dragger.prototype._reset = function() {
    this._pointerId = null;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;
    this._isActive = false;
    Dragger._deactivateInstance(this);
  };

  /**
   * Create a custom dragger event from a raw event.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {String} type
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   * @returns {DraggerEvent}
   */
  Dragger.prototype._createEvent = function(type, e) {
    var touch = this._getTrackedTouch(e);
    return {
      // Hammer.js compatibility interface.
      type: type,
      srcEvent: e,
      distance: this.getDistance(),
      deltaX: this.getDeltaX(),
      deltaY: this.getDeltaY(),
      deltaTime: type === Dragger._emitterEvents.start ? 0 : this.getDeltaTime(),
      isFirst: type === Dragger._emitterEvents.start,
      isFinal: type === Dragger._emitterEvents.end || type === Dragger._emitterEvents.cancel,
      pointerType: e.pointerType || (e.touches ? 'touch' : 'mouse'),
      // Partial Touch API interface.
      identifier: this._pointerId,
      screenX: touch.screenX,
      screenY: touch.screenY,
      clientX: touch.clientX,
      clientY: touch.clientY,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target
    };
  };

  /**
   * Emit a raw event as dragger event internally.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {String} type
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._emit = function(type, e) {
    this._emitter.emit(type, this._createEvent(type, e));
  };

  /**
   * If the provided event is a PointerEvent this method will return it if it has
   * the same pointerId as the instance. If the provided event is a TouchEvent
   * this method will try to look for a Touch instance in the changedTouches that
   * has an identifier matching this instance's pointerId. If the provided event
   * is a MouseEvent (or just any other event than PointerEvent or TouchEvent)
   * it will be returned immediately.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   * @returns {?(Touch|PointerEvent|MouseEvent)}
   */
  Dragger.prototype._getTrackedTouch = function(e) {
    if (this._pointerId === null) return null;
    return Dragger._getTouchById(e, this._pointerId);
  };

  /**
   * Handler for start event.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onStart = function(e) {
    if (this._isDestroyed) return;

    // If pointer id is already assigned let's return early.
    if (this._pointerId !== null) return;

    // Get (and set) pointer id.
    this._pointerId = Dragger._getEventPointerId(e);
    if (this._pointerId === null) return;

    // Setup initial data and emit start event.
    var touch = this._getTrackedTouch(e);
    this._startX = this._currentX = touch.clientX;
    this._startY = this._currentY = touch.clientY;
    this._startTime = Date.now();
    this._isActive = true;
    this._emit(Dragger._emitterEvents.start, e);

    // If the drag procedure was not reset within the start procedure let's
    // activate the instance (start listening to move/cancel/end events).
    if (this._isActive) {
      Dragger._activateInstance(this);
    }
  };

  /**
   * Handler for move event.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onMove = function(e) {
    var touch = this._getTrackedTouch(e);
    if (!touch) return;
    this._currentX = touch.clientX;
    this._currentY = touch.clientY;
    this._emit(Dragger._emitterEvents.move, e);
  };

  /**
   * Handler for cancel event.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onCancel = function(e) {
    if (!this._getTrackedTouch(e)) return;
    this._emit(Dragger._emitterEvents.cancel, e);
    this._reset();
  };

  /**
   * Handler for end event.
   *
   * @private
   * @memberof Dragger.prototype
   * @param {(PointerEvent|TouchEvent|MouseEvent)} e
   */
  Dragger.prototype._onEnd = function(e) {
    if (!this._getTrackedTouch(e)) return;
    this._emit(Dragger._emitterEvents.end, e);
    this._reset();
  };

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Check if the element is being dragged at the moment.
   *
   * @public
   * @memberof Dragger.prototype
   * @returns {Boolean}
   */
  Dragger.prototype.isActive = function() {
    return this._isActive;
  };

  /**
   * Set element's touch-action CSS property.
   *
   * @public
   * @memberof Dragger.prototype
   * @param {String} value
   */
  Dragger.prototype.setTouchAction = function(value) {
    // Store unmodified touch action value (we trust user input here).
    this._touchAction = value;

    // Set touch-action style.
    if (taPropPrefixed) {
      this._cssProps[taPropPrefixed] = '';
      this._element.style[taPropPrefixed] = value;
    }

    // If we have an unsupported touch-action value let's add a special listener
    // that prevents default action on touch start event. A dirty hack, but best
    // we can do for now. The other options would be to somehow polyfill the
    // unsupported touch action behavior with custom heuristics which sounds like
    // a can of worms. We do a special exception here for Firefox Android which's
    // touch-action does not work properly if the dragged element is moved in the
    // the DOM tree on touchstart.
    if (HAS_TOUCH_EVENTS) {
      this._element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, true);
      if (this._element.style[taPropPrefixed] !== value || (isFirefox && isAndroid)) {
        this._element.addEventListener(Dragger._touchEvents.start, Dragger._preventDefault, true);
      }
    }
  };

  /**
   * Update element's CSS properties. Accepts an object with camel cased style
   * props with value pairs as it's first argument.
   *
   * @public
   * @memberof Dragger.prototype
   * @param {Object} [newProps]
   */
  Dragger.prototype.setCssProps = function(newProps) {
    if (!newProps) return;

    var currentProps = this._cssProps;
    var element = this._element;
    var prop;
    var prefixedProp;

    // Reset current props.
    for (prop in currentProps) {
      element.style[prop] = currentProps[prop];
      delete currentProps[prop];
    }

    // Set new props.
    for (prop in newProps) {
      // Make sure we have a value for the prop.
      if (!newProps[prop]) continue;

      // Special handling for touch-action.
      if (prop === taProp) {
        this.setTouchAction(newProps[prop]);
        continue;
      }

      // Get prefixed prop and skip if it does not exist.
      prefixedProp = getPrefixedPropName(element.style, prop);
      if (!prefixedProp) continue;

      // Store the prop and add the style.
      currentProps[prefixedProp] = '';
      element.style[prefixedProp] = newProps[prop];
    }
  };

  /**
   * How much the pointer has moved on x-axis from start position, in pixels.
   * Positive value indicates movement from left to right.
   *
   * @public
   * @memberof Dragger.prototype
   * @returns {Number}
   */
  Dragger.prototype.getDeltaX = function() {
    return this._currentX - this._startX;
  };

  /**
   * How much the pointer has moved on y-axis from start position, in pixels.
   * Positive value indicates movement from top to bottom.
   *
   * @public
   * @memberof Dragger.prototype
   * @returns {Number}
   */
  Dragger.prototype.getDeltaY = function() {
    return this._currentY - this._startY;
  };

  /**
   * How far (in pixels) has pointer moved from start position.
   *
   * @public
   * @memberof Dragger.prototype
   * @returns {Number}
   */
  Dragger.prototype.getDistance = function() {
    var x = this.getDeltaX();
    var y = this.getDeltaY();
    return Math.sqrt(x * x + y * y);
  };

  /**
   * How long has pointer been dragged.
   *
   * @public
   * @memberof Dragger.prototype
   * @returns {Number}
   */
  Dragger.prototype.getDeltaTime = function() {
    return this._startTime ? Date.now() - this._startTime : 0;
  };

  /**
   * Bind drag event listeners.
   *
   * @public
   * @memberof Dragger.prototype
   * @param {String} eventName
   *   - 'start', 'move', 'cancel' or 'end'.
   * @param {Function} listener
   */
  Dragger.prototype.on = function(eventName, listener) {
    this._emitter.on(eventName, listener);
  };

  /**
   * Unbind drag event listeners.
   *
   * @public
   * @memberof Dragger.prototype
   * @param {String} eventName
   *   - 'start', 'move', 'cancel' or 'end'.
   * @param {Function} listener
   */
  Dragger.prototype.off = function(eventName, listener) {
    this._emitter.off(eventName, listener);
  };

  /**
   * Destroy the instance and unbind all drag event listeners.
   *
   * @public
   * @memberof Dragger.prototype
   */
  Dragger.prototype.destroy = function() {
    if (this._isDestroyed) return;

    var element = this._element;

    if (this._edgeHack) this._edgeHack.destroy();

    // Reset data and deactivate the instance.
    this._reset();

    // Destroy emitter.
    this._emitter.destroy();

    // Unbind event handlers.
    element.removeEventListener(Dragger._inputEvents.start, this._onStart, listenerOptions);
    element.removeEventListener('dragstart', Dragger._preventDefault, false);
    element.removeEventListener(Dragger._touchEvents.start, Dragger._preventDefault, true);

    // Reset styles.
    for (var prop in this._cssProps) {
      element.style[prop] = this._cssProps[prop];
      delete this._cssProps[prop];
    }

    // Reset data.
    this._element = null;

    // Mark as destroyed.
    this._isDestroyed = true;
  };

  var dt = 1000 / 60;

  var raf = (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      return this.setTimeout(function() {
        callback(Date.now());
      }, dt);
    }
  ).bind(window);

  /**
   * A ticker system for handling DOM reads and writes in an efficient way.
   * Contains a read queue and a write queue that are processed on the next
   * animation frame when needed.
   *
   * @class
   */
  function Ticker(numLanes) {
    this._nextStep = null;
    this._lanes = [];
    this._stepQueue = [];
    this._stepCallbacks = {};
    this._step = this._step.bind(this);
    for (var i = 0; i < numLanes; i++) {
      this._lanes.push(new TickerLane());
    }
  }

  Ticker.prototype._step = function(time) {
    var lanes = this._lanes;
    var stepQueue = this._stepQueue;
    var stepCallbacks = this._stepCallbacks;
    var i, j, id, laneQueue, laneCallbacks, laneIndices;

    this._nextStep = null;

    for (i = 0; i < lanes.length; i++) {
      laneQueue = lanes[i].queue;
      laneCallbacks = lanes[i].callbacks;
      laneIndices = lanes[i].indices;
      for (j = 0; j < laneQueue.length; j++) {
        id = laneQueue[j];
        if (!id) continue;
        stepQueue.push(id);
        stepCallbacks[id] = laneCallbacks[id];
        delete laneCallbacks[id];
        delete laneIndices[id];
      }
      laneQueue.length = 0;
    }

    for (i = 0; i < stepQueue.length; i++) {
      id = stepQueue[i];
      if (stepCallbacks[id]) stepCallbacks[id](time);
      delete stepCallbacks[id];
    }

    stepQueue.length = 0;
  };

  Ticker.prototype.add = function(laneIndex, id, callback) {
    this._lanes[laneIndex].add(id, callback);
    if (!this._nextStep) this._nextStep = raf(this._step);
  };

  Ticker.prototype.remove = function(laneIndex, id) {
    this._lanes[laneIndex].remove(id);
  };

  /**
   * A lane for ticker.
   *
   * @class
   */
  function TickerLane() {
    this.queue = [];
    this.indices = {};
    this.callbacks = {};
  }

  TickerLane.prototype.add = function(id, callback) {
    var index = this.indices[id];
    if (index !== undefined) this.queue[index] = undefined;
    this.queue.push(id);
    this.callbacks[id] = callback;
    this.indices[id] = this.queue.length - 1;
  };

  TickerLane.prototype.remove = function(id) {
    var index = this.indices[id];
    if (index === undefined) return;
    this.queue[index] = undefined;
    delete this.callbacks[id];
    delete this.indices[id];
  };

  var LAYOUT_READ = 'layoutRead';
  var LAYOUT_WRITE = 'layoutWrite';
  var VISIBILITY_READ = 'visibilityRead';
  var VISIBILITY_WRITE = 'visibilityWrite';
  var DRAG_START_READ = 'dragStartRead';
  var DRAG_START_WRITE = 'dragStartWrite';
  var DRAG_MOVE_READ = 'dragMoveRead';
  var DRAG_MOVE_WRITE = 'dragMoveWrite';
  var DRAG_SCROLL_READ = 'dragScrollRead';
  var DRAG_SCROLL_WRITE = 'dragScrollWrite';
  var DRAG_SORT_READ = 'dragSortRead';
  var PLACEHOLDER_LAYOUT_READ = 'placeholderLayoutRead';
  var PLACEHOLDER_LAYOUT_WRITE = 'placeholderLayoutWrite';
  var PLACEHOLDER_RESIZE_WRITE = 'placeholderResizeWrite';
  var AUTO_SCROLL_READ = 'autoScrollRead';
  var AUTO_SCROLL_WRITE = 'autoScrollWrite';
  var DEBOUNCE_READ = 'debounceRead';

  var LANE_READ = 0;
  var LANE_READ_TAIL = 1;
  var LANE_WRITE = 2;

  var ticker = new Ticker(3);

  function addLayoutTick(itemId, read, write) {
    ticker.add(LANE_READ, LAYOUT_READ + itemId, read);
    ticker.add(LANE_WRITE, LAYOUT_WRITE + itemId, write);
  }

  function cancelLayoutTick(itemId) {
    ticker.remove(LANE_READ, LAYOUT_READ + itemId);
    ticker.remove(LANE_WRITE, LAYOUT_WRITE + itemId);
  }

  function addVisibilityTick(itemId, read, write) {
    ticker.add(LANE_READ, VISIBILITY_READ + itemId, read);
    ticker.add(LANE_WRITE, VISIBILITY_WRITE + itemId, write);
  }

  function cancelVisibilityTick(itemId) {
    ticker.remove(LANE_READ, VISIBILITY_READ + itemId);
    ticker.remove(LANE_WRITE, VISIBILITY_WRITE + itemId);
  }

  function addDragStartTick(itemId, read, write) {
    ticker.add(LANE_READ, DRAG_START_READ + itemId, read);
    ticker.add(LANE_WRITE, DRAG_START_WRITE + itemId, write);
  }

  function cancelDragStartTick(itemId) {
    ticker.remove(LANE_READ, DRAG_START_READ + itemId);
    ticker.remove(LANE_WRITE, DRAG_START_WRITE + itemId);
  }

  function addDragMoveTick(itemId, read, write) {
    ticker.add(LANE_READ, DRAG_MOVE_READ + itemId, read);
    ticker.add(LANE_WRITE, DRAG_MOVE_WRITE + itemId, write);
  }

  function cancelDragMoveTick(itemId) {
    ticker.remove(LANE_READ, DRAG_MOVE_READ + itemId);
    ticker.remove(LANE_WRITE, DRAG_MOVE_WRITE + itemId);
  }

  function addDragScrollTick(itemId, read, write) {
    ticker.add(LANE_READ, DRAG_SCROLL_READ + itemId, read);
    ticker.add(LANE_WRITE, DRAG_SCROLL_WRITE + itemId, write);
  }

  function cancelDragScrollTick(itemId) {
    ticker.remove(LANE_READ, DRAG_SCROLL_READ + itemId);
    ticker.remove(LANE_WRITE, DRAG_SCROLL_WRITE + itemId);
  }

  function addDragSortTick(itemId, read) {
    ticker.add(LANE_READ_TAIL, DRAG_SORT_READ + itemId, read);
  }

  function cancelDragSortTick(itemId) {
    ticker.remove(LANE_READ_TAIL, DRAG_SORT_READ + itemId);
  }

  function addPlaceholderLayoutTick(itemId, read, write) {
    ticker.add(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId, read);
    ticker.add(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId, write);
  }

  function cancelPlaceholderLayoutTick(itemId) {
    ticker.remove(LANE_READ, PLACEHOLDER_LAYOUT_READ + itemId);
    ticker.remove(LANE_WRITE, PLACEHOLDER_LAYOUT_WRITE + itemId);
  }

  function addPlaceholderResizeTick(itemId, write) {
    ticker.add(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId, write);
  }

  function cancelPlaceholderResizeTick(itemId) {
    ticker.remove(LANE_WRITE, PLACEHOLDER_RESIZE_WRITE + itemId);
  }

  function addAutoScrollTick(read, write) {
    ticker.add(LANE_READ, AUTO_SCROLL_READ, read);
    ticker.add(LANE_WRITE, AUTO_SCROLL_WRITE, write);
  }

  function cancelAutoScrollTick() {
    ticker.remove(LANE_READ, AUTO_SCROLL_READ);
    ticker.remove(LANE_WRITE, AUTO_SCROLL_WRITE);
  }

  function addDebounceTick(debounceId, read) {
    ticker.add(LANE_READ, DEBOUNCE_READ + debounceId, read);
  }

  function cancelDebounceTick(debounceId) {
    ticker.remove(LANE_READ, DEBOUNCE_READ + debounceId);
  }

  var AXIS_X = 1;
  var AXIS_Y = 2;
  var FORWARD = 4;
  var BACKWARD = 8;
  var LEFT = AXIS_X | BACKWARD;
  var RIGHT = AXIS_X | FORWARD;
  var UP = AXIS_Y | BACKWARD;
  var DOWN = AXIS_Y | FORWARD;

  var functionType = 'function';

  /**
   * Check if a value is a function.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isFunction(val) {
    return typeof val === functionType;
  }

  var stylesCache = typeof Map === 'function' ? new Map() : null;
  var cacheCleanInterval = 3000;
  var cacheCleanTimer;
  var canCleanCache = true;
  var cacheCleanCheck = function() {
    if (canCleanCache) {
      cacheCleanTimer = window.clearInterval(cacheCleanTimer);
      stylesCache.clear();
    } else {
      canCleanCache = true;
    }
  };

  /**
   * Returns the computed value of an element's style property as a string.
   *
   * @param {HTMLElement} element
   * @param {String} style
   * @returns {String}
   */
  function getStyle(element, style) {
    var styles = stylesCache && stylesCache.get(element);

    if (!styles) {
      styles = window.getComputedStyle(element, null);
      if (stylesCache) stylesCache.set(element, styles);
    }

    if (stylesCache) {
      if (!cacheCleanTimer) {
        cacheCleanTimer = window.setInterval(cacheCleanCheck, cacheCleanInterval);
      } else {
        canCleanCache = false;
      }
    }

    return styles.getPropertyValue(style);
  }

  /**
   * Returns the computed value of an element's style property transformed into
   * a float value.
   *
   * @param {HTMLElement} el
   * @param {String} style
   * @returns {Number}
   */
  function getStyleAsFloat(el, style) {
    return parseFloat(getStyle(el, style)) || 0;
  }

  var transformProp = getPrefixedPropName(document.documentElement.style, 'transform') || 'transform';

  var styleNameRegEx = /([A-Z])/g;
  var prefixRegex = /^(webkit-|moz-|ms-|o-)/;
  var msPrefixRegex = /^(-m-s-)/;

  /**
   * Transforms a camel case style property to kebab case style property. Handles
   * vendor prefixed properties elegantly as well, e.g. "WebkitTransform" and
   * "webkitTransform" are both transformed into "-webkit-transform".
   *
   * @param {String} property
   * @returns {String}
   */
  function getStyleName(property) {
    // Initial slicing, turns "fooBarProp" into "foo-bar-prop".
    var styleName = property.replace(styleNameRegEx, '-$1').toLowerCase();

    // Handle properties that start with "webkit", "moz", "ms" or "o" prefix (we
    // need to add an extra '-' to the beginnig).
    styleName = styleName.replace(prefixRegex, '-$1');

    // Handle properties that start with "MS" prefix (we need to transform the
    // "-m-s-" into "-ms-").
    styleName = styleName.replace(msPrefixRegex, '-ms-');

    return styleName;
  }

  var transformStyle = getStyleName(transformProp);

  var transformNone = 'none';
  var displayInline = 'inline';
  var displayNone = 'none';
  var displayStyle = 'display';

  /**
   * Returns true if element is transformed, false if not. In practice the
   * element's display value must be anything else than "none" or "inline" as
   * well as have a valid transform value applied in order to be counted as a
   * transformed element.
   *
   * Borrowed from Mezr (v0.6.1):
   * https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L661
   *
   * @param {HTMLElement} element
   * @returns {Boolean}
   */
  function isTransformed(element) {
    var transform = getStyle(element, transformStyle);
    if (!transform || transform === transformNone) return false;

    var display = getStyle(element, displayStyle);
    if (display === displayInline || display === displayNone) return false;

    return true;
  }

  var DOC_ELEM = document.documentElement;
  var BODY = document.body;
  var THRESHOLD_DATA = { value: 0, offset: 0 };

  /**
   * @param {HTMLElement|Window} element
   * @returns {HTMLElement|Window}
   */
  function getScrollElement(element) {
    if (element === window || element === DOC_ELEM || element === BODY) {
      return window;
    } else {
      return element;
    }
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollLeft(element) {
    return element === window ? element.pageXOffset : element.scrollLeft;
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollTop(element) {
    return element === window ? element.pageYOffset : element.scrollTop;
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollLeftMax(element) {
    if (element === window) {
      return DOC_ELEM.scrollWidth - DOC_ELEM.clientWidth;
    } else {
      return element.scrollWidth - element.clientWidth;
    }
  }

  /**
   * @param {HTMLElement|Window} element
   * @returns {Number}
   */
  function getScrollTopMax(element) {
    if (element === window) {
      return DOC_ELEM.scrollHeight - DOC_ELEM.clientHeight;
    } else {
      return element.scrollHeight - element.clientHeight;
    }
  }

  /**
   * Get window's or element's client rectangle data relative to the element's
   * content dimensions (includes inner size + padding, excludes scrollbars,
   * borders and margins).
   *
   * @param {HTMLElement|Window} element
   * @returns {Rectangle}
   */
  function getContentRect(element, result) {
    result = result || {};

    if (element === window) {
      result.width = DOC_ELEM.clientWidth;
      result.height = DOC_ELEM.clientHeight;
      result.left = 0;
      result.right = result.width;
      result.top = 0;
      result.bottom = result.height;
    } else {
      var bcr = element.getBoundingClientRect();
      var borderLeft = element.clientLeft || getStyleAsFloat(element, 'border-left-width');
      var borderTop = element.clientTop || getStyleAsFloat(element, 'border-top-width');
      result.width = element.clientWidth;
      result.height = element.clientHeight;
      result.left = bcr.left + borderLeft;
      result.right = result.left + result.width;
      result.top = bcr.top + borderTop;
      result.bottom = result.top + result.height;
    }

    return result;
  }

  /**
   * @param {Item} item
   * @returns {Object}
   */
  function getItemAutoScrollSettings(item) {
    return item._drag._getGrid()._settings.dragAutoScroll;
  }

  /**
   * @param {Item} item
   */
  function prepareItemDragScroll(item) {
    if (item._drag) item._drag._prepareScroll();
  }

  /**
   * @param {Item} item
   */
  function applyItemDragScroll(item) {
    if (item._drag) item._drag._applyScroll();
  }

  /**
   * Check if the target element's position is affected by the scrolling of the
   * scroll element.
   *
   * @param {HTMLElement} targetElement
   * @param {HTMLElement|Window} scrollElement
   * @returns {Boolean}
   */
  function isAffectedByScroll(targetElement, scrollElement) {
    if (
      // If scroll element is target element -> not affected.
      targetElement === scrollElement ||
      // If scroll element does not contain the item element -> not affected.
      (scrollElement !== window && !scrollElement.contains(targetElement))
    ) {
      return false;
    }

    var el = targetElement;
    var isAffected = true;

    // There are many cases where the target element might not be affected by the
    // scroll, but here we just check the most common one -> if there is a fixed
    // element between the target element and scroll element and there are no
    // transformed elements between the fixed element and scroll element.
    while (el !== scrollElement) {
      el = el.parentElement || scrollElement;
      if (el === window) break;

      if (!isAffected && isTransformed(el)) {
        isAffected = true;
      }

      if (isAffected && el !== scrollElement && getStyle(el, 'position') === 'fixed') {
        isAffected = false;
      }
    }

    return isAffected;
  }

  /**
   * Compute threshold value and edge offset.
   *
   * @param {Number} threshold
   * @param {(Number|undefined)} scrollElement
   * @param {Number} safeZone
   * @param {Number} itemSize
   * @param {Number} targetSize
   * @returns {Object}
   */
  function computeThreshold(threshold, targetThreshold, safeZone, itemSize, targetSize) {
    THRESHOLD_DATA.value = Math.min(
      targetSize / 2,
      typeof targetThreshold === 'number' ? targetThreshold : threshold
    );
    THRESHOLD_DATA.offset =
      Math.max(0, itemSize + THRESHOLD_DATA.value * 2 + targetSize * safeZone - targetSize) / 2;
    return THRESHOLD_DATA;
  }

  function ScrollRequest() {
    this.reset();
  }

  ScrollRequest.prototype.reset = function() {
    if (this.isActive) this.onStop();
    this.item = null;
    this.element = null;
    this.isActive = false;
    this.isEnding = false;
    this.direction = null;
    this.value = null;
    this.maxValue = 0;
    this.threshold = 0;
    this.distance = 0;
    this.speed = 0;
    this.duration = 0;
    this.action = null;
  };

  ScrollRequest.prototype.hasReachedEnd = function() {
    return FORWARD & this.direction ? this.value >= this.maxValue : this.value <= 0;
  };

  ScrollRequest.prototype.computeCurrentScrollValue = function() {
    if (this.value === null) {
      return AXIS_X & this.direction ? getScrollLeft(this.element) : getScrollTop(this.element);
    }
    return Math.max(0, Math.min(this.value, this.maxValue));
  };

  ScrollRequest.prototype.computeNextScrollValue = function(deltaTime) {
    var delta = this.speed * (deltaTime / 1000);
    var nextValue = FORWARD & this.direction ? this.value + delta : this.value - delta;
    return Math.max(0, Math.min(nextValue, this.maxValue));
  };

  ScrollRequest.prototype.computeSpeed = (function() {
    var data = {
      direction: null,
      threshold: 0,
      distance: 0,
      value: 0,
      maxValue: 0,
      deltaTime: 0,
      duration: 0,
      isEnding: false
    };

    return function(deltaTime) {
      var item = this.item;
      var speed = getItemAutoScrollSettings(item).speed;

      if (isFunction(speed)) {
        data.direction = this.direction;
        data.threshold = this.threshold;
        data.distance = this.distance;
        data.value = this.value;
        data.maxValue = this.maxValue;
        data.duration = this.duration;
        data.speed = this.speed;
        data.deltaTime = deltaTime;
        data.isEnding = this.isEnding;
        return speed(item, this.element, data);
      } else {
        return speed;
      }
    };
  })();

  ScrollRequest.prototype.tick = function(deltaTime) {
    if (!this.isActive) {
      this.isActive = true;
      this.onStart();
    }
    this.value = this.computeCurrentScrollValue();
    this.speed = this.computeSpeed(deltaTime);
    this.value = this.computeNextScrollValue(deltaTime);
    this.duration += deltaTime;
    return this.value;
  };

  ScrollRequest.prototype.onStart = function() {
    var item = this.item;
    var onStart = getItemAutoScrollSettings(item).onStart;
    if (isFunction(onStart)) onStart(item, this.element, this.direction);
  };

  ScrollRequest.prototype.onStop = function() {
    var item = this.item;
    var onStop = getItemAutoScrollSettings(item).onStop;
    if (isFunction(onStop)) onStop(item, this.element, this.direction);
    // Manually nudge sort to happen. There's a good chance that the item is still
    // after the scroll stops which means that the next sort will be triggered
    // only after the item is moved or it's parent scrolled.
    if (item._drag) item._drag.sort();
  };

  function ScrollAction() {
    this.element = null;
    this.requestX = null;
    this.requestY = null;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }

  ScrollAction.prototype.reset = function() {
    if (this.requestX) this.requestX.action = null;
    if (this.requestY) this.requestY.action = null;
    this.element = null;
    this.requestX = null;
    this.requestY = null;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  };

  ScrollAction.prototype.addRequest = function(request) {
    if (AXIS_X & request.direction) {
      this.removeRequest(this.requestX);
      this.requestX = request;
    } else {
      this.removeRequest(this.requestY);
      this.requestY = request;
    }
    request.action = this;
  };

  ScrollAction.prototype.removeRequest = function(request) {
    if (!request) return;
    if (this.requestX === request) {
      this.requestX = null;
      request.action = null;
    } else if (this.requestY === request) {
      this.requestY = null;
      request.action = null;
    }
  };

  ScrollAction.prototype.computeScrollValues = function() {
    this.scrollLeft = this.requestX ? this.requestX.value : getScrollLeft(this.element);
    this.scrollTop = this.requestY ? this.requestY.value : getScrollTop(this.element);
  };

  ScrollAction.prototype.scroll = function() {
    var element = this.element;
    if (!element) return;

    if (element.scrollTo) {
      element.scrollTo(this.scrollLeft, this.scrollTop);
    } else {
      element.scrollLeft = this.scrollLeft;
      element.scrollTop = this.scrollTop;
    }
  };

  function Pool(createItem, releaseItem) {
    this.pool = [];
    this.createItem = createItem;
    this.releaseItem = releaseItem;
  }

  Pool.prototype.pick = function() {
    return this.pool.pop() || this.createItem();
  };

  Pool.prototype.release = function(item) {
    this.releaseItem(item);
    if (this.pool.indexOf(item) !== -1) return;
    this.pool.push(item);
  };

  Pool.prototype.reset = function() {
    this.pool.length = 0;
  };

  /**
   * Check if two rectangles are overlapping.
   *
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   */
  function isOverlapping(a, b) {
    return !(
      a.left + a.width <= b.left ||
      b.left + b.width <= a.left ||
      a.top + a.height <= b.top ||
      b.top + b.height <= a.top
    );
  }

  /**
   * Calculate intersection area between two rectangle.
   *
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   */
  function getIntersectionArea(a, b) {
    if (!isOverlapping(a, b)) return 0;
    var width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
    var height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
    return width * height;
  }

  /**
   * Calculate how many percent the intersection area of two rectangles is from
   * the maximum potential intersection area between the rectangles.
   *
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Number}
   */
  function getIntersectionScore(a, b) {
    var area = getIntersectionArea(a, b);
    if (!area) return 0;
    var maxArea = Math.min(a.width, b.width) * Math.min(a.height, b.height);
    return (area / maxArea) * 100;
  }

  var REQUEST_POOL = new Pool(
    function() {
      return new ScrollRequest();
    },
    function(request) {
      request.reset();
    }
  );

  var ACTION_POOL = new Pool(
    function() {
      return new ScrollAction();
    },
    function(action) {
      action.reset();
    }
  );

  var RECT_1 = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };

  var RECT_2 = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  };

  var OVERLAP_CHECK_INTERVAL = 150;

  function AutoScroller() {
    this._isTicking = false;
    this._tickTime = 0;
    this._tickDeltaTime = 0;
    this._items = [];
    this._syncItems = [];
    this._actions = [];
    this._requests = {};
    this._requests[AXIS_X] = {};
    this._requests[AXIS_Y] = {};
    this._requestOverlapCheck = {};
    this._dragPositions = {};
    this._readTick = this._readTick.bind(this);
    this._writeTick = this._writeTick.bind(this);
  }

  AutoScroller.AXIS_X = AXIS_X;
  AutoScroller.AXIS_Y = AXIS_Y;
  AutoScroller.LEFT = LEFT;
  AutoScroller.RIGHT = RIGHT;
  AutoScroller.UP = UP;
  AutoScroller.DOWN = DOWN;

  AutoScroller.smoothSpeed = function(maxSpeed, acceleration, deceleration) {
    return function(item, element, data) {
      var targetSpeed = 0;
      if (!data.isEnding) {
        if (data.threshold > 0) {
          var factor = data.threshold - Math.max(0, data.distance);
          targetSpeed = (maxSpeed / data.threshold) * factor;
        } else {
          targetSpeed = maxSpeed;
        }
      }

      var currentSpeed = data.speed;
      var nextSpeed = targetSpeed;

      if (currentSpeed === targetSpeed) {
        return nextSpeed;
      }

      if (currentSpeed < targetSpeed) {
        nextSpeed = currentSpeed + acceleration * (data.deltaTime / 1000);
        return Math.min(targetSpeed, nextSpeed);
      } else {
        nextSpeed = currentSpeed - deceleration * (data.deltaTime / 1000);
        return Math.max(targetSpeed, nextSpeed);
      }
    };
  };

  AutoScroller.pointerHandle = function(pointerSize) {
    var rect = { left: 0, top: 0, width: 0, height: 0 };
    var size = pointerSize || 1;
    return function(item, x, y, w, h, pX, pY) {
      rect.left = pX - size * 0.5;
      rect.top = pY - size * 0.5;
      rect.width = size;
      rect.height = size;
      return rect;
    };
  };

  AutoScroller.prototype._readTick = function(time) {
    if (time && this._tickTime) {
      this._tickDeltaTime = time - this._tickTime;
      this._tickTime = time;
      this._updateRequests();
      this._updateActions();
    } else {
      this._tickTime = time;
      this._tickDeltaTime = 0;
    }
  };

  AutoScroller.prototype._writeTick = function() {
    this._applyActions();
    addAutoScrollTick(this._readTick, this._writeTick);
  };

  AutoScroller.prototype._startTicking = function() {
    this._isTicking = true;
    addAutoScrollTick(this._readTick, this._writeTick);
  };

  AutoScroller.prototype._stopTicking = function() {
    this._isTicking = false;
    this._tickTime = 0;
    this._tickDeltaTime = 0;
    cancelAutoScrollTick();
  };

  AutoScroller.prototype._getItemDragDirection = function(item, axis) {
    var positions = this._dragPositions[item._id];
    if (!positions || positions.length < 4) return 0;

    var isAxisX = axis === AXIS_X;
    var curr = positions[isAxisX ? 0 : 1];
    var prev = positions[isAxisX ? 2 : 3];

    if (curr > prev) {
      return isAxisX ? RIGHT : DOWN;
    } else if (curr < prev) {
      return isAxisX ? LEFT : UP;
    } else {
      return 0;
    }
  };

  AutoScroller.prototype._getItemHandleRect = function(item, handle, rect) {
    var itemDrag = item._drag;

    if (handle) {
      var ev = itemDrag._dragMoveEvent || itemDrag._dragStartEvent;
      var data = handle(
        item,
        itemDrag._clientX,
        itemDrag._clientY,
        item._width,
        item._height,
        ev.clientX,
        ev.clientY
      );
      rect.left = data.left;
      rect.top = data.top;
      rect.width = data.width;
      rect.height = data.height;
    } else {
      rect.left = itemDrag._clientX;
      rect.top = itemDrag._clientY;
      rect.width = item._width;
      rect.height = item._height;
    }

    rect.right = rect.left + rect.width;
    rect.bottom = rect.top + rect.height;

    return rect;
  };

  AutoScroller.prototype._requestItemScroll = function(
    item,
    axis,
    element,
    direction,
    threshold,
    distance,
    maxValue
  ) {
    var reqMap = this._requests[axis];
    var request = reqMap[item._id];

    if (request) {
      if (request.element !== element || request.direction !== direction) {
        request.reset();
      }
    } else {
      request = REQUEST_POOL.pick();
    }

    request.item = item;
    request.element = element;
    request.direction = direction;
    request.threshold = threshold;
    request.distance = distance;
    request.maxValue = maxValue;
    reqMap[item._id] = request;
  };

  AutoScroller.prototype._cancelItemScroll = function(item, axis) {
    var reqMap = this._requests[axis];
    var request = reqMap[item._id];
    if (!request) return;
    if (request.action) request.action.removeRequest(request);
    REQUEST_POOL.release(request);
    delete reqMap[item._id];
  };

  AutoScroller.prototype._checkItemOverlap = function(item, checkX, checkY) {
    var settings = getItemAutoScrollSettings(item);
    var targets = isFunction(settings.targets) ? settings.targets(item) : settings.targets;
    var threshold = settings.threshold;
    var safeZone = settings.safeZone;

    if (!targets || !targets.length) {
      checkX && this._cancelItemScroll(item, AXIS_X);
      checkY && this._cancelItemScroll(item, AXIS_Y);
      return;
    }

    var dragDirectionX = this._getItemDragDirection(item, AXIS_X);
    var dragDirectionY = this._getItemDragDirection(item, AXIS_Y);

    if (!dragDirectionX && !dragDirectionY) {
      checkX && this._cancelItemScroll(item, AXIS_X);
      checkY && this._cancelItemScroll(item, AXIS_Y);
      return;
    }

    var itemRect = this._getItemHandleRect(item, settings.handle, RECT_1);
    var testRect = RECT_2;

    var target = null;
    var testElement = null;
    var testAxisX = true;
    var testAxisY = true;
    var testScore = 0;
    var testPriority = 0;
    var testThreshold = null;
    var testDirection = null;
    var testDistance = 0;
    var testMaxScrollX = 0;
    var testMaxScrollY = 0;

    var xElement = null;
    var xPriority = -Infinity;
    var xThreshold = 0;
    var xScore = 0;
    var xDirection = null;
    var xDistance = 0;
    var xMaxScroll = 0;

    var yElement = null;
    var yPriority = -Infinity;
    var yThreshold = 0;
    var yScore = 0;
    var yDirection = null;
    var yDistance = 0;
    var yMaxScroll = 0;

    for (var i = 0; i < targets.length; i++) {
      target = targets[i];
      testAxisX = checkX && dragDirectionX && target.axis !== AXIS_Y;
      testAxisY = checkY && dragDirectionY && target.axis !== AXIS_X;
      testPriority = target.priority || 0;

      // Ignore this item if it's x-axis and y-axis priority is lower than
      // the currently matching item's.
      if ((!testAxisX || testPriority < xPriority) && (!testAxisY || testPriority < yPriority)) {
        continue;
      }

      testElement = getScrollElement(target.element || target);
      testMaxScrollX = testAxisX ? getScrollLeftMax(testElement) : -1;
      testMaxScrollY = testAxisY ? getScrollTopMax(testElement) : -1;

      // Ignore this item if there is no possibility to scroll.
      if (!testMaxScrollX && !testMaxScrollY) continue;

      testRect = getContentRect(testElement, testRect);
      testScore = getIntersectionScore(itemRect, testRect);

      // Ignore this item if it's not overlapping at all with the dragged item.
      if (testScore <= 0) continue;

      // Test x-axis.
      if (
        testAxisX &&
        testPriority >= xPriority &&
        testMaxScrollX > 0 &&
        (testPriority > xPriority || testScore > xScore)
      ) {
        testDirection = null;
        testThreshold = computeThreshold(
          threshold,
          target.threshold,
          safeZone,
          itemRect.width,
          testRect.width
        );
        if (dragDirectionX === RIGHT) {
          testDistance = testRect.right + testThreshold.offset - itemRect.right;
          if (testDistance <= testThreshold.value && getScrollLeft(testElement) < testMaxScrollX) {
            testDirection = RIGHT;
          }
        } else if (dragDirectionX === LEFT) {
          testDistance = itemRect.left - (testRect.left - testThreshold.offset);
          if (testDistance <= testThreshold.value && getScrollLeft(testElement) > 0) {
            testDirection = LEFT;
          }
        }

        if (testDirection !== null) {
          xElement = testElement;
          xPriority = testPriority;
          xThreshold = testThreshold.value;
          xScore = testScore;
          xDirection = testDirection;
          xDistance = testDistance;
          xMaxScroll = testMaxScrollX;
        }
      }

      // Test y-axis.
      if (
        testAxisY &&
        testPriority >= yPriority &&
        testMaxScrollY > 0 &&
        (testPriority > yPriority || testScore > yScore)
      ) {
        testDirection = null;
        testThreshold = computeThreshold(
          threshold,
          target.threshold,
          safeZone,
          itemRect.height,
          testRect.height
        );
        if (dragDirectionY === DOWN) {
          testDistance = testRect.bottom + testThreshold.offset - itemRect.bottom;
          if (testDistance <= testThreshold.value && getScrollTop(testElement) < testMaxScrollY) {
            testDirection = DOWN;
          }
        } else if (dragDirectionY === UP) {
          testDistance = itemRect.top - (testRect.top - testThreshold.offset);
          if (testDistance <= testThreshold.value && getScrollTop(testElement) > 0) {
            testDirection = UP;
          }
        }

        if (testDirection !== null) {
          yElement = testElement;
          yPriority = testPriority;
          yThreshold = testThreshold.value;
          yScore = testScore;
          yDirection = testDirection;
          yDistance = testDistance;
          yMaxScroll = testMaxScrollY;
        }
      }
    }

    // Request or cancel x-axis scroll.
    if (checkX) {
      if (xElement) {
        this._requestItemScroll(
          item,
          AXIS_X,
          xElement,
          xDirection,
          xThreshold,
          xDistance,
          xMaxScroll
        );
      } else {
        this._cancelItemScroll(item, AXIS_X);
      }
    }

    // Request or cancel y-axis scroll.
    if (checkY) {
      if (yElement) {
        this._requestItemScroll(
          item,
          AXIS_Y,
          yElement,
          yDirection,
          yThreshold,
          yDistance,
          yMaxScroll
        );
      } else {
        this._cancelItemScroll(item, AXIS_Y);
      }
    }
  };

  AutoScroller.prototype._updateScrollRequest = function(scrollRequest) {
    var item = scrollRequest.item;
    var settings = getItemAutoScrollSettings(item);
    var targets = isFunction(settings.targets) ? settings.targets(item) : settings.targets;
    var threshold = settings.threshold;
    var safeZone = settings.safeZone;

    // Quick exit if no scroll items are found.
    if (!targets || !targets.length) {
      return false;
    }

    var itemRect = this._getItemHandleRect(item, settings.handle, RECT_1);
    var testRect = RECT_2;

    var target = null;
    var testElement = null;
    var testIsAxisX = false;
    var testScore = null;
    var testThreshold = null;
    var testDistance = null;
    var testScroll = null;
    var testMaxScroll = null;
    var hasReachedEnd = null;

    for (var i = 0; i < targets.length; i++) {
      target = targets[i];

      // Make sure we have a matching element.
      testElement = getScrollElement(target.element || target);
      if (testElement !== scrollRequest.element) continue;

      // Make sure we have a matching axis.
      testIsAxisX = !!(AXIS_X & scrollRequest.direction);
      if (testIsAxisX) {
        if (target.axis === AXIS_Y) continue;
      } else {
        if (target.axis === AXIS_X) continue;
      }

      // Stop scrolling if there is no room to scroll anymore.
      testMaxScroll = testIsAxisX ? getScrollLeftMax(testElement) : getScrollTopMax(testElement);
      if (testMaxScroll <= 0) {
        break;
      }

      testRect = getContentRect(testElement, testRect);
      testScore = getIntersectionScore(itemRect, testRect);

      // Stop scrolling if dragged item is not overlapping with the scroll
      // element anymore.
      if (testScore <= 0) {
        break;
      }

      // Compute threshold and edge offset.
      if (testIsAxisX) {
        testThreshold = computeThreshold(
          threshold,
          target.threshold,
          safeZone,
          itemRect.width,
          testRect.width
        );
      } else {
        testThreshold = computeThreshold(
          threshold,
          target.threshold,
          safeZone,
          itemRect.height,
          testRect.height
        );
      }

      // Compute distance (based on current direction).
      if (scrollRequest.direction === LEFT) {
        testDistance = itemRect.left - (testRect.left - testThreshold.offset);
      } else if (scrollRequest.direction === RIGHT) {
        testDistance = testRect.right + testThreshold.offset - itemRect.right;
      } else if (scrollRequest.direction === UP) {
        testDistance = itemRect.top - (testRect.top - testThreshold.offset);
      } else {
        testDistance = testRect.bottom + testThreshold.offset - itemRect.bottom;
      }

      // Stop scrolling if threshold is not exceeded.
      if (testDistance > testThreshold.value) {
        break;
      }

      // Stop scrolling if we have reached the end of the scroll value.
      testScroll = testIsAxisX ? getScrollLeft(testElement) : getScrollTop(testElement);
      hasReachedEnd =
        FORWARD & scrollRequest.direction ? testScroll >= testMaxScroll : testScroll <= 0;
      if (hasReachedEnd) {
        break;
      }

      // Scrolling can continue, let's update the values.
      scrollRequest.maxValue = testMaxScroll;
      scrollRequest.threshold = testThreshold.value;
      scrollRequest.distance = testDistance;
      scrollRequest.isEnding = false;
      return true;
    }

    // Let's start the end procedure. The request has now "officially" stopped,
    // but we don't want to make the scroll stop instantly. Let's smoothly reduce
    // the speed to zero.
    scrollRequest.isEnding = true;

    // If smooth stop is not supported we can immediately stop scrolling.
    if (!settings.smoothStop) return false;

    // We stop scrolling immediately when speed is zero.
    if (scrollRequest.speed <= 0) return false;

    // We can also stop scrolling immediately when scroll has reached the end.
    // Note that we intentionally do not update the scroll request's data when
    // it is in ending mode, as there really is no need to. We just want the
    // scroll to slow down and stop with the values it has.
    if (hasReachedEnd === null) hasReachedEnd = scrollRequest.hasReachedEnd();
    return hasReachedEnd ? false : true;
  };

  AutoScroller.prototype._updateRequests = function() {
    var items = this._items;
    var requestsX = this._requests[AXIS_X];
    var requestsY = this._requests[AXIS_Y];
    var item, reqX, reqY, checkTime, needsCheck, checkX, checkY;

    for (var i = 0; i < items.length; i++) {
      item = items[i];
      checkTime = this._requestOverlapCheck[item._id];
      needsCheck = checkTime > 0 && this._tickTime - checkTime > OVERLAP_CHECK_INTERVAL;

      checkX = true;
      reqX = requestsX[item._id];
      if (reqX && reqX.isActive) {
        checkX = !this._updateScrollRequest(reqX);
        if (checkX) {
          needsCheck = true;
          this._cancelItemScroll(item, AXIS_X);
        }
      }

      checkY = true;
      reqY = requestsY[item._id];
      if (reqY && reqY.isActive) {
        checkY = !this._updateScrollRequest(reqY);
        if (checkY) {
          needsCheck = true;
          this._cancelItemScroll(item, AXIS_Y);
        }
      }

      if (needsCheck) {
        this._requestOverlapCheck[item._id] = 0;
        this._checkItemOverlap(item, checkX, checkY);
      }
    }
  };

  AutoScroller.prototype._requestAction = function(request, axis) {
    var isAxisX = axis === AXIS_X;
    var action = null;

    for (var i = 0; i < this._actions.length; i++) {
      action = this._actions[i];

      // If the action's request does not match the request's -> skip.
      if (request.element !== action.element) {
        action = null;
        continue;
      }

      // If the request and action share the same element, but the request slot
      // for the requested axis is already reserved let's ignore and cancel this
      // request.
      if (isAxisX ? action.requestX : action.requestY) {
        this._cancelItemScroll(request.item, axis);
        return;
      }

      // Seems like we have found our action, let's break the loop.
      break;
    }

    if (!action) action = ACTION_POOL.pick();
    action.element = request.element;
    action.addRequest(request);

    request.tick(this._tickDeltaTime);
    this._actions.push(action);
  };

  AutoScroller.prototype._updateActions = function() {
    var items = this._items;
    var syncItems = this._syncItems;
    var requests = this._requests;
    var actions = this._actions;
    var item;
    var action;
    var itemId;
    var reqX;
    var reqY;
    var i;
    var j;

    // Generate actions.
    for (i = 0; i < items.length; i++) {
      itemId = items[i]._id;
      reqX = requests[AXIS_X][itemId];
      reqY = requests[AXIS_Y][itemId];
      if (reqX) this._requestAction(reqX, AXIS_X);
      if (reqY) this._requestAction(reqY, AXIS_Y);
    }

    // Compute actions' scroll values. Also check which items need to be
    // synchronously synced after scroll.
    syncItems.length = 0;
    for (i = 0; i < actions.length; i++) {
      action = actions[i];
      action.computeScrollValues();
      for (j = 0; j < items.length; j++) {
        item = items[j];
        if (getItemAutoScrollSettings(item).syncAfterScroll === false) continue;
        if (syncItems.indexOf(item) > -1) continue;
        if (!isAffectedByScroll(item.getElement(), action.element)) continue;
        syncItems.push(item);
      }
    }
  };

  AutoScroller.prototype._applyActions = function() {
    var actions = this._actions;
    var syncItems = this._syncItems;
    var i;

    if (actions.length) {
      for (i = 0; i < actions.length; i++) {
        actions[i].scroll();
        ACTION_POOL.release(actions[i]);
      }
      actions.length = 0;
    }

    if (syncItems.length) {
      for (i = 0; i < syncItems.length; i++) prepareItemDragScroll(syncItems[i]);
      for (i = 0; i < syncItems.length; i++) applyItemDragScroll(syncItems[i]);
      syncItems.length = 0;
    }
  };

  AutoScroller.prototype.addItem = function(item) {
    var index = this._items.indexOf(item);
    if (index === -1) {
      this._items.push(item);
      this._requestOverlapCheck[item._id] = this._tickTime;
      this._dragPositions[item._id] = [];
      if (!this._isTicking) this._startTicking();
    }
  };

  AutoScroller.prototype.updateItem = function(item) {
    this._dragPositions[item._id].unshift(item._drag._left, item._drag._top);
    if (this._dragPositions.length > 4) {
      this._dragPositions.length = 4;
    }

    if (!this._requestOverlapCheck[item._id]) {
      this._requestOverlapCheck[item._id] = this._tickTime;
    }
  };

  AutoScroller.prototype.removeItem = function(item) {
    var index = this._items.indexOf(item);
    if (index === -1) return;

    var itemId = item._id;

    var reqX = this._requests[AXIS_X][itemId];
    if (reqX) {
      this._cancelItemScroll(item, AXIS_X);
      delete this._requests[AXIS_X][itemId];
    }

    var reqY = this._requests[AXIS_Y][itemId];
    if (reqY) {
      this._cancelItemScroll(item, AXIS_Y);
      delete this._requests[AXIS_Y][itemId];
    }

    var syncIndex = this._syncItems.indexOf(item);
    if (syncIndex > -1) this._syncItems.splice(syncIndex, 1);

    delete this._requestOverlapCheck[itemId];
    delete this._dragPositions[itemId];
    this._items.splice(index, 1);

    if (this._isTicking && !this._items.length) {
      this._stopTicking();
    }
  };

  AutoScroller.prototype.isItemScrollingX = function(item) {
    var reqX = this._requests[AXIS_X][item._id];
    return !!(reqX && reqX.isActive);
  };

  AutoScroller.prototype.isItemScrollingY = function(item) {
    var reqY = this._requests[AXIS_Y][item._id];
    return !!(reqY && reqY.isActive);
  };

  AutoScroller.prototype.isItemScrolling = function(item) {
    return this.isItemScrollingX(item) || this.isItemScrollingY(item);
  };

  var ElProto = window.Element.prototype;
  var matchesFn =
    ElProto.matches ||
    ElProto.matchesSelector ||
    ElProto.webkitMatchesSelector ||
    ElProto.mozMatchesSelector ||
    ElProto.msMatchesSelector ||
    ElProto.oMatchesSelector ||
    function() {
      return false;
    };

  /**
   * Check if element matches a CSS selector.
   *
   * @param {Element} el
   * @param {String} selector
   * @returns {Boolean}
   */
  function elementMatches(el, selector) {
    return matchesFn.call(el, selector);
  }

  /**
   * Add class to an element.
   *
   * @param {HTMLElement} element
   * @param {String} className
   */
  function addClass(element, className) {
    if (!className) return;

    if (element.classList) {
      element.classList.add(className);
    } else {
      if (!elementMatches(element, '.' + className)) {
        element.className += ' ' + className;
      }
    }
  }

  var tempArray = [];
  var numberType = 'number';

  /**
   * Insert an item or an array of items to array to a specified index. Mutates
   * the array. The index can be negative in which case the items will be added
   * to the end of the array.
   *
   * @param {Array} array
   * @param {*} items
   * @param {Number} [index=-1]
   */
  function arrayInsert(array, items, index) {
    var startIndex = typeof index === numberType ? index : -1;
    if (startIndex < 0) startIndex = array.length - startIndex + 1;

    array.splice.apply(array, tempArray.concat(startIndex, 0, items));
    tempArray.length = 0;
  }

  /**
   * Normalize array index. Basically this function makes sure that the provided
   * array index is within the bounds of the provided array and also transforms
   * negative index to the matching positive index. The third (optional) argument
   * allows you to define offset for array's length in case you are adding items
   * to the array or removing items from the array.
   *
   * @param {Array} array
   * @param {Number} index
   * @param {Number} [sizeOffset]
   */
  function normalizeArrayIndex(array, index, sizeOffset) {
    var maxIndex = Math.max(0, array.length - 1 + (sizeOffset || 0));
    return index > maxIndex ? maxIndex : index < 0 ? Math.max(maxIndex + index + 1, 0) : index;
  }

  /**
   * Move array item to another index.
   *
   * @param {Array} array
   * @param {Number} fromIndex
   *   - Index (positive or negative) of the item that will be moved.
   * @param {Number} toIndex
   *   - Index (positive or negative) where the item should be moved to.
   */
  function arrayMove(array, fromIndex, toIndex) {
    // Make sure the array has two or more items.
    if (array.length < 2) return;

    // Normalize the indices.
    var from = normalizeArrayIndex(array, fromIndex);
    var to = normalizeArrayIndex(array, toIndex);

    // Add target item to the new position.
    if (from !== to) {
      array.splice(to, 0, array.splice(from, 1)[0]);
    }
  }

  /**
   * Swap array items.
   *
   * @param {Array} array
   * @param {Number} index
   *   - Index (positive or negative) of the item that will be swapped.
   * @param {Number} withIndex
   *   - Index (positive or negative) of the other item that will be swapped.
   */
  function arraySwap(array, index, withIndex) {
    // Make sure the array has two or more items.
    if (array.length < 2) return;

    // Normalize the indices.
    var indexA = normalizeArrayIndex(array, index);
    var indexB = normalizeArrayIndex(array, withIndex);
    var temp;

    // Swap the items.
    if (indexA !== indexB) {
      temp = array[indexA];
      array[indexA] = array[indexB];
      array[indexB] = temp;
    }
  }

  /**
   * Returns an absolute positioned element's containing block, which is
   * considered to be the closest ancestor element that the target element's
   * positioning is relative to. Disclaimer: this only works as intended for
   * absolute positioned elements.
   *
   * @param {HTMLElement} element
   * @returns {(Document|Element)}
   */
  function getContainingBlock(element) {
    // As long as the containing block is an element, static and not
    // transformed, try to get the element's parent element and fallback to
    // document. https://github.com/niklasramo/mezr/blob/0.6.1/mezr.js#L339
    var doc = document;
    var res = element || doc;
    while (res && res !== doc && getStyle(res, 'position') === 'static' && !isTransformed(res)) {
      res = res.parentElement || doc;
    }
    return res;
  }

  var offsetA = {};
  var offsetB = {};
  var offsetDiff = {};

  /**
   * Returns the element's document offset, which in practice means the vertical
   * and horizontal distance between the element's northwest corner and the
   * document's northwest corner. Note that this function always returns the same
   * object so be sure to read the data from it instead using it as a reference.
   *
   * @param {(Document|Element|Window)} element
   * @param {Object} [offsetData]
   *   - Optional data object where the offset data will be inserted to. If not
   *     provided a new object will be created for the return data.
   * @returns {Object}
   */
  function getOffset(element, offsetData) {
    var offset = offsetData || {};
    var rect;

    // Set up return data.
    offset.left = 0;
    offset.top = 0;

    // Document's offsets are always 0.
    if (element === document) return offset;

    // Add viewport scroll left/top to the respective offsets.
    offset.left = window.pageXOffset || 0;
    offset.top = window.pageYOffset || 0;

    // Window's offsets are the viewport scroll left/top values.
    if (element.self === window.self) return offset;

    // Add element's client rects to the offsets.
    rect = element.getBoundingClientRect();
    offset.left += rect.left;
    offset.top += rect.top;

    // Exclude element's borders from the offset.
    offset.left += getStyleAsFloat(element, 'border-left-width');
    offset.top += getStyleAsFloat(element, 'border-top-width');

    return offset;
  }

  /**
   * Calculate the offset difference two elements.
   *
   * @param {HTMLElement} elemA
   * @param {HTMLElement} elemB
   * @param {Boolean} [compareContainingBlocks=false]
   *   - When this is set to true the containing blocks of the provided elements
   *     will be used for calculating the difference. Otherwise the provided
   *     elements will be compared directly.
   * @returns {Object}
   */
  function getOffsetDiff(elemA, elemB, compareContainingBlocks) {
    offsetDiff.left = 0;
    offsetDiff.top = 0;

    // If elements are same let's return early.
    if (elemA === elemB) return offsetDiff;

    // Compare containing blocks if necessary.
    if (compareContainingBlocks) {
      elemA = getContainingBlock(elemA);
      elemB = getContainingBlock(elemB);

      // If containing blocks are identical, let's return early.
      if (elemA === elemB) return offsetDiff;
    }

    // Finally, let's calculate the offset diff.
    getOffset(elemA, offsetA);
    getOffset(elemB, offsetB);
    offsetDiff.left = offsetB.left - offsetA.left;
    offsetDiff.top = offsetB.top - offsetA.top;

    return offsetDiff;
  }

  /**
   * Check if overflow style value is scrollable.
   *
   * @param {String} value
   * @returns {Boolean}
   */
  function isScrollableOverflow(value) {
    return value === 'auto' || value === 'scroll' || value === 'overlay';
  }

  /**
   * Check if an element is scrollable.
   *
   * @param {HTMLElement} element
   * @returns {Boolean}
   */
  function isScrollable(element) {
    return (
      isScrollableOverflow(getStyle(element, 'overflow')) ||
      isScrollableOverflow(getStyle(element, 'overflow-x')) ||
      isScrollableOverflow(getStyle(element, 'overflow-y'))
    );
  }

  /**
   * Collect element's ancestors that are potentially scrollable elements. The
   * provided element is also also included in the check, meaning that if it is
   * scrollable it is added to the result array.
   *
   * @param {HTMLElement} element
   * @param {Array} [result]
   * @returns {Array}
   */
  function getScrollableAncestors(element, result) {
    result = result || [];

    // Find scroll parents.
    while (element && element !== document) {
      // If element is inside ShadowDOM let's get it's host node from the real
      // DOM and continue looping.
      if (element.getRootNode && element instanceof DocumentFragment) {
        element = element.getRootNode().host;
        continue;
      }

      // If element is scrollable let's add it to the scrollable list.
      if (isScrollable(element)) {
        result.push(element);
      }

      element = element.parentNode;
    }

    // Always add window to the results.
    result.push(window);

    return result;
  }

  var translateValue = {};
  var transformNone$1 = 'none';
  var rxMat3d = /^matrix3d/;
  var rxMatTx = /([^,]*,){4}/;
  var rxMat3dTx = /([^,]*,){12}/;
  var rxNextItem = /[^,]*,/;

  /**
   * Returns the element's computed translateX and translateY values as a floats.
   * The returned object is always the same object and updated every time this
   * function is called.
   *
   * @param {HTMLElement} element
   * @returns {Object}
   */
  function getTranslate(element) {
    translateValue.x = 0;
    translateValue.y = 0;

    var transform = getStyle(element, transformStyle);
    if (!transform || transform === transformNone$1) {
      return translateValue;
    }

    // Transform style can be in either matrix3d(...) or matrix(...).
    var isMat3d = rxMat3d.test(transform);
    var tX = transform.replace(isMat3d ? rxMat3dTx : rxMatTx, '');
    var tY = tX.replace(rxNextItem, '');

    translateValue.x = parseFloat(tX) || 0;
    translateValue.y = parseFloat(tY) || 0;

    return translateValue;
  }

  /**
   * Transform translateX and translateY value into CSS transform style
   * property's value.
   *
   * @param {Number} x
   * @param {Number} y
   * @returns {String}
   */
  function getTranslateString(x, y) {
    return 'translateX(' + x + 'px) translateY(' + y + 'px)';
  }

  /**
   * Remove class from an element.
   *
   * @param {HTMLElement} element
   * @param {String} className
   */
  function removeClass(element, className) {
    if (!className) return;

    if (element.classList) {
      element.classList.remove(className);
    } else {
      if (elementMatches(element, '.' + className)) {
        element.className = (' ' + element.className + ' ')
          .replace(' ' + className + ' ', ' ')
          .trim();
      }
    }
  }

  var START_PREDICATE_INACTIVE = 0;
  var START_PREDICATE_PENDING = 1;
  var START_PREDICATE_RESOLVED = 2;
  var AUTO_SCROLLER = new AutoScroller();
  var SCROLL_LISTENER_OPTIONS = hasPassiveEvents() ? { passive: true } : false;

  /**
   * Bind touch interaction to an item.
   *
   * @class
   * @param {Item} item
   */
  function ItemDrag(item) {
    var element = item._element;
    var grid = item.getGrid();
    var settings = grid._settings;

    this._item = item;
    this._gridId = grid._id;
    this._isDestroyed = false;
    this._isMigrating = false;

    // Start predicate data.
    this._startPredicate = isFunction(settings.dragStartPredicate)
      ? settings.dragStartPredicate
      : ItemDrag.defaultStartPredicate;
    this._startPredicateState = START_PREDICATE_INACTIVE;
    this._startPredicateResult = undefined;

    // Data for drag sort predicate heuristics.
    this._isSortNeeded = false;
    this._sortTimer = undefined;
    this._blockedSortIndex = null;
    this._sortX1 = 0;
    this._sortX2 = 0;
    this._sortY1 = 0;
    this._sortY2 = 0;

    // Setup item's initial drag data.
    this._reset();

    // Bind the methods that needs binding.
    this._preStartCheck = this._preStartCheck.bind(this);
    this._preEndCheck = this._preEndCheck.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._prepareStart = this._prepareStart.bind(this);
    this._applyStart = this._applyStart.bind(this);
    this._prepareMove = this._prepareMove.bind(this);
    this._applyMove = this._applyMove.bind(this);
    this._prepareScroll = this._prepareScroll.bind(this);
    this._applyScroll = this._applyScroll.bind(this);
    this._handleSort = this._handleSort.bind(this);
    this._handleSortDelayed = this._handleSortDelayed.bind(this);

    // Get drag handle element.
    this._handle = (settings.dragHandle && element.querySelector(settings.dragHandle)) || element;

    // Init dragger.
    this._dragger = new Dragger(this._handle, settings.dragCssProps);
    this._dragger.on('start', this._preStartCheck);
    this._dragger.on('move', this._preStartCheck);
    this._dragger.on('cancel', this._preEndCheck);
    this._dragger.on('end', this._preEndCheck);
  }

  /**
   * Public static methods
   * *********************
   */

  /**
   * Default drag start predicate handler that handles anchor elements
   * gracefully. The return value of this function defines if the drag is
   * started, rejected or pending. When true is returned the dragging is started
   * and when false is returned the dragging is rejected. If nothing is returned
   * the predicate will be called again on the next drag movement.
   *
   * @public
   * @memberof ItemDrag
   * @param {Item} item
   * @param {DraggerEvent} event
   * @param {Object} [options]
   *   - An optional options object which can be used to pass the predicate
   *     it's options manually. By default the predicate retrieves the options
   *     from the grid's settings.
   * @returns {Boolean}
   */
  ItemDrag.defaultStartPredicate = function(item, event, options) {
    var drag = item._drag;

    // Make sure left button is pressed on mouse.
    if (event.isFirst && event.srcEvent.button) {
      return false;
    }

    // If the start event is trusted, non-cancelable and it's default action has
    // not been prevented it is in most cases a sign that the gesture would be
    // cancelled anyways right after it has started (e.g. starting drag while
    // the page is scrolling).
    if (
      event.isFirst &&
      event.srcEvent.isTrusted === true &&
      event.srcEvent.defaultPrevented === false &&
      event.srcEvent.cancelable === false
    ) {
      return false;
    }

    // Final event logic. At this stage return value does not matter anymore,
    // the predicate is either resolved or it's not and there's nothing to do
    // about it. Here we just reset data and if the item element is a link
    // we follow it (if there has only been slight movement).
    if (event.isFinal) {
      drag._finishStartPredicate(event);
      return;
    }

    // Setup predicate data from options if not already set.
    var predicate = drag._startPredicateData;
    if (!predicate) {
      var config = options || drag._getGrid()._settings.dragStartPredicate || {};
      drag._startPredicateData = predicate = {
        distance: Math.max(config.distance, 0) || 0,
        delay: Math.max(config.delay, 0) || 0
      };
    }

    // If delay is defined let's keep track of the latest event and initiate
    // delay if it has not been done yet.
    if (predicate.delay) {
      predicate.event = event;
      if (!predicate.delayTimer) {
        predicate.delayTimer = window.setTimeout(function() {
          predicate.delay = 0;
          if (drag._resolveStartPredicate(predicate.event)) {
            drag._forceResolveStartPredicate(predicate.event);
            drag._resetStartPredicate();
          }
        }, predicate.delay);
      }
    }

    return drag._resolveStartPredicate(event);
  };

  /**
   * Default drag sort predicate.
   *
   * @public
   * @memberof ItemDrag
   * @param {Item} item
   * @param {Object} [options]
   * @param {Number} [options.threshold=50]
   * @param {String} [options.action='move']
   * @returns {?DragSortCommand}
   *   - Returns `null` if no valid index was found. Otherwise returns drag sort
   *     command.
   */
  ItemDrag.defaultSortPredicate = (function() {
    var itemRect = {};
    var targetRect = {};
    var returnData = {};
    var gridsArray = [];
    var minThreshold = 1;
    var maxThreshold = 100;

    function getTargetGrid(item, rootGrid, threshold) {
      var target = null;
      var dragSort = rootGrid._settings.dragSort;
      var bestScore = -1;
      var gridScore;
      var grids;
      var grid;
      var container;
      var containerRect;
      var left;
      var top;
      var right;
      var bottom;
      var i;

      // Get potential target grids.
      if (dragSort === true) {
        gridsArray[0] = rootGrid;
        grids = gridsArray;
      } else if (isFunction(dragSort)) {
        grids = dragSort.call(rootGrid, item);
      }

      // Return immediately if there are no grids.
      if (!grids || !Array.isArray(grids) || !grids.length) {
        return target;
      }

      // Loop through the grids and get the best match.
      for (i = 0; i < grids.length; i++) {
        grid = grids[i];

        // Filter out all destroyed grids.
        if (grid._isDestroyed) continue;

        // Compute the grid's client rect an clamp the initial boundaries to
        // viewport dimensions.
        grid._updateBoundingRect();
        left = Math.max(0, grid._left);
        top = Math.max(0, grid._top);
        right = Math.min(window.innerWidth, grid._right);
        bottom = Math.min(window.innerHeight, grid._bottom);

        // The grid might be inside one or more elements that clip it's visibility
        // (e.g overflow scroll/hidden) so we want to find out the visible portion
        // of the grid in the viewport and use that in our calculations.
        container = grid._element.parentNode;
        while (
          container &&
          container !== document &&
          container !== document.documentElement &&
          container !== document.body
        ) {
          if (container.getRootNode && container instanceof DocumentFragment) {
            container = container.getRootNode().host;
            continue;
          }

          if (getStyle(container, 'overflow') !== 'visible') {
            containerRect = container.getBoundingClientRect();
            left = Math.max(left, containerRect.left);
            top = Math.max(top, containerRect.top);
            right = Math.min(right, containerRect.right);
            bottom = Math.min(bottom, containerRect.bottom);
          }

          if (getStyle(container, 'position') === 'fixed') {
            break;
          }

          container = container.parentNode;
        }

        // No need to go further if target rect does not have visible area.
        if (left >= right || top >= bottom) continue;

        // Check how much dragged element overlaps the container element.
        targetRect.left = left;
        targetRect.top = top;
        targetRect.width = right - left;
        targetRect.height = bottom - top;
        gridScore = getIntersectionScore(itemRect, targetRect);

        // Check if this grid is the best match so far.
        if (gridScore > threshold && gridScore > bestScore) {
          bestScore = gridScore;
          target = grid;
        }
      }

      // Always reset grids array.
      gridsArray.length = 0;

      return target;
    }

    return function(item, options) {
      var drag = item._drag;
      var rootGrid = drag._getGrid();

      // Get drag sort predicate settings.
      var sortThreshold = options && typeof options.threshold === 'number' ? options.threshold : 50;
      var sortAction = options && options.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
      var migrateAction =
        options && options.migrateAction === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;

      // Sort threshold must be a positive number capped to a max value of 100. If
      // that's not the case this function will not work correctly. So let's clamp
      // the threshold just in case.
      sortThreshold = Math.min(Math.max(sortThreshold, minThreshold), maxThreshold);

      // Populate item rect data.
      itemRect.width = item._width;
      itemRect.height = item._height;
      itemRect.left = drag._clientX;
      itemRect.top = drag._clientY;

      // Calculate the target grid.
      var grid = getTargetGrid(item, rootGrid, sortThreshold);

      // Return early if we found no grid container element that overlaps the
      // dragged item enough.
      if (!grid) return null;

      var isMigration = item.getGrid() !== grid;
      var gridOffsetLeft = 0;
      var gridOffsetTop = 0;
      var matchScore = 0;
      var matchIndex = -1;
      var hasValidTargets = false;
      var target;
      var score;
      var i;

      // If item is moved within it's originating grid adjust item's left and
      // top props. Otherwise if item is moved to/within another grid get the
      // container element's offset (from the element's content edge).
      if (grid === rootGrid) {
        itemRect.left = drag._gridX + item._marginLeft;
        itemRect.top = drag._gridY + item._marginTop;
      } else {
        grid._updateBorders(1, 0, 1, 0);
        gridOffsetLeft = grid._left + grid._borderLeft;
        gridOffsetTop = grid._top + grid._borderTop;
      }

      // Loop through the target grid items and try to find the best match.
      for (i = 0; i < grid._items.length; i++) {
        target = grid._items[i];

        // If the target item is not active or the target item is the dragged
        // item let's skip to the next item.
        if (!target._isActive || target === item) {
          continue;
        }

        // Mark the grid as having valid target items.
        hasValidTargets = true;

        // Calculate the target's overlap score with the dragged item.
        targetRect.width = target._width;
        targetRect.height = target._height;
        targetRect.left = target._left + target._marginLeft + gridOffsetLeft;
        targetRect.top = target._top + target._marginTop + gridOffsetTop;
        score = getIntersectionScore(itemRect, targetRect);

        // Update best match index and score if the target's overlap score with
        // the dragged item is higher than the current best match score.
        if (score > matchScore) {
          matchIndex = i;
          matchScore = score;
        }
      }

      // If there is no valid match and the dragged item is being moved into
      // another grid we need to do some guess work here. If there simply are no
      // valid targets (which means that the dragged item will be the only active
      // item in the new grid) we can just add it as the first item. If we have
      // valid items in the new grid and the dragged item is overlapping one or
      // more of the items in the new grid let's make an exception with the
      // threshold and just pick the item which the dragged item is overlapping
      // most. However, if the dragged item is not overlapping any of the valid
      // items in the new grid let's position it as the last item in the grid.
      if (isMigration && matchScore < sortThreshold) {
        matchIndex = hasValidTargets ? matchIndex : 0;
        matchScore = sortThreshold;
      }

      // Check if the best match overlaps enough to justify a placement switch.
      if (matchScore >= sortThreshold) {
        returnData.grid = grid;
        returnData.index = matchIndex;
        returnData.action = isMigration ? migrateAction : sortAction;
        return returnData;
      }

      return null;
    };
  })();

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Abort dragging and reset drag data.
   *
   * @public
   * @memberof ItemDrag.prototype
   * @returns {ItemDrag}
   */
  ItemDrag.prototype.stop = function() {
    if (!this._isActive) return this;

    // If the item is being dropped into another grid, finish it up and return
    // immediately.
    if (this._isMigrating) {
      this._finishMigration();
      return this;
    }

    // Cancel queued ticks.
    var itemId = this._item._id;
    cancelDragStartTick(itemId);
    cancelDragMoveTick(itemId);
    cancelDragScrollTick(itemId);

    // Cancel sort procedure.
    this._cancelSort();

    if (this._isStarted) {
      // Remove scroll listeners.
      this._unbindScrollListeners();

      // Append item element to the container if it's not it's child. Also make
      // sure the translate values are adjusted to account for the DOM shift.
      var element = item._element;
      var grid = this._getGrid();
      if (element.parentNode !== grid._element) {
        grid._element.appendChild(element);
        element.style[transformProp] = getTranslateString(this._gridX, this._gridY);
      }

      // Remove dragging class.
      removeClass(element, grid._settings.itemDraggingClass);
    }

    // Reset drag data.
    this._reset();

    return this;
  };

  /**
   * Manually trigger drag sort. This is only needed for special edge cases where
   * e.g. you have disabled sort and want to trigger a sort right after enabling
   * it (and don't want to wait for the next move/scroll event).
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {Boolean} force
   */
  ItemDrag.prototype.sort = function(force) {
    var item = this._item;
    if (item._isActive && this._dragMoveEvent) {
      if (force === true) {
        this._handleSort();
      } else {
        addDragSortTick(item._id, this._handleSort);
      }
    }
  };

  /**
   * Destroy instance.
   *
   * @public
   * @memberof ItemDrag.prototype
   * @returns {ItemDrag}
   */
  ItemDrag.prototype.destroy = function() {
    if (this._isDestroyed) return this;
    this.stop();
    this._dragger.destroy();
    AUTO_SCROLLER.removeItem(this._item);
    this._isDestroyed = true;
    return this;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Get Grid instance.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @returns {?Grid}
   */
  ItemDrag.prototype._getGrid = function() {
    return GRID_INSTANCES[this._gridId] || null;
  };

  /**
   * Setup/reset drag data.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._reset = function() {
    this._isActive = false;
    this._isStarted = false;

    // The dragged item's container element.
    this._container = null;

    // The dragged item's containing block.
    this._containingBlock = null;

    // Drag/scroll event data.
    this._dragStartEvent = null;
    this._dragMoveEvent = null;
    this._dragPrevMoveEvent = null;
    this._scrollEvent = null;

    // All the elements which need to be listened for scroll events during
    // dragging.
    this._scrollers = [];

    // The current translateX/translateY position.
    this._left = 0;
    this._top = 0;

    // Dragged element's current position within the grid.
    this._gridX = 0;
    this._gridY = 0;

    // Dragged element's current offset from window's northwest corner. Does
    // not account for element's margins.
    this._clientX = 0;
    this._clientY = 0;

    // Keep track of the clientX/Y diff for scrolling.
    this._scrollDiffX = 0;
    this._scrollDiffY = 0;

    // Keep track of the clientX/Y diff for moving.
    this._moveDiffX = 0;
    this._moveDiffY = 0;

    // Offset difference between the dragged element's temporary drag
    // container and it's original container.
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  };

  /**
   * Bind drag scroll handlers to all scrollable ancestor elements of the
   * dragged element and the drag container element.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._bindScrollListeners = function() {
    var gridContainer = this._getGrid()._element;
    var dragContainer = this._container;
    var scrollers = this._scrollers;
    var gridScrollers;
    var i;

    // Get dragged element's scrolling parents.
    scrollers.length = 0;
    getScrollableAncestors(this._item._element.parentNode, scrollers);

    // If drag container is defined and it's not the same element as grid
    // container then we need to add the grid container and it's scroll parents
    // to the elements which are going to be listener for scroll events.
    if (dragContainer !== gridContainer) {
      gridScrollers = [];
      getScrollableAncestors(gridContainer, gridScrollers);
      for (i = 0; i < gridScrollers.length; i++) {
        if (scrollers.indexOf(gridScrollers[i]) < 0) {
          scrollers.push(gridScrollers[i]);
        }
      }
    }

    // Bind scroll listeners.
    for (i = 0; i < scrollers.length; i++) {
      scrollers[i].addEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }
  };

  /**
   * Unbind currently bound drag scroll handlers from all scrollable ancestor
   * elements of the dragged element and the drag container element.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._unbindScrollListeners = function() {
    var scrollers = this._scrollers;
    var i;

    for (i = 0; i < scrollers.length; i++) {
      scrollers[i].removeEventListener('scroll', this._onScroll, SCROLL_LISTENER_OPTIONS);
    }

    scrollers.length = 0;
  };

  /**
   * Unbind currently bound drag scroll handlers from all scrollable ancestor
   * elements of the dragged element and the drag container element.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   * @returns {Boolean}
   */
  ItemDrag.prototype._resolveStartPredicate = function(event) {
    var predicate = this._startPredicateData;
    if (event.distance < predicate.distance || predicate.delay) return;
    this._resetStartPredicate();
    return true;
  };

  /**
   * Forcefully resolve drag start predicate.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._forceResolveStartPredicate = function(event) {
    if (!this._isDestroyed && this._startPredicateState === START_PREDICATE_PENDING) {
      this._startPredicateState = START_PREDICATE_RESOLVED;
      this._onStart(event);
    }
  };

  /**
   * Finalize start predicate.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._finishStartPredicate = function(event) {
    var element = this._item._element;

    // Check if this is a click (very subjective heuristics).
    var isClick = Math.abs(event.deltaX) < 2 && Math.abs(event.deltaY) < 2 && event.deltaTime < 200;

    // Reset predicate.
    this._resetStartPredicate();

    // If the gesture can be interpreted as click let's try to open the element's
    // href url (if it is an anchor element).
    if (isClick) openAnchorHref(element);
  };

  /**
   * Reset drag sort heuristics.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {Number} x
   * @param {Number} y
   */
  ItemDrag.prototype._resetHeuristics = function(x, y) {
    this._blockedSortIndex = null;
    this._sortX1 = this._sortX2 = x;
    this._sortY1 = this._sortY2 = y;
  };

  /**
   * Run heuristics and return true if overlap check can be performed, and false
   * if it can not.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {Number} x
   * @param {Number} y
   * @returns {Boolean}
   */
  ItemDrag.prototype._checkHeuristics = function(x, y) {
    var settings = this._getGrid()._settings.dragSortHeuristics;
    var minDist = settings.minDragDistance;

    // Skip heuristics if not needed.
    if (minDist <= 0) {
      this._blockedSortIndex = null;
      return true;
    }

    var diffX = x - this._sortX2;
    var diffY = y - this._sortY2;

    // If we can't do proper bounce back check make sure that the blocked index
    // is not set.
    var canCheckBounceBack = minDist > 3 && settings.minBounceBackAngle > 0;
    if (!canCheckBounceBack) {
      this._blockedSortIndex = null;
    }

    if (Math.abs(diffX) > minDist || Math.abs(diffY) > minDist) {
      // Reset blocked index if angle changed enough. This check requires a
      // minimum value of 3 for minDragDistance to function properly.
      if (canCheckBounceBack) {
        var angle = Math.atan2(diffX, diffY);
        var prevAngle = Math.atan2(this._sortX2 - this._sortX1, this._sortY2 - this._sortY1);
        var deltaAngle = Math.atan2(Math.sin(angle - prevAngle), Math.cos(angle - prevAngle));
        if (Math.abs(deltaAngle) > settings.minBounceBackAngle) {
          this._blockedSortIndex = null;
        }
      }

      // Update points.
      this._sortX1 = this._sortX2;
      this._sortY1 = this._sortY2;
      this._sortX2 = x;
      this._sortY2 = y;

      return true;
    }

    return false;
  };

  /**
   * Reset for default drag start predicate function.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._resetStartPredicate = function() {
    var predicate = this._startPredicateData;
    if (predicate) {
      if (predicate.delayTimer) {
        predicate.delayTimer = window.clearTimeout(predicate.delayTimer);
      }
      this._startPredicateData = null;
    }
  };

  /**
   * Handle the sorting procedure. Manage drag sort heuristics/interval and
   * check overlap when necessary.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._handleSort = function() {
    var settings = this._getGrid()._settings;

    // No sorting when drag sort is disabled. Also, account for the scenario where
    // dragSort is temporarily disabled during drag procedure so we need to reset
    // sort timer heuristics state too.
    if (
      !settings.dragSort ||
      (!settings.dragAutoScroll.sortDuringScroll && AUTO_SCROLLER.isItemScrolling(this._item))
    ) {
      this._sortX1 = this._sortX2 = this._gridX;
      this._sortY1 = this._sortY2 = this._gridY;
      // We set this to true intentionally so that overlap check would be
      // triggered as soon as possible after sort becomes enabled again.
      this._isSortNeeded = true;
      if (this._sortTimer !== undefined) {
        this._sortTimer = window.clearTimeout(this._sortTimer);
      }
      return;
    }

    // If sorting is enabled we always need to run the heuristics check to keep
    // the tracked coordinates updated. We also allow an exception when the sort
    // timer is finished because the heuristics are intended to prevent overlap
    // checks based on the dragged element's immediate movement and a delayed
    // overlap check is valid if it comes through, because it was valid when it
    // was invoked.
    var shouldSort = this._checkHeuristics(this._gridX, this._gridY);
    if (!this._isSortNeeded && !shouldSort) return;

    var sortInterval = settings.dragSortHeuristics.sortInterval;
    if (sortInterval <= 0 || this._isSortNeeded) {
      this._isSortNeeded = false;
      if (this._sortTimer !== undefined) {
        this._sortTimer = window.clearTimeout(this._sortTimer);
      }
      this._checkOverlap();
    } else if (this._sortTimer === undefined) {
      this._sortTimer = window.setTimeout(this._handleSortDelayed, sortInterval);
    }
  };

  /**
   * Delayed sort handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._handleSortDelayed = function() {
    this._isSortNeeded = true;
    this._sortTimer = undefined;
    addDragSortTick(this._item._id, this._handleSort);
  };

  /**
   * Cancel and reset sort procedure.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._cancelSort = function() {
    this._isSortNeeded = false;
    if (this._sortTimer !== undefined) {
      this._sortTimer = window.clearTimeout(this._sortTimer);
    }
    cancelDragSortTick(this._item._id);
  };

  /**
   * Handle the ending of the drag procedure for sorting.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._finishSort = function() {
    var isSortEnabled = this._getGrid()._settings.dragSort;
    var needsFinalCheck = isSortEnabled && (this._isSortNeeded || this._sortTimer !== undefined);
    this._cancelSort();
    if (needsFinalCheck) this._checkOverlap();
  };

  /**
   * Check (during drag) if an item is overlapping other items and based on
   * the configuration layout the items.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._checkOverlap = function() {
    if (!this._isActive) return;

    var item = this._item;
    var settings = this._getGrid()._settings;
    var result;
    var currentGrid;
    var currentIndex;
    var targetGrid;
    var targetIndex;
    var targetItem;
    var sortAction;
    var isMigration;

    // Get overlap check result.
    if (isFunction(settings.dragSortPredicate)) {
      result = settings.dragSortPredicate(item, this._dragMoveEvent);
    } else {
      result = ItemDrag.defaultSortPredicate(item, settings.dragSortPredicate);
    }

    // Let's make sure the result object has a valid index before going further.
    if (!result || typeof result.index !== 'number') return;

    sortAction = result.action === ACTION_SWAP ? ACTION_SWAP : ACTION_MOVE;
    currentGrid = item.getGrid();
    targetGrid = result.grid || currentGrid;
    isMigration = currentGrid !== targetGrid;
    currentIndex = currentGrid._items.indexOf(item);
    targetIndex = normalizeArrayIndex(
      targetGrid._items,
      result.index,
      isMigration && sortAction === ACTION_MOVE ? 1 : 0
    );

    // Prevent position bounce.
    if (!isMigration && targetIndex === this._blockedSortIndex) {
      return;
    }

    // If the item was moved within it's current grid.
    if (!isMigration) {
      // Make sure the target index is not the current index.
      if (currentIndex !== targetIndex) {
        this._blockedSortIndex = currentIndex;

        // Do the sort.
        (sortAction === ACTION_SWAP ? arraySwap : arrayMove)(
          currentGrid._items,
          currentIndex,
          targetIndex
        );

        // Emit move event.
        if (currentGrid._hasListeners(EVENT_MOVE)) {
          currentGrid._emit(EVENT_MOVE, {
            item: item,
            fromIndex: currentIndex,
            toIndex: targetIndex,
            action: sortAction
          });
        }

        // Layout the grid.
        currentGrid.layout();
      }
    }

    // If the item was moved to another grid.
    else {
      this._blockedSortIndex = null;

      // Let's fetch the target item when it's still in it's original index.
      targetItem = targetGrid._items[targetIndex];

      // Emit beforeSend event.
      if (currentGrid._hasListeners(EVENT_BEFORE_SEND)) {
        currentGrid._emit(EVENT_BEFORE_SEND, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex
        });
      }

      // Emit beforeReceive event.
      if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
        targetGrid._emit(EVENT_BEFORE_RECEIVE, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex
        });
      }

      // Update item's grid id reference.
      item._gridId = targetGrid._id;

      // Update drag instance's migrating indicator.
      this._isMigrating = item._gridId !== this._gridId;

      // Move item instance from current grid to target grid.
      currentGrid._items.splice(currentIndex, 1);
      arrayInsert(targetGrid._items, item, targetIndex);

      // Set sort data as null, which is an indicator for the item comparison
      // function that the sort data of this specific item should be fetched
      // lazily.
      item._sortData = null;

      // Emit send event.
      if (currentGrid._hasListeners(EVENT_SEND)) {
        currentGrid._emit(EVENT_SEND, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex
        });
      }

      // Emit receive event.
      if (targetGrid._hasListeners(EVENT_RECEIVE)) {
        targetGrid._emit(EVENT_RECEIVE, {
          item: item,
          fromGrid: currentGrid,
          fromIndex: currentIndex,
          toGrid: targetGrid,
          toIndex: targetIndex
        });
      }

      // If the sort action is "swap" let's respect it and send the target item
      // (if it exists) from the target grid to the originating grid. This process
      // is done on purpose after the dragged item placed within the target grid
      // so that we can keep this implementation as simple as possible utilizing
      // the existing API.
      if (sortAction === ACTION_SWAP && targetItem && targetItem.isActive()) {
        // Sanity check to make sure that the target item is still part of the
        // target grid. It could have been manipulated in the event handlers.
        if (targetGrid._items.indexOf(targetItem) > -1) {
          targetGrid.send(targetItem, currentGrid, currentIndex, {
            appendTo: this._container || document.body,
            layoutSender: false,
            layoutReceiver: false
          });
        }
      }

      // Layout both grids.
      currentGrid.layout();
      targetGrid.layout();
    }
  };

  /**
   * If item is dragged into another grid, finish the migration process
   * gracefully.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._finishMigration = function() {
    var item = this._item;
    var release = item._dragRelease;
    var element = item._element;
    var isActive = item._isActive;
    var targetGrid = item.getGrid();
    var targetGridElement = targetGrid._element;
    var targetSettings = targetGrid._settings;
    var targetContainer = targetSettings.dragContainer || targetGridElement;
    var currentSettings = this._getGrid()._settings;
    var currentContainer = element.parentNode;
    var translate;
    var offsetDiff;

    // Destroy current drag. Note that we need to set the migrating flag to
    // false first, because otherwise we create an infinite loop between this
    // and the drag.stop() method.
    this._isMigrating = false;
    this.destroy();

    // Remove current classnames.
    removeClass(element, currentSettings.itemClass);
    removeClass(element, currentSettings.itemVisibleClass);
    removeClass(element, currentSettings.itemHiddenClass);

    // Add new classnames.
    addClass(element, targetSettings.itemClass);
    addClass(element, isActive ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass);

    // Move the item inside the target container if it's different than the
    // current container.
    if (targetContainer !== currentContainer) {
      targetContainer.appendChild(element);
      offsetDiff = getOffsetDiff(currentContainer, targetContainer, true);
      translate = getTranslate(element);
      translate.x -= offsetDiff.left;
      translate.y -= offsetDiff.top;
    }

    // Update item's cached dimensions and sort data.
    item._refreshDimensions();
    item._refreshSortData();

    // Calculate the offset difference between target's drag container (if any)
    // and actual grid container element. We save it later for the release
    // process.
    offsetDiff = getOffsetDiff(targetContainer, targetGridElement, true);
    release._containerDiffX = offsetDiff.left;
    release._containerDiffY = offsetDiff.top;

    // Recreate item's drag handler.
    item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

    // Adjust the position of the item element if it was moved from a container
    // to another.
    if (targetContainer !== currentContainer) {
      element.style[transformProp] = getTranslateString(translate.x, translate.y);
    }

    // Update child element's styles to reflect the current visibility state.
    item._visibility.setStyles(isActive ? targetSettings.visibleStyles : targetSettings.hiddenStyles);

    // Start the release.
    release.start();
  };

  /**
   * Drag pre-start handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._preStartCheck = function(event) {
    // Let's activate drag start predicate state.
    if (this._startPredicateState === START_PREDICATE_INACTIVE) {
      this._startPredicateState = START_PREDICATE_PENDING;
    }

    // If predicate is pending try to resolve it.
    if (this._startPredicateState === START_PREDICATE_PENDING) {
      this._startPredicateResult = this._startPredicate(this._item, event);
      if (this._startPredicateResult === true) {
        this._startPredicateState = START_PREDICATE_RESOLVED;
        this._onStart(event);
      } else if (this._startPredicateResult === false) {
        this._resetStartPredicate(event);
        this._dragger._reset();
        this._startPredicateState = START_PREDICATE_INACTIVE;
      }
    }

    // Otherwise if predicate is resolved and drag is active, move the item.
    else if (this._startPredicateState === START_PREDICATE_RESOLVED && this._isActive) {
      this._onMove(event);
    }
  };

  /**
   * Drag pre-end handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._preEndCheck = function(event) {
    var isResolved = this._startPredicateState === START_PREDICATE_RESOLVED;

    // Do final predicate check to allow user to unbind stuff for the current
    // drag procedure within the predicate callback. The return value of this
    // check will have no effect to the state of the predicate.
    this._startPredicate(this._item, event);

    this._startPredicateState = START_PREDICATE_INACTIVE;

    if (!isResolved || !this._isActive) return;

    if (this._isStarted) {
      this._onEnd(event);
    } else {
      this.stop();
    }
  };

  /**
   * Drag start handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._onStart = function(event) {
    var item = this._item;
    if (!item._isActive) return;

    this._isActive = true;
    this._dragStartEvent = event;
    AUTO_SCROLLER.addItem(item);

    addDragStartTick(item._id, this._prepareStart, this._applyStart);
  };

  /**
   * Prepare item to be dragged.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._prepareStart = function() {
    var item = this._item;
    if (!item._isActive) return;

    var element = item._element;
    var grid = this._getGrid();
    var settings = grid._settings;
    var gridContainer = grid._element;
    var dragContainer = settings.dragContainer || gridContainer;
    var containingBlock = getContainingBlock(dragContainer);
    var translate = getTranslate(element);
    var elementRect = element.getBoundingClientRect();
    var hasDragContainer = dragContainer !== gridContainer;

    this._container = dragContainer;
    this._containingBlock = containingBlock;
    this._clientX = elementRect.left;
    this._clientY = elementRect.top;
    this._left = this._gridX = translate.x;
    this._top = this._gridY = translate.y;
    this._scrollDiffX = this._scrollDiffY = 0;
    this._moveDiffX = this._moveDiffY = 0;

    this._resetHeuristics(this._gridX, this._gridY);

    // If a specific drag container is set and it is different from the
    // grid's container element we store the offset between containers.
    if (hasDragContainer) {
      var offsetDiff = getOffsetDiff(containingBlock, gridContainer);
      this._containerDiffX = offsetDiff.left;
      this._containerDiffY = offsetDiff.top;
    }
  };

  /**
   * Start drag for the item.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._applyStart = function() {
    var item = this._item;
    if (!item._isActive) return;

    var grid = this._getGrid();
    var element = item._element;
    var release = item._dragRelease;
    var migrate = item._migrate;
    var hasDragContainer = this._container !== grid._element;

    if (item.isPositioning()) {
      var layoutStyles = {};
      layoutStyles[transformProp] = getTranslateString(this._left, this._top);
      item._layout.stop(true, layoutStyles);
    }

    if (migrate._isActive) {
      this._left -= migrate._containerDiffX;
      this._top -= migrate._containerDiffY;
      this._gridX -= migrate._containerDiffX;
      this._gridY -= migrate._containerDiffY;
      migrate.stop(true, this._left, this._top);
    }

    if (item.isReleasing()) {
      release._reset();
    }

    if (grid._settings.dragPlaceholder.enabled) {
      item._dragPlaceholder.create();
    }

    this._isStarted = true;

    grid._emit(EVENT_DRAG_INIT, item, this._dragStartEvent);

    if (hasDragContainer) {
      // If the dragged element is a child of the drag container all we need to
      // do is setup the relative drag position data.
      if (element.parentNode === this._container) {
        this._gridX -= this._containerDiffX;
        this._gridY -= this._containerDiffY;
      }
      // Otherwise we need to append the element inside the correct container,
      // setup the actual drag position data and adjust the element's translate
      // values to account for the DOM position shift.
      else {
        this._left += this._containerDiffX;
        this._top += this._containerDiffY;
        this._container.appendChild(element);
        element.style[transformProp] = getTranslateString(this._left, this._top);
      }
    }

    addClass(element, grid._settings.itemDraggingClass);
    this._bindScrollListeners();
    grid._emit(EVENT_DRAG_START, item, this._dragStartEvent);
  };

  /**
   * Drag move handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._onMove = function(event) {
    var item = this._item;

    if (!item._isActive) {
      this.stop();
      return;
    }

    this._dragMoveEvent = event;
    addDragMoveTick(item._id, this._prepareMove, this._applyMove);
    addDragSortTick(item._id, this._handleSort);
  };

  /**
   * Prepare dragged item for moving.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._prepareMove = function() {
    var item = this._item;

    if (!item._isActive) return;

    var settings = this._getGrid()._settings;
    var axis = settings.dragAxis;
    var nextEvent = this._dragMoveEvent;
    var prevEvent = this._dragPrevMoveEvent || this._dragStartEvent || nextEvent;

    // Update horizontal position data.
    if (axis !== 'y') {
      var moveDiffX = nextEvent.clientX - prevEvent.clientX;
      this._left = this._left - this._moveDiffX + moveDiffX;
      this._gridX = this._gridX - this._moveDiffX + moveDiffX;
      this._clientX = this._clientX - this._moveDiffX + moveDiffX;
      this._moveDiffX = moveDiffX;
    }

    // Update vertical position data.
    if (axis !== 'x') {
      var moveDiffY = nextEvent.clientY - prevEvent.clientY;
      this._top = this._top - this._moveDiffY + moveDiffY;
      this._gridY = this._gridY - this._moveDiffY + moveDiffY;
      this._clientY = this._clientY - this._moveDiffY + moveDiffY;
      this._moveDiffY = moveDiffY;
    }

    this._dragPrevMoveEvent = nextEvent;
  };

  /**
   * Apply movement to dragged item.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._applyMove = function() {
    var item = this._item;
    if (!item._isActive) return;

    this._moveDiffX = this._moveDiffY = 0;
    item._element.style[transformProp] = getTranslateString(this._left, this._top);
    this._getGrid()._emit(EVENT_DRAG_MOVE, item, this._dragMoveEvent);
    AUTO_SCROLLER.updateItem(item);
  };

  /**
   * Drag scroll handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {Event} event
   */
  ItemDrag.prototype._onScroll = function(event) {
    var item = this._item;

    if (!item._isActive) {
      this.stop();
      return;
    }

    this._scrollEvent = event;
    addDragScrollTick(item._id, this._prepareScroll, this._applyScroll);
    addDragSortTick(item._id, this._handleSort);
  };

  /**
   * Prepare dragged item for scrolling.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._prepareScroll = function() {
    var item = this._item;

    // If item is not active do nothing.
    if (!item._isActive) return;

    var element = item._element;
    var grid = this._getGrid();
    var gridContainer = grid._element;

    // Calculate element's rect and x/y diff.
    var rect = element.getBoundingClientRect();
    var scrollDiffX = this._clientX - this._moveDiffX - this._scrollDiffX - rect.left;
    var scrollDiffY = this._clientY - this._moveDiffY - this._scrollDiffY - rect.top;

    // Update container diff.
    if (this._container !== gridContainer) {
      var offsetDiff = getOffsetDiff(this._containingBlock, gridContainer);
      this._containerDiffX = offsetDiff.left;
      this._containerDiffY = offsetDiff.top;
    }

    // Update horizontal position data.
    this._left = this._left - this._scrollDiffX + scrollDiffX;
    this._gridX = this._left - this._containerDiffX;

    // Update vertical position data.
    this._top = this._top - this._scrollDiffY + scrollDiffY;
    this._gridY = this._top - this._containerDiffY;

    // Update scroll diff.
    this._scrollDiffX = scrollDiffX;
    this._scrollDiffY = scrollDiffY;
  };

  /**
   * Apply scroll to dragged item.
   *
   * @private
   * @memberof ItemDrag.prototype
   */
  ItemDrag.prototype._applyScroll = function() {
    var item = this._item;
    if (!item._isActive) return;

    this._scrollDiffX = this._scrollDiffY = 0;
    item._element.style[transformProp] = getTranslateString(this._left, this._top);
    this._getGrid()._emit(EVENT_DRAG_SCROLL, item, this._scrollEvent);
  };

  /**
   * Drag end handler.
   *
   * @private
   * @memberof ItemDrag.prototype
   * @param {DraggerEvent} event
   */
  ItemDrag.prototype._onEnd = function(event) {
    var item = this._item;
    var element = item._element;
    var grid = this._getGrid();
    var settings = grid._settings;
    var release = item._dragRelease;

    // If item is not active, reset drag.
    if (!item._isActive) {
      this.stop();
      return;
    }

    // Cancel queued ticks.
    cancelDragStartTick(item._id);
    cancelDragMoveTick(item._id);
    cancelDragScrollTick(item._id);

    // Finish sort procedure (does final overlap check if needed).
    this._finishSort();

    // Remove scroll listeners.
    this._unbindScrollListeners();

    // Setup release data.
    release._containerDiffX = this._containerDiffX;
    release._containerDiffY = this._containerDiffY;

    // Reset drag data.
    this._reset();

    // Remove drag class name from element.
    removeClass(element, settings.itemDraggingClass);

    // Stop auto-scroll.
    AUTO_SCROLLER.removeItem(item);

    // Emit dragEnd event.
    grid._emit(EVENT_DRAG_END, item, event);

    // Finish up the migration process or start the release process.
    this._isMigrating ? this._finishMigration() : release.start();
  };

  /**
   * Private helpers
   * ***************
   */

  /**
   * Check if an element is an anchor element and open the href url if possible.
   *
   * @param {HTMLElement} element
   */
  function openAnchorHref(element) {
    // Make sure the element is anchor element.
    if (element.tagName.toLowerCase() !== 'a') return;

    // Get href and make sure it exists.
    var href = element.getAttribute('href');
    if (!href) return;

    // Finally let's navigate to the link href.
    var target = element.getAttribute('target');
    if (target && target !== '_self') {
      window.open(href, target);
    } else {
      window.location.href = href;
    }
  }

  /**
   * Get current values of the provided styles definition object or array.
   *
   * @param {HTMLElement} element
   * @param {(Object|Array} styles
   * @return {Object}
   */
  function getCurrentStyles(element, styles) {
    var result = {};
    var prop, i;

    if (Array.isArray(styles)) {
      for (i = 0; i < styles.length; i++) {
        prop = styles[i];
        result[prop] = getStyle(element, getStyleName(prop));
      }
    } else {
      for (prop in styles) {
        result[prop] = getStyle(element, getStyleName(prop));
      }
    }

    return result;
  }

  var unprefixRegEx = /^(webkit|moz|ms|o|Webkit|Moz|MS|O)(?=[A-Z])/;
  var cache = {};

  /**
   * Remove any potential vendor prefixes from a property name.
   *
   * @param {String} prop
   * @returns {String}
   */
  function getUnprefixedPropName(prop) {
    var result = cache[prop];
    if (result) return result;

    result = prop.replace(unprefixRegEx, '');

    if (result !== prop) {
      result = result[0].toLowerCase() + result.slice(1);
    }

    cache[prop] = result;

    return result;
  }

  var nativeCode = '[native code]';

  /**
   * Check if a value (e.g. a method or constructor) is native code. Good for
   * detecting when a polyfill is used and when not.
   *
   * @param {*} feat
   * @returns {Boolean}
   */
  function isNative(feat) {
    var S = window.Symbol;
    return !!(
      feat &&
      isFunction(S) &&
      isFunction(S.toString) &&
      S(feat)
        .toString()
        .indexOf(nativeCode) > -1
    );
  }

  /**
   * Set inline styles to an element.
   *
   * @param {HTMLElement} element
   * @param {Object} styles
   */
  function setStyles(element, styles) {
    for (var prop in styles) {
      element.style[prop] = styles[prop];
    }
  }

  var HAS_WEB_ANIMATIONS = !!(Element && isFunction(Element.prototype.animate));
  var HAS_NATIVE_WEB_ANIMATIONS = !!(Element && isNative(Element.prototype.animate));

  /**
   * Item animation handler powered by Web Animations API.
   *
   * @class
   * @param {HTMLElement} element
   */
  function ItemAnimate(element) {
    this._element = element;
    this._animation = null;
    this._duration = 0;
    this._easing = '';
    this._callback = null;
    this._props = [];
    this._values = [];
    this._isDestroyed = false;
    this._onFinish = this._onFinish.bind(this);
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start instance's animation. Automatically stops current animation if it is
   * running.
   *
   * @public
   * @memberof ItemAnimate.prototype
   * @param {Object} propsFrom
   * @param {Object} propsTo
   * @param {Object} [options]
   * @param {Number} [options.duration=300]
   * @param {String} [options.easing='ease']
   * @param {Function} [options.onFinish]
   */
  ItemAnimate.prototype.start = function(propsFrom, propsTo, options) {
    if (this._isDestroyed) return;

    var element = this._element;
    var opts = options || {};

    // If we don't have web animations available let's not animate.
    if (!HAS_WEB_ANIMATIONS) {
      setStyles(element, propsTo);
      this._callback = isFunction(opts.onFinish) ? opts.onFinish : null;
      this._onFinish();
      return;
    }

    var animation = this._animation;
    var currentProps = this._props;
    var currentValues = this._values;
    var duration = opts.duration || 300;
    var easing = opts.easing || 'ease';
    var cancelAnimation = false;
    var propName, propCount, propIndex;

    // If we have an existing animation running, let's check if it needs to be
    // cancelled or if it can continue running.
    if (animation) {
      propCount = 0;

      // Cancel animation if duration or easing has changed.
      if (duration !== this._duration || easing !== this._easing) {
        cancelAnimation = true;
      }

      // Check if the requested animation target props and values match with the
      // current props and values.
      if (!cancelAnimation) {
        for (propName in propsTo) {
          ++propCount;
          propIndex = currentProps.indexOf(propName);
          if (propIndex === -1 || propsTo[propName] !== currentValues[propIndex]) {
            cancelAnimation = true;
            break;
          }
        }

        // Check if the target props count matches current props count. This is
        // needed for the edge case scenario where target props contain the same
        // styles as current props, but the current props have some additional
        // props.
        if (propCount !== currentProps.length) {
          cancelAnimation = true;
        }
      }
    }

    // Cancel animation (if required).
    if (cancelAnimation) animation.cancel();

    // Store animation callback.
    this._callback = isFunction(opts.onFinish) ? opts.onFinish : null;

    // If we have a running animation that does not need to be cancelled, let's
    // call it a day here and let it run.
    if (animation && !cancelAnimation) return;

    // Store target props and values to instance.
    currentProps.length = currentValues.length = 0;
    for (propName in propsTo) {
      currentProps.push(propName);
      currentValues.push(propsTo[propName]);
    }

    // Start the animation. We need to provide unprefixed property names to the
    // Web Animations polyfill if it is being used. If we have native Web
    // Animations available we need to provide prefixed properties instead.
    this._duration = duration;
    this._easing = easing;
    this._animation = element.animate(
      [
        createFrame(propsFrom, !HAS_NATIVE_WEB_ANIMATIONS),
        createFrame(propsTo, !HAS_NATIVE_WEB_ANIMATIONS)
      ],
      {
        duration: duration,
        easing: easing
      }
    );
    this._animation.onfinish = this._onFinish;

    // Set the end styles. This makes sure that the element stays at the end
    // values after animation is finished.
    setStyles(element, propsTo);
  };

  /**
   * Stop instance's current animation if running.
   *
   * @public
   * @memberof ItemAnimate.prototype
   * @param {Boolean} [applyCurrentStyles=true]
   */
  ItemAnimate.prototype.stop = function(applyCurrentStyles) {
    if (this._isDestroyed || !this._animation) return;

    var element = this._element;
    var currentProps = this._props;
    var currentValues = this._values;

    if (applyCurrentStyles !== false) {
      setStyles(element, getCurrentStyles(element, currentProps));
    }

    this._animation.cancel();
    this._animation = this._callback = null;
    currentProps.length = currentValues.length = 0;
  };

  /**
   * Check if the item is being animated currently.
   *
   * @public
   * @memberof ItemAnimate.prototype
   * @return {Boolean}
   */
  ItemAnimate.prototype.isAnimating = function() {
    return !!this._animation;
  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   * @memberof ItemAnimate.prototype
   */
  ItemAnimate.prototype.destroy = function() {
    if (this._isDestroyed) return;
    this.stop();
    this._element = null;
    this._isDestroyed = true;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Animation end handler.
   *
   * @private
   * @memberof ItemAnimate.prototype
   */
  ItemAnimate.prototype._onFinish = function() {
    var callback = this._callback;
    this._animation = this._callback = null;
    this._props.length = this._values.length = 0;
    callback && callback();
  };

  /**
   * Private helpers
   * ***************
   */

  function createFrame(props, unprefix) {
    var frame = {};
    for (var prop in props) {
      frame[unprefix ? getUnprefixedPropName(prop) : prop] = props[prop];
    }
    return frame;
  }

  /**
   * Drag placeholder.
   *
   * @class
   * @param {Item} item
   */
  function ItemDragPlaceholder(item) {
    this._item = item;
    this._animation = new ItemAnimate();
    this._element = null;
    this._className = '';
    this._didMigrate = false;
    this._resetAfterLayout = false;
    this._left = 0;
    this._top = 0;
    this._transX = 0;
    this._transY = 0;
    this._nextTransX = 0;
    this._nextTransY = 0;

    // Bind animation handlers.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
    this._updateDimensions = this._updateDimensions.bind(this);

    // Bind event handlers.
    this._onLayoutStart = this._onLayoutStart.bind(this);
    this._onLayoutEnd = this._onLayoutEnd.bind(this);
    this._onReleaseEnd = this._onReleaseEnd.bind(this);
    this._onMigrate = this._onMigrate.bind(this);
    this._onHide = this._onHide.bind(this);
  }

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Update placeholder's dimensions to match the item's dimensions.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype._updateDimensions = function() {
    if (!this.isActive()) return;
    setStyles(this._element, {
      width: this._item._width + 'px',
      height: this._item._height + 'px'
    });
  };

  /**
   * Move placeholder to a new position.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   * @param {Item[]} items
   * @param {Boolean} isInstant
   */
  ItemDragPlaceholder.prototype._onLayoutStart = function(items, isInstant) {
    var item = this._item;

    // If the item is not part of the layout anymore reset placeholder.
    if (items.indexOf(item) === -1) {
      this.reset();
      return;
    }

    var nextLeft = item._left;
    var nextTop = item._top;
    var currentLeft = this._left;
    var currentTop = this._top;

    // Keep track of item layout position.
    this._left = nextLeft;
    this._top = nextTop;

    // If item's position did not change, and the item did not migrate and the
    // layout is not instant and we can safely skip layout.
    if (!isInstant && !this._didMigrate && currentLeft === nextLeft && currentTop === nextTop) {
      return;
    }

    // Slots data is calculated with item margins added to them so we need to add
    // item's left and top margin to the slot data to get the placeholder's
    // next position.
    var nextX = nextLeft + item._marginLeft;
    var nextY = nextTop + item._marginTop;

    // Just snap to new position without any animations if no animation is
    // required or if placeholder moves between grids.
    var grid = item.getGrid();
    var animEnabled = !isInstant && grid._settings.layoutDuration > 0;
    if (!animEnabled || this._didMigrate) {
      // Cancel potential (queued) layout tick.
      cancelPlaceholderLayoutTick(item._id);

      // Snap placeholder to correct position.
      var targetStyles = {};
      targetStyles[transformProp] = getTranslateString(nextX, nextY);
      setStyles(this._element, targetStyles);
      this._animation.stop(false);

      // Move placeholder inside correct container after migration.
      if (this._didMigrate) {
        grid.getElement().appendChild(this._element);
        this._didMigrate = false;
      }

      return;
    }

    // Start the placeholder's layout animation in the next tick. We do this to
    // avoid layout thrashing.
    this._nextTransX = nextX;
    this._nextTransY = nextY;
    addPlaceholderLayoutTick(item._id, this._setupAnimation, this._startAnimation);
  };

  /**
   * Prepare placeholder for layout animation.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype._setupAnimation = function() {
    if (!this.isActive()) return;

    var translate = getTranslate(this._element);
    this._transX = translate.x;
    this._transY = translate.y;
  };

  /**
   * Start layout animation.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype._startAnimation = function() {
    if (!this.isActive()) return;

    var animation = this._animation;
    var currentX = this._transX;
    var currentY = this._transY;
    var nextX = this._nextTransX;
    var nextY = this._nextTransY;
    var targetStyles = {};

    targetStyles[transformProp] = getTranslateString(nextX, nextY);

    // If placeholder is already in correct position let's just stop animation
    // and be done with it.
    if (currentX === nextX && currentY === nextY) {
      if (animation.isAnimating()) {
        setStyles(this._element, targetStyles);
        animation.stop(false);
      }
      return;
    }

    // Otherwise let's start the animation.
    var settings = this._item.getGrid()._settings;
    var currentStyles = {};
    currentStyles[transformProp] = getTranslateString(currentX, currentY);
    animation.start(currentStyles, targetStyles, {
      duration: settings.layoutDuration,
      easing: settings.layoutEasing,
      onFinish: this._onLayoutEnd
    });
  };

  /**
   * Layout end handler.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype._onLayoutEnd = function() {
    if (this._resetAfterLayout) {
      this.reset();
    }
  };

  /**
   * Drag end handler. This handler is called when dragReleaseEnd event is
   * emitted and receives the event data as it's argument.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   * @param {Item} item
   */
  ItemDragPlaceholder.prototype._onReleaseEnd = function(item) {
    if (item._id === this._item._id) {
      // If the placeholder is not animating anymore we can safely reset it.
      if (!this._animation.isAnimating()) {
        this.reset();
        return;
      }

      // If the placeholder item is still animating here, let's wait for it to
      // finish it's animation.
      this._resetAfterLayout = true;
    }
  };

  /**
   * Migration start handler. This handler is called when beforeSend event is
   * emitted and receives the event data as it's argument.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   * @param {Object} data
   * @param {Item} data.item
   * @param {Grid} data.fromGrid
   * @param {Number} data.fromIndex
   * @param {Grid} data.toGrid
   * @param {Number} data.toIndex
   */
  ItemDragPlaceholder.prototype._onMigrate = function(data) {
    // Make sure we have a matching item.
    if (data.item !== this._item) return;

    var grid = this._item.getGrid();
    var nextGrid = data.toGrid;

    // Unbind listeners from current grid.
    grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.off(EVENT_BEFORE_SEND, this._onMigrate);
    grid.off(EVENT_HIDE_START, this._onHide);

    // Bind listeners to the next grid.
    nextGrid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    nextGrid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    nextGrid.on(EVENT_BEFORE_SEND, this._onMigrate);
    nextGrid.on(EVENT_HIDE_START, this._onHide);

    // Mark the item as migrated.
    this._didMigrate = true;
  };

  /**
   * Reset placeholder if the associated item is hidden.
   *
   * @private
   * @memberof ItemDragPlaceholder.prototype
   * @param {Item[]} items
   */
  ItemDragPlaceholder.prototype._onHide = function(items) {
    if (items.indexOf(this._item) > -1) this.reset();
  };

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Create placeholder. Note that this method only writes to DOM and does not
   * read anything from DOM so it should not cause any additional layout
   * thrashing when it's called at the end of the drag start procedure.
   *
   * @public
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype.create = function() {
    // If we already have placeholder set up we can skip the initiation logic.
    if (this.isActive()) {
      this._resetAfterLayout = false;
      return;
    }

    var item = this._item;
    var grid = item.getGrid();
    var settings = grid._settings;
    var animation = this._animation;

    // Keep track of layout position.
    this._left = item._left;
    this._top = item._top;

    // Create placeholder element.
    var element;
    if (isFunction(settings.dragPlaceholder.createElement)) {
      element = settings.dragPlaceholder.createElement(item);
    } else {
      element = document.createElement('div');
    }
    this._element = element;

    // Update element to animation instance.
    animation._element = element;

    // Add placeholder class to the placeholder element.
    this._className = settings.itemPlaceholderClass || '';
    if (this._className) {
      addClass(element, this._className);
    }

    // Set initial styles.
    setStyles(element, {
      display: 'block',
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: item._width + 'px',
      height: item._height + 'px'
    });

    // Set initial position.
    var left = item._left + item._marginLeft;
    var top = item._top + item._marginTop;
    element.style[transformProp] = getTranslateString(left, top);

    // Bind event listeners.
    grid.on(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.on(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.on(EVENT_BEFORE_SEND, this._onMigrate);
    grid.on(EVENT_HIDE_START, this._onHide);

    // onCreate hook.
    if (isFunction(settings.dragPlaceholder.onCreate)) {
      settings.dragPlaceholder.onCreate(item, element);
    }

    // Insert the placeholder element to the grid.
    grid.getElement().appendChild(element);
  };

  /**
   * Reset placeholder data.
   *
   * @public
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype.reset = function() {
    if (!this.isActive()) return;

    var element = this._element;
    var item = this._item;
    var grid = item.getGrid();
    var settings = grid._settings;
    var animation = this._animation;

    // Reset flag.
    this._resetAfterLayout = false;

    // Cancel potential (queued) layout tick.
    cancelPlaceholderLayoutTick(item._id);
    cancelPlaceholderResizeTick(item._id);

    // Reset animation instance.
    animation.stop();
    animation._element = null;

    // Unbind event listeners.
    grid.off(EVENT_DRAG_RELEASE_END, this._onReleaseEnd);
    grid.off(EVENT_LAYOUT_START, this._onLayoutStart);
    grid.off(EVENT_BEFORE_SEND, this._onMigrate);
    grid.off(EVENT_HIDE_START, this._onHide);

    // Remove placeholder class from the placeholder element.
    if (this._className) {
      removeClass(element, this._className);
      this._className = '';
    }

    // Remove element.
    element.parentNode.removeChild(element);
    this._element = null;

    // onRemove hook. Note that here we use the current grid's onRemove callback
    // so if the item has migrated during drag the onRemove method will not be
    // the originating grid's method.
    if (isFunction(settings.dragPlaceholder.onRemove)) {
      settings.dragPlaceholder.onRemove(item, element);
    }
  };

  /**
   * Check if placeholder is currently active (visible).
   *
   * @public
   * @memberof ItemDragPlaceholder.prototype
   * @returns {Boolean}
   */
  ItemDragPlaceholder.prototype.isActive = function() {
    return !!this._element;
  };

  /**
   * Get placeholder element.
   *
   * @public
   * @memberof ItemDragPlaceholder.prototype
   * @returns {?HTMLElement}
   */
  ItemDragPlaceholder.prototype.getElement = function() {
    return this._element;
  };

  /**
   * Update placeholder's dimensions to match the item's dimensions. Note that
   * the updating is done asynchronously in the next tick to avoid layout
   * thrashing.
   *
   * @public
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype.updateDimensions = function() {
    if (!this.isActive()) return;
    addPlaceholderResizeTick(this._item._id, this._updateDimensions);
  };

  /**
   * Destroy placeholder instance.
   *
   * @public
   * @memberof ItemDragPlaceholder.prototype
   */
  ItemDragPlaceholder.prototype.destroy = function() {
    this.reset();
    this._animation.destroy();
    this._item = this._animation = null;
  };

  /**
   * The release process handler constructor. Although this might seem as proper
   * fit for the drag process this needs to be separated into it's own logic
   * because there might be a scenario where drag is disabled, but the release
   * process still needs to be implemented (dragging from a grid to another).
   *
   * @class
   * @param {Item} item
   */
  function ItemDragRelease(item) {
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._isPositioningStarted = false;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start the release process of an item.
   *
   * @public
   * @memberof ItemDragRelease.prototype
   * @returns {ItemDragRelease}
   */
  ItemDragRelease.prototype.start = function() {
    if (this._isDestroyed || this._isActive) return this;

    var item = this._item;
    var grid = item.getGrid();
    var settings = grid._settings;

    this._isActive = true;
    addClass(item._element, settings.itemReleasingClass);
    if (!settings.dragRelease.useDragContainer) {
      this._placeToGrid();
    }
    grid._emit(EVENT_DRAG_RELEASE_START, item);

    // Let's start layout manually _only_ if there is no unfinished layout in
    // about to finish.
    if (!grid._nextLayoutData) item._layout.start(false);

    return this;
  };

  /**
   * End the release process of an item. This method can be used to abort an
   * ongoing release process (animation) or finish the release process.
   *
   * @public
   * @memberof ItemDragRelease.prototype
   * @param {Boolean} [abort=false]
   *  - Should the release be aborted? When true, the release end event won't be
   *    emitted. Set to true only when you need to abort the release process
   *    while the item is animating to it's position.
   * @param {Number} [left]
   *  - The element's current translateX value (optional).
   * @param {Number} [top]
   *  - The element's current translateY value (optional).
   * @returns {ItemDragRelease}
   */
  ItemDragRelease.prototype.stop = function(abort, left, top) {
    if (this._isDestroyed || !this._isActive) return this;

    var item = this._item;
    var grid = item.getGrid();

    if (!abort && (left === undefined || top === undefined)) {
      left = item._left;
      top = item._top;
    }

    this._placeToGrid(left, top);
    this._reset();

    if (!abort) grid._emit(EVENT_DRAG_RELEASE_END, item);

    return this;
  };

  ItemDragRelease.prototype.isJustReleased = function() {
    return this._isActive && this._isPositioningStarted === false;
  };

  /**
   * Destroy instance.
   *
   * @public
   * @memberof ItemDragRelease.prototype
   * @returns {ItemDragRelease}
   */
  ItemDragRelease.prototype.destroy = function() {
    if (this._isDestroyed) return this;
    this.stop(true);
    this._item = null;
    this._isDestroyed = true;
    return this;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Move the element back to the grid container element if it does not exist
   * there already.
   *
   * @private
   * @param {Number} [left]
   *  - The element's current translateX value (optional).
   * @param {Number} [top]
   *  - The element's current translateY value (optional).
   * @memberof ItemDragRelease.prototype
   */
  ItemDragRelease.prototype._placeToGrid = function(left, top) {
    if (this._isDestroyed) return;

    var item = this._item;
    var element = item._element;
    var grid = item.getGrid();
    var container = grid._element;

    if (element.parentNode !== container) {
      if (left === undefined || top === undefined) {
        var translate = getTranslate(element);
        left = translate.x - this._containerDiffX;
        top = translate.y - this._containerDiffY;
      }

      container.appendChild(element);
      element.style[transformProp] = getTranslateString(left, top);
    }

    this._containerDiffX = 0;
    this._containerDiffY = 0;
  };

  /**
   * Reset public data and remove releasing class.
   *
   * @private
   * @memberof ItemDragRelease.prototype
   */
  ItemDragRelease.prototype._reset = function() {
    if (this._isDestroyed) return;
    var item = this._item;
    this._isActive = false;
    this._isPositioningStarted = false;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
    removeClass(item._element, item.getGrid()._settings.itemReleasingClass);
  };

  /**
   * Queue constructor.
   *
   * @class
   */
  function Queue() {
    this._queue = [];
    this._processQueue = [];
    this._processCounter = 0;
    this._isDestroyed = false;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Add callback to the queue.
   *
   * @public
   * @memberof Queue.prototype
   * @param {Function} callback
   * @returns {Queue}
   */
  Queue.prototype.add = function(callback) {
    if (this._isDestroyed) return this;
    this._queue.push(callback);
    return this;
  };

  /**
   * Process queue callbacks in the order they were insterted and reset the queue.
   * The provided arguments are passed on to the callbacks.
   *
   * @public
   * @memberof Queue.prototype
   * @param {...*} args
   * @returns {Queue}
   */
  Queue.prototype.process = function() {
    if (this._isDestroyed) return this;

    var queue = this._queue;
    var queueLength = queue.length;

    // Quit early if the queue is empty.
    if (!queueLength) return this;

    var pQueue = this._processQueue;
    var pQueueLength = pQueue.length;
    var i;

    // Append the current queue callbacks to the process queue.
    for (i = 0; i < queueLength; i++) {
      pQueue.push(queue[i]);
    }

    // Reset queue.
    queue.length = 0;

    // Increment process counter.
    ++this._processCounter;

    // Call the new process queue callbacks.
    var indexFrom = pQueueLength;
    var indexTo = pQueue.length;
    for (i = indexFrom; i < indexTo; i++) {
      if (this._isDestroyed) return this;
      pQueue[i].apply(null, arguments);
    }

    // Decrement process counter.
    --this._processCounter;

    // Reset process queue once it has stop processing.
    if (!this._processCounter) {
      pQueue.length = 0;
    }

    return this;
  };

  /**
   * Destroy Queue instance.
   *
   * @public
   * @memberof Queue.prototype
   * @returns {Queue}
   */
  Queue.prototype.destroy = function() {
    if (this._isDestroyed) return this;

    this._isDestroyed = true;
    this._queue.length = 0;
    this._processQueue.length = 0;
    this._processCounter = 0;

    return this;
  };

  var MIN_ANIMATION_DISTANCE = 2;

  /**
   * Layout manager for Item instance, handles the positioning of an item.
   *
   * @class
   * @param {Item} item
   */
  function ItemLayout(item) {
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._isInterrupted = false;
    this._currentStyles = {};
    this._targetStyles = {};
    this._currentLeft = 0;
    this._currentTop = 0;
    this._offsetLeft = 0;
    this._offsetTop = 0;
    this._skipNextAnimation = false;
    this._animOptions = {
      onFinish: this._finish.bind(this),
      duration: 0,
      easing: 0
    };

    // Set element's initial position styles.
    item._element.style.left = '0px';
    item._element.style.top = '0px';
    item._element.style[transformProp] = getTranslateString(0, 0);

    this._animation = new ItemAnimate(item._element);
    this._queue = new Queue();

    // Bind animation handlers and finish method.
    this._setupAnimation = this._setupAnimation.bind(this);
    this._startAnimation = this._startAnimation.bind(this);
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start item layout based on it's current data.
   *
   * @public
   * @memberof ItemLayout.prototype
   * @param {Boolean} [instant=false]
   * @param {Function} [onFinish]
   * @returns {ItemLayout}
   */
  ItemLayout.prototype.start = function(instant, onFinish) {
    if (this._isDestroyed) return;

    var item = this._item;
    var release = item._dragRelease;
    var gridSettings = item.getGrid()._settings;
    var isPositioning = this._isActive;
    var isJustReleased = release.isJustReleased();
    var animDuration = isJustReleased
      ? gridSettings.dragRelease.duration
      : gridSettings.layoutDuration;
    var animEasing = isJustReleased ? gridSettings.dragRelease.easing : gridSettings.layoutEasing;
    var animEnabled = !instant && !this._skipNextAnimation && animDuration > 0;

    // If the item is currently positioning cancel potential queued layout tick
    // and process current layout callback queue with interrupted flag on.
    if (isPositioning) {
      cancelLayoutTick(item._id);
      this._queue.process(true, item);
    }

    // Mark release positioning as started.
    if (isJustReleased) release._isPositioningStarted = true;

    // Push the callback to the callback queue.
    if (isFunction(onFinish)) this._queue.add(onFinish);

    // Reset animation skipping flag.
    this._skipNextAnimation = false;

    // If no animations are needed, easy peasy!
    if (!animEnabled) {
      this._updateOffsets();
      this._updateTargetStyles();
      setStyles(item._element, this._targetStyles);
      this._animation.stop(false);
      this._finish();
      return this;
    }

    // Kick off animation to be started in the next tick.
    this._isActive = true;
    this._animOptions.easing = animEasing;
    this._animOptions.duration = animDuration;
    this._isInterrupted = isPositioning;
    addLayoutTick(item._id, this._setupAnimation, this._startAnimation);

    return this;
  };

  /**
   * Stop item's position animation if it is currently animating.
   *
   * @public
   * @memberof ItemLayout.prototype
   * @param {Boolean} [processCallbackQueue=false]
   * @param {Object} [targetStyles]
   * @returns {ItemLayout}
   */
  ItemLayout.prototype.stop = function(processCallbackQueue, targetStyles) {
    if (this._isDestroyed || !this._isActive) return this;

    var item = this._item;

    // Cancel animation init.
    cancelLayoutTick(item._id);

    // Stop animation.
    if (targetStyles) setStyles(item._element, targetStyles);
    this._animation.stop(!targetStyles);

    // Remove positioning class.
    removeClass(item._element, item.getGrid()._settings.itemPositioningClass);

    // Reset active state.
    this._isActive = false;

    // Process callback queue if needed.
    if (processCallbackQueue) this._queue.process(true, item);

    return this;
  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   * @memberof ItemLayout.prototype
   * @returns {ItemLayout}
   */
  ItemLayout.prototype.destroy = function() {
    if (this._isDestroyed) return this;
    this.stop(true, {});
    this._queue.destroy();
    this._animation.destroy();
    this._item._element.style[transformProp] = '';
    this._item = null;
    this._currentStyles = null;
    this._targetStyles = null;
    this._animOptions = null;
    this._isDestroyed = true;
    return this;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Calculate and update item's current layout offset data.
   *
   * @private
   * @memberof ItemLayout.prototype
   */
  ItemLayout.prototype._updateOffsets = function() {
    if (this._isDestroyed) return;

    var item = this._item;
    var migrate = item._migrate;
    var release = item._dragRelease;

    this._offsetLeft = release._isActive
      ? release._containerDiffX
      : migrate._isActive
      ? migrate._containerDiffX
      : 0;

    this._offsetTop = release._isActive
      ? release._containerDiffY
      : migrate._isActive
      ? migrate._containerDiffY
      : 0;
  };

  /**
   * Calculate and update item's layout target styles.
   *
   * @private
   * @memberof ItemLayout.prototype
   */
  ItemLayout.prototype._updateTargetStyles = function() {
    if (this._isDestroyed) return;
    this._targetStyles[transformProp] = getTranslateString(
      this._item._left + this._offsetLeft,
      this._item._top + this._offsetTop
    );
  };

  /**
   * Finish item layout procedure.
   *
   * @private
   * @memberof ItemLayout.prototype
   */
  ItemLayout.prototype._finish = function() {
    if (this._isDestroyed) return;

    var item = this._item;
    var migrate = item._migrate;
    var release = item._dragRelease;

    // Mark the item as inactive and remove positioning classes.
    if (this._isActive) {
      this._isActive = false;
      removeClass(item._element, item.getGrid()._settings.itemPositioningClass);
    }

    // Finish up release and migration.
    if (release._isActive) release.stop();
    if (migrate._isActive) migrate.stop();

    // Process the callback queue.
    this._queue.process(false, item);
  };

  /**
   * Prepare item for layout animation.
   *
   * @private
   * @memberof ItemLayout.prototype
   */
  ItemLayout.prototype._setupAnimation = function() {
    // TODO: Keep track of the translate value so we only need to query the DOM
    // here if the item is animating currently.
    var translate = getTranslate(this._item._element);
    this._currentLeft = translate.x;
    this._currentTop = translate.y;
  };

  /**
   * Start layout animation.
   *
   * @private
   * @memberof ItemLayout.prototype
   */
  ItemLayout.prototype._startAnimation = function() {
    var item = this._item;
    var settings = item.getGrid()._settings;
    var isInstant = this._animOptions.duration <= 0;

    // Let's update the offset data and target styles.
    this._updateOffsets();
    this._updateTargetStyles();

    var xDiff = Math.abs(item._left - (this._currentLeft - this._offsetLeft));
    var yDiff = Math.abs(item._top - (this._currentTop - this._offsetTop));

    // If there is no need for animation or if the item is already in correct
    // position (or near it) let's finish the process early.
    if (isInstant || (xDiff < MIN_ANIMATION_DISTANCE && yDiff < MIN_ANIMATION_DISTANCE)) {
      if (xDiff || yDiff || this._isInterrupted) {
        setStyles(item._element, this._targetStyles);
      }
      this._animation.stop(false);
      this._finish();
      return;
    }

    // Set item's positioning class if needed.
    if (!this._isInterrupted) {
      addClass(item._element, settings.itemPositioningClass);
    }

    // Get current styles for animation.
    this._currentStyles[transformProp] = getTranslateString(this._currentLeft, this._currentTop);

    // Animate.
    this._animation.start(this._currentStyles, this._targetStyles, this._animOptions);
  };

  /**
   * The migrate process handler constructor.
   *
   * @class
   * @param {Item} item
   */
  function ItemMigrate(item) {
    // Private props.
    this._item = item;
    this._isActive = false;
    this._isDestroyed = false;
    this._container = false;
    this._containerDiffX = 0;
    this._containerDiffY = 0;
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Start the migrate process of an item.
   *
   * @public
   * @memberof ItemMigrate.prototype
   * @param {Grid} targetGrid
   * @param {GridSingleItemQuery} position
   * @param {HTMLElement} [container]
   * @returns {ItemMigrate}
   */
  ItemMigrate.prototype.start = function(targetGrid, position, container) {
    if (this._isDestroyed) return this;

    var item = this._item;
    var element = item._element;
    var isVisible = item.isVisible();
    var grid = item.getGrid();
    var settings = grid._settings;
    var targetSettings = targetGrid._settings;
    var targetElement = targetGrid._element;
    var targetItems = targetGrid._items;
    var currentIndex = grid._items.indexOf(item);
    var targetContainer = container || document.body;
    var targetIndex;
    var targetItem;
    var currentContainer;
    var offsetDiff;
    var containerDiff;
    var translate;
    var translateX;
    var translateY;
    var layoutStyles;

    // Get target index.
    if (typeof position === 'number') {
      targetIndex = normalizeArrayIndex(targetItems, position, 1);
    } else {
      targetItem = targetGrid._getItem(position);
      if (!targetItem) return this;
      targetIndex = targetItems.indexOf(targetItem);
    }

    // Get current translateX and translateY values if needed.
    if (item.isPositioning() || this._isActive || item.isReleasing()) {
      translate = getTranslate(element);
      translateX = translate.x;
      translateY = translate.y;
    }

    // Abort current positioning.
    if (item.isPositioning()) {
      layoutStyles = {};
      layoutStyles[transformProp] = getTranslateString(translateX, translateY);
      item._layout.stop(true, layoutStyles);
    }

    // Abort current migration.
    if (this._isActive) {
      translateX -= this._containerDiffX;
      translateY -= this._containerDiffY;
      this.stop(true, translateX, translateY);
    }

    // Abort current release.
    if (item.isReleasing()) {
      translateX -= item._dragRelease._containerDiffX;
      translateY -= item._dragRelease._containerDiffY;
      item._dragRelease.stop(true, translateX, translateY);
    }

    // Stop current visibility animations.
    item._visibility._stopAnimation();

    // Destroy current drag.
    if (item._drag) item._drag.destroy();

    // Process current visibility animation queue.
    item._visibility._queue.process(true, item);

    // Emit beforeSend event.
    if (grid._hasListeners(EVENT_BEFORE_SEND)) {
      grid._emit(EVENT_BEFORE_SEND, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Emit beforeReceive event.
    if (targetGrid._hasListeners(EVENT_BEFORE_RECEIVE)) {
      targetGrid._emit(EVENT_BEFORE_RECEIVE, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Remove current classnames.
    removeClass(element, settings.itemClass);
    removeClass(element, settings.itemVisibleClass);
    removeClass(element, settings.itemHiddenClass);

    // Add new classnames.
    addClass(element, targetSettings.itemClass);
    addClass(element, isVisible ? targetSettings.itemVisibleClass : targetSettings.itemHiddenClass);

    // Move item instance from current grid to target grid.
    grid._items.splice(currentIndex, 1);
    arrayInsert(targetItems, item, targetIndex);

    // Update item's grid id reference.
    item._gridId = targetGrid._id;

    // Get current container.
    currentContainer = element.parentNode;

    // Move the item inside the target container if it's different than the
    // current container.
    if (targetContainer !== currentContainer) {
      targetContainer.appendChild(element);
      offsetDiff = getOffsetDiff(targetContainer, currentContainer, true);
      if (!translate) {
        translate = getTranslate(element);
        translateX = translate.x;
        translateY = translate.y;
      }
      element.style[transformProp] = getTranslateString(
        translateX + offsetDiff.left,
        translateY + offsetDiff.top
      );
    }

    // Update child element's styles to reflect the current visibility state.
    item._visibility.setStyles(
      isVisible ? targetSettings.visibleStyles : targetSettings.hiddenStyles
    );

    // Update display style.
    element.style.display = isVisible ? 'block' : 'hidden';

    // Get offset diff for the migration data.
    containerDiff = getOffsetDiff(targetContainer, targetElement, true);

    // Update item's cached dimensions and sort data.
    item._refreshDimensions();
    item._refreshSortData();

    // Create new drag handler.
    item._drag = targetSettings.dragEnabled ? new ItemDrag(item) : null;

    // Setup migration data.
    this._isActive = true;
    this._container = targetContainer;
    this._containerDiffX = containerDiff.left;
    this._containerDiffY = containerDiff.top;

    // Emit send event.
    if (grid._hasListeners(EVENT_SEND)) {
      grid._emit(EVENT_SEND, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    // Emit receive event.
    if (targetGrid._hasListeners(EVENT_RECEIVE)) {
      targetGrid._emit(EVENT_RECEIVE, {
        item: item,
        fromGrid: grid,
        fromIndex: currentIndex,
        toGrid: targetGrid,
        toIndex: targetIndex
      });
    }

    return this;
  };

  /**
   * End the migrate process of an item. This method can be used to abort an
   * ongoing migrate process (animation) or finish the migrate process.
   *
   * @public
   * @memberof ItemMigrate.prototype
   * @param {Boolean} [abort=false]
   *  - Should the migration be aborted?
   * @param {Number} [left]
   *  - The element's current translateX value (optional).
   * @param {Number} [top]
   *  - The element's current translateY value (optional).
   * @returns {ItemMigrate}
   */
  ItemMigrate.prototype.stop = function(abort, left, top) {
    if (this._isDestroyed || !this._isActive) return this;

    var item = this._item;
    var element = item._element;
    var grid = item.getGrid();
    var gridElement = grid._element;
    var translate;

    if (this._container !== gridElement) {
      if (left === undefined || top === undefined) {
        if (abort) {
          translate = getTranslate(element);
          left = translate.x - this._containerDiffX;
          top = translate.y - this._containerDiffY;
        } else {
          left = item._left;
          top = item._top;
        }
      }

      gridElement.appendChild(element);
      element.style[transformProp] = getTranslateString(left, top);
    }

    this._isActive = false;
    this._container = null;
    this._containerDiffX = 0;
    this._containerDiffY = 0;

    return this;
  };

  /**
   * Destroy instance.
   *
   * @public
   * @memberof ItemMigrate.prototype
   * @returns {ItemMigrate}
   */
  ItemMigrate.prototype.destroy = function() {
    if (this._isDestroyed) return this;
    this.stop(true);
    this._item = null;
    this._isDestroyed = true;
    return this;
  };

  /**
   * Visibility manager for Item instance, handles visibility of an item.
   *
   * @class
   * @param {Item} item
   */
  function ItemVisibility(item) {
    var isActive = item._isActive;
    var element = item._element;
    var childElement = element.children[0];
    var settings = item.getGrid()._settings;

    if (!childElement) {
      throw new Error('No valid child element found within item element.');
    }

    this._item = item;
    this._isDestroyed = false;
    this._isHidden = !isActive;
    this._isHiding = false;
    this._isShowing = false;
    this._childElement = childElement;
    this._currentStyleProps = [];
    this._animation = new ItemAnimate(childElement);
    this._queue = new Queue();
    this._finishShow = this._finishShow.bind(this);
    this._finishHide = this._finishHide.bind(this);

    element.style.display = isActive ? 'block' : 'none';
    addClass(element, isActive ? settings.itemVisibleClass : settings.itemHiddenClass);
    this.setStyles(isActive ? settings.visibleStyles : settings.hiddenStyles);
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Show item.
   *
   * @public
   * @memberof ItemVisibility.prototype
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   * @returns {ItemVisibility}
   */
  ItemVisibility.prototype.show = function(instant, onFinish) {
    if (this._isDestroyed) return this;

    var item = this._item;
    var element = item._element;
    var queue = this._queue;
    var callback = isFunction(onFinish) ? onFinish : null;
    var grid = item.getGrid();
    var settings = grid._settings;

    // If item is visible call the callback and be done with it.
    if (!this._isShowing && !this._isHidden) {
      callback && callback(false, item);
      return this;
    }

    // If item is showing and does not need to be shown instantly, let's just
    // push callback to the callback queue and be done with it.
    if (this._isShowing && !instant) {
      callback && queue.add(callback);
      return this;
    }

    // If the item is hiding or hidden process the current visibility callback
    // queue with the interrupted flag active, update classes and set display
    // to block if necessary.
    if (!this._isShowing) {
      queue.process(true, item);
      removeClass(element, settings.itemHiddenClass);
      addClass(element, settings.itemVisibleClass);
      if (!this._isHiding) element.style.display = 'block';
    }

    // Push callback to the callback queue.
    callback && queue.add(callback);

    // Update visibility states.
    item._isActive = this._isShowing = true;
    this._isHiding = this._isHidden = false;

    // Finally let's start show animation.
    this._startAnimation(true, instant, this._finishShow);

    return this;
  };

  /**
   * Hide item.
   *
   * @public
   * @memberof ItemVisibility.prototype
   * @param {Boolean} instant
   * @param {Function} [onFinish]
   * @returns {ItemVisibility}
   */
  ItemVisibility.prototype.hide = function(instant, onFinish) {
    if (this._isDestroyed) return this;

    var item = this._item;
    var element = item._element;
    var queue = this._queue;
    var callback = isFunction(onFinish) ? onFinish : null;
    var grid = item.getGrid();
    var settings = grid._settings;

    // If item is already hidden call the callback and be done with it.
    if (!this._isHiding && this._isHidden) {
      callback && callback(false, item);
      return this;
    }

    // If item is hiding and does not need to be hidden instantly, let's just
    // push callback to the callback queue and be done with it.
    if (this._isHiding && !instant) {
      callback && queue.add(callback);
      return this;
    }

    // If the item is showing or visible process the current visibility callback
    // queue with the interrupted flag active, update classes and set display
    // to block if necessary.
    if (!this._isHiding) {
      queue.process(true, item);
      addClass(element, settings.itemHiddenClass);
      removeClass(element, settings.itemVisibleClass);
    }

    // Push callback to the callback queue.
    callback && queue.add(callback);

    // Update visibility states.
    this._isHidden = this._isHiding = true;
    item._isActive = this._isShowing = false;

    // Finally let's start hide animation.
    this._startAnimation(false, instant, this._finishHide);

    return this;
  };

  /**
   * Reset all existing visibility styles and apply new visibility styles to the
   * visibility element. This method should be used to set styles when there is a
   * chance that the current style properties differ from the new ones (basically
   * on init and on migrations).
   *
   * @public
   * @memberof ItemVisibility.prototype
   * @param {Object} styles
   * @returns {ItemVisibility}
   */
  ItemVisibility.prototype.setStyles = function(styles) {
    var childElement = this._childElement;
    var currentStyleProps = this._currentStyleProps;

    this._removeCurrentStyles();

    for (var prop in styles) {
      currentStyleProps.push(prop);
      childElement.style[prop] = styles[prop];
    }

    return this;
  };

  /**
   * Destroy the instance and stop current animation if it is running.
   *
   * @public
   * @memberof ItemVisibility.prototype
   * @returns {ItemVisibility}
   */
  ItemVisibility.prototype.destroy = function() {
    if (this._isDestroyed) return this;

    var item = this._item;
    var element = item._element;
    var grid = item.getGrid();
    var queue = this._queue;
    var settings = grid._settings;

    this._stopAnimation(false);

    // Fire all uncompleted callbacks with interrupted flag and destroy the queue.
    queue.process(true, item);
    queue.destroy();

    this._animation.destroy();
    this._removeCurrentStyles();
    removeClass(element, settings.itemVisibleClass);
    removeClass(element, settings.itemHiddenClass);
    element.style.display = '';

    // Reset state.
    this._isHiding = this._isShowing = false;
    this._isDestroyed = this._isHidden = true;

    return this;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Start visibility animation.
   *
   * @private
   * @memberof ItemVisibility.prototype
   * @param {Boolean} toVisible
   * @param {Boolean} [instant]
   * @param {Function} [onFinish]
   */
  ItemVisibility.prototype._startAnimation = function(toVisible, instant, onFinish) {
    if (this._isDestroyed) return;

    var item = this._item;
    var animation = this._animation;
    var childElement = this._childElement;
    var settings = item.getGrid()._settings;
    var targetStyles = toVisible ? settings.visibleStyles : settings.hiddenStyles;
    var duration = toVisible ? settings.showDuration : settings.hideDuration;
    var easing = toVisible ? settings.showEasing : settings.hideEasing;
    var isInstant = instant || duration <= 0;
    var currentStyles;

    // No target styles? Let's quit early.
    if (!targetStyles) {
      onFinish && onFinish();
      return;
    }

    // Cancel queued visibility tick.
    cancelVisibilityTick(item._id);

    // If we need to apply the styles instantly without animation.
    if (isInstant) {
      setStyles(childElement, targetStyles);
      if (animation.isAnimating()) {
        animation.stop(false);
      }
      onFinish && onFinish();
      return;
    }

    // Start the animation in the next tick (to avoid layout thrashing).
    addVisibilityTick(
      item._id,
      function() {
        currentStyles = getCurrentStyles(childElement, targetStyles);
      },
      function() {
        animation.start(currentStyles, targetStyles, {
          duration: duration,
          easing: easing,
          onFinish: onFinish
        });
      }
    );
  };

  /**
   * Stop visibility animation.
   *
   * @private
   * @memberof ItemVisibility.prototype
   * @param {Boolean} [applyCurrentStyles=true]
   */
  ItemVisibility.prototype._stopAnimation = function(applyCurrentStyles) {
    if (this._isDestroyed) return;
    var item = this._item;
    cancelVisibilityTick(item._id);
    this._animation.stop(applyCurrentStyles);
  };

  /**
   * Finish show procedure.
   *
   * @private
   * @memberof ItemVisibility.prototype
   */
  ItemVisibility.prototype._finishShow = function() {
    if (this._isHidden) return;
    this._isShowing = false;
    this._queue.process(false, this._item);
  };

  /**
   * Finish hide procedure.
   *
   * @private
   * @memberof ItemVisibility.prototype
   */
  ItemVisibility.prototype._finishHide = (function() {
    var layoutStyles = {};
    layoutStyles[transformProp] = getTranslateString(0, 0);
    return function() {
      if (!this._isHidden) return;
      var item = this._item;
      this._isHiding = false;
      item._layout.stop(true, layoutStyles);
      item._element.style.display = 'none';
      this._queue.process(false, item);
    };
  })();

  /**
   * Remove currently applied visibility related inline style properties.
   *
   * @private
   * @memberof ItemVisibility.prototype
   */
  ItemVisibility.prototype._removeCurrentStyles = function() {
    var childElement = this._childElement;
    var currentStyleProps = this._currentStyleProps;

    for (var i = 0; i < currentStyleProps.length; i++) {
      childElement.style[currentStyleProps[i]] = '';
    }

    currentStyleProps.length = 0;
  };

  var id = 0;

  /**
   * Returns a unique numeric id (increments a base value on every call).
   * @returns {Number}
   */
  function createUid() {
    return ++id;
  }

  /**
   * Creates a new Item instance for a Grid instance.
   *
   * @todo Element should be hidden until it has a computed position! This is a
   * new problem with async layout.
   *
   * @class
   * @param {Grid} grid
   * @param {HTMLElement} element
   * @param {Boolean} [isActive]
   */
  function Item(grid, element, isActive) {
    var settings = grid._settings;

    this._id = createUid();
    this._gridId = grid._id;
    this._element = element;
    this._isDestroyed = false;
    this._left = 0;
    this._top = 0;
    this._width = 0;
    this._height = 0;
    this._marginLeft = 0;
    this._marginRight = 0;
    this._marginTop = 0;
    this._marginBottom = 0;
    this._sortData = null;

    // If the provided item element is not a direct child of the grid container
    // element, append it to the grid container. Note, we are indeed reading the
    // DOM here but it's a property that does not cause reflowing.
    if (element.parentNode !== grid._element) {
      grid._element.appendChild(element);
    }

    // Set item class.
    addClass(element, settings.itemClass);

    // If isActive is not defined, let's try to auto-detect it. Note, we are
    // indeed reading the DOM here but it's a property that does not cause
    // reflowing.
    if (typeof isActive !== 'boolean') {
      isActive = getStyle(element, 'display') !== 'none';
    }

    // Set up active state (defines if the item is considered part of the layout
    // or not).
    this._isActive = isActive;

    // Setup visibility handler.
    this._visibility = new ItemVisibility(this);

    // Set up layout handler.
    this._layout = new ItemLayout(this);

    // Set up migration handler data.
    this._migrate = new ItemMigrate(this);

    // Set up drag handler.
    this._drag = settings.dragEnabled ? new ItemDrag(this) : null;

    // Set up release handler. Note that although this is fully linked to dragging
    // this still needs to be always instantiated to handle migration scenarios
    // correctly.
    this._dragRelease = new ItemDragRelease(this);

    // Set up drag placeholder handler. Note that although this is fully linked to
    // dragging this still needs to be always instantiated to handle migration
    // scenarios correctly.
    this._dragPlaceholder = new ItemDragPlaceholder(this);

    // Note! You must call the following methods before you start using the
    // instance. They are deliberately not called in the end as it would cause
    // potentially a massive amount of reflows if multiple items were instantiated
    // in a loop.
    // this._refreshDimensions();
    // this._refreshSortData();
  }

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Get the instance grid reference.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Grid}
   */
  Item.prototype.getGrid = function() {
    return GRID_INSTANCES[this._gridId];
  };

  /**
   * Get the instance element.
   *
   * @public
   * @memberof Item.prototype
   * @returns {HTMLElement}
   */
  Item.prototype.getElement = function() {
    return this._element;
  };

  /**
   * Get instance element's cached width.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Number}
   */
  Item.prototype.getWidth = function() {
    return this._width;
  };

  /**
   * Get instance element's cached height.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Number}
   */
  Item.prototype.getHeight = function() {
    return this._height;
  };

  /**
   * Get instance element's cached margins.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Object}
   *   - The returned object contains left, right, top and bottom properties
   *     which indicate the item element's cached margins.
   */
  Item.prototype.getMargin = function() {
    return {
      left: this._marginLeft,
      right: this._marginRight,
      top: this._marginTop,
      bottom: this._marginBottom
    };
  };

  /**
   * Get instance element's cached position.
   *
   * @public
   * @memberof Item.prototype
   * @returns {Object}
   *   - The returned object contains left and top properties which indicate the
   *     item element's cached position in the grid.
   */
  Item.prototype.getPosition = function() {
    return {
      left: this._left,
      top: this._top
    };
  };

  /**
   * Is the item active?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isActive = function() {
    return this._isActive;
  };

  /**
   * Is the item visible?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isVisible = function() {
    return !!this._visibility && !this._visibility._isHidden;
  };

  /**
   * Is the item being animated to visible?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isShowing = function() {
    return !!(this._visibility && this._visibility._isShowing);
  };

  /**
   * Is the item being animated to hidden?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isHiding = function() {
    return !!(this._visibility && this._visibility._isHiding);
  };

  /**
   * Is the item positioning?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isPositioning = function() {
    return !!(this._layout && this._layout._isActive);
  };

  /**
   * Is the item being dragged (or queued for dragging)?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isDragging = function() {
    return !!(this._drag && this._drag._isActive);
  };

  /**
   * Is the item being released?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isReleasing = function() {
    return !!(this._dragRelease && this._dragRelease._isActive);
  };

  /**
   * Is the item destroyed?
   *
   * @public
   * @memberof Item.prototype
   * @returns {Boolean}
   */
  Item.prototype.isDestroyed = function() {
    return this._isDestroyed;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Recalculate item's dimensions.
   *
   * @private
   * @memberof Item.prototype
   */
  Item.prototype._refreshDimensions = function() {
    if (this._isDestroyed || this._visibility._isHidden) return;

    var element = this._element;
    var dragPlaceholder = this._dragPlaceholder;
    var rect = element.getBoundingClientRect();

    // Calculate width and height.
    this._width = rect.width;
    this._height = rect.height;

    // Calculate margins (ignore negative margins).
    this._marginLeft = Math.max(0, getStyleAsFloat(element, 'margin-left'));
    this._marginRight = Math.max(0, getStyleAsFloat(element, 'margin-right'));
    this._marginTop = Math.max(0, getStyleAsFloat(element, 'margin-top'));
    this._marginBottom = Math.max(0, getStyleAsFloat(element, 'margin-bottom'));

    // Keep drag placeholder's dimensions synced with the item's.
    if (dragPlaceholder) dragPlaceholder.updateDimensions();
  };

  /**
   * Fetch and store item's sort data.
   *
   * @private
   * @memberof Item.prototype
   */
  Item.prototype._refreshSortData = function() {
    if (this._isDestroyed) return;

    var data = (this._sortData = {});
    var getters = this.getGrid()._settings.sortData;
    var prop;

    for (prop in getters) {
      data[prop] = getters[prop](this, this._element);
    }
  };

  /**
   * Destroy item instance.
   *
   * @private
   * @memberof Item.prototype
   * @param {Boolean} [removeElement=false]
   */
  Item.prototype._destroy = function(removeElement) {
    if (this._isDestroyed) return;

    var element = this._element;
    var grid = this.getGrid();
    var settings = grid._settings;
    var index = grid._items.indexOf(this);

    // Destroy handlers.
    this._dragPlaceholder.destroy();
    this._dragRelease.destroy();
    this._migrate.destroy();
    this._layout.destroy();
    this._visibility.destroy();
    if (this._drag) this._drag.destroy();

    // Remove item class.
    removeClass(element, settings.itemClass);

    // Remove item from Grid instance if it still exists there.
    if (index > -1) grid._items.splice(index, 1);

    // Remove element from DOM.
    if (removeElement) element.parentNode.removeChild(element);

    // Reset state.
    this._isActive = false;
    this._isDestroyed = true;
  };

  const kIsNodeJS = Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]';
  const kRequire = kIsNodeJS && typeof module.require === 'function' ? module.require : null; // eslint-disable-line

  function browserDecodeBase64(base64, enableUnicode) {
      const binaryString = atob(base64);
      if (enableUnicode) {
          const binaryView = new Uint8Array(binaryString.length);
          Array.prototype.forEach.call(binaryView, (el, idx, arr) => {
              arr[idx] = binaryString.charCodeAt(idx);
          });
          return String.fromCharCode.apply(null, new Uint16Array(binaryView.buffer));
      }
      return binaryString;
  }

  function nodeDecodeBase64(base64, enableUnicode) {
      return Buffer.from(base64, 'base64').toString(enableUnicode ? 'utf16' : 'utf8');
  }

  function createBase64WorkerFactory(base64, sourcemap = null, enableUnicode = false) {
      const source = kIsNodeJS ? nodeDecodeBase64(base64, enableUnicode) : browserDecodeBase64(base64, enableUnicode);
      const start = source.indexOf('\n', 10) + 1;
      const body = source.substring(start) + (sourcemap ? `\/\/# sourceMappingURL=${sourcemap}` : '');

      if (kRequire) {
          /* node.js */
          const Worker = kRequire('worker_threads').Worker; // eslint-disable-line
          return function WorkerFactory(options) {
              return new Worker(body, Object.assign({}, options, { eval: true }));
          };
      }

      /* browser */
      const blob = new Blob([body], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      return function WorkerFactory(options) {
          return new Worker(url, options);
      };
  }

  /* eslint-disable */
  const WorkerFactory = createBase64WorkerFactory('Lyogcm9sbHVwLXBsdWdpbi13ZWItd29ya2VyLWxvYWRlciAqLwp2YXIgRklMTF9HQVBTID0gMTsKdmFyIEhPUklaT05UQUwgPSAyOwp2YXIgQUxJR05fUklHSFQgPSA0Owp2YXIgQUxJR05fQk9UVE9NID0gODsKdmFyIFJPVU5ESU5HID0gMTY7CnZhciBQQUNLRVRfSU5ERVhfV0lEVEggPSAxOwp2YXIgUEFDS0VUX0lOREVYX0hFSUdIVCA9IDI7CnZhciBQQUNLRVRfSU5ERVhfT1BUSU9OUyA9IDM7CnZhciBQQUNLRVRfSEVBREVSX1NMT1RTID0gNDsKCi8qKgogKiBAY2xhc3MKICovCmZ1bmN0aW9uIFBhY2tlclByb2Nlc3NvcigpIHsKICB0aGlzLnNsb3RTaXplcyA9IFtdOwogIHRoaXMuZnJlZVNsb3RzID0gW107CiAgdGhpcy5uZXdTbG90cyA9IFtdOwogIHRoaXMucmVjdEl0ZW0gPSB7fTsKICB0aGlzLnJlY3RTdG9yZSA9IFtdOwogIHRoaXMucmVjdElkID0gMDsKICB0aGlzLnNsb3RJbmRleCA9IC0xOwogIHRoaXMuc29ydFJlY3RzTGVmdFRvcCA9IHRoaXMuc29ydFJlY3RzTGVmdFRvcC5iaW5kKHRoaXMpOwogIHRoaXMuc29ydFJlY3RzVG9wTGVmdCA9IHRoaXMuc29ydFJlY3RzVG9wTGVmdC5iaW5kKHRoaXMpOwp9CgovKioKICogVGFrZXMgYSBsYXlvdXQgb2JqZWN0IGFzIGFuIGFyZ3VtZW50IGFuZCBjb21wdXRlcyBwb3NpdGlvbnMgKHNsb3RzKSBmb3IgdGhlCiAqIGxheW91dCBpdGVtcy4gQWxzbyBjb21wdXRlcyB0aGUgZmluYWwgd2lkdGggYW5kIGhlaWdodCBvZiB0aGUgbGF5b3V0LiBUaGUKICogcHJvdmlkZWQgbGF5b3V0IG9iamVjdCdzIHNsb3RzIGFycmF5IGlzIG11dGF0ZWQgYXMgd2VsbCBhcyB0aGUgd2lkdGggYW5kCiAqIGhlaWdodCBwcm9wZXJ0aWVzLgogKgogKiBAcGFyYW0ge09iamVjdH0gbGF5b3V0CiAqIEBwYXJhbSB7TnVtYmVyfSBsYXlvdXQud2lkdGgKICogICAtIFRoZSBzdGFydCAoY3VycmVudCkgd2lkdGggb2YgdGhlIGxheW91dCBpbiBwaXhlbHMuCiAqIEBwYXJhbSB7TnVtYmVyfSBsYXlvdXQuaGVpZ2h0CiAqICAgLSBUaGUgc3RhcnQgKGN1cnJlbnQpIGhlaWdodCBvZiB0aGUgbGF5b3V0IGluIHBpeGVscy4KICogQHBhcmFtIHsoSXRlbVtdfE51bWJlcltdKX0gbGF5b3V0Lml0ZW1zCiAqICAgLSBMaXN0IG9mIE11dXJpLkl0ZW0gaW5zdGFuY2VzIG9yIGEgbGlzdCBvZiBpdGVtIGRpbWVuc2lvbnMKICogICAgIChlLmcgWyBpdGVtMVdpZHRoLCBpdGVtMUhlaWdodCwgaXRlbTJXaWR0aCwgaXRlbTJIZWlnaHQsIC4uLiBdKS4KICogQHBhcmFtIHsoQXJyYXl8RmxvYXQzMkFycmF5KX0gbGF5b3V0LnNsb3RzCiAqICAgLSBBbiBBcnJheS9GbG9hdDMyQXJyYXkgaW5zdGFuY2Ugd2hpY2gncyBsZW5ndGggc2hvdWxkIGVxdWFsIHRvCiAqICAgICB0aGUgYW1vdW50IG9mIGl0ZW1zIHRpbWVzIHR3by4gVGhlIHBvc2l0aW9uICh3aWR0aCBhbmQgaGVpZ2h0KSBvZiBlYWNoCiAqICAgICBpdGVtIHdpbGwgYmUgd3JpdHRlbiBpbnRvIHRoaXMgYXJyYXkuCiAqIEBwYXJhbSB7TnVtYmVyfSBsYXlvdXQuc2V0dGluZ3MKICogICAtIFRoZSBsYXlvdXQncyBzZXR0aW5ncyBhcyBiaXRtYXNrcy4KICogQHJldHVybnMge09iamVjdH0KICovClBhY2tlclByb2Nlc3Nvci5wcm90b3R5cGUuZmlsbExheW91dCA9IGZ1bmN0aW9uKGxheW91dCkgewogIHZhciBpdGVtcyA9IGxheW91dC5pdGVtczsKICB2YXIgc2xvdHMgPSBsYXlvdXQuc2xvdHM7CiAgdmFyIHNldHRpbmdzID0gbGF5b3V0LnNldHRpbmdzIHx8IDA7CiAgdmFyIGZpbGxHYXBzID0gISEoc2V0dGluZ3MgJiBGSUxMX0dBUFMpOwogIHZhciBob3Jpem9udGFsID0gISEoc2V0dGluZ3MgJiBIT1JJWk9OVEFMKTsKICB2YXIgYWxpZ25SaWdodCA9ICEhKHNldHRpbmdzICYgQUxJR05fUklHSFQpOwogIHZhciBhbGlnbkJvdHRvbSA9ICEhKHNldHRpbmdzICYgQUxJR05fQk9UVE9NKTsKICB2YXIgcm91bmRpbmcgPSAhIShzZXR0aW5ncyAmIFJPVU5ESU5HKTsKICB2YXIgaXNJdGVtc1ByZVByb2Nlc3NlZCA9IHR5cGVvZiBpdGVtc1swXSA9PT0gJ251bWJlcic7CiAgdmFyIGksIGJ1bXAsIGl0ZW0sIHNsb3RXaWR0aCwgc2xvdEhlaWdodCwgc2xvdDsKCiAgaWYgKHJvdW5kaW5nKSB7CiAgICBsYXlvdXQud2lkdGggPSBNYXRoLnJvdW5kKGxheW91dC53aWR0aCk7CiAgICBsYXlvdXQuaGVpZ2h0ID0gTWF0aC5yb3VuZChsYXlvdXQuaGVpZ2h0KTsKICB9CgogIC8vIE5vIG5lZWQgdG8gZ28gZnVydGhlciBpZiBpdGVtcyBkbyBub3QgZXhpc3QuCiAgaWYgKCFpdGVtcy5sZW5ndGgpIHJldHVybiBsYXlvdXQ7CgogIC8vIENvbXB1dGUgc2xvdHMgZm9yIHRoZSBpdGVtcy4KICBidW1wID0gaXNJdGVtc1ByZVByb2Nlc3NlZCA/IDIgOiAxOwogIGZvciAoaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkgKz0gYnVtcCkgewogICAgLy8gSWYgaXRlbXMgYXJlIHByZS1wcm9jZXNzZWQgaXQgbWVhbnMgdGhhdCBpdGVtcyBhcnJheSBjb250YWlucyBvbmx5CiAgICAvLyB0aGUgcmF3IGRpbWVuc2lvbnMgb2YgdGhlIGl0ZW1zLiBPdGhlcndpc2Ugd2UgYXNzdW1lIGl0IGlzIGFuIGFycmF5CiAgICAvLyBvZiBub3JtYWwgTXV1cmkgaXRlbXMuCiAgICBpZiAoaXNJdGVtc1ByZVByb2Nlc3NlZCkgewogICAgICBzbG90V2lkdGggPSBpdGVtc1tpXTsKICAgICAgc2xvdEhlaWdodCA9IGl0ZW1zW2kgKyAxXTsKICAgIH0gZWxzZSB7CiAgICAgIGl0ZW0gPSBpdGVtc1tpXTsKICAgICAgc2xvdFdpZHRoID0gaXRlbS5fd2lkdGggKyBpdGVtLl9tYXJnaW5MZWZ0ICsgaXRlbS5fbWFyZ2luUmlnaHQ7CiAgICAgIHNsb3RIZWlnaHQgPSBpdGVtLl9oZWlnaHQgKyBpdGVtLl9tYXJnaW5Ub3AgKyBpdGVtLl9tYXJnaW5Cb3R0b207CiAgICB9CgogICAgLy8gUm91bmQgc2xvdCBzaXplIGlmIG5lZWRlZC4KICAgIGlmIChyb3VuZGluZykgewogICAgICBzbG90V2lkdGggPSBNYXRoLnJvdW5kKHNsb3RXaWR0aCk7CiAgICAgIHNsb3RIZWlnaHQgPSBNYXRoLnJvdW5kKHNsb3RIZWlnaHQpOwogICAgfQoKICAgIC8vIEdldCBzbG90IGRhdGEuCiAgICBzbG90ID0gdGhpcy5nZXROZXh0U2xvdChsYXlvdXQsIHNsb3RXaWR0aCwgc2xvdEhlaWdodCwgZmlsbEdhcHMsIGhvcml6b250YWwpOwoKICAgIC8vIFVwZGF0ZSBsYXlvdXQgd2lkdGgvaGVpZ2h0LgogICAgaWYgKGhvcml6b250YWwpIHsKICAgICAgbGF5b3V0LndpZHRoID0gTWF0aC5tYXgobGF5b3V0LndpZHRoLCBzbG90LmxlZnQgKyBzbG90LndpZHRoKTsKICAgIH0gZWxzZSB7CiAgICAgIGxheW91dC5oZWlnaHQgPSBNYXRoLm1heChsYXlvdXQuaGVpZ2h0LCBzbG90LnRvcCArIHNsb3QuaGVpZ2h0KTsKICAgIH0KCiAgICAvLyBBZGQgaXRlbSBzbG90IGRhdGEgdG8gbGF5b3V0IHNsb3RzLgogICAgc2xvdHNbKyt0aGlzLnNsb3RJbmRleF0gPSBzbG90LmxlZnQ7CiAgICBzbG90c1srK3RoaXMuc2xvdEluZGV4XSA9IHNsb3QudG9wOwoKICAgIC8vIFN0b3JlIHRoZSBzaXplIHRvbyAoZm9yIGxhdGVyIHVzYWdlKSBpZiBuZWVkZWQuCiAgICBpZiAoYWxpZ25SaWdodCB8fCBhbGlnbkJvdHRvbSkgewogICAgICB0aGlzLnNsb3RTaXplcy5wdXNoKHNsb3Qud2lkdGgsIHNsb3QuaGVpZ2h0KTsKICAgIH0KICB9CgogIC8vIElmIHRoZSBhbGlnbm1lbnQgaXMgc2V0IHRvIHJpZ2h0IHdlIG5lZWQgdG8gYWRqdXN0IHRoZSByZXN1bHRzLgogIGlmIChhbGlnblJpZ2h0KSB7CiAgICBmb3IgKGkgPSAwOyBpIDwgc2xvdHMubGVuZ3RoOyBpICs9IDIpIHsKICAgICAgc2xvdHNbaV0gPSBsYXlvdXQud2lkdGggLSAoc2xvdHNbaV0gKyB0aGlzLnNsb3RTaXplc1tpXSk7CiAgICB9CiAgfQoKICAvLyBJZiB0aGUgYWxpZ25tZW50IGlzIHNldCB0byBib3R0b20gd2UgbmVlZCB0byBhZGp1c3QgdGhlIHJlc3VsdHMuCiAgaWYgKGFsaWduQm90dG9tKSB7CiAgICBmb3IgKGkgPSAxOyBpIDwgc2xvdHMubGVuZ3RoOyBpICs9IDIpIHsKICAgICAgc2xvdHNbaV0gPSBsYXlvdXQuaGVpZ2h0IC0gKHNsb3RzW2ldICsgdGhpcy5zbG90U2l6ZXNbaV0pOwogICAgfQogIH0KCiAgLy8gUmVzZXQgc3R1ZmYuCiAgdGhpcy5zbG90U2l6ZXMubGVuZ3RoID0gMDsKICB0aGlzLmZyZWVTbG90cy5sZW5ndGggPSAwOwogIHRoaXMubmV3U2xvdHMubGVuZ3RoID0gMDsKICB0aGlzLnJlY3RJZCA9IDA7CiAgdGhpcy5zbG90SW5kZXggPSAtMTsKCiAgcmV0dXJuIGxheW91dDsKfTsKCi8qKgogKiBDYWxjdWxhdGUgbmV4dCBzbG90IGluIHRoZSBsYXlvdXQuIFJldHVybnMgYSBzbG90IG9iamVjdCB3aXRoIHBvc2l0aW9uIGFuZAogKiBkaW1lbnNpb25zIGRhdGEuCiAqCiAqIEBwYXJhbSB7T2JqZWN0fSBsYXlvdXQKICogQHBhcmFtIHtOdW1iZXJ9IHNsb3RXaWR0aAogKiBAcGFyYW0ge051bWJlcn0gc2xvdEhlaWdodAogKiBAcGFyYW0ge0Jvb2xlYW59IGZpbGxHYXBzCiAqIEBwYXJhbSB7Qm9vbGVhbn0gaG9yaXpvbnRhbAogKiBAcmV0dXJucyB7T2JqZWN0fQogKi8KUGFja2VyUHJvY2Vzc29yLnByb3RvdHlwZS5nZXROZXh0U2xvdCA9IChmdW5jdGlvbigpIHsKICB2YXIgZXBzID0gMC4wMDE7CiAgdmFyIG1pblNpemUgPSAwLjU7CiAgdmFyIHNsb3QgPSB7IGxlZnQ6IDAsIHRvcDogMCwgd2lkdGg6IDAsIGhlaWdodDogMCB9OwogIHJldHVybiBmdW5jdGlvbihsYXlvdXQsIHNsb3RXaWR0aCwgc2xvdEhlaWdodCwgZmlsbEdhcHMsIGhvcml6b250YWwpIHsKICAgIHZhciBmcmVlU2xvdHMgPSB0aGlzLmZyZWVTbG90czsKICAgIHZhciBuZXdTbG90cyA9IHRoaXMubmV3U2xvdHM7CiAgICB2YXIgcmVjdDsKICAgIHZhciByZWN0SWQ7CiAgICB2YXIgcG90ZW50aWFsU2xvdHM7CiAgICB2YXIgaWdub3JlQ3VycmVudFNsb3RzOwogICAgdmFyIGk7CiAgICB2YXIgajsKCiAgICAvLyBSZXNldCBuZXcgc2xvdHMuCiAgICBuZXdTbG90cy5sZW5ndGggPSAwOwoKICAgIC8vIFNldCBpdGVtIHNsb3QgaW5pdGlhbCBkYXRhLgogICAgc2xvdC5sZWZ0ID0gbnVsbDsKICAgIHNsb3QudG9wID0gbnVsbDsKICAgIHNsb3Qud2lkdGggPSBzbG90V2lkdGg7CiAgICBzbG90LmhlaWdodCA9IHNsb3RIZWlnaHQ7CgogICAgLy8gVHJ5IHRvIGZpbmQgYSBzbG90IGZvciB0aGUgaXRlbS4KICAgIGZvciAoaSA9IDA7IGkgPCBmcmVlU2xvdHMubGVuZ3RoOyBpKyspIHsKICAgICAgcmVjdElkID0gZnJlZVNsb3RzW2ldOwogICAgICBpZiAoIXJlY3RJZCkgY29udGludWU7CiAgICAgIHJlY3QgPSB0aGlzLmdldFJlY3QocmVjdElkKTsKICAgICAgaWYgKHNsb3Qud2lkdGggPD0gcmVjdC53aWR0aCArIGVwcyAmJiBzbG90LmhlaWdodCA8PSByZWN0LmhlaWdodCArIGVwcykgewogICAgICAgIHNsb3QubGVmdCA9IHJlY3QubGVmdDsKICAgICAgICBzbG90LnRvcCA9IHJlY3QudG9wOwogICAgICAgIGJyZWFrOwogICAgICB9CiAgICB9CgogICAgLy8gSWYgbm8gc2xvdCB3YXMgZm91bmQgZm9yIHRoZSBpdGVtLgogICAgaWYgKHNsb3QubGVmdCA9PT0gbnVsbCkgewogICAgICAvLyBQb3NpdGlvbiB0aGUgaXRlbSBpbiB0byB0aGUgYm90dG9tIGxlZnQgKHZlcnRpY2FsIG1vZGUpIG9yIHRvcCByaWdodAogICAgICAvLyAoaG9yaXpvbnRhbCBtb2RlKSBvZiB0aGUgZ3JpZC4KICAgICAgc2xvdC5sZWZ0ID0gIWhvcml6b250YWwgPyAwIDogbGF5b3V0LndpZHRoOwogICAgICBzbG90LnRvcCA9ICFob3Jpem9udGFsID8gbGF5b3V0LmhlaWdodCA6IDA7CgogICAgICAvLyBJZiBnYXBzIGRvbid0IG5lZWQgZmlsbGluZyBkbyBub3QgYWRkIGFueSBjdXJyZW50IHNsb3RzIHRvIHRoZSBuZXcKICAgICAgLy8gc2xvdHMgYXJyYXkuCiAgICAgIGlmICghZmlsbEdhcHMpIHsKICAgICAgICBpZ25vcmVDdXJyZW50U2xvdHMgPSB0cnVlOwogICAgICB9CiAgICB9CgogICAgLy8gSW4gdmVydGljYWwgbW9kZSwgaWYgdGhlIGl0ZW0ncyBib3R0b20gb3ZlcmxhcHMgdGhlIGdyaWQncyBib3R0b20uCiAgICBpZiAoIWhvcml6b250YWwgJiYgc2xvdC50b3AgKyBzbG90LmhlaWdodCA+IGxheW91dC5oZWlnaHQpIHsKICAgICAgLy8gSWYgaXRlbSBpcyBub3QgYWxpZ25lZCB0byB0aGUgbGVmdCBlZGdlLCBjcmVhdGUgYSBuZXcgc2xvdC4KICAgICAgaWYgKHNsb3QubGVmdCA+IDApIHsKICAgICAgICBuZXdTbG90cy5wdXNoKHRoaXMuYWRkUmVjdCgwLCBsYXlvdXQuaGVpZ2h0LCBzbG90LmxlZnQsIEluZmluaXR5KSk7CiAgICAgIH0KCiAgICAgIC8vIElmIGl0ZW0gaXMgbm90IGFsaWduZWQgdG8gdGhlIHJpZ2h0IGVkZ2UsIGNyZWF0ZSBhIG5ldyBzbG90LgogICAgICBpZiAoc2xvdC5sZWZ0ICsgc2xvdC53aWR0aCA8IGxheW91dC53aWR0aCkgewogICAgICAgIG5ld1Nsb3RzLnB1c2goCiAgICAgICAgICB0aGlzLmFkZFJlY3QoCiAgICAgICAgICAgIHNsb3QubGVmdCArIHNsb3Qud2lkdGgsCiAgICAgICAgICAgIGxheW91dC5oZWlnaHQsCiAgICAgICAgICAgIGxheW91dC53aWR0aCAtIHNsb3QubGVmdCAtIHNsb3Qud2lkdGgsCiAgICAgICAgICAgIEluZmluaXR5CiAgICAgICAgICApCiAgICAgICAgKTsKICAgICAgfQoKICAgICAgLy8gVXBkYXRlIGdyaWQgaGVpZ2h0LgogICAgICBsYXlvdXQuaGVpZ2h0ID0gc2xvdC50b3AgKyBzbG90LmhlaWdodDsKICAgIH0KCiAgICAvLyBJbiBob3Jpem9udGFsIG1vZGUsIGlmIHRoZSBpdGVtJ3MgcmlnaHQgb3ZlcmxhcHMgdGhlIGdyaWQncyByaWdodCBlZGdlLgogICAgaWYgKGhvcml6b250YWwgJiYgc2xvdC5sZWZ0ICsgc2xvdC53aWR0aCA+IGxheW91dC53aWR0aCkgewogICAgICAvLyBJZiBpdGVtIGlzIG5vdCBhbGlnbmVkIHRvIHRoZSB0b3AsIGNyZWF0ZSBhIG5ldyBzbG90LgogICAgICBpZiAoc2xvdC50b3AgPiAwKSB7CiAgICAgICAgbmV3U2xvdHMucHVzaCh0aGlzLmFkZFJlY3QobGF5b3V0LndpZHRoLCAwLCBJbmZpbml0eSwgc2xvdC50b3ApKTsKICAgICAgfQoKICAgICAgLy8gSWYgaXRlbSBpcyBub3QgYWxpZ25lZCB0byB0aGUgYm90dG9tLCBjcmVhdGUgYSBuZXcgc2xvdC4KICAgICAgaWYgKHNsb3QudG9wICsgc2xvdC5oZWlnaHQgPCBsYXlvdXQuaGVpZ2h0KSB7CiAgICAgICAgbmV3U2xvdHMucHVzaCgKICAgICAgICAgIHRoaXMuYWRkUmVjdCgKICAgICAgICAgICAgbGF5b3V0LndpZHRoLAogICAgICAgICAgICBzbG90LnRvcCArIHNsb3QuaGVpZ2h0LAogICAgICAgICAgICBJbmZpbml0eSwKICAgICAgICAgICAgbGF5b3V0LmhlaWdodCAtIHNsb3QudG9wIC0gc2xvdC5oZWlnaHQKICAgICAgICAgICkKICAgICAgICApOwogICAgICB9CgogICAgICAvLyBVcGRhdGUgZ3JpZCB3aWR0aC4KICAgICAgbGF5b3V0LndpZHRoID0gc2xvdC5sZWZ0ICsgc2xvdC53aWR0aDsKICAgIH0KCiAgICAvLyBDbGVhbiB1cCB0aGUgY3VycmVudCBzbG90cyBtYWtpbmcgc3VyZSB0aGVyZSBhcmUgbm8gb2xkIHNsb3RzIHRoYXQKICAgIC8vIG92ZXJsYXAgd2l0aCB0aGUgaXRlbS4gSWYgYW4gb2xkIHNsb3Qgb3ZlcmxhcHMgd2l0aCB0aGUgaXRlbSwgc3BsaXQgaXQKICAgIC8vIGludG8gc21hbGxlciBzbG90cyBpZiBuZWNlc3NhcnkuCiAgICBmb3IgKGkgPSBmaWxsR2FwcyA/IDAgOiBpZ25vcmVDdXJyZW50U2xvdHMgPyBmcmVlU2xvdHMubGVuZ3RoIDogaTsgaSA8IGZyZWVTbG90cy5sZW5ndGg7IGkrKykgewogICAgICByZWN0SWQgPSBmcmVlU2xvdHNbaV07CiAgICAgIGlmICghcmVjdElkKSBjb250aW51ZTsKICAgICAgcmVjdCA9IHRoaXMuZ2V0UmVjdChyZWN0SWQpOwogICAgICBwb3RlbnRpYWxTbG90cyA9IHRoaXMuc3BsaXRSZWN0KHJlY3QsIHNsb3QpOwogICAgICBmb3IgKGogPSAwOyBqIDwgcG90ZW50aWFsU2xvdHMubGVuZ3RoOyBqKyspIHsKICAgICAgICByZWN0SWQgPSBwb3RlbnRpYWxTbG90c1tqXTsKICAgICAgICByZWN0ID0gdGhpcy5nZXRSZWN0KHJlY3RJZCk7CiAgICAgICAgLy8gTGV0J3MgbWFrZSBzdXJlIGhlcmUgdGhhdCB3ZSBoYXZlIGEgYmlnIGVub3VnaCBzbG90LgogICAgICAgIGlmIChyZWN0LndpZHRoIDwgbWluU2l6ZSB8fCByZWN0LmhlaWdodCA8IG1pblNpemUpIGNvbnRpbnVlOwogICAgICAgIC8vIExldCdzIGFsc28gbGV0J3MgbWFrZSBzdXJlIHRoYXQgdGhlIHNsb3QgaXMgd2l0aGluIHRoZSBib3VuZGFyaWVzIG9mCiAgICAgICAgLy8gdGhlIGdyaWQuCiAgICAgICAgaWYgKGhvcml6b250YWwgPyByZWN0LmxlZnQgPCBsYXlvdXQud2lkdGggOiByZWN0LnRvcCA8IGxheW91dC5oZWlnaHQpIHsKICAgICAgICAgIG5ld1Nsb3RzLnB1c2gocmVjdElkKTsKICAgICAgICB9CiAgICAgIH0KICAgIH0KCiAgICAvLyBTYW5pdGl6ZSBuZXcgc2xvdHMuCiAgICBpZiAobmV3U2xvdHMubGVuZ3RoKSB7CiAgICAgIHRoaXMucHVyZ2VSZWN0cyhuZXdTbG90cykuc29ydChob3Jpem9udGFsID8gdGhpcy5zb3J0UmVjdHNMZWZ0VG9wIDogdGhpcy5zb3J0UmVjdHNUb3BMZWZ0KTsKICAgIH0KCiAgICAvLyBGcmVlL25ldyBzbG90cyBzd2l0Y2hlcm9vIQogICAgdGhpcy5mcmVlU2xvdHMgPSBuZXdTbG90czsKICAgIHRoaXMubmV3U2xvdHMgPSBmcmVlU2xvdHM7CgogICAgcmV0dXJuIHNsb3Q7CiAgfTsKfSkoKTsKCi8qKgogKiBBZGQgYSBuZXcgcmVjdGFuZ2xlIHRvIHRoZSByZWN0YW5nbGUgc3RvcmUuIFJldHVybnMgdGhlIGlkIG9mIHRoZSBuZXcKICogcmVjdGFuZ2xlLgogKgogKiBAcGFyYW0ge051bWJlcn0gbGVmdAogKiBAcGFyYW0ge051bWJlcn0gdG9wCiAqIEBwYXJhbSB7TnVtYmVyfSB3aWR0aAogKiBAcGFyYW0ge051bWJlcn0gaGVpZ2h0CiAqIEByZXR1cm5zIHtSZWN0SWR9CiAqLwpQYWNrZXJQcm9jZXNzb3IucHJvdG90eXBlLmFkZFJlY3QgPSBmdW5jdGlvbihsZWZ0LCB0b3AsIHdpZHRoLCBoZWlnaHQpIHsKICB2YXIgcmVjdElkID0gKyt0aGlzLnJlY3RJZDsKICB2YXIgcmVjdFN0b3JlID0gdGhpcy5yZWN0U3RvcmU7CgogIHJlY3RTdG9yZVtyZWN0SWRdID0gbGVmdCB8fCAwOwogIHJlY3RTdG9yZVsrK3RoaXMucmVjdElkXSA9IHRvcCB8fCAwOwogIHJlY3RTdG9yZVsrK3RoaXMucmVjdElkXSA9IHdpZHRoIHx8IDA7CiAgcmVjdFN0b3JlWysrdGhpcy5yZWN0SWRdID0gaGVpZ2h0IHx8IDA7CgogIHJldHVybiByZWN0SWQ7Cn07CgovKioKICogR2V0IHJlY3RhbmdsZSBkYXRhIGZyb20gdGhlIHJlY3RhbmdsZSBzdG9yZSBieSBpZC4gT3B0aW9uYWxseSB5b3UgY2FuCiAqIHByb3ZpZGUgYSB0YXJnZXQgb2JqZWN0IHdoZXJlIHRoZSByZWN0YW5nbGUgZGF0YSB3aWxsIGJlIHdyaXR0ZW4gaW4uIEJ5CiAqIGRlZmF1bHQgYW4gaW50ZXJuYWwgb2JqZWN0IGlzIHJldXNlZCBhcyBhIHRhcmdldCBvYmplY3QuCiAqCiAqIEBwYXJhbSB7UmVjdElkfSBpZAogKiBAcGFyYW0ge09iamVjdH0gW3RhcmdldF0KICogQHJldHVybnMge09iamVjdH0KICovClBhY2tlclByb2Nlc3Nvci5wcm90b3R5cGUuZ2V0UmVjdCA9IGZ1bmN0aW9uKGlkLCB0YXJnZXQpIHsKICB2YXIgcmVjdEl0ZW0gPSB0YXJnZXQgPyB0YXJnZXQgOiB0aGlzLnJlY3RJdGVtOwogIHZhciByZWN0U3RvcmUgPSB0aGlzLnJlY3RTdG9yZTsKCiAgcmVjdEl0ZW0ubGVmdCA9IHJlY3RTdG9yZVtpZF0gfHwgMDsKICByZWN0SXRlbS50b3AgPSByZWN0U3RvcmVbKytpZF0gfHwgMDsKICByZWN0SXRlbS53aWR0aCA9IHJlY3RTdG9yZVsrK2lkXSB8fCAwOwogIHJlY3RJdGVtLmhlaWdodCA9IHJlY3RTdG9yZVsrK2lkXSB8fCAwOwoKICByZXR1cm4gcmVjdEl0ZW07Cn07CgovKioKICogUHVuY2ggYSBob2xlIGludG8gYSByZWN0YW5nbGUgYW5kIHNwbGl0IHRoZSByZW1haW5pbmcgYXJlYSBpbnRvIHNtYWxsZXIKICogcmVjdGFuZ2xlcyAoNCBhdCBtYXgpLgogKiBAcGFyYW0ge1JlY3RhbmdsZX0gcmVjdAogKiBAcGFyYW0ge1JlY3RhbmdsZX0gaG9sZQogKiBAcmV0dXJucyB7UmVjdElkW119CiAqLwpQYWNrZXJQcm9jZXNzb3IucHJvdG90eXBlLnNwbGl0UmVjdCA9IChmdW5jdGlvbigpIHsKICB2YXIgcmVzdWx0cyA9IFtdOwogIHJldHVybiBmdW5jdGlvbihyZWN0LCBob2xlKSB7CiAgICAvLyBSZXNldCBvbGQgcmVzdWx0cy4KICAgIHJlc3VsdHMubGVuZ3RoID0gMDsKCiAgICAvLyBJZiB0aGUgcmVjdCBkb2VzIG5vdCBvdmVybGFwIHdpdGggdGhlIGhvbGUgYWRkIHJlY3QgdG8gdGhlIHJldHVybiBkYXRhCiAgICAvLyBhcyBpcy4KICAgIGlmICghdGhpcy5kb1JlY3RzT3ZlcmxhcChyZWN0LCBob2xlKSkgewogICAgICByZXN1bHRzLnB1c2godGhpcy5hZGRSZWN0KHJlY3QubGVmdCwgcmVjdC50b3AsIHJlY3Qud2lkdGgsIHJlY3QuaGVpZ2h0KSk7CiAgICAgIHJldHVybiByZXN1bHRzOwogICAgfQoKICAgIC8vIExlZnQgc3BsaXQuCiAgICBpZiAocmVjdC5sZWZ0IDwgaG9sZS5sZWZ0KSB7CiAgICAgIHJlc3VsdHMucHVzaCh0aGlzLmFkZFJlY3QocmVjdC5sZWZ0LCByZWN0LnRvcCwgaG9sZS5sZWZ0IC0gcmVjdC5sZWZ0LCByZWN0LmhlaWdodCkpOwogICAgfQoKICAgIC8vIFJpZ2h0IHNwbGl0LgogICAgaWYgKHJlY3QubGVmdCArIHJlY3Qud2lkdGggPiBob2xlLmxlZnQgKyBob2xlLndpZHRoKSB7CiAgICAgIHJlc3VsdHMucHVzaCgKICAgICAgICB0aGlzLmFkZFJlY3QoCiAgICAgICAgICBob2xlLmxlZnQgKyBob2xlLndpZHRoLAogICAgICAgICAgcmVjdC50b3AsCiAgICAgICAgICByZWN0LmxlZnQgKyByZWN0LndpZHRoIC0gKGhvbGUubGVmdCArIGhvbGUud2lkdGgpLAogICAgICAgICAgcmVjdC5oZWlnaHQKICAgICAgICApCiAgICAgICk7CiAgICB9CgogICAgLy8gVG9wIHNwbGl0LgogICAgaWYgKHJlY3QudG9wIDwgaG9sZS50b3ApIHsKICAgICAgcmVzdWx0cy5wdXNoKHRoaXMuYWRkUmVjdChyZWN0LmxlZnQsIHJlY3QudG9wLCByZWN0LndpZHRoLCBob2xlLnRvcCAtIHJlY3QudG9wKSk7CiAgICB9CgogICAgLy8gQm90dG9tIHNwbGl0LgogICAgaWYgKHJlY3QudG9wICsgcmVjdC5oZWlnaHQgPiBob2xlLnRvcCArIGhvbGUuaGVpZ2h0KSB7CiAgICAgIHJlc3VsdHMucHVzaCgKICAgICAgICB0aGlzLmFkZFJlY3QoCiAgICAgICAgICByZWN0LmxlZnQsCiAgICAgICAgICBob2xlLnRvcCArIGhvbGUuaGVpZ2h0LAogICAgICAgICAgcmVjdC53aWR0aCwKICAgICAgICAgIHJlY3QudG9wICsgcmVjdC5oZWlnaHQgLSAoaG9sZS50b3AgKyBob2xlLmhlaWdodCkKICAgICAgICApCiAgICAgICk7CiAgICB9CgogICAgcmV0dXJuIHJlc3VsdHM7CiAgfTsKfSkoKTsKCi8qKgogKiBDaGVjayBpZiB0d28gcmVjdGFuZ2xlcyBvdmVybGFwLgogKgogKiBAcGFyYW0ge1JlY3RhbmdsZX0gYQogKiBAcGFyYW0ge1JlY3RhbmdsZX0gYgogKiBAcmV0dXJucyB7Qm9vbGVhbn0KICovClBhY2tlclByb2Nlc3Nvci5wcm90b3R5cGUuZG9SZWN0c092ZXJsYXAgPSBmdW5jdGlvbihhLCBiKSB7CiAgcmV0dXJuICEoCiAgICBhLmxlZnQgKyBhLndpZHRoIDw9IGIubGVmdCB8fAogICAgYi5sZWZ0ICsgYi53aWR0aCA8PSBhLmxlZnQgfHwKICAgIGEudG9wICsgYS5oZWlnaHQgPD0gYi50b3AgfHwKICAgIGIudG9wICsgYi5oZWlnaHQgPD0gYS50b3AKICApOwp9OwoKLyoqCiAqIENoZWNrIGlmIGEgcmVjdGFuZ2xlIGlzIGZ1bGx5IHdpdGhpbiBhbm90aGVyIHJlY3RhbmdsZS4KICoKICogQHBhcmFtIHtSZWN0YW5nbGV9IGEKICogQHBhcmFtIHtSZWN0YW5nbGV9IGIKICogQHJldHVybnMge0Jvb2xlYW59CiAqLwpQYWNrZXJQcm9jZXNzb3IucHJvdG90eXBlLmlzUmVjdFdpdGhpblJlY3QgPSBmdW5jdGlvbihhLCBiKSB7CiAgcmV0dXJuICgKICAgIGEubGVmdCA+PSBiLmxlZnQgJiYKICAgIGEudG9wID49IGIudG9wICYmCiAgICBhLmxlZnQgKyBhLndpZHRoIDw9IGIubGVmdCArIGIud2lkdGggJiYKICAgIGEudG9wICsgYS5oZWlnaHQgPD0gYi50b3AgKyBiLmhlaWdodAogICk7Cn07CgovKioKICogTG9vcHMgdGhyb3VnaCBhbiBhcnJheSBvZiByZWN0YW5nbGUgaWRzIGFuZCByZXNldHMgYWxsIHRoYXQgYXJlIGZ1bGx5CiAqIHdpdGhpbiBhbm90aGVyIHJlY3RhbmdsZSBpbiB0aGUgYXJyYXkuIFJlc2V0dGluZyBpbiB0aGlzIGNhc2UgbWVhbnMgdGhhdAogKiB0aGUgcmVjdGFuZ2xlIGlkIHZhbHVlIGlzIHJlcGxhY2VkIHdpdGggemVyby4KICoKICogQHBhcmFtIHtSZWN0SWRbXX0gcmVjdElkcwogKiBAcmV0dXJucyB7UmVjdElkW119CiAqLwpQYWNrZXJQcm9jZXNzb3IucHJvdG90eXBlLnB1cmdlUmVjdHMgPSAoZnVuY3Rpb24oKSB7CiAgdmFyIHJlY3RBID0ge307CiAgdmFyIHJlY3RCID0ge307CiAgcmV0dXJuIGZ1bmN0aW9uKHJlY3RJZHMpIHsKICAgIHZhciBpID0gcmVjdElkcy5sZW5ndGg7CiAgICB2YXIgajsKCiAgICB3aGlsZSAoaS0tKSB7CiAgICAgIGogPSByZWN0SWRzLmxlbmd0aDsKICAgICAgaWYgKCFyZWN0SWRzW2ldKSBjb250aW51ZTsKICAgICAgdGhpcy5nZXRSZWN0KHJlY3RJZHNbaV0sIHJlY3RBKTsKICAgICAgd2hpbGUgKGotLSkgewogICAgICAgIGlmICghcmVjdElkc1tqXSB8fCBpID09PSBqKSBjb250aW51ZTsKICAgICAgICBpZiAodGhpcy5pc1JlY3RXaXRoaW5SZWN0KHJlY3RBLCB0aGlzLmdldFJlY3QocmVjdElkc1tqXSwgcmVjdEIpKSkgewogICAgICAgICAgcmVjdElkc1tpXSA9IDA7CiAgICAgICAgICBicmVhazsKICAgICAgICB9CiAgICAgIH0KICAgIH0KCiAgICByZXR1cm4gcmVjdElkczsKICB9Owp9KSgpOwoKLyoqCiAqIFNvcnQgcmVjdGFuZ2xlcyB3aXRoIHRvcC1sZWZ0IGdyYXZpdHkuCiAqCiAqIEBwYXJhbSB7UmVjdElkfSBhSWQKICogQHBhcmFtIHtSZWN0SWR9IGJJZAogKiBAcmV0dXJucyB7TnVtYmVyfQogKi8KUGFja2VyUHJvY2Vzc29yLnByb3RvdHlwZS5zb3J0UmVjdHNUb3BMZWZ0ID0gKGZ1bmN0aW9uKCkgewogIHZhciByZWN0QSA9IHt9OwogIHZhciByZWN0QiA9IHt9OwogIHJldHVybiBmdW5jdGlvbihhSWQsIGJJZCkgewogICAgdGhpcy5nZXRSZWN0KGFJZCwgcmVjdEEpOwogICAgdGhpcy5nZXRSZWN0KGJJZCwgcmVjdEIpOwogICAgLy8gcHJldHRpZXItaWdub3JlCiAgICByZXR1cm4gcmVjdEEudG9wIDwgcmVjdEIudG9wID8gLTEgOgogICAgICAgICAgIHJlY3RBLnRvcCA+IHJlY3RCLnRvcCA/IDEgOgogICAgICAgICAgIHJlY3RBLmxlZnQgPCByZWN0Qi5sZWZ0ID8gLTEgOgogICAgICAgICAgIHJlY3RBLmxlZnQgPiByZWN0Qi5sZWZ0ID8gMSA6IDA7CiAgfTsKfSkoKTsKCi8qKgogKiBTb3J0IHJlY3RhbmdsZXMgd2l0aCBsZWZ0LXRvcCBncmF2aXR5LgogKgogKiBAcGFyYW0ge1JlY3RJZH0gYUlkCiAqIEBwYXJhbSB7UmVjdElkfSBiSWQKICogQHJldHVybnMge051bWJlcn0KICovClBhY2tlclByb2Nlc3Nvci5wcm90b3R5cGUuc29ydFJlY3RzTGVmdFRvcCA9IChmdW5jdGlvbigpIHsKICB2YXIgcmVjdEEgPSB7fTsKICB2YXIgcmVjdEIgPSB7fTsKICByZXR1cm4gZnVuY3Rpb24oYUlkLCBiSWQpIHsKICAgIHRoaXMuZ2V0UmVjdChhSWQsIHJlY3RBKTsKICAgIHRoaXMuZ2V0UmVjdChiSWQsIHJlY3RCKTsKICAgIC8vIHByZXR0aWVyLWlnbm9yZQogICAgcmV0dXJuIHJlY3RBLmxlZnQgPCByZWN0Qi5sZWZ0ID8gLTEgOgogICAgICAgICAgIHJlY3RBLmxlZnQgPiByZWN0Qi5sZWZ0ID8gMSA6CiAgICAgICAgICAgcmVjdEEudG9wIDwgcmVjdEIudG9wID8gLTEgOgogICAgICAgICAgIHJlY3RBLnRvcCA+IHJlY3RCLnRvcCA/IDEgOiAwOwogIH07Cn0pKCk7Cgp2YXIgcHJvY2Vzc29yID0gbmV3IFBhY2tlclByb2Nlc3NvcigpOwoKb25tZXNzYWdlID0gZnVuY3Rpb24obXNnKSB7CiAgdmFyIGRhdGEgPSBuZXcgRmxvYXQzMkFycmF5KG1zZy5kYXRhKTsKICB2YXIgaXRlbXMgPSBkYXRhLnN1YmFycmF5KFBBQ0tFVF9IRUFERVJfU0xPVFMsIGRhdGEubGVuZ3RoKTsKICB2YXIgc2xvdHMgPSBuZXcgRmxvYXQzMkFycmF5KGl0ZW1zLmxlbmd0aCk7CiAgdmFyIGxheW91dCA9IHsKICAgIGl0ZW1zOiBpdGVtcywKICAgIHNsb3RzOiBzbG90cywKICAgIHdpZHRoOiBkYXRhW1BBQ0tFVF9JTkRFWF9XSURUSF0sCiAgICBoZWlnaHQ6IGRhdGFbUEFDS0VUX0lOREVYX0hFSUdIVF0sCiAgICBzZXR0aW5nczogZGF0YVtQQUNLRVRfSU5ERVhfT1BUSU9OU10KICB9OwoKICAvLyBGaWxsIHRoZSBsYXlvdXQgKHdpZHRoIC8gaGVpZ2h0IC8gc2xvdHMpLgogIHByb2Nlc3Nvci5maWxsTGF5b3V0KGxheW91dCk7CgogIC8vIENvcHkgbGF5b3V0IGRhdGEgdG8gdGhlIHJldHVybiBkYXRhLgogIGRhdGFbUEFDS0VUX0lOREVYX1dJRFRIXSA9IGxheW91dC53aWR0aDsKICBkYXRhW1BBQ0tFVF9JTkRFWF9IRUlHSFRdID0gbGF5b3V0LmhlaWdodDsKICBkYXRhLnNldChsYXlvdXQuc2xvdHMsIFBBQ0tFVF9IRUFERVJfU0xPVFMpOwoKICAvLyBTZW5kIGxheW91dCBiYWNrIHRvIHRoZSBtYWluIHRocmVhZC4KICBwb3N0TWVzc2FnZShkYXRhLmJ1ZmZlciwgW2RhdGEuYnVmZmVyXSk7Cn07Cgo=', null, false);
  /* eslint-enable */

  var FILL_GAPS = 1;
  var HORIZONTAL = 2;
  var ALIGN_RIGHT = 4;
  var ALIGN_BOTTOM = 8;
  var ROUNDING = 16;
  var PACKET_INDEX_ID = 0;
  var PACKET_INDEX_WIDTH = 1;
  var PACKET_INDEX_HEIGHT = 2;
  var PACKET_INDEX_OPTIONS = 3;
  var PACKET_HEADER_SLOTS = 4;

  /**
   * @class
   */
  function PackerProcessor() {
    this.slotSizes = [];
    this.freeSlots = [];
    this.newSlots = [];
    this.rectItem = {};
    this.rectStore = [];
    this.rectId = 0;
    this.slotIndex = -1;
    this.sortRectsLeftTop = this.sortRectsLeftTop.bind(this);
    this.sortRectsTopLeft = this.sortRectsTopLeft.bind(this);
  }

  /**
   * Takes a layout object as an argument and computes positions (slots) for the
   * layout items. Also computes the final width and height of the layout. The
   * provided layout object's slots array is mutated as well as the width and
   * height properties.
   *
   * @param {Object} layout
   * @param {Number} layout.width
   *   - The start (current) width of the layout in pixels.
   * @param {Number} layout.height
   *   - The start (current) height of the layout in pixels.
   * @param {(Item[]|Number[])} layout.items
   *   - List of Muuri.Item instances or a list of item dimensions
   *     (e.g [ item1Width, item1Height, item2Width, item2Height, ... ]).
   * @param {(Array|Float32Array)} layout.slots
   *   - An Array/Float32Array instance which's length should equal to
   *     the amount of items times two. The position (width and height) of each
   *     item will be written into this array.
   * @param {Number} layout.settings
   *   - The layout's settings as bitmasks.
   * @returns {Object}
   */
  PackerProcessor.prototype.fillLayout = function(layout) {
    var items = layout.items;
    var slots = layout.slots;
    var settings = layout.settings || 0;
    var fillGaps = !!(settings & FILL_GAPS);
    var horizontal = !!(settings & HORIZONTAL);
    var alignRight = !!(settings & ALIGN_RIGHT);
    var alignBottom = !!(settings & ALIGN_BOTTOM);
    var rounding = !!(settings & ROUNDING);
    var isItemsPreProcessed = typeof items[0] === 'number';
    var i, bump, item, slotWidth, slotHeight, slot;

    if (rounding) {
      layout.width = Math.round(layout.width);
      layout.height = Math.round(layout.height);
    }

    // No need to go further if items do not exist.
    if (!items.length) return layout;

    // Compute slots for the items.
    bump = isItemsPreProcessed ? 2 : 1;
    for (i = 0; i < items.length; i += bump) {
      // If items are pre-processed it means that items array contains only
      // the raw dimensions of the items. Otherwise we assume it is an array
      // of normal Muuri items.
      if (isItemsPreProcessed) {
        slotWidth = items[i];
        slotHeight = items[i + 1];
      } else {
        item = items[i];
        slotWidth = item._width + item._marginLeft + item._marginRight;
        slotHeight = item._height + item._marginTop + item._marginBottom;
      }

      // Round slot size if needed.
      if (rounding) {
        slotWidth = Math.round(slotWidth);
        slotHeight = Math.round(slotHeight);
      }

      // Get slot data.
      slot = this.getNextSlot(layout, slotWidth, slotHeight, fillGaps, horizontal);

      // Update layout width/height.
      if (horizontal) {
        layout.width = Math.max(layout.width, slot.left + slot.width);
      } else {
        layout.height = Math.max(layout.height, slot.top + slot.height);
      }

      // Add item slot data to layout slots.
      slots[++this.slotIndex] = slot.left;
      slots[++this.slotIndex] = slot.top;

      // Store the size too (for later usage) if needed.
      if (alignRight || alignBottom) {
        this.slotSizes.push(slot.width, slot.height);
      }
    }

    // If the alignment is set to right we need to adjust the results.
    if (alignRight) {
      for (i = 0; i < slots.length; i += 2) {
        slots[i] = layout.width - (slots[i] + this.slotSizes[i]);
      }
    }

    // If the alignment is set to bottom we need to adjust the results.
    if (alignBottom) {
      for (i = 1; i < slots.length; i += 2) {
        slots[i] = layout.height - (slots[i] + this.slotSizes[i]);
      }
    }

    // Reset stuff.
    this.slotSizes.length = 0;
    this.freeSlots.length = 0;
    this.newSlots.length = 0;
    this.rectId = 0;
    this.slotIndex = -1;

    return layout;
  };

  /**
   * Calculate next slot in the layout. Returns a slot object with position and
   * dimensions data.
   *
   * @param {Object} layout
   * @param {Number} slotWidth
   * @param {Number} slotHeight
   * @param {Boolean} fillGaps
   * @param {Boolean} horizontal
   * @returns {Object}
   */
  PackerProcessor.prototype.getNextSlot = (function() {
    var eps = 0.001;
    var minSize = 0.5;
    var slot = { left: 0, top: 0, width: 0, height: 0 };
    return function(layout, slotWidth, slotHeight, fillGaps, horizontal) {
      var freeSlots = this.freeSlots;
      var newSlots = this.newSlots;
      var rect;
      var rectId;
      var potentialSlots;
      var ignoreCurrentSlots;
      var i;
      var j;

      // Reset new slots.
      newSlots.length = 0;

      // Set item slot initial data.
      slot.left = null;
      slot.top = null;
      slot.width = slotWidth;
      slot.height = slotHeight;

      // Try to find a slot for the item.
      for (i = 0; i < freeSlots.length; i++) {
        rectId = freeSlots[i];
        if (!rectId) continue;
        rect = this.getRect(rectId);
        if (slot.width <= rect.width + eps && slot.height <= rect.height + eps) {
          slot.left = rect.left;
          slot.top = rect.top;
          break;
        }
      }

      // If no slot was found for the item.
      if (slot.left === null) {
        // Position the item in to the bottom left (vertical mode) or top right
        // (horizontal mode) of the grid.
        slot.left = !horizontal ? 0 : layout.width;
        slot.top = !horizontal ? layout.height : 0;

        // If gaps don't need filling do not add any current slots to the new
        // slots array.
        if (!fillGaps) {
          ignoreCurrentSlots = true;
        }
      }

      // In vertical mode, if the item's bottom overlaps the grid's bottom.
      if (!horizontal && slot.top + slot.height > layout.height) {
        // If item is not aligned to the left edge, create a new slot.
        if (slot.left > 0) {
          newSlots.push(this.addRect(0, layout.height, slot.left, Infinity));
        }

        // If item is not aligned to the right edge, create a new slot.
        if (slot.left + slot.width < layout.width) {
          newSlots.push(
            this.addRect(
              slot.left + slot.width,
              layout.height,
              layout.width - slot.left - slot.width,
              Infinity
            )
          );
        }

        // Update grid height.
        layout.height = slot.top + slot.height;
      }

      // In horizontal mode, if the item's right overlaps the grid's right edge.
      if (horizontal && slot.left + slot.width > layout.width) {
        // If item is not aligned to the top, create a new slot.
        if (slot.top > 0) {
          newSlots.push(this.addRect(layout.width, 0, Infinity, slot.top));
        }

        // If item is not aligned to the bottom, create a new slot.
        if (slot.top + slot.height < layout.height) {
          newSlots.push(
            this.addRect(
              layout.width,
              slot.top + slot.height,
              Infinity,
              layout.height - slot.top - slot.height
            )
          );
        }

        // Update grid width.
        layout.width = slot.left + slot.width;
      }

      // Clean up the current slots making sure there are no old slots that
      // overlap with the item. If an old slot overlaps with the item, split it
      // into smaller slots if necessary.
      for (i = fillGaps ? 0 : ignoreCurrentSlots ? freeSlots.length : i; i < freeSlots.length; i++) {
        rectId = freeSlots[i];
        if (!rectId) continue;
        rect = this.getRect(rectId);
        potentialSlots = this.splitRect(rect, slot);
        for (j = 0; j < potentialSlots.length; j++) {
          rectId = potentialSlots[j];
          rect = this.getRect(rectId);
          // Let's make sure here that we have a big enough slot.
          if (rect.width < minSize || rect.height < minSize) continue;
          // Let's also let's make sure that the slot is within the boundaries of
          // the grid.
          if (horizontal ? rect.left < layout.width : rect.top < layout.height) {
            newSlots.push(rectId);
          }
        }
      }

      // Sanitize new slots.
      if (newSlots.length) {
        this.purgeRects(newSlots).sort(horizontal ? this.sortRectsLeftTop : this.sortRectsTopLeft);
      }

      // Free/new slots switcheroo!
      this.freeSlots = newSlots;
      this.newSlots = freeSlots;

      return slot;
    };
  })();

  /**
   * Add a new rectangle to the rectangle store. Returns the id of the new
   * rectangle.
   *
   * @param {Number} left
   * @param {Number} top
   * @param {Number} width
   * @param {Number} height
   * @returns {RectId}
   */
  PackerProcessor.prototype.addRect = function(left, top, width, height) {
    var rectId = ++this.rectId;
    var rectStore = this.rectStore;

    rectStore[rectId] = left || 0;
    rectStore[++this.rectId] = top || 0;
    rectStore[++this.rectId] = width || 0;
    rectStore[++this.rectId] = height || 0;

    return rectId;
  };

  /**
   * Get rectangle data from the rectangle store by id. Optionally you can
   * provide a target object where the rectangle data will be written in. By
   * default an internal object is reused as a target object.
   *
   * @param {RectId} id
   * @param {Object} [target]
   * @returns {Object}
   */
  PackerProcessor.prototype.getRect = function(id, target) {
    var rectItem = target ? target : this.rectItem;
    var rectStore = this.rectStore;

    rectItem.left = rectStore[id] || 0;
    rectItem.top = rectStore[++id] || 0;
    rectItem.width = rectStore[++id] || 0;
    rectItem.height = rectStore[++id] || 0;

    return rectItem;
  };

  /**
   * Punch a hole into a rectangle and split the remaining area into smaller
   * rectangles (4 at max).
   * @param {Rectangle} rect
   * @param {Rectangle} hole
   * @returns {RectId[]}
   */
  PackerProcessor.prototype.splitRect = (function() {
    var results = [];
    return function(rect, hole) {
      // Reset old results.
      results.length = 0;

      // If the rect does not overlap with the hole add rect to the return data
      // as is.
      if (!this.doRectsOverlap(rect, hole)) {
        results.push(this.addRect(rect.left, rect.top, rect.width, rect.height));
        return results;
      }

      // Left split.
      if (rect.left < hole.left) {
        results.push(this.addRect(rect.left, rect.top, hole.left - rect.left, rect.height));
      }

      // Right split.
      if (rect.left + rect.width > hole.left + hole.width) {
        results.push(
          this.addRect(
            hole.left + hole.width,
            rect.top,
            rect.left + rect.width - (hole.left + hole.width),
            rect.height
          )
        );
      }

      // Top split.
      if (rect.top < hole.top) {
        results.push(this.addRect(rect.left, rect.top, rect.width, hole.top - rect.top));
      }

      // Bottom split.
      if (rect.top + rect.height > hole.top + hole.height) {
        results.push(
          this.addRect(
            rect.left,
            hole.top + hole.height,
            rect.width,
            rect.top + rect.height - (hole.top + hole.height)
          )
        );
      }

      return results;
    };
  })();

  /**
   * Check if two rectangles overlap.
   *
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Boolean}
   */
  PackerProcessor.prototype.doRectsOverlap = function(a, b) {
    return !(
      a.left + a.width <= b.left ||
      b.left + b.width <= a.left ||
      a.top + a.height <= b.top ||
      b.top + b.height <= a.top
    );
  };

  /**
   * Check if a rectangle is fully within another rectangle.
   *
   * @param {Rectangle} a
   * @param {Rectangle} b
   * @returns {Boolean}
   */
  PackerProcessor.prototype.isRectWithinRect = function(a, b) {
    return (
      a.left >= b.left &&
      a.top >= b.top &&
      a.left + a.width <= b.left + b.width &&
      a.top + a.height <= b.top + b.height
    );
  };

  /**
   * Loops through an array of rectangle ids and resets all that are fully
   * within another rectangle in the array. Resetting in this case means that
   * the rectangle id value is replaced with zero.
   *
   * @param {RectId[]} rectIds
   * @returns {RectId[]}
   */
  PackerProcessor.prototype.purgeRects = (function() {
    var rectA = {};
    var rectB = {};
    return function(rectIds) {
      var i = rectIds.length;
      var j;

      while (i--) {
        j = rectIds.length;
        if (!rectIds[i]) continue;
        this.getRect(rectIds[i], rectA);
        while (j--) {
          if (!rectIds[j] || i === j) continue;
          if (this.isRectWithinRect(rectA, this.getRect(rectIds[j], rectB))) {
            rectIds[i] = 0;
            break;
          }
        }
      }

      return rectIds;
    };
  })();

  /**
   * Sort rectangles with top-left gravity.
   *
   * @param {RectId} aId
   * @param {RectId} bId
   * @returns {Number}
   */
  PackerProcessor.prototype.sortRectsTopLeft = (function() {
    var rectA = {};
    var rectB = {};
    return function(aId, bId) {
      this.getRect(aId, rectA);
      this.getRect(bId, rectB);
      // prettier-ignore
      return rectA.top < rectB.top ? -1 :
             rectA.top > rectB.top ? 1 :
             rectA.left < rectB.left ? -1 :
             rectA.left > rectB.left ? 1 : 0;
    };
  })();

  /**
   * Sort rectangles with left-top gravity.
   *
   * @param {RectId} aId
   * @param {RectId} bId
   * @returns {Number}
   */
  PackerProcessor.prototype.sortRectsLeftTop = (function() {
    var rectA = {};
    var rectB = {};
    return function(aId, bId) {
      this.getRect(aId, rectA);
      this.getRect(bId, rectB);
      // prettier-ignore
      return rectA.left < rectB.left ? -1 :
             rectA.left > rectB.left ? 1 :
             rectA.top < rectB.top ? -1 :
             rectA.top > rectB.top ? 1 : 0;
    };
  })();

  /**
   * @class
   * @param {Number} [numWorkers=2]
   * @param {Object} [options]
   * @param {Boolean} [options.fillGaps=false]
   * @param {Boolean} [options.horizontal=false]
   * @param {Boolean} [options.alignRight=false]
   * @param {Boolean} [options.alignBottom=false]
   * @param {Boolean} [options.rounding=false]
   */
  function Packer(numWorkers, options) {
    this._options = 0;
    this._processor = null;
    this._layoutQueue = [];
    this._layouts = {};
    this._layoutCallbacks = {};
    this._layoutWorkers = {};
    this._layoutWorkerData = {};
    this._workers = [];
    this._onWorkerMessage = this._onWorkerMessage.bind(this);

    // Set initial options.
    this.setOptions(options);

    // Init the worker(s) or the processor if workers can't be used.
    var workerCount = typeof numWorkers === 'number' ? Math.max(0, numWorkers) : 0;
    if (workerCount && window.Worker) {
      for (var i = 0, worker; i < workerCount; i++) {
        worker = new WorkerFactory();
        worker.onmessage = this._onWorkerMessage;
        this._workers.push(worker);
      }
    } else {
      this._processor = new PackerProcessor();
    }
  }

  Packer.prototype._sendToWorker = function() {
    if (!this._layoutQueue.length || !this._workers.length) return;

    var id = this._layoutQueue.shift();
    var worker = this._workers.pop();
    var data = this._layoutWorkerData[id];

    delete this._layoutWorkerData[id];
    this._layoutWorkers[id] = worker;
    worker.postMessage(data.buffer, [data.buffer]);
  };

  Packer.prototype._onWorkerMessage = function(msg) {
    var data = new Float32Array(msg.data);
    var id = data[PACKET_INDEX_ID];
    var layout = this._layouts[id];
    var callback = this._layoutCallbacks[id];
    var worker = this._layoutWorkers[id];

    if (layout) delete this._layoutCallbacks[id];
    if (callback) delete this._layoutCallbacks[id];
    if (worker) delete this._layoutWorkers[id];

    if (layout && callback) {
      layout.width = data[PACKET_INDEX_WIDTH];
      layout.height = data[PACKET_INDEX_HEIGHT];
      layout.slots = data.subarray(PACKET_HEADER_SLOTS, data.length);
      callback(layout);
    }

    if (worker) {
      this._workers.push(worker);
      this._sendToWorker();
    }
  };

  /**
   * @public
   * @memberof Packer.prototype
   * @param {Object} [options]
   * @param {Boolean} [options.fillGaps]
   * @param {Boolean} [options.horizontal]
   * @param {Boolean} [options.alignRight]
   * @param {Boolean} [options.alignBottom]
   * @param {Boolean} [options.rounding]
   * @returns {Packer}
   */
  Packer.prototype.setOptions = function(options) {
    if (!options) return this;

    var fillGaps;
    if (typeof options.fillGaps === 'boolean') {
      fillGaps = options.fillGaps ? FILL_GAPS : 0;
    } else {
      fillGaps = this._options & FILL_GAPS;
    }

    var horizontal;
    if (typeof options.horizontal === 'boolean') {
      horizontal = options.horizontal ? HORIZONTAL : 0;
    } else {
      horizontal = this._options & HORIZONTAL;
    }

    var alignRight;
    if (typeof options.alignRight === 'boolean') {
      alignRight = options.alignRight ? ALIGN_RIGHT : 0;
    } else {
      alignRight = this._options & ALIGN_RIGHT;
    }

    var alignBottom;
    if (typeof options.alignBottom === 'boolean') {
      alignBottom = options.alignBottom ? ALIGN_BOTTOM : 0;
    } else {
      alignBottom = this._options & ALIGN_BOTTOM;
    }

    var rounding;
    if (typeof options.rounding === 'boolean') {
      rounding = options.rounding ? ROUNDING : 0;
    } else {
      rounding = this._options & ROUNDING;
    }

    this._options = fillGaps | horizontal | alignRight | alignBottom | rounding;

    return this;
  };

  /**
   * @public
   * @memberof Packer.prototype
   * @param {Number} id
   * @param {Item[]} items
   * @param {Number} width
   * @param {Number} height
   * @param {Function} callback
   */
  Packer.prototype.createLayout = function(id, items, width, height, callback) {
    if (this._layouts[id]) {
      throw new Error('A layout with the provided id is currently being processed.');
    }

    var rounding = this._options & ROUNDING;
    var horizontal = this._options & HORIZONTAL;
    var layout = {
      id: id,
      items: items,
      slots: null,
      width: horizontal ? 0 : width,
      height: !horizontal ? 0 : height,
      setWidth: horizontal,
      setHeight: !horizontal,
      settings: this._options
    };

    // If there are no items let's call the callback immediately.
    if (!items.length) {
      layout.slots = [];
      if (rounding) {
        layout.width = Math.round(layout.width);
        layout.height = Math.round(layout.height);
      }
      callback(layout);
      return;
    }

    // Create layout synchronously if needed.
    if (this._processor) {
      layout.slots = window.Float32Array
        ? new Float32Array(items.length * 2)
        : new Array(items.length * 2);
      this._processor.fillLayout(layout);
      callback(layout);
      return;
    }

    // Worker data.
    var data = new Float32Array(PACKET_HEADER_SLOTS + items.length * 2);

    // Worker data header.
    data[PACKET_INDEX_ID] = id;
    data[PACKET_INDEX_WIDTH] = layout.width;
    data[PACKET_INDEX_HEIGHT] = layout.height;
    data[PACKET_INDEX_OPTIONS] = layout.settings;

    // Worker data items.
    var i, j, item;
    for (i = 0, j = PACKET_HEADER_SLOTS - 1, item; i < items.length; i++) {
      item = items[i];
      data[++j] = item._width + item._marginLeft + item._marginRight;
      data[++j] = item._height + item._marginTop + item._marginBottom;
    }

    this._layoutQueue.push(id);
    this._layouts[id] = layout;
    this._layoutCallbacks[id] = callback;
    this._layoutWorkerData[id] = data;

    this._sendToWorker();

    return this.cancelLayout.bind(this, id);
  };

  /**
   * @public
   * @memberof Packer.prototype
   * @param {Number} id
   */
  Packer.prototype.cancelLayout = function(id) {
    var layout = this._layouts[id];
    if (!layout) return;

    delete this._layouts[id];
    delete this._layoutCallbacks[id];

    if (this._layoutWorkerData[id]) {
      delete this._layoutWorkerData[id];
      var queueIndex = this._layoutQueue.indexOf(id);
      if (queueIndex > -1) this._layoutQueue.splice(queueIndex, 1);
    }
  };

  /**
   * @public
   * @memberof Packer.prototype
   */
  Packer.prototype.destroy = function() {
    var worker, id, i;

    // Terminate active workers.
    for (id in this._layoutWorkers) {
      worker = this._layoutWorkers[id];
      worker.onmessage = null;
      worker.terminate();
    }

    // Terminate idle workers.
    for (i = 0; i < this._workers.length; i++) {
      worker = this._workers[i];
      worker.onmessage = null;
      worker.terminate();
    }

    // Reset data.
    this._workers.length = 0;
    this._layoutQueue.length = 0;
    this._layouts = {};
    this._layoutCallbacks = {};
    this._layoutWorkers = {};
    this._layoutWorkerData = {};
  };

  var debounceId = 0;

  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds. The returned function accepts one argument which, when
   * being `true`, cancels the debounce function immediately. When the debounce
   * function is canceled it cannot be invoked again.
   *
   * @param {Function} fn
   * @param {Number} durationMs
   * @returns {Function}
   */
  function debounce(fn, durationMs) {
    var id = ++debounceId;
    var timer = 0;
    var lastTime = 0;
    var isCanceled = false;
    var tick = function(time) {
      if (isCanceled) return;

      if (lastTime) timer -= time - lastTime;
      lastTime = time;

      if (timer > 0) {
        addDebounceTick(id, tick);
      } else {
        timer = lastTime = 0;
        fn();
      }
    };

    return function(cancel) {
      if (isCanceled) return;

      if (durationMs <= 0) {
        if (cancel !== true) fn();
        return;
      }

      if (cancel === true) {
        isCanceled = true;
        timer = lastTime = 0;
        tick = undefined;
        cancelDebounceTick(id);
        return;
      }

      if (timer <= 0) {
        timer = durationMs;
        tick(0);
      } else {
        timer = durationMs;
      }
    };
  }

  var htmlCollectionType = '[object HTMLCollection]';
  var nodeListType = '[object NodeList]';

  /**
   * Check if a value is a node list or a html collection.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isNodeList(val) {
    var type = Object.prototype.toString.call(val);
    return type === htmlCollectionType || type === nodeListType;
  }

  var objectType = 'object';
  var objectToStringType = '[object Object]';
  var toString = Object.prototype.toString;

  /**
   * Check if a value is a plain object.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  function isPlainObject(val) {
    return typeof val === objectType && toString.call(val) === objectToStringType;
  }

  function noop() {}

  /**
   * Converts a value to an array or clones an array.
   *
   * @param {*} val
   * @returns {Array}
   */
  function toArray(val) {
    return isNodeList(val) ? Array.prototype.slice.call(val) : Array.prototype.concat(val);
  }

  var PACKER = new Packer(2);
  var NUMBER_TYPE = 'number';
  var STRING_TYPE = 'string';
  var INSTANT_LAYOUT = 'instant';
  var layoutId = 0;

  /**
   * Creates a new Grid instance.
   *
   * @class
   * @param {(HTMLElement|String)} element
   * @param {Object} [options]
   * @param {?(HTMLElement[]|NodeList|String)} [options.items]
   * @param {Number} [options.showDuration=300]
   * @param {String} [options.showEasing="ease"]
   * @param {Object} [options.visibleStyles]
   * @param {Number} [options.hideDuration=300]
   * @param {String} [options.hideEasing="ease"]
   * @param {Object} [options.hiddenStyles]
   * @param {(Function|Object)} [options.layout]
   * @param {Boolean} [options.layout.fillGaps=false]
   * @param {Boolean} [options.layout.horizontal=false]
   * @param {Boolean} [options.layout.alignRight=false]
   * @param {Boolean} [options.layout.alignBottom=false]
   * @param {Boolean} [options.layout.rounding=true]
   * @param {(Boolean|Number)} [options.layoutOnResize=150]
   * @param {Boolean} [options.layoutOnInit=true]
   * @param {Number} [options.layoutDuration=300]
   * @param {String} [options.layoutEasing="ease"]
   * @param {?Object} [options.sortData=null]
   * @param {Boolean} [options.dragEnabled=false]
   * @param {?String} [options.dragHandle=null]
   * @param {?HtmlElement} [options.dragContainer=null]
   * @param {?Function} [options.dragStartPredicate]
   * @param {Number} [options.dragStartPredicate.distance=0]
   * @param {Number} [options.dragStartPredicate.delay=0]
   * @param {?String} [options.dragAxis]
   * @param {(Boolean|Function)} [options.dragSort=true]
   * @param {Object} [options.dragSortHeuristics]
   * @param {Number} [options.dragSortHeuristics.sortInterval=100]
   * @param {Number} [options.dragSortHeuristics.minDragDistance=10]
   * @param {Number} [options.dragSortHeuristics.minBounceBackAngle=1]
   * @param {(Function|Object)} [options.dragSortPredicate]
   * @param {Number} [options.dragSortPredicate.threshold=50]
   * @param {String} [options.dragSortPredicate.action="move"]
   * @param {String} [options.dragSortPredicate.migrateAction="move"]
   * @param {Object} [options.dragRelease]
   * @param {Number} [options.dragRelease.duration=300]
   * @param {String} [options.dragRelease.easing="ease"]
   * @param {Boolean} [options.dragRelease.useDragContainer=true]
   * @param {Object} [options.dragCssProps]
   * @param {Object} [options.dragPlaceholder]
   * @param {Boolean} [options.dragPlaceholder.enabled=false]
   * @param {?Function} [options.dragPlaceholder.createElement=null]
   * @param {?Function} [options.dragPlaceholder.onCreate=null]
   * @param {?Function} [options.dragPlaceholder.onRemove=null]
   * @param {Object} [options.dragAutoScroll]
   * @param {(Function|Array)} [options.dragAutoScroll.targets=[]]
   * @param {?Function} [options.dragAutoScroll.handle=null]
   * @param {Number} [options.dragAutoScroll.threshold=50]
   * @param {Number} [options.dragAutoScroll.safeZone=0.2]
   * @param {(Function|Number)} [options.dragAutoScroll.speed]
   * @param {Boolean} [options.dragAutoScroll.sortDuringScroll=true]
   * @param {Boolean} [options.dragAutoScroll.syncAfterScroll=true]
   * @param {Boolean} [options.dragAutoScroll.smoothStop=true]
   * @param {?Function} [options.dragAutoScroll.onStart=null]
   * @param {?Function} [options.dragAutoScroll.onStop=null]
   * @param {String} [options.containerClass="muuri"]
   * @param {String} [options.itemClass="muuri-item"]
   * @param {String} [options.itemVisibleClass="muuri-item-visible"]
   * @param {String} [options.itemHiddenClass="muuri-item-hidden"]
   * @param {String} [options.itemPositioningClass="muuri-item-positioning"]
   * @param {String} [options.itemDraggingClass="muuri-item-dragging"]
   * @param {String} [options.itemReleasingClass="muuri-item-releasing"]
   * @param {String} [options.itemPlaceholderClass="muuri-item-placeholder"]
   */

  function Grid(element, options) {
    // Allow passing element as selector string
    if (typeof element === STRING_TYPE) {
      element = document.querySelector(element);
    }

    // Store element for instance.
    this._element = element;

    // Throw an error if the container element is not body element or does not
    // exist within the body element.
    var isElementInDom = element.getRootNode
      ? element.getRootNode({ composed: true }) === document
      : document.body.contains(element);
    if (!isElementInDom || element === document.documentElement) {
      throw new Error('Container element must be an existing DOM element');
    }

    // Create instance settings by merging the options with default options.
    var settings = (this._settings = mergeSettings(Grid.defaultOptions, options));

    // Sanitize dragSort setting.
    if (!isFunction(settings.dragSort)) {
      settings.dragSort = !!settings.dragSort;
    }

    // Normalize visible and hidden styles.
    settings.visibleStyles = normalizeStyles(settings.visibleStyles);
    settings.hiddenStyles = normalizeStyles(settings.hiddenStyles);

    // Create instance id and store it to the grid instances collection.
    this._id = createUid();
    GRID_INSTANCES[this._id] = this;

    // Destroyed flag.
    this._isDestroyed = false;

    // Layout data.
    this._layout = {
      id: 0,
      items: [],
      slots: [],
      setWidth: false,
      setHeight: false,
      width: 0,
      height: 0
    };
    this._isLayoutFinished = true;
    this._nextLayoutData = null;
    this._onLayoutDataReceived = this._onLayoutDataReceived.bind(this);

    // Create private Emitter instance.
    this._emitter = new Emitter();

    // Add container element's class name.
    addClass(element, settings.containerClass);

    // Create initial items.
    this._items = getInitialGridItems(this, settings.items);

    // If layoutOnResize option is a valid number sanitize it and bind the resize
    // handler.
    bindLayoutOnResize(this, settings.layoutOnResize);

    // Layout on init if necessary.
    if (settings.layoutOnInit) {
      this.layout(true);
    }
  }

  /**
   * Public properties
   * *****************
   */

  /**
   * @see Item
   */
  Grid.Item = Item;

  /**
   * @see ItemLayout
   */
  Grid.ItemLayout = ItemLayout;

  /**
   * @see ItemVisibility
   */
  Grid.ItemVisibility = ItemVisibility;

  /**
   * @see ItemMigrate
   */
  Grid.ItemMigrate = ItemMigrate;

  /**
   * @see ItemAnimate
   */
  Grid.ItemAnimate = ItemAnimate;

  /**
   * @see ItemDrag
   */
  Grid.ItemDrag = ItemDrag;

  /**
   * @see ItemRelease
   */
  Grid.ItemRelease = ItemDragRelease;

  /**
   * @see ItemDragPlaceholder
   */
  Grid.ItemDragPlaceholder = ItemDragPlaceholder;

  /**
   * @see Emitter
   */
  Grid.Emitter = Emitter;

  /**
   * @see Dragger
   */
  Grid.Dragger = Dragger;

  /**
   * @see Packer
   */
  Grid.Packer = Packer;

  /**
   * @see AutoScroller
   */
  Grid.AutoScroller = AutoScroller;

  /**
   * Default options for Grid instance.
   *
   * @public
   * @memberof Grid
   */
  Grid.defaultOptions = {
    // Item elements
    items: '*',

    // Default show animation
    showDuration: 300,
    showEasing: 'ease',

    // Default hide animation
    hideDuration: 300,
    hideEasing: 'ease',

    // Item's visible/hidden state styles
    visibleStyles: {
      opacity: '1',
      transform: 'scale(1)'
    },
    hiddenStyles: {
      opacity: '0',
      transform: 'scale(0.5)'
    },

    // Layout
    layout: {
      fillGaps: false,
      horizontal: false,
      alignRight: false,
      alignBottom: false,
      rounding: true
    },
    layoutOnResize: 150,
    layoutOnInit: true,
    layoutDuration: 300,
    layoutEasing: 'ease',

    // Sorting
    sortData: null,

    // Drag & Drop
    dragEnabled: false,
    dragContainer: null,
    dragHandle: null,
    dragStartPredicate: {
      distance: 0,
      delay: 0
    },
    dragAxis: null,
    dragSort: true,
    dragSortHeuristics: {
      sortInterval: 100,
      minDragDistance: 10,
      minBounceBackAngle: 1
    },
    dragSortPredicate: {
      threshold: 50,
      action: ACTION_MOVE,
      migrateAction: ACTION_MOVE
    },
    dragRelease: {
      duration: 300,
      easing: 'ease',
      useDragContainer: true
    },
    dragCssProps: {
      touchAction: 'none',
      userSelect: 'none',
      userDrag: 'none',
      tapHighlightColor: 'rgba(0, 0, 0, 0)',
      touchCallout: 'none',
      contentZooming: 'none'
    },
    dragPlaceholder: {
      enabled: false,
      createElement: null,
      onCreate: null,
      onRemove: null
    },
    dragAutoScroll: {
      targets: [],
      handle: null,
      threshold: 50,
      safeZone: 0.2,
      speed: AutoScroller.smoothSpeed(1000, 2000, 2500),
      sortDuringScroll: true,
      syncAfterScroll: true,
      smoothStop: true,
      onStart: null,
      onStop: null
    },

    // Classnames
    containerClass: 'muuri',
    itemClass: 'muuri-item',
    itemVisibleClass: 'muuri-item-shown',
    itemHiddenClass: 'muuri-item-hidden',
    itemPositioningClass: 'muuri-item-positioning',
    itemDraggingClass: 'muuri-item-dragging',
    itemReleasingClass: 'muuri-item-releasing',
    itemPlaceholderClass: 'muuri-item-placeholder'
  };

  /**
   * Public prototype methods
   * ************************
   */

  /**
   * Bind an event listener.
   *
   * @public
   * @memberof Grid.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.on = function(event, listener) {
    this._emitter.on(event, listener);
    return this;
  };

  /**
   * Unbind an event listener.
   *
   * @public
   * @memberof Grid.prototype
   * @param {String} event
   * @param {Function} listener
   * @returns {Grid}
   */
  Grid.prototype.off = function(event, listener) {
    this._emitter.off(event, listener);
    return this;
  };

  /**
   * Get the container element.
   *
   * @public
   * @memberof Grid.prototype
   * @returns {HTMLElement}
   */
  Grid.prototype.getElement = function() {
    return this._element;
  };

  /**
   * Get all items. Optionally you can provide specific targets (elements and
   * indices). Note that the returned array is not the same object used by the
   * instance so modifying it will not affect instance's items. All items that
   * are not found are omitted from the returned array.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} [targets]
   * @returns {Item[]}
   */
  Grid.prototype.getItems = function(targets) {
    // Return all items immediately if no targets were provided or if the
    // instance is destroyed.
    if (this._isDestroyed || targets === undefined) {
      return this._items.slice(0);
    }

    var items = [];
    var i, item;

    if (Array.isArray(targets) || isNodeList(targets)) {
      for (i = 0; i < targets.length; i++) {
        item = this._getItem(targets[i]);
        if (item) items.push(item);
      }
    } else {
      item = this._getItem(targets);
      if (item) items.push(item);
    }

    return items;
  };

  /**
   * Update the cached dimensions of the instance's items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} [items]
   * @returns {Grid}
   */
  Grid.prototype.refreshItems = function(items) {
    if (this._isDestroyed) return this;

    var targets = this.getItems(items);
    var i;

    for (i = 0; i < targets.length; i++) {
      targets[i]._refreshDimensions();
    }

    return this;
  };

  /**
   * Update the sort data of the instance's items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} [items]
   * @returns {Grid}
   */
  Grid.prototype.refreshSortData = function(items) {
    if (this._isDestroyed) return this;

    var targetItems = this.getItems(items);
    var i;

    for (i = 0; i < targetItems.length; i++) {
      targetItems[i]._refreshSortData();
    }

    return this;
  };

  /**
   * Synchronize the item elements to match the order of the items in the DOM.
   * This comes handy if you need to keep the DOM structure matched with the
   * order of the items. Note that if an item's element is not currently a child
   * of the container element (if it is dragged for example) it is ignored and
   * left untouched.
   *
   * @public
   * @memberof Grid.prototype
   * @returns {Grid}
   */
  Grid.prototype.synchronize = function() {
    if (this._isDestroyed) return this;

    var items = this._items;
    if (!items.length) return this;

    var fragment;
    var element;

    for (var i = 0; i < items.length; i++) {
      element = items[i]._element;
      if (element.parentNode === this._element) {
        fragment = fragment || document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    if (!fragment) return this;

    this._element.appendChild(fragment);
    this._emit(EVENT_SYNCHRONIZE);

    return this;
  };

  /**
   * Calculate and apply item positions.
   *
   * @public
   * @memberof Grid.prototype
   * @param {Boolean} [instant=false]
   * @param {LayoutCallback} [onFinish]
   * @returns {Grid}
   */
  Grid.prototype.layout = function(instant, onFinish) {
    if (this._isDestroyed) return this;

    // Cancel unfinished layout algorithm if possible.
    var unfinishedLayout = this._nextLayoutData;
    if (unfinishedLayout && isFunction(unfinishedLayout.cancel)) {
      unfinishedLayout.cancel();
    }

    // Store data for next layout.
    var nextLayoutId = ++layoutId;
    this._nextLayoutData = {
      id: nextLayoutId,
      instant: instant,
      onFinish: onFinish,
      cancel: null
    };

    // Collect layout items (all active grid items).
    var items = this._items;
    var layoutItems = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i]._isActive) layoutItems.push(items[i]);
    }

    // Compute new layout.
    this._refreshDimensions();
    var gridWidth = this._width - this._borderLeft - this._borderRight;
    var gridHeight = this._height - this._borderTop - this._borderBottom;
    var layoutSettings = this._settings.layout;
    var cancelLayout;
    if (isFunction(layoutSettings)) {
      cancelLayout = layoutSettings.call(
        this,
        nextLayoutId,
        layoutItems,
        gridWidth,
        gridHeight,
        this._onLayoutDataReceived
      );
    } else {
      PACKER.setOptions(layoutSettings);
      cancelLayout = PACKER.createLayout(
        nextLayoutId,
        layoutItems,
        gridWidth,
        gridHeight,
        this._onLayoutDataReceived
      );
    }

    // Store layout cancel method if available.
    if (
      isFunction(cancelLayout) &&
      this._nextLayoutData &&
      this._nextLayoutData.id === nextLayoutId
    ) {
      this._nextLayoutData.cancel = cancelLayout;
    }

    return this;
  };

  /**
   * Add new items by providing the elements you wish to add to the instance and
   * optionally provide the index where you want the items to be inserted into.
   * All elements that are not already children of the container element will be
   * automatically appended to the container element. If an element has it's CSS
   * display property set to "none" it will be marked as inactive during the
   * initiation process. As long as the item is inactive it will not be part of
   * the layout, but it will retain it's index. You can activate items at any
   * point with grid.show() method. This method will automatically call
   * grid.layout() if one or more of the added elements are visible. If only
   * hidden items are added no layout will be called. All the new visible items
   * are positioned without animation during their first layout.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(HTMLElement|HTMLElement[])} elements
   * @param {Object} [options]
   * @param {Number} [options.index=-1]
   * @param {Boolean} [options.isActive]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Item[]}
   */
  Grid.prototype.add = function(elements, options) {
    if (this._isDestroyed || !elements) return [];

    var newItems = toArray(elements);
    if (!newItems.length) return newItems;

    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var items = this._items;
    var needsLayout = false;
    var fragment;
    var element;
    var item;
    var i;

    // Collect all the elements that are not child of the grid element into a
    // document fragment.
    for (i = 0; i < newItems.length; i++) {
      element = newItems[i];
      if (element.parentNode === this._element) {
        fragment = fragment || document.createDocumentFragment();
        fragment.appendChild(element);
      }
    }

    // If we have a fragment, let's append it to the grid element. We could just
    // not do this and the `new Item()` instantiation would handle this for us,
    // but this way we can add the elements into the DOM a bit faster.
    if (fragment) {
      this._element.appendChild(fragment);
    }

    // Map provided elements into new grid items.
    for (i = 0; i < newItems.length; i++) {
      element = newItems[i];
      item = newItems[i] = new Item(this, element, opts.isActive);

      // If the item to be added is active, we need to do a layout. Also, we
      // need to mark the item with the skipNextAnimation flag to make it
      // position instantly (without animation) during the next layout. Without
      // the hack the item would animate to it's new position from the northwest
      // corner of the grid, which feels a bit buggy (imho).
      if (item._isActive) {
        needsLayout = true;
        item._layout._skipNextAnimation = true;
      }
    }

    // Set up the items' initial dimensions and sort data. This needs to be done
    // in a separate loop to avoid layout thrashing.
    for (i = 0; i < newItems.length; i++) {
      item = newItems[i];
      item._refreshDimensions();
      item._refreshSortData();
    }

    // Add the new items to the items collection to correct index.
    arrayInsert(items, newItems, opts.index);

    // Emit add event.
    if (this._hasListeners(EVENT_ADD)) {
      this._emit(EVENT_ADD, newItems.slice(0));
    }

    // If layout is needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }

    return newItems;
  };

  /**
   * Remove items from the instance.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} items
   * @param {Object} [options]
   * @param {Boolean} [options.removeElements=false]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Item[]}
   */
  Grid.prototype.remove = function(items, options) {
    if (this._isDestroyed) return this;

    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var needsLayout = false;
    var allItems = this.getItems();
    var targetItems = this.getItems(items);
    var indices = [];
    var item;
    var i;

    // Remove the individual items.
    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];
      indices.push(allItems.indexOf(item));
      if (item._isActive) needsLayout = true;
      item._destroy(opts.removeElements);
    }

    // Emit remove event.
    if (this._hasListeners(EVENT_REMOVE)) {
      this._emit(EVENT_REMOVE, targetItems.slice(0), indices);
    }

    // If layout is needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }

    return targetItems;
  };

  /**
   * Show instance items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {ShowCallback} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.show = function(items, options) {
    if (this._isDestroyed) return this;
    this._setItemsVisibility(items, true, options);
    return this;
  };

  /**
   * Hide instance items.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} items
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {HideCallback} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.hide = function(items, options) {
    if (this._isDestroyed) return this;
    this._setItemsVisibility(items, false, options);
    return this;
  };

  /**
   * Filter items. Expects at least one argument, a predicate, which should be
   * either a function or a string. The predicate callback is executed for every
   * item in the instance. If the return value of the predicate is truthy the
   * item in question will be shown and otherwise hidden. The predicate callback
   * receives the item instance as it's argument. If the predicate is a string
   * it is considered to be a selector and it is checked against every item
   * element in the instance with the native element.matches() method. All the
   * matching items will be shown and others hidden.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(Function|String)} predicate
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {FilterCallback} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.filter = function(predicate, options) {
    if (this._isDestroyed || !this._items.length) return this;

    var itemsToShow = [];
    var itemsToHide = [];
    var isPredicateString = typeof predicate === STRING_TYPE;
    var isPredicateFn = isFunction(predicate);
    var opts = options || {};
    var isInstant = opts.instant === true;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var onFinish = isFunction(opts.onFinish) ? opts.onFinish : null;
    var tryFinishCounter = -1;
    var tryFinish = noop;
    var item;
    var i;

    // If we have onFinish callback, let's create proper tryFinish callback.
    if (onFinish) {
      tryFinish = function() {
        ++tryFinishCounter && onFinish(itemsToShow.slice(0), itemsToHide.slice(0));
      };
    }

    // Check which items need to be shown and which hidden.
    if (isPredicateFn || isPredicateString) {
      for (i = 0; i < this._items.length; i++) {
        item = this._items[i];
        if (isPredicateFn ? predicate(item) : elementMatches(item._element, predicate)) {
          itemsToShow.push(item);
        } else {
          itemsToHide.push(item);
        }
      }
    }

    // Show items that need to be shown.
    if (itemsToShow.length) {
      this.show(itemsToShow, {
        instant: isInstant,
        onFinish: tryFinish,
        layout: false
      });
    } else {
      tryFinish();
    }

    // Hide items that need to be hidden.
    if (itemsToHide.length) {
      this.hide(itemsToHide, {
        instant: isInstant,
        onFinish: tryFinish,
        layout: false
      });
    } else {
      tryFinish();
    }

    // If there are any items to filter.
    if (itemsToShow.length || itemsToHide.length) {
      // Emit filter event.
      if (this._hasListeners(EVENT_FILTER)) {
        this._emit(EVENT_FILTER, itemsToShow.slice(0), itemsToHide.slice(0));
      }

      // If layout is needed.
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }
    }

    return this;
  };

  /**
   * Sort items. There are three ways to sort the items. The first is simply by
   * providing a function as the comparer which works identically to native
   * array sort. Alternatively you can sort by the sort data you have provided
   * in the instance's options. Just provide the sort data key(s) as a string
   * (separated by space) and the items will be sorted based on the provided
   * sort data keys. Lastly you have the opportunity to provide a presorted
   * array of items which will be used to sync the internal items array in the
   * same order.
   *
   * @public
   * @memberof Grid.prototype
   * @param {(Function|Item[]|String|String[])} comparer
   * @param {Object} [options]
   * @param {Boolean} [options.descending=false]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.sort = (function() {
    var sortComparer;
    var isDescending;
    var origItems;
    var indexMap;

    function parseCriteria(data) {
      return data
        .trim()
        .split(' ')
        .map(function(val) {
          return val.split(':');
        });
    }

    function getIndexMap(items) {
      var result = {};
      for (var i = 0; i < items.length; i++) {
        result[items[i]._id] = i;
      }
      return result;
    }

    function compareIndices(itemA, itemB) {
      var indexA = indexMap[itemA._id];
      var indexB = indexMap[itemB._id];
      return isDescending ? indexB - indexA : indexA - indexB;
    }

    function defaultComparer(a, b) {
      var result = 0;
      var criteriaName;
      var criteriaOrder;
      var valA;
      var valB;

      // Loop through the list of sort criteria.
      for (var i = 0; i < sortComparer.length; i++) {
        // Get the criteria name, which should match an item's sort data key.
        criteriaName = sortComparer[i][0];
        criteriaOrder = sortComparer[i][1];

        // Get items' cached sort values for the criteria. If the item has no sort
        // data let's update the items sort data (this is a lazy load mechanism).
        valA = (a._sortData ? a : a._refreshSortData())._sortData[criteriaName];
        valB = (b._sortData ? b : b._refreshSortData())._sortData[criteriaName];

        // Sort the items in descending order if defined so explicitly. Otherwise
        // sort items in ascending order.
        if (criteriaOrder === 'desc' || (!criteriaOrder && isDescending)) {
          result = valB < valA ? -1 : valB > valA ? 1 : 0;
        } else {
          result = valA < valB ? -1 : valA > valB ? 1 : 0;
        }

        // If we have -1 or 1 as the return value, let's return it immediately.
        if (result) return result;
      }

      // If values are equal let's compare the item indices to make sure we
      // have a stable sort.
      if (!result) {
        if (!indexMap) indexMap = getIndexMap(origItems);
        result = compareIndices(a, b);
      }
      return result;
    }

    function customComparer(a, b) {
      var result = sortComparer(a, b);
      // If descending let's invert the result value.
      if (isDescending && result) result = -result;
      // If we have a valid result (not zero) let's return it right away.
      if (result) return result;
      // If result is zero let's compare the item indices to make sure we have a
      // stable sort.
      if (!indexMap) indexMap = getIndexMap(origItems);
      return compareIndices(a, b);
    }

    return function(comparer, options) {
      if (this._isDestroyed || this._items.length < 2) return this;

      var items = this._items;
      var opts = options || {};
      var layout = opts.layout ? opts.layout : opts.layout === undefined;
      var i;

      // Setup parent scope data.
      sortComparer = comparer;
      isDescending = !!opts.descending;
      origItems = items.slice(0);
      indexMap = null;

      // If function is provided do a native array sort.
      if (isFunction(sortComparer)) {
        items.sort(customComparer);
      }
      // Otherwise if we got a string, let's sort by the sort data as provided in
      // the instance's options.
      else if (typeof sortComparer === STRING_TYPE) {
        sortComparer = parseCriteria(comparer);
        items.sort(defaultComparer);
      }
      // Otherwise if we got an array, let's assume it's a presorted array of the
      // items and order the items based on it.
      else if (Array.isArray(sortComparer)) {
        if (sortComparer.length !== items.length) {
          throw new Error('Sort reference items do not match with grid items.');
        }
        for (i = 0; i < items.length; i++) {
          if (sortComparer.indexOf(items[i]) < 0) {
            throw new Error('Sort reference items do not match with grid items.');
          }
          items[i] = sortComparer[i];
        }
        if (isDescending) items.reverse();
      }
      // Otherwise let's just skip it, nothing we can do here.
      else {
        return this;
      }

      // Emit sort event.
      if (this._hasListeners(EVENT_SORT)) {
        this._emit(EVENT_SORT, items.slice(0), origItems);
      }

      // If layout is needed.
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }

      return this;
    };
  })();

  /**
   * Move item to another index or in place of another item.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridSingleItemQuery} item
   * @param {GridSingleItemQuery} position
   * @param {Object} [options]
   * @param {String} [options.action="move"]
   *   - Accepts either "move" or "swap".
   *   - "move" moves the item in place of the other item.
   *   - "swap" swaps the position of the items.
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   * @returns {Grid}
   */
  Grid.prototype.move = function(item, position, options) {
    if (this._isDestroyed || this._items.length < 2) return this;

    var items = this._items;
    var opts = options || {};
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var isSwap = opts.action === ACTION_SWAP;
    var action = isSwap ? ACTION_SWAP : ACTION_MOVE;
    var fromItem = this._getItem(item);
    var toItem = this._getItem(position);
    var fromIndex;
    var toIndex;

    // Make sure the items exist and are not the same.
    if (fromItem && toItem && fromItem !== toItem) {
      // Get the indices of the items.
      fromIndex = items.indexOf(fromItem);
      toIndex = items.indexOf(toItem);

      // Do the move/swap.
      if (isSwap) {
        arraySwap(items, fromIndex, toIndex);
      } else {
        arrayMove(items, fromIndex, toIndex);
      }

      // Emit move event.
      if (this._hasListeners(EVENT_MOVE)) {
        this._emit(EVENT_MOVE, {
          item: fromItem,
          fromIndex: fromIndex,
          toIndex: toIndex,
          action: action
        });
      }

      // If layout is needed.
      if (layout) {
        this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
      }
    }

    return this;
  };

  /**
   * Send item to another Grid instance.
   *
   * @public
   * @memberof Grid.prototype
   * @param {GridSingleItemQuery} item
   * @param {Grid} grid
   * @param {GridSingleItemQuery} position
   * @param {Object} [options]
   * @param {HTMLElement} [options.appendTo=document.body]
   * @param {(Boolean|LayoutCallback|String)} [options.layoutSender=true]
   * @param {(Boolean|LayoutCallback|String)} [options.layoutReceiver=true]
   * @returns {Grid}
   */
  Grid.prototype.send = function(item, grid, position, options) {
    if (this._isDestroyed || grid._isDestroyed || this === grid) return this;

    // Make sure we have a valid target item.
    item = this._getItem(item);
    if (!item) return this;

    var opts = options || {};
    var container = opts.appendTo || document.body;
    var layoutSender = opts.layoutSender ? opts.layoutSender : opts.layoutSender === undefined;
    var layoutReceiver = opts.layoutReceiver
      ? opts.layoutReceiver
      : opts.layoutReceiver === undefined;

    // Start the migration process.
    item._migrate.start(grid, position, container);

    // If migration was started successfully and the item is active, let's layout
    // the grids.
    if (item._migrate._isActive && item._isActive) {
      if (layoutSender) {
        this.layout(
          layoutSender === INSTANT_LAYOUT,
          isFunction(layoutSender) ? layoutSender : undefined
        );
      }
      if (layoutReceiver) {
        grid.layout(
          layoutReceiver === INSTANT_LAYOUT,
          isFunction(layoutReceiver) ? layoutReceiver : undefined
        );
      }
    }

    return this;
  };

  /**
   * Destroy the instance.
   *
   * @public
   * @memberof Grid.prototype
   * @param {Boolean} [removeElements=false]
   * @returns {Grid}
   */
  Grid.prototype.destroy = function(removeElements) {
    if (this._isDestroyed) return this;

    var container = this._element;
    var items = this._items.slice(0);
    var i;

    // Unbind window resize event listener.
    unbindLayoutOnResize(this);

    // Destroy items.
    for (i = 0; i < items.length; i++) {
      items[i]._destroy(removeElements);
    }

    // Restore container.
    removeClass(container, this._settings.containerClass);
    container.style.height = '';
    container.style.width = '';

    // Emit destroy event and unbind all events.
    this._emit(EVENT_DESTROY);
    this._emitter.destroy();

    // Remove reference from the grid instances collection.
    delete GRID_INSTANCES[this._id];

    // Flag instance as destroyed.
    this._isDestroyed = true;

    return this;
  };

  /**
   * Private prototype methods
   * *************************
   */

  /**
   * Get instance's item by element or by index. Target can also be an Item
   * instance in which case the function returns the item if it exists within
   * related Grid instance. If nothing is found with the provided target, null
   * is returned.
   *
   * @private
   * @memberof Grid.prototype
   * @param {GridSingleItemQuery} [target]
   * @returns {?Item}
   */
  Grid.prototype._getItem = function(target) {
    // If no target is specified or the instance is destroyed, return null.
    if (this._isDestroyed || (!target && target !== 0)) {
      return null;
    }

    // If target is number return the item in that index. If the number is lower
    // than zero look for the item starting from the end of the items array. For
    // example -1 for the last item, -2 for the second last item, etc.
    if (typeof target === NUMBER_TYPE) {
      return this._items[target > -1 ? target : this._items.length + target] || null;
    }

    // If the target is an instance of Item return it if it is attached to this
    // Grid instance, otherwise return null.
    if (target instanceof Item) {
      return target._gridId === this._id ? target : null;
    }

    // In other cases let's assume that the target is an element, so let's try
    // to find an item that matches the element and return it. If item is not
    // found return null.
    for (var i = 0; i < this._items.length; i++) {
      if (this._items[i]._element === target) {
        return this._items[i];
      }
    }

    return null;
  };

  /**
   * Emit a grid event.
   *
   * @private
   * @memberof Grid.prototype
   * @param {String} event
   * @param {...*} [arg]
   */
  Grid.prototype._emit = function() {
    if (this._isDestroyed) return;
    this._emitter.emit.apply(this._emitter, arguments);
  };

  /**
   * Check if there are any events listeners for an event.
   *
   * @private
   * @memberof Grid.prototype
   * @param {String} event
   * @returns {Boolean}
   */
  Grid.prototype._hasListeners = function(event) {
    var listeners = this._emitter._events[event];
    return !!(listeners && listeners.length);
  };

  /**
   * Update container's width, height and offsets.
   *
   * @private
   * @memberof Grid.prototype
   */
  Grid.prototype._updateBoundingRect = function() {
    var element = this._element;
    var rect = element.getBoundingClientRect();
    this._width = rect.width;
    this._height = rect.height;
    this._left = rect.left;
    this._top = rect.top;
    this._right = rect.right;
    this._bottom = rect.bottom;
  };

  /**
   * Update container's border sizes.
   *
   * @private
   * @memberof Grid.prototype
   * @param {Boolean} left
   * @param {Boolean} right
   * @param {Boolean} top
   * @param {Boolean} bottom
   */
  Grid.prototype._updateBorders = function(left, right, top, bottom) {
    var element = this._element;
    if (left) this._borderLeft = getStyleAsFloat(element, 'border-left-width');
    if (right) this._borderRight = getStyleAsFloat(element, 'border-right-width');
    if (top) this._borderTop = getStyleAsFloat(element, 'border-top-width');
    if (bottom) this._borderBottom = getStyleAsFloat(element, 'border-bottom-width');
  };

  /**
   * Refresh all of container's internal dimensions and offsets.
   *
   * @private
   * @memberof Grid.prototype
   */
  Grid.prototype._refreshDimensions = function() {
    this._updateBoundingRect();
    this._updateBorders(1, 1, 1, 1);
  };

  /**
   * If grid's width or height was modified, we need to update it's cached
   * dimensions. Also keep in mind that grid's cached width/height should
   * always equal to what elem.getBoundingClientRect() would return, so
   * therefore we need to add the grid element's borders to the dimensions if
   * it's box-sizing is border-box. Note that we support providing the
   * dimensions as a string here too so that one can define the unit of the
   * dimensions, in which case we don't do the border-box check.
   *
   * @private
   * @memberof Grid.prototype
   * @param {LayoutData} layout
   */
  Grid.prototype._updateGridElementSize = function(layout) {
    var element = this._element;
    var isBorderBox = false;

    if (
      (layout.setHeight && typeof layout.height === NUMBER_TYPE) ||
      (layout.setWidth && typeof layout.width === NUMBER_TYPE)
    ) {
      // TODO: Cache this value with refreshDimensions.
      isBorderBox = getStyle(element, 'box-sizing') === 'border-box';
    }

    if (layout.setHeight) {
      if (typeof layout.height === NUMBER_TYPE) {
        element.style.height =
          (isBorderBox ? layout.height + this._borderTop + this._borderBottom : layout.height) + 'px';
      } else {
        element.style.height = layout.height;
      }
    }

    if (layout.setWidth) {
      if (typeof layout.width === NUMBER_TYPE) {
        element.style.width =
          (isBorderBox ? layout.width + this._borderLeft + this._borderRight : layout.width) + 'px';
      } else {
        element.style.width = layout.width;
      }
    }
  };

  /**
   * Calculate and apply item positions.
   *
   * @private
   * @memberof Grid.prototype
   * @param {Object} layout
   */
  Grid.prototype._onLayoutDataReceived = (function() {
    var itemsToLayout = [];
    return function(layout) {
      if (this._isDestroyed || !this._nextLayoutData || this._nextLayoutData.id !== layout.id) return;

      var grid = this;
      var instant = this._nextLayoutData.instant;
      var onFinish = this._nextLayoutData.onFinish;
      var numItems = layout.items.length;
      var counter = numItems;
      var item;
      var left;
      var top;
      var i;

      // Reset next layout data.
      this._nextLayoutData = null;

      if (!this._isLayoutFinished && this._hasListeners(EVENT_LAYOUT_ABORT)) {
        this._emit(EVENT_LAYOUT_ABORT, this._layout.items.slice(0));
      }

      // Update the layout reference.
      this._layout = layout;

      // Update the item positions and collect all items that need to be laid
      // out. It is critical that we update the item position _before_ the
      // layoutStart event as the new data might be needed in the callback.
      itemsToLayout.length = 0;
      for (i = 0; i < numItems; i++) {
        item = layout.items[i];
        if (!item) {
          --counter;
          continue;
        }

        left = layout.slots[i * 2];
        top = layout.slots[i * 2 + 1];
        if (left === item._left && top === item._top && !item._dragRelease.isJustReleased()) {
          --counter;
          continue;
        }

        item._left = left;
        item._top = top;

        if (item.isActive() && !item.isDragging()) {
          itemsToLayout.push(item);
        }
      }

      this._updateGridElementSize(layout);

      // layoutStart event is intentionally emitted after the container element's
      // dimensions are set, because otherwise there would be no hook for reacting
      // to container dimension changes.
      if (this._hasListeners(EVENT_LAYOUT_START)) {
        this._emit(EVENT_LAYOUT_START, layout.items.slice(0), instant === true);
      }

      function tryFinish() {
        if (--counter > 0) return;

        var hasLayoutChanged = grid._layout.id !== layout.id;
        var callback = isFunction(instant) ? instant : onFinish;

        if (!hasLayoutChanged) {
          grid._isLayoutFinished = true;
        }

        if (isFunction(callback)) {
          callback(layout.items.slice(0), hasLayoutChanged);
        }

        if (!hasLayoutChanged && grid._hasListeners(EVENT_LAYOUT_END)) {
          grid._emit(EVENT_LAYOUT_END, layout.items.slice(0));
        }
      }

      if (!itemsToLayout.length) {
        tryFinish();
        return this;
      }

      this._isLayoutFinished = false;

      for (i = 0; i < itemsToLayout.length; i++) {
        if (this._layout.id !== layout.id) break;
        itemsToLayout[i]._layout.start(instant === true, tryFinish);
      }

      if (this._layout.id === layout.id) {
        itemsToLayout.length = 0;
      }

      return this;
    };
  })();

  /**
   * Show or hide Grid instance's items.
   *
   * @private
   * @memberof Grid.prototype
   * @param {GridMultiItemQuery} items
   * @param {Boolean} toVisible
   * @param {Object} [options]
   * @param {Boolean} [options.instant=false]
   * @param {(ShowCallback|HideCallback)} [options.onFinish]
   * @param {(Boolean|LayoutCallback|String)} [options.layout=true]
   */
  Grid.prototype._setItemsVisibility = function(items, toVisible, options) {
    var grid = this;
    var targetItems = this.getItems(items);
    var opts = options || {};
    var isInstant = opts.instant === true;
    var callback = opts.onFinish;
    var layout = opts.layout ? opts.layout : opts.layout === undefined;
    var counter = targetItems.length;
    var startEvent = toVisible ? EVENT_SHOW_START : EVENT_HIDE_START;
    var endEvent = toVisible ? EVENT_SHOW_END : EVENT_HIDE_END;
    var method = toVisible ? 'show' : 'hide';
    var needsLayout = false;
    var completedItems = [];
    var hiddenItems = [];
    var item;
    var i;

    // If there are no items call the callback, but don't emit any events.
    if (!counter) {
      if (isFunction(callback)) callback(targetItems);
      return;
    }

    // Emit showStart/hideStart event.
    if (this._hasListeners(startEvent)) {
      this._emit(startEvent, targetItems.slice(0));
    }

    // Show/hide items.
    for (i = 0; i < targetItems.length; i++) {
      item = targetItems[i];

      // If inactive item is shown or active item is hidden we need to do
      // layout.
      if ((toVisible && !item._isActive) || (!toVisible && item._isActive)) {
        needsLayout = true;
      }

      // If inactive item is shown we also need to do a little hack to make the
      // item not animate it's next positioning (layout).
      if (toVisible && !item._isActive) {
        item._layout._skipNextAnimation = true;
      }

      // If a hidden item is being shown we need to refresh the item's
      // dimensions.
      if (toVisible && item._visibility._isHidden) {
        hiddenItems.push(item);
      }

      // Show/hide the item.
      item._visibility[method](isInstant, function(interrupted, item) {
        // If the current item's animation was not interrupted add it to the
        // completedItems array.
        if (!interrupted) completedItems.push(item);

        // If all items have finished their animations call the callback
        // and emit showEnd/hideEnd event.
        if (--counter < 1) {
          if (isFunction(callback)) callback(completedItems.slice(0));
          if (grid._hasListeners(endEvent)) grid._emit(endEvent, completedItems.slice(0));
        }
      });
    }

    // Refresh hidden items.
    if (hiddenItems.length) this.refreshItems(hiddenItems);

    // Layout if needed.
    if (needsLayout && layout) {
      this.layout(layout === INSTANT_LAYOUT, isFunction(layout) ? layout : undefined);
    }
  };

  /**
   * Private helpers
   * ***************
   */

  /**
   * Merge default settings with user settings. The returned object is a new
   * object with merged values. The merging is a deep merge meaning that all
   * objects and arrays within the provided settings objects will be also merged
   * so that modifying the values of the settings object will have no effect on
   * the returned object.
   *
   * @param {Object} defaultSettings
   * @param {Object} [userSettings]
   * @returns {Object} Returns a new object.
   */
  function mergeSettings(defaultSettings, userSettings) {
    // Create a fresh copy of default settings.
    var settings = mergeObjects({}, defaultSettings);

    // Merge user settings to default settings.
    if (userSettings) {
      settings = mergeObjects(settings, userSettings);
    }

    // Handle visible/hidden styles manually so that the whole object is
    // overridden instead of the props.

    if (userSettings && userSettings.visibleStyles) {
      settings.visibleStyles = userSettings.visibleStyles;
    } else if (defaultSettings && defaultSettings.visibleStyles) {
      settings.visibleStyles = defaultSettings.visibleStyles;
    }

    if (userSettings && userSettings.hiddenStyles) {
      settings.hiddenStyles = userSettings.hiddenStyles;
    } else if (defaultSettings && defaultSettings.hiddenStyles) {
      settings.hiddenStyles = defaultSettings.hiddenStyles;
    }

    return settings;
  }

  /**
   * Merge two objects recursively (deep merge). The source object's properties
   * are merged to the target object.
   *
   * @param {Object} target
   *   - The target object.
   * @param {Object} source
   *   - The source object.
   * @returns {Object} Returns the target object.
   */
  function mergeObjects(target, source) {
    var sourceKeys = Object.keys(source);
    var length = sourceKeys.length;
    var isSourceObject;
    var propName;
    var i;

    for (i = 0; i < length; i++) {
      propName = sourceKeys[i];
      isSourceObject = isPlainObject(source[propName]);

      // If target and source values are both objects, merge the objects and
      // assign the merged value to the target property.
      if (isPlainObject(target[propName]) && isSourceObject) {
        target[propName] = mergeObjects(mergeObjects({}, target[propName]), source[propName]);
        continue;
      }

      // If source's value is object and target's is not let's clone the object as
      // the target's value.
      if (isSourceObject) {
        target[propName] = mergeObjects({}, source[propName]);
        continue;
      }

      // If source's value is an array let's clone the array as the target's
      // value.
      if (Array.isArray(source[propName])) {
        target[propName] = source[propName].slice(0);
        continue;
      }

      // In all other cases let's just directly assign the source's value as the
      // target's value.
      target[propName] = source[propName];
    }

    return target;
  }

  /**
   * Collect and return initial items for grid.
   *
   * @param {Grid} grid
   * @param {?(HTMLElement[]|NodeList|String)} items
   * @returns {HTMLElement[]}
   */
  function getInitialGridItems(grid, items) {
    var result = [];
    var wildCardSelector = '*';
    var i, elem;

    // If we have a selector.
    if (typeof items === STRING_TYPE) {
      for (i = 0; i < grid._element.children.length; i++) {
        elem = grid._element.children[i];
        if (items === wildCardSelector || elementMatches(elem, items)) {
          result.push(new Item(grid, elem));
        }
      }
    }
    // If we have an array of elements or a node list.
    else if (Array.isArray(items) || isNodeList(items)) {
      for (i = 0; i < items.length; i++) {
        result.push(new Item(grid, items[i]));
      }
    }

    return result;
  }

  /**
   * Bind grid's resize handler to window.
   *
   * @param {Grid} grid
   * @param {(Number|Boolean)} delay
   */
  function bindLayoutOnResize(grid, delay) {
    if (typeof delay !== NUMBER_TYPE) {
      delay = delay === true ? 0 : -1;
    }

    if (delay >= 0) {
      grid._resizeHandler = debounce(function() {
        grid.refreshItems().layout();
      }, delay);

      window.addEventListener('resize', grid._resizeHandler);
    }
  }

  /**
   * Unbind grid's resize handler from window.
   *
   * @param {Grid} grid
   */
  function unbindLayoutOnResize(grid) {
    if (grid._resizeHandler) {
      grid._resizeHandler(true);
      window.removeEventListener('resize', grid._resizeHandler);
      grid._resizeHandler = null;
    }
  }

  /**
   * Normalize style declaration object, returns a normalized (new) styles object
   * (prefixed properties and invalid properties removed).
   *
   * @param {Object} styles
   * @returns {Object}
   */
  function normalizeStyles(styles) {
    var normalized = {};
    var docElemStyle = document.documentElement.style;
    var prop, prefixedProp;

    // Normalize visible styles (prefix and remove invalid).
    for (prop in styles) {
      if (!styles[prop]) continue;
      prefixedProp = getPrefixedPropName(docElemStyle, prop);
      if (!prefixedProp) continue;
      normalized[prefixedProp] = styles[prop];
    }

    return normalized;
  }

  return Grid;

})));
