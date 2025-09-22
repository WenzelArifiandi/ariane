// Central helper to decide Storyblok content version
// draft in dev/test or when _storyblok param is present; published otherwise
export function getStoryblokVersion(params?: {
  mode?: string;
  hasPreview?: boolean;
}): "draft" | "published" {
  // Type-safe access to import.meta.env.MODE
  let mode = params?.mode;
  if (mode === undefined && typeof import.meta !== "undefined" && import.meta.env && typeof import.meta.env.MODE === "string") {
    mode = import.meta.env.MODE;
  }
  const hasPreview = params?.hasPreview === true;
  const isDevOrTest = mode === "development" || mode === "test";
  return isDevOrTest || hasPreview ? "draft" : "published";
}
