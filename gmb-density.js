// =========================================================================
// MODULE: AASHTO T 166
// Bulk Specific Gravity of Compacted Asphalt (Gmb) and percent density
//
// This module now works on a PILL:
//   project[..].plant[..].mix[..].truckSample[..].pill[n]
//
// Gmm is NOT stored on the pill. It is looked up from a Rice test in the
// same truck sample (see `references` below). The pill remembers which
// Rice test it uses in pill.gmmReference.riceTestId.
//
// Changes from the original module (calculations and precisions unchanged):
//   field ids renamed to match the tree document:
//     massAirA -> dryWeight            massWaterC -> submergedWeight
//     massSsdB -> surfaceDryWeight     volumeV -> specimenVolume
//     bulkGmb -> bulkSpecificGravity   compactionPercent -> percentOfGmm
//     compactionRatioTemp -> gmbGmmRatio (kept: it is a rounding step, 5 dp)
//   `dependencies` (find "most recent") replaced by `references`
//     (use the Rice test that was chosen, never guess between several)
// =========================================================================

const GmbDensityModule = {

  meta: {
    id: "gmb-density",
    title: "AASHTO T 166 (Gmb / Percent Density)",
    shortTitle: "Gmb / T166",
    version: "3.0.0",
    description: "Bulk Specific Gravity and percent density of a compacted asphalt pill.",
    recordKind: "pill",
    prequels: ["core-obtaining-preparation"],
    sequels: ["density-reporting"]
  },

  // The Gmm comes from a Rice test in the same truck sample.
  references: [
    {
      key: "targetRiceGmm",
      label: "Rice Test Gmm",
      pointer: "gmmReference",
      provider: { kind: "riceTest", valueKey: "measuredGmm" }
    }
  ],

  fields: [
    { id: "dryWeight",           label: "A: Dry Specimen Mass in Air",  unit: "g",     type: "LOCAL" },
    { id: "submergedWeight",     label: "C: Submerged Specimen Mass",   unit: "g",     type: "LOCAL" },
    { id: "surfaceDryWeight",    label: "B: SSD Mass in Air",           unit: "g",     type: "LOCAL" },
    { id: "specimenVolume",      label: "Specimen Volume (B - C)",      unit: "cm³",   computed: true },
    { id: "bulkSpecificGravity", label: "Bulk Specific Gravity (Gmb)",  unit: "val",   computed: true },
    { id: "targetRiceGmm",       label: "Rice Test Gmm",                unit: "val",   external: true },
    { id: "gmbGmmRatio",         label: "Gmb / Gmm",                    unit: "ratio", computed: true },
    { id: "percentOfGmm",        label: "Percent Density",              unit: "%",     computed: true }
  ],

  calculations: [
    { id: "calc-volume",             op: "SUBTRACT", inputs: ["surfaceDryWeight", "submergedWeight"], outputKey: "specimenVolume",      precision: 1 },
    { id: "calc-gmb",                op: "DIVIDE",   inputs: ["dryWeight", "specimenVolume"],         outputKey: "bulkSpecificGravity", precision: 3 },
    { id: "calc-compaction-ratio",   op: "DIVIDE",   inputs: ["bulkSpecificGravity", "targetRiceGmm"], outputKey: "gmbGmmRatio",        precision: 5 },
    { id: "calc-compaction-percent", op: "MULTIPLY", inputs: ["gmbGmmRatio", 100],                    outputKey: "percentOfGmm",        precision: 1 }
  ],

  steps: [
    {
      id: "step-a",
      title: "Dry Specimen Mass in Air (A)",
      trainingText: "Record the dry specimen mass in air after the specimen has been properly prepared and cooled.",
      components: [
        { type: "instruction", text: "Weigh the prepared dry specimen in air and record mass A." },
        { type: "field-input", fieldId: "dryWeight", label: "Dry Specimen Mass in Air (A)", unit: "g" }
      ]
    },
    {
      id: "step-c",
      title: "Submerged Specimen Mass (C)",
      trainingText: "Place the specimen in the water bath and obtain the submerged mass according to the applicable procedure.",
      components: [
        { type: "instruction", text: "Completely immerse the specimen and record submerged mass C." },
        { type: "field-input", fieldId: "submergedWeight", label: "Submerged Specimen Mass (C)", unit: "g" }
      ]
    },
    {
      id: "step-b",
      title: "SSD Specimen Mass in Air (B)",
      trainingText: "Bring the specimen to the required SSD condition and obtain its mass in air.",
      components: [
        { type: "instruction", text: "Remove the specimen, prepare its surface to the required SSD condition, and record mass B." },
        { type: "field-input", fieldId: "surfaceDryWeight", label: "SSD Mass in Air (B)", unit: "g" }
      ]
    },
    {
      id: "step-volume-gmb",
      title: "Volume & Bulk Specific Gravity (Gmb)",
      trainingText: "The difference between SSD mass B and submerged mass C provides the specimen volume basis used to determine Gmb.",
      components: [
        { type: "instruction", text: "The engine preserves the intermediate calculation before determining Gmb." },
        { type: "formula", expression: "Volume = B - C" },
        { type: "value-display", fieldId: "specimenVolume", unit: "cm³" },
        { type: "formula", expression: "Gmb = A / Volume" },
        { type: "value-display", fieldId: "bulkSpecificGravity", unit: "" }
      ]
    },
    {
      id: "step-compaction",
      title: "Percent Density",
      trainingText: "Percent density compares the compacted mixture's bulk specific gravity with the applicable Rice Test Gmm.",
      components: [
        { type: "instruction", text: "The Gmm comes from a Rice test in this same truck sample. Choose which one to use if there is more than one." },
        { type: "formula", expression: "Gmb / Gmm × 100" },
        { type: "value-display", fieldId: "targetRiceGmm", unit: "" },
        { type: "value-display", fieldId: "gmbGmmRatio", unit: "" },
        { type: "value-display", fieldId: "percentOfGmm", unit: "%" }
      ]
    }
  ]
};

if (typeof registerModule === "function") {
  registerModule(GmbDensityModule);
}
