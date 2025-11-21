/**
 * Script para agrupar productos con variantes y eliminar productos con datos antiguos
 * 
 * Analiza productos que comparten el mismo nombre base pero tienen diferentes ingredientes
 * y los agrupa como variantes de un único producto principal.
 * 
 * Ejemplo: "Pastel Amore Mio Pollo", "Pastel Amore Mio Carne", "Pastel Amore Mio Ternera"
 * Se convierten en: "Pastel Amore Mio" con variantes: Pollo, Carne, Ternera
 */

interface Product {
  idx: number;
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  image: string;
  category_id: number;
  featured: boolean;
  stock: number;
  product_type: string;
  ingredients: string;
}

interface ProductGroup {
  baseName: string;
  products: Product[];
  variants: string[];
  mainProduct: Product; // Producto que se mantendrá
  productsToDelete: number[]; // IDs de productos a eliminar
}

// Patrones comunes de variantes en nombres
const VARIANT_PATTERNS = [
  /\s+(Pollo|Carne|Ternera|Cordero|Atún|Hígado)$/i,
  /\s+(Pollo Verduras|Carne Verduras|Pollo y Verduras|Carne y Verduras)$/i,
  /\s+(Cordero y Espinaca|Ternera y Zanahoria|Ternera y Espinaca)$/i,
  /\s+(Cordero, Arroz y Zanahoria|Cordero y Arroz)$/i,
];

/**
 * Extrae el nombre base del producto removiendo la variante
 */
function extractBaseName(productName: string): string {
  let baseName = productName.trim();
  
  // Remover variantes del final del nombre
  for (const pattern of VARIANT_PATTERNS) {
    baseName = baseName.replace(pattern, '');
  }
  
  return baseName.trim();
}

/**
 * Extrae el nombre de la variante del nombre del producto
 */
function extractVariantName(productName: string): string | null {
  for (const pattern of VARIANT_PATTERNS) {
    const match = productName.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Agrupa productos por su nombre base
 */
function groupProductsByBaseName(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, Product[]>();
  
  for (const product of products) {
    // Solo agrupar productos marcados como "variable"
    if (product.product_type !== 'variable') {
      continue;
    }
    
    const baseName = extractBaseName(product.name);
    const variantName = extractVariantName(product.name);
    
    // Solo agrupar si tiene una variante identificable
    if (!variantName) {
      continue;
    }
    
    if (!groups.has(baseName)) {
      groups.set(baseName, []);
    }
    
    groups.get(baseName)!.push(product);
  }
  
  return groups;
}

/**
 * Selecciona el producto principal (el que se mantendrá) y los que se eliminarán
 */
function selectMainProduct(products: Product[]): ProductGroup {
  // Criterios de selección (en orden de prioridad):
  // 1. Producto con stock > 0
  // 2. Producto featured
  // 3. Producto con ID más bajo (más antiguo)
  
  const sorted = [...products].sort((a, b) => {
    // Priorizar productos con stock
    if (a.stock > 0 && b.stock === 0) return -1;
    if (a.stock === 0 && b.stock > 0) return 1;
    
    // Priorizar productos destacados
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    
    // Priorizar productos más antiguos (ID menor)
    return a.id - b.id;
  });
  
  const mainProduct = sorted[0];
  const baseName = extractBaseName(mainProduct.name);
  const variants = products.map(p => extractVariantName(p.name)!).filter(Boolean);
  const productsToDelete = sorted.slice(1).map(p => p.id);
  
  return {
    baseName,
    products,
    variants,
    mainProduct,
    productsToDelete,
  };
}

/**
 * Genera SQL para crear las variantes
 */
function generateVariantInsertSQL(group: ProductGroup): string {
  const sqls: string[] = [];
  
  group.products.forEach((product, index) => {
    const variantName = extractVariantName(product.name)!;
    const displayOrder = index + 1;
    
    sqls.push(`
-- Variante: ${variantName}
INSERT INTO product_variants (
  product_id,
  sku,
  name,
  price,
  stock,
  image,
  display_order,
  is_active,
  track_inventory,
  attributes
) VALUES (
  ${group.mainProduct.id},
  '${product.slug}-${variantName.toLowerCase().replace(/\s+/g, '-')}',
  '${variantName}',
  ${product.price},
  ${product.stock},
  '${product.image}',
  ${displayOrder},
  true,
  true,
  '{"ingredient": "${variantName}"}'::jsonb
);`);
  });
  
  return sqls.join('\n');
}

/**
 * Genera SQL para eliminar productos duplicados
 */
function generateDeleteSQL(group: ProductGroup): string {
  if (group.productsToDelete.length === 0) {
    return '-- No hay productos a eliminar';
  }
  
  return `
-- Eliminar productos duplicados (se mantiene el ID ${group.mainProduct.id})
DELETE FROM products WHERE id IN (${group.productsToDelete.join(', ')});`;
}

/**
 * Genera SQL para actualizar el producto principal
 */
function generateUpdateSQL(group: ProductGroup): string {
  return `
-- Actualizar producto principal: ${group.baseName}
UPDATE products 
SET 
  name = '${group.baseName}',
  product_type = 'variable',
  updated_at = NOW()
WHERE id = ${group.mainProduct.id};`;
}

/**
 * Función principal
 */
function main() {
  const productsData: Product[] = [
    {"idx":0,"id":28,"name":"Galletas mini de pollo x 24 unidades","slug":"galletas-mini-dakini","description":"Las galletas mini de pollo para perros Pet Gourmet, son perfectas para entrenarlo con amor.\nHechas con pechuga de pollo y el tamaño ideal para usar como snack permanente en procesos de entrenamiento.\n\nGalletas para perros con ingredientes 100% naturales y proteínas premium.\n\n24 Galletas de pollo.\nVigencia: 8 días\n\nCada porción depende del tamaño y apetito del perro. Se recomienda administrar con moderación.\n\nPet Gourmet, galletas para perro, alimento premium.","price":"155.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1746638045/products/xdtir5jkek2clkgc5t8v.webp","category_id":1,"featured":false,"stock":20,"created_at":"2025-05-07 17:14:27.891985+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"Composición garantizada con ingredientes 100% naturales:\n\nHumedad máx. 23.2%\nProteína máx. 20.9%\nGrasa min. 5.1%\nFibra máx. 0.8%\nCenizas máx. 1.9% ","ingredients":"Pollo","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":1,"id":31,"name":" Pastel de cumpleaños Amore Mio Ternera","slug":"pastel-de-cumpleanos-amore-mio-1","description":"Viene en la presentación preferida por los que aman a sus peludos y quieren demostrárselo:\nReceta de proteína (pollo, carne o ternera) y verduras.\nPresentación de 400 gramos. 4 porciones.\nVigencia de hasta 6 días bajo refrigeración.\nRecetas con proteína, verduras y hortalizas.\nAlimento para perros con receta especial de Pet Gourmet. Cada porción depende del tamaño y apetito del perro.\nSe recomienda administrar con moderación, 100 gramos por perro como máximo. \nPet Gourmet, alimento premium para perros.\n","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp","category_id":2,"featured":false,"stock":0,"created_at":"2025-05-07 17:35:19.675139+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Pollo, carne o ternera, y verduras.\n","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":2,"id":36,"name":" Pastel de cumpleaños Fiesta Pollo","slug":"pastel-de-cumpleanos-fiesta","description":"Espectacular pastel para celebrar los cumpleaños de tu perro.\nEl pastel Fiesta Reina, hará que todos los paladares caninos se rindan ante la cubierta de betabel crocante y huesitos de galleta de pollo, no quedará ni una migaja sobre la mesa.\n\nVigencia: 6 días bajo refrigeración y 3 meses en congelador.\nPresentación de 400 gramos. 4 porciones.\nCada porción depende del tamaño y apetito del perro. Se recomienda administrar con moderación. \n\nPet Gourmet, alimento premium para perros.\n","price":"349.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1746640041/products/hjfzchwjxa1mmuj5qbmh.jpg","category_id":2,"featured":false,"stock":20,"created_at":"2025-05-07 17:47:10.505791+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Receta de proteína a elegir (pollo, carne, ternera o cordero) y verduras.\n","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":3,"id":37,"name":"Pastel de cumpleaños Huella Pollo Verduras","slug":"pastel-de-cumpleanos-huella","description":"El pastel para perros Huella, es una de las recetas clásicas de Pet Gourmet.\nUna deliciosa preparación compacta de proteína real (90%) y otros ingredientes naturales para hacer un cumpleaños inolvidable.\n\nVigencia: 6 días bajo refrigeración y 3 meses en congelador.\n\nPorciones por tamaño:\nPerronal 400 gramos. 4 porciones\nCada porción depende del tamaño y apetito del perro. Se recomienda administrar con moderación, 100 gramos por perro como máximo. \n\nPet Gourmet, alimento premium para perros.","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1746640132/products/g6ekf60zmt0c5hr0o80y.jpg","category_id":2,"featured":true,"stock":12,"created_at":"2025-05-07 17:48:17.663589+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Receta de pollo o carne y verduras.","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":30,"id":79,"name":"Pastel de cumpleaños Huella Pollo","slug":"pastel-de-cumpleanos-huella-copia-1755023655519","description":"El pastel para perros Huella, es una de las recetas clásicas de Pet Gourmet.\nUna deliciosa preparación compacta de proteína real (90%) y otros ingredientes naturales para hacer un cumpleaños inolvidable.\n\nVigencia: 6 días bajo refrigeración y 3 meses en congelador.\n\nPorciones por tamaño:\nPerronal 400 gramos. 4 porciones\nCada porción depende del tamaño y apetito del perro. Se recomienda administrar con moderación, 100 gramos por perro como máximo. \n\nPet Gourmet, alimento premium para perros.","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1746640132/products/g6ekf60zmt0c5hr0o80y.jpg","category_id":2,"featured":true,"stock":12,"created_at":"2025-08-12 18:34:15.857111+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Receta de pollo o carne y verduras.","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":31,"id":80,"name":"Pastel de cumpleaños Huella Carne","slug":"pastel-de-cumpleanos-huella-1","description":"El pastel para perros Huella, es una de las recetas clásicas de Pet Gourmet.\nUna deliciosa preparación compacta de proteína real (90%) y otros ingredientes naturales para hacer un cumpleaños inolvidable.\n\nVigencia: 6 días bajo refrigeración y 3 meses en congelador.\n\nPorciones por tamaño:\nPerronal 400 gramos. 4 porciones\nCada porción depende del tamaño y apetito del perro. Se recomienda administrar con moderación, 100 gramos por perro como máximo. \n\nPet Gourmet, alimento premium para perros.","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1746640132/products/g6ekf60zmt0c5hr0o80y.jpg","category_id":2,"featured":true,"stock":12,"created_at":"2025-08-12 18:39:15.989226+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Receta de pollo o carne y verduras.","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":32,"id":81,"name":" Pastel de cumpleaños Amore Mio Pollo","slug":"pastel-de-cumpleanos-amore-mio-carne-1","description":"Viene en la presentación preferida por los que aman a sus peludos y quieren demostrárselo:\nReceta de proteína (pollo, carne o ternera) y verduras.\nPresentación de 400 gramos. 4 porciones.\nVigencia de hasta 6 días bajo refrigeración.\nRecetas con proteína, verduras y hortalizas.\nAlimento para perros con receta especial de Pet Gourmet. Cada porción depende del tamaño y apetito del perro.\nSe recomienda administrar con moderación, 100 gramos por perro como máximo. \nPet Gourmet, alimento premium para perros.\n","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp","category_id":2,"featured":false,"stock":20,"created_at":"2025-08-12 19:07:31.973855+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Pollo, carne o ternera, y verduras.\n","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":33,"id":82,"name":" Pastel de cumpleaños Amore Mio Carne","slug":"pastel-de-cumpleanos-amore-mio-carne-2","description":"Viene en la presentación preferida por los que aman a sus peludos y quieren demostrárselo:\nReceta de proteína (pollo, carne o ternera) y verduras.\nPresentación de 400 gramos. 4 porciones.\nVigencia de hasta 6 días bajo refrigeración.\nRecetas con proteína, verduras y hortalizas.\nAlimento para perros con receta especial de Pet Gourmet. Cada porción depende del tamaño y apetito del perro.\nSe recomienda administrar con moderación, 100 gramos por perro como máximo. \nPet Gourmet, alimento premium para perros.\n","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp","category_id":2,"featured":false,"stock":0,"created_at":"2025-08-12 19:20:51.648855+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Pollo, carne o ternera, y verduras.\n","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":34,"id":83,"name":" Pastel de cumpleaños Amore Mio Pollo Verduras","slug":"pastel-de-cumpleanos-amore-mio","description":"Viene en la presentación preferida por los que aman a sus peludos y quieren demostrárselo:\nReceta de proteína (pollo, carne o ternera) y verduras.\nPresentación de 400 gramos. 4 porciones.\nVigencia de hasta 6 días bajo refrigeración.\nRecetas con proteína, verduras y hortalizas.\nAlimento para perros con receta especial de Pet Gourmet. Cada porción depende del tamaño y apetito del perro.\nSe recomienda administrar con moderación, 100 gramos por perro como máximo. \nPet Gourmet, alimento premium para perros.\n","price":"319.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1749168981/products/mmh6tsvghyfryya6gnun.webp","category_id":2,"featured":false,"stock":0,"created_at":"2025-08-12 19:23:07.805982+00","updated_at":"2025-11-21 17:49:44.471647+00","nutritional_info":"","ingredients":"Pollo, carne o ternera, y verduras.\n","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"[\"weekly\", \"biweekly\", \"monthly\"]","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
    {"idx":35,"id":87,"name":" Pastel de cumpleaños Fiesta Carne","slug":"pastel-de-cumpleanos-fiesta-1","description":"Espectacular pastel para celebrar los cumpleaños de tu perro.\nEl pastel Fiesta Reina, hará que todos los paladares caninos se rindan ante la cubierta de betabel crocante y huesitos de galleta de pollo, no quedará ni una migaja sobre la mesa.\n\nVigencia: 6 días bajo refrigeración y 3 meses en congelador.\nPresentación de 400 gramos. 4 porciones.\nCada porción depende del tamaño y apetito del perro. Se recomienda administrar con moderación. \n\nPet Gourmet, alimento premium para perros.\n","price":"349.00","image":"https://res.cloudinary.com/dn7unepxa/image/upload/v1746640041/products/hjfzchwjxa1mmuj5qbmh.jpg","category_id":2,"featured":false,"stock":0,"created_at":"2025-08-12 19:57:37.635786+00","updated_at":"2025-11-21 20:23:27.164005+00","nutritional_info":"","ingredients":"Receta de proteína a elegir (pollo, carne, ternera o cordero) y verduras.\n","rating":"4.50","reviews_count":10,"purchase_types":"[\"single\"]","subscription_discount":10,"average_rating":"4.50","review_count":0,"nutrition_info":"{}","sale_type":"unit","weight_reference":null,"subscription_available":true,"subscription_types":"\"[\\\"weekly\\\",\\\"biweekly\\\",\\\"monthly\\\"]\"","monthly_discount":"10.00","quarterly_discount":null,"annual_discount":null,"biweekly_discount":15,"weekly_discount":"15.00","product_type":"variable"},
  ];

  console.log('🔍 Analizando productos para agrupar por variantes...\n');
  
  const groups = groupProductsByBaseName(productsData);
  const productGroups: ProductGroup[] = [];
  
  groups.forEach((products, baseName) => {
    if (products.length > 1) {
      const group = selectMainProduct(products);
      productGroups.push(group);
    }
  });
  
  console.log(`📊 Se encontraron ${productGroups.length} grupos de productos con variantes\n`);
  
  // Generar reporte
  console.log('=' .repeat(80));
  console.log('REPORTE DE AGRUPACIÓN DE PRODUCTOS');
  console.log('='.repeat(80));
  console.log('');
  
  productGroups.forEach((group, index) => {
    console.log(`\n${index + 1}. ${group.baseName}`);
    console.log(`   Producto principal (ID ${group.mainProduct.id}): ${group.mainProduct.name}`);
    console.log(`   Variantes encontradas: ${group.variants.join(', ')}`);
    console.log(`   Productos a eliminar: ${group.productsToDelete.length}`);
    group.productsToDelete.forEach(id => {
      const product = group.products.find(p => p.id === id);
      console.log(`     - ID ${id}: ${product?.name}`);
    });
  });
  
  // Generar SQL
  console.log('\n\n' + '='.repeat(80));
  console.log('SQL PARA AGRUPAR PRODUCTOS');
  console.log('='.repeat(80));
  console.log(`
-- ============================================================================
-- Script de Migración: Agrupar Productos con Variantes
-- Fecha: ${new Date().toISOString()}
-- 
-- Este script:
-- 1. Elimina variantes antiguas de la migración automática
-- 2. Crea variantes correctas para productos agrupados
-- 3. Elimina productos duplicados
-- 4. Actualiza nombres de productos principales
-- ============================================================================

BEGIN;

-- PASO 1: Eliminar variantes antiguas de la migración automática
-- Estas son variantes con nombre "400 gr" que se crearon automáticamente
DELETE FROM product_variants 
WHERE name = '400 gr' 
  AND created_at::date = '2025-11-21'
  AND product_id IN (${Array.from(new Set(productGroups.flatMap(g => g.products.map(p => p.id)))).join(', ')});

`);
  
  productGroups.forEach((group, index) => {
    console.log(`
-- ============================================================================
-- GRUPO ${index + 1}: ${group.baseName}
-- Producto principal: ID ${group.mainProduct.id}
-- Variantes: ${group.variants.join(', ')}
-- ============================================================================
`);
    
    console.log(generateUpdateSQL(group));
    console.log(generateVariantInsertSQL(group));
    console.log(generateDeleteSQL(group));
  });
  
  console.log(`
-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Ver productos agrupados
SELECT 
  p.id,
  p.name,
  p.product_type,
  COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE p.id IN (${productGroups.map(g => g.mainProduct.id).join(', ')})
GROUP BY p.id, p.name, p.product_type
ORDER BY p.id;

-- Ver variantes creadas
SELECT 
  pv.id,
  pv.product_id,
  p.name as product_name,
  pv.name as variant_name,
  pv.price,
  pv.stock,
  pv.display_order
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.product_id IN (${productGroups.map(g => g.mainProduct.id).join(', ')})
ORDER BY pv.product_id, pv.display_order;

COMMIT;

-- Si algo salió mal, ejecuta: ROLLBACK;
`);
  
  // Resumen final
  const totalProductsToDelete = productGroups.reduce((sum, g) => sum + g.productsToDelete.length, 0);
  const totalVariantsToCreate = productGroups.reduce((sum, g) => sum + g.products.length, 0);
  
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN');
  console.log('='.repeat(80));
  console.log(`Grupos encontrados: ${productGroups.length}`);
  console.log(`Productos a eliminar: ${totalProductsToDelete}`);
  console.log(`Variantes a crear: ${totalVariantsToCreate}`);
  console.log(`Productos principales: ${productGroups.length}`);
  console.log('');
  console.log('⚠️  IMPORTANTE:');
  console.log('1. Revisa el SQL generado antes de ejecutarlo');
  console.log('2. Haz un backup de la base de datos');
  console.log('3. Ejecuta el SQL en una transacción (BEGIN/COMMIT)');
  console.log('4. Verifica los resultados con las consultas de verificación');
  console.log('5. Si algo sale mal, ejecuta ROLLBACK');
  console.log('='.repeat(80));
}

// Ejecutar
main();
