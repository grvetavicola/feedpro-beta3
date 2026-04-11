import fs from 'fs';

const rawText = `
100010	Maíz	MACRO	CEREALES	MAIZ
100020	Maíz, baja CP	MACRO	CEREALES	
100030	Maíz Chile	MACRO	CEREALES	
100040	Maíz, alto aceite	MACRO	CEREALES	MAIZ
100050	Sorgo, tanino<0,5	MACRO	CEREALES	
100060	Sorgo, tanino>0,5	MACRO	CEREALES	
100070	Mijo, grano	MACRO	CEREALES	
100080	Triticale	MACRO	CEREALES	
100090	Cebada	MACRO	CEREALES	
100100	Avena	MACRO	CEREALES	
100110	Trigo, grano 13	MACRO	CEREALES	
100120	Trigo, residuo	MACRO	CEREALES	
100130	Arroz, quebrado	MACRO	CEREALES	
200010	Soja, inf. ext. 36	MACRO	OLEAGINOSAS	SOJA
200020	Soja, micronizada	MACRO	OLEAGINOSAS	SOJA
300010	Soja, pasta 43	MACRO	SUBPROD.VEGETAL	SOJA
300020	Soja, pasta 44	MACRO	SUBPROD.VEGETAL	SOJA
300030	Soja, pasta 45	MACRO	SUBPROD.VEGETAL	SOJA
300040	Soja, pasta 46	MACRO	SUBPROD.VEGETAL	SOJA
300050	Soja, pasta 47	MACRO	SUBPROD.VEGETAL	SOJA
300060	Soja, pasta 48	MACRO	SUBPROD.VEGETAL	SOJA
300070	Soja, cascara	MACRO	SUBPROD.VEGETAL	SOJA
300080	Soja, concentrado proteico 90	MACRO	SUBPROD.VEGETAL	SOJA
300090	Aceite de Soja	MACRO	SUBPROD.VEGETAL	SOJA
300100	Arroz, harina integral	MACRO	SUBPROD.VEGETAL	
300110	Arroz, harina desgrasada	MACRO	SUBPROD.VEGETAL	
300120	Trigo, afrecho 15	MACRO	SUBPROD.VEGETAL	TRIGO
300130	Trigo, afrecho 19	MACRO	SUBPROD.VEGETAL	TRIGO
300140	Maíz, gluten 60	MACRO	SUBPROD.VEGETAL	MAIZ
300150	Maíz, gluten 22	MACRO	SUBPROD.VEGETAL	MAIZ
300160	Girasol, harina 30	MACRO	SUBPROD.VEGETAL	
300170	Girasol, harina 35	MACRO	SUBPROD.VEGETAL	
300180	Girasol, harina 40	MACRO	SUBPROD.VEGETAL	
300190	Canola, harina	MACRO	SUBPROD.VEGETAL	
300200	Coco, aceite	MACRO	SUBPROD.VEGETAL	
300210	Aserrin	MACRO	SUBPROD.VEGETAL	TRIGO
400010	Carne, harina 35	MACRO	SUBPROD.ANIMAL	CARNE, HARINA
400020	Carne, harina 40	MACRO	SUBPROD.ANIMAL	CARNE, HARINA
400030	Carne, harina 42	MACRO	SUBPROD.ANIMAL	
400040	Carne, harina 45	MACRO	SUBPROD.ANIMAL	CARNE, HARINA
400050	Carne, harina 50	MACRO	SUBPROD.ANIMAL	CARNE, HARINA
400060	Carne, harina 50 (Dig.)	MACRO	SUBPROD.ANIMAL	
400070	Carne, harina 55	MACRO	SUBPROD.ANIMAL	CARNE, HARINA
400080	Visceras, Harina 52/12	MACRO	SUBPROD.ANIMAL	VISCERAS, HARINA 52/12
400090	Pescado, harina	MACRO	SUBPROD.ANIMAL	
400100	Sangre, harina 82	MACRO	SUBPROD.ANIMAL	
400110	Sangre, plasma (AP920)	MACRO	SUBPROD.ANIMAL	PLUMAS, HARINA
400120	Sangre, hemoglobina (AP301)	MACRO	SUBPROD.ANIMAL	
400130	Pescado, harina 55	MACRO	SUBPROD.ANIMAL	
400140	Pescado, harina 60	MACRO	SUBPROD.ANIMAL	
400150	Pescado, harina 65	MACRO	SUBPROD.ANIMAL	
400160	Casca, bovina	MACRO	SUBPROD.ANIMAL	
400170	Grasa, aves	MACRO	SUBPROD.ANIMAL	
400180	Lactosa	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400190	Leche, polvo integral	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400200	Leche, polvo descremada	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400210	Suero, de leche dulce	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400220	Suero de leche acido	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400230	Sustituto, de leche K50 (Sloten)	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400240	Sustituto, de leche K71 (Sloten)	MACRO	SUBPROD.ANIMAL	LÁCTEOS
400250	Levadura, de caña seca 35	MACRO	SUBPROD.ANIMAL	
500010	L-Lisina HCL 99	MICRO	AMINOÁCIDOS	
500020	L-Treonina 98,5	MICRO	AMINOÁCIDOS	
500030	DL-Metionina 99	MICRO	AMINOÁCIDOS	
500040	L-Triptofano 98,5	MICRO	AMINOÁCIDOS	
500050	L-Isoleucina 99%	MICRO	AMINOÁCIDOS	
500060	L-Valina 99%	MICRO	AMINOÁCIDOS	
600010	Sal comun	MICRO	MINERALES	
600020	Calcareo	MICRO	MINERALES	
600030	Huesos, harina calcinada	MICRO	MINERALES	
600040	Fosfato Bicalcico 18	MICRO	MINERALES	
600050	Óxido de Zinc	MICRO	MINERALES	
600060	Sulfato de Cobre	MICRO	MINERALES	
700010	Cloruro de Colina 60 %	MICRO	VITAMINAS	
700020	Antioxidante	MICRO	VITAMINAS	
700030	BHT	MICRO	VITAMINAS	
700040	BHA	MICRO	VITAMINAS	
800010	Aroma	MICRO	ADITIVOS	
800020	Palatabilizante	MICRO	ADITIVOS	
800030	Enzima	MICRO	ADITIVOS	
800040	Acidificante	MICRO	ADITIVOS	
800050	Promotor	MICRO	ADITIVOS	
800060	Colistina 8	MICRO	ADITIVOS	
800070	Tilosina 98	MICRO	ADITIVOS	
800080	Carbadox	MICRO	ADITIVOS	
800090	Vermifugo	MICRO	ADITIVOS	
800100	Caulim	MICRO	ADITIVOS	
800110	Otros	MICRO	ADITIVOS	
900010	Premix Vitamínico	MICRO	BLENDS	
900020	Premix Micromineral	MICRO	BLENDS	
900030	Núcleo Crecimiento/01	MICRO	BLENDS	
900040	Núcleo Crecimiento/02	MICRO	BLENDS	
900050	Núcleo Crecimiento/03	MICRO	BLENDS	
1000010	Fitasa A	MICRO	ENZIMAS	
1000020	Fitasa B	MICRO	ENZIMAS	
1000030	Fitasa C	MICRO	ENZIMAS	
1000040	Fitasa D	MICRO	ENZIMAS	
1000050	Xilanasa A	MICRO	ENZIMAS	
1000060	Xilanasa B	MICRO	ENZIMAS	
1000070	Xilanasa C	MICRO	ENZIMAS	
1000080	Xilanasa D	MICRO	ENZIMAS	
1000090	Carbohidrasa A	MICRO	ENZIMAS	
1000100	Carbohidrasa B	MICRO	ENZIMAS	
1000110	Carbohidrasa C	MICRO	ENZIMAS	
1000120	Carbohidrasa D	MICRO	ENZIMAS	
`;

const lines = rawText.split('\n').filter(l => l.trim() !== '');

let result = 'export const INITIAL_INGREDIENTS: Ingredient[] = [\n';

let idCounter = 1;

for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
        const code = parseInt(parts[0].trim());
        const name = parts[1].trim();
        const category = parts.length > 2 ? parts[2].trim() : '';
        const subcategory = parts.length > 3 ? parts[3].trim() : '';
        const family = parts.length > 4 ? parts[4].trim() : '';

        // Generate entry
        let entry = "  { id: 'i" + idCounter + "', code: " + code + ", name: '" + name + "', category: '" + category + "'";
        
        if (subcategory) entry += ", subcategory: '" + subcategory + "'";
        if (family) entry += ", family: '" + family + "'";
        
        entry += ", price: 0, stock: 0, nutrients: {} },\n";
        result += entry;

        idCounter++;
    }
}

result += '];\n';

fs.writeFileSync('generated_ingredients.js', result);
console.log("Done");
