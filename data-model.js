/**
 * QC Lab Shared Data Model
 *
 * This is the application's shared record book.
 *
 * Modules do not own their own copy of laboratory data.
 * They read/write the current project's records.
 *
 * The architecture has evolved to support the actual asphalt workflow:
 *
 *   Project
 *     -> Mix Design(s)
 *     -> Lab Test(s)
 *        -> Subtests (Rice, Gauge, Ignition, etc.)
 *     -> Sessions
 *        -> Cores
 *
 * A Core is not the owner of the entire testing workflow. It may reference a
 * lab test and/or a mix design, and if there is no linked data it can be
 * explicitly overridden manually with an optional source note.
 */

class QCDataStore {
  constructor() {
    this.storageKey = "QC_PROJECT_DATA_V2";
    this.contextKey = "QC_ACTIVE_CONTEXT_V2";

    this.data = this.loadData() || {
      projects: {
        "PROJECT-1": {
          id: "PROJECT-1",
          name: "New Project",
          mixDesigns: {},
          labTests: {},
          sessions: {
            "DAY-1": {
              id: "DAY-1",
              label: "Day 1",
              date: "",
              cores: {},
              riceTests: {}
            }
          }
        }
      }
    };

    this.context = this.loadContext() || {
      projectId: "PROJECT-1",
      sessionId: "DAY-1",
      coreId: null,
      riceTestId: null,
      labTestId: null,
      mixDesignId: null
    };
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Could not load QC project data:", error);
      return null;
    }
  }

  loadContext() {
    try {
      const saved = localStorage.getItem(this.contextKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn("Could not load QC active context:", error);
      return null;
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    localStorage.setItem(this.contextKey, JSON.stringify(this.context));
  }

  getProject(projectId = this.context.projectId) {
    return this.data.projects[projectId] || null;
  }

  getSession() {
    const project = this.getProject();
    return project?.sessions?.[this.context.sessionId] || null;
  }

  getCore() {
    const session = this.getSession();
    if (!this.context.coreId) return null;
    return session?.cores?.[this.context.coreId] || null;
  }

  getRiceTests() {
    return this.getSession()?.riceTests || {};
  }

  getRiceTest() {
    const tests = this.getRiceTests();
    if (!this.context.riceTestId) return null;
    return tests[this.context.riceTestId] || null;
  }

  getMixDesigns() {
    return this.getProject()?.mixDesigns || {};
  }

  getMixDesign(mixDesignId = this.context.mixDesignId) {
    if (!mixDesignId) return null;
    return this.getMixDesigns()[mixDesignId] || null;
  }

  getLabTests() {
    return this.getProject()?.labTests || {};
  }

  getLabTest(labTestId = this.context.labTestId) {
    if (!labTestId) return null;
    return this.getLabTests()[labTestId] || null;
  }

  ensureProject(projectId) {
    if (!projectId) return null;
    if (!this.data.projects[projectId]) {
      this.data.projects[projectId] = {
        id: String(projectId),
        name: String(projectId),
        mixDesigns: {},
        labTests: {},
        sessions: {}
      };
    }
    return this.data.projects[projectId];
  }

  ensureMixDesign(mixDesignId, label = "Mix Design") {
    const project = this.getProject();
    if (!project || !mixDesignId) return null;

    if (!project.mixDesigns[mixDesignId]) {
      project.mixDesigns[mixDesignId] = {
        id: String(mixDesignId),
        label: String(label),
        values: {},
        notes: "",
        createdAt: new Date().toISOString()
      };
    }

    return project.mixDesigns[mixDesignId];
  }

  ensureLabTest(labTestId, label = "Lab Test") {
    const project = this.getProject();
    if (!project || !labTestId) return null;

    if (!project.labTests[labTestId]) {
      project.labTests[labTestId] = {
        id: String(labTestId),
        label: String(label),
        projectId: project.id,
        mixDesignId: this.context.mixDesignId || null,
        sample: {},
        subtests: {},
        calculations: {},
        results: {},
        createdAt: new Date().toISOString()
      };
    }

    return project.labTests[labTestId];
  }

  ensureLabSubtest(labTestId, subtestId, subtestType = "generic") {
    const labTest = this.getLabTest(labTestId);
    if (!labTest || !subtestId) return null;

    if (!labTest.subtests[subtestId]) {
      labTest.subtests[subtestId] = {
        id: String(subtestId),
        type: String(subtestType),
        values: {},
        calculations: {},
        results: {},
        manualOverrides: {}
      };
    }

    return labTest.subtests[subtestId];
  }

  ensureRiceTest(testId) {
    const session = this.getSession();
    if (!session || !testId) return null;

    if (!session.riceTests[testId]) {
      session.riceTests[testId] = {
        id: String(testId),
        label: String(testId),
        gmm: null
      };
    }

    return session.riceTests[testId];
  }

  ensureCore(coreId) {
    const session = this.getSession();
    if (!session || !coreId) return null;

    if (!session.cores[coreId]) {
      session.cores[coreId] = {
        id: String(coreId),
        coolerId: "",
        measurements: {},
        calculations: {},
        results: {},
        references: {
          gmmTestId: null,
          labTestId: null,
          mixDesignId: null
        },
        manualValues: {}
      };
    }

    return session.cores[coreId];
  }

  setContext(partialContext) {
    this.context = {
      ...this.context,
      ...partialContext
    };

    if (this.context.coreId) {
      this.ensureCore(this.context.coreId);
    }

    if (this.context.mixDesignId) {
      this.ensureMixDesign(this.context.mixDesignId);
    }

    if (this.context.labTestId) {
      this.ensureLabTest(this.context.labTestId);
    }

    this.save();
  }

  getField(target, key) {
    if (target === "core.measurements") return this.getCore()?.measurements?.[key];
    if (target === "core.calculations") return this.getCore()?.calculations?.[key];
    if (target === "core.results") return this.getCore()?.results?.[key];
    if (target === "riceTest") return this.getRiceTest()?.[key];
    if (target === "labTest") return this.getLabTest()?.[key];
    if (target === "mixDesign") return this.getMixDesign()?.values?.[key] ?? this.getMixDesign()?.[key];

    return undefined;
  }

  setField(target, key, value) {
    // Rice/GMM records are independent records. They must not require a
    // Core to exist before they can be edited.
    if (target === "riceTest") {
      const test = this.getRiceTest();
      if (!test) return;
      test[key] = value;
      this.save();
      return;
    }

    if (target === "labTest") {
      const test = this.getLabTest();
      if (!test) return;
      test[key] = value;
      this.save();
      return;
    }

    if (target === "mixDesign") {
      const mix = this.getMixDesign();
      if (!mix) return;
      if (!mix.values) mix.values = {};
      mix.values[key] = value;
      this.save();
      return;
    }

    const core = this.getCore();
    if (!core) return;

    if (target === "core.measurements") {
      core.measurements[key] = value;
    } else if (target === "core.calculations") {
      core.calculations[key] = value;
    } else if (target === "core.results") {
      core.results[key] = value;
    }

    this.save();
  }

  /**
   * A value may come from a linked Lab Test or a Mix Design. If neither is present,
   * the user may still manually enter a value and optionally attach a source label.
   */
  setManualValue(targetKey, value, source = null) {
    const core = this.getCore();
    if (!core) return;

    core.manualValues = core.manualValues || {};
    core.manualValues[targetKey] = {
      value,
      source: source || "manual entry",
      manual: true
    };

    this.save();
  }

  getManualValue(targetKey) {
    return this.getCore()?.manualValues?.[targetKey] || null;
  }

  /**
   * Explicit dependency resolution: do not silently fall back to the mix design.
   * The user must decide the source for the missing prerequisite.
   */
  getValueResolutionOptions(targetKey, existingValue = null) {
    const labTest = this.getLabTest();
    const mixDesign = this.getMixDesign();
    const core = this.getCore();

    return {
      targetKey,
      existingValue,
      hasLabTest: !!labTest,
      hasMixDesign: !!mixDesign,
      hasCore: !!core,
      options: [
        "link_existing_lab_test",
        "create_new_lab_test",
        "use_mix_design_value",
        "manual_entry",
        "manual_entry_with_source"
      ]
    };
  }

  /**
   * A core does not own GMM.
   * It owns a reference to the Rice/GMM test whose result applies to it.
   */
  setCoreReference(key, value) {
    const core = this.getCore();
    if (!core) return;
    core.references[key] = value || null;
    this.save();
  }

  getApplicableGmm() {
    const core = this.getCore();
    const tests = this.getRiceTests();
    const testId = core?.references?.gmmTestId;

    if (testId && tests[testId]) {
      return {
        value: tests[testId].gmm,
        sourceId: testId,
        sourceLabel: tests[testId].label || testId
      };
    }

    return null;
  }
}

window.QC_DATA = new QCDataStore();

/**
 * Compatibility helpers for future modules.
 * These are intentionally lightweight so existing modules do not need to know
 * about the larger project/lab design structure.
 */
window.QC_DATA.ensureProject = window.QC_DATA.ensureProject.bind(window.QC_DATA);
window.QC_DATA.ensureMixDesign = window.QC_DATA.ensureMixDesign.bind(window.QC_DATA);
window.QC_DATA.ensureLabTest = window.QC_DATA.ensureLabTest.bind(window.QC_DATA);
window.QC_DATA.ensureLabSubtest = window.QC_DATA.ensureLabSubtest.bind(window.QC_DATA);
window.QC_DATA.getMixDesigns = window.QC_DATA.getMixDesigns.bind(window.QC_DATA);
window.QC_DATA.getLabTests = window.QC_DATA.getLabTests.bind(window.QC_DATA);
window.QC_DATA.getValueResolutionOptions = window.QC_DATA.getValueResolutionOptions.bind(window.QC_DATA);
window.QC_DATA.setManualValue = window.QC_DATA.setManualValue.bind(window.QC_DATA);
window.QC_DATA.getManualValue = window.QC_DATA.getManualValue.bind(window.QC_DATA);
