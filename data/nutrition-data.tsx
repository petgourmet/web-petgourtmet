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
    question: "¿Qué es el ultracongelado?",
    answer:
      "La tecnología de ultracongelación permite congelar molecularmente los alimentos para mantener sus propiedades organolépticas (sabor, textura, color) intactas por extensos períodos de tiempo. Basta pasar la receta del congelador al refrigerador 12 horas antes (noche anterior) para disfrutar de un producto listo, como recién preparado. En situaciones especiales o solicitud de clientes recurrentes las recetas se entregan ultracongeladas para comodidad de abastecimiento y duración prolongada de almacenamiento.\n\nRECOMENDACIONES:\n• Mantén siempre en el CONGELADOR de la nevera (Parte superior) las recetas entregadas ULTRACONGELADAS en la tienda.\n• Para descongelar la receta que deseas darle a tu perro, pásala 12 horas (noche anterior) antes a la zona de REFRIGERACIÓN de la nevera (parte inferior)\n• Permítele a tu perro disfrutar de la receta como recién preparada o consérvala REFRIGERADA hasta 5 días más.\n• Evita descongelar las recetas ULTRACONGELADAS por calentamiento directo\n• Evita volver a congelar una receta que hayas descongelado previamente",
  },
  {
    question: "¿MI PERRO SÓLO COME CONCENTRADO, PUEDO DARLE LAS RECETAS DE PET GOURMET SIN QUE LE HAGAN DAÑO?",
    answer:
      "Si se trata de probar nuestras recetas como snacks, en cantidades moderadas, no debería existir ningún problema. Pero por el contrario si tu perro desea incluir nuestros productos dentro de su dieta diaria, es necesario que al principio pruebe las recetas de Pet Gourmet en pocas cantidades y mezcladas con el concentrado habitual, incrementando poco a poco la proporción, como se acostumbra hacer cuando se cambia de marca concentrado.\n\nPor otro lado no es recomendable que tu perro se alimente únicamente y exclusivamente de una fuente de alimento como el concentrado, las dietas horneadas o la dieta Barf. Además del tedio que esto representa, él necesita estar motivado en su dieta a través de alimentos naturales que le ayuden a tener una dieta variada y también pueda recibir los beneficios de los alimentos frescos y naturales no procesados.",
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
      "¿MI VETERINARIO DICE QUE NO LE DÉ A MI PERRO NADA DIFERENTE AL CONCENTRADO, ENTONCES POR QUÉ DEBERÍA DARLE A PROBAR PRODUCTOS DE PET GOURMET?",
    answer:
      "Porque las recetas de Pet Gourmet cuentan con el respaldo de médicos veterinarios, buenas prácticas de manufactura y los mejores ingredientes seleccionados para ofrecer productos de excelente calidad. Además todos nuestros clientes y Chef, nuestra mascota oficial, son clara evidencia de la gran calidad de las recetas de Pet Gourmet.",
  },
  {
    question: "¿PUEDE UN PERRO ALIMENTARSE ÚNICAMENTE DE LAS RECETAS DE PET GOURMET?",
    answer:
      "Por supuesto que sí. Creemos ciegamente en lo que hacemos. Por eso Chef, nuestro perro que se ha convertido en la imagen de Pet Gourmet, se alimenta a diario de nuestras recetas que son complementadas por otros ingredientes naturales, vitaminas y omegas. Su dieta es balanceada y sigue recomendaciones veterinarias. Chef nunca ha probado un concentrado comercial. Si deseas que tu perro disfrute de una dieta al estilo Pet Gourmet no dudes en consultarnos.",
  },
  {
    question: "¿MI PERRO HA PERDIDO EL APETITO, NO QUIERE COMER NADA, ¿QUÉ PUEDO HACER?",
    answer:
      "Esta es una consulta frecuente y en estos casos es donde más nos gusta ayudar. Puedes comenzar a motivarlo de nuevo por el alimento con alguna de nuestras recetas mezclada con el concentrado habitual o uno nuevo recomendado por un veterinario. De esta forma él olerá, sentirá y probará que hay algo nuevo en la comida, algo realmente delicioso, y se sentirá atraído otra vez por el alimento a la hora de comer.",
  },
  {
    question: "¿POR CUÁNTO TIEMPO PUEDO CONSERVAR LAS RECETAS DE PET GOURMET?",
    answer:
      "Nuestros productos están catalogados como COMIDA PARA MASCOTAS DE NIVEL HUMANO, el máximo posible dentro del ranking que categoriza los alimentos para animales. Lo que significa que usamos ingredientes premium, los mismos usados en la cocina para personas. Nunca usamos subproductos de ninguna especie. Tampoco incluimos conservantes, saborizantes, colorantes, aglutinantes ni ningún otro ingrediente artificial. Por eso todos nuestros productos de proteína húmeda tienen una vigencia solo de hasta 7 días REFRIGERADOS apropiadamente (preferiblemente en un recipiente hermético), a excepción de las galletas, las cuales recomendamos consumir antes de 30 días.",
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
    question: "¿SI NECESITO UN PEDIDO PARA HOY MISMO QUÉ DEBO HACER?",
    answer:
      "Para entregas el mismo día debes ordenar y pagar tu pedido antes de las 12 del mediodía en esta tienda online o si deseas también puedes comunicarte directamente a la tienda más cercana. y solicitar el servicio de domicilio",
  },  
  {
    question: "¿PUEDO RESERVARLA PARA OTRO DÍA?",
    answer:
      "Por supuesto, elige la presentación, el tamaño, la receta y la fecha de entrega deseada. Si vives en Ciudad de México Por supuesto, elige la presentación, el tamaño, la receta que quieres y contactanos vía WhatApp para agendar la fecha de entrega deseada",
  },
  {
    question: "¿PUEDO COMPRAR DESDE CUALQUIER PARTE DEL PAÍS?",
    answer:
      "No. Por la naturaleza natural sin conservantes de nuestros productos alimenticios preferimos enviar pedidos a destinos nacionales, ciudades y municipios principales, donde la entrega no supere las 72 horas. Recuerda que los productos van empacados al vacío y su vigencia de uso es corta.",
  },
  {
    question: "¿SI ORDENO ONLINE, CUÁNDO RECIBO MI PEDIDO?",
    answer:
      "Si estás en CDMX puedes recibir tu pedido el mismo día o antes de 24 horas dependiendo de la hora en que generes el pedido, recomendamos que sea antes de las 12 pm para entregas el mismo día, NO FESTIVO. Una vez nuestra plataforma digital confirma que el pago se procesó correctamente, procedemos a organizar tu pedido. Contamos permanentemente con todas las recetas listas. Lo que significa que tu pedido no debe superar las 48 horas HÁBILES en ser entregado.",
  },
  {
    question: "¿EXISTE UN VALOR MÍNIMO PARA ORDENAR EN ESTA TIENDA ONLINE?",
    answer: "No, no existe un valor mínimo para ordenar en esta tienda online.",
  },
  {
    question: "¿CÓMO PUEDO PAGAR? PUEDO COMPRAR SI NO TENGO TARJETA CRÉDITO O DÉBITO?",
    answer:
      "Puedes pagar usando cualquier tarjeta débito o crédito u otro método aceptado por Mercado pago",
  },
  {
    question: "¿PUEDO SABER EL ESTADO DE MI ENVÍO?",
    answer:
      "Contactanos vía WhatsApp o por correo electrónico y te informaremos el estado de tu envío.",
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
    name: "UVAS, CIRUELAS, PASAS Y NUECES",
    reason:
      "Pueden causar falla renal. Los síntomas que se pueden presentar son vómitos, diarrea, letargia, anorexia, dolor abdominal, debilidad, deshidratación y temblores.",
  },
  {
    name: "AHUYAMA",
    reason: "Es altamente tóxica y puede causar la muerte.",
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
