import React, { useState, useEffect } from 'react';
import { ViewState, Product, Ingredient, Nutrient, Client, SavedFormula, User } from './types';
import { Dashboard } from './components/Dashboard';
import { IngredientsScreen } from './components/IngredientsScreen';
import { NutrientsScreen } from './components/NutrientsScreen';
import { ProductsScreen } from './components/ProductsScreen';
import { FormulationScreen } from './components/FormulationScreen';
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
    INITIAL_CLIENTS,
    APP_NAME
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
  
  // UI Customization
  const [uiScale, setUiScale] = useState<number>(() => {
    const saved = localStorage.getItem('feedpro_ui_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const updateUiScale = (newScale: number) => {
    setUiScale(newScale);
    localStorage.setItem('feedpro_ui_scale', newScale.toString());
  };
  
  // Unified Optimization State
  const [selectedDietIds, setSelectedDietIds] = useState<string[]>([]);
  
  // UI Interaction States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDirtyModal, setShowDirtyModal] = useState(false);
  const [pendingClientId, setPendingClientId] = useState<string | null>(null);
  const [isLoadingFactory, setIsLoadingFactory] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    const handleGlobalLogout = () => setUser(null);
    window.addEventListener('feedpro:logout', handleGlobalLogout);
    return () => window.removeEventListener('feedpro:logout', handleGlobalLogout);
  }, []);

  // Persistence
  useEffect(() => {
    if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
            ingredients, nutrients, products, clients, savedFormulas, 
            selectedClientId, user, isDynamicMatrix, workspaces 
        }));
    }
  }, [ingredients, nutrients, products, clients, savedFormulas, selectedClientId, user, isDynamicMatrix, workspaces]);

  if (!user) return <LoginScreen onLogin={setUser} />;

  // Proteger por expiracion de prueba (BETA)
  const isTrialExpired = user.trialEndsAt && Date.now() > user.trialEndsAt;
  if (isTrialExpired) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-950 text-white p-8">
              <div className="max-w-md w-full bg-gray-900 border border-red-500/30 p-8 rounded-2xl shadow-2xl text-center space-y-6">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  </div>
                  <h1 className="text-2xl font-bold text-red-400 uppercase tracking-widest">Suscripción Expirada</h1>
                  <p className="text-gray-400 text-sm italic">Tu periodo de prueba beta de 3 meses ha finalizado para la cuenta {user.name}.</p>
                  <p className="text-gray-500 text-xs">Por favor, contacte el soporte técnico de {APP_NAME} para renovar su licencia comercial o pasar a un plan Pro.</p>
                  <button onClick={() => setUser(null)} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-bold transition-all border border-gray-700">VOLVER AL INICIO</button>
              </div>
          </div>
      );
  }

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

  const handleSwitchClientRequest = (id: string) => {
    if (id === selectedClientId) return;
    if (isDirty) {
        setPendingClientId(id);
        setShowDirtyModal(true);
    } else {
        performClientSwitch(id);
    }
  };

  const performClientSwitch = (id: string) => {
    setIsLoadingFactory(true);
    setShowProfileModal(false);
    setShowDirtyModal(false);
    setIsDirty(false);
    
    // Simulate data fetch for the new factory
    setTimeout(() => {
        setSelectedClientId(id);
        setIsLoadingFactory(false);
    }, 800);
  };

  const handleToggleDietSelection = (ids: string[], isSelected: boolean) => {
      setSelectedDietIds(prev => {
          const set = new Set(prev);
          if (isSelected) {
              ids.forEach(id => set.add(id));
          } else {
              ids.forEach(id => set.delete(id));
          }
          return Array.from(set);
      });
  };

  const currentActiveTask = activeTasks.find(t => t.id === activeTaskId);

  // Cross-Client Replicator Logic
  const replicateClientData = (fromId: string, toId: string, options: { matrix?: boolean, products?: boolean }) => {
      if (fromId === toId) return;
      
      // logic here to clone products or workspaces overrides
      if (options.products) {
          const fromProducts = products.filter(p => p.clientId === fromId);
          const clonedProducts = fromProducts.map(p => ({ ...p, id: `p_${Date.now()}_${Math.random()}`, clientId: toId }));
          setProducts(prev => [...prev, ...clonedProducts]);
      }
      
      if (options.matrix && workspaces[fromId]) {
          setWorkspaces(prev => ({
              ...prev,
              [toId]: { 
                  ...prev[fromId], 
                  clientId: toId 
              }
          }));
      }
      alert("✓ Datos replicados exitosamente entre clientes.");
  };

  return (
    <div 
        className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden font-sans"
        style={{ zoom: uiScale }}
    >
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
        onManageProfile={() => setShowProfileModal(true)}
        client={clients.find(c => c.id === selectedClientId)}
        onToggleMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {isMobileMenuOpen && (
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
                onClick={() => setIsMobileMenuOpen(false)}
            />
        )}
        
        <div className={`fixed md:relative inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 md:flex flex-col h-full`}>
            <ProductsSidebar 
              clients={clients}
              products={products}
          selectedClientId={selectedClientId}
          activeView={view}
          onSelectClient={handleSwitchClientRequest}
          onManageProfile={() => setShowProfileModal(true)}
          onUpdateClientLogo={(id, newLogo) => {
              setClients(prev => prev.map(c => c.id === id ? { ...c, logo: newLogo } : c));
          }}
          onSelectProduct={(p) => {
              setView('OPTIMIZATION');
              setIsMobileMenuOpen(false);
          }}
          selectedDietIds={selectedDietIds}
          onToggleDietSelection={handleToggleDietSelection}
          onNavigate={(n) => {
              setView(n);
              setIsMobileMenuOpen(false);
          }}
          onDeleteProduct={(id) => {
              setProducts(prev => prev.filter(p => p.id !== id));
              setSelectedDietIds(prev => prev.filter(dietId => dietId !== id));
          }}
          onDeleteCategory={(cat) => {
              const toRemove = new Set(products.filter(p => (p.category || 'Categoría General') === cat).map(p => p.id));
              setProducts(prev => prev.filter(p => !toRemove.has(p.id)));
              setSelectedDietIds(prev => prev.filter(id => !toRemove.has(id)));
          }}
          onEditProduct={(id) => {
              setView('PRODUCTS');
          }}
          onEditCategory={(cat) => {
              setView('PRODUCTS');
          }}
          onLogout={() => {
              setUser(undefined);
              localStorage.removeItem(STORAGE_KEY);
              setView('LOGIN');
              setIsMobileMenuOpen(false);
          }}
        />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-[4] lg:flex-[5] flex border-l border-gray-800 relative z-0 flex-col w-full h-full min-w-0">
        <main className="flex-1 relative flex flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.05),transparent_50%)] overflow-hidden p-6 w-full">
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {/* View Content */}
                <div className="flex-1 overflow-y-auto w-full">
                    {currentActiveTask ? (
                        (() => {
                            switch (currentActiveTask.view) {
                                case 'OPTIMIZATION': 
                                    return <FormulationScreen products={products} setProducts={setProducts} ingredients={effectiveIngredients} setIngredients={setIngredients} nutrients={nutrients} clients={clients} selectedClientId={selectedClientId} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} isDynamicMatrix={isDynamicMatrix} forceResult={currentActiveTask.data} />;
                                case 'GROUP_OPTIMIZATION':
                                    return <GroupResultsScreen results={currentActiveTask.data.result} assignments={currentActiveTask.data.assignments} products={products} ingredients={effectiveIngredients} nutrients={nutrients} isDynamicMatrix={isDynamicMatrix} onUpdateProduct={(updatedProduct) => setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))} />;
                                case 'SIMULATION':
                                    return <SimulationScreen ingredients={effectiveIngredients} setIngredients={setIngredients} nutrients={nutrients} />;
                                default: return <div className="p-8 text-center text-gray-500">Vista de tarea no soportada.</div>;
                            }
                        })()
                    ) : (
                        (() => {
                            switch (view) {
                                case 'DASHBOARD': return <Dashboard products={products} ingredients={effectiveIngredients} savedFormulas={savedFormulas} clients={clients} onNavigate={setView} isDynamicMatrix={isDynamicMatrix} setIsDynamicMatrix={setIsDynamicMatrix} user={user} />;
                                case 'INGREDIENTS': return <IngredientsScreen ingredients={ingredients} setIngredients={setIngredients} nutrients={nutrients} setNutrients={setNutrients} setIsDirty={setIsDirty} />;
                                case 'NUTRIENTS': return <NutrientsScreen nutrients={nutrients} setNutrients={setNutrients} />;
                                case 'PRODUCTS': return <ProductsScreen products={products} setProducts={setProducts} ingredients={effectiveIngredients} nutrients={nutrients} onOpenInNewWindow={(data, name) => handleOpenTask('OPTIMIZATION', name, data)} setIsDirty={setIsDirty} />;
                                case 'OPTIMIZATION': return <GroupOptimizationScreen products={products} ingredients={effectiveIngredients} nutrients={nutrients} isDynamicMatrix={isDynamicMatrix} selectedDietIds={selectedDietIds} onOpenInNewWindow={(data, name) => handleOpenTask('GROUP_OPTIMIZATION', name, data)} onUpdateProduct={(updatedProduct) => setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))} setIsDirty={setIsDirty} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} />;
                                case 'GROUP_OPTIMIZATION': return <GroupOptimizationScreen products={products} ingredients={effectiveIngredients} nutrients={nutrients} isDynamicMatrix={isDynamicMatrix} selectedDietIds={selectedDietIds} onOpenInNewWindow={(data, name) => handleOpenTask('GROUP_OPTIMIZATION', name, data)} onUpdateProduct={(updatedProduct) => setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))} setIsDirty={setIsDirty} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} />;
                                case 'SIMULATION': return <SimulationScreen ingredients={effectiveIngredients} setIngredients={setIngredients} nutrients={nutrients} />;
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
                                case 'SETTINGS': return <SettingsScreen 
                                    clients={clients} 
                                    setClients={setClients} 
                                    onNavigate={setView} 
                                    uiScale={uiScale} 
                                    setUiScale={updateUiScale} 
                                    ingredients={ingredients}
                                    setIngredients={setIngredients}
                                    nutrients={nutrients}
                                    setNutrients={setNutrients}
                                    products={products}
                                    setProducts={setProducts}
                                />;
                                default: return <Dashboard products={products} ingredients={effectiveIngredients} savedFormulas={savedFormulas} clients={clients} onNavigate={setView} isDynamicMatrix={isDynamicMatrix} setIsDynamicMatrix={setIsDynamicMatrix} user={user} />;
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

      {/* --- GESTIÓN DE PERFILES MODAL --- */}
      {showProfileModal && (() => {
        const activeProfile = clients.find(c => c.id === selectedClientId);
        const [editName, setEditName] = React.useState(activeProfile?.name || '');
        const [editDesc, setEditDesc] = React.useState(activeProfile?.description || '');
        const [editSpecies, setEditSpecies] = React.useState(activeProfile?.species || '');
        const [editLogo, setEditLogo] = React.useState(activeProfile?.logo || '');
        const [newProfileName, setNewProfileName] = React.useState('');
        const [replicTarget, setReplicTarget] = React.useState('');
        const [activeTab, setActiveTab] = React.useState<'edit' | 'profiles' | 'exchange'>('edit');

        const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => setEditLogo(ev.target?.result as string);
          reader.readAsDataURL(file);
        };

        const handleSaveProfile = () => {
          setClients(prev => prev.map(c => c.id === selectedClientId ? {
            ...c, name: editName, description: editDesc, species: editSpecies, logo: editLogo
          } : c));
        };

        const handleCreateProfile = () => {
          if (!newProfileName.trim()) return;
          const newId = `profile_${Date.now()}`;
          setClients(prev => [...prev, { id: newId, name: newProfileName.trim(), description: '', species: '', logo: '' }]);
          setNewProfileName('');
          handleSwitchClientRequest(newId);
        };

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-md animate-fade-in">
            <div className="bg-gray-900 border border-gray-700/60 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

              {/* Header del Modal */}
              <div className="p-5 bg-gradient-to-r from-cyan-900/30 to-indigo-900/30 border-b border-gray-800 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
                  {editLogo ? <img src={editLogo} className="w-full h-full object-contain p-1" /> : <span className="text-white font-black text-sm italic">FP</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none truncate">{editName || user.name}</h3>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest mt-0.5">Gestión de Perfiles</p>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-800 shrink-0">
                {([['edit', 'Editar Perfil'], ['profiles', 'Mis Perfiles'], ['exchange', 'Intercambio']] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                  >{label}</button>
                ))}
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

                {/* TAB: Editar Perfil Activo */}
                {activeTab === 'edit' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Perfil Activo: {activeProfile?.name}</h4>

                    {/* Logo Upload */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                        {editLogo ? <img src={editLogo} className="w-full h-full object-contain p-1" /> : <span className="text-[9px] text-gray-600 font-black uppercase text-center leading-tight">Sin<br/>Logo</span>}
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Logo del Perfil</label>
                        <label className="cursor-pointer bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl py-2 px-4 text-[11px] font-black text-gray-300 uppercase tracking-widest text-center transition-all">
                          Subir Imagen
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {editLogo && <button onClick={() => setEditLogo('')} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase">Quitar logo</button>}
                      </div>
                    </div>

                    {/* Campos */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Nombre del Perfil</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-cyan-500 transition-colors" placeholder="Ej: Granja El Sol" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Tipo de Producción</label>
                        <select value={editSpecies} onChange={e => setEditSpecies(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-cyan-500 transition-colors">
                          <option value="">Seleccionar...</option>
                          <option value="Avícola">Avícola</option>
                          <option value="Porcino">Porcino</option>
                          <option value="Bovino">Bovino</option>
                          <option value="Acuícola">Acuícola</option>
                          <option value="Mixto">Mixto</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Descripción / Notas</label>
                        <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-cyan-500 transition-colors resize-none" placeholder="Descripción opcional..." />
                      </div>
                    </div>

                    <button onClick={handleSaveProfile} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-900/20">
                      Guardar Cambios
                    </button>
                  </div>
                )}

                {/* TAB: Mis Perfiles */}
                {activeTab === 'profiles' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Perfiles de tu Cuenta</h4>
                    <div className="space-y-2">
                      {clients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleSwitchClientRequest(c.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedClientId === c.id ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg' : 'bg-gray-800/50 border-gray-700 hover:border-gray-500'}`}
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                            {c.logo ? <img src={c.logo} className="w-full h-full object-contain p-1" /> : <span className="text-gray-600 text-xs font-black">{c.name.charAt(0)}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black truncate ${selectedClientId === c.id ? 'text-cyan-300' : 'text-white'}`}>{c.name}</p>
                            {c.species && <p className="text-[10px] text-gray-500 font-bold uppercase">{c.species}</p>}
                          </div>
                          {selectedClientId === c.id && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {/* Crear nuevo perfil */}
                    <div className="border-t border-gray-800 pt-4 space-y-2">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">+ Nuevo Perfil</h4>
                      <input value={newProfileName} onChange={e => setNewProfileName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors" placeholder="Nombre del nuevo perfil..." />
                      <button onClick={handleCreateProfile} disabled={!newProfileName.trim()} className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-2 rounded-xl text-xs uppercase tracking-widest transition-all">
                        Crear Perfil
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB: Intercambio de Datos */}
                {activeTab === 'exchange' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Intercambio Entre Perfiles</h4>
                    <p className="text-[11px] text-gray-500">Copia dietas o matrices desde el perfil activo ({activeProfile?.name}) hacia otro perfil destino.</p>
                    <div>
                      <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Perfil Destino</label>
                      <select value={replicTarget} onChange={e => setReplicTarget(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-cyan-500">
                        <option value="">Seleccione destino...</option>
                        {clients.filter(c => c.id !== selectedClientId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { if (replicTarget && selectedClientId) replicateClientData(selectedClientId, replicTarget, { products: true }); }} disabled={!replicTarget} className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 p-2.5 rounded-xl text-[10px] font-black uppercase text-gray-300 transition-all">Copiar Dietas</button>
                      <button onClick={() => { if (replicTarget && selectedClientId) replicateClientData(selectedClientId, replicTarget, { matrix: true }); }} disabled={!replicTarget} className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 p-2.5 rounded-xl text-[10px] font-black uppercase text-gray-300 transition-all">Copiar Matriz Delta</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-950/30 border-t border-gray-800 flex justify-between items-center gap-4 shrink-0">
                <button onClick={() => setUser(null)} className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors px-4 py-2 hover:bg-red-500/10 rounded-lg">
                  Cerrar Sesión
                </button>
                <button onClick={() => setShowProfileModal(false)} className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-6 py-2 rounded-xl text-xs transition-all uppercase">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- DIRTY GUARD MODAL --- */}
      {showDirtyModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-gray-900 border border-red-500/30 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-tight">Cambios sin guardar</h3>
                      <p className="text-sm text-gray-400 mt-2">Estás a punto de cambiar de fábrica. Tienes cambios sin guardar en <span className="text-white font-bold">{clients.find(c => c.id === selectedClientId)?.name}</span>. Solicita Guardar todos los cambios y luego Aceptar para cambiar.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                       <button 
                         onClick={() => {
                             // Logic to save before switching (here we just switch for now as a mock)
                             performClientSwitch(pendingClientId!);
                         }}
                         className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold transition-all"
                       >
                           GUARDAR Y CAMBIAR
                       </button>
                       <button 
                         onClick={() => performClientSwitch(pendingClientId!)}
                         className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl font-bold border border-gray-700 transition-all"
                       >
                           DESCARTAR Y CAMBIAR
                       </button>
                       <button 
                         onClick={() => { setShowDirtyModal(false); setPendingClientId(null); }}
                         className="w-full text-gray-500 hover:text-white py-2 text-xs font-bold uppercase tracking-widest"
                       >
                           CANCELAR
                       </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- LOADING OVERLAY --- */}
      {isLoadingFactory && (
          <div className="fixed inset-0 z-[300] bg-gray-950/90 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="text-center">
                  <p className="text-cyan-400 font-black uppercase tracking-[0.3em] text-sm italic animate-pulse">Sincronizando Entorno</p>
                  <p className="text-gray-500 text-xs mt-1">Cargando datos de fábrica y matrices exclusivas...</p>
              </div>
          </div>
      )}
    </div>
  );
}
