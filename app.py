#!/usr/bin/env python3
"""
Cursor Studio - Backend Server
Servidor local para el editor interactivo de cursores en Linux Cinnamon / X11.
Soporta proyectos multi-cursores, gestión de temas guardados y resolución de conflictos.
"""

import os
import sys
import json
import base64
import shutil
import tempfile
import subprocess
import io
import struct
import time
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import urllib.parse
from PIL import Image, ImageSequence

def get_fallback_base_theme():
    for candidate in ["Bibata-Modern-Classic", "DMZ-White", "Adwaita", "Yaru"]:
        if (Path("/usr/share/icons") / candidate / "cursors").is_dir():
            return candidate
    return "Adwaita"


DEFAULT_BASE_THEME = get_fallback_base_theme()
STATIC_DIR = Path(__file__).resolve().parent / "static"
PROJECTS_DIR = Path.home() / ".cursor_studio" / "projects"
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
ICONS_DIR = Path.home() / ".icons"
ICONS_DIR.mkdir(parents=True, exist_ok=True)

CURSOR_DEFINITIONS = {
    "left_ptr": {
        "label": "Flecha Principal",
        "desc": "Puntero predeterminado de movimiento y selección",
        "icon": "🎯",
        "default_hotspot": "top-left",
        "aliases": ["left_ptr", "default", "arrow", "top_left_arrow", "top_left_pointer"]
    },
    "alias": {"label": "Alias", "desc": "Cursor alternativo para acciones secundarias", "icon": "↗️", "default_hotspot": "top-left", "aliases": ["alias"]},
    "all-scroll": {"label": "Desplazamiento total", "desc": "Desplazamiento en cualquier dirección", "icon": "✥", "default_hotspot": "center", "aliases": ["all-scroll"]},
    "auto": {"label": "Automático", "desc": "El navegador o sistema determina el cursor", "icon": "🖱️", "default_hotspot": "top-left", "aliases": ["auto"]},
    "cell": {"label": "Celda", "desc": "Selección de celdas en tablas o cuadrículas", "icon": "▦", "default_hotspot": "center", "aliases": ["cell"]},
    "col-resize": {"label": "Redimensión de columna", "desc": "Ajuste horizontal de columnas", "icon": "↔️", "default_hotspot": "center", "aliases": ["col-resize"]},
    "context-menu": {"label": "Menú contextual", "desc": "Cursor para abrir un menú contextual", "icon": "☷", "default_hotspot": "top-left", "aliases": ["context-menu"]},
    "copy": {"label": "Copiar", "desc": "Indica que un elemento puede copiarse", "icon": "📋", "default_hotspot": "top-left", "aliases": ["copy"]},
    "default": {"label": "Predeterminado", "desc": "Cursor predeterminado del sistema", "icon": "↖️", "default_hotspot": "top-left", "aliases": ["default"]},
    "e-resize": {"label": "Redimensión Este", "desc": "Ajuste del borde derecho", "icon": "→", "default_hotspot": "center", "aliases": ["e-resize"]},
    "grab": {"label": "Agarrar", "desc": "Elemento disponible para arrastrar", "icon": "✋", "default_hotspot": "center", "aliases": ["grab"]},
    "grabbing": {"label": "Agarrando", "desc": "Elemento mientras se arrastra", "icon": "✊", "default_hotspot": "center", "aliases": ["grabbing"]},
    "pointer": {
        "label": "Manita / Enlace",
        "desc": "Puntero para enlaces web y botones interactivos",
        "icon": "👆",
        "default_hotspot": "top-left",
        "aliases": [
            "pointer", "hand", "hand1", "hand2", "pointing_hand",
            "link",
            "e29285e634086352946a0e7090d73106",
            "9d800788f1b08800ae810202380a0822",
            "3085a0e285430894940527032f8b26df",
            "640fb0e74195791501fd1ed57b41487f",
            "a2a266d0498c3104214a47bd64ab0fc8"
        ]
    },
    "wait": {
        "label": "Espera / Carga total",
        "desc": "Reloj o spinner cuando la aplicación o el sistema está ocupado",
        "icon": "⏳",
        "default_hotspot": "center",
        "aliases": ["wait", "watch", "0426c80cadc00023910b0016280800ff"]
    },
    "left_ptr_watch": {
        "label": "En segundo plano",
        "desc": "Flecha con indicador cuando una aplicación se inicia",
        "icon": "⏱️",
        "default_hotspot": "top-left",
        "aliases": [
            "left_ptr_watch", "progress",
            "00000000000000020006000e7e9ffc3f",
            "08e8e1c95fe2fc01f976f1e063a24ccd",
            "3ecb610c1bf2410f44200f48c40d3599"
        ]
    },
    "text": {
        "label": "Selección de Texto",
        "desc": "I-Beam para colocar el cursor de texto o seleccionar palabras",
        "icon": "🔤",
        "default_hotspot": "center",
        "aliases": ["text", "xterm", "ibeam"]
    },
    "not-allowed": {
        "label": "Prohibido",
        "desc": "Acción no disponible o destino denegado",
        "icon": "🚫",
        "default_hotspot": "center",
        "aliases": [
            "not-allowed", "circle", "crossed_circle", "forbidden",
            "dnd-none", "dnd_no_drop", "03b6e0fcb3499374a867c041f52298f0"
        ]
    },
    "move": {
        "label": "Mover",
        "desc": "Flechas en cruz para arrastrar ventanas y objetos",
        "icon": "✥",
        "default_hotspot": "center",
        "aliases": [
            "move", "all-scroll", "fleur", "size_all",
            "4498f0e0c1937ffe01fd06f973665830",
            "9081237383d90e509aa00f00170e968f"
        ]
    },
    "crosshair": {
        "label": "Cruz de Precisión",
        "desc": "Para diseño, selección o dibujo exacto",
        "icon": "➕",
        "default_hotspot": "center",
        "aliases": ["crosshair", "cross", "cross_reverse", "diamond_cross", "tcross"]
    },
    "ns-resize": {
        "label": "Redimensión Vertical",
        "desc": "Ajuste de bordes superior e inferior",
        "icon": "↕️",
        "default_hotspot": "center",
        "aliases": [
            "ns-resize", "v-double-arrow", "sb_v_double_arrow",
            "double_arrow", "v_double_arrow", "row-resize",
            "size-ver", "size_ver", "split_v",
            "00008160000006810000408080010102",
            "2870a09082c103050810ffdffffe0204"
        ]
    },
    "ew-resize": {
        "label": "Redimensión Horizontal",
        "desc": "Ajuste de bordes laterales",
        "icon": "↔️",
        "default_hotspot": "center",
        "aliases": [
            "ew-resize", "h-double-arrow", "sb_h_double_arrow",
            "h_double_arrow", "col-resize", "size-hor", "size_hor", "split_h",
            "028006030e0e7ebffc7f7070c0600140",
            "14fef782d02440884392942c1120523",
            "14fef782d02440884392942c11205230"
        ]
    },
    "help": {
        "label": "Ayuda",
        "desc": "Flecha con signo de interrogación",
        "icon": "❓",
        "default_hotspot": "top-left",
        "aliases": [
            "help", "question_arrow", "left_ptr_help", "whats_this",
            "d9ce0ab605698f320427677b458ad60b",
            "5c6cd98b3f3ebcb1f9c7f1c204630408",
            "5c6cd98b3f3ebcb01f17a52e0887e1f0",
            "d9ce0ab6076983704840052347d50678"
        ]
    },
    "n-resize": {"label": "Redimensión Norte", "desc": "Ajuste del borde superior", "icon": "↑", "default_hotspot": "center", "aliases": ["n-resize"]},
    "ne-resize": {"label": "Redimensión Noreste", "desc": "Ajuste de la esquina superior derecha", "icon": "↗️", "default_hotspot": "center", "aliases": ["ne-resize"]},
    "nesw-resize": {"label": "Redimensión diagonal NE-SO", "desc": "Ajuste diagonal de esquinas", "icon": "⤢", "default_hotspot": "center", "aliases": ["nesw-resize"]},
    "nw-resize": {"label": "Redimensión Noroeste", "desc": "Ajuste de la esquina superior izquierda", "icon": "↖️", "default_hotspot": "center", "aliases": ["nw-resize"]},
    "nwse-resize": {"label": "Redimensión diagonal NO-SE", "desc": "Ajuste diagonal de esquinas", "icon": "⤡", "default_hotspot": "center", "aliases": ["nwse-resize"]},
    "no-drop": {"label": "No soltar", "desc": "Indica que no se puede soltar aquí", "icon": "🚫", "default_hotspot": "center", "aliases": ["no-drop"]},
    "none": {"label": "Ninguno", "desc": "Oculta el cursor", "icon": "∅", "default_hotspot": "top-left", "aliases": ["none"]},
    "progress": {"label": "Progreso", "desc": "Trabajo en curso pero el sistema sigue disponible", "icon": "⏳", "default_hotspot": "top-left", "aliases": ["progress"]},
    "row-resize": {"label": "Redimensión de fila", "desc": "Ajuste vertical de filas", "icon": "↕️", "default_hotspot": "center", "aliases": ["row-resize"]},
    "s-resize": {"label": "Redimensión Sur", "desc": "Ajuste del borde inferior", "icon": "↓", "default_hotspot": "center", "aliases": ["s-resize"]},
    "se-resize": {"label": "Redimensión Sureste", "desc": "Ajuste de la esquina inferior derecha", "icon": "↘️", "default_hotspot": "center", "aliases": ["se-resize"]},
    "sw-resize": {"label": "Redimensión Suroeste", "desc": "Ajuste de la esquina inferior izquierda", "icon": "↙️", "default_hotspot": "center", "aliases": ["sw-resize"]},
    "w-resize": {"label": "Redimensión Oeste", "desc": "Ajuste del borde izquierdo", "icon": "←", "default_hotspot": "center", "aliases": ["w-resize"]},
    "zoom-in": {"label": "Acercar", "desc": "Aumentar el zoom", "icon": "🔍", "default_hotspot": "center", "aliases": ["zoom-in"]},
    "zoom-out": {"label": "Alejar", "desc": "Reducir el zoom", "icon": "🔎", "default_hotspot": "center", "aliases": ["zoom-out"]}
}

FILE_TO_CANONICAL = {}
for canonical, info in CURSOR_DEFINITIONS.items():
    for alias in info["aliases"]:
        FILE_TO_CANONICAL[alias] = canonical

# Nombres que son el alias primario de OTRO tipo seleccionable (ej. "default" es
# propio de left_ptr, pero también su propio tipo en CURSOR_DEFINITIONS). Un tipo
# no debe reescribir el archivo primario de otro al compilar sus alias secundarios,
# o un tipo eliminado "resucita" cuando se reaplica el tipo que comparte ese alias.
PRIMARY_ALIAS_NAMES = {info["aliases"][0] for info in CURSOR_DEFINITIONS.values()}


def get_current_theme():
    try:
        res = subprocess.run(
            ["gsettings", "get", "org.cinnamon.desktop.interface", "cursor-theme"],
            capture_output=True, text=True, check=True
        )
        theme = res.stdout.strip().strip("'\"")
        return theme if theme else DEFAULT_BASE_THEME
    except Exception:
        return DEFAULT_BASE_THEME


def apply_theme(theme_name, size=None):
    current = get_current_theme()
    fallback = DEFAULT_BASE_THEME if DEFAULT_BASE_THEME != theme_name else ("DMZ-White" if (Path("/usr/share/icons/DMZ-White/cursors")).is_dir() else "Adwaita")

    # 1. Actualizar ~/.icons/default/index.theme para clientes X11 generales
    try:
        default_theme_dir = ICONS_DIR / "default"
        default_theme_dir.mkdir(parents=True, exist_ok=True)
        (default_theme_dir / "index.theme").write_text(
            f"[Icon Theme]\nName=Default\nComment=Default Cursor Theme\nInherits={theme_name}\n",
            encoding="utf-8"
        )
    except Exception as e:
        print(f"Error actualizando ~/.icons/default/index.theme: {e}", file=sys.stderr)

    # 2. Actualizar configuración en GTK-3.0 y GTK-4.0
    for gtk_ver in ["gtk-3.0", "gtk-4.0"]:
        try:
            gtk_dir = Path.home() / ".config" / gtk_ver
            gtk_dir.mkdir(parents=True, exist_ok=True)
            settings_file = gtk_dir / "settings.ini"
            lines = []
            if settings_file.exists():
                lines = settings_file.read_text(encoding="utf-8").splitlines()

            new_lines = []
            in_settings = False
            found_theme = False
            found_size = False
            for line in lines:
                if line.strip() == "[Settings]":
                    in_settings = True
                    new_lines.append(line)
                    continue
                if in_settings and line.startswith("["):
                    if not found_theme:
                        new_lines.append(f"gtk-cursor-theme-name = {theme_name}")
                        found_theme = True
                    if size and not found_size:
                        new_lines.append(f"gtk-cursor-theme-size = {size}")
                        found_size = True
                    in_settings = False
                if in_settings and line.strip().startswith("gtk-cursor-theme-name"):
                    new_lines.append(f"gtk-cursor-theme-name = {theme_name}")
                    found_theme = True
                    continue
                if in_settings and size and line.strip().startswith("gtk-cursor-theme-size"):
                    new_lines.append(f"gtk-cursor-theme-size = {size}")
                    found_size = True
                    continue
                new_lines.append(line)
            if not in_settings and not found_theme:
                if not lines or "[Settings]" not in lines:
                    new_lines.append("[Settings]")
                new_lines.append(f"gtk-cursor-theme-name = {theme_name}")
                if size and not found_size:
                    new_lines.append(f"gtk-cursor-theme-size = {size}")
            settings_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        except Exception as e:
            print(f"Error actualizando {gtk_ver}/settings.ini: {e}", file=sys.stderr)

    # 3. Actualizar base de datos de recursos X11 (xrdb)
    try:
        xrdb_content = f"Xcursor.theme: {theme_name}\n"
        if size:
            xrdb_content += f"Xcursor.size: {size}\n"
        subprocess.run(["xrdb", "-merge"], input=xrdb_content, text=True, check=False)
    except Exception as e:
        print(f"Error actualizando xrdb: {e}", file=sys.stderr)

    # 4. Forzar refresco en Cinnamon/GNOME/Muffin mediante toggle si el tema ya estaba activo
    schemas = ["org.cinnamon.desktop.interface", "org.gnome.desktop.interface"]
    if current == theme_name:
        for schema in schemas:
            try:
                subprocess.run(["gsettings", "set", schema, "cursor-theme", fallback], check=False)
            except Exception:
                pass
        time.sleep(0.15)

    for schema in schemas:
        try:
            subprocess.run(["gsettings", "set", schema, "cursor-theme", theme_name], check=False)
            if size:
                subprocess.run(["gsettings", "set", schema, "cursor-size", str(size)], check=False)
        except Exception:
            pass

    # 5. Notificar a la ventana raíz de X11
    try:
        subprocess.run(["xsetroot", "-cursor_name", "left_ptr"], check=False)
    except Exception:
        pass


def parse_xcursor(path):
    """
    Parsea un archivo binario Xcursor y retorna fotogramas, hotspot y retrasos.
    """
    try:
        data = Path(path).read_bytes()
        if len(data) < 16:
            return None
        magic, header_sz, ver, ntoc = struct.unpack('<4I', data[:16])
        if magic != 0x72756358:
            return None

        frames = []
        for i in range(ntoc):
            ctype, subtype, pos = struct.unpack('<3I', data[16 + i * 12:16 + (i + 1) * 12])
            if ctype == 0xfffd0002:  # XCUR_IMAGE_TYPE
                hsz, itype, isub, iver, w, h, xh, yh, delay = struct.unpack('<9I', data[pos:pos + 36])
                pix_data = data[pos + 36:pos + 36 + w * h * 4]
                im = Image.frombytes('RGBA', (w, h), pix_data, 'raw', 'BGRA')

                with io.BytesIO() as buf:
                    im.save(buf, format="PNG")
                    b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")

                frames.append({
                    "dataUrl": b64,
                    "delay": delay if delay > 0 else 80,
                    "hotspot": {"x": xh, "y": yh},
                    "width": w,
                    "height": h
                })

        return frames if frames else None
    except Exception as e:
        print(f"Error parseando xcursor {path}: {e}", file=sys.stderr)
        return None


def get_all_projects_and_themes():
    """
    Retorna la lista de proyectos guardados y temas en ~/.icons/
    """
    current_theme = get_current_theme()
    projects = {}

    # 1. Proyectos guardados en ~/.cursor_studio/projects/
    for json_path in PROJECTS_DIR.glob("*.json"):
        try:
            p_data = json.loads(json_path.read_text(encoding="utf-8"))
            name = p_data.get("theme_name") or json_path.stem
            cursors_info = {}
            for ctype, cval in p_data.get("cursors", {}).items():
                first_frame = cval.get("frames", [None])[0]
                thumb = first_frame.get("dataUrl") if isinstance(first_frame, dict) else None
                cursors_info[ctype] = {
                    "count": len(cval.get("frames", [])),
                    "hotspot": cval.get("hotspot", {"x": 0, "y": 0}),
                    "thumb": thumb,
                    "label": CURSOR_DEFINITIONS.get(ctype, {}).get("label", ctype),
                    "icon": CURSOR_DEFINITIONS.get(ctype, {}).get("icon", "✨")
                }

            projects[name] = {
                "name": name,
                "is_active": (name == current_theme),
                "has_project_file": True,
                "project_path": str(json_path),
                "size": p_data.get("size", 36),
                "cursor_types": list(cursors_info.keys()),
                "cursors_summary": cursors_info,
                "updated_at": os.path.getmtime(json_path),
                "conflict_warning": False
            }
        except Exception as e:
            print(f"Error cargando proyecto {json_path}: {e}", file=sys.stderr)

    # 2. Temas instalados en ~/.icons/
    for theme_dir in ICONS_DIR.iterdir():
        if not theme_dir.is_dir():
            continue
        theme_name = theme_dir.name
        cursors_dir = theme_dir / "cursors"
        if not cursors_dir.exists() or not cursors_dir.is_dir():
            continue

        # Verificar si tiene archivo de proyecto embebido
        embedded_json = theme_dir / "cursor_studio_project.json"
        if embedded_json.exists() and theme_name not in projects:
            try:
                p_data = json.loads(embedded_json.read_text(encoding="utf-8"))
                cursors_info = {}
                for ctype, cval in p_data.get("cursors", {}).items():
                    first_frame = cval.get("frames", [None])[0]
                    thumb = first_frame.get("dataUrl") if isinstance(first_frame, dict) else None
                    cursors_info[ctype] = {
                        "count": len(cval.get("frames", [])),
                        "hotspot": cval.get("hotspot", {"x": 0, "y": 0}),
                        "thumb": thumb,
                        "label": CURSOR_DEFINITIONS.get(ctype, {}).get("label", ctype),
                        "icon": CURSOR_DEFINITIONS.get(ctype, {}).get("icon", "✨")
                    }

                projects[theme_name] = {
                    "name": theme_name,
                    "is_active": (theme_name == current_theme),
                    "has_project_file": True,
                    "project_path": str(embedded_json),
                    "size": p_data.get("size", 36),
                    "cursor_types": list(cursors_info.keys()),
                    "cursors_summary": cursors_info,
                    "updated_at": os.path.getmtime(embedded_json),
                    "conflict_warning": False
                }
                continue
            except Exception:
                pass

        if theme_name in projects:
            continue

        # Si no tiene JSON, inspeccionamos los cursores binarios en cursors_dir
        found_canonical = set()
        cursors_info = {}
        has_conflict = False

        left_ptr_file = cursors_dir / "left_ptr"
        wait_file = cursors_dir / "wait"
        if left_ptr_file.exists() and wait_file.exists() and not left_ptr_file.is_symlink() and not wait_file.is_symlink():
            try:
                if left_ptr_file.stat().st_size == wait_file.stat().st_size:
                    if left_ptr_file.read_bytes() == wait_file.read_bytes():
                        has_conflict = True
            except Exception:
                pass

        for ctype, cdef in CURSOR_DEFINITIONS.items():
            primary_file = cursors_dir / cdef["aliases"][0]
            if primary_file.exists() and not primary_file.is_symlink():
                found_canonical.add(ctype)
                parsed = parse_xcursor(primary_file)
                thumb = parsed[0]["dataUrl"] if parsed else None
                cursors_info[ctype] = {
                    "count": len(parsed) if parsed else 1,
                    "hotspot": parsed[0]["hotspot"] if parsed else {"x": 0, "y": 0},
                    "thumb": thumb,
                    "label": cdef["label"],
                    "icon": cdef["icon"]
                }

        projects[theme_name] = {
            "name": theme_name,
            "is_active": (theme_name == current_theme),
            "has_project_file": False,
            "project_path": None,
            "size": 36,
            "cursor_types": list(found_canonical),
            "cursors_summary": cursors_info,
            "updated_at": os.path.getmtime(cursors_dir),
            "conflict_warning": has_conflict
        }

    sorted_list = sorted(
        projects.values(),
        key=lambda p: (not p["is_active"], -p["updated_at"])
    )
    return sorted_list


MEDIA_DIR = Path.home() / ".cursor_studio" / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def save_media_asset(name, frames, media_type="image", source_filename=None, media_id=None):
    if not frames:
        return None
    
    clean_stem = "".join(c for c in Path(name).stem if c.isalnum() or c in ("-", "_", " ")).strip() or "media"
    clean_id_stem = "".join(c for c in clean_stem if c.isalnum() or c in ("-", "_")).strip() or "media"
    if not media_id:
        media_id = f"{clean_id_stem}_{int(time.time())}_{os.urandom(3).hex()}"

    first = frames[0]
    w = first.get("width", 32)
    h = first.get("height", 32)
    duration = first.get("delay", 80)
    thumb = first.get("dataUrl", "")

    formatted_frames = []
    for f in frames:
        formatted_frames.append({
            "dataUrl": f.get("dataUrl", ""),
            "delay": f.get("delay", duration),
            "width": f.get("width", w),
            "height": f.get("height", h)
        })

    is_anim = len(formatted_frames) > 1 or media_type == "gif"

    media_obj = {
        "id": media_id,
        "name": clean_stem,
        "original_filename": source_filename or name,
        "type": "gif" if is_anim else "image",
        "created_at": time.time(),
        "frame_count": len(formatted_frames),
        "width": w,
        "height": h,
        "duration": duration,
        "thumbnail": thumb,
        "frames": formatted_frames
    }

    item_path = MEDIA_DIR / f"{media_id}.json"
    with open(item_path, "w", encoding="utf-8") as fp:
        json.dump(media_obj, fp)

    return {
        "id": media_id,
        "name": media_obj["name"],
        "original_filename": media_obj["original_filename"],
        "type": media_obj["type"],
        "created_at": media_obj["created_at"],
        "frame_count": media_obj["frame_count"],
        "width": w,
        "height": h,
        "duration": duration,
        "thumbnail": thumb
    }


def get_media_library():
    if not MEDIA_DIR.exists():
        MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    files = list(MEDIA_DIR.glob("*.json"))
    # Seed library from existing projects if empty
    if not files:
        for p_file in PROJECTS_DIR.glob("*.json"):
            try:
                p_data = json.loads(p_file.read_text(encoding="utf-8"))
                for ctype, cdata in p_data.get("cursors", {}).items():
                    c_frames = cdata.get("frames", [])
                    if c_frames:
                        c_label = CURSOR_DEFINITIONS.get(ctype, {}).get("label", ctype)
                        save_media_asset(
                            f"{p_data.get('theme_name', 'Tema')} - {c_label}",
                            c_frames,
                            media_type="gif" if len(c_frames) > 1 else "image",
                            source_filename=f"{ctype}.png"
                        )
            except Exception as e:
                print(f"Error seeding media from {p_file}: {e}", file=sys.stderr)
        files = list(MEDIA_DIR.glob("*.json"))

    items = []
    for p in files:
        try:
            with open(p, "r", encoding="utf-8") as fp:
                data = json.load(fp)
                thumb = data.get("thumbnail") or (data.get("frames", [{}])[0].get("dataUrl", "") if data.get("frames") else "")
                items.append({
                    "id": data.get("id", p.stem),
                    "name": data.get("name", p.stem),
                    "original_filename": data.get("original_filename", ""),
                    "type": data.get("type", "image"),
                    "created_at": data.get("created_at", p.stat().st_mtime),
                    "frame_count": data.get("frame_count", len(data.get("frames", []))),
                    "width": data.get("width", 32),
                    "height": data.get("height", 32),
                    "duration": data.get("duration", 80),
                    "thumbnail": thumb
                })
        except Exception as e:
            print(f"Error leyendo archivo de media {p}: {e}", file=sys.stderr)

    items.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return items


def get_media_asset(media_id):
    safe_id = "".join(c for c in media_id if c.isalnum() or c in ("-", "_")).strip()
    p = MEDIA_DIR / f"{safe_id}.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error leyendo media {p}: {e}", file=sys.stderr)
    return None


def delete_media_asset(media_id):
    safe_id = "".join(c for c in media_id if c.isalnum() or c in ("-", "_")).strip()
    p = MEDIA_DIR / f"{safe_id}.json"
    if p.exists():
        p.unlink()
        return True
    return False


class CursorStudioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/api/status", "/api/projects", "/api/media"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        return super().do_HEAD()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/status":
            self.send_json({
                "current_theme": get_current_theme(),
                "base_theme": DEFAULT_BASE_THEME,
                "definitions": CURSOR_DEFINITIONS
            })
            return

        elif path == "/api/projects":
            self.send_json({
                "current_theme": get_current_theme(),
                "projects": get_all_projects_and_themes()
            })
            return

        elif path.startswith("/api/projects/"):
            project_name = urllib.parse.unquote(path[len("/api/projects/"):])
            self.handle_load_project(project_name)
            return

        elif path == "/api/media":
            self.send_json({
                "success": True,
                "media": get_media_library()
            })
            return

        elif path.startswith("/api/media/"):
            media_id = urllib.parse.unquote(path[len("/api/media/"):])
            asset = get_media_asset(media_id)
            if asset:
                self.send_json({"success": True, "media": asset})
            else:
                self.send_json({"error": f"Medio '{media_id}' no encontrado"}, code=404)
            return

        elif path == "/" or path == "":
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            data = {}

        if parsed.path == "/api/upload":
            self.handle_upload(data)
        elif parsed.path == "/api/install":
            self.handle_install(data)
        elif parsed.path == "/api/projects/save":
            self.handle_save_project(data)
        elif parsed.path == "/api/projects/delete":
            self.handle_delete_project(data)
        elif parsed.path == "/api/apply":
            self.handle_apply_theme(data)
        elif parsed.path == "/api/restore":
            self.handle_restore()
        elif parsed.path == "/api/repair_theme":
            self.handle_repair_theme(data)
        elif parsed.path == "/api/media/save":
            self.handle_save_media(data)
        elif parsed.path == "/api/media/delete":
            self.handle_delete_media(data)
        else:
            self.send_error(404, "Endpoint no encontrado")

    def send_json(self, obj, code=200):
        res = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(res)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(res)

    def handle_upload(self, data):
        file_data = data.get("file_data")
        if not file_data:
            self.send_json({"error": "No se envió ningún archivo"}, code=400)
            return

        if "," in file_data:
            file_data = file_data.split(",", 1)[1]

        try:
            raw_bytes = base64.b64decode(file_data)
            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(raw_bytes)
                tmp_path = tmp.name

            im = Image.open(tmp_path)
            frames = []
            is_animated = getattr(im, "is_animated", False)

            if is_animated:
                for frame in ImageSequence.Iterator(im):
                    rgba = frame.convert("RGBA")
                    duration = frame.info.get("duration", 80)
                    if not duration or duration <= 0:
                        duration = 80
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as ftmp:
                        rgba.save(ftmp.name, format="PNG")
                        ftmp.seek(0)
                        fbytes = ftmp.read()
                        b64 = "data:image/png;base64," + base64.b64encode(fbytes).decode("ascii")
                        frames.append({"dataUrl": b64, "delay": duration, "width": rgba.width, "height": rgba.height})
                    os.unlink(ftmp.name)
            else:
                rgba = im.convert("RGBA")
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as ftmp:
                    rgba.save(ftmp.name, format="PNG")
                    ftmp.seek(0)
                    fbytes = ftmp.read()
                    b64 = "data:image/png;base64," + base64.b64encode(fbytes).decode("ascii")
                    frames.append({"dataUrl": b64, "delay": 100, "width": rgba.width, "height": rgba.height})
                os.unlink(ftmp.name)

            os.unlink(tmp_path)

            file_name = data.get("filename") or data.get("name") or "medio_importado"
            media_item = save_media_asset(
                file_name,
                frames,
                media_type="gif" if is_animated else "image",
                source_filename=file_name
            )

            self.send_json({
                "success": True,
                "frames": frames,
                "media": media_item
            })
        except Exception as e:
            self.send_json({"error": f"Error al procesar la imagen: {str(e)}"}, code=500)

    def handle_save_media(self, data):
        name = data.get("name", "Media").strip() or "Media"
        frames = data.get("frames", [])
        media_type = data.get("type", "image")
        if not frames:
            self.send_json({"error": "No se enviaron fotogramas para guardar"}, code=400)
            return
        meta = save_media_asset(name, frames, media_type=media_type)
        if meta:
            self.send_json({"success": True, "media": meta})
        else:
            self.send_json({"error": "No se pudo guardar el medio"}, code=500)

    def handle_delete_media(self, data):
        media_id = data.get("id", "")
        if not media_id:
            self.send_json({"error": "ID de medio no proporcionado"}, code=400)
            return
        if delete_media_asset(media_id):
            self.send_json({"success": True, "message": "Medio eliminado correctamente"})
        else:
            self.send_json({"error": "Medio no encontrado"}, code=404)

    def handle_load_project(self, project_name):
        safe_name = "".join(c for c in project_name if c.isalnum() or c in ("-", "_")).strip()
        if not safe_name:
            self.send_json({"error": "Nombre de proyecto inválido"}, code=400)
            return

        json_path = PROJECTS_DIR / f"{safe_name}.json"
        if json_path.exists():
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
                self.send_json({"success": True, "project": data})
                return
            except Exception as e:
                print(f"Error leyendo {json_path}: {e}", file=sys.stderr)

        embedded_json = ICONS_DIR / safe_name / "cursor_studio_project.json"
        if embedded_json.exists():
            try:
                data = json.loads(embedded_json.read_text(encoding="utf-8"))
                self.send_json({"success": True, "project": data})
                return
            except Exception as e:
                print(f"Error leyendo {embedded_json}: {e}", file=sys.stderr)

        theme_dir = ICONS_DIR / safe_name
        cursors_dir = theme_dir / "cursors"
        if cursors_dir.exists() and cursors_dir.is_dir():
            try:
                extracted_cursors = {}
                is_left_ptr_corrupted = False
                lp_file = cursors_dir / "left_ptr"
                wt_file = cursors_dir / "wait"
                if lp_file.exists() and wt_file.exists() and not lp_file.is_symlink() and not wt_file.is_symlink():
                    if lp_file.stat().st_size == wt_file.stat().st_size and lp_file.read_bytes() == wt_file.read_bytes():
                        is_left_ptr_corrupted = True

                for ctype, cdef in CURSOR_DEFINITIONS.items():
                    if ctype == "left_ptr" and is_left_ptr_corrupted:
                        continue
                    primary_file = cursors_dir / cdef["aliases"][0]
                    if primary_file.exists() and not primary_file.is_symlink():
                        frames = parse_xcursor(primary_file)
                        if frames:
                            extracted_cursors[ctype] = {
                                "name": cdef["label"],
                                "frames": [{"dataUrl": f["dataUrl"], "delay": f["delay"]} for f in frames],
                                "hotspot": frames[0]["hotspot"],
                                "width": frames[0]["width"],
                                "height": frames[0]["height"],
                                "fps": max(1, min(40, round(1000 / frames[0]["delay"])))
                            }

                if extracted_cursors:
                    first_ctype = next(iter(extracted_cursors.keys()))
                    project_data = {
                        "theme_name": safe_name,
                        "base_theme": DEFAULT_BASE_THEME,
                        "size": 36,
                        "activeCursorType": first_ctype,
                        "cursors": extracted_cursors
                    }
                    self.send_json({"success": True, "project": project_data})
                    return
            except Exception as e:
                print(f"Error extrayendo cursores de {theme_dir}: {e}", file=sys.stderr)

        self.send_json({"error": f"No se encontró el proyecto o tema '{project_name}'"}, code=404)

    def handle_save_project(self, data):
        theme_name = data.get("theme_name", "MiCursorCustom").strip()
        safe_name = "".join(c for c in theme_name if c.isalnum() or c in ("-", "_")).strip() or "MiCursorCustom"
        data["theme_name"] = safe_name

        try:
            json_path = PROJECTS_DIR / f"{safe_name}.json"
            json_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

            # NOTA: no se sincroniza aquí ICONS_DIR/<tema>/cursor_studio_project.json:
            # ese archivo es el registro de lo REALMENTE compilado en cursors/ y
            # handle_install lo usa para saber qué archivos borrar al quitar un tipo.
            # Sobreescribirlo desde "Guardar" (sin recompilar) deja huérfanos los
            # cursores eliminados: el siguiente Instalar ya no sabría que existieron.

            # Guardar también cursores del proyecto en la biblioteca para que sean reutilizables
            for ctype, cdata in data.get("cursors", {}).items():
                cf = cdata.get("frames", [])
                if cf:
                    c_label = CURSOR_DEFINITIONS.get(ctype, {}).get("label", ctype)
                    save_media_asset(
                        f"{safe_name} - {c_label}",
                        cf,
                        media_type="gif" if len(cf) > 1 else "image",
                        source_filename=f"{ctype}.png"
                    )

            self.send_json({
                "success": True,
                "message": f"Proyecto '{safe_name}' guardado correctamente.",
                "theme_name": safe_name
            })
        except Exception as e:
            self.send_json({"error": f"Error guardando proyecto: {str(e)}"}, code=500)

    def handle_delete_project(self, data):
        theme_name = data.get("theme_name", "").strip()
        safe_name = "".join(c for c in theme_name if c.isalnum() or c in ("-", "_")).strip()
        delete_installed = data.get("delete_installed", True)

        if not safe_name:
            self.send_json({"error": "Nombre de proyecto requerido"}, code=400)
            return

        try:
            json_path = PROJECTS_DIR / f"{safe_name}.json"
            if json_path.exists():
                json_path.unlink()

            if delete_installed:
                installed_dir = ICONS_DIR / safe_name
                if installed_dir.exists() and installed_dir.is_dir():
                    shutil.rmtree(installed_dir)

            self.send_json({
                "success": True,
                "message": f"Proyecto '{safe_name}' eliminado."
            })
        except Exception as e:
            self.send_json({"error": f"Error eliminando proyecto: {str(e)}"}, code=500)

    def handle_apply_theme(self, data):
        theme_name = data.get("theme_name", "").strip()
        if not theme_name:
            self.send_json({"error": "Nombre de tema requerido"}, code=400)
            return

        theme_dir = ICONS_DIR / theme_name
        if not theme_dir.exists():
            self.send_json({"error": f"El tema '{theme_name}' no existe en ~/.icons"}, code=404)
            return

        size = int(data.get("size", 36)) if "size" in data else None
        apply_theme(theme_name, size)
        self.send_json({
            "success": True,
            "message": f"Tema '{theme_name}' activado en el sistema.",
            "theme_name": theme_name
        })

    def handle_repair_theme(self, data):
        theme_name = data.get("theme_name", "").strip()
        safe_name = "".join(c for c in theme_name if c.isalnum() or c in ("-", "_")).strip()
        theme_dir = ICONS_DIR / safe_name
        cursors_dir = theme_dir / "cursors"

        if not cursors_dir.exists():
            self.send_json({"error": f"No se encontró el directorio de cursores para '{theme_name}'"}, code=404)
            return

        try:
            left_ptr_file = cursors_dir / "left_ptr"
            wait_file = cursors_dir / "wait"
            if left_ptr_file.exists() and wait_file.exists():
                for alias in CURSOR_DEFINITIONS["left_ptr"]["aliases"]:
                    ap = cursors_dir / alias
                    if ap.exists() or ap.is_symlink():
                        ap.unlink()

            # Eliminar symlinks de left_ptr_watch / progress si apuntaban erróneamente a wait
            for alias in CURSOR_DEFINITIONS["left_ptr_watch"]["aliases"]:
                ap = cursors_dir / alias
                if ap.is_symlink():
                    try:
                        if os.readlink(ap) == "wait":
                            ap.unlink()
                    except Exception:
                        pass

            index_file = theme_dir / "index.theme"
            index_file.write_text(f"[Icon Theme]\nName={safe_name}\nComment=Repaired with Cursor Studio\nInherits={DEFAULT_BASE_THEME}\n")
            cursor_file = theme_dir / "cursor.theme"
            cursor_file.write_text(f"[Icon Theme]\nName={safe_name}\nInherits={DEFAULT_BASE_THEME}\n")

            apply_theme(safe_name)
            self.send_json({
                "success": True,
                "message": f"Tema '{safe_name}' reparado. Se eliminaron los cursores conflictivos para que herede limpiamente de {DEFAULT_BASE_THEME}."
            })
        except Exception as e:
            self.send_json({"error": f"Error al reparar tema: {str(e)}"}, code=500)

    def handle_install(self, data):
        theme_name = data.get("theme_name", "MiCursorCustom").strip()
        theme_name = "".join(c for c in theme_name if c.isalnum() or c in ("-", "_")).strip() or "MiCursorCustom"
        base_theme = data.get("base_theme") or DEFAULT_BASE_THEME
        if base_theme == theme_name or not ((Path("/usr/share/icons") / base_theme).exists() or (ICONS_DIR / base_theme).exists()):
            base_theme = DEFAULT_BASE_THEME

        multi_cursors = data.get("cursors")
        if not multi_cursors:
            frames = data.get("frames", [])
            hotspot = data.get("hotspot", {"x": 0, "y": 0})
            size = int(data.get("size", 36))
            cursor_types = data.get("cursor_types", ["left_ptr"])
            multi_cursors = {}
            for ctype in cursor_types:
                multi_cursors[ctype] = {
                    "frames": frames,
                    "hotspot": hotspot,
                    "size": size
                }

        if not multi_cursors:
            self.send_json({"error": "No hay tipos de cursor para compilar"}, code=400)
            return

        theme_dir = ICONS_DIR / theme_name
        cursors_dir = theme_dir / "cursors"
        cursors_dir.mkdir(parents=True, exist_ok=True)

        previous_project = theme_dir / "cursor_studio_project.json"
        if previous_project.exists():
            try:
                previous_cursors = json.loads(previous_project.read_text(encoding="utf-8")).get("cursors", {})
                for old_type in previous_cursors:
                    for alias in CURSOR_DEFINITIONS.get(old_type, {}).get("aliases", []):
                        alias_path = cursors_dir / alias
                        if alias_path.exists() or alias_path.is_symlink():
                            alias_path.unlink()
            except (OSError, json.JSONDecodeError):
                pass

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp_path = Path(tmpdir)
                compiled_types = []

                for ctype, cinfo in multi_cursors.items():
                    if ctype not in CURSOR_DEFINITIONS:
                        continue

                    cframes = cinfo.get("frames", [])
                    if not cframes:
                        continue

                    c_hotspot = cinfo.get("hotspot", {"x": 0, "y": 0})
                    c_size = int(cinfo.get("size", data.get("size", 36)))
                    config_lines = []

                    c_tmp_dir = tmp_path / ctype
                    c_tmp_dir.mkdir(parents=True, exist_ok=True)

                    for idx, frame_info in enumerate(cframes):
                        data_url = frame_info["dataUrl"] if isinstance(frame_info, dict) else frame_info
                        delay = frame_info.get("delay", 80) if isinstance(frame_info, dict) else 80
                        if "," in data_url:
                            data_url = data_url.split(",", 1)[1]
                        raw_png = base64.b64decode(data_url)

                        frame_path = c_tmp_dir / f"frame_{idx:04d}.png"
                        im = Image.open(io.BytesIO(raw_png)).convert("RGBA")
                        w, h = im.size
                        scale = c_size / max(w, h)
                        nw = max(1, round(w * scale))
                        nh = max(1, round(h * scale))
                        if (w, h) != (nw, nh):
                            im = im.resize((nw, nh), Image.Resampling.NEAREST if max(nw, nh) <= 48 and max(w, h) <= 48 else Image.Resampling.LANCZOS)
                        im.save(frame_path, "PNG")

                        hx = max(0, min(nw - 1, round(int(c_hotspot.get("x", 0)) * scale)))
                        hy = max(0, min(nh - 1, round(int(c_hotspot.get("y", 0)) * scale)))
                        config_lines.append(f"{c_size} {hx} {hy} {frame_path.resolve()} {delay}")

                    cfg_file = c_tmp_dir / "cursor.config"
                    cfg_file.write_text("\n".join(config_lines) + "\n")

                    compiled_file = c_tmp_dir / f"{ctype}.bin"
                    cmd = ["xcursorgen", str(cfg_file), str(compiled_file)]
                    res = subprocess.run(cmd, capture_output=True, text=True)
                    if res.returncode != 0:
                        raise RuntimeError(f"Error en xcursorgen para '{ctype}': {res.stderr}")

                    aliases = CURSOR_DEFINITIONS[ctype]["aliases"]
                    primary_alias = aliases[0]
                    target_file = cursors_dir / primary_alias
                    shutil.copyfile(compiled_file, target_file)

                    for alias in aliases[1:]:
                        if alias in PRIMARY_ALIAS_NAMES and alias != primary_alias:
                            continue
                        alias_path = cursors_dir / alias
                        if alias_path.exists() or alias_path.is_symlink():
                            alias_path.unlink()
                        try:
                            alias_path.symlink_to(primary_alias)
                        except Exception:
                            shutil.copyfile(compiled_file, alias_path)

                    compiled_types.append(ctype)

            index_content = f"[Icon Theme]\nName={theme_name}\nComment=Created with Cursor Studio\nInherits={base_theme}\n"
            (theme_dir / "index.theme").write_text(index_content)
            (theme_dir / "cursor.theme").write_text(f"[Icon Theme]\nName={theme_name}\nInherits={base_theme}\n")

            save_payload = {
                "theme_name": theme_name,
                "base_theme": base_theme,
                "size": data.get("size", 36),
                "activeCursorType": data.get("activeCursorType", compiled_types[0] if compiled_types else "left_ptr"),
                "cursors": multi_cursors
            }
            (PROJECTS_DIR / f"{theme_name}.json").write_text(json.dumps(save_payload, indent=2), encoding="utf-8")
            (theme_dir / "cursor_studio_project.json").write_text(json.dumps(save_payload, indent=2), encoding="utf-8")

            cursor_size = int(data.get("size", 36))
            apply_theme(theme_name, cursor_size)

            self.send_json({
                "success": True,
                "message": f"¡Tema '{theme_name}' instalado y activado con {len(compiled_types)} tipo(s) de cursor!",
                "theme_name": theme_name,
                "compiled_types": compiled_types
            })
        except Exception as e:
            self.send_json({"error": f"Fallo al compilar e instalar: {str(e)}"}, code=500)

    def handle_restore(self):
        try:
            apply_theme(DEFAULT_BASE_THEME)
            self.send_json({
                "success": True,
                "message": f"Cursor restaurado a '{DEFAULT_BASE_THEME}'"
            })
        except Exception as e:
            self.send_json({"error": str(e)}, code=500)


def main():
    port = 52140
    for attempt in range(10):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", port), CursorStudioHandler)
            break
        except OSError:
            port += 1

    print(f"Cursor Studio iniciado en http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
