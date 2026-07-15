import type { MetadataRoute } from "next";

function baseUrl(): string {
  const b =
    process.env.NEXT_PUBLIC_MARKETING_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3009";
  return b.replace(/\/$/, "");
}

// robots — يسمح بالصفحات العامّة، يمنع الأقسام الخاصّة/التطبيق/الـAPI.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/dashboard", "/brand", "/u/", "/learn/", "/pay/", "/track/"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
