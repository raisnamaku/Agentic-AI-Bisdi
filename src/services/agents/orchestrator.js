import { generateResponse } from '../gemini';
import * as documentQAAgent from './documentQAAgent';
import * as formFillingAgent from './formFillingAgent';
import * as academicInfoAgent from './academicInfoAgent';

const ROUTER_INSTRUCTION = `Kamu adalah router untuk sistem multi-agent chatbot akademik.
Tugasmu adalah mengklasifikasikan pertanyaan user ke salah satu agent berikut:

1. "document_qa" - Untuk pertanyaan yang membutuhkan pencarian informasi dari dokumen yang di-upload (peraturan, jadwal, prosedur spesifik, dll)
2. "form_filling" - Untuk permintaan membuat/mengisi formulir, surat, atau dokumen Word
3. "academic_info" - Untuk pertanyaan umum akademik, tips, atau informasi yang tidak memerlukan dokumen spesifik

Respond HANYA dengan salah satu: document_qa, form_filling, atau academic_info
Tidak perlu penjelasan tambahan.`;

const agents = {
  document_qa: documentQAAgent,
  form_filling: formFillingAgent,
  academic_info: academicInfoAgent,
};

/**
 * Route query to the appropriate agent
 */
export async function routeQuery(query) {
  // Check form filling first (more specific patterns)
  if (formFillingAgent.canHandle(query)) {
    return 'form_filling';
  }

  // Check document QA
  if (documentQAAgent.canHandle(query)) {
    return 'document_qa';
  }

  // Try AI-based routing for ambiguous queries
  try {
    const response = await generateResponse(
      `Klasifikasikan pertanyaan berikut: "${query}"`,
      ROUTER_INSTRUCTION
    );
    
    const agentType = response.trim().toLowerCase();
    if (agents[agentType]) {
      return agentType;
    }
  } catch (e) {
    console.error('Router error, falling back to academic_info:', e);
  }

  // Default fallback
  return 'academic_info';
}

/**
 * Execute the appropriate agent based on the query
 */
export async function* executeAgent(query, chatHistory = []) {
  const agentType = await routeQuery(query);
  
  // Yield agent type info
  yield { type: 'agent_info', agent: agentType };
  
  const agent = agents[agentType];
  
  if (agentType === 'document_qa') {
    for await (const chunk of documentQAAgent.documentQAAgent(query, chatHistory)) {
      yield { type: 'text', content: chunk };
    }
  } else if (agentType === 'form_filling') {
    for await (const chunk of formFillingAgent.formFillingAgent(query, chatHistory)) {
      yield { type: 'text', content: chunk };
    }
  } else {
    for await (const chunk of academicInfoAgent.academicInfoAgent(query, chatHistory)) {
      yield { type: 'text', content: chunk };
    }
  }
}

export { formFillingAgent };
