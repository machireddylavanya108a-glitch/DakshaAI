import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true
});

const DAKSHA_SYSTEM_PROMPT = `You are Daksha AI, the Universal Knowledge Operating System.
Rules:
- Never introduce yourself unless the user asks who you are.
- Never repeat "Hello! I am Daksha AI."
- Answer immediately.
- Be natural and conversational like ChatGPT.
- Give concise answers for simple questions.
- Give detailed explanations for learning requests.
- Explain difficult topics in simple language.
- If the user asks for code, provide complete working code.
- If the user asks for business ideas, act like a startup mentor.
- If the user asks about studying, become an expert teacher.
- Support 100+ languages and always reply in the user's chosen language.
- Ask follow-up questions only when necessary.
- Think step by step before answering.`;

function parseJsonResponse(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerError) {
        console.error('JSON parse fallback failed:', innerError);
      }
    }
    return null;
  }
}

export async function getDakshaResponse(prompt, language = "English") {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST respond entirely in ${language}.` },
        { role: 'user', content: prompt }
      ]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    return "I am having trouble connecting to my brain right now. Please try again later.";
  }
}

export async function getDakshaImageResponse(base64Image, mimeType) {
  try {
    const response = await openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      messages: [
        { role: 'user', content: [
          { type: 'text', text: 'Analyze this image. Extract all the knowledge, text, or concepts from it. Explain what this is and teach me about it simply.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ] }
      ]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Vision Error:", error);
    return "I couldn't process this image. Please try a clearer photo or a different file.";
  }
}

export async function getDakshaTextResponse(extractedText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: 'You are Daksha AI. The user has uploaded a document and extracted the text. Read the text, summarize the key knowledge, and explain what the document is about simply.' },
        { role: 'user', content: extractedText }
      ]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Text Error:", error);
    return "I couldn't process this document. Please try a different file.";
  }
}

export async function getDakshaDocumentAnalysis(extractedText, fileName = 'document', fileType = 'unknown') {
  try {
    const prompt = `You are Daksha AI, a professional document understanding engine.
Analyze the text from the uploaded document and detect headings, chapters, tables, images, diagrams, formulas, code blocks, and lists.
Extract the main topics, keywords, definitions, important points, summary, and difficulty level.
Return only valid JSON with the following keys: overview, summary, topics, keywords, definitions, importantPoints, difficulty, detectedElements, quiz, flashcards.

The uploaded file is: ${fileName} (${fileType}).

Text to analyze:
${extractedText}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for document analysis.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      overview: content,
      summary: content,
      topics: [],
      keywords: [],
      definitions: [],
      importantPoints: [],
      difficulty: 'Unknown',
      detectedElements: {
        headings: [],
        chapters: [],
        tables: 0,
        images: 0,
        diagrams: 0,
        formulas: [],
        codeBlocks: [],
        lists: []
      },
      quiz: [],
      flashcards: []
    };
  } catch (error) {
    console.error("AI Document Analysis Error:", error);
    return {
      overview: "I couldn't analyze this document. Please try a different file or upload a simpler version.",
      summary: "I couldn't analyze this document.",
      topics: [],
      keywords: [],
      definitions: [],
      importantPoints: [],
      difficulty: 'Unknown',
      detectedElements: {
        headings: [],
        chapters: [],
        tables: 0,
        images: 0,
        diagrams: 0,
        formulas: [],
        codeBlocks: [],
        lists: []
      },
      quiz: [],
      flashcards: []
    };
  }
}

export async function getDakshaLessonPackage(sourceText, context = 'topic', sourceName = 'topic') {
  try {
    const prompt = `You are Daksha AI, a premium lesson generator for learners.
Create a complete course package based on the following source: ${sourceName} (${context}).
Generate the following sections automatically:
- completeCourse
- beginnerExplanation
- intermediateExplanation
- advancedExplanation
- realWorldExamples
- interviewQuestions
- practiceQuestions
- quiz
- flashcards
- revisionNotes
- cheatSheet
- mindMap
- learningRoadmap

Return only valid JSON with these exact keys. Keep each section clear and learner-focused.

Source content:
${sourceText}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for the lesson package.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      completeCourse: content,
      beginnerExplanation: content,
      intermediateExplanation: '',
      advancedExplanation: '',
      realWorldExamples: [],
      interviewQuestions: [],
      practiceQuestions: [],
      quiz: [],
      flashcards: [],
      revisionNotes: '',
      cheatSheet: '',
      mindMap: '',
      learningRoadmap: ''
    };
  } catch (error) {
    console.error("AI Lesson Package Error:", error);
    return {
      completeCourse: "I couldn't generate the lesson package. Please try again later.",
      beginnerExplanation: "I couldn't generate the lesson package.",
      intermediateExplanation: "",
      advancedExplanation: "",
      realWorldExamples: [],
      interviewQuestions: [],
      practiceQuestions: [],
      quiz: [],
      flashcards: [],
      revisionNotes: "",
      cheatSheet: "",
      mindMap: "",
      learningRoadmap: ""
    };
  }
}

export async function generateLessonSuite(topic) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: 'You are an expert educational AI. Generate a complete lesson suite for the given topic. Return ONLY a valid JSON object. Do not include markdown formatting or extra text.' },
        { role: 'user', content: `Generate a lesson suite for: "${topic}". 
        Return a JSON object with exactly these keys:
        "course_title" (string), 
        "beginner" (string), "intermediate" (string), "advanced" (string), 
        "examples" (array of strings), "interview_questions" (array of strings), 
        "practice_questions" (array of strings), 
        "quiz" (array of exactly 10 objects with "question" (string), "options" (array of 4 strings), "answer" (string)), 
        "flashcards" (array of objects with "front" (string), "back" (string)), 
        "revision_notes" (string), "cheat_sheet" (string), "mind_map" (string), 
        "roadmap" (array of strings).` }
      ]
    });

    let content = response.choices[0].message.content;
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(content);
    if (!parsed || !parsed.course_title || !parsed.beginner) {
      throw new Error('Missing required keys in AI JSON response');
    }

    return parsed;
  } catch (error) {
    console.error('Lesson Suite Generation/Parse Error:', error);
    return null;
  }
}

export async function generateSkillRoadmap(skill) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a professional skill roadmap.` },
        { role: 'user', content: `Create a professional skill roadmap for: ${skill}. Return ONLY valid JSON with this exact structure:
{
  "skill": "${skill}",
  "skillOverview": "<overview>",
  "beginnerRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "intermediateRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "advancedRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "dailyStudyPlan": ["<plan item 1>", "<plan item 2>", "<plan item 3>"],
  "weeklyGoals": ["<goal 1>", "<goal 2>", "<goal 3>"],
  "monthlyGoals": ["<goal 1>", "<goal 2>", "<goal 3>"],
  "requiredTools": ["<tool 1>", "<tool 2>"],
  "freeResources": ["<resource 1>", "<resource 2>"],
  "paidResources": ["<resource 1>", "<resource 2>"],
  "bestYouTubeChannels": ["<channel 1>", "<channel 2>"],
  "bestBooks": ["<book 1>", "<book 2>"],
  "bestWebsites": ["<website 1>", "<website 2>"],
  "projects": ["<project 1>", "<project 2>"],
  "portfolioIdeas": ["<idea 1>", "<idea 2>"],
  "internshipPreparation": ["<prep 1>", "<prep 2>"],
  "jobPreparation": ["<prep 1>", "<prep 2>"],
  "freelancingGuide": ["<step 1>", "<step 2>"],
  "businessOpportunities": ["<opportunity 1>", "<opportunity 2>"],
  "futureScope": ["<scope 1>", "<scope 2>"],
  "salaryInformation": "<salary summary>",
  "finalChecklist": ["<check item 1>", "<check item 2>"]
}` }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      skill,
      skillOverview: `A practical roadmap for learning ${skill} with strong fundamentals, portfolio projects, and career growth.`,
      beginnerRoadmap: [`Learn the core concepts of ${skill}`],
      intermediateRoadmap: [`Practice real examples of ${skill}`],
      advancedRoadmap: [`Build professional work in ${skill}`],
      dailyStudyPlan: ['Study consistently for 45-60 minutes', 'Practice one small skill each day'],
      weeklyGoals: ['Complete one learning milestone'],
      monthlyGoals: ['Build a portfolio project'],
      requiredTools: ['Laptop', 'Reliable internet'],
      freeResources: ['Official documentation', 'YouTube tutorials'],
      paidResources: ['Premium courses'],
      bestYouTubeChannels: ['Educational channels'],
      bestBooks: ['Foundational books'],
      bestWebsites: ['Official websites'],
      projects: [`Create a project around ${skill}`],
      portfolioIdeas: ['Create a case study'],
      internshipPreparation: ['Prepare a polished resume'],
      jobPreparation: ['Practice interview answers'],
      freelancingGuide: ['Create a simple service offer'],
      businessOpportunities: ['Explore niche opportunities'],
      futureScope: ['Follow industry growth'],
      salaryInformation: 'Salary depends on level, location, and specialization.',
      finalChecklist: ['Practice regularly', 'Build portfolio work']
    };
  } catch (error) {
    console.error('Skill Roadmap Generation Error:', error);
    return null;
  }
}

export async function getLearningPath(skill) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: DAKSHA_SYSTEM_PROMPT },
        { role: 'user', content: `Create a structured learning roadmap for someone who wants to learn ${skill}. Break it down into 5 distinct modules from beginner to advanced. For each module, provide a clear title and a brief 1-2 sentence description of what will be learned. Format the output cleanly in Markdown.` }
      ]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    return "I am having trouble generating a roadmap right now. Please try again later.";
  }
}

export async function generateTeacherLesson(topic) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a teacher lesson.` },
        { role: 'user', content: `Create a polished teacher-style lesson for the topic: ${topic}. Return only valid JSON with this exact structure:
{
  "title": "<lesson title>",
  "beginner": "<clear beginner explanation>",
  "intermediate": "<medium-depth explanation>",
  "advanced": "<advanced explanation>",
  "examples": ["<example 1>", "<example 2>", "<example 3>"],
  "important_points": ["<point 1>", "<point 2>", "<point 3>"],
  "common_mistakes": ["<mistake 1>", "<mistake 2>", "<mistake 3>"],
  "summary": "<short summary>",
  "difficulty": "Beginner|Intermediate|Advanced"
}` }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: `${topic} Lesson`,
      beginner: `Start by understanding the core idea behind ${topic}.`,
      intermediate: `Build on that by exploring practical applications of ${topic}.`,
      advanced: `Go deeper by analyzing nuance, trade-offs, and advanced uses of ${topic}.`,
      examples: [`A simple example for ${topic}.`],
      important_points: ['Understand the fundamentals first.'],
      common_mistakes: ['Skipping the basics.'],
      summary: `A strong summary of ${topic} should connect the basics with real-world use.`,
      difficulty: 'Beginner'
    };
  } catch (error) {
    console.error('Teacher Lesson Generation Error:', error);
    return null;
  }
}

export async function get3DPartExplanation(partName) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: DAKSHA_SYSTEM_PROMPT },
        { role: 'user', content: `The user is viewing a 3D model of the Solar System and just clicked on: ${partName}. Give a brief, engaging, 2-3 sentence explanation of what ${partName} is.` }
      ]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI 3D Error:", error);
    return "I couldn't load the information for this part.";
  }
}
