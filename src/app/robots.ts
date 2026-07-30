import type { MetadataRoute } from "next";

const siteUrl = process.env.AUTH_URL ?? "https://bench.com.ar";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/verify",
        "/salaries",
        "/benchmark",
        "/companies",
        "/admin",
        "/api",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
