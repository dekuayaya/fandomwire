# FandomWire

Sitio de noticias y fans de **Series** (Dragon Ball, JoJo), **Música** (Twenty One Pilots, Radiohead) y **Videojuegos** (Brawl Stars, Dream League Soccer), con base de datos, login, panel de administración, minijuegos, perfiles, colores personalizables, asistente y "Ahora suena" con Spotify.

No usa librerías externas: no hay `npm install`. Solo necesita Node.js.

## Requisitos
- **Node.js 22.5 o superior** (recomendado: la versión **22 LTS** o más nueva).
  Descarga: https://nodejs.org/en/download
- Un navegador actual (Chrome, Edge, Firefox o Safari).
- Git (opcional, solo si lo clonas): https://git-scm.com/downloads

Para comprobar tu versión de Node, abre una terminal y escribe:

    node -v

Debe mostrar `v22.5.0` o mayor. Si muestra una versión menor (por ejemplo `v18` o `v20`), el sitio no arranca: instala la nueva desde el enlace de arriba.

## Cómo iniciarlo
> ¿Primera vez con una terminal? Sigue el **[tutorial paso a paso](TUTORIAL.md)**: explica dónde abrirla y cómo solucionar los errores más comunes.

1. **Descarga el proyecto**: en GitHub, botón verde *Code → Download ZIP*, y descomprímelo. O, con Git:

        git clone https://github.com/dekuayaya/fandomwire.git

2. **Abre una terminal dentro de la carpeta** del proyecto (la que tiene `package.json`).
   - Windows: en el Explorador, entra a la carpeta, escribe `cmd` en la barra de direcciones y pulsa Enter.
   - Mac/Linux: `cd` hasta la carpeta.
3. **Inícialo**:

        npm start

4. **Abre** http://localhost:3000 en el navegador.

La primera vez se crea solo la base de datos (carpeta `data/`) con contenido de ejemplo. Para detenerlo, pulsa `Ctrl + C` en la terminal.

Si el puerto 3000 está ocupado, usa otro: en Windows (cmd) `set PORT=3001 && npm start`; en Mac/Linux `PORT=3001 npm start`.

## Panel de administración
http://localhost:3000/admin.html

    usuario:    admin
    contraseña: Admin2026!

**Cámbiala al entrar** (Mi cuenta → contraseña), o define antes de arrancar:

    ADMIN_USER=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm start

(En Windows cmd: `set ADMIN_PASSWORD=tuclave` en una línea y `npm start` en la siguiente.)
La cuenta de admin solo se crea la primera vez; si ya existe la base de datos, el cambio de variables no la modifica.

## Mostrarlo a otra persona (sin subirlo a un hosting)
Con el sitio corriendo en tu computador, puedes darle un enlace público temporal con Cloudflare Tunnel o ngrok:

    cloudflared tunnel --url http://localhost:3000

Te muestra una dirección `https://algo.trycloudflare.com`. Funciona mientras tu computador esté encendido, el sitio corriendo y esa ventana abierta. Descarga: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

Si lo expones así, cambia antes la contraseña de admin y define `COOKIE_SECURE=1` (el enlace usa https).

## Qué incluye
- **Inicio**: portada de noticias; la noticia completa requiere cuenta. Misión diaria (trivia + XP + racha + ranking) que desbloquea assets.
- **Series / Música / Videojuegos**: noticias y temas de cada sección.
- **Biblioteca**: imágenes, videos, instrumentales, cover arts, videoclips, con descripción. Descarga solo con sesión (algunos con XP mínimo).
- **Ventas**: productos con stock; los pedidos quedan registrados para el admin.
- **Minijuegos**: adivina el personaje (pistas), la canción (clip de audio), la imagen (se va revelando) y quiz de 5 preguntas. Suman XP y ranking.
- **Perfil**: foto o emoji, banner, bio, tema favorito, insignias; perfil público en `/perfil.html?u=usuario`.
- **Colores** (botón 🎨): 7 temas listos y colores propios. Se guardan en tu cuenta.
- **Asistente** (botón 💬): responde sobre el sitio. Con clave de IA usa Claude; sin clave, un modo básico.
- **Ahora suena**: vincula Spotify para ver qué escuchas y sincronizar videoclip y letra, con ajuste manual.
- **Admin**: artículos, assets, productos, preguntas, minijuegos, canciones, temas, pedidos y usuarios.
