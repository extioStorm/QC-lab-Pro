// =========================================================================
// MODULE: Rice test (maximum specific gravity, Gmm)
//
//   project[..].plant[..].mix[..].truckSample[..].riceTest[n]
//
// Submerged-bowl method, written from the lab's own description:
//
//   B  bowl, empty, weighed underwater (calibration, redone about every
//      two months, not every test)
//   A  dry sample in air (bowl tared, sample poured in, net weight)
//   C  bowl + saturated sample, weighed underwater (scale zeroed in the water)
//
//   sample underwater = C - B
//   Gmm = A / (A - (C - B))
//
// STILL UNCONFIRMED (marked on screen with meta.unverifiedNote):
//   - rounding: 1 decimal for the weights/differences, 3 for Gmm (guesses)
//   - whether a water-temperature correction is applied
//   - the vacuum gauge unit (written as mm Hg) and whether pressure and
//     time are recorded on the worksheet (right now they are instructions only)
//   - whether the bowl calibration should be a saved record reused by many
//     tests, instead of a number typed into each test
// =========================================================================

const RiceTestModule = {

  meta: {
    id: "rice-test",
    title: "Rice Test (Gmm)",
    shortTitle: "Rice / Gmm",
    version: "0.2.0",
    description: "Maximum specific gravity (Gmm) of a loose asphalt mixture sample, submerged-bowl method.",
    recordKind: "riceTest",
    unverifiedNote: "Steps follow your description of the lab method. Rounding, temperature correction and the vacuum gauge unit are not confirmed yet."
  },

  fields: [
    { id: "bowlCalibrationWeight",        label: "B: Bowl Underwater (calibration)",      unit: "g",   type: "LOCAL" },
    { id: "drySampleWeight",              label: "A: Dry Sample Mass in Air",             unit: "g",   type: "LOCAL" },
    { id: "bowlAndSampleSubmergedWeight", label: "C: Bowl + Sample Underwater",          unit: "g",   type: "LOCAL" },
    { id: "sampleSubmergedWeight",        label: "Sample Underwater (C - B)",             unit: "g",   computed: true },
    { id: "sampleVolumeBasis",            label: "A - (C - B)",                           unit: "g",   computed: true },
    { id: "measuredGmm",                  label: "Maximum Specific Gravity (Gmm)",        unit: "val", computed: true }
  ],

  calculations: [
    { id: "calc-sample-underwater", op: "SUBTRACT", inputs: ["bowlAndSampleSubmergedWeight", "bowlCalibrationWeight"], outputKey: "sampleSubmergedWeight", precision: 1 },
    { id: "calc-volume-basis",      op: "SUBTRACT", inputs: ["drySampleWeight", "sampleSubmergedWeight"],              outputKey: "sampleVolumeBasis",     precision: 1 },
    { id: "calc-gmm",               op: "DIVIDE",   inputs: ["drySampleWeight", "sampleVolumeBasis"],                  outputKey: "measuredGmm",           precision: 3 }
  ],

  steps: [
    {
      id: "step-b",
      title: "Bowl Calibration (B)",
      trainingText: "This is done about every two months, not for every test. It is the weight of the empty bowl underwater.",
      components: [
        { type: "instruction", text: "With the scale hanging in the water bath and zeroed, weigh the empty bowl fully underwater. Enter that weight as B." },
        { type: "field-input", fieldId: "bowlCalibrationWeight", label: "Bowl Underwater (B)", unit: "g" }
      ]
    },
    {
      id: "step-a",
      title: "Dry Sample Mass (A)",
      trainingText: "Prepare the loose sample from the truck sample, then weigh it dry.",
      components: [
        { type: "instruction", text: "Take a scoop of the asphalt sample and lay it on rice paper. Work it by hand so it cools loose and not stuck together, so water can get into all the cracks. Cool it in front of a fan." },
        { type: "instruction", text: "Place the bowl on the scale in air and zero it. Pour the cooled sample into the bowl and weigh again. This net weight is A." },
        { type: "field-input", fieldId: "drySampleWeight", label: "Dry Sample Mass in Air (A)", unit: "g" }
      ]
    },
    {
      id: "step-vacuum",
      title: "Vacuum Saturation",
      trainingText: "No measurement in this step. The sample is saturated so water fills every crack.",
      components: [
        { type: "instruction", text: "Fill the bowl with water and put it in the vacuum shaker. Run it at 25–30 residual pressure (mm Hg; confirm the unit on your gauge) for 15 minutes while it shakes." }
      ]
    },
    {
      id: "step-c",
      title: "Bowl + Sample Underwater (C)",
      trainingText: "Weigh the bowl with the saturated sample in it, fully underwater.",
      components: [
        { type: "instruction", text: "Take the bowl with the saturated sample to the weigh station at the sink. Zero the scale in the water, then weigh the bowl and sample fully underwater. Enter that weight as C." },
        { type: "field-input", fieldId: "bowlAndSampleSubmergedWeight", label: "Bowl + Sample Underwater (C)", unit: "g" }
      ]
    },
    {
      id: "step-gmm",
      title: "Maximum Specific Gravity (Gmm)",
      trainingText: "The bowl's weight is removed, leaving the sample's own underwater weight. Gmm compares the dry sample with its saturated underwater weight.",
      components: [
        { type: "formula", expression: "Sample underwater = C - B" },
        { type: "value-display", fieldId: "sampleSubmergedWeight", unit: "g" },
        { type: "formula", expression: "Gmm = A / (A - (C - B))" },
        { type: "value-display", fieldId: "sampleVolumeBasis", unit: "g" },
        { type: "value-display", fieldId: "measuredGmm", unit: "" }
      ]
    }
  ]
};

if (typeof registerModule === "function") {
  registerModule(RiceTestModule);
}
