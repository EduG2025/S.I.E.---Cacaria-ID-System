
import { GoogleGenAI, Type } from "@google/genai";
import { api } from "./api";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const validateApiKey = async (testKey: string): Promise<boolean> => {
    try {
        const ai = new GoogleGenAI({ apiKey: testKey });
        await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: { parts: [{ text: "ping" }] } });
        return true;
    } catch (e) { return false; }
};

const getAI = async () => {
  const apiKey = await api.getActiveApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

const extractImage = (res: any): string => {
    const part = res.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("No image returned");
};

export const editResidentPhoto = async (base64Image: string, prompt: string, mimeType: string = 'image/jpeg', retries = 1): Promise<string> => {
  const ai = await getAI();
  const parts = [{ inlineData: { mimeType, data: base64Image } }, { text: prompt }];

  try {
    console.log("Attempting edit with Gemini 3 Pro...");
    const res = await ai.models.generateContent({ model: 'gemini-3-pro-image-preview', contents: { parts } });
    return extractImage(res);
  } catch (error: any) {
    console.warn("Gemini 3 Pro failed, falling back to Flash (Nano Banana)...");
    if (retries > 0) await wait(1500); // Wait before fallback to avoid instant double-hit on rate limit
    
    try {
        const resFallback = await ai.models.generateContent({ model: 'gemini-2.5-flash-image', contents: { parts } });
        return extractImage(resFallback);
    } catch (fbError: any) {
        throw new Error("Failed to edit photo (Quota or Model Error).");
    }
  }
};

export const analyzeDocumentText = async (base64: string, mimeType: string) => {
    const ai = await getAI();
    const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType, data: base64 } }, { text: "Extract JSON: Name, CPF, RG, Date of Birth" }] },
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, cpf:{type:Type.STRING}, rg:{type:Type.STRING}, birthDate:{type:Type.STRING} } } }
    });
    return JSON.parse(res.text || '{}');
};

export const deepAnalyzeDocument = async (base64: string) => {
    const ai = await getAI();
    const res = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64 } }, { text: "Analyze for forgery/editing traces. Concise." }] }
    });
    return res.text;
};

export const fetchCompanyData = async (cnpj: string) => {
    try {
        const ai = await getAI();
        const res = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Search CNPJ "${cnpj}". Return JSON: companyName, street, number, city, state, zip.`,
            config: { tools: [{googleSearch: {}}] }
        });
        const text = res.text || "{}";
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : {};
    } catch (e) { return {}; }
};

export const generatePlaceholderAvatar = async () => { throw new Error("Feature disabled"); };
export const searchPublicData = async () => ({});
