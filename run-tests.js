// Run with:  node tests/run-tests.js [path-to-original-folder]
// The original folder must contain index2.html and gmb-density.js
// (your old app). It is used as the comparison point.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
const origDir = process.argv[2] || "/mnt/user-data/uploads";

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log("  ok   " + name); }
  catch (e) { console.log("  FAIL " + name + "\n       " + e.message); process.exitCode = 1; }
}

/* ---------- load the NEW code (no screen) ---------- */
function loadNew() {
  const ctx = vm.createContext({ console });
  for (const f of ["js/engine.js", "js/model.js", "modules/gmb-density.js", "modules/rice-test.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  }
  return vm.runInContext(
    "({ Database, Tree, Context, TestParameter, ModuleRegistry, processSample, normalizeContext, " +
    "getActiveSample, resolveReference, ensureRecord, EngineOps, RecordKinds })", ctx);
}

/* ---------- load the ORIGINAL code with a fake screen ---------- */
function loadOriginal() {
  const html = fs.readFileSync(path.join(origDir, "index2.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const fakeEl = () => ({
    innerHTML: "", style: {}, className: "", classList: { toggle() {} },
    appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, closest() { return null; }
  });
  const ctx = vm.createContext({
    console,
    document: { getElementById: fakeEl, createElement: fakeEl, querySelectorAll: () => [] }
  });
  vm.runInContext(script, ctx);
  vm.runInContext(fs.readFileSync(path.join(origDir, "gmb-density.js"), "utf8"), ctx);
  return vm.runInContext("({ Database, handleInput, TestParameter })", ctx);
}

/* ======================================================================
   1. TREE: separate instances, correct paths (migration steps 1-2)
   ====================================================================== */
console.log("Tree");
test("two plants, mixes and samples stay separate; path matches the document", () => {
  const N = loadNew();
  const proj = N.Tree.getOrCreateProject("JOB-1");
  const p1 = N.Tree.createPlant(proj, "North");
  const p2 = N.Tree.createPlant(proj, "South");
  const m1 = N.Tree.createMix(p1, "Mix A");
  const m2 = N.Tree.createMix(p2, "Mix A");           // same name, different plant
  const s1 = N.Tree.createTruckSample(m1, "14");
  const s2 = N.Tree.createTruckSample(m1, "15");
  const pill = N.Tree.createRecord(s1, "pill");
  N.ensureRecord(pill, N.ModuleRegistry.get("gmb-density"));
  pill.dryWeight.autoValue = 1200.5;

  assert.strictEqual(
    N.Database.project["JOB-1"].plant[p1.plantId].mix[m1.mixId].truckSample[s1.sampleId].pill["1"].dryWeight.autoValue,
    1200.5);
  assert.notStrictEqual(m1, m2);
  assert.deepStrictEqual(Object.keys(s2.pill), []);   // other sample untouched
  assert.deepStrictEqual(Object.keys(p2.mix), [m2.mixId]);
  assert.strictEqual(s1.truckNumber, "14");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(s1.collectionDate));
  assert.ok(!("collectionDate" in pill));             // pills carry no timestamp
});

/* ======================================================================
   2. PARITY with the old code (migration step 4)
   ====================================================================== */
console.log("Parity with the original app");

// small seeded random generator so the test is repeatable
let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

function makeCases(n) {
  const cases = [
    // hand-picked, including the "exactly half" rounding situations
    { A: 1200.5, B: 1210.2, C: 700.3, gmm: 2.465 },
    { A: 4500.1, B: 4510.4, C: 2600.2, gmm: 2.470 },
    { A: 3000.0, B: 3012.5, C: 1750.0, gmm: 2.455 },
    { A: 1000.0, B: 1010.0, C: 590.0, gmm: 2.500 },
    { A: 2358.0, B: 2360.0, C: 1360.0, gmm: 2.4 }
  ];
  for (let i = 0; i < n; i++) {
    const A = round(1000 + rnd() * 5000, 1);
    const B = round(A + 2 + rnd() * 30, 1);
    const C = round(A * (0.55 + rnd() * 0.05), 1);
    const gmm = round(2.3 + rnd() * 0.4, 3);
    cases.push({ A, B, C, gmm });
  }
  return cases;
}

test("volume, Gmb, ratio and percent density match the old app on 305 inputs", () => {
  const O = loadOriginal();
  const origProj = O.Database.getProject();
  // old app expected a "rice-test" record to hold the Gmm
  origProj.tests["rice-test"] = {
    testId: "rice-test-JOB-2173", moduleId: "rice-test",
    fields: { targetRiceGmm: new O.TestParameter(null, "val") }
  };

  const N = loadNew();
  const proj = N.Tree.getOrCreateProject("JOB-2173");
  const sample = N.Tree.createTruckSample(N.Tree.createMix(N.Tree.createPlant(proj, "P"), "M"), null);
  N.Context.projectId = "JOB-2173";
  const pill = N.Tree.createRecord(sample, "pill");
  const rice = N.Tree.createRecord(sample, "riceTest");
  N.ensureRecord(pill, N.ModuleRegistry.get("gmb-density"));
  N.normalizeContext();

  let compared = 0;
  for (const c of makeCases(300)) {
    // old
    origProj.tests["rice-test"].fields.targetRiceGmm.value = c.gmm;
    O.handleInput("massAirA", String(c.A));
    O.handleInput("massWaterC", String(c.C));
    O.handleInput("massSsdB", String(c.B));
    const f = origProj.tests["gmb-density"].fields;

    // new (Gmm placed as a manual override on the Rice test, as a stand-in for a real Rice result)
    N.ensureRecord(rice, N.ModuleRegistry.get("rice-test"));
    rice.measuredGmm.manualValue = c.gmm;
    rice.measuredGmm.isManual = true;
    pill.dryWeight.autoValue = c.A;
    pill.submergedWeight.autoValue = c.C;
    pill.surfaceDryWeight.autoValue = c.B;
    N.processSample(sample);

    assert.strictEqual(pill.specimenVolume.effective, f.volumeV.effective, "volume for " + JSON.stringify(c));
    assert.strictEqual(pill.bulkSpecificGravity.effective, f.bulkGmb.effective, "Gmb for " + JSON.stringify(c));
    assert.strictEqual(pill.gmbGmmRatio.effective, f.compactionRatioTemp.effective, "ratio for " + JSON.stringify(c));
    assert.strictEqual(pill.percentOfGmm.effective, f.compactionPercent.effective, "percent for " + JSON.stringify(c));
    compared++;
  }
  assert.strictEqual(compared, 305);
});

/* ======================================================================
   3. Rice test and Gmm reference (migration step 5)
   ====================================================================== */
console.log("Rice test and reference");

function buildSample(N, name) {
  const proj = N.Tree.getOrCreateProject("JOB-X");
  const plant = Object.values(proj.plant)[0] || N.Tree.createPlant(proj, "P");
  const mix = Object.values(plant.mix)[0] || N.Tree.createMix(plant, "M");
  return N.Tree.createTruckSample(mix, name);
}
function setPill(N, pill, A, B, C) {
  N.ensureRecord(pill, N.ModuleRegistry.get("gmb-density"));
  pill.dryWeight.autoValue = A; pill.submergedWeight.autoValue = C; pill.surfaceDryWeight.autoValue = B;
}
function setRice(N, rice, A, B, C) {
  N.ensureRecord(rice, N.ModuleRegistry.get("rice-test"));
  rice.drySampleWeight.autoValue = A; rice.bowlCalibrationWeight.autoValue = B; rice.bowlAndSampleSubmergedWeight.autoValue = C;
}

test("Rice test calculates Gmm = A / (A - (C - B)) with the engine's rounding", () => {
  const N = loadNew();
  const s = buildSample(N, "1");
  const rice = N.Tree.createRecord(s, "riceTest");
  setRice(N, rice, 1500.0, 1000.0, 1900.0);
  N.Context.projectId = "JOB-X"; N.processSample(s);
  // C - B = 900; A - 900 = 600; 1500 / 600 = 2.5
  assert.strictEqual(rice.measuredGmm.effective, 2.5);
});

test("Rice test with realistic numbers; no Gmm without the bowl calibration", () => {
  const N = loadNew();
  const s = buildSample(N, "1");
  const rice = N.Tree.createRecord(s, "riceTest");
  setRice(N, rice, 1832.4, 1096.8, 2190.3);
  N.Context.projectId = "JOB-X"; N.processSample(s);
  assert.strictEqual(rice.sampleSubmergedWeight.effective, 1093.5);   // C - B
  assert.strictEqual(rice.sampleVolumeBasis.effective, 738.9);        // A - (C - B)
  assert.strictEqual(rice.measuredGmm.effective, 2.48);               // 1832.4 / 738.9

  rice.bowlCalibrationWeight.autoValue = null;                        // calibration missing
  N.processSample(s);
  assert.strictEqual(rice.measuredGmm.effective, null);
});

test("percent density uses the Rice test of ITS OWN sample", () => {
  const N = loadNew();
  const s1 = buildSample(N, "1"), s2 = buildSample(N, "2");
  for (const [s, gmm] of [[s1, 2.465], [s2, 2.500]]) {
    const r = N.Tree.createRecord(s, "riceTest");
    N.ensureRecord(r, N.ModuleRegistry.get("rice-test"));
    r.measuredGmm.manualValue = gmm; r.measuredGmm.isManual = true;
    const p = N.Tree.createRecord(s, "pill");
    setPill(N, p, 1200.5, 1210.2, 700.3);
    N.processSample(s);
  }
  const pct1 = s1.pill["1"].percentOfGmm.effective, pct2 = s2.pill["1"].percentOfGmm.effective;
  assert.notStrictEqual(pct1, pct2);
  assert.strictEqual(pct1, N.EngineOps.ROUND(N.EngineOps.ROUND(2.354 / 2.465, 5) * 100, 1));
  assert.strictEqual(pct2, N.EngineOps.ROUND(N.EngineOps.ROUND(2.354 / 2.500, 5) * 100, 1));
});

test("several Rice tests and no choice: no percent density; choosing one fixes it", () => {
  const N = loadNew();
  const s = buildSample(N, "1");
  const r1 = N.Tree.createRecord(s, "riceTest"), r2 = N.Tree.createRecord(s, "riceTest");
  for (const [r, g] of [[r1, 2.465], [r2, 2.500]]) {
    N.ensureRecord(r, N.ModuleRegistry.get("rice-test"));
    r.measuredGmm.manualValue = g; r.measuredGmm.isManual = true;
  }
  const p = N.Tree.createRecord(s, "pill");
  setPill(N, p, 1200.5, 1210.2, 700.3);
  N.processSample(s);
  assert.strictEqual(p.percentOfGmm.effective, null);          // refuses to guess
  assert.strictEqual(p.bulkSpecificGravity.effective, 2.354);  // the rest still works

  p.gmmReference.riceTestId = "2";
  N.processSample(s);
  assert.strictEqual(p.percentOfGmm.effective, N.EngineOps.ROUND(N.EngineOps.ROUND(2.354 / 2.5, 5) * 100, 1));
});

test("changing the Rice test updates the pill; a manual override survives recalculation", () => {
  const N = loadNew();
  const s = buildSample(N, "1");
  const rice = N.Tree.createRecord(s, "riceTest");
  setRice(N, rice, 1500.0, 1000.0, 1900.0);                    // Gmm 2.5
  const pill = N.Tree.createRecord(s, "pill");
  setPill(N, pill, 1200.5, 1210.2, 700.3);
  N.processSample(s);
  const before = pill.percentOfGmm.effective;

  rice.bowlAndSampleSubmergedWeight.autoValue = 1910.0;        // Gmm changes
  N.processSample(s);
  assert.notStrictEqual(pill.percentOfGmm.effective, before);

  pill.percentOfGmm.manualValue = 95.5; pill.percentOfGmm.isManual = true;
  pill.dryWeight.autoValue = 1201.5;                           // recalculation runs
  N.processSample(s);
  assert.strictEqual(pill.percentOfGmm.effective, 95.5);       // override kept
  assert.notStrictEqual(pill.percentOfGmm.autoValue, 95.5);    // auto value still tracks the inputs
});

/* ======================================================================
   4. ISOLATION and recalculation (migration step 6)
   ====================================================================== */
console.log("Isolation");

test("changing one pill changes nothing in other pills or samples", () => {
  const N = loadNew();
  const s1 = buildSample(N, "1"), s2 = buildSample(N, "2");
  const pills = [];
  for (const s of [s1, s2]) {
    const r = N.Tree.createRecord(s, "riceTest");
    N.ensureRecord(r, N.ModuleRegistry.get("rice-test"));
    r.measuredGmm.manualValue = 2.47; r.measuredGmm.isManual = true;
    for (let i = 0; i < 2; i++) {
      const p = N.Tree.createRecord(s, "pill");
      setPill(N, p, 1200.5 + i * 3, 1210.2 + i * 3, 700.3);
      pills.push(p);
    }
    N.processSample(s);
  }
  const snapshot = () => JSON.stringify(pills.map(p => [p.specimenVolume.effective, p.bulkSpecificGravity.effective, p.percentOfGmm.effective]));
  const before = JSON.parse(snapshot());

  s1.pill["1"].surfaceDryWeight.autoValue = 1222.2;     // change ONE pill
  N.processSample(s1);
  const after = JSON.parse(snapshot());

  assert.notDeepStrictEqual(after[0], before[0]);       // the changed pill moved
  assert.deepStrictEqual(after.slice(1), before.slice(1)); // all others identical
});

test("clearing an input clears the results that depend on it; divide by zero leaves no stale number", () => {
  const N = loadNew();
  const s = buildSample(N, "1");
  const p = N.Tree.createRecord(s, "pill");
  setPill(N, p, 1200.5, 1210.2, 700.3);
  N.processSample(s);
  assert.strictEqual(p.specimenVolume.effective, 509.9);

  p.surfaceDryWeight.autoValue = null;
  N.processSample(s);
  assert.strictEqual(p.specimenVolume.effective, null);
  assert.strictEqual(p.bulkSpecificGravity.effective, null);

  p.surfaceDryWeight.autoValue = 700.3;                 // B = C, volume 0
  N.processSample(s);
  assert.strictEqual(p.specimenVolume.effective, 0);
  assert.strictEqual(p.bulkSpecificGravity.effective, null);
});

console.log("\n" + passed + " passed" + (process.exitCode ? ", some FAILED" : ""));
