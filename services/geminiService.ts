import { GoogleGenAI } from "@google/genai";

export const getFinancialInsight = async (summary: string): Promise<string> => {
  // Check if process is defined (avoids ReferenceError in some browser builds)
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  
  if (!apiKey) {
      console.warn("Gemini API Key missing");
      return "Configuração de IA ausente. Verifique as variáveis de ambiente.";
  }
  
  try {
    // Initialize inside the function to avoid top-level crashes
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