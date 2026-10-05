/**
 * AASHTO R 11 / ASTM E29 Compliant Rounding Function
 * Implements "Round Half to Even" (Banker's Rounding).
 * 
 * @param {number} value - Raw calculated floating-point number
 * @param {number} decimals - Precision places required by specification
 * @returns {number} Rounded result
 */
function roundAASHTO(value, decimals = 0) {
  if (isNaN(value) || !isFinite(value)) return value;
  
  const factor = Math.pow(10, decimals);
  const n = value * factor;
  const i = Math.floor(n);
  const f = n - i;
  const e = 1e-8; // Precision tolerance for floating-point arithmetic

  let rounded;
  if (f > 0.5 + e) {
    rounded = i + 1;
  } else if (f < 0.5 - e) {
    rounded = i;
  } else {
    // Exact midpoint: round to nearest even integer
    rounded = (i % 2 === 0) ? i : i + 1;
  }

  return rounded / factor;
}

// Attach globally for module access
window.roundAASHTO = roundAASHTO;
