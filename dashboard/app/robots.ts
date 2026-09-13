import type { MetadataRoute } from "next";

// El panel es privado: ningun rastreador entra. Se refuerza con la cabecera
// X-Robots-Tag de next.config.mjs y con `metadata.robots` en el layout.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
