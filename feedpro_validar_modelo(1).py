# !pip install pulp

from dataclasses import dataclass, field
from typing import List, Dict, Any
from pulp import *

@dataclass
class Constraint:
    nutrientId: str
    min: float = 0.0
    max: float = 999.0

@dataclass
class Relationship:
    id: str
    nutrientAId: str
    nutrientBId: str
    min: float = 0.0
    max: float = 999.0

@dataclass
class Product:
    id: str
    name: str
    constraints: List[Constraint] = field(default_factory=list)
    relationships: List[Relationship] = field(default_factory=list)

@dataclass
class Ingredient:
    id: str
    name: str
    price: float
    shrinkage: float = 0.0
    processingCost: float = 0.0
    nutrients: Dict[str, float] = field(default_factory=dict)
    limits: Dict[str, float] = field(default_factory=dict)

@dataclass
class Nutrient:
    id: str
    name: str
    unit: str

@dataclass
class FormulationResult:
    feasible: bool
    status: str
    cost_per_unit: float
    total_batch_cost: float
    ingredients_proportions: Dict[str, float] # %
    ingredients_weights: Dict[str, float] # kg
    actual_nutrients: Dict[str, float]
    shadow_prices: Dict[str, float] = field(default_factory=dict)
    reduced_costs: Dict[str, float] = field(default_factory=dict)

def solve_feed_formulation_python(
    product: Product,
    ingredients: List[Ingredient],
    nutrients_list: List[Nutrient],
    batch_size: float = 1000.0
) -> FormulationResult:

    prob = LpProblem(f"Feed_{product.id}", LpMinimize)

    # Variables de decisión (%) de inclusion
    ing_vars = LpVariable.dicts("Ing", [i.id for i in ingredients], lowBound=0, upBound=100, cat='Continuous')

    # Función Objetivo: Costo mínimo
    prob += lpSum([ing_vars[i.id] * (i.price + i.processingCost) for i in ingredients])

    # Restricción de Peso Total (Suma de % = 100)
    prob += lpSum([ing_vars[i.id] for i in ingredients]) == 100, "Total_Weight"

    # Restricciones de Inclusión de Ingredientes
    for i in ingredients:
        if 'min' in i.limits: prob += ing_vars[i.id] >= i.limits['min'], f"Min_Inc_{i.id}"
        if 'max' in i.limits: prob += ing_vars[i.id] <= i.limits['max'], f"Max_Inc_{i.id}"

    # Restricciones Nutricionales
    nut_constraints_refs = {}
    for c in product.constraints:
        total_nut = lpSum([ing_vars[i.id] * i.nutrients.get(c.nutrientId, 0.0) for i in ingredients])
        if c.min > 0:
            name = f"Min_Nut_{c.nutrientId}"
            prob += total_nut >= c.min * 100, name
            nut_constraints_refs[name] = c.nutrientId
        if c.max < 999:
            name = f"Max_Nut_{c.nutrientId}"
            prob += total_nut <= c.max * 100, name
            nut_constraints_refs[name] = c.nutrientId

    prob.solve(PULP_CBC_CMD(msg=0))

    feasible = prob.status == LpStatusOptimal
    ingredient_proportions = {}
    ingredient_weights = {}
    actual_nutrients = {}
    shadow_prices = {}

    if feasible:
        # 1. Proporciones y Pesos
        for i in ingredients:
            val = value(ing_vars[i.id])
            ingredient_proportions[i.id] = val
            ingredient_weights[i.id] = (val / 100) * batch_size

        # 2. Valores Nutricionales Reales
        for n in nutrients_list:
            actual_nutrients[n.id] = sum([(ingredient_proportions[i.id]/100) * i.nutrients.get(n.id, 0.0) for i in ingredients])

        # 3. Shadow Prices (Dual Values)
        for name, c in prob.constraints.items():
            if c.pi != 0:
                shadow_prices[name] = c.pi

    return FormulationResult(
        feasible=feasible,
        status=LpStatus[prob.status],
        cost_per_unit=value(prob.objective) / 100 if feasible else 0,
        total_batch_cost=(value(prob.objective) / 100) * batch_size if feasible else 0,
        ingredients_proportions=ingredient_proportions,
        ingredients_weights=ingredient_weights,
        actual_nutrients=actual_nutrients,
        shadow_prices=shadow_prices
    )

# 1. Definir Nutrientes de Ejemplo
example_nutrients = [
    Nutrient(id='protein', name='Proteína Cruda', unit='%'),
    Nutrient(id='energy', name='Energía Metabolizable', unit='Kcal/kg'),
    Nutrient(id='calcium', name='Calcio', unit='%'),
    Nutrient(id='phosphorus', name='Fósforo', unit='%'),
]

# 2. Definir Ingredientes de Ejemplo
example_ingredients = [
    Ingredient(
        id='corn',
        name='Maíz',
        price=0.20, # $/kg
        shrinkage=0.0, # %
        processingCost=0.0,
        nutrients={'protein': 8.0, 'energy': 3350.0, 'calcium': 0.01, 'phosphorus': 0.28},
        limits={'min': 0.0, 'max': 70.0} # % de inclusión
    ),
    Ingredient(
        id='soybean_meal',
        name='Harina de Soya',
        price=0.45, # $/kg
        shrinkage=0.0, # %
        processingCost=0.0,
        nutrients={'protein': 44.0, 'energy': 2200.0, 'calcium': 0.25, 'phosphorus': 0.60},
        limits={'min': 10.0, 'max': 40.0} # % de inclusión
    ),
    Ingredient(
        id='fish_meal',
        name='Harina de Pescado',
        price=1.20, # $/kg
        shrinkage=0.0,
        processingCost=0.0,
        nutrients={'protein': 65.0, 'energy': 2800.0, 'calcium': 4.5, 'phosphorus': 2.8},
        limits={'min': 0.0, 'max': 15.0}
    ),
    Ingredient(
        id='calcium_carbonate',
        name='Carbonato de Calcio',
        price=0.10, # $/kg
        shrinkage=0.0,
        processingCost=0.0,
        nutrients={'protein': 0.0, 'energy': 0.0, 'calcium': 38.0, 'phosphorus': 0.0},
        limits={'min': 0.0, 'max': 5.0}
    ),
    Ingredient(
        id='dicalcium_phosphate',
        name='Fosfato Dicálcico',
        price=0.30, # $/kg
        shrinkage=0.0,
        processingCost=0.0,
        nutrients={'protein': 0.0, 'energy': 0.0, 'calcium': 23.0, 'phosphorus': 18.0},
        limits={'min': 0.0, 'max': 3.0}
    )
]

# 3. Definir un Producto (Tipo de Dieta) con sus Restricciones
example_product = Product(
    id='chicken_grower',
    name='Alimento para Pollos de Engorde',
    constraints=[
        Constraint(nutrientId='protein', min=0.20, max=0.23),  # 20-23% Proteína
        Constraint(nutrientId='energy', min=3000, max=3200), # 3000-3200 Kcal/kg Energía
        Constraint(nutrientId='calcium', min=0.008, max=0.012), # 0.8-1.2% Calcio
        Constraint(nutrientId='phosphorus', min=0.004, max=0.006), # 0.4-0.6% Fósforo
    ],
    relationships=[
        Relationship(id='ca_p_ratio', nutrientAId='calcium', nutrientBId='phosphorus', min=1.5, max=2.5)
    ]
)

# 4. Ejecutar la función de formulación
print("Ejecutando la formulación...")
result = solve_feed_formulation_python(
    product=example_product,
    ingredients=example_ingredients,
    nutrients_list=example_nutrients,
    batch_size=100.0 # Trabajamos con 100 unidades para obtener porcentajes directos
)

# 5. Imprimir los resultados
print("\n--- Resultados de la Formulación ---")
if result.feasible:
    print(f"Estado: Óptimo (Factible)")
    print(f"Costo Total: ${result.cost:.4f} por 100 unidades")
    print("Proporciones de Ingredientes (%):")
    for ing_id, proportion in result.ingredients_proportions.items():
        print(f"  {ing_id}: {proportion:.2f}%")
else:
    print(f"Estado: No Factible")
    print("No se pudo encontrar una solución que satisfaga todas las restricciones.")

print("------------------------------------")

# 1. Definir Nutrientes de Ejemplo
example_nutrients = [
    Nutrient(id='protein', name='Proteína Cruda', unit='%'),
    Nutrient(id='energy', name='Energía Metabolizable', unit='Kcal/kg'),
    Nutrient(id='calcium', name='Calcio', unit='%'),
    Nutrient(id='phosphorus', name='Fósforo', unit='%'),
]

# 2. Definir Ingredientes de Ejemplo
example_ingredients = [
    Ingredient(
        id='corn',
        name='Maíz',
        price=0.20, # $/kg
        shrinkage=0.0, # %
        processingCost=0.0,
        nutrients={'protein': 8.0, 'energy': 3350.0, 'calcium': 0.01, 'phosphorus': 0.28},
        limits={'min': 0.0, 'max': 70.0} # % de inclusión
    ),
    Ingredient(
        id='soybean_meal',
        name='Harina de Soya',
        price=0.45, # $/kg
        shrinkage=0.0, # %
        processingCost=0.0,
        nutrients={'protein': 44.0, 'energy': 2200.0, 'calcium': 0.25, 'phosphorus': 0.60},
        limits={'min': 10.0, 'max': 40.0} # % de inclusión
    ),
    Ingredient(
        id='fish_meal',
        name='Harina de Pescado',
        price=1.20, # $/kg
        shrinkage=0.0,
        processingCost=0.0,
        nutrients={'protein': 65.0, 'energy': 2800.0, 'calcium': 4.5, 'phosphorus': 2.8},
        limits={'min': 0.0, 'max': 15.0}
    ),
    Ingredient(
        id='calcium_carbonate',
        name='Carbonato de Calcio',
        price=0.10, # $/kg
        shrinkage=0.0,
        processingCost=0.0,
        nutrients={'protein': 0.0, 'energy': 0.0, 'calcium': 38.0, 'phosphorus': 0.0},
        limits={'min': 0.0, 'max': 5.0}
    ),
    Ingredient(
        id='dicalcium_phosphate',
        name='Fosfato Dicálcico',
        price=0.30, # $/kg
        shrinkage=0.0,
        processingCost=0.0,
        nutrients={'protein': 0.0, 'energy': 0.0, 'calcium': 23.0, 'phosphorus': 18.0},
        limits={'min': 0.0, 'max': 3.0}
    )
]

# 3. Definir un Producto (Tipo de Dieta) con sus Restricciones
example_product = Product(
    id='chicken_grower',
    name='Alimento para Pollos de Engorde',
    constraints=[
        Constraint(nutrientId='protein', min=0.20, max=0.23),  # 20-23% Proteína
        Constraint(nutrientId='energy', min=3000, max=3200), # 3000-3200 Kcal/kg Energía
        Constraint(nutrientId='calcium', min=0.008, max=0.012), # 0.8-1.2% Calcio
        Constraint(nutrientId='phosphorus', min=0.004, max=0.006), # 0.4-0.6% Fósforo
    ],
    relationships=[
        Relationship(id='ca_p_ratio', nutrientAId='calcium', nutrientBId='phosphorus', min=1.5, max=2.5)
    ]
)

# 4. Ejecutar la función de formulación
print("Ejecutando la formulación...")
result = solve_feed_formulation_python(
    product=example_product,
    ingredients=example_ingredients,
    nutrients_list=example_nutrients,
    batch_size=100.0 # Trabajamos con 100 unidades para obtener porcentajes directos
)

# 5. Imprimir los resultados
print("\n--- Resultados de la Formulación ---")
if result.feasible:
    print(f"Estado: Óptimo (Factible)")
    print(f"Costo Total: ${result.cost:.4f} por 100 unidades")
    print("Proporciones de Ingredientes (%):")
    for ing_id, proportion in result.ingredients_proportions.items():
        print(f"  {ing_id}: {proportion:.2f}%")
else:
    print(f"Estado: No Factible")
    print("No se pudo encontrar una solución que satisfaga todas las restricciones.")

print("------------------------------------")

import pandas as pd

# Cargar Bases Nutricionales
try:
    df_bases_nutricionales = pd.read_excel('/content/BASES_ NUTRICIONALES_CARGAR.xlsx')
    print("Primeras 5 filas de Bases Nutricionales:")
    display(df_bases_nutricionales.head())
except FileNotFoundError:
    print("Error: 'BASES_ NUTRICIONALES_CARGAR.xlsx' no encontrado. Asegúrese de que el archivo esté en el directorio correcto.")

# Cargar Matriz Nutricional de Ingredientes
try:
    df_matriz_nutricional = pd.read_excel('/content/BASE_Matriz Nutricional de Ingredientes.xlsx')
    print("\nPrimeras 5 filas de Matriz Nutricional de Ingredientes:")
    display(df_matriz_nutricional.head())
except FileNotFoundError:
    print("Error: 'BASE_Matriz Nutricional de Ingredientes.xlsx' no encontrado. Asegúrese de que el archivo esté en el directorio correcto.")

# 1. Limpiar y preparar df_matriz_nutricional
df_ingredientes_clean = df_matriz_nutricional.copy()
df_ingredientes_clean.columns = df_ingredientes_clean.iloc[0].astype(str).str.strip()
df_ingredientes_clean = df_ingredientes_clean[1:].reset_index(drop=True)

available_cols = list(df_ingredientes_clean.columns)

def find_col(target_parts):
    for col in available_cols:
        if all(part.lower() in col.lower() for part in target_parts):
            return col
    return None

col_protein = find_col(['Proteína', '(%)'])
col_energy = find_col(['Energía', 'Met', 'Kcal'])
col_calcium = find_col(['Calcio', '(%)'])
col_phosphorus = find_col(['Fósforo', 'Total'])

nutrient_column_mapping = {}
if col_protein: nutrient_column_mapping[col_protein] = 'protein'
if col_energy: nutrient_column_mapping[col_energy] = 'energy'
if col_calcium: nutrient_column_mapping[col_calcium] = 'calcium'
if col_phosphorus: nutrient_column_mapping[col_phosphorus] = 'phosphorus'

# Convertir las columnas numéricas a tipo float
for col in df_ingredientes_clean.columns:
    if col not in ['codigo', 'nombre']:
        df_ingredientes_clean[col] = df_ingredientes_clean[col].astype(str).str.replace(',', '').str.replace(' ', '')
        df_ingredientes_clean[col] = pd.to_numeric(df_ingredientes_clean[col], errors='coerce').fillna(0)

parsed_nutrients = []
for excel_col_name, nutrient_id in nutrient_column_mapping.items():
    unit = '%' if '%' in excel_col_name else 'Kcal/kg' if 'kcal' in excel_col_name.lower() else ''
    parsed_nutrients.append(Nutrient(id=nutrient_id, name=excel_col_name, unit=unit))

parsed_ingredients = []
for _, row in df_ingredientes_clean.iterrows():
    ing_nutrients = {nutrient_id: float(row[excel_col_name]) for excel_col_name, nutrient_id in nutrient_column_mapping.items()}

    # Definir límites de seguridad (Inclusión Máxima)
    ing_name = str(row.get('nombre', '')).upper()
    limits = {}

    # Lógica de seguridad profesional: Límites máximos para ingredientes específicos
    if 'SAL' in ing_name and 'SALVADO' not in ing_name:
        limits['max'] = 0.5  # Máximo 0.5% de sal
    elif 'BICARBONATO' in ing_name:
        limits['max'] = 0.3  # Máximo 0.3%
    elif 'CARBONATO' in ing_name or 'CALIZA' in ing_name:
        limits['max'] = 12.0 # Límite físico

    parsed_ingredients.append(
        Ingredient(
            id=str(row.get('codigo', 'unknown')),
            name=str(row.get('nombre', 'Sin nombre')),
            price=float(row.get('Precio', 0)),
            nutrients=ing_nutrients,
            limits=limits
        )
    )

print(f"\nSe cargaron {len(parsed_nutrients)} nutrientes y {len(parsed_ingredients)} ingredientes con límites de seguridad.")
if parsed_ingredients:
    sal_ing = [i for i in parsed_ingredients if 'SAL' in i.name.upper() and 'SALVADO' not in i.name.upper()]
    if sal_ing: print(f"Ejemplo de límite aplicado: {sal_ing[0].name} -> Max: {sal_ing[0].limits.get('max')}% ")

# Re-ejecutar la formulación con los datos corregidos
extract_diets_and_solve(df_bases_nutricionales, parsed_ingredients, parsed_nutrients)

# Re-ejecutar el test de estrés para ver el impacto de los límites de sodio
run_complex_stress_test(parsed_ingredients, parsed_nutrients)

def extract_diets_and_solve_professional(df_diets, ingredients, nutrients, batch_size=1000.0):
    diet_names = [col for col in df_diets.columns if col not in ['DIETAS', 'INSUMOS']]

    for diet in diet_names:
        print(f"\n>>> Formulando Dieta Profesional: {diet}")
        product = Product(id=diet, name=diet, constraints=[
            Constraint(nutrientId='protein', min=18.0, max=22.0),
            Constraint(nutrientId='energy', min=2800, max=3000),
            Constraint(nutrientId='calcium', min=0.8, max=1.2),
            Constraint(nutrientId='phosphorus', min=0.4, max=0.6)
        ])

        res = solve_feed_formulation_python(product, ingredients, nutrients, batch_size=batch_size)
        if res.feasible:
            print(f"  ✅ Factible - Costo Batch: ${res.total_batch_cost:.2f}")
            sorted_ings = sorted(res.ingredients_weights.items(), key=lambda x: x[1], reverse=True)[:3]
            for ing_id, kg in sorted_ings:
                name = next(i.name for i in ingredients if i.id == ing_id)
                print(f"    - {name}: {kg:.2f} kg")
        else:
            print(f"  ❌ No Factible: {res.status}")

extract_diets_and_solve_professional(df_bases_nutricionales, parsed_ingredients, parsed_nutrients)

def migrate_and_solve_all_diets(df_bases, ingredients, nutrients):
    # 1. Identificar filas críticas dinámicamente usando la primera columna
    label_col = df_bases.columns[0]
    req_rows = {}
    for idx, row in df_bases.iterrows():
        label = str(row[label_col]).upper()
        if 'PROTE' in label: req_rows['protein'] = idx
        elif 'ENERG' in label: req_rows['energy'] = idx
        elif 'CALCIO' in label: req_rows['calcium'] = idx
        elif 'FÓSFORO' in label: req_rows['phosphorus'] = idx

    # Las dietas están en el resto de las columnas
    diet_columns = [col for col in df_bases.columns if col != label_col]
    results_summary = []

    print(f"--- INICIANDO MIGRACIÓN Y OPTIMIZACIÓN DE {len(diet_columns)} DIETAS ---")

    for diet_name in diet_columns:
        diet_constraints = []
        for nut_id, row_idx in req_rows.items():
            val = pd.to_numeric(df_bases.at[row_idx, diet_name], errors='coerce')
            if not pd.isna(val) and val > 0:
                # Margen de seguridad: 5% extra para nutrientes, 10% para energía
                margin = 1.05 if nut_id != 'energy' else 1.10
                diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * margin))

        # Resolver para un batch de 1000kg
        product = Product(id=str(diet_name).strip(), name=str(diet_name).strip(), constraints=diet_constraints)
        res = solve_feed_formulation_python(product, ingredients, nutrients, batch_size=1000.0)

        if res.feasible:
            print(f"\u2705 {diet_name.strip()}: Factible ($ {res.total_batch_cost:.2f}/batch)")
        else:
            print(f"\u274C {diet_name.strip()}: Infactible con ingredientes actuales.")

        results_summary.append({"Dieta": diet_name, "Resultado": res})

    return results_summary

# Ejecutar la migración corregida
full_results = migrate_and_solve_all_diets(df_bases_nutricionales, parsed_ingredients, parsed_nutrients)

import pandas as pd
from pulp import *

def generate_field_production_report(results_summary, ingredients_list):
    """Genera un reporte detallado para el equipo de planta."""
    print(f"\n{'='*60}")
    print(f"{'REPORTE GLOBAL DE PRODUCCIÓN (BATCH 1000 KG)':^60}")
    print(f"{'='*60}\n")

    for item in results_summary:
        diet_name = item['Dieta']
        res = item['Resultado']

        print(f"▶ DIETA: {diet_name.strip()}")
        if res.feasible:
            print(f"  Status: OPTIMIZADO | Costo Batch: ${res.total_batch_cost:.2f}")
            print(f"  {'Ingrediente':<40} | {'Peso (kg)':>10}")
            print(f"  {'-'*53}")

            # Mostrar ingredientes con inclusión > 0
            for ing_id, weight in res.ingredients_weights.items():
                if weight > 0.01:
                    ing_name = next(i.name for i in ingredients_list if i.id == ing_id)
                    print(f"  {ing_name[:38]:<40} | {weight:>10.2f} kg")

            print(f"\n  VALORES NUTRICIONALES LOGRADOS:")
            for nut_id, val in res.actual_nutrients.items():
                print(f"    - {nut_id.capitalize()}: {val:.3f}")
        else:
            print(f"  ❌ ALERTA: Esta dieta no pudo ser formulada con los insumos actuales.")
        print(f"\n{'-'*60}\n")

# 1. Ejecutar la optimización masiva de nuevo para asegurar consistencia
final_production_results = migrate_and_solve_all_diets(
    df_bases_nutricionales,
    parsed_ingredients,
    parsed_nutrients
)

# 2. Generar el reporte de campo final
generate_field_production_report(final_production_results, parsed_ingredients)

def run_complex_stress_test(ingredients, nutrients, batch_size=1000.0):
    complex_product = Product(
        id='pre_starter_elite',
        name='Pre-Inicio Elite (Estrés)',
        constraints=[
            Constraint(nutrientId='protein', min=24.0, max=24.5),
            Constraint(nutrientId='energy', min=3150, max=3200),
            Constraint(nutrientId='calcium', min=0.95, max=1.00),
            Constraint(nutrientId='phosphorus', min=0.45, max=0.48),
        ]
    )

    strict_ingredients = []
    for ing in ingredients:
        new_ing = Ingredient(id=ing.id, name=ing.name, price=ing.price, nutrients=ing.nutrients, limits=ing.limits.copy())
        # Forzar el uso de otros ingredientes limitando los básicos
        if 'MIJO' in ing.name.upper(): new_ing.limits['max'] = 0.0
        if 'MAÍZ' in ing.name.upper(): new_ing.limits['max'] = 40.0
        if 'SOYA' in ing.name.upper(): new_ing.limits['max'] = 25.0
        strict_ingredients.append(new_ing)

    print(f"\n>>> EJECUTANDO DESAFÍO PROFESIONAL: {complex_product.name}")
    result = solve_feed_formulation_python(complex_product, strict_ingredients, nutrients, batch_size=batch_size)

    if result.feasible:
        print(f"✅ ESTADO: {result.status}")
        print(f"Costo por kg: ${result.cost_per_unit:.4f} | Costo Batch ({batch_size}kg): ${result.total_batch_cost:.2f}")

        print("\n--- COMPOSICIÓN DE LA MEZCLA ---")
        for ing_id, pct in result.ingredients_proportions.items():
            if pct > 0.01:
                name = next(i.name for i in ingredients if i.id == ing_id)
                kg = result.ingredients_weights[ing_id]
                print(f"  - {name:.<30} {pct:>6.2f}% ({kg:>7.2f} kg)")

        print("\n--- VALORES NUTRICIONALES FINALES ---")
        for nut_id, val in result.actual_nutrients.items():
            unit = next((n.unit for n in nutrients if n.id == nut_id), '')
            print(f"  * {nut_id.capitalize():.<15}: {val:>8.2f} {unit}")

        print("\n--- ANÁLISIS DE PRECIOS SOMBRA (Oportunidad) ---")
        for const_name, pi in result.shadow_prices.items():
            if abs(pi) > 0.0001:
                print(f"  > {const_name:.<25}: {pi:>8.4f} (impacto en costo)")
    else:
        print(f"❌ FALLO: {result.status}. No hay solución con los parámetros dados.")

run_complex_stress_test(parsed_ingredients, parsed_nutrients)

def run_complex_stress_test(ingredients, nutrients, batch_size=1000.0):
    complex_product = Product(
        id='pre_starter_elite',
        name='Pre-Inicio Elite (Estrés)',
        constraints=[
            Constraint(nutrientId='protein', min=24.0, max=24.5),
            Constraint(nutrientId='energy', min=3150, max=3200),
            Constraint(nutrientId='calcium', min=0.95, max=1.00),
            Constraint(nutrientId='phosphorus', min=0.45, max=0.48),
        ]
    )

    strict_ingredients = []
    for ing in ingredients:
        new_ing = Ingredient(id=ing.id, name=ing.name, price=ing.price, nutrients=ing.nutrients, limits=ing.limits.copy())
        if 'MIJO' in ing.name.upper(): new_ing.limits['max'] = 0.0
        if 'MAÍZ' in ing.name.upper(): new_ing.limits['max'] = 40.0
        if 'SOYA' in ing.name.upper(): new_ing.limits['max'] = 25.0
        strict_ingredients.append(new_ing)

    print(f"\n>>> EJECUTANDO DESAFÍO PROFESIONAL: {complex_product.name}")
    result = solve_feed_formulation_python(complex_product, strict_ingredients, nutrients, batch_size=batch_size)

    if result.feasible:
        print(f"✅ ESTADO: {result.status}")
        print(f"Costo por kg: ${result.cost_per_unit:.4f} | Costo Batch ({batch_size}kg): ${result.total_batch_cost:.2f}")

        print("\n--- COMPOSICIÓN DE LA MEZCLA ---")
        for ing_id, pct in result.ingredients_proportions.items():
            if pct > 0.01:
                name = next(i.name for i in ingredients if i.id == ing_id)
                kg = result.ingredients_weights[ing_id]
                print(f"  - {name:.<30} {pct:>6.2f}% ({kg:>7.2f} kg)")

        print("\n--- VALORES NUTRICIONALES FINALES ---")
        for nut_id, val in result.actual_nutrients.items():
            unit = next((n.unit for n in nutrients if n.id == nut_id), '')
            print(f"  * {nut_id.capitalize():.<15}: {val:>8.2f} {unit}")

        print("\n--- ANÁLISIS DE PRECIOS SOMBRA (Oportunidad) ---")
        for const_name, pi in result.shadow_prices.items():
            if abs(pi) > 0.0001:
                print(f"  > {const_name:.<25}: {pi:>8.4f} (impacto en costo)")
    else:
        print(f"❌ FALLO: {result.status}. No hay solución con los parámetros dados.")

run_complex_stress_test(parsed_ingredients, parsed_nutrients)

def apply_ingredient_safety_limits(ingredient_name: str) -> dict:
    """Calculates inclusion limits based on ingredient keywords."""
    name_up = ingredient_name.upper()
    limits = {}

    # Safety logic based on professional feed formulation standards
    if 'SAL' in name_up and 'SALVADO' not in name_up:
        limits['max'] = 0.5
    elif 'BICARBONATO' in name_up:
        limits['max'] = 0.3
    elif 'CARBONATO' in name_up or 'CALIZA' in name_up:
        limits['max'] = 12.0

    return limits

# Refactor the ingredient processing to use the modular function
updated_ingredients = []
for ing in parsed_ingredients:
    # Update limits using the new function
    ing.limits = apply_ingredient_safety_limits(ing.name)
    updated_ingredients.append(ing)

# Verification of the refactored logic
print("--- Verificación de Límites de Seguridad Refactorizados ---")
test_keywords = ['SAL', 'SALVADILLO', 'BICARBONATO SODICO', 'CALIZA 34', 'MAIZ']
for kw in test_keywords:
    limit_result = apply_ingredient_safety_limits(kw)
    print(f"Ingrediente: {kw:<20} | Límites detectados: {limit_result}")

# Re-assign to global variable to maintain consistency in subsequent cells
parsed_ingredients = updated_ingredients

def run_toggle_simulation(diet_label, df_bases, ingredients, nutrients, batch_size=1000.0):
    # 1. Identify rows for critical nutrients
    label_col = df_bases.columns[0]
    req_rows = {}
    for idx, row in df_bases.iterrows():
        label = str(row[label_col]).upper()
        if 'PROTE' in label: req_rows['protein'] = idx
        elif 'ENERG' in label: req_rows['energy'] = idx
        elif 'CALCIO' in label: req_rows['calcium'] = idx
        elif 'FÓSFORO' in label: req_rows['phosphorus'] = idx

    # 2. Get the specific diet column
    diet_col = next((col for col in df_bases.columns if diet_label in col), None)
    if not diet_col:
        print(f"Error: Dieta {diet_label} no encontrada.")
        return

    scenarios = ["Escenario Base", "Escenario con Buffer"]
    results = []

    for scenario in scenarios:
        diet_constraints = []
        for nut_id, row_idx in req_rows.items():
            val = pd.to_numeric(df_bases.at[row_idx, diet_col], errors='coerce')
            if not pd.isna(val) and val > 0:
                if scenario == "Escenario con Buffer":
                    margin = 1.05 if nut_id != 'energy' else 1.10
                    diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * margin))
                else:
                    # Escenario Base: Margen mínimo (0.1% for convergence)
                    diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * 1.001))

        product = Product(id=f"{diet_label}_{scenario.replace(' ', '_')}", name=f"{diet_label} ({scenario})", constraints=diet_constraints)
        res = solve_feed_formulation_python(product, ingredients, nutrients, batch_size=batch_size)
        results.append({"scenario": scenario, "res": res})

    # 3. Print Comparative Table
    print(f"\n{'='*70}")
    print(f"COMPARATIVA DE IMPACTO: {diet_label}")
    print(f"{'='*70}")
    print(f"{'Métrica':<25} | {'Base (Fijo)':>18} | {'Con Buffer':>18}")
    print(f"{'-'*70}")

    base = results[0]['res']
    buff = results[1]['res']

    if base.feasible and buff.feasible:
        print(f"{'Costo Batch (1000kg)':<25} | ${base.total_batch_cost:>17.2f} | ${buff.total_batch_cost:>17.2f}")
        print(f"{'Proteína lograda (%)':<25} | {base.actual_nutrients.get('protein', 0):>18.3f} | {buff.actual_nutrients.get('protein', 0):>18.3f}")
        print(f"{'Energía (kcal/kg)':<25} | {base.actual_nutrients.get('energy', 0):>18.3f} | {buff.actual_nutrients.get('energy', 0):>18.3f}")
        print(f"{'Calcio (%)':<25} | {base.actual_nutrients.get('calcium', 0):>18.3f} | {buff.actual_nutrients.get('calcium', 0):>18.3f}")

        cost_diff = buff.total_batch_cost - base.total_batch_cost
        print(f"{'-'*70}")
        print(f"Impacto Económico del Buffer: ${cost_diff:.2f} ({(cost_diff/base.total_batch_cost)*100:.2f}%)")
        print("\nConclusión Técnica: El Escenario con Buffer permite al solver buscar una mezcla\nmás económica al no estar forzado a valores exactos, o garantiza una densidad\nnutricional superior para compensar variaciones de materias primas.")
    else:
        print("Error: Uno de los escenarios resultó infactible para la comparación.")

# Ejecutar simulación para 'Pollita 0-3'
run_toggle_simulation('Pollita        0-3', df_bases_nutricionales, parsed_ingredients, parsed_nutrients)

import pandas as pd

def run_massive_comparative_simulation(df_bases, ingredients, nutrients):
    label_col = df_bases.columns[0]
    diet_columns = [col for col in df_bases.columns if col != label_col]

    # Identify critical nutrient rows
    req_rows = {}
    for idx, row in df_bases.iterrows():
        label = str(row[label_col]).upper()
        if 'PROTE' in label: req_rows['protein'] = idx
        elif 'ENERG' in label: req_rows['energy'] = idx
        elif 'CALCIO' in label: req_rows['calcium'] = idx
        elif 'FÓSFORO' in label: req_rows['phosphorus'] = idx

    comparison_data = []

    print(f"--- Iniciando Simulación Comparativa para {len(diet_columns)} Dietas ---")

    for diet_name in diet_columns:
        results_per_diet = {}

        for scenario in ["Base", "Buffer"]:
            diet_constraints = []
            for nut_id, row_idx in req_rows.items():
                val = pd.to_numeric(df_bases.at[row_idx, diet_name], errors='coerce')
                if not pd.isna(val) and val > 0:
                    if scenario == "Buffer":
                        margin = 1.05 if nut_id != 'energy' else 1.10
                        diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * margin))
                    else:
                        # Base Scenario: 0.1% margin for numerical stability
                        diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * 1.001))

            product = Product(id=f"SIM_{scenario}_{diet_name[:10]}", name=diet_name, constraints=diet_constraints)
            res = solve_feed_formulation_python(product, ingredients, nutrients, batch_size=1000.0)
            results_per_diet[scenario] = res

        # Extract data if both scenarios converged
        base_res = results_per_diet["Base"]
        buff_res = results_per_diet["Buffer"]

        if base_res.feasible and buff_res.feasible:
            diff_abs = buff_res.total_batch_cost - base_res.total_batch_cost
            diff_pct = (diff_abs / base_res.total_batch_cost) * 100 if base_res.total_batch_cost != 0 else 0

            comparison_data.append({
                "Dieta": diet_name.strip(),
                "Costo_Base": round(base_res.total_batch_cost, 2),
                "Costo_Buffer": round(buff_res.total_batch_cost, 2),
                "Diferencia_Abs": round(diff_abs, 2),
                "Diferencia_Pct": round(diff_pct, 4)
            })

    # Convert to DataFrame
    df_result = pd.DataFrame(comparison_data)
    return df_result

# Execute simulation
df_comparativo_masivo = run_massive_comparative_simulation(df_bases_nutricionales, parsed_ingredients, parsed_nutrients)

# Display summary
print("\n--- Resumen de Impacto Económico (Buffer vs Base) ---")
display(df_comparativo_masivo)

avg_saving = df_comparativo_masivo['Diferencia_Pct'].mean()
print(f"\nImpacto promedio del buffer en el costo: {avg_saving:.4f}%")



def run_massive_comparative_simulation_cleaned(df_bases, ingredients, nutrients):
    label_col = df_bases.columns[0]
    diet_columns = [col for col in df_bases.columns if col != label_col]

    # Identify critical nutrient rows
    req_rows = {}
    for idx, row in df_bases.iterrows():
        label = str(row[label_col]).upper()
        if 'PROTE' in label: req_rows['protein'] = idx
        elif 'ENERG' in label: req_rows['energy'] = idx
        elif 'CALCIO' in label: req_rows['calcium'] = idx
        elif 'F3SFORO' in label: req_rows['phosphorus'] = idx

    comparison_data = []

    print(f"--- Iniciando Simulaci3n Comparativa Depurada para {len(diet_columns)} Dietas ---")

    for diet_name in diet_columns:
        # Step 3 & 4: Clean the diet name for PuLP ID requirements
        clean_name = str(diet_name).replace('\n', ' ').strip()
        pulp_safe_id = clean_name.replace(' ', '_')

        results_per_diet = {}

        for scenario in ["Base", "Buffer"]:
            diet_constraints = []
            for nut_id, row_idx in req_rows.items():
                val = pd.to_numeric(df_bases.at[row_idx, diet_name], errors='coerce')
                if not pd.isna(val) and val > 0:
                    if scenario == "Buffer":
                        margin = 1.05 if nut_id != 'energy' else 1.10
                        diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * margin))
                    else:
                        diet_constraints.append(Constraint(nutrientId=nut_id, min=val, max=val * 1.001))

            # Use pulp_safe_id for the ID to avoid warnings
            product = Product(id=f"{scenario}_{pulp_safe_id}"[:100], name=clean_name, constraints=diet_constraints)
            res = solve_feed_formulation_python(product, ingredients, nutrients, batch_size=1000.0)
            results_per_diet[scenario] = res

        base_res = results_per_diet["Base"]
        buff_res = results_per_diet["Buffer"]

        if base_res.feasible and buff_res.feasible:
            diff_abs = buff_res.total_batch_cost - base_res.total_batch_cost
            diff_pct = (diff_abs / base_res.total_batch_cost) * 100 if base_res.total_batch_cost != 0 else 0

            comparison_data.append({
                "Dieta": clean_name,
                "Costo_Base": round(base_res.total_batch_cost, 2),
                "Costo_Buffer": round(buff_res.total_batch_cost, 2),
                "Diferencia_Abs": round(diff_abs, 2),
                "Diferencia_Pct": round(diff_pct, 4)
            })

    return pd.DataFrame(comparison_data)

# Execute and save to global variable
df_comparativo_masivo = run_massive_comparative_simulation_cleaned(df_bases_nutricionales, parsed_ingredients, parsed_nutrients)
print("\n--- Simulaci3n completada sin advertencias de nombres ---")
display(df_comparativo_masivo.head())


import matplotlib.pyplot as plt
import seaborn as sns

# 2. Restructure the DataFrame from wide to long format (tidy data)
df_plot = pd.melt(
    df_comparativo_masivo,
    id_vars=['Dieta'],
    value_vars=['Costo_Base', 'Costo_Buffer'],
    var_name='Escenario',
    value_name='Costo_Batch'
)

# Clean Scenario names for the legend
df_plot['Escenario'] = df_plot['Escenario'].replace({'Costo_Base': 'Base (Fijo)', 'Costo_Buffer': 'Con Buffer'})

# 3. Configure visual style and figure size
sns.set_theme(style="whitegrid")
plt.figure(figsize=(14, 7))

# 4. Create the grouped bar chart
ax = sns.barplot(
    data=df_plot,
    x='Dieta',
    y='Costo_Batch',
    hue='Escenario',
    palette='viridis'
)

# 5. Add descriptive labels and title
plt.title('Impacto del Buffer Nutricional en el Costo por Dieta (Batch 1000kg)', fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Fase de Producción / Dieta', fontsize=12)
plt.ylabel('Costo del Batch ($)', fontsize=12)
plt.xticks(rotation=45, ha='right')
plt.legend(title='Configuración', bbox_to_anchor=(1.05, 1), loc='upper left')

# Add values on top of bars for precision
for container in ax.containers:
    ax.bar_label(container, fmt='$%.0f', padding=3, fontsize=9, rotation=0)

plt.tight_layout()

# 6. Show the plot
plt.show()
