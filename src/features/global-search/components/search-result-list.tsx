"use client";

import type { GlobalSearchResult } from "../types";
import {
  DOCUMENT_TYPE_LABELS,
  searchResultHref,
  type SearchGroup,
} from "../lib/search-results";

type SearchResultListProps = {
  groups: SearchGroup[];
  activeKey: string | null;
  onPick: (item: GlobalSearchResult) => void;
  onHover: (key: string) => void;
};

function secondaryText(item: GlobalSearchResult): string | null {
  if (item.kind === "document") {
    const type = item.documentType
      ? (DOCUMENT_TYPE_LABELS[item.documentType] ?? item.documentType)
      : null;
    return [type, item.hint].filter(Boolean).join(" · ") || null;
  }
  return item.hint;
}

export function SearchResultList({ groups, activeKey, onPick, onHover }: SearchResultListProps) {
  return (
    <ul role="listbox" className="m-0 list-none p-0 pb-2">
      {groups.map((group) => (
        <li key={group.kind} role="presentation">
          <div className="px-3 pt-3 pb-1 text-[12.5px] font-semibold text-trung-tinh-350">
            {group.title}
          </div>
          <ul role="presentation" className="m-0 list-none p-0">
            {group.items
              .filter((item) => searchResultHref(item) !== null)
              .map((item) => {
                const isActive = item.key === activeKey;
                const secondary = secondaryText(item);
                return (
                  <li
                    key={item.key}
                    id={`kq-${item.key}`}
                    role="option"
                    aria-selected={isActive}
                    className={`flex cursor-pointer items-baseline gap-3 px-3 py-2 ${isActive ? "bg-nen-phu" : ""}`}
                    onMouseEnter={() => onHover(item.key)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onPick(item);
                    }}
                  >
                    <span className={item.kind === "partner" ? "text-sm" : "font-mono text-sm"}>
                      {item.label}
                    </span>
                    {secondary ? (
                      <span className="truncate text-[13.5px] text-trung-tinh-350">{secondary}</span>
                    ) : null}
                  </li>
                );
              })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
