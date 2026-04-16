import { VercelRequest, VercelResponse } from '@vercel/node';
import { createGoogleGenerativeAI } from '@google/genai';

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

    if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'CONFIG_ERROR', message: 'API Key no detectada.' });
    }

    try {
        const client = createGoogleGenerativeAI({ apiKey: API_KEY });
        const { action, payload = {} } = req.body || {};
        
        // Forzamos estabilidad con 1.5-flash
        const model = 'gemini-1.5-flash';

        if (action === 'chatWithAssistant') {
            const { prompt, image, tools, history = [] } = payload;
            
            const parts: any[] = [];
            if (image && image.data && image.mimeType) {
                parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
            }
            if (prompt) parts.push({ text: prompt });

            const contents = [
                ...history.map((h: any) => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                })),
                { role: 'user', parts }
            ];

            const response = await client.models.generateContent({
                model,
                contents,
                config: {
                    tools: tools || undefined
                }
            });

            return res.status(200).json({
                text: response.text || '',
                toolCalls: response.functionCalls || []
            });
        }

        if (action === 'analyzeFormula') {
            const { prompt } = payload;
            const response = await client.models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return res.status(200).json({ text: response.text });
        }

        if (action === 'parseRequirements' || action === 'parseIngredients') {
            const { systemInstruction, parts } = payload;
            const response = await client.models.generateContent({
                model,
                contents: [{ role: 'user', parts }],
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json"
                }
            });
            return res.status(200).json({ text: response.text });
        }

        return res.status(400).json({ error: 'INVALID_ACTION' });

    } catch (error: any) {
        console.error('SERVER_AI_ERROR:', error);
        return res.status(500).json({
            error: 'AI_ERROR',
            details: error?.message,
            stack: error?.stack
        });
    }
}