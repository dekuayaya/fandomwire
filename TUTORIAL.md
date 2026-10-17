# Tutorial: cómo iniciar FandomWire (paso a paso)

Si nunca has usado una terminal, aquí va todo desde cero. Son 4 pasos.

## Paso 1. Instala Node.js
1. Entra a https://nodejs.org/en/download y descarga la versión **LTS** (debe ser la 22 o más nueva).
2. Ejecuta el instalador y deja todas las opciones por defecto (Siguiente, Siguiente…).
3. **Cierra y vuelve a abrir** cualquier terminal que tuvieras abierta.

Para comprobar que quedó bien, haz el Paso 3 y escribe `node -v` (debe decir `v22.5.0` o más).

## Paso 2. Descarga y descomprime el proyecto
1. Entra a https://github.com/dekuayaya/fandomwire
2. Botón verde **Code → Download ZIP**.
3. Haz clic derecho en el ZIP → **Extraer todo** (Windows) o doble clic (Mac).
4. Te queda una carpeta, por ejemplo `fandomwire-main`. Debe contener, entre otros, los archivos `package.json` y `server.js`. **Si al abrirla solo ves otra carpeta, entra a esa**: la correcta es la que tiene `package.json`.

Consejo: ponla en un lugar simple, como el Escritorio o Documentos.

## Paso 3. Abre la terminal EN esa carpeta
La terminal es la ventana de texto donde escribes comandos. Lo importante es que se abra **dentro de la carpeta del proyecto**.

### Windows (la forma más fácil)
1. Abre el Explorador de archivos y entra a la carpeta del proyecto (la que tiene `package.json`).
2. Haz clic en la **barra de direcciones** de arriba (donde sale la ruta).
3. Borra lo que dice, escribe `cmd` y pulsa **Enter**.
4. Se abre una ventana negra. Ya estás en el lugar correcto.

Otra forma: clic derecho en un espacio vacío dentro de la carpeta → **Abrir en Terminal** (Windows 11).

### Mac
1. Abre **Terminal** (Cmd + Espacio, escribe "Terminal").
2. Escribe `cd ` (con un espacio al final) y **arrastra la carpeta del proyecto a la ventana**. Pulsa Enter.

### Linux
Clic derecho dentro de la carpeta → **Abrir en terminal**, o `cd ruta/a/la/carpeta`.

### Si usas Visual Studio Code
Abre la carpeta (File → Open Folder) y luego el menú **Terminal → New Terminal**. Ya se abre dentro de la carpeta.

## Paso 4. Escribe `npm start`
En la terminal escribe exactamente esto y pulsa Enter:

    npm start

Debe aparecer algo como:

    FandomWire listo en http://localhost:3000

**Deja esa ventana abierta**: si la cierras, el sitio se apaga.

Ahora abre tu navegador y entra a **http://localhost:3000**.

- Para entrar al panel de administración: http://localhost:3000/admin.html con usuario `admin` y contraseña `Admin2026!`.
- Para apagar el sitio: en la terminal pulsa `Ctrl + C`.
- Para volver a encenderlo otro día: repite los pasos 3 y 4. No hace falta instalar nada otra vez.

## Problemas comunes

**`'npm' no se reconoce como un comando` / `command not found: npm`**
Node no está instalado o la terminal se abrió antes de instalarlo. Instálalo (Paso 1), **cierra la terminal y ábrela de nuevo**.

**En PowerShell sale "la ejecución de scripts está deshabilitada" (npm.ps1)**
Usa **cmd** en lugar de PowerShell (Paso 3, escribiendo `cmd` en la barra de direcciones), o ejecuta `npm.cmd start`.

**`Could not read package.json` / `ENOENT`**
La terminal no está en la carpeta correcta. Debe ser la que contiene `package.json`. Escribe `dir` (Windows) o `ls` (Mac/Linux) y comprueba que lo ves en la lista.

**Error con `node:sqlite` o "bad option: --experimental-sqlite"**
Tu Node es muy antiguo. Escribe `node -v`: necesitas `v22.5.0` o mayor. Instala la versión nueva desde https://nodejs.org/en/download.

**`EADDRINUSE` / "address already in use"**
El puerto 3000 ya lo usa otro programa (o tienes el sitio abierto en otra ventana). Cierra esa otra ventana o usa otro puerto:
- Windows (cmd): `set PORT=3001 && npm start`
- Mac/Linux: `PORT=3001 npm start`

Y entras a http://localhost:3001.

**El sitio abre pero se ve sin letra bonita**
Las tipografías vienen de Google Fonts; sin internet se ve con la letra del sistema. Todo lo demás funciona.

**Olvidé la contraseña de admin**
Cierra el sitio (`Ctrl + C`), borra la carpeta `data` del proyecto y vuelve a iniciarlo. Se crea todo de nuevo con la contraseña `Admin2026!`, pero **se pierden los usuarios y artículos que hayas creado**.

## ¿Y si quiero que otra persona lo vea?
Mira la sección "Mostrarlo a otra persona" del [README](README.md).
