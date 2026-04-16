import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'API_KEY_NOT_CONFIGURED', message: 'The serverless environment is missing the Gemini API Key.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const { action, payload } = req.body;

        if (action === 'chatWithAssistant') {
            const { prompt, model: modelName, image, tools } = payload;
            const activeModel = (modelName as string) === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (modelName || 'gemini-1.5-flash');
            
            const parts: any[] = [{ text: prompt }];
            if (image) {
                parts.unshift({
                    inlineData: {
                        mimeType: image.mimeType,
                        data: image.data
                    }
                });
            }
            
            const response = await ai.models.generateContent({
                model: activeModel,
                contents: [{ role: 'user', parts }],
                config: { tools: tools as any }
            });

            return res.status(200).json({ 
                text: response.text || '', 
                toolCalls: response.functionCalls 
            });
        }

        if (action === 'analyzeFormula') {
            const { prompt, model: modelName } = payload;
            const activeModel = (modelName as string) === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (modelName || 'gemini-1.5-flash');
            
            const response = await ai.models.generateContent({
                model: activeModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            return res.status(200).json({ text: response.text });
        }

        if (action === 'parseRequirements' || action === 'parseIngredients') {
            const { systemInstruction, parts, model: modelName } = payload;
            const activeModel = (modelName as string) === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (modelName || 'gemini-1.5-flash');
            
            const response = await ai.models.generateContent({
                model: activeModel,
                contents: [{ role: 'user', parts }],
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json"
                }
            });
            return res.status(200).json({ text: response.text });
        }

        return res.status(400).json({ error: 'Invalid action provided' });

    } catch (error: any) {
        console.error('Serverless AI Request Failed:', error);
        return res.status(500).json({ error: 'AI_INTERNAL_ERROR', details: error?.message || 'Unknown error' });
    }
}
