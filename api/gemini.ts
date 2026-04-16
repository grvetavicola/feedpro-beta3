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
    // 1. Filtro de Método
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Control de API Key
    const isPlaceholder = !API_KEY || API_KEY === 'PLACEHOLDER_API_KEY' || API_KEY.includes('YOUR_API_KEY');
    if (isPlaceholder) {
        return res.status(500).json({
            error: 'API_KEY_NOT_CONFIGURED',
            message: 'La API Key de Gemini no está configurada. Por favor, revisa las variables de entorno de Vercel.'
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY as string });

        // 3. Desestructuración Defensiva (Evita colapsos si req.body es anómalo)
        const { action, payload = {} } = req.body || {};

        if (action === 'chatWithAssistant') {
            const { prompt, model: modelName, image, tools } = payload;

            // 4. Validación Temprana (Previene el envío de textos indefinidos a la IA)
            if (!prompt && !image) {
                return res.status(400).json({ error: 'BAD_REQUEST', message: 'El payload requiere un prompt o una imagen.' });
            }

            const activeModel = (modelName as string) === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (modelName || 'gemini-1.5-flash');

            const parts: any[] = [];
            if (prompt) parts.push({ text: prompt });

            if (image && image.data && image.mimeType) {
                parts.unshift({
                    inlineData: {
                        mimeType: image.mimeType,
                        data: image.data
                    }
                });
            }

            // 5. Construcción Dinámica de Configuración (Evita el Error 500 por properties undefined)
            const aiConfig: any = {};
            if (tools && Array.isArray(tools) && tools.length > 0) {
                aiConfig.tools = tools;
            }

            const requestPayload: any = {
                model: activeModel,
                contents: [{ role: 'user', parts }]
            };

            // Solo inyectamos 'config' si realmente hay herramientas válidas
            if (Object.keys(aiConfig).length > 0) {
                requestPayload.config = aiConfig;
            }

            const response = await ai.models.generateContent(requestPayload);

            return res.status(200).json({
                text: response.text || '',
                toolCalls: response.functionCalls || []
            });
        }

        if (action === 'analyzeFormula') {
            const { prompt, model: modelName } = payload;
            if (!prompt) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Falta el prompt para analizar.' });

            const activeModel = (modelName as string) === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (modelName || 'gemini-1.5-flash');

            const response = await ai.models.generateContent({
                model: activeModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });
            return res.status(200).json({ text: response.text });
        }

        if (action === 'parseRequirements' || action === 'parseIngredients') {
            const { systemInstruction, parts, model: modelName } = payload;
            if (!parts || !Array.isArray(parts)) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Faltan las partes (parts) para el parseo.' });

            const activeModel = (modelName as string) === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (modelName || 'gemini-1.5-flash');

            const aiConfig: any = {
                responseMimeType: "application/json"
            };

            if (systemInstruction) {
                aiConfig.systemInstruction = systemInstruction;
            }

            const response = await ai.models.generateContent({
                model: activeModel,
                contents: [{ role: 'user', parts }],
                config: aiConfig
            });
            return res.status(200).json({ text: response.text });
        }

        return res.status(400).json({ error: 'INVALID_ACTION', message: `La acción '${action}' no es válida.` });

    } catch (error: any) {
        // 6. Trazabilidad Completa: Si falla, Vercel mostrará exactamente por qué en sus logs.
        console.error('Serverless AI Request Failed:', error);
        return res.status(500).json({
            error: 'AI_INTERNAL_ERROR',
            details: error?.message || 'Error desconocido en el servidor.',
            stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
        });
    }
}