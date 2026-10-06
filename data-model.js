/**
 * QC Lab Shared Data Model (Refactored v2.1.0)
 * 
 * ARCHITECTURE CHANGE:
 * - Introduced QC_MATH for AASHTO-compliant rounding.
 * - All stored data is now wrapped in an "Envelope" to track provenance.
 * - Enforced explicit source tracking.
 */

// 1. AASHTO Math & Rounding Engine
window.QC_MATH = {
  rules: {
    GMM: 3,
    GMB: 3,
    ABSORPTION: 2,
    VOLUME: 1,
    PERCENT: 2,
    THICKNESS: 2
  },

  round(value, type) {
    const precision = this.rules[type] || 2;
    const factor = Math.pow(10, precision);
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  },

  // Helper to create the standard data envelope
  envelope(value, source, type) {
    return {
      value: (value !== null && value !== undefined) ? this.round(value, type) : null,
      source: source,
      type: type,
      ts: new Date().toISOString()
    };
  }
};

class QCDataStore {
  constructor() {
    this.storageKey = "QC_PROJECT_DATA_V2";
    this.contextKey = "QC_ACTIVE_CONTEXT_V2";
    this.data = this.loadData() || { projects: { "PROJECT-1": { id: "PROJECT-1", name: "New Project", mixDesigns: {}, labTests: {}, sessions: { "DAY-1": { id: "DAY-1", label: "Day 1", cores: {}, riceTests: {} } } } } };
    this.context = this.loadContext() || { projectId: "PROJECT-1", sessionId: "DAY-1", coreId: null, riceTestId: null, labTestId: null, mixDesignId: null };
  }

  // --- Persistence ---
  loadData() { try { const saved = localStorage.getItem(this.storageKey); return saved ? JSON.parse(saved) : null; } catch(e) { return null; } }
  loadContext() { try { const saved = localStorage.getItem(this.contextKey); return saved ? JSON.parse(saved) : null; } catch(e) { return null; } }
  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    localStorage.setItem(this.contextKey, JSON.stringify(this.context));
    // FUTURE: Trigger framework re-computation here
  }

  // --- Core Accessors ---
  getProject(projectId = this.context.projectId) { return this.data.projects[projectId] || null; }
  getSession() { const project = this.getProject(); return project?.sessions?.[this.context.sessionId] || null; }
  getCore() { const session = this.getSession(); return (this.context.coreId && session?.cores?.[this.context.coreId]) ? session.cores[this.context.coreId] : null; }
  
  // --- Data Mutation (The new Contract) ---
  /**
   * setField now enforces the Envelope pattern.
   * target: "core.measurements" | "core.calculations" | etc.
   * type: A key from QC_MATH.rules (e.g., 'GMM', 'VOLUME')
   */
  setField(target, key, rawValue, source, type) {
    const envelope = QC_MATH.envelope(rawValue, source, type);
    
    // Determine object to update
    let targetObj = null;
    if (target === "core.measurements") targetObj = this.getCore()?.measurements;
    if (target === "core.calculations") targetObj = this.getCore()?.calculations;
    // ... logic for other targets ...

    if (targetObj) {
      targetObj[key] = envelope;
      this.save();
    }
  }

  // Legacy compatibility for simple gets
  getRawValue(target, key) {
    const val = this.getField(target, key);
    return val?.value;
  }

  getField(target, key) {
    // Returns the full Envelope {value, source, type, ts}
    if (target === "core.measurements") return this.getCore()?.measurements?.[key];
    if (target === "core.calculations") return this.getCore()?.calculations?.[key];
    return null;
  }

  // --- Legacy Helpers (Maintained for current module compatibility) ---
  setContext(partialContext) {
    this.context = { ...this.context, ...partialContext };
    this.save();
  }
}

window.QC_DATA = new QCDataStore();
