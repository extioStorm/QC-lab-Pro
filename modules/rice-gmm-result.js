/**
 * Rice / GMM Test Record
 *
 * This is deliberately NOT a Core module.
 *
 * A Rice test produces a GMM result that may become the applicable
 * reference for multiple Cores produced during the relevant period.
 * Cores reference this test; they do not own a duplicate GMM value.
 */

window.riceGmmModule = {
  id: "rice_gmm_result",
  title: "Rice / GMM Test Result",
  parentModule: "Volumetric Properties",
  submodule: "Reference Result",

  metadata: {
    type: "test",
    category: ["testing", "laboratory", "volumetric_properties"],
    procedure: "rice_gmm"
  },

  fields: [
    {
      id: "label",
      dataTarget: "riceTest",
      label: "Test Label",
      type: "text",
      placeholder: "e.g. Rice Test 1",
      stepNum: 1
    },
    {
      id: "gmm",
      dataTarget: "riceTest",
      label: "GMM",
      unit: "",
      type: "number",
      placeholder: "e.g. 2.412",
      stepNum: 2
    }
  ],

  steps: [
    {
      num: 1,
      title: "Identify Rice Test",
      description: "Create or select the Rice/GMM test record that produced the reference value.",
      guidance: "The test record can later be referenced by multiple Cores.",
      learning: "The Rice test is a separate test component, not a property of one individual Core."
    },
    {
      num: 2,
      title: "Record GMM",
      description: "Enter the GMM result produced by the Rice test.",
      guidance: "After the result is recorded, later Cores can be linked to this test.",
      learning: "Keeping the source test as its own record preserves which GMM was applicable to each Core."
    }
  ],

  calculate: function(store) {
    const test = store.getRiceTest();

    if (!test) {
      return {
        isComplete: false,
        results: []
      };
    }

    const gmm = parseFloat(test.gmm);
    const complete = !isNaN(gmm) && gmm > 0;

    return [
      {
        label: "Rice Test",
        value: test.label || test.id
      },
      {
        label: "GMM",
        value: complete ? gmm.toFixed(3) : "Pending"
      },
      {
        label: "Record Status",
        value: complete ? "Ready to reference from Core tests" : "Enter a valid GMM"
      }
    ];
  }
};

window.QC_LOADED_MODULES = window.QC_LOADED_MODULES || {};
window.QC_LOADED_MODULES["rice_gmm_result"] = window.riceGmmModule;
