import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getFinancialInsight = async (summary: string): Promise<string> => {
  if (!process.env.API_KEY) return "API Key not configured.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a financial analyst for a bus rental company. Analyze this data summary and give 3 bullet points of advice or insight. Keep it brief and professional (Portuguese). Data: ${summary}`,
    });
    return response.text || "Sem insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar análise.";
  }
};
