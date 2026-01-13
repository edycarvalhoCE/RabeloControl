import { GoogleGenAI } from "@google/genai";

export const getFinancialInsight = async (summary: string): Promise<string> => {
  // Use process.env.API_KEY exclusively as per guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
      console.warn("Gemini API Key missing");
      return "Configuração de IA ausente. Verifique as variáveis de ambiente (API_KEY).";
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a financial analyst for a bus rental company. Analyze this data summary and give 3 bullet points of advice or insight. Keep it brief and professional (Portuguese). Data: ${summary}`,
    });
    // Access property .text directly, do not call .text()
    return response.text || "Sem insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar análise. Tente novamente mais tarde.";
  }
};