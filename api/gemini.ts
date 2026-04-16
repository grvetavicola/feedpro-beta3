import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'CONFIG_ERROR', message: 'API Key missing' });
    }

    try {
        // Constructor verificado como 'true' en el entorno local
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const { action, payload = {} } = req.body || {};
        const model = 'gemini-1.5-flash';

        if (action === 'chatWithAssistant') {
            const { prompt, image, tools, history = [] } = payload;
            const parts: any[] = [];
            
            if (image?.data && image?.mimeType) {
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

            // En @google/genai 1.x, las herramientas van en 'config'
            const response = await ai.models.generateContent({
                model,
                contents,
                config: { tools: tools && tools.length > 0 ? tools : undefined }
            });

            return res.status(200).json({
                text: response.text || '',
                toolCalls: response.functionCalls || []
            });
        }

        if (action === 'analyzeFormula') {
            const { prompt } = payload;
            const response = await ai.models.generateContent({
                model,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return res.status(200).json({ text: response.text });
        }

        if (action === 'parseRequirements' || action === 'parseIngredients') {
            const { systemInstruction, parts } = payload;
            const response = await ai.models.generateContent({
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
        console.error('GENINI_API_FAILURE:', error);
        return res.status(500).json({
            error: 'AI_SERVICE_ERROR',
            message: error?.message,
            details: error?.stack
        });
    }
}