# Urban Style: portal web y carrito de compras (MVP)

Aplicación web cliente para la tienda de moda **Urban Style**, hecha con HTML5 semántico, CSS y JavaScript (`'use strict'`).

## Estructura

```
urban-style/
├── index.html   Estructura de la página y carga de scripts (async / defer)
├── styles.css   Diseño en tarjetas, botones, tipografía e indicadores de estado
├── app.js       Lógica de los 4 bloques
└── README.md
```

## Cómo probarlo

Abre `index.html` en el navegador. Para simular un inicio de sesión, añade parámetros a la URL:

```
index.html?usuario=Ana&rol=admin
```

Sin parámetros, el portal usa los valores por defecto `Invitado` / `invitado`.

## Dónde se resuelve cada requisito

| Requisito | Solución |
|---|---|
| 1.1 Carga de scripts | Analítica con `async` y lógica con `defer`, los dos en el `<head>` |
| 1.2 Usuario y rol | `URLSearchParams` con valores por defecto |
| 1.2 Idioma y conexión | `navigator.language` y `navigator.onLine` |
| 1.2 ID de sesión | `crypto.randomUUID()` |
| 1.2 Fecha en español | `toLocaleDateString('es-ES', {...})` |
| 1.3 Limpieza del correo | `trim()` y `toLowerCase()`, separación con `indexOf` y `slice` |
| 1.3 ID de 6 dígitos | `padStart(6, '0')` |
| 1.4 Valores por defecto | `\|\|=` para el apodo, `??=` para membresía y prendas de regalo (respeta el 0) |
| 2.1 Precios en texto | `parseFloat("59.90€")` y suma con `reduce` |
| 2.2 Validación e IVA | `Number.isFinite`, cupón con `Number()`, IVA del 21 % sobre la base |
| 2.3 Número de pedido | `pedidoActual += 1` |
| 2.4 Formato en euros | `Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })` |
| 3.1 Cuenta atrás | `setInterval` de 1000 ms desde 15 |
| 3.2 Clics repetidos | Variable `ofertaActiva` que bloquea nuevos temporizadores |
| 3.3 Final de la oferta | `clearInterval`, `ofertaActiva = false` y mensaje de expirada |
| 4.1 Formulario | Evento `submit` con `preventDefault()` |
| 4.2 Registro | `{ id: Date.now(), usuario, hora, comentario }` |
| 4.3 Persistencia | `localStorage` y `JSON` dentro de `try/catch` |
| 4.4 Anti-XSS | `createElement` y `textContent`, nunca `innerHTML` |

## Cálculo de ejemplo

| Concepto | Importe |
|---|---|
| Chaqueta Denim + Camiseta Urban | 79,89 € |
| Cupón | 10,00 € |
| IVA 21 % (sobre 69,89 €) | 14,68 € |
| **Total a pagar** | **84,57 €** |

## Autor

Gabriel Martín, práctica 2 de Prometeo by thePower.
