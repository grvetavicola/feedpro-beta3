import { Ingredient, Nutrient, Product, FormulationResult, Relationship, ProductConstraint, IngredientConstraint } from '../types';
import solver from 'javascript-lp-solver';

export const solveFeedFormulation = (
    product: Product,
    ingredients: Ingredient[],
    nutrients: Nutrient[],
    batchSize: number,
    isDynamicMatrix: boolean = false
): FormulationResult => {
    
    // 1. Setup the Model Object for javascript-lp-solver
    const model: any = {
        optimize: "cost",
        opType: "min",
        constraints: {
            "totalWeight": { equal: 100 } // La suma de porcentajes debe ser 100%
        },
        variables: {}
    };

    // 2. Add Nutrient Constraints from Product
    product.constraints.forEach(c => {
        const constraintObj: any = {};
        if (c.min > 0) constraintObj.min = c.min;
        if (c.max < 999) constraintObj.max = c.max; 
        
        if (Object.keys(constraintObj).length > 0) {
            model.constraints[c.nutrientId] = constraintObj;
        }
    });

    // 3. Add Relationship Constraints (Ratios)
    // Logic: A / B >= Min => A - (Min * B) >= 0
    product.relationships.forEach(rel => {
        if (rel.min > 0) model.constraints[`rel_${rel.id}_min`] = { min: 0 };
        if (rel.max < 999) model.constraints[`rel_${rel.id}_max`] = { max: 0 };
    });

    // 4. Add Ingredient Inclusion Constraints
    product.ingredientConstraints.forEach(ic => {
         model.constraints[`ing_limit_${ic.ingredientId}`] = { 
            min: ic.min || 0, 
            max: ic.max === undefined ? 100 : ic.max 
        };
    });

    // 5. Build Variables (Ingredients)
    ingredients.forEach(ing => {
        const variable: any = {
            cost: ing.price,
            totalWeight: 1,
            [`ing_limit_${ing.id}`]: 1
        };

        // Add nutrient contributions (scaled by 100 to match constraints)
        const activeNutrients = (isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? (ing.dynamicNutrients as Record<string, number>) : ing.nutrients;
        Object.entries(activeNutrients).forEach(([nutId, value]) => {
            variable[nutId] = value; 
        });

        // Add Relationship contributions (Coefficients)
        product.relationships.forEach(rel => {
            const valA = activeNutrients[rel.nutrientAId] || 0;
            const valB = activeNutrients[rel.nutrientBId] || 0;

            if (rel.min > 0) variable[`rel_${rel.id}_min`] = valA - (rel.min * valB);
            if (rel.max < 999) variable[`rel_${rel.id}_max`] = valA - (rel.max * valB);
        });

        model.variables[ing.id] = variable;
    });

    // 6. Solve
    const results = solver.Solve(model);

    // 7. Format Results
    if (!results.feasible) {
        return {
            status: 'INFEASIBLE',
            totalCost: 0,
            items: [],
            nutrientAnalysis: [],
            relationshipAnalysis: []
        };
    }

    const items = ingredients
        .map(ing => {
            const percentage = results[ing.id] || 0;
            if (percentage <= 0.0001) return null;

            const weight = (percentage / 100) * batchSize;
            
            return {
                ingredientId: ing.id,
                percentage: Number(percentage.toFixed(4)),
                weight: Number(weight.toFixed(4)),
                cost: Number((weight * ing.price).toFixed(2))
            };
        })
        .filter(Boolean) as FormulationResult['items'];

    // Analysis
    const calculatedNutrients: Record<string, number> = {};
    nutrients.forEach(nut => {
        let totalValue = 0;
        items.forEach(item => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            if (ing) {
                const activeNutrients = (isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? ing.dynamicNutrients! : ing.nutrients;
                if (activeNutrients[nut.id]) {
                    totalValue += activeNutrients[nut.id] * item.percentage;
                }
            }
        });
        calculatedNutrients[nut.id] = totalValue / 100;
    });

    const nutrientAnalysis = nutrients.map(nut => {
        const constraint = product.constraints.find(c => c.nutrientId === nut.id);
        const val = calculatedNutrients[nut.id] || 0;
        return {
            nutrientId: nut.id,
            value: Number(val.toFixed(3)),
            min: constraint ? constraint.min : 0,
            max: constraint ? constraint.max : 999,
            met: constraint ? (val >= constraint.min - 0.001 && val <= constraint.max + 0.001) : true
        };
    });

    const relationshipAnalysis = product.relationships.map(rel => {
        const valA = calculatedNutrients[rel.nutrientAId] || 0;
        const valB = calculatedNutrients[rel.nutrientBId] || 0;
        const ratio = valB !== 0 ? valA / valB : 0;
        return {
            relationId: rel.id,
            name: rel.name,
            value: Number(ratio.toFixed(2)),
            min: rel.min,
            max: rel.max,
            met: (rel.min > 0 ? ratio >= rel.min - 0.01 : true) && (rel.max < 999 ? ratio <= rel.max + 0.01 : true)
        };
    });

    return {
        status: 'OPTIMAL',
        totalCost: Number((results.result / 100 * batchSize).toFixed(2)), 
        items: items.sort((a, b) => b.percentage - a.percentage), 
        nutrientAnalysis,
        relationshipAnalysis
    };
};

export const solveGroupFormulation = (
    assignments: { product: Product, batchSize: number }[],
    ingredients: Ingredient[],
    nutrients: Nutrient[],
    isDynamicMatrix: boolean = false,
    useStock: boolean = true
): any => {
    
    const model: any = {
        optimize: "cost",
        opType: "min",
        constraints: {},
        variables: {}
    };

    // 1. Create constraints for each product
    assignments.forEach(({ product, batchSize }, pIdx) => {
        const pId = product.id;
        
        // Sum of weight for this product = 100%
        model.constraints[`totalWeight_${pId}`] = { equal: 100 };

        // Nutrients for this product
        product.constraints.forEach(c => {
            const constraintKey = `nut_${pId}_${c.nutrientId}`;
            const constraintObj: any = {};
            if (c.min > 0) constraintObj.min = c.min;
            if (c.max < 999) constraintObj.max = c.max;
            if (Object.keys(constraintObj).length > 0) {
                model.constraints[constraintKey] = constraintObj;
            }
        });

        // Add Relationship Constraints for this product
        product.relationships.forEach(rel => {
            if (rel.min > 0) model.constraints[`rel_${pId}_${rel.id}_min`] = { min: 0 };
            if (rel.max < 999) model.constraints[`rel_${pId}_${rel.id}_max`] = { max: 0 };
        });
    });

    // 2. Global Stock Constraints
    if (useStock) {
        ingredients.forEach(ing => {
            if (ing.stock !== undefined && ing.stock < 999999) {
                model.constraints[`stock_${ing.id}`] = { max: ing.stock };
            }
        });
    }

    // 3. Variables: Ingredient_Per_Product
    ingredients.forEach(ing => {
        assignments.forEach(({ product, batchSize }) => {
            const pId = product.id;
            const varName = `${ing.id}_${pId}`;
            
            const variable: any = {
                // Cost is proportional to the actual weight used in the batch
                // Cost = Price * (Percentage/100 * BatchSize)
                cost: ing.price * (batchSize / 100),
                
                // Contributes to product weight
                [`totalWeight_${pId}`]: 1,
                
                // Contributes to product nutrients (scaled)
                ...Object.entries((isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? (ing.dynamicNutrients as Record<string, number>) : ing.nutrients).reduce((acc, [nutId, val]) => {
                    acc[`nut_${pId}_${nutId}`] = val;
                    return acc;
                }, {} as any),

                // Contributes to global stock: (Percentage/100 * BatchSize) kg
                ...(useStock ? { [`stock_${ing.id}`]: batchSize / 100 } : {})
            };

            // Contributes to relationships
            product.relationships.forEach(rel => {
                const actNuts = (isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? ing.dynamicNutrients! : ing.nutrients;
                const valA = actNuts[rel.nutrientAId] || 0;
                const valB = actNuts[rel.nutrientBId] || 0;
                if (rel.min > 0) variable[`rel_${pId}_${rel.id}_min`] = valA - (rel.min * valB);
                if (rel.max < 999) variable[`rel_${pId}_${rel.id}_max`] = valA - (rel.max * valB);
            });

            model.variables[varName] = variable;
        });
    });

    // 4. Solve
    const results = solver.Solve(model);

    return results;
};
