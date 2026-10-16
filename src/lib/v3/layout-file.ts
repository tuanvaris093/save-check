import type { LayoutFileInfo } from "@/types";
import { layoutDownloadUrlV3 } from "@/lib/api";
export function storedLayoutFile(
  fileId: string | null | undefined,
  metadata?: {
    file_name?: string;
    mime_type?: string;
    byte_size?: number;
    created_at?: string;
  } | null,
): LayoutFileInfo | null {
  return fileId
    ? {
        fileName: metadata?.file_name || "ผังพื้นที่ห้อง",
        fileType: metadata?.mime_type || "application/octet-stream",
        fileSize: metadata?.byte_size || 0,
        fileData: layoutDownloadUrlV3(fileId),
        uploadedAt: metadata?.created_at || "",
      }
    : null;
}
