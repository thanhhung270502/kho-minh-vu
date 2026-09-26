/**
 * Kiểm GDriveImageStorage bằng fetch giả — không gọi Apps Script thật.
 * Chạy: npx tsx scripts/test-image-storage.ts
 */
import assert from "node:assert/strict";

import { GDriveImageStorage } from "../src/features/images/lib/storage/gdrive-storage.server";
import { ImageStorageError } from "../src/features/images/lib/storage/image-storage";

type FakeCall = { url: string; init: RequestInit & { next?: { tags?: string[] } } };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeStorage(queue: Array<Response | Error>, calls: FakeCall[]) {
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({ url, init: (init ?? {}) as FakeCall["init"] });
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("Hết response giả đã xếp hàng cho fetch");
    }
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    return Promise.resolve(next);
  }) as typeof fetch;

  return new GDriveImageStorage({
    url: "https://script.google.com/macros/s/x/exec",
    secret: "bi-mat-du-dai-tren-16-ky-tu",
    fetchImpl,
  });
}

let caseCount = 0;

async function main() {
  // backend luôn là "GDRIVE"
  {
    const storage = makeStorage([], []);
    assert.equal(storage.backend, "GDRIVE");
    caseCount += 1;
  }

  // put variant "full" → folder san-pham/goc, base64Data đúng, cache no-store
  {
    const calls: FakeCall[] = [];
    const storage = makeStorage([jsonResponse({ ok: true, fileId: "F1" })], calls);
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const fileId = await storage.put({ variant: "full", fileName: "A__x.webp", bytes });
    assert.equal(fileId, "F1");
    assert.equal(calls.length, 1);
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.action, "put");
    assert.equal(body.folder, "san-pham/goc");
    assert.equal(body.mimeType, "image/webp");
    assert.equal(body.secret, "bi-mat-du-dai-tren-16-ky-tu");
    assert.equal(body.base64Data, Buffer.from(bytes).toString("base64"));
    assert.equal(calls[0].init.cache, "no-store");
    caseCount += 1;
  }

  // put variant "thumb" → folder san-pham/thumb
  {
    const calls: FakeCall[] = [];
    const storage = makeStorage([jsonResponse({ ok: true, fileId: "F2" })], calls);
    await storage.put({ variant: "thumb", fileName: "A__x-thumb.webp", bytes: new Uint8Array([5]) });
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.folder, "san-pham/thumb");
    caseCount += 1;
  }

  // response {ok:false, error:"forbidden"} (HTTP 200) → ImageStorageError kind "forbidden"
  {
    const storage = makeStorage(
      [jsonResponse({ ok: false, error: "forbidden", message: "Sai secret" })],
      [],
    );
    await assert.rejects(
      () => storage.put({ variant: "full", fileName: "a.webp", bytes: new Uint8Array([1]) }),
      (error: unknown) => {
        assert.ok(error instanceof ImageStorageError);
        assert.equal(error.kind, "forbidden");
        return true;
      },
    );
    caseCount += 1;
  }

  // response {ok:false, error:"not_found"} cho get → kind "not_found"
  {
    const storage = makeStorage(
      [jsonResponse({ ok: false, error: "not_found", message: "Không tìm thấy file" })],
      [],
    );
    await assert.rejects(
      () => storage.get("F-khong-ton-tai"),
      (error: unknown) => {
        assert.ok(error instanceof ImageStorageError);
        assert.equal(error.kind, "not_found");
        return true;
      },
    );
    caseCount += 1;
  }

  // HTTP 500 → kind "unavailable"
  {
    const storage = makeStorage([jsonResponse({ ok: false }, 500)], []);
    await assert.rejects(
      () => storage.get("F1"),
      (error: unknown) => {
        assert.ok(error instanceof ImageStorageError);
        assert.equal(error.kind, "unavailable");
        return true;
      },
    );
    caseCount += 1;
  }

  // Body không phải JSON hợp lệ → kind "unavailable"
  {
    const storage = makeStorage(
      [new Response("<html>not json</html>", { status: 200, headers: { "Content-Type": "text/html" } })],
      [],
    );
    await assert.rejects(
      () => storage.get("F1"),
      (error: unknown) => {
        assert.ok(error instanceof ImageStorageError);
        assert.equal(error.kind, "unavailable");
        return true;
      },
    );
    caseCount += 1;
  }

  // fetch ném lỗi mạng → kind "unavailable"
  {
    const storage = makeStorage([new Error("mất mạng")], []);
    await assert.rejects(
      () => storage.get("F1"),
      (error: unknown) => {
        assert.ok(error instanceof ImageStorageError);
        assert.equal(error.kind, "unavailable");
        return true;
      },
    );
    caseCount += 1;
  }

  // get("F1") thành công → giải mã base64 đúng, contentType đúng
  {
    const bytes = Buffer.from("noi dung anh gia");
    const storage = makeStorage(
      [jsonResponse({ ok: true, mimeType: "image/webp", base64Data: bytes.toString("base64") })],
      [],
    );
    const result = await storage.get("F1");
    assert.equal(result.contentType, "image/webp");
    assert.deepEqual(Buffer.from(result.bytes), bytes);
    caseCount += 1;
  }

  // get với cacheTag → init có cache:"force-cache" và next.tags đúng
  {
    const calls: FakeCall[] = [];
    const storage = makeStorage(
      [jsonResponse({ ok: true, mimeType: "image/webp", base64Data: "UklGRg==" })],
      calls,
    );
    await storage.get("F1", { cacheTag: "anh-1-full" });
    assert.equal(calls[0].init.cache, "force-cache");
    assert.deepEqual(calls[0].init.next?.tags, ["anh-1-full"]);
    caseCount += 1;
  }

  // get không truyền cacheTag → cache:"no-store"
  {
    const calls: FakeCall[] = [];
    const storage = makeStorage(
      [jsonResponse({ ok: true, mimeType: "image/webp", base64Data: "UklGRg==" })],
      calls,
    );
    await storage.get("F1");
    assert.equal(calls[0].init.cache, "no-store");
    caseCount += 1;
  }

  // remove("F1") thành công → gửi action:"remove", resolve
  {
    const calls: FakeCall[] = [];
    const storage = makeStorage([jsonResponse({ ok: true })], calls);
    await storage.remove("F1");
    const body = JSON.parse(String(calls[0].init.body));
    assert.equal(body.action, "remove");
    assert.equal(body.fileId, "F1");
    caseCount += 1;
  }

  // remove với not_found từ Apps Script vẫn resolve (coi như đã xóa)
  {
    const storage = makeStorage(
      [jsonResponse({ ok: false, error: "not_found", message: "Không tìm thấy" })],
      [],
    );
    await storage.remove("F-da-mat");
    caseCount += 1;
  }

  console.log(`✓ test-image-storage: ${caseCount} case`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
