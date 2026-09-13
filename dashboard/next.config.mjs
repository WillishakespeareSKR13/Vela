/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Panel privado: la cabecera vale para toda respuesta (HTML, JSON, imagenes),
  // que es mas de lo que robots.txt y <meta robots> cubren.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  experimental: {
    // Las capas CSS ordenan por PRIMERA declaracion. Con el chunking por
    // defecto ("loose") Next servia el CSS de Box (nebula.util) antes que
    // styles.css (la declaracion de orden), y los style props perdian contra
    // los componentes. "strict" conserva el orden de import del layout.
    cssChunking: "strict",
    // Nebula reparte 90+ hojas .vanilla.css; como <link> bloquean el primer
    // pintado (CLAUDE.md de Nebula: «hojas CSS debe quedarse en 0»). Con
    // inlineCss viajan dentro del HTML.
    inlineCss: true,
    // El barrel de nebula-web arrastra el catalogo entero; esto reescribe los
    // imports a ficheros concretos y deja fuera lo que no se usa.
    optimizePackageImports: ["@stellaria/nebula-web", "@stellaria/nebula-icons"],
  },
};

export default nextConfig;
