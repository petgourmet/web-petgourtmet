import { Leaf, Shield, Heart, Award, Droplets, Utensils } from "lucide-react"
import type { FAQ, Benefit, FoodToAvoid, Testimonial } from "@/types/nutrition"
import type { PanelData } from "@/types/nutrition" // Import PanelData to avoid redeclaration

export const benefits: Benefit[] = [
  {
    icon: Leaf,
    title: "100% Natural",
    description: "Ingredientes frescos y naturales sin aditivos artificiales, conservantes ni colorantes.",
  },
  {
    icon: Shield,
    title: "Sistema inmunológico fuerte",
    description: "Nutrientes esenciales que fortalecen las defensas naturales de tu mascota.",
  },
  {
    icon: Heart,
    title: "Salud digestiva",
    description: "Fórmulas que promueven una digestión saludable y una mejor absorción de nutrientes.",
  },
  {
    icon: Award,
    title: "Calidad premium",
    description: "Ingredientes de la más alta calidad seleccionados cuidadosamente para tu mascota.",
  },
  {
    icon: Droplets,
    title: "Hidratación óptima",
    description: "Mayor contenido de humedad que ayuda a mantener a tu mascota hidratada.",
  },
  {
    icon: Utensils,
    title: "Sabor irresistible",
    description: "Recetas deliciosas que harán que tu mascota disfrute cada comida.",
  },
]

export const productQuestions: FAQ[] = [
  {
    question: "¿MI PERRO SÓLO COME CROQUETAS, PUEDO DARLE LAS RECETAS DE PET GOURMET SIN QUE LE HAGAN DAÑO?",
    answer:
      "Si se trata de probar nuestras recetas como snacks, en cantidades moderadas, no debería existir ningún problema. Pero por el contrario si tu perro desea incluir nuestros productos dentro de su dieta diaria, es necesario que al principio pruebe las recetas de Pet Gourmet en pocas cantidades y mezcladas con las croquetas habituales, incrementando poco a poco la proporción, como se acostumbra hacer cuando se cambia de marca de croquetas.\n\nPor otro lado no es recomendable que tu perro se alimente únicamente y exclusivamente de una fuente de alimento como el concentrado, las dietas horneadas o la dieta Barf. Además del tedio que esto representa, él necesita estar motivado en su dieta a través de alimentos naturales que le ayuden a tener una dieta variada y también pueda recibir los beneficios de los alimentos frescos y naturales no procesados. Así él nunca pruebe nuestras recetas, te invitamos a que de vez en cuando cocines para él un plato simple sin sal ni condimentos, como un trozo de pollo sin hueso o carne magra sin grasa. Además muchos nutricionistas caninos recomiendan darle fruta a los perros no sólo porque es una fuente rápida de energía (fructosa) sino porque son una importante fuente de nutrientes: FOS (fructo oligosacáridos) fibra soluble e insoluble, enzimas, antioxidantes y minerales, entre otros. Cuando un perro come frutas de forma regular su intestino se beneficia. La fibra y los fructo olisacáridos presentes tanto en la fruta como en los vegetales contribuyen a mejorar la salud intestinal del sistema digestivo porque alimentan la microflora benéfica presente en los intestinos, lo que a la vez reduce las bacterias patógenas como la E. Coli o salmonella. Nada mejor que un snack hecho con frutas, porque sabe dulce sin incluir azúcares artificiales y representa una saludable pausa en el día a día. Hay que considerar que la consistencia de las heces puede ponerse más blanda cuando se incluyen alimentos naturales en la dieta del perro, pero nunca deberá ser líquida porque esto significa que hay problema digestivo que debe consultarse al veterinario.",
  },
  {
    question: "¿MI PERRO ES APENAS UN CACHORRO, PUEDE PROBAR LAS RECETAS DE PET GOURMET?",
    answer: "Cualquier perro puede probar las recetas de Pet Gourmet después de los tres meses de edad.",
  },
  {
    question: "MI PERRO ES ALÉRGICO A ALGUNAS COMIDAS, ¿PUEDE PROBAR LAS RECETAS DE PET GOURMET?",
    answer:
      "Procuramos que los ingredientes que usamos en nuestras recetas estén lejos de producir alergias en nuestros amigos peludos. Por eso sólo usamos harinas integrales, proteínas de primera calidad y otros ingredientes comprobadamente saludables para ellos. Sin embargo nos hemos esforzado por buscar opciones para aquellos que tienen identificada una alergia a un ingrediente especial. Es el caso de nuestras galletas sin proteína y recetas especiales que usan ingredientes seleccionados como el cordero y el arroz.",
  },
  {
    question:
      "¿MI VETERINARIO DICE QUE NO LE DÉ A MI PERRO NADA DIFERENTE A LAS CROQUETAS, ENTONCES POR QUÉ DEBERÍA DARLE A PROBAR PRODUCTOS DE PET GOURMET?",
    answer:
      "Porque las recetas de Pet Gourmet cuentan con el respaldo de médicos veterinarios, buenas prácticas de manufactura y los mejores ingredientes seleccionados para ofrecer productos de excelente calidad. Además todos nuestros clientes y Chef, nuestra mascota oficial, son clara evidencia de la gran calidad de las recetas de Pet Gourmet.",
  },
  {
    question: "¿PUEDE UN PERRO ALIMENTARSE ÚNICAMENTE DE LAS RECETAS DE PET GOURMET?",
    answer:
      "Por supuesto que sí. Creemos ciegamente en lo que hacemos. Por eso Chef, nuestro perro que se ha convertido en la imagen de Pet Gourmet, se alimenta a diario de nuestras recetas que son complementadas por otros ingredientes naturales, vitaminas y omegas. Su dieta es balanceada y sigue recomendaciones veterinarias. Chef nunca ha probado un concentrado comercial. Si deseas que tu perro disfrute de una dieta al estilo Pet Gourmet no dudes en consultarnos.",
  },
  {
    question: "MI PERRO HA PERDIDO EL APETITO, NO QUIERE COMER NADA, ¿QUÉ PUEDO HACER?",
    answer:
      "Esta es una consulta frecuente y en estos casos es donde más nos gusta ayudar. Puedes comenzar a motivarlo de nuevo por el alimento con alguna de nuestras recetas mezclada con el concentrado habitual o uno nuevo recomendado por un veterinario. De esta forma él olerá, sentirá y probará que hay algo nuevo en la comida, algo realmente delicioso, y se sentirá atraído otra vez por el alimento a la hora de comer.",
  },
  {
    question: "¿POR CUÁNTO TIEMPO PUEDO CONSERVAR LAS RECETAS DE PET GOURMET?",
    answer:
      "Nuestros productos están catalogados como COMIDA PARA MASCOTAS DE NIVEL HUMANO, el máximo posible dentro del ranking que categoriza los alimentos para animales. Lo que significa que usamos ingredientes premium, los mismos usados en la cocina para personas. Nunca usamos subproductos de ninguna especie. Tampoco incluimos conservantes, saborizantes, colorizantes, aglutinantes ni ningún otro ingrediente artificial. Por eso todos nuestros productos de proteína húmeda tienen una vigencia solo de hasta 7 días REFRIGERADOS apropiadamente (preferiblemente en un recipiente hermético), a excepción de las galletas, las cuales recomendamos consumir antes de 30 días.",
  },
  {
    question: "¿POR QUÉ NO USAN CREMA O PASTILLAJE PARA DECORAR SUS PRODUCTOS?",
    answer:
      "Conocemos muy bien el estómago canino y por eso evitamos usar en nuestras recetas cualquier ingrediente que tenga riesgo de causarles algún malestar. Los que son usados generalmente para decorar, son ingredientes que contienen grasas saturadas y son elaborados a partir de azúcares industriales refinados, además de incluir colorantes artificiales. Sustancias nada saludables y pocas veces tolerables por el estómago de nuestros amigos peludos.",
  },
  {
    question: "¿QUÉ BENEFICIOS OBTIENE UN PERRO CON LOS PRODUCTOS DE PET GOURMET?",
    answer:
      "Hay que recordar que tarde o temprano los perros se cansan de comer siempre lo mismo y es apenas lógico. Por eso lo primero que tu perro gana con nuestras recetas es MOTIVACIÓN, gracias a la proteína de alta calidad, real y fresca que usamos en nuestras recetas ningún perro se resiste a comer. Por otro lado al incluir ingredientes 100% naturales en su dieta permanente, estás ayudando a la salud y bienestar de tu perro en el mediano y largo plazo.",
  },
]

export const shippingQuestions: FAQ[] = [
  {
    question: "¿PUEDO LLEGAR A COMPRAR UN PASTEL DIRECTAMENTE EN LA TIENDA SIN RESERVARLA?",
    answer:
      "Sí, todos los días tenemos disponible una cantidad limitada de pasteles de cumpleaños listos para entrega inmediata en nuestros puntos de venta. Puedes llegar y comprar una de ellas sin reserva pero lo más aconsejable es que antes de ir consultes la disponibilidad del día en el punto de venta de tu preferencia. Si la tienda no tiene el pastel listo también existe la posibilidad de que puedas llevarte a casa los productos ultracongelados.",
  },
  {
    question: "¿PUEDO RESERVAR PASTELES PARA OTRO DÍA?",
    answer:
      "Por supuesto, elige la presentación, el tamaño, la receta y la fecha de entrega deseada. Si se trata de un pastel perronal de 400 gms puedes encargarlo telefónicamente 1 día antes (de lunes a viernes) y recogerlo al día siguiente.",
  },
  {
    question: "¿PUEDO SABER EL ESTADO DE MI ENVÍO?",
    answer:
      "Hacemos todos nuestros envíos por correo certificado a través de compañías de correo reconocidas. Una vez sale de nuestra tienda, en lo posible te enviamos el número de guía al correo electrónico registrado.",
  },
]

export const foodsToAvoid: FoodToAvoid[] = [
  {
    name: "CHOCOLATE",
    reason:
      "El chocolate contiene teobromina, un alcaloide que es químicamente similar a la cafeína y que puede llegar a ser tóxico para ellos.",
  },
  {
    name: "AJO",
    reason:
      "En pocas cantidades es benéfico y antipulgas, pero en grandes porciones puede provocar anemia y causar problemas gastrointestinales.",
  },
  {
    name: "CEBOLLA",
    reason:
      "Los niveles de tiosulfato que se encuentran en las cebollas es tan alto que se convierte en un alimento que aún en pequeñas cantidades puede ser extremadamente nocivo.",
  },
  {
    name: "AGUACATE",
    reason:
      "Contiene una sustancia llamada Persin, que es extremadamente tóxico para los animales. No sólo la pulpa del aguacate es peligrosa, sino toda la planta de aguacate: la semilla, la corteza y las hojas.",
  },
  {
    name: "BEBIDAS ALCOHÓLICAS",
    reason:
      "Por obvias razones un perro no debe ingerir alcohol, su organismo no está preparado para esta sustancia. Además de producirle mareos y vómitos puede llevar a causarle graves daños a sus riñones e incluso determinar su deceso si se ingiere en altas dosis.",
  },
  {
    name: "LECHE",
    reason:
      "La mayoría de los perros son intolerantes a la lactosa. Por eso debe usarse en dosis bajas y en versiones deslactosadas.",
  },
  {
    name: "CARNES FRÍAS",
    reason:
      "No son recomendables por ser ricas en grasas saturadas, altas en contenido de sal y otros conservantes poco saludables.",
  },
  {
    name: "CAFEÍNA",
    reason:
      "Estimula el sistema nervioso central y cardiovascular y en pocas horas puede causar vómitos, hiperactividad, taquicardia e incluso la muerte.",
  },
  {
    name: "UVAS, CIRUELAS, PASAS, NI NUECES",
    reason:
      "Pueden causar falla renal. Los síntomas que se pueden presentar son vómitos, diarrea, letargia, anorexia, dolor abdominal, debilidad, deshidratación y temblores.",
  },
]

export const testimonials: Testimonial[] = [
  {
    name: "María García",
    pet: "Dueña de Max, Labrador",
    comment:
      "Desde que empecé a darle Pet Gourmet a Max, su energía ha aumentado y su pelaje luce increíble. ¡Ya no quiere comer otra cosa!",
    avatar: "/woman-and-golden-retriever-park.png",
  },
  {
    name: "Carlos Rodríguez",
    pet: "Dueño de Luna, Bulldog Francés",
    comment:
      "Luna siempre tuvo problemas digestivos hasta que descubrimos Pet Gourmet. Ahora está mucho mejor y disfruta cada comida.",
    avatar: "/man-and-small-dog-park.png",
  },
  {
    name: "Ana Martínez",
    pet: "Dueña de Coco, Border Collie",
    comment:
      "La diferencia en la salud de Coco es notable. Tiene más energía para jugar y su pelaje nunca había lucido tan brillante.",
    avatar: "/joyful-dog-owner.png",
  },
]

export const panelData: PanelData[] = [
  {
    id: "productos",
    title: "Sobre los productos",
    description: "Información sobre ingredientes, calidad y beneficios de nuestros productos",
    bgImage: "/acerca-de-productos.webp",
    icon: (
      <svg className="w-8 h-8 text-primary-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-4 4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    id: "envios",
    title: "Sobre los envíos",
    description: "Tiempos de entrega, costos y políticas de envío a toda la República Mexicana",
    bgImage: "/acerca-de-envios.webp",
    icon: (
      <svg className="w-8 h-8 text-primary-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
  },
  {
    id: "alimentos",
    title: "Sobre los alimentos",
    description: "Nutrición, ingredientes y recomendaciones alimenticias para tu mascota",
    bgImage: "/acerca-de-alimentos.webp",
    icon: (
      <svg className="w-8 h-8 text-primary-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
  },
]
