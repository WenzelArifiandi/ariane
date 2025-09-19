import { defineConfig } from "astro/config";
import starlight from "@astro-starlight/starlight/config";

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
        { label: "Getting Started", link: "/docs/getting-started" },
        { label: "Infrastructure", link: "/docs/infrastructure" },
        { label: "Authentication", link: "/docs/authentication" },
        { label: "Migration", link: "/docs/migration" },
        { label: "Reference", link: "/docs/reference" },
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
