/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      // Existing patterns
      { protocol: "https", hostname: "cdn.sanity.io", port: "" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", port: "" },
      { protocol: "https", hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev", port: "" },
      // UAE scraper sources
      { protocol: "https", hostname: "carabiacars.com", port: "" },
      { protocol: "https", hostname: "www.carabiacars.com", port: "" },
      { protocol: "https", hostname: "img.carswitch.com", port: "" },
      { protocol: "https", hostname: "cdn.carswitch.com", port: "" },
      { protocol: "https", hostname: "d1esl34bhh6pms.cloudfront.net", port: "" },
      { protocol: "https", hostname: "dubizzle-store-app.imgix.net", port: "" },
      { protocol: "https", hostname: "**.dubizzle.com", port: "" },
      { protocol: "https", hostname: "uae.yallamotor.com", port: "" },
      { protocol: "https", hostname: "**.yallamotor.com", port: "" },
      { protocol: "https", hostname: "**.hatla2ee.com", port: "" },
      { protocol: "https", hostname: "**.dubicars.com", port: "" },
      // Lebanon scraper sources
      { protocol: "https", hostname: "**.olx.com.lb", port: "" },
      { protocol: "https", hostname: "**.mena.sector.run", port: "" },
      { protocol: "https", hostname: "**.autotrader.com.lb", port: "" },
      { protocol: "https", hostname: "**.wheelers.me", port: "" },
      // Europe scraper sources
      { protocol: "https", hostname: "**.autoscout24.de", port: "" },
      { protocol: "https", hostname: "**.autoscout24.com", port: "" },
      // Catch-all for any CDN subdomains
      { protocol: "https", hostname: "**.imgix.net", port: "" },
      { protocol: "https", hostname: "**.cloudfront.net", port: "" },
    ]
  }
};

export default nextConfig;
