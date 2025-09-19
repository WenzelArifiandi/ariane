import { defineCollection, z } from "astro:content";

const all = defineCollection({
  type: "content", // Ensure @astrojs/content is installed
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = {
  all,
};
