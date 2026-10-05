/**
 * QC Lab Shared Data Model
 *
 * This is the application's shared record book.
 *
 * Modules do not own their own copy of laboratory data.
 * They read/write the current project's records.
 *
 * Conceptual shape:
 *
 * Project
 *   -> Test Session / Day
 *       -> Cores
 *       -> Rice / GMM Tests
 *       -> other test components
 *
 * A core can reference a Rice/GMM test without making that test a child
 * of the core. Physical information such as cooler placement is a property
 * of the core, not what determines its logical test dependencies.
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
      riceTestId: null
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

  getProject() {
    return this.data.projects[this.context.projectId] || null;
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
          gmmTestId: null
        }
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

    this.save();
  }

  getField(target, key) {
    if (target === "core.measurements") return this.getCore()?.measurements?.[key];
    if (target === "core.calculations") return this.getCore()?.calculations?.[key];
    if (target === "core.results") return this.getCore()?.results?.[key];
    if (target === "riceTest") return this.getRiceTest()?.[key];

    return undefined;
  }

  setField(target, key, value) {
    const core = this.getCore();
    if (!core) return;

    if (target === "core.measurements") {
      core.measurements[key] = value;
    } else if (target === "core.calculations") {
      core.calculations[key] = value;
    } else if (target === "core.results") {
      core.results[key] = value;
    } else if (target === "riceTest") {
      const test = this.getRiceTest();
      if (test) test[key] = value;
    }

    this.save();
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
