Flujo de Suscripciones – PetGourmet
1. Definición de suscripciones por producto

Cada producto puede tener diferentes modalidades de suscripción.

Las modalidades disponibles son: semanal, quincenal, mensual, trimestral y anual.

En el dashboard de administración del producto se configuran:

El descuento que aplicará a la suscripción.

La URL de redirección asociada a la suscripción seleccionada (ej. link de Mercado Pago).

2. Validación en el checkout

Cuando un usuario selecciona una suscripción y procede al checkout, el sistema valida que:

El usuario haya iniciado sesión.

Sin sesión activa, no se permite avanzar al pago.

3. Redirección a pasarela de pago

Al confirmar el pago, el usuario es redirigido al link de suscripción de Mercado Pago correspondiente a la modalidad seleccionada.

4. Captura de referencia de pago

Una vez el pago es procesado en Mercado Pago, el sistema:

Captura la referencia de pago del link.

Asocia esa referencia al usuario que tiene la sesión abierta.

5. Página de aterrizaje post-pago

Si el pago fue exitoso, el usuario es redirigido a la landing page configurada.

Esta página debe mostrar:

Un mensaje de “Gracias por tu suscripción”.

La referencia del pago y demás datos relacionados (recibidos vía webhook).

El hecho de llegar a esta página confirma que la suscripción fue exitosa.

6. Comunicación al cliente

Una vez validado el éxito del pago:

El sistema envía un correo de agradecimiento al cliente.

El correo se envía a la dirección asociada a la sesión del usuario.

7. Activación y seguimiento de la suscripción

La suscripción queda activada en dos lugares:

En el perfil del usuario (/perfil).

En el dashboard del administrador (/admin/dashboard).

El sistema usa webhooks de Mercado Pago para mantener actualizado el estado de la suscripción (ej. activa, cancelada, pendiente, etc.).

👉 De esta forma, todo el ciclo de suscripción queda automatizado: desde la selección en el producto, validación, pago, confirmación, notificación al cliente, y seguimiento en tiempo real vía webhooks.