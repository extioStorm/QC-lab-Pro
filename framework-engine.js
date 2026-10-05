/**
 * QC Lab Framework Engine (v1.0.0)
 * Declarative UI & Calculation Engine
 */
class QCLabFramework {
  constructor(rootContainerId) {
    this.container = document.getElementById(rootContainerId);
    this.activeModule = null;
    this.mode = "interactive"; // "speed" | "interactive" | "learning"
    this.stepIndex = 0;
    this.formData = {};
  }

  mountModule(moduleData) {
    this.activeModule = moduleData;
    this.formData = this.loadDraftState() || {};
    this.stepIndex = 0;
    this.render();
  }

  setMode(newMode) {
    if (["speed", "interactive", "learning"].includes(newMode)) {
      this.mode = newMode;
      this.render();
    }
  }

  setFieldValue(fieldId, value) {
    this.formData[fieldId] = value;
    this.saveDraftState();
    this.updateLiveCalculations();
  }

  saveDraftState() {
    if (!this.activeModule) return;
    try {
      localStorage.setItem(`qc_draft_${this.activeModule.id}`, JSON.stringify(this.formData));
    } catch (e) {}
  }

  loadDraftState() {
    if (!this.activeModule) return null;
    try {
      const saved = localStorage.getItem(`qc_draft_${this.activeModule.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }

  render() {
    if (!this.container || !this.activeModule) return;

    let html = `
      <!-- Global Mode Selector Shell Bar -->
      <div class="fw-depth-bar">
        <button class="fw-mode-btn ${this.mode === 'speed' ? 'active' : ''}" onclick="window.QC.setMode('speed')">Speed Mode</button>
        <button class="fw-mode-btn ${this.mode === 'interactive' ? 'active' : ''}" onclick="window.QC.setMode('interactive')">Interactive</button>
        <button class="fw-mode-btn ${this.mode === 'learning' ? 'active' : ''}" onclick="window.QC.setMode('learning')">Expand All (Learning)</button>
      </div>

      <!-- Module Breadcrumb Header -->
      <div class="fw-breadcrumbs">
        Module: <strong>${this.activeModule.parentModule || ''}</strong> &gt; <strong>${this.activeModule.submodule || ''}</strong>
      </div>
    `;

    if (this.mode === "speed") {
      html += this.renderSpeedView();
    } else if (this.mode === "interactive") {
      html += this.renderInteractiveView();
    } else if (this.mode === "learning") {
      html += this.renderLearningView();
    }

    html += this.renderResultsBar();

    this.container.innerHTML = html;
    this.bindInputListeners();
  }

  renderSpeedView() {
    return `
      <div class="fw-card">
        <h2 class="fw-title" style="margin-bottom: 12px;">Speed Data Entry</h2>
        <div class="fw-grid">
          ${(this.activeModule.fields || []).map(field => this.renderInputField(field)).join('')}
        </div>
      </div>
    `;
  }

  renderInteractiveView() {
    const steps = this.activeModule.steps || [];
    const step = steps[this.stepIndex] || {};
    const fields = this.activeModule.fields || [];
    const stepFields = fields.filter(f => f.stepNum === step.num);
    const totalSteps = steps.length;

    return `
      <div class="fw-card">
        <div class="fw-header-flex">
          <h2 class="fw-title">Step ${step.num || 1}: ${step.title || ''}</h2>
          <span class="fw-badge">Step ${this.stepIndex + 1} of ${totalSteps}</span>
        </div>
        <p class="fw-desc">${step.description || ''}</p>

        <div class="fw-grid">
          ${stepFields.map(field => this.renderInputField(field)).join('')}
        </div>

        <details class="fw-disclosure" open>
          <summary>Step Guidance</summary>
          <div class="fw-disclosure-body">
            <p style="margin:0;">${step.guidance || ''}</p>
          </div>
        </details>

        <div class="fw-btn-row">
          <button class="fw-btn fw-btn-secondary" ${this.stepIndex === 0 ? 'disabled' : ''} onclick="window.QC.prevStep()">&larr; Previous Step</button>
          <button class="fw-btn fw-btn-primary" ${this.stepIndex === totalSteps - 1 ? 'disabled' : ''} onclick="window.QC.nextStep()">Next Step &rarr;</button>
        </div>
      </div>
    `;
  }

  renderLearningView() {
    const steps = this.activeModule.steps || [];
    const fields = this.activeModule.fields || [];

    return `
      <div class="fw-card">
        <h2 class="fw-title" style="margin-bottom: 16px;">Full Procedural Reference (Expanded)</h2>
        ${steps.map(step => {
          const stepFields = fields.filter(f => f.stepNum === step.num);
          return `
            <div class="fw-learning-block">
              <h3 class="fw-title" style="font-size: 1rem; margin-bottom: 8px;">Step ${step.num}:${step.title}</h3>
              <div class="fw-grid">
                ${stepFields.map(field => this.renderInputField(field)).join('')}
              </div>
              <div class="fw-disclosure-body" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 4px;">
                <p style="margin: 0 0 4px 0;"><strong>Action Guidance:</strong> ${step.guidance || ''}</p>
                <p style="margin: 0;"><strong>Technical Principle:</strong> ${step.learning || ''}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderInputField(field) {
    const val = this.formData[field.id] ?? '';
    return `
      <div class="fw-input-group">
        <label>${field.label} ${field.unit ? `(${field.unit})` : ''}</label>
        <input 
          data-field-id="${field.id}" 
          type="${field.type || 'text'}" 
          placeholder="${field.placeholder || ''}" 
          value="${val}"
        >
      </div>
    `;
  }

  renderResultsBar() {
    const outputs = typeof this.activeModule.compute === 'function' ? this.activeModule.compute(this.formData) : [];
    return `
      <div class="fw-results-card">
        <h3 style="margin: 0 0 12px 0; font-size: 0.95rem; color: #a5d6a7;">Calculated Results</h3>
        <div class="fw-results-grid">
          ${outputs.map(out => `
            <div class="fw-result-item">
              <span>${out.label}</span>
              <strong data-res-label="${out.label}">${out.value}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindInputListeners() {
    this.container.querySelectorAll(".fw-input-group input").forEach(input => {
      input.addEventListener("input", (e) => {
        const fieldId = e.target.getAttribute("data-field-id");
        this.setFieldValue(fieldId, e.target.value);
      });
    });
  }

  updateLiveCalculations() {
    if (typeof this.activeModule.compute !== 'function') return;
    const outputs = this.activeModule.compute(this.formData);
    outputs.forEach(out => {
      const node = this.container.querySelector(`[data-res-label="${out.label}"]`);
      if (node) node.textContent = out.value;
    });
  }

  nextStep() {
    if (this.activeModule && this.stepIndex < this.activeModule.steps.length - 1) {
      this.stepIndex++;
      this.render();
    }
  }

  prevStep() {
    if (this.stepIndex > 0) {
      this.stepIndex--;
      this.render();
    }
  }
}

// Explicit Global Scope Assignment
window.QCLabFramework = QCLabFramework;
