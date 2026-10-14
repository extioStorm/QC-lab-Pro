/* =========================================================================
   ENGINE: primitive arithmetic + AASHTO / ASTM E29 rounding
   Copied unchanged from the original index2.html so results stay identical.
   Production calculations should always go through EngineOps, never plain
   JavaScript operators, so rounding happens at every step.
   ========================================================================= */

const EngineOps = {
  ADD: (a, b) => a + b,
  SUBTRACT: (a, b) => a - b,
  MULTIPLY: (a, b) => a * b,
  DIVIDE: (a, b) => (b === 0 || b == null) ? null : a / b,

  // ASTM E29 / AASHTO True Round-Half-to-Even (Banker's Rounding)
  ROUND: (value, decimals = 3) => {
    if (value == null || isNaN(value)) return null;

    const factor = Math.pow(10, decimals);
    const scaled = value * factor;
    const sign = Math.sign(scaled);
    const absScaled = Math.abs(scaled);

    const integerPart = Math.floor(absScaled);
    const remainder = absScaled - integerPart;

    let rounded;

    // Check if it's a halfway case (ending in 5 at the target decimal place)
    if (Math.abs(remainder - 0.5) < 1e-9) {
      // ASTM E29 Tie-Breaker: Round to the nearest EVEN integer
      if (integerPart % 2 === 0) {
        rounded = integerPart; // It's even, round down (truncate)
      } else {
        rounded = integerPart + 1; // It's odd, round up
      }
    } else {
      // Standard mathematical rounding for non-halfway numbers
      rounded = Math.round(absScaled);
    }

    return (rounded * sign) / factor;
  }
};
