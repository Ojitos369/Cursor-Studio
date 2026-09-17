#!/usr/bin/env python3
"""
Cursor Spy - identifica en vivo que nombre Xcursor (left_ptr, hand2, watch...)
esta mostrando el sistema, comparando los pixeles del cursor actual (via XFixes)
contra las imagenes del tema Xcursor activo (via libXcursor).

Independiente de Cursor Studio: solo usa libX11/libXfixes/libXcursor (ctypes) + python-xlib.

Uso:
    python3 cursor_spy.py

Ctrl+Alt+9: guarda el nombre detectado en capturas.log
"""
import ctypes
import ctypes.util
import hashlib
import os
import sys
import time
from datetime import datetime

from Xlib import XK
from Xlib.display import Display

HERE = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(HERE, "capturas.log")

# Nombres que Cursor Studio administra (ver README) + alias comunes del mismo shape
CURSOR_NAMES = [
    "left_ptr", "default", "arrow",
    "pointer", "hand2", "hand1",
    "wait", "watch",
    "left_ptr_watch", "progress",
    "text", "xterm", "ibeam",
    "not-allowed", "crossed_circle", "no-drop", "circle",
    "move", "all-scroll", "fleur",
    "crosshair", "cross",
    "ns-resize", "sb_v_double_arrow",
    "ew-resize", "sb_h_double_arrow",
    "help", "question_arrow",
]

x11 = ctypes.CDLL(ctypes.util.find_library("X11"))
xfixes = ctypes.CDLL(ctypes.util.find_library("Xfixes"))
xcursor = ctypes.CDLL(ctypes.util.find_library("Xcursor"))

x11.XOpenDisplay.restype = ctypes.c_void_p
x11.XFree.argtypes = [ctypes.c_void_p]


class XFixesCursorImage(ctypes.Structure):
    _fields_ = [
        ("x", ctypes.c_short), ("y", ctypes.c_short),
        ("width", ctypes.c_ushort), ("height", ctypes.c_ushort),
        ("xhot", ctypes.c_ushort), ("yhot", ctypes.c_ushort),
        ("cursor_serial", ctypes.c_ulong),
        ("pixels", ctypes.POINTER(ctypes.c_ulong)),  # cada pixel ARGB en un unsigned long (padding de XFixes)
    ]


class XcursorImage(ctypes.Structure):
    # XcursorDim/XcursorPixel = uint32_t (Xcursor.h), no unsigned long
    _fields_ = [
        ("version", ctypes.c_uint32), ("size", ctypes.c_uint32),
        ("width", ctypes.c_uint32), ("height", ctypes.c_uint32),
        ("xhot", ctypes.c_uint32), ("yhot", ctypes.c_uint32),
        ("delay", ctypes.c_uint32),
        ("pixels", ctypes.POINTER(ctypes.c_uint32)),
    ]


xfixes.XFixesGetCursorImage.restype = ctypes.POINTER(XFixesCursorImage)
xfixes.XFixesGetCursorImage.argtypes = [ctypes.c_void_p]

xcursor.XcursorGetTheme.restype = ctypes.c_char_p
xcursor.XcursorGetTheme.argtypes = [ctypes.c_void_p]
xcursor.XcursorGetDefaultSize.restype = ctypes.c_int
xcursor.XcursorGetDefaultSize.argtypes = [ctypes.c_void_p]
xcursor.XcursorLibraryLoadImage.restype = ctypes.POINTER(XcursorImage)
xcursor.XcursorLibraryLoadImage.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]
xcursor.XcursorImageDestroy.argtypes = [ctypes.POINTER(XcursorImage)]

_dpy = x11.XOpenDisplay(None)
if not _dpy:
    sys.exit("No se pudo abrir el display X11 (DISPLAY no definido / sin sesion grafica).")


def _pixels_hash(width, height, raw_iter):
    h = hashlib.blake2b(digest_size=16)
    h.update(int(width).to_bytes(4, "little"))
    h.update(int(height).to_bytes(4, "little"))
    for p in raw_iter:
        h.update((p & 0xFFFFFFFF).to_bytes(4, "little"))
    return h.digest()


def _load_theme_signatures():
    theme = xcursor.XcursorGetTheme(_dpy)
    size = xcursor.XcursorGetDefaultSize(_dpy) or 24
    sigs = {}
    for name in CURSOR_NAMES:
        img_p = xcursor.XcursorLibraryLoadImage(name.encode(), theme, size)
        if not img_p:
            continue
        img = img_p.contents
        n = img.width * img.height
        sig = _pixels_hash(img.width, img.height, img.pixels[:n])
        sigs.setdefault(sig, name)
        xcursor.XcursorImageDestroy(img_p)
    return sigs, (theme.decode() if theme else "(default)"), size


_SIGNATURES, _THEME_NAME, _THEME_SIZE = _load_theme_signatures()


def get_cursor_name():
    img_p = xfixes.XFixesGetCursorImage(_dpy)
    if not img_p:
        return None
    img = img_p.contents
    n = img.width * img.height
    sig = _pixels_hash(img.width, img.height, img.pixels[:n])
    name = _SIGNATURES.get(sig)
    x11.XFree(ctypes.cast(img_p, ctypes.c_void_p))
    return name


# --- Ctrl+Alt+9 via polling de teclado (python-xlib, sin dependencias extra) ---
_kbd_disp = Display()
_KEYCODES = {
    "ctrl": {_kbd_disp.keysym_to_keycode(XK.string_to_keysym(n)) for n in ("Control_L", "Control_R")},
    "alt": {_kbd_disp.keysym_to_keycode(XK.string_to_keysym(n)) for n in ("Alt_L", "Alt_R")},
    "nine": {_kbd_disp.keysym_to_keycode(XK.string_to_keysym("9"))},
}


def _key_pressed(keymap, keycode):
    return bool(keymap[keycode // 8] & (1 << (keycode % 8)))


def hotkey_active():
    keymap = _kbd_disp.query_keymap()
    return (
        any(_key_pressed(keymap, kc) for kc in _KEYCODES["ctrl"])
        and any(_key_pressed(keymap, kc) for kc in _KEYCODES["alt"])
        and any(_key_pressed(keymap, kc) for kc in _KEYCODES["nine"])
    )


def capture(name):
    line = f"{datetime.now().isoformat(timespec='seconds')}  cursor_name={name}\n"
    with open(LOG_PATH, "a") as f:
        f.write(line)
    print(f"\n>>> CAPTURADO: {name}  (guardado en {LOG_PATH})")


def main():
    print(f"Cursor Spy activo. Tema: {_THEME_NAME}  tamano: {_THEME_SIZE}px  ({len(_SIGNATURES)} formas reconocidas)")
    print("Ctrl+Alt+9 = capturar nombre actual. Ctrl+C = salir.\n")
    last_name = "__unset__"
    hotkey_was_active = False
    try:
        while True:
            name = get_cursor_name()
            if name != last_name:
                shown = name or "desconocido (no coincide con el tema activo)"
                print(f"\rCursor actual: {shown:<45}", end="", flush=True)
                last_name = name

            active = hotkey_active()
            if active and not hotkey_was_active:
                capture(last_name or "desconocido")
            hotkey_was_active = active

            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\nSaliendo.")


if __name__ == "__main__":
    main()
