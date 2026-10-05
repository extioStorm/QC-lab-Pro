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
      unit: "g",
      type: "number",
      placeholder: "e.g. 1250.4",
      stepNum: 1
    },
    {
      id: "mass_submerged",
      dataTarget: "core.measurements",
      label: "Submerged Mass in Water (C)",
      unit: "g",
      type: "number",
      placeholder: "e.g. 732.1",
      stepNum: 2
    },
    {
      id: "mass_ssd",
      dataTarget: "core.measurements",
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
      learning: "Core must be dry to constant mass so moisture does not inflate the initial mass.",
      fieldId: "mass_dry"
    },
    {
      num: 2,
      title: "Submerged Weight (C)",
      description: "Submerge sample in the controlled water bath and record its submerged mass.",
      guidance: "Immerse the sample and record mass (C) according to the applicable procedure.",
      learning: "Water displacement provides the basis for the measured bulk volume.",
      fieldId: "mass_submerged"
    },
    {
      num: 3,
      title: "SSD Weight (B)",
      description: "Blot surface water and weigh the specimen immediately.",
      guidance: "Record SSD mass (B) promptly after surface drying.",
      learning: "Surface water is removed without removing absorbed water from the specimen voids.",
      fieldId: "mass_ssd"
    },
    {
      num: 4,
      title: "Volumetric Breakdown & Gmb",
      description: "Use the stored measurements to create explicit intermediate values and the final Gmb.",
      guidance: "Review the arithmetic before attaching the calculated values to the official record.",
      learning: "The intermediate values remain part of the Core record and can be reused by later tests."
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
          stepName: "1. Calculate Bulk Volume",
          formula: "Volume = SSD Mass (B) - Submerged Mass (C)",
          calculation: `${B.toFixed(1)} g - ${C.toFixed(1)} g`,
          result: `${volume.toFixed(1)} cm³`
        },
        {
          stepName: "2. Calculate Water Absorption",
          formula: "Abs % = [(SSD Mass (B) - Dry Mass (A)) / Volume] × 100",
          calculation: `[(${B.toFixed(1)} - ${A.toFixed(1)}) / ${volume.toFixed(1)}] × 100`,
          result: `${waterAbsorptionPct.toFixed(2)}%`
        },
        {
          stepName: "3. Calculate Bulk Specific Gravity (Gmb)",
          formula: "Gmb = Dry Mass (A) / Bulk Volume",
          calculation: `${A.toFixed(1)} g / ${volume.toFixed(1)} cm³`,
          result: gmb.toFixed(3)
        },
        {
          stepName: "4. Compare Gmb to the Applicable GMM",
          formula: "%GMM = Gmb / GMM × 100",
          calculation: applicableGmm
            ? `${gmb.toFixed(3)} / ${parseFloat(applicableGmm.value).toFixed(3)} × 100`
            : "No applicable GMM test has been linked to this Core",
          result: percentGmm === null ? "Pending GMM" : percentGmm.toFixed(2) + "%"
        }
      ]
    };
  }
};

window.QC_LOADED_MODULES = window.QC_LOADED_MODULES || {};
window.QC_LOADED_MODULES["gmb_core_density"] = window.gmbCoreDensityModule;
