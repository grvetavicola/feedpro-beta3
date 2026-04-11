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
  { id: 'i1', code: 101010, name: 'Maíz', category: 'MACRO', subcategory: 'CEREALES', family: 'MAIZ', price: 0, stock: 0, nutrients: { 'i1': 12.9, 'i14': 3860, 'i25': 3.9, 'i35': 2.1, 'i46': 1.9, 'n14': 11.4, 'i62': 8.44, 'n16': 0.25, 'n17': 0.31, 'n18': 0.17, 'n19': 0.2, 'n20': 0.36, 'n21': 0.06, 'n22': 0.32, 'n23': 0.43, 'n24': 1.06, 'n25': 0.43, 'n26': 0.29, 'n27': 0.72, 'n28': 0.24, 'n29': 0.38, 'n30': 0.61, 'n31': 0.53, 'n32': 1.54, 'n33': 0.32, 'n34': 0.41, 'n35': 0.75, 'i68': 82, 'i69': 83, 'i70': 91, 'i71': 86, 'i72': 88.31, 'i73': 87, 'i74': 80, 'i75': 82, 'i76': 91, 'i77': 88 } },
  { id: 'i2', code: 101011, name: 'Maíz, baja CP', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i62': 7 } },
  { id: 'i3', code: 101012, name: 'Maíz Chile', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 12.9, 'i14': 3860, 'i25': 3.9, 'i35': 2.1, 'i46': 1.9, 'n14': 11.4, 'i62': 8.44, 'n16': 0.25, 'n17': 0.31, 'n18': 0.17, 'n19': 0.2, 'n20': 0.36, 'n21': 0.06, 'n22': 0.32, 'n23': 0.43, 'n24': 1.06, 'n25': 0.43, 'n26': 0.29, 'n27': 0.72, 'n28': 0.24, 'n29': 0.38, 'n30': 0.61, 'n31': 0.53, 'n32': 1.54, 'n33': 0.32, 'n34': 0.41, 'n35': 0.75, 'i68': 82, 'i69': 83, 'i70': 91, 'i71': 86, 'i72': 88.31, 'i73': 87, 'i74': 80, 'i75': 82, 'i76': 91, 'i77': 88 } },
  { id: 'i4', code: 101020, name: 'Maíz, alto aceite', category: 'MACRO', subcategory: 'CEREALES', family: 'MAIZ', price: 0, stock: 0, nutrients: { 'i1': 12.1, 'i14': 4653, 'i25': 7.08, 'i46': 2.06, 'n14': 13.64, 'i62': 9.46, 'n16': 0.34, 'n17': 0.37, 'n18': 0.19, 'n19': 0.26, 'n20': 0.46, 'n21': 0.06, 'n22': 0.37, 'n23': 0.61, 'n24': 1.28, 'n25': 0.51, 'n26': 0.33, 'n27': 0.85, 'n28': 0.33, 'n29': 0.5, 'n30': 0.87, 'n31': 0.74, 'n32': 2.03, 'n33': 0.41, 'n34': 0.45, 'n35': 1.13, 'i68': 92.5, 'i69': 91.34, 'i70': 95.94, 'i71': 93.44, 'i73': 87.88 } },
  { id: 'i5', code: 102010, name: 'Sorgo, tanino<0,5', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 13.2, 'i14': 3900, 'i25': 2.6, 'i35': 1.15, 'i46': 2.2, 'n14': 9, 'i62': 9, 'n16': 0.21, 'n17': 0.3, 'n18': 0.16, 'n19': 0.2, 'n20': 0.36, 'n21': 0.1, 'n22': 0.4, 'n23': 0.5, 'n24': 1.24, 'n25': 0.48, 'n26': 0.43, 'n27': 0.91, 'n28': 0.24, 'n29': 0.34, 'n30': 0.87, 'n31': 0.18, 'n32': 1.97, 'n33': 0.29, 'n34': 0.43, 'n35': 0.8, 'i68': 82, 'i69': 82, 'i70': 88, 'i71': 83, 'i72': 85.22, 'i73': 89, 'i74': 79, 'i75': 75, 'i76': 91, 'i77': 71 } },
  { id: 'i6', code: 102050, name: 'Sorgo, tanino>0,5', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 13.2, 'i14': 3900, 'i25': 2.6, 'i35': 1.15, 'i46': 2.2, 'n14': 9, 'i62': 9, 'n16': 0.21, 'n17': 0.3, 'n18': 0.16, 'n19': 0.2, 'n20': 0.36, 'n21': 0.1, 'n22': 0.4, 'n23': 0.5, 'n24': 1.24, 'n25': 0.48, 'n26': 0.43, 'n27': 0.91, 'n28': 0.24, 'n29': 0.34, 'n30': 0.87, 'n31': 0.18, 'n32': 1.97, 'n33': 0.29, 'n34': 0.43, 'n35': 0.8, 'i68': 73, 'i69': 70, 'i70': 75, 'i71': 65, 'i72': 69.44, 'i73': 67, 'i74': 73, 'i75': 76, 'i76': 81, 'i77': 65 } },
  { id: 'i7', code: 103010, name: 'Mijo, grano', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 10.06, 'i2': 0.75, 'i14': 3990, 'i25': 4.32, 'i35': 1.77, 'i46': 3.79, 'n14': 18.45, 'i62': 12.76, 'n16': 0.36, 'n17': 0.47, 'n18': 0.28, 'n19': 0.21, 'n20': 0.48, 'n21': 0.15, 'n22': 0.51, 'n23': 0.67, 'n24': 1.29, 'n25': 0.6, 'n26': 0.29, 'n27': 0.86, 'n28': 0.25, 'n29': 0.49, 'n30': 1.05, 'n31': 1.08, 'n32': 2.56, 'n33': 0.37, 'n34': 0.61, 'i68': 92.06, 'i69': 85.24, 'i70': 92.51, 'i72': 89.21, 'i73': 92.86, 'i74': 81.75, 'i75': 80.33, 'i76': 92.31 } },
  { id: 'i8', code: 104010, name: 'Triticale', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 12.09, 'i14': 3806.5, 'i25': 1.48, 'i35': 0.55, 'i46': 2.4, 'n14': 12.08, 'i62': 10.95, 'n16': 0.38, 'n17': 0.34, 'n18': 0.19, 'n19': 0.25, 'n20': 0.45, 'n21': 0.13, 'n22': 0.37, 'n23': 0.42, 'n24': 0.69, 'n25': 0.45, 'n26': 0.28, 'n27': 0.73, 'n28': 0.25, 'n29': 0.54, 'n30': 0.43, 'n31': 0.65, 'n32': 2.42, 'n33': 0.43, 'n34': 0.45, 'n35': 0.71, 'i68': 85.92, 'i69': 88.62, 'i70': 89.5, 'i71': 82, 'i72': 82.08, 'i73': 92.86, 'i74': 82.29, 'i75': 80.71, 'i76': 90, 'i77': 91 } },
  { id: 'i9', code: 105010, name: 'Cebada', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 11.88, 'i14': 3810, 'i25': 1.93, 'i35': 0.81, 'i46': 4.55, 'n14': 17.59, 'i62': 10.76, 'n16': 0.4, 'n17': 0.36, 'n18': 0.18, 'n19': 0.25, 'n20': 0.43, 'n21': 0.12, 'n22': 0.38, 'n23': 0.53, 'n24': 0.73, 'n25': 0.52, 'n26': 0.29, 'n27': 0.81, 'n28': 0.24, 'n29': 0.52, 'n30': 0.42, 'n31': 0.61, 'n32': 2.42, 'n33': 0.41, 'n34': 0.44, 'n35': 1.07, 'i68': 78, 'i69': 76, 'i70': 80, 'i71': 83, 'i72': 82, 'i74': 75, 'i75': 75, 'i76': 84, 'i77': 84 } },
  { id: 'i10', code: 106010, name: 'Arveja', category: 'SUPLEMENTO', price: 0, stock: 0, nutrients: { 'i1': 11.24, 'i14': 4100, 'i25': 4.72, 'i35': 1.61, 'i46': 11.57, 'n14': 29.77, 'i62': 10.61, 'n16': 0.41, 'n17': 0.38, 'n18': 0.19, 'n19': 0.32, 'n20': 0.52, 'n21': 0.13, 'n22': 0.41, 'n23': 0.56, 'n24': 0.79, 'n25': 0.55, 'n26': 0.35, 'n27': 0.89, 'n28': 0.25, 'n29': 0.73, 'n30': 0.48, 'n31': 0.82, 'n32': 1.88, 'n33': 0.5, 'n34': 0.48, 'n35': 0.57, 'i68': 86, 'i69': 80, 'i70': 88, 'i71': 84, 'i72': 85, 'i74': 73, 'i75': 69, 'i76': 84, 'i77': 75 } },
  { id: 'i11', code: 107010, name: 'Trigo, grano 13', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 12.17, 'i2': 0.76, 'i14': 3816.2, 'i25': 1.69, 'i35': 0.72, 'i46': 2.23, 'n14': 11.17, 'i62': 11.61, 'n16': 0.33, 'n17': 0.34, 'n18': 0.19, 'n19': 0.26, 'n20': 0.45, 'n21': 0.14, 'n22': 0.42, 'n23': 0.51, 'n24': 0.78, 'n25': 0.53, 'n26': 0.33, 'n27': 0.85, 'n28': 0.27, 'n29': 0.55, 'n30': 0.41, 'n31': 0.58, 'n32': 3.2, 'n33': 0.45, 'n34': 0.54, 'n35': 1.11, 'i68': 82.91, 'i69': 82.93, 'i70': 90, 'i71': 45.5, 'i72': 88.98, 'i73': 85.71, 'i74': 81.41, 'i75': 82.93, 'i76': 89.5, 'i77': 45.5 } },
  { id: 'i12', code: 107050, name: 'Trigo, residuo', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 11.77, 'i2': 0.51, 'i14': 3916.59, 'i25': 2.32, 'i35': 1.18, 'i46': 5.77, 'n14': 20.11, 'i62': 14.21, 'n16': 0.48, 'n17': 0.43, 'n18': 0.22, 'n19': 0.32, 'n20': 0.54, 'n21': 0.16, 'n22': 0.48, 'n23': 0.61, 'n24': 0.91, 'n25': 0.58, 'n26': 0.35, 'n27': 0.93, 'n28': 0.33, 'n29': 0.67, 'n30': 0.56, 'n31': 0.83, 'n32': 3.41, 'n33': 0.71, 'n34': 0.62, 'n35': 1.09, 'i68': 83.51, 'i69': 90.4, 'i70': 86.83, 'i71': 91.98, 'i72': 89.81, 'i74': 82, 'i75': 79, 'i76': 87, 'i77': 83 } },
  { id: 'i13', code: 108010, name: 'Arroz, quebrado', category: 'MACRO', subcategory: 'CEREALES', price: 0, stock: 0, nutrients: { 'i1': 10.77, 'i14': 3819, 'i25': 1.01, 'i35': 0.31, 'i46': 0.45, 'n14': 9.87, 'i62': 7.97, 'n16': 0.3, 'n17': 0.26, 'n18': 0.19, 'n19': 0.14, 'n20': 0.39, 'n21': 0.1, 'n22': 0.35, 'n23': 0.43, 'n24': 0.64, 'n25': 0.37, 'n26': 0.31, 'n27': 0.64, 'n28': 0.17, 'n29': 0.54, 'n30': 0.38, 'n31': 0.63, 'n32': 1.19, 'n33': 0.31, 'n34': 0.34, 'n35': 0.33, 'i74': 88.28, 'i75': 85.7 } },
  { id: 'i14', code: 201010, name: 'Soja, inf. ext. 36', category: 'MACRO', subcategory: 'OLEAGINOSAS', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 9.2, 'i14': 5170, 'i25': 18.1, 'i35': 9.18, 'i46': 6.3, 'n14': 13.7, 'i62': 37.5, 'n16': 2.25, 'n17': 1.46, 'n18': 0.49, 'n19': 0.61, 'n20': 1.1, 'n21': 0.53, 'n22': 1.7, 'n23': 1.81, 'n24': 2.88, 'n25': 1.95, 'n26': 1.34, 'n27': 3.29, 'n28': 0.98, 'n29': 2.68, 'n30': 1.41, 'n31': 3.88, 'n32': 6.17, 'n33': 1.48, 'n34': 1.78, 'n35': 1.83, 'i68': 91, 'i69': 88, 'i70': 90, 'i71': 83, 'i72': 86.12, 'i73': 88, 'i74': 90, 'i75': 89, 'i76': 91, 'i77': 80 } },
  { id: 'i15', code: 202010, name: 'Soja, micronizada', category: 'MACRO', subcategory: 'OLEAGINOSAS', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 7.04, 'i2': 0.17, 'i14': 5294.5, 'i25': 22.55, 'i35': 10.6, 'i46': 0.68, 'n14': 15.65, 'i62': 39.4, 'n16': 2.31, 'n17': 1.52, 'n18': 0.53, 'n19': 0.53, 'n20': 1.05, 'n21': 0.51, 'n22': 1.83, 'n23': 1.95, 'n24': 3, 'n25': 2.01, 'n26': 1.36, 'n27': 3.37, 'n28': 0.99, 'n29': 2.81, 'n30': 1.63, 'n31': 4.5, 'n32': 7.12, 'n33': 1.66, 'n34': 1.85, 'i68': 95.28, 'i69': 90.77, 'i70': 94.47, 'i71': 83.26, 'i72': 88.82, 'i73': 92.16 } },
  { id: 'i16', code: 301100, name: 'Soja, pasta 43', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 11.52, 'i2': 1.1, 'i14': 4074.5, 'i25': 1.68, 'i35': 0.68, 'n14': 13.63, 'i62': 43.37, 'n16': 2.66, 'n17': 1.72, 'n18': 0.61, 'n19': 0.62, 'n20': 1.24, 'n21': 0.56, 'n22': 1.96, 'n23': 2.04, 'n24': 3.28, 'n25': 2.16, 'n26': 1.48, 'n27': 3.64, 'n28': 1.13, 'n29': 3.15, 'n30': 1.89, 'n31': 5.03, 'n32': 7.96, 'n33': 1.86, 'n34': 2.23, 'n35': 2.16, 'i68': 93.31, 'i69': 90.38, 'i70': 93.46, 'i72': 87.28, 'i74': 90, 'i75': 86, 'i76': 91, 'i77': 86 } },
  { id: 'i17', code: 301150, name: 'Soja, pasta 44', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 10.66, 'i2': 1.2, 'i25': 1.92, 'i35': 0.69, 'n14': 13.88, 'i62': 44.13, 'n16': 2.73, 'n17': 1.73, 'n18': 0.61, 'n19': 0.64, 'n20': 1.24, 'n21': 0.61, 'n22': 2.01, 'n23': 2.09, 'n24': 3.37, 'n25': 2.2, 'n26': 1.53, 'n27': 3.73, 'n28': 1.13, 'n29': 3.19, 'n30': 1.83, 'n31': 5.12, 'n32': 8.07, 'n33': 1.85, 'n34': 2.17, 'i68': 93.71, 'i69': 89.46, 'i70': 94.61, 'i71': 83.43, 'i72': 89, 'i74': 89, 'i75': 85, 'i76': 91, 'i77': 84 } },
  { id: 'i18', code: 301200, name: 'Soja, pasta 45', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 11.52, 'i14': 4094.33, 'i25': 1.97, 'i35': 0.73, 'i46': 6.2, 'n14': 13.51, 'i62': 44.99, 'n16': 2.76, 'n17': 1.76, 'n18': 0.63, 'n19': 0.64, 'n20': 1.26, 'n21': 0.61, 'n22': 2.11, 'n23': 2.16, 'n24': 3.41, 'n25': 2.29, 'n26': 1.55, 'n27': 3.84, 'n28': 1.19, 'n29': 3.34, 'n30': 1.95, 'n31': 5.08, 'n32': 8.12, 'n33': 1.89, 'n34': 1.78, 'n35': 2.23, 'i68': 91, 'i69': 88.6, 'i70': 91.65, 'i71': 86, 'i72': 88.09, 'i73': 90.77, 'i74': 89.24, 'i75': 85.92, 'i76': 92.15, 'i77': 86 } },
  { id: 'i19', code: 301250, name: 'Soja, pasta 46', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 11.9, 'i14': 4090, 'i25': 1.4, 'i35': 0.72, 'i46': 5.9, 'n14': 14.12, 'i62': 46, 'n16': 2.81, 'n17': 1.8, 'n18': 0.66, 'n19': 0.63, 'n20': 1.28, 'n21': 0.66, 'n22': 2.13, 'n23': 2.15, 'n24': 3.57, 'n25': 2.32, 'n26': 1.51, 'n27': 3.83, 'n28': 1.18, 'n29': 3.36, 'n30': 2.02, 'n31': 5.21, 'n32': 8.19, 'n33': 1.92, 'n34': 2.32, 'n35': 2.29, 'i68': 91, 'i69': 89, 'i70': 92, 'i71': 84, 'i72': 88.09, 'i73': 91, 'i74': 87, 'i75': 83, 'i76': 91, 'i77': 83 } },
  { id: 'i20', code: 301300, name: 'Soja, pasta 47', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 11.33, 'i2': 0.72, 'i14': 4111, 'i25': 2.02, 'i35': 0.6, 'i46': 4.52, 'n14': 10.49, 'i62': 47.09, 'n16': 2.88, 'n17': 1.81, 'n18': 0.64, 'n19': 0.68, 'n20': 1.25, 'n21': 0.57, 'n22': 2.2, 'n23': 2.25, 'n24': 3.56, 'n25': 2.37, 'n26': 1.6, 'n27': 3.97, 'n28': 1.23, 'n29': 3.48, 'n30': 1.95, 'n31': 5.28, 'n32': 8.51, 'n33': 1.9, 'n34': 2.32, 'n35': 2.29, 'i68': 94.08, 'i69': 92.64, 'i70': 93.61, 'i71': 86.21, 'i72': 89.81, 'i73': 98.6, 'i74': 92, 'i75': 89, 'i76': 93, 'i77': 89 } },
  { id: 'i21', code: 301350, name: 'Soja, pasta 48', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 11.6, 'i14': 4190, 'i25': 1.27, 'i35': 0.6, 'i46': 4.5, 'n14': 8.2, 'i62': 48, 'n16': 2.94, 'n17': 1.86, 'n18': 0.68, 'n19': 0.72, 'n20': 1.4, 'n21': 0.64, 'n22': 2.19, 'n23': 2.22, 'n24': 3.51, 'n25': 2.29, 'n26': 1.8, 'n27': 4.09, 'n28': 1.28, 'n29': 3.47, 'n30': 1.99, 'n31': 5.14, 'n32': 8.08, 'n33': 1.9, 'n34': 2.28, 'n35': 2.39, 'i68': 91, 'i69': 89, 'i70': 92, 'i71': 84, 'i72': 87.89, 'i73': 91, 'i74': 90, 'i75': 87, 'i76': 92, 'i77': 86 } },
  { id: 'i22', code: 301450, name: 'Soja, cascara', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 10.79, 'i14': 3890, 'i25': 1.8, 'i35': 1.11, 'i46': 25.4, 'n14': 49.34, 'i62': 11.78, 'n16': 0.68, 'n17': 0.42, 'n18': 0.15, 'n19': 0.18, 'n20': 0.33, 'n21': 0.14, 'n22': 0.44, 'n23': 0.51, 'n24': 0.73, 'n25': 0.44, 'n26': 0.34, 'n27': 0.78, 'n28': 0.28, 'n29': 0.58, 'n30': 0.49, 'n31': 1.03, 'n32': 1.44, 'n33': 0.78, 'n34': 0.63, 'n35': 0.46, 'i74': 60, 'i75': 61, 'i76': 71, 'i77': 63 } },
  { id: 'i23', code: 301500, name: 'Soja, concentrado proteico 90', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 5, 'i14': 4803, 'i25': 0.5, 'i46': 0.3, 'i62': 92, 'n16': 5.7, 'n17': 3.2, 'n18': 1.2, 'n19': 1.2, 'n20': 2.4, 'n21': 0.9, 'n22': 3.8, 'n23': 4, 'n24': 6.9, 'n25': 4.54, 'n26': 3.25, 'n27': 7.79, 'n28': 2.4, 'n29': 7.1, 'n30': 4.1, 'n31': 11, 'n32': 17.3, 'n33': 3.95, 'n34': 5.25, 'n35': 1.55, 'i74': 95, 'i75': 94, 'i76': 93, 'i77': 94 } },
  { id: 'i24', code: 301810, name: 'Aceite de Soja', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'SOJA', price: 0, stock: 0, nutrients: { 'i1': 0.7, 'i14': 9540, 'i25': 99, 'i35': 54 } },
  { id: 'i25', code: 302010, name: 'Arroz, harina integral', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 10.34, 'i14': 4513, 'i25': 13.63, 'i35': 4.37, 'i46': 8.11, 'n14': 22.41, 'i62': 13.55, 'n16': 0.59, 'n17': 0.49, 'n18': 0.27, 'n19': 0.26, 'n20': 0.53, 'n21': 0.16, 'n22': 0.49, 'n23': 0.72, 'n24': 0.98, 'n25': 0.64, 'n26': 0.34, 'n27': 0.98, 'n28': 0.33, 'n29': 1.03, 'n30': 0.81, 'n31': 1.19, 'n32': 1.94, 'n33': 0.67, 'n34': 0.64, 'n35': 0.62, 'i68': 74, 'i69': 69, 'i70': 78, 'i71': 66, 'i72': 72, 'i74': 73, 'i75': 67, 'i76': 75, 'i77': 65 } },
  { id: 'i26', code: 302020, name: 'Arroz, harina desgrasada', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 10.1, 'i14': 3770, 'i25': 2.38, 'i35': 0.64, 'i46': 10.86, 'n14': 24.2, 'i62': 16.13, 'n16': 0.65, 'n17': 0.55, 'n18': 0.31, 'n19': 0.28, 'n20': 0.59, 'n21': 0.18, 'n22': 0.52, 'n23': 0.79, 'n24': 1.06, 'n25': 0.67, 'n26': 0.41, 'n27': 1.07, 'n28': 0.38, 'n29': 1.15, 'n30': 0.85, 'n31': 1.25, 'n32': 2, 'n33': 0.7, 'n34': 0.67, 'n35': 0.65, 'i68': 72, 'i69': 67, 'i70': 76, 'i71': 64, 'i72': 70 } },
  { id: 'i27', code: 303050, name: 'Trigo, afrecho 15', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'TRIGO', price: 0, stock: 0, nutrients: { 'i1': 12, 'i14': 3946, 'i25': 3.4, 'i46': 9, 'i62': 16, 'n16': 0.61, 'n17': 0.48, 'n18': 0.22, 'n19': 0.31, 'n20': 0.53, 'n21': 0.2, 'n22': 0.5, 'n23': 0.69, 'n24': 0.95, 'n25': 0.62, 'n26': 0.45, 'n27': 1.07, 'n28': 0.4, 'n29': 1.02, 'n30': 0.63, 'n31': 0.94, 'n32': 2.98, 'n33': 0.7, 'n34': 0.64, 'n35': 0.98, 'i68': 75, 'i69': 74, 'i70': 73, 'i71': 74, 'i72': 73.58, 'i73': 80, 'i74': 73, 'i75': 69, 'i76': 79, 'i77': 76 } },
  { id: 'i28', code: 303060, name: 'Trigo, afrecho 19', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'TRIGO', price: 0, stock: 0, nutrients: { 'i1': 13, 'i25': 3.5, 'i46': 9, 'i62': 19, 'n16': 0.68, 'n17': 0.68, 'n18': 0.28, 'n19': 0.35, 'n20': 0.63, 'n21': 0.22, 'n22': 0.55, 'n23': 0.74, 'n24': 0.98, 'n28': 0.44, 'n29': 1.14, 'i68': 66.18, 'i69': 55.88, 'i70': 62.5, 'i71': 76, 'i72': 70, 'i73': 75.45, 'i74': 70.59, 'i75': 72.06, 'i76': 78.57, 'i77': 77.14 } },
  { id: 'i29', code: 304010, name: 'Maíz, gluten 60', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'MAIZ', price: 0, stock: 0, nutrients: { 'i1': 9.5, 'i14': 5060, 'i25': 2.5, 'i46': 1.5, 'n14': 7.51, 'i62': 59.9, 'n16': 1.04, 'n17': 2.08, 'n18': 1.45, 'n19': 1.07, 'n20': 2.52, 'n21': 0.28, 'n22': 2.52, 'n23': 2.84, 'n24': 9.95, 'n25': 3.82, 'n26': 3.15, 'n27': 6.97, 'n28': 1.27, 'n29': 1.94, 'n30': 5.29, 'n31': 3.61, 'n32': 12.56, 'n33': 1.65, 'n34': 3.08, 'n35': 5.32, 'i68': 86, 'i69': 91, 'i70': 98, 'i71': 92, 'i72': 95.45, 'i73': 85, 'i74': 89, 'i75': 92, 'i76': 93, 'i77': 92 } },
  { id: 'i30', code: 304040, name: 'Maíz, gluten 22', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', family: 'MAIZ', price: 0, stock: 0, nutrients: { 'i1': 11, 'i14': 3991, 'i25': 2.7, 'i35': 1.4, 'i46': 7.8, 'n14': 33.8, 'i62': 22.2, 'n16': 0.61, 'n17': 0.79, 'n18': 0.37, 'n19': 0.53, 'n20': 0.9, 'n21': 0.15, 'n22': 0.7, 'n23': 1.06, 'n24': 2.01, 'n25': 0.78, 'n26': 0.54, 'n27': 1.32, 'n28': 0.7, 'n29': 1.03, 'n30': 1.62, 'n31': 1.33, 'n32': 3.59, 'n33': 1.07, 'n34': 1.04, 'n35': 2.21, 'i68': 73, 'i69': 74, 'i70': 84, 'i71': 66, 'i72': 73.4, 'i73': 80, 'i74': 61, 'i75': 71, 'i76': 81, 'i77': 67 } },
  { id: 'i31', code: 305010, name: 'Girasol, harina 30', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 10.26, 'i14': 4127, 'i25': 2.25, 'i35': 0.99, 'i46': 30.74, 'n14': 42.48, 'i62': 29.31, 'n16': 0.99, 'n17': 1.07, 'n18': 0.66, 'n19': 0.47, 'n20': 1.13, 'n21': 0.34, 'n22': 1.16, 'n23': 1.38, 'n24': 1.8, 'n25': 1.27, 'n26': 0.62, 'n27': 1.88, 'n28': 0.68, 'n29': 2.24, 'n30': 1.24, 'n31': 2.55, 'n32': 5.41, 'n33': 1.66, 'n34': 1.22, 'n35': 1.18, 'i68': 79.69, 'i69': 84.86, 'i70': 91.31, 'i71': 82.36, 'i72': 87.31, 'i74': 80, 'i75': 82, 'i76': 92, 'i77': 81 } },
  { id: 'i32', code: 305020, name: 'Girasol, harina 35', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 9.78, 'i14': 4150, 'i25': 1.52, 'i35': 0.84, 'i46': 20.8, 'n14': 33.14, 'i62': 33.43, 'n16': 1.2, 'n17': 1.28, 'n18': 0.77, 'n19': 0.56, 'n20': 1.33, 'n21': 0.42, 'n22': 1.38, 'n23': 1.66, 'n24': 2.15, 'n25': 1.53, 'n26': 0.79, 'n27': 2.32, 'n28': 0.84, 'n29': 2.83, 'n30': 1.46, 'n31': 3.02, 'n32': 6.47, 'n33': 1.95, 'n34': 1.47, 'n35': 1.46, 'i68': 82.38, 'i69': 85.22, 'i70': 92.34, 'i71': 83.47, 'i72': 88.5, 'i74': 82, 'i75': 81, 'i76': 92, 'i77': 82 } },
  { id: 'i33', code: 305030, name: 'Girasol, harina 40', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 8.5, 'i14': 4155, 'i25': 2.21, 'i35': 1.07, 'i46': 17.31, 'n14': 26.68, 'i62': 39.89, 'n16': 1.24, 'n17': 1.42, 'n18': 0.81, 'n19': 0.62, 'n20': 1.44, 'n21': 0.44, 'n22': 1.43, 'n23': 1.75, 'n24': 2.38, 'n25': 1.67, 'n26': 0.95, 'n27': 2.62, 'n28': 0.91, 'n29': 3, 'n30': 1.6, 'n31': 3.39, 'n32': 7.15, 'n33': 2.23, 'n34': 1.64, 'n35': 1.47, 'i68': 83.69, 'i69': 85.94, 'i70': 93, 'i71': 83.75, 'i72': 89.13, 'i74': 83, 'i75': 84, 'i76': 90, 'i77': 81 } },
  { id: 'i34', code: 306010, name: 'Canola, harina', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 10.21, 'i14': 4102.5, 'i25': 2.64, 'i35': 0.4, 'i46': 11.01, 'n14': 26.34, 'i62': 35.41, 'n16': 1.93, 'n17': 1.53, 'n18': 0.74, 'n19': 0.86, 'n20': 1.59, 'n21': 0.43, 'n22': 1.45, 'n23': 1.79, 'n24': 2.39, 'n25': 1.38, 'n26': 1.03, 'n27': 2.41, 'n28': 0.94, 'n29': 2.13, 'n30': 1.49, 'n31': 2.42, 'n32': 5.78, 'n33': 1.69, 'n34': 1.5, 'n35': 2.11, 'i68': 78, 'i69': 84, 'i70': 87, 'i71': 82, 'i72': 84, 'i74': 76.5, 'i75': 75.5, 'i76': 86.5, 'i77': 82 } },
  { id: 'i35', code: 307010, name: 'Coco, aceite', category: 'MACRO', subcategory: 'SUBPROD.VEGETAL', price: 0, stock: 0, nutrients: { 'i1': 8.67, 'i14': 4164.5, 'i25': 5, 'i35': 0.07, 'i46': 13.5, 'n14': 51.33, 'i62': 21.57, 'n16': 0.58, 'n17': 0.64, 'n18': 0.32, 'n19': 0.27, 'n20': 0.6, 'n21': 0.22, 'n22': 0.71, 'n23': 1.04, 'n24': 1.31, 'n25': 0.84, 'n26': 0.51, 'n27': 1.32, 'n28': 0.41, 'n29': 2.37, 'n30': 0.81, 'n31': 1.55, 'n32': 3.49, 'n33': 0.84, 'n34': 0.89, 'n35': 0.7, 'i74': 51, 'i75': 51, 'i76': 67, 'i77': 54 } },
  { id: 'i36', code: 308010, name: 'Azucar', category: 'SUPLEMENTO', price: 0, stock: 0, nutrients: { 'i1': 0.1, 'i14': 4005, 'i62': 0.09 } },
  { id: 'i37', code: 401010, name: 'Carne, harina 35', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', family: 'CARNE, HARINA', price: 0, stock: 0, nutrients: { 'i1': 7.32, 'i14': 3081.67, 'i25': 12.84, 'i35': 0.3, 'i46': 0.93, 'i62': 36.2, 'i63': 87.52, 'n16': 1.77, 'n17': 0.99, 'n18': 0.43, 'n19': 0.26, 'n20': 0.69, 'n21': 0.19, 'n22': 0.84, 'n23': 1.42, 'n24': 1.82, 'n25': 1.07, 'n26': 0.58, 'n27': 1.65, 'n28': 0.46, 'n29': 3.24, 'n30': 3.42, 'n31': 2.44, 'n32': 4.4, 'n33': 7.34, 'n34': 1.25, 'n35': 4.5, 'i68': 75.43, 'i69': 67.52, 'i70': 60.74, 'i71': 47.85, 'i72': 62.62, 'i73': 63.16 } },
  { id: 'i38', code: 401020, name: 'Carne, harina 40', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', family: 'CARNE, HARINA', price: 0, stock: 0, nutrients: { 'i1': 7.66, 'i2': 0.79, 'i14': 3421.75, 'i25': 11.29, 'i35': 0.35, 'i46': 1.24, 'i62': 40.95, 'i63': 92.47, 'n16': 1.98, 'n17': 1.09, 'n18': 0.49, 'n19': 0.34, 'n20': 0.83, 'n21': 0.2, 'n22': 0.96, 'n23': 1.55, 'n24': 2.06, 'n25': 1.17, 'n26': 0.65, 'n27': 2.03, 'n28': 0.61, 'n29': 3.38, 'n30': 3.59, 'n31': 2.8, 'n32': 4.83, 'n33': 7.54, 'n34': 1.33, 'n35': 4.35, 'i68': 82.81, 'i69': 74.12, 'i70': 70.56, 'i71': 52.57, 'i72': 70.38, 'i73': 75, 'i74': 69.84, 'i75': 74.56, 'i76': 73.47 } },
  { id: 'i39', code: 401022, name: 'Carne, harina 42', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', price: 0, stock: 0, nutrients: { 'i1': 7.5, 'i14': 3561, 'i25': 11.82, 'i35': 0.35, 'i46': 1.24, 'i62': 40.69, 'n16': 1.89, 'n17': 1.14, 'n18': 0.49, 'n19': 0.67, 'n20': 1.16, 'n21': 0.2, 'n22': 0.98, 'n23': 1.6, 'n24': 2.12, 'n25': 1.22, 'n26': 0.81, 'n27': 2.03, 'n28': 0.6, 'n29': 3.16, 'n30': 2.91, 'n31': 2.95, 'n32': 4.88, 'n33': 5.02, 'n34': 1.58, 'n35': 3.34, 'i68': 83, 'i69': 79, 'i70': 78, 'i71': 71, 'i72': 73.96, 'i73': 75, 'i74': 79, 'i75': 78, 'i76': 86, 'i77': 50 } },
  { id: 'i40', code: 401030, name: 'Carne, harina 45', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', family: 'CARNE, HARINA', price: 0, stock: 0, nutrients: { 'i1': 7.8, 'i14': 3692, 'i25': 11.1, 'i35': 0.33, 'i46': 1.28, 'i62': 45.37, 'n16': 2.25, 'n17': 1.47, 'n18': 0.61, 'n19': 0.58, 'n20': 1.19, 'n21': 0.25, 'n22': 1.15, 'n23': 1.92, 'n24': 2.69, 'n25': 1.5, 'n26': 0.88, 'n27': 2.38, 'n28': 0.72, 'n29': 3.59, 'i68': 82.22, 'i69': 78.91, 'i70': 78.69, 'i72': 77.31, 'i73': 76, 'i74': 72, 'i75': 74.15, 'i76': 70.49 } },
  { id: 'i41', code: 401040, name: 'Carne, harina 50', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', family: 'CARNE, HARINA', price: 0, stock: 0, nutrients: { 'i1': 8.2, 'i14': 3812, 'i25': 40.61, 'i35': 0.33, 'i46': 1.24, 'i62': 50.61, 'n16': 2.57, 'n17': 1.55, 'n18': 0.7, 'n19': 0.52, 'n20': 1.22, 'n21': 0.27, 'n22': 1.36, 'n23': 2.1, 'n24': 3.11, 'n25': 1.54, 'n26': 1.1, 'n27': 2.64, 'n28': 0.85, 'n29': 3.65, 'n30': 3.62, 'n31': 3.82, 'n32': 6.18, 'n33': 6.3, 'n34': 2.32, 'n35': 4.18, 'i68': 85, 'i69': 84, 'i70': 89, 'i71': 66, 'i72': 79.2, 'i73': 82, 'i74': 84, 'i75': 82, 'i76': 86, 'i77': 67 } },
  { id: 'i42', code: 401042, name: 'Carne, harina 50 (Dig.)', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', price: 0, stock: 0, nutrients: { 'i1': 8.2, 'i14': 3812, 'i25': 40.61, 'i35': 0.33, 'i46': 1.24, 'i62': 50.61, 'n16': 2.57, 'n17': 1.55, 'n18': 0.7, 'n19': 0.52, 'n20': 1.22, 'n21': 0.27, 'n22': 1.36, 'n23': 2.1, 'n24': 3.11, 'n25': 1.54, 'n26': 1.1, 'n27': 2.64, 'n28': 0.85, 'n29': 3.65, 'n30': 3.62, 'n31': 3.82, 'n32': 6.18, 'n33': 6.3, 'n34': 2.32, 'n35': 4.18, 'i68': 75, 'i69': 76, 'i70': 81, 'i71': 57, 'i72': 70.77, 'i73': 74, 'i74': 72, 'i75': 64, 'i76': 76, 'i77': 46 } },
  { id: 'i43', code: 401050, name: 'Carne, harina 55', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', family: 'CARNE, HARINA', price: 0, stock: 0, nutrients: { 'i1': 7.29, 'i14': 4145, 'i25': 10.44, 'i35': 0.23, 'i46': 1.5, 'i62': 54.5, 'n16': 2.77, 'n17': 1.7, 'n18': 0.71, 'n19': 0.52, 'n20': 1.23, 'n21': 0.29, 'n22': 1.52, 'n23': 2.33, 'n24': 3.21, 'n25': 1.85, 'n26': 0.96, 'n27': 2.81, 'n28': 0.91, 'n29': 3.68 } },
  { id: 'i44', code: 402010, name: 'Visceras, Harina 52/12', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', family: 'VISCERAS, HARINA 52/12', price: 0, stock: 0, nutrients: { 'i1': 9, 'i14': 4453, 'i25': 11.5, 'i35': 1.9, 'i46': 1.41, 'i62': 58, 'n16': 3.24, 'n17': 2.47, 'n18': 1.12, 'n19': 0.85, 'n20': 1.97, 'n21': 0.59, 'n22': 2.43, 'n23': 3.15, 'n24': 4.5, 'n25': 2.53, 'n26': 1.79, 'n27': 4.32, 'n28': 1.13, 'n29': 4.21, 'n30': 3.03, 'n31': 4.14, 'n32': 6.93, 'n33': 4.75, 'n34': 3.9, 'n35': 4.34, 'i68': 78, 'i69': 76, 'i70': 80, 'i71': 61, 'i72': 71.8, 'i73': 80, 'i74': 76, 'i75': 74, 'i76': 75, 'i77': 68 } },
  { id: 'i45', code: 403010, name: 'Pescado, harina', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', price: 0, stock: 0, nutrients: { 'i1': 9.6, 'i2': 0.66, 'i14': 5247, 'i25': 4.32, 'i35': 0.77, 'i46': 0.77, 'i62': 84.3, 'i63': 21.75, 'n16': 2.19, 'n17': 3.86, 'n18': 0.63, 'n19': 3.33, 'n20': 3.96, 'n21': 0.49, 'n22': 3.98, 'n23': 5.9, 'n24': 6.88, 'n25': 3.89, 'n26': 2.74, 'n27': 6.63, 'n28': 0.97, 'n29': 5.4, 'n30': 3.71, 'n31': 5.35, 'n32': 8.67, 'n33': 6.15, 'n34': 8.85, 'n35': 7.83, 'i68': 69, 'i69': 74, 'i70': 76, 'i71': 47, 'i72': 51.61, 'i73': 62, 'i74': 67, 'i75': 80, 'i76': 71, 'i77': 71 } },
  { id: 'i46', code: 404010, name: 'Sangre, harina 82', category: 'MACRO', subcategory: 'SUBPROD.ANIMAL', price: 0, stock: 0, nutrients: { 'i1': 11.5, 'i14': 5091, 'i25': 0.42, 'i46': 0.34, 'i62': 78.4, 'n16': 7.1, 'n17': 3.7, 'n18': 0.98, 'n19': 1.05, 'n20': 2.03, 'n21': 1.18, 'n22': 0.8, 'n23': 6.42, 'n24': 10.23, 'n25': 5.71, 'n26': 2.39, 'n27': 8.1, 'n28': 4.64, 'n29': 3.61, 'n30': 3.03, 'n31': 4.14, 'n32': 6.93, 'n33': 4.75, 'n34': 3.9, 'n35': 4.34, 'i68': 67, 'i69': 72, 'i70': 70, 'i71': 51, 'i72': 60.17, 'i73': 91, 'i74': 71, 'i75': 66, 'i76': 56, 'i77': 60 } },
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
