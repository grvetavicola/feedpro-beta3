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
  { id: 'n35', code: 521010, name: 'Lys Dig A %', unit: '%', group: 'AA Digestible' },
  { id: 'n36', code: 541010, name: 'Calcio', unit: '%', group: 'Macro-Minerales' },
  { id: 'n37', code: 541050, name: 'Fosforo Disponible A', unit: '%', group: 'Macro-Minerales' },
];

export const DEFAULT_RELATIONS: Omit<Relationship, 'id' | 'min' | 'max'>[] = [
  { name: 'Relación Ca:P Disp.', nutrientAId: 'n36', nutrientBId: 'n37' },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { id: 'i1', code: 101010, name: 'Maíz', category: 'MACRO', price: 250, stock: 100000, nutrients: { 'n5': 3350, 'n15': 8.5, 'n36': 0.02, 'n37': 0.08 } },
  { id: 'i2', code: 201010, name: 'Harina Soya 46%', category: 'MACRO', price: 500, stock: 100000, nutrients: { 'n5': 2250, 'n15': 46, 'n36': 0.25, 'n37': 0.20 } },
  { id: 'i3', code: 541010, name: 'Carbonato de Calcio', category: 'MICRO', price: 50, stock: 100000, nutrients: { 'n36': 38 } },
  { id: 'i4', code: 541050, name: 'Fosfato Bicálcico', category: 'MICRO', price: 800, stock: 100000, nutrients: { 'n36': 21, 'n37': 18.5 } },
  { id: 'i5', code: 301810, name: 'Aceite de Soya', category: 'MACRO', price: 1200, stock: 100000, nutrients: { 'n5': 8800 } },
  { id: 'i6', code: 105010, name: 'Cebada', category: 'MACRO', price: 220, stock: 100000, nutrients: { 'n5': 2950, 'n15': 10.5 } },
  { id: 'i7', code: 101020, name: 'Afrecho de Trigo', category: 'MACRO', price: 180, stock: 100000, nutrients: { 'n5': 1800, 'n15': 15.5 } },
];

const BASE_CONSTRAINTS = [
  { nutrientId: 'n5', min: 2800, max: 3100 },
  { nutrientId: 'n15', min: 14, max: 20 },
  { nutrientId: 'n36', min: 0.8, max: 4.5 },
  { nutrientId: 'n37', min: 0.3, max: 0.5 }
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
