import fs from 'fs';

const constantsPath = 'constants.ts';
const constantsContent = fs.readFileSync(constantsPath, 'utf-8');

const ingredientsPath = 'generated_ingredients.js';
const ingredientsContent = fs.readFileSync(ingredientsPath, 'utf-8');

// The exported target is `export const INITIAL_INGREDIENTS: Ingredient[] = [`
// find index of export const INITIAL_INGREDIENTS
const startIndex = constantsContent.indexOf('export const INITIAL_INGREDIENTS: Ingredient[] = [');
// find the closing block `];\n\nexport const INITIAL_BASES` or similar.
const endIndex = constantsContent.indexOf('export const INITIAL_BASES', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const before = constantsContent.substring(0, startIndex);
    
    // endIndex points to "export const INITIAL_BASES", let's make sure we go back to encompass the array end.
    // actually, let's just use regex or index to find `];` before `export const INITIAL_BASES`
    const sliceBeforeBases = constantsContent.substring(startIndex, endIndex);
    const endOfArray = sliceBeforeBases.lastIndexOf('];');
    
    const after = constantsContent.substring(startIndex + endOfArray + 2);

    const result = before + ingredientsContent.trim() + '\n\n' + after.trimStart();
    
    fs.writeFileSync(constantsPath, result);
    console.log("Injected Successfully!");
} else {
    console.log("Could not find blocks");
}
