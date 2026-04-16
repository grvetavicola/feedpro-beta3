import { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!API_KEY || API_KEY === 'PLACEHOLDER_API_KEY') {
        return res.status(500).json({ error: 'API_KEY_MISSING' });
    }

    try {
        const { action, payload = {} } = req.body || {};
        const model = 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

        let geminiPayload: any = {};

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

            geminiPayload = {
                contents,
                tools: tools && tools.length > 0 ? tools : undefined
            };
        } else if (action === 'analyzeFormula') {
            const { prompt } = payload;
            geminiPayload = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            };
        } else if (action === 'parseRequirements' || action === 'parseIngredients') {
            const { systemInstruction, parts } = payload;
            geminiPayload = {
                systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                contents: [{ role: 'user', parts }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error Response:', data);
            return res.status(response.status).json({ 
                error: 'GEMINI_API_ERROR', 
                details: data.error?.message || 'Error en la API de Google' 
            });
        }

        // Extracting text and tool calls from raw response
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.find((p: any) => p.text)?.text || '';
        const functionCalls = candidate?.content?.parts
            ?.filter((p: any) => p.functionCall)
            ?.map((p: any) => p.functionCall) || [];

        return res.status(200).json({
            text,
            toolCalls: functionCalls
        });

    } catch (error: any) {
        console.error('FATAL_SERVER_ERROR:', error);
        return res.status(500).json({
            error: 'AI_REBUILD_FAILURE',
            details: error?.message
        });
    }
}