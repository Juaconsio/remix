const ACENTO_POR_DECADA = {
  1960: { fondo: '#ff6d00', tinta: '#0e0e0e' },
  1970: { fondo: '#e8341c', tinta: '#0e0e0e' },
  1980: { fondo: '#ff2d8f', tinta: '#0e0e0e' },
  1990: { fondo: '#ff5722', tinta: '#0e0e0e' },
  2000: { fondo: '#2540d6', tinta: '#fff4ed' },
  2010: { fondo: '#2cd9b8', tinta: '#0e0e0e' },
  2020: { fondo: '#a78bfa', tinta: '#0e0e0e' },
};

const PROFUNDIDAD_ENTRE_FUNDAS = 30;
const SUBIDA_ENTRE_FUNDAS = 15;
const DISTANCIA_ENTRE_CAIDAS = 9;
const INCLINACION_DE_ESPERA = 7;
const INCLINACION_HOJEADA = -64;
const INCLINACION_EXTRA_POR_FUNDA = 7;
const FUNDAS_VISIBLES_AL_FONDO = 3;
const FUNDAS_VISIBLES_ADELANTE = 3;
const PIXELES_POR_FUNDA = 44;
const TOLERANCIA_DE_TOQUE = 6;
const PIXELES_DE_RUEDA_POR_FUNDA = 60;

const acentoDeAnio = (anio) => ACENTO_POR_DECADA[Math.floor(anio / 10) * 10];
const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor));
const suavizar = (t) => t * t * (3 - 2 * t);

function nodoCon(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function poseDeFunda(distancia) {
  const hojeada = suavizar(limitar(0.5 - distancia, 0, 1));
  const atras = Math.max(0, distancia - 0.5);
  const adelante = Math.max(0, -distancia - 0.5);
  const z = -atras * PROFUNDIDAD_ENTRE_FUNDAS + adelante * DISTANCIA_ENTRE_CAIDAS + hojeada * 2;
  const y = -atras * SUBIDA_ENTRE_FUNDAS;
  const giro = INCLINACION_DE_ESPERA + (INCLINACION_HOJEADA - INCLINACION_DE_ESPERA) * hojeada - adelante * INCLINACION_EXTRA_POR_FUNDA;
  const oculta = atras > FUNDAS_VISIBLES_AL_FONDO || adelante > FUNDAS_VISIBLES_ADELANTE;
  return { transform: `translate3d(-50%, ${y}px, ${z}px) rotateX(${giro}deg)`, opacity: oculta ? '0' : '1' };
}

function crearPortada(cancion) {
  const funda = nodoCon('div', 'cv-funda');
  funda.setAttribute('aria-hidden', 'true');
  const acento = acentoDeAnio(cancion.year);
  funda.style.setProperty('--etiqueta', acento.fondo);
  funda.style.setProperty('--tinta-etiqueta', acento.tinta);

  const frente = nodoCon('div', 'cv-cara cv-frente');
  frente.append(
    nodoCon('b', 'cv-anio', String(cancion.year)),
    nodoCon('span', 'cv-titulo', cancion.title),
    nodoCon('span', 'cv-artista', cancion.artist),
    nodoCon('i', 'cv-sello'),
  );
  const dorso = nodoCon('div', 'cv-cara cv-dorso');
  dorso.append(nodoCon('b', 'cv-anio', String(cancion.year)), nodoCon('span', 'cv-artista', cancion.title));
  funda.append(frente, dorso);
  return funda;
}

function crearCajaDeVinilos({ rotulo, nota, pistaTactil, pistaMouse, nombreAccesible, describirLugar, alCambiarLugar, alConfirmar }) {
  const nodo = nodoCon('div', 'cv-caja');
  nodo.tabIndex = 0;
  nodo.setAttribute('role', 'slider');
  nodo.setAttribute('aria-label', nombreAccesible);

  const escena = nodoCon('div', 'cv-escena');
  const separador = nodoCon('div', 'cv-separador');
  separador.setAttribute('aria-hidden', 'true');
  const pestana = nodoCon('span', 'cv-pestana');
  separador.append(pestana);

  const disco = nodoCon('div', 'cv-disco');
  const vinilo = document.querySelector('#plantilla-vinilo').content.firstElementChild.cloneNode(true);
  const etiqueta = vinilo.querySelector('.etiqueta');
  disco.append(vinilo);

  const labio = nodoCon('div', 'cv-labio');
  labio.setAttribute('aria-hidden', 'true');
  labio.append(nodoCon('span', '', rotulo), nodoCon('span', 'cv-nota', nota));

  const pista = nodoCon('p', 'cv-pista', window.matchMedia('(pointer: coarse)').matches ? pistaTactil : pistaMouse);
  pista.setAttribute('aria-hidden', 'true');

  nodo.append(escena, pista, labio);

  let canciones = [];
  let fundas = [];
  let cursor = 0;
  let activa = false;
  let lugarSeparador = null;
  let arrastre = null;
  let ruedaAcumulada = 0;
  let yaHojeo = false;

  const ultimoLugar = () => canciones.length;
  const lugar = () => Math.round(cursor);

  const pintarAccesible = () => {
    nodo.setAttribute('aria-valuemin', '0');
    nodo.setAttribute('aria-valuemax', String(ultimoLugar()));
    nodo.setAttribute('aria-valuenow', String(lugar()));
    nodo.setAttribute('aria-valuetext', describirLugar(lugar()));
    nodo.setAttribute('aria-disabled', String(!activa));
  };

  const pintar = () => {
    fundas.forEach((funda, i) => {
      const { transform, opacity } = poseDeFunda(i + 0.5 - cursor);
      funda.style.transform = transform;
      funda.style.opacity = opacity;
      funda.classList.toggle('cv-a-la-vista', i === lugar());
    });
    if (lugarSeparador !== null) {
      const { transform, opacity } = poseDeFunda(lugarSeparador + 0.5 - cursor);
      separador.style.transform = transform;
      pestana.style.opacity = opacity;
    }
  };

  const irA = (destino) => {
    const anterior = lugar();
    cursor = limitar(destino, 0, ultimoLugar());
    pintar();
    pintarAccesible();
    if (lugar() === anterior) return;
    if (activa) {
      yaHojeo = true;
      pista.classList.remove('cv-visible');
    }
    alCambiarLugar(lugar());
  };

  const cargar = (nuevas, lugarInicial) => {
    canciones = nuevas;
    fundas = nuevas.map(crearPortada);
    escena.replaceChildren(...fundas, separador, disco);
    cursor = lugarInicial;
    pintar();
    pintarAccesible();
  };

  const activar = (valor) => {
    activa = valor;
    nodo.classList.toggle('cv-hojeable', valor);
    pista.classList.toggle('cv-visible', valor && !yaHojeo);
    pintarAccesible();
  };

  const marcarSeparador = (posicion, texto) => {
    lugarSeparador = posicion;
    pestana.textContent = texto ?? '';
    separador.classList.toggle('cv-visible', posicion !== null);
    pintar();
  };

  const mostrarDisco = (estado, { texto, acento }) => {
    disco.dataset.estado = estado;
    etiqueta.textContent = texto;
    etiqueta.style.setProperty('--etiqueta', acento ? acento.fondo : 'var(--crema)');
    etiqueta.style.setProperty('--tinta-etiqueta', acento ? acento.tinta : 'var(--negro)');
  };

  nodo.addEventListener('keydown', (evento) => {
    if (!activa) return;
    const destinos = {
      ArrowLeft: lugar() - 1,
      ArrowUp: lugar() - 1,
      ArrowRight: lugar() + 1,
      ArrowDown: lugar() + 1,
      Home: 0,
      End: ultimoLugar(),
    };
    if (evento.key in destinos) {
      evento.preventDefault();
      irA(destinos[evento.key]);
      return;
    }
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      alConfirmar();
    }
  });

  nodo.addEventListener('wheel', (evento) => {
    if (!activa) return;
    evento.preventDefault();
    ruedaAcumulada += evento.deltaY;
    if (Math.abs(ruedaAcumulada) < PIXELES_DE_RUEDA_POR_FUNDA) return;
    irA(lugar() + Math.sign(ruedaAcumulada));
    ruedaAcumulada = 0;
  }, { passive: false });

  nodo.addEventListener('pointerdown', (evento) => {
    if (!activa) return;
    arrastre = { id: evento.pointerId, x: evento.clientX, y: evento.clientY, inicio: cursor, movido: false };
    nodo.setPointerCapture(evento.pointerId);
  });

  nodo.addEventListener('pointermove', (evento) => {
    if (!arrastre || evento.pointerId !== arrastre.id) return;
    const dx = arrastre.x - evento.clientX;
    const dy = evento.clientY - arrastre.y;
    const avance = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (!arrastre.movido && Math.abs(avance) < TOLERANCIA_DE_TOQUE) return;
    arrastre.movido = true;
    nodo.classList.add('cv-arrastrando');
    irA(arrastre.inicio + avance / PIXELES_POR_FUNDA);
  });

  const soltar = (evento, destino) => {
    if (!arrastre || evento.pointerId !== arrastre.id) return;
    arrastre = null;
    nodo.classList.remove('cv-arrastrando');
    if (activa) irA(destino());
  };

  nodo.addEventListener('pointerup', (evento) => soltar(evento, lugar));
  nodo.addEventListener('pointercancel', (evento) => {
    const { inicio } = arrastre ?? {};
    soltar(evento, () => Math.round(inicio));
  });

  return { nodo, cargar, irA, lugar, activar, marcarSeparador, mostrarDisco };
}
