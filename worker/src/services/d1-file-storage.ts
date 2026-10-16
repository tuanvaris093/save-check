import { digest, fail } from "../lib/errors";
import { Buffer } from "node:buffer";

const CHUNK_SIZE = 512 * 1024;
/** Immutable chunks; only a complete file is available for reads or attachment. */
export class D1FileStorage {
  constructor(readonly db: D1Database) {}

  async head(key: string) {
    const row = await this.db
      .prepare(
        `SELECT f.byte_size, f.checksum_sha256, COUNT(c.part) parts,
       COALESCE(SUM(length(c.bytes)),0) stored_size
       FROM assessment_files f LEFT JOIN assessment_file_chunks c ON c.object_key=f.object_key
       WHERE f.object_key=? GROUP BY f.object_key`,
      )
      .bind(key)
      .first<{
        byte_size: number;
        checksum_sha256: string;
        parts: number;
        stored_size: number;
      }>();
    if (!row || row.parts === 0) return null;
    if (
      row.stored_size !== row.byte_size ||
      row.parts !== Math.ceil(row.byte_size / CHUNK_SIZE)
    )
      return null;
    return {
      size: row.byte_size,
      customMetadata: { sha256: row.checksum_sha256 },
    };
  }

  async put(
    key: string,
    bytes: Uint8Array,
    options: {
      customMetadata: { sha256: string };
      httpMetadata: { contentType: string };
      onlyIf: { etagDoesNotMatch: string };
    },
  ) {
    let statements: D1PreparedStatement[] = [];
    for (
      let offset = 0, part = 0;
      offset < bytes.length;
      offset += CHUNK_SIZE, part++
    ) {
      statements.push(
        this.db
          .prepare(
            `INSERT INTO assessment_file_chunks(object_key,part,bytes)
         SELECT object_key,?,unhex(?) FROM assessment_files
         WHERE object_key=? AND checksum_sha256=? AND byte_size=? AND state='staged'
         ON CONFLICT(object_key,part) DO NOTHING`,
          )
          .bind(
            part,
            Buffer.from(bytes.subarray(offset, offset + CHUNK_SIZE)).toString(
              "hex",
            ),
            key,
            options.customMetadata.sha256,
            bytes.length,
          ),
      );
      if (statements.length === 2) {
        await this.db.batch(statements);
        statements = [];
      }
    }
    // Bounded batches allow an interrupted staged upload to retry. Hex bindings
    // avoid expanding binary into large JS number arrays on the D1 transport.
    if (statements.length) await this.db.batch(statements);
  }

  async get(key: string) {
    const meta = await this.head(key);
    if (!meta) return null;
    const body = new Uint8Array(meta.size);
    let offset = 0;
    // Read compact hex strings instead of BLOB number arrays to bound memory.
    for (let i = 0; i < Math.ceil(meta.size / CHUNK_SIZE); i++) {
      const row = await this.db
        .prepare(
          "SELECT part,hex(bytes) AS file_hex FROM assessment_file_chunks WHERE object_key=? AND part=?",
        )
        .bind(key, i)
        .first<{ part: number; file_hex: string }>();
      if (!row)
        fail(503, "FILE_STORAGE_ERROR", "ข้อมูลไฟล์ไม่ครบ กรุณาติดต่อผู้ดูแล");
      const chunk = Buffer.from(row.file_hex, "hex");
      if (row.part !== i || offset + chunk.length > body.length)
        fail(503, "FILE_STORAGE_ERROR", "ข้อมูลไฟล์ไม่ครบ กรุณาติดต่อผู้ดูแล");
      body.set(chunk, offset);
      offset += chunk.length;
    }
    if (
      offset !== body.length ||
      (await digest(body)) !== meta.customMetadata.sha256
    )
      fail(503, "FILE_STORAGE_ERROR", "ข้อมูลไฟล์ไม่ครบ กรุณาติดต่อผู้ดูแล");
    return {
      body: body as BodyInit,
      size: meta.size,
      httpEtag: `"${meta.customMetadata.sha256}"`,
    };
  }

  async delete(key: string) {
    await this.db
      .prepare(
        `DELETE FROM assessment_file_chunks WHERE object_key=? AND EXISTS
       (SELECT 1 FROM assessment_files WHERE object_key=? AND state='orphan')`,
      )
      .bind(key, key)
      .run();
  }
}
