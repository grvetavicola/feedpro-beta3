/**
 * DEBUG_SAFETY_TEST.JS
 * Pruebe de validación del "Escudo de Seguridad Nutricional" de FeedPro 360.
 * Este script simula la lógica inyectada en solver.ts para verificar los límites y buffers.
 */

const applySafetyLimits = (ingredientName) => {
    const nameUp = ingredientName.toUpperCase();
    const limits = {};
    const alerts = [];

    // Lógica de Sal (Excluyendo salvado)
    if (nameUp.includes('SAL') && !nameUp.includes('SALVADO')) {
        limits.max = 0.5;
        alerts.push(`Protección: Límite de SAL aplicado (0.5%) en ${ingredientName}`);
    }
    // Lógica de Bicarbonato
    else if (nameUp.includes('BICARBONATO')) {
        limits.max = 0.3;
        alerts.push(`Protección: Límite de BICARBONATO aplicado (0.3%) en ${ingredientName}`);
    }
    // Lógica de Carbonatos/Caliza
    else if (nameUp.includes('CARBONATO') || nameUp.includes('CALIZA')) {
        limits.max = 12.0;
        alerts.push(`Protección: Límite de MINERALES aplicado (12.0%) en ${ingredientName}`);
    }

    return { limits, alerts };
};

const simulateOptimization = (useSafetyShield) => {
    console.log(`\n>>> SIMULANDO OPTIMIZACIÓN CON ESCUDO: ${useSafetyShield ? 'ACTIVADO' : 'DESACTIVADO'}`);

    const ingredients = [
        { name: 'Maiz Amarillo', protein: 8.0, energy: 3300 },
        { name: 'Sal Refinada', protein: 0.0, energy: 0 },
        { name: 'Caliza 34%', protein: 0.0, energy: 0 },
        { name: 'Afrechillo de Trigo', protein: 15.0, energy: 2300 }
    ];

    const dietRequirements = {
        protein: { min: 20 },
        energy: { min: 2800 }
    };

    let allAlerts = [];
    
    // 1. Aplicar Límites de Seguridad
    const processedIngredients = ingredients.map(ing => {
        let limits = {};
        if (useSafetyShield) {
            const safety = applySafetyLimits(ing.name);
            limits = safety.limits;
            allAlerts.push(...safety.alerts);
        }
        return { ...ing, limits };
    });

    // 2. Aplicar Buffers Nutricionales
    const processedRequirements = {};
    Object.entries(dietRequirements).forEach(([nutId, bounds]) => {
        let max = 9999;
        if (useSafetyShield) {
            const factor = nutId === 'energy' ? 1.10 : 1.05;
            max = bounds.min * factor;
            allAlerts.push(`Buffer: ${nutId} ajustado con margen de ${(factor-1)*100}% (Max: ${max.toFixed(2)})`);
        }
        processedRequirements[nutId] = { min: bounds.min, max: max };
    });

    // Visualización de la "Matriz de Optimización" resultante
    console.log("\nMATRIZ DE INGREDIENTES APLICADA:");
    processedIngredients.forEach(ing => {
        console.log(` - ${ing.name.padEnd(20)} | Límite Max: ${ing.limits.max ? ing.limits.max + '%' : 'Libre'}`);
    });

    console.log("\nREQUERIMIENTOS NUTRICIONALES (CON BUFFER):");
    Object.entries(processedRequirements).forEach(([id, b]) => {
        console.log(` - ${id.padEnd(10)} | Min: ${b.min} | Max: ${b.max === 9999 ? 'Libre' : b.max.toFixed(2)}`);
    });

    if (allAlerts.length > 0) {
        console.log("\nALERTAS DE SEGURIDAD GENERADAS:");
        allAlerts.forEach(a => console.log(` [ALERT] ${a}`));
    }
};

// Ejecución de la prueba
simulateOptimization(false); // Caso Base
simulateOptimization(true);  // Caso con el nuevo Escudo FeedPro
