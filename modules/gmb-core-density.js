/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 *
 * This module describes the procedure.
 *
 * IMPORTANT ARCHITECTURE:
 *   - Measurements live in QC_DATA under the current Core.
 *   - Calculated/intermediate values are written back to that same Core.
 *   - GMM does not belong to the Core. The Core references the Rice/GMM
 *     test that applies to it.
 *
 * The module is therefore a procedure acting on shared records, not a
 * container holding its own private formData.
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
      dataTarget: "core.measurements",
      label: "Dry Mass in Air (A)",
      interactiveLabel: "Dry Weight in Air (A)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 1250.4",
      stepNum: 1
    },
    {
      id: "mass_submerged",
      dataTarget: "core.measurements",
      label: "Submerged Mass in Water (C)",
      interactiveLabel: "Submerged Weight in Water (C)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 732.1",
      stepNum: 2
    },
    {
      id: "mass_ssd",
      dataTarget: "core.measurements",
      label: "SSD Mass (B)",
      interactiveLabel: "Saturated Surface-Dry Weight (B)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 1253.8",
      stepNum: 3
    }
  ],

  steps: [
    {
      num: 1,
      title: "Enter the Dry Weight (A)",
      description: "Enter the weight of the completely dry core while it is weighed in air.",
      guidance: "This is the first measured value used by the calculation.",
      learning: "The dry weight is the starting mass for calculating the core’s bulk specific gravity.",
      fieldId: "mass_dry"
    },
    {
      num: 2,
      title: "Enter the Submerged Weight (C)",
      description: "Enter the weight of the core while it is submerged in water.",
      guidance: "This is the second measured value used to determine the core’s bulk volume.",
      learning: "The submerged measurement tells us how much water the specimen displaces.",
      fieldId: "mass_submerged"
    },
    {
      num: 3,
      title: "Enter the Saturated Surface-Dry Weight (B)",
      description: "Remove surface water without removing water held inside the specimen, then enter that weight.",
      guidance: "Interactive mode spells out the term so the operator does not have to know the abbreviation SSD.",
      learning: "This measurement is the surface-dry mass used with the submerged mass to determine bulk volume.",
      fieldId: "mass_ssd"
    },
    {
      num: 4,
      title: "Calculate the Bulk Volume",
      description: "Subtract the submerged weight from the saturated surface-dry weight.",
      guidance: "Watch the two entered measurements propagate directly into the subtraction.",
      learning: "The difference gives the measured bulk volume of the core."
    },
    {
      num: 5,
      title: "Calculate Bulk Specific Gravity (Gmb)",
      description: "Divide the dry weight by the bulk volume we just calculated.",
      guidance: "The bulk-volume result from the previous step is carried directly into this calculation.",
      learning: "This produces the core’s bulk specific gravity, commonly called Gmb."
    },
    {
      num: 6,
      title: "Calculate Water Absorption",
      description: "Use the saturated surface-dry weight, dry weight, and the same calculated bulk volume to determine water absorption.",
      guidance: "The previously calculated bulk volume is reused here rather than recalculated separately.",
      learning: "This is a separate reported property and does not replace the Gmb calculation."
    },
    {
      num: 7,
      title: "Compare Gmb to the Applicable GMM",
      description: "If an applicable Rice/GMM result is linked, divide Gmb by GMM and multiply by 100.",
      guidance: "The Gmb produced in Step 5 is the value propagated into this final comparison.",
      learning: "This produces the core’s percent of maximum theoretical specific gravity."
    }
  ],
  /**
   * Perform the procedure's explicit calculation.
   *
   * This does NOT return a temporary spreadsheet.
   * It reads the current Core's measurements and writes the named
   * intermediate/final values back into the Core's calculations/results.
   */
  calculate: function(store) {
    const core = store.getCore();

    if (!core) {
      return {
        isComplete: false,
        results: []
      };
    }

    const A = parseFloat(core.measurements.mass_dry);
    const C = parseFloat(core.measurements.mass_submerged);
    const B = parseFloat(core.measurements.mass_ssd);

    if (isNaN(A) || isNaN(B) || isNaN(C) || A <= 0 || B <= 0 || C < 0) {
      return {
        isComplete: false,
        results: [
          { label: "Bulk Volume (cm³)", value: "—" },
          { label: "Water Absorption (%)", value: "—" },
          { label: "Bulk Specific Gravity (Gmb)", value: "—" },
          { label: "Percent of GMM", value: "—" }
        ]
      };
    }

    if (B < A || B <= C) {
      return {
        isComplete: false,
        error: "Invalid mass relationship: SSD mass (B) must be ≥ dry mass (A) and > submerged mass (C).",
        results: []
      };
    }

    // Explicit intermediate variables become persistent Core data.
    const volume = B - C;
    const waterAbsorptionPct = ((B - A) / volume) * 100;
    const gmb = A / volume;

    core.calculations.bulkVolume = volume;
    core.calculations.waterAbsorptionPct = waterAbsorptionPct;
    core.calculations.gmb = gmb;

    const applicableGmm = store.getApplicableGmm();
    let percentGmm = null;

    if (applicableGmm && parseFloat(applicableGmm.value) > 0) {
      percentGmm = (gmb / parseFloat(applicableGmm.value)) * 100;
      core.calculations.percentGmm = percentGmm;
    } else {
      delete core.calculations.percentGmm;
    }

    // Results are the values the procedure makes available to the rest of the application.
    core.results.gmb = gmb;
    core.results.percentGmm = percentGmm;

    store.save();

    return {
      isComplete: true,
      results: [
        { label: "Bulk Volume (cm³)", value: volume.toFixed(1) },
        {
          label: "Water Absorption (%)",
          value: waterAbsorptionPct.toFixed(2) +
            (waterAbsorptionPct > 2.0 ? " (>2.0% - Consider T 275)" : "")
        },
        { label: "Bulk Specific Gravity (Gmb)", value: gmb.toFixed(3) },
        {
          label: "Percent of GMM",
          value: percentGmm === null ? "No GMM linked" : percentGmm.toFixed(2) + "%",
          numericValue: percentGmm
        }
      ],
      stepMath: [
        {
          workflowStep: 4,
          stepName: "Step 4 — Calculate Bulk Volume",
          formula: "Bulk Volume = Saturated Surface-Dry Weight (B) − Submerged Weight (C)",
          calculation: `${B.toFixed(1)} g − ${C.toFixed(1)} g`,
          result: `${volume.toFixed(1)} cm³`,
          explanation: "The two measured weights are now combined to produce the bulk volume that the next calculations will use."
        },
        {
          workflowStep: 5,
          stepName: "Step 5 — Calculate Bulk Specific Gravity (Gmb)",
          formula: "Gmb = Dry Weight (A) ÷ Bulk Volume",
          calculation: `${A.toFixed(1)} g ÷ ${volume.toFixed(1)} cm³`,
          result: gmb.toFixed(3),
          explanation: "The bulk-volume result from Step 4 is propagated directly into this division. We are not starting over or re-entering it."
        },
        {
          workflowStep: 6,
          stepName: "Step 6 — Calculate Water Absorption",
          formula: "Water Absorption = [(Saturated Surface-Dry Weight (B) − Dry Weight (A)) ÷ Bulk Volume] × 100",
          calculation: `[(${B.toFixed(1)} − ${A.toFixed(1)}) ÷ ${volume.toFixed(1)}] × 100`,
          result: `${waterAbsorptionPct.toFixed(2)}%`,
          explanation: "The same bulk-volume result is reused here with the difference between the saturated surface-dry and dry weights."
        },
        {
          workflowStep: 7,
          stepName: "Step 7 — Compare Gmb to the Applicable GMM",
          formula: "Percent of GMM = Gmb ÷ GMM × 100",
          calculation: applicableGmm
            ? `${gmb.toFixed(3)} ÷ ${parseFloat(applicableGmm.value).toFixed(3)} × 100`
            : "No applicable GMM is linked to this Core yet.",
          result: percentGmm === null ? "Pending GMM" : percentGmm.toFixed(2) + "%",
          explanation: applicableGmm
            ? "The Gmb from Step 5 is propagated into the final comparison."
            : "The calculation is ready, but the applicable GMM value has not been linked yet."
        }
      ]
    };
  }
};

window.QC_LOADED_MODULES = window.QC_LOADED_MODULES || {};
window.QC_LOADED_MODULES["gmb_core_density"] = window.gmbCoreDensityModule;
