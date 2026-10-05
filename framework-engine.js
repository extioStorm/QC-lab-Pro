/**
 * QC Lab Framework Core Engine
 * 
 * AI CONTEXT: See modules/registry.js for application architecture
 * and cross-file contracts.
 */

class QCLabFramework {
  constructor(rootContainerId) {
    this.container = document.getElementById(rootContainerId);
    this.activeModule = null;
    
    // Application Modes: "speed" | "interactive" | "training"
    this.mode = "interactive"; 
    this.stepIndex = 0;

    // DATA ARCHITECTURE
    this.formData = {};
    this.stagedData = {};
    this.trainingGuesses = {};
    
    // Explicitly tracked calculated fields attached to ground truth
    this.attachedCalculations = new Set();
  }

  mountModule(moduleObj) {
    if (!moduleObj || !moduleObj.id) {
      console.error("Invalid module object passed to mountModule()");
      return;
    }

    this.activeModule = moduleObj;
    this.stepIndex = 0;
    this.attachedCalculations.clear();
    this.trainingGuesses = {};

    // Restore or initialize draft state for this module
    this.loadDraftState();

    // Dynamically sync header module title if header element exists
    const titleEl = document.getElementById("active-module-title");
    if (titleEl) {
      titleEl.textContent = moduleObj.title;
    }

    this.render();
  }

  setMode(newMode) {
    if (["speed", "interactive", "training"].includes(newMode)) {
      this.mode = newMode;
      this.stepIndex = 0; // Reset step progression when changing modes
      this.render();
    }
  }

  setStep(newStepIndex) {
    if (!this.activeModule || !this.activeModule.steps) return;
    if (newStepIndex >= 0 && newStepIndex < this.activeModule.steps.length) {
      this.stepIndex = newStepIndex;
      this.render();
    }
  }

  loadDraftState() {
    if (!this.activeModule) return;
    const storageKey = `QC_DRAFT_${this.activeModule.id}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        this.formData = JSON.parse(saved);
      } catch (e) {
        this.formData = {};
      }
    } else {
      this.formData = {};
    }
  }

  saveDraftState() {
    if (!this.activeModule) return;
    const storageKey = `QC_DRAFT_${this.activeModule.id}`;
    localStorage.setItem(storageKey, JSON.stringify(this.formData));
  }

  updateFieldValue(fieldId, value) {
    this.formData[fieldId] = value;
    this.saveDraftState();

    // Continuous updates in Speed Mode
    if (this.mode === "speed") {
      this.render();
    }
  }

  attachCalculation() {
    if (!this.activeModule) return;
    this.attachedCalculations.add("ALL_COMPUTED");
    this.saveDraftState();
    this.render();
  }

  sanitizeId(str) {
    return String(str).replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  checkTrainingGuess(fieldLabel, targetValue) {
    const safeId = this.sanitizeId(fieldLabel);
    const guessInput = document.getElementById(`guess-input-${safeId}`);
    const feedbackEl = document.getElementById(`guess-feedback-${safeId}`);
    
    if (!guessInput || !feedbackEl) return;

    const userGuess = parseFloat(guessInput.value);
    const target = parseFloat(targetValue);

    if (isNaN(userGuess)) {
      feedbackEl.innerHTML = `<span style="color: #f44336; font-size: 0.85rem;">Please enter a numeric guess.</span>`;
      return;
    }

    const diff = Math.abs(userGuess - target);
    const isMatched = diff <= 0.005;

    if (isMatched) {
      feedbackEl.innerHTML = `
        <div style="color: #81c784; margin-top: 8px; font-size: 0.85rem;">
          ✓ Correct! Precision match within ${diff.toFixed(4)}.
          <button type="button" class="fw-btn fw-btn-primary" style="margin-left: 8px; padding: 4px 8px; font-size: 0.75rem;" 
                  onclick="QC.commitTrainingValue('${fieldLabel}', '${targetValue}')">
            Commit
          </button>
        </div>
      `;
    } else {
      const direction = userGuess > target ? "high" : "low";
      feedbackEl.innerHTML = `
        <div style="color: #ffb74d; margin-top: 8px; font-size: 0.85rem;">
          ⚠️ Off by ${diff.toFixed(4)} (${direction}). Double-check your calculation!
        </div>
      `;
    }
  }

  commitTrainingValue(fieldLabel, targetValue) {
    this.attachedCalculations.add(fieldLabel);
    this.attachedCalculations.add("ALL_COMPUTED");
    this.saveDraftState();
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.activeModule) {
      this.container.innerHTML = `<div class="fw-card"><p>No active module selected.</p></div>`;
      return;
    }

    const m = this.activeModule;
    const computedData = m.compute ? m.compute(this.formData) : [];

    this.container.innerHTML = `
      <div class="fw-card">
        <!-- Module Header & Mode Selector -->
        <div class="fw-module-header">
          <div class="fw-header-titles">
            <h2>${m.title}</h2>
            <span class="fw-header-sub">${m.submodule || m.parentModule || ''}</span>
          </div>
          
          <div class="fw-mode-selector">
            <button type="button" class="fw-btn ${this.mode === 'speed' ? 'fw-btn-primary' : ''}" onclick="QC.setMode('speed')">Speed</button>
            <button type="button" class="fw-btn ${this.mode === 'interactive' ? 'fw-btn-primary' : ''}" onclick="QC.setMode('interactive')">Interactive</button>
            <button type="button" class="fw-btn ${this.mode === 'training' ? 'fw-btn-primary' : ''}" onclick="QC.setMode('training')">Training</button>
          </div>
        </div>

        <!-- Mode-Specific Step Guidance (Interactive / Training) -->
        ${this.renderProcedureSteps(m)}

        <!-- Input Fields -->
        <h3 class="fw-section-heading">Raw Measured Inputs</h3>
        <div class="fw-grid">
          ${this.renderInputFields(m)}
        </div>

        <!-- Calculated Outputs -->
        <h3 class="fw-section-heading">Calculated Results</h3>
        ${this.renderCalculatedSection(computedData)}
      </div>
    `;
  }

  renderInputFields(moduleObj) {
    const fields = moduleObj.fields || [];
    
    // In Interactive mode, filter inputs to current step if specified, or render all
    const activeFields = (this.mode === "interactive" && moduleObj.steps && moduleObj.steps.length > 0)
      ? fields.filter(f => !f.stepNum || f.stepNum === (this.stepIndex + 1))
      : fields;

    if (activeFields.length === 0) {
      return `<p style="opacity: 0.6; font-size: 0.85rem;">No input fields required for this step.</p>`;
    }

    return activeFields.map(f => `
      <div class="fw-input-group">
        <label for="field-${f.id}">
          ${f.label}${f.unit ? `<span class="fw-field-unit"> (${f.unit})</span>` : ''}
        </label>
        <input id="field-${f.id}"
               type="${f.type || 'text'}" 
               value="${this.formData[f.id] || ''}" 
               placeholder="${f.placeholder || ''}" 
               oninput="QC.updateFieldValue('${f.id}', this.value)">
      </div>
    `).join('');
  }

  renderProcedureSteps(moduleObj) {
    if (!moduleObj.steps || moduleObj.steps.length === 0) return '';

    // SPEED MODE: Compact overview of steps
    if (this.mode === "speed") {
      return `
        <details class="fw-disclosure">
          <summary>Procedure Guidance (${moduleObj.steps.length} Steps)</summary>
          <div class="fw-disclosure-body">
            ${moduleObj.steps.map(s => `
              <div class="fw-step-item">
                <strong>Step ${s.num}:${s.title}</strong>
                <p>${s.description}</p>
              </div>
            `).join('')}
          </div>
        </details>
      `;
    }

    // INTERACTIVE MODE: Step-by-Step wizard progression
    if (this.mode === "interactive") {
      const currentStep = moduleObj.steps[this.stepIndex] || moduleObj.steps[0];
      const isFirst = this.stepIndex === 0;
      const isLast = this.stepIndex === moduleObj.steps.length - 1;

      return `
        <div class="fw-step-wizard">
          <div class="fw-step-header">
            <span class="fw-step-badge">Step ${currentStep.num} of ${moduleObj.steps.length}</span>
            <strong class="fw-step-title">${currentStep.title}</strong>
          </div>
          <p class="fw-step-desc">${currentStep.description}</p>
          ${currentStep.guidance ? `<div class="fw-step-guidance">📋 ${currentStep.guidance}</div>` : ''}
          
          <div class="fw-step-nav">
            <button type="button" class="fw-btn fw-btn-secondary" ${isFirst ? 'disabled' : ''} onclick="QC.setStep(${this.stepIndex - 1})">
              ◄ Previous
            </button>
            <button type="button" class="fw-btn fw-btn-primary" ${isLast ? 'disabled' : ''} onclick="QC.setStep(${this.stepIndex + 1})">
              Next Step ►
            </button>
          </div>
        </div>
      `;
    }

    // TRAINING MODE: Full list with learning callouts
    if (this.mode === "training") {
      return `
        <div class="fw-steps-list">
          <h3 class="fw-section-heading">Training & Procedure Guidance</h3>
          ${moduleObj.steps.map(s => `
            <div class="fw-step-item fw-learning-block">
              <strong>Step ${s.num}:${s.title}</strong>
              <p>${s.description}</p>${s.learning ? `<div class="fw-learning-note">💡 <em>${s.learning}</em></div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  renderCalculatedSection(computedData) {
    const results = Array.isArray(computedData) ? computedData : (computedData.results || []);
    const stepMath = computedData.stepMath || [];
    const isComplete = computedData.isComplete;

    if (!results || results.length === 0) {
      return `<p style="opacity: 0.6;">No calculations defined for this module.</p>`;
    }

    // SPEED MODE: Live output cards
    if (this.mode === "speed") {
      return `
        <div class="fw-results-grid">
          ${results.map(res => `
            <div class="fw-result-card fw-result-active">
              <span class="fw-result-label">${res.label}</span>
              <span class="fw-result-value">${res.value}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // INTERACTIVE MODE: Exposed Whiteboard Hand Math
    if (this.mode === "interactive") {
      const isAttached = this.attachedCalculations.has("ALL_COMPUTED");

      if (!isComplete) {
        return `
          <div class="fw-detached-banner">
            <p style="margin: 0;">Fill in all required weights above to reveal step-by-step calculations.</p>
          </div>
        `;
      }

      return `
        <div class="fw-whiteboard-container" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <h4 style="margin: 0 0 12px 0; color: #81c784; font-size: 0.95rem;">🧮 Interactive Step-by-Step Hand Math</h4>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${stepMath.map(m => `
              <div style="background: rgba(255,255,255,0.04); border-left: 3px solid #81c784; padding: 10px 12px; border-radius: 4px;">
                <div style="font-weight: 600; font-size: 0.85rem; color: #e0e0e0; margin-bottom: 4px;">${m.stepName}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">Formula: ${m.formula}</div>
                <div style="font-size: 0.9rem; margin-top: 4px; font-family: monospace; color: #fff;">
                  ${m.calculation} = <strong style="color: #81c784; font-size: 1rem;">${m.result}</strong>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 16px; text-align: right;">
            ${!isAttached ? `
              <button type="button" class="fw-btn fw-btn-primary" onclick="QC.attachCalculation()">
                ⚡ Compute & Attach Results
              </button>
            ` : `
              <span style="color: #81c784; font-weight: 600; font-size: 0.88rem;">
                ✓ Results Attached to Official Record
              </span>
            `}
          </div>
        </div>

        <div class="fw-results-grid">
          ${results.map(res => `
            <div class="fw-result-card ${isAttached ? 'fw-result-active' : ''}">
              <span class="fw-result-label">${res.label}</span>
              <span class="fw-result-value ${isAttached ? '' : 'fw-value-attached'}">${isAttached ? res.value : 'Pending Commit'}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // TRAINING MODE: Practice guess validation
    if (this.mode === "training") {
      const isAttached = this.attachedCalculations.has("ALL_COMPUTED");

      if (isAttached) {
        return `
          <div class="fw-results-grid">
            ${results.map(res => `
              <div class="fw-result-card fw-result-active">
                <span class="fw-result-label">${res.label} (Verified)</span>
                <span class="fw-result-value">${res.value}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="fw-training-container">
          <h4 class="fw-training-title">🎓 Practice Calculation Test</h4>
          ${results.map(res => {
            const safeId = this.sanitizeId(res.label);
            return `
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-size: 0.85rem; margin-bottom: 4px;">Enter hand calculation for <strong>${res.label}</strong>:</label>
                <div style="display: flex; gap: 8px;">
                  <input type="number" step="any" id="guess-input-${safeId}" placeholder="Your calculated guess..." style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--input-bg); color: #fff;">
                  <button type="button" class="fw-btn fw-btn-primary" onclick="QC.checkTrainingGuess('${res.label}', '${res.value}')">Check</button>
                </div>
                <div id="guess-feedback-${safeId}"></div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }
}
