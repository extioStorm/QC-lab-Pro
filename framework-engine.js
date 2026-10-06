/**
 * QC Lab Framework Core Engine (Refactored v2.1.2 - Scope Fixed)
 */

class QCLabFramework {
  constructor(rootContainerId) {
    this.container = document.getElementById(rootContainerId);
    this.activeModule = null;
    this.mode = "interactive";
    this.stepIndex = 0;
    this.attachedCalculations = new Set();
    this.pendingFieldValues = {};
    // Use this.store for all interactions
    this.store = window.QC_DATA;
  }

  // --- Envelope-Aware View Helpers ---
  unenvelope(data) {
    return (data && typeof data === 'object' && 'value' in data) ? data.value : data;
  }

  mountModule(moduleObj) {
    if (!moduleObj || !moduleObj.id) return;
    this.activeModule = moduleObj;
    this.stepIndex = 0;
    this.pendingFieldValues = {};
    this.render();
  }

  // --- Core Action Methods (FIXED: Using this.store) ---
  setCoreContext(coreId) { 
    if(!coreId) return; 
    console.log("Setting core to:", coreId);
    this.store.setContext({ coreId: String(coreId) }); 
    this.render(); 
  }
  
  setRiceTestContext(testId) { 
    if(!testId) return; 
    this.store.setContext({ riceTestId: String(testId) }); 
    this.store.ensureRiceTest(testId); 
    this.render(); 
  }

  setGmmSource(testId) { 
    if(this.store.getCore()) { 
      this.store.setCoreReference("gmmTestId", testId); 
      this.render(); 
    } 
  }

  // --- Rendering Helpers ---
  resolveDependency(callbackName, value) {
    if (!value) return;
    // Call the method on 'this' context
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

  render() {
    if (!this.container) return;
    if (!this.activeModule) return;

    const m = this.activeModule;
    // Guard against 'undefined' labels
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
  
  // (Include previous helper methods here: renderInputFields, renderCalculatedSection, etc)
  renderInputFields(moduleObj) {
    const fields = moduleObj.fields || [];
    const needsCore = fields.some(f => f.dataTarget?.includes('core'));
    if (needsCore && !this.store.getCore()) {
      return this.renderDependencyInterceptor("Core ID", "setCoreContext");
    }
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
  
  // (Paste your getFieldValue, commitFieldValue, calculateActiveModule, renderContextBar, etc. from previous version below here)
  getFieldValue(field) {
    const raw = this.store.getField(field.dataTarget || "core.measurements", field.dataKey || field.id);
    return this.unenvelope(raw) ?? "";
  }
  
  commitFieldValue(fieldId, value) {
    const field = (this.activeModule?.fields || []).find(f => f.id === fieldId);
    if (!field) return;
    this.store.setField(field.dataTarget || "core.measurements", field.dataKey || field.id, value, this.activeModule.id, 'GENERIC');
    delete this.pendingFieldValues[fieldId];
    this.render();
  }
  
  calculateActiveModule() {
    return (this.activeModule && typeof this.activeModule.calculate === "function") ? this.activeModule.calculate(this.store) : { results: [] };
  }
  
  renderCalculatedSection(calculatedData, moduleObj) {
    const results = Array.isArray(calculatedData) ? calculatedData : (calculatedData?.results || []);
    return `<div class="fw-results-grid">${results.map(res => `<div class="fw-result-card fw-result-active"><span class="fw-result-label">${res.label}</span><span class="fw-result-value">${this.unenvelope(res.value)}</span></div>`).join("")}</div>`;
  }
}
