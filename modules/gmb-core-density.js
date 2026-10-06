/**
 * AASHTO T 166: Bulk Specific Gravity (Gmb) of Compacted Asphalt
 * Refactored for QC_MATH and Envelope Architecture
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
    workflowRoles: ["laboratory", "technician"]
  },

  fields: [
    { id: "mass_dry", dataTarget: "core.measurements", label: "Dry Mass in Air (A)", unit: "g", type: "number", stepNum: 1 },
    { id: "mass_submerged", dataTarget: "core.measurements", label: "Submerged Mass in Water (C)", unit: "g", type: "number", stepNum: 2 },
    { id: "mass_ssd", dataTarget: "core.measurements", label: "SSD Mass (B)", unit: "g", type: "number", stepNum: 3 }
  ],

  calculate: function(store) {
    const core = store.getCore();
    if (!core) return { isComplete: false, results: [] };

    // 1. Unwrap envelopes safely for calculation
    const A = store.getRawValue("core.measurements", "mass_dry");
    const C = store.getRawValue("core.measurements", "mass_submerged");
    const B = store.getRawValue("core.measurements", "mass_ssd");

    if (!A || !B || !C || A <= 0 || B <= C) {
      return { isComplete: false, results: [] };
    }

    // 2. Perform Math using QC_MATH (Centralized Rounding)
    const volume = QC_MATH.round(B - C, 'VOLUME');
    const waterAbsorptionPct = QC_MATH.round(((B - A) / volume) * 100, 'ABSORPTION');
    const gmb = QC_MATH.round(A / volume, 'GMB');

    // 3. Update Store with new Envelope Pattern
    store.setField("core.calculations", "bulkVolume", volume, this.id, 'VOLUME');
    store.setField("core.calculations", "waterAbsorptionPct", waterAbsorptionPct, this.id, 'ABSORPTION');
    store.setField("core.calculations", "gmb", gmb, this.id, 'GMB');

    // Handle GMM linkage
    const applicableGmm = store.getApplicableGmm();
    let percentGmm = null;
    if (applicableGmm && parseFloat(applicableGmm.value) > 0) {
      percentGmm = QC_MATH.round((gmb / parseFloat(applicableGmm.value)) * 100, 'PERCENT');
      store.setField("core.calculations", "percentGmm", percentGmm, this.id, 'PERCENT');
    }

    // 4. Return results as Envelopes
    return {
      isComplete: true,
      results: [
        { label: "Bulk Volume (cm³)", value: QC_MATH.envelope(volume, this.id, 'VOLUME') },
        { label: "Water Absorption (%)", value: QC_MATH.envelope(waterAbsorptionPct, this.id, 'ABSORPTION') },
        { label: "Bulk Specific Gravity (Gmb)", value: QC_MATH.envelope(gmb, this.id, 'GMB') },
        { label: "Percent of GMM", value: percentGmm ? QC_MATH.envelope(percentGmm, this.id, 'PERCENT') : "Pending" }
      ]
    };
  }
};

window.QC_LOADED_MODULES["gmb_core_density"] = window.gmbCoreDensityModule;
