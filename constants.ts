
export const GEMINI_MODEL = 'gemini-3-flash-preview';

// Approximate cost per 1M input tokens for Flash
export const COST_PER_1M_TOKENS = 0.075; 

export const SYSTEM_INSTRUCTION = "You are a precise data extraction engine. Output strictly valid JSON conforming to the requested schema.";

export const INCREMENTAL_UPDATE_PROMPT = `
You are maintaining a persistent, evolving social graph of a book.
You are given the CURRENT STATE of the graph (as JSON), and a NEW SEGMENT of text from the book.
Your task is to READ the new segment and UPDATE the graph.

1. **Entity Resolution & Updates**: 
   - Add new characters that appear in the segment.
   - Update existing characters if you learn new information (e.g., full name, new title, change in group affiliation).
   - Merge aliases if you discover two names refer to the same person.
   - Increase the 'importance' score (up to 10) for characters active in this segment.
2. **Relationship Updates**:
   - Add new relationships that occur.
   - Update existing relationships if the dynamic changes (e.g., from "Strangers" to "Allies" or "Enemies").
   - Increase the 'strength' score (up to 10) for relationships reinforced in this segment.
   - Append new context to the 'details' of the relationship.
3. **Language**: Ensure all output remains in the original language of the text.

Return the FULLY UPDATED graph as a single JSON object containing the complete 'characters' and 'relationships' lists.
`;
