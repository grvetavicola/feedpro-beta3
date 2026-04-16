import { GoogleGenAI } from '@google/genai';

console.log("Checking GoogleGenAI exports and instance properties...");
try {
    const genAI = new GoogleGenAI('DUMMY_KEY');
    console.log("Instance created successfully.");
    console.log("Available keys on instance:", Object.keys(genAI));
    console.log("getGenerativeModel exists:", typeof genAI.getGenerativeModel === 'function');
    // @ts-ignore
    console.log("models exists:", typeof genAI.models === 'object');
} catch (e) {
    console.error("Error creating instance:", e);
}
