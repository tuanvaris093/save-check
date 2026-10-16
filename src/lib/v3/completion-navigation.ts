const destinations = new Set([
  "/assessment/environment",
  "/assessment/health-risk",
  "/assessment/satisfaction",
  "/dashboard",
  "/result",
]);

export function completionDestination(value: string | null, fallback: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://safecheck.local");
    if (
      url.origin !== "https://safecheck.local" ||
      !destinations.has(url.pathname)
    )
      return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function completedResultUrl(code: string, destination: string) {
  const params = new URLSearchParams({
    submissionId: code,
    saved: "1",
    returnTo: destination,
  });
  return `/result?${params}`;
}
