#!/usr/bin/env bash
# Cursor Studio Launcher
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PORT=52140
URL="http://127.0.0.1:${PORT}"

# Comprobar si ya está corriendo el servidor y tiene las definiciones actuales
STATUS="$(curl -s "${URL}/api/status" 2>/dev/null || true)"
if [ -n "${STATUS}" ] && ! printf '%s' "${STATUS}" | grep -q 'zoom-in'; then
    OLD_PID="$(pgrep -f "python3 ${DIR}/app.py" || true)"
    [ -n "${OLD_PID}" ] && kill ${OLD_PID} 2>/dev/null || true
    STATUS=""
fi

if [ -z "${STATUS}" ]; then
    echo "Iniciando servidor de Cursor Studio..."
    nohup python3 "${DIR}/app.py" > /tmp/cursor_studio.log 2>&1 &
    
    # Esperar hasta que responda
    for i in {1..30}; do
        if curl -s "${URL}/api/status" > /dev/null 2>&1; then
            break
        fi
        sleep 0.1
    done
fi

echo "Cursor Studio listo en ${URL}"

# Abrir en modo aplicación nativa si Chrome está presente
if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="${URL}" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
    chromium --app="${URL}" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${URL}" >/dev/null 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
    firefox "${URL}" >/dev/null 2>&1 &
fi
