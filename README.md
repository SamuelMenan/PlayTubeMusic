# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    # Reproductor de música (Vite + React + FastAPI)

    Aplicación que simula una lista de reproducción usando una lista doble (doubly linked list). Permite:

    - Agregar canciones al inicio, al final o en cualquier posición
    - Eliminar canciones de la lista
    - Adelantar (next) y retroceder (prev)
    - Descargar audio desde YouTube con `pytube` e incorporarlo a la biblioteca local

    Los audios se guardan en `server/media/` y se sirven estáticamente desde el backend.

    ## Requisitos

    - Node 18+
    - Python 3.10+

    ## Backend (Python FastAPI)

    1) Crear entorno e instalar dependencias:

    ```
    cd server
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    ```

    2) Iniciar servidor (puerto 8000):

    ```
    uvicorn main:app --reload --port 8000
    ```

    Endpoints:
    - GET /api/library
    - POST /api/download { url }
    - DELETE /api/library/{filename}
    - Estáticos: /media/<archivo>

    ## Frontend (Vite + React)

    En otra terminal, desde la raíz del repo:

    ```
    npm install
    npm run dev
    ```

    Si ves CORS en dev, configura el proxy de Vite a `http://localhost:8000` o añade tu origen en `server/main.py`.

    ## Notas

    - `server/library.json` guarda el índice de la biblioteca y está ignorado en git.
    - Los audios descargados se agregan automáticamente a la biblioteca del reproductor.

## Iniciar frontend y backend al mismo tiempo

Para no abrir dos terminales manualmente, ya está configurado un script que levanta FastAPI (backend) y Vite (frontend) en paralelo.

1) Instala dependencias (desde la raíz del proyecto):

```
npm install
```

2) Inicia ambos servicios a la vez:

```
npm run dev
```

Esto hará:

- Backend: http://127.0.0.1:8000 (FastAPI con `uvicorn --reload`)
- Frontend: http://127.0.0.1:5173 (Vite). El proxy de Vite ya reenvía `/api` y `/media` al backend.

Notas (Windows / PowerShell):

- El script usa `cross-env` para definir `ENABLE_YTDLP_FALLBACK=1` en el backend durante el desarrollo. Así, si pytube falla con YouTube, se intenta `yt-dlp` automáticamente (si lo tienes instalado en el entorno del servidor).
- Asegúrate de instalar los paquetes de Python del servidor:

```
cd server
pip install -r requirements.txt
```
