import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function getDakshaResponse(prompt, language = "English") {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.0-pro",
      systemInstruction: `You are Daksha AI, a universal teacher. Your goal is to teach the user anything they want to learn clearly and simply. You MUST respond entirely in ${language}.`
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "I am having trouble connecting to my brain right now. Please try again later.";
  }
}

export async function getDakshaImageResponse(base64Image, mimeType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro-vision" });
    const result = await model.generateContent([
      { inlineData: { data: base64Image, mimeType: mimeType } },
      { text: "Analyze this image. Extract all the knowledge, text, or concepts from it. Explain what this is and teach me about it simply." }
    ]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Vision Error:", error);
    return "I couldn't process this image. Please try a clearer photo or a different file.";
  }
}

export async function getLearningPath(skill) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const prompt = `Create a structured learning roadmap for someone who wants to learn ${skill}. Break it down into 5 distinct modules from beginner to advanced. For each module, provide a clear title and a brief 1-2 sentence description of what will be learned. Format the output cleanly in Markdown.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "I am having trouble generating a roadmap right now. Please try again later.";
  }
}

export async function get3DPartExplanation(partName) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const prompt = `The user is viewing a 3D model of the Solar System and just clicked on: ${partName}. Give a brief, engaging, 2-3 sentence explanation of what ${partName} is.`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("AI 3D Error:", error);
    return "I couldn't load the information for this part.";
  }
}
