/**
 * Kho Minh Vũ — Apps Script "storage adapter" cho ảnh mã hàng.
 *
 * VÌ SAO file này tồn tại (D-09, D-10): chưa có kinh phí cloud storage, nên ảnh lưu
 * trên Google Drive của một tài khoản Google riêng cho hệ thống. Toàn bộ hiểu biết về
 * Drive/Apps Script gói gọn trong file này + `src/features/images/lib/storage/*` phía
 * Next.js — component/hook/URL còn lại không biết tới Drive.
 *
 * HỢP ĐỒNG JSON (chép y nguyên ở 09-02-PLAN.md và 09-04-PLAN.md — sửa một bên thì
 * phải sửa cả hai, đây là ranh giới giữa hai plan chạy song song):
 *   Request  POST body JSON, một trong ba dạng:
 *     { secret, action: "put",    folder, fileName, mimeType: "image/webp", base64Data }
 *     { secret, action: "get",    fileId }
 *     { secret, action: "remove", fileId }
 *   Response LUÔN HTTP 200 (Apps Script không set được status tùy ý — xem "Điểm phải
 *   biết" #1 trong 09-RESEARCH.md), JSON:
 *     put    → { ok: true, fileId }
 *     get    → { ok: true, mimeType, base64Data }
 *     remove → { ok: true }
 *     lỗi    → { ok: false, error: "forbidden" | "bad_request" | "not_found" | "internal", message }
 */

var ROOT_FOLDER_NAME = 'Kho Minh Vu - Anh';

// Nhánh 'chung-tu/...' để dành cho phase ảnh chứng từ sau này (D-08) — CHƯA mở ở đây.
var ALLOWED_FOLDERS = ['san-pham/goc', 'san-pham/thumb'];

var FILE_NAME_PATTERN = /^[A-Za-z0-9._-]{1,120}\.webp$/;

// ~2MB base64 (~1.5MB ảnh gốc) — Vercel Route Handler đã chặn payload lớn hơn trước
// khi gọi tới đây, đây là lớp phòng thủ thứ hai (đe dọa T-09-09).
var MAX_BASE64_LENGTH = 2000000;

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function fail_(error, message) {
  return json_({ ok: false, error: error, message: message });
}

/**
 * Mở /exec trên trình duyệt (GET) không được lộ bất cứ điều gì — không có nhánh
 * đọc dữ liệu nào qua GET, mọi thao tác đều qua POST + secret.
 */
function doGet(e) {
  return fail_('bad_request', 'Chỉ nhận POST');
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (parseErr) {
    return fail_('bad_request', 'Body không phải JSON hợp lệ');
  }

  if (typeof body.secret !== 'string' || body.secret.length === 0) {
    return fail_('forbidden', 'Thiếu secret');
  }
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!expectedSecret || body.secret !== expectedSecret) {
    return fail_('forbidden', 'Sai hoặc thiếu secret');
  }

  try {
    switch (body.action) {
      case 'put':
        return put_(body);
      case 'get':
        return get_(body);
      case 'remove':
        return remove_(body);
      default:
        return fail_('bad_request', 'action không hợp lệ: ' + body.action);
    }
  } catch (err) {
    // Không trả stack trace ra ngoài — chỉ ghi thông điệp ngắn.
    return fail_('internal', String((err && err.message) || err));
  }
}

function put_(body) {
  if (ALLOWED_FOLDERS.indexOf(body.folder) < 0) {
    return fail_('bad_request', 'folder không hợp lệ: ' + body.folder);
  }
  if (typeof body.fileName !== 'string' || !FILE_NAME_PATTERN.test(body.fileName)) {
    return fail_('bad_request', 'fileName không hợp lệ');
  }
  if (body.mimeType !== 'image/webp') {
    return fail_('bad_request', 'mimeType phải là image/webp');
  }
  if (
    typeof body.base64Data !== 'string' ||
    body.base64Data.length === 0 ||
    body.base64Data.length > MAX_BASE64_LENGTH
  ) {
    return fail_('bad_request', 'base64Data thiếu hoặc quá lớn');
  }

  var blob = Utilities.newBlob(
    Utilities.base64Decode(body.base64Data),
    'image/webp',
    body.fileName
  );
  var file = getFolder_(body.folder).createFile(blob);
  // Không mở quyền chia sẻ file — file phải ở chế độ private, chỉ tài khoản Google riêng
  // của hệ thống đọc được (đe dọa T-09-07).
  return json_({ ok: true, fileId: file.getId() });
}

function get_(body) {
  if (typeof body.fileId !== 'string' || body.fileId.length === 0) {
    return fail_('bad_request', 'Thiếu fileId');
  }
  var file;
  try {
    file = DriveApp.getFileById(body.fileId);
  } catch (notFoundErr) {
    return fail_('not_found', 'Không tìm thấy file');
  }
  if (file.isTrashed()) {
    return fail_('not_found', 'File đã bị xóa');
  }
  return json_({
    ok: true,
    mimeType: file.getMimeType(),
    base64Data: Utilities.base64Encode(file.getBlob().getBytes()),
  });
}

function remove_(body) {
  if (typeof body.fileId !== 'string' || body.fileId.length === 0) {
    return fail_('bad_request', 'Thiếu fileId');
  }
  var file;
  try {
    file = DriveApp.getFileById(body.fileId);
  } catch (notFoundErr) {
    return fail_('not_found', 'Không tìm thấy file');
  }
  // Idempotent: gọi remove hai lần trên cùng fileId không lỗi (D-21 — xóa mềm, chuyển
  // vào thùng rác Drive chứ không xóa hẳn).
  if (!file.isTrashed()) {
    file.setTrashed(true);
  }
  return json_({ ok: true });
}

function getRootFolder_() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('ROOT_FOLDER_ID');
  if (rootId) {
    try {
      var existing = DriveApp.getFolderById(rootId);
      if (!existing.isTrashed()) {
        return existing;
      }
    } catch (notFoundErr) {
      // rơi xuống tạo mới
    }
  }
  var created = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_FOLDER_ID', created.getId());
  return created;
}

/**
 * Mở (hoặc tạo) folder theo đường dẫn dạng 'san-pham/goc'. Cache id trong
 * PropertiesService để không phải getFoldersByName mỗi lần ghi (D-08).
 */
function getFolder_(path) {
  var props = PropertiesService.getScriptProperties();
  var cacheKey = 'FOLDER_' + path;
  var cachedId = props.getProperty(cacheKey);
  if (cachedId) {
    try {
      var cached = DriveApp.getFolderById(cachedId);
      if (!cached.isTrashed()) {
        return cached;
      }
    } catch (notFoundErr) {
      // rơi xuống dựng lại bằng lock
    }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Request khác có thể vừa tạo xong trong lúc ta chờ lock — đọc lại trước khi tạo.
    cachedId = props.getProperty(cacheKey);
    if (cachedId) {
      try {
        var reread = DriveApp.getFolderById(cachedId);
        if (!reread.isTrashed()) {
          return reread;
        }
      } catch (notFoundErr) {
        // rơi xuống tạo mới
      }
    }

    var segments = path.split('/');
    var current = getRootFolder_();
    for (var i = 0; i < segments.length; i++) {
      var seg = segments[i];
      var found = current.getFoldersByName(seg);
      current = found.hasNext() ? found.next() : current.createFolder(seg);
    }
    props.setProperty(cacheKey, current.getId());
    return current;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Chạy TAY trong trình soạn thảo Apps Script lần đầu tiên (không phải qua web app) —
 * đây là bước Google hỏi xin quyền Drive, và cách xác nhận folder gốc + SECRET đã sẵn
 * sàng trước khi deploy (xem apps-script/README.md mục 6).
 */
function kiemTraThietLap() {
  var gocFolder = getFolder_('san-pham/goc');
  var thumbFolder = getFolder_('san-pham/thumb');
  var secretDaDat = !!PropertiesService.getScriptProperties().getProperty('SECRET');

  Logger.log('Folder gốc: ' + getRootFolder_().getUrl());
  Logger.log('san-pham/goc: ' + gocFolder.getUrl());
  Logger.log('san-pham/thumb: ' + thumbFolder.getUrl());
  Logger.log('SECRET đã đặt: ' + (secretDaDat ? 'CÓ' : 'CHƯA — vào Project Settings > Script Properties để thêm'));
}
