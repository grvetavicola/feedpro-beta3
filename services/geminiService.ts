import { GoogleGenAI } from "@google/genai";
import { FormulationResult, Product, Ingredient, Nutrient, ChatMessage } from '../types';
import { getAssistantPrompt } from '../lib/i18n/translations';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("VITE_GEMINI_API_KEY no encontrada. Las funciones de IA estarán deshabilitadas.");
}

const ai = API_KEY ? new GoogleGenAI(API_KEY) : null;

const getDisabledMessage = (language: string) => {
    if (language === 'en') return "AI functionality is disabled because the API key was not provided.";
    if (language === 'pt') return "A funcionalidade de IA está desabilitada porque a chave da API não foi fornecida.";
    if (language === 'ru') return "Функциональность ИИ отключена, так как ключ API не был предоставлен.";
    return "La funcionalidad de IA está deshabilitada porque la API key no fue proporcionada.";
}

const getErrorMessage = (language: string) => {
    if (language === 'en') return "There was an error communicating with the AI. Please check the console for more details.";
    if (language === 'pt') return "Houve um erro ao comunicar com a IA. Por favor, verifique o console para mais detalhes.";
    if (language === 'ru') return "Произошла ошибка при связи с ИИ. Пожалуйста, проверьте консоль для получения дополнительной информации.";
    return "Hubo un error al comunicarse con la IA. Por favor, revisa la consola para más detalles.";
}


export const analyzeFormulaWithGemini = async (result: FormulationResult, product: Product, language: string): Promise<string> => {
  if (!ai) return getDisabledMessage(language);
  
  const model = 'gemini-1.5-flash';

  const ingredientsText = result.items.map(f => {
      // We don't have ingredientName directly in result.items anymore, we have ingredientId
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
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error("Error contacting Gemini API:", error);
    return getErrorMessage(language);
  }
};


export const chatWithAssistant = async (
    history: ChatMessage[], 
    question: string,
    context: { ingredients: Ingredient[], nutrients: Nutrient[], products: Product[] },
    language: string,
    image?: { mimeType: string; data: string }
): Promise<string> => {
    if (!ai) return getDisabledMessage(language);

    const model = 'gemini-3-flash-preview';

    const contextText = `
      Ingredientes Disponibles y sus precios por kg: ${context.ingredients.filter(i => i.price > 0).map(i => `${i.name} ($${i.price}/kg)`).join(', ')}.
      Nutrientes Base: ${context.nutrients.map(n => n.name).join(', ')}.
      Productos Definidos: ${context.products.map(p => p.name).join(', ')}.
    `;
    
    const conversationHistory = history.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n');

    const prompt = getAssistantPrompt(language, {
        contextText,
        conversationHistory,
        question,
        hasImage: !!image
    });

    try {
        const parts: any[] = [{ text: prompt }];
        if (image) {
            parts.unshift({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.data
                }
            });
        }
        
        const contents = image ? { parts } : prompt;

        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
        });
        return response.text || "";
    } catch (error) {
        console.error("Error contacting Gemini API:", error);
        return getErrorMessage(language);
    }
};

// Función para analizar requerimientos de PRODUCTO desde archivo
export const parseRequirementsWithGemini = async (
  inputData: { type: 'text' | 'image', data: string, mimeType?: string },
  nutrients: Nutrient[]
): Promise<{ 
    nutrientConstraints: { [key: string]: { min?: number, max?: number } }, 
    productName?: string 
}> => {
  if (!ai) throw new Error("API Key missing");

  const model = 'gemini-3-flash-preview';

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
      const response = await ai.models.generateContent({
          model: model,
          contents: { parts },
          config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json"
          }
      });

      const text = response.text;
      if (!text) return { nutrientConstraints: {} };
      
      return JSON.parse(text);
  } catch (error) {
      console.error("Error parsing requirements:", error);
      throw error;
  }
};

// Nueva función para analizar INGREDIENTES desde archivo (Excel, PDF, Imagen)
export const parseIngredientsWithGemini = async (
    inputData: { type: 'text' | 'file', data: string, mimeType?: string },
    nutrients: Nutrient[]
  ): Promise<{ 
      ingredients: { name: string; price?: number; nutrients: { [nutrientId: string]: number } }[],
      newNutrients: { tempId: string; name: string; unit: string }[]
  }> => {
    if (!ai) throw new Error("API Key missing");
  
    const model = 'gemini-3-flash-preview';
  
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
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });
  
        const text = response.text;
        if (!text) return { ingredients: [], newNutrients: [] };
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Error parsing ingredients:", error);
        throw error;
    }
  };

export const getGeminiPrompt = () => "";