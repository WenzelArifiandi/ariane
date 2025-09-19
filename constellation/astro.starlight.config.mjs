import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Ariane Docs",
      description:
        "Enterprise infrastructure, authentication, and migration docs for Ariane.",
      logo: {
        src: "/logo.svg",
        alt: "Ariane Logo",
      },
      sidebar: [
        {
          label: "Docs",
          autogenerate: { collection: "all" },
        },
      ],
      github: {
        repo: "WenzelArifiandi/ariane",
        editLinks: true,
      },
      search: {
        provider: "pagefind",
      },
      i18n: {
        defaultLocale: "en",
        locales: ["en"],
      },
      theme: {
        default: "dark",
        colors: {
          primary: "#7c3aed",
          accent: "#f472b6",
        },
      },
    }),
  ],
});
