import { GoogleGenAI, Type } from "@google/genai";
import { api } from "./api";

// --- VALIDATION HELPER ---
export const validateApiKey = async (testKey: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: testKey });
        // Teste simples de texto para validar a chave
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
const getAI = async () => {
  const apiKey = await api.getActiveApiKey();
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: Nenhuma Chave de API ativa encontrada no Sistema.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to extract image data from response
const extractImageFromResponse = (response: any): string => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("A IA processou a solicitação mas não retornou dados de imagem.");
};

// Helper to extract JSON safely
const extractJSON = (text: string | undefined): any => {
    if (!text) return {};
    try {
        // Try standard JSON parse
        return JSON.parse(text);
    } catch (e) {
        // Try extracting from markdown block
        const match = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[1] || match[0]);
            } catch (e2) {
                console.error("Failed to parse extracted JSON string", e2);
            }
        }
        return {};
    }
};

// --- 1. Fast Text Analysis (OCR/Extraction) ---
// Model: gemini-2.5-flash
export const analyzeDocumentText = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<any> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Image } },
          { text: "Extract the following data from this ID document: Name, CPF, RG, Date of Birth. Return strictly as JSON." }
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
// STRATEGY: Priority Gemini 3 Pro -> Fallback Gemini 2.5 Flash (Nano Banana)
export const editResidentPhoto = async (base64Image: string, prompt: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  const ai = await getAI();
  
  const parts = [
    { inlineData: { mimeType: mimeType, data: base64Image } },
    { text: prompt },
  ];

  // TENTATIVA 1: Gemini 3 Pro (Melhor Qualidade)
  try {
    console.log("Tentando edição com Gemini 3 Pro...");
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts },
    });
    return extractImageFromResponse(response);

  } catch (error: any) {
    const errMsg = (error.message || JSON.stringify(error)).toLowerCase();
    console.warn(`Gemini 3 Pro falhou (${errMsg}). Iniciando Fallback Automático...`);

    // Fallback automático para QUALQUER erro (Cota 429, Modelo 404, Server 500)
    // TENTATIVA 2: Gemini 2.5 Flash Image (Nano Banana - Mais Econômico e Rápido)
    try {
        console.log("Tentando fallback com Gemini 2.5 Flash (Nano Banana)...");
        const responseFallback = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts },
        });
        return extractImageFromResponse(responseFallback);
    } catch (fallbackError: any) {
        console.error("Fallback também falhou:", fallbackError);
        throw new Error("Falha na edição de imagem em todos os modelos (Pro e Flash). Tente novamente mais tarde.");
    }
  }
};

// --- 3. Image Generation (Assets) ---
// Model: gemini-3-pro-image-preview
export const generatePlaceholderAvatar = async (description: string, size: '1K' | '2K' | '4K', aspectRatio: string = '1:1'): Promise<string> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: description }] },
      config: {
        imageConfig: {
          imageSize: size,
          aspectRatio: aspectRatio,
        }
      }
    });
    return extractImageFromResponse(response);
  } catch (error) {
    console.error("Error generating avatar:", error);
    throw error;
  }
};

// --- 4. Deep Analysis (Reasoning) ---
// Model: gemini-3-pro-preview
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
export const searchPublicData = async (query: string): Promise<any> => {
  try {
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for public information about: "${query}" in the region of Cacaria, Rio de Janeiro. 
      Return the data in JSON format with keys: address, potentialName, zipcode, notes.`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    return extractJSON(response.text);

  } catch (error) {
    console.error("Error searching public data:", error);
    return { notes: "Search failed or no data found." };
  }
};

// --- 6. Company Data Search (CNPJ) ---
// Model: gemini-2.5-flash
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
      zip (CEP).`,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    return extractJSON(response.text);
  } catch (error) {
    console.error("Error fetching company data:", error);
    return {};
  }
};