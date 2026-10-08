# YouTube como proveedor de audio

YouTube es el proveedor por defecto del MVP hasta conseguir licencias (RMX-2, 7 oct 2026).
Estos son sus límites conocidos. Ninguno impide una prueba cerrada con 2–3 grupos; todos
aparecen al abrir el juego a más gente.

## Cuota de la Data API

- `search.list` tiene un cupo propio de **100 llamadas/día** por proyecto. `videos.list`
  sale de las 10.000 unidades/día que comparten el resto de los métodos.
  ([costos de cuota](https://developers.google.com/youtube/v3/determine_quota_cost))
- `GET /api/youtube/playlist-map` hace un `search.list` por cada canción del pack que no
  trae `providerIds.youtube`. Hoy son 14 de 35: las otras 21 tienen el id fijo en
  `backend/src/songs.ts`.
- Lo resuelto se cachea en la memoria del proceso: un reinicio o un deploy lo vacía y la
  siguiente partida vuelve a gastar cupo.
- `GET /api/youtube/search` gasta una llamada por consulta.
- Con el cupo agotado, `search.list` falla y esas canciones quedan fuera del mapa hasta el
  día siguiente. Fijar `providerIds.youtube` en el catálogo saca la canción del cupo.

## Autoplay en iOS

Safari en iOS no reproduce sin un gesto del usuario. `useYouTubePlayer` lo detecta
(`onAutoplayBlocked`) y reintenta con `playVideo()` dentro del siguiente toque, así que en
iPhone el jugador puede tener que tocar dos veces para escuchar la carta.

## Términos de YouTube

- Las [políticas para desarrolladores](https://developers.google.com/youtube/terms/developer-policies)
  (sección I, cláusulas 7–9) prohíben separar el audio del video y reproducir desde un
  player que no se muestra en la pantalla que el usuario está viendo.
- Los [requisitos del player embebido](https://developers.google.com/youtube/terms/required-minimum-functionality)
  piden un viewport de al menos 200×200 px y no autoreproducir hasta que más de la mitad
  del player sea visible.

Remix incumple las dos: el player mide 200×200 pero vive en un contenedor con `opacity-0`
desplazado fuera de la pantalla (`Game.tsx`, `Rosco.tsx`), y solo se escucha el audio. Se
acepta para la prueba cerrada. Antes de abrirlo al público hay que mostrar el player o
tener las licencias de otro proveedor.
