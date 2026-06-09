/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const targetUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"

    return [
      {
        source: "/inject",
        destination: `${targetUrl}/inject/`,
      },
      {
        source: "/play/:path*",
        destination: `${targetUrl}/play/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
