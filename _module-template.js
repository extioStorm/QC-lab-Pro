// =========================================================================
// MODULE SPECIFICATION TEMPLATE / REFERENCE SCHEMA
// 
// Use this file as a strict blueprint when creating new test modules.
// Do not invent new property keys outside of this specification unless 
// you are also updating the core engine in index.html to support them.
// =========================================================================

const ExampleModuleTemplate = {

  // -------------------------------------------------------------------------
  // 1. META CONFIGURATION
  // Defines routing identifiers, display names, and workflow sequencing.
  // -------------------------------------------------------------------------
  meta: {
    id: "unique-module-id-string",      // Must be globally unique (e.g., "rice-test")
    title: "Full Standard Title with AASHTO reference",
    shortTitle: "Short Label",           // Used for compact UI spaces/buttons
    version: "1.0.0",
    description: "Brief summary of what physical test this module models.",

    // Procedural Workflow mapping for the Workday Navigation Bar
    prequels: [
      "parent-or-prerequisite-module-id"
    ],
    sequels: [
      "downstream-consumer-module-id"
    ]
  },


  // -------------------------------------------------------------------------
  // 2. DEPENDENCIES SCHEMA
  // Declares external data required from other tests within the same project.
  // -------------------------------------------------------------------------
  dependencies: [
    {
      id: "unique-dependency-id",
      valueKey: "fieldKeyProvidedByOtherModule", // The exact outputKey of the provider
      label: "Human Readable Label of External Value",
      providerModuleId: "target-module-id",       // Who owns this data
      relationship: "SAME_PROJECT",               // Scope boundary restriction
      selection: "MOST_RECENT"                    // Selection rule ("MOST_RECENT" | "FIRST_VALID")
    }
  ],


  // -------------------------------------------------------------------------
  // 3. FIELDS SCHEMA
  // Defines every data property used within the module state.
  // -------------------------------------------------------------------------
  fields: [
    // TYPE A: Local User Input (Raw Data)
    {
      id: "localInputExample",
      label: "A: Raw Lab Measurement Label",
      unit: "g",                                  // Unit of measure (e.g., "g", "cm³", "%", "val")
      type: "LOCAL"
    },

    // TYPE B: Computed Output (Derived via calculation block)
    {
      id: "computedOutputExample",
      label: "Calculated Result Label",
      unit: "val",
      computed: true
    },

    // TYPE C: External Dependency Injection
    {
      id: "externalFieldKeyMatch",
      label: "Injected External Value Label",
      unit: "val",
      computed: false,
      external: true
    }
  ],


  // -------------------------------------------------------------------------
  // 4. CALCULATION DEFINITIONS SCHEMA
  // Engine instructions on how computed fields are automatically evaluated.
  // Supported operators: "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"
  // -------------------------------------------------------------------------
  calculations: [
    {
      id: "calc-unique-id",
      op: "DIVIDE",                               // Must match an operator in EngineOps
      inputs: [
        "localInputExample",                      // Can reference a local field ID
        "externalFieldKeyMatch",                  // Or an external/dependency field ID
        100                                       // Or pass a raw numeric constant scalar
      ],
      outputKey: "computedOutputExample",         // Must match a field ID marked computed: true
      precision: 3                                // Decimal rounding precision (AASHTO standard)
    }
  ],


  // -------------------------------------------------------------------------
  // 5. STEP WIZARD SCHEMA
  // UI Presentation layout breaking the procedure into step-by-step wizard cards.
  // 
  // SUPPORTED COMPONENT TYPES:
  //   - "instruction"   : Static text description for the technician
  //   - "field-input"   : Form field bound to a local field ID
  //   - "formula"       : Monospace display box showing math expression text
  //   - "value-display" : Live calculated value display card (clickable for missing dependency / overrides)
  //   - "action-button" : Interactive button for navigation jumps
  // -------------------------------------------------------------------------
  steps: [
    {
      id: "step-1-id",
      title: "First Step Title",
      trainingText: "Detailed explanation shown in Training Mode for educational contexts.",
      components: [
        {
          type: "instruction",
          text: "Perform action X on the physical specimen and record the result."
        },
        {
          type: "field-input",
          fieldId: "localInputExample",
          label: "Input Field Label",
          unit: "g"
        }
      ]
    },

    {
      id: "step-2-id",
      title: "Calculation & Result Step Title",
      trainingText: "Explanation of how intermediate values are processed.",
      components: [
        {
          type: "formula",
          expression: "Result = InputA - InputB"
        },
        {
          type: "value-display",
          fieldId: "computedOutputExample",
          unit: "cm³"
        }
      ]
    }
  ]

};


// =========================================================================
// GLOBAL REGISTRATION HOOK
// Do not modify this block; it safely registers the module into the runner.
// =========================================================================
if (typeof registerModule === "function") {
  registerModule(ExampleModuleTemplate);
}
