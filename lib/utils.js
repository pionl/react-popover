import { isClient } from "./platform"
import * as cssVendor from "css-vendor"


const arrayify = (x) => (
  Array.isArray(x) ? x : [x]
)

const find = (f, xs) => (
  xs.reduce(((b, x) => b ? b : f(x) ? x : null), null)
)

const equalRecords = (o1, o2) => {
  for (const key in o1) if (o1[key] !== o2[key]) return false
  return true
}

const noop = () => (
  undefined
)

const clientOnly = (f) => (
  isClient ? f : noop
)
const jsprefix = (x) => (
  `${cssVendor.prefix.js}${x}`
)

const cssprefix = (x) => (
  `${cssVendor.prefix.css}${x}`
)


export default {
  arrayify,
  find,
  equalRecords,
  noop,
  clientOnly,
  jsprefix,
  cssprefix
}
export {
  arrayify,
  find,
  equalRecords,
  noop,
  clientOnly,
  jsprefix,
  cssprefix
}
