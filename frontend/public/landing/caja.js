const CATALOGO = [
  { title: 'Hey Jude', artist: 'The Beatles', year: 1968 },
  { title: 'Te recuerdo Amanda', artist: 'Víctor Jara', year: 1969 },
  { title: 'Todos juntos', artist: 'Los Jaivas', year: 1972 },
  { title: 'Bohemian Rhapsody', artist: 'Queen', year: 1975 },
  { title: 'Hotel California', artist: 'Eagles', year: 1977 },
  { title: 'Una lágrima en la garganta', artist: 'Zalo Reyes', year: 1979 },
  { title: 'Los momentos', artist: 'Eduardo Gatti', year: 1982 },
  { title: 'El baile de los que sobran', artist: 'Los Prisioneros', year: 1986 },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", year: 1987 },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', year: 1991 },
  { title: 'Esperando nada', artist: 'Nicole', year: 1994 },
  { title: 'Mágico', artist: 'Joe Vasconcellos', year: 1995 },
  { title: "Livin' la Vida Loca", artist: 'Ricky Martin', year: 1999 },
  { title: 'A Dios le pido', artist: 'Juanes', year: 2002 },
  { title: 'Sin despertar', artist: 'Kudai', year: 2003 },
  { title: 'Gasolina', artist: 'Daddy Yankee', year: 2004 },
  { title: 'Llueve sobre la ciudad', artist: 'Los Bunkers', year: 2005 },
  { title: 'Todo cambió', artist: 'Camila', year: 2006 },
  { title: 'Por la ventana', artist: 'Gepe', year: 2010 },
  { title: 'El perdón', artist: 'Nicky Jam', year: 2015 },
  { title: 'La bicicleta', artist: 'Carlos Vives & Shakira', year: 2016 },
  { title: 'Shape of You', artist: 'Ed Sheeran', year: 2017 },
  { title: 'Te boté', artist: 'Nio García & Casper Mágico', year: 2018 },
  { title: 'No se va', artist: 'Morat', year: 2019 },
  { title: 'Yonaguni', artist: 'Bad Bunny', year: 2021 },
  { title: 'As It Was', artist: 'Harry Styles', year: 2022 },
  { title: 'TQG', artist: 'Karol G & Shakira', year: 2023 },
  { title: 'DtMF', artist: 'Bad Bunny', year: 2025 },
];

const DISCOS_POR_RONDA = 4;
const FUNDAS_INICIALES = 6;

const FASE = { ESPERA: 'espera', UBICANDO: 'ubicando', REVELADA: 'revelada', FIN: 'fin' };

function barajar(lista) {
  return lista
    .map((disco) => [Math.random(), disco])
    .sort((a, b) => a[0] - b[0])
    .map(([, disco]) => disco);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function boton(className, text, accion) {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', accion);
  return node;
}

function repartir() {
  const discos = barajar(CATALOGO);
  return {
    linea: discos.slice(0, FUNDAS_INICIALES).sort((a, b) => a.year - b.year),
    mazo: discos.slice(FUNDAS_INICIALES, FUNDAS_INICIALES + DISCOS_POR_RONDA),
  };
}

function calzaEn(linea, lugar, disco) {
  const antes = linea[lugar - 1];
  const despues = linea[lugar];
  return (!antes || antes.year <= disco.year) && (!despues || despues.year >= disco.year);
}

function describirLugar(linea, lugar) {
  const antes = linea[lugar - 1];
  const despues = linea[lugar];
  if (!antes) return `antes de ${despues.title}, ${despues.year}.`;
  if (!despues) return `después de ${antes.title}, ${antes.year}.`;
  return `entre ${antes.year} y ${despues.year}.`;
}

function montarTurno(raiz) {
  const contenedor = raiz.querySelector('[data-caja]');

  const sonandoTitulo = el('p', 'sonando-titulo');
  const sonandoArtista = el('p', 'sonando-artista');
  const sonando = el('div');
  sonando.append(sonandoTitulo, sonandoArtista);
  const marcador = el('div', 'marcador');
  const cabecera = el('div', 'sonando');
  cabecera.append(sonando, marcador);

  let fase, puntos, turno, linea, mazo, disco, acerto;

  const caja = crearCajaDeVinilos({
    rotulo: 'tu caja',
    nota: 'de lo más antiguo a lo más nuevo',
    pistaTactil: 'desliza para hojear',
    pistaMouse: 'usa la rueda para hojear',
    nombreAccesible: 'lugar en tu caja',
    describirLugar: (lugar) => describirLugar(linea, lugar),
    alCambiarLugar: () => pintarLugar(),
    alConfirmar: () => ubicar(),
  });

  const lugarTexto = el('p', 'lugar');
  lugarTexto.setAttribute('aria-live', 'polite');
  const acciones = el('div', 'acciones');
  const pie = el('div', 'tablero-pie');
  pie.append(lugarTexto, acciones);
  const panel = el('div', 'panel');
  panel.append(cabecera, pie);

  contenedor.replaceChildren(panel, caja.nodo);

  const pintarLugar = () => {
    if (fase === FASE.UBICANDO) lugarTexto.textContent = describirLugar(linea, caja.lugar());
  };

  const pintarMarcador = () => {
    const discoActual = Math.min(turno + 1, DISCOS_POR_RONDA);
    marcador.replaceChildren(el('span', '', puntos === 1 ? '1 punto' : `${puntos} puntos`), el('span', '', `disco ${discoActual}/${DISCOS_POR_RONDA}`));
  };

  const pintarDisco = () => {
    const revelado = fase === FASE.REVELADA || fase === FASE.FIN;
    const estado = { [FASE.ESPERA]: 'asomado', [FASE.UBICANDO]: 'mano' }[fase] ?? 'fuera';
    caja.mostrarDisco(estado, {
      texto: revelado ? String(disco.year) : '¿?',
      acento: revelado ? acentoDeAnio(disco.year) : null,
    });
    sonandoTitulo.textContent = disco.title;
    sonandoArtista.textContent = disco.artist;
  };

  const pintarAcciones = () => {
    if (fase === FASE.ESPERA) {
      lugarTexto.textContent = 'suena esta. ¿de qué año es?';
      acciones.replaceChildren(boton('accion primaria ancha', 'buscarle lugar.', comenzarBusqueda));
      return;
    }
    if (fase === FASE.FIN) {
      lugarTexto.textContent = `ubicaste ${puntos} de ${DISCOS_POR_RONDA}. ¿otra?`;
      acciones.replaceChildren(boton('accion primaria ancha', 'otra ronda.', empezar));
      return;
    }
    if (fase === FASE.REVELADA) {
      lugarTexto.textContent = acerto ? 'correcto. se queda en tu caja.' : `era de ${disco.year}. este se va.`;
      const ultimo = turno + 1 === DISCOS_POR_RONDA;
      acciones.replaceChildren(boton('accion ancha', ultimo ? 'ver cómo te fue.' : 'siguiente disco.', seguir));
      return;
    }
    const antes = boton('accion oscura', '‹ antes', () => caja.irA(caja.lugar() - 1));
    const despues = boton('accion oscura', 'después ›', () => caja.irA(caja.lugar() + 1));
    acciones.replaceChildren(antes, despues, boton('accion primaria ancha', 'va aquí.', ubicar));
  };

  const pintar = () => {
    pintarMarcador();
    pintarDisco();
    pintarAcciones();
    caja.activar(fase === FASE.UBICANDO);
    pintarLugar();
  };

  const prepararDisco = (faseInicial) => {
    fase = faseInicial;
    disco = mazo[turno];
    caja.cargar(linea, Math.floor(linea.length / 2));
    pintar();
  };

  const empezar = () => {
    ({ linea, mazo } = repartir());
    puntos = 0;
    turno = 0;
    prepararDisco(FASE.ESPERA);
  };

  const comenzarBusqueda = () => {
    fase = FASE.UBICANDO;
    pintar();
    caja.nodo.focus({ preventScroll: true });
    contenedor.scrollIntoView({ block: 'start' });
  };

  const ubicar = () => {
    if (fase !== FASE.UBICANDO) return;
    acerto = calzaEn(linea, caja.lugar(), disco);
    if (acerto) puntos += 1;
    const lugarReal = acerto ? caja.lugar() : linea.filter((funda) => funda.year < disco.year).length;
    fase = FASE.REVELADA;
    caja.irA(lugarReal);
    if (acerto) linea = [...linea.slice(0, lugarReal), disco, ...linea.slice(lugarReal)];
    pintar();
  };

  const seguir = () => {
    if (turno + 1 === DISCOS_POR_RONDA) {
      fase = FASE.FIN;
      pintar();
      return;
    }
    turno += 1;
    prepararDisco(FASE.UBICANDO);
    caja.nodo.focus({ preventScroll: true });
  };

  empezar();
}

function montarDecadas(lista) {
  const discos = [...lista.children];
  discos.forEach((disco, i) => disco.style.setProperty('--i', String(i)));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let actual = 0;
  let intervalo = null;
  const encender = (indice) => {
    actual = indice;
    discos.forEach((disco, i) => disco.classList.toggle('encendida', i === indice));
  };
  discos.forEach((disco, i) => disco.addEventListener('pointerenter', () => encender(i)));
  new IntersectionObserver(([vista]) => {
    clearInterval(intervalo);
    if (vista.isIntersecting) {
      lista.classList.add('visto');
      intervalo = setInterval(() => encender((actual + 1) % discos.length), 1800);
    }
  }, { threshold: 0.2 }).observe(lista);
}

document.querySelectorAll('[data-turno]').forEach(montarTurno);
document.querySelectorAll('[data-decadas]').forEach(montarDecadas);

const entradas = new IntersectionObserver((vistas) => {
  vistas.forEach((vista) => {
    if (!vista.isIntersecting) return;
    vista.target.classList.add('visto');
    entradas.unobserve(vista.target);
  });
}, { threshold: 0.1 });

document.querySelectorAll('section').forEach((seccion) => {
  seccion.querySelectorAll('[data-in]').forEach((node, i) => {
    node.style.setProperty('--retraso', `${Math.min(i, 6) * 75}ms`);
    entradas.observe(node);
  });
});

document.querySelectorAll('[data-switch]').forEach((interruptor) => {
  interruptor.addEventListener('click', () => {
    const encendido = interruptor.getAttribute('aria-checked') !== 'true';
    interruptor.setAttribute('aria-checked', String(encendido));
    interruptor.closest('.banda').classList.toggle('encendida', encendido);
  });
});
