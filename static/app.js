/**
 * Cursor Studio - Editor Visual e Interactivo de Cursores
 * Soporta Proyectos Multi-Cursores, Temas Guardados, y Animaciones Independientes
 */

// Definiciones canónicas de tipos de cursor en Linux / X11 / Cinnamon
const CURSOR_DEFINITIONS = {
  left_ptr: {
    label: 'Flecha Principal',
    desc: 'Puntero predeterminado de movimiento y selección',
    icon: '🎯',
    defaultHotspot: { x: 0, y: 0 }
  },
  pointer: {
    label: 'Manita / Enlace',
    desc: 'Puntero para enlaces web y botones interactivos',
    icon: '👆',
    defaultHotspot: { x: 4, y: 1 }
  },
  wait: {
    label: 'Espera / Carga total',
    desc: 'Reloj o spinner cuando la aplicación o el sistema está ocupado',
    icon: '⏳',
    defaultHotspot: { x: 16, y: 16 }
  },
  left_ptr_watch: {
    label: 'En segundo plano',
    desc: 'Flecha con indicador cuando una aplicación se inicia',
    icon: '⏱️',
    defaultHotspot: { x: 0, y: 0 }
  },
  text: {
    label: 'Selección de Texto',
    desc: 'I-Beam para colocar el cursor de texto o seleccionar palabras',
    icon: '🔤',
    defaultHotspot: { x: 16, y: 16 }
  },
  'not-allowed': {
    label: 'Prohibido',
    desc: 'Acción no disponible o destino denegado',
    icon: '🚫',
    defaultHotspot: { x: 16, y: 16 }
  },
  move: {
    label: 'Mover',
    desc: 'Flechas en cruz para arrastrar ventanas y objetos',
    icon: '✥',
    defaultHotspot: { x: 16, y: 16 }
  },
  crosshair: {
    label: 'Cruz de Precisión',
    desc: 'Para diseño, selección o dibujo exacto',
    icon: '➕',
    defaultHotspot: { x: 16, y: 16 }
  },
  'ns-resize': {
    label: 'Redimensión Vertical',
    desc: 'Ajuste de bordes superior e inferior',
    icon: '↕️',
    defaultHotspot: { x: 16, y: 16 }
  },
  'ew-resize': {
    label: 'Redimensión Horizontal',
    desc: 'Ajuste de bordes laterales',
    icon: '↔️',
    defaultHotspot: { x: 16, y: 16 }
  },
  help: {
    label: 'Ayuda',
    desc: 'Flecha con signo de interrogación',
    icon: '❓',
    defaultHotspot: { x: 0, y: 0 }
  }
};

// Estado del Proyecto Global (con múltiples cursores)
const projectState = {
  themeName: 'MiCursorCustom',
  baseTheme: 'BreezeX-Dark',
  activeCursorType: 'left_ptr',
  cursors: {} // Formato: { [type]: { frames: [{canvas, delay}], hotspot, canvasWidth, canvasHeight, fps, currentFrameIndex } }
};

// Estado del Espacio de Trabajo Activo (para el cursor actualmente seleccionado)
const state = {
  frames: [],            // Array de { canvas: HTMLCanvasElement, delay: number }
  currentFrameIndex: 0,
  canvasWidth: 32,
  canvasHeight: 32,
  zoom: 14,
  hotspot: { x: 0, y: 0 },
  activeTool: 'pencil',  // pencil, eraser, bucket, eyedropper, hotspot, wand
  brushSize: 1,
  primaryColor: '#ffffff',
  colorAlpha: 1.0,
  cursorSize: 36,
  isPlaying: true,
  fps: 12,
  showGrid: true,
  showOnionSkin: false,
  isDrawing: false,
  lastDrawnPixel: null,
  history: [],          // Undo stack para el fotograma activo
  redoStack: []
};

// Referencias del DOM
const mainCanvas = document.getElementById('mainCanvas');
const mainCtx = mainCanvas.getContext('2d', { willReadFrequently: true });
const onionCanvas = document.getElementById('onionCanvas');
const onionCtx = onionCanvas.getContext('2d');
const overlayCanvas = document.getElementById('overlayCanvas');
const overlayCtx = overlayCanvas.getContext('2d');
const canvasContainer = document.getElementById('canvasContainer');
const canvasViewport = document.getElementById('canvasViewport');

const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas.getContext('2d');

const hotspotCanvas = document.getElementById('hotspotCanvas');
const hotspotCtx = hotspotCanvas?.getContext('2d');
const hotspotBox = document.getElementById('hotspotBox');
const hotspotSideCoord = document.getElementById('hotspotSideCoord');

const timelineStrip = document.getElementById('timelineStrip');
const frameCounter = document.getElementById('frameCounter');
const hotspotCoord = document.getElementById('hotspotCoord');
const zoomLevelLabel = document.getElementById('zoomLevel');
const fpsLabel = document.getElementById('fpsLabel');
const cursorSizeLabel = document.getElementById('cursorSizeLabel');
const currentThemeLabel = document.getElementById('currentThemeLabel');
const testSandbox = document.getElementById('testSandbox');
const simulatorModal = document.getElementById('simulatorModal');
const toggleLaserAim = document.getElementById('toggleLaserAim');

// Referencias del Sistema de Proyectos
const projectCursorTabs = document.getElementById('projectCursorTabs');
const sidebarCursorList = document.getElementById('sidebarCursorList');
const activeProjectBadge = document.getElementById('activeProjectBadge');
const activeProjectCount = document.getElementById('activeProjectCount');
const summaryCursorCount = document.getElementById('summaryCursorCount');
const summaryCursorChips = document.getElementById('summaryCursorChips');
const themeNameInput = document.getElementById('themeNameInput');

// Modales
const projectsModal = document.getElementById('projectsModal');
const addCursorModal = document.getElementById('addCursorModal');
const newProjectModal = document.getElementById('newProjectModal');
const mediaLibraryModal = document.getElementById('mediaLibraryModal');
const projectsGrid = document.getElementById('projectsGrid');
const cursorPickerGrid = document.getElementById('cursorPickerGrid');
const projectSearchInput = document.getElementById('projectSearchInput');

// Biblioteca de Medios
const mediaLibraryGrid = document.getElementById('mediaLibraryGrid');
const mediaSearchInput = document.getElementById('mediaSearchInput');
const libTargetCursorBadge = document.getElementById('libTargetCursorBadge');
const libCountAll = document.getElementById('libCountAll');
const libCountGifs = document.getElementById('libCountGifs');
const libCountImages = document.getElementById('libCountImages');
const libraryFileInput = document.getElementById('libraryFileInput');

let mediaLibrary = [];
let activeMediaFilter = 'all';

// Referencias del Modal Swal (Alertas / Confirmaciones / Prompts)
const customSwalModal = document.getElementById('customSwalModal');
const swalTitle = document.getElementById('swalTitle');
const swalText = document.getElementById('swalText');
const swalIconWrapper = document.getElementById('swalIconWrapper');
const swalIcon = document.getElementById('swalIcon');
const swalInputWrap = document.getElementById('swalInputWrap');
const swalInput = document.getElementById('swalInput');
const swalBtnCancel = document.getElementById('swalBtnCancel');
const swalBtnConfirm = document.getElementById('swalBtnConfirm');

let swalResolver = null;

// Paleta clásica de colores para Pixel Art
const PALETTE_COLORS = [
  '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8',
  '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffffff'
];

// Inicialización de la aplicación
window.addEventListener('DOMContentLoaded', () => {
  initSwalEvents();
  initPalette();
  initInitialProject();
  setupEvents();
  setupProjectEvents();
  setupZoomControl();
  setupHotspotBoxEvents();
  setupSimulatorEvents();
  fetchSystemStatus();
  startPreviewLoop();
  updateAllCursors();
});

// -----------------------------------------------------------------------------
// SISTEMA SWAL (MODALES PERSONALIZADOS CON ALTO Z-INDEX)
// -----------------------------------------------------------------------------

function showModalSwal(options = {}) {
  const {
    title = '',
    text = '',
    icon = 'info', // 'success' | 'warning' | 'danger' | 'info' | 'question'
    showCancel = false,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    danger = false,
    input = false,
    inputValue = '',
    inputPlaceholder = ''
  } = options;

  return new Promise((resolve) => {
    swalResolver = resolve;

    if (!customSwalModal) {
      if (input) return resolve(prompt(text, inputValue));
      if (showCancel) return resolve(confirm(text));
      alert(text);
      return resolve(true);
    }

    swalTitle.textContent = title;
    swalText.textContent = text;

    swalIconWrapper.className = `swal-icon-wrapper ${icon}`;
    const iconMap = {
      success: '✓',
      warning: '⚠️',
      danger: '🗑️',
      info: 'ℹ️',
      question: '❓'
    };
    swalIcon.textContent = iconMap[icon] || 'ℹ️';

    if (input) {
      swalInputWrap.style.display = 'block';
      swalInput.value = inputValue;
      swalInput.placeholder = inputPlaceholder;
    } else {
      swalInputWrap.style.display = 'none';
      swalInput.value = '';
    }

    swalBtnCancel.style.display = showCancel ? 'inline-flex' : 'none';
    swalBtnCancel.textContent = cancelText;

    swalBtnConfirm.textContent = confirmText;
    if (danger) {
      swalBtnConfirm.className = 'btn btn-primary swal-btn-confirm danger';
    } else {
      swalBtnConfirm.className = 'btn btn-primary swal-btn-confirm';
    }

    customSwalModal.style.display = 'flex';

    if (input) {
      setTimeout(() => {
        swalInput.focus();
        swalInput.select();
      }, 50);
    } else {
      setTimeout(() => swalBtnConfirm.focus(), 50);
    }
  });
}

function closeSwal(result) {
  if (customSwalModal) customSwalModal.style.display = 'none';
  if (swalResolver) {
    const res = swalResolver;
    swalResolver = null;
    res(result);
  }
}

function showModalAlert(title, text, icon = 'info') {
  return showModalSwal({
    title,
    text,
    icon,
    showCancel: false,
    confirmText: 'Entendido'
  });
}

function showModalConfirm(title, text, options = {}) {
  return showModalSwal({
    title,
    text,
    icon: options.danger ? 'danger' : (options.icon || 'warning'),
    showCancel: true,
    confirmText: options.confirmText || 'Sí, continuar',
    cancelText: options.cancelText || 'Cancelar',
    danger: options.danger || false
  });
}

function showModalPrompt(title, text, defaultValue = '', placeholder = '') {
  return showModalSwal({
    title,
    text,
    icon: 'question',
    input: true,
    inputValue: defaultValue,
    inputPlaceholder: placeholder,
    showCancel: true,
    confirmText: 'Guardar',
    cancelText: 'Cancelar'
  }).then(res => {
    if (res === false) return null;
    return typeof res === 'string' ? res : (swalInput ? swalInput.value.trim() : '');
  });
}

function initSwalEvents() {
  if (swalBtnConfirm) {
    swalBtnConfirm.addEventListener('click', () => {
      if (swalInputWrap && swalInputWrap.style.display !== 'none') {
        closeSwal(swalInput ? swalInput.value.trim() : '');
      } else {
        closeSwal(true);
      }
    });
  }

  if (swalBtnCancel) {
    swalBtnCancel.addEventListener('click', () => {
      closeSwal(false);
    });
  }

  if (customSwalModal) {
    customSwalModal.addEventListener('click', (e) => {
      if (e.target === customSwalModal) {
        closeSwal(false);
      }
    });
  }

  if (swalInput) {
    swalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        closeSwal(swalInput.value.trim());
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSwal(false);
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (customSwalModal && customSwalModal.style.display === 'flex') {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSwal(false);
      } else if (e.key === 'Enter' && e.target !== swalInput) {
        e.preventDefault();
        swalBtnConfirm?.click();
      }
    }
  });

  // Reemplazar alert nativo global por el modal moderno
  window.alert = function(msg) {
    showModalAlert('Aviso', String(msg), 'info');
  };
}

// Inicializar el proyecto por defecto
function initInitialProject() {
  projectState.themeName = 'MiCursorCustom';
  projectState.activeCursorType = 'left_ptr';
  projectState.cursors = {};

  // Crear Flecha Principal inicial
  projectState.cursors['left_ptr'] = createDefaultCursorData('left_ptr', 32, 32);

  // Cargar en el espacio de trabajo
  loadCursorToWorkspace('left_ptr');

  // Renderizar interfaz de pestañas y resumen
  renderProjectTabs();
  renderSidebarCursorList();
  renderProjectSummary();
}

// Control estricto de Zoom (Solo en el Canvas, NUNCA en toda la interfaz)
function setupZoomControl() {
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      changeZoom(delta);
    }
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && ['+', '-', '=', '0'].includes(e.key)) {
      e.preventDefault();
      if (e.key === '+' || e.key === '=') changeZoom(2);
      else if (e.key === '-') changeZoom(-2);
      else if (e.key === '0') {
        state.zoom = 14;
        updateCanvasDimensions();
      }
    }
  });

  canvasViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 2 : -2;
    changeZoom(delta);
  }, { passive: false });
}

function changeZoom(delta) {
  const newZoom = Math.max(4, Math.min(36, state.zoom + delta));
  if (newZoom !== state.zoom) {
    state.zoom = newZoom;
    updateCanvasDimensions();
  }
}

// Obtener estado del sistema
async function fetchSystemStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.current_theme) {
      currentThemeLabel.textContent = data.current_theme;
      projectState.baseTheme = data.base_theme || 'BreezeX-Dark';
    }
  } catch (err) {
    currentThemeLabel.textContent = 'BreezeX-Dark';
  }
}

// Inicializar Paleta
function initPalette() {
  const container = document.getElementById('colorPalette');
  if (!container) return;
  container.innerHTML = '';
  PALETTE_COLORS.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'palette-swatch';
    swatch.style.backgroundColor = color;
    swatch.title = color;
    swatch.addEventListener('click', () => {
      setColor(color);
    });
    container.appendChild(swatch);
  });
}

function setColor(hex) {
  state.primaryColor = hex;
  document.getElementById('primaryColor').value = hex;
  document.getElementById('hexColor').value = hex.toUpperCase();
}

// Crear un Canvas HTML para un fotograma
function createFrameCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  return c;
}

// -----------------------------------------------------------------------------
// GESTIÓN DE PLANTILLAS Y DATOS DE CURSORES
// -----------------------------------------------------------------------------

function createDefaultCursorData(type, w = 32, h = 32) {
  const def = CURSOR_DEFINITIONS[type] || { label: type, defaultHotspot: { x: 0, y: 0 } };
  const frames = [];

  if (type === 'left_ptr') {
    const c = createFrameCanvas(w, h);
    drawDefaultArrow(c);
    frames.push({ canvas: c, delay: 80 });
  } else if (type === 'pointer') {
    const c = createFrameCanvas(w, h);
    drawDefaultPointer(c);
    frames.push({ canvas: c, delay: 80 });
  } else if (type === 'wait') {
    // Generar animación clásica de espera circular de 8 fotogramas
    const numFrames = 8;
    for (let i = 0; i < numFrames; i++) {
      const c = createFrameCanvas(w, h);
      drawDefaultWaitFrame(c, i, numFrames);
      frames.push({ canvas: c, delay: 80 });
    }
  } else if (type === 'left_ptr_watch') {
    // Flecha con reloj giratorio al lado
    const numFrames = 6;
    for (let i = 0; i < numFrames; i++) {
      const c = createFrameCanvas(w, h);
      drawDefaultArrow(c, 0.75);
      drawSmallHourglass(c, i, numFrames);
      frames.push({ canvas: c, delay: 100 });
    }
  } else if (type === 'text') {
    const c = createFrameCanvas(w, h);
    drawDefaultText(c);
    frames.push({ canvas: c, delay: 100 });
  } else if (type === 'not-allowed') {
    const c = createFrameCanvas(w, h);
    drawDefaultNotAllowed(c);
    frames.push({ canvas: c, delay: 100 });
  } else if (type === 'move') {
    const c = createFrameCanvas(w, h);
    drawDefaultMove(c);
    frames.push({ canvas: c, delay: 100 });
  } else if (type === 'crosshair') {
    const c = createFrameCanvas(w, h);
    drawDefaultCrosshair(c);
    frames.push({ canvas: c, delay: 100 });
  } else {
    // Lienzo transparente
    const c = createFrameCanvas(w, h);
    frames.push({ canvas: c, delay: 100 });
  }

  const hs = def.defaultHotspot || { x: 0, y: 0 };
  const calculatedHs = {
    x: Math.round(hs.x === 'center' ? w / 2 : hs.x),
    y: Math.round(hs.y === 'center' ? h / 2 : hs.y)
  };

  return {
    name: def.label,
    frames: frames,
    currentFrameIndex: 0,
    hotspot: calculatedHs,
    canvasWidth: w,
    canvasHeight: h,
    fps: frames.length > 1 ? 12 : 12
  };
}

// Plantilla: Flecha estilizada
function drawDefaultArrow(canvas, scaleMul = 1.0) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = (canvas.width / 32) * scaleMul;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, s);

  ctx.beginPath();
  ctx.moveTo(1 * s, 1 * s);
  ctx.lineTo(1 * s, 22 * s);
  ctx.lineTo(6 * s, 17 * s);
  ctx.lineTo(10 * s, 26 * s);
  ctx.lineTo(14 * s, 24 * s);
  ctx.lineTo(10 * s, 15 * s);
  ctx.lineTo(17 * s, 15 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Plantilla: Manita / Pointer
function drawDefaultPointer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = canvas.width / 32;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, s);

  ctx.beginPath();
  ctx.moveTo(6 * s, 2 * s);
  ctx.lineTo(10 * s, 2 * s);
  ctx.lineTo(10 * s, 10 * s);
  ctx.lineTo(14 * s, 10 * s);
  ctx.lineTo(14 * s, 12 * s);
  ctx.lineTo(18 * s, 12 * s);
  ctx.lineTo(18 * s, 14 * s);
  ctx.lineTo(22 * s, 14 * s);
  ctx.lineTo(22 * s, 22 * s);
  ctx.lineTo(16 * s, 27 * s);
  ctx.lineTo(6 * s, 27 * s);
  ctx.lineTo(2 * s, 19 * s);
  ctx.lineTo(6 * s, 15 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Plantilla: Espera animada (fotograma del spinner)
function drawDefaultWaitFrame(canvas, frameIdx, totalFrames) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = canvas.width * 0.35;
  const numDots = 8;

  for (let d = 0; d < numDots; d++) {
    const angle = (d / numDots) * Math.PI * 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    const diff = (d - frameIdx + numDots) % numDots;
    const alpha = Math.max(0.15, 1 - (diff / numDots));
    const dotRadius = Math.max(1.5, (canvas.width / 32) * (2.8 - (diff / numDots) * 1.5));

    ctx.fillStyle = `rgba(99, 102, 241, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Plantilla: Pequeño reloj de arena para left_ptr_watch
function drawSmallHourglass(canvas, frameIdx, totalFrames) {
  const ctx = canvas.getContext('2d');
  const s = canvas.width / 32;
  const cx = 22 * s;
  const cy = 20 * s;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((frameIdx / totalFrames) * Math.PI);

  ctx.fillStyle = '#6366f1';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(-5 * s, -6 * s);
  ctx.lineTo(5 * s, -6 * s);
  ctx.lineTo(0, 0);
  ctx.lineTo(5 * s, 6 * s);
  ctx.lineTo(-5 * s, 6 * s);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// Plantilla: Texto / IBeam
function drawDefaultText(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = canvas.width / 32;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, s);

  ctx.beginPath();
  ctx.moveTo(11 * s, 4 * s);
  ctx.lineTo(21 * s, 4 * s);
  ctx.moveTo(16 * s, 4 * s);
  ctx.lineTo(16 * s, 26 * s);
  ctx.moveTo(11 * s, 26 * s);
  ctx.lineTo(21 * s, 26 * s);
  ctx.stroke();
}

// Plantilla: Prohibido
function drawDefaultNotAllowed(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = canvas.width * 0.38;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = Math.max(2, (canvas.width / 32) * 3);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - r * 0.7, cy - r * 0.7);
  ctx.lineTo(cx + r * 0.7, cy + r * 0.7);
  ctx.stroke();
}

// Plantilla: Mover
function drawDefaultMove(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = canvas.width / 32;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(1, s);

  ctx.beginPath();
  // Cruz central
  ctx.moveTo(cx - 2 * s, cy - 10 * s);
  ctx.lineTo(cx, cy - 14 * s);
  ctx.lineTo(cx + 2 * s, cy - 10 * s);
  ctx.lineTo(cx + 1 * s, cy - 10 * s);
  ctx.lineTo(cx + 1 * s, cy - 1 * s);
  ctx.lineTo(cx + 10 * s, cy - 1 * s);
  ctx.lineTo(cx + 10 * s, cy - 2 * s);
  ctx.lineTo(cx + 14 * s, cy);
  ctx.lineTo(cx + 10 * s, cy + 2 * s);
  ctx.lineTo(cx + 10 * s, cy + 1 * s);
  ctx.lineTo(cx + 1 * s, cy + 1 * s);
  ctx.lineTo(cx + 1 * s, cy + 10 * s);
  ctx.lineTo(cx + 2 * s, cy + 10 * s);
  ctx.lineTo(cx, cy + 14 * s);
  ctx.lineTo(cx - 2 * s, cy + 10 * s);
  ctx.lineTo(cx - 1 * s, cy + 10 * s);
  ctx.lineTo(cx - 1 * s, cy + 1 * s);
  ctx.lineTo(cx - 10 * s, cy + 1 * s);
  ctx.lineTo(cx - 10 * s, cy + 2 * s);
  ctx.lineTo(cx - 14 * s, cy);
  ctx.lineTo(cx - 10 * s, cy - 2 * s);
  ctx.lineTo(cx - 10 * s, cy - 1 * s);
  ctx.lineTo(cx - 1 * s, cy - 1 * s);
  ctx.lineTo(cx - 1 * s, cy - 10 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Plantilla: Cruz de precisión
function drawDefaultCrosshair(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = canvas.width / 32;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, s);

  ctx.beginPath();
  ctx.arc(cx, cy, 7 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - 12 * s);
  ctx.lineTo(cx, cy - 3 * s);
  ctx.moveTo(cx, cy + 3 * s);
  ctx.lineTo(cx, cy + 12 * s);
  ctx.moveTo(cx - 12 * s, cy);
  ctx.lineTo(cx - 3 * s, cy);
  ctx.moveTo(cx + 3 * s, cy);
  ctx.lineTo(cx + 12 * s, cy);
  ctx.stroke();
}

// -----------------------------------------------------------------------------
// CAMBIO Y SINCRONIZACIÓN DE CURSORES EN EL PROYECTO
// -----------------------------------------------------------------------------

// Guarda el estado actual del espacio de trabajo en el cursor activo
function commitWorkspaceToActiveCursor() {
  const currentType = projectState.activeCursorType;
  if (!currentType) return;

  projectState.cursors[currentType] = {
    name: CURSOR_DEFINITIONS[currentType]?.label || currentType,
    frames: state.frames.map(f => ({
      canvas: f.canvas,
      delay: f.delay || Math.round(1000 / state.fps)
    })),
    currentFrameIndex: state.currentFrameIndex,
    hotspot: { ...state.hotspot },
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    fps: state.fps
  };
}

// Carga un tipo de cursor en el espacio de trabajo activo
function loadCursorToWorkspace(type) {
  const cursorData = projectState.cursors[type];
  if (!cursorData) return;

  state.canvasWidth = cursorData.canvasWidth || 32;
  state.canvasHeight = cursorData.canvasHeight || 32;
  state.hotspot = { ...(cursorData.hotspot || { x: 0, y: 0 }) };
  state.fps = cursorData.fps || 12;
  state.currentFrameIndex = Math.min(cursorData.currentFrameIndex || 0, (cursorData.frames?.length || 1) - 1);
  state.frames = cursorData.frames || [];

  if (state.frames.length === 0) {
    const c = createFrameCanvas(state.canvasWidth, state.canvasHeight);
    state.frames = [{ canvas: c, delay: 80 }];
  }

  // Actualizar slider de velocidad
  document.getElementById('speedSlider').value = state.fps;
  const delay = Math.round(1000 / state.fps);
  fpsLabel.textContent = `${state.fps} FPS (${delay}ms)`;

  updateCanvasDimensions();
  loadCurrentFrameToWorkspace();
  updateTimeline();
  updateHotspotDisplay();
}

// Cambiar de cursor activo dentro del proyecto
function switchActiveCursor(targetType) {
  if (projectState.activeCursorType === targetType && projectState.cursors[targetType]) return;

  commitWorkspaceToActiveCursor();
  projectState.activeCursorType = targetType;
  loadCursorToWorkspace(targetType);

  renderProjectTabs();
  renderSidebarCursorList();
  renderProjectSummary();
  updateAllCursors();
}

// Agregar un nuevo tipo de cursor al proyecto
function addCursorTypeToProject(type) {
  if (projectState.cursors[type]) {
    switchActiveCursor(type);
    showToast(`El cursor '${CURSOR_DEFINITIONS[type]?.label || type}' ya está en el proyecto`, 'info');
    return;
  }

  commitWorkspaceToActiveCursor();
  projectState.cursors[type] = createDefaultCursorData(type, state.canvasWidth, state.canvasHeight);
  projectState.activeCursorType = type;
  loadCursorToWorkspace(type);

  renderProjectTabs();
  renderSidebarCursorList();
  renderProjectSummary();
  updateAllCursors();

  showToast(`¡Cursor '${CURSOR_DEFINITIONS[type]?.label || type}' añadido al proyecto!`, 'success');
}

// Eliminar un tipo de cursor del proyecto
async function removeCursorTypeFromProject(type, e) {
  if (e) e.stopPropagation();

  const keys = Object.keys(projectState.cursors);
  if (keys.length <= 1) {
    showModalAlert('No Permitido', 'El proyecto debe contener al menos un tipo de cursor.', 'warning');
    return;
  }

  const label = CURSOR_DEFINITIONS[type]?.label || type;
  const ok = await showModalConfirm(
    'Quitar Cursor',
    `¿Deseas quitar '${label}' de este proyecto? Las imágenes y animaciones de los demás cursores no se verán afectadas.`,
    { danger: true, confirmText: 'Quitar' }
  );
  if (!ok) return;

  delete projectState.cursors[type];

  if (projectState.activeCursorType === type) {
    const nextType = Object.keys(projectState.cursors)[0];
    projectState.activeCursorType = nextType;
    loadCursorToWorkspace(nextType);
  }

  renderProjectTabs();
  renderSidebarCursorList();
  renderProjectSummary();
  updateAllCursors();

  showToast(`Cursor '${CURSOR_DEFINITIONS[type]?.label || type}' eliminado del proyecto`, 'info');
}

// Renderizar las pestañas superiores de cursores
function renderProjectTabs() {
  if (!projectCursorTabs) return;
  projectCursorTabs.innerHTML = '';

  const activeType = projectState.activeCursorType;
  const cursorKeys = Object.keys(projectState.cursors);

  cursorKeys.forEach(ctype => {
    const cdata = projectState.cursors[ctype];
    const def = CURSOR_DEFINITIONS[ctype] || { label: ctype, icon: '✨' };
    const isActive = (ctype === activeType);
    const numFrames = cdata.frames?.length || 1;

    const tab = document.createElement('button');
    tab.className = `cursor-tab ${isActive ? 'active' : ''}`;
    tab.title = `Editar ${def.label} (${ctype})`;

    // Miniatura
    let thumbSrc = '';
    if (cdata.frames && cdata.frames[0]?.canvas) {
      thumbSrc = cdata.frames[0].canvas.toDataURL();
    }

    tab.innerHTML = `
      ${thumbSrc ? `<img src="${thumbSrc}" class="tab-thumb" alt="${ctype}">` : `<span class="tab-icon">${def.icon}</span>`}
      <span class="tab-name">${def.label}</span>
      <span class="tab-badge">${numFrames > 1 ? `${numFrames} anim` : '1 estático'}</span>
      ${cursorKeys.length > 1 ? `<span class="tab-close" title="Quitar de este proyecto">✕</span>` : ''}
    `;

    tab.addEventListener('click', () => switchActiveCursor(ctype));

    const closeBtn = tab.querySelector('.tab-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => removeCursorTypeFromProject(ctype, e));
    }

    projectCursorTabs.appendChild(tab);
  });
}

// Renderizar la lista de cursores en el panel lateral izquierdo
function renderSidebarCursorList() {
  if (!sidebarCursorList) return;
  sidebarCursorList.innerHTML = '';

  const activeType = projectState.activeCursorType;
  const cursorKeys = Object.keys(projectState.cursors);

  cursorKeys.forEach(ctype => {
    const cdata = projectState.cursors[ctype];
    const def = CURSOR_DEFINITIONS[ctype] || { label: ctype, icon: '✨', desc: '' };
    const isActive = (ctype === activeType);
    const numFrames = cdata.frames?.length || 1;

    const item = document.createElement('div');
    item.className = `project-cursor-item ${isActive ? 'active' : ''}`;

    let thumbSrc = '';
    if (cdata.frames && cdata.frames[0]?.canvas) {
      thumbSrc = cdata.frames[0].canvas.toDataURL();
    }

    item.innerHTML = `
      <div class="project-cursor-item-left">
        <div class="cursor-item-thumb-wrap">
          ${thumbSrc ? `<img src="${thumbSrc}" alt="${ctype}">` : `<span style="font-size:1.1rem">${def.icon}</span>`}
        </div>
        <div class="cursor-item-info">
          <span class="cursor-item-name">${def.icon} ${def.label}</span>
          <span class="cursor-item-sub">${ctype} · ${numFrames > 1 ? `${numFrames} cuadros` : '1 estático'}</span>
        </div>
      </div>
      <div class="project-cursor-item-right">
        ${cursorKeys.length > 1 ? `<button class="btn btn-xs btn-danger-outline btn-del-cursor" title="Eliminar cursor">🗑️</button>` : ''}
      </div>
    `;

    item.addEventListener('click', () => switchActiveCursor(ctype));

    const delBtn = item.querySelector('.btn-del-cursor');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => removeCursorTypeFromProject(ctype, e));
    }

    sidebarCursorList.appendChild(item);
  });
}

// Renderizar el resumen del proyecto
function renderProjectSummary() {
  const cursorKeys = Object.keys(projectState.cursors);
  const totalCount = cursorKeys.length;

  if (activeProjectBadge) activeProjectBadge.textContent = projectState.themeName;
  if (activeProjectCount) activeProjectCount.textContent = `${totalCount} ${totalCount === 1 ? 'cursor' : 'cursores'}`;
  if (themeNameInput) themeNameInput.value = projectState.themeName;
  if (summaryCursorCount) summaryCursorCount.textContent = totalCount;

  if (summaryCursorChips) {
    summaryCursorChips.innerHTML = '';
    cursorKeys.forEach(ctype => {
      const def = CURSOR_DEFINITIONS[ctype] || { label: ctype, icon: '✨' };
      const chip = document.createElement('span');
      chip.className = 'summary-chip';
      chip.innerHTML = `${def.icon} ${def.label}`;
      summaryCursorChips.appendChild(chip);
    });
  }
}

// -----------------------------------------------------------------------------
// MODALES: PROYECTOS GUARDADOS, AGREGAR CURSOR, NUEVO PROYECTO
// -----------------------------------------------------------------------------

let cachedProjectsList = [];
let activeProjectsFilter = 'all';

function setupProjectEvents() {
  // Abrir modal de proyectos guardados
  const openProjectsBtns = [
    document.getElementById('btnOpenProjectsModal'),
    document.getElementById('btnOpenProjectsFromBadge')
  ];
  openProjectsBtns.forEach(b => {
    if (b) b.addEventListener('click', () => openProjectsModal());
  });

  const closeProjectsModalBtn = document.getElementById('btnCloseProjectsModal');
  if (closeProjectsModalBtn) {
    closeProjectsModalBtn.addEventListener('click', () => {
      if (projectsModal) projectsModal.style.display = 'none';
    });
  }

  // Abrir modal de agregar cursor
  const addCursorBtns = [
    document.getElementById('btnTabAddCursor'),
    document.getElementById('btnSidebarAddCursor')
  ];
  addCursorBtns.forEach(b => {
    if (b) b.addEventListener('click', () => openAddCursorModal());
  });

  const closeAddCursorModalBtn = document.getElementById('btnCloseAddCursorModal');
  if (closeAddCursorModalBtn) {
    closeAddCursorModalBtn.addEventListener('click', () => {
      if (addCursorModal) addCursorModal.style.display = 'none';
    });
  }

  // Guardar proyecto
  const saveProjectBtns = [
    document.getElementById('btnSaveProjectTop'),
    document.getElementById('btnSaveProjectSide')
  ];
  saveProjectBtns.forEach(b => {
    if (b) b.addEventListener('click', () => saveCurrentProject(true));
  });

  // Modal Nuevo Proyecto
  const btnModalNewProject = document.getElementById('btnModalNewProject');
  if (btnModalNewProject) {
    btnModalNewProject.addEventListener('click', () => {
      if (projectsModal) projectsModal.style.display = 'none';
      if (newProjectModal) {
        newProjectModal.style.display = 'flex';
        document.getElementById('newProjectNameInput').value = `MiTema_${Date.now().toString().slice(-4)}`;
        document.getElementById('newProjectNameInput').focus();
      }
    });
  }

  const btnCloseNewProjectModal = document.getElementById('btnCloseNewProjectModal');
  const btnCancelNewProject = document.getElementById('btnCancelNewProject');
  [btnCloseNewProjectModal, btnCancelNewProject].forEach(b => {
    if (b) b.addEventListener('click', () => {
      if (newProjectModal) newProjectModal.style.display = 'none';
    });
  });

  const btnConfirmNewProject = document.getElementById('btnConfirmNewProject');
  if (btnConfirmNewProject) {
    btnConfirmNewProject.addEventListener('click', () => {
      const nameInput = document.getElementById('newProjectNameInput');
      const safeName = (nameInput?.value.trim() || 'MiTema').replace(/[^a-zA-Z0-9_-]/g, '');
      const startOption = document.querySelector('input[name="newProjStart"]:checked')?.value || 'default_arrow';
      createNewProject(safeName, startOption);
      if (newProjectModal) newProjectModal.style.display = 'none';
    });
  }

  // Filtros de pestañas en modal de proyectos
  document.querySelectorAll('.pill-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeProjectsFilter = btn.dataset.filter;
      renderProjectsGrid();
    });
  });

  // Búsqueda en modal de proyectos
  if (projectSearchInput) {
    projectSearchInput.addEventListener('input', () => renderProjectsGrid());
  }

  // Sincronizar nombre de tema al escribir en input
  if (themeNameInput) {
    themeNameInput.addEventListener('input', (e) => {
      const clean = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
      projectState.themeName = clean;
      if (activeProjectBadge) activeProjectBadge.textContent = clean;
    });
  }

  // Eventos de la Biblioteca de Medios
  const openMediaBtns = [
    document.getElementById('btnOpenMediaLibrary'),
    document.getElementById('btnTabMediaLibrary')
  ];
  openMediaBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => openMediaLibraryModal());
  });

  const closeMediaModalBtn = document.getElementById('btnCloseMediaLibraryModal');
  if (closeMediaModalBtn) {
    closeMediaModalBtn.addEventListener('click', () => closeMediaLibraryModal());
  }

  const btnSaveActiveToLibrary = document.getElementById('btnSaveActiveToLibrary');
  if (btnSaveActiveToLibrary) {
    btnSaveActiveToLibrary.addEventListener('click', () => saveActiveCursorToLibrary());
  }

  const btnSaveFrameToLibrary = document.getElementById('btnSaveFrameToLibrary');
  if (btnSaveFrameToLibrary) {
    btnSaveFrameToLibrary.addEventListener('click', () => saveActiveCursorToLibrary());
  }

  const btnUploadToLibrary = document.getElementById('btnUploadToLibrary');
  if (btnUploadToLibrary && libraryFileInput) {
    btnUploadToLibrary.addEventListener('click', () => libraryFileInput.click());
    libraryFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadFileToLibrary(file);
        libraryFileInput.value = '';
      }
    });
  }

  // Filtros de tipo en la biblioteca de medios
  document.querySelectorAll('.pill-btn[data-media-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn[data-media-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMediaFilter = btn.dataset.mediaFilter;
      renderMediaLibraryGrid();
    });
  });

  if (mediaSearchInput) {
    mediaSearchInput.addEventListener('input', () => renderMediaLibraryGrid());
  }

  // Cerrar modales al hacer clic en el backdrop oscuro
  [mediaLibraryModal, projectsModal, addCursorModal, newProjectModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }
  });
}

// Abrir modal de proyectos guardados
async function openProjectsModal() {
  if (!projectsModal) return;
  projectsModal.style.display = 'flex';
  showToast('Cargando proyectos y temas guardados...', 'info');

  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    cachedProjectsList = data.projects || [];

    // Actualizar contadores
    const countAll = cachedProjectsList.length;
    const countStudio = cachedProjectsList.filter(p => p.has_project_file).length;
    const countInstalled = cachedProjectsList.filter(p => !p.has_project_file).length;

    const elAll = document.getElementById('countAllProjects');
    const elStudio = document.getElementById('countStudioProjects');
    const elInstalled = document.getElementById('countInstalledThemes');
    if (elAll) elAll.textContent = countAll;
    if (elStudio) elStudio.textContent = countStudio;
    if (elInstalled) elInstalled.textContent = countInstalled;

    renderProjectsGrid();
  } catch (err) {
    showToast(`Error al cargar proyectos: ${err.message}`, 'error');
  }
}

// Renderizar la cuadrícula de proyectos guardados
function renderProjectsGrid() {
  if (!projectsGrid) return;
  projectsGrid.innerHTML = '';

  const query = (projectSearchInput?.value || '').toLowerCase().trim();

  let list = cachedProjectsList.filter(p => {
    if (activeProjectsFilter === 'projects' && !p.has_project_file) return false;
    if (activeProjectsFilter === 'installed' && p.has_project_file) return false;
    if (query && !p.name.toLowerCase().includes(query)) return false;
    return true;
  });

  if (list.length === 0) {
    projectsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-dim);">
        <div style="font-size: 2.5rem; margin-bottom: 10px;">📂</div>
        <p>No se encontraron proyectos o temas coincidentes.</p>
        <button class="btn btn-sm btn-primary" onclick="document.getElementById('btnModalNewProject').click()" style="margin-top: 12px;">Crear un Proyecto Ahora</button>
      </div>
    `;
    return;
  }

  list.forEach(proj => {
    const card = document.createElement('div');
    const isCurrentActive = proj.is_active;
    const hasConflict = proj.conflict_warning;

    card.className = `project-card ${isCurrentActive ? 'active-theme-card' : ''} ${hasConflict ? 'conflict-card' : ''}`;

    // Tira de miniaturas de cursores disponibles
    let thumbsHtml = '';
    const cursorsSummary = proj.cursors_summary || {};
    const summaryEntries = Object.entries(cursorsSummary);

    if (summaryEntries.length > 0) {
      summaryEntries.forEach(([ctype, info]) => {
        thumbsHtml += `
          <div class="card-thumb-item" title="${info.label || ctype}">
            ${info.thumb ? `<img src="${info.thumb}" alt="${ctype}">` : `<span>${info.icon || '✨'}</span>`}
            <span>${ctype.slice(0, 6)}</span>
          </div>
        `;
      });
    } else {
      thumbsHtml = `<span style="font-size: 0.72rem; color: var(--text-dim); padding: 4px;">Sin cursores detectados</span>`;
    }

    const dateStr = proj.updated_at ? new Date(proj.updated_at * 1000).toLocaleDateString() : 'Reciente';

    card.innerHTML = `
      <div class="project-card-header">
        <div class="project-card-title">${proj.name}</div>
        <div class="project-badges">
          ${isCurrentActive ? `<span class="badge-active-sys">✓ Activo en Linux</span>` : ''}
          ${proj.has_project_file ? `<span class="badge-saved-proj">📁 Proyecto Studio</span>` : `<span class="badge-saved-proj">📦 Tema ~/.icons</span>`}
          ${hasConflict ? `<span class="badge-conflict">⚠️ Conflicto detectado</span>` : ''}
        </div>
      </div>

      <div class="project-card-thumbs">
        ${thumbsHtml}
      </div>

      <div class="project-card-meta">
        <span>${proj.cursor_types?.length || 0} tipo(s) de cursor</span>
        <span>${dateStr}</span>
      </div>

      ${hasConflict ? `
        <div class="conflict-alert-box">
          <span>⚠️ <strong>Conflicto de cursor:</strong> La flecha normal fue sobreescrita con la animación de espera.</span>
          <button class="btn btn-xs btn-warning-outline btn-repair-theme">🛠️ Reparar Conflicto Ahora</button>
        </div>
      ` : ''}

      <div class="project-card-actions">
        <button class="btn btn-xs btn-primary btn-load-proj" title="Abrir y editar en el lienzo">✏️ Editar</button>
        ${!isCurrentActive ? `<button class="btn btn-xs btn-outline btn-apply-theme" title="Activar directamente en el sistema">⚡ Activar</button>` : ''}
        <button class="btn btn-xs btn-outline btn-dup-proj" title="Duplicar proyecto">📋</button>
        ${!isCurrentActive ? `<button class="btn btn-xs btn-danger-outline btn-del-proj" title="Eliminar proyecto">🗑️</button>` : ''}
      </div>
    `;

    // Eventos de la tarjeta
    const btnLoad = card.querySelector('.btn-load-proj');
    if (btnLoad) {
      btnLoad.addEventListener('click', () => loadProjectFromServer(proj.name));
    }

    const btnApply = card.querySelector('.btn-apply-theme');
    if (btnApply) {
      btnApply.addEventListener('click', () => applyThemeDirect(proj.name));
    }

    const btnDup = card.querySelector('.btn-dup-proj');
    if (btnDup) {
      btnDup.addEventListener('click', () => duplicateProject(proj.name));
    }

    const btnRepair = card.querySelector('.btn-repair-theme');
    if (btnRepair) {
      btnRepair.addEventListener('click', () => repairTheme(proj.name));
    }

    const btnDel = card.querySelector('.btn-del-proj');
    if (btnDel) {
      btnDel.addEventListener('click', () => deleteProject(proj.name));
    }

    projectsGrid.appendChild(card);
  });
}

// Cargar un proyecto desde el servidor
async function loadProjectFromServer(name) {
  showToast(`Cargando proyecto '${name}'...`, 'info');
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(name)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const proj = data.project;
    projectState.themeName = proj.theme_name || name;
    projectState.baseTheme = proj.base_theme || 'BreezeX-Dark';
    projectState.cursors = {};

    // Reconstruir los canvas de cada cursor
    for (const [ctype, cdata] of Object.entries(proj.cursors || {})) {
      const loadedFrames = [];
      for (const f of cdata.frames || []) {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = f.dataUrl; });
        const c = createFrameCanvas(cdata.width || img.width, cdata.height || img.height);
        c.getContext('2d').drawImage(img, 0, 0);
        loadedFrames.push({ canvas: c, delay: f.delay || 80 });
      }

      projectState.cursors[ctype] = {
        name: cdata.name || CURSOR_DEFINITIONS[ctype]?.label || ctype,
        frames: loadedFrames,
        hotspot: cdata.hotspot || { x: 0, y: 0 },
        canvasWidth: cdata.width || loadedFrames[0]?.canvas.width || 32,
        canvasHeight: cdata.height || loadedFrames[0]?.canvas.height || 32,
        fps: cdata.fps || (loadedFrames[0]?.delay ? Math.max(1, Math.min(40, Math.round(1000 / loadedFrames[0].delay))) : 12),
        currentFrameIndex: 0
      };
    }

    // Seleccionar cursor activo
    const firstType = proj.activeCursorType || Object.keys(projectState.cursors)[0] || 'left_ptr';
    projectState.activeCursorType = firstType;
    loadCursorToWorkspace(firstType);

    renderProjectTabs();
    renderSidebarCursorList();
    renderProjectSummary();
    updateAllCursors();

    if (projectsModal) projectsModal.style.display = 'none';
    showToast(`¡Proyecto '${name}' cargado con éxito!`, 'success');
  } catch (err) {
    showToast(`Error al cargar: ${err.message}`, 'error');
  }
}

// Guardar el proyecto actual en JSON
async function saveCurrentProject(notify = true) {
  commitWorkspaceToActiveCursor();
  const name = document.getElementById('themeNameInput')?.value.trim() || projectState.themeName || 'MiCursorCustom';
  projectState.themeName = name;

  const payloadCursors = {};
  for (const [ctype, cdata] of Object.entries(projectState.cursors)) {
    payloadCursors[ctype] = {
      name: cdata.name,
      frames: cdata.frames.map(f => ({
        dataUrl: f.canvas.toDataURL('image/png'),
        delay: f.delay || Math.round(1000 / (cdata.fps || 12))
      })),
      hotspot: cdata.hotspot,
      width: cdata.canvasWidth,
      height: cdata.canvasHeight,
      fps: cdata.fps
    };
  }

  const payload = {
    theme_name: name,
    base_theme: projectState.baseTheme,
    size: state.cursorSize,
    activeCursorType: projectState.activeCursorType,
    cursors: payloadCursors
  };

  try {
    const res = await fetch('/api/projects/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    renderProjectSummary();
    if (notify) showToast(`💾 ¡Proyecto '${name}' guardado correctamente!`, 'success');
  } catch (err) {
    if (notify) showToast(`Error al guardar proyecto: ${err.message}`, 'error');
  }
}

// Crear un nuevo proyecto
function createNewProject(name, startOption) {
  projectState.themeName = name;
  projectState.activeCursorType = 'left_ptr';
  projectState.cursors = {};

  const arrowData = createDefaultCursorData('left_ptr', 32, 32);
  if (startOption === 'blank') {
    arrowData.frames[0].canvas.getContext('2d').clearRect(0, 0, 32, 32);
  }
  projectState.cursors['left_ptr'] = arrowData;

  loadCursorToWorkspace('left_ptr');
  renderProjectTabs();
  renderSidebarCursorList();
  renderProjectSummary();
  updateAllCursors();

  saveCurrentProject(false);
  showToast(`¡Nuevo proyecto '${name}' creado!`, 'success');
}

// Duplicar un proyecto existente
async function duplicateProject(sourceName) {
  const newName = `${sourceName}_copia`;
  await loadProjectFromServer(sourceName);
  projectState.themeName = newName;
  if (themeNameInput) themeNameInput.value = newName;
  await saveCurrentProject(false);
  openProjectsModal();
  showToast(`Proyecto duplicado como '${newName}'`, 'success');
}

// Reparar conflicto en un tema
async function repairTheme(name) {
  const ok = await showModalConfirm(
    'Reparar Conflicto de Cursor',
    `¿Deseas reparar el tema '${name}' para restaurar la flecha principal (left_ptr) y separarla del cursor de espera (wait)?`,
    { icon: 'warning', confirmText: 'Reparar ahora' }
  );
  if (!ok) return;

  showToast(`Reparando conflicto en '${name}'...`, 'info');
  try {
    const res = await fetch('/api/repair_theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_name: name })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showModalAlert('Tema Reparado', data.message, 'success');
    openProjectsModal();
    fetchSystemStatus();
  } catch (err) {
    showModalAlert('Error al Reparar', err.message, 'danger');
  }
}

// Activar tema directamente
async function applyThemeDirect(name) {
  try {
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_name: name })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentThemeLabel.textContent = name;
    showToast(`✅ Tema '${name}' activado en el sistema Linux`, 'success');
    openProjectsModal();
  } catch (err) {
    showModalAlert('Error al Activar Tema', err.message, 'danger');
  }
}

// Eliminar un proyecto
async function deleteProject(name) {
  const ok = await showModalConfirm(
    'Eliminar Proyecto',
    `¿Estás seguro de eliminar permanentemente el proyecto y tema '${name}'? Esta acción no se puede deshacer.`,
    { danger: true, confirmText: 'Sí, eliminar' }
  );
  if (!ok) return;

  try {
    const res = await fetch('/api/projects/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_name: name, delete_installed: true })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showToast(`Proyecto '${name}' eliminado`, 'info');
    openProjectsModal();
  } catch (err) {
    showToast(`Error al eliminar: ${err.message}`, 'error');
  }
}

// Abrir modal de selección para añadir tipo de cursor al proyecto
function openAddCursorModal() {
  if (!addCursorModal || !cursorPickerGrid) return;
  cursorPickerGrid.innerHTML = '';

  const currentTypes = new Set(Object.keys(projectState.cursors));

  Object.entries(CURSOR_DEFINITIONS).forEach(([ctype, def]) => {
    const isAlreadyAdded = currentTypes.has(ctype);
    const card = document.createElement('div');
    card.className = `cursor-picker-card ${isAlreadyAdded ? 'already-added' : ''}`;

    card.innerHTML = `
      <div class="picker-icon">${def.icon}</div>
      <div class="picker-details">
        <div class="picker-title-row">
          <span class="picker-name">${def.label}</span>
          ${isAlreadyAdded ? `<span class="picker-tag">✓ Ya añadido</span>` : ''}
        </div>
        <span class="picker-desc">${def.desc}</span>
        <span class="picker-id">${ctype}</span>
      </div>
    `;

    if (!isAlreadyAdded) {
      card.addEventListener('click', () => {
        addCursorTypeToProject(ctype);
        addCursorModal.style.display = 'none';
      });
    } else {
      card.addEventListener('click', () => {
        switchActiveCursor(ctype);
        addCursorModal.style.display = 'none';
      });
    }

    cursorPickerGrid.appendChild(card);
  });

  addCursorModal.style.display = 'flex';
}

// -----------------------------------------------------------------------------
// GESTIÓN DE LA BIBLIOTECA DE MEDIOS
// -----------------------------------------------------------------------------

async function openMediaLibraryModal() {
  if (!mediaLibraryModal) return;
  const activeType = projectState.activeCursorType;
  const def = CURSOR_DEFINITIONS[activeType] || { label: activeType, icon: '🎯' };
  if (libTargetCursorBadge) {
    libTargetCursorBadge.textContent = `${def.icon} ${def.label} (${activeType})`;
  }

  mediaLibraryModal.style.display = 'flex';
  await fetchMediaLibrary();
}

function closeMediaLibraryModal() {
  if (mediaLibraryModal) {
    mediaLibraryModal.style.display = 'none';
  }
}

async function fetchMediaLibrary() {
  try {
    const res = await fetch('/api/media');
    const data = await res.json();
    mediaLibrary = data.media || [];

    const total = mediaLibrary.length;
    const gifs = mediaLibrary.filter(m => m.type === 'gif' || m.frame_count > 1).length;
    const images = mediaLibrary.filter(m => m.type === 'image' && m.frame_count <= 1).length;

    if (libCountAll) libCountAll.textContent = total;
    if (libCountGifs) libCountGifs.textContent = gifs;
    if (libCountImages) libCountImages.textContent = images;

    renderMediaLibraryGrid();
  } catch (err) {
    showToast(`Error al consultar la biblioteca: ${err.message}`, 'error');
  }
}

function renderMediaLibraryGrid() {
  if (!mediaLibraryGrid) return;
  mediaLibraryGrid.innerHTML = '';

  const q = (mediaSearchInput?.value || '').trim().toLowerCase();
  const filtered = mediaLibrary.filter(item => {
    if (activeMediaFilter === 'gif' && item.type !== 'gif' && item.frame_count <= 1) return false;
    if (activeMediaFilter === 'image' && (item.type === 'gif' || item.frame_count > 1)) return false;
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  });

  if (filtered.length === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'media-empty';
    emptyCard.innerHTML = `
      <div class="media-empty-icon">📁</div>
      <div class="media-empty-title">No hay medios guardados</div>
      <p class="media-empty-desc">
        ${q ? 'No se encontraron resultados para tu búsqueda.' : 'Aún no tienes medios guardados en esta categoría. Puedes subir imágenes fijas o animaciones GIF, o guardar el cursor que estás dibujando ahora.'}
      </p>
      <button class="btn btn-sm btn-primary" id="btnEmptyUploadMedia">
        ➕ Subir Archivo a la Biblioteca
      </button>
    `;
    const btnUpload = emptyCard.querySelector('#btnEmptyUploadMedia');
    if (btnUpload && libraryFileInput) {
      btnUpload.addEventListener('click', () => libraryFileInput.click());
    }
    mediaLibraryGrid.appendChild(emptyCard);
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'media-card';

    const isAnim = item.type === 'gif' || item.frame_count > 1;
    const typeLabel = isAnim ? `🎬 ${item.frame_count} fotogramas` : '🖼️ Imagen fija';

    card.innerHTML = `
      <div class="media-thumb-box checkerboard">
        <span class="media-type-badge">${isAnim ? 'GIF / Animado' : 'Estático'}</span>
        <img class="media-thumb-img" src="${item.thumbnail}" alt="${item.name}">
      </div>
      <div class="media-info">
        <span class="media-name" title="${item.name}">${item.name}</span>
        <div class="media-meta-row">
          <span>${typeLabel}</span>
          <span class="media-dims">${item.width || 32}×${item.height || 32} px</span>
        </div>
      </div>
      <div class="media-card-actions">
        <button class="btn-use-media" title="Asignar al cursor activo">
          ✨ Usar en este cursor
        </button>
        <button class="btn-delete-media" title="Eliminar de la biblioteca">
          🗑️
        </button>
      </div>
    `;

    const btnUse = card.querySelector('.btn-use-media');
    btnUse.addEventListener('click', () => applyMediaToActiveCursor(item.id));

    const btnDel = card.querySelector('.btn-delete-media');
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteMediaFromLibrary(item.id, item.name);
    });

    mediaLibraryGrid.appendChild(card);
  });
}

async function applyMediaToActiveCursor(mediaId) {
  showToast('Cargando medio seleccionado al cursor...', 'info');
  try {
    const res = await fetch(`/api/media/${encodeURIComponent(mediaId)}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const asset = data.media;
    if (!asset || !asset.frames || asset.frames.length === 0) {
      throw new Error('El archivo de medio no contiene fotogramas válidos');
    }

    const first = asset.frames[0];
    const w = first.width || asset.width || 32;
    const h = first.height || asset.height || 32;

    state.canvasWidth = w;
    state.canvasHeight = h;
    state.frames = [];

    for (const f of asset.frames) {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = f.dataUrl; });
      const c = createFrameCanvas(w, h);
      c.getContext('2d').drawImage(img, 0, 0);
      state.frames.push({ canvas: c, delay: f.delay || asset.duration || 80 });
    }

    state.currentFrameIndex = 0;
    state.zoom = Math.max(4, Math.min(24, Math.floor(400 / Math.max(w, h))));
    updateCanvasDimensions();
    loadCurrentFrameToWorkspace();
    updateTimeline();

    if (state.frames[0].delay) {
      const calculatedFps = Math.max(1, Math.min(40, Math.round(1000 / state.frames[0].delay)));
      state.fps = calculatedFps;
      const speedSlider = document.getElementById('speedSlider');
      if (speedSlider) speedSlider.value = calculatedFps;
      if (fpsLabel) fpsLabel.textContent = `${calculatedFps} FPS (${state.frames[0].delay}ms)`;
    }

    commitWorkspaceToActiveCursor();
    renderProjectTabs();
    renderSidebarCursorList();
    updateAllCursors();

    closeMediaLibraryModal();
    const activeLabel = CURSOR_DEFINITIONS[projectState.activeCursorType]?.label || projectState.activeCursorType;
    showToast(`¡'${asset.name}' asignado exitosamente al cursor '${activeLabel}'!`, 'success');
  } catch (err) {
    showToast(`Error al aplicar medio: ${err.message}`, 'error');
  }
}

async function saveActiveCursorToLibrary() {
  commitWorkspaceToActiveCursor();
  const activeType = projectState.activeCursorType;
  const cursor = projectState.cursors[activeType];
  if (!cursor || !cursor.frames || cursor.frames.length === 0) {
    showToast('No hay fotogramas para guardar', 'error');
    return;
  }

  const def = CURSOR_DEFINITIONS[activeType] || { label: activeType };
  const defaultName = `${def.label} - ${projectState.themeName || 'MiCursor'}`;
  const customName = await showModalPrompt(
    'Guardar en Biblioteca',
    'Asigna un nombre descriptivo para identificar este recurso en tu biblioteca de medios:',
    defaultName,
    'Nombre del recurso...'
  );
  if (customName === null || !customName.trim()) return;
  const finalName = customName.trim();

  showToast(`Guardando '${finalName}' en la biblioteca...`, 'info');

  const framesData = cursor.frames.map(f => ({
    dataUrl: f.canvas.toDataURL('image/png'),
    delay: f.delay || 80,
    width: f.canvas.width,
    height: f.canvas.height
  }));

  try {
    const res = await fetch('/api/media/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: finalName,
        frames: framesData,
        type: framesData.length > 1 ? 'gif' : 'image'
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showModalAlert('Guardado Exitoso', `¡'${finalName}' se ha guardado en tu biblioteca de medios!`, 'success');
    if (mediaLibraryModal && mediaLibraryModal.style.display === 'flex') {
      await fetchMediaLibrary();
    }
  } catch (err) {
    showModalAlert('Error al Guardar', err.message, 'danger');
  }
}

async function deleteMediaFromLibrary(mediaId, mediaName) {
  const ok = await showModalConfirm(
    'Eliminar Recurso',
    `¿Estás seguro de eliminar '${mediaName}' de la biblioteca de medios? Esta acción no se puede deshacer.`,
    { danger: true, confirmText: 'Sí, eliminar' }
  );
  if (!ok) return;

  try {
    const res = await fetch('/api/media/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: mediaId })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    showToast(`'${mediaName}' eliminado de la biblioteca`, 'info');
    await fetchMediaLibrary();
  } catch (err) {
    showModalAlert('Error al Eliminar', err.message, 'danger');
  }
}

async function uploadFileToLibrary(file) {
  showToast(`Subiendo ${file.name} a la biblioteca...`, 'info');
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result;
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_data: base64Data, filename: file.name, name: file.name })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast(`¡${file.name} guardado en la biblioteca!`, 'success');
      await fetchMediaLibrary();
    } catch (err) {
      showToast(`Error al subir a biblioteca: ${err.message}`, 'error');
    }
  };
  reader.readAsDataURL(file);
}

// -----------------------------------------------------------------------------
// VISTA PREVIA DINÁMICA & SIMULADOR MULTICURSORES
// -----------------------------------------------------------------------------

function updateAllCursors() {
  commitWorkspaceToActiveCursor();

  // Obtener datos CSS para Flecha y Manita del proyecto
  const leftPtrData = projectState.cursors['left_ptr'];
  const pointerData = projectState.cursors['pointer'];

  // 1. Sandbox lateral
  if (testSandbox) {
    if (leftPtrData && leftPtrData.frames[0]) {
      const scaled = getScaledCursorData(leftPtrData.frames[0].canvas, state.cursorSize, leftPtrData.hotspot);
      testSandbox.style.cursor = `url("${scaled.dataUrl}") ${scaled.hotspot.x} ${scaled.hotspot.y}, default`;
    } else {
      testSandbox.style.cursor = 'default';
    }

    const testLink = testSandbox.querySelector('.sandbox-link');
    const testBtn = testSandbox.querySelector('#sandboxTestBtn');
    if (pointerData && pointerData.frames[0]) {
      const scaledP = getScaledCursorData(pointerData.frames[0].canvas, state.cursorSize, pointerData.hotspot);
      const cssP = `url("${scaledP.dataUrl}") ${scaledP.hotspot.x} ${scaledP.hotspot.y}, pointer`;
      if (testLink) testLink.style.cursor = cssP;
      if (testBtn) testBtn.style.cursor = cssP;
    } else {
      if (testLink) testLink.style.cursor = 'pointer';
      if (testBtn) testBtn.style.cursor = 'pointer';
    }
  }

  // 2. Simulador Modal Multicursores
  const simTargets = [
    { type: 'left_ptr', cardId: 'simCardLeftPtr', areaId: 'simAreaLeftPtr', badgeId: 'simBadgeLeftPtr', fallback: 'default' },
    { type: 'pointer', cardId: 'simCardPointer', areaId: 'simAreaPointer', badgeId: 'simBadgePointer', fallback: 'pointer' },
    { type: 'wait', cardId: 'simCardWait', areaId: 'simAreaWait', badgeId: 'simBadgeWait', fallback: 'wait' },
    { type: 'not-allowed', cardId: 'simCardNotAllowed', areaId: 'simAreaNotAllowed', badgeId: 'simBadgeNotAllowed', fallback: 'not-allowed' },
    { type: 'move', cardId: 'simCardMove', areaId: 'simAreaMove', badgeId: 'simBadgeMove', fallback: 'move' },
    { type: 'text', cardId: 'simCardText', areaId: 'simAreaText', badgeId: 'simBadgeText', fallback: 'text' }
  ];

  simTargets.forEach(target => {
    const card = document.getElementById(target.cardId);
    const area = document.getElementById(target.areaId);
    const badge = document.getElementById(target.badgeId);
    const checkbox = document.querySelector(`.sim-toggle-check[data-cursor-target="${target.type}"]`);

    const cursorObj = projectState.cursors[target.type];
    const isCustomActive = !!cursorObj && cursorObj.frames.length > 0;

    if (checkbox) checkbox.checked = isCustomActive;

    if (area) {
      if (isCustomActive && cursorObj.frames[0]) {
        const scaled = getScaledCursorData(cursorObj.frames[0].canvas, state.cursorSize, cursorObj.hotspot);
        area.style.cursor = `url("${scaled.dataUrl}") ${scaled.hotspot.x} ${scaled.hotspot.y}, ${target.fallback}`;
      } else {
        area.style.cursor = target.fallback;
      }
    }

    if (badge) {
      if (isCustomActive) {
        const hs = cursorObj.hotspot || { x: 0, y: 0 };
        badge.textContent = `✅ Custom (X:${hs.x}, Y:${hs.y})`;
        badge.className = 'sim-badge active-custom';
      } else {
        badge.textContent = '⚪ Por defecto del sistema';
        badge.className = 'sim-badge default-sys';
      }
    }

    if (card) {
      card.classList.toggle('sim-card-active', isCustomActive);
      card.classList.toggle('sim-card-disabled', !isCustomActive);
    }
  });
}

function getScaledCursorData(frameCanvas, targetSize, hotspot) {
  const W = frameCanvas.width;
  const H = frameCanvas.height;
  const scale = targetSize / Math.max(W, H);
  const sw = Math.max(1, Math.round(W * scale));
  const sh = Math.max(1, Math.round(H * scale));

  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(frameCanvas, 0, 0, sw, sh);

  const scaledHx = Math.max(0, Math.min(sw - 1, Math.round(hotspot.x * scale)));
  const scaledHy = Math.max(0, Math.min(sh - 1, Math.round(hotspot.y * scale)));

  return {
    dataUrl: c.toDataURL('image/png'),
    width: sw,
    height: sh,
    hotspot: { x: scaledHx, y: scaledHy }
  };
}

// -----------------------------------------------------------------------------
// EVENTOS PRINCIPALES DE LA UI
// -----------------------------------------------------------------------------

function setupEvents() {
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTool = btn.dataset.tool;
    });
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.brushSize = parseInt(btn.dataset.brush, 10);
    });
  });

  const primaryColorInput = document.getElementById('primaryColor');
  const hexColorInput = document.getElementById('hexColor');
  const alphaSlider = document.getElementById('alphaSlider');
  const alphaVal = document.getElementById('alphaVal');

  primaryColorInput.addEventListener('input', (e) => setColor(e.target.value));

  hexColorInput.addEventListener('change', (e) => {
    let val = e.target.value.trim();
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val);
  });

  alphaSlider.addEventListener('input', (e) => {
    state.colorAlpha = parseInt(e.target.value, 10) / 100;
    alphaVal.textContent = `${e.target.value}%`;
  });

  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnRedo').addEventListener('click', redo);
  document.getElementById('btnClearFrame').addEventListener('click', () => {
    mainCtx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    commitWorkspaceToFrame();
    saveHistoryState();
  });

  document.getElementById('zoomIn').addEventListener('click', () => changeZoom(2));
  document.getElementById('zoomOut').addEventListener('click', () => changeZoom(-2));

  const toggleGridBtn = document.getElementById('toggleGrid');
  toggleGridBtn.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    toggleGridBtn.classList.toggle('active', state.showGrid);
    drawOverlay();
  });
  toggleGridBtn.classList.add('active');

  const toggleOnionBtn = document.getElementById('toggleOnion');
  toggleOnionBtn.addEventListener('click', () => {
    state.showOnionSkin = !state.showOnionSkin;
    toggleOnionBtn.classList.toggle('active', state.showOnionSkin);
    loadCurrentFrameToWorkspace();
  });

  document.querySelectorAll('[data-hs]').forEach(btn => {
    btn.addEventListener('click', () => setHotspotPreset(btn.dataset.hs));
  });

  setupCanvasDrawing();

  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');

  document.getElementById('btnImportFile').addEventListener('click', () => fileInput.click());
  document.getElementById('btnImportFolder').addEventListener('click', () => folderInput.click());

  fileInput.addEventListener('change', handleFileImport);
  folderInput.addEventListener('change', handleFolderImport);

  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  const btnNewCanvas = document.getElementById('btnNewCanvas');
  const dropdownSizes = document.getElementById('dropdownSizes');
  btnNewCanvas.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownSizes.classList.toggle('show');
  });

  dropdownSizes.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const s = parseInt(a.dataset.size, 10);
      resizeActiveCursorCanvas(s, s);
      dropdownSizes.classList.remove('show');
    });
  });

  window.addEventListener('click', () => dropdownSizes.classList.remove('show'));

  document.getElementById('bgTolerance').addEventListener('input', (e) => {
    document.getElementById('bgToleranceVal').textContent = `${e.target.value}%`;
  });

  document.getElementById('btnAutoRemoveBg').addEventListener('click', () => autoDetectAndRemoveCorners(false));
  document.getElementById('btnRemoveBgCurrent').addEventListener('click', () => removeBackground(state.currentFrameIndex));
  document.getElementById('btnRemoveBgAll').addEventListener('click', () => {
    for (let i = 0; i < state.frames.length; i++) removeBackground(i);
    loadCurrentFrameToWorkspace();
    showToast('Fondo eliminado en todos los cuadros', 'success');
  });

  document.getElementById('btnAddFrame').addEventListener('click', addNewFrame);
  document.getElementById('btnDuplicateFrame').addEventListener('click', duplicateFrame);
  document.getElementById('btnDeleteFrame').addEventListener('click', deleteFrame);
  document.getElementById('btnMoveFrameLeft').addEventListener('click', () => moveFrame(-1));
  document.getElementById('btnMoveFrameRight').addEventListener('click', () => moveFrame(1));

  const speedSlider = document.getElementById('speedSlider');
  speedSlider.addEventListener('input', (e) => {
    state.fps = parseInt(e.target.value, 10);
    const delay = Math.round(1000 / state.fps);
    fpsLabel.textContent = `${state.fps} FPS (${delay}ms)`;
    state.frames.forEach(f => f.delay = delay);
  });

  const btnPlayPause = document.getElementById('btnPlayPause');
  btnPlayPause.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    btnPlayPause.textContent = state.isPlaying ? '⏸️ Pausar' : '▶️ Reproducir';
  });

  document.querySelectorAll('.btn-preview-bg').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-preview-bg').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const bg = btn.dataset.bg;
      const pBox = document.getElementById('previewBox');
      pBox.className = `preview-box ${bg === 'checker' ? 'checkerboard' : bg}`;
    });
  });

  const cursorSizeSlider = document.getElementById('cursorSizeSlider');
  cursorSizeSlider.addEventListener('input', (e) => setCursorSize(parseInt(e.target.value, 10)));

  document.querySelectorAll('.chip-size').forEach(btn => {
    btn.addEventListener('click', () => setCursorSize(parseInt(btn.dataset.size, 10)));
  });

  document.getElementById('btnInstall').addEventListener('click', installTheme);
  document.getElementById('btnInstallSide').addEventListener('click', installTheme);
  document.getElementById('btnRestore').addEventListener('click', restoreTheme);

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    else if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    else if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveCurrentProject(true); }
    else if (e.key === 'p' || e.key === 'P') selectTool('pencil');
    else if (e.key === 'e' || e.key === 'E') selectTool('eraser');
    else if (e.key === 'b' || e.key === 'B') selectTool('bucket');
    else if (e.key === 'i' || e.key === 'I') selectTool('eyedropper');
    else if (e.key === 'h' || e.key === 'H') selectTool('hotspot');
    else if (e.key === 'w' || e.key === 'W') selectTool('wand');
    else if (e.key === ' ') {
      e.preventDefault();
      btnPlayPause.click();
    }
  });
}

function selectTool(name) {
  const btn = document.querySelector(`.tool-btn[data-tool="${name}"]`);
  if (btn) btn.click();
}

function setCursorSize(size) {
  state.cursorSize = size;
  cursorSizeLabel.textContent = `${size} px`;
  document.getElementById('cursorSizeSlider').value = size;
  document.querySelectorAll('.chip-size').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.size, 10) === size);
  });
  updateAllCursors();
}

function resizeActiveCursorCanvas(w, h) {
  state.canvasWidth = w;
  state.canvasHeight = h;
  state.hotspot = { x: 0, y: 0 };

  state.frames = [];
  const initialFrame = createFrameCanvas(w, h);
  if (projectState.activeCursorType === 'left_ptr') {
    drawDefaultArrow(initialFrame);
  } else if (projectState.activeCursorType === 'pointer') {
    drawDefaultPointer(initialFrame);
  }
  state.frames.push({ canvas: initialFrame, delay: 80 });
  state.currentFrameIndex = 0;

  updateCanvasDimensions();
  loadCurrentFrameToWorkspace();
  updateTimeline();
  updateHotspotDisplay();
  commitWorkspaceToActiveCursor();
  renderProjectTabs();
}

// -----------------------------------------------------------------------------
// DIBUJO SOBRE EL CANVAS CENTRAL
// -----------------------------------------------------------------------------

function setupCanvasDrawing() {
  function getPixelCoord(e) {
    const rect = mainCanvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = Math.floor((clientX - rect.left) / state.zoom);
    const y = Math.floor((clientY - rect.top) / state.zoom);
    return {
      x: Math.max(0, Math.min(state.canvasWidth - 1, x)),
      y: Math.max(0, Math.min(state.canvasHeight - 1, y))
    };
  }

  mainCanvas.addEventListener('mousedown', (e) => {
    state.isDrawing = true;
    const p = getPixelCoord(e);
    state.lastDrawnPixel = p;

    if (state.activeTool === 'hotspot') {
      state.hotspot = p;
      updateHotspotDisplay();
    } else if (state.activeTool === 'eyedropper') {
      pickColorAt(p.x, p.y);
    } else if (state.activeTool === 'bucket') {
      floodFill(p.x, p.y);
      commitWorkspaceToFrame();
      saveHistoryState();
    } else if (state.activeTool === 'wand') {
      removeColorAt(p.x, p.y);
      commitWorkspaceToFrame();
      saveHistoryState();
    } else {
      drawAt(p.x, p.y);
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isDrawing) return;
    const p = getPixelCoord(e);

    if (state.activeTool === 'hotspot') {
      state.hotspot = p;
      updateHotspotDisplay();
    } else if (state.activeTool === 'pencil' || state.activeTool === 'eraser') {
      drawLine(state.lastDrawnPixel.x, state.lastDrawnPixel.y, p.x, p.y);
      state.lastDrawnPixel = p;
    }
  });

  window.addEventListener('mouseup', () => {
    if (state.isDrawing) {
      state.isDrawing = false;
      if (['pencil', 'eraser'].includes(state.activeTool)) {
        commitWorkspaceToFrame();
        saveHistoryState();
      }
    }
  });
}

function drawLine(x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  while (true) {
    drawAt(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawAt(x, y) {
  const size = state.brushSize;
  const offset = Math.floor(size / 2);

  if (state.activeTool === 'eraser') {
    mainCtx.clearRect(x - offset, y - offset, size, size);
  } else if (state.activeTool === 'pencil') {
    mainCtx.fillStyle = hexToRgba(state.primaryColor, state.colorAlpha);
    mainCtx.fillRect(x - offset, y - offset, size, size);
  }
}

function hexToRgba(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

function pickColorAt(x, y) {
  const pixel = mainCtx.getImageData(x, y, 1, 1).data;
  if (pixel[3] > 0) {
    const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
    setColor(hex);
    state.colorAlpha = pixel[3] / 255;
    document.getElementById('alphaSlider').value = Math.round(state.colorAlpha * 100);
    document.getElementById('alphaVal').textContent = `${Math.round(state.colorAlpha * 100)}%`;
  }
}

function floodFill(startX, startY) {
  const imgData = mainCtx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
  const data = imgData.data;
  const w = state.canvasWidth;
  const h = state.canvasHeight;

  const startIndex = (startY * w + startX) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  const fillRgba = hexToRgbaArray(state.primaryColor, state.colorAlpha);
  if (startR === fillRgba[0] && startG === fillRgba[1] && startB === fillRgba[2] && startA === fillRgba[3]) return;

  const queue = [[startX, startY]];
  const seen = new Uint8Array(w * h);

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    const idx = (y * w + x);
    if (seen[idx]) continue;
    seen[idx] = 1;

    const pIdx = idx * 4;
    if (data[pIdx] === startR && data[pIdx + 1] === startG && data[pIdx + 2] === startB && data[pIdx + 3] === startA) {
      data[pIdx] = fillRgba[0];
      data[pIdx + 1] = fillRgba[1];
      data[pIdx + 2] = fillRgba[2];
      data[pIdx + 3] = fillRgba[3];

      if (x > 0) queue.push([x - 1, y]);
      if (x < w - 1) queue.push([x + 1, y]);
      if (y > 0) queue.push([x, y - 1]);
      if (y < h - 1) queue.push([x, y + 1]);
    }
  }

  mainCtx.putImageData(imgData, 0, 0);
}

function hexToRgbaArray(hex, alpha) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, Math.round(alpha * 255)];
}

function removeColorAt(startX, startY) {
  const tol = parseInt(document.getElementById('bgTolerance').value, 10) / 100 * 441.67;
  const isContiguous = document.getElementById('bgContiguous').checked;

  const imgData = mainCtx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
  const data = imgData.data;
  const w = state.canvasWidth;
  const h = state.canvasHeight;

  const targetIdx = (startY * w + startX) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  if (ta === 0) return;

  function matchColor(i) {
    const dr = data[i] - tr;
    const dg = data[i + 1] - tg;
    const db = data[i + 2] - tb;
    return Math.sqrt(dr * dr + dg * dg + db * db) <= tol;
  }

  if (isContiguous) {
    const queue = [[startX, startY]];
    const seen = new Uint8Array(w * h);

    while (queue.length > 0) {
      const [x, y] = queue.pop();
      const idx = y * w + x;
      if (seen[idx]) continue;
      seen[idx] = 1;

      const p = idx * 4;
      if (matchColor(p)) {
        data[p + 3] = 0;
        if (x > 0) queue.push([x - 1, y]);
        if (x < w - 1) queue.push([x + 1, y]);
        if (y > 0) queue.push([x, y - 1]);
        if (y < h - 1) queue.push([x, y + 1]);
      }
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      if (matchColor(i)) data[i + 3] = 0;
    }
  }

  mainCtx.putImageData(imgData, 0, 0);
  commitWorkspaceToFrame();
  saveHistoryState();
  showToast('Color eliminado a transparente', 'success');
}

function autoDetectAndRemoveCorners(allFrames = false) {
  const corners = [
    [0, 0],
    [state.canvasWidth - 1, 0],
    [0, state.canvasHeight - 1],
    [state.canvasWidth - 1, state.canvasHeight - 1]
  ];
  corners.forEach(([x, y]) => removeColorAt(x, y));
}

function removeBackground(frameIndex) {
  if (!state.frames[frameIndex]) return;
  const frameCanvas = state.frames[frameIndex].canvas;
  const ctx = frameCanvas.getContext('2d');
  const w = frameCanvas.width;
  const h = frameCanvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const tr = data[0], tg = data[1], tb = data[2];
  const tol = parseInt(document.getElementById('bgTolerance').value, 10) / 100 * 441.67;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - tr;
    const dg = data[i + 1] - tg;
    const db = data[i + 2] - tb;
    if (Math.sqrt(dr * dr + dg * dg + db * db) <= tol) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  updateTimelineThumb(frameIndex);
  drawHotspotBox();
  updateAllCursors();
}

function updateCanvasDimensions() {
  const w = state.canvasWidth;
  const h = state.canvasHeight;

  [mainCanvas, onionCanvas, overlayCanvas].forEach(c => {
    c.width = w;
    c.height = h;
    c.style.width = `${w * state.zoom}px`;
    c.style.height = `${h * state.zoom}px`;
  });

  canvasContainer.style.width = `${w * state.zoom}px`;
  canvasContainer.style.height = `${h * state.zoom}px`;

  zoomLevelLabel.textContent = `${state.zoom}x`;
  drawOverlay();
  drawHotspotBox();
}

function loadCurrentFrameToWorkspace() {
  if (!state.frames[state.currentFrameIndex]) return;
  const frame = state.frames[state.currentFrameIndex].canvas;
  mainCtx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
  mainCtx.drawImage(frame, 0, 0);

  if (state.showOnionSkin && state.currentFrameIndex > 0) {
    const prevFrame = state.frames[state.currentFrameIndex - 1].canvas;
    onionCtx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
    onionCtx.drawImage(prevFrame, 0, 0);
    onionCanvas.style.display = 'block';
  } else {
    onionCanvas.style.display = 'none';
  }

  state.history = [];
  state.redoStack = [];
  saveHistoryState();
  drawOverlay();
  drawHotspotBox();
}

function commitWorkspaceToFrame() {
  if (!state.frames[state.currentFrameIndex]) return;
  const frame = state.frames[state.currentFrameIndex].canvas;
  const fCtx = frame.getContext('2d');
  fCtx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);
  fCtx.drawImage(mainCanvas, 0, 0);
  updateTimelineThumb(state.currentFrameIndex);
  drawHotspotBox();
  updateAllCursors();
}

function saveHistoryState() {
  const imgData = mainCtx.getImageData(0, 0, state.canvasWidth, state.canvasHeight);
  state.history.push(imgData);
  if (state.history.length > 30) state.history.shift();
  state.redoStack = [];
}

function undo() {
  if (state.history.length > 1) {
    const current = state.history.pop();
    state.redoStack.push(current);
    const prev = state.history[state.history.length - 1];
    mainCtx.putImageData(prev, 0, 0);
    commitWorkspaceToFrame();
    drawOverlay();
  }
}

function redo() {
  if (state.redoStack.length > 0) {
    const next = state.redoStack.pop();
    state.history.push(next);
    mainCtx.putImageData(next, 0, 0);
    commitWorkspaceToFrame();
    drawOverlay();
  }
}

function drawOverlay() {
  overlayCtx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

  if (state.showGrid && state.zoom >= 6) {
    overlayCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    overlayCtx.lineWidth = 0.08;
    for (let x = 0; x <= state.canvasWidth; x++) {
      overlayCtx.beginPath();
      overlayCtx.moveTo(x, 0);
      overlayCtx.lineTo(x, state.canvasHeight);
      overlayCtx.stroke();
    }
    for (let y = 0; y <= state.canvasHeight; y++) {
      overlayCtx.beginPath();
      overlayCtx.moveTo(0, y);
      overlayCtx.lineTo(state.canvasWidth, y);
      overlayCtx.stroke();
    }
  }

  const hx = state.hotspot.x;
  const hy = state.hotspot.y;

  overlayCtx.fillStyle = 'rgba(239, 68, 68, 0.35)';
  overlayCtx.fillRect(hx, hy, 1, 1);

  overlayCtx.strokeStyle = '#ef4444';
  overlayCtx.lineWidth = 0.25;
  overlayCtx.beginPath();
  overlayCtx.arc(hx + 0.5, hy + 0.5, 2.5, 0, Math.PI * 2);
  overlayCtx.stroke();

  overlayCtx.beginPath();
  overlayCtx.moveTo(hx + 0.5 - 3.5, hy + 0.5);
  overlayCtx.lineTo(hx + 0.5 + 3.5, hy + 0.5);
  overlayCtx.moveTo(hx + 0.5, hy + 0.5 - 3.5);
  overlayCtx.lineTo(hx + 0.5, hy + 0.5 + 3.5);
  overlayCtx.stroke();
}

// -----------------------------------------------------------------------------
// DEDICADO: CUADRO SELECTOR DE HOTSPOT
// -----------------------------------------------------------------------------

function setupHotspotBoxEvents() {
  if (!hotspotCanvas) return;
  let isDraggingHotspot = false;

  function setHotspotFromCanvasEvent(e) {
    const rect = hotspotCanvas.getBoundingClientRect();
    const factorX = hotspotCanvas.width / rect.width;
    const factorY = hotspotCanvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * factorX;
    const clickY = (e.clientY - rect.top) * factorY;

    const f = state.frames[state.currentFrameIndex]?.canvas;
    if (!f) return;

    const canvasW = hotspotCanvas.width;
    const canvasH = hotspotCanvas.height;
    const scale = Math.min((canvasW - 24) / f.width, (canvasH - 24) / f.height);
    const dw = f.width * scale;
    const dh = f.height * scale;
    const dx = (canvasW - dw) / 2;
    const dy = (canvasH - dh) / 2;

    const spriteX = Math.floor((clickX - dx) / scale);
    const spriteY = Math.floor((clickY - dy) / scale);

    const hx = Math.max(0, Math.min(f.width - 1, spriteX));
    const hy = Math.max(0, Math.min(f.height - 1, spriteY));

    state.hotspot = { x: hx, y: hy };
    updateHotspotDisplay();
  }

  hotspotCanvas.addEventListener('mousedown', (e) => {
    isDraggingHotspot = true;
    setHotspotFromCanvasEvent(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingHotspot) setHotspotFromCanvasEvent(e);
  });

  window.addEventListener('mouseup', () => {
    isDraggingHotspot = false;
  });
}

function drawHotspotBox() {
  if (!hotspotCanvas || !state.frames[state.currentFrameIndex]) return;
  const f = state.frames[state.currentFrameIndex].canvas;

  const canvasW = hotspotCanvas.width;
  const canvasH = hotspotCanvas.height;

  hotspotCtx.clearRect(0, 0, canvasW, canvasH);
  hotspotCtx.imageSmoothingEnabled = false;

  const scale = Math.min((canvasW - 24) / f.width, (canvasH - 24) / f.height);
  const dw = f.width * scale;
  const dh = f.height * scale;
  const dx = Math.round((canvasW - dw) / 2);
  const dy = Math.round((canvasH - dh) / 2);

  hotspotCtx.drawImage(f, dx, dy, dw, dh);

  if (scale >= 5) {
    hotspotCtx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    hotspotCtx.lineWidth = 0.5;
    for (let x = 0; x <= f.width; x++) {
      hotspotCtx.beginPath();
      hotspotCtx.moveTo(dx + x * scale, dy);
      hotspotCtx.lineTo(dx + x * scale, dy + dh);
      hotspotCtx.stroke();
    }
    for (let y = 0; y <= f.height; y++) {
      hotspotCtx.beginPath();
      hotspotCtx.moveTo(dx, dy + y * scale);
      hotspotCtx.lineTo(dx + dw, dy + y * scale);
      hotspotCtx.stroke();
    }
  }

  const hx = state.hotspot.x;
  const hy = state.hotspot.y;
  const px = dx + hx * scale;
  const py = dy + hy * scale;
  const cx = px + scale / 2;
  const cy = py + scale / 2;

  hotspotCtx.fillStyle = 'rgba(239, 68, 68, 0.45)';
  hotspotCtx.fillRect(px, py, scale, scale);

  hotspotCtx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
  hotspotCtx.lineWidth = 1;
  hotspotCtx.setLineDash([4, 3]);

  hotspotCtx.beginPath();
  hotspotCtx.moveTo(0, cy);
  hotspotCtx.lineTo(canvasW, cy);
  hotspotCtx.stroke();

  hotspotCtx.beginPath();
  hotspotCtx.moveTo(cx, 0);
  hotspotCtx.lineTo(cx, canvasH);
  hotspotCtx.stroke();
  hotspotCtx.setLineDash([]);

  hotspotCtx.strokeStyle = '#ffffff';
  hotspotCtx.lineWidth = 1.5;
  hotspotCtx.beginPath();
  hotspotCtx.arc(cx, cy, 6, 0, Math.PI * 2);
  hotspotCtx.stroke();

  hotspotCtx.fillStyle = '#ef4444';
  hotspotCtx.beginPath();
  hotspotCtx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  hotspotCtx.fill();

  if (hotspotSideCoord) {
    hotspotSideCoord.textContent = `X: ${hx}, Y: ${hy}`;
  }
}

function setHotspotPreset(preset) {
  const w = state.canvasWidth;
  const h = state.canvasHeight;
  if (preset === 'top-left') state.hotspot = { x: 0, y: 0 };
  else if (preset === 'center') state.hotspot = { x: Math.floor(w / 2), y: Math.floor(h / 2) };
  else if (preset === 'top-right') state.hotspot = { x: w - 1, y: 0 };
  else if (preset === 'bottom-right') state.hotspot = { x: w - 1, y: h - 1 };
  updateHotspotDisplay();
}

function updateHotspotDisplay() {
  hotspotCoord.textContent = `X: ${state.hotspot.x}, Y: ${state.hotspot.y}`;
  if (hotspotSideCoord) hotspotSideCoord.textContent = `X: ${state.hotspot.x}, Y: ${state.hotspot.y}`;
  drawOverlay();
  drawHotspotBox();
  updateAllCursors();
}

// -----------------------------------------------------------------------------
// LÍNEA DE TIEMPO (TIMELINE)
// -----------------------------------------------------------------------------

function updateTimeline() {
  timelineStrip.innerHTML = '';
  frameCounter.textContent = `${state.currentFrameIndex + 1} / ${state.frames.length}`;

  state.frames.forEach((f, idx) => {
    const item = document.createElement('div');
    item.className = `timeline-frame ${idx === state.currentFrameIndex ? 'active' : ''}`;

    const thumb = document.createElement('canvas');
    thumb.width = state.canvasWidth;
    thumb.height = state.canvasHeight;
    thumb.className = 'frame-thumb';
    const tCtx = thumb.getContext('2d');
    tCtx.drawImage(f.canvas, 0, 0);

    const indexBadge = document.createElement('span');
    indexBadge.className = 'frame-index';
    indexBadge.textContent = `#${idx + 1}`;

    item.appendChild(thumb);
    item.appendChild(indexBadge);

    item.addEventListener('click', () => selectFrame(idx));

    timelineStrip.appendChild(item);
  });

  renderProjectTabs();
}

function updateTimelineThumb(idx) {
  const items = timelineStrip.children;
  if (items[idx]) {
    const thumb = items[idx].querySelector('canvas');
    if (thumb && state.frames[idx]) {
      const tCtx = thumb.getContext('2d');
      tCtx.clearRect(0, 0, thumb.width, thumb.height);
      tCtx.drawImage(state.frames[idx].canvas, 0, 0);
    }
  }
}

function selectFrame(idx) {
  state.currentFrameIndex = idx;
  document.querySelectorAll('.timeline-frame').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  frameCounter.textContent = `${idx + 1} / ${state.frames.length}`;
  loadCurrentFrameToWorkspace();
}

function addNewFrame() {
  const newC = createFrameCanvas(state.canvasWidth, state.canvasHeight);
  state.frames.splice(state.currentFrameIndex + 1, 0, { canvas: newC, delay: 80 });
  selectFrame(state.currentFrameIndex + 1);
  updateTimeline();
  commitWorkspaceToActiveCursor();
}

function duplicateFrame() {
  const curr = state.frames[state.currentFrameIndex];
  const newC = createFrameCanvas(state.canvasWidth, state.canvasHeight);
  newC.getContext('2d').drawImage(curr.canvas, 0, 0);
  state.frames.splice(state.currentFrameIndex + 1, 0, { canvas: newC, delay: curr.delay });
  selectFrame(state.currentFrameIndex + 1);
  updateTimeline();
  commitWorkspaceToActiveCursor();
}

function deleteFrame() {
  if (state.frames.length <= 1) {
    showToast('Debe haber al menos 1 fotograma', 'error');
    return;
  }
  state.frames.splice(state.currentFrameIndex, 1);
  state.currentFrameIndex = Math.max(0, state.currentFrameIndex - 1);
  loadCurrentFrameToWorkspace();
  updateTimeline();
  commitWorkspaceToActiveCursor();
}

function moveFrame(dir) {
  const cur = state.currentFrameIndex;
  const target = cur + dir;
  if (target < 0 || target >= state.frames.length) return;
  const temp = state.frames[cur];
  state.frames[cur] = state.frames[target];
  state.frames[target] = temp;
  selectFrame(target);
  updateTimeline();
  commitWorkspaceToActiveCursor();
}

// -----------------------------------------------------------------------------
// BUCLE DE VISTA PREVIA ANIMADA
// -----------------------------------------------------------------------------

let previewAnimIndex = 0;
let lastFrameTime = 0;

function startPreviewLoop() {
  function loop(now) {
    const delay = state.frames[previewAnimIndex]?.delay || Math.round(1000 / state.fps);

    if (state.isPlaying && state.frames.length > 1) {
      if (now - lastFrameTime >= delay) {
        lastFrameTime = now;
        previewAnimIndex = (previewAnimIndex + 1) % state.frames.length;
        renderPreviewFrame(previewAnimIndex);
      }
    } else {
      renderPreviewFrame(state.currentFrameIndex);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function renderPreviewFrame(idx) {
  if (!state.frames[idx]) return;
  const f = state.frames[idx].canvas;

  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.imageSmoothingEnabled = false;

  const scale = Math.min(previewCanvas.width / f.width, previewCanvas.height / f.height);
  const dw = f.width * scale;
  const dh = f.height * scale;
  const dx = (previewCanvas.width - dw) / 2;
  const dy = (previewCanvas.height - dh) / 2;

  previewCtx.drawImage(f, dx, dy, dw, dh);
}

// -----------------------------------------------------------------------------
// IMPORTACIÓN DE ARCHIVOS AL CURSOR ACTIVO
// -----------------------------------------------------------------------------

async function handleFileImport(e) {
  const file = e.target.files[0];
  if (file) loadSingleFile(file);
}

async function handleFolderImport(e) {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
  if (files.length > 0) handleFiles(files);
}

async function handleFiles(files) {
  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.name.endsWith('.gif') || f.name.endsWith('.webp'));
  if (imageFiles.length === 0) return;

  if (imageFiles.length === 1 && (imageFiles[0].type === 'image/gif' || imageFiles[0].name.endsWith('.gif'))) {
    loadSingleFile(imageFiles[0]);
    return;
  }

  imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  showToast(`Importando ${imageFiles.length} fotogramas al cursor '${projectState.activeCursorType}'...`, 'info');

  const loadedCanvases = [];
  for (const file of imageFiles) {
    const img = await loadImageFromFile(file);
    const c = createFrameCanvas(img.width, img.height);
    c.getContext('2d').drawImage(img, 0, 0);
    loadedCanvases.push(c);
  }

  if (loadedCanvases.length > 0) {
    state.canvasWidth = loadedCanvases[0].width;
    state.canvasHeight = loadedCanvases[0].height;
    state.frames = loadedCanvases.map(c => ({ canvas: c, delay: 80 }));
    state.currentFrameIndex = 0;
    updateCanvasDimensions();
    loadCurrentFrameToWorkspace();
    updateTimeline();
    commitWorkspaceToActiveCursor();
    renderProjectTabs();
    showToast(`Secuencia importada al cursor '${projectState.activeCursorType}' y guardada en Biblioteca`, 'success');

    // Auto-guardar en la biblioteca
    const framesData = state.frames.map(f => ({
      dataUrl: f.canvas.toDataURL('image/png'),
      delay: f.delay || 80,
      width: state.canvasWidth,
      height: state.canvasHeight
    }));
    fetch('/api/media/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Secuencia_${imageFiles[0].name.split('.')[0] || 'anim'}`,
        frames: framesData,
        type: 'gif'
      })
    }).catch(e => console.warn('Auto-save media failed', e));
  }
}

async function loadSingleFile(file) {
  showToast(`Cargando ${file.name} al cursor '${projectState.activeCursorType}'...`, 'info');
  const reader = new FileReader();

  reader.onload = async (e) => {
    const base64Data = e.target.result;
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_data: base64Data, filename: file.name, name: file.name })
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (data.frames && data.frames.length > 0) {
        const first = data.frames[0];
        const w = first.width;
        const h = first.height;

        state.canvasWidth = w;
        state.canvasHeight = h;
        state.frames = [];

        for (const f of data.frames) {
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = f.dataUrl; });
          const c = createFrameCanvas(w, h);
          c.getContext('2d').drawImage(img, 0, 0);
          state.frames.push({ canvas: c, delay: f.delay || 80 });
        }

        state.currentFrameIndex = 0;
        state.zoom = Math.max(4, Math.min(24, Math.floor(400 / Math.max(w, h))));
        updateCanvasDimensions();
        loadCurrentFrameToWorkspace();
        updateTimeline();

        if (state.frames[0].delay) {
          const calculatedFps = Math.max(1, Math.min(40, Math.round(1000 / state.frames[0].delay)));
          state.fps = calculatedFps;
          document.getElementById('speedSlider').value = calculatedFps;
          fpsLabel.textContent = `${calculatedFps} FPS (${state.frames[0].delay}ms)`;
        }

        commitWorkspaceToActiveCursor();
        renderProjectTabs();
        showToast(`¡${data.frames.length} cuadro(s) asignados al cursor '${projectState.activeCursorType}' y guardados en Biblioteca!`, 'success');

        if (mediaLibraryModal && mediaLibraryModal.style.display === 'flex') {
          await fetchMediaLibrary();
        }
      }
    } catch (err) {
      showToast(`Error al importar: ${err.message}`, 'error');
    }
  };

  reader.readAsDataURL(file);
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// -----------------------------------------------------------------------------
// INSTALAR Y RESTAURAR TEMA EN LINUX
// -----------------------------------------------------------------------------

async function installTheme() {
  commitWorkspaceToActiveCursor();
  const themeName = document.getElementById('themeNameInput')?.value.trim() || projectState.themeName || 'MiCursorCustom';
  projectState.themeName = themeName;

  const cursorKeys = Object.keys(projectState.cursors);
  if (cursorKeys.length === 0) {
    showModalAlert('Proyecto Vacío', 'No hay cursores configurados en el proyecto para instalar.', 'warning');
    return;
  }

  showToast(`Compilando ${cursorKeys.length} cursor(es) con xcursorgen...`, 'info');

  const payloadCursors = {};
  for (const [ctype, cdata] of Object.entries(projectState.cursors)) {
    payloadCursors[ctype] = {
      name: cdata.name,
      frames: cdata.frames.map(f => ({
        dataUrl: f.canvas.toDataURL('image/png'),
        delay: f.delay || Math.round(1000 / (cdata.fps || 12))
      })),
      hotspot: cdata.hotspot,
      size: state.cursorSize
    };
  }

  const payload = {
    theme_name: themeName,
    base_theme: projectState.baseTheme || 'BreezeX-Dark',
    size: state.cursorSize,
    activeCursorType: projectState.activeCursorType,
    cursors: payloadCursors
  };

  try {
    const res = await fetch('/api/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentThemeLabel.textContent = data.theme_name;
    const statusMsg = document.getElementById('installStatusMsg');
    if (statusMsg) {
      statusMsg.textContent = `✓ Tema '${data.theme_name}' compilado e instalado con éxito en Cinnamon`;
      statusMsg.className = 'status-msg success';
      setTimeout(() => { statusMsg.textContent = ''; }, 4000);
    }

    showModalAlert(
      '¡Instalación Exitosa!',
      `El tema "${data.theme_name}" con ${data.compiled_types?.length || cursorKeys.length} tipos de cursor ha sido compilado e instalado directamente en tu entorno Linux Cinnamon.`,
      'success'
    );
  } catch (err) {
    showModalAlert('Fallo de Instalación', err.message, 'danger');
  }
}

async function restoreTheme() {
  const ok = await showModalConfirm(
    'Restaurar Tema del Sistema',
    '¿Deseas restaurar la configuración de cursores original de Cinnamon / Linux (BreezeX-Dark)?',
    { icon: 'warning', confirmText: 'Sí, restaurar', danger: true }
  );
  if (!ok) return;

  try {
    const res = await fetch('/api/restore', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      currentThemeLabel.textContent = 'BreezeX-Dark';
      showModalAlert('Tema Restaurado', 'El cursor del sistema ha sido restaurado exitosamente al tema predeterminado.', 'success');
    }
  } catch (err) {
    showModalAlert('Error al Restaurar', err.message, 'danger');
  }
}

// -----------------------------------------------------------------------------
// SIMULADOR MULTICURSORES & INDICADOR DE IMPACTO
// -----------------------------------------------------------------------------

function setupSimulatorEvents() {
  const openModalBtns = [
    document.getElementById('btnOpenSimulatorTop'),
    document.getElementById('btnOpenSimulatorSide')
  ];

  openModalBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (simulatorModal) simulatorModal.style.display = 'flex';
        updateAllCursors();
      });
    }
  });

  const closeBtn = document.getElementById('btnCloseSimulator');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (simulatorModal) simulatorModal.style.display = 'none';
    });
  }

  if (simulatorModal) {
    simulatorModal.addEventListener('click', (e) => {
      if (e.target === simulatorModal) simulatorModal.style.display = 'none';
    });
  }

  const interactiveAreas = [
    testSandbox,
    ...document.querySelectorAll('.sim-interactive-area')
  ];

  interactiveAreas.forEach(area => {
    if (!area) return;

    const laserDot = document.createElement('div');
    laserDot.className = 'laser-aim-dot';
    laserDot.style.display = 'none';
    area.appendChild(laserDot);

    area.addEventListener('mousemove', (e) => {
      if (toggleLaserAim?.checked) {
        const rect = area.getBoundingClientRect();
        laserDot.style.left = `${e.clientX - rect.left}px`;
        laserDot.style.top = `${e.clientY - rect.top}px`;
        laserDot.style.display = 'block';
      } else {
        laserDot.style.display = 'none';
      }
    });

    area.addEventListener('mouseleave', () => {
      laserDot.style.display = 'none';
    });

    area.addEventListener('mousedown', (e) => {
      createClickRipple(area, e);
    });
  });
}

function createClickRipple(container, e) {
  const rect = container.getBoundingClientRect();
  const x = Math.round(e.clientX - rect.left);
  const y = Math.round(e.clientY - rect.top);

  const ripple = document.createElement('div');
  ripple.className = 'click-ripple-indicator';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  const tag = document.createElement('span');
  tag.className = 'click-coord-tag';
  tag.textContent = `🎯 Clic: (${x}, ${y})`;
  ripple.appendChild(tag);

  container.appendChild(ripple);
  setTimeout(() => ripple.remove(), 750);

  const infoText = container.querySelector('.sim-click-info') || container.querySelector('#sandboxClickFeedback');
  if (infoText) {
    infoText.textContent = `Impacto registrado: X: ${x}px, Y: ${y}px`;
    infoText.style.color = '#34d399';
    setTimeout(() => { infoText.style.color = ''; }, 1000);
  }
}

// -----------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// -----------------------------------------------------------------------------

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

