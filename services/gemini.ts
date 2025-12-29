
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const GeminiService = {
  /**
   * Generates a professional product description and specs based on name and category.
   */
  generateProductDetails: async (name: string, rubric: string) => {
    try {
      const model = 'gemini-2.5-flash';
      const prompt = `
        You are a technical data specialist for an industrial switch manufacturer.
        
        Task: Generate a JSON object for a product named "${name}" in the rubric "${rubric}".
        
        The JSON must match this structure exactly:
        {
          "description": "Professional marketing text (max 2 sentences)",
          "series": "One of: HQ, SD22, SS22",
          "technicalSpecs": {
             "mountingHole": "22MM",
             "protectionClass": "One of: IP40, IP65",
             "illumination": "YES or NO",
             "ringIllumination": "YES or NO"
          },
          "shape": "One of: Round, Square, Rounded square",
          "connectionMaterial": "One of: AgNi, Gold-plated",
          "colorFrontBezel": "One of: Black, Silver, Stainless steel",
          "connectionType": "One of: Screw connection, Solder Pin, Push-In",
          "switchingFunction": "One of: Latching function, Momentary function",
          "availableContactTypes": ["List 2 common contacts e.g. 1NO, 2NC"]
        }

        Return ONLY the raw JSON.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) return null;
      
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      return null;
    }
  }
};
