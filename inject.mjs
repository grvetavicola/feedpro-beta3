import fs from 'fs';

const constantsPath = 'constants.ts';
const constantsContent = fs.readFileSync(constantsPath, 'utf-8');

const ingredientsPath = 'new_ingredients_block.ts';
const ingredientsContent = fs.readFileSync(ingredientsPath, 'utf-8');

const startIndex = constantsContent.indexOf('export const INITIAL_INGREDIENTS: Ingredient[] = [');
const endIndex = constantsContent.indexOf('export const INITIAL_BASES', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const before = constantsContent.substring(0, startIndex);
    const sliceBeforeBases = constantsContent.substring(startIndex, endIndex);
    const endOfArray = sliceBeforeBases.lastIndexOf('];');
    
    const after = constantsContent.substring(startIndex + endOfArray + 2);

    const result = before + ingredientsContent.trim() + '\n\n' + after.trimStart();
    
    fs.writeFileSync(constantsPath, result);
    console.log("Injected Successfully!");
} else {
    console.log("Could not find blocks");
}
