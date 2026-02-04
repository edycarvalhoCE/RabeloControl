
import { GoogleGenAI } from "@google/genai";

export const getFinancialInsight = async (summary: string, apiKeyFromSettings?: string): Promise<string> => {
  // Try to use key from Settings first, then env variable
  const apiKey = apiKeyFromSettings || process.env.API_KEY;
  
  if (!apiKey) {
      console.warn("Gemini API Key missing");
      return "⚠️ Configuração de IA ausente.\n\nVá em 'Configurações' no menu lateral e insira sua Chave de API do Google Gemini para ativar este recurso.";
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Fix: Updated to recommended model for Basic Text Tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a financial analyst for a bus rental company. Analyze this data summary and give 3 bullet points of advice or insight. Keep it brief and professional (Portuguese). Data: ${summary}`,
    });
    
    // Fix: Using the .text property as per GenerateContentResponse guidelines
    return response.text || "Sem insights no momento.";
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message && error.message.includes('API key not valid')) {
        return "❌ Chave de API inválida. Verifique se copiou corretamente nas Configurações.";
    }
    return "Erro ao gerar análise. Tente novamente mais tarde.";
  }
};
