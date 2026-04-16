import { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    if (!API_KEY) return res.status(500).json({ error: 'API_KEY_ERR' });

    try {
        const { action, payload = {} } = req.body || {};
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        let geminiPayload: any = {};
        if (action === 'chatWithAssistant') {
            const { prompt, image, tools, history = [] } = payload;
            const parts: any[] = [];
            if (image?.data) parts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } });
            if (prompt) parts.push({ text: prompt });

            const contents = [
                ...history.map((h: any) => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                })),
                { role: 'user', parts }
            ];
            geminiPayload = { contents, tools: tools?.length ? tools : undefined };
        } else if (action === 'analyzeFormula') {
            geminiPayload = { contents: [{ role: 'user', parts: [{ text: payload.prompt }] }] };
        } else if (action === 'parseRequirements' || action === 'parseIngredients') {
            geminiPayload = {
                systemInstruction: payload.systemInstruction ? { parts: [{ text: payload.systemInstruction }] } : undefined,
                contents: [{ role: 'user', parts: payload.parts }],
                generationConfig: { responseMimeType: "application/json" }
            };
        }

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        const data = await resp.json();
        if (!resp.ok) return res.status(resp.status).json(data);

        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.find((p: any) => p.text)?.text || '';
        const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => p.functionCall) || [];

        return res.status(200).json({ text, toolCalls: functionCalls });

    } catch (e: any) {
        return res.status(500).json({ error: 'FATAL', msg: e.message });
    }
}
