/**
 * QC Lab Framework Core Engine (Complete Refactored v2.1.3)
 */

class QCLabFramework {
  constructor(rootContainerId) {
    this.container = document.getElementById(rootContainerId);
    this.activeModule = null;
    this.mode = "interactive";
    this.stepIndex = 0;
    this.attachedCalculations = new Set();
    this.pendingFieldValues = {};
    this.store = window.QC_DATA;
  }

  // --- Envelope-Aware View Helpers ---
  unenvelope(data) {
    return (data && typeof data === 'object' && 'value' in data) ? data.value : data;
  }

  // --- Core Lifecycle ---
  mountModule(moduleObj) {
    if (!moduleObj || !moduleObj.id) return;
    this.activeModule = moduleObj;
    this.stepIndex = 0;
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

  // --- Dependency Resolution ---
  resolveDependency(callbackName, value) {
    if (!value) return;
    this[callbackName](value);
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

  // --- Calculations & Updates ---
  getFieldValue(field) {
    if (!this.store) return "";
    if (Object.prototype.hasOwnProperty.call(this.pendingFieldValues, field.id)) {
      return this.pendingFieldValues[field.id];
    }
    const raw = this.store.getField(field.dataTarget || "core.measurements", field.dataKey || field.id);
    return this.unenvelope(raw) ?? "";
  }

  updateFieldValue(fieldId, value) {
    this.pendingFieldValues[fieldId] = value;
  }

  commitFieldValue(fieldId, value) {
    const field = (this.activeModule?.fields || []).find(f => f.id === fieldId);
    if (!field || !this.store) return;

    this.store.setField(
      field.dataTarget || "core.measurements",
      field.dataKey || field.id,
      value,
      this.activeModule.id,
      field.type === 'number' ? 'GENERIC' : 'TEXT'
    );
    delete this.pendingFieldValues[fieldId];
    this.render();
  }

  calculateActiveModule() {
    return (this.activeModule && typeof this.activeModule.calculate === "function") 
           ? this.activeModule.calculate(this.store) 
           : { results: [] };
  }

  // --- Rendering UI ---
  render() {
    if (!this.container) return;
    if (!this.activeModule) return;

    const m = this.activeModule;
    const subLabel = (m.submodule || m.parentModule || "");

    this.container.innerHTML = `
      <div class="fw-card">
        ${this.renderContextBar()}
        <div class="fw-module-header">
          <div class="fw-header-titles">
            <h2>${m.title}</h2>
            ${subLabel ? `<span class="fw-header-sub">${subLabel}</span>` : ""}
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
        <div id="fw-calculated-results">${this.renderCalculatedSection(this.calculateActiveModule(), m)}</div>
      </div>
    `;
  }

  renderContextBar() {
    const project = this.store.getProject();
    const session = this.store.getSession();
    const core = this.store.getCore();
    const gmm = this.store.getApplicableGmm();
    
    return `
      <div class="fw-context-bar">
        <div><strong>Project:</strong> ${project?.name || this.store.context.projectId}</div>
        <div><strong>Session:</strong> ${session?.label || this.store.context.sessionId}</div>
        <div class="fw-context-control">
          <label>Current Core</label>
          <div class="fw-context-entry">
            <input id="qc-core-id" type="text" value="${core?.id || ""}" autocomplete="off">
            <button type="button" class="fw-btn fw-btn-secondary" onclick="QC.setCoreContext(document.getElementById('qc-core-id').value)">Open</button>
          </div>
        </div>
        <div class="fw-context-control">
          <label>Rice/GMM Record</label>
          <div class="fw-context-entry">
            <input id="qc-rice-test-id" type="text" value="${this.store.context.riceTestId || ""}" autocomplete="off">
            <button type="button" class="fw-btn fw-btn-secondary" onclick="QC.setRiceTestContext(document.getElementById('qc-rice-test-id').value)">Open</button>
          </div>
        </div>
        <div class="fw-context-control">
          <label>Applicable GMM</label>
          <select id="qc-gmm-source" onchange="QC.setGmmSource(this.value)">
            <option value="">Project/spec value</option>
            ${Object.entries(this.store.getRiceTests()).map(([id, test]) => `
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
    const needsCore = fields.some(f => f.dataTarget?.includes('core'));
    
    if (needsCore && !this.store.getCore()) {
      return this.renderDependencyInterceptor("Core ID", "setCoreContext");
    }

    if (fields.length === 0) return `<p class="fw-empty-state">No input fields.</p>`;
    
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

  renderCalculatedSection(calculatedData, moduleObj) {
    const results = Array.isArray(calculatedData) ? calculatedData : (calculatedData?.results || []);
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

  renderProcedureSteps(m) {
    if (!m.steps?.length) return "";
    const currentStep = m.steps[this.stepIndex] || m.steps[0];
    return `
      <div class="fw-step-wizard">
        <div class="fw-step-header"><span class="fw-step-badge">Step ${currentStep.num}</span></div>
        <p class="fw-step-title">${currentStep.title}</p>
        <p class="fw-step-desc">${currentStep.description}</p>
      </div>
    `;
  }

  // --- Context Handlers ---
  setCoreContext(coreId) { if(coreId) { this.store.setContext({ coreId: String(coreId) }); this.render(); } }
  setRiceTestContext(testId) { if(testId) { this.store.setContext({ riceTestId: String(testId) }); this.store.ensureRiceTest(testId); this.render(); } }
  setGmmSource(testId) { if(this.store.getCore()) { this.store.setCoreReference("gmmTestId", testId); this.render(); } }
}
