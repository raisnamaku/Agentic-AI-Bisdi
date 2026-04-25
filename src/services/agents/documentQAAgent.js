import { searchDocuments, buildContext } from '../rag';
import { streamChat, generateResponse } from '../gemini';

const SYSTEM_INSTRUCTION = `Kamu adalah Agen Penjawab Pertanyaan Akademik yang cerdas dan ramah.
Tugasmu adalah menjawab pertanyaan mahasiswa berdasarkan dokumen-dokumen yang tersedia di database.

ATURAN:
1. Jawab HANYA berdasarkan konteks dokumen yang diberikan
2. Jika informasi tidak ditemukan dalam dokumen, katakan dengan jujur bahwa informasi tersebut belum tersedia
3. Gunakan bahasa Indonesia yang formal namun ramah
4. Berikan jawaban yang terstruktur dan mudah dipahami
5. Sertakan referensi dokumen yang relevan jika memungkinkan
6. Jika pertanyaan ambigu, minta klarifikasi`;

/**
 * Document QA Agent - answers questions based on uploaded documents
 */
export async function* documentQAAgent(query, chatHistory = []) {
  // Search relevant documents
  const searchResults = await searchDocuments(query, 5);
  const context = buildContext(searchResults);

  let prompt;
  if (context) {
    prompt = `Berdasarkan konteks dokumen berikut, jawab pertanyaan mahasiswa.

KONTEKS DOKUMEN:
${context}

PERTANYAAN: ${query}

Berikan jawaban yang komprehensif dan terstruktur berdasarkan konteks di atas.`;
  } else {
    prompt = `Pertanyaan dari mahasiswa: ${query}

Catatan: Tidak ada dokumen yang ditemukan terkait pertanyaan ini. 
Berikan jawaban umum jika memungkinkan, dan sarankan untuk menghubungi admin untuk informasi lebih lanjut.`;
  }

  yield* streamChat(prompt, SYSTEM_INSTRUCTION, chatHistory);
}

/**
 * Check if a query should be handled by this agent
 */
export function canHandle(query) {
  const keywords = [
    'apa', 'bagaimana', 'kapan', 'dimana', 'siapa', 'mengapa', 'kenapa',
    'jelaskan', 'informasi', 'prosedur', 'syarat', 'jadwal', 'aturan',
    'peraturan', 'ketentuan', 'cara', 'proses', 'langkah', 'biaya',
    'persyaratan', 'dokumen', 'formulir', 'berapa', 'apakah'
  ];
  const lower = query.toLowerCase();
  return keywords.some(k => lower.includes(k));
}
