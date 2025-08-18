// PROTOTIPO NO UTILIZADO - TODO EL CÓDIGO COMENTADO
// "use client"

// import { useEffect, useState } from "react"
// import { usePlanForm } from "@/contexts/plan-form-context"
// import FormStep from "../form-step"
// import SelectionCard from "../selection-card"

// export default function RecipesStep() {
//   const { formData, updateFormData } = usePlanForm()
//   const [selectedRecipes, setSelectedRecipes] = useState<string[]>(formData.selectedRecipes || [])
//   const [petName, setPetName] = useState(formData.name)

//   // Actualizar el estado global cuando cambian las recetas seleccionadas
//   useEffect(() => {
//     updateFormData({ selectedRecipes })
//   }, [selectedRecipes, updateFormData])

//   // Actualizar el nombre local cuando cambia en el contexto
//   useEffect(() => {
//     setPetName(formData.name)
//   }, [formData.name])

//   const toggleRecipe = (recipeId: string) => {
//     setSelectedRecipes(prev => 
//       prev.includes(recipeId)
//         ? prev.filter(id => id !== recipeId)
//         : [...prev, recipeId]
//     )
//   }

//   const recipes = [
//     {
//       id: "chicken-rice",
//       name: "Pollo con Arroz",
//       description: "Receta clásica con pollo fresco y arroz integral",
//       ingredients: ["Pollo", "Arroz integral", "Zanahorias", "Guisantes"],
//       icon: "🍗"
//     },
//     {
//       id: "beef-sweet-potato",
//       name: "Carne con Batata",
//       description: "Deliciosa combinación de carne de res y batata dulce",
//       ingredients: ["Carne de res", "Batata", "Brócoli", "Espinacas"],
//       icon: "🥩"
//     },
//     {
//       id: "fish-quinoa",
//       name: "Pescado con Quinoa",
//       description: "Receta rica en omega-3 con pescado fresco",
//       ingredients: ["Salmón", "Quinoa", "Calabaza", "Apio"],
//       icon: "🐟"
//     },
//     {
//       id: "turkey-vegetables",
//       name: "Pavo con Vegetales",
//       description: "Pavo magro con una mezcla de vegetales frescos",
//       ingredients: ["Pavo", "Calabacín", "Zanahorias", "Judías verdes"],
//       icon: "🦃"
//     }
//   ]

//   return (
//     <FormStep 
//       stepNumber={8} 
//       title={`¿Qué recetas le gustarían a ${petName}?`} 
//       highlightedWord={petName}
//       infoText="Selecciona las recetas que crees que más le gustarán a tu mascota. Puedes elegir varias opciones."
//     >
//       <div className="w-full max-w-4xl mx-auto">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           {recipes.map((recipe) => (
//             <SelectionCard
//               key={recipe.id}
//               selected={selectedRecipes.includes(recipe.id)}
//               onClick={() => toggleRecipe(recipe.id)}
//               icon={
//                 <div className="text-4xl mb-3">{recipe.icon}</div>
//               }
//               label={
//                 <div className="text-left space-y-2">
//                   <h3 className="text-lg font-bold text-center">{recipe.name}</h3>
//                   <p className="text-sm text-gray-600 text-center">{recipe.description}</p>
//                   <div className="pt-2">
//                     <p className="text-xs font-medium text-gray-700 mb-1">Ingredientes principales:</p>
//                     <div className="flex flex-wrap gap-1">
//                       {recipe.ingredients.map((ingredient, index) => (
//                         <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
//                           {ingredient}
//                         </span>
//                       ))}
//                     </div>
//                   </div>
//                 </div>
//               }
//             />
//           ))}
//         </div>

//         {selectedRecipes.length > 0 && (
//           <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
//             <h3 className="text-lg font-bold text-green-800 mb-3 text-center">
//               Recetas seleccionadas para {petName}:
//             </h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//               {selectedRecipes.map((recipeId) => {
//                 const recipe = recipes.find(r => r.id === recipeId)
//                 return (
//                   <div key={recipeId} className="flex items-center p-3 bg-white rounded-lg border border-green-200">
//                     <span className="text-2xl mr-3">{recipe?.icon}</span>
//                     <div>
//                       <p className="font-medium text-green-800">{recipe?.name}</p>
//                       <p className="text-sm text-green-600">{recipe?.description}</p>
//                     </div>
//                   </div>
//                 )
//               })}
//             </div>
//             <p className="text-sm text-green-700 mt-4 text-center">
//               ¡Excelente! {petName} tendrá una dieta variada y deliciosa.
//             </p>
//           </div>
//         )}

//         <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
//           <p className="text-sm text-blue-700 text-center">
//             💡 <strong>Consejo:</strong> Una dieta variada ayuda a mantener el interés de tu mascota en la comida 
//             y asegura una nutrición completa.
//           </p>
//         </div>
//       </div>
//     </FormStep>
//   )
// }
