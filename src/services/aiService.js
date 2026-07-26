import OpenAI from 'openai';
import { compressImageDataUrl, getCachedValue, setCachedValue } from '../utils/cache';
import { sanitizePrompt, rateLimiter } from '../utils/security';

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

function optimizeTextPayload(text, maxCharacters = 24000) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, maxCharacters);
}

function getCacheKey(prefix, payload) {
  return `${prefix}:${String(payload || '').slice(0, 180)}`;
}

async function callProtectedModel(request, { retries = 2, timeoutMs = 20000 } = {}) {
  const rate = rateLimiter('ai-request', 20, 60_000);
  if (!rate.allowed) {
    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
  }

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out.')), timeoutMs);
    });

    try {
      return await Promise.race([request(), timeoutPromise]);
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    }
  }
  throw lastError;
}

export async function getDakshaResponse(prompt, language = "English") {
  const cacheKey = getCacheKey(`ai-response:${language}`, prompt);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 10);
  if (cached) return cached;
  try {
    const safePrompt = sanitizePrompt(prompt);
    const safeInput = optimizeTextPayload(safePrompt, 12000);
    if (safeInput.length > 12000) {
      throw new Error('Input exceeds the supported request size.');
    }
    const response = await callProtectedModel(() => openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST respond entirely in ${language}.` },
        { role: 'user', content: safeInput }
      ]
    }));
    const content = response.choices[0].message.content;
    setCachedValue(cacheKey, content, 1000 * 60 * 10);
    return content;
  } catch (error) {
    console.error("AI Error:", error);
    return "I am having trouble connecting to my brain right now. Please try again later.";
  }
}

export async function getDakshaImageResponse(base64Image, mimeType) {
  const cacheKey = getCacheKey('ai-image', `${mimeType}:${base64Image?.slice(0, 120)}`);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 20);
  if (cached) return cached;

  try {
    const safeImage = String(base64Image || '').slice(0, 800000);
    const optimizedImage = safeImage.startsWith('data:image') ? await compressImageDataUrl(`data:${mimeType};base64,${safeImage}`, 0.8, 1200) : safeImage;
    const response = await callProtectedModel(() => openai.chat.completions.create({
      model: 'meta-llama/llama-3.2-11b-vision-instruct:free',
      messages: [
        { role: 'user', content: [
          { type: 'text', text: 'Analyze this image. Extract all the knowledge, text, or concepts from it. Explain what this is and teach me about it simply.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${optimizedImage}` } }
        ] }
      ]
    }));
    const content = response.choices[0].message.content;
    setCachedValue(cacheKey, content, 1000 * 60 * 20);
    return content;
  } catch (error) {
    console.error("AI Vision Error:", error);
    return "I couldn't process this image. Please try a clearer photo or a different file.";
  }
}

export async function getDakshaTextResponse(extractedText) {
  const cacheKey = getCacheKey('ai-text', extractedText);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 15);
  if (cached) return cached;

  try {
    const safeText = optimizeTextPayload(sanitizePrompt(extractedText), 18000);
    const response = await callProtectedModel(() => openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: 'You are Daksha AI. The user has uploaded a document and extracted the text. Read the text, summarize the key knowledge, and explain what the document is about simply.' },
        { role: 'user', content: safeText }
      ]
    }));
    const content = response.choices[0].message.content;
    setCachedValue(cacheKey, content, 1000 * 60 * 15);
    return content;
  } catch (error) {
    console.error("AI Text Error:", error);
    return "I couldn't process this document. Please try a different file.";
  }
}

export async function getDakshaDocumentAnalysis(extractedText, fileName = 'document', fileType = 'unknown') {
  const cacheKey = getCacheKey('ai-document-analysis', `${fileName}:${fileType}:${extractedText?.slice(0, 120)}`);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 20);
  if (cached) return cached;

  try {
    const limitedText = optimizeTextPayload(sanitizePrompt(extractedText), 18000);
    const prompt = `You are Daksha AI, a professional document understanding engine.
Analyze the text from the uploaded document and detect headings, chapters, tables, images, diagrams, formulas, code blocks, and lists.
Extract the main topics, keywords, definitions, important points, summary, and difficulty level.
Return only valid JSON with the following keys: overview, summary, topics, keywords, definitions, importantPoints, difficulty, detectedElements, quiz, flashcards.

The uploaded file is: ${fileName} (${fileType}).

Text to analyze:
${limitedText}`;

    const response = await callProtectedModel(() => openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for document analysis.` },
        { role: 'user', content: prompt }
      ]
    }));

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    const fallback = {
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
    setCachedValue(cacheKey, fallback, 1000 * 60 * 20);
    return fallback;
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
  const cacheKey = getCacheKey('ai-lesson-package', `${context}:${sourceName}:${sourceText?.slice(0, 120)}`);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 20);
  if (cached) return cached;

  try {
    const limitedSource = optimizeTextPayload(sanitizePrompt(sourceText), 18000);
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
${limitedSource}`;

    const response = await callProtectedModel(() => openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for the lesson package.` },
        { role: 'user', content: prompt }
      ]
    }));

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    const fallback = {
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
    setCachedValue(cacheKey, fallback, 1000 * 60 * 20);
    return fallback;
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

export async function generatePptLearningPackage(fileName, pptModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium presentation-to-course generator.
Create a structured learning package from this PPT content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Document file name: ${fileName}
User id: ${userId}
Presentation title: ${pptModel?.title || 'Untitled'}
Overview: ${pptModel?.overview || ''}
Slides: ${JSON.stringify(pptModel?.slides || [])}
Charts: ${JSON.stringify(pptModel?.charts || [])}
Images: ${JSON.stringify(pptModel?.images || [])}
Tables: ${JSON.stringify(pptModel?.tables || [])}
Diagrams: ${JSON.stringify(pptModel?.diagrams || [])}
Notes: ${JSON.stringify(pptModel?.notes || [])}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for presentation learning generation.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: pptModel?.title || fileName,
      summary: 'A structured lesson package was generated from your presentation.',
      beginnerLesson: 'Start by understanding the central message and the first few slides.',
      intermediateLesson: 'Connect the ideas across slides and understand the supporting evidence.',
      advancedLesson: 'Compare the structure, evaluate the arguments, and apply the ideas in context.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core message → important slides → applications',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('PPT Learning Package Error:', error);
    return {
      title: fileName,
      summary: 'I could not generate the PPT learning package right now.',
      beginnerLesson: 'Start by reading the slides carefully.',
      intermediateLesson: 'Break the deck into sections and relate the ideas.',
      advancedLesson: 'Go deeper into the supporting data and examples.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core message → important slides → applications',
      learningRoadmap: []
    };
  }
}

export async function generateYouTubeLearningPackage(videoUrl, videoModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium YouTube-to-course generator.
Create a structured learning package from this video content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Video url: ${videoUrl}
User id: ${userId}
Video title: ${videoModel?.title || 'Untitled'}
Transcript: ${JSON.stringify(videoModel?.transcript || [])}
Chapters: ${JSON.stringify(videoModel?.chapters || [])}
Topics: ${JSON.stringify(videoModel?.topics || [])}
Definitions: ${JSON.stringify(videoModel?.definitions || [])}
Important concepts: ${JSON.stringify(videoModel?.importantConcepts || [])}
Code snippets: ${JSON.stringify(videoModel?.codeSnippets || [])}
Formulas: ${JSON.stringify(videoModel?.formulas || [])}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for YouTube learning generation.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: videoModel?.title || 'YouTube lesson',
      summary: 'A structured lesson package was generated from your video.',
      beginnerLesson: 'Start by understanding the main idea and the first part of the video.',
      intermediateLesson: 'Connect the main ideas with examples and supporting details.',
      advancedLesson: 'Compare the concepts, evaluate the applications, and build deeper understanding.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → examples → applications',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('YouTube Learning Package Error:', error);
    return {
      title: videoModel?.title || 'YouTube lesson',
      summary: 'I could not generate the YouTube learning package right now.',
      beginnerLesson: 'Start by reviewing the transcript carefully.',
      intermediateLesson: 'Break the lesson into smaller sections and connect the ideas.',
      advancedLesson: 'Go deeper into the theory and practice the key concepts.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → examples → applications',
      learningRoadmap: []
    };
  }
}

export async function generateCameraLearningPackage(extractedText, imageName = 'camera-image', previewUrl = '', userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium camera OCR-to-learning engine.
Create a complete learning package from the extracted OCR text and image context.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "ocrText": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": [],
  "analysis": {
    "detectedElements": {
      "headings": [],
      "paragraphs": [],
      "tables": [],
      "handwrittenText": [],
      "formulas": [],
      "diagrams": [],
      "codeSnippets": [],
      "concepts": []
    },
    "keyConcepts": [],
    "definitions": [],
    "formulas": [],
    "diagrams": [],
    "qualityWarnings": []
  },
  "lesson": {
    "title": "",
    "summary": "",
    "beginnerLesson": "",
    "intermediateLesson": "",
    "advancedLesson": "",
    "keyConcepts": [],
    "importantDefinitions": [],
    "examples": [],
    "realWorldApplications": [],
    "revisionNotes": [],
    "cheatSheet": [],
    "flashcards": [],
    "quiz": [],
    "mindMap": "",
    "learningRoadmap": []
  }
}

Image name: ${imageName}
User id: ${userId}
Extracted OCR text: ${extractedText}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for camera OCR learning.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: imageName || 'OCR learning session',
      ocrText: extractedText,
      summary: 'The OCR text has been converted into a structured learning package.',
      beginnerLesson: 'Begin by understanding the central idea in the image.',
      intermediateLesson: 'Connect the extracted details into a coherent explanation.',
      advancedLesson: 'Deepen the understanding by exploring deeper implications and examples.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting text → applications',
      learningRoadmap: [],
      analysis: {
        detectedElements: {
          headings: [],
          paragraphs: [],
          tables: [],
          handwrittenText: [],
          formulas: [],
          diagrams: [],
          codeSnippets: [],
          concepts: []
        },
        keyConcepts: [],
        definitions: [],
        formulas: [],
        diagrams: [],
        qualityWarnings: []
      },
      lesson: {
        title: imageName || 'OCR learning session',
        summary: 'The OCR text has been converted into a structured learning package.',
        beginnerLesson: 'Begin by understanding the central idea in the image.',
        intermediateLesson: 'Connect the extracted details into a coherent explanation.',
        advancedLesson: 'Deepen the understanding by exploring deeper implications and examples.',
        keyConcepts: [],
        importantDefinitions: [],
        examples: [],
        realWorldApplications: [],
        revisionNotes: [],
        cheatSheet: [],
        flashcards: [],
        quiz: [],
        mindMap: 'Core idea → supporting text → applications',
        learningRoadmap: []
      }
    };
  } catch (error) {
    console.error('Camera OCR Learning Package Error:', error);
    return {
      title: imageName || 'OCR learning session',
      ocrText: extractedText,
      summary: 'I could not generate the camera OCR lesson package right now.',
      beginnerLesson: 'Review the extracted text carefully.',
      intermediateLesson: 'Group the information into sections.',
      advancedLesson: 'Look for deeper patterns and applications.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting text → applications',
      learningRoadmap: [],
      analysis: {
        detectedElements: {
          headings: [],
          paragraphs: [],
          tables: [],
          handwrittenText: [],
          formulas: [],
          diagrams: [],
          codeSnippets: [],
          concepts: []
        },
        keyConcepts: [],
        definitions: [],
        formulas: [],
        diagrams: [],
        qualityWarnings: []
      },
      lesson: {
        title: imageName || 'OCR learning session',
        summary: 'I could not generate the camera OCR lesson package right now.',
        beginnerLesson: 'Review the extracted text carefully.',
        intermediateLesson: 'Group the information into sections.',
        advancedLesson: 'Look for deeper patterns and applications.',
        keyConcepts: [],
        importantDefinitions: [],
        examples: [],
        realWorldApplications: [],
        revisionNotes: [],
        cheatSheet: [],
        flashcards: [],
        quiz: [],
        mindMap: 'Core idea → supporting text → applications',
        learningRoadmap: []
      }
    };
  }
}

export async function generateWebsiteLearningPackage(url, websiteModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium website-to-course generator.
Create a structured learning package from this webpage content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Website url: ${url}
User id: ${userId}
Page title: ${websiteModel?.title || 'Untitled'}
Content: ${websiteModel?.content || ''}
Headings: ${JSON.stringify(websiteModel?.headings || [])}
Subheadings: ${JSON.stringify(websiteModel?.subheadings || [])}
Code blocks: ${JSON.stringify(websiteModel?.codeBlocks || [])}
Tables: ${JSON.stringify(websiteModel?.tables || [])}
Images: ${JSON.stringify(websiteModel?.images || [])}
Formulas: ${JSON.stringify(websiteModel?.formulas || [])}
Concepts: ${JSON.stringify(websiteModel?.concepts || [])}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for website learning generation.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: websiteModel?.title || 'Web learning lesson',
      summary: 'A structured lesson package was generated from the webpage.',
      beginnerLesson: 'Start with the main purpose and the most important section of the page.',
      intermediateLesson: 'Connect the headings with the supporting examples and details.',
      advancedLesson: 'Go deeper into the concepts and evaluate how the ideas fit together.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core topic → supporting sections → applications',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('Website Learning Package Error:', error);
    return {
      title: websiteModel?.title || 'Web learning lesson',
      summary: 'I could not generate the website learning package right now.',
      beginnerLesson: 'Start by reviewing the page carefully.',
      intermediateLesson: 'Break the content into smaller sections.',
      advancedLesson: 'Go deeper into the supporting details and examples.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core topic → supporting sections → applications',
      learningRoadmap: []
    };
  }
}

export async function generateDocxLearningPackage(fileName, docxModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium document-to-course generator.
Create a structured learning package from this DOCX content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "level": "Beginner",
  "objectives": [],
  "outline": {
    "sections": [{"title": ""}],
    "definitions": [{"term": "", "meaning": ""}],
    "tables": [{"title": ""}],
    "concepts": [{"title": ""}],
    "bookmarks": [{"title": ""}]
  },
  "lessons": [{"title": "", "content": ""}],
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Document file name: ${fileName}
User id: ${userId}
Document title: ${docxModel?.title || 'Untitled'}
Overview: ${docxModel?.overview || ''}
Sections: ${JSON.stringify(docxModel?.sections || [])}
Subsections: ${JSON.stringify(docxModel?.subSections || [])}
Tables: ${JSON.stringify(docxModel?.tables || [])}
Lists: ${JSON.stringify(docxModel?.lists || [])}
Definitions: ${JSON.stringify(docxModel?.definitions || [])}
Formulas: ${JSON.stringify(docxModel?.formulas || [])}
Highlights: ${JSON.stringify(docxModel?.highlights || [])}
Extracted text: ${docxModel?.extractedText || ''}`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for DOCX learning generation.` },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: docxModel?.title || fileName,
      summary: 'A structured learning package was generated from your document.',
      level: 'Beginner',
      objectives: ['Understand the core ideas', 'Learn the most important concepts'],
      outline: {
        sections: [],
        definitions: [],
        tables: [],
        concepts: [],
        bookmarks: []
      },
      lessons: [],
      beginnerLesson: 'Start with the main ideas in the document.',
      intermediateLesson: 'Connect the ideas with examples and practical context.',
      advancedLesson: 'Go deeper into nuance, compare concepts, and evaluate the document.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting sections → application',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('DOCX Learning Package Error:', error);
    return {
      title: fileName,
      summary: 'I could not generate the DOCX learning package right now.',
      level: 'Beginner',
      objectives: ['Review the document structure', 'Learn the key ideas'],
      outline: {
        sections: [],
        definitions: [],
        tables: [],
        concepts: [],
        bookmarks: []
      },
      lessons: [],
      beginnerLesson: 'Start by reading the document carefully.',
      intermediateLesson: 'Break the document into smaller ideas.',
      advancedLesson: 'Compare the concepts and test your understanding.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting sections → application',
      learningRoadmap: []
    };
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

export async function generateQuizEngine(topic, difficulty = 'Medium', questionCount = 10) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a professional quiz generator.` },
        { role: 'user', content: `Create a professional quiz about: ${topic}. Use the difficulty level: ${difficulty}. Create exactly ${questionCount} questions. Return ONLY valid JSON with this exact structure:
{
  "title": "<quiz title>",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "<question>",
      "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
      "answer": "<correct answer>",
      "explanation": "<explanation>",
      "type": "multiple-choice"
    }
  ]
}

Rules:
- Use a mix of question types when appropriate, but keep the output consistent and valid.
- For true/false use options ["True", "False"].
- For fill-in-the-blank, short-answer, or match-the-following, options can be empty arrays.
- Keep the answer and explanation clear and educational.
- Do not include markdown or extra text.` }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: `${topic} Quiz`,
      difficulty,
      questions: [
        {
          question: `What is the main idea of ${topic}?`,
          options: ['A core concept', 'An unrelated idea', 'A random fact', 'A missing answer'],
          answer: 'A core concept',
          explanation: 'This is a basic concept check about the topic.',
          type: 'multiple-choice',
        }
      ],
    };
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    return {
      title: `${topic} Quiz`,
      difficulty,
      questions: [],
    };
  }
}

export async function generateFlashcards(topic, difficulty = 'Mixed') {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-v3:free',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a professional flashcard deck.` },
        { role: 'user', content: `Create a professional flashcard deck for: ${topic}. Difficulty: ${difficulty}. Return ONLY valid JSON with this exact structure:
{
  "title": "<deck title>",
  "category": "<category>",
  "flashcards": [
    {
      "front": "<concept/question>",
      "back": "<answer/explanation>",
      "difficulty": "${difficulty}",
      "tags": ["<tag 1>", "<tag 2>"]
    }
  ]
}
Rules:
- Create 8-12 flashcards.
- Make the cards clear, educational, and useful for revision.
- Do not include markdown or extra text.` }
      ]
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: `${topic} Flashcards`,
      category: 'Study',
      flashcards: [
        {
          front: `What is ${topic}?`,
          back: `A core concept related to ${topic}.`,
          difficulty,
          tags: ['study'],
        },
      ],
    };
  } catch (error) {
    console.error('Flashcard Generation Error:', error);
    return {
      title: `${topic} Flashcards`,
      category: 'Study',
      flashcards: [],
    };
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
