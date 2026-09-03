import type { ThreadListQuery, ThreadSort } from "./types";

const sorts = new Set<ThreadSort>(["date", "from", "subject"]);

export function threadQueryFromSearch(params: URLSearchParams): ThreadListQuery {
  const sort = params.get("sort");
  const order = params.get("order");
  const limit = Number(params.get("limit"));
  const offset = Number(params.get("offset"));
  return {
    q: params.get("q") ?? undefined,
    unread: params.get("unread") === "1",
    hasAttachment: params.get("hasAttachment") === "1",
    sort: sorts.has(sort as ThreadSort) ? (sort as ThreadSort) : "date",
    order: order === "asc" ? "asc" : "desc",
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  };
}

export function threadQueryToSearch(query: ThreadListQuery) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.unread) params.set("unread", "1");
  if (query.hasAttachment) params.set("hasAttachment", "1");
  if (query.sort && query.sort !== "date") params.set("sort", query.sort);
  if (query.order === "asc") params.set("order", "asc");
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  return params;
}

export function pageSearchToParams(
  search: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params;
}
