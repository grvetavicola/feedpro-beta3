import { GoogleGenAI } from '@google/genai';
import { FormulationResult, Product, Ingredient, Nutrient, ChatMessage } from '../types';
import { getAssistantPrompt } from '../lib/i18n/translations';

const getDisabledMessage = (language: string) => {
    if (language === 'en') return "AI functionality is temporarily unavailable or disabled by the server.";
    if (language === 'pt') return "A funcionalidade IA está temporariamente indisponível.";
    if (language === 'ru') return "Функции ИИ временно недоступны.";
    return "La funcionalidad de IA está temporalmente deshabilitada por el servidor.";
}

const getErrorMessage = (language: string) => {
    if (language === 'en') return "There was an error communicating with the AI. Please check the console for more details.";
    if (language === 'pt') return "Houve um erro ao comunicar com a IA. Por favor, verifique o console para mais detalhes.";
    if (language === 'ru') return "Произошла ошибка при связи с ИИ. Пожалуйста, проверьте консоль для получения дополнительной информации.";
    return "Hubo un error al comunicarse con la IA en la nube. Por favor, revisa la consola para más detalles.";
}

const LOCAL_DEV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
let localAiInstance: GoogleGenAI | null = null;
if (LOCAL_DEV_API_KEY) {
    localAiInstance = new GoogleGenAI({ apiKey: LOCAL_DEV_API_KEY });
}

const callServerlessAI = async (action: string, payload: any): Promise<string> => {
    const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost'; 
    
    if (isProduction || !localAiInstance) {
        const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload })
        });
        
        if (!res.ok) {
            throw new Error(`Serverless Error: ${res.statusText}`);
        }
        
        const data = await res.json();
        return data.text || '';
    } else {
        // LOCAL DEVELOPMENT FALLBACK
        const activeModelName = payload.model === 'gemini-3-flash-preview' ? 'gemini-1.5-flash' : (payload.model || 'gemini-1.5-flash');
        const model = localAiInstance.getGenerativeModel({ model: activeModelName });
        
        if (action === 'chatWithAssistant') {
            const finalParts: any[] = [{ text: payload.prompt }];
            if (payload.image) {
                finalParts.unshift({ inlineData: { mimeType: payload.image.mimeType, data: payload.image.data } });
            }
            const result = await model.generateContent({ contents: [{ role: 'user', parts: finalParts }] });
            const response = await result.response;
            return response.text() || '';
        }
        
        if (action === 'analyzeFormula') {
            const result = await model.generateContent(payload.prompt);
            const response = await result.response;
            return response.text() || '';
        }
        
        if (action === 'parseRequirements' || action === 'parseIngredients') {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: payload.parts }],
                generationConfig: { responseMimeType: "application/json" },
                systemInstruction: payload.systemInstruction
            });
            const response = await result.response;
            return response.text() || '';
        }
        return '';
    }
};



export const analyzeFormulaWithGemini = async (result: FormulationResult, product: Product, language: string): Promise<string> => {
  const model = 'gemini-1.5-flash';

  const ingredientsText = result.items.map(f => {
      return `- Ingrediente ID ${f.ingredientId}: ${f.percentage.toFixed(2)}% (${f.weight.toFixed(2)} kg)`;
  }).join('\n');
  
  const finalCompositionText = result.nutrientAnalysis.map(c => `- Nutriente ID ${c.nutrientId}: ${c.value.toFixed(2)}`).join('\n');
  
  const prompt = `
    Act as an expert animal nutritionist. Analyze this feed formula result:
    Product: ${product.name}
    Total Batch Cost: ${result.totalCost} USD
    
    Formula Items:
    ${ingredientsText}
    
    Nutritional Analysis:
    ${finalCompositionText}

    Provide a brief, professional analysis in ${language}.
    1. Comment on the economic efficiency.
    2. Highlight any potential nutritional risks or excesses.
    3. Suggest improvements if any.
    Format with Markdown bolding for key points.
  `;

  try {
    return await callServerlessAI('analyzeFormula', { prompt, model });
  } catch (error) {
    console.error("Error contacting Serverless Gemini API:", error);
    return getErrorMessage(language);
  }
};


export const chatWithAssistant = async (
    history: ChatMessage[], 
    question: string,
    context: { ingredients: Ingredient[], nutrients: Nutrient[], products: Product[] },
    language: string,
    image?: { mimeType: string; data: string }
): Promise<{ text: string, toolCalls?: any[] }> => {
    const modelName = 'gemini-1.5-flash'; // Cambiado de 2.0 a 1.5 para mayor estabilidad si es necesario, o mantener 2.0 si se prefiere

    const contextText = `
      Ingredientes Disponibles (IDs y Precios): ${context.ingredients.filter(i => i.price > 0).map(i => `${i.name} (ID: ${i.id}, $${i.price}/kg)`).join(', ')}.
      Nutrientes Base (IDs): ${context.nutrients.map(n => `${n.name} (ID: ${n.id})`).join(', ')}.
      Productos Definidos: ${context.products.map(p => `${p.name} (ID: ${p.id})`).join(', ')}.
    `;
    
    const conversationHistory = history.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n');

    const prompt = getAssistantPrompt(language, {
        contextText,
        conversationHistory,
        question,
        hasImage: !!image
    });

    const tools = [
        {
            functionDeclarations: [
                {
                    name: "set_ingredient_price",
                    description: "Actualiza el precio de un ingrediente específico en la matriz.",
                    parameters: {
                        type: "object",
                        properties: {
                            id: { type: "string", description: "El ID del ingrediente (ej: CORN, SOY)." },
                            price: { type: "number", description: "El nuevo precio por kg." }
                        },
                        required: ["id", "price"]
                    }
                },
                {
                    name: "adjust_nutrient_limit",
                    description: "Ajusta los límites mínimos o máximos de un nutriente para la dieta actual.",
                    parameters: {
                        type: "object",
                        properties: {
                            nutrientId: { type: "string", description: "El ID del nutriente (ej: PROT, ME)." },
                            min: { type: "number", description: "Valor mínimo (opcional)." },
                            max: { type: "number", description: "Valor máximo (opcional)." }
                        },
                        required: ["nutrientId"]
                    }
                },
                {
                    name: "run_optimization",
                    description: "Ejecuta el motor de optimización para encontrar la fórmula de menor costo.",
                    parameters: {
                        type: "object",
                        properties: {
                            applySafety: { type: "boolean", description: "Si se debe aplicar el escudo de seguridad." }
                        }
                    }
                }
            ]
        }
    ];

    try {
        const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost'; 
        
        if (isProduction || !localAiInstance) {
            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'chatWithAssistant', 
                    payload: { prompt, model, image, tools } 
                })
            });
            
            if (!res.ok) throw new Error(`Serverless Error: ${res.statusText}`);
            const data = await res.json();
            return { text: data.text || '', toolCalls: data.toolCalls };
        } else {
            // Optimizado para Gemini SDK local (@google/genai)
            const model = localAiInstance.getGenerativeModel({ 
                model: modelName,
                tools: tools as any
            });

            const chat = model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                }))
            });

            const result = await chat.sendMessage(question);
            const response = await result.response;
            const text = response.text() || '';
            const calls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall) || [];
            
            return { 
                text, 
                toolCalls: calls.length > 0 ? calls.map(c => c.functionCall) : undefined 
            };
        }
    } catch (error) {
        console.error("Error en chatWithAssistant:", error);
        return { text: getErrorMessage(language) };
    }
};

export const parseRequirementsWithGemini = async (
  inputData: { type: 'text' | 'image', data: string, mimeType?: string },
  nutrients: Nutrient[]
): Promise<{ 
    nutrientConstraints: { [key: string]: { min?: number, max?: number } }, 
    productName?: string 
}> => {
  const modelName = 'gemini-1.5-flash';

  const nutrientMap = nutrients.map(n => `${n.id}: ${n.name} (${n.unit})`).join('\n');

  const systemInstruction = `
    You are a data extraction specialist for animal nutrition.
    Your task is to extract nutritional requirements from the provided input (image of a table or text from excel).
    
    I have a specific list of internal Nutrient IDs. You MUST map the input data to these IDs.
    
    Known Nutrients List (ID: Name Unit):
    ${nutrientMap}
    
    Output Format: JSON ONLY. No markdown blocks.
    Structure:
    {
      "productName": "Extracted or inferred name",
      "nutrientConstraints": {
        "NUTRIENT_ID": { "min": number, "max": number }
      }
    }
    
    Rules:
    1. If the input specifies a single value (e.g., "Protein 20%"), set it as 'min'. If it says "Max 10", set as 'max'.
    2. Try to find a product name in the header.
    3. Ignore nutrients that do not match the Known Nutrients List reasonably well.
    4. Convert units if necessary (e.g., if input is 3000 kcal and system uses Mcal, convert to 3).
  `;

  const parts: any[] = [];
  
  if (inputData.type === 'image') {
      parts.push({
          inlineData: {
              mimeType: inputData.mimeType || 'image/jpeg',
              data: inputData.data
          }
      });
      parts.push({ text: "Extract the nutritional requirements from this image." });
  } else {
      parts.push({ text: `Extract data from this text/csv content:\n${inputData.data}` });
  }

  try {
      const text = await callServerlessAI('parseRequirements', { systemInstruction, parts, model: modelName });
      if (!text) return { nutrientConstraints: {} };
      return JSON.parse(text);
  } catch (error) {
      console.error("Error parsing requirements:", error);
      throw error;
  }
};

export const parseIngredientsWithGemini = async (
    inputData: { type: 'text' | 'file', data: string, mimeType?: string },
    nutrients: Nutrient[]
  ): Promise<{ 
      ingredients: { name: string; price?: number; nutrients: { [nutrientId: string]: number } }[],
      newNutrients: { tempId: string; name: string; unit: string }[]
  }> => {
    const modelName = 'gemini-1.5-flash';
  
    const nutrientMap = nutrients.map(n => `ID: ${n.id} = ${n.name} (${n.unit})`).join('\n');
  
    const systemInstruction = `
      You are a data entry specialist for animal nutrition.
      Your task is to extract a list of ingredients and their nutritional composition from the provided input (Table image, PDF, or Excel text).
      
      I have a specific list of Known Nutrients.
      
      Known Nutrients List:
      ${nutrientMap}
      
      TASK:
      1. Identify the ingredients (rows) and their price (if available).
      2. Identify the nutrients (columns).
      3. For each nutrient column found:
         - If it matches a "Known Nutrient", use its existing ID.
         - If it is a NEW nutrient (not in the list), create a "tempId" (e.g., "new_selenium"), determine its Name and Unit.
      
      Output Format: JSON ONLY. No markdown blocks.
      Structure:
      {
        "newNutrients": [
            { "tempId": "string", "name": "string", "unit": "string" }
        ],
        "ingredients": [
            {
                "name": "Ingredient Name",
                "price": number (optional, default 0),
                "nutrients": {
                    "EXISTING_ID_OR_TEMP_ID": number
                }
            }
        ]
      }
      
      Rules:
      1. Extract all ingredients found.
      2. Map header names like "CP", "Prot", "PB" to the correct ID for Protein.
      3. Convert units if necessary to match the Known Nutrients List units.
      4. Be smart about "Aditivos" or "Matrix Values", treat them as nutrients if they have numeric values.
    `;
  
    const parts: any[] = [];
    
    if (inputData.type === 'file') {
        parts.push({
            inlineData: {
                mimeType: inputData.mimeType || 'application/pdf',
                data: inputData.data
            }
        });
        parts.push({ text: "Extract ingredients and nutrients from this document/image." });
    } else {
        parts.push({ text: `Extract ingredients from this text/csv content:\n${inputData.data}` });
    }
  
    try {
        const text = await callServerlessAI('parseIngredients', { systemInstruction, parts, model: modelName });
        if (!text) return { ingredients: [], newNutrients: [] };
        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing ingredients:", error);
        throw error;
    }
  };

export const getGeminiPrompt = () => "";