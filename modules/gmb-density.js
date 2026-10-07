// =========================================================================
// MODULE: AASHTO T 166 (Bulk Specific Gravity of Compacted Asphalt - Gmb)
// Reordered: A (Dry) -> C (Submerged) -> B (SSD)
// Declarative Dependency Structure: LOCAL vs EXTERNAL Inputs
// =========================================================================

const GmbDensityModule = {
  meta: {
    id: "gmb-density",
    title: "AASHTO T 166 (Gmb Core Density)",
    version: "1.2.0",
    description: "Bulk Specific Gravity and % Compaction of compacted asphalt cores using SSD method."
  },

  // 1. FIELD DEFINITIONS WITH EXPLICIT DEPENDENCY CONTRACTS
  fields: [
    { id: 'massAirA', label: 'A: Dry Specimen Mass in Air', unit: 'g', type: 'LOCAL' },
    { id: 'massWaterC', label: 'C: Submerged Specimen Mass', unit: 'g', type: 'LOCAL' },
    { id: 'massSsdB', label: 'B: SSD Mass in Air', unit: 'g', type: 'LOCAL' },
    { id: 'volumeV', label: 'Specimen Volume (B - C)', unit: 'cm³', computed: true },
    { id: 'bulkGmb', label: 'Bulk Specific Gravity (Gmb)', unit: 'val', computed: true },
    { id: 'targetRiceGmm', label: 'Target Max Gravity (Gmm)', unit: 'val', type: 'EXTERNAL', providerModuleId: 'gmm-density' },
    { id: 'compactionPercent', label: 'Compaction Degree (% Gmm)', unit: '%', computed: true }
  ],

  // 2. CALCULATION RULES
  calculations: [
    {
      id: "calc-volume",
      op: "SUBTRACT",
      inputs: ["massSsdB", "massWaterC"],
      outputKey: "volumeV",
      precision: 1
    },
    {
      id: "calc-gmb",
      op: "DIVIDE",
      inputs: ["massAirA", "volumeV"],
      outputKey: "bulkGmb",
      precision: 3
    },
    {
      id: "calc-compaction-ratio",
      op: "DIVIDE",
      inputs: ["bulkGmb", "targetRiceGmm"],
      outputKey: "compactionRatioTemp",
      precision: 5
    },
    {
      id: "calc-compaction-percent",
      op: "MULTIPLY",
      inputs: ["compactionRatioTemp", 100],
      outputKey: "compactionPercent",
      precision: 1
    }
  ],

  // 3. STEP WIZARD DEFINITIONS
  steps: [
    {
      id: "step-a",
      title: "Dry Specimen Mass in Air (A)",
      trainingText: "AASHTO T 166 Section 6.1: Core must be thoroughly dried in an oven at 125 ± 5°F (52 ± 3°C) to constant mass before recording mass A.",
      components: [
        { type: "instruction", text: "Weigh the dry specimen in air after cooling to room temperature." },
        { type: "field-input", fieldId: "massAirA", label: "Dry Specimen Mass in Air (A)", unit: "g" }
      ]
    },
    {
      id: "step-c",
      title: "Submerged Specimen Mass (C)",
      trainingText: "AASHTO T 166 Section 6.2: Immerse sample in water bath maintained at 77 ± 1°F (25 ± 0.5°C) for 3 to 5 minutes before recording submerged mass C.",
      components: [
        { type: "instruction", text: "Submerge sample completely in the 77°F water bath and record submerged mass." },
        { type: "field-input", fieldId: "massWaterC", label: "Submerged Specimen Mass (C)", unit: "g" }
      ]
    },
    {
      id: "step-b",
      title: "SSD Specimen Mass in Air (B)",
      trainingText: "AASHTO T 166 Section 6.3: Surface-dry the specimen by blotting quickly with a damp towel. Do not shake or wipe excess water aggressively.",
      components: [
        { type: "instruction", text: "Remove sample from water, blot surface-dry with damp towel, and quickly record mass B." },
        { type: "field-input", fieldId: "massSsdB", label: "SSD Mass in Air (B)", unit: "g" }
      ]
    },
    {
      id: "step-volume-gmb",
      title: "Volume & Bulk Specific Gravity (Gmb)",
      trainingText: "Volume V = B - C. Gmb = A / V. If absorbed water exceeds 2.0% by volume, AASHTO T 275 (Paraffin wax) or AASHTO T 331 (Vacuum seal) must be used.",
      components: [
        { type: "instruction", text: "Calculated specimen volume and Bulk Specific Gravity (Gmb):" },
        { type: "formula", expression: "Volume (cm³) = B - C" },
        { type: "value-display", fieldId: "volumeV", unit: "cm³" },
        { type: "formula", expression: "Gmb = A / (B - C)" },
        { type: "value-display", fieldId: "bulkGmb", unit: "" }
      ]
    },
    {
      id: "step-compaction",
      title: "% Compaction Degree",
      trainingText: "% Compaction = (Gmb / Gmm) * 100. Target field compaction usually falls between 92.0% and 97.0% depending on state DOT specs.",
      components: [
        { type: "instruction", text: "Specify Maximum Theoretical Gravity (Gmm) reference value:" },
        { type: "formula", expression: "% Compaction = (Gmb / Target Gmm) × 100" },
        { type: "value-display", fieldId: "compactionPercent", unit: "%" }
      ]
    }
  ]
};

// Register module automatically upon loading script
if (typeof registerModule === 'function') {
  registerModule(GmbDensityModule);
}
