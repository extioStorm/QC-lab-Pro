/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 * Module Data Schema & Execution Math (v1.0.3)
 *
 * AI CONTEXT: See modules/registry.js for the active application
 * dependency map, navigation metadata, and cross-file contracts before
 * modifying this module.
 */
window.gmbCoreDensityModule = {
  id: "gmb_core_density",
  title: "AASHTO T 166 (Core Gmb)",
  parentModule: "Volumetric Properties",
  submodule: "AASHTO T 166 (Core Bulk Specific Gravity)",

  // Descriptive metadata used by future workflow/navigation views.
  // These relationships describe the procedure; they do not have to form
  // a strict tree.
  metadata: {
    type: "test",
    category: ["testing", "laboratory", "volumetric_properties"],
    procedure: "aashto_t166",
    tags: ["core", "bulk-specific-gravity", "gmb"],
    workflowRoles: ["laboratory", "technician"],
    requires: ["prepared_core"],
    supports: ["density_reporting", "compaction_comparison"]
  },

  // Input Definitions
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

  // Step Definitions aligned with framework-engine.js.
  // Each step now carries relationship metadata so future navigation or
  // workflow views can construct a graph from the procedure itself.
  steps: [
    {
      num: 1,
      title: "Dry Weight (A)",
      description: "Weigh the dry core in air before water immersion.",
      guidance: "Record dry core mass (A) to 0.1g after drying to constant mass at room temperature.",
      learning: "Core must be dry to constant mass (less than 0.05% weight change over 2 hours) to ensure moisture does not artificially inflate initial mass.",
      metadata: {
        sequence: 10,
        tags: ["measurement", "dry-mass"],
        requires: ["prepared_core"],
        supports: ["submerged_weight"]
      }
    },
    {
      num: 2,
      title: "Submerged Weight (C)",
      description: "Submerge sample in water bath maintained at 77°F ± 1°F.",
      guidance: "Immerse sample in 77°F ± 1°F water bath for 4 ± 1 minutes, tare scale suspension rig, and record mass (C).",
      learning: "Water bath temperature controls binder viscosity and water density during volume displacement measurement.",
      metadata: {
        sequence: 20,
        tags: ["measurement", "submerged-mass"],
        requires: ["mass_dry"],
        supports: ["ssd_weight"]
      }
    },
    {
      num: 3,
      title: "SSD Weight (B)",
      description: "Blot surface water with a damp towel and weigh immediately.",
      guidance: "Damp-dry surface water quickly with a damp towel (do not wipe water out of void spaces) and record SSD mass (B) within 15 seconds.",
      learning: "Surface water must be blotted off without pulling absorbed water out of internal core voids.",
      metadata: {
        sequence: 30,
        tags: ["measurement", "ssd-mass"],
        requires: ["mass_submerged"],
        supports: ["gmb_calculation"]
      }
    }
  ],

  // Calculation Engine returning direct array for renderResultsBar().
  compute: function(data) {
    const A = parseFloat(data.mass_dry);
    const C = parseFloat(data.mass_submerged);
    const B = parseFloat(data.mass_ssd);

    if (isNaN(A) || isNaN(B) || isNaN(C) || A <= 0 || B <= 0 || C < 0) {
      return [
        { label: "Bulk Volume (cm³)", value: "—" },
        { label: "Water Absorption (%)", value: "—" },
        { label: "Bulk Specific Gravity (Gmb)", value: "—" }
      ];
    }

    if (B < A || B <= C) {
      return [
        { label: "Bulk Volume (cm³)", value: "Invalid SSD/Submerged Mass" },
        { label: "Water Absorption (%)", value: "Invalid SSD/Submerged Mass" },
        { label: "Bulk Specific Gravity (Gmb)", value: "Invalid SSD/Submerged Mass" }
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
        value: waterAbsorptionPct.toFixed(2) + (waterAbsorptionPct > 2.0 ? " (>2.0% - Consider T 275)" : "")
      },
      {
        label: "Bulk Specific Gravity (Gmb)",
        value: gmb.toFixed(3)
      }
    ];
  }
};
