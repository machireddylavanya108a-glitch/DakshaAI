function normalize(value, fallback = '') {
  const output = String(value || '').trim();
  return output || fallback;
}

function inferLevel(value) {
  const level = String(value || '').toLowerCase();
  if (level.includes('advanced') || level.includes('expert')) return 'Advanced';
  if (level.includes('intermediate')) return 'Intermediate';
  return 'Beginner';
}

function buildRoadmap(skill, level) {
  return [
    `Build foundations in ${skill}`,
    `Practice guided exercises for ${skill}`,
    `Apply ${skill} in a small real-world project`,
    `Create a portfolio-worthy artifact around ${skill}`,
    `Prepare for advanced outcomes and interviews in ${skill}`
  ];
}

function buildDailySchedule(skill, level) {
  return [
    { day: 'Day 1', focus: `Learn the core concepts of ${skill}`, outcome: 'Notes + one example' },
    { day: 'Day 2', focus: `Practice fundamentals for ${skill}`, outcome: '2 exercises' },
    { day: 'Day 3', focus: `Create a small project around ${skill}`, outcome: 'Working demo' },
    { day: 'Day 4', focus: `Review feedback and improve quality`, outcome: 'Refined artifact' },
    { day: 'Day 5', focus: `Prepare for interviews and portfolio storytelling`, outcome: 'Resume-ready summary' }
  ];
}

function buildProjects(skill, level) {
  return [
    `Build a starter project in ${skill}`,
    `Build a polished mini-project in ${skill}`,
    `Build a capstone case study in ${skill}`
  ];
}

function buildAssessments(skill, level) {
  return [
    `Quiz: core concepts of ${skill}`,
    `Practical challenge: solve a real task with ${skill}`,
    `Review: explain your solution and defend decisions`
  ];
}

function buildPortfolio(skill, level) {
  return [
    `Create a project showcase for ${skill}`,
    `Document before/after workflow and outcomes`,
    `Add a case study and metrics for recruiter clarity`
  ];
}

function buildInternshipRoadmap(skill, level) {
  return [
    `Prepare a resume tailored for ${skill}`,
    `Create one public or shareable project`,
    `Apply for internships and prepare for screening calls`
  ];
}

function buildCareerRoadmap(skill, level) {
  return [
    `Identify roles that use ${skill}`,
    `Build a strong profile around one target role`,
    `Track opportunities and prepare consistently`
  ];
}

function buildFreelancingRoadmap(skill, level) {
  return [
    `Pick a niche around ${skill}`,
    `Create a simple offer and sample deliverable`,
    `Pitch to first clients and collect testimonials`
  ];
}

function buildStartupRoadmap(skill, level) {
  return [
    `Find a real problem that ${skill} can solve`,
    `Prototype a lightweight MVP`,
    `Test, improve, and define a market position`
  ];
}

function buildCertificationRoadmap(skill, level) {
  return [
    `Select one relevant certification path for ${skill}`,
    `Study the core syllabus and exam format`,
    `Take mock tests and build a completion plan`
  ];
}

function buildInterviewPreparation(skill, level) {
  return [
    `Practice 15 common questions around ${skill}`,
    `Prepare structured answers with examples`,
    `Run mock interviews and review weak points`
  ];
}

function buildSalaryRoadmap(skill, level) {
  return [
    `Research market rates for ${skill}`,
    `Connect your profile to in-demand roles`,
    `Track offers, negotiation points, and growth milestones`
  ];
}

function buildIndustryRoadmap(skill, level) {
  return [
    `Find companies and teams using ${skill}`,
    `Study current industry tools and workflows`,
    `Align your portfolio with in-demand trends`
  ];
}

function buildAiTeacherPlan(skill, level) {
  return `AI Teacher for ${skill}: start with fundamentals, then teach one concept at a time, check understanding, and provide a personalized challenge at the ${level.toLowerCase()} level.`;
}

function buildThreeDPlan(skill, level) {
  return `3D Demo Plan for ${skill}: show a simple interactive scene, highlight the core concept, then animate a step-by-step example suited to ${level.toLowerCase()} pushing.`;
}

export function buildSkillAcademyMentorPlan({ skill = '', interviewAnswers = {} } = {}) {
  const skillName = normalize(skill, 'Skill');
  const level = inferLevel(interviewAnswers.currentLevel || interviewAnswers.level || 'Beginner');
  const goal = normalize(interviewAnswers.endGoal || interviewAnswers.goal || 'Build confidence and grow professionally');
  const language = normalize(interviewAnswers.preferredLanguage || 'English');
  const speed = normalize(interviewAnswers.learningSpeed || 'Normal');

  return {
    topic: skillName,
    level,
    goal,
    language,
    speed,
    mentor: {
      interviewSummary: `Learner is aiming for ${goal} at a ${level.toLowerCase()} level with ${language} preferred and a ${speed.toLowerCase()} learning pace.`,
      roadmap: buildRoadmap(skillName, level),
      dailySchedule: buildDailySchedule(skillName, level),
      projects: buildProjects(skillName, level),
      assessments: buildAssessments(skillName, level),
      portfolio: buildPortfolio(skillName, level),
      internshipRoadmap: buildInternshipRoadmap(skillName, level),
      careerRoadmap: buildCareerRoadmap(skillName, level),
      freelancingRoadmap: buildFreelancingRoadmap(skillName, level),
      startupRoadmap: buildStartupRoadmap(skillName, level),
      certificationRoadmap: buildCertificationRoadmap(skillName, level),
      interviewPreparation: buildInterviewPreparation(skillName, level),
      salaryRoadmap: buildSalaryRoadmap(skillName, level),
      industryRoadmap: buildIndustryRoadmap(skillName, level),
      aiTeacherPlan: buildAiTeacherPlan(skillName, level),
      threeDPlan: buildThreeDPlan(skillName, level)
    }
  };
}
