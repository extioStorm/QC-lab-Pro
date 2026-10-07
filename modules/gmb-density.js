// =========================================================================
// MODULE: AASHTO T 166
// Bulk Specific Gravity of Compacted Asphalt - Gmb
//
// Architecture:
//   Prequel  = Core Obtaining / Preparation
//   Dependency = Rice / Gmm Test from same Project
//   Sequel    = Downstream procedure consuming T166 results
//
// This module declares relationships.
// It does not search the database itself.
// =========================================================================

const GmbDensityModule = {

  meta: {
    id: "gmb-density",

    title: "AASHTO T 166 (Gmb Core Density)",

    shortTitle: "Gmb / T166",

    version: "2.0.0",

    description:
      "Bulk Specific Gravity and percent density of a compacted asphalt core.",

    // PROCEDURAL WORKFLOW
    prequels: [
      "core-obtaining-preparation"
    ],

    sequels: [
      "density-reporting"
    ]
  },


  // =========================================================================
  // DEPENDENCIES
  // =========================================================================
  //
  // This is deliberately NOT a random value lookup.
  //
  // T166 says:
  //
  // "I require Gmm from a Rice Test belonging to the same Project."
  //
  // The relationship resolver in index.html determines which Rice Test
  // supplies the value.
  // =========================================================================

  dependencies: [

    {
      id: "dependency-gmm",

      valueKey: "targetRiceGmm",

      label: "Rice Test Gmm",

      providerModuleId: "rice-test",

      relationship: "SAME_PROJECT",

      selection: "MOST_RECENT"
    }

  ],


  // =========================================================================
  // FIELD DEFINITIONS
  // =========================================================================

  fields: [

    {
      id: "massAirA",
      label: "A: Dry Specimen Mass in Air",
      unit: "g",
      type: "LOCAL"
    },

    {
      id: "massWaterC",
      label: "C: Submerged Specimen Mass",
      unit: "g",
      type: "LOCAL"
    },

    {
      id: "massSsdB",
      label: "B: SSD Mass in Air",
      unit: "g",
      type: "LOCAL"
    },

    {
      id: "volumeV",
      label: "Specimen Volume (B - C)",
      unit: "cm³",
      computed: true
    },

    {
      id: "bulkGmb",
      label: "Bulk Specific Gravity (Gmb)",
      unit: "val",
      computed: true
    },

    {
      id: "targetRiceGmm",
      label: "Rice Test Gmm",
      unit: "val",
      computed: false,
      external: true
    },

    {
      id: "compactionRatioTemp",
      label: "Gmb / Gmm",
      unit: "ratio",
      computed: true
    },

    {
      id: "compactionPercent",
      label: "Percent Density",
      unit: "%",
      computed: true
    }

  ],


  // =========================================================================
  // CALCULATION DEFINITIONS
  // =========================================================================

  calculations: [

    {
      id: "calc-volume",

      op: "SUBTRACT",

      inputs: [
        "massSsdB",
        "massWaterC"
      ],

      outputKey: "volumeV",

      precision: 1
    },


    {
      id: "calc-gmb",

      op: "DIVIDE",

      inputs: [
        "massAirA",
        "volumeV"
      ],

      outputKey: "bulkGmb",

      precision: 3
    },


    {
      id: "calc-compaction-ratio",

      op: "DIVIDE",

      inputs: [
        "bulkGmb",
        "targetRiceGmm"
      ],

      outputKey: "compactionRatioTemp",

      precision: 5
    },


    {
      id: "calc-compaction-percent",

      op: "MULTIPLY",

      inputs: [
        "compactionRatioTemp",
        100
      ],

      outputKey: "compactionPercent",

      precision: 1
    }

  ],


  // =========================================================================
  // STEP WIZARD
  // =========================================================================

  steps: [

    {
      id: "step-a",

      title: "Dry Specimen Mass in Air (A)",

      trainingText:
        "Record the dry specimen mass in air after the specimen has been properly prepared and cooled.",

      components: [

        {
          type: "instruction",

          text:
            "Weigh the prepared dry specimen in air and record mass A."
        },

        {
          type: "field-input",

          fieldId: "massAirA",

          label:
            "Dry Specimen Mass in Air (A)",

          unit: "g"
        }

      ]
    },


    {
      id: "step-c",

      title: "Submerged Specimen Mass (C)",

      trainingText:
        "Place the specimen in the water bath and obtain the submerged mass according to the applicable procedure.",

      components: [

        {
          type: "instruction",

          text:
            "Completely immerse the specimen and record submerged mass C."
        },

        {
          type: "field-input",

          fieldId: "massWaterC",

          label:
            "Submerged Specimen Mass (C)",

          unit: "g"
        }

      ]
    },


    {
      id: "step-b",

      title: "SSD Specimen Mass in Air (B)",

      trainingText:
        "Bring the specimen to the required SSD condition and obtain its mass in air.",

      components: [

        {
          type: "instruction",

          text:
            "Remove the specimen, prepare its surface to the required SSD condition, and record mass B."
        },

        {
          type: "field-input",

          fieldId: "massSsdB",

          label:
            "SSD Mass in Air (B)",

          unit: "g"
        }

      ]
    },


    {
      id: "step-volume-gmb",

      title:
        "Volume & Bulk Specific Gravity (Gmb)",

      trainingText:
        "The difference between SSD mass B and submerged mass C provides the specimen volume basis used to determine Gmb.",

      components: [

        {
          type: "instruction",

          text:
            "The engine preserves the intermediate calculation before determining Gmb."
        },

        {
          type: "formula",

          expression:
            "Volume = B - C"
        },

        {
          type: "value-display",

          fieldId: "volumeV",

          unit: "cm³"
        },

        {
          type: "formula",

          expression:
            "Gmb = A / Volume"
        },

        {
          type: "value-display",

          fieldId: "bulkGmb",

          unit: ""
        }

      ]
    },


    {
      id: "step-compaction",

      title:
        "Percent Density",

      trainingText:
        "Percent density compares the compacted mixture's bulk specific gravity with the applicable Rice Test Gmm.",

      components: [

        {
          type: "instruction",

          text:
            "The required Gmm comes from the declared Rice Test dependency for this Project."
        },

        {
          type: "formula",

          expression:
            "Gmb / Gmm × 100"
        },

        {
          type: "value-display",

          fieldId: "targetRiceGmm",

          unit: ""
        },

        {
          type: "value-display",

          fieldId: "compactionRatioTemp",

          unit: ""
        },

        {
          type: "value-display",

          fieldId: "compactionPercent",

          unit: "%"
        }

      ]
    }

  ]

};


// =========================================================================
// REGISTER MODULE
// =========================================================================

if (typeof registerModule === "function") {
  registerModule(GmbDensityModule);
}
