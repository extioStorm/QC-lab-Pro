/**
 * Lab Framework - Procedural Knowledge Engine (v0.3)
 * Unified dynamic UI output driven by progressive disclosure components.
 */

// 1. DATA SCHEMA: Single Procedural Knowledge Definition
const coreDensityProcedure = {
  id: "gmb_core_density_v1",
  title: "Bulk Specific Gravity & Density of Compacted Cores",
  standard: "AASHTO T 166 / ASTM D2726",
  inputs: [
    {
      key: "station_location",
      label: "Station / Location",
      type: "text",
      placeholder: "e.g., 104+50 Rt",
      guidance: "Record physical paving location on the roadway project.",
      learning: "Traceability links lab core verification back to exact field stations for quality assurance lot tracking."
    },
    {
      key: "core_id",
      label: "Core Identifier",
      type: "text",
      placeholder: "e.g., C-12",
      guidance: "Record the unique specimen identifier stamped or marked on core.",
      learning: "Maintains clear chain of custody from drilling operation through lab testing and record storage."
    },
    {
      key: "mass_dry_A",
      label: "Dry Mass (A)",
      unit: "g",
      type: "number",
      placeholder: "0.0",
      guidance: "Dry specimen to constant mass at 125°F (52°C) and weigh in air.",
      learning: "Establishes baseline dry mass before any water absorption occurs."
    },
    {
      key: "mass_submerged_B",
      label: "Submerged Mass (B)",
      unit: "g",
      type: "number",
      placeholder: "0.0",
      guidance: "Immerse in 77°F water bath for 3–5 minutes and record buoyant weight.",
      learning: "Archimedes' Principle: buoyant upward force equals the mass of displaced water."
    },
    {
      key: "mass_ssd_C",
      label: "SSD Mass (C)",
      unit: "g",
      type: "number",
      placeholder: "0.0",
      guidance: "Blot exterior surface briefly with damp towel and immediately record mass.",
      learning: "Saturated Surface-Dry (SSD) condition fills internal aggregate voids with water while leaving the exterior surface dry."
    },
    {
      key: "gmm_value",
      label: "Max Gravity (Gmm)",
      unit: "",
      type: "number",
      placeholder: "0.000",
      guidance: "Obtained from corresponding Rice Test run for this mix.",
      learning: "Gmm is zero-void theoretical maximum specific gravity used to determine percentage compaction."
    },
    {
      key: "pqi_density",
      label: "PQI Gauge Reading",
      unit: "pcf",
      type: "number",
      placeholder: "0.0",
      guidance: "Non-destructive field density gauge reading taken directly over core site.",
      learning: "Used to derive daily offset calibration adjustments between gauge readings and core densities."
    }
  ]
};

// 2. ENGINE & STATE MANAGER
class ProcedureEngine {
  constructor(schema) {
    this.schema = schema;
    this.displayDepth = "custom"; // "speed", "custom", or "learning"
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
      alert("Missing core weights. Please enter Dry (A), Submerged (B), and SSD (C) masses.");
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
    alert(`Result committed to book! Records logged: ${this.ledger.length}`);
  }
}

// 3. SINGLE CANVAS RENDERER
document.addEventListener("DOMContentLoaded", () => {
  const engine = new ProcedureEngine(coreDensityProcedure);
  const workspace = document.getElementById("procedural-workspace");
  const depthButtons = document.querySelectorAll(".depth-btn");
  const menuButton = document.querySelector(".menu-button");
  const sidebar = document.querySelector(".sidebar");

  if (menuButton) {
    menuButton.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  // Handle Detail Depth Switcher
  depthButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      depthButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      engine.displayDepth = btn.getAttribute("data-depth");
      renderWorkspace();
    });
  });

  function renderWorkspace() {
    const results = engine.calculate();
    const isLearning = engine.displayDepth === "learning";
    const isSpeed = engine.displayDepth === "speed";

    workspace.innerHTML = `
      <div class="form-card">
        <h2 style="font-size: 1.1rem; margin-bottom: 16px;">Core Measurements & Observations</h2>
        
        <div class="form-grid">
          ${engine.schema.inputs.map(input => `
            <div class="input-block">
              <label>
                ${input.label}${input.unit ? `(${input.unit})` : ''}
              </label>
              <input 
                data-key="${input.key}" 
                class="number-input core-input" 
                type="${input.type}" 
                placeholder="${input.placeholder}" 
                value="${engine.values[input.key] ?? ''}"
              >

              ${!isSpeed ? `
                <details class="disclosure" ${isLearning ? 'open' : ''}>
                  <summary>Procedural Guidance & Knowledge</summary>
                  <div class="disclosure-body">
                    <p style="margin-bottom: 4px;"><strong>Guidance:</strong> ${input.guidance}</p>
                    <p style="margin-bottom: 0;"><strong>Principle:</strong> ${input.learning}</p>
                  </div>
                </details>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="results-card">
        <h2 style="font-size: 1.1rem; margin-bottom: 16px;">Calculated Results</h2>
        
        <div class="results-grid">
          <div class="result-item">
            <span>Displaced Vol (C - B)</span>
            <strong>${results.volume} cm³</strong>
          </div>
          <div class="result-item">
            <span>Bulk Gravity (Gmb)</span>
            <strong>${results.Gmb}</strong>
          </div>
          <div class="result-item">
            <span>In-Place Compaction</span>
            <strong>${results.densityPct}</strong>
          </div>
          <div class="result-item">
            <span>Bulk Density</span>
            <strong>${results.bulkDensityPcf} pcf</strong>
          </div>
          <div class="result-item">
            <span>PQI Gauge Offset</span>
            <strong>${results.pqiOffset} pcf</strong>
          </div>
        </div>

        ${!isSpeed ? `
          <details class="disclosure" ${isLearning ? 'open' : ''} style="margin-bottom: 16px;">
            <summary>Calculation Formulas & Derivations</summary>
            <div class="disclosure-body">
              <p style="margin-bottom: 4px;">• <strong>Displaced Volume:</strong> $V = C - B$</p>
              <p style="margin-bottom: 4px;">• <strong>Bulk Specific Gravity:</strong> $G_{mb} = A / (C - B)$</p>
              <p style="margin-bottom: 4px;">• <strong>Density %:</strong> $(G_{mb} / G_{mm}) \\times 100$</p>
              <p style="margin-bottom: 0;">• <strong>Unit Weight (pcf):</strong> $G_{mb} \\times 62.245$</p>
            </div>
          </details>
        ` : ''}

        <div class="actions">
          <button id="commit-btn" class="primary">Commit Result to Book</button>
        </div>
      </div>
    `;

    // Rebind Live Calculation Input Listeners
    document.querySelectorAll(".core-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const key = e.target.getAttribute("data-key");
        engine.updateValue(key, e.target.value);
        updateLiveResults();
      });
    });

    document.getElementById("commit-btn").addEventListener("click", () => {
      engine.commitToBook();
    });
  }

  // Minimal non-destructive DOM update for live input recalculation
  function updateLiveResults() {
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

  // Initial Load
  renderWorkspace();
});
