registerModule({
  meta: {
    id: "gmb-bulk-density",
    title: "AASHTO T 166 (Gmb Core Density)",
    category: "Volumetrics"
  },

  fields: [
    { id: "wtAir", label: "Dry Mass in Air (A)", unit: "g", computed: false },
    { id: "wtH2o", label: "Submerged Mass (C)", unit: "g", computed: false },
    { id: "ssdWt", label: "SSD Mass (B)", unit: "g", computed: false },
    { id: "volDisplacement", label: "Bulk Volume (D = B - C)", unit: "cm³", computed: true },
    { id: "blkGr", label: "Bulk Specific Gravity (Gmb)", unit: "", computed: true },
    { id: "targetRiceGmm", label: "Reference Rice (Gmm)", unit: "", computed: false },
    { id: "pctCompaction", label: "% Compaction (Gmb / Gmm * 100)", unit: "%", computed: true }
  ],

  // Sequential Math Chains (Runs via Engine Arithmetic Primitives)
  calculations: [
    {
      outputKey: "volDisplacement",
      op: "SUBTRACT",
      inputs: ["ssdWt", "wtH2o"],
      precision: 1 // AASHTO T 166: Volume rounded to 0.1 cm³
    },
    {
      outputKey: "blkGr",
      op: "DIVIDE",
      inputs: ["wtAir", "volDisplacement"],
      precision: 3 // AASHTO T 166: Gmb rounded to 0.001
    },
    {
      outputKey: "pctCompactionRatio",
      op: "DIVIDE",
      inputs: ["blkGr", "targetRiceGmm"],
      precision: 5 // Unrounded intermediate ratio
    },
    {
      outputKey: "pctCompaction",
      op: "MULTIPLY",
      inputs: ["pctCompactionRatio", "100_CONST"], // Evaluates Gmb/Gmm * 100
      precision: 1 // Compaction rounded to 0.1%
    }
  ],

  // Stacked Layout UI Steps for Interactive Mode Wizard
  steps: [
    {
      title: "Dry Mass (A)",
      trainingText: "AASHTO T 166 requires recording the dry core mass in air prior to immersion.",
      components: [
        { type: "instruction", text: "Enter the dry mass of the core sample recorded in air." },
        { type: "field-input", fieldId: "wtAir", label: "Dry Mass in Air (A) [grams]" },
        { type: "action-button", label: "Confirm & Next Step" }
      ]
    },
    {
      title: "Submerged & SSD Masses (C & B)",
      trainingText: "Immerse sample in water bath at 77°F for 4±1 min before recording submerged mass C, then blot quickly to record SSD mass B.",
      components: [
        { type: "instruction", text: "Enter the submerged weight (C) and saturated surface-dry weight (B)." },
        { type: "field-input", fieldId: "wtH2o", label: "Submerged Mass (C) [grams]" },
        { type: "field-input", fieldId: "ssdWt", label: "SSD Mass (B) [grams]" },
        { type: "action-button", label: "Calculate Displacement Volume" }
      ]
    },
    {
      title: "Verify Bulk Volume (D = B - C)",
      trainingText: "Intermediate Volume D is calculated explicitly as B - C and rounded to 0.1 cm³ per AASHTO specifications before evaluating Gmb.",
      components: [
        { type: "instruction", text: "Review the calculated displacement volume." },
        { type: "formula", expression: "Volume (D) = SSD Mass (B) - Submerged Mass (C)" },
        { type: "value-display", fieldId: "volDisplacement", unit: "cm³" },
        { type: "action-button", label: "Calculate Final Gmb & Compaction" }
      ]
    },
    {
      title: "Bulk Density & % Compaction",
      trainingText: "Percent Compaction compares the core Gmb against the project reference Rice Gmm value.",
      components: [
        { type: "instruction", text: "Final Bulk Specific Gravity (Gmb) and Mat Compaction Result:" },
        { type: "fallback-rice-input" },
        { type: "formula", expression: "Gmb = Dry Mass (A) / Volume (D)" },
        { type: "value-display", fieldId: "blkGr", unit: "Gmb" },
        { type: "value-display", fieldId: "pctCompaction", unit: "% Compaction" }
      ]
    }
  ]
});

// Register constant for multiplication math step
ActiveRecord.data["100_CONST"] = 100;
