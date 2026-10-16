const MAX_OUTPUT = 5_000_000;

/** Convert newly selected images only; saved attachments and PDFs stay intact. */
export async function prepareLayoutImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("Invalid image");
    let scale = Math.min(
      1,
      6000 / Math.max(image.naturalWidth, image.naturalHeight),
      Math.sqrt(24_000_000 / (image.naturalWidth * image.naturalHeight)),
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.95, 0.92, 0.88]) {
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(new Error("Image conversion failed")),
            "image/jpeg",
            quality,
          ),
        );
        if (blob.type !== "image/jpeg") throw new Error("JPEG unavailable");
        if (blob.size <= MAX_OUTPUT) {
          // Preserve small originals when JPEG would add bytes or lose detail
          // without a storage benefit (common for diagrams and optimized JPEGs).
          if (file.size <= blob.size && file.size <= MAX_OUTPUT) return file;
          return new File([blob], name, {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
        }
      }
      scale *= 0.85;
    }
    throw new Error("Image exceeds output limit");
  } finally {
    URL.revokeObjectURL(url);
  }
}
