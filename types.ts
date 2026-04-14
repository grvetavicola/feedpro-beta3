export type SubscriptionTier = 'free' | 'pro';

export interface User {
  name: string;
  subscription: SubscriptionTier;
  email?: string;
  assignedClientId?: string;
  trialEndsAt?: number; // Timestamp
}

export interface Nutrient {
  id: string;
  code: number;
  name: string;
  unit: string;
  group?: string; 
}

export interface Ingredient {
  id: string;
  code: number;
  name: string;
  category: string; 
  subcategory?: string;
  family?: string;
  price: number; 
  stock: number;
  dryMatter?: number;      // % Dry Matter
  shrinkage?: number;      // % Processing Loss (Merma)
  processingCost?: number; // $/kg Processing cost
  nutrients: Record<string, number>; 
  dynamicNutrients?: Record<string, number>; // Dynamic precision matrix overrides
}

export interface ProductConstraint {
  nutrientId: string;
  min: number;
  max: number;
}

export interface Relationship {
  id: string;
  name: string;
  nutrientAId: string;
  nutrientBId: string;
  min: number;
  max: number;
}

export interface IngredientConstraint {
  ingredientId: string;
  min: number;
  max: number;
}

export interface Client {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  species?: string; // e.g. "Avícola", "Porcino", "Bovino"
}

export interface Product {
  id: string;
  clientId: string; 
  code: number;
  name: string;
  category?: string; // e.g. "Crianzas", "Postura", etc.
  constraints: ProductConstraint[];
  relationships: Relationship[];
  ingredientConstraints: IngredientConstraint[];
}

export interface NutritionalBase {
  id: string;
  name: string;
  description: string;
  constraints: ProductConstraint[];
  relationships: Relationship[];
  ingredientConstraints?: IngredientConstraint[];
}

export interface FormulationResult {
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNBOUNDED' | 'UNKNOWN';
  totalCost: number;
  previousCost?: number; // For trend comparison
  items: {
    ingredientId: string;
    weight: number; 
    percentage: number; 
    cost: number;
    shadowPrice?: number; // Cost of opportunity
  }[];
  rejectedItems?: {
    ingredientId: string;
    effectivePrice: number;
    opportunityPrice: number;
    viabilityGap: number; // The difference
  }[];
  nutrientAnalysis: {
    nutrientId: string;
    value: number;
    min: number;
    max: number;
    met: boolean;
    shadowPrice?: number; // Marginal constraint cost
  }[];
  relationshipAnalysis: {
    relationId: string;
    name: string;
    value: number;
    min: number;
    max: number;
    met: boolean;
  }[];
}

export interface SavedFormula {
  id: string;
  clientId: string;
  productId?: string;
  name: string;
  date: number;
  result: FormulationResult;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export type ViewState = 
  | 'LOGIN'
  | 'DASHBOARD'
  | 'INGREDIENTS'
  | 'NUTRIENTS'
  | 'BASES'
  | 'PRODUCTS'
  | 'OPTIMIZATION'
  | 'GROUP_OPTIMIZATION'
  | 'SIMULATION'
  | 'ASSISTANT'
  | 'CLIENTS'
  | 'SETTINGS';

export interface ActiveTask {
  id: string;
  name: string;
  view: ViewState;
  data?: any;
}

export interface GroupProductAssignment {
  productId: string;
  batchSize: number;
}

export interface GroupFormulationRequest {
  id: string;
  name: string;
  assignments: GroupProductAssignment[];
}

export interface GroupFormulationResult {
  requestId: string;
  results: {
    productId: string;
    result: FormulationResult;
  }[];
  totalCost: number;
  ingredientsUsage: Record<string, number>; // Total used per ingredient across all products
}

export interface IngredientDelta {
  price?: number;
  stock?: number;
  isBlocked?: boolean;
}

export interface ClientWorkspace {
  clientId: string;
  ingredientOverrides: Record<string, IngredientDelta>;
  productConstraintsOverrides: Record<string, ProductConstraint[]>;
}

export interface GlobalState {
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  products: Product[];
  clients: Client[];
  workspaces: Record<string, ClientWorkspace>;
  activeClientId?: string;
}