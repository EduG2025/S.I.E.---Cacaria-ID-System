import { GoogleGenAI, Type } from "@google/genai";
import { api } from "./api";

// --- VALIDATION HELPER ---
// Used by the Admin Panel to check if a key works before saving
export const validateApiKey = async (testKey: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: testKey });
        // Simple fast call to check validity
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: "ping" }] }
        });
        return true;
    } catch (e) {
        console.error("Key Validation Failed:", e);
        return false;
    }
};

// --- DYNAMIC AI INSTANCE ---
// Fetches the active key from the DB at runtime.
const getAI = async () => {
  const apiKey = await api.getActiveApiKey();
  
  if (!apiKey) {
    throw new Error("Nenhuma Chave de API ativa encontrada no Sistema. Entre em contato com o Administrador para configurar uma chave válida.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- 1. Fast Text Analysis (OCR/Extraction) ---
// Model: gemini-2.5-flash
// Reason: Best trade-off for speed and multimodal capabilities.
export const analyzeDocumentText = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<any> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: "Extract the following data from this ID document: Name, CPF, RG, Date of Birth. Return strictly as JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            cpf: { type: Type.STRING },
            rg: { type: Type.STRING },
            birthDate: { type: Type.STRING },
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw error;
  }
};

// --- 2. Image Editing (Photo Studio) ---
// Model: gemini-2.5-flash-image
// Reason: Specialized model for image manipulation and editing via text prompts.
export const editResidentPhoto = async (base64Image: string, prompt: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("A IA não retornou nenhuma imagem gerada.");
  } catch (error: any) {
    console.error("Error editing photo:", error);
    throw error;
  }
};

// --- 3. Image Generation (Assets) ---
// Model: gemini-3-pro-image-preview
// Reason: Highest quality generation model for creating assets from scratch (1K/2K/4K).
export const generatePlaceholderAvatar = async (description: string, size: '1K' | '2K' | '4K', aspectRatio: string = '1:1'): Promise<string> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: description }]
      },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: aspectRatio,
        }
      }
    });

     for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating avatar:", error);
    throw error;
  }
};

// --- 4. Deep Analysis (Reasoning) ---
// Model: gemini-3-pro-preview
// Reason: Upgraded to Pro 3.0 for superior reasoning capabilities when detecting subtle signs of forgery or tampering.
export const deepAnalyzeDocument = async (base64Image: string): Promise<string> => {
    try {
        const ai = await getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Analyze this document image meticulously for any visual signs of digital tampering, font inconsistencies, or forgery. Be concise and professional." }
                ]
            }
        });
        return response.text || "No analysis available.";
    } catch (e) {
        console.error(e);
        return "Analysis failed.";
    }
}

// --- 5. Census Search (Search Grounding) ---
// Model: gemini-2.5-flash
// Reason: Flash 2.5 is highly efficient and low-latency for tool use (Google Search).
export const searchPublicData = async (query: string): Promise<any> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for public information about: "${query}" in the region of Cacaria, Rio de Janeiro (or general Brazil if specific logic applies). 
      Try to find address details, full name verification if it's a public figure, or zip code.
      Return the data in JSON format with keys: address, potentialName, zipcode, notes.`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return { notes: text };

  } catch (error) {
    console.error("Error searching public data:", error);
    return { notes: "Search failed or no data found." };
  }
};

// --- 6. Company Data Search (CNPJ) ---
// Model: gemini-2.5-flash
// Reason: Flash 2.5 is ideal for quick data retrieval via tools.
export const fetchCompanyData = async (cnpj: string): Promise<any> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for the Brazilian company with CNPJ: "${cnpj}". 
      Return a JSON object with the following keys exactly: 
      companyName (Razão Social), 
      street (Logradouro), 
      number (Número), 
      city (Cidade), 
      state (Estado - UF), 
      zip (CEP).
      If exact number is not found, leave blank.`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const text = response.text || "{}";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return {};
  } catch (error) {
    console.error("Error fetching company data:", error);
    return {};
  }
};