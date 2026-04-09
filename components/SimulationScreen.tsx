import React, { useState, useMemo } from 'react';
import { Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { TruckIcon, PlusIcon, TrashIcon, SaveIcon, CalculatorIcon, XCircleIcon } from './icons';

interface SimulationScreenProps {
    ingredients: Ingredient[];
    setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
    nutrients: Nutrient[];
}

interface SimulatedIngredient {
    ingredientId: string;
    weight: number; // kg
    isVehicle: boolean;
}

export const SimulationScreen: React.FC<SimulationScreenProps> = ({ ingredients, setIngredients, nutrients }) => {
    const { t } = useTranslations();
    
    const [batchSize, setBatchSize] = useState<number>(1000);
    const [simulatedIngredients, setSimulatedIngredients] = useState<SimulatedIngredient[]>([]);
    const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
    const [simulationName, setSimulationName] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    // Helpers
    const getNextCode = () => {
        if (ingredients.length === 0) return 100;
        const maxCode = Math.max(...ingredients.map(i => Number(i.code) || 0));
        return maxCode + 1;
    }

    const availableIngredients = useMemo(() => {
        const usedIds = new Set(simulatedIngredients.map(i => i.ingredientId));
        return ingredients.filter(i => !usedIds.has(i.id)).sort((a,b) => (Number(a.code) || 0) - (Number(b.code) || 0));
    }, [ingredients, simulatedIngredients]);

    const vehicleIngredient = useMemo(() => {
        return simulatedIngredients.find(i => i.isVehicle);
    }, [simulatedIngredients]);

    // Calculations
    const currentTotalWeight = useMemo(() => {
        return simulatedIngredients.reduce((sum, item) => item.isVehicle ? sum : sum + item.weight, 0);
    }, [simulatedIngredients]);

    const vehicleWeight = Math.max(0, batchSize - currentTotalWeight);

    // Update vehicle weight in state effect
    React.useEffect(() => {
        if (vehicleIngredient) {
            setSimulatedIngredients(prev => prev.map(item => 
                item.isVehicle ? { ...item, weight: vehicleWeight } : item
            ));
        }
    }, [currentTotalWeight, batchSize, vehicleIngredient?.ingredientId]);

    const composition = useMemo(() => {
        const comp: { [key: string]: number } = {};
        
        simulatedIngredients.forEach(simIng => {
            const ing = ingredients.find(i => i.id === simIng.ingredientId);
            if (!ing) return;
            
            // Use the calculated vehicle weight or the set weight
            const weight = simIng.isVehicle ? vehicleWeight : simIng.weight;
            
            Object.entries(ing.nutrients).forEach(([nutId, v]) => {
                const val = v as number;
                comp[nutId] = (comp[nutId] || 0) + (val * weight);
            });
        });

        // Normalize by batch size
        Object.keys(comp).forEach(key => {
            comp[key] = comp[key] / batchSize;
        });

        return comp;
    }, [simulatedIngredients, ingredients, vehicleWeight, batchSize]);

    const estimatedCost = useMemo(() => {
        let cost = 0;
        simulatedIngredients.forEach(simIng => {
            const ing = ingredients.find(i => i.id === simIng.ingredientId);
            const weight = simIng.isVehicle ? vehicleWeight : simIng.weight;
            if(ing) cost += (ing.price || 0) * weight;
        });
        return cost;
    }, [simulatedIngredients, ingredients, vehicleWeight]);


    // Handlers
    const handleAddIngredient = () => {
        if (!selectedIngredientId) return;
        
        const isFirst = simulatedIngredients.length === 0;
        const newSimIng: SimulatedIngredient = {
            ingredientId: selectedIngredientId,
            weight: 0,
            isVehicle: isFirst
        };

        setSimulatedIngredients([...simulatedIngredients, newSimIng]);
        setSelectedIngredientId('');
    };

    const handleRemoveIngredient = (id: string) => {
        const removed = simulatedIngredients.find(i => i.ingredientId === id);
        let newList = simulatedIngredients.filter(i => i.ingredientId !== id);
        
        // If we removed the vehicle, assign new vehicle to the first item
        if (removed?.isVehicle && newList.length > 0) {
            newList[0].isVehicle = true;
        }

        setSimulatedIngredients(newList);
    };

    const handleWeightChange = (id: string, val: string) => {
        const weight = parseFloat(val) || 0;
        setSimulatedIngredients(prev => prev.map(i => i.ingredientId === id ? { ...i, weight } : i));
    };

    const handleSetVehicle = (id: string) => {
        setSimulatedIngredients(prev => prev.map(i => ({ ...i, isVehicle: i.ingredientId === id })));
    };

    const handleSaveAsIngredient = () => {
        if (!simulationName.trim()) {
            alert("Por favor ingrese un nombre para la premezcla.");
            return;
        }

        const newIngredient: Ingredient = {
            id: `i_sim_${Date.now()}`,
            code: getNextCode(),
            name: simulationName,
            category: 'Micro', // Usually premixes are Micro or specialized Macro
            price: estimatedCost / batchSize,
            stock: 999999,
            nutrients: composition
        } as Ingredient;

        setIngredients(prev => [...prev, newIngredient]);
        setIsSaveModalOpen(false);
        setSimulationName('');
        alert("Premezcla guardada exitosamente en Catastro de Ingredientes.");
    };

    const sortedNutrients = useMemo(() => [...nutrients].sort((a,b) => (Number(a.code) || 0) - (Number(b.code) || 0)), [nutrients]);

    return (
        <div className="p-3 space-y-3 h-full flex flex-col">
            <div className="flex justify-between items-center bg-gray-800/40 p-2 rounded border border-gray-700/50">
                <div className="flex items-center gap-2">
                    <div className="bg-gray-800 p-1.5 rounded border border-gray-700">
                        <TruckIcon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-white leading-none">{t('nav.simulation')}</h2>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-none">Mezcla manual con vehículo automático.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsSaveModalOpen(true)} 
                    disabled={simulatedIngredients.length === 0}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-lg shadow-green-900/20"
                >
                    <SaveIcon className="w-4 h-4"/> Guardar como Ingrediente
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
                {/* Left Panel: Configuration & Ingredients */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                    
                    {/* Config Bar */}
                    <div className="bg-gray-800 p-3 rounded border border-gray-700 flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Batch Total (kg)</label>
                            <input 
                                type="number" 
                                value={batchSize}
                                onChange={e => setBatchSize(parseFloat(e.target.value) || 0)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono text-right focus:border-cyan-500 outline-none"
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="text-xs text-gray-400 font-bold uppercase mb-1 block">Agregar Ingrediente</label>
                            <div className="flex gap-2">
                                <select 
                                    value={selectedIngredientId}
                                    onChange={e => setSelectedIngredientId(e.target.value)}
                                    className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-300 focus:border-cyan-500 outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {availableIngredients.map(i => (
                                        <option key={i.id} value={i.id}>#{i.code} - {i.name}</option>
                                    ))}
                                </select>
                                <button onClick={handleAddIngredient} disabled={!selectedIngredientId} className="bg-cyan-600 hover:bg-cyan-500 p-2 rounded text-white disabled:bg-gray-700">
                                    <PlusIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Ingredients Table */}
                    <div className="bg-gray-800 rounded border border-gray-700 flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-[13px] text-left">
                                <thead className="bg-gray-900 text-[10px] text-gray-400 uppercase sticky top-0 z-10">
                                    <tr>
                                        <th className="px-2 py-1.5 w-16 text-center">Vehículo</th>
                                        <th className="px-2 py-1.5">Ingrediente</th>
                                        <th className="px-2 py-1.5 text-right">Cantidad (kg)</th>
                                        <th className="px-2 py-1.5 text-right w-16">%</th>
                                        <th className="px-2 py-1.5 text-center w-12">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {simulatedIngredients.map(item => {
                                        const ing = ingredients.find(i => i.id === item.ingredientId);
                                        const displayWeight = item.isVehicle ? vehicleWeight : item.weight;
                                        const percent = (displayWeight / batchSize) * 100;
                                        
                                        return (
                                            <tr key={item.ingredientId} className={`h-[32px] hover:bg-gray-700/30 ${item.isVehicle ? 'bg-cyan-900/10' : ''}`}>
                                                <td className="px-2 py-0 text-center">
                                                    <input 
                                                        type="radio" 
                                                        name="vehicleGroup"
                                                        checked={item.isVehicle}
                                                        onChange={() => handleSetVehicle(item.ingredientId)}
                                                        className="accent-cyan-500 cursor-pointer w-3 h-3"
                                                    />
                                                </td>
                                                <td className="px-2 py-0 font-medium text-gray-200">
                                                    {ing?.name}
                                                    {item.isVehicle && <span className="ml-2 text-[9px] bg-cyan-900 text-cyan-400 px-1 py-0.5 rounded leading-none">VEHÍCULO</span>}
                                                </td>
                                                <td className="px-2 py-0 text-right">
                                                    {item.isVehicle ? (
                                                        <span className="font-mono text-[13px] text-cyan-300 font-bold">{displayWeight.toFixed(3)}</span>
                                                    ) : (
                                                        <input 
                                                            type="number" 
                                                            value={item.weight}
                                                            onChange={e => handleWeightChange(item.ingredientId, e.target.value)}
                                                            className="w-24 bg-gray-900 border border-gray-600 rounded p-0.5 text-right font-mono text-[13px] focus:border-cyan-500 outline-none h-[22px]"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-2 py-0 text-right font-mono text-[12px] text-gray-400">
                                                    {percent.toFixed(2)}%
                                                </td>
                                                <td className="px-2 py-0 text-center flex justify-center items-center h-[32px]">
                                                    <button onClick={() => handleRemoveIngredient(item.ingredientId)} className="text-gray-500 hover:text-red-400 p-0.5">
                                                        <TrashIcon className="w-3 h-3"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {simulatedIngredients.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-4 text-[11px] text-gray-500 italic">Añade ingredientes a la formulación.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-900 p-3 border-t border-gray-700 flex justify-between items-center text-sm">
                            <span className="text-gray-400">Total Batch: <span className="text-white font-bold">{batchSize} kg</span></span>
                            <span className="text-gray-400">Costo Estimado: <span className="text-green-400 font-bold">${estimatedCost.toFixed(2)}</span> <span className="text-xs">(${ (estimatedCost/batchSize*100).toFixed(2) }/100kg)</span></span>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Chemical Composition */}
                <div className="lg:col-span-5 bg-gray-800 rounded border border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-gray-700 bg-gray-800">
                        <h3 className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5 uppercase">
                            <CalculatorIcon className="w-3 h-3 text-cyan-400"/>
                            Composición Resultante
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        <table className="w-full text-[12px]">
                            <tbody className="divide-y divide-gray-700/50">
                                {sortedNutrients.map(nut => {
                                    const val = composition[nut.id] || 0;
                                    if (val === 0) return null; // Optional: hide zero values
                                    return (
                                        <tr  key={nut.id} className="h-[28px] hover:bg-gray-700/30">
                                            <td className="px-2 py-0 text-gray-400 w-10 font-mono text-[9px]">#{nut.code}</td>
                                            <td className="px-2 py-0 font-medium text-gray-300">{nut.name}</td>
                                            <td className="px-2 py-0 text-right font-mono text-cyan-300 font-bold">{val.toFixed(3)}</td>
                                            <td className="px-2 py-0 text-gray-500 w-10 text-[9px]">{nut.unit}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Save Modal */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-600 shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Guardar como Ingrediente</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Esto creará un nuevo ingrediente en su "Catastro de Ingredientes" con la composición química resultante y el costo calculado.
                        </p>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre de la Premezcla</label>
                            <input 
                                type="text" 
                                value={simulationName}
                                onChange={e => setSimulationName(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white outline-none focus:border-cyan-500"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded text-sm">Cancelar</button>
                            <button onClick={handleSaveAsIngredient} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-bold">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
