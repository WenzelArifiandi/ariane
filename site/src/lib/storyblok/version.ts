// Central helper to decide Storyblok content version
// draft in dev/test or when _storyblok param is present; published otherwise
export function getStoryblokVersion(params?: {
  mode?: string;
  hasPreview?: boolean;
}): "draft" | "published" {
  const mode = params?.mode ?? (import.meta as any)?.env?.MODE;
  const hasPreview = params?.hasPreview === true;
  const isDevOrTest = mode === "development" || mode === "test";
  return isDevOrTest || hasPreview ? "draft" : "published";
}
