# FandomWire

Sitio de noticias y fans de Series (Dragon Ball, JoJo), Música (Twenty One Pilots, Radiohead) y Videojuegos (Brawl Stars, Dream League Soccer).
Sin dependencias externas: solo Node 22.5+ (usa SQLite integrado).

## Arrancar
    npm start            # http://localhost:3000
Panel de administración: http://localhost:3000/admin.html

## Cuenta de administrador (se crea la primera vez que arranca)
    usuario:    admin
    contraseña: Admin2026!
CÁMBIALA al entrar (Cuenta → contraseña) o define antes de arrancar:
    ADMIN_USER=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm start

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

## Añadir tus archivos
Admin → Assets → Nuevo: elige sección/tema/categoría, sube el archivo (hasta 700 MB) y una miniatura. Los archivos protegidos
se guardan en `private/assets/` y solo se sirven a usuarios con sesión. Los ejemplos incluidos se pueden editar o borrar.

- **Minijuegos**: Admin → Minijuegos. Tipo `personaje` necesita respuesta y pistas (una por línea, de la más difícil a la más fácil); `cancion` un audio y 2-4 opciones; `imagen` una imagen y 2-4 opciones. La imagen se difumina solo con CSS: quien abra las herramientas del navegador puede verla completa, así que no es a prueba de trampas.
- **Canciones**: Admin → Canciones. Título y artista igual que en Spotify para que se reconozca. Videoclip por enlace de YouTube o archivo mp4/webm (los mp4 deben ser H.264). Letra en formato LRC (`[01:23.40] texto`). Usa solo letras que tengas derecho a publicar.

## Variables de entorno
| Variable | Para qué |
|---|---|
| `PORT` | Puerto (por defecto 3000) |
| `DATA_DIR` | Carpeta de la base de datos (en un hosting, apúntala a un disco persistente) |
| `ADMIN_USER`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Cuenta admin inicial |
| `ANTHROPIC_API_KEY` | Activa el asistente con IA (sin ella funciona el modo básico) |
| `CHAT_MODEL` | Modelo del asistente (por defecto `claude-haiku-5-5`) |
| `ANTHROPIC_BASE_URL` | Opcional, otra dirección de la API |
| `SPOTIFY_CLIENT_ID` | Activa "Ahora suena" con Spotify |
| `COOKIE_SECURE` | `1` si el sitio va por https |
| `MAX_UPLOAD_MB` | Límite de subida |

## Configurar Spotify (opcional)
1. Entra a https://developer.spotify.com/dashboard y crea una app (gratis).
2. En *Redirect URIs* agrega exactamente `https://TU-DOMINIO/escuchando.html` (o `http://127.0.0.1:3000/escuchando.html` para pruebas locales; Spotify no acepta `localhost`, usa `127.0.0.1`).
3. Copia el *Client ID* y arranca con `SPOTIFY_CLIENT_ID=... npm start`. No se usa ningún secreto: la vinculación es PKCE desde el navegador y los tokens quedan solo en el navegador de cada usuario.
4. Las apps nuevas de Spotify están en **modo desarrollo**: solo pueden vincular las cuentas que agregues en *User Management* del panel (hasta 25). Para abrirlo a todos hay que pedir una extensión a Spotify.
5. Para usar la página desde otro dispositivo necesitas https (o 127.0.0.1), porque Spotify lo exige.

**Apple Music no está soportado**: una página web no puede leer qué suena en la app, y su reproductor web requiere cuenta de desarrollador de pago. Se usa el *modo manual* (play en el sitio y en tu app, y se afina con el desfase).

Sincronía con YouTube: se controla el reproductor por mensajes; funciona en general pero depende de YouTube, así que si algo no coincide usa el ajuste manual. Con video propio (mp4/webm) la sincronía es más exacta.

## Datos
Base de datos: `data/fandomwire.db`. Respáldala copiando esa carpeta junto con `private/` y `public/uploads/`.
Al subirlo a un hosting gratuito, el disco suele borrarse al reiniciar: usa un disco persistente (`DATA_DIR`).
