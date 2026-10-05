/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 * Aligned with QC Lab Framework Engine (v1.0.0)
 */
window.gmbCoreDensityModule = {
  id: "gmb_core_density",
  title: "AASHTO T 166 (Core Gmb)",
  parentModule: "Volumetric Properties",
  submodule: "AASHTO T 166 (Core Bulk Specific Gravity)",
  
  // Input Definitions mapped to step numbers (stepNum)
  fields: [
    {
      id: "mass_dry",
      label: "Dry Mass in Air (A)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 1250.4",
      stepNum: 1
    },
    {
      id: "mass_submerged",
      label: "Submerged Mass in Water (C)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 732.1",
      stepNum: 2
    },
    {
      id: "mass_ssd",
      label: "Saturated Surface-Dry Mass (B)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 1253.8",
      stepNum: 3
    }
  ],

  // Step Definitions matching engine property names (num, title, description, guidance, learning)
  steps: [
    {
      num: 1,
      title: "Dry Weight (A)",
      description: "Weigh the dry core in air before water immersion.",
      guidance: "Record dry mass (A) to 0.1g after core reaches constant mass at room temperature.",
      learning: "Core must be dry to constant mass (less than 0.05% weight change over 2 hours) to ensure moisture does not artificially inflate initial mass."
    },
    {
      num: 2,
      title: "Submerged Weight (C)",
      description: "Submerge sample in water bath maintained at 77°F ± 1°F.",
      guidance: "Immerse sample in 77°F water bath for 4 ± 1 minutes, tare suspension rig, and record mass (C).",
      learning: "Water bath temperature controls binder viscosity and water density during volume displacement measurement."
    },
    {
      num: 3,
      title: "SSD Weight (B)",
      description: "Blot surface water with a damp towel and weigh immediately.",
      guidance: "Damp-dry surface water quickly with a damp towel and record SSD mass (B) within 15 seconds.",
      learning: "Surface water must be blotted off without pulling absorbed water out of internal core voids."
    }
  ],

  // Calculation Engine returning a direct array expected by renderResultsBar()
  compute: function(data) {
    const A = parseFloat(data.mass_dry);
    const C = parseFloat(data.mass_submerged);
    const B = parseFloat(data.mass_ssd);

    // Default response if incomplete
    if (isNaN(A) || isNaN(B) || isNaN(C) || A <= 0 || B <= 0 || C < 0) {
      return [
        { label: "Bulk Volume (cm³)", value: "—" },
        { label: "Water Absorption (%)", value: "—" },
        { label: "Bulk Specific Gravity (Gmb)", value: "—" }
      ];
    }

    // Physical check
    if (B < A || B <= C) {
      return [
        { label: "Bulk Volume (cm³)", value: "Invalid SSD Mass" },
        { label: "Water Absorption (%)", value: "Invalid SSD Mass" },
        { label: "Bulk Specific Gravity (Gmb)", value: "Invalid SSD Mass" }
      ];
    }

    const volume = B - C;
    const gmb = A / volume;
    const waterAbsorptionPct = ((B - A) / volume) * 100;

    return [
      {
        label: "Bulk Volume (cm³)",
        value: volume.toFixed(1)
      },
      {
        label: "Water Absorption (%)",
        value: waterAbsorptionPct.toFixed(2) + (waterAbsorptionPct > 2.0 ? " (Exceeds 2.0%)" : "")
      },
      {
        label: "Bulk Specific Gravity (Gmb)",
        value: gmb.toFixed(3)
      }
    ];
  }
};
