import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GraphData, Character } from '../types';
import { 
  GEMINI_MODEL, 
  SYSTEM_INSTRUCTION, 
  INCREMENTAL_UPDATE_PROMPT 
} from '../constants';
import { estimateTokens } from './epubService';

// Schema is shared for both partial and final results
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    characters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique identifier for the character" },
          name: { type: Type.STRING, description: "Display name of the character" },
          description: { type: Type.STRING, description: "Brief description of role" },
          importance: { type: Type.INTEGER, description: "Relevance score 1-10" },
          group: { type: Type.STRING, description: "The specific faction, family, or social circle (e.g. 'Stark', 'Ministry of Magic'). Use 'Unaffiliated' if unknown." },
        },
        required: ["id", "name", "description", "importance", "group"]
      }
    },
    relationships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING, description: "Source character ID" },
          target: { type: Type.STRING, description: "Target character ID" },
          relationship: { type: Type.STRING, description: "Type of relationship (e.g. Friends)" },
          details: { type: Type.STRING, description: "Context of the relationship" },
          strength: { type: Type.INTEGER, description: "Strength score 1-10" },
        },
        required: ["source", "target", "relationship", "details", "strength"]
      }
    }
  },
  required: ["characters", "relationships"]
};

// Configuration for Chunking
const CHUNK_SIZE_TOKENS = 40000; // ~160k characters. Safe buffer within 1M context.
const CHUNK_OVERLAP_TOKENS = 1000; // Overlap to catch boundary relationships

export const generateGraph = async (
  bookText: string, 
  apiKey: string,
  onProgress?: (msg: string) => void
): Promise<GraphData> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a Gemini API key.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const totalTokens = estimateTokens(bookText);

  let currentGraph: GraphData = { nodes: [], links: [] };

  // Strategy Decision: Incremental Build
  if (totalTokens < CHUNK_SIZE_TOKENS * 1.5) {
    // Small enough for a single pass
    if (onProgress) onProgress("Analyzing full text in single pass...");
    currentGraph = await retry(() => updateGraphIncremental(ai, currentGraph, bookText, INCREMENTAL_UPDATE_PROMPT));
  } else {
    // --- Incremental Phase: Chunking & Updating ---
    if (onProgress) onProgress(`Splitting ${totalTokens.toLocaleString()} tokens into segments...`);
    const chunks = chunkText(bookText, CHUNK_SIZE_TOKENS, CHUNK_OVERLAP_TOKENS);
    
    for (let i = 0; i < chunks.length; i++) {
      if (onProgress) onProgress(`Incrementally updating graph with part ${i + 1}/${chunks.length}...`);
      try {
        currentGraph = await retry(() => updateGraphIncremental(ai, currentGraph, chunks[i], INCREMENTAL_UPDATE_PROMPT));
      } catch (e) {
        console.warn(`Failed to update graph with chunk ${i}`, e);
        // Continue with the current graph state if a chunk fails
      }
    }
  }

  return currentGraph;
};

/**
 * Retries a function with exponential backoff.
 */
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}

/**
 * Incrementally updates a graph with a specific string of text.
 */
async function updateGraphIncremental(ai: GoogleGenAI, currentGraph: GraphData, text: string, prompt: string): Promise<GraphData> {
  // Convert current graph to JSON string to pass as context
  const currentGraphJson = JSON.stringify({
    characters: currentGraph.nodes,
    relationships: currentGraph.links
  });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      parts: [
        { text: prompt },
        { text: `\n\nCURRENT GRAPH STATE:\n${currentGraphJson}` },
        { text: `\n\nNEW TEXT SEGMENT:\n${text}` }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      // Use some thinking budget for entity resolution and relationship updates
      thinkingConfig: { thinkingBudget: 1024 } 
    }
  });

  const jsonText = response.text;
  if (!jsonText) return currentGraph; // Return previous state if no output
  
  try {
    const parsed = JSON.parse(jsonText);
    return {
      nodes: parsed.characters || [],
      links: parsed.relationships || []
    };
  } catch (e) {
    console.error("Failed to parse segment JSON", e);
    return currentGraph; // Return previous state on parse error
  }
}

/**
 * Helper to split text into overlapping chunks based on approximate token count.
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  // Rough char conversion: 1 token ~= 4 chars
  const charChunk = chunkSize * 4;
  const charOverlap = overlap * 4;
  
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const chunkStartIndex = startIndex;
    let endIndex = startIndex + charChunk;
    if (endIndex >= text.length) {
      endIndex = text.length;
    } else {
      // Try to break at a paragraph or newline to be clean
      const lastNewline = text.lastIndexOf('\n', endIndex);
      if (lastNewline > startIndex + charChunk * 0.8) {
        endIndex = lastNewline;
      }
    }

    chunks.push(text.substring(startIndex, endIndex));
    
    if (endIndex === text.length) break;
    
    // Move start pointer back by overlap amount
    startIndex = endIndex - charOverlap;
    
    // Ensure we always move forward at least a bit
    if (startIndex <= chunkStartIndex) {
        startIndex = endIndex; 
    }
  }

  return chunks;
}
