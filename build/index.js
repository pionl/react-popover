"use strict";

var _react = require("react");

var _propTypes = require("prop-types");

var _createReactClass = require("create-react-class");

var _createReactClass2 = _interopRequireDefault(_createReactClass);

var _reactDom = require("react-dom");

var _reactDom2 = _interopRequireDefault(_reactDom);

var _debug = require("debug");

var _debug2 = _interopRequireDefault(_debug);

var _lodash = require("lodash.throttle");

var _lodash2 = _interopRequireDefault(_lodash);

var _cssVendor = require("css-vendor");

var cssVendor = _interopRequireWildcard(_cssVendor);

var _onResize = require("./on-resize");

var _onResize2 = _interopRequireDefault(_onResize);

var _popover = require("./popover");

var _popover2 = _interopRequireDefault(_popover);

var _layout = require("./layout");

var _layout2 = _interopRequireDefault(_layout);

var _platform = require("./platform");

var _utils = require("./utils");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var createDomElement = function createDomElement(x) {
  return _platform.isClient ? _platform.document.createElement(x) : _utils.noop;
};

var appendElement = function appendElement(x, target) {
  return _platform.isClient ? target.appendChild(x) : _utils.noop;
};

var removeElement = function removeElement(x, target) {
  return _platform.isClient ? target.removeChild(x) : _utils.noop;
};

var log = (0, _debug2.default)("react-popover");

var jsprefix = function jsprefix(x) {
  return "" + cssVendor.prefix.js + x;
};

var cssprefix = function cssprefix(x) {
  return "" + cssVendor.prefix.css + x;
};

/* Flow mappings. Each map maps the flow domain to another domain. */

var flowToTipTranslations = {
  row: "translateY",
  column: "translateX"
};

var flowToPopoverTranslations = {
  row: "translateX",
  column: "translateY"
};

var Popover = (0, _createReactClass2.default)({
  displayName: "popover",
  propTypes: {
    body: _propTypes.PropTypes.node.isRequired,
    children: _propTypes.PropTypes.element.isRequired,
    className: _propTypes.PropTypes.string,
    enterExitTransitionDurationMs: _propTypes.PropTypes.number,
    isOpen: _propTypes.PropTypes.bool,
    offset: _propTypes.PropTypes.number,
    place: _propTypes.PropTypes.oneOf(_layout2.default.validTypeValues),
    preferPlace: _propTypes.PropTypes.oneOf(_layout2.default.validTypeValues),
    refreshIntervalMs: _propTypes.PropTypes.oneOfType([_propTypes.PropTypes.number, _propTypes.PropTypes.bool]),
    style: _propTypes.PropTypes.object,
    tipSize: _propTypes.PropTypes.number,
    onOuterAction: _propTypes.PropTypes.func
  },
  getDefaultProps: function getDefaultProps() {
    return {
      tipSize: 7,
      preferPlace: null,
      place: null,
      offset: 4,
      isOpen: false,
      onOuterAction: function noOperation() {},
      enterExitTransitionDurationMs: 500,
      children: null,
      refreshIntervalMs: 200,
      containerElement: _platform.document.body
    };
  },
  getInitialState: function getInitialState() {
    return {
      standing: "above",
      exited: !this.props.isOpen, // for animation-dependent rendering, should popover close/open?
      exiting: false, // for tracking in-progress animations
      toggle: this.props.isOpen || false };
  },
  componentWillMount: function componentWillMount() {
    /* Create a DOM node for mounting the React Layer. */
    this.layerContainerNode = createDomElement("div");
  },
  componentDidMount: function componentDidMount() {
    this.targetEl = (0, _reactDom.findDOMNode)(this);

    // Append an element and render
    appendElement(this.layerContainerNode, this.props.containerElement);
    this.renderLayer();

    if (this.props.isOpen) this.enter();
  },
  componentWillReceiveProps: function componentWillReceiveProps(propsNext) {
    //log(`Component received props!`, propsNext)
    var willOpen = !this.props.isOpen && propsNext.isOpen;
    var willClose = this.props.isOpen && !propsNext.isOpen;

    if (willOpen) this.open();else if (willClose) this.close();
  },
  componentDidUpdate: function componentDidUpdate(propsPrev, statePrev) {
    this.renderLayer();

    //log(`Component did update!`)
    var didOpen = !statePrev.toggle && this.state.toggle;
    var didClose = statePrev.toggle && !this.state.toggle;

    if (didOpen) this.enter();else if (didClose) this.exit();
  },
  componentWillUnmount: function componentWillUnmount() {
    removeElement(this.layerContainerNode, this.props.containerElement);
    /* If the Popover was never opened then then tracking
    initialization never took place and so calling untrack
    would be an error. Also see issue 55. */
    if (this.hasTracked) this.untrackPopover();
  },
  resolvePopoverLayout: function resolvePopoverLayout() {

    /* Find the optimal zone to position self. Measure the size of each zone and use the one with
    the greatest area. */

    var pickerSettings = {
      preferPlace: this.props.preferPlace,
      place: this.props.place
    };

    /* This is a kludge that solves a general problem very specifically for Popover.
    The problem is subtle. When Popover positioning changes such that it resolves at
    a different orientation, its Size will change because the Tip will toggle between
    extending Height or Width. The general problem of course is that calculating
    zone positioning based on current size is non-trivial if the Size can change once
    resolved to a different zone. Infinite recursion can be triggered as we noted here:
    https://github.com/littlebits/react-popover/issues/18. As an example of how this
    could happen in another way: Imagine the user changes the CSS styling of the popover
    based on whether it was `row` or `column` flow. TODO: Find a solution to generally
    solve this problem so that the user is free to change the Popover styles in any
    way at any time for any arbitrary trigger. There may be value in investigating the
    http://overconstrained.io community for its general layout system via the
    constraint-solver Cassowary. */
    if (this.zone) this.size[this.zone.flow === "row" ? "h" : "w"] += this.props.tipSize;
    var zone = _layout2.default.pickZone(pickerSettings, this.frameBounds, this.targetBounds, this.size);
    if (this.zone) this.size[this.zone.flow === "row" ? "h" : "w"] -= this.props.tipSize;

    var tb = this.targetBounds;
    this.zone = zone;
    log("zone", zone);

    this.setState({
      standing: zone.standing
    });

    var axis = _layout2.default.axes[zone.flow];
    log("axes", axis);

    var dockingEdgeBufferLength = Math.round(getComputedStyle(this.bodyEl).borderRadius.slice(0, -2)) || 0;
    var scrollSize = _layout2.default.El.calcScrollSize(this.frameEl);
    scrollSize.main = scrollSize[axis.main.size];
    scrollSize.cross = scrollSize[axis.cross.size];

    /* When positioning self on the cross-axis do not exceed frame bounds. The strategy to achieve
    this is thus: First position cross-axis self to the cross-axis-center of the the target. Then,
    offset self by the amount that self is past the boundaries of frame. */
    var pos = _layout2.default.calcRelPos(zone, tb, this.size);

    /* Offset allows users to control the distance betweent the tip and the target. */
    pos[axis.main.start] += this.props.offset * zone.order;

    /* Constrain containerEl Position within frameEl. Try not to penetrate a visually-pleasing buffer from
    frameEl. `frameBuffer` length is based on tipSize and its offset. */

    var frameBuffer = this.props.tipSize + this.props.offset;
    var hangingBufferLength = dockingEdgeBufferLength * 2 + this.props.tipSize * 2 + frameBuffer;
    var frameCrossStart = this.frameBounds[axis.cross.start];
    var frameCrossEnd = this.frameBounds[axis.cross.end];
    var frameCrossLength = this.frameBounds[axis.cross.size];
    var frameCrossInnerLength = frameCrossLength - frameBuffer * 2;
    var frameCrossInnerStart = frameCrossStart + frameBuffer;
    var frameCrossInnerEnd = frameCrossEnd - frameBuffer;
    var popoverCrossStart = pos[axis.cross.start];
    var popoverCrossEnd = pos[axis.cross.end];

    /* If the popover dose not fit into frameCrossLength then just position it to the `frameCrossStart`.
    popoverCrossLength` will now be forced to overflow into the `Frame` */
    if (pos.crossLength > frameCrossLength) {
      log("popoverCrossLength does not fit frame.");
      pos[axis.cross.start] = 0;

      /* If the `popoverCrossStart` is forced beyond some threshold of `targetCrossLength` then bound
      it (`popoverCrossStart`). */
    } else if (tb[axis.cross.end] < hangingBufferLength) {
      log("popoverCrossStart cannot hang any further without losing target.");
      pos[axis.cross.start] = tb[axis.cross.end] - hangingBufferLength;

      /* checking if the cross start of the target area is within the frame and it makes sense
      to try fitting popover into the frame. */
    } else if (tb[axis.cross.start] > frameCrossInnerEnd) {
      log("popoverCrossStart cannot hang any further without losing target.");
      pos[axis.cross.start] = tb[axis.cross.start] - this.size[axis.cross.size];

      /* If the `popoverCrossStart` does not fit within the inner frame (honouring buffers) then
      just center the popover in the remaining `frameCrossLength`. */
    } else if (pos.crossLength > frameCrossInnerLength) {
      log("popoverCrossLength does not fit within buffered frame.");
      pos[axis.cross.start] = (frameCrossLength - pos.crossLength) / 2;
    } else if (popoverCrossStart < frameCrossInnerStart) {
      log("popoverCrossStart cannot reverse without exceeding frame.");
      pos[axis.cross.start] = frameCrossInnerStart;
    } else if (popoverCrossEnd > frameCrossInnerEnd) {
      log("popoverCrossEnd cannot travel without exceeding frame.");
      pos[axis.cross.start] = pos[axis.cross.start] - (pos[axis.cross.end] - frameCrossInnerEnd);
    }

    /* So far the link position has been calculated relative to the target. To calculate the absolute
    position we need to factor the `Frame``s scroll position */

    pos[axis.cross.start] += scrollSize.cross;
    pos[axis.main.start] += scrollSize.main;

    /* Apply `flow` and `order` styles. This can impact subsequent measurements of height and width
    of the container. When tip changes orientation position due to changes from/to `row`/`column`
    width`/`height` will be impacted. Our layout monitoring will catch these cases and automatically
    recalculate layout. */

    this.containerEl.style.flexFlow = zone.flow;
    this.containerEl.style[jsprefix("FlexFlow")] = this.containerEl.style.flexFlow;
    this.bodyEl.style.order = zone.order;
    this.bodyEl.style[jsprefix("Order")] = this.bodyEl.style.order;

    /* Apply Absolute Positioning. */

    log("pos", pos);
    this.containerEl.style.top = pos.y + "px";
    this.containerEl.style.left = pos.x + "px";

    /* Calculate Tip Position */

    var tipCrossPos =
    /* Get the absolute tipCrossCenter. Tip is positioned relative to containerEl
    but it aims at targetCenter which is positioned relative to frameEl... we
    need to cancel the containerEl positioning so as to hit our intended position. */
    _layout2.default.centerOfBoundsFromBounds(zone.flow, "cross", tb, pos)

    /* centerOfBounds does not account for scroll so we need to manually add that
    here. */
    + scrollSize.cross

    /* Center tip relative to self. We do not have to calcualte half-of-tip-size since tip-size
    specifies the length from base to tip which is half of total length already. */
    - this.props.tipSize;

    if (tipCrossPos < dockingEdgeBufferLength) tipCrossPos = dockingEdgeBufferLength;else if (tipCrossPos > pos.crossLength - dockingEdgeBufferLength - this.props.tipSize * 2) {
      tipCrossPos = pos.crossLength - dockingEdgeBufferLength - this.props.tipSize * 2;
    }

    this.tipEl.style.transform = flowToTipTranslations[zone.flow] + "(" + tipCrossPos + "px)";
    this.tipEl.style[jsprefix("Transform")] = this.tipEl.style.transform;
  },
  checkTargetReposition: function checkTargetReposition() {
    if (this.measureTargetBounds()) this.resolvePopoverLayout();
  },
  measurePopoverSize: function measurePopoverSize() {
    this.size = _layout2.default.El.calcSize(this.containerEl);
  },
  measureTargetBounds: function measureTargetBounds() {
    var newTargetBounds = _layout2.default.El.calcBounds(this.targetEl);

    if (this.targetBounds && _layout2.default.equalCoords(this.targetBounds, newTargetBounds)) {
      return false;
    }

    this.targetBounds = newTargetBounds;
    return true;
  },
  open: function open() {
    if (this.state.exiting) this.animateExitStop();
    this.setState({ toggle: true, exited: false });
  },
  close: function close() {
    this.setState({ toggle: false });
  },
  enter: function enter() {
    if (_platform.isServer) return;
    log("enter!");

    this.waitingForEnter = true;

    // Do we have container element? Run the enter logic
    if (this.containerEl) {
      this.enterLogic();
    }
  },
  enterLogic: function enterLogic() {
    this.trackPopover();
    this.animateEnter();
    this.waitingForEnter = false;
  },
  exit: function exit() {
    log("exit!");
    this.animateExit();
    this.untrackPopover();
  },
  animateExitStop: function animateExitStop() {
    clearTimeout(this.exitingAnimationTimer1);
    clearTimeout(this.exitingAnimationTimer2);
    this.setState({ exiting: false });
  },
  animateExit: function animateExit() {
    var _this = this;

    this.setState({ exiting: true });
    this.exitingAnimationTimer2 = setTimeout(function () {
      setTimeout(function () {
        _this.containerEl.style.transform = flowToPopoverTranslations[_this.zone.flow] + "(" + _this.zone.order * 50 + "px)";
        _this.containerEl.style.opacity = "0";
      }, 0);
    }, 0);

    this.exitingAnimationTimer1 = setTimeout(function () {
      _this.setState({ exited: true, exiting: false });
    }, this.props.enterExitTransitionDurationMs);
  },
  animateEnter: function animateEnter() {
    /* Prepare `entering` style so that we can then animate it toward `entered`. */

    this.containerEl.style.transform = flowToPopoverTranslations[this.zone.flow] + "(" + this.zone.order * 50 + "px)";
    this.containerEl.style[jsprefix("Transform")] = this.containerEl.style.transform;
    this.containerEl.style.opacity = "0";

    /* After initial layout apply transition animations. */
    /* Hack: http://stackoverflow.com/questions/3485365/how-can-i-force-webkit-to-redraw-repaint-to-propagate-style-changes */
    this.containerEl.offsetHeight;

    /* If enterExitTransitionDurationMs is falsy, tip animation should be also disabled */
    if (this.props.enterExitTransitionDurationMs) {
      this.tipEl.style.transition = "transform 150ms ease-in";
      this.tipEl.style[jsprefix("Transition")] = cssprefix("transform") + " 150ms ease-in";
    }
    this.containerEl.style.transitionProperty = "top, left, opacity, transform";
    this.containerEl.style.transitionDuration = this.props.enterExitTransitionDurationMs + "ms";
    this.containerEl.style.transitionTimingFunction = "cubic-bezier(0.230, 1.000, 0.320, 1.000)";
    this.containerEl.style.opacity = "1";
    this.containerEl.style.transform = "translateY(0)";
    this.containerEl.style[jsprefix("Transform")] = this.containerEl.style.transform;
  },
  trackPopover: function trackPopover() {
    var minScrollRefreshIntervalMs = 200;
    var minResizeRefreshIntervalMs = 200;

    /* Get references to DOM elements. */
    this.bodyEl = this.containerEl.querySelector(".Popover-body");
    this.tipEl = this.containerEl.querySelector(".Popover-tip");

    /* Note: frame is hardcoded to window now but we think it will
    be a nice feature in the future to allow other frames to be used
    such as local elements that further constrain the popover`s world. */

    this.frameEl = _platform.window;
    this.hasTracked = true;

    /* Set a general interval for checking if target position changed. There is no way
    to know this information without polling. */
    if (this.props.refreshIntervalMs) {
      this.checkLayoutInterval = setInterval(this.checkTargetReposition, this.props.refreshIntervalMs);
    }

    /* Watch for boundary changes in all deps, and when one of them changes, recalculate layout.
    This layout monitoring must be bound immediately because a layout recalculation can recursively
    cause a change in boundaries. So if we did a one-time force-layout before watching boundaries
    our final position calculations could be wrong. See comments in resolver function for details
    about which parts can trigger recursive recalculation. */

    this.onFrameScroll = (0, _lodash2.default)(this.onFrameScroll, minScrollRefreshIntervalMs);
    this.onFrameResize = (0, _lodash2.default)(this.onFrameResize, minResizeRefreshIntervalMs);
    this.onPopoverResize = (0, _lodash2.default)(this.onPopoverResize, minResizeRefreshIntervalMs);
    this.onTargetResize = (0, _lodash2.default)(this.onTargetResize, minResizeRefreshIntervalMs);

    this.frameEl.addEventListener("scroll", this.onFrameScroll);
    _onResize2.default.on(this.frameEl, this.onFrameResize);
    _onResize2.default.on(this.containerEl, this.onPopoverResize);
    _onResize2.default.on(this.targetEl, this.onTargetResize);

    /* Track user actions on the page. Anything that occurs _outside_ the Popover boundaries
    should close the Popover. */

    _platform.document.addEventListener("mousedown", this.checkForOuterAction);
    _platform.document.addEventListener("touchstart", this.checkForOuterAction);

    /* Kickstart layout at first boot. */

    this.measurePopoverSize();
    this.measureFrameBounds();
    this.measureTargetBounds();
    this.resolvePopoverLayout();
  },
  checkForOuterAction: function checkForOuterAction(event) {
    var isOuterAction = !this.containerEl.contains(event.target) && !this.targetEl.contains(event.target);
    if (isOuterAction) this.props.onOuterAction(event);
  },
  untrackPopover: function untrackPopover() {
    clearInterval(this.checkLayoutInterval);
    this.frameEl.removeEventListener("scroll", this.onFrameScroll);
    _onResize2.default.off(this.frameEl, this.onFrameResize);
    _onResize2.default.off(this.containerEl, this.onPopoverResize);
    _onResize2.default.off(this.targetEl, this.onTargetResize);
    _platform.document.removeEventListener("mousedown", this.checkForOuterAction);
    _platform.document.removeEventListener("touchstart", this.checkForOuterAction);
  },
  onTargetResize: function onTargetResize() {
    log("Recalculating layout because _target_ resized!");
    this.measureTargetBounds();
    this.resolvePopoverLayout();
  },
  onPopoverResize: function onPopoverResize() {
    log("Recalculating layout because _popover_ resized!");
    this.measurePopoverSize();
    this.resolvePopoverLayout();
  },
  onFrameScroll: function onFrameScroll() {
    log("Recalculating layout because _frame_ scrolled!");
    this.measureTargetBounds();
    this.resolvePopoverLayout();
  },
  onFrameResize: function onFrameResize() {
    log("Recalculating layout because _frame_ resized!");
    this.measureFrameBounds();
    this.resolvePopoverLayout();
  },
  measureFrameBounds: function measureFrameBounds() {
    this.frameBounds = _layout2.default.El.calcBounds(this.frameEl);
  },
  renderLayer: function renderLayer() {
    var _this2 = this;

    var _props = this.props,
        _props$className = _props.className,
        className = _props$className === undefined ? "" : _props$className,
        _props$style = _props.style,
        style = _props$style === undefined ? {} : _props$style,
        tipSize = _props.tipSize,
        body = _props.body;

    return _reactDom2.default.render((0, _react.createElement)(_popover2.default, {
      className: className,
      style: style,
      tipSize: tipSize,
      body: body,
      exited: this.state.exited,
      standing: this.state.standing,
      ref: function ref(context) {
        _this2.containerEl = context ? (0, _reactDom.findDOMNode)(context) : null;

        if (_this2.waitingForEnter && context !== null) {
          _this2.enterLogic();
        }
      }
    }), this.layerContainerNode);
  },
  render: function render() {
    return this.props.children;
  }
});

// Support for CJS
// http://stackoverflow.com/questions/33505992/babel-6-changes-how-it-exports-default
module.exports = Popover;