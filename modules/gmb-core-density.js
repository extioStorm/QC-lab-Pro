/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 * Includes explicit intermediate volume (B - C) and optional spec check toggle.
 */
window.gmbCoreDensityModule = {
  id: "gmb_core_density",
  title: "AASHTO T 166 (Core Gmb)",
  parentModule: "Lab Volumetrics",
  shiftOrder: 3,
  locationGroup: "Lab Volumetrics",

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
      id: "mass_ssd",
      label: "Saturated Surface-Dry Mass (B)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 1254.1",
      stepNum: 2
    },
    {
      id: "mass_water",
      label: "Submerged Mass in Water (C)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 732.6",
      stepNum: 3
    },
    {
      id: "enable_absorption_check",
      label: "Verify Water Absorption Limit (Optional Spec Check)",
      type: "text",
      placeholder: "Type 'yes' or leave blank",
      stepNum: 4
    }
  ],

  steps: [
    {
      num: 1,
      title: "Record Oven-Dry Mass (A)",
      description: "Weigh cooled core after drying to constant mass.",
      guidance: "Record dry mass A to the nearest 0.1g.",
      learning: "Dry weight establishes the core asphalt-and-aggregate baseline."
    },
    {
      num: 2,
      title: "Record SSD Mass (B)",
      description: "Immerse in 77°F water bath for 4±1 min, damp-dry with towel, and weigh.",
      guidance: "Towel-dampen quickly to remove surface water without pulling water from internal voids.",
      learning: "SSD mass includes water filling surface-connected voids."
    },
    {
      num: 3,
      title: "Record Submerged Mass (C)",
      description: "Weigh core suspended in 77°F water bath.",
      guidance: "Ensure core is fully submerged and suspended clear of the bucket walls.",
      learning: "Submerged mass establishes buoyant lift."
    },
    {
      num: 4,
      title: "Calculate Bulk Volume & Gmb",
      description: "Subtract C from B to find bulk volume D, then divide A by D.",
      guidance: "Bulk Volume (D) = B - C. Bulk Density Gmb = A / D.",
      learning: "Exposing (B - C) clearly isolates specimen bulk volume prior to density determination."
    }
  ],

  compute: function(data) {
    const A = parseFloat(data.mass_dry);
    const B = parseFloat(data.mass_ssd);
    const C = parseFloat(data.mass_water);
    const showCheck = data.enable_absorption_check && data.enable_absorption_check.trim().toLowerCase() === "yes";

    if (isNaN(A) || isNaN(B) || isNaN(C)) {
      const results = [
        { label: "Displaced Volume (B - C)", value: "Pending Inputs" },
        { label: "Bulk Specific Gravity (Gmb)", value: "Pending Inputs" }
      ];
      if (showCheck) {
        results.push({ label: "Water Absorption Spec Check", value: "Pending Inputs" });
      }
      return results;
    }

    // Intermediate Calculation (D = B - C)
    const D = B - C;

    if (D <= 0) {
      return [
        { label: "Error", value: "Invalid Inputs: SSD Mass (B) must be greater than Submerged Mass (C)" }
      ];
    }

    const gmb = A / D;
    const outputs = [
      {
        label: "Displaced Volume (B - C)",
        value: `${D.toFixed(1)} cm³`
      },
      {
        label: "Bulk Specific Gravity (Gmb)",
        value: `${gmb.toFixed(3)}`
      }
    ];

    // Only run and show spec verification if explicitly toggled on
    if (showCheck) {
      const waterAbsorbed = B - A;
      const absPercent = (waterAbsorbed / D) * 100;
      const pass = absPercent <= 2.0;
      
      outputs.push({
        label: "Water Absorption Spec Check",
        value: `${absPercent.toFixed(2)}% — ${pass ? "PASS (Valid T 166)" : "FAIL (>2.0% - Requires AASHTO T 275 Paraffin)"}`
      });
    }

    return outputs;
  }
};
