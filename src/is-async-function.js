module.exports = function isAsyncFunc (func) {
  const body = func.toString().trim();
  return !!(
    // ES2017 runtimes
    body.match(/^async/) ||
    // babel, async fat arrow
    body.match(/return _ref[0-9]*\.apply/) ||
    // babel, async prop function
    body.match(/{var _this[0-9]* = this;return _asyncToGenerator/) ||
    // babel, nameless anon async function
    body.match(/{var gen = fn.apply\(/)
  );
}