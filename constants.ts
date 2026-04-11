import { Ingredient, Nutrient, Product, Client, NutritionalBase, Relationship } from './types';

export const APP_NAME = "FeedPro 360";
export const APP_VERSION = "v1.1.0";

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Cliente General', logo: 'https://cdn-icons-png.flaticon.com/512/2662/2662503.png' },
  { id: 'c2', name: 'Granja Avícola El Sol', logo: 'https://cdn-icons-png.flaticon.com/512/3248/3248141.png' }
];

export const INITIAL_NUTRIENTS: Nutrient[] = [
  { id: 'n1', code: 100010, name: 'Humedad', unit: '%' },
  { id: 'n2', code: 100020, name: 'Lys:Val', unit: '%' },
  { id: 'n3', code: 100030, name: 'Cenizas', unit: '%' },
  { id: 'n4', code: 200010, name: 'E Bruta', unit: 'KCAL/KG', group: 'Energia' },
  { id: 'n5', code: 200020, name: 'E Metabolizable A', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n6', code: 200030, name: 'E Digestible A', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n7', code: 200040, name: 'Energia Cruda', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n8', code: 200050, name: 'Energia verdadera', unit: 'KCAL/KG', group: 'Energia Aves' },
  { id: 'n9', code: 300100, name: 'E. Etereo', unit: '%', group: 'Grasa' },
  { id: 'n10', code: 300200, name: 'A Linoleico (N-6)', unit: '%', group: 'Grasa' },
  { id: 'n11', code: 300300, name: 'A Linolenico (N-3)', unit: '%', group: 'Grasa' },
  { id: 'n12', code: 400100, name: 'Fibra Cruda', unit: '%', group: 'Fibra' },
  { id: 'n13', code: 400200, name: 'NDF', unit: '%', group: 'Fibra' },
  { id: 'n14', code: 400300, name: 'FDA', unit: '%', group: 'Fibra' },
  { id: 'n15', code: 500010, name: 'Proteina Cruda', unit: '%', group: 'Proteina' },
  { id: 'n16', code: 510010, name: 'Lys total %', unit: '%', group: 'AA totales' },
  { id: 'n17', code: 510020, name: 'Lysine (gr)', unit: '%', group: 'AA totales' },
  { id: 'n18', code: 510030, name: 'Tre total %', unit: '%', group: 'AA totales' },
  { id: 'n19', code: 510040, name: 'Met total %', unit: '%', group: 'AA totales' },
  { id: 'n20', code: 510050, name: 'Cistina total %', unit: '%', group: 'AA totales' },
  { id: 'n21', code: 510060, name: 'M+C total %', unit: '%', group: 'AA totales' },
  { id: 'n22', code: 510070, name: 'Trip total %', unit: '%', group: 'AA totales' },
  { id: 'n23', code: 510080, name: 'Iso Total %', unit: '%', group: 'AA totales' },
  { id: 'n24', code: 510090, name: 'Val total %', unit: '%', group: 'AA totales' },
  { id: 'n25', code: 510100, name: 'Leu total %', unit: '%', group: 'AA totales' },
  { id: 'n26', code: 510110, name: 'Phe total %', unit: '%', group: 'AA totales' },
  { id: 'n27', code: 510120, name: 'Tyr total %', unit: '%', group: 'AA totales' },
  { id: 'n28', code: 510130, name: 'His total %', unit: '%', group: 'AA totales' },
  { id: 'n29', code: 510140, name: 'Arg total %', unit: '%', group: 'AA totales' },
  { id: 'n30', code: 510150, name: 'Ala total %', unit: '%', group: 'AA totales' },
  { id: 'n31', code: 510160, name: 'Asp total %', unit: '%', group: 'AA totales' },
  { id: 'n32', code: 510170, name: 'Glu total %', unit: '%', group: 'AA totales' },
  { id: 'n33', code: 510180, name: 'Gly total %', unit: '%', group: 'AA totales' },
  { id: 'n34', code: 510190, name: 'Ser total %', unit: '%', group: 'AA totales' },
  { id: 'n35', code: 510200, name: 'Pro total %', unit: '%', group: 'AA totales' },
  { id: 'n36', code: 521010, name: 'Lys Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n37', code: 521020, name: 'Tre Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n38', code: 521030, name: 'Met Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n39', code: 521040, name: 'Cistina Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n40', code: 521050, name: 'M+C Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n41', code: 521060, name: 'Trip Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n42', code: 521070, name: 'Iso Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n43', code: 521080, name: 'Val Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n44', code: 521090, name: 'Leu Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n45', code: 521100, name: 'Phe Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n46', code: 521110, name: 'Tyr Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n47', code: 521120, name: 'His Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n48', code: 521130, name: 'Arg Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n49', code: 531010, name: 'Lactosa', unit: '%', group: 'Otros' },
  { id: 'n50', code: 531020, name: 'Almidon', unit: '%', group: 'Otros' },
  { id: 'n51', code: 531030, name: 'Xantofila', unit: 'MG/KG', group: 'Otros' },
  { id: 'n52', code: 531040, name: 'Cantaxantinas', unit: 'MG/KG', group: 'Otros' },
  { id: 'n53', code: 531050, name: 'Sulfuro', unit: '%', group: 'Otros' },
  { id: 'n54', code: 531060, name: 'Sulfito', unit: '%', group: 'Otros' },
  { id: 'n55', code: 531070, name: 'Cap. Tampon', unit: '%', group: 'Otros' },
  { id: 'n56', code: 531080, name: 'DPB', unit: 'Meq/kg', group: 'Otros' },
  { id: 'n57', code: 531090, name: 'Aflatoxinas', unit: 'PPB', group: 'Otros' },
  { id: 'n58', code: 541010, name: 'Calcio', unit: '%', group: 'Macro-Minerales' },
  { id: 'n59', code: 541020, name: 'Fosforo Total', unit: '%', group: 'Macro-Minerales' },
  { id: 'n60', code: 541030, name: 'Fosforo Fitico', unit: '%', group: 'Macro-Minerales' },
  { id: 'n61', code: 541040, name: 'Fosforo Coeficiente Disponibilidad', unit: '%', group: 'Macro-Minerales' },
  { id: 'n62', code: 541050, name: 'Fosforo Disponible A', unit: '%', group: 'Macro-Minerales' },
  { id: 'n63', code: 541060, name: 'Mat Mineral', unit: '%', group: 'Macro-Minerales' },
  { id: 'n64', code: 551010, name: 'Magnesio', unit: '%', group: 'Micro-Minerales' },
  { id: 'n65', code: 551020, name: 'Sodio', unit: '%', group: 'Micro-Minerales' },
  { id: 'n66', code: 551030, name: 'Cloro', unit: '%', group: 'Micro-Minerales' },
  { id: 'n67', code: 551040, name: 'Potasio', unit: '%', group: 'Micro-Minerales' },
  { id: 'n68', code: 551050, name: 'Azufre', unit: '%', group: 'Micro-Minerales' },
  { id: 'n69', code: 551060, name: 'Hierro', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n70', code: 551070, name: 'Cobre', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n71', code: 551080, name: 'Manganeso', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n72', code: 551090, name: 'Zinc', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n73', code: 551100, name: 'Cobalto', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n74', code: 551110, name: 'Iodo', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n75', code: 551120, name: 'Selenio', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n76', code: 551130, name: 'Aluminio', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n77', code: 551140, name: 'Fluor', unit: 'MG/KG', group: 'Micro-Minerales' },
  { id: 'n78', code: 561010, name: 'Biotina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n79', code: 561020, name: 'Cloruro de Colina', unit: 'G/KG', group: 'Vitaminas' },
  { id: 'n80', code: 561030, name: 'Colina (mg/kg)', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n81', code: 561040, name: 'Acido Folico', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n82', code: 561050, name: 'Niacina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n83', code: 561060, name: 'Ac. Pantotenico', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n84', code: 561070, name: 'Riboflavina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n85', code: 561080, name: 'Tiamina', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n86', code: 561090, name: 'Vit. B6', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n87', code: 561100, name: 'Vit. B12', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n88', code: 561110, name: 'Vit. E', unit: 'UI', group: 'Vitaminas' },
  { id: 'n89', code: 561120, name: 'Vit. A', unit: 'UI', group: 'Vitaminas' },
  { id: 'n90', code: 561130, name: 'Vit. D', unit: 'UI', group: 'Vitaminas' },
  { id: 'n91', code: 561140, name: 'Vit. K', unit: 'MG/KG', group: 'Vitaminas' },
  { id: 'n92', code: 571010, name: 'NSP Total', unit: '%', group: 'NSP' },
  { id: 'n93', code: 571020, name: 'NSP Insoluble', unit: '%', group: 'NSP' },
  { id: 'n94', code: 571030, name: 'NSP Soluble', unit: '%', group: 'NSP' },
  { id: 'n95', code: 571040, name: 'Betaglucanos', unit: '%', group: 'NSP' },
  { id: 'n96', code: 571050, name: 'Arabinoxilanos', unit: '%', group: 'NSP' },
  { id: 'n97', code: 571060, name: 'Celulosa', unit: '%', group: 'NSP' },
  { id: 'n98', code: 571070, name: 'Hemicelulosa', unit: '%', group: 'NSP' },
  { id: 'n99', code: 571080, name: 'Betamanano', unit: '%', group: 'NSP' },
  { id: 'n100', code: 571090, name: 'Pectinas', unit: '%', group: 'NSP' },
  { id: 'n101', code: 571100, name: 'Arabinosa (Monosacarido)', unit: '%', group: 'Arabinoxilanos' },
  { id: 'n102', code: 571110, name: 'Xilosa (Monosacarido)', unit: '%', group: 'Arabinoxilanos' },
  { id: 'n103', code: 571120, name: 'Manosa (Monosacarido)', unit: '%', group: 'Betamananos' },
  { id: 'n104', code: 571130, name: 'Acido Uronico', unit: '%', group: 'NSP' },
  { id: 'n105', code: 581010, name: 'FTU/g', unit: 'FTU/g', group: 'Fitasa' },
  { id: 'n106', code: 581020, name: 'FTU/kg', unit: 'FTU/kg', group: 'Fitasa' },
  { id: 'n107', code: 581030, name: 'FTU Endogena/Ukg', unit: 'FTU/kg', group: 'Fitasa' },
];

export const DEFAULT_RELATIONS: Omit<Relationship, 'id' | 'min' | 'max'>[] = [
  { name: 'Relación Calcio : Fósforo Disp.', nutrientAId: 'n4', nutrientBId: 'n5' },
  { name: 'Relación Lisina : Metionina', nutrientAId: 'n6', nutrientBId: 'n7' },
  { name: 'Relación Lisina : Proteína', nutrientAId: 'n6', nutrientBId: 'n2' },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { 
    id: 'i1', code: 1001, name: 'Maíz Grano', category: 'Macro', subcategory: 'Energético', price: 0.25, stock: 50000,
    nutrients: { 'n1': 88, 'n2': 8.5, 'n3': 3.35, 'n4': 0.02, 'n5': 0.12, 'n6': 0.24, 'n7': 0.18 }
  },
  { 
    id: 'i2', code: 1002, name: 'Harina de Soja 45%', category: 'Macro', subcategory: 'Proteico', price: 0.55, stock: 20000,
    nutrients: { 'n1': 89, 'n2': 45.0, 'n3': 2.25, 'n4': 0.30, 'n5': 0.28, 'n6': 2.80, 'n7': 0.65 }
  },
  { 
    id: 'i3', code: 1003, name: 'Afrecho de Trigo', category: 'Macro', subcategory: 'Fibroso', price: 0.20, stock: 15000,
    nutrients: { 'n1': 88, 'n2': 15.0, 'n3': 1.80, 'n4': 0.15, 'n5': 0.50, 'n6': 0.60, 'n7': 0.25 }
  },
  { 
    id: 'i4', code: 1004, name: 'Carbonato de Calcio', category: 'Micro', subcategory: 'Mineral', price: 0.10, stock: 5000,
    nutrients: { 'n1': 99, 'n2': 0, 'n3': 0, 'n4': 38.0, 'n5': 0, 'n6': 0, 'n7': 0 }
  },
  { 
    id: 'i5', code: 1005, name: 'Fosfato Bicálcico', category: 'Micro', subcategory: 'Mineral', price: 0.80, stock: 3000,
    nutrients: { 'n1': 98, 'n2': 0, 'n3': 0, 'n4': 24.0, 'n5': 18.0, 'n6': 0, 'n7': 0 }
  },
  { 
    id: 'i6', code: 1006, name: 'Aceite de Soja', category: 'Macro', subcategory: 'Energético', price: 1.20, stock: 2000,
    nutrients: { 'n1': 99, 'n2': 0, 'n3': 8.80, 'n4': 0, 'n5': 0, 'n6': 0, 'n7': 0 }
  }
];

export const INITIAL_BASES: NutritionalBase[] = [
  {
    id: 'b1', name: 'Hy-Line W80 Starter', description: 'Requerimientos fase inicial ponedoras',
    constraints: [
      { nutrientId: 'n2', min: 20.0, max: 22.0 },
      { nutrientId: 'n3', min: 2.9, max: 3.0 },
      { nutrientId: 'n6', min: 1.0, max: 1.2 }
    ],
    relationships: [
      { id: 'r1', name: 'Relación Calcio : Fósforo Disp.', nutrientAId: 'n4', nutrientBId: 'n5', min: 2.0, max: 2.5 }
    ]
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  { 
    id: 'p1', clientId: 'c1', code: 2001, name: 'Iniciador Pollos',
    constraints: [
      { nutrientId: 'n2', min: 21.0, max: 23.0 },
      { nutrientId: 'n3', min: 2.9, max: 3.1 },
      { nutrientId: 'n4', min: 0.9, max: 1.1 },
      { nutrientId: 'n5', min: 0.45, max: 0.55 }
    ],
    relationships: [],
    ingredientConstraints: []
  },
  { 
    id: 'p2', clientId: 'c1', code: 2002, name: 'Cerdos Crecimiento',
    constraints: [
      { nutrientId: 'n2', min: 16.0, max: 18.0 },
      { nutrientId: 'n3', min: 3.2, max: 3.4 }
    ],
    relationships: [],
    ingredientConstraints: []
  }
];

// Fechas de Expiracion de Prueba (90 dias / 3 meses)
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
const TRIAL_START = new Date('2026-04-10').getTime();
const TRIAL_EXPIRY = TRIAL_START + THREE_MONTHS_MS;
const PREM_EXPIRY = TRIAL_START + (1000 * 365 * 24 * 60 * 60 * 1000); // 1000 años para Admin/Comercial

export const AUTHORIZED_ACCOUNTS = [
  { username: 'feedpro', password: 'feed01_', email: 'comercial@feedpro.com', assignedClientId: 'c1', trialEndsAt: PREM_EXPIRY },
  { username: 'feedpro', password: 'feed02_', email: 'gratis02@feedpro.com', assignedClientId: 'c2', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed03_', email: 'gratis03@feedpro.com', assignedClientId: 'c3', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed04_', email: 'gratis04@feedpro.com', assignedClientId: 'c4', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed05_', email: 'gratis05@feedpro.com', assignedClientId: 'c5', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed06_', email: 'gratis06@feedpro.com', assignedClientId: 'c6', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed07_', email: 'gratis07@feedpro.com', assignedClientId: 'c7', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed08_', email: 'gratis08@feedpro.com', assignedClientId: 'c8', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed09_', email: 'gratis09@feedpro.com', assignedClientId: 'c9', trialEndsAt: TRIAL_EXPIRY },
  { username: 'feedpro', password: 'feed10_', email: 'gratis10@feedpro.com', assignedClientId: 'c10', trialEndsAt: TRIAL_EXPIRY },
  { username: 'admin', password: 'admin_feedpro', email: 'admin@feedpro.com', assignedClientId: 'ALL', trialEndsAt: PREM_EXPIRY }
];
