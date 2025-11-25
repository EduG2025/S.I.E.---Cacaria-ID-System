import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- 1. Fast Text Analysis (Flash) ---
// Used to parse document text or autofill form data
export const analyzeDocumentText = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<any> => {
  try {
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
            text: "Extract the following data from this ID document: Name, CPF, RG, Date of Birth. Return as JSON."
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

// --- 2. Image Editing (Nano Banana / Flash Image) ---
// Used to remove background or apply filters to the resident's photo
export const editResidentPhoto = async (base64Image: string, prompt: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // "Nano Banana" for editing
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt, // e.g., "Change background to white studio backdrop"
          },
        ],
      },
      config: {
          // Nano banana supports direct image output via generateContent
      }
    });

    // Extract image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error editing photo:", error);
    throw error;
  }
};

// --- 3. Image Generation (Pro Image) ---
// Used if the user wants to generate a placeholder or artistic avatar
export const generatePlaceholderAvatar = async (description: string, size: '1K' | '2K' | '4K', aspectRatio: string = '1:1'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // High quality generation maintained as requested
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

// --- 4. Deep Analysis (Flash) ---
// Used for security checks on documents - Standardized to Flash 2.5
export const deepAnalyzeDocument = async (base64Image: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Analyze this document for signs of tampering or forgery. Be concise." }
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
// Used to find public info about a resident or address
export const searchPublicData = async (query: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for public information about: "${query}" in the region of Cacaria, Rio de Janeiro (or general Brazil if specific logic applies). 
      Try to find address details, full name verification if it's a public figure, or zip code.
      Return the data in JSON format with keys: address, potentialName, zipcode, notes.`,
      config: {
        tools: [{googleSearch: {}}],
        // Note: responseMimeType is NOT supported with googleSearch, so we parse manually
      },
    });

    // Extract JSON from markdown code block if present, or just the text
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
// Uses Google Search to find company details based on CNPJ
export const fetchCompanyData = async (cnpj: string): Promise<any> => {
  try {
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