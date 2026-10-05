/**
 * QC Module Registry
 * Declarative metadata used by index.html to render navigation views.
 */
window.QC_MODULES = [
  {
    id: "jmf_setup",
    title: "Job Setup & JMF Specs",
    shiftOrder: 1,
    locationGroup: "Job Setup",
    script: "modules/jmf-setup.js",
    objectName: "jmfSetupModule"
  },
  {
    id: "pqi_coring",
    title: "PQI & Core Drilling",
    shiftOrder: 2,
    locationGroup: "Field Operations",
    script: "modules/field-pqi-coring.js",
    objectName: "fieldPqiCoringModule"
  },
  {
    id: "gmb_core_density",
    title: "AASHTO T 166 (Core Gmb)",
    shiftOrder: 3,
    locationGroup: "Lab Volumetrics",
    script: "modules/gmb-core-density.js",
    objectName: "gmbCoreDensityModule"
  }
];
