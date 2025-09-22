import { defineCollection } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

const docs = defineCollection({
  type: "content",
  schema: docsSchema(), // gives title/description/draft defaults
});

export const collections = { docs };