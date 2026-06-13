import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ghana Youth Jobs",
    short_name: "GYJ Jobs",
    description:
      "Verified jobs, apprenticeships, internships and skills training for young people in Ghana. Free for job seekers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1410",
    theme_color: "#0b1410",
    orientation: "portrait",
    categories: ["business", "education", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
