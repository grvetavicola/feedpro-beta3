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

    const isPlaceholder = !API_KEY || API_KEY === 'PLACEHOLDER_API_KEY' || API_KEY.includes('YOUR_API_KEY');
    if (isPlaceholder) {
        return res.status(500).json({
            error: 'API_KEY_NOT_CONFIGURED',
            message: 'La API Key de Gemini no está configurada.'
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY as string });
        const { action, payload = {} } = req.body || {};

        // Normalización de modelo: Si llega gemini-3 o gemini-2.5, forzamos 1.5-flash por estabilidad
        const getActiveModel = (m: any) => {
            const name = String(m || 'gemini-1.5-flash');
            if (name.includes('gemini-3') || name.includes('gemini-2.5')) return 'gemini-1.5-flash';
            return name;
        };

        const activeModel = getActiveModel(payload.model);

        if (action === 'chatWithAssistant') {
            const { prompt, image, tools, history = [] } = payload;
            
            if (!prompt && !image) {
                return res.status(400).json({ error: 'BAD_REQUEST', message: 'Falta prompt o imagen.' });
            }

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

            const requestParams: any = {
                model: activeModel,
                contents
            };

            if (tools && Array.isArray(tools) && tools.length > 0) {
                requestParams.config = { tools };
            }

            const response = await ai.models.generateContent(requestParams);

            return res.status(200).json({
                text: response.text || '',
                toolCalls: response.functionCalls || []
            });
        }

        if (action === 'analyzeFormula') {
            const { prompt } = payload;
            const response = await ai.models.generateContent({
                model: activeModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            return res.status(200).json({ text: response.text });
        }

        if (action === 'parseRequirements' || action === 'parseIngredients') {
            const { systemInstruction, parts } = payload;
            
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

        return res.status(400).json({ error: 'INVALID_ACTION' });

    } catch (error: any) {
        console.error('Gemini Serverless Error:', error);
        return res.status(500).json({
            error: 'AI_INTERNAL_ERROR',
            details: error?.message || 'Error en el servidor.'
        });
    }
}