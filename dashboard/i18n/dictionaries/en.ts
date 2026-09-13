import type { Dictionary } from "./es";

// Tipado desde `es`: una clave que falte no compila.
export const en: Dictionary = {
  shell: {
    brand: "Vela",
    descriptor: "Workstation monitoring",
    skipToContent: "Skip to content",
    navigation: "Main navigation",
    complementary: "Complementary information",
    collapse: "Collapse the sidebar",
    expand: "Expand the sidebar",
    groups: { panel: "Panel" },
    links: {
      equipos: "Workstations",
      equiposShort: "Stations",
      descargas: "Downloads",
      descargasShort: "Downloads",
    },
    footer: {
      theme: "Theme",
      dark: "Dark",
      light: "Light",
      language: "Language",
      languages: { es: "Español", en: "English" },
    },
  },
  status: {
    online: "online",
    offline: "offline",
    unauthorized: "token rejected",
    connecting: "connecting",
    controlled: "control active",
  },
  quality: {
    label: "Quality",
    alta: "High",
    media: "Medium",
    baja: "Low",
  },
  equipos: {
    title: "Workstations",
    subtitle: "{n} connected",
    subtitleOne: "1 connected",
    subtitleNone: "none connected",
    open: "Open {name}",
    negotiating: "negotiating video",
    empty: {
      title: "No workstation connected",
      description:
        "Workstations show up here as soon as their agent registers with the signaling server.",
    },
    error: {
      title: "No connection to the server",
      description:
        "The signaling channel could not be opened. Check that the server is running and the URL is right.",
      action: "Retry",
    },
    blocked: {
      title: "The server rejected the token",
      description:
        "This panel's token does not match the signaling server's. Check NEXT_PUBLIC_SIGNALING_TOKEN and rebuild.",
    },
    connecting: {
      title: "Connecting to the server",
      description: "Opening the signaling channel.",
    },
  },
  equipo: {
    back: "All workstations",
    take: "Take control",
    release: "Release control",
    controlHint: "Mouse and keyboard are sent to {name}.",
    controlPressed: "Remote control active",
    others: "Other workstations",
    notFound: {
      title: "This workstation is no longer connected",
      description: "Its agent closed the session or lost the network.",
      action: "Back to the list",
    },
  },
  descargas: {
    title: "Downloads",
    subtitle: "Agent {version} · published {date}",
    subtitleNone: "no published version",
    download: "Download",
    size: "Size",
    platforms: {
      windows: { title: "Windows", description: "Windows 10 or 11, 64-bit. Installer that starts with the session." },
      "mac-arm64": { title: "macOS · Apple Silicon", description: "Macs with an M1 chip or later. Disk image." },
      "mac-x64": { title: "macOS · Intel", description: "Macs with an Intel processor. Disk image." },
    },
    missing: "No file for this platform in the latest version.",
    macNote:
      "The agent is not signed with a Developer ID: the first time, open it with right click → Open. macOS will ask for Screen Recording and Accessibility.",
    config: {
      title: "Agent configuration",
      description:
        "Save this file as config.json in the agent data folder (tray menu → Open configuration folder) or as vela.json next to the executable. Replace the name with the workstation's.",
      copy: "Copy",
      copied: "Copied",
    },
    empty: {
      title: "No version published yet",
      description:
        "Installers are built when the repository is tagged (git tag v0.1.0 && git push --tags) and show up here as soon as the Release exists.",
      action: "Open the repository",
    },
  },
  stats: {
    fps: "fps",
    kbps: "kbps",
    mbps: "Mbps",
    resolution: "Resolution",
    frameRate: "Frames",
    bitrate: "Bitrate",
  },
};
