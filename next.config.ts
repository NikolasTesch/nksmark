import type { NextConfig } from "next";

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
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
  // Cabeçalhos de segurança aplicados a todas as respostas.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
