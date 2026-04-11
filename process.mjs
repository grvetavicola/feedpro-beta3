import fs from 'fs';

const image2Transcription = `
100000 CEREALES
101010 Maíz
101011 Maíz, baja CP
101012 Maíz Chile
101020 Maíz, alto aceite
102010 Sorgo, tanino<0,5
102050 Sorgo, tanino>0,5
103010 Mijo, grano
104010 Triticale
105010 Cebada
106010 Arveja
107010 Trigo, grano 13
107050 Trigo, residuo
108010 Arroz, quebrado
200000 OLEAGINOSAS
201010 Soja, inf. ext. 36
202010 Soja, micronizada
300000 SUBPROD.VEGETAL
301100 Soja, pasta 43
301150 Soja, pasta 44
301200 Soja, pasta 45
301250 Soja, pasta 46
301300 Soja, pasta 47
301350 Soja, pasta 48
301450 Soja, cascara
301500 Soja, concentrado proteico 90
301810 Aceite de Soja
302010 Arroz, harina integral
302020 Arroz, harina desgrasada
303050 Trigo, afrecho 15
303060 Trigo, afrecho 19
304010 Maíz, gluten 60
304040 Maíz, gluten 22
305010 Girasol, harina 30
305020 Girasol, harina 35
305030 Girasol, harina 40
306010 Canola, harina
307010 Coco, aceite
308010 Azucar
400000 SUBPROD.ANIMAL
401010 Carne, harina 35
401020 Carne, harina 40
401022 Carne, harina 42
401030 Carne, harina 45
401040 Carne, harina 50
401042 Carne, harina 50 (Dig.)
401050 Carne, harina 55
402010 Visceras, Harina 52/12
403010 Pescado, harina
404010 Sangre, harina 82
404110 Sangre, plasma (AP920)
404220 Sangre, hemoglobina (AP301)
405010 Pescado, harina 55
405020 Pescado, harina 60
405030 Pescado, harina 65
406010 Casca, bovina
406020 Grasa, aves
407010 Lactosa
407110 Leche, polvo integral
407120 Leche, polvo descremada
407150 Suero, de leche dulce
407160 Suero de leche, acido
407220 Sustituto, de leche K50 (Sloten)
407230 Sustituto, de leche K71 (Sloten)
501000 Levadura, de caña seca 35
600000 AMINOACIDOS
600010 L-Lisina HCL 99
600110 L-Treonina 98,5
600210 DL-Metionina 99
600310 L-Triptofano 98,5
600710 L-Isoleucina 99%
600810 L-Valina 99%
700000 MINERALES
700110 Sal comun
700210 Calcareo
700310 Huesos, harina calcinada
700410 Fosfato Bicalcico 18
702010 Óxido de Zinc
702110 Sulfato de Cobre
705000 VITAMINAS
705210 Cloruro de Colina 60 %
800110 Antioxidante
800120 BHT
800130 BHA
800200 ADITIVOS
800210 Aroma
800310 Palatabilizante
800410 Enzima
800510 Acidificante
800600 Promotor
800610 Colistina 8
800620 Tilosina 98
800630 Carbadox
801010 Vermifugo
890080 Caulim
890090 Otros
910000 PRODUCTOS
910010 Premix Vitamínico
920010 Premix Micromineral
933101 Núcleo Crecimiento/01
933102 Núcleo Crecimiento/02
933103 Núcleo Crecimiento/03
`;

const mappingCodeToName = {};

image2Transcription.split('\n').filter(l => l.trim().length > 0).forEach(l => {
    const spaceIdx = l.indexOf(' ');
    const code = l.substring(0, spaceIdx).trim();
    const name = l.substring(spaceIdx + 1).trim();
    if (code && !code.endsWith('000') && !code.endsWith('0000') && code !== '705000') {
        mappingCodeToName[code] = name;
    }
});

const constantsFile = fs.readFileSync('constants.ts', 'utf8');

const constantsParsed = constantsFile;
const nutrientsStartIndex = constantsParsed.indexOf('export const INITIAL_NUTRIENTS');
const nutrientsEndIndex = constantsParsed.indexOf('];', nutrientsStartIndex) + 2;
const nutrientsBlock = constantsParsed.substring(nutrientsStartIndex, nutrientsEndIndex);


// 1. Get code to ID for Nutrients ONLY inside INITIAL_NUTRIENTS
const nutrientsMap = {}; // code -> id
const nutRegex = /{\s*id:\s*'([^']+)',\s*code:\s*(\d+)/g;
let m;
while ((m = nutRegex.exec(nutrientsBlock)) !== null) {
    nutrientsMap[String(m[2])] = m[1];
}

// 2. Get old names to {category, subcategory, family}
const oldIngredientsMap = {}; 
const ingRegex = /name:\s*'([^']+)',\s*category:\s*'([^']*)'(?:,\s*subcategory:\s*'([^']*)')?(?:,\s*family:\s*'([^']*)')?/g;
while ((m = ingRegex.exec(constantsFile)) !== null) {
    oldIngredientsMap[m[1]] = {
        category: m[2] || '',
        subcategory: m[3] || '',
        family: m[4] || ''
    };
}

// 3. Read CSV
const csvRaw = fs.readFileSync('matrizbase.csv', 'utf8'); 
const lines = csvRaw.split('\n');

const headers = lines[0].split(';');
// index -> code
const headerCodes = {};
for (let i = 3; i < headers.length; i++) {
    const hc = headers[i].trim();
    if (hc.startsWith('_')) {
        headerCodes[i] = hc.substring(1);
    }
}

// Prepare ingredients structures
const processedIngs = {}; // code -> { ... }

for (const code of Object.values(headerCodes)) {
    const name = mappingCodeToName[code];
    if (!name) continue; 
    
    let metadata = oldIngredientsMap[name];
    if (!metadata) {
        const nameClean = name.replace('protéico', 'proteico');
        metadata = oldIngredientsMap[nameClean] || { category: 'SUPLEMENTO', subcategory: '', family: '' };
    }
    
    processedIngs[code] = {
        code,
        name,
        category: metadata.category,
        subcategory: metadata.subcategory,
        family: metadata.family,
        nutrients: {}
    };
}

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(';');
    const nutCode = parts[0]?.trim();
    const nutId = nutrientsMap[nutCode];
    if (!nutId) continue;
    
    for (const j in headerCodes) {
        const ingCode = headerCodes[j];
        if (processedIngs[ingCode]) {
            let valStr = parts[j] || '';
            valStr = valStr.replace(',', '.');
            const val = parseFloat(valStr);
            if (!isNaN(val) && val !== 0) {
                processedIngs[ingCode].nutrients[nutId] = val;
            }
        }
    }
}

// Rebuild INITIAL_INGREDIENTS string
let resultStr = 'export const INITIAL_INGREDIENTS: Ingredient[] = [\n';
let counter = 1;

for (const code of Object.keys(processedIngs)) {
    const ing = processedIngs[code];
    let entry = `  { id: 'i${counter}', code: ${ing.code}, name: '${ing.name.replace(/'/g, "\\'")}', category: '${ing.category}'`;
    if (ing.subcategory) entry += `, subcategory: '${ing.subcategory}'`;
    if (ing.family) entry += `, family: '${ing.family}'`;
    
    entry += `, price: 0, stock: 0, nutrients: { `;
    const nutPairs = Object.entries(ing.nutrients).map(([nid, val]) => `'${nid}': ${val}`);
    entry += nutPairs.join(', ') + ` } },\n`;
    
    resultStr += entry;
    counter++;
}
resultStr += '];\n';

fs.writeFileSync('new_ingredients_block.ts', resultStr);
console.log('Successfully mapped CSV to new_ingredients_block.ts!');
