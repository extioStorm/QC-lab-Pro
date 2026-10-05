/**
 * Module Definition: AASHTO T 166 (Bulk Specific Gravity & Density)
 */
const gmbCoreDensityModule = {
  id: "gmb_core_density_v1",
  title: "Bulk Specific Gravity & Density of Compacted Cores",
  parentModule: "Asphalt Field & Lab Quality Control",
  submodule: "Lab Testing & Specific Gravity",

  // Pure Form Schema
  fields: [
    { id: "station_location", label: "Station / Location", type: "text", placeholder: "e.g., 104+50 Rt", stepNum: 1 },
    { id: "core_id", label: "Core Identifier", type: "text", placeholder: "e.g., C-12", stepNum: 1 },
    { id: "mass_dry_A", label: "Dry Mass (A)", unit: "g", type: "number", placeholder: "0.0", stepNum: 2 },
    { id: "mass_submerged_B", label: "Submerged Mass (B)", unit: "g", type: "number", placeholder: "0.0", stepNum: 3 },
    { id: "mass_ssd_C", label: "SSD Mass (C)", unit: "g", type: "number", placeholder: "0.0", stepNum: 4 },
    { id: "gmm_value", label: "Max Gravity (Gmm)", unit: "", type: "number", placeholder: "0.000", stepNum: 5 },
    { id: "pqi_density", label: "PQI Gauge Reading", unit: "pcf", type: "number", placeholder: "0.0", stepNum: 5 }
  ],

  // Step Knowledge Base
  steps: [
    {
      num: 1,
      title: "Specimen & Equipment Prep",
      description: "Prepare the core and verify laboratory equipment parameters.",
      guidance: "Ensure core surface is clean of residual tack/dirt. Verify water bath is stabilized at 77°F ± 1.8°F (25°C ± 1°C). Zero/tare the balance.",
      learning: "Proper specimen prep and bath temperature regulation prevent fluid density shifts that invalidate buoyancy calculations."
    },
    {
      num: 2,
      title: "Dry Mass In Air (A)",
      description: "Measure baseline dry mass of the specimen.",
      guidance: "Dry specimen to constant mass at 125°F (52°C) if required, cool to room temperature, and weigh in air.",
      learning: "Establishes baseline dry mass (A) prior to water absorption."
    },
    {
      num: 3,
      title: "Submerged Mass (B)",
      description: "Measure buoyant weight in 77°F water bath.",
      guidance: "Immerse core in water bath for 3 to 5 minutes. Record buoyant mass while completely submerged.",
      learning: "Archimedes' Principle: Displaced water mass equals buoyant upward force."
    },
    {
      num: 4,
      title: "Saturated Surface-Dry Mass (C)",
      description: "Measure surface-dry mass immediately after immersion.",
      guidance: "Remove from bath, blot surface rapidly with damp towel, and record mass within 15 seconds.",
      learning: "SSD state captures filled internal voids while removing external surface moisture."
    },
    {
      num: 5,
      title: "Reference & Field Comparison Data",
      description: "Enter maximum theoretical gravity and field gauge readings for compaction analysis.",
      guidance: "Input corresponding Rice Test Gmm and field PQI gauge reading taken over core site.",
      learning: "Links lab bulk gravity to target voidless gravity (Gmm) to derive true in-place compaction."
    }
  ],

  // Calculation Callback
  compute: (v) => {
    const A = parseFloat(v.mass_dry_A);
    const B = parseFloat(v.mass_submerged_B);
    const C = parseFloat(v.mass_ssd_C);
    const Gmm = parseFloat(v.gmm_value);
    const PQI = parseFloat(v.pqi_density);

    const volume = (C > 0 && B > 0 && C >= B) ? (C - B) : null;
    const Gmb = (A > 0 && volume) ? (A / volume) : null;
    const densityPct = (Gmb && Gmm > 0) ? ((Gmb / Gmm) * 100) : null;
    const bulkDensityPcf = Gmb ? (Gmb * 62.245) : null;
    const pqiOffset = (bulkDensityPcf !== null && !isNaN(PQI)) ? (bulkDensityPcf - PQI) : null;

    return [
      { label: "Displaced Vol", value: volume ? `${volume.toFixed(1)} cm³` : "—" },
      { label: "Bulk Gravity (Gmb)", value: Gmb ? Gmb.toFixed(3) : "—" },
      { label: "Compaction %", value: densityPct ? `${densityPct.toFixed(1)}%` : "—" },
      { label: "Bulk Density", value: bulkDensityPcf ? `${bulkDensityPcf.toFixed(1)} pcf` : "—" },
      { label: "PQI Offset", value: pqiOffset !== null ? `${pqiOffset >= 0 ? '+' : ''}${pqiOffset.toFixed(1)} pcf` : "—" }
    ];
  }
};
