import type { NextConfig } from "next";

// CSP: Next.js com Tailwind requer 'unsafe-inline' para estilos.
// Para scripts, 'unsafe-inline' é inevitável sem nonces (gerados por middleware).
// As proteções efetivas aqui são: object-src, base-uri, form-action e img-src restrito.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.cloudflarepub.com https://pub-*.r2.dev https://nksmark.com.br",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.cloudflarepub.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'nksmark.com.br',
      },
    ],
  },
  // Cabeçalhos de segurança aplicados a todas as respostas.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspHeader },
          // Impede que o site seja embutido em iframes (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Impede o navegador de "adivinhar" o MIME type (MIME sniffing).
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Não vaza a URL completa de origem para sites externos.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desativa APIs sensíveis que o app não usa.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Força HTTPS por 2 anos (HSTS).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};

export default nextConfig;
