from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl
from pytube import YouTube
from pytube.exceptions import RegexMatchError, VideoUnavailable
from urllib.error import HTTPError as UrlHTTPError
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import json
import uuid
import logging
import os
import shutil
import subprocess


BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
LIBRARY_DB = BASE_DIR / "library.json"


class DownloadBody(BaseModel):
    url: HttpUrl


class Track(BaseModel):
    id: str
    title: str
    author: str | None = None
    duration: int | None = None
    filename: str
    src: str
    thumbnail: str | None = None


class SearchItem(BaseModel):
    id: str
    title: str
    author: str | None = None
    duration: int | None = None
    url: str
    thumbnail: str | None = None


def _load_library() -> list[Track]:
    if not LIBRARY_DB.exists():
        return []
    try:
        data = json.loads(LIBRARY_DB.read_text(encoding="utf-8"))
        return [Track(**t) for t in data]
    except Exception:
        return []


def _save_library(items: list[Track]) -> None:
    LIBRARY_DB.write_text(json.dumps([t.model_dump() for t in items], ensure_ascii=False, indent=2), encoding="utf-8")


app = FastAPI(title="Music Downloader & Library")
logging.basicConfig(level=logging.INFO)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount("/media", StaticFiles(directory=str(MEDIA_DIR), html=False), name="media")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/api/library", response_model=list[Track])
def list_library(request: Request):
    items = _load_library()
    base = str(request.base_url).rstrip("/")
    for t in items:
        if not t.src.startswith("http"):
            t.src = f"{base}{t.src}"
    return items


def _normalize_youtube_url(raw_url: str) -> str:
    """Normalize youtube short/shorts links to watch?v= style for pytube stability."""
    try:
        p = urlparse(raw_url)
    except Exception:
        return raw_url
    host = (p.netloc or '').lower()
    path = (p.path or '')
    canonical_host = 'www.youtube.com'
    if 'youtu.be' in host:
        vid = path.strip('/').split('/')[0]
        if vid:
            return f"https://{canonical_host}/watch?v={vid}"
    if ('youtube.com' in host or 'm.youtube.com' in host or 'music.youtube.com' in host) and path.startswith('/shorts/'):
        vid = path.split('/shorts/')[-1].split('/')[0]
        if vid:
            return f"https://{canonical_host}/watch?v={vid}"
    if host in {'m.youtube.com', 'music.youtube.com'} and path.startswith('/watch'):
        q = parse_qs(p.query or '')
        vid = q.get('v', [''])[0]
        if vid:
            return f"https://{canonical_host}/watch?v={vid}"
    if 'youtube.com' in host and path.startswith('/watch'):
        q = parse_qs(p.query or '')
        vid = q.get('v', [''])[0]
        if vid:
            return f"https://{canonical_host}/watch?v={vid}"
    return raw_url


def _yt_dlp_fallback(url: str) -> Track | None:
    """Try to download audio using yt-dlp as a fallback when pytube fails.
    Returns a Track on success or None if yt-dlp is not available."""
    try:
        import yt_dlp  
    except Exception:
        logging.info("yt-dlp no instalado; no se usa fallback")
        return None


    outtmpl = str(MEDIA_DIR / "%(title).120s-%(id)s.%(ext)s")
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': outtmpl,
        'noplaylist': True,
        'postprocessors': [],
        'quiet': True,
        'no_warnings': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            out_file = Path(filename)
            return Track(
                id=str(uuid.uuid4()),
                title=info.get('title') or out_file.stem,
                author=(info.get('uploader') or info.get('artist')),
                duration=int(info.get('duration') or 0),
                filename=out_file.name,
                src=f"/media/{out_file.name}",
                thumbnail=(info.get('thumbnail') or None),
            )
    except Exception as e:
        logging.warning("yt-dlp fallback failed: %s", e)
        return None


def _ensure_mp3(in_file: Path) -> Path:
    """Convert input audio file to MP3 using ffmpeg (libmp3lame).
    Returns the path to the mp3 file. If ffmpeg is missing, raises HTTPException 500."""
    if in_file.suffix.lower() == ".mp3":
        return in_file
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        # Allow skip conversion when explicitly opted-in
        if os.getenv('ALLOW_NON_MP3', '0') == '1':
            return in_file
        raise HTTPException(status_code=500, detail="FFmpeg no está instalado. Instálalo (ej. winget install -e --id Gyan.FFmpeg) para descargar en MP3. O bien establece ALLOW_NON_MP3=1 para permitir WEBM/M4A.")
    out_file = in_file.with_suffix(".mp3")
    cmd = [ffmpeg, "-y", "-i", str(in_file), "-vn", "-acodec", "libmp3lame", "-q:a", "2", str(out_file)]
    logging.info("Convirtiendo a mp3: %s", " ".join(cmd))
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        logging.error("ffmpeg error: %s", proc.stderr.decode(errors='ignore'))
        raise HTTPException(status_code=500, detail="Error al convertir a MP3 con ffmpeg.")
    try:
        in_file.unlink(missing_ok=True)
    except Exception:
        pass
    return out_file


@app.get("/api/search", response_model=list[SearchItem])
def search_youtube(q: str):
    """Search YouTube using yt-dlp without downloading. Returns top results."""
    try:
        import yt_dlp
    except Exception:
        raise HTTPException(status_code=500, detail="Se requiere 'yt-dlp' para buscar. Instálalo en el entorno del servidor.")

    query = q.strip()
    if not query:
        return []

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': 'in_playlist',  # avoids heavy fetch
        'skip_download': True,
    }
    items: list[SearchItem] = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch10:{query}", download=False)
            for e in info.get('entries', [])[:10]:
                vid = e.get('id') or ''
                title = e.get('title') or 'Sin título'
                url = f"https://www.youtube.com/watch?v={vid}" if vid else (e.get('url') or '')
                duration = e.get('duration')
                author = e.get('uploader') or e.get('artist') or e.get('channel')
                thumb = e.get('thumbnail')
                try:
                    d = int(duration) if duration is not None else None
                except Exception:
                    d = None
                items.append(SearchItem(id=vid or str(uuid.uuid4()), title=title, author=author, duration=d, url=url, thumbnail=thumb))
    except Exception as e:
        logging.warning("search error: %s", e)
        raise HTTPException(status_code=500, detail="Error buscando en YouTube")

    return items


@app.post("/api/download", response_model=Track)
def download_audio(body: DownloadBody, request: Request):
    url = _normalize_youtube_url(str(body.url))
    logging.info("/api/download url=%s", url)
    try:
        yt = YouTube(url)
        stream = yt.streams.get_audio_only()
        if stream is None:
            stream = (
                yt.streams.filter(only_audio=True)
                .order_by("abr")
                .desc()
                .first()
            )
        if stream is None:
            raise HTTPException(status_code=400, detail="No se encontró un stream de audio para este video.")

        safe_title = "".join(c for c in yt.title if c.isalnum() or c in (" ", "-", "_"))[:120].strip()
        base_name = f"{safe_title}-{yt.video_id}"
        out_path = stream.download(output_path=str(MEDIA_DIR), filename=base_name)
        out_file = Path(out_path)

        # Convertir a mp3 si hace falta
        try:
            mp3_file = _ensure_mp3(out_file)
        except HTTPException:
            raise
        except Exception as ce:
            logging.warning("No se pudo convertir a mp3: %s", ce)
            mp3_file = out_file

        track = Track(
            id=str(uuid.uuid4()),
            title=yt.title,
            author=yt.author,
            duration=int(yt.length or 0),
            filename=mp3_file.name,
            src=f"/media/{mp3_file.name}",
            thumbnail=yt.thumbnail_url,
        )

        items = _load_library()
        if not any(x.filename == track.filename for x in items):
            items.append(track)
            _save_library(items)

        base = str(request.base_url).rstrip("/")
        track.src = f"{base}{track.src}"
        return track
    except (RegexMatchError, VideoUnavailable) as e:
        logging.warning("Download rejected (invalid/unavailable): %s", e)
        raise HTTPException(status_code=422, detail=f"URL de YouTube no válida o no disponible: {e}")
    except UrlHTTPError as he:
        logging.warning("YouTube HTTP error %s: %s", getattr(he, 'code', '?'), getattr(he, 'reason', he))
        if os.getenv('ENABLE_YTDLP_FALLBACK', '0') == '1':
            alt = _yt_dlp_fallback(url)
            if alt:
                # Convertir a mp3
                try:
                    alt_path = MEDIA_DIR / alt.filename
                    mp3_file = _ensure_mp3(alt_path)
                    alt.filename = mp3_file.name
                    alt.src = f"/media/{mp3_file.name}"
                except HTTPException:
                    raise
                except Exception as ce:
                    logging.warning("No se pudo convertir a mp3 (fallback): %s", ce)
                items = _load_library()
                if not any(x.filename == alt.filename for x in items):
                    items.append(alt)
                    _save_library(items)
                base = str(request.base_url).rstrip("/")
                alt.src = f"{base}{alt.src}"
                return alt
        raise HTTPException(status_code=400, detail=f"YouTube respondió {getattr(he,'code','?')}: {getattr(he,'reason',he)}")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Unexpected error downloading %s: %s", url, e)
        if os.getenv('ENABLE_YTDLP_FALLBACK', '0') == '1':
            alt = _yt_dlp_fallback(url)
            if alt:
                try:
                    alt_path = MEDIA_DIR / alt.filename
                    mp3_file = _ensure_mp3(alt_path)
                    alt.filename = mp3_file.name
                    alt.src = f"/media/{mp3_file.name}"
                except HTTPException:
                    raise
                except Exception as ce:
                    logging.warning("No se pudo convertir a mp3 (fallback): %s", ce)
                items = _load_library()
                if not any(x.filename == alt.filename for x in items):
                    items.append(alt)
                    _save_library(items)
                base = str(request.base_url).rstrip("/")
                alt.src = f"{base}{alt.src}"
                return alt
        raise HTTPException(status_code=400, detail=f"No se pudo descargar el audio: {type(e).__name__}")


@app.delete("/api/library/{filename}")
def delete_from_library(filename: str):
    items = _load_library()
    remaining = [t for t in items if t.filename != filename]
    if len(remaining) == len(items):
        raise HTTPException(status_code=404, detail="Archivo no encontrado en la biblioteca")
    _save_library(remaining)
    file_path = MEDIA_DIR / filename
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass
    return {"ok": True}
