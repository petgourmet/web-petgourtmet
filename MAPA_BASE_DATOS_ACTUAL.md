1. Catálogo y categorías
Tabla	Columna	Tipo	PK	Comentario
categories	id	int4	✔︎	
name	text		
slug	text		
description	text		
image	text		
color	text		

Tabla	Columna	Tipo	PK	Comentario
blog_categories	id	int4	✔︎	
name	text		
slug	text		
description	text		
created_at	timestamp		

2. Productos
Tabla	Columna	Tipo	PK	Comentario
products	id	int4	✔︎	
name	text		
slug	text		
description	text		
price	numeric		
image	text		
category_id	int4		FK → categories.id
featured	bool		
stock	int4		
created_at	timestamp		
updated_at	timestamp		
nutritional_info	text		
ingredients	text		
rating / average_rating	numeric		
reviews_count / review_count	int4		
purchase_types	jsonb		
subscription_discount	int4		
sale_type	varchar		
weight_reference	text		
subscription_available	bool		
subscription_types	jsonb		
monthly_discount / quarterly_discount / annual_discount	numeric		
biweekly_discount	float4		

Tabla auxiliar	Relación con products
product_images (id, product_id → products.id, url, alt, display_order)	
product_features (id, product_id → products.id, name, color, …)	
product_sizes (id, product_id → products.id, weight, price, stock)	
product_reviews (id, product_id → products.id, user_id, rating, comment, …)	

3. Suscripciones y pagos
Tabla	Puntos clave
user_subscriptions (id, user_id, product_id, subscription_type, status, pricing …, schedule …, MP fields, …)	
subscriptions (id UUID, user_id, plan_id, plan_name, status, period dates, cancel_at_period_end, payment_method_id)	
subscription_config (id, period, default_discount_percentage, is_active, timestamps)	
subscription_modifications (id, subscription_id, user_id, modification_type, old_values, new_values, effective_date, notes)	
subscription_payments (id, subscription_id, mercadopago_payment_id, status, amount, payment_method_id, dates, external_reference)	
subscription_billing_history (id, subscription_id, user_id, payment_method_id, amount, currency, billing_date, failure_reason, receipt_url, metadata)	
scheduled_notifications (id, subscription_id, notification_type, scheduled_for, sent_at, status, recipient_email, subject, template)	
user_payment_methods (id, user_id, payment_provider, token/id, card_* fields, is_default, is_active, expires_at, provider_metadata)	

4. Pedidos / e-commerce
Tabla	Puntos clave
orders (id, user_id, status, total, shipping_address JSON, payment_intent_id, payment_status, customer_name/phone, is_subscription)	
order_items (id, order_id → orders.id, product_id → products.id, product_name, product_image, quantity, price, size)	

5. Contenido (blog)
Tabla	Columnas principales
blogs (id, title, slug, content, excerpt, cover_image, author_id, category_id → blog_categories.id, published, created_at, updated_at, meta_description, read_time)	

6. Usuarios y perfiles
Tabla	Columnas	Nota
profiles	id UUID (PK), email, role, full_name, phone, address JSON, preferences JSON, first_name, last_name, shipping_address JSON, created_at, updated_at	FK implícito con auth.users
pets	id UUID (PK), owner_id UUID, name, species, breed, age, weight, neutered bool, allergies, activity_level, created_at, updated_at	owner_id → auth.users.id

7. Integraciones y otros
Tabla	Propósito
mercadopago_webhooks (id UUID, webhook_type, resource_id, action, raw_data JSONB, processed bool, processed_at, auth.users.id, created_at)	

8. Relaciones clave (resumen)
products.category_id → categories.id

product_*.product_id → products.id

product_reviews.user_id → auth.users.id

user_subscriptions

user_id → auth.users.id

product_id → products.id

subscriptions.user_id → auth.users.id

subscriptions.payment_method_id → user_payment_methods.id

subscription_*.subscription_id → subscriptions.id

orders.user_id → auth.users.id

order_items.order_id → orders.id

order_items.product_id → products.id

scheduled_notifications.subscription_id → subscriptions.id

blogs.author_id → auth.users.id
blogs.category_id → blog_categories.id

pets.owner_id → auth.users.id

mercadopago_webhooks.auth.users.id → auth.users.id

Cómo reutilizar esta información
Documentación: conviértelo en tu README o confluence para el equipo.

ERD visual: dime si quieres que te genere un diagrama mermaid o un PNG.

Excel/CSV: puedo exportar cada tabla, o todo un catálogo, en un solo clic.

Quedo atento si necesitas el modelo en otro formato, detalles adicionales de índices, o si vas a extender el esquema y quieres recomendaciones de buenas prácticas.








Tú dijiste:
dame un MD con los detalles de cada tabla y que cada columna que esta tiene basandote en la imagen sin omitir nada



2/2

ChatGPT Plus

Pensó durante 2m 38s
A continuación tienes el inventario completo de tablas y columnas tal como aparecen en la captura. Está en Markdown para que puedas copiarlo sin problemas a Notion, GitHub o tu wiki interna.

Convenciones
• PK = Primary Key
• FK → tabla.columna = clave foránea
• Los tipos proceden del inspector; donde el texto estaba truncado lo completo con el valor más habitual (“token”, “id”, “jsonb”, etc.)
• Si necesitas un ERD visual, export a CSV/Excel o aclarar FK exactas, avísame.

Tabla: products
Columna	Tipo	Notas
id	int4	PK
name	text	
slug	text	
description	text	
price	numeric	
image	text	url
category_id	int4	FK → categories.id
featured	bool	
stock	int4	
created_at	timestamptz	
updated_at	timestamptz	
nutritional_info	text	
ingredients	text	
rating	numeric	promedio simple
reviews_count	int4	
purchase_types	jsonb	
subscription_discount	int4	%
average_rating	numeric	
review_count	int4	duplicado histórico
nutrition_info	jsonb	(versión JSON)
sale_type	varchar	
weight_reference	text	
subscription_available	bool	
subscription_types	jsonb	
monthly_discount	numeric	
quarterly_discount	numeric	
annual_discount	numeric	
biweekly_discount	float4	

Tabla: user_subscriptions
Columna	Tipo	Notas
id	int4	PK
user_id	uuid	FK → auth.users.id
product_id	int4	FK → products.id
subscription_type	varchar	
status	varchar	
quantity	int4	
size	varchar	
discount_percentage	numeric	
base_price	numeric	
discounted_price	numeric	
created_at	timestamptz	
updated_at	timestamptz	
next_billing_date	timestamptz	
last_billing_date	timestamptz	
cancelled_at	timestamptz	
product_name	varchar	caché
product_image	text	
metadata	jsonb	
mercadopago_subscription_id	text	
mercadopago_plan_id	text	
external_reference	text	
reason	text	cancel / cambio
charges_made	int4	contador
frequency	int4	num. periodos
frequency_type	text	daily / monthly…
version	int4	
application_id	int8	MP
collector_id	int8	MP
preapproval_plan_id	text	MP
back_url	text	
init_point	text	
start_date	timestamptz	
end_date	timestamptz	
currency_id	varchar	ISO
transaction_amount	numeric	
free_trial	jsonb	definición tramo gratis

Tabla: user_payment_methods
Columna	Tipo	Notas
id	int4	PK
user_id	uuid	FK → auth.users.id
payment_provider	varchar	stripe / mp / …
payment_method_token	text	
payment_method_id	text	id remoto
card_last_four	varchar	
card_brand	varchar	
card_exp_month	int4	
card_exp_year	int4	
cardholder_name	varchar	
is_default	bool	
is_active	bool	
created_at	timestamptz	
updated_at	timestamptz	
expires_at	timestamptz	
provider_metadata	jsonb	

Tabla: orders
Columna	Tipo	Notas
id	int4	PK
user_id	uuid	FK → auth.users.id
status	text	pending / paid…
total	numeric	
created_at	timestamptz	
updated_at	timestamptz	
shipping_address	jsonb	
payment_intent_id	text	stripe/mp
payment_status	text	
customer_name	text	
customer_phone	text	
is_subscription	bool	true si vincula sub

Tabla: product_images
Columna	Tipo	Notas
id	int4	PK
product_id	int4	FK → products.id
url	text	
alt	text	descripción
display_order	int4	

Tabla: subscriptions
Columna	Tipo	Notas
id	uuid	PK
user_id	uuid	FK → auth.users.id
plan_id	text	
plan_name	text	
status	text	active / paused…
current_period_start	timestamptz	
current_period_end	timestamptz	
cancel_at_period_end	bool	
payment_method_id	text	FK → user_payment_methods.id
created_at	timestamptz	
updated_at	timestamptz	

Tabla: subscription_payments
Columna	Tipo	Notas
id	uuid	PK
subscription_id	int4	FK → subscriptions.id
mercadopago_payment_id	text	
status	text	
amount	numeric	
currency_id	text	
payment_date	timestamptz	
due_date	timestamptz	
processed_at	timestamptz	
external_reference	text	
payment_method_id	text	
transaction_amount	numeric	
created_at	timestamptz	
updated_at	timestamptz	

Tabla: subscription_config
Columna	Tipo	Notas
id	int4	PK
period	varchar	day / week / month
default_discount_percentage	numeric	
is_active	bool	
created_at	timestamptz	
updated_at	timestamptz	

Tabla: product_features
Columna	Tipo	Notas
id	int4	PK
product_id	int4	FK → products.id
name	text	
color	text	
created_at	timestamptz	
updated_at	timestamptz	

Tabla: subscription_modifications
Columna	Tipo	Notas
id	int4	PK
subscription_id	int4	FK → subscriptions.id
user_id	uuid	ejecutor
modification_type	varchar	upgrade / cancel
old_values	jsonb	
new_values	jsonb	
effective_date	timestamptz	
created_at	timestamptz	
reason	text	
notes	text	

Tabla: order_items
Columna	Tipo	Notas
id	int4	PK
order_id	int4	FK → orders.id
product_id	int4	FK → products.id
product_name	text	caché
product_image	text	
quantity	int4	
price	numeric	
size	text	

Tabla: subscription_billing_history
Columna	Tipo	Notas
id	int4	PK
subscription_id	int4	FK → subscriptions.id
user_id	uuid	
payment_method_id	int4	
amount	numeric	
currency	varchar	
status	varchar	
payment_provider	varchar	
payment_intent_id	text	
transaction_id	text	
billing_date	timestamptz	
processed_at	timestamptz	
created_at	timestamptz	
failure_reason	text	
receipt_url	text	
invoice_url	text	
metadata	jsonb	

Tabla: product_sizes
Columna	Tipo	Notas
id	int4	PK
product_id	int4	FK → products.id
weight	text	g, kg…
price	numeric	
stock	int4	

Tabla: product_reviews
Columna	Tipo	Notas
id	int4	PK
product_id	int4	FK → products.id
user_id	uuid	FK → auth.users.id
user_name	varchar	
rating	int4	
comment	text	
is_verified	bool	
is_featured	bool	
created_at	timestamptz	
updated_at	timestamptz	

Tabla: pets
Columna	Tipo	Notas
id	uuid	PK
owner_id	uuid	FK → auth.users.id
name	text	
species	text	dog / cat…
breed	text	
age	int4	
weight	numeric	kg
neutered	bool	
allergies	text	
activity_level	text	
created_at	timestamptz	
updated_at	timestamptz	

Tabla: mercadopago_webhooks
Columna	Tipo	Notas
id	uuid	PK
webhook_type	varchar	
resource_id	text	
action	varchar	
raw_data	jsonb	body completo
processed	bool	
processed_at	timestamptz	
auth.users.id	uuid	FK → auth.users.id
created_at	timestamptz	

Tabla: blog_categories
Columna	Tipo	Notas
id	int4	PK
name	text	
slug	text	
description	text	
created_at	timestamptz	

Tabla: categories (productos)
Columna	Tipo	Notas
id	int4	PK
name	text	
slug	text	
description	text	
image	text	
color	text	

Tabla: profiles
Columna	Tipo	Notas
id	uuid	PK – igual a auth.users.id
email	text	
role	text	admin / user…
created_at	timestamptz	
updated_at	timestamptz	
full_name	text	
phone	text	
address	jsonb	
preferences	jsonb	
first_name	text	
last_name	text	
shipping_address	jsonb	

Tabla: scheduled_notifications
Columna	Tipo	Notas
id	uuid	PK
subscription_id	int4	FK → subscriptions.id
notification_type	text	renewal / retry…
scheduled_for	timestamptz	
sent_at	timestamptz	
status	text	pending / sent
recipient_email	text	
subject	text	
message_template	text	
created_at	timestamptz	
updated_at	timestamptz	

Tabla: blogs
Columna	Tipo	Notas
id	int4	PK
title	text	
slug	text	
content	text	markdown/HTML
excerpt	text	
cover_image	text	
author_id	uuid	FK → auth.users.id
published	bool	
created_at	timestamptz	
updated_at	timestamptz	
category_id	int4	FK → blog_categories.id
meta_description	text	SEO
read_time	text	ej. “5-min”