import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Class Planner",
    short_name: "Planner",
    description: "학원 시간표 관리 + 학생/학부모 공유",
    start_url: "/schedule",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0b",
    theme_color: "#f59e0b",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon1", sizes: "192x192", type: "image/png" },
      { src: "/icon2", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
