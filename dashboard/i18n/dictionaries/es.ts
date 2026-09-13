export const es = {
  shell: {
    brand: "Vela",
    descriptor: "Supervisión de estaciones",
    skipToContent: "Saltar al contenido",
    navigation: "Navegación principal",
    complementary: "Información complementaria",
    collapse: "Encoger la barra",
    expand: "Desplegar la barra",
    groups: { panel: "Panel" },
    links: {
      equipos: "Equipos",
      equiposShort: "Equipos",
      descargas: "Descargas",
      descargasShort: "Descargas",
    },
    footer: {
      theme: "Tema",
      dark: "Oscuro",
      light: "Claro",
      language: "Idioma",
      languages: { es: "Español", en: "English" },
    },
  },
  status: {
    online: "en línea",
    offline: "sin conexión",
    unauthorized: "token rechazado",
    connecting: "conectando",
    controlled: "control activo",
  },
  quality: {
    label: "Calidad",
    alta: "Alta",
    media: "Media",
    baja: "Baja",
  },
  equipos: {
    title: "Equipos",
    subtitle: "{n} conectados",
    subtitleOne: "1 conectado",
    subtitleNone: "ninguno conectado",
    open: "Abrir {name}",
    negotiating: "negociando vídeo",
    empty: {
      title: "Ningún equipo conectado",
      description:
        "Los equipos aparecen aquí en cuanto su agente se registra en el servidor de señalización.",
    },
    error: {
      title: "Sin conexión con el servidor",
      description:
        "No se pudo abrir el canal de señalización. Comprueba que el servidor está en marcha y que la URL es correcta.",
      action: "Reintentar",
    },
    blocked: {
      title: "El servidor rechazó el token",
      description:
        "El token de este panel no coincide con el del servidor de señalización. Revisa NEXT_PUBLIC_SIGNALING_TOKEN y vuelve a compilar.",
    },
    connecting: {
      title: "Conectando con el servidor",
      description: "Abriendo el canal de señalización.",
    },
  },
  equipo: {
    back: "Todos los equipos",
    take: "Tomar control",
    release: "Soltar control",
    controlHint: "El ratón y el teclado se envían a {name}.",
    controlPressed: "Control remoto activo",
    others: "Otros equipos",
    notFound: {
      title: "Este equipo ya no está conectado",
      description: "Su agente cerró la sesión o perdió la red.",
      action: "Volver a la lista",
    },
  },
  descargas: {
    title: "Descargas",
    subtitle: "Agente {version} · publicado el {date}",
    subtitleNone: "sin versiones publicadas",
    download: "Descargar",
    size: "Tamaño",
    platforms: {
      windows: { title: "Windows", description: "Windows 10 u 11, 64 bits. Instalador que arranca con la sesión." },
      "mac-arm64": { title: "macOS · Apple Silicon", description: "Macs con chip M1 o posterior. Imagen de disco." },
      "mac-x64": { title: "macOS · Intel", description: "Macs con procesador Intel. Imagen de disco." },
    },
    missing: "No hay fichero para esta plataforma en la última versión.",
    macNote:
      "El agente no está firmado con un Developer ID: la primera vez se abre con clic derecho → Abrir. macOS pedirá Grabación de pantalla y Accesibilidad.",
    config: {
      title: "Configuración del agente",
      description:
        "Guarda este fichero como config.json en la carpeta de datos del agente (menú de la bandeja → Abrir carpeta de configuración) o como vela.json junto al ejecutable. Cambia el nombre por el del puesto.",
      copy: "Copiar",
      copied: "Copiado",
    },
    empty: {
      title: "Todavía no hay una versión publicada",
      description:
        "Los instaladores se generan al etiquetar el repositorio (git tag v0.1.0 && git push --tags) y aparecen aquí en cuanto el Release existe.",
      action: "Ver el repositorio",
    },
  },
  stats: {
    fps: "fps",
    kbps: "kbps",
    mbps: "Mbps",
    resolution: "Resolución",
    frameRate: "Cuadros",
    bitrate: "Bitrate",
  },
};

export type Dictionary = typeof es;
