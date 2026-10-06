registerModule({
  meta: {
    id: 'AASHTO-T166',
    title: 'AASHTO T 166 (Gmb Core Density)',
    version: '1.0.0',
    description: 'Bulk Specific Gravity of Compacted Asphalt Mixtures Using Saturated Surface-Dry Specimens.'
  },

  fields: [
    { id: 'massAirA', label: 'A: Dry Specimen Mass in Air', unit: 'g', precision: 1, computed: false },
    { id: 'massSsdB', label: 'B: SSD Mass in Air', unit: 'g', precision: 1, computed: false },
    { id: 'massWaterC', label: 'C: Submerged Specimen Mass', unit: 'g', precision: 1, computed: false },
    { id: 'volumeV', label: 'Specimen Volume (B - C)', unit: 'cm³', precision: 1, computed: true },
    { id: 'bulkGmb', label: 'Bulk Specific Gravity (Gmb)', unit: '', precision: 3, computed: true },
    { id: 'targetRiceGmm', label: 'Target Max Gravity (Gmm)', unit: '', precision: 3, computed: false },
    { id: 'percentCompaction', label: 'Compaction Degree (% Gmm)', unit: '%', precision: 1, computed: true }
  ],

  calculations: [
    { outputKey: 'volumeV', op: 'SUBTRACT', inputs: ['massSsdB', 'massWaterC'], precision: 1 },
    { outputKey: 'bulkGmb', op: 'DIVIDE', inputs: ['massAirA', 'volumeV'], precision: 3 },
    { outputKey: 'percentCompaction', op: 'DIVIDE', inputs: ['bulkGmb', 'targetRiceGmm'], precision: 3 },
    { outputKey: 'percentCompaction', op: 'MULTIPLY', inputs: ['percentCompaction', 'const100'], precision: 1 }
  ],

  steps: [
    {
      id: 'step-1',
      title: 'Dry Mass (A)',
      trainingText: 'AASHTO T 166 requires record of dry mass (A) after cooling to room temperature (25±5°C).',
      components: [
        { type: 'instruction', text: 'Enter the dry mass of the core sample recorded in air.' },
        { type: 'field-input', fieldId: 'massAirA', label: 'Dry Mass in Air (A) [grams]', unit: 'g' }
      ]
    },
    {
      id: 'step-2',
      title: 'SSD Mass in Air (B)',
      trainingText: 'Dampen a towel to blot surface water quickly without drawing water from internal voids.',
      components: [
        { type: 'instruction', text: 'Remove specimen from water bath, quickly blot surface dry with a damp towel, and record SSD mass B.' },
        { type: 'field-input', fieldId: 'massSsdB', label: 'SSD Mass in Air (B) [grams]', unit: 'g' }
      ]
    },
    {
      id: 'step-3',
      title: 'Submerged Mass in Water (C)',
      trainingText: 'Ensure the water bath is held at 25±1°C (77±1.8°F) and the suspension wire is completely tared.',
      components: [
        { type: 'instruction', text: 'Immerse the specimen in the water bath for 3 to 5 minutes, then record submerged mass C.' },
        { type: 'field-input', fieldId: 'massWaterC', label: 'Submerged Mass (C) [grams]', unit: 'g' }
      ]
    },
    {
      id: 'step-4',
      title: 'Volume & Gmb Calculations',
      trainingText: 'Bulk gravity is calculated as A / (B - C). Volume is represented directly by (B - C).',
      components: [
        { type: 'formula', expression: 'Volume (cm³) = B - C' },
        { type: 'value-display', fieldId: 'volumeV', unit: 'cm³' },
        { type: 'formula', expression: 'Gmb = A / Volume' },
        { type: 'value-display', fieldId: 'bulkGmb', unit: '' }
      ]
    },
    {
      id: 'step-5',
      title: 'Compaction (% Gmm)',
      trainingText: 'Density compaction percentage is computed against the active Rice test value (Gmm).',
      components: [
        { type: 'fallback-rice-input' },
        { type: 'formula', expression: '% Compaction = (Gmb / Gmm) * 100' },
        { type: 'value-display', fieldId: 'percentCompaction', unit: '%' }
      ]
    }
  ]
});
