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
    // -----------------
    // this.formData: Single Source of Truth for committed QC record values
    // this.stagedData: Holds auto-populated prequel values or uncommitted calculations
    // this.trainingGuesses: Temporary store for manual calculation practice inputs
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
    this.render();
  }

  setMode(newMode) {
    if (["speed", "interactive", "training"].includes(newMode)) {
      this.mode = newMode;
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

    // In Speed Mode, immediate re-render updates live calculations continuously
    if (this.mode === "speed") {
      this.render();
    }
  }

  // INTERACTIVE MODE: Attach calculated results to ground truth upon Compute trigger
  attachCalculation() {
    if (!this.activeModule) return;
    
    // Mark calculations as attached and execute compute on live ground truth
    this.attachedCalculations.add("ALL_COMPUTED");
    this.saveDraftState();
    this.render();
  }

  // TRAINING MODE: Verify hand-calculated guess against compute() ground truth
  checkTrainingGuess(fieldLabel, targetValue) {
    const guessInput = document.getElementById(`guess-input-${fieldLabel}`);
    const feedbackEl = document.getElementById(`guess-feedback-${fieldLabel}`);
    
    if (!guessInput || !feedbackEl) return;

    const userGuess = parseFloat(guessInput.value);
    const target = parseFloat(targetValue);

    if (isNaN(userGuess)) {
      feedbackEl.innerHTML = `<span style="color: #f44336;">Please enter a numeric guess first.</span>`;
      return;
    }

    const diff = Math.abs(userGuess - target);
    const isMatched = diff <= 0.005; // Precision tolerance

    if (isMatched) {
      feedbackEl.innerHTML = `
        <div style="color: #4caf50; margin-top: 8px;">
          ✓ Correct! Precision match within ${diff.toFixed(4)}.
          <button type="button" class="fw-btn fw-btn-primary" style="margin-left: 8px; padding: 4px 8px;" 
                  onclick="QC.commitTrainingValue('${fieldLabel}', '${targetValue}')">
            Commit to Ground Truth
          </button>
        </div>
      `;
    } else {
      const direction = userGuess > target ? "high" : "low";
      feedbackEl.innerHTML = `
        <div style="color: #ff9800; margin-top: 8px;">
          ⚠️ Off by ${diff.toFixed(4)} (${direction}). Double-check your formula!
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
    const computedResults = m.compute ? m.compute(this.formData) : [];

    this.container.innerHTML = `
      <div class="fw-card">
        <!-- Top Header & Mode Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0;">${m.title}</h2>
            <span style="font-size: 0.8rem; opacity: 0.7;">${m.submodule || m.parentModule || ''}</span>
          </div>
          
          <div class="fw-mode-selector" style="display: flex; gap: 4px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 6px;">
            <button type="button" class="fw-btn ${this.mode === 'speed' ? 'fw-btn-primary' : ''}" onclick="QC.setMode('speed')">Speed</button>
            <button type="button" class="fw-btn ${this.mode === 'interactive' ? 'fw-btn-primary' : ''}" onclick="QC.setMode('interactive')">Interactive</button>
            <button type="button" class="fw-btn ${this.mode === 'training' ? 'fw-btn-primary' : ''}" onclick="QC.setMode('training')">Training</button>
          </div>
        </div>

        <!-- Raw Measurement Input Fields -->
        <h3 style="margin-top: 0;">Raw Measured Inputs</h3>
        <div class="fw-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px;">
          ${(m.fields || []).map(f => `
            <div class="fw-field">
              <label style="display: block; font-size: 0.85rem; margin-bottom: 4px;">${f.label}${f.unit ? `(${f.unit})` : ''}</label>
              <input type="${f.type || 'text'}" 
                     value="${this.formData[f.id] || ''}" 
                     placeholder="${f.placeholder || ''}" 
                     oninput="QC.updateFieldValue('${f.id}', this.value)"
                     style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff;">
            </div>
          `).join('')}
        </div>

        <!-- Calculated Outputs Section -->
        <h3 style="margin-top: 20px;">Calculated Results</h3>
        ${this.renderCalculatedSection(computedResults)}

        <!-- Module Steps Guidance -->
        ${m.steps && m.steps.length > 0 ? `
          <h3 style="margin-top: 24px;">Procedure Steps</h3>
          <div class="fw-steps-list">
            ${m.steps.map(s => `
              <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #1976d2;">
                <strong>Step ${s.num}: ${s.title}</strong>
                <p style="margin: 4px 0 0 0; font-size: 0.9rem;">${s.description}</p>
                ${this.mode === 'training' && s.learning ? `
                  <div style="margin-top: 6px; font-size: 0.85rem; color: #90caf9;">💡 <em>${s.learning}</em></div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderCalculatedSection(computedResults) {
    if (!computedResults || computedResults.length === 0) {
      return `<p style="opacity: 0.6;">No calculations defined for this module.</p>`;
    }

    // 1. SPEED MODE: Always Attached & Live
    if (this.mode === "speed") {
      return `
        <div class="fw-results-grid" style="display: grid; gap: 8px;">
          ${computedResults.map(res => `
            <div style="background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between;">
              <span><strong>${res.label}:</strong></span>
              <span style="font-family: monospace; font-size: 1.1rem;">${res.value}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 2. INTERACTIVE MODE: Detached/Blank until Compute trigger
    if (this.mode === "interactive") {
      const isAttached = this.attachedCalculations.has("ALL_COMPUTED");

      if (!isAttached) {
        return `
          <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 6px; text-align: center; border: 1px dashed rgba(255,255,255,0.2);">
            <p style="margin-bottom: 12px; opacity: 0.8;">Calculated outputs are currently detached from ground truth.</p>
            <button type="button" class="fw-btn fw-btn-primary" onclick="QC.attachCalculation()">
              ⚡ Compute & Attach Results
            </button>
          </div>
        `;
      }

      return `
        <div class="fw-results-grid" style="display: grid; gap: 8px;">
          ${computedResults.map(res => `
            <div style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 4px; display: flex; justify-content: space-between;">
              <span><strong>${res.label}:</strong></span>
              <span style="font-family: monospace; font-size: 1.1rem; color: #90caf9;">${res.value}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 3. TRAINING MODE: Practice Guess First -> Compare -> Attach
    if (this.mode === "training") {
      const isAttached = this.attachedCalculations.has("ALL_COMPUTED");

      if (isAttached) {
        return `
          <div class="fw-results-grid" style="display: grid; gap: 8px;">
            ${computedResults.map(res => `
              <div style="background: rgba(76, 175, 80, 0.15); border: 1px solid #4caf50; padding: 10px; border-radius: 4px; display: flex; justify-content: space-between;">
                <span><strong>${res.label} (Verified):</strong></span>
                <span style="font-family: monospace; font-size: 1.1rem;">${res.value}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div style="background: rgba(21, 101, 192, 0.15); border: 1px solid #1565c0; padding: 16px; border-radius: 6px;">
          <h4 style="margin: 0 0 12px 0; color: #90caf9;">🎓 Practice Calculation Test</h4>
          ${computedResults.map(res => `
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 0.85rem; margin-bottom: 4px;">Enter hand calculation for <strong>${res.label}</strong>:</label>
              <div style="display: flex; gap: 8px;">
                <input type="number" step="any" id="guess-input-${res.label}" placeholder="Your calculated guess..." style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff;">
                <button type="button" class="fw-btn fw-btn-primary" onclick="QC.checkTrainingGuess('${res.label}', '${res.value}')">Check</button>
              </div>
              <div id="guess-feedback-${res.label}"></div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }
}
