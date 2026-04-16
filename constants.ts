import { Ingredient, Nutrient, Product, Client, NutritionalBase, Relationship } from './types';

export const APP_NAME = "FeedPro 360";
export const APP_VERSION = "v1.1.0";

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Cliente General', logo: 'https://cdn-icons-png.flaticon.com/512/2662/2662503.png' },
  { id: 'c2', name: 'Granja Avícola El Sol', logo: 'https://cdn-icons-png.flaticon.com/512/3248/3248141.png' }
];

export const INITIAL_NUTRIENTS: Nutrient[] = [
  { id: 'n200020', code: 200020, name: 'E Metabolizable A', unit: 'KCAL/KG', group: 'Energia' },
  { id: 'n300100', code: 300100, name: 'E. Etereo', unit: '%', group: 'Grasa' },
  { id: 'n500015', code: 500015, name: 'Proteína Cruda', unit: '%', group: 'Proteina' },
  { id: 'n510010', code: 510010, name: 'Lys total %', unit: '%', group: 'AA totales' },
  { id: 'n510030', code: 510030, name: 'Tre total %', unit: '%', group: 'AA totales' },
  { id: 'n510040', code: 510040, name: 'Met total %', unit: '%', group: 'AA totales' },
  { id: 'n510060', code: 510060, name: 'M+C total %', unit: '%', group: 'AA totales' },
  { id: 'n510070', code: 510070, name: 'Trip total %', unit: '%', group: 'AA totales' },
  { id: 'n510080', code: 510080, name: 'Iso Total %', unit: '%', group: 'AA totales' },
  { id: 'n510090', code: 510090, name: 'Val total %', unit: '%', group: 'AA totales' },
  { id: 'n510140', code: 510140, name: 'Arg total %', unit: '%', group: 'AA totales' },
  { id: 'n521010', code: 521010, name: 'Lys Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521020', code: 521020, name: 'Tre Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521030', code: 521030, name: 'Met Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521050', code: 521050, name: 'M+C Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521060', code: 521060, name: 'Trip Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521070', code: 521070, name: 'Iso Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521080', code: 521080, name: 'Val Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521090', code: 521090, name: 'Leu Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n521130', code: 521130, name: 'Arg Dig A %', unit: '%', group: 'AA Digestible Aves' },
  { id: 'n541010', code: 541010, name: 'Calcio', unit: '%', group: 'Minerales' },
  { id: 'n541020', code: 541020, name: 'Fosforo Total', unit: '%', group: 'Minerales' },
  { id: 'n541050', code: 541050, name: 'Fosforo Disponible A', unit: '%', group: 'Minerales' }
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'i1', code: 101010, name: 'Maiz', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 3350, 'n300100': 3.5, 'n500015': 7, 'n510010': 0.22, 'n510030': 0.34, 'n510040': 0.2, 'n510060': 0.33, 'n510070': 0.09, 'n510080': 0.26, 'n510090': 0.36, 'n510140': 0.36, 'n521010': 0.17, 'n521020': 0.2, 'n521030': 0.18, 'n521050': 0.29, 'n521060': 0.08, 'n521070': 0.21, 'n521080': 0.32, 'n521130': 0.32, 'n541010': 0.02, 'n541020': 0.28, 'n541050': 0.09 } },
  { id: 'i2', code: 102010, name: 'Sorgo', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 3200, 'n300100': 2.82, 'n500015': 8, 'n510010': 0.2, 'n510030': 0.28, 'n510040': 0.12, 'n510060': 0.27, 'n510070': 0.09, 'n510080': 0.31, 'n510090': 0.38, 'n510140': 0.3, 'n521010': 0.19, 'n521020': 0.26, 'n521030': 0.11, 'n521050': 0.24, 'n521060': 0.08, 'n521070': 0.27, 'n521080': 0.32, 'n521090': 1.12, 'n521130': 0.27, 'n541010': 0.03, 'n541020': 0.27, 'n541050': 0.1 } },
  { id: 'i3', code: 301250, name: 'Afr. Soya 46', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 2300, 'n300100': 1.69, 'n500015': 46, 'n510010': 2.9, 'n510030': 1.8, 'n510040': 0.7, 'n510060': 1.4, 'n510070': 0.75, 'n510080': 2.14, 'n510090': 2.24, 'n510140': 3.38, 'n521010': 2.68, 'n521020': 1.59, 'n521030': 0.64, 'n521050': 1.22, 'n521060': 0.6, 'n521070': 1.94, 'n521080': 2, 'n521130': 3.21, 'n541010': 0.3, 'n541020': 0.59, 'n541050': 0.3 } },
  { id: 'i4', code: 201010, name: 'Poroto Soya', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 3350, 'n300100': 18, 'n500015': 34, 'n510010': 2.4, 'n510030': 1.4, 'n510040': 0.52, 'n510060': 1.05, 'n510070': 0.5, 'n510080': 1.7, 'n510090': 1.78, 'n510140': 2.7, 'n521010': 2.17, 'n521020': 1.22, 'n521030': 0.47, 'n521050': 0.91, 'n521060': 0.45, 'n521070': 1.53, 'n521080': 1.59, 'n521130': 2.53, 'n541010': 0.3, 'n541020': 0.59, 'n541050': 0.3 } },
  { id: 'i5', code: 303050, name: 'Trigo Afrechillo', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 1500, 'n300100': 3.37, 'n500015': 15.62, 'n510010': 0.6, 'n510030': 0.37, 'n510040': 0.2, 'n510060': 0.5, 'n510070': 0.3, 'n510080': 0.56, 'n510090': 0.71, 'n510140': 1.15, 'n521010': 0.46, 'n521020': 0.27, 'n521030': 0.15, 'n521050': 0.37, 'n521060': 0.24, 'n521070': 0.43, 'n521080': 0.52, 'n521090': 0.74, 'n521130': 1.02, 'n541010': 0.14, 'n541020': 0.94, 'n541050': 0.33 } },
  { id: 'i6', code: 304010, name: 'Glúten Meal', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 3500, 'n300100': 2, 'n500015': 59.85, 'n510010': 1, 'n510030': 2, 'n510040': 1.8, 'n510060': 2.9, 'n510070': 0.28, 'n510080': 2.4, 'n510090': 2.86, 'n510140': 1.96, 'n521010': 0.94, 'n521020': 1.69, 'n521030': 1.71, 'n521050': 2.71, 'n521060': 0.28, 'n521070': 2.31, 'n521080': 2.69, 'n521090': 10.23, 'n521130': 1.9, 'n541010': 0.02, 'n541020': 0.44, 'n541050': 0.1 } },
  { id: 'i7', code: 401050, name: 'H. Carne MIXTA', category: 'MACRO', price: 0, stock: 100000, 
    nutrients: { 'n200020': 3350, 'n300100': 10.44, 'n500015': 56, 'n510010': 2.95, 'n510030': 1.82, 'n510040': 0.75, 'n510060': 1.27, 'n510070': 0.33, 'n510080': 1.57, 'n510090': 2.42, 'n510140': 3.87, 'n521010': 2.33, 'n521020': 1.44, 'n521030': 0.62, 'n521050': 1.08, 'n521060': 0.26, 'n521070': 1.3, 'n521080': 1.98, 'n521090': 2.88, 'n521130': 3.29, 'n541010': 7, 'n541020': 3.5, 'n541050': 3 } },
  { id: 'i8', code: 301820, name: 'Acido Graso', category: 'MACRO', price: 0, stock: 100000, nutrients: { 'n200020': 8000, 'n300100': 98 } },
  { id: 'i9', code: 601010, name: 'L-Lisina HCL', category: 'MICRO', price: 0, stock: 100000, nutrients: { 'n200020': 4100, 'n500015': 93.4, 'n510010': 78.6, 'n521010': 78.6 } },
  { id: 'i10', code: 602010, name: 'Conchuela (36%)', category: 'MICRO', price: 0, stock: 100000, nutrients: { 'n541010': 36 } },
  { id: 'i11', code: 602020, name: 'Carbonato de Calcio', category: 'MICRO', price: 0, stock: 100000, nutrients: { 'n541010': 33 } },
  { id: 'i12', code: 603010, name: 'Fosbic (Bical 18%)', category: 'MICRO', price: 0, stock: 100000, nutrients: { 'n541010': 26, 'n541050': 18 } },
  { id: 'i13', code: 701010, name: 'NUCLEO CRIANZA', category: 'MICRO', price: 0, stock: 100000, nutrients: {} },
  { id: 'i14', code: 701020, name: 'POSTURA', category: 'MICRO', price: 0, stock: 100000, nutrients: {} }
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', clientId: 'c1', code: 101, name: 'CRIANZA EXCELLENCE', category: 'Crianza', constraints: [ { nutrientId: 'n200020', min: 2950, max: 3100 }, { nutrientId: 'n500015', min: 18, max: 21 }, { nutrientId: 'n541010', min: 0.9, max: 1.1 } ], ingredientConstraints: [ { ingredientId: 'i1', min: 20, max: 70 }, { ingredientId: 'i3', min: 15, max: 40 } ], relationships: [] },
  { id: 'p2', clientId: 'c1', code: 102, name: 'POSTURA GOLD', category: 'Postura', constraints: [ { nutrientId: 'n200020', min: 2750, max: 2900 }, { nutrientId: 'n500015', min: 15, max: 17 }, { nutrientId: 'n541010', min: 3.5, max: 4.2 } ], ingredientConstraints: [ { ingredientId: 'i1', min: 30, max: 75 }, { ingredientId: 'i10', min: 6, max: 11 } ], relationships: [] }
];

export const INITIAL_BASES: NutritionalBase[] = [];

const PREM_EXPIRY = new Date('2030-01-01').getTime();
export const AUTHORIZED_ACCOUNTS = [
  { username: 'admin', password: 'admin_feedpro', email: 'admin@feedpro.com', assignedClientId: 'ALL', trialEndsAt: PREM_EXPIRY }
];

export const NUTRIENT_SYNONYMS: Record<string, string[]> = {
  'n200020': ['E METABOLIZABLE A', 'EMA', 'ME', 'ENERGIA MET.'],
  'n500015': ['PROTEINA CRUDA', 'PC', 'CP', 'PROTEINA'],
  'n541010': ['CALCIO', 'CA'],
  'n541020': ['FOSFORO TOTAL', 'PT', 'PHOSPHORUS'],
  'n541050': ['FOSFORO DISPONIBLE A', 'PDA', 'AVP', 'P DISP']
};
