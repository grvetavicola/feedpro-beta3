import { GoogleGenAI } from '@google/genai';

async function test() {
    console.log("Checking models...");
    try {
        const genAI = new GoogleGenAI({ apiKey: 'DUMMY' });
        console.log("Models property:", !!genAI.models);
        // We can't actually list models without a real key usually, but let's see if there's a list function
        console.log("Methods on models:", Object.keys(genAI.models));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
