/* =========================================================================
   APP: screen code (selectors, wizard, speed sheet, inspection box).
   Reads and writes the tree through model.js; does no calculating itself.
   ========================================================================= */

let activeModule = null;
let currentMode = "INTERACTIVE";
let currentStepIndex = 0;

onModuleRegistered = function (moduleObj) {
  renderNavigation();
  if (!activeModule) selectModule(moduleObj.meta.id);
};


/* -------------------------------------------------------------------------
   SMALL HELPERS
   ------------------------------------------------------------------------- */

function htmlToEl(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function activeKindKey() { return activeModule ? activeModule.meta.recordKind : null; }

// The record (pill / Rice test...) this module is currently working on,
// with its fields created if they do not exist yet.
function getActiveTestRecord() {
  if (!activeModule) return null;
  const record = getActiveRecord(activeKindKey());
  if (record) ensureRecord(record, activeModule);
  return record;
}

function findReference(key) {
  return ((activeModule && activeModule.references) || []).find(r => r.key === key) || null;
}

function recordLabel(kindKey, record) {
  const kind = RecordKinds[kindKey];
  return `${kind.label} ${record[kind.idKey]}`;
}

// A module can set meta.unverifiedNote while its procedure has not been
// confirmed against the lab's worksheet. It is shown on every screen of it.
function buildUnverifiedNote() {
  const note = activeModule && activeModule.meta.unverifiedNote;
  if (!note) return null;
  const el = document.createElement("div");
  el.className = "unverified-note";
  el.textContent = "⚠️ Unverified: " + note;
  return el;
}


/* -------------------------------------------------------------------------
   NAVIGATION (module list, mode)
   ------------------------------------------------------------------------- */

function renderNavigation() {
  const select = document.getElementById("mobile-module-select");
  if (!select) return;
  select.innerHTML = "";
  ModuleRegistry.forEach(module => {
    const option = document.createElement("option");
    option.value = module.meta.id;
    option.textContent = `📋 ${module.meta.title}`;
    if (activeModule && activeModule.meta.id === module.meta.id) option.selected = true;
    select.appendChild(option);
  });
}

function selectModule(moduleId) {
  if (!ModuleRegistry.has(moduleId)) return;
  activeModule = ModuleRegistry.get(moduleId);
  currentStepIndex = 0;
  renderNavigation();
  processAndRender();
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  processAndRender();
}


/* -------------------------------------------------------------------------
   CHOOSING / ADDING THINGS IN THE TREE
   Changing a level clears everything below it, so ids from one plant or mix
   can never leak into another.
   ------------------------------------------------------------------------- */

function clearRecordSelection() {
  Object.keys(Context.recordId).forEach(k => { Context.recordId[k] = null; });
}

function switchProject(rawValue) {
  const id = (rawValue || "").trim();
  const input = document.getElementById("project-id-input");
  if (!id) { input.value = Context.projectId; return; }
  Context.projectId = id;
  Context.plantId = null;
  Context.mixId = null;
  Context.sampleId = null;
  clearRecordSelection();
  currentStepIndex = 0;
  processAndRender();
}

function selectPlant(id) { Context.plantId = id; Context.mixId = null; Context.sampleId = null; clearRecordSelection(); currentStepIndex = 0; processAndRender(); }
function selectMix(id) { Context.mixId = id; Context.sampleId = null; clearRecordSelection(); currentStepIndex = 0; processAndRender(); }
function selectSample(id) { Context.sampleId = id; clearRecordSelection(); currentStepIndex = 0; processAndRender(); }
function selectRecord(kindKey, id) { Context.recordId[kindKey] = id; currentStepIndex = 0; processAndRender(); }

function askText(question) {
  const answer = window.prompt(question);
  return answer === null ? null : answer.trim();
}

function addPlant() {
  const name = askText("Plant name:");
  if (!name) return;
  selectPlant(Tree.createPlant(getActiveProject(), name).plantId);
}

function addMix() {
  const plant = getActivePlant();
  if (!plant) return;
  const name = askText("Mix name or code:");
  if (!name) return;
  selectMix(Tree.createMix(plant, name).mixId);
}

function addSample() {
  const mix = getActiveMix();
  if (!mix) return;
  const truck = askText("Truck number (optional, leave blank to skip):");
  if (truck === null) return;   // cancelled
  selectSample(Tree.createTruckSample(mix, truck).sampleId);
}

function addRecord(kindKey) {
  const sample = getActiveSample();
  if (!sample) return;
  const record = Tree.createRecord(sample, kindKey);
  Context.recordId[kindKey] = record[RecordKinds[kindKey].idKey];
  currentStepIndex = 0;
  processAndRender();
}

// Creates Plant 1 / Mix 1 / a sample in one tap so you can start typing numbers.
function quickStart() {
  const plant = Tree.createPlant(getActiveProject(), "Plant 1");
  const mix = Tree.createMix(plant, "Mix 1");
  const sample = Tree.createTruckSample(mix, null);
  Context.plantId = plant.plantId;
  Context.mixId = mix.mixId;
  Context.sampleId = sample.sampleId;
  clearRecordSelection();
  currentStepIndex = 0;
  processAndRender();
}


/* -------------------------------------------------------------------------
   THE "WHERE AM I" BAR
   ------------------------------------------------------------------------- */

function ctxRow(bar, label, items, selectedId, onSelect, onAdd, addEnabled) {
  const row = document.createElement("div");
  row.className = "ctx-row";

  const lab = document.createElement("span");
  lab.className = "ctx-label";
  lab.textContent = label;

  const sel = document.createElement("select");
  sel.className = "ctx-select";
  if (!items.length) {
    sel.appendChild(new Option("— none yet —", ""));
    sel.disabled = true;
  } else {
    items.forEach(it => sel.appendChild(new Option(it.label, it.id)));
    sel.value = selectedId || items[0].id;
    sel.addEventListener("change", () => onSelect(sel.value));
  }

  const btn = document.createElement("button");
  btn.className = "ctx-add";
  btn.textContent = "+";
  btn.title = "Add new";
  btn.disabled = !addEnabled;
  btn.addEventListener("click", onAdd);

  row.append(lab, sel, btn);
  bar.appendChild(row);
}

function renderContextBar() {
  const bar = document.getElementById("context-bar");
  if (!bar) return;
  bar.innerHTML = "";

  const project = getActiveProject();
  const plant = getActivePlant();
  const mix = getActiveMix();
  const sample = getActiveSample();

  ctxRow(bar, "Plant",
    Object.values(project.plant).map(p => ({ id: p.plantId, label: p.plantName })),
    Context.plantId, selectPlant, addPlant, true);

  ctxRow(bar, "Mix",
    plant ? Object.values(plant.mix).map(m => ({ id: m.mixId, label: m.mixName })) : [],
    Context.mixId, selectMix, addMix, !!plant);

  ctxRow(bar, "Sample",
    mix ? Object.values(mix.truckSample).map(s => ({
      id: s.sampleId,
      label: s.truckNumber ? `${s.sampleId} · Truck ${s.truckNumber}` : s.sampleId
    })) : [],
    Context.sampleId, selectSample, addSample, !!mix);

  const kindKey = activeKindKey();
  if (kindKey) {
    const kind = RecordKinds[kindKey];
    ctxRow(bar, kind.label,
      sample ? Object.values(sample[kind.collection]).map(r => ({ id: r[kind.idKey], label: recordLabel(kindKey, r) })) : [],
      Context.recordId[kindKey],
      id => selectRecord(kindKey, id),
      () => addRecord(kindKey),
      !!sample);
  }
}


/* -------------------------------------------------------------------------
   EDITING VALUES
   ------------------------------------------------------------------------- */

function handleInput(fieldId, rawValue) {
  const record = getActiveTestRecord();
  const param = record && record[fieldId];
  if (!(param instanceof TestParameter)) return;
  param.autoValue = rawValue === "" ? null : parseFloat(rawValue);
  param.isManual = false;
  param.manualValue = null;
  processAndRender();
}

function handleManualValueChange(key, rawValue) {
  const record = getActiveTestRecord();
  const param = record && record[key];
  if (!(param instanceof TestParameter)) return;
  const numericValue = rawValue === "" ? null : parseFloat(rawValue);
  param.manualValue = numericValue;
  if (numericValue !== null && !isNaN(numericValue)) {
    param.isManual = true;
  }
  processAndRender();
}

function toggleManualState(key) {
  const record = getActiveTestRecord();
  const param = record && record[key];
  if (!(param instanceof TestParameter)) return;
  if (param.manualValue !== null && param.manualValue !== undefined && !isNaN(param.manualValue)) {
    param.isManual = !param.isManual;
  }
  processAndRender();
}


/* -------------------------------------------------------------------------
   INSPECTION BOX (tap a calculated value)
   ------------------------------------------------------------------------- */

function traceMissingDependencies(outputKey) {
  if (!activeModule || !activeModule.calculations) return [];
  const calc = activeModule.calculations.find(c => c.outputKey === outputKey);
  if (!calc) return [];
  const record = getActiveTestRecord();
  const sample = getActiveSample();
  const missing = [];

  calc.inputs.forEach(input => {
    if (typeof input === "number") return;
    if (getResolvedValue(input, record, activeModule, sample)) return;
    const field = activeModule.fields.find(f => f.id === input);
    const ref = findReference(input);
    let detail = "";
    if (ref) {
      const r = resolveReference(ref, record, sample);
      const kindLabel = RecordKinds[ref.provider.kind].label;
      if (r.status === "NONE_AVAILABLE") detail = `No ${kindLabel} in this sample yet.`;
      else if (r.status === "NEEDS_SELECTION") detail = `Choose which ${kindLabel} to use.`;
      else if (r.status === "NO_VALUE") detail = `${kindLabel} ${r.targetId} has no ${ref.label} yet.`;
    }
    missing.push({ key: input, label: (field && field.label) || input, type: ref ? "DEPENDENCY" : "LOCAL", detail });
  });
  return missing;
}

function handleValueDisplayClick(outputKey, element) {
  const parentCard = element.closest(".card, .speed-card");
  if (!parentCard) return;

  const oldBox = parentCard.querySelector(".dependency-box");
  if (oldBox) { oldBox.remove(); return; }

  const record = getActiveTestRecord();
  const param = record && record[outputKey];
  const isManual = param ? param.isManual : false;

  const box = document.createElement("div");
  box.className = "dependency-box";

  let html = `<div class="dependency-title">🔍 Inspect: ${outputKey}</div>`;
  const missing = traceMissingDependencies(outputKey);

  if (missing.length > 0) {
    html += `<div class="dependency-detail">Missing required inputs:</div>`;
    missing.forEach(m => {
      html += `<div class="dependency-detail">⚠️ <strong>${m.label}</strong>${m.detail ? " — " + m.detail : ""}</div>`;
    });
  }

  const activeSourceText = isManual ? "⚠️ Using Manual Override" : "🟢 Using Auto-Calculated Value";
  const toggleBtnText = isManual ? "Switch to Auto Value" : "Switch to Manual Override";
  const toggleBtnBg = isManual ? "var(--warning)" : "var(--accent)";
  const hasManual = param && param.manualValue !== null && param.manualValue !== undefined && !isNaN(param.manualValue);

  html += `
    <div style="margin-top:0.75rem;">
      <div class="dependency-detail">Source Status: <strong>${activeSourceText}</strong></div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.4rem;">
        <input type="number" inputmode="decimal" step="any" placeholder="Stored override value..."
          value="${param && param.manualValue !== null && param.manualValue !== undefined ? param.manualValue : ''}"
          style="width:100%;height:38px;padding:0.3rem;background:var(--input-bg);color:var(--text);border:1px solid var(--panel-border);border-radius:4px;"
          onchange="handleManualValueChange('${outputKey}', this.value)">

        ${hasManual ? `
          <button onclick="toggleManualState('${outputKey}')"
            style="width:100%;padding:0.5rem;background:${toggleBtnBg};color:black;font-weight:bold;border:none;border-radius:4px;cursor:pointer;font-size:0.8rem;">
            ${toggleBtnText}
          </button>` : ''}
      </div>
    </div>
  `;

  box.innerHTML = html;
  parentCard.appendChild(box);
}


/* -------------------------------------------------------------------------
   REFERENCE PICKER (which Rice test supplies the Gmm?)
   ------------------------------------------------------------------------- */

function buildReferenceControl(ref, record) {
  const kind = RecordKinds[ref.provider.kind];
  const sample = getActiveSample();
  const collection = sample[kind.collection] || {};
  const resolved = resolveReference(ref, record, sample);

  const wrap = document.createElement("div");
  wrap.className = "ref-box";

  const title = document.createElement("div");
  title.className = "dependency-title";
  title.textContent = `${ref.label} comes from:`;
  wrap.appendChild(title);

  const sel = document.createElement("select");
  const ids = Object.keys(collection);
  sel.appendChild(new Option(ids.length ? `Select a ${kind.label}…` : `No ${kind.label} in this sample yet`, ""));
  ids.forEach(id => {
    const p = collection[id][ref.provider.valueKey];
    const v = p instanceof TestParameter ? p.effective : null;
    const valueText = (v === null || v === undefined || v === "") ? "no value yet" : `${ref.label} ${v}`;
    sel.appendChild(new Option(`${kind.label} ${id} — ${valueText}`, id));
  });
  sel.disabled = !ids.length;
  sel.value = resolved.targetId || (record[ref.pointer] && record[ref.pointer][kind.idKey]) || "";
  sel.addEventListener("change", () => {
    record[ref.pointer][kind.idKey] = sel.value || null;
    processAndRender();
  });
  wrap.appendChild(sel);

  const status = document.createElement("div");
  status.className = "dependency-detail";
  if (resolved.status === "OK") {
    status.textContent = `Using ${kind.label} ${resolved.targetId}` +
      (resolved.how === "ONLY_ONE" ? " (the only one in this sample)." : ".");
  } else if (resolved.status === "NONE_AVAILABLE") {
    status.textContent = `Add a ${kind.label} to this truck sample first (switch module, then use + on the ${kind.label} row).`;
  } else if (resolved.status === "NEEDS_SELECTION") {
    status.textContent = `This sample has several ${kind.label} records. Choose which one to use.`;
  } else {
    status.textContent = `${kind.label} ${resolved.targetId} has no ${ref.label} yet. Finish that test first.`;
  }
  wrap.appendChild(status);
  return wrap;
}

function resolvedReferenceText(ref, record) {
  const r = resolveReference(ref, record, getActiveSample());
  return r.status === "OK" ? r.value : null;
}


/* -------------------------------------------------------------------------
   RENDERING
   ------------------------------------------------------------------------- */

function processAndRender() {
  normalizeContext();
  processSample(getActiveSample());
  renderContextBar();

  const viewport = document.getElementById("app-viewport");
  viewport.innerHTML = "";
  if (!activeModule) return;

  const record = getActiveTestRecord();
  if (!record) { renderEmptyState(viewport); return; }

  if (currentMode === "INTERACTIVE") {
    renderInteractiveMode(viewport, record);
  } else if (currentMode === "SPEED") {
    renderSpeedMode(viewport, record);
  }
}

function renderEmptyState(container) {
  const kind = RecordKinds[activeKindKey()];
  const card = document.createElement("div");
  card.className = "card empty-card";

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = "Nothing to work on yet";

  const msg = document.createElement("div");
  msg.className = "instruction";

  const btn = document.createElement("button");
  btn.className = "btn-primary";

  let showButton = true;
  if (!getActivePlant()) {
    msg.textContent = "Samples live inside a plant and a mix. Add them one at a time with the + buttons above, or tap Quick start to create Plant 1, Mix 1 and a truck sample now.";
    btn.textContent = "Quick start";
    btn.onclick = quickStart;
  } else if (!getActiveMix()) {
    msg.textContent = "Add a mix to this plant with the + button on the Mix row.";
    showButton = false;
  } else if (!getActiveSample()) {
    msg.textContent = "Add a truck sample with the + button on the Truck sample row.";
    showButton = false;
  } else {
    msg.textContent = `This truck sample has no ${kind.label.toLowerCase()} yet.`;
    btn.textContent = `Add ${kind.label}`;
    btn.onclick = () => addRecord(activeKindKey());
  }

  card.append(title, msg);
  if (showButton) card.appendChild(btn);
  container.appendChild(card);
}

function buildValueDisplay(fieldId, unit, record) {
  const ref = findReference(fieldId);
  const display = document.createElement("div");
  display.className = "value-display";

  if (ref) {
    const v = resolvedReferenceText(ref, record);
    display.classList.add("no-inspect");
    display.innerHTML = `
      <div class="val" style="color: var(--success);">${v !== null ? v : "--"} <span class="unit">${unit || ""}</span></div>
      <div style="font-size:0.75rem;color:var(--muted);margin-top:0.3rem;">${fieldId} (from the selected ${RecordKinds[ref.provider.kind].label})</div>
    `;
    return display;
  }

  const param = record[fieldId];
  const val = param instanceof TestParameter ? (param.effective ?? "--") : "--";
  const isManual = param instanceof TestParameter ? param.isManual : false;
  display.style.borderColor = isManual ? "var(--accent)" : "var(--panel-border)";
  display.innerHTML = `
    <div class="val" style="color: ${isManual ? 'var(--warning)' : 'var(--success)'};">${val}${isManual ? '*' : ''} <span class="unit">${unit || ""}</span></div>
    <div style="font-size:0.75rem;color:var(--muted);margin-top:0.3rem;">${fieldId} ${isManual ? '(Manual Override Active)' : '(Click to Inspect)'}</div>
  `;
  display.onclick = () => handleValueDisplayClick(fieldId, display);
  return display;
}

function renderInteractiveMode(container, record) {
  const steps = activeModule.steps;
  if (!steps || steps.length === 0) return;
  const step = steps[currentStepIndex];

  const card = document.createElement("div");
  card.className = "card";
  card.appendChild(htmlToEl(`<div class="card-title">Step ${currentStepIndex + 1} of ${steps.length}: ${step.title}</div>`));

  const unverified = buildUnverifiedNote();
  if (unverified) card.appendChild(unverified);

  if (step.trainingText) {
    card.appendChild(htmlToEl(`<div class="instruction">${step.trainingText}</div>`));
  }

  step.components.forEach(comp => {
    if (comp.type === "instruction") {
      card.appendChild(htmlToEl(`<div class="instruction">${comp.text}</div>`));
    }
    else if (comp.type === "field-input") {
      const param = record[comp.fieldId];
      const val = param instanceof TestParameter ? (param.autoValue ?? "") : "";
      card.appendChild(htmlToEl(`
        <div class="field-group">
          <label>${comp.label} (${comp.unit || ""})</label>
          <input type="number" inputmode="decimal" step="any" value="${val}" onchange="handleInput('${comp.fieldId}', this.value)">
        </div>
      `));
    }
    else if (comp.type === "formula") {
      card.appendChild(htmlToEl(`<div class="formula-box">${comp.expression}</div>`));
    }
    else if (comp.type === "value-display") {
      const ref = findReference(comp.fieldId);
      if (ref) card.appendChild(buildReferenceControl(ref, record));
      card.appendChild(buildValueDisplay(comp.fieldId, comp.unit, record));
    }
  });

  // Footer Navigation
  const nav = document.createElement("div");
  nav.className = "wizard-nav";

  if (currentStepIndex > 0) {
    const backBtn = document.createElement("button");
    backBtn.className = "btn-secondary";
    backBtn.textContent = "← Back";
    backBtn.onclick = () => { currentStepIndex--; processAndRender(); };
    nav.appendChild(backBtn);
  }

  if (currentStepIndex < steps.length - 1) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn-primary";
    nextBtn.textContent = "Next Step →";
    nextBtn.onclick = () => { currentStepIndex++; processAndRender(); };
    nav.appendChild(nextBtn);
  }

  card.appendChild(nav);
  container.appendChild(card);
}

function renderSpeedMode(container, record) {
  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = `Speed Mode — ${activeModule.meta.title}`;
  container.appendChild(title);

  const unverified = buildUnverifiedNote();
  if (unverified) container.appendChild(unverified);

  activeModule.fields.forEach(field => {
    const card = document.createElement("div");
    card.className = "speed-card";
    const param = record[field.id];

    if (field.external) {
      const ref = findReference(field.id);
      const v = ref ? resolvedReferenceText(ref, record) : null;
      card.innerHTML = `
        <div class="speed-card-main">
          <div class="speed-info">
            <div class="speed-label">${field.label}</div>
            <div class="speed-type">Dependency (${field.unit || "val"})</div>
          </div>
          <div class="speed-calc-val no-inspect" style="color: var(--success);">${v !== null ? v : "--"}</div>
        </div>
      `;
      if (ref) card.appendChild(buildReferenceControl(ref, record));
    } else if (field.computed) {
      const val = param instanceof TestParameter ? (param.effective ?? "") : "";
      const isManual = param instanceof TestParameter ? param.isManual : false;
      card.innerHTML = `
        <div class="speed-card-main">
          <div class="speed-info">
            <div class="speed-label">${field.label}</div>
            <div class="speed-type">Calculated (${field.unit || "val"})</div>
          </div>
          <div class="speed-calc-val" style="color: ${isManual ? 'var(--warning)' : 'var(--success)'};" data-field-id="${field.id}">
            ${val !== "" ? val : "--"}${isManual ? '*' : ''}
          </div>
        </div>
      `;
      const valEl = card.querySelector("[data-field-id]");
      valEl.onclick = () => handleValueDisplayClick(field.id, valEl);
    } else {
      const val = param instanceof TestParameter ? (param.autoValue ?? "") : "";
      card.innerHTML = `
        <div class="speed-card-main">
          <div class="speed-info">
            <div class="speed-label">${field.label}</div>
            <div class="speed-type">Input (${field.unit || "val"})</div>
          </div>
          <div class="speed-input-wrap">
            <input type="number" inputmode="decimal" step="any" value="${val}" onchange="handleInput('${field.id}', this.value)">
          </div>
        </div>
      `;
    }
    container.appendChild(card);
  });
}
