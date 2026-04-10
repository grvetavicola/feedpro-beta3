import { Ingredient, Nutrient, Product, Client, NutritionalBase, Relationship } from './types';

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Cliente General' },
  { id: 'c2', name: 'Granja Avícola El Sol' }
];

export const INITIAL_NUTRIENTS: Nutrient[] = [
  { id: 'n1', code: 1, name: 'Materia Seca', unit: '%' },
  { id: 'n2', code: 2, name: 'Proteína Bruta', unit: '%' },
  { id: 'n3', code: 3, name: 'Energía Metab.', unit: 'Mcal/kg' },
  { id: 'n4', code: 4, name: 'Calcio', unit: '%' },
  { id: 'n5', code: 5, name: 'Fósforo Disp.', unit: '%' },
  { id: 'n6', code: 6, name: 'Lisina', unit: '%' },
  { id: 'n7', code: 7, name: 'Metionina', unit: '%' },
];

export const DEFAULT_RELATIONS: Omit<Relationship, 'id' | 'min' | 'max'>[] = [
  { name: 'Relación Calcio : Fósforo Disp.', nutrientAId: 'n4', nutrientBId: 'n5' },
  { name: 'Relación Lisina : Metionina', nutrientAId: 'n6', nutrientBId: 'n7' },
  { name: 'Relación Lisina : Proteína', nutrientAId: 'n6', nutrientBId: 'n2' },
];

export const INITIAL_INGREDIENTS: Ingredient[] = [
  { 
    id: 'i1', code: 1001, name: 'Maíz Grano', category: 'Energético', price: 0.25, stock: 50000,
    nutrients: { 'n1': 88, 'n2': 8.5, 'n3': 3.35, 'n4': 0.02, 'n5': 0.12, 'n6': 0.24, 'n7': 0.18 }
  },
  { 
    id: 'i2', code: 1002, name: 'Harina de Soja 45%', category: 'Proteico', price: 0.55, stock: 20000,
    nutrients: { 'n1': 89, 'n2': 45.0, 'n3': 2.25, 'n4': 0.30, 'n5': 0.28, 'n6': 2.80, 'n7': 0.65 }
  },
  { 
    id: 'i3', code: 1003, name: 'Afrecho de Trigo', category: 'Fibroso', price: 0.20, stock: 15000,
    nutrients: { 'n1': 88, 'n2': 15.0, 'n3': 1.80, 'n4': 0.15, 'n5': 0.50, 'n6': 0.60, 'n7': 0.25 }
  },
  { 
    id: 'i4', code: 1004, name: 'Carbonato de Calcio', category: 'Mineral', price: 0.10, stock: 5000,
    nutrients: { 'n1': 99, 'n2': 0, 'n3': 0, 'n4': 38.0, 'n5': 0, 'n6': 0, 'n7': 0 }
  },
  { 
    id: 'i5', code: 1005, name: 'Fosfato Bicálcico', category: 'Mineral', price: 0.80, stock: 3000,
    nutrients: { 'n1': 98, 'n2': 0, 'n3': 0, 'n4': 24.0, 'n5': 18.0, 'n6': 0, 'n7': 0 }
  },
  { 
    id: 'i6', code: 1006, name: 'Aceite de Soja', category: 'Energético', price: 1.20, stock: 2000,
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

export const AUTHORIZED_ACCOUNTS = [
  { username: 'feedpro', password: 'feed01_', email: 'contacto@cliente1.com', assignedClientId: 'c1' },
  { username: 'feedpro', password: 'feed02_', email: 'contacto@cliente2.com', assignedClientId: 'c2' },
  { username: 'feedpro', password: 'feed03_', email: 'contacto@cliente3.com', assignedClientId: 'c3' },
  { username: 'feedpro', password: 'feed04_', email: 'contacto@cliente4.com', assignedClientId: 'c4' },
  { username: 'feedpro', password: 'feed05_', email: 'contacto@cliente5.com', assignedClientId: 'c5' },
  { username: 'feedpro', password: 'feed06_', email: 'contacto@cliente6.com', assignedClientId: 'c6' },
  { username: 'feedpro', password: 'feed07_', email: 'contacto@cliente7.com', assignedClientId: 'c7' },
  { username: 'feedpro', password: 'feed08_', email: 'contacto@cliente8.com', assignedClientId: 'c8' },
  { username: 'feedpro', password: 'feed09_', email: 'contacto@cliente9.com', assignedClientId: 'c9' },
  { username: 'feedpro', password: 'feed10_', email: 'contacto@cliente10.com', assignedClientId: 'c10' },
  { username: 'admin', password: 'admin_feedpro', email: 'admin@feedpro.com', assignedClientId: 'ALL' }
];
