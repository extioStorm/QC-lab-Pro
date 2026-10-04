/**
 * Lab Framework - Procedural Knowledge Engine (v0.4.0 - Step-by-Step Wizard)
 * Sequential subtask progression with standalone entry capabilities.
 */

const coreDensityProcedure = {
  id: "gmb_core_density_v1",
  title: "Bulk Specific Gravity & Density (AASHTO T 166)",
  parentModule: "Asphalt Field & Lab Quality Control",
  submodule: "Lab Testing & Specific Gravity",
  
  steps: [
    {
      id: "prep",
      title: "Step 1: Specimen & Equipment Prep",
      description: "Prepare the core and verify laboratory equipment parameters.",
      guidance: "Ensure core surface is clean of residual tack/dirt. Verify water bath is stabilized at 77°F ± 1.8°F (25°C ± 1°C). Zero/tare the balance.",
      learning: "Proper specimen prep and bath temperature regulation prevent fluid density shifts that invalidate buoyancy calculations.",
      inputs: [
        { key: "station_location", label: "Station / Location", type: "text", placeholder: "e.g., 104+50 Rt" },
        { key: "core_id", label: "Core Identifier", type: "text", placeholder: "e.g., C-12" }
      ]
    },
    {
      id: "dry_mass",
      title: "Step 2: Dry Mass In Air (A)",
      description: "Measure baseline dry mass of the specimen.",
      guidance: "Dry specimen to constant mass at 125°F (52°C) if required, cool to room temperature, and weigh in air.",
      learning: "Establishes baseline dry mass (A) prior to water absorption.",
      inputs: [
        { key: "mass_dry_A", label: "Dry Mass (A)", unit: "g", type: "number", placeholder: "0.0" }
      ]
    },
    {
      id: "submerged_mass",
      title: "Step 3: Submerged Mass (B)",
      description: "Measure buoyant weight in 77°F water bath.",
      guidance: "Immerse core in water bath for 3 to 5 minutes. Record buoyant mass while completely submerged.",
      learning: "Archimedes' Principle: Displaced water mass equals buoyant upward force.",
      inputs: [
        { key: "mass_submerged_B", label: "Submerged Mass (B)", unit: "g", type: "number", placeholder: "0.0" }
      ]
    },
    {
      id: "ssd_mass",
      title: "Step 4: Saturated Surface-Dry Mass (C)",
      description: "Measure surface-dry mass immediately after immersion.",
      guidance: "Remove from bath, blot surface rapidly with damp towel, and record mass within 15 seconds.",
      learning: "SSD state captures filled internal voids while removing external surface moisture.",
      inputs: [
        { key: "mass_ssd_C", label: "SSD Mass (C)", unit: "g", type: "number", placeholder: "0.0" }
      ]
    },
    {
      id: "reference_data",
      title: "Step 5: Reference & Field Comparison Data",
      description: "Enter maximum theoretical gravity and field gauge readings for compaction analysis.",
      guidance: "Input corresponding Rice Test Gmm and field PQI gauge reading taken over core site.",
      learning: "Links lab bulk gravity to target voidless gravity (Gmm) to derive true in-place compaction.",
      inputs: [
        { key: "gmm_value", label: "Max Gravity (Gmm)", unit: "", type: "number", placeholder: "0.000" },
        { key: "pqi_density", label: "PQI Gauge Reading", unit: "pcf", type: "number", placeholder: "0.0" }
      ]
    }
  ]
};

class WizardEngine {
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
    try { localStorage.setItem(`draft_${this.schema.id}`, JSON.stringify(this.values)); } catch (e) {}
  }

  loadDraftState() {
    try {
      const saved = localStorage.getItem(`draft_${this.schema.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  }

  saveLedgerState() {
    try { localStorage.setItem(`ledger_${this.schema.id}`, JSON.stringify(this.ledger)); } catch (e) {}
  }

  loadLedgerState() {
    try {
      const saved = localStorage.getItem(`ledger_${this.schema.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  }

  updateValue(key, val) {
    this.values[key] = val !== "" ? (isNaN(val) ? val : parseFloat(val)) : "";
    this.saveDraftState();
  }

  calculate() {
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
    const res = this.calculate();
    if (res.Gmb === "—") {
      alert("Missing core weights. Please complete all step inputs.");
      return;
    }

    const record = {
      timestamp: new Date().toISOString(),
      station: this.values.station_location || "N/A",
      core_id: this.values.core_id || "Unlabeled",
      inputs: { ...this.values },
      results: res
    };

    this.ledger.push(record);
    this.saveLedgerState();
    alert(`Result committed to book! Total logged records: ${this.ledger.length}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const engine = new WizardEngine(coreDensityProcedure);
  const workspace = document.getElementById("procedural-workspace");
  const menuButton = document.querySelector(".menu-button");
  const sidebar = document.querySelector(".sidebar");

  if (!workspace) return;
  if (menuButton) menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));

  function renderWizard() {
    const step = engine.schema.steps[engine.currentStepIndex];
    const totalSteps = engine.schema.steps.length;
    const results = engine.calculate();
    const isLastStep = engine.currentStepIndex === totalSteps - 1;

    workspace.innerHTML = `
      <div style="margin-bottom: 12px; font-size: 0.85rem; opacity: 0.8;">
        Module: <strong>${engine.schema.parentModule}</strong> &gt; <strong>${engine.schema.submodule}</strong>
      </div>

      <div class="form-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h2 style="font-size: 1.1rem; margin: 0;">${step.title}</h2>
          <span style="font-size: 0.85rem; font-weight: bold;">Step ${engine.currentStepIndex + 1} of ${totalSteps}</span>
        </div>

        <p style="margin-bottom: 16px; color: #a0a0a0;">${step.description}</p>

        <div class="form-grid" style="margin-bottom: 16px;">
          ${step.inputs.map(input => `
            <div class="input-block">
              <label>${input.label}${input.unit ? `(${input.unit})` : ''}</label>
              <input 
                data-key="${input.key}" 
                class="number-input core-input" 
                type="${input.type}" 
                placeholder="${input.placeholder}" 
                value="${engine.values[input.key] ?? ''}"
              >
            </div>
          `).join('')}
        </div>

        <details class="disclosure" open style="margin-bottom: 16px;">
          <summary>Step Guidance & Concept</summary>
          <div class="disclosure-body">
            <p style="margin-bottom: 4px;"><strong>Action Guidance:</strong> ${step.guidance}</p>
            <p style="margin-bottom: 0;"><strong>Technical Principle:</strong> ${step.learning}</p>
          </div>
        </details>

        <div style="display: flex; gap: 8px; justify-content: space-between;">
          <button id="prev-btn" class="secondary" ${engine.currentStepIndex === 0 ? 'disabled' : ''}>&larr; Previous Step</button>
          ${isLastStep ? `
            <button id="commit-btn" class="primary">Commit Result to Book</button>
          ` : `
            <button id="next-btn" class="primary">Next Step &rarr;</button>
          `}
        </div>
      </div>

      <div class="results-card" style="margin-top: 16px;">
        <h3 style="font-size: 1rem; margin-bottom: 12px;">Running Calculation Summary</h3>
        <div class="results-grid">
          <div class="result-item"><span>Displaced Vol</span><strong>${results.volume} cm³</strong></div>
          <div class="result-item"><span>Bulk Gravity (Gmb)</span><strong>${results.Gmb}</strong></div>
          <div class="result-item"><span>Compaction %</span><strong>${results.densityPct}</strong></div>
          <div class="result-item"><span>Bulk Density</span><strong>${results.bulkDensityPcf} pcf</strong></div>
          <div class="result-item"><span>PQI Offset</span><strong>${results.pqiOffset} pcf</strong></div>
        </div>
      </div>
    `;

    // Rebind Input Listeners
    document.querySelectorAll(".core-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const key = e.target.getAttribute("data-key");
        engine.updateValue(key, e.target.value);
        updateLiveSummary();
      });
    });

    // Navigation Controls
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const commitBtn = document.getElementById("commit-btn");

    if (prevBtn) prevBtn.addEventListener("click", () => {
      if (engine.currentStepIndex > 0) {
        engine.currentStepIndex--;
        renderWizard();
      }
    });

    if (nextBtn) nextBtn.addEventListener("click", () => {
      if (engine.currentStepIndex < totalSteps - 1) {
        engine.currentStepIndex++;
        renderWizard();
      }
    });

    if (commitBtn) commitBtn.addEventListener("click", () => engine.commitToBook());
  }

  function updateLiveSummary() {
    const res = engine.calculate();
    const items = document.querySelectorAll(".result-item strong");
    if (items.length === 5) {
      items[0].textContent = `${res.volume} cm³`;
      items[1].textContent = res.Gmb;
      items[2].textContent = res.densityPct;
      items[3].textContent = `${res.bulkDensityPcf} pcf`;
      items[4].textContent = `${res.pqiOffset} pcf`;
    }
  }

  renderWizard();
});
