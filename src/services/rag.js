import { supabase } from './supabase';
import { generateEmbedding } from './gemini';

/**
 * Split text into chunks with overlap
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }

  return chunks;
}

/**
 * Store document chunks with embeddings in Supabase
 */
export async function storeDocumentChunks(documentId, text, metadata = {}) {
  const chunks = chunkText(text);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i]);
      
      const { data, error } = await supabase
        .from('document_chunks')
        .insert({
          document_id: documentId,
          chunk_index: i,
          content: chunks[i],
          embedding: embedding,
          metadata: metadata,
        })
        .select()
        .single();

      if (error) throw error;
      results.push(data);
    } catch (err) {
      console.error(`Error storing chunk ${i}:`, err);
    }
  }

  return results;
}

/**
 * Search for relevant document chunks using vector similarity
 */
export async function searchDocuments(query, matchCount = 5) {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const { data, error } = await supabase
      .rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: matchCount,
      });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error searching documents:', err);
    return [];
  }
}

/**
 * Build context from search results
 */
export function buildContext(searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return '';
  }

  return searchResults
    .map((result, index) => `[Dokumen ${index + 1}] (Relevansi: ${(result.similarity * 100).toFixed(1)}%)\n${result.content}`)
    .join('\n\n---\n\n');
}
