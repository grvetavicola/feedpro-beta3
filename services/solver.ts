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
            model.constraints[`nut_${c.nutrientId}`] = constraintObj;
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
        const effectivePrice = (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0);
        const variable: any = {
            cost: effectivePrice,
            totalWeight: 1,
            [`ing_limit_${ing.id}`]: 1
        };

        // Add nutrient contributions (scaled by 100 to match constraints)
        const activeNutrients = (isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? (ing.dynamicNutrients as Record<string, number>) : ing.nutrients;
        Object.entries(activeNutrients).forEach(([nutId, value]) => {
            variable[`nut_${nutId}`] = value; 
        });

        // Add Relationship contributions (Coefficients)
        product.relationships.forEach(rel => {
            const valA = activeNutrients[rel.nutrientAId] || 0;
            const valB = activeNutrients[rel.nutrientBId] || 0;

            if (rel.min > 0) variable[`rel_${rel.id}_min`] = valA - (rel.min * valB);
            if (rel.max < 999) variable[`rel_${rel.id}_max`] = valA - (rel.max * valB);
        });

        model.variables[`ing_${ing.id}`] = variable;
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

    const rejectedItems: NonNullable<FormulationResult['rejectedItems']> = [];

    const items = ingredients
        .map(ing => {
            const percentage = results[`ing_${ing.id}`] || 0;
            const effectivePrice = (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0);

            if (percentage <= 0.0001) {
                // Shadow Price Analysis (Opportunity Cost)
                const oppModel = JSON.parse(JSON.stringify(model));
                // Force 1% inclusion to calculate marginal cost penalty
                oppModel.constraints[`ing_limit_${ing.id}`] = { 
                    min: 1, 
                    max: oppModel.constraints[`ing_limit_${ing.id}`]?.max || 100 
                };
                const oppResult = solver.Solve(oppModel);
                
                if (oppResult.feasible) {
                    const costDiff = oppResult.result - results.result; // Delta Cost for 1%
                    const oppPrice = effectivePrice - costDiff;
                    rejectedItems.push({
                        ingredientId: ing.id,
                        effectivePrice: Number(effectivePrice.toFixed(2)),
                        opportunityPrice: Number(oppPrice.toFixed(2)),
                        viabilityGap: Number(costDiff.toFixed(2))
                    });
                }
                return null;
            }

            const weight = (percentage / 100) * batchSize;
            
            return {
                ingredientId: ing.id,
                percentage: Number(percentage.toFixed(4)),
                weight: Number(weight.toFixed(4)),
                cost: Number((weight * effectivePrice).toFixed(2))
            };
        })
        .filter(Boolean) as FormulationResult['items'];

    // Sort rejected items: closest to entering the diet first (lowest viability gap)
    rejectedItems.sort((a, b) => a.viabilityGap - b.viabilityGap);

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
        rejectedItems,
        nutrientAnalysis,
        relationshipAnalysis
    };
};

export const solveGroupFormulation = (
    assignments: { id: string, product: Product, batchSize: number }[],
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
    assignments.forEach(({ id, product, batchSize }) => {
        const aId = id;
        
        // Sum of weight for this product = 100%
        model.constraints[`totalWeight_${aId}`] = { equal: 100 };

        // Nutrients for this product
        product.constraints.forEach(c => {
            const constraintKey = `nut_${aId}_${c.nutrientId}`;
            const constraintObj: any = {};
            if (c.min > 0) constraintObj.min = c.min;
            if (c.max < 999) constraintObj.max = c.max;
            if (Object.keys(constraintObj).length > 0) {
                model.constraints[constraintKey] = constraintObj;
            }
        });

        // Add Relationship Constraints for this product
        product.relationships.forEach(rel => {
            if (rel.min > 0) model.constraints[`rel_${aId}_${rel.id}_min`] = { min: 0 };
            if (rel.max < 999) model.constraints[`rel_${aId}_${rel.id}_max`] = { max: 0 };
        });
        // Add Ingredient Inclusion Constraints for this product
        product.ingredientConstraints.forEach(ic => {
            model.constraints[`ing_limit_${aId}_${ic.ingredientId}`] = { 
               min: ic.min || 0, 
               max: ic.max === undefined ? 100 : ic.max 
           };
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
        const effectivePrice = (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0);
        assignments.forEach(({ id, product, batchSize }) => {
            const aId = id;
            const varName = `${ing.id}_${aId}`;
            
            const variable: any = {
                // Cost = EffectivePrice * (Percentage/100 * BatchSize)
                cost: effectivePrice * (batchSize / 100),
                
                // Contributes to product weight
                [`totalWeight_${aId}`]: 1,

                // Contributes to product-specific ingredient limit
                [`ing_limit_${aId}_${ing.id}`]: 1,
                
                // Contributes to product nutrients (scaled)
                ...Object.entries((isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? (ing.dynamicNutrients as Record<string, number>) : ing.nutrients).reduce((acc, [nutId, val]) => {
                    acc[`nut_${aId}_${nutId}`] = val;
                    return acc;
                }, {} as any),

                // Contributes to global stock: (Percentage/100 * BatchSize) kg
                ...(useStock ? { [`stock_${ing.id}`]: batchSize / 100 } : {})
            };

            // Contributes to relationships
            product.relationships.forEach(rel => {
                const actNuts = (isDynamicMatrix && Object.keys(ing.dynamicNutrients || {}).length > 0) ? (ing.dynamicNutrients as Record<string, number>) : ing.nutrients;
                const valA = actNuts[rel.nutrientAId] || 0;
                const valB = actNuts[rel.nutrientBId] || 0;
                if (rel.min > 0) variable[`rel_${aId}_${rel.id}_min`] = valA - (valB * rel.min);
                if (rel.max < 999) variable[`rel_${aId}_${rel.id}_max`] = valA - (valB * rel.max);
            });

            model.variables[varName] = variable;
        });
    });

    // 4. Solve
    const results = solver.Solve(model);

    return results;
};
