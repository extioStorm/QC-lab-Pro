/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 * Module Data Schema & Execution Math (v1.0.4)
 */
window.gmbCoreDensityModule = {
  id: "gmb_core_density",
  title: "AASHTO T 166 (Core Gmb)",
  parentModule: "Volumetric Properties",
  submodule: "AASHTO T 166 (Core Bulk Specific Gravity)",

  metadata: {
    type: "test",
    category: ["testing", "laboratory", "volumetric_properties"],
    procedure: "aashto_t166",
    tags: ["core", "bulk-specific-gravity", "gmb"],
    workflowRoles: ["laboratory", "technician"],
    requires: ["prepared_core"],
    supports: ["density_reporting", "compaction_comparison"]
  },

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

  steps: [
    {
      num: 1,
      title: "Dry Weight (A)",
      description: "Weigh the dry core in air before water immersion.",
      guidance: "Record dry core mass (A) to 0.1g after drying to constant mass at room temperature.",
      learning: "Core must be dry to constant mass (<0.05% weight change over 2 hrs) to ensure moisture doesn't inflate initial mass.",
      fieldId: "mass_dry"
    },
    {
      num: 2,
      title: "Submerged Weight (C)",
      description: "Submerge sample in water bath maintained at 77°F ± 1°F.",
      guidance: "Immerse sample in 77°F ± 1°F water bath for 4 ± 1 minutes, tare scale suspension rig, and record mass (C).",
      learning: "Water bath temperature controls binder viscosity and water density during volume displacement measurement.",
      fieldId: "mass_submerged"
    },
    {
      num: 3,
      title: "SSD Weight (B)",
      description: "Blot surface water with a damp towel and weigh immediately.",
      guidance: "Damp-dry surface water quickly with a damp towel and record SSD mass (B) within 15 seconds.",
      learning: "Surface water must be blotted off without pulling absorbed water out of internal core voids.",
      fieldId: "mass_ssd"
    },
    {
      num: 4,
      title: "Volumetric Breakdown & Gmb Computation",
      description: "Calculate volume displacement (B - C) and specific gravity (A / Volume).",
      guidance: "Review the step-by-step arithmetic below to verify raw weights before committing to ground truth.",
      learning: "Bulk volume is measured by water displacement: Volume = SSD Mass (B) - Submerged Mass (C)."
    }
  ],

  compute: function(data) {
    const A = parseFloat(data.mass_dry);
    const C = parseFloat(data.mass_submerged);
    const B = parseFloat(data.mass_ssd);

    if (isNaN(A) || isNaN(B) || isNaN(C) || A <= 0 || B <= 0 || C < 0) {
      return {
        isComplete: false,
        results: [
          { label: "Bulk Volume (cm³)", value: "—" },
          { label: "Water Absorption (%)", value: "—" },
          { label: "Bulk Specific Gravity (Gmb)", value: "—" }
        ],
        stepMath: []
      };
    }

    if (B < A || B <= C) {
      return {
        isComplete: false,
        error: "Invalid SSD/Submerged mass sequence (B must be ≥ A and > C).",
        results: [
          { label: "Bulk Volume (cm³)", value: "Invalid Inputs" },
          { label: "Water Absorption (%)", value: "Invalid Inputs" },
          { label: "Bulk Specific Gravity (Gmb)", value: "Invalid Inputs" }
        ],
        stepMath: []
      };
    }

    const volume = B - C;
    const gmb = A / volume;
    const waterAbsorptionPct = ((B - A) / volume) * 100;

    return {
      isComplete: true,
      results: [
        { label: "Bulk Volume (cm³)", value: volume.toFixed(1) },
        { label: "Water Absorption (%)", value: waterAbsorptionPct.toFixed(2) + (waterAbsorptionPct > 2.0 ? " (>2.0% - Consider T 275)" : "") },
        { label: "Bulk Specific Gravity (Gmb)", value: gmb.toFixed(3) }
      ],
      // Explicit breakdown for Interactive whiteboard rendering
      stepMath: [
        {
          stepName: "1. Calculate Bulk Volume (cm³)",
          formula: "Volume = SSD Mass (B) - Submerged Mass (C)",
          calculation: `${B.toFixed(1)} g - ${C.toFixed(1)} g`,
          result: `${volume.toFixed(1)} cm³`
        },
        {
          stepName: "2. Calculate Water Absorption (%)",
          formula: "Abs % = [(SSD Mass (B) - Dry Mass (A)) / Volume] × 100",
          calculation: `[(${B.toFixed(1)} - ${A.toFixed(1)}) / ${volume.toFixed(1)}] × 100`,
          result: `${waterAbsorptionPct.toFixed(2)}%`
        },
        {
          stepName: "3. Calculate Bulk Specific Gravity (Gmb)",
          formula: "Gmb = Dry Mass (A) / Bulk Volume",
          calculation: `${A.toFixed(1)} g / ${volume.toFixed(1)} cm³`,
          result: gmb.toFixed(3)
        }
      ]
    };
  }
};

window.QC_LOADED_MODULES = window.QC_LOADED_MODULES || {};
window.QC_LOADED_MODULES["gmb_core_density"] = window.gmbCoreDensityModule;
