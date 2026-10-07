import { redirect } from "next/navigation";

// Bỏ màn Chức vụ từ 0117 — quyền tích theo từng người ở màn Người dùng.
export default function Page() {
  redirect("/cai-dat/nguoi-dung");
}
