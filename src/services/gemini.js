import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

let genAI = null;

export function getGenAI() {
  if (!genAI && apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getModel(modelName = 'gemini-3.1-pro-preview', systemInstruction = '') {
  const ai = getGenAI();
  if (!ai) return null;

  const config = { model: modelName };
  if (systemInstruction) {
    config.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }
  return ai.getGenerativeModel(config);
}

export function getEmbeddingModel() {
  const ai = getGenAI();
  if (!ai) return null;
  return ai.getGenerativeModel({ model: 'gemini-embedding-2-preview' });
}

/**
 * Generate embeddings for a given text
 */
export async function generateEmbedding(text) {
  const model = getEmbeddingModel();
  if (!model) throw new Error('Gemini API key not configured');

  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Stream chat response from Gemini
 */
export async function* streamChat(prompt, systemInstruction = '', history = []) {
  const model = getModel(undefined, systemInstruction);
  if (!model) throw new Error('Gemini API key not configured');

  const chat = model.startChat({
    history: history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
  });

  const result = await chat.sendMessageStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

/**
 * Single shot response (non-streaming)
 */
export async function generateResponse(prompt, systemInstruction = '') {
  const model = getModel(undefined, systemInstruction);
  if (!model) throw new Error('Gemini API key not configured');

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return result.response.text();
}
