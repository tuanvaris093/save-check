import type { Env } from "../types";
import { ApiError, canonical, digest, fail, readLimited } from "../lib/errors";
import { AssessmentRepository } from "../repositories/assessment-repository";
import { D1FileStorage } from "./d1-file-storage";
import { Buffer } from "node:buffer";
interface FileRow {
  id: string;
  object_key: string;
  file_name: string;
  mime_type: string;
  byte_size: number;
  checksum_sha256: string;
  state: "staged" | "committed" | "orphan";
  created_at: string;
  upload_request_hash: string | null;
}
export class FileService {
  readonly repo: AssessmentRepository;
  constructor(readonly env: Env) {
    this.repo = new AssessmentRepository(env.DB);
  }
  bucket() {
    return new D1FileStorage(this.env.DB);
  }
  async row(id: string) {
    return (
      (await this.repo
        .sql("SELECT * FROM assessment_files WHERE id=?", id)
        .first<FileRow>()) ?? fail(404, "FILE_NOT_FOUND", "ไม่พบไฟล์")
    );
  }
  async usable(id: string) {
    const file = await this.row(id);
    if (file.state === "orphan")
      fail(409, "FILE_UNAVAILABLE", "ไฟล์นี้ถูกยกเลิกแล้ว");
    const object = await this.bucket().head(file.object_key);
    if (
      !object ||
      object.size !== file.byte_size ||
      object.customMetadata?.sha256 !== file.checksum_sha256
    )
      fail(409, "FILE_UNAVAILABLE", "ไฟล์ยังอัปโหลดไม่สมบูรณ์");
    return file;
  }
  receipt(file: FileRow) {
    return {
      file_id: file.id,
      file_name: file.file_name,
      mime_type: file.mime_type,
      byte_size: file.byte_size,
      checksum_sha256: file.checksum_sha256,
      state: file.state,
      created_at: file.created_at,
      download_url: `/api/files/${encodeURIComponent(file.id)}`,
    };
  }
  async upload(request: Request) {
    const bucket = this.bucket();
    const key = request.headers.get("Idempotency-Key")?.trim();
    if (!key || key.length > 128)
      fail(400, "IDEMPOTENCY_REQUIRED", "กรุณาระบุ Idempotency-Key");
    const type =
      request.headers.get("Content-Type")?.split(";")[0].trim() ?? "";
    let name: string;
    try {
      name = decodeURIComponent(
        request.headers.get("X-File-Name") ?? "",
      ).trim();
    } catch {
      return fail(400, "FILE_NAME", "ชื่อไฟล์ไม่ถูกต้อง");
    }
    if (!name || name.length > 255 || /[\r\n\x00]/.test(name))
      fail(400, "FILE_NAME", "กรุณาระบุชื่อไฟล์");
    const bytes = await readLimited(request, 10 * 1024 * 1024);
    if (!bytes.length) fail(400, "EMPTY_FILE", "ไฟล์ว่าง");
    const isPng =
      bytes.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
    const isJpeg =
      bytes.length >= 3 &&
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255;
    const isWebp =
      bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    const isPdf =
      bytes.length >= 5 &&
      new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    if (!(
      (type === "image/png" && isPng) ||
      (type === "image/jpeg" && isJpeg) ||
      (type === "image/webp" && isWebp) ||
      (type === "application/pdf" && isPdf)
    ))
      fail(415, "FILE_TYPE", "ไฟล์ต้องเป็น JPG/PNG/WebP/PDF ที่ตรงชนิดจริง");
    const checksum = await digest(bytes),
      hash = await digest(canonical({ checksum, name, type }));
    let existing = await this.repo
      .sql("SELECT * FROM assessment_files WHERE upload_idempotency_key=?", key)
      .first<FileRow>();
    if (existing && existing.upload_request_hash !== hash)
      fail(409, "IDEMPOTENCY_CONFLICT", "คำขออัปโหลดเดิมมีข้อมูลต่างกัน");
    if (!existing) {
      const id = crypto.randomUUID(),
        now = new Date().toISOString();
      try {
        await this.repo
          .sql(
            "INSERT INTO assessment_files(id,object_key,file_name,mime_type,byte_size,checksum_sha256,state,created_at,upload_idempotency_key,upload_request_hash) VALUES(?,?,?,?,?,?,'staged',?,?,?)",
            id,
            `layouts/${id}`,
            name,
            type,
            bytes.length,
            checksum,
            now,
            key,
            hash,
          )
          .run();
      } catch (error) {
        existing = await this.repo
          .sql(
            "SELECT * FROM assessment_files WHERE upload_idempotency_key=?",
            key,
          )
          .first<FileRow>();
        if (!existing) throw error;
        if (existing.upload_request_hash !== hash)
          fail(409, "IDEMPOTENCY_CONFLICT", "คำขออัปโหลดเดิมมีข้อมูลต่างกัน");
      }
      existing = existing ?? (await this.row(id));
    }
    if (existing.state === "orphan")
      fail(409, "FILE_UNAVAILABLE", "ไฟล์นี้ถูกยกเลิกแล้ว");
    const head = await bucket.head(existing.object_key);
    if (!head) {
      if (existing.state === "committed")
        fail(503, "FILE_STORAGE_ERROR", "ไม่พบไฟล์ที่ถูกบันทึกแล้ว");
      await bucket.put(existing.object_key, bytes, {
        onlyIf: { etagDoesNotMatch: "*" },
        httpMetadata: { contentType: type },
        customMetadata: { sha256: checksum },
      });
    }
    await this.usable(existing.id);
    return this.receipt(existing);
  }
  async download(id: string) {
    const file = await this.row(id);
    if (file.state === "orphan") fail(404, "FILE_NOT_FOUND", "ไม่พบไฟล์");
    const object = await this.bucket().get(file.object_key);
    if (!object) fail(503, "FILE_STORAGE_ERROR", "ไม่พบไฟล์ในระบบเก็บไฟล์");
    return new Response(object.body, {
      headers: {
        "Content-Type": file.mime_type,
        "Content-Length": String(object.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
        "X-Content-Type-Options": "nosniff",
        ETag: object.httpEtag,
        "Cache-Control": "private, max-age=0",
      },
    });
  }
  async downloadLegacy(revisionId: string) {
    const raw = await this.repo
      .sql(
        "SELECT file_name,file_data,has_layout FROM legacy_layout_snapshots WHERE revision_id=?",
        revisionId,
      )
      .first<{ file_name: string; file_data: string; has_layout: number }>();
    if (!raw?.has_layout || !raw.file_data)
      fail(404, "FILE_NOT_FOUND", "ไม่พบผังเดิม");
    const match = raw.file_data.match(/^data:([^;]+);base64,(.*)$/s);
    let bytes: Uint8Array;
    try {
      bytes = Buffer.from(atob(match?.[2] ?? raw.file_data), "latin1");
    } catch {
      fail(409, "LEGACY_FILE_INVALID", "ไฟล์ผังเดิมไม่สมบูรณ์");
    }
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(raw.file_name || "legacy-layout")}`,
        "Content-Length": String(bytes.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=0",
      },
    });
  }
  commit(id: string, now: string) {
    return this.repo.sql(
      "UPDATE assessment_files SET state='committed',committed_at=? WHERE id=? AND state='staged'",
      now,
      id,
    );
  }
  async cleanup() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const candidates = await this.repo
      .sql(
        "SELECT id FROM assessment_files WHERE state IN ('staged','orphan') AND created_at<? ORDER BY created_at LIMIT 50",
        cutoff,
      )
      .all<{ id: string }>();
    let cleaned = 0;
    for (const { id } of candidates.results) {
      await this.repo
        .sql(
          "UPDATE assessment_files SET state='orphan' WHERE id=? AND state='staged' AND NOT EXISTS(SELECT 1 FROM environment_revisions WHERE layout_file_id=?) AND NOT EXISTS(SELECT 1 FROM legacy_file_mappings WHERE file_id=?)",
          id,
          id,
          id,
        )
        .run();
      const file = await this.row(id);
      if (file.state !== "orphan") continue;
      const refs = await this.repo
        .sql(
          "SELECT COUNT(*) n FROM environment_revisions WHERE layout_file_id=?",
          id,
        )
        .first<{ n: number }>();
      if (refs?.n) continue;
      await this.bucket().delete(file.object_key);
      cleaned++;
    }
    return { cleaned };
  }
  async importLegacy(revisionId: string) {
    const mapped = await this.repo
      .sql(
        "SELECT file_id FROM legacy_file_mappings WHERE revision_id=?",
        revisionId,
      )
      .first<{ file_id: string }>();
    if (mapped) return mapped.file_id;
    const raw = await this.repo
      .sql(
        "SELECT * FROM legacy_layout_snapshots WHERE revision_id=?",
        revisionId,
      )
      .first<{
        file_name: string;
        file_type: string;
        file_data: string;
        file_size: number;
      }>();
    if (!raw?.file_data)
      fail(
        409,
        "LEGACY_FILE_REQUIRED",
        "ข้อมูลเดิมไม่มีผังที่นำมาใช้ได้ กรุณาแนบผังในการเติมข้อมูล",
      );
    const match = raw.file_data.match(/^data:([^;]+);base64,(.*)$/s);
    const mime = match?.[1] ?? raw.file_type;
    const content = match?.[2] ?? raw.file_data;
    let bytes: Uint8Array;
    try {
      bytes = Buffer.from(atob(content), "latin1");
    } catch {
      throw new ApiError(
        409,
        "LEGACY_FILE_INVALID",
        "ไฟล์ผังเดิมไม่สมบูรณ์ กรุณาแนบไฟล์ที่ถูกต้อง",
      );
    }
    const request = new Request("https://internal/upload", {
      method: "POST",
      headers: {
        "Content-Type": mime,
        "X-File-Name": encodeURIComponent(raw.file_name || "legacy-layout"),
        "Idempotency-Key": `legacy-layout:${revisionId}`,
      },
      body: bytes as BodyInit,
    });
    const receipt = await this.upload(request);
    return receipt.file_id;
  }
}
