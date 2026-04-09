import solver from 'javascript-lp-solver';

const model = {
    "optimize": "cost",
    "opType": "min",
    "constraints": {
        "weight": {"equal": 100},
        "protein": {"min": 20}
    },
    "variables": {
        "corn": {"cost": 0.25, "weight": 1, "protein": 0.08},
        "soya": {"cost": 0.55, "weight": 1, "protein": 0.45}
    }
};

const results = solver.Solve(model);

console.log('--- OUTPUT DE CONSOLA (SOLVER MVP) ---');
console.log(`Estado: ${results.feasible ? 'OPTIMO' : 'FALLIDO'}`);
console.log(`Costo Objetivo (USD): ${results.result.toFixed(4)}`);
console.log('-----------------------------------------');
console.log('Composición de la Dieta:');

Object.keys(results).forEach(key => {
    if (key !== 'feasible' && key !== 'result' && key !== 'bounded' && key !== 'isDeletable') {
        if (!isNaN(results[key])) {
             console.log(`- ${key}: ${results[key].toFixed(2)}%`);
        }
    }
});

console.log('-----------------------------------------');
// Nota: javascript-lp-solver no expone sensitividad directamente sin parsear el tableau.
// Para el cierre de hoy, avanzamos con este MVP para asegurar el Dashboard y el Sistema Multi-Cliente.
console.log('Shadow Prices: Disponibles en Tableau (Integración Fase 2)');
