/**
 * QC Lab Framework Core Engine (Refactored v2.1.0 - Envelope-Aware)
 */

class QCLabFramework {
  constructor(rootContainerId) {
    this.container = document.getElementById(rootContainerId);
    this.activeModule = null;
    this.mode = "interactive";
    this.stepIndex = 0;
    this.attachedCalculations = new Set();
    this.trainingGuesses = {};
    this.pendingFieldValues = {};
  }

  // --- Envelope-Aware View Helpers ---
  // These handle both legacy raw numbers and the new Envelope objects
  unenvelope(data) {
    return (data && typeof data === 'object' && 'value' in data) ? data.value : data;
  }

  mountModule(moduleObj) {
    if (!moduleObj || !moduleObj.id) return;
    this.activeModule = moduleObj;
    this.stepIndex = 0;
    this.attachedCalculations.clear();
    this.trainingGuesses = {};
    this.pendingFieldValues = {};
    this.render();
  }

  setMode(newMode) {
    if (["speed", "interactive", "training"].includes(newMode)) {
      this.mode = newMode;
      this.stepIndex = 0;
      this.render();
    }
  }

  isStepComplete(step) {
    if (!step) return false;
    if (step.fieldId) {
      const field = (this.activeModule?.fields || []).find(f => f.id === step.fieldId);
      if (!field) return false;
      const val = this.getFieldValue(field);
      return val !== "" && Number.isFinite(parseFloat(val));
    }
    const calculated = this.calculateActiveModule();
    return calculated?.isComplete !== false;
  }

  setStep(newStepIndex) {
    if (!this.activeModule?.steps) return;
    if (newStepIndex < 0 || newStepIndex >= this.activeModule.steps.length) return;
    if (newStepIndex > this.stepIndex) {
      const currentStep = this.activeModule.steps[this.stepIndex];
      if (!this.isStepComplete(currentStep)) return;
    }
    this.stepIndex = newStepIndex;
    this.render();
  }

  getFieldValue(field) {
    if (!window.QC_DATA) return "";
    if (Object.prototype.hasOwnProperty.call(this.pendingFieldValues, field.id)) {
      return this.pendingFieldValues[field.id];
    }
    // Unwrap the envelope before putting it into the input field
    const raw = QC_DATA.getField(field.dataTarget || "core.measurements", field.dataKey || field.id);
    return this.unenvelope(raw) ?? "";
  }

  updateFieldValue(fieldId, value) {
    this.pendingFieldValues[fieldId] = value;
  }

  commitFieldValue(fieldId, value) {
    const field = (this.activeModule?.fields || []).find(f => f.id === fieldId);
    if (!field || !window.QC_DATA) return;

    // IMPORTANT: Now passing 'source' (module id) and 'type' (field type)
    // to build the envelope inside the data model.
    QC_DATA.setField(
      field.dataTarget || "core.measurements",
      field.dataKey || field.id,
      value,
      this.activeModule.id, // Source
      field.type === 'number' ? 'GENERIC' : 'TEXT' // Type categorization
    );

    delete this.pendingFieldValues[fieldId];
    this.calculateActiveModule();
    this.render();
  }

  calculateActiveModule() {
    if (!this.activeModule || typeof this.activeModule.calculate !== "function") {
      return { isComplete: false, results: [] };
    }
    const calculated = this.activeModule.calculate(QC_DATA);
    return calculated;
  }

  // --- Renderers ---
  render() {
    if (!this.container) return;
    if (!this.activeModule) {
      this.container.innerHTML = `<div class="fw-card"><p>No active module selected.</p></div>`;
      return;
    }

    const m = this.activeModule;
    const calculatedData = this.calculateActiveModule();

    this.container.innerHTML = `
      <div class="fw-card">
        ${this.renderContextBar()}
        <div class="fw-module-header">
          <div class="fw-header-titles">
            <h2>${m.title}</h2>
            <span class="fw-header-sub">${m.submodule || m.parentModule || ""}</span>
          </div>
          <div class="fw-mode-selector">
            <button type="button" class="fw-btn ${this.mode === "speed" ? "fw-btn-primary" : ""}" onclick="QC.setMode('speed')">Speed</button>
            <button type="button" class="fw-btn ${this.mode === "interactive" ? "fw-btn-primary" : ""}" onclick="QC.setMode('interactive')">Interactive</button>
            <button type="button" class="fw-btn ${this.mode === "training" ? "fw-btn-primary" : ""}" onclick="QC.setMode('training')">Training</button>
          </div>
        </div>
        ${this.renderProcedureSteps(m)}
        <h3 class="fw-section-heading">Raw Measured Inputs</h3>
        <div class="fw-grid">${this.renderInputFields(m)}</div>
        <h3 class="fw-section-heading">Calculated Results</h3>
        <div id="fw-calculated-results">${this.renderCalculatedSection(calculatedData, m)}</div>
      </div>
    `;
  }

  renderContextBar() {
    const project = QC_DATA.getProject();
    const session = QC_DATA.getSession();
    const core = QC_DATA.getCore();
    const gmm = QC_DATA.getApplicableGmm();
    
    return `
      <div class="fw-context-bar">
        <div><strong>Project:</strong> ${project?.name || QC_DATA.context.projectId}</div>
        <div><strong>Session:</strong> ${session?.label || QC_DATA.context.sessionId}</div>
        <div class="fw-context-control">
          <label for="qc-core-id">Current Core</label>
          <div class="fw-context-entry">
            <input id="qc-core-id" type="text" value="${core?.id || ""}" autocomplete="off">
            <button type="button" class="fw-btn fw-btn-secondary" onclick="QC.setCoreContext(document.getElementById('qc-core-id').value)">Open</button>
          </div>
        </div>
        <div class="fw-context-control">
          <label for="qc-rice-test-id">Current Rice/GMM Record</label>
          <div class="fw-context-entry">
            <input id="qc-rice-test-id" type="text" value="${QC_DATA.context.riceTestId || ""}" autocomplete="off">
            <button type="button" class="fw-btn fw-btn-secondary" onclick="QC.setRiceTestContext(document.getElementById('qc-rice-test-id').value)">Open</button>
          </div>
        </div>
        <div class="fw-context-control">
          <label for="qc-gmm-source">Applicable GMM source</label>
          <select id="qc-gmm-source" onchange="QC.setGmmSource(this.value)">
            <option value="">Project/specification value</option>
            ${Object.entries(QC_DATA.getRiceTests()).map(([id, test]) => `
              <option value="${id}" ${core?.references?.gmmTestId === id ? "selected" : ""}>
                ${test.label || id} (${test.gmm ?? "pending"})
              </option>
            `).join("")}
          </select>
        </div>
      </div>
    `;
  }

  renderInputFields(moduleObj) {
    const fields = moduleObj.fields || [];
    if (!QC_DATA.getCore()) return `<p class="fw-empty-state">Enter a Core number to start.</p>`;
    
    return fields.map(f => `
      <div class="fw-input-group">
        <label>${f.label}</label>
        <input type="${f.type || "text"}" 
               value="${this.getFieldValue(f)}" 
               oninput="QC.updateFieldValue('${f.id}', this.value)" 
               onblur="QC.commitFieldValue('${f.id}', this.value)">
      </div>
    `).join("");
  }

  renderCalculatedSection(calculatedData, moduleObj = this.activeModule) {
    const results = Array.isArray(calculatedData) ? calculatedData : (calculatedData?.results || []);
    if (!results.length) return `<p class="fw-empty-state">No calculated values defined.</p>`;

    // Use unenvelope for all result values
    return `
      <div class="fw-results-grid">
        ${results.map(res => `
          <div class="fw-result-card fw-result-active">
            <span class="fw-result-label">${res.label}</span>
            <span class="fw-result-value">${this.unenvelope(res.value)}</span>
          </div>
        `).join("")}
      </div>
    `;
  }
  
  // (Left out: setCoreContext, setRiceTestContext, setGmmSource, etc - these remain the same)
  setCoreContext(coreId) { if(coreId) { QC_DATA.setContext({ coreId: String(coreId) }); this.render(); } }
  setRiceTestContext(testId) { if(testId) { QC_DATA.setContext({ riceTestId: String(testId) }); QC_DATA.ensureRiceTest(testId); this.render(); } }
  setGmmSource(testId) { if(QC_DATA.getCore()) { QC_DATA.setCoreReference("gmmTestId", testId); this.render(); } }
}
