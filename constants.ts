import { Ingredient, Nutrient, Product, Client, NutritionalBase, Relationship } from './types';

export const APP_NAME = "FeedPro 360";
export const APP_VERSION = "v1.1.0";

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Cliente General', logo: 'https://cdn-icons-png.flaticon.com/512/2662/2662503.png' },
  { id: 'c2', name: 'Granja Avícola El Sol', logo: 'https://cdn-icons-png.flaticon.com/512/3248/3248141.png' }
];

export const INITIAL_NUTRIENTS: Nutrient[] = [
  { id: 'n100010', code: 100010, name: 'Humedad', unit: '%' },
  { id: 'n100020', code: 100020, name: 'Lys:Val', unit: '%' },
  { id: 'n100030', code: 100030, name: 'Cenizas', unit: '%' },
  { id: 'n200010', code: 200010, name: 'E Bruta', unit: 'KCAL/KG', group: 'Energia' },
  { id: 'n200020', code: 200020, name: 'E Metabolizable A', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n200030', code: 200030, name: 'E Digestible A', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n200040', code: 200040, name: 'Energia Cruda', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n200050', code: 200050, name: 'Energia verdadera', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n300100', code: 300100, name: 'E. Etereo', unit: '%', group: 'Grasa' },
  { id: 'n300200', code: 300200, name: 'A Linoleico (N-6)', unit: '%', group: 'Grasa' },
  { id: 'n300300', code: 300300, name: 'A Linolenico (N-3)', unit: '%', group: 'Grasa' },
  { id: 'n400100', code: 400100, name: 'Fibra Cruda', unit: '%', group: 'Fibra' },
  { id: 'n400200', code: 400200, name: 'NDF', unit: '%', group: 'Fibra' },
  { id: 'n400300', code: 400300, name: 'FDA', unit: '%', group: 'Fibra' },
  { id: 'n500010', code: 500010, name: 'Proteina Cruda', unit: '%', group: 'Proteina' },
  { id: 'n510010', code: 510010, name: 'Lys total %', unit: '%', group: 'AA totales' },
  { id: 'n510020', code: 510020, name: 'Lysine (gr)', unit: '%', group: 'AA totales' },
  { id: 'n510030', code: 510030, name: 'Tre total %', unit: '%', group: 'AA totales' },
  { id: 'n510040', code: 510040, name: 'Met total %', unit: '%', group: 'AA totales' },
  { id: 'n510050', code: 510050, name: 'Cistina total %', unit: '%', group: 'AA totales' },
  { id: 'n510060', code: 510060, name: 'M+C total %', unit: '%', group: 'AA totales' },
  { id: 'n510070', code: 510070, name: 'Trip total %', unit: '%', group: 'AA totales' },
  { id: 'n510080', code: 510080, name: 'Iso total %', unit: '%', group: 'AA totales' },
  { id: 'n510090', code: 510090, name: 'Val total %', unit: '%', group: 'AA totales' },
  { id: 'n510100', code: 510100, name: 'Leu total %', unit: '%', group: 'AA totales' },
  { id: 'n510110', code: 510110, name: 'Phe total %', unit: '%', group: 'AA totales' },
  { id: 'n510120', code: 510120, name: 'Tyr total %', unit: '%', group: 'AA totales' },
  { id: 'n510130', code: 510130, name: 'His total %', unit: '%', group: 'AA totales' },
  { id: 'n510140', code: 510140, name: 'Arg total %', unit: '%', group: 'AA totales' },
  { id: 'n510150', code: 510150, name: 'Ala total %', unit: '%', group: 'AA totales' },
  { id: 'n510160', code: 510160, name: 'Asp total %', unit: '%', group: 'AA totales' },
  { id: 'n510170', code: 510170, name: 'Glu total %', unit: '%', group: 'AA totales' },
  { id: 'n510180', code: 510180, name: 'Gly total %', unit: '%', group: 'AA totales' },
  { id: 'n510190', code: 510190, name: 'Ser total %', unit: '%', group: 'AA totales' },
  { id: 'n510200', code: 510200, name: 'Pro total %', unit: '%', group: 'AA totales' },
  { id: 'n521010', code: 521010, name: 'Lys Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521020', code: 521020, name: 'Tre Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521030', code: 521030, name: 'Met Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521040', code: 521040, name: 'Cistina Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521050', code: 521050, name: 'M+C Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521060', code: 521060, name: 'Trip Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521070', code: 521070, name: 'Iso Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521080', code: 521080, name: 'Val Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521090', code: 521090, name: 'Leu Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521100', code: 521100, name: 'Phe Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521110', code: 521110, name: 'Tyr Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521120', code: 521120, name: 'His Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521130', code: 521130, name: 'Arg Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n531010', code: 531010, name: 'Lactosa', unit: '%', group: 'Otros' },
  { id: 'n531020', code: 531020, name: 'Almidon', unit: '%', group: 'Otros' },
  { id: 'n531030', code: 531030, name: 'Xantofila', unit: 'MG/KG', group: 'Otros' },
  { id: 'n531040', code: 531040, name: 'Cantaxantina', unit: 'MG/KG', group: 'Otros' },
  { id: 'n531050', code: 531050, name: 'Sulfuro', unit: '%', group: 'Otros' },
  { id: 'n531060', code: 531060, name: 'Sulfato', unit: '%', group: 'Otros' },
  { id: 'n531070', code: 531070, name: 'Cap. Tampon', unit: '%', group: 'Otros' },
  { id: 'n531080', code: 531080, name: 'DPB', unit: 'Meq/kg', group: 'Otros' },
  { id: 'n531090', code: 531090, name: 'Aflatoxinas', unit: 'PPB', group: 'Otros' },
  { id: 'n541010', code: 541010, name: 'Calcio', unit: '%', group: 'Macro-Minerales' },
  { id: 'n541020', code: 541020, name: 'Fosforo Total', unit: '%', group: 'Macro-Minerales' },
  { id: 'n541030', code: 541030, name: 'Fosforo Fitico', unit: '%', group: 'Macro-Minerales' },
  { id: 'n541040', code: 541040, name: 'Fosforo Coef. Disp.', unit: '%', group: 'Macro-Minerales' },
  { id: 'n541050', code: 541050, name: 'Fosforo Disponible A', unit: '%', group: 'Macro-Minerales' },
  { id: 'n541060', code: 541060, name: 'Mat Mineral', unit: '%', group: 'Macro-Minerales' },
  { id: 'n551010', code: 551010, name: 'Magnesio', unit: '%', group: 'Micro-Minerales' },
  { id: 'n551020', code: 551020, name: 'Sodio', unit: '%', group: 'Micro-Minerales' },
  { id: 'n551030', code: 551030, name: 'Cloro', unit: '%', group: 'Micro-Minerales' },
  { id: 'n551040', code: 551040, name: 'Potasio', unit: '%', group: 'Micro-Minerales' },
  { id: 'n551050', code: 551050, name: 'Azufre', unit: '%', group: 'Micro-Minerales' },
  { id: 'n551060', code: 551060, name: 'Hierro', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551070', code: 551070, name: 'Cobre', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551080', code: 551080, name: 'Manganeso', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551090', code: 551090, name: 'Zinc', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551100', code: 551100, name: 'Cobalto', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551110', code: 551110, name: 'Iodo', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551120', code: 551120, name: 'Selenio', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551130', code: 551130, name: 'Aluminio', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n551140', code: 551140, name: 'Fluor', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n561010', code: 561010, name: 'Biotina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561020', code: 561020, name: 'Cloruro de Colina', unit: 'G/KG', group: 'Vitaminas' },
  { id: 'n561030', code: 561030, name: 'Colina (mg/kg)', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561040', code: 561040, name: 'Ácido Fólico', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561050', code: 561050, name: 'Niacina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561060', code: 561060, name: 'Ac. Pantotenico', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561070', code: 561070, name: 'Riboflavina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561080', code: 561080, name: 'Tiamina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561090', code: 561090, name: 'Vit. B6', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n561100', code: 561100, name: 'Vit. B12', unit: 'MCG/KG', group: 'Vitaminas' },
  { id: 'n561110', code: 561110, name: 'Vit. E', unit: 'UI', group: 'Vitaminas' },
  { id: 'n561120', code: 561120, name: 'Vit. A', unit: 'UI', group: 'Vitaminas' },
  { id: 'n561130', code: 561130, name: 'Vit. D', unit: 'UI', group: 'Vitaminas' },
  { id: 'n561140', code: 561140, name: 'Vit. K', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n571010', code: 571010, name: 'NSP Total', unit: '%', group: 'NSP' },
  { id: 'n571020', code: 571020, name: 'NSP Insoluble', unit: '%', group: 'NSP' },
  { id: 'n571030', code: 571030, name: 'NSP Soluble', unit: '%', group: 'NSP' },
  { id: 'n571040', code: 571040, name: 'Betaglucanos', unit: '%', group: 'NSP' },
  { id: 'n571050', code: 571050, name: 'Arabinoxilanos', unit: '%', group: 'NSP' },
  { id: 'n571060', code: 571060, name: 'Celulosa', unit: '%', group: 'NSP' },
  { id: 'n571070', code: 571070, name: 'Hemicelulosa', unit: '%', group: 'NSP' },
  { id: 'n571080', code: 571080, name: 'Betamanano', unit: '%', group: 'NSP' },
  { id: 'n571090', code: 571090, name: 'Pectinas', unit: '%', group: 'NSP' },
  { id: 'n571100', code: 571100, name: 'Arabinosa (Monosac.)', unit: '%', group: 'NSP' },
  { id: 'n571110', code: 571110, name: 'Xilosa (Monosac.)', unit: '%', group: 'NSP' },
  { id: 'n571120', code: 571120, name: 'Manosa (Monosac.)', unit: '%', group: 'NSP' },
  { id: 'n571130', code: 571130, name: 'Acido Uronico', unit: '%', group: 'NSP' },
  { id: 'n581010', code: 581010, name: 'FTU/g', unit: 'FTU/g', group: 'Fitasa' },
  { id: 'n581020', code: 581020, name: 'FTU/kg', unit: 'FTU/kg', group: 'Fitasa' },
  { id: 'n581030', code: 581030, name: 'FTU Endogena/Ukg', unit: 'FTU/kg', group: 'Fitasa' },
];

export const DEFAULT_RELATIONS: Omit<Relationship, 'id' | 'min' | 'max'>[] = [
  { name: 'Relación Ca:P Disp.', nutrientAId: 'n541010', nutrientBId: 'n541050' },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'i1', code: 101010, name: 'Maíz', category: 'MACRO', price: 250, stock: 100000, nutrients: { 'n200020': 3350, 'n500010': 8.5, 'n541010': 0.02, 'n541050': 0.08 } },
  { id: 'i2', code: 201010, name: 'Harina Soya 46%', category: 'MACRO', price: 500, stock: 100000, nutrients: { 'n200020': 2250, 'n500010': 46, 'n541010': 0.25, 'n541050': 0.20 } },
  { id: 'i3', code: 541010, name: 'Carbonato de Calcio', category: 'MICRO', price: 50, stock: 100000, nutrients: { 'n541010': 38 } },
  { id: 'i4', code: 541050, name: 'Fosfato Bicálcico', category: 'MICRO', price: 800, stock: 100000, nutrients: { 'n541010': 21, 'n541050': 18.5 } },
  { id: 'i5', code: 301810, name: 'Aceite de Soya', category: 'MACRO', price: 1200, stock: 100000, nutrients: { 'n200020': 8800 } },
  { id: 'i6', code: 105010, name: 'Cebada', category: 'MACRO', price: 220, stock: 100000, nutrients: { 'n200020': 2950, 'n500010': 10.5 } },
  { id: 'i7', code: 101020, name: 'Afrecho de Trigo', category: 'MACRO', price: 180, stock: 100000, nutrients: { 'n200020': 1800, 'n500010': 15.5 } },
];

const BASE_CONSTRAINTS = [
  { nutrientId: 'n200020', min: 2800, max: 3100 },
  { nutrientId: 'n500010', min: 14, max: 20 },
  { nutrientId: 'n541010', min: 0.8, max: 4.5 },
  { nutrientId: 'n541050', min: 0.3, max: 0.5 }
];

const BASE_INGREDIENT_CONSTRAINTS = [
  { ingredientId: 'i1', min: 20, max: 70 },
  { ingredientId: 'i2', min: 5, max: 40 }
];

export const INITIAL_PRODUCTS: Product[] = [
  // DIETAS BLANCAS
  { id: 'pb1', clientId: 'c1', code: 1001, name: 'Cría Blanca', category: 'Dietas Blancas', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pb2', clientId: 'c1', code: 1002, name: 'Recría Blanca', category: 'Dietas Blancas', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pb3', clientId: 'c1', code: 1003, name: 'Prepostura Blanca', category: 'Dietas Blancas', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pb4', clientId: 'c1', code: 1004, name: 'Postura Pick Blanca', category: 'Dietas Blancas', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pb5', clientId: 'c1', code: 1005, name: 'Postura Intermedia Blanca', category: 'Dietas Blancas', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pb6', clientId: 'c1', code: 1006, name: 'Postura Final Blanca', category: 'Dietas Blancas', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  
  // DIETAS COLOR
  { id: 'pc1', clientId: 'c1', code: 2001, name: 'Cría Color', category: 'Dietas Color', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pc2', clientId: 'c1', code: 2002, name: 'Recría Color', category: 'Dietas Color', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pc3', clientId: 'c1', code: 2003, name: 'Prepostura Color', category: 'Dietas Color', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pc4', clientId: 'c1', code: 2004, name: 'Postura Pick Color', category: 'Dietas Color', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pc5', clientId: 'c1', code: 2005, name: 'Postura Intermedia Color', category: 'Dietas Color', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
  { id: 'pc6', clientId: 'c1', code: 2006, name: 'Postura Final Color', category: 'Dietas Color', constraints: [...BASE_CONSTRAINTS], ingredientConstraints: [...BASE_INGREDIENT_CONSTRAINTS], relationships: [] },
];

export const INITIAL_BASES: NutritionalBase[] = [];

const PREM_EXPIRY = new Date('2030-01-01').getTime();
export const AUTHORIZED_ACCOUNTS = [
  { username: 'admin', password: 'admin_feedpro', email: 'admin@feedpro.com', assignedClientId: 'ALL', trialEndsAt: PREM_EXPIRY }
];
