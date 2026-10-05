/**
 * QC Lab Framework Core Engine
 *
 * The framework is intentionally NOT the laboratory database.
 *
 * Responsibilities:
 *   1. Control the screen and workflow.
 *   2. Ask the active module what it needs displayed.
 *   3. Read/write values through QC_DATA.
 *   4. Keep navigation/mode state.
 *
 * The shared project data lives in data-model.js.
 * A module describes a procedure and performs its procedure-specific
 * calculations against the shared records.
 */

class QCLabFramework {
  constructor(rootContainerId) {
    this.container = document.getElementById(rootContainerId);
    this.activeModule = null;
    this.mode = "interactive";
    this.stepIndex = 0;
    this.attachedCalculations = new Set();
    this.trainingGuesses = {};
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

    this.render();
  }

  setMode(newMode) {
    if (["speed", "interactive", "training"].includes(newMode)) {
      this.mode = newMode;
      this.stepIndex = 0;
      this.render();
    }
  }

  setStep(newStepIndex) {
    if (!this.activeModule?.steps) return;
    if (newStepIndex >= 0 && newStepIndex < this.activeModule.steps.length) {
      this.stepIndex = newStepIndex;
      this.render();
    }
  }

  /**
   * The current field value comes from the shared project record.
   * There is no module-specific formData copy anymore.
   */
  getFieldValue(field) {
    if (!window.QC_DATA) return "";
    return QC_DATA.getField(field.dataTarget || "core.measurements", field.id) ?? "";
  }

  updateFieldValue(fieldId, value) {
    const field = (this.activeModule?.fields || []).find(f => f.id === fieldId);
    if (!field || !window.QC_DATA) return;

    QC_DATA.setField(
      field.dataTarget || "core.measurements",
      field.dataKey || field.id,
      value
    );

    if (this.mode === "speed") {
      this.render();
    }
  }

  /**
   * Recalculate the active procedure and let it write its calculated values
   * back into the shared data model.
   *
   * This is deliberately different from the old:
   *     formData -> compute() -> temporary results
   *
   * The new model is:
   *     shared records -> procedure calculation -> shared records
   *
   * The calculation is still explicit; nothing automatically recalculates
   * because some unrelated field changed unless the user/module asks it to.
   */
  calculateActiveModule() {
    if (!this.activeModule || typeof this.activeModule.calculate !== "function") {
      return { isComplete: false, results: [] };
    }

    return this.activeModule.calculate(QC_DATA);
  }

  attachCalculation() {
    if (!this.activeModule) return;

    const calculated = this.calculateActiveModule();

    if (calculated.isComplete !== false) {
      this.attachedCalculations.add("ALL_COMPUTED");
      this.render();
    }
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
      feedbackEl.textContent = "Please enter a numeric guess.";
      return;
    }

    const diff = Math.abs(userGuess - target);

    if (diff <= 0.005) {
      feedbackEl.innerHTML = `
        <div class="fw-training-success">
          ✓ Correct! Precision match within ${diff.toFixed(4)}.
          <button type="button" class="fw-btn fw-btn-primary"
                  onclick="QC.commitTrainingValue('${fieldLabel}', '${targetValue}')">
            Commit
          </button>
        </div>
      `;
    } else {
      const direction = userGuess > target ? "high" : "low";
      feedbackEl.innerHTML = `
        <div class="fw-training-warning">
          ⚠️ Off by ${diff.toFixed(4)} (${direction}). Double-check your calculation.
        </div>
      `;
    }
  }

  commitTrainingValue() {
    this.attachedCalculations.add("ALL_COMPUTED");
    this.render();
  }

  /**
   * Context controls operate on the shared data model, not on a module.
   */
  setCoreContext(coreId) {
    if (!coreId) return;
    QC_DATA.setContext({ coreId: String(coreId) });
    this.render();
  }

  setRiceTestContext(testId) {
    if (!testId) return;
    QC_DATA.setContext({ riceTestId: String(testId) });
    QC_DATA.ensureRiceTest(String(testId));
    QC_DATA.save();
    this.render();
  }

  setGmmSource(testId) {
    if (!QC_DATA.getCore()) return;
    QC_DATA.setCoreReference("gmmTestId", testId);
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!this.activeModule) {
      this.container.innerHTML = `<div class="fw-card"><p>No active module selected.</p></div>`;
      return;
    }

    const m = this.activeModule;

    // Calculations are explicit. Rendering does not silently invent a new
    // copy of the application's data.
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
        <div class="fw-grid">
          ${this.renderInputFields(m)}
        </div>

        <h3 class="fw-section-heading">Calculated Results</h3>
        ${this.renderCalculatedSection(calculatedData)}
      </div>
    `;
  }

  renderContextBar() {
    const project = QC_DATA.getProject();
    const session = QC_DATA.getSession();
    const core = QC_DATA.getCore();
    const gmm = QC_DATA.getApplicableGmm();
    const coreIds = Object.keys(session?.cores || {});

    return `
      <div class="fw-context-bar">
        <div>
          <strong>Project:</strong> ${project?.name || QC_DATA.context.projectId}
        </div>
        <div>
          <strong>Session:</strong> ${session?.label || QC_DATA.context.sessionId}
        </div>
        <div class="fw-context-control">
          <label for="qc-core-id">Core</label>
          <input id="qc-core-id" type="text"
                 value="${core?.id || ""}"
                 placeholder="e.g. 457"
                 onchange="QC.setCoreContext(this.value)">
          ${coreIds.length ? `<small>Existing: ${coreIds.join(", ")}</small>` : ""}
        </div>
        <div class="fw-context-control">
          <label for="qc-rice-test-id">Rice/GMM test record</label>
          <input id="qc-rice-test-id" type="text"
                 value="${QC_DATA.context.riceTestId || ""}"
                 placeholder="e.g. RICE-001"
                 onchange="QC.setRiceTestContext(this.value)">
          <small>Use this when editing a Rice/GMM test record.</small>
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
          <small>${gmm ? `Using ${gmm.sourceLabel}: ${gmm.value}` : "No Rice/GMM test linked yet."}</small>
        </div>
      </div>
    `;
  }

  renderInputFields(moduleObj) {
    const fields = moduleObj.fields || [];

    const activeFields =
      this.mode === "interactive" && moduleObj.steps?.length
        ? fields.filter(f => !f.stepNum || f.stepNum === this.stepIndex + 1)
        : fields;

    if (!QC_DATA.getCore()) {
      return `<p class="fw-empty-state">Enter a Core number above before entering laboratory measurements.</p>`;
    }

    if (activeFields.length === 0) {
      return `<p class="fw-empty-state">No input fields required for this step.</p>`;
    }

    return activeFields.map(f => `
      <div class="fw-input-group">
        <label for="field-${f.id}">
          ${f.label}${f.unit ? `<span class="fw-field-unit"> (${f.unit})</span>` : ""}
        </label>
        <input id="field-${f.id}"
               type="${f.type || "text"}"
               value="${this.getFieldValue(f)}"
               placeholder="${f.placeholder || ""}"
               oninput="QC.updateFieldValue('${f.id}', this.value)">
      </div>
    `).join("");
  }

  renderProcedureSteps(moduleObj) {
    if (!moduleObj.steps?.length) return "";

    if (this.mode === "speed") {
      return `
        <details class="fw-disclosure">
          <summary>Procedure Guidance (${moduleObj.steps.length} Steps)</summary>
          <div class="fw-disclosure-body">
            ${moduleObj.steps.map(s => `
              <div class="fw-step-item">
                <strong>Step ${s.num}: ${s.title}</strong>
                <p>${s.description}</p>
              </div>
            `).join("")}
          </div>
        </details>
      `;
    }

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
          ${currentStep.guidance ? `<div class="fw-step-guidance">📋 ${currentStep.guidance}</div>` : ""}
          <div class="fw-step-nav">
            <button type="button" class="fw-btn fw-btn-secondary" ${isFirst ? "disabled" : ""} onclick="QC.setStep(${this.stepIndex - 1})">◄ Previous</button>
            <button type="button" class="fw-btn fw-btn-primary" ${isLast ? "disabled" : ""} onclick="QC.setStep(${this.stepIndex + 1})">Next Step ►</button>
          </div>
        </div>
      `;
    }

    if (this.mode === "training") {
      return `
        <div class="fw-steps-list">
          <h3 class="fw-section-heading">Training & Procedure Guidance</h3>
          ${moduleObj.steps.map(s => `
            <div class="fw-step-item fw-learning-block">
              <strong>Step ${s.num}: ${s.title}</strong>
              <p>${s.description}</p>
              ${s.learning ? `<div class="fw-learning-note">💡 <em>${s.learning}</em></div>` : ""}
            </div>
          `).join("")}
        </div>
      `;
    }

    return "";
  }

  renderCalculatedSection(calculatedData) {
    const results = Array.isArray(calculatedData)
      ? calculatedData
      : (calculatedData?.results || []);

    const stepMath = calculatedData?.stepMath || [];
    const isComplete = calculatedData?.isComplete !== false;

    if (!results.length) {
      return `<p class="fw-empty-state">No calculated values defined for this module.</p>`;
    }

    if (calculatedData?.error) {
      return `
        <div class="fw-detached-banner">
          <p style="margin:0;">${calculatedData.error}</p>
        </div>
      `;
    }

    if (this.mode === "speed") {
      return `
        <div class="fw-results-grid">
          ${results.map(res => `
            <div class="fw-result-card fw-result-active">
              <span class="fw-result-label">${res.label}</span>
              <span class="fw-result-value">${res.value}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (this.mode === "interactive") {
      if (!isComplete) {
        return `
          <div class="fw-detached-banner">
            <p style="margin:0;">Fill in the required measurements above to reveal the explicit calculation steps.</p>
          </div>
        `;
      }

      const isAttached = this.attachedCalculations.has("ALL_COMPUTED");

      return `
        <div class="fw-whiteboard-container">
          <h4>🧮 Explicit Calculation Steps</h4>
          ${stepMath.map(step => `
            <div class="fw-math-step">
              <strong>${step.stepName}</strong>
              <div class="fw-math-formula">${step.formula}</div>
              <div>${step.calculation} = <strong>${step.result}</strong></div>
            </div>
          `).join("")}

          <div class="fw-attach-row">
            ${isAttached
              ? `<span class="fw-success">✓ Results attached to the shared project record.</span>`
              : `<button type="button" class="fw-btn fw-btn-primary" onclick="QC.attachCalculation()">⚡ Attach Results</button>`}
          </div>
        </div>

        <div class="fw-results-grid">
          ${results.map(res => `
            <div class="fw-result-card ${isAttached ? "fw-result-active" : ""}">
              <span class="fw-result-label">${res.label}</span>
              <span class="fw-result-value">${isAttached ? res.value : "Pending Attach"}</span>
            </div>
          `).join("")}
        </div>
      `;
    }

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
            `).join("")}
          </div>
        `;
      }

      return `
        <div class="fw-training-container">
          <h4 class="fw-training-title">🎓 Practice Calculation Test</h4>
          ${results.map(res => {
            if (res.numericValue === undefined) return "";
            const safeId = this.sanitizeId(res.label);
            return `
              <div class="fw-training-row">
                <label>Enter hand calculation for <strong>${res.label}</strong>:</label>
                <div class="fw-training-input-row">
                  <input type="number" step="any" id="guess-input-${safeId}" placeholder="Your answer...">
                  <button type="button" class="fw-btn fw-btn-primary" onclick="QC.checkTrainingGuess('${res.label}', '${res.numericValue}')">Check</button>
                </div>
                <div id="guess-feedback-${safeId}"></div>
              </div>
            `;
          }).join("")}
        </div>
      `;
    }

    return "";
  }
}
