/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const targetUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000"

    return [
      {
        source: "/api/v1/inject",
        destination: `${targetUrl}/api/v1/inject/`,
      },
      {
        source: "/api/v1/play/:path*",
        destination: `${targetUrl}/api/v1/play/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
