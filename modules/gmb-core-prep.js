/**
 * Field Core Extraction & Prep
 * Prequel Module for AASHTO T 166 (Core Gmb)
 *
 * AI CONTEXT: See modules/registry.js for application architecture
 * and cross-file contracts.
 */
// This module represents the field-side work that happens before the laboratory T 166 test.
// It stores the location/thickness measurements and exposes a simple readiness result.
window.gmbCorePrepModule = {
  id: "gmb_core_prep",
  title: "Field Core Drilling & Prep",
  parentModule: "Field Sampling",
  submodule: "Core Drilling & Thickness",

  // Workflow relationships & exported data keys
  workflow: {
    prequels: [],
    sequels: ["gmb_core_density"],
    chronologicalOrder: 10
  },

  // Metadata describing exported values available to downstream modules
  dataExports: [
    { key: "core_thickness", label: "Core Thickness (in)" },
    { key: "station_location", label: "Station Location" }
  ],

  // Module Navigation & Reference Tags
  metadata: {
    type: "prep",
    category: ["field", "sampling"],
    procedure: "core_prep",
    tags: ["drilling", "thickness", "field"],
    workflowRoles: ["field_tech"]
  },

  // Raw Input Measurements
  // Raw field measurements entered by the technician.
  fields: [
    {
      id: "station_location",
      label: "Station / Location",
      unit: "",
      type: "text",
      placeholder: "e.g. Sta 104+50 Line A",
      stepNum: 1
    },
    {
      id: "core_thickness",
      label: "Average Core Thickness",
      unit: "in",
      type: "number",
      placeholder: "e.g. 2.25",
      stepNum: 2
    }
  ],

  // Step-by-step procedural breakdown
  // Procedure guidance for the field technician. These steps do not perform calculations.
  steps: [
    {
      num: 1,
      title: "Field Marking & Drilling",
      description: "Mark randomly selected core location and extract core using 4-inch diamond bit.",
      guidance: "Ensure drill rig is level and perpendicular to pavement surface during cutting.",
      learning: "Perpendicular core barrels ensure uniform specimen volume during density testing."
    },
    {
      num: 2,
      title: "Trimming & Thickness Check",
      description: "Trim tack coat / subbase layer and record average thickness across 4 points.",
      guidance: "Use masonry saw to trim bottom unbonded material before laboratory testing.",
      learning: "Removing non-specimen surface layers is mandatory to avoid skewing volume calculations."
    }
  ],

  // Compute Engine
  // Decide whether the core has enough information to be considered ready for the laboratory step.
  compute: function(data) {
    // Location is informational; thickness is the measurement that determines readiness.
    const loc = data.station_location || "—";
    const thick = parseFloat(data.core_thickness);

    // A positive numeric thickness means the minimum required prep measurement is present.
    const isReady = !isNaN(thick) && thick > 0;

    return [
      {
        label: "Sample Location",
        value: loc
      },
      {
        label: "Core Readiness Status",
        value: isReady ? "Ready for T 166 Laboratory Testing" : "Incomplete Thickness Measurement"
      }
    ];
  }
};

// Register module into global framework lookup table
window.QC_LOADED_MODULES = window.QC_LOADED_MODULES || {};
window.QC_LOADED_MODULES["gmb_core_prep"] = window.gmbCorePrepModule;
