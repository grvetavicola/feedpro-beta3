import solver from 'javascript-lp-solver';

var model = {
    "optimize": "cost",
    "opType": "min",
    "constraints": {
        "nut1": {"min": 10, "max": 20}
    },
    "variables": {
        "ing1": {
            "nut1": 5,
            "cost": 2
        },
        "ing2": {
            "nut1": 15,
            "cost": 10
        }
    }
};

var res1 = solver.Solve(model, false, true); 
console.log(Object.keys(res1));
if (res1.tableau) {
    console.log("Tableau properties:", Object.keys(res1.tableau));
}
