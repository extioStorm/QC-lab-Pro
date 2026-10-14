/* =========================================================================
   MODEL: the data tree, the value model, and recalculation.
   Nothing in this file touches the screen (no document / DOM), so it can be
   tested on its own.

   The tree follows TreeOverviewChatGPT.txt:

     Database.project[projectId]
       .plant[plantId]
       .mix[mixId]
       .truckSample[sampleId]
       .pill[pillId]            -> pill.dryWeight is a TestParameter
       .riceTest[riceTestId]    -> riceTest.measuredGmm is a TestParameter
   ========================================================================= */


/* -------------------------------------------------------------------------
   VALUE MODEL
   One structure for every measured or calculated number.

     autoValue    typed-in input OR value calculated by the engine
                  (this is the old TestParameter.value, renamed)
     manualValue  optional override
     isManual     whether the override is active
     unit         "g", "cm³", ...
     precision    decimal places used when this value is calculated
                  (null for plain inputs)
     effective    what the rest of the app should use (getter, never stored)
   ------------------------------------------------------------------------- */

class TestParameter {
  constructor(autoValue = null, unit = "val", precision = null) {
    this.autoValue = autoValue;
    this.unit = unit;
    this.precision = precision;
    this.manualValue = null;
    this.isManual = false;
  }

  get effective() {
    if (this.isManual && this.manualValue !== null && this.manualValue !== "") {
      return this.manualValue;
    }
    return this.autoValue;
  }
}


/* -------------------------------------------------------------------------
   RECORD KINDS
   Each kind lives in a collection on the truck sample.
   To add a new kind later (asphaltContentTest, gradationTest...), add a line
   here and write a module with meta.recordKind set to it.
   ------------------------------------------------------------------------- */

const RecordKinds = {
  pill:     { collection: "pill",     idKey: "pillId",     label: "Pill" },
  riceTest: { collection: "riceTest", idKey: "riceTestId", label: "Rice test" }
};


/* -------------------------------------------------------------------------
   MODULE REGISTRY
   ------------------------------------------------------------------------- */

const ModuleRegistry = new Map();
let onModuleRegistered = null;   // the screen code sets this

function registerModule(moduleObj) {
  if (!moduleObj || !moduleObj.meta || !moduleObj.meta.id) return;
  if (!RecordKinds[moduleObj.meta.recordKind]) {
    console.warn("Module " + moduleObj.meta.id + " has an unknown meta.recordKind; not registered.");
    return;
  }
  ModuleRegistry.set(moduleObj.meta.id, moduleObj);
  if (typeof onModuleRegistered === "function") onModuleRegistered(moduleObj);
}


/* -------------------------------------------------------------------------
   THE TREE
   ------------------------------------------------------------------------- */

const Database = { project: {} };

function pad2(n) { return String(n).padStart(2, "0"); }

const Tree = {

  // Next free id inside one collection: "P1", "P2"... or "1", "2"...
  nextId(collection, prefix = "") {
    let n = Object.keys(collection).length + 1;
    while (collection[prefix + n]) n++;
    return prefix + n;
  },

  getOrCreateProject(projectId) {
    if (!Database.project[projectId]) {
      Database.project[projectId] = {
        projectId,
        projectNumber: projectId,
        projectName: null,
        contractNumber: null,
        region: null,
        location: null,
        owner: null,
        notes: null,
        plant: {},
        roadwaySection: {},   // reserved: cores come later
        reports: {}           // reserved
      };
    }
    return Database.project[projectId];
  },

  createPlant(project, plantName) {
    const plantId = Tree.nextId(project.plant, "P");
    return project.plant[plantId] = {
      plantId,
      plantName,
      producer: null,
      supplier: null,
      location: null,
      notes: null,
      mix: {}
    };
  },

  createMix(plant, mixName) {
    const mixId = Tree.nextId(plant.mix, "M");
    return plant.mix[mixId] = {
      mixId,
      mixName,
      mixCode: null,
      materialCode: null,
      intendedUse: null,
      section: null,
      NMAS: null,
      binderGrade: null,
      notes: null,
      mixDesign: {},          // reserved reference data (not edited yet)
      truckSample: {},
      productionResults: {}   // reserved
    };
  },

  // Collection date and time are recorded once, here, from the device clock.
  createTruckSample(mix, truckNumber) {
    const sampleId = Tree.nextId(mix.truckSample, "S");
    const now = new Date();
    return mix.truckSample[sampleId] = {
      sampleId,
      collectionDate: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
      collectionTime: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
      truckNumber: truckNumber || null,
      sampleLocation: null,
      sampler: null,
      sampleTemperature: null,
      sampleMass: null,
      notes: null,
      pill: {},
      riceTest: {},
      asphaltContentTest: {},   // reserved
      gradationTest: {},        // reserved
      sampleResults: {}         // reserved
    };
  },

  // Adds an empty record (a pill, a Rice test...) to a truck sample.
  // Its measurement fields are created the first time a module touches it.
  createRecord(sample, kindKey) {
    const kind = RecordKinds[kindKey];
    const id = Tree.nextId(sample[kind.collection]);
    return sample[kind.collection][id] = { [kind.idKey]: id };
  }
};


/* -------------------------------------------------------------------------
   CONTEXT: "where am I in the tree right now"
   Holds ids only, never copies of data.
   ------------------------------------------------------------------------- */

const Context = {
  projectId: "JOB-2173",
  plantId: null,
  mixId: null,
  sampleId: null,
  recordId: { pill: null, riceTest: null }
};

// Make sure every selected id still exists; fall back to the first one,
// or null when there is none.
function normalizeContext() {
  const project = Tree.getOrCreateProject(Context.projectId);
  const pick = (collection, id) =>
    (id && collection && collection[id]) ? id : (Object.keys(collection || {})[0] || null);

  Context.plantId = pick(project.plant, Context.plantId);
  const plant = project.plant[Context.plantId];
  Context.mixId = pick(plant && plant.mix, Context.mixId);
  const mix = plant && plant.mix[Context.mixId];
  Context.sampleId = pick(mix && mix.truckSample, Context.sampleId);
  const sample = mix && mix.truckSample[Context.sampleId];

  Object.keys(RecordKinds).forEach(kindKey => {
    const collection = sample && sample[RecordKinds[kindKey].collection];
    Context.recordId[kindKey] = pick(collection, Context.recordId[kindKey]);
  });
}

function getActiveProject() { return Database.project[Context.projectId] || null; }
function getActivePlant() { const p = getActiveProject(); return (p && p.plant[Context.plantId]) || null; }
function getActiveMix() { const p = getActivePlant(); return (p && p.mix[Context.mixId]) || null; }
function getActiveSample() { const m = getActiveMix(); return (m && m.truckSample[Context.sampleId]) || null; }
function getActiveRecord(kindKey) {
  const sample = getActiveSample();
  const id = Context.recordId[kindKey];
  if (!sample || !id) return null;
  return sample[RecordKinds[kindKey].collection][id] || null;
}


/* -------------------------------------------------------------------------
   RECORDS AND MODULES
   A module's `fields` become TestParameters directly on the record
   (pill.dryWeight). Field ids must not clash with the record's own id key
   (pillId) or a module's reference pointer (gmmReference).
   ------------------------------------------------------------------------- */

function precisionFor(module, fieldId) {
  const calc = (module.calculations || []).find(c => c.outputKey === fieldId);
  return calc ? (calc.precision ?? 3) : null;
}

function ensureRecord(record, module) {
  (module.fields || []).forEach(f => {
    if (f.external) return;   // a reference to another record, not stored here
    if (!(record[f.id] instanceof TestParameter)) {
      record[f.id] = new TestParameter(null, f.unit || "val", precisionFor(module, f.id));
    }
  });
  (module.references || []).forEach(ref => {
    if (!record[ref.pointer]) {
      record[ref.pointer] = { [RecordKinds[ref.provider.kind].idKey]: null };
    }
  });
}

// Finds the record a reference points to. It is always looked up inside the
// truck sample that owns `record`, which is passed in explicitly so a value
// can never be picked up from a different sample.
//  - If one was chosen on this record, that one is used.
//  - If none was chosen and the sample has exactly ONE such record, it is used.
//  - If there are several and none was chosen, nothing is used (user must pick).
function resolveReference(ref, record, sample) {
  const kind = RecordKinds[ref.provider.kind];
  const collection = (sample && sample[kind.collection]) || {};
  const ids = Object.keys(collection);

  let targetId = record[ref.pointer] ? record[ref.pointer][kind.idKey] : null;
  let how = "SELECTED";

  if (!targetId || !collection[targetId]) {
    if (ids.length === 1) { targetId = ids[0]; how = "ONLY_ONE"; }
    else return { status: ids.length === 0 ? "NONE_AVAILABLE" : "NEEDS_SELECTION", ids };
  }

  const param = collection[targetId][ref.provider.valueKey];
  const value = param instanceof TestParameter ? param.effective : null;
  if (value === null || value === undefined || value === "" || isNaN(value)) {
    return { status: "NO_VALUE", targetId, how, ids };
  }
  return { status: "OK", value, targetId, how, ids,
           source: { recordKind: ref.provider.kind, recordId: targetId, how } };
}

function getResolvedValue(key, record, module, sample) {
  const param = record[key];
  if (param instanceof TestParameter) {
    const v = param.effective;
    if (v !== null && v !== undefined && v !== "" && !isNaN(v)) {
      return { value: v, source: { recordType: param.isManual ? "MANUAL_OVERRIDE" : "LOCAL_INPUT" } };
    }
    return null;
  }
  const ref = (module.references || []).find(r => r.key === key);
  if (ref) {
    const r = resolveReference(ref, record, sample);
    if (r.status === "OK") return { value: r.value, source: r.source };
  }
  return null;
}


/* -------------------------------------------------------------------------
   CALCULATION
   Same rules as the original processRecord, applied to one record.
   Returns true if anything changed.
   ------------------------------------------------------------------------- */

function processRecord(record, module, sample) {
  if (!module.calculations) return false;
  let anyChange = false, changed = true, guard = 0;

  // 1. Run each calculation whose inputs are all available
  while (changed && guard < 50) {
    changed = false;
    guard++;

    module.calculations.forEach(calc => {
      const inputValues = [];
      for (const input of calc.inputs) {
        if (typeof input === "number" && !isNaN(input)) { inputValues.push(input); continue; }
        const resolved = getResolvedValue(input, record, module, sample);
        if (!resolved) return;          // an input is missing: skip this calculation
        inputValues.push(resolved.value);
      }

      const operation = EngineOps[calc.op];
      if (typeof operation !== "function") return;
      const param = record[calc.outputKey];
      if (!(param instanceof TestParameter)) return;

      const raw = operation(...inputValues);
      // A result that cannot be calculated (e.g. divide by zero) clears the
      // old value instead of leaving a stale number on screen.
      const result = (raw == null || isNaN(raw)) ? null : EngineOps.ROUND(raw, calc.precision ?? 3);

      if (param.autoValue !== result) {
        param.autoValue = result;
        changed = true;
        anyChange = true;
      }
    });
  }

  // 2. CLEANUP: if an input was cleared, wipe the stale calculated value.
  //    A manual override is kept; only the hidden auto value is cleared.
  module.calculations.forEach(calc => {
    const param = record[calc.outputKey];
    if (!(param instanceof TestParameter)) return;
    const inputsAvailable = calc.inputs.every(i =>
      typeof i === "number" || getResolvedValue(i, record, module, sample));
    if (!inputsAvailable && param.autoValue !== null) {
      param.autoValue = null;
      anyChange = true;
    }
  });

  return anyChange;
}

// Recalculate every record in a truck sample (all pills, all Rice tests...)
// and repeat until nothing changes, so a changed Gmm reaches every pill.
function processSample(sample) {
  if (!sample) return;
  let changed = true, guard = 0;
  while (changed && guard < 10) {
    changed = false;
    guard++;
    ModuleRegistry.forEach(module => {
      const kind = RecordKinds[module.meta.recordKind];
      Object.values(sample[kind.collection] || {}).forEach(record => {
        ensureRecord(record, module);
        if (processRecord(record, module, sample)) changed = true;
      });
    });
  }
}
