export function normalizeSkillRoadmap(payload = {}, skill = '') {
  const fallbackSkill = skill || 'your skill';

  return {
    skill: payload?.skill || fallbackSkill,
    skillOverview: payload?.skillOverview || payload?.overview || `A professional roadmap for ${fallbackSkill} that balances fundamentals, practice, and career growth.`,
    beginnerRoadmap: Array.isArray(payload?.beginnerRoadmap) && payload.beginnerRoadmap.length ? payload.beginnerRoadmap : [`Learn the core concepts of ${fallbackSkill}`],
    intermediateRoadmap: Array.isArray(payload?.intermediateRoadmap) && payload.intermediateRoadmap.length ? payload.intermediateRoadmap : [`Practice real examples and build mini-projects in ${fallbackSkill}`],
    advancedRoadmap: Array.isArray(payload?.advancedRoadmap) && payload.advancedRoadmap.length ? payload.advancedRoadmap : [`Specialize, optimize, and prepare for advanced applications of ${fallbackSkill}`],
    dailyStudyPlan: Array.isArray(payload?.dailyStudyPlan) && payload.dailyStudyPlan.length ? payload.dailyStudyPlan : ['Study for 45-60 minutes each day', 'Practice one small task daily', 'Review notes before ending the session'],
    weeklyGoals: Array.isArray(payload?.weeklyGoals) && payload.weeklyGoals.length ? payload.weeklyGoals : ['Complete one focused project', 'Review key notes and concepts'],
    monthlyGoals: Array.isArray(payload?.monthlyGoals) && payload.monthlyGoals.length ? payload.monthlyGoals : ['Complete a portfolio-worthy project', 'Share progress in public or with peers'],
    requiredTools: Array.isArray(payload?.requiredTools) && payload.requiredTools.length ? payload.requiredTools : ['Laptop', 'Reliable internet connection'],
    freeResources: Array.isArray(payload?.freeResources) && payload.freeResources.length ? payload.freeResources : ['Official docs', 'YouTube tutorials'],
    paidResources: Array.isArray(payload?.paidResources) && payload.paidResources.length ? payload.paidResources : ['Premium courses', 'Specialized books'],
    bestYouTubeChannels: Array.isArray(payload?.bestYouTubeChannels) && payload.bestYouTubeChannels.length ? payload.bestYouTubeChannels : ['Free educational channels'],
    bestBooks: Array.isArray(payload?.bestBooks) && payload.bestBooks.length ? payload.bestBooks : ['Foundational beginner book'],
    bestWebsites: Array.isArray(payload?.bestWebsites) && payload.bestWebsites.length ? payload.bestWebsites : ['Official documentation', 'Community forums'],
    projects: Array.isArray(payload?.projects) && payload.projects.length ? payload.projects : [`Build a beginner project around ${fallbackSkill}`],
    portfolioIdeas: Array.isArray(payload?.portfolioIdeas) && payload.portfolioIdeas.length ? payload.portfolioIdeas : ['Create a polished case study'],
    internshipPreparation: Array.isArray(payload?.internshipPreparation) && payload.internshipPreparation.length ? payload.internshipPreparation : ['Prepare a concise resume and GitHub profile'],
    jobPreparation: Array.isArray(payload?.jobPreparation) && payload.jobPreparation.length ? payload.jobPreparation.length : ['Practice interview answers and portfolio storytelling'],
    freelancingGuide: Array.isArray(payload?.freelancingGuide) && payload.freelancingGuide.length ? payload.freelancingGuide : ['Create a simple service offer and portfolio'],
    businessOpportunities: Array.isArray(payload?.businessOpportunities) && payload.businessOpportunities.length ? payload.businessOpportunities : ['Explore niche service opportunities around the skill'],
    futureScope: Array.isArray(payload?.futureScope) && payload.futureScope.length ? payload.futureScope : ['Watch industry trends closely'],
    salaryInformation: payload?.salaryInformation || 'Salary depends on location, specialization, and experience level.',
    finalChecklist: Array.isArray(payload?.finalChecklist) && payload.finalChecklist.length ? payload.finalChecklist : ['Practice consistently', 'Build portfolio work', 'Apply to opportunities']
  };
}
