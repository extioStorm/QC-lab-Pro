/**
 * QC Lab Framework Core Engine (Refactored v2.1.1 - Envelope & Interceptor Aware)
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
    const raw = QC_DATA.getField(field.dataTarget || "core.measurements", field.dataKey || field.id);
    return this.unenvelope(raw) ?? "";
  }

  updateFieldValue(fieldId, value) {
    this.pendingFieldValues[fieldId] = value;
  }

  commitFieldValue(fieldId, value) {
    const field = (this.activeModule?.fields || []).find(f => f.id === fieldId);
    if (!field || !window.QC_DATA) return;

    QC_DATA.setField(
      field.dataTarget || "core.measurements",
      field.dataKey || field.id,
      value,
      this.activeModule.id,
      field.type === 'number' ? 'GENERIC' : 'TEXT'
    );

    delete this.pendingFieldValues[fieldId];
    this.calculateActiveModule();
    this.render();
  }

  calculateActiveModule() {
    if (!this.activeModule || typeof this.activeModule.calculate !== "function") {
      return { isComplete: false, results: [] };
    }
    return this.activeModule.calculate(QC_DATA);
  }

  // --- Rendering & Interceptor Logic ---

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

  renderDependencyInterceptor(type, callbackName) {
    return `
      <div class="fw-detached-banner">
        <p><strong>${type} Required</strong></p>
        <p>This module requires a ${type} to function. Please enter an ID or select an existing one to continue.</p>
        <div class="fw-context-entry" style="margin-top:10px;">
          <input type="text" id="interceptor-input" placeholder="e.g. ${type === 'Core ID' ? '457' : 'RICE-001'}">
          <button type="button" class="fw-btn fw-btn-primary" 
                  onclick="QC.resolveDependency('${callbackName}', document.getElementById('interceptor-input').value)">
            Use This
          </button>
        </div>
      </div>
    `;
  }

  resolveDependency(callbackName, value) {
    if (!value) return;
    this[callbackName](value);
  }

  renderInputFields(moduleObj) {
    const fields = moduleObj.fields || [];
    
    // Negotiation: Check for missing dependencies
    const needsCore = fields.some(f => f.dataTarget?.includes('core'));
    if (needsCore && !QC_DATA.getCore()) {
      return this.renderDependencyInterceptor("Core ID", "setCoreContext");
    }

    if (fields.length === 0) return `<p class="fw-empty-state">No input fields required for this step.</p>`;
    
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

  // --- Context Handlers ---
  setCoreContext(coreId) { if(coreId) { QC_DATA.setContext({ coreId: String(coreId) }); this.render(); } }
  setRiceTestContext(testId) { if(testId) { QC_DATA.setContext({ riceTestId: String(testId) }); QC_DATA.ensureRiceTest(testId); this.render(); } }
  setGmmSource(testId) { if(QC_DATA.getCore()) { QC_DATA.setCoreReference("gmmTestId", testId); this.render(); } }
  renderContextBar() { /* ... unchanged ... */ }
  renderProcedureSteps() { /* ... unchanged ... */ }
}
