/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 * Module Data Schema & Execution Math
 */
window.gmbCoreDensityModule = {
  id: "gmb_core_density",
  title: "AASHTO T 166 (Core Gmb)",
  standard: "AASHTO T 166 / ASTM D2726",
  
  // Input Definitions
  fields: [
    {
      id: "mass_dry",
      label: "Dry Mass in Air (A)",
      unit: "g",
      step: 0.1,
      min: 0,
      required: true
    },
    {
      id: "mass_ssd",
      label: "Saturated Surface-Dry Mass (B)",
      unit: "g",
      step: 0.1,
      min: 0,
      required: true
    },
    {
      id: "mass_submerged",
      label: "Submerged Mass in Water (C)",
      unit: "g",
      step: 0.1,
      min: 0,
      required: true
    }
  ],

  // Step-by-Step Guided Workflow
  steps: [
    {
      id: "step_dry",
      title: "Dry Weight (A)",
      fieldId: "mass_dry",
      guidance: {
        speed: "Record dry core mass (A).",
        interactive: "Weigh the core after drying to constant mass at room temperature.",
        learning: "Core must be dry to constant mass (less than 0.05% weight change over 2 hours). Record mass in grams to 0.1g."
      }
    },
    {
      id: "step_submerged",
      title: "Submerged Weight (C)",
      fieldId: "mass_submerged",
      guidance: {
        speed: "Record mass in 77°F water bath (C).",
        interactive: "Submerge sample in 77°F ± 1°F water bath for 4 ± 1 minutes, then record mass.",
        learning: "Immerse sample in water bath maintained at 25°C ± 1°C (77°F ± 2°F) for 3 to 5 minutes. Tare scale with suspension rig attached before taking reading."
      }
    },
    {
      id: "step_ssd",
      title: "SSD Weight (B)",
      fieldId: "mass_ssd",
      guidance: {
        speed: "Blot surface water and record SSD mass (B).",
        interactive: "Damp-dry the surface with a moist towel as quickly as possible, then weigh.",
        learning: "Remove from bath, quickly damp-dry surface with a damp towel (do not wipe water out of void spaces), and weigh immediately within 15 seconds."
      }
    }
  ],

  // Pure Calculation Engine
  compute: function(data) {
    const A = parseFloat(data.mass_dry);
    const B = parseFloat(data.mass_ssd);
    const C = parseFloat(data.mass_submerged);

    // Validate inputs
    if (isNaN(A) || isNaN(B) || isNaN(C) || A <= 0 || B <= 0 || C < 0) {
      return { isValid: false, results: [] };
    }

    // Physical sanity check (SSD mass must be greater than or equal to dry mass)
    if (B < A || B <= C) {
      return {
        isValid: false,
        error: "SSD mass (B) must be greater than Dry mass (A) and Submerged mass (C).",
        results: []
      };
    }

    // Core Bulk Specific Gravity Equation
    const volume = B - C;
    const gmb = A / volume;
    const waterAbsorptionPct = ((B - A) / volume) * 100;

    return {
      isValid: true,
      results: [
        {
          key: "volume",
          label: "Bulk Volume",
          value: volume.toFixed(1),
          unit: "cm³"
        },
        {
          key: "water_absorption",
          label: "Water Absorption",
          value: waterAbsorptionPct.toFixed(2),
          unit: "%",
          warning: waterAbsorptionPct > 2.0 ? "Absorption exceeds 2.0%. Consider Parafilm method (AASHTO T 275)." : null
        },
        {
          key: "gmb",
          label: "Bulk Specific Gravity (Gmb)",
          value: gmb.toFixed(3),
          unit: "",
          isPrimary: true
        }
      ]
    };
  }
};
