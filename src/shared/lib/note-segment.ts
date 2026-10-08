// File thuần (bẫy 9): component client và scripts cùng import.
// Chứng từ nạp từ KiotViet ghi thêm thông tin vào ghi chú dạng "… · Người nhập: X" hay
// "… · Người bán: X". Tách đoạn đó ra để hiện ở ô riêng và không lặp trong ô ghi chú.

export type NoteSegment = {
  /** Giá trị sau nhãn, vd. "Minh Nhi"; null nếu ghi chú không có đoạn này. */
  value: string | null;
  /** Nguyên đoạn "Nhãn: X" — ghép lại khi lưu ghi chú để không mất. */
  segment: string;
  /** Ghi chú còn lại, hiện trong ô ghi chú. */
  rest: string;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function splitNoteSegment(note: string | null, label: string): NoteSegment {
  const match = note?.match(new RegExp(`(?:\\s*·\\s*)?${escapeRegExp(label)}:\\s*([^\\n·]+)`));
  if (!note || !match) return { value: null, segment: "", rest: note ?? "" };
  return {
    value: match[1]?.trim() || null,
    segment: match[0].replace(/^\s*·\s*/, ""),
    rest: note.replace(match[0], "").replace(/^\s*·\s*/, "").trim(),
  };
}

/** Ghép phần người dùng sửa với đoạn đã tách ra; rỗng → null. */
export function joinNoteSegment(text: string | null, segment: string): string | null {
  return [text, segment].filter(Boolean).join(" · ") || null;
}
