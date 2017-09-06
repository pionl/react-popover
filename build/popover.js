"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require("react");

var _createReactClass = require("create-react-class");

var _createReactClass2 = _interopRequireDefault(_createReactClass);

var _cssVendor = require("css-vendor");

var cssVendor = _interopRequireWildcard(_cssVendor);

var _tip = require("./tip");

var _tip2 = _interopRequireDefault(_tip);

var _utils = require("./utils");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var supportedCSSValue = (0, _utils.clientOnly)(cssVendor.supportedValue);

var cssvalue = function cssvalue(prop, value) {
  return supportedCSSValue(prop, value) || cssprefix(value);
};

var coreStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  display: cssvalue("display", "flex")
};

var faces = {
  above: "down",
  right: "left",
  below: "up",
  left: "right"
};

var PopoverContent = (0, _createReactClass2.default)({
  displayName: "popover",
  render: function render() {
    var _props = this.props,
        _props$className = _props.className,
        className = _props$className === undefined ? "" : _props$className,
        _props$style = _props.style,
        style = _props$style === undefined ? {} : _props$style,
        body = _props.body,
        tipSize = _props.tipSize,
        standing = _props.standing,
        exited = _props.exited;


    if (exited === true) {
      return null;
    }

    var popoverProps = {
      className: "Popover " + className,
      style: _extends({}, coreStyle, style)
    };

    var tipProps = {
      direction: faces[standing],
      size: tipSize
    };

    /* If we pass array of nodes to component children React will complain that each
    item should have a key prop. This is not a valid requirement in our case. Users
    should be able to give an array of elements applied as if they were just normal
    children of the body component (note solution is to spread array items as args). */

    var popoverBody = (0, _utils.arrayify)(body);

    return _react.DOM.div(popoverProps, _react.DOM.div.apply(_react.DOM, [{ className: "Popover-body" }].concat(_toConsumableArray(popoverBody))), (0, _react.createElement)(_tip2.default, tipProps));
  }
});

exports.default = PopoverContent;