import "server-only";

export type DownloadPlatform = "windows" | "mac-arm64" | "mac-x64";

export interface DownloadAsset {
  platform: DownloadPlatform;
  name: string;
  url: string;
  size: number;
}

export interface Release {
  version: string;
  publishedAt: string;
  url: string;
  assets: DownloadAsset[];
}

const REPO = process.env.VELA_GITHUB_REPO ?? "WillishakespeareSKR13/Vela";

function PlatformOf(name: string): DownloadPlatform | null {
  if (/\.exe$/i.test(name)) return "windows";
  if (/mac-arm64\.dmg$/i.test(name)) return "mac-arm64";
  if (/mac-x64\.dmg$/i.test(name)) return "mac-x64";
  return null;
}

/**
 * El ultimo Release del repo: lo publica el workflow `release-agent` con los
 * instaladores como assets. Se cachea cinco minutos. Con `GITHUB_TOKEN` en el
 * entorno sirve tambien para un repo privado y sube el limite de peticiones.
 */
export async function GetLatestRelease(): Promise<Release | null> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      tag_name: string;
      published_at: string;
      html_url: string;
      assets: { name: string; browser_download_url: string; size: number }[];
    };
    const assets: DownloadAsset[] = [];
    for (const a of data.assets ?? []) {
      const platform = PlatformOf(a.name);
      if (platform) assets.push({ platform, name: a.name, url: a.browser_download_url, size: a.size });
    }
    return { version: data.tag_name, publishedAt: data.published_at, url: data.html_url, assets };
  } catch {
    return null;
  }
}

export function FormatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(0)} MB` : `${Math.round(bytes / 1024)} kB`;
}
