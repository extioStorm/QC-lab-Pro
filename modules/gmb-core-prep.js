/**
 * Field Core Extraction & Prep
 *
 * This procedure works on the same Core record used by laboratory modules.
 * It does not create a private formData object.
 */

window.gmbCorePrepModule = {
  id: "gmb_core_prep",
  title: "Field Core Drilling & Prep",
  parentModule: "Field Sampling",
  submodule: "Core Drilling & Thickness",

  workflow: {
    prequels: [],
    sequels: ["gmb_core_density"],
    chronologicalOrder: 10
  },

  dataExports: [
    { key: "core_thickness", label: "Core Thickness (in)" },
    { key: "station_location", label: "Station Location" }
  ],

  metadata: {
    type: "prep",
    category: ["field", "sampling"],
    procedure: "core_prep",
    tags: ["drilling", "thickness", "field"],
    workflowRoles: ["field_tech"]
  },

  fields: [
    {
      id: "station_location",
      dataTarget: "core.measurements",
      label: "Station / Location",
      unit: "",
      type: "text",
      placeholder: "e.g. Sta 104+50 Line A",
      stepNum: 1
    },
    {
      id: "core_thickness",
      dataTarget: "core.measurements",
      label: "Average Core Thickness",
      unit: "in",
      type: "number",
      placeholder: "e.g. 2.25",
      stepNum: 2
    }
  ],

  steps: [
    {
      num: 1,
      title: "Field Marking & Drilling",
      description: "Mark the randomly selected core location and extract the core.",
      guidance: "Record the station/location as part of the Core record.",
      learning: "The Core record follows the specimen through later laboratory procedures."
    },
    {
      num: 2,
      title: "Trimming & Thickness Check",
      description: "Trim non-specimen material and record the average core thickness.",
      guidance: "Complete the field measurements before sending the Core into laboratory testing.",
      learning: "These measurements remain available to downstream modules because they belong to the Core."
    }
  ],

  /**
   * This procedure does not need a calculation engine.
   * It simply reports the state of the shared Core record.
   */
  calculate: function(store) {
    const core = store.getCore();

    if (!core) {
      return {
        isComplete: false,
        results: []
      };
    }

    const loc = core.measurements.station_location || "—";
    const thick = parseFloat(core.measurements.core_thickness);
    const isReady = !isNaN(thick) && thick > 0;

    core.results.corePrepReady = isReady;
    store.save();

    return [
      {
        label: "Sample Location",
        value: loc
      },
      {
        label: "Core Readiness Status",
        value: isReady
          ? "Ready for T 166 Laboratory Testing"
          : "Incomplete Thickness Measurement"
      }
    ];
  }
};

window.QC_LOADED_MODULES = window.QC_LOADED_MODULES || {};
window.QC_LOADED_MODULES["gmb_core_prep"] = window.gmbCorePrepModule;
