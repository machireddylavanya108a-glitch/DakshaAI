export function buildVirtualLab(topic = 'Universal Experiment') {
  const normalizedTopic = String(topic || 'Universal Experiment').trim() || 'Universal Experiment';
  const tokens = normalizedTopic.split(/\s+/).filter(Boolean);
  const keywords = Array.from(new Set([normalizedTopic, normalizedTopic.toLowerCase(), ...tokens])).slice(0, 8);

  const theory = [
    `${normalizedTopic} can be understood by observing its structure, variables, and interactions over time.`,
    'A strong laboratory workflow begins with clear goals, careful measurement, and evidence-based interpretation.'
  ];

  const procedure = [
    `Define the objective for ${normalizedTopic}.`,
    'Prepare the required materials and a clean workspace.',
    'Record baseline observations before changing any variable.',
    'Run the experiment, capture results, and compare them with the expected outcome.',
    'Summarize the findings and connect them back to the original objective.'
  ];

  const observations = [
    `Initial observations for ${normalizedTopic} are recorded before any intervention.`,
    `Repeated trials help identify patterns, variations, and anomalies.`,
    'Comparisons across steps reveal whether the outcome is consistent and reliable.'
  ];

  const calculations = [
    'Calculate change over time, average values, or percentage differences where relevant.',
    'Use simple tables or graphs to compare measured values against the expected result.',
    'Interpret the numerical evidence in plain language before drawing conclusions.'
  ];

  const simulationSteps = [
    { title: 'Setup', detail: `Prepare the environment for ${normalizedTopic}.` },
    { title: 'Observation', detail: 'Capture the starting conditions and initial variables.' },
    { title: 'Iteration', detail: 'Repeat the experiment while adjusting the variable safely.' },
    { title: 'Analysis', detail: 'Compare the results and identify the most meaningful patterns.' }
  ];

  return {
    title: normalizedTopic,
    subtitle: `Universal Virtual Lab: ${normalizedTopic}`,
    objective: `Investigate ${normalizedTopic} through observation, experimentation, and guided analysis.`,
    theory,
    materials: [
      'Lab notebook or digital journal',
      'Reference notes or documentation',
      'Measurement tool or calculator',
      'Camera or screen capture tool',
      'Safe workspace and internet access for context'
    ],
    procedure,
    observations,
    calculations,
    results: `The experiment demonstrates that ${normalizedTopic} can be explained clearly through structured observation, iteration, and evidence.`,
    conclusion: `The practical exploration of ${normalizedTopic} strengthens understanding by connecting theory, evidence, and real-world relevance.`,
    applications: [
      `Apply the understanding of ${normalizedTopic} in projects, case studies, or professional workflows.`,
      `Use the method to build stronger intuition for similar topics in school, research, or industry.`
    ],
    interviewQuestions: [
      `How would you explain ${normalizedTopic} in simple terms?`,
      `What evidence would convince you the experiment worked?`
    ],
    practiceQuestions: [
      `Describe the main steps you would follow for ${normalizedTopic}.`,
      `What would you change if the outcome was unexpected?`
    ],
    mistakes: [
      'Skipping the baseline observations',
      'Changing too many variables at once',
      'Ignoring safety precautions or data quality'
    ],
    safety: [
      'Work in a clear, stable environment.',
      'Follow all relevant safety instructions for the tools or materials involved.',
      'Record observations carefully and stop if anything seems unsafe.'
    ],
    simulation: {
      title: `Interactive simulation for ${normalizedTopic}`,
      steps: simulationSteps,
      notes: ['Use the controls to step through the simulation.', 'Review the observations after each stage before moving on.']
    },
    keywords,
    score: 90
  };
}

export function buildLabRecommendations(topic = 'Universal Experiment', historyCount = 0) {
  const normalizedTopic = String(topic || 'Universal Experiment').trim() || 'Universal Experiment';
  const base = normalizedTopic.toLowerCase();
  return [
    `Next Experiment: ${normalizedTopic} Variations`,
    historyCount > 0 ? 'Weak Areas: Data recording and comparison' : 'Weak Areas: Planning and observation',
    'Advanced Labs: Multi-step challenge labs',
    'Career Labs: Industry applications and case studies',
    'Industry Labs: Workflow simulations and practical demonstrations'
  ];
}
