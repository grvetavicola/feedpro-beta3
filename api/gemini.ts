import { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const config = {
    api: { bodyParser: { sizeLimit: '10mb' } },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    
    if (!API_KEY) {
        console.error("DEBUG: API_KEY is MISSING.");
        console.error("Available Env Vars (Keys only):", Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('VITE')));
        return res.status(500).json({ error: 'API_KEY_ERR', details: "Clave no encontrada en el servidor" });
    }

    try {
        const { action, payload = {} } = req.body || {};
        const modelName = payload.model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;

        let geminiPayload: any = {};
        
        if (action === 'chatWithAssistant') {
            const { prompt, image, tools } = payload;
            const parts: any[] = [];
            if (image?.data) {
                parts.push({ inlineData: { mimeType: image.mimeType || 'image/jpeg', data: image.data } });
            }
            if (prompt) parts.push({ text: prompt });
            
            geminiPayload = {
                contents: [{ role: 'user', parts }]
            };

            // Solo incluimos tools si el prompt NO es una simple charla corta
            // Esto evita el error de "Unknown name tools" en saludos simples
            const isSimpleChat = prompt && prompt.length < 20 && !prompt.includes('precio') && !prompt.includes('maiz');
            
            if (!isSimpleChat && tools && tools.length > 0) {
                geminiPayload.tools = tools;
            }
        } else {
            // Simplificación absoluta para otros casos
            geminiPayload = {
                contents: [{ role: 'user', parts: [{ text: payload.prompt || 'hola' }] }]
            };
        }

        console.log("SENDING TO GOOGLE:", JSON.stringify({ ...geminiPayload, tools: geminiPayload.tools ? 'PRESENT' : 'NONE' }));

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload)
        });

        const data = await resp.json();
        
        if (!resp.ok) {
            console.error("GOOGLE API ERROR:", JSON.stringify(data, null, 2));
            return res.status(resp.status).json(data);
        }

        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.find((p: any) => p.text)?.text || '';
        
        const functionCalls = candidate?.content?.parts
            ?.filter((p: any) => p.function_call)
            ?.map((p: any) => ({
                name: p.function_call.name,
                args: p.function_call.args
            })) || [];

        return res.status(200).json({ text, toolCalls: functionCalls });

    } catch (e: any) {
        return res.status(500).json({ error: 'FATAL', msg: e.message });
    }
}
