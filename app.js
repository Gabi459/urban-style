'use strict';

/* =========================================================
   Urban Style · Portal web y carrito de compras (MVP)
   app.js: lógica principal del portal.

   Se carga con el atributo "defer" en el <head>, así que cuando
   este código se ejecuta el DOM ya está completamente disponible.
   ========================================================= */


/* CONFIGURACIÓN Y DATOS, creo unas constantes para guardar los datos que se utilizan durante el programa */

const IVA = 0.21; // iva del 21%
const DURACION_OFERTA = 15; // duración de la oferta en segundos
const CLAVE_RESENAS = 'urbanStyle.resenas'; // clave para guardar las reseñas en localStorage

// Datos de sesión simulados: pongo unos datos de ejemplo de un usuario.
// Algunos los pongo mal o vacíos para poder limpiarlos (1.3) y poner valores por defecto (1.4)
const datosSesion = {
  email: '   Gabriel.Martin@UrbanStyle.ES   ', // con espacios y mayúsculas para limpiarlo
  idCliente: 1234, // se tiene que ver como 001234
  apodo: '', // vacío -> "Cliente VIP"
  membresia: undefined, // no definida -> "Básica"
  prendasRegalo: 0, // tiene 0 de verdad, así que NO se cambia a 2
};

// Catálogo de la tienda. Los precios vienen en texto, como pide el enunciado.
const catalogo = [
  { nombre: 'Chaqueta Denim', precio: '59.90€' },
  { nombre: 'Camiseta Urban', precio: '19.99€' },
  { nombre: 'Sudadera Oversize', precio: '44.50€' },
  { nombre: 'Gorra Street', precio: '15.00€' },
];

// Variables que van cambiando mientras se usa la página
let usuarioActual = 'Invitado';
let pedidoActual = 1; // número del pedido actual
let ofertaActiva = false; // indica si hay una cuenta atrás en marcha
let intervaloOferta = null; // guarda el setInterval para poder pararlo
let resenas = []; // lista de reseñas

// Creo una función para buscar elementos del HTML usando solo su id
const $ = (id) => document.getElementById(id);

// Función para mostrar un mensaje de aviso. El tipo ('ok' o 'error') cambia el color con CSS
function mostrarAviso(id, texto, tipo) {
  $(id).textContent = texto;
  $(id).dataset.tipo = tipo;
}


/* BLOQUE 1 Inicio de sesión y diagnóstico del entorno */

// 1.2 Recojo el usuario y el rol de los parámetros de la URL.
// Si no vienen en la URL, get() devuelve null y con ?? pongo los valores por defecto.
function leerParametrosURL() {
  const parametros = new URLSearchParams(window.location.search);

  const usuario = parametros.get('usuario') ?? 'Invitado';
  const rol = parametros.get('rol') ?? 'invitado';

  return { usuario, rol };
}

// 1.2 Función que obtiene información del navegador: idioma, conexión, un id de sesión y la fecha.
function diagnosticarEntorno() {
  return {
    idioma: navigator.language, // idioma del navegador, por ejemplo "es-ES"
    online: navigator.onLine, // true si hay conexión a internet
    idSesion: crypto.randomUUID(), // identificador único y seguro
    // Fecha en texto largo en español, por ejemplo "jueves, 1 de octubre de 2026"
    fecha: new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

// 1.3 Limpia el correo quitando los espacios y pasándolo a minúsculas.
// Después separo la parte del usuario y la del dominio usando la posición de la @.
function sanitizarEmail(emailOriginal) {
  const email = emailOriginal.trim().toLowerCase();
  const posicionArroba = email.indexOf('@');

  return {
    email,
    usuario: email.slice(0, posicionArroba),
    dominio: email.slice(posicionArroba + 1),
  };
}

// 1.3 Convierte el id del cliente en un texto de 6 dígitos añadiendo ceros delante.
function formatearIdCliente(id) {
  return String(id).padStart(6, '0');
}

// 1.4 Pongo los valores por defecto con el operador que corresponde en cada caso.
function aplicarPreferencias(perfil) {
  // ||= asigna si el valor es falso, y una cadena vacía lo es -> "Cliente VIP"
  perfil.apodo ||= 'Cliente VIP';

  // ??= solo asigna si es null o undefined -> "Básica"
  perfil.membresia ??= 'Básica';

  // También uso ??= porque con ||= un 0 se cambiaría a 2, y el 0 es un saldo real
  perfil.prendasRegalo ??= 2;

  return perfil;
}

// Función que inicia toda la información del usuario y la muestra en la página
function iniciarSesion() {
  const { usuario, rol } = leerParametrosURL();
  const entorno = diagnosticarEntorno();
  const correo = sanitizarEmail(datosSesion.email);
  const perfil = aplicarPreferencias(datosSesion);

  usuarioActual = usuario; // lo guardo para usarlo en las reseñas

  // Cabecera
  $('fecha').textContent = entorno.fecha;
  $('saludo').textContent = `Hola, ${usuario}`;
  $('rol').textContent = rol;
  $('conexion').textContent = entorno.online ? 'En línea' : 'Sin conexión';
  $('conexion').dataset.estado = entorno.online ? 'online' : 'offline';

  // Perfil
  $('email').textContent = correo.email;
  $('usuario').textContent = correo.usuario;
  $('dominio').textContent = correo.dominio;
  $('idCliente').textContent = formatearIdCliente(perfil.idCliente);
  $('apodo').textContent = perfil.apodo;
  $('membresia').textContent = perfil.membresia;
  $('prendasRegalo').textContent = perfil.prendasRegalo;
  $('idioma').textContent = entorno.idioma;
  $('sesionId').textContent = entorno.idSesion;
}


/* BLOQUE 2 Catálogo, operaciones financieras y formato de moneda */

// 2.4 Formato de moneda en euros para España (ejemplo: 84,57 €)
const formatoEuros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

// 2.1 parseFloat lee el número del principio del texto y se para en el €. "59.90€" -> 59.9
function extraerPrecio(textoPrecio) {
  return parseFloat(textoPrecio);
}

// 2.1 Suma los precios de las prendas que están marcadas en el catálogo
function calcularSubtotal() {
  const marcadas = document.querySelectorAll('#catalogoProductos input:checked');

  return Array.from(marcadas).reduce(
    (suma, casilla) => suma + extraerPrecio(casilla.value),
    0
  );
}

// 2.2 y 2.4 Calcula el desglose de la compra y lo muestra en euros.
// Primero compruebo que el subtotal es un número válido, después convierto el cupón
// a número, lo resto y calculo el iva sobre lo que queda.
function actualizarCarrito() {
  const subtotal = calcularSubtotal();

  // Number.isFinite descarta NaN e Infinity, así no se opera con datos incorrectos
  if (!Number.isFinite(subtotal)) {
    mostrarAviso('avisoCarrito', 'El subtotal no es un número válido.', 'error');
    return false;
  }

  // El cupón llega como texto ("10"), con Number() lo paso a número. Si está vacío vale 0
  const cupon = Number($('cupon').value.trim());

  if (!Number.isFinite(cupon) || cupon < 0) {
    mostrarAviso('avisoCarrito', 'El cupón tiene que ser un número, por ejemplo 10.', 'error');
    return false;
  }

  // El descuento no puede ser mayor que la compra, así la base nunca es negativa
  const descuento = Math.min(cupon, subtotal);
  const baseImponible = subtotal - descuento; // resto el cupón
  const iva = baseImponible * IVA; // 21% sobre lo que queda después del descuento
  const total = baseImponible + iva;

  // Muestro el desglose con el formato de euros
  $('subtotal').textContent = formatoEuros.format(subtotal);
  $('descuento').textContent = formatoEuros.format(descuento);
  $('iva').textContent = formatoEuros.format(iva);
  $('total').textContent = formatoEuros.format(total);

  mostrarAviso('avisoCarrito', '', '');
  return true;
}

// 2.3 Al procesar el pedido aumento en uno el número del pedido
function procesarPedido() {
  if (calcularSubtotal() === 0) {
    mostrarAviso('avisoCarrito', 'Selecciona al menos una prenda.', 'error');
    return;
  }

  // Si el desglose tiene algún error no se procesa el pedido
  if (!actualizarCarrito()) return;

  mostrarAviso('avisoCarrito', `Pedido nº ${pedidoActual} procesado correctamente.`, 'ok');

  pedidoActual += 1;
  $('numeroPedido').textContent = pedidoActual;
}

// Creo las prendas del catálogo con una casilla cada una.
// Cuando el usuario marca o desmarca una prenda se actualiza el carrito.
function iniciarCarrito() {
  catalogo.forEach((prenda) => {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'producto';

    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.value = prenda.precio; // guardo el precio en texto, tal cual viene
    casilla.addEventListener('change', actualizarCarrito);

    const nombre = document.createElement('span');
    nombre.textContent = prenda.nombre;

    const precio = document.createElement('strong');
    precio.textContent = prenda.precio;

    etiqueta.append(casilla, nombre, precio);
    $('catalogoProductos').append(etiqueta);
  });

  $('aplicarCupon').addEventListener('click', actualizarCarrito);
  $('procesarPedido').addEventListener('click', procesarPedido);
}


/* BLOQUE 3 Oferta relámpago (temporizador con control) */

// 3.1 y 3.2 Función que activa la cuenta atrás. Cada segundo resta uno al contador.
function activarOferta() {
  // Si ya hay una oferta en marcha no hago nada.
  // Así no se crean temporizadores duplicados ni se aceleran los segundos.
  if (ofertaActiva) return;

  ofertaActiva = true;
  let segundos = DURACION_OFERTA;

  $('contadorOferta').textContent = segundos;
  $('estadoOferta').textContent = '¡Oferta activa!';
  $('oferta').dataset.estado = 'activa';

  intervaloOferta = setInterval(() => {
    segundos -= 1;
    $('contadorOferta').textContent = segundos;

    if (segundos === 0) {
      finalizarOferta();
    }
  }, 1000);
}

// 3.3 Cuando llega a 0 paro el temporizador, vuelvo a poner ofertaActiva en false
// para que se pueda activar otra vez y aviso de que la oferta ha terminado.
function finalizarOferta() {
  clearInterval(intervaloOferta);
  intervaloOferta = null;
  ofertaActiva = false;

  $('estadoOferta').textContent = 'La oferta ha expirado.';
  $('oferta').dataset.estado = 'expirada';
}


/* BLOQUE 4 Reseñas, seguridad y persistencia */

// 4.3 Recupera las reseñas guardadas en localStorage.
// Uso try/catch porque si los datos guardados están mal, JSON.parse da error y se rompería la página.
function cargarResenas() {
  try {
    const guardadas = localStorage.getItem(CLAVE_RESENAS);
    if (guardadas === null) return []; // todavía no hay nada guardado

    const datos = JSON.parse(guardadas);
    return Array.isArray(datos) ? datos : []; // compruebo que lo guardado es una lista
  } catch (error) {
    console.error('Error al cargar las reseñas:', error);
    mostrarAviso('avisoResena', 'No se pudieron cargar las reseñas guardadas.', 'error');
    return [];
  }
}

// 4.3 Guarda la lista de reseñas en localStorage para que no se pierdan al recargar.
// También uso try/catch porque guardar puede fallar (por ejemplo si el almacenamiento está lleno).
// Devuelve true si se ha guardado y false si no.
function guardarResenas() {
  try {
    localStorage.setItem(CLAVE_RESENAS, JSON.stringify(resenas));
    return true;
  } catch (error) {
    console.error('Error al guardar las reseñas:', error);
    return false;
  }
}

// 4.2 Creo el objeto de la reseña con el id (marca de tiempo), el usuario, la hora y el comentario
function crearResena(comentario) {
  return {
    id: Date.now(),
    usuario: usuarioActual,
    hora: new Date().toLocaleTimeString('es-ES'),
    comentario,
  };
}

// 4.4 Muestra las reseñas creando los elementos desde JavaScript.
// Uso textContent y no innerHTML, así si alguien escribe <script> se ve como texto y no se ejecuta.
function mostrarResenas() {
  const lista = $('listaResenas');
  lista.replaceChildren(); // vacío la lista antes de volver a pintarla

  resenas.forEach((resena) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'resena';

    const autor = document.createElement('strong');
    autor.textContent = `${resena.usuario} · ${resena.hora}`;

    const texto = document.createElement('p');
    texto.textContent = resena.comentario;

    tarjeta.append(autor, texto);
    lista.append(tarjeta);
  });
}

// 4.1 Cuando se envía el formulario creo la reseña, la guardo y actualizo la lista
function publicarResena(evento) {
  evento.preventDefault(); // evita que la página se recargue al enviar el formulario

  const comentario = $('textoResena').value.trim();

  if (comentario === '') {
    mostrarAviso('avisoResena', 'Escribe tu opinión antes de publicarla.', 'error');
    return;
  }

  resenas.push(crearResena(comentario));
  const guardada = guardarResenas();
  mostrarResenas();

  $('textoResena').value = '';

  if (guardada) {
    mostrarAviso('avisoResena', 'Opinión publicada.', 'ok');
  } else {
    mostrarAviso('avisoResena', 'Opinión publicada, pero no se pudo guardar.', 'error');
  }
}


/* ARRANQUE */
// Al cargar la página inicio todas las partes: la sesión, el carrito, la oferta y las reseñas.
iniciarSesion();
iniciarCarrito();
$('activarOferta').addEventListener('click', activarOferta);
resenas = cargarResenas();
mostrarResenas();
$('formularioResena').addEventListener('submit', publicarResena);
