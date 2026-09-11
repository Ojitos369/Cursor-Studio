# ✨ Cursor Studio

> **Diseñador, Editor Pixel-Art, Biblioteca de Medios y Compilador de Temas de Cursores para Linux (Cinnamon / X11 / GNOME / XFCE)**

Cursor Studio es una aplicación interactiva de escritorio para crear, editar, animar e instalar temas completos de cursores en Linux sin necesidad de lidiar manualmente con archivos de configuración, sintaxis compleja de `xcursorgen` o conflictos de enlaces simbólicos.

---

## 🚀 Características Principales

### 🎯 Proyectos Multi-Cursores
- **Gestión completa por proyecto:** Crea un tema con todos los punteros del sistema:
  - 🎯 **Flecha Principal** (`left_ptr`, `default`)
  - 👆 **Manita / Enlace** (`pointer`, `hand2`)
  - ⏳ **Espera / Carga total** (`wait`, `watch`)
  - ⏱️ **Segundo plano** (`left_ptr_watch`, `progress`)
  - 🔤 **Selección de Texto** (`text`, `xterm`)
  - 🚫 **Prohibido** (`not-allowed`, `circle`)
  - ✥ **Mover** (`move`, `all-scroll`)
  - ➕ **Cruz de Precisión** (`crosshair`)
  - ↕️ **Redimensión Vertical** (`ns-resize`)
  - ↔️ **Redimensión Horizontal** (`ew-resize`)
  - ❓ **Ayuda** (`help`)
- **Pestañas superiores dinámicas:** Navega instantáneamente entre cada tipo de cursor dentro del mismo proyecto con miniaturas en tiempo real.
- **Independencia total:** Cada tipo de cursor tiene sus propios fotogramas, velocidad (FPS), dimensiones y punto de impacto (hotspot).

### 🎬 Animaciones e Importación Universal
- **Soporte para animaciones GIF y WebP:** Importa GIFs animados directamente; se descomponen automáticamente en fotogramas editables.
- **Secuencias de imágenes:** Importa carpetas con secuencias ordenadas de imágenes PNG, JPG o BMP.
- **Línea de tiempo interactiva:** Añade, duplica, reordena y elimina fotogramas con control de velocidad (FPS) y milisegundos en vivo.
- **Papel Cebolla (Onion Skinning):** Visualiza el fotograma anterior como capa fantasma para facilitar el dibujo cuadro a cuadro.

### 📚 Biblioteca de Medios Persistente
- **Reutilización entre cursores y proyectos:** Todos los archivos importados (imágenes fijas y GIFs) se guardan automáticamente en tu biblioteca local (`~/.cursor_studio/media/`).
- **Selector de biblioteca:** Aplica cualquier recurso guardado previamente a cualquier cursor activo con un solo clic.
- **Instantáneas del lienzo:** Guarda cualquier fotograma o animación que estés dibujando directamente en la biblioteca.

### 🧪 Simulador Interactivo Multicursores
- **Probador en vivo sin reiniciar sesión:** Comprueba la interactividad del ratón con todos los cursores activos.
- **Punto de mira láser opcional:** Sigue la posición del puntero para verificar la precisión.
- **Detección de impacto:** Visualiza ondas expansivas y coordenadas exactas de clic para calibrar el hotspot.

### 🪄 Herramientas de Dibujo Pixel-Art
- Lápiz, Borrador, Bote de Relleno por inundación (Bucket) y Cuentagotas (Eyedropper).
- **Varita Mágica de eliminación de fondo:**
  - Auto-detección inteligente desde esquinas.
  - Eliminación por clic con tolerancia ajustable (0% - 100%) y modo contiguo.
  - Aplicación en el fotograma actual o en todos los fotogramas del cursor.
- **Calibración visual de Hotspot:** Haz clic o arrastra sobre el lienzo o el panel dedicado para establecer el punto de impacto exacto.
- **Historial completo:** Deshacer (`Ctrl+Z`) y Rehacer (`Ctrl+Y`).

### 🛡️ Compilación Limpia e Instalación en Linux
- **Cero conflictos:** Resuelve automáticamente la duplicación y sobreescritura accidental entre `left_ptr` y `wait`.
- **Integración con Cinnamon / X11:** Compila con `xcursorgen`, genera los alias de Freedesktop correspondientes, copia a `~/.icons/<tema>/` y activa el tema inmediatamente en Cinnamon mediante `gsettings`.
- **Restauración en un clic:** Vuelve al tema original del sistema (`BreezeX-Dark`) cuando lo desees.

### 💎 Modales Modernos con Alto Z-Index
- Sistema de confirmaciones, prompts y alertas estilo SweetAlert con fondo desenfocado y `z-index: 100000`.

---

## 📋 Requisitos del Sistema

- **Sistema Operativo:** Linux (probado en Linux Mint / Cinnamon, Ubuntu, Debian, Arch).
- **Python:** Versión 3.8 o superior.
- **Dependencias de Python:**
  - `Pillow` (PIL)
- **Herramientas de sistema X11:**
  - `xcursorgen` (generalmente provisto por el paquete `x11-apps` o `x11-utils`).
  - `gsettings` (integrado por defecto en Cinnamon / GNOME).

---

## 📦 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/cursor_studio.git
   cd cursor_studio
   ```

2. **Instalar paquetes del sistema (si no los tienes):**
   ```bash
   # En Debian / Ubuntu / Linux Mint
   sudo apt update
   sudo apt install -y python3-pil x11-apps
   ```

   *(O mediante `pip` para Pillow)*:
   ```bash
   pip3 install Pillow
   ```

3. **Dar permisos de ejecución al lanzador:**
   ```bash
   chmod +x run.sh app.py
   ```

---

## 🖥️ Uso

### Iniciar la aplicación
Ejecuta el script de inicio rápido:
```bash
./run.sh
```
*O manualmente:*
```bash
python3 app.py
```

La aplicación se ejecutará en:
```
http://127.0.0.1:52140
```
Si dispones de Google Chrome o Chromium, `./run.sh` la abrirá automáticamente como una ventana de aplicación nativa de escritorio sin bordes de navegador.

---

## 📁 Estructura del Código

```
cursor_studio/
├── app.py              # Servidor HTTP en Python: APIs REST, compilación xcursorgen,
│                       # parser Xcursor binario y persistencia en disco
├── run.sh              # Script Bash para arranque automático y apertura en navegador/modo app
├── static/             # Frontend web (Single Page Application)
│   ├── index.html      # Estructura del editor, barras de herramientas y modales
│   ├── style.css       # Estilos visuales dark-mode, layout responsivo y modales
│   └── app.js          # Lógica cliente: lienzo canvas, animación, hotspot y API client
├── .gitignore          # Exclusiones para git
└── README.md           # Documentación del proyecto
```

### Rutas de Datos en tu Sistema
- **Proyectos guardados:** `~/.cursor_studio/projects/<nombre>.json`
- **Biblioteca de medios:** `~/.cursor_studio/media/<id>.json`
- **Temas instalados en Linux:** `~/.icons/<nombre_tema>/`

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `P` | Herramienta Lápiz |
| `E` | Herramienta Borrador |
| `B` | Bote de Pintura (Relleno) |
| `I` | Cuentagotas (Muestrear color) |
| `H` | Ajustar Hotspot (Punto de clic) |
| `W` | Varita Mágica (Quitar Fondo) |
| `Espacio` | Reproducir / Pausar animación |
| `Ctrl + Z` | Deshacer trazo |
| `Ctrl + Y` | Rehacer trazo |
| `Ctrl + S` | Guardar proyecto actual |
| `Escape` | Cerrar modales |
| `Enter` | Confirmar en modales |

---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Consulta `LICENSE` para más información.
