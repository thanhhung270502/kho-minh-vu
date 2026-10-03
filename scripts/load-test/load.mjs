// Load test: closed-loop, không think time, tăng VU theo bậc. Chạy qua run.sh
// (nạp dữ liệu LOADTEST trước, dọn sau) — không gọi trực tiếp.
//   node scripts/load-test/load.mjs 5:30 10:45 25:45 ...   (vu:giây)
// Env: SUPABASE_URL, ANON_KEY, SEED_PASSWORD, SITE
import { createServerClient } from "@supabase/ssr";

const URL_ = process.env.SUPABASE_URL;
const ANON = process.env.ANON_KEY;
const SITE = process.env.SITE ?? "https://kho-minh-vu.vercel.app";
const PASS = process.env.SEED_PASSWORD;
const MIX = { read: 0.7, write: 0.2, page: 0.1 };
const TERMS = [
  "bi",
  "nhong",
  "xich",
  "loc",
  "phanh",
  "den",
  "ga",
  "vo",
  "ruot",
  "bugi",
];

const stages = process.argv.slice(2).map((s) => {
  const [v, t] = s.split(":").map(Number);
  return { vus: v, secs: t };
});

// Cookie phiên phải do chính @supabase/ssr sinh ra thì proxy.ts mới nhận.
async function login(email) {
  const jar = new Map();
  const sb = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cs) => cs.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: PASS,
  });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return {
    access_token: data.session.access_token,
    cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; "),
  };
}

let stats; // op -> {lat:[], err:0, samples:[]}
function rec(op, ms, ok, why) {
  const s = (stats[op] ??= { lat: [], err: 0, samples: new Map() });
  s.lat.push(ms);
  if (!ok) {
    s.err++;
    s.samples.set(why, (s.samples.get(why) ?? 0) + 1);
  }
}

async function call(op, url, init) {
  const t = performance.now();
  try {
    const r = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(30000),
    });
    const body = await r.text();
    const ms = performance.now() - t;
    const ok = r.status >= 200 && r.status < 300;
    let why = String(r.status);
    if (!ok) {
      try {
        const j = JSON.parse(body);
        why += " " + (j.code ?? "") + " " + (j.message ?? "").slice(0, 60);
      } catch {}
    }
    rec(op, ms, ok, why);
    if (!ok) throw new Error(why);
    return body ? JSON.parse(body.startsWith("<") ? "null" : body) : null;
  } catch (e) {
    if (!(e instanceof Error && /^\d{3}/.test(e.message)))
      rec(op, performance.now() - t, false, e.name);
    throw e;
  }
}

const rest = (acc, path, method = "GET", body, extra = {}) => ({
  method,
  headers: {
    apikey: ANON,
    authorization: `Bearer ${acc.access_token}`,
    "content-type": "application/json",
    ...extra,
  },
  body: body ? JSON.stringify(body) : undefined,
});
const rpc = (op, acc, fn, args) =>
  call(op, `${URL_}/rest/v1/rpc/${fn}`, rest(acc, "", "POST", args));

let ctx;
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function readJourney(acc) {
  await rpc("danh_sach_san_pham", acc, "danh_sach_san_pham", {
    p_trang: 1 + Math.floor(Math.random() * 5),
    p_kich_thuoc: 50,
  });
  await rpc("tim_san_pham", acc, "tim_san_pham", {
    p_tu_khoa: pick(TERMS),
    p_gioi_han: 20,
  });
  await rpc("danh_sach_chung_tu", acc, "danh_sach_chung_tu", {
    p_loai_ct: "XUAT",
    p_trang: 1,
    p_kich_thuoc: 20,
  });
  await rpc("chi_tiet_san_pham", acc, "chi_tiet_san_pham", {
    p_id: pick(ctx.products),
  });
}

async function writeJourney(acc) {
  const soCt = await rpc("sinh_so_ct", acc, "sinh_so_ct", { p_loai: "XUAT" });
  const [ct] = await call(
    "insert chung_tu",
    `${URL_}/rest/v1/chung_tu?select=id`,
    rest(
      acc,
      "",
      "POST",
      { so_ct: soCt, loai_ct: "XUAT", kho_id: ctx.k1, doi_tac_id: ctx.partner },
      { prefer: "return=representation" },
    ),
  );
  const lines = [...ctx.products].sort(() => Math.random() - 0.5).slice(0, 5);
  for (const sp of lines) {
    await call(
      "insert dong",
      `${URL_}/rest/v1/chung_tu_dong?select=id`,
      rest(
        acc,
        "",
        "POST",
        {
          chung_tu_id: ct.id,
          san_pham_id: sp,
          so_luong: 1,
          don_gia: 10000,
          thanh_tien: 10000,
          kho_id: ctx.k1,
        },
        { prefer: "return=representation" },
      ),
    );
  }
  await rpc("ghi_so_chung_tu", acc, "ghi_so_chung_tu", {
    p_chung_tu_id: ct.id,
  });
}

async function pageJourney(acc) {
  await call("page /duyet-don", `${SITE}/duyet-don`, {
    headers: { cookie: acc.cookie },
  });
}

async function vu(stopAt) {
  while (performance.now() < stopAt) {
    const r = Math.random();
    try {
      if (r < MIX.read) await readJourney(pick(ctx.readers));
      else if (r < MIX.read + MIX.write) await writeJourney(pick(ctx.writers));
      else await pageJourney(pick(ctx.readers));
    } catch {
      /* đã ghi nhận */
    }
  }
}

const pct = (a, p) =>
  a.length ? a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0;

async function main() {
  const emails = {
    reader: [
      "quanly@khominhvu.local",
      "vanphong@khominhvu.local",
      "thukho1@khominhvu.local",
      "chixem@khominhvu.local",
    ],
    writer: ["vanphong@khominhvu.local", "thukho1@khominhvu.local"],
  };
  const sess = {};
  for (const e of new Set([...emails.reader, ...emails.writer])) {
    sess[e] = await login(e);
  }
  ctx = {
    readers: emails.reader.map((e) => sess[e]),
    writers: emails.writer.map((e) => sess[e]),
  };
  stats = {};
  const found = await rpc("_", ctx.writers[0], "tim_san_pham", {
    p_tu_khoa: "LOADTEST",
    p_gioi_han: 100,
  });
  ctx.products = found
    .filter((p) => (p.ma_hang ?? "").startsWith("LOADTEST-"))
    .map((p) => p.id);
  const dt = await rpc("_", ctx.writers[0], "danh_sach_doi_tac", {
    p_tu_khoa: "LOADTEST",
    p_kich_thuoc: 5,
  });
  ctx.partner = dt?.[0]?.id;
  const kho = await call(
    "_",
    `${URL_}/rest/v1/kho?ma=eq.K1&select=id`,
    rest(ctx.writers[0]),
  );
  ctx.k1 = kho?.[0]?.id;
  console.log(
    `đăng nhập ${Object.keys(sess).length} tài khoản, ${ctx.products.length} mã test, khách test ${ctx.partner ? "ok" : "THIẾU"}, kho K1 ${ctx.k1 ? "ok" : "THIẾU"}`,
  );
  if (ctx.products.length < 5 || !ctx.partner || !ctx.k1)
    throw new Error("thiếu dữ liệu LOADTEST — chạy setup.sql trước");

  const summary = [];
  for (const st of stages) {
    stats = {};
    const t0 = performance.now();
    await Promise.all(
      Array.from({ length: st.vus }, () => vu(t0 + st.secs * 1000)),
    );
    const dur = (performance.now() - t0) / 1000;
    console.log(`\n=== ${st.vus} VU · ${dur.toFixed(0)}s ===`);
    let tot = 0,
      err = 0;
    for (const [op, s] of Object.entries(stats)) {
      if (op === "_") continue;
      s.lat.sort((a, b) => a - b);
      tot += s.lat.length;
      err += s.err;
      console.log(
        `${op.padEnd(20)} n=${String(s.lat.length).padStart(5)} rps=${(s.lat.length / dur).toFixed(1).padStart(6)} p50=${pct(s.lat, 50).toFixed(0).padStart(5)} p95=${pct(s.lat, 95).toFixed(0).padStart(5)} p99=${pct(s.lat, 99).toFixed(0).padStart(5)} err=${s.err}${s.err ? " " + JSON.stringify([...s.samples].slice(0, 3)) : ""}`,
      );
    }
    const ghi = stats["ghi_so_chung_tu"];
    const row = {
      vus: st.vus,
      rps: +(tot / dur).toFixed(1),
      errPct: +((100 * err) / Math.max(tot, 1)).toFixed(2),
      ghiSoPerMin: ghi
        ? +((60 * (ghi.lat.length - ghi.err)) / dur).toFixed(0)
        : 0,
      p95_ds: pct(stats["danh_sach_san_pham"]?.lat ?? [], 95) | 0,
      p95_ghi: pct(ghi?.lat ?? [], 95) | 0,
      p95_page: pct(stats["page /duyet-don"]?.lat ?? [], 95) | 0,
    };
    summary.push(row);
    console.log(
      `TỔNG rps=${row.rps} lỗi=${row.errPct}% phiếu ghi sổ/phút=${row.ghiSoPerMin}`,
    );
    if (row.errPct > 20) {
      console.log("Lỗi >20% — dừng tăng tải");
      break;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log("\nSUMMARY " + JSON.stringify(summary));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
