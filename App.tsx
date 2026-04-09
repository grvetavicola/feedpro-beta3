import React, { useState, useEffect } from 'react';
import { ViewState, Product, Ingredient, Nutrient, Client, SavedFormula, User } from './types';
import { Dashboard } from './components/Dashboard';
import { IngredientsScreen } from './components/IngredientsScreen';
import { NutrientsScreen } from './components/NutrientsScreen';
import { ProductsScreen } from './components/ProductsScreen';
import { FormulationScreen } from './components/FormulationScreen';
import { FormulationWorkspace } from './components/FormulationWorkspace';
import { ClientsScreen } from './components/ClientsScreen';
import { SimulationScreen } from './components/SimulationScreen';
import { LoginScreen } from './components/LoginScreen';
import { AIAssistant } from './components/AIAssistant';
import { GroupOptimizationScreen } from './components/GroupOptimizationScreen';
import { GroupResultsScreen } from './components/GroupResultsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Header } from './components/Header';
import { ProductsSidebar } from './components/ProductsSidebar';
import { ActiveTask, ClientWorkspace, IngredientDelta } from './types';
import { 
    INITIAL_INGREDIENTS,
    INITIAL_NUTRIENTS, 
    INITIAL_PRODUCTS, 
    INITIAL_CLIENTS 
} from './constants';

const STORAGE_KEY = 'feedpro_pro_integrated_data';

export default function App() {
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [user, setUser] = useState<User | null>(null);

  // Core Data State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [nutrients, setNutrients] = useState<Nutrient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [isDynamicMatrix, setIsDynamicMatrix] = useState<boolean>(false);
  
  // Client Wallets / Workspaces
  const [workspaces, setWorkspaces] = useState<Record<string, ClientWorkspace>>({});

  // Multi-Tasking State
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Initialize Data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setIngredients(parsed.ingredients || INITIAL_INGREDIENTS);
        setNutrients(parsed.nutrients || INITIAL_NUTRIENTS);
        setProducts(parsed.products || INITIAL_PRODUCTS);
        setClients(parsed.clients || INITIAL_CLIENTS);
        setSavedFormulas(parsed.savedFormulas || []);
        setSelectedClientId(parsed.selectedClientId || INITIAL_CLIENTS[0].id);
        setUser(parsed.user);
        setIsDynamicMatrix(parsed.isDynamicMatrix || false);
        setWorkspaces(parsed.workspaces || {});
      } catch (e) { 
          console.error("Error loading state", e); 
          setIngredients(INITIAL_INGREDIENTS);
          setNutrients(INITIAL_NUTRIENTS);
          setProducts(INITIAL_PRODUCTS);
          setClients(INITIAL_CLIENTS);
          setSelectedClientId(INITIAL_CLIENTS[0].id);
      }
    } else {
        setIngredients(INITIAL_INGREDIENTS);
        setNutrients(INITIAL_NUTRIENTS);
        setProducts(INITIAL_PRODUCTS);
        setClients(INITIAL_CLIENTS);
        setSelectedClientId(INITIAL_CLIENTS[0].id);
        // User must login, so we don't set user
    }
  }, []);

  useEffect(() => {
    if (user?.assignedClientId && user.assignedClientId !== 'ALL') {
        setSelectedClientId(user.assignedClientId);
    }
  }, [user]);

  // Persistence
  useEffect(() => {
    if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            ingredients, nutrients, products, clients, savedFormulas, 
            selectedClientId, user, isDynamicMatrix, workspaces 
        }));
    }
  }, [ingredients, nutrients, products, clients, savedFormulas, selectedClientId, user, isDynamicMatrix]);

  if (!user) return <LoginScreen onLogin={setUser} />;

  const renderView = () => {
    switch (view) {
      case 'DASHBOARD': return <Dashboard products={products} ingredients={ingredients} savedFormulas={savedFormulas} clients={clients} onNavigate={setView} isDynamicMatrix={isDynamicMatrix} setIsDynamicMatrix={setIsDynamicMatrix} />;
      case 'INGREDIENTS': return <IngredientsScreen ingredients={ingredients} setIngredients={setIngredients} nutrients={nutrients} setNutrients={setNutrients} />;
      case 'NUTRIENTS': return <NutrientsScreen nutrients={nutrients} setNutrients={setNutrients} />;
      case 'PRODUCTS': return <ProductsScreen products={products} setProducts={setProducts} ingredients={ingredients} nutrients={nutrients} onOpenInNewWindow={(data, name) => handleOpenTask('OPTIMIZATION', name, data)} />;
      case 'OPTIMIZATION': return <FormulationScreen products={products} setProducts={setProducts} ingredients={ingredients} nutrients={nutrients} clients={clients} selectedClientId={selectedClientId} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} isDynamicMatrix={isDynamicMatrix} onOpenInNewWindow={(data, name) => handleOpenTask('OPTIMIZATION', name, data)} />;
      case 'GROUP_OPTIMIZATION': return <GroupOptimizationScreen products={products} ingredients={ingredients} nutrients={nutrients} isDynamicMatrix={isDynamicMatrix} onOpenInNewWindow={(data, name) => handleOpenTask('GROUP_OPTIMIZATION', name, data)} />;
      case 'SIMULATION': return <SimulationScreen ingredients={ingredients} setIngredients={setIngredients} nutrients={nutrients} />;
      case 'CLIENTS': 
        if (user.assignedClientId && user.assignedClientId !== 'ALL') {
            return <div className="p-8 text-center text-gray-400 mt-20 max-w-lg mx-auto bg-gray-900/50 rounded-xl border border-gray-700 border-l-4 border-l-red-500 shadow-2xl">
                <h3 className="text-xl font-bold text-red-500 mb-2">Acceso Restringido</h3>
                <p>Está operando bajo una cuenta de Cliente Específico vinculada a <span className="font-bold text-cyan-400">{user.email}</span>.</p>
                <p className="text-xs mt-4">Solo los administradores o las cuentas maestras pueden agregar y cambiar carteras de clientes.</p>
            </div>;
        }
        return <ClientsScreen clients={clients} setClients={setClients} selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} />;
      case 'ASSISTANT': return <AIAssistant user={user} ingredients={ingredients} nutrients={nutrients} products={products} />;
      case 'SETTINGS': return <SettingsScreen />;
    }
  };

  // Delta Logic Fusion
  const getEffectiveIngredients = (): Ingredient[] => {
    if (!selectedClientId || !workspaces[selectedClientId]) return ingredients;
    const workspace = workspaces[selectedClientId];
    return ingredients.map(ing => {
        const delta = workspace.ingredientOverrides[ing.id];
        if (!delta) return ing;
        return {
            ...ing,
            price: delta.price ?? ing.price,
            stock: delta.stock ?? ing.stock,
            isBlocked: delta.isBlocked ?? false
        };
    }).filter(ing => !(ing as any).isBlocked);
  };

  const effectiveIngredients = getEffectiveIngredients();

  const handleOpenTask = (view: ViewState, name: string, data?: any) => {
    const id = `task_${Date.now()}`;
    const newTask: ActiveTask = { id, name, view, data };
    setActiveTasks([...activeTasks, newTask]);
    setActiveTaskId(id);
  };

  const currentActiveTask = activeTasks.find(t => t.id === activeTaskId);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden font-sans">
      <ProductsSidebar 
        clients={clients}
        products={products}
        selectedClientId={selectedClientId}
        activeView={view}
        onSelectClient={setSelectedClientId}
        onSelectProduct={(p) => setView('OPTIMIZATION')}
        onNavigate={setView}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          activeView={view} 
          onViewChange={setView} 
          user={user} 
          activeTasks={activeTasks}
          activeTaskId={activeTaskId}
          onSelectTask={setActiveTaskId}
          onCloseTask={(id) => {
              setActiveTasks(prev => prev.filter(t => t.id !== id));
              if (activeTaskId === id) setActiveTaskId(null);
          }}
          onLogout={() => setUser(null)}
        />
        <main className="flex-1 relative flex flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_50%)] overflow-hidden">
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {/* View Content */}
                <div className="flex-1 overflow-y-auto w-full">
                    {currentActiveTask ? (
                        (() => {
                            switch (currentActiveTask.view) {
                                case 'OPTIMIZATION': 
                                    return <FormulationScreen products={products} setProducts={setProducts} ingredients={effectiveIngredients} nutrients={nutrients} clients={clients} selectedClientId={selectedClientId} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} isDynamicMatrix={isDynamicMatrix} forceResult={currentActiveTask.data} />;
                                case 'GROUP_OPTIMIZATION':
                                    return <GroupResultsScreen results={currentActiveTask.data.result} assignments={currentActiveTask.data.assignments} products={products} />;
                                case 'SIMULATION':
                                    return <SimulationScreen ingredients={effectiveIngredients} setIngredients={setIngredients} nutrients={nutrients} />;
                                default: return <div className="p-8 text-center text-gray-500">Vista de tarea no soportada.</div>;
                            }
                        })()
                    ) : (
                        (() => {
                            switch (view) {
                                case 'DASHBOARD': return <Dashboard products={products} ingredients={effectiveIngredients} savedFormulas={savedFormulas} clients={clients} onNavigate={setView} isDynamicMatrix={isDynamicMatrix} setIsDynamicMatrix={setIsDynamicMatrix} />;
                                case 'INGREDIENTS': return <IngredientsScreen ingredients={ingredients} setIngredients={setIngredients} nutrients={nutrients} setNutrients={setNutrients} />;
                                case 'NUTRIENTS': return <NutrientsScreen nutrients={nutrients} setNutrients={setNutrients} />;
                                case 'PRODUCTS': return <ProductsScreen products={products} setProducts={setProducts} ingredients={effectiveIngredients} nutrients={nutrients} onOpenInNewWindow={(data, name) => handleOpenTask('OPTIMIZATION', name, data)} />;
                                case 'OPTIMIZATION': return <FormulationScreen products={products} setProducts={setProducts} ingredients={effectiveIngredients} nutrients={nutrients} clients={clients} selectedClientId={selectedClientId} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} isDynamicMatrix={isDynamicMatrix} onOpenInNewWindow={(data, name) => handleOpenTask('OPTIMIZATION', name, data)} />;
                                case 'GROUP_OPTIMIZATION': return <GroupOptimizationScreen products={products} ingredients={effectiveIngredients} nutrients={nutrients} isDynamicMatrix={isDynamicMatrix} onOpenInNewWindow={(data, name) => handleOpenTask('GROUP_OPTIMIZATION', name, data)} />;
                                case 'SIMULATION': return <SimulationScreen ingredients={effectiveIngredients} setIngredients={setIngredients} nutrients={nutrients} />;
                                case 'CLIENTS': return <ClientsScreen clients={clients} setClients={setClients} selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} />;
                                case 'ASSISTANT': return <AIAssistant user={user} ingredients={effectiveIngredients} nutrients={nutrients} products={products} />;
                                case 'SETTINGS': return <SettingsScreen />;
                                default: return <Dashboard products={products} ingredients={effectiveIngredients} savedFormulas={savedFormulas} clients={clients} onNavigate={setView} isDynamicMatrix={isDynamicMatrix} setIsDynamicMatrix={setIsDynamicMatrix} />;
                            }
                        })()
                    )}
                </div>
                
                {/* TaskBar */}
                {activeTasks.length > 0 && !activeTaskId && (
                    <div className="bg-gray-900/60 backdrop-blur-md border-t border-gray-800 h-10 flex items-center px-4 overflow-x-auto gap-3 shrink-0">
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mr-2 shrink-0">Tareas:</p>
                       {activeTasks.map(task => (
                           <button key={task.id} onClick={() => setActiveTaskId(task.id)} className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-[10px] text-gray-300 font-bold border border-gray-700">{task.name}</button>
                       ))}
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
}
