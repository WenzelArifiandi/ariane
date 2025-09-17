import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { QueryParams } from "@sanity/client";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const apiVersion = import.meta.env.PUBLIC_SANITY_API_VERSION ?? "2023-10-01";
const enabled = Boolean(projectId && dataset);

export const client = enabled
  ? createClient({
      projectId: projectId!,
      dataset: dataset!,
      apiVersion,
      useCdn: true,
      perspective: "published",
    })
  : // Create a benign client placeholder; calls will be guarded below
    ({} as unknown as ReturnType<typeof createClient>);

const realBuilder = enabled ? imageUrlBuilder(client) : null;

// Type-safe image source
export type ImageSource = SanityImageSource;

type UrlBuilder = {
  width: (n: number) => UrlBuilder;
  height: (n: number) => UrlBuilder;
  fit: (s: string) => UrlBuilder;
  auto: (s: string) => UrlBuilder;
  url: () => string;
};

export const urlFor = (src: ImageSource): UrlBuilder => {
  if (realBuilder) return realBuilder.image(src) as UrlBuilder;
  // Use a self-referential dummy builder
  const dummy: UrlBuilder = {
    width: () => dummy,
    height: () => dummy,
    fit: () => dummy,
    auto: () => dummy,
    url: () => "",
  };
  return dummy;
};

// Helper for typed GROQ fetches; returns empty fallback when disabled
export async function fetchSanity<T>(
  query: string,
  params: QueryParams = {},
): Promise<T> {
  if (!enabled) return [] as unknown as T;
  // Remove type argument from untyped call, cast result only
  return (await (client as any).fetch(query, params)) as T;
}
