import { createElement, DOM as E } from "react"
import createReactClass from "create-react-class"
import * as cssVendor from "css-vendor"
import Tip from "./tip"
import { arrayify } from "./utils"
import { clientOnly, noop } from "./utils"

const supportedCSSValue = clientOnly(cssVendor.supportedValue)

const cssvalue = (prop, value) => (
  supportedCSSValue(prop, value) || cssprefix(value)
)

const coreStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  display: cssvalue("display", "flex"),
}

const faces = {
  above: "down",
  right: "left",
  below: "up",
  left: "right",
}

const PopoverContent = createReactClass({
  displayName: "popover",
  render () {
    const { className = "", style = {}, body, tipSize, standing, exited} = this.props

    if (exited === true) {
      return null
    }

    const popoverProps = {
      className: `Popover ${className}`,
      style: { ...coreStyle, ...style }
    }

    const tipProps = {
      direction: faces[standing],
      size: tipSize,
    }

    /* If we pass array of nodes to component children React will complain that each
    item should have a key prop. This is not a valid requirement in our case. Users
    should be able to give an array of elements applied as if they were just normal
    children of the body component (note solution is to spread array items as args). */

    const popoverBody = arrayify(body)

    return (
      E.div(popoverProps,
        E.div({ className: "Popover-body" }, ...popoverBody),
        createElement(Tip, tipProps)
      )
    )
  },
})


export {
  PopoverContent as default,
}
