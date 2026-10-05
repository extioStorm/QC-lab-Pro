/**
 * Master QC Module Registry
 * Defines all installed testing modules for offline PWA navigation.
 */
window.QC_MODULES = [
  {
    id: "gmb_core_density",
    title: "AASHTO T 166 (Core Gmb)",
    script: "modules/gmb-core-density.js",
    objectName: "gmbCoreDensityModule"
  }
  // Future modules added here:
  // { id: "gmm_rice", title: "AASHTO T 209 (Rice Gmm)", script: "modules/gmm-rice-test.js", objectName: "gmmRiceTestModule" },
  // { id: "sieve_t27", title: "AASHTO T 27 (Washed Sieve)", script: "modules/sieve-analysis.js", objectName: "sieveAnalysisModule" }
];
