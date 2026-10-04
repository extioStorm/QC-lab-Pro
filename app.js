/**
 * Lab Framework - Procedural Knowledge Engine (Prototype v0.2)
 * Handles Perform (Guided), Calculate (Speed), and Reference (Learning) views
 * dynamically driven by a unified Procedure Schema.
 */

// 1. DATA SCHEMA: Single Procedural Knowledge Object
const coreDensityProcedure = {
  id: "gmb_core_density_v1",
  title: "Bulk Specific Gravity & Density of Compacted Cores",
  standard: "AASHTO T 166 / ASTM D2726",
  inputs: {
    station_location: { label: "Station / Location", type: "text", placeholder: "e.g., 104+50 Rt" },
    core_id: { label: "Core ID", type: "text", placeholder: "e.g., C-12" },
    mass_dry_A: { label: "Dry Mass (A)", unit: "g", precision: 1, type: "number" },
    mass_submerged_B: { label: "Submerged Mass (B)", unit: "g", precision: 1, type: "number" },
    mass_ssd_C: { label: "SSD Mass (C)", unit: "g", precision: 1, type: "number" },
    gmm_value: { label: "Max Specific Gravity (Gmm)", unit: "", precision: 3, type: "number" },
    pqi_density: { label: "PQI Gauge Reading", unit: "pcf", precision: 1, type: "number" }
  },
  steps: [
    {
      id: "step_id",
      title: "Core Identification",
      field: "core_id",
      secondary_field: "station_location",
      guidance: "Record the core identifier and pavement station location.",
      learning: "Traceability ensures quality control readings map back to precise physical roadway locations."
    },
    {
      id: "step_A",
      title: "Dry Specimen Mass (A)",
      field: "mass_dry_A",
      guidance: "Dry the core specimen to constant mass and record dry weight in air.",
      learning: "Dry mass (A) is the baseline weight of the core before water absorption."
    },
    {
      id: "step_B",
      title: "Submerged Specimen Mass (B)",
      field: "mass_submerged_B",
      guidance: "Submerge the specimen in water bath for 3–5 minutes and record submerged mass.",
      learning: "Submerged mass (B) reflects Archimedes' principle: upward buoyancy equals displaced water mass."
    },
    {
      id: "step_C",
      title: "Saturated Surface-Dry Mass (C)",
      field: "mass_ssd_C",
      guidance: "Remove specimen, quickly blot surface with damp towel, and record SSD mass.",
      learning: "SSD condition (C) fills internal permeable voids with water while keeping the external surface dry."
    },
    {
      id: "step_gmm",
      title: "Rice Specific Gravity (Gmm)",
      field: "gmm_value",
      guidance: "Enter Gmm from the corresponding Rice Test run for this asphalt mix.",
      learning: "Gmm represents maximum theoretical zero-void density."
    },
    {
      id: "step_pqi",
      title: "PQI Field Gauge Reading",
      field: "pqi_density",
      guidance: "Record the preliminary PQI non-destructive density reading at this core location.",
      learning: "Comparing core density with non-destructive readings establishes daily gauge offsets."
    }
  ]
};

// 2. ENGINE STATE MANAGEMENT
class ProcedureEngine {
  constructor(schema) {
    this.schema = schema;
    this.currentStepIndex = 0;
    this.values = this.loadDraftState() || {
      station_location: "",
      core_id: "",
      mass_dry_A: "",
      mass_submerged_B: "",
      mass_ssd_C: "",
      gmm_value: "",
      pqi_density: ""
    };
    this.ledger = this.loadLedgerState() || [];
  }

  saveDraftState() {
    localStorage.setItem(`draft_${this.schema.id}`, JSON.stringify(this.values));
  }

  loadDraftState() {
    const saved = localStorage.getItem(`draft_${this.schema.id}`);
    return saved ? JSON.parse(saved) : null;
  }

  saveLedgerState() {
    localStorage.setItem(`ledger_${this.schema.id}`, JSON.stringify(this.ledger));
  }

  loadLedgerState() {
    const saved = localStorage.getItem(`ledger_${this.schema.id}`);
    return saved ? JSON.parse(saved) : null;
  }

  updateValue(key, val) {
    this.values[key] = val !== "" ? (isNaN(val) ? val : parseFloat(val)) : "";
    this.saveDraftState();
  }

  // Pure Math Calculation Engine
  calculateResults() {
    const A = parseFloat(this.values.mass_dry_A);
    const B = parseFloat(this.values.mass_submerged_B);
    const C = parseFloat(this.values.mass_ssd_C);
    const Gmm = parseFloat(this.values.gmm_value);
    const PQI = parseFloat(this.values.pqi_density);

    const volume = (C > 0 && B > 0 && C >= B) ? (C - B) : null;
    const Gmb = (A > 0 && volume) ? (A / volume) : null;
    const densityPct = (Gmb && Gmm > 0) ? ((Gmb / Gmm) * 100) : null;
    const bulkDensityPcf = Gmb ? (Gmb * 62.245) : null;
    const pqiOffset = (bulkDensityPcf !== null && !isNaN(PQI)) ? (bulkDensityPcf - PQI) : null;

    return {
      volume: volume ? volume.toFixed(1) : "—",
      Gmb: Gmb ? Gmb.toFixed(3) : "—",
      densityPct: densityPct ? densityPct.toFixed(1) + "%" : "—",
      bulkDensityPcf: bulkDensityPcf ? bulkDensityPcf.toFixed(1) : "—",
      pqiOffset: pqiOffset !== null ? (pqiOffset >= 0 ? `+${pqiOffset.toFixed(1)}` : pqiOffset.toFixed(1)) : "—"
    };
  }

  commitToBook() {
    const results = this.calculateResults();
    if (results.Gmb === "—") {
      alert("Cannot commit: Please complete mass measurements A, B, and C first.");
      return false;
    }

    const record = {
      timestamp: new Date().toISOString(),
      station: this.values.station_location || "N/A",
      core_id: this.values.core_id || "Unlabeled",
      inputs: { ...this.values },
      results
    };

    this.ledger.push(record);
    this.saveLedgerState();
    alert(`Result committed to book! Total logged records: ${this.ledger.length}`);
    return true;
  }
}

// 3. UI CONTROLLER
document.addEventListener("DOMContentLoaded", () => {
  const engine = new ProcedureEngine(coreDensityProcedure);

  // DOM Elements
  const viewButtons = document.querySelectorAll(".view-button");
  const moduleViews = document.querySelectorAll(".module-view");
  const prism = document.querySelector(".prism");
  const sidebar = document.querySelector(".sidebar");
  const menuButton = document.querySelector(".menu-button");

  // Mobile sidebar toggle
  if (menuButton) {
    menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  // View Switching (Perform / Calculate / Reference)
  viewButtons.forEach(button => {
    button.addEventListener("click", () => {
      const targetView = button.getAttribute("data-view");

      viewButtons.forEach(btn => btn.classList.remove("active"));
      moduleViews.forEach(view => view.classList.remove("active"));

      button.classList.add("active");
      const activeView = document.getElementById(`view-${targetView}`);
      if (activeView) activeView.classList.add("active");

      // Prism animation rotation
      if (prism) {
        if (targetView === "perform") prism.style.transform = "perspective(400px) rotateX(8deg) rotateY(-60deg)";
        if (targetView === "calculate") prism.style.transform = "perspective(400px) rotateX(8deg) rotateY(0deg)";
        if (targetView === "reference") prism.style.transform = "perspective(400px) rotateX(8deg) rotateY(60deg)";
      }
    });
  });

  // --- RENDER PERFORM VIEW (Guided Stepper) ---
  function renderPerformStep() {
    const viewPerform = document.getElementById("view-perform");
    const step = engine.schema.steps[engine.currentStepIndex];
    const results = engine.calculateResults();

    const inputDef = engine.schema.inputs[step.field];
    const val = engine.values[step.field] ?? "";

    viewPerform.innerHTML = `
      <div class="view-heading">
        <div>
          <span class="eyebrow">GUIDED PROCEDURE</span>
          <h2>${step.title}</h2>
        </div>
        <span class="status">Step ${engine.currentStepIndex + 1} of ${engine.schema.steps.length}</span>
      </div>

      <div class="step-card">
        <span class="step-number">0${engine.currentStepIndex + 1}</span>
        <div style="flex: 1;">
          <h3>${step.title}</h3>
          <p>${step.guidance}</p>

          <label style="display: block; margin-top: 12px; font-weight: 600;">
            ${inputDef.label} ${inputDef.unit ? `(${inputDef.unit})` : ''}
            <input 
              id="guided-input-main" 
              class="number-input" 
              type="${inputDef.type}" 
              placeholder="${inputDef.placeholder || ''}" 
              value="${val}" 
              style="margin-top: 6px;"
            >
          </label>

          ${step.secondary_field ? `
            <label style="display: block; margin-top: 12px; font-weight: 600;">
              ${engine.schema.inputs[step.secondary_field].label}
              <input 
                id="guided-input-secondary" 
                class="number-input" 
                type="text" 
                placeholder="${engine.schema.inputs[step.secondary_field].placeholder}" 
                value="${engine.values[step.secondary_field] ?? ''}" 
                style="margin-top: 6px;"
              >
            </label>
          ` : ''}
        </div>
      </div>

      <div class="calculator-card" style="margin-bottom: 18px;">
        <div class="result"><span>Intermediate Volume (C - B):</span> <strong>${results.volume} cm³</strong></div>
        <div class="result"><span>Derived Gmb:</span> <strong>${results.Gmb}</strong></div>
      </div>

      <div class="requirements">
        <h3>Physical Principle / Context</h3>
        <p style="margin-bottom: 0;">${step.learning}</p>
      </div>

      <div class="actions">
        <button id="btn-prev" class="secondary" ${engine.currentStepIndex === 0 ? 'disabled' : ''}>Previous</button>
        ${engine.currentStepIndex < engine.schema.steps.length - 1 
          ? `<button id="btn-next" class="primary">Continue</button>`
          : `<button id="btn-commit" class="primary" style="background: #235e45;">Commit Result to Book</button>`
        }
      </div>
    `;

    // Event listeners for step inputs
    document.getElementById("guided-input-main").addEventListener("input", (e) => {
      engine.updateValue(step.field, e.target.value);
      renderCalculateView();
    });

    if (step.secondary_field) {
      document.getElementById("guided-input-secondary").addEventListener("input", (e) => {
        engine.updateValue(step.secondary_field, e.target.value);
        renderCalculateView();
      });
    }

    document.getElementById("btn-prev")?.addEventListener("click", () => {
      if (engine.currentStepIndex > 0) {
        engine.currentStepIndex--;
        renderPerformStep();
      }
    });

    document.getElementById("btn-next")?.addEventListener("click", () => {
      if (engine.currentStepIndex < engine.schema.steps.length - 1) {
        engine.currentStepIndex++;
        renderPerformStep();
      }
    });

    document.getElementById("btn-commit")?.addEventListener("click", () => {
      engine.commitToBook();
    });
  }

  // --- RENDER CALCULATE VIEW (Speed / Direct Entry Mode) ---
  function renderCalculateView() {
    const viewCalc = document.getElementById("view-calculate");
    const results = engine.calculateResults();

    viewCalc.innerHTML = `
      <div class="view-heading">
        <div>
          <span class="eyebrow">SPEED MODE / DIRECT ENTRY</span>
          <h2>Calculate & Log Result</h2>
        </div>
        <span class="status">Live calculation engine</span>
      </div>

      <div class="calculator-card" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        ${Object.keys(engine.schema.inputs).map(key => {
          const input = engine.schema.inputs[key];
          return `
            <label>
              ${input.label}${input.unit ? `(${input.unit})` : ''}
              <input 
                data-calc-key="${key}" 
                class="number-input calc-field" 
                type="${input.type}" 
                placeholder="${input.placeholder || ''}" 
                value="${engine.values[key] ?? ''}"
              >
            </label>
          `;
        }).join('')}
      </div>

      <div class="calculator-card" style="margin-top: 18px;">
        <div class="result"><span>Displaced Volume (C - B)</span> <strong>${results.volume} cm³</strong></div>
        <div class="result"><span>Bulk Specific Gravity (Gmb)</span> <strong>${results.Gmb}</strong></div>
        <div class="result"><span>In-Place Compaction Density</span> <strong>${results.densityPct}</strong></div>
        <div class="result"><span>Bulk Density (pcf)</span> <strong>${results.bulkDensityPcf} lbs/ft³</strong></div>
        <div class="result"><span>PQI Gauge Offset</span> <strong>${results.pqiOffset} pcf</strong></div>
      </div>

      <div class="actions" style="margin-top: 18px;">
        <button id="calc-commit-btn" class="primary" style="background: #235e45;">Commit Result to Book</button>
      </div>
    `;

    document.querySelectorAll(".calc-field").forEach(input => {
      input.addEventListener("input", (e) => {
        const key = e.target.getAttribute("data-calc-key");
        engine.updateValue(key, e.target.value);
        renderPerformStep(); // keep views synced
        renderCalculateView();
      });
    });

    document.getElementById("calc-commit-btn").addEventListener("click", () => {
      engine.commitToBook();
    });
  }

  // --- RENDER REFERENCE VIEW (Learning / Knowledge Base) ---
  function renderReferenceView() {
    const viewRef = document.getElementById("view-reference");

    viewRef.innerHTML = `
      <div class="view-heading">
        <div>
          <span class="eyebrow">PROCEDURAL REFERENCE & KNOWLEDGE</span>
          <h2>${engine.schema.title}</h2>
        </div>
        <span class="status">${engine.schema.standard}</span>
      </div>

      <div class="reference-card">
        <h3>Standard Practice & Principles</h3>
        <p>This test procedure determines the bulk specific gravity ($G_{mb}$) of compacted bituminous mixtures using saturated surface-dry (SSD) specimens.</p>
      </div>

      <div class="requirements">
        <h3>Mathematical Derivations</h3>
        <ul>
          <li><strong>Displaced Volume:</strong> $V = C - B$</li>
          <li><strong>Bulk Specific Gravity:</strong> $G_{mb} = \\frac{A}{C - B}$</li>
          <li><strong>Compaction Density %:</strong> $\\text{Density} = \\frac{G_{mb}}{G_{mm}} \\times 100$</li>
          <li><strong>Unit Weight Conversion:</strong> $\\text{Bulk Density (pcf)} = G_{mb} \\times 62.245$</li>
        </ul>
      </div>

      <div class="reference-card">
        <h3>Step-by-Step Training Context</h3>
        ${engine.schema.steps.map(step => `
          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--border);">
            <strong>${step.title}</strong>
            <p style="margin: 4px 0 0; font-size: 0.9rem;">${step.learning}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Initial Boot
  renderPerformStep();
  renderCalculateView();
  renderReferenceView();
});
