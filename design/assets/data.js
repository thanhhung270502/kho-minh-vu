/* Dữ liệu mẫu cho bản demo tĩnh Kho Minh Vũ — CHỈ dùng để dựng giao diện, không phải dữ liệu thật. */
(function () {
  "use strict";

  var WAREHOUSES = [
    { id: "k1", name: "Kho 1" },
    { id: "k2", name: "Kho 2" }
  ];

  var ROLES = [
    { code: "quan_ly", label: "Quản lý" },
    { code: "van_phong", label: "Văn phòng" },
    { code: "thu_kho", label: "Thủ kho" },
    { code: "chi_xem", label: "Chỉ xem" }
  ];

  var USERS = [
    { id: "u1", fullName: "Nguyễn Văn Tùng", email: "quanly@khominhvu.local", role: "quan_ly", warehouses: ["k1", "k2"], locked: false },
    { id: "u2", fullName: "Trần Thị Hạnh", email: "vanphong@khominhvu.local", role: "van_phong", warehouses: ["k1", "k2"], locked: false },
    { id: "u3", fullName: "Lê Văn Sơn", email: "thukho@khominhvu.local", role: "thu_kho", warehouses: ["k1"], locked: false },
    { id: "u4", fullName: "Phạm Thị Mai", email: "chixem@khominhvu.local", role: "chi_xem", warehouses: ["k1", "k2"], locked: false },
    { id: "u5", fullName: "Đỗ Văn Khánh", email: "khanh.dv@khominhvu.local", role: "thu_kho", warehouses: ["k2"], locked: true }
  ];

  var GROUPS = [
    "Nhông sên dĩa", "Bố thắng", "Lọc gió", "Bugi", "Vỏ – ruột xe",
    "Bình ắc quy", "Dây curoa", "Bạc đạn", "Nhớt", "Gương – đèn",
    "Phuộc – giảm xóc", "Ốc vít – phụ kiện", "Dây điện – rơ le", "Yếm – nhựa"
  ];

  var UNITS = ["Cái", "Bộ", "Sợi", "Cặp", "Lít", "Hộp", "Chai"];
  var STAGES = ["Chưa hoàn thiện", "Đã sơn", "Đã đóng gói"];

  // ---- Sinh danh mục sản phẩm (>=60 mã, tên/mã thật ngành phụ tùng xe máy) ----
  var PRODUCT_SEED = [
    ["LGPCX", "Lọc gió phổ thông xe côn", "Lọc gió", "Cái", 45000, 32000],
    ["HSP-20A-I", "Heo dầu sau Airblade 125", "Phuộc – giảm xóc", "Bộ", 320000, 240000],
    ["VITAL165", "Nhông xích 428 Vital 165", "Nhông sên dĩa", "Bộ", 210000, 155000],
    ["NSD-428-WAVE", "Nhông sên dĩa 428 Wave Alpha", "Nhông sên dĩa", "Bộ", 195000, 140000],
    ["BT-AB125", "Bố thắng đĩa trước Airblade 125", "Bố thắng", "Bộ", 85000, 58000],
    ["BUGI-NGK-CPR8", "Bugi NGK CPR8EA-9", "Bugi", "Cái", 42000, 29000],
    ["VOR-275-17", "Vỏ ruột sau 275-17 Michelin", "Vỏ – ruột xe", "Bộ", 560000, 430000],
    ["ACQ-GS-5A", "Bình ắc quy GS GTZ5S", "Bình ắc quy", "Cái", 480000, 370000],
    ["DCR-751", "Dây curoa CVT 751 Vario", "Dây curoa", "Sợi", 165000, 118000],
    ["BDN-6202", "Bạc đạn 6202 2RS", "Bạc đạn", "Cái", 22000, 14000],
    ["NHOT-CT-08", "Nhớt Castrol Power1 10W40 0.8L", "Nhớt", "Chai", 98000, 72000],
    ["GDX-WAVE-RS", "Gương chiếu hậu Wave RSX cặp", "Gương – đèn", "Cặp", 65000, 44000],
    ["PXG-EX-125", "Phuộc trước Exciter 125 độ", "Phuộc – giảm xóc", "Bộ", 890000, 690000],
    ["OCV-M6X20", "Ốc vít M6x20 inox bộ 10", "Ốc vít – phụ kiện", "Hộp", 25000, 15000],
    ["DDI-RL-12V", "Rơ le đề 12V phổ thông", "Dây điện – rơ le", "Cái", 55000, 36000],
    ["YEM-WAVE-A", "Yếm trước Wave Alpha đời 2020", "Yếm – nhựa", "Cái", 145000, 102000],
    ["LGD-SH150", "Lọc gió dầu SH 150i", "Lọc gió", "Cái", 78000, 55000],
    ["BT-SAU-JUPI", "Bố thắng sau Jupiter", "Bố thắng", "Bộ", 62000, 40000],
    ["NSD-420-RAIDER", "Nhông sên dĩa 420 Raider Fi", "Nhông sên dĩa", "Bộ", 260000, 195000],
    ["BUGI-DENSO-U24", "Bugi Denso U24FER9", "Bugi", "Cái", 38000, 26000],
    ["VOR-90-90-14", "Vỏ ruột trước 90/90-14", "Vỏ – ruột xe", "Bộ", 310000, 235000],
    ["ACQ-YUASA-4L", "Bình ắc quy Yuasa YTZ4V", "Bình ắc quy", "Cái", 410000, 320000],
    ["DCR-788", "Dây curoa CVT 788 Air Blade", "Dây curoa", "Sợi", 175000, 128000],
    ["BDN-6204", "Bạc đạn 6204 2RS", "Bạc đạn", "Cái", 26000, 17000],
    ["NHOT-MOTUL-1L", "Nhớt Motul 5100 10W40 1L", "Nhớt", "Chai", 145000, 108000],
    ["GDX-LED-H4", "Bóng đèn LED H4 siêu sáng", "Gương – đèn", "Cái", 155000, 112000],
    ["PXG-SAU-VISION", "Phuộc sau Vision đôi", "Phuộc – giảm xóc", "Bộ", 220000, 165000],
    ["OCV-M8X25", "Ốc vít M8x25 inox bộ 10", "Ốc vít – phụ kiện", "Hộp", 32000, 20000],
    ["DDI-DAY-SAC", "Dây sạc bình phổ thông", "Dây điện – rơ le", "Sợi", 28000, 17000],
    ["YEM-EXCITER-135", "Yếm hông Exciter 135", "Yếm – nhựa", "Cái", 180000, 128000],
    ["LGPCX-2", "Lọc gió phổ thông xe tay ga", "Lọc gió", "Cái", 48000, 34000],
    ["HSP-20A-II", "Heo dầu trước Airblade 125", "Phuộc – giảm xóc", "Bộ", 340000, 255000],
    ["VITAL165-2", "Nhông xích 428 Vital 165 loại 2", "Nhông sên dĩa", "Bộ", 175000, 128000],
    ["BT-TRUOC-SIRIUS", "Bố thắng trước Sirius", "Bố thắng", "Bộ", 58000, 38000],
    ["BUGI-NGK-C7HSA", "Bugi NGK C7HSA", "Bugi", "Cái", 24000, 16000],
    ["VOR-70-90-17", "Vỏ ruột trước 70/90-17", "Vỏ – ruột xe", "Bộ", 285000, 215000],
    ["ACQ-GS-3A", "Bình ắc quy GS GTZ3S", "Bình ắc quy", "Cái", 350000, 270000],
    ["DCR-743", "Dây curoa CVT 743 Lead", "Dây curoa", "Sợi", 168000, 122000],
    ["BDN-6203", "Bạc đạn 6203 2RS", "Bạc đạn", "Cái", 24000, 15500],
    ["NHOT-CT-1L", "Nhớt Castrol Power1 10W40 1L", "Nhớt", "Chai", 115000, 85000],
    ["GDX-WINKER-LED", "Đèn xi nhan LED phổ thông cặp", "Gương – đèn", "Cặp", 95000, 66000],
    ["PXG-TRUOC-WAVE", "Phuộc trước Wave RSX", "Phuộc – giảm xóc", "Bộ", 260000, 195000],
    ["OCV-M10X30", "Ốc vít M10x30 inox bộ 10", "Ốc vít – phụ kiện", "Hộp", 38000, 24000],
    ["DDI-RL-24V", "Rơ le xi nhan 3 chân", "Dây điện – rơ le", "Cái", 32000, 20000],
    ["YEM-VISION-SAU", "Yếm sau Vision đời 2018", "Yếm – nhựa", "Cái", 165000, 118000],
    ["LGD-PCX160", "Lọc gió dầu PCX 160", "Lọc gió", "Cái", 88000, 62000],
    ["BT-DIA-SAU-NVX", "Bố thắng đĩa sau NVX", "Bố thắng", "Bộ", 92000, 64000],
    ["NSD-428-FUTURE", "Nhông sên dĩa 428 Future", "Nhông sên dĩa", "Bộ", 205000, 150000],
    ["BUGI-NGK-CR7HSA", "Bugi NGK CR7HSA", "Bugi", "Cái", 30000, 20000],
    ["VOR-100-90-14", "Vỏ ruột sau 100/90-14", "Vỏ – ruột xe", "Bộ", 360000, 275000],
    ["ACQ-DELKOR-6A", "Bình ắc quy Delkor 6 bình", "Bình ắc quy", "Cái", 520000, 405000],
    ["DCR-729", "Dây curoa CVT 729 Click", "Dây curoa", "Sợi", 158000, 114000],
    ["BDN-6301", "Bạc đạn 6301 2RS", "Bạc đạn", "Cái", 20000, 13000],
    ["NHOT-REPSOL-1L", "Nhớt Repsol Moto 4T 1L", "Nhớt", "Chai", 125000, 92000],
    ["GDX-GUONG-SH", "Gương chiếu hậu SH Mode cặp", "Gương – đèn", "Cặp", 175000, 128000],
    ["PXG-SAU-EXCITER", "Phuộc sau Exciter 150 đơn", "Phuộc – giảm xóc", "Bộ", 480000, 370000],
    ["OCV-BULONG-M12", "Bu lông M12x40 bộ 5", "Ốc vít – phụ kiện", "Hộp", 45000, 29000],
    ["DDI-COIL-CDI", "Cuộn IC CDI phổ thông", "Dây điện – rơ le", "Cái", 220000, 165000],
    ["YEM-JUPITER-TRUOC", "Yếm trước Jupiter FI", "Yếm – nhựa", "Cái", 152000, 108000],
    ["LGPCX-3", "Lọc gió giấy cao cấp đa năng", "Lọc gió", "Cái", 62000, 44000],
    ["BT-SAU-VARIO", "Bố thắng sau Vario 150", "Bố thắng", "Bộ", 78000, 52000],
    ["NSD-428-2K", "Nhông xích 428 loại 2K", "Nhông sên dĩa", "Bộ", 168000, 124000],
    ["BUGI-DENSO-X24", "Bugi Denso X24EPR-U9", "Bugi", "Cái", 40000, 27000],
    ["VOR-80-90-17", "Vỏ ruột trước 80/90-17", "Vỏ – ruột xe", "Bộ", 295000, 222000]
  ];

  var products = PRODUCT_SEED.map(function (row, idx) {
    var code = row[0];
    var name = row[1];
    var group = row[2];
    var unit = row[3];
    var sellPrice = row[4];
    var costPrice = row[5];
    // Kịch bản đặc biệt theo vị trí để đủ các nhóm must_haves.
    var stockK1 = 20 + ((idx * 7) % 60);
    var stockK2 = 10 + ((idx * 5) % 40);
    var minLevel = 10 + (idx % 5) * 4;
    var status = "dang_kd";
    var flags = [];

    if (idx < 6) { stockK1 = 0; stockK2 = 0; flags.push("am"); } // >=6 mã tồn <=0
    if (idx >= 6 && idx < 14) { stockK1 = Math.max(1, minLevel - 4); flags.push("duoi_dinh_muc"); } // >=8 dưới định mức
    if (idx >= 40 && idx < 45) { flags.push("khong_luan_chuyen"); } // >=5 mã không luân chuyển
    if (idx === 2) { flags.push("goi_y_gop"); } // VITAL165 <-> VITAL165-2
    if (idx === 32) { flags.push("goi_y_gop"); }
    if (idx % 17 === 0 && idx > 0) { status = "ngung_kd"; }
    if (idx % 23 === 0 && idx > 0) { flags.push("can_ra_soat"); }

    return {
      id: "sp-" + (idx + 1),
      code: code,
      name: name,
      group: group,
      unit: unit,
      stage: STAGES[idx % STAGES.length],
      sellPrice: sellPrice,
      costPrice: costPrice,
      minLevel: minLevel,
      defaultWarehouse: idx % 2 === 0 ? "k1" : "k2",
      status: status,
      flags: flags,
      stock: { k1: stockK1, k2: stockK2 }
    };
  });

  // ---- Đối tác (>=25) ----
  var PARTNER_SEED = [
    ["NCC001", "Nhà máy Vũ Trụ L.An", "ncc"],
    ["NCC002", "Cty TNHH Phụ Tùng Đông Á", "ncc"],
    ["NCC003", "Cty TNHH Thành Phát Motor", "ncc"],
    ["NCC004", "DNTN Phụ Tùng Minh Khang", "ncc"],
    ["NCC005", "Cty CP Phụ Tùng Sài Gòn", "ncc"],
    ["NCC006", "Cty TNHH Sản Xuất Bảo Long", "ncc"],
    ["NCC007", "Cửa hàng Phụ Tùng Anh Dũng", "ncc"],
    ["NCC008", "Cty TNHH XNK Hoàng Gia", "ncc"],
    ["NCC009", "Đại lý Phụ Tùng Kim Sơn", "ncc"],
    ["NCC010", "Cty TNHH Việt Thắng Motor", "ncc"],
    ["KH001", "Khách lẻ", "khach"],
    ["KH002", "Cửa hàng Xe Máy Thanh Tùng", "khach"],
    ["KH003", "Tiệm Sửa Xe Ba Bảo", "khach"],
    ["KH004", "Cửa hàng Phụ Tùng Kim Ngân", "khach"],
    ["KH005", "Garage Anh Tuấn", "khach"],
    ["KH006", "Tiệm Xe Cô Ba", "khach"],
    ["KH007", "Cửa hàng Xe Máy Phát Đạt", "khach"],
    ["KH008", "Garage Chú Bảy", "khach"],
    ["KH009", "Tiệm Sửa Xe Minh Tâm", "khach"],
    ["KH010", "Cửa hàng Xe Máy Hưng Thịnh", "khach"],
    ["KH011", "Garage Nam Phong", "khach"],
    ["KH012", "Tiệm Xe Út Nhỏ", "khach"],
    ["KH013", "Cửa hàng Phụ Tùng Đại Lộc", "khach"],
    ["KH014", "Garage Tấn Phát", "khach"],
    ["DT001", "Cty TNHH Xe Máy Toàn Thắng", "ca_hai"],
    ["DT002", "Cửa hàng Phụ Tùng Song Long", "ca_hai"],
    ["DT003", "Garage Đức Anh", "ca_hai"]
  ];
  var partners = PARTNER_SEED.map(function (row, idx) {
    return {
      id: "dt-" + (idx + 1),
      code: row[0],
      name: row[1],
      type: row[2],
      phone: "09" + (10000000 + idx * 137).toString().slice(0, 8),
      address: "Số " + (idx + 1) + ", đường " + GROUPS[idx % GROUPS.length] + ", Q. Bình Tân, TP.HCM",
      status: "hoat_dong",
      note: ""
    };
  });

  function docNo(prefix, seq) {
    return prefix + "26-" + String(seq).padStart(6, "0");
  }

  function findProduct(code) {
    for (var i = 0; i < products.length; i++) {
      if (products[i].code === code) return products[i];
    }
    return products[0];
  }

  function makeLines(codes, qtyBase) {
    return codes.map(function (code, i) {
      var p = findProduct(code);
      var qty = qtyBase[i] !== undefined ? qtyBase[i] : (i + 1) * 2;
      return {
        productId: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        warehouse: p.defaultWarehouse,
        qty: qty,
        price: p.costPrice
      };
    });
  }

  var receipts = [];
  for (var r = 1; r <= 14; r++) {
    var codes = [products[(r * 3) % products.length].code, products[(r * 3 + 1) % products.length].code, products[(r * 3 + 2) % products.length].code];
    receipts.push({
      id: "pn-" + r,
      soCt: docNo("PN", r),
      loaiCt: "NHAP",
      ngay: "2026-09-" + String((r % 20) + 1).padStart(2, "0"),
      nguon: r % 5 === 0 ? "Trả hàng nhập lại" : "Mua hàng",
      doiTacId: partners[r % 10].id,
      doiTacTen: partners[r % 10].name,
      kho: r % 2 === 0 ? "k1" : "k2",
      trangThai: r <= 2 ? "NHAP_LIEU" : (r === 3 ? "DA_HUY" : "HOAN_THANH"),
      nguoiTao: USERS[1].fullName,
      lines: makeLines(codes, [10, 20, 15])
    });
  }

  var issues = [];
  for (var x = 1; x <= 22; x++) {
    var xcodes = [products[(x * 5) % products.length].code, products[(x * 5 + 1) % products.length].code];
    var overStock = x % 6 === 0;
    var lines = makeLines(xcodes, overStock ? [500, 3] : [3, 5]);
    issues.push({
      id: "px-" + x,
      soCt: docNo("PX", x),
      loaiCt: "XUAT",
      ngay: "2026-09-" + String((x % 20) + 1).padStart(2, "0"),
      nguoiNhan: partners[10 + (x % 14)].name,
      doiTacId: partners[10 + (x % 14)].id,
      donGocId: x % 4 === 0 ? "dh-" + ((x % 10) + 1) : null,
      kho: x % 2 === 0 ? "k1" : "k2",
      trangThai: x <= 3 ? "NHAP_LIEU" : (x === 4 ? "DA_HUY" : "HOAN_THANH"),
      nguoiTao: USERS[2].fullName,
      lyDoXuatAm: overStock ? "Hàng đã về, chưa nhập phiếu" : null,
      lines: lines
    });
  }

  var orders = [];
  for (var o = 1; o <= 12; o++) {
    var ocodes = [products[(o * 4) % products.length].code, products[(o * 4 + 1) % products.length].code, products[(o * 4 + 2) % products.length].code, products[(o * 4 + 3) % products.length].code];
    var lines2 = makeLines(ocodes, [5, 3, 7, 2]).map(function (l) {
      return Object.assign({ shipped: 0 }, l);
    });
    var state = o <= 2 ? "TAM" : (o <= 4 ? "DA_XAC_NHAN" : "HOAN_THANH");
    if (state !== "TAM") {
      lines2.forEach(function (l) { l.shipped = state === "HOAN_THANH" ? l.qty : Math.floor(l.qty / 2); });
    }
    orders.push({
      id: "dh-" + o,
      soCt: docNo("DH", o),
      ngayDon: "2026-09-" + String((o % 20) + 1).padStart(2, "0"),
      ngayGiao: "2026-09-" + String(((o + 5) % 25) + 1).padStart(2, "0"),
      nguoiNhan: partners[10 + (o % 14)].name,
      doiTacId: partners[10 + (o % 14)].id,
      kho: o % 2 === 0 ? "k1" : "k2",
      trangThai: state,
      nguoiTao: USERS[1].fullName,
      lines: lines2
    });
  }

  var returns = [
    { id: "tn-1", soCt: docNo("TN", 1), loaiCt: "TRA_NCC", ngay: "2026-09-05", chungTuGoc: "PN26-000002", doiTacTen: partners[0].name, kho: "k1", trangThai: "HOAN_THANH", nguoiTao: USERS[1].fullName, lines: makeLines([products[0].code], [3]) },
    { id: "tk-1", soCt: docNo("TK", 1), loaiCt: "TRA_KHACH", ngay: "2026-09-06", chungTuGoc: "PX26-000001", doiTacTen: partners[10].name, kho: "k1", trangThai: "HOAN_THANH", nguoiTao: USERS[1].fullName, lines: makeLines([products[1].code], [1]) },
    { id: "tn-2", soCt: docNo("TN", 2), loaiCt: "TRA_NCC", ngay: "2026-09-10", chungTuGoc: "PN26-000004", doiTacTen: partners[2].name, kho: "k2", trangThai: "NHAP_LIEU", nguoiTao: USERS[2].fullName, lines: makeLines([products[3].code], [2]) },
    { id: "tk-2", soCt: docNo("TK", 2), loaiCt: "TRA_KHACH", ngay: "2026-09-12", chungTuGoc: "PX26-000003", doiTacTen: partners[11].name, kho: "k1", trangThai: "DA_HUY", nguoiTao: USERS[1].fullName, lines: makeLines([products[4].code], [1]) }
  ];

  var transfers = [
    { id: "ck-1", soCt: docNo("CK", 1), ngay: "2026-09-08", khoDi: "k1", khoDen: "k2", trangThai: "HOAN_THANH", nguoiTao: USERS[1].fullName, lines: makeLines([products[5].code, products[6].code], [10, 6]) },
    { id: "ck-2", soCt: docNo("CK", 2), ngay: "2026-09-14", khoDi: "k2", khoDen: "k1", trangThai: "HOAN_THANH", nguoiTao: USERS[1].fullName, lines: makeLines([products[7].code], [4]) },
    { id: "ck-3", soCt: docNo("CK", 3), ngay: "2026-09-18", khoDi: "k1", khoDen: "k2", trangThai: "NHAP_LIEU", nguoiTao: USERS[2].fullName, lines: makeLines([products[8].code], [8]) }
  ];

  var stocktakes = [
    {
      id: "kk-1", soCt: docNo("KK", 1), ngay: "2026-09-15", kho: "k1", trangThai: "dang_dem", nguoiTao: USERS[2].fullName,
      lines: products.slice(0, 20).map(function (p) { return { productId: p.id, code: p.code, name: p.name, soSach: p.stock.k1, thucDem: null }; })
    },
    {
      id: "kk-2", soCt: docNo("KK", 2), ngay: "2026-09-02", kho: "k2", trangThai: "da_duyet", nguoiTao: USERS[2].fullName, phieuDieuChinh: docNo("DC", 1),
      lines: products.slice(20, 40).map(function (p, i) { return { productId: p.id, code: p.code, name: p.name, soSach: p.stock.k2, thucDem: p.stock.k2 + ((i % 5 === 0) ? -2 : (i % 7 === 0 ? 3 : 0)) }; })
    }
  ];

  var movements = [];
  [products[0], products[1], products[2]].forEach(function (p, pi) {
    var running = 0;
    for (var m = 1; m <= 6; m++) {
      var isIn = m % 2 === 1;
      var qty = 5 + m;
      running += isIn ? qty : -qty;
      movements.push({
        productId: p.id,
        code: p.code,
        thoiGian: "2026-09-" + String(m + pi).padStart(2, "0") + "T0" + m + ":00:00",
        nguon: isIn ? "NHAP" : "XUAT",
        soCt: docNo(isIn ? "PN" : "PX", m + pi),
        kho: "k1",
        doiTac: isIn ? partners[pi].name : partners[10 + pi].name,
        nhap: isIn ? qty : 0,
        xuat: isIn ? 0 : qty,
        tonLuyKe: running,
        giaVon: p.costPrice,
        isReversal: false
      });
    }
    // Một dòng đảo cho phiếu đã hủy — bút toán đảo, không xóa dòng gốc.
    running += 4;
    movements.push({
      productId: p.id,
      code: p.code,
      thoiGian: "2026-09-20T09:00:00",
      nguon: "DIEU_CHINH",
      soCt: docNo("PN", 99) + " (đảo do hủy)",
      kho: "k1",
      doiTac: "Bút toán đảo",
      nhap: 4,
      xuat: 0,
      tonLuyKe: running,
      giaVon: p.costPrice,
      isReversal: true
    });
  });

  var negativeReasons = [
    { code: "tach_ma", label: "Mã bị tách / xuất nhầm mã" },
    { code: "hang_chua_nhap", label: "Hàng đã về, chưa nhập phiếu" },
    { code: "cho_kiem_ke", label: "Lệch tồn, chờ kiểm kê" },
    { code: "khac", label: "Khác" }
  ];

  var docNumbering = {
    NHAP: { prefix: "PN", digits: 6 },
    XUAT: { prefix: "PX", digits: 6 },
    TRA_NCC: { prefix: "TN", digits: 6 },
    TRA_KHACH: { prefix: "TK", digits: 6 },
    CHUYEN_KHO: { prefix: "CK", digits: 6 },
    KIEM_KE: { prefix: "KK", digits: 6 },
    DIEU_CHINH: { prefix: "DC", digits: 6 },
    DON_HANG: { prefix: "DH", digits: 6 }
  };

  var auditLog = [
    { thoiGian: "2026-09-19T08:12:00", nguoiSua: USERS[1].fullName, doiTuong: "Phiếu nhập PN26-000005", truong: "kho", cu: "Kho 1", moi: "Kho 2" },
    { thoiGian: "2026-09-19T09:40:00", nguoiSua: USERS[0].fullName, doiTuong: "Mã hàng LGPCX", truong: "gia_ban", cu: "42.000", moi: "45.000" },
    { thoiGian: "2026-09-20T10:05:00", nguoiSua: USERS[1].fullName, doiTuong: "Đơn đặt hàng DH26-000003", truong: "trang_thai", cu: "TAM", moi: "DA_XAC_NHAN" }
  ];

  var mergeProposals = [];

  window.KMV_DATA = {
    warehouses: WAREHOUSES,
    roles: ROLES,
    users: USERS,
    groups: GROUPS,
    units: UNITS,
    stages: STAGES,
    products: products,
    partners: partners,
    receipts: receipts,
    issues: issues,
    orders: orders,
    returns: returns,
    transfers: transfers,
    stocktakes: stocktakes,
    movements: movements,
    negativeReasons: negativeReasons,
    docNumbering: docNumbering,
    auditLog: auditLog,
    mergeProposals: mergeProposals,
    findProduct: findProduct,
    docNo: docNo
  };
})();
