(function (root) {
  function ratingLabel(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1 || value > 10) return 'Needs review';
    return `${Number(value.toFixed(1))} / 10`;
  }
  if (typeof module === 'object' && module.exports) module.exports = ratingLabel;
  else root.ratingLabel = ratingLabel;
})(globalThis);
