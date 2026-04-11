import fs from 'fs';

const rawText = `
100010	Humedad	%	
100020	Lys:Val	%	
100030	Cenizas	%	
200010	E Bruta	KCAL/KG	Energia
200020	E Metabolizable A	KCAL/KG	Energia Aves
200030	E Digestible A	KCAL/KG	Energia Aves
200040	Energia Cruda	KCAL/KG	Energia Aves
200050	Energia verdadera	KCAL/KG	Energia Aves
300100	E. Etereo	%	Grasa
300200	A Linoleico (N-6)	%	Grasa
300300	A Linolenico (N-3)	%	Grasa
400100	Fibra Cruda	%	Fibra
400200	NDF	%	Fibra
400300	FDA	%	Fibra
500010	Proteina Cruda	%	Proteina
510010	Lys total %	%	AA totales
510020	Lysine (gr)	%	AA totales
510030	Tre total %	%	AA totales
510040	Met total %	%	AA totales
510050	Cistina total %	%	AA totales
510060	M+C total %	%	AA totales
510070	Trip total %	%	AA totales
510080	Iso Total %	%	AA totales
510090	Val total %	%	AA totales
510100	Leu total %	%	AA totales
510110	Phe total %	%	AA totales
510120	Tyr total %	%	AA totales
510130	His total %	%	AA totales
510140	Arg total %	%	AA totales
510150	Ala total %	%	AA totales
510160	Asp total %	%	AA totales
510170	Glu total %	%	AA totales
510180	Gly total %	%	AA totales
510190	Ser total %	%	AA totales
510200	Pro total %	%	AA totales
521010	Lys Dig A %	%	AA Digestible
521020	Tre Dig A %	%	AA Digestible
521030	Met Dig A %	%	AA Digestible
521040	Cistina Dig A %	%	AA Digestible
521050	M+C Dig A %	%	AA Digestible
521060	Trip Dig A %	%	AA Digestible
521070	Iso Dig A %	%	AA Digestible
521080	Val Dig A %	%	AA Digestible
521090	Leu Dig A %	%	AA Digestible
521100	Phe Dig A %	%	AA Digestible
521110	Tyr Dig A %	%	AA Digestible
521120	His Dig A %	%	AA Digestible
521130	Arg Dig A %	%	AA Digestible
531010	Lactosa	%	Otros
531020	Almidon	%	Otros
531030	Xantofila	MG/KG	Otros
531040	Cantaxantinas	MG/KG	Otros
531050	Sulfuro	%	Otros
531060	Sulfito	%	Otros
531070	Cap. Tampon	%	Otros
531080	DPB	Meq/kg	Otros
531090	Aflatoxinas	PPB	Otros
541010	Calcio	%	Macro-Minerales
541020	Fosforo Total	%	Macro-Minerales
541030	Fosforo Fitico	%	Macro-Minerales
541040	Fosforo Coeficiente Disponibilidad	%	Macro-Minerales
541050	Fosforo Disponible A	%	Macro-Minerales
541060	Mat Mineral	%	Macro-Minerales
551010	Magnesio	%	Micro-Minerales
551020	Sodio	%	Micro-Minerales
551030	Cloro	%	Micro-Minerales
551040	Potasio	%	Micro-Minerales
551050	Azufre	%	Micro-Minerales
551060	Hierro	MG/KG	Micro-Minerales
551070	Cobre	MG/KG	Micro-Minerales
551080	Manganeso	MG/KG	Micro-Minerales
551090	Zinc	MG/KG	Micro-Minerales
551100	Cobalto	MG/KG	Micro-Minerales
551110	Iodo	MG/KG	Micro-Minerales
551120	Selenio	MG/KG	Micro-Minerales
551130	Aluminio	MG/KG	Micro-Minerales
551140	Fluor	MG/KG	Micro-Minerales
561010	Biotina	MG/KG	Vitaminas
561020	Cloruro de Colina	G/KG	Vitaminas
561030	Colina (mg/kg)	MG/KG	Vitaminas
561040	Acido Folico	MG/KG	Vitaminas
561050	Niacina	MG/KG	Vitaminas
561060	Ac. Pantotenico	MG/KG	Vitaminas
561070	Riboflavina	MG/KG	Vitaminas
561080	Tiamina	MG/KG	Vitaminas
561090	Vit. B6	MG/KG	Vitaminas
561100	Vit. B12	MG/KG	Vitaminas
561110	Vit. E	UI	Vitaminas
561120	Vit. A	UI	Vitaminas
561130	Vit. D	UI	Vitaminas
561140	Vit. K	MG/KG	Vitaminas
571010	NSP Total	%	NSP
571020	NSP Insoluble	%	NSP
571030	NSP Soluble	%	NSP
571040	Betaglucanos	%	NSP
571050	Arabinoxilanos	%	NSP
571060	Celulosa	%	NSP
571070	Hemicelulosa	%	NSP
571080	Betamanano	%	NSP
571090	Pectinas	%	NSP
571100	Arabinosa (Monosacarido)	%	Arabinoxilanos
571110	Xilosa (Monosacarido)	%	Arabinoxilanos
571120	Manosa (Monosacarido)	%	Betamananos
571130	Acido Uronico	%	NSP
581010	FTU/g	FTU/g	Fitasa
581020	FTU/kg	FTU/kg	Fitasa
581030	FTU Endogena/Ukg	FTU/kg	Fitasa
`;

const lines = rawText.split('\n').filter(l => l.trim() !== '');

let result = 'export const INITIAL_NUTRIENTS: Nutrient[] = [\n';

let idCounter = 1;

for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 3) {
        const code = parseInt(parts[0].trim());
        const name = parts[1].trim();
        const unit = parts[2].trim();
        const group = parts.length > 3 ? parts[3].trim() : '';

        // Generate entry
        let entry = "  { id: 'n" + idCounter + "', code: " + code + ", name: '" + name + "', unit: '" + unit + "'";
        if (group && group !== '') {
            entry += ", group: '" + group + "'";
        }
        entry += " },\n";
        result += entry;

        idCounter++;
    }
}

result += '];\n';

fs.writeFileSync('generated_nutrients.js', result);
console.log("Done");
