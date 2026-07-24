import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true
});

let cachedChatModel = null;
let cachedVisionModel = null;

const retryRequest = async (fn, retries = 2, delay = 700) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

const getAvailableModel = async (filters, fallback) => {
  try {
    const result = await openai.models.list();
    const ids = result.data?.map((model) => model.id).filter(Boolean) || [];
    const exact = ids.find((id) => id === fallback);
    if (exact) return exact;

    const freeMatches = ids.filter((id) => id.includes(':free'));
    const preferredMatch = freeMatches.find((id) => filters.every((filter) => id.includes(filter)));
    if (preferredMatch) return preferredMatch;

    const openrouterFree = ids.find((id) => id === 'openrouter/free');
    if (openrouterFree) return openrouterFree;

    return freeMatches[0] || fallback;
  } catch {
    return fallback;
  }
};

const getChatModel = async () => {
  if (cachedChatModel) return cachedChatModel;
  cachedChatModel = await getAvailableModel(['openrouter'], 'openrouter/free');
  return cachedChatModel;
};

const getVisionModel = async () => {
  if (cachedVisionModel) return cachedVisionModel;
  cachedVisionModel = await getAvailableModel(['openrouter'], 'openrouter/free');
  return cachedVisionModel;
};

const parseResponseContent = (response) => {
  return response?.choices?.[0]?.message?.content || response?.choices?.[0]?.text || '';
};

export async function getDakshaResponse(prompt, language = 'English') {
  const model = await getChatModel();
  try {
    const response = await retryRequest(() => openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: `You are Daksha AI, a universal teacher. Your goal is to teach the user anything they want to learn clearly and simply. You MUST respond entirely in ${language}.` },
        { role: 'user', content: prompt }
      ]
    }));
    return parseResponseContent(response);
  } catch {
    return 'I am having trouble connecting to my brain right now. Please try again later.';
  }
}

export async function getDakshaImageResponse(base64Image, mimeType) {
  const model = await getVisionModel();
  try {
    const response = await retryRequest(() => openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image. Extract all the knowledge, text, or concepts from it. Explain what this is and teach me about it simply.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
          ]
        }
      ]
    }));
    return parseResponseContent(response);
  } catch {
    return 'I couldn\'t process this image. Please try a clearer photo or a different file.';
  }
}

export async function getLearningPath(skill) {
  const model = await getChatModel();
  try {
    const response = await retryRequest(() => openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: `Create a structured learning roadmap for someone who wants to learn ${skill}. Break it down into 5 distinct modules from beginner to advanced. For each module, provide a clear title and a brief 1-2 sentence description of what will be learned. Format the output cleanly in Markdown.`
        }
      ]
    }));
    return parseResponseContent(response);
  } catch {
    return 'I am having trouble generating a roadmap right now. Please try again later.';
  }
}

export async function get3DPartExplanation(partName) {
  const model = await getChatModel();
  try {
    const response = await retryRequest(() => openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: `The user is viewing a 3D model of the Solar System and just clicked on: ${partName}. Give a brief, engaging, 2-3 sentence explanation of what ${partName} is.`
        }
      ]
    }));
    return parseResponseContent(response);
  } catch {
    return 'I couldn\'t load the information for this part.';
  }
}
