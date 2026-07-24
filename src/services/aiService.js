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

export async function getDakshaTextResponse(extractedText) {
  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-chat:free',
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
