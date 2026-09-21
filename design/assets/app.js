/* Khung dùng chung cho bản demo tĩnh Kho Minh Vũ. Chỉ lộ window.KMV. */
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Điều hướng — mở rộng từ NAV_ITEMS thật (src/shared/lib/navigation.ts).
  // Menu con (Xuất kho > Trả hàng, Tồn kho > Thẻ kho/Kiểm kê/Chuyển kho) là
  // GIẢ ĐỊNH riêng của demo để gom đủ 24 màn — app thật hiện chưa có menu con.
  // ---------------------------------------------------------------------
  var NAV = [
    { href: "index.html", nav: "index", label: "Tổng quan", shortLabel: "Tổng quan", icon: "dashboard", mobilePriority: 1, roles: "all" },
    { href: "nhap-kho.html", nav: "nhap-kho", label: "Nhập kho", shortLabel: "Nhập", icon: "stock-in", mobilePriority: 3, roles: "all" },
    { href: "dat-hang.html", nav: "dat-hang", label: "Đặt hàng", shortLabel: "Đặt hàng", icon: "sales-order", mobilePriority: 4, roles: "all" },
    {
      href: "xuat-kho.html", nav: "xuat-kho", label: "Xuất kho", shortLabel: "Xuất", icon: "stock-out", mobilePriority: 2, roles: "all",
      children: [
        { href: "xuat-kho.html", nav: "xuat-kho", label: "Phiếu xuất" },
        { href: "tra-hang.html", nav: "tra-hang", label: "Trả hàng" }
      ]
    },
    {
      href: "ton-kho.html", nav: "ton-kho", label: "Tồn kho", shortLabel: "Tồn kho", icon: "stock", mobilePriority: null, roles: "all",
      children: [
        { href: "ton-kho.html", nav: "ton-kho", label: "Tồn kho" },
        { href: "the-kho.html", nav: "the-kho", label: "Thẻ kho" },
        { href: "kiem-ke.html", nav: "kiem-ke", label: "Kiểm kê" },
        { href: "chuyen-kho.html", nav: "chuyen-kho", label: "Chuyển kho" }
      ]
    },
    { href: "danh-muc.html", nav: "danh-muc", label: "Danh mục hàng", shortLabel: "Hàng", icon: "catalog", mobilePriority: null, roles: "all" },
    { href: "doi-tac.html", nav: "doi-tac", label: "Đối tác", shortLabel: "Đối tác", icon: "partners", mobilePriority: null, roles: "all" },
    { href: "bao-cao.html", nav: "bao-cao", label: "Báo cáo", shortLabel: "Báo cáo", icon: "report", mobilePriority: null, roles: "all" },
    { href: "cai-dat.html", nav: "cai-dat", label: "Cài đặt", shortLabel: "Cài đặt", icon: "settings", mobilePriority: null, roles: ["quan_ly", "van_phong"] }
  ];

  var ICONS = {
    dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    "stock-in": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
    "stock-out": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="M6 9l6 6 6-6"/><path d="M4 21h16"/></svg>',
    "sales-order": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L23 6H6"/></svg>',
    stock: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg>',
    catalog: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 9h16"/><path d="M9 4v16"/></svg>',
    partners: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    report: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>',
    settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>',
    more: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    filter: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
    print: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>'
  };

  var STORE_KEY = "kmv_demo_v1";

  function safeStorage() {
    try {
      var t = "__kmv_t__";
      window.sessionStorage.setItem(t, "1");
      window.sessionStorage.removeItem(t);
      return window.sessionStorage;
    } catch {
      return null;
    }
  }
  var memoryStore = {};
  var storage = safeStorage();

  function storeGet(key, fallback) {
    try {
      var raw = storage ? storage.getItem(STORE_KEY + ":" + key) : memoryStore[key];
      if (raw === undefined || raw === null) return fallback;
      return storage ? JSON.parse(raw) : raw;
    } catch {
      return fallback;
    }
  }
  function storeSet(key, value) {
    try {
      if (storage) {
        storage.setItem(STORE_KEY + ":" + key, JSON.stringify(value));
      } else {
        memoryStore[key] = value;
      }
    } catch { /* im lặng — hỏng thì chạy bằng bộ nhớ */ }
  }

  function qs(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function icon(name) {
    return ICONS[name] || "";
  }

  function fmtNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toLocaleString("vi-VN");
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return iso;
    var dd = String(d.getDate()).padStart(2, "0");
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var yyyy = d.getFullYear();
    return dd + "/" + mm + "/" + yyyy;
  }

  var STATUS_TAG = {
    NHAP_LIEU: { label: "Nhập liệu", cls: "kv-tag-gold" },
    HOAN_THANH: { label: "Hoàn thành", cls: "kv-tag-green" },
    DA_HUY: { label: "Đã hủy", cls: "kv-tag-gray" },
    TAM: { label: "Đơn tạm", cls: "kv-tag-gold" },
    DA_XAC_NHAN: { label: "Đã xác nhận", cls: "kv-tag-blue" },
    dang_dem: { label: "Đang đếm", cls: "kv-tag-gold" },
    da_duyet: { label: "Đã duyệt", cls: "kv-tag-green" }
  };

  function statusTag(code) {
    var s = STATUS_TAG[code] || { label: code, cls: "kv-tag-gray" };
    var strike = code === "DA_HUY" ? " kv-tag-strike" : "";
    return '<span class="kv-tag ' + s.cls + strike + '">' + s.label + "</span>";
  }

  // ---------------------------------------------------------------------
  // Phiên demo (vai trò hiện tại) — lưu sessionStorage, mặc định quan_ly.
  // ---------------------------------------------------------------------
  function currentUser() {
    var roleCode = storeGet("role", "quan_ly");
    var users = window.KMV_DATA ? window.KMV_DATA.users : [];
    var u = users.filter(function (x) { return x.role === roleCode; })[0];
    return u || { fullName: "Người dùng demo", role: roleCode };
  }
  function setRole(roleCode, redirectTo) {
    storeSet("role", roleCode);
    if (redirectTo) {
      window.location.href = redirectTo;
    } else {
      window.location.reload();
    }
  }
  function roleLabel(code) {
    var found = (window.KMV_DATA.roles || []).filter(function (r) { return r.code === code; })[0];
    return found ? found.label : code;
  }
  function can(perm) {
    var role = currentUser().role;
    if (perm === "write") return role === "quan_ly" || role === "van_phong" || role === "thu_kho";
    if (perm === "void") return role === "quan_ly";
    if (perm === "cost") return role === "quan_ly";
    if (perm === "settings") return role === "quan_ly" || role === "van_phong";
    if (perm === "settings-users") return role === "quan_ly";
    return true;
  }

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------
  var toastWrap = null;
  function ensureToastWrap() {
    if (!toastWrap) {
      toastWrap = document.createElement("div");
      toastWrap.className = "kv-toast-wrap";
      document.body.appendChild(toastWrap);
    }
    return toastWrap;
  }
  function toast(type, message) {
    var wrap = ensureToastWrap();
    var el = document.createElement("div");
    el.className = "kv-toast";
    el.setAttribute("data-type", type || "info");
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity .2s";
      setTimeout(function () { el.remove(); }, 200);
    }, 3200);
  }

  // ---------------------------------------------------------------------
  // Drawer / Modal
  // ---------------------------------------------------------------------
  var backdropEl = null;
  var openStack = [];
  function ensureBackdrop() {
    if (!backdropEl) {
      backdropEl = document.createElement("div");
      backdropEl.className = "kv-backdrop";
      backdropEl.addEventListener("click", function () {
        closeTop();
      });
      document.body.appendChild(backdropEl);
    }
    return backdropEl;
  }
  function lockScroll(lock) {
    document.documentElement.style.overflow = lock ? "hidden" : "";
  }
  function closeTop() {
    var top = openStack[openStack.length - 1];
    if (!top) return;
    if (top.type === "drawer") closeDrawer(top.el);
    else closeModal(top.el);
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openStack.length > 0) closeTop();
  });

  function openDrawer(contentHtml, opts) {
    opts = opts || {};
    var placement = opts.placement || "right";
    var triggerEl = document.activeElement;
    var wrap = document.createElement("div");
    wrap.className = "kv-drawer";
    wrap.setAttribute("data-placement", placement);
    wrap.innerHTML =
      '<div class="kv-drawer-head"><span>' + (opts.title || "") + '</span>' +
      '<button type="button" class="kv-drawer-close" aria-label="Đóng">' + icon("close") + "</button></div>" +
      '<div class="kv-drawer-body">' + contentHtml + "</div>";
    document.body.appendChild(wrap);
    var bd = ensureBackdrop();
    bd.classList.add("is-open");
    lockScroll(true);
    requestAnimationFrame(function () { wrap.classList.add("is-open"); });
    wrap.querySelector(".kv-drawer-close").addEventListener("click", function () { closeDrawer(wrap); });
    openStack.push({ type: "drawer", el: wrap, trigger: triggerEl });
    return wrap;
  }
  function closeDrawer(el) {
    el.classList.remove("is-open");
    var idx = openStack.map(function (s) { return s.el; }).indexOf(el);
    var entry = idx >= 0 ? openStack[idx] : null;
    if (idx >= 0) openStack.splice(idx, 1);
    if (openStack.length === 0 && backdropEl) { backdropEl.classList.remove("is-open"); lockScroll(false); }
    setTimeout(function () {
      el.remove();
      if (entry && entry.trigger && entry.trigger.focus) entry.trigger.focus();
    }, 250);
  }

  function openModal(contentHtml, opts) {
    opts = opts || {};
    var triggerEl = document.activeElement;
    var wrap = document.createElement("div");
    wrap.className = "kv-modal-wrap";
    var footButtons = (opts.buttons || []).map(function (b, i) {
      return '<button type="button" class="kv-btn ' + (b.primary ? "kv-btn-primary" : b.danger ? "kv-btn-danger" : "") + '" data-modal-btn="' + i + '">' + b.label + "</button>";
    }).join("");
    wrap.innerHTML =
      '<div class="kv-modal" role="dialog" aria-modal="true">' +
      (opts.title ? '<div class="kv-modal-head">' + opts.title + "</div>" : "") +
      '<div class="kv-modal-body">' + contentHtml + "</div>" +
      (footButtons ? '<div class="kv-modal-foot">' + footButtons + "</div>" : "") +
      "</div>";
    document.body.appendChild(wrap);
    wrap.addEventListener("click", function (e) { if (e.target === wrap) closeModal(wrap); });
    requestAnimationFrame(function () { wrap.classList.add("is-open"); });
    (opts.buttons || []).forEach(function (b, i) {
      wrap.querySelector('[data-modal-btn="' + i + '"]').addEventListener("click", function () {
        if (b.onClick) b.onClick(wrap);
        else closeModal(wrap);
      });
    });
    openStack.push({ type: "modal", el: wrap, trigger: triggerEl });
    lockScroll(true);
    return wrap;
  }
  function closeModal(el) {
    el.classList.remove("is-open");
    var idx = openStack.map(function (s) { return s.el; }).indexOf(el);
    var entry = idx >= 0 ? openStack[idx] : null;
    if (idx >= 0) openStack.splice(idx, 1);
    if (openStack.length === 0) lockScroll(false);
    setTimeout(function () {
      el.remove();
      if (entry && entry.trigger && entry.trigger.focus) entry.trigger.focus();
    }, 150);
  }
  function confirm(opts) {
    return openModal(
      '<p>' + opts.message + "</p>" + (opts.body || ""),
      {
        title: opts.title || "Xác nhận",
        buttons: [
          { label: opts.cancelLabel || "Hủy", onClick: function (m) { closeModal(m); if (opts.onCancel) opts.onCancel(); } },
          { label: opts.okLabel || "Xác nhận", primary: !opts.danger, danger: !!opts.danger, onClick: function (m) { if (opts.onConfirm) opts.onConfirm(m); else closeModal(m); } }
        ]
      }
    );
  }

  // ---------------------------------------------------------------------
  // Bảng dữ liệu dùng chung
  // ---------------------------------------------------------------------
  function renderTable(el, opts) {
    opts = opts || {};
    var columns = opts.columns || [];
    var rows = opts.rows || [];
    var page = opts.page || 1;
    var pageSize = opts.pageSize || 20;
    var start = (page - 1) * pageSize;
    var pageRows = rows.slice(start, start + pageSize);

    if (rows.length === 0) {
      el.innerHTML = '<div class="kv-empty"><div class="kv-empty-icon">🗂️</div><div>' + (opts.emptyText || "Không có dữ liệu.") + "</div></div>";
      return;
    }

    var thead = "<tr>" + columns.map(function (c) { return "<th" + (c.numeric ? ' class="kv-col-num"' : "") + ">" + c.title + "</th>"; }).join("") + "</tr>";

    var totalRowHtml = "";
    if (opts.totalRow) {
      totalRowHtml = '<tr class="kv-row-total">' + columns.map(function (c, i) {
        var v = opts.totalRow[c.key];
        return "<td" + (c.numeric ? ' class="kv-col-num"' : "") + ">" + (i === 0 ? (v !== undefined ? v : "Tổng cộng") : (v !== undefined ? (c.numeric ? fmtNumber(v) : v) : "")) + "</td>";
      }).join("") + "</tr>";
    }

    var bodyHtml = pageRows.map(function (row, i) {
      var rowCls = [];
      if (opts.rowClass) rowCls.push(opts.rowClass(row));
      var cells = columns.map(function (c) {
        var val = c.render ? c.render(row) : row[c.key];
        return "<td" + (c.numeric ? ' class="kv-col-num"' : "") + ">" + (val === undefined || val === null || val === "" ? "—" : val) + "</td>";
      }).join("");
      var trAttrs = 'class="' + rowCls.join(" ") + '"' + (opts.onRowClick ? ' data-row-idx="' + (start + i) + '" style="cursor:pointer"' : "");
      return "<tr " + trAttrs + ">" + cells + "</tr>";
    }).join("");

    el.innerHTML = '<div class="kv-table-wrap"><table class="kv-table"><thead>' + thead + "</thead><tbody>" + totalRowHtml + bodyHtml + "</tbody></table></div>";

    if (opts.onRowClick) {
      el.querySelectorAll("[data-row-idx]").forEach(function (tr) {
        tr.addEventListener("click", function () {
          var idx = Number(tr.getAttribute("data-row-idx"));
          opts.onRowClick(rows[idx]);
        });
      });
    }

    if (rows.length > pageSize) {
      var totalPages = Math.ceil(rows.length / pageSize);
      var pag = document.createElement("div");
      pag.className = "kv-pagination";
      var html = '<button class="kv-page-btn" ' + (page <= 1 ? "disabled" : "") + ' data-pg="prev">‹</button>';
      for (var p = 1; p <= totalPages; p++) {
        html += '<button class="kv-page-btn ' + (p === page ? "is-active" : "") + '" data-pg="' + p + '">' + p + "</button>";
      }
      html += '<button class="kv-page-btn" ' + (page >= totalPages ? "disabled" : "") + ' data-pg="next">›</button>';
      pag.innerHTML = html;
      el.appendChild(pag);
      pag.querySelectorAll("[data-pg]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var v = btn.getAttribute("data-pg");
          var next = v === "prev" ? page - 1 : v === "next" ? page + 1 : Number(v);
          renderTable(el, Object.assign({}, opts, { page: next }));
        });
      });
    }
  }

  // ---------------------------------------------------------------------
  // Bộ lọc chung: gắn ô tìm/select/checkbox trong panelEl, gọi lại onFilter
  // ---------------------------------------------------------------------
  function bindFilters(panelEl, onFilter) {
    function collect() {
      var out = {};
      panelEl.querySelectorAll("[data-filter]").forEach(function (input) {
        var key = input.getAttribute("data-filter");
        if (input.type === "checkbox") {
          if (!out[key]) out[key] = [];
          if (input.checked) out[key].push(input.value);
        } else {
          if (input.value) out[key] = input.value;
        }
      });
      return out;
    }
    function run() { onFilter(collect()); }
    panelEl.addEventListener("input", run);
    panelEl.addEventListener("change", run);
    var clearBtn = panelEl.querySelector("[data-filter-clear]");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        panelEl.querySelectorAll("[data-filter]").forEach(function (input) {
          if (input.type === "checkbox") input.checked = false; else input.value = "";
        });
        run();
      });
    }
    run();
    return { getValues: collect, run: run };
  }

  function countActiveFilters(values) {
    var n = 0;
    Object.keys(values || {}).forEach(function (k) {
      var v = values[k];
      if (Array.isArray(v)) n += v.length; else if (v) n += 1;
    });
    return n;
  }

  // ---------------------------------------------------------------------
  // Skeleton giả lập tải
  // ---------------------------------------------------------------------
  function skeletonHtml(rows) {
    rows = rows || 6;
    var html = "";
    for (var i = 0; i < rows; i++) html += '<div class="kv-skeleton-line" style="width:' + (60 + (i % 4) * 10) + '%"></div>';
    return html;
  }
  function fakeLoad(el, renderFn, ms) {
    var forced = qs("state");
    if (forced === "loading") {
      el.innerHTML = skeletonHtml(8);
      return;
    }
    if (forced === "error") {
      el.innerHTML =
        '<div class="kv-error"><div class="kv-error-icon">⚠️</div>' +
        "<p>Không tải được dữ liệu — mất kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.</p>" +
        '<button type="button" class="kv-btn kv-btn-primary" data-retry>Thử lại</button></div>';
      el.querySelector("[data-retry]").addEventListener("click", function () { fakeLoad(el, renderFn, ms); });
      return;
    }
    el.innerHTML = skeletonHtml(6);
    setTimeout(function () { renderFn(); }, ms || 400);
  }

  // ---------------------------------------------------------------------
  // Tìm mã hàng — gợi ý khi gõ, Enter ưu tiên khớp tuyệt đối (bẫy 15)
  // ---------------------------------------------------------------------
  function productSearch(inputEl, opts) {
    opts = opts || {};
    var box = document.createElement("div");
    box.className = "kv-dropdown-menu";
    box.style.minWidth = "260px";
    box.style.maxHeight = "260px";
    box.style.overflowY = "auto";
    inputEl.parentElement.style.position = "relative";
    inputEl.parentElement.appendChild(box);

    function search(term) {
      term = (term || "").trim().toLowerCase();
      if (!term) return [];
      var all = window.KMV_DATA.products;
      return all.filter(function (p) {
        return p.code.toLowerCase().indexOf(term) !== -1 || p.name.toLowerCase().indexOf(term) !== -1;
      }).slice(0, 8);
    }
    function renderList(items) {
      if (items.length === 0) { box.classList.remove("is-open"); return; }
      box.innerHTML = items.map(function (p) {
        return '<button type="button" class="kv-dropdown-item" data-code="' + p.code + '"><strong>' + p.code + "</strong> — " + p.name + "</button>";
      }).join("");
      box.classList.add("is-open");
      box.querySelectorAll("[data-code]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          select(btn.getAttribute("data-code"));
        });
      });
    }
    function select(code) {
      var p = window.KMV_DATA.findProduct(code);
      inputEl.value = p.code;
      box.classList.remove("is-open");
      if (opts.onSelect) opts.onSelect(p);
    }

    inputEl.addEventListener("input", function () {
      renderList(search(inputEl.value));
    });
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var term = inputEl.value.trim().toLowerCase();
        var items = search(term);
        if (items.length === 0) return;
        // Bẫy 15: ưu tiên mã khớp tuyệt đối trước kết quả đầu tiên.
        var exact = items.filter(function (p) { return p.code.toLowerCase() === term; })[0];
        select((exact || items[0]).code);
      }
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target) && e.target !== inputEl) box.classList.remove("is-open");
    });
    return { search: search };
  }

  // ---------------------------------------------------------------------
  // Hàng nhập liệu bàn phím: mã → Enter → số lượng → (Enter → đơn giá →) Enter → thêm dòng
  // ---------------------------------------------------------------------
  function lineEntry(tableBodyEl, opts) {
    opts = opts || {};
    var withPrice = !!opts.withPrice;
    var lines = opts.initialLines ? opts.initialLines.slice() : [];

    function renderRows() {
      var rowsHtml = lines.map(function (l, i) {
        var priceCell = withPrice
          ? '<td class="kv-col-num">' + fmtNumber(l.price) + '</td><td class="kv-col-num">' + fmtNumber(l.price * l.qty) + "</td>"
          : "";
        return (
          "<tr>" +
          "<td>" + l.code + "</td><td>" + l.name + "</td><td>" + l.unit + "</td>" +
          "<td>" + (l.warehouse === "k1" ? "Kho 1" : "Kho 2") + "</td>" +
          '<td class="kv-col-num">' + fmtNumber(l.qty) + "</td>" +
          priceCell +
          '<td><button type="button" class="kv-btn kv-btn-sm" data-remove-line="' + i + '">Xóa</button></td>' +
          "</tr>"
        );
      }).join("");

      var entryRow =
        '<tr class="kv-line-entry"><td colspan="99">' +
        '<div class="kv-flex kv-flex-wrap">' +
        '<input type="text" class="kv-input" style="max-width:200px" placeholder="Mã hàng…" data-le="code" autocomplete="off">' +
        '<input type="number" class="kv-input" style="max-width:120px" placeholder="Số lượng" data-le="qty" min="0">' +
        (withPrice ? '<input type="number" class="kv-input" style="max-width:140px" placeholder="Đơn giá" data-le="price" min="0">' : "") +
        '<span class="kv-text-sm kv-text-muted">Gõ mã → Enter → số lượng → Enter' + (withPrice ? " → đơn giá → Enter" : "") + " để thêm dòng.</span>" +
        "</div></td></tr>";

      tableBodyEl.innerHTML = rowsHtml + entryRow;

      tableBodyEl.querySelectorAll("[data-remove-line]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          confirm({
            message: "Xóa dòng " + lines[Number(btn.getAttribute("data-remove-line"))].code + "?",
            danger: true,
            onConfirm: function (m) {
              lines.splice(Number(btn.getAttribute("data-remove-line")), 1);
              closeModal(m);
              renderRows();
              if (opts.onChange) opts.onChange(lines);
            }
          });
        });
      });

      var codeInput = tableBodyEl.querySelector('[data-le="code"]');
      var qtyInput = tableBodyEl.querySelector('[data-le="qty"]');
      var priceInput = tableBodyEl.querySelector('[data-le="price"]');
      var selectedProduct = null;

      productSearch(codeInput, {
        onSelect: function (p) {
          selectedProduct = p;
          qtyInput.focus();
        }
      });

      codeInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !selectedProduct) {
          // productSearch xử lý Enter để chọn mã; đợi tick kế tiếp mới focus.
          setTimeout(function () {
            var p = window.KMV_DATA.findProduct(codeInput.value.trim());
            if (p && p.code.toLowerCase() === codeInput.value.trim().toLowerCase()) {
              selectedProduct = p;
              qtyInput.focus();
            }
          }, 0);
        }
      });

      function commitLine() {
        if (!selectedProduct) { toast("error", "Chưa chọn được mã hàng hợp lệ."); return; }
        var qty = Number(qtyInput.value);
        if (!qty || qty <= 0) { toast("error", "Số lượng phải lớn hơn 0."); return; }
        var price = withPrice ? Number(priceInput.value || selectedProduct.costPrice) : selectedProduct.costPrice;
        lines.push({
          productId: selectedProduct.id, code: selectedProduct.code, name: selectedProduct.name,
          unit: selectedProduct.unit, warehouse: opts.warehouse || selectedProduct.defaultWarehouse,
          qty: qty, price: price
        });
        toast("success", "Đã thêm dòng " + selectedProduct.code);
        selectedProduct = null;
        renderRows();
        setTimeout(function () {
          var newCodeInput = tableBodyEl.querySelector('[data-le="code"]');
          if (newCodeInput) newCodeInput.focus();
        }, 0);
        if (opts.onChange) opts.onChange(lines);
      }

      qtyInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (withPrice) { priceInput.focus(); } else { commitLine(); }
        }
      });
      if (priceInput) {
        priceInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); commitLine(); }
        });
      }
    }

    renderRows();
    return { getLines: function () { return lines; }, refresh: renderRows };
  }

  // ---------------------------------------------------------------------
  // Dựng khung trang: top nav / tab đáy / menu tài khoản
  // ---------------------------------------------------------------------
  function visibleNavItems() {
    var role = currentUser().role;
    return NAV.filter(function (item) {
      return item.roles === "all" || item.roles.indexOf(role) !== -1;
    });
  }

  function buildTopNav(activeNav) {
    var items = visibleNavItems();
    var header = document.createElement("header");
    header.className = "kv-topnav";
    header.setAttribute("data-no-print", "");
    header.innerHTML =
      '<a href="index.html" class="kv-topnav-brand">Kho Minh Vũ</a>' +
      '<nav class="kv-topnav-pill">' +
      items.map(function (item) {
        var active = item.nav === activeNav || (item.children && item.children.some(function (c) { return c.nav === activeNav; }));
        return (
          '<a href="' + item.href + '" class="kv-topnav-item' + (active ? " is-active" : "") + '">' +
          icon(item.icon) + '<span class="kv-topnav-label">' + item.label + "</span></a>"
        );
      }).join("") +
      "</nav>" +
      '<div class="kv-topnav-spacer"><div class="kv-account" id="kv-account"></div></div>';
    return header;
  }

  function buildAccountMenu(container) {
    var u = currentUser();
    container.innerHTML =
      '<button type="button" class="kv-account-btn" id="kv-account-btn">' +
      '<span><span class="kv-account-name">' + u.fullName + '</span><br><span class="kv-account-role">' + roleLabel(u.role) + "</span></span>" +
      "</button>" +
      '<div class="kv-dropdown-menu" id="kv-account-menu">' +
      '<div class="kv-dropdown-label">Chuyển vai trò (chỉ có ở demo)</div>' +
      (window.KMV_DATA.roles || []).map(function (r) {
        return '<button type="button" class="kv-dropdown-item" data-role="' + r.code + '">' + (r.code === u.role ? "✓ " : "") + r.label + "</button>";
      }).join("") +
      '<div class="kv-dropdown-sep"></div>' +
      '<a class="kv-dropdown-item" href="doi-mat-khau.html">Đổi mật khẩu</a>' +
      '<a class="kv-dropdown-item" href="styleguide.html">Styleguide</a>' +
      '<div class="kv-dropdown-sep"></div>' +
      '<a class="kv-dropdown-item" href="dang-nhap.html">Đăng xuất</a>' +
      "</div>";
    var btn = container.querySelector("#kv-account-btn");
    var menu = container.querySelector("#kv-account-menu");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("is-open");
    });
    document.addEventListener("click", function () { menu.classList.remove("is-open"); });
    menu.querySelectorAll("[data-role]").forEach(function (b) {
      b.addEventListener("click", function () { setRole(b.getAttribute("data-role")); });
    });
  }

  function buildBottomTab(activeNav) {
    var items = visibleNavItems();
    var primary = items.filter(function (i) { return i.mobilePriority !== null; })
      .sort(function (a, b) { return a.mobilePriority - b.mobilePriority; })
      .slice(0, 4);
    var primaryHrefs = primary.map(function (i) { return i.href; });
    var overflow = items.filter(function (i) { return primaryHrefs.indexOf(i.href) === -1; });
    var overflowExpanded = [];
    overflow.forEach(function (i) {
      overflowExpanded.push(i);
      if (i.children) i.children.forEach(function (c) { overflowExpanded.push({ href: c.href, nav: c.nav, label: "— " + c.label, icon: i.icon }); });
    });

    var nav = document.createElement("nav");
    nav.className = "kv-tabbar";
    nav.setAttribute("data-no-print", "");
    var cols = primary.length + (overflow.length > 0 ? 1 : 0);
    var activeIsOverflow = overflowExpanded.some(function (i) { return i.nav === activeNav; });

    nav.innerHTML =
      '<div class="kv-tabbar-grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' +
      primary.map(function (item) {
        var active = item.nav === activeNav;
        return (
          '<a href="' + item.href + '" class="kv-tabbar-item' + (active ? " is-active" : "") + '">' +
          '<span class="kv-tabbar-icon">' + icon(item.icon) + "</span>" +
          '<span class="kv-tabbar-label">' + item.shortLabel + "</span></a>"
        );
      }).join("") +
      (overflow.length > 0
        ? '<button type="button" class="kv-tabbar-item' + (activeIsOverflow ? " is-active" : "") + '" id="kv-tabbar-more">' +
          '<span class="kv-tabbar-icon">' + icon("more") + "</span><span class=\"kv-tabbar-label\">Khác</span></button>"
        : "") +
      "</div>";

    if (overflow.length > 0) {
      nav.querySelector("#kv-tabbar-more").addEventListener("click", function () {
        openDrawer(
          overflowExpanded.map(function (item) {
            return '<a href="' + item.href + '" class="kv-dropdown-item" style="display:flex;gap:8px;align-items:center;font-size:15px;padding:10px">' + icon(item.icon) + item.label + "</a>";
          }).join(""),
          { title: "Khác", placement: "bottom" }
        );
      });
    }
    return nav;
  }

  function renderShell() {
    var body = document.body;
    var shellType = body.getAttribute("data-shell") || "app";
    if (shellType !== "app") return;

    var activeNav = body.getAttribute("data-nav") || "";
    var main = document.getElementById("page");
    if (!main) return;

    var shell = document.createElement("div");
    shell.className = "kv-shell";
    var topNav = buildTopNav(activeNav);
    var mainWrap = document.createElement("main");
    mainWrap.className = "kv-shell-main";

    body.insertBefore(shell, body.firstChild);
    shell.appendChild(topNav);
    while (main.firstChild) {
      mainWrap.appendChild(main.firstChild);
    }
    shell.appendChild(mainWrap);
    main.remove();
    mainWrap.id = "page";

    buildAccountMenu(topNav.querySelector("#kv-account"));

    var tabbar = buildBottomTab(activeNav);
    shell.appendChild(tabbar);
  }

  // ---------------------------------------------------------------------
  // Danh sách chứng từ dùng chung (nhap-kho / dat-hang / xuat-kho / tra-hang)
  // ---------------------------------------------------------------------
  var WAREHOUSE_LABEL = { k1: "Kho 1", k2: "Kho 2" };

  function buildDocList(rootEl, opts) {
    opts = opts || {};
    var dateField = opts.dateField || "ngay";
    var warehouseField = opts.warehouseField || "kho";
    var statusField = opts.statusField || "trangThai";
    var creatorField = opts.creatorField || "nguoiTao";
    var creators = Array.from(new Set(opts.rows.map(function (r) { return r[creatorField]; }).filter(Boolean)));

    rootEl.innerHTML =
      '<div class="kv-list-layout">' +
      '<aside class="kv-list-aside" id="kv-filter-panel">' + filterPanelHtml() + "</aside>" +
      '<section class="kv-list-section">' +
      '<div class="kv-list-toolbar">' +
      '<button type="button" class="kv-btn kv-filter-btn" id="kv-open-filter">' + icon("filter") + '<span id="kv-filter-count">Bộ lọc</span></button>' +
      '<div class="kv-grow"><input type="text" class="kv-input" id="kv-quick-search" placeholder="' + (opts.searchPlaceholder || "Tìm nhanh…") + '"></div>' +
      (opts.createButton ? '<button type="button" class="kv-btn kv-btn-primary" id="kv-create-btn">' + opts.createButton.label + "</button>" : "") +
      (opts.extraToolbar || "") +
      "</div>" +
      '<div id="kv-doc-table"></div>' +
      "</section>" +
      "</div>";

    function filterPanelHtml() {
      var html = '<div class="kv-form-field"><label class="kv-form-label">Tìm theo số phiếu / đối tác</label><input type="text" class="kv-input" data-filter="search"></div>';
      html += '<div class="kv-form-row"><div class="kv-form-field"><label class="kv-form-label">Từ ngày</label><input type="date" class="kv-input" data-filter="tuNgay"></div>' +
        '<div class="kv-form-field"><label class="kv-form-label">Đến ngày</label><input type="date" class="kv-input" data-filter="denNgay"></div></div>';
      if (opts.warehouseFilter !== false) {
        html += '<div class="kv-form-field"><label class="kv-form-label">Kho</label>' +
          (window.KMV_DATA.warehouses || []).map(function (w) {
            return '<label class="kv-flex" style="font-weight:normal"><input type="checkbox" data-filter="kho" value="' + w.id + '"> ' + w.name + "</label>";
          }).join("") + "</div>";
      }
      html += '<div class="kv-form-field"><label class="kv-form-label">Trạng thái</label>' +
        (opts.statusOptions || []).map(function (s) {
          return '<label class="kv-flex" style="font-weight:normal"><input type="checkbox" data-filter="trangThai" value="' + s.code + '"> ' + s.label + "</label>";
        }).join("") + "</div>";
      if (opts.creatorFilter !== false) {
        html += '<div class="kv-form-field"><label class="kv-form-label">Người tạo</label><select class="kv-select" data-filter="nguoiTao"><option value="">Tất cả</option>' +
          creators.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("") + "</select></div>";
      }
      html += '<button type="button" class="kv-btn" data-filter-clear style="width:100%">Xóa bộ lọc</button>';
      return html;
    }

    var panelEl = rootEl.querySelector("#kv-filter-panel");
    var drawerPanel = null;
    var quickSearch = rootEl.querySelector("#kv-quick-search");
    var tableEl = rootEl.querySelector("#kv-doc-table");

    function applyFilters(values) {
      var term = (quickSearch.value || "").toLowerCase().trim();
      var searchTerm = (values.search || "").toLowerCase().trim() || term;
      var filtered = opts.rows.filter(function (row) {
        if (searchTerm && !(opts.searchFn ? opts.searchFn(row, searchTerm) : true)) return false;
        if (values.tuNgay && row[dateField] < values.tuNgay) return false;
        if (values.denNgay && row[dateField] > values.denNgay) return false;
        if (values.kho && values.kho.length > 0 && values.kho.indexOf(row[warehouseField]) === -1) return false;
        if (values.trangThai && values.trangThai.length > 0 && values.trangThai.indexOf(row[statusField]) === -1) return false;
        if (values.nguoiTao && row[creatorField] !== values.nguoiTao) return false;
        return true;
      });
      var count = countActiveFilters(values) + (term ? 1 : 0);
      var countLabelEl = rootEl.querySelector("#kv-filter-count");
      countLabelEl.textContent = count > 0 ? "Bộ lọc (" + count + ")" : "Bộ lọc";
      renderDocTable(filtered);
    }

    function renderDocTable(rows) {
      fakeLoad(tableEl, function () {
        renderTable(tableEl, {
          columns: opts.columns,
          rows: rows,
          rowClass: opts.rowClass,
          totalRow: opts.totalRow ? opts.totalRow(rows) : undefined,
          emptyText: rows.length === 0 && opts.rows.length > 0
            ? "Không có phiếu nào khớp bộ lọc — thử nới khoảng ngày."
            : (opts.emptyText || "Chưa có dữ liệu."),
          onRowClick: opts.onRowClick
        });
      }, 350);
    }

    var filterApi = bindFilters(panelEl, applyFilters);
    quickSearch.addEventListener("input", function () { filterApi.run(); });

    rootEl.querySelector("#kv-open-filter").addEventListener("click", function () {
      drawerPanel = openDrawer(filterPanelHtml(), { title: "Bộ lọc", placement: "bottom" });
      bindFilters(drawerPanel, function (values) {
        // Đồng bộ lại panel gốc rồi áp dụng, giữ một nguồn sự thật duy nhất.
        syncPanels(drawerPanel, panelEl);
        applyFilters(values);
      });
    });

    function syncPanels(from, to) {
      from.querySelectorAll("[data-filter]").forEach(function (fromInput) {
        var key = fromInput.getAttribute("data-filter");
        var value = fromInput.value;
        to.querySelectorAll('[data-filter="' + key + '"]').forEach(function (toInput) {
          if (toInput.type === "checkbox") {
            toInput.checked = fromInput.type === "checkbox" ? fromInput.checked : false;
          } else {
            toInput.value = value;
          }
        });
      });
    }

    if (opts.createButton) {
      rootEl.querySelector("#kv-create-btn").addEventListener("click", opts.createButton.onClick);
    }

    return { refresh: function () { filterApi.run(); } };
  }

  // ---------------------------------------------------------------------
  // Tóm tắt trước khi ghi sổ / hủy phiếu — dùng chung mọi loại chứng từ
  // ---------------------------------------------------------------------
  function postingSummaryHtml(opts) {
    return (
      '<p>Phiếu <strong class="kv-text-mono">' + opts.docNo + "</strong> — " + opts.headline + "</p>" +
      (opts.body || "") +
      '<div class="kv-alert kv-alert-warning kv-mt-12"><div><div class="kv-alert-title">' + opts.warningTitle + '</div>' + opts.warningDescription + "</div></div>"
    );
  }

  function voidDialog(opts) {
    var reasonId = "void-reason-" + Math.random().toString(36).slice(2, 8);
    openModal(
      '<div class="kv-form-field"><label class="kv-form-label">Lý do hủy phiếu<span class="req">*</span></label>' +
      '<textarea class="kv-textarea" id="' + reasonId + '" placeholder="Vì sao hủy phiếu này?"></textarea></div>' +
      '<div class="kv-alert kv-alert-info"><div>Hủy phiếu đã ghi sổ sẽ sinh bút toán đảo trong sổ kho — không xóa dòng nào đã ghi.</div></div>',
      {
        title: "Hủy phiếu " + opts.docNo,
        buttons: [
          { label: "Đóng", onClick: function (m) { closeModal(m); } },
          {
            label: "Xác nhận hủy", danger: true, onClick: function (m) {
              var reason = document.getElementById(reasonId).value.trim();
              if (!reason) { toast("error", "Vui lòng nhập lý do hủy phiếu."); return; }
              closeModal(m);
              if (opts.onConfirm) opts.onConfirm(reason);
            }
          }
        ]
      }
    );
  }

  function negativeReasonPanelHtml(selectedCode, selectedNote) {
    var reasons = window.KMV_DATA.negativeReasons || [];
    return (
      '<div class="kv-alert kv-alert-warning"><div><div class="kv-alert-title">Có dòng vượt tồn</div>' +
      "Xuất âm được phép nhưng phải chọn lý do trước khi ghi sổ được.</div></div>" +
      '<div class="kv-negreason-grid" id="kv-negreason-grid">' +
      reasons.map(function (r) {
        var checked = r.code === selectedCode;
        return (
          '<label class="kv-negreason' + (checked ? " is-selected" : "") + '" data-negreason-item="' + r.code + '">' +
          '<input type="radio" name="ly-do-xuat-am" value="' + r.code + '"' + (checked ? " checked" : "") + "> " +
          "<span>" + r.label + "</span></label>"
        );
      }).join("") +
      "</div>" +
      '<div class="kv-form-field' + (selectedCode === "khac" ? "" : " kv-hide-note") + '" id="kv-negreason-note-field">' +
      '<label class="kv-form-label">Ghi chú<span class="req">*</span></label>' +
      '<input type="text" class="kv-input" id="kv-negreason-note" placeholder="Ghi rõ lý do khác…" value="' + (selectedNote || "") + '"></div>' +
      '<button type="button" class="kv-btn kv-btn-sm" id="kv-negreason-clear">Bỏ chọn lý do</button>'
    );
  }

  function bindNegativeReasonPanel(container, onChange) {
    var selected = null;
    var note = "";
    container.querySelectorAll('[data-negreason-item]').forEach(function (label) {
      label.addEventListener("click", function () {
        selected = label.getAttribute("data-negreason-item");
        container.querySelectorAll('[data-negreason-item]').forEach(function (l) { l.classList.remove("is-selected"); });
        label.classList.add("is-selected");
        var noteField = container.querySelector("#kv-negreason-note-field");
        if (noteField) noteField.classList.toggle("kv-hide-note", selected !== "khac");
        onChange(selected, note);
      });
    });
    var noteInput = container.querySelector("#kv-negreason-note");
    if (noteInput) {
      noteInput.addEventListener("input", function () { note = noteInput.value; onChange(selected, note); });
    }
    var clearBtn = container.querySelector("#kv-negreason-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        selected = null; note = "";
        container.querySelectorAll('[data-negreason-item]').forEach(function (l) { l.classList.remove("is-selected"); });
        container.querySelectorAll('input[name="ly-do-xuat-am"]').forEach(function (r) { r.checked = false; });
        onChange(null, "");
      });
    }
    return { getValue: function () { return { code: selected, note: note }; } };
  }

  // ---------------------------------------------------------------------
  // Đăng ký logic riêng từng trang
  // ---------------------------------------------------------------------
  var pageHandlers = {};
  function page(name, fn) { pageHandlers[name] = fn; }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      renderShell();
    } catch (e) {
      console.error("Lỗi dựng khung trang:", e);
    }
    var name = document.body.getAttribute("data-page");
    if (name && pageHandlers[name]) {
      try {
        pageHandlers[name]();
      } catch (e) {
        console.error("Lỗi khởi tạo trang " + name + ":", e);
      }
    }
  });

  window.KMV = {
    NAV: NAV,
    icon: icon,
    fmtNumber: fmtNumber,
    fmtDate: fmtDate,
    statusTag: statusTag,
    renderTable: renderTable,
    bindFilters: bindFilters,
    countActiveFilters: countActiveFilters,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirm,
    toast: toast,
    fakeLoad: fakeLoad,
    skeletonHtml: skeletonHtml,
    store: { get: storeGet, set: storeSet },
    qs: qs,
    productSearch: productSearch,
    lineEntry: lineEntry,
    currentUser: currentUser,
    setRole: setRole,
    roleLabel: roleLabel,
    can: can,
    page: page,
    warehouseLabel: function (id) { return WAREHOUSE_LABEL[id] || id; },
    buildDocList: buildDocList,
    postingSummaryHtml: postingSummaryHtml,
    voidDialog: voidDialog,
    negativeReasonPanelHtml: negativeReasonPanelHtml,
    bindNegativeReasonPanel: bindNegativeReasonPanel
  };
})();
