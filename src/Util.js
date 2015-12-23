// module Util

exports.expImpl = function (base) {
  return function (exponent) {
    return Math.pow(base, exponent);
  }
}
