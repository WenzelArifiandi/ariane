import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  all: defineCollection({
    loader: docsLoader(),
    schema: docsSchema(),
    directory: "all",
  }),
};
