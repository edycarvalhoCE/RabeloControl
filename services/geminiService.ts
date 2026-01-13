import { GoogleGenAI } from "@google/genai";

export const getFinancialInsight = async (summary: string): Promise<string> => {
  // Safe check for API Key in different environments (Vite vs Node)
  let apiKey = '';
  
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY;
    } 
    // Fallback for standard process.env
    else if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
    }
  } catch (e) {
    console.warn("Could not read env vars");
  }
  
  if (!apiKey) {
      console.warn("Gemini API Key missing");
      return "Configuração de IA ausente. Verifique as variáveis de ambiente na Vercel (API_KEY).";
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a financial analyst for a bus rental company. Analyze this data summary and give 3 bullet points of advice or insight. Keep it brief and professional (Portuguese). Data: ${summary}`,
    });
    return response.text || "Sem insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar análise. Tente novamente mais tarde.";
  }
};