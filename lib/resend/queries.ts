import { sql } from "drizzle-orm";
import type { MailViewId, ThreadListQuery } from "../mail/types";

// Keep bodies and attachment bytes in Postgres during mailbox refreshes. Only
// the requested page and scalar counts should cross the database connection.
export function threadListQuery(
  userId: string,
  folder: MailViewId,
  query: ThreadListQuery = {},
) {
  const wanted = folder === "smart" ? "inbox" : folder;
  const conditions = [sql`m.user_id = ${userId}`, sql`m.folder = ${wanted}`];
  if (folder === "smart" || query.unread) conditions.push(sql`m.unread = true`);
  if (query.q) {
    conditions.push(sql`strpos(lower(m.subject || ' ' || coalesce(m.text, '')), lower(${query.q})) > 0`);
  }
  const direction = query.order === "asc" ? sql`asc` : sql`desc`;
  const sort = query.sort === "from"
    ? sql`sender->>'email'`
    : query.sort === "subject"
      ? sql`coalesce(nullif(subject, ''), '(no subject)')`
      : sql`received_at`;
  const limit = Math.min(50, Math.max(1, query.limit ?? 30));
  const offset = Math.max(0, query.offset ?? 0);

  return sql`
    with matching as (
      select m.id, m.thread_id, m.folder, m.subject, m."from" as sender,
        m.received_at,
        row_number() over conversation as position,
        count(*) over (partition by m.thread_id) as message_count,
        bool_or(m.unread) over (partition by m.thread_id) as unread
      from hosted_messages m
      where ${sql.join(conditions, sql` and `)}
      window conversation as (partition by m.thread_id order by m.received_at desc, m.id desc)
    ), threads as (
      select *, exists (
        select 1 from hosted_attachments a
        join hosted_messages owner on owner.id = a.message_id
        where owner.user_id = ${userId} and owner.thread_id = matching.thread_id
          and owner.folder = ${wanted} and not a.inline
      ) as has_attachment
      from matching where position = 1
    ), filtered as (
      select * from threads ${query.hasAttachment ? sql`where has_attachment` : sql``}
    ), page as (
      select * from filtered order by ${sort} ${direction}, thread_id asc
      limit ${limit} offset ${offset}
    )
    select
      (select count(*)::int from filtered) as total,
      (select count(*)::int from filtered where unread) as unread,
      coalesce((select jsonb_agg(jsonb_build_object(
        'id', thread_id, 'draftId', case when folder = 'drafts' then id end,
        'folder', folder, 'subject', coalesce(nullif(subject, ''), '(no subject)'),
        'from', sender, 'date', to_char(received_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'snippet', left(rtrim(regexp_replace(
          regexp_replace(coalesce((select body.text from hosted_messages body where body.id = page.id), ''),
            ${'(^|[\r\n])[ \t]*(On [^\r\n]+wrote:[ \t]*([\r\n]|$)|>).*'}, '', 'is'),
          ${'\\s+'}, ' ', 'g')), 180),
        'unread', unread, 'hasAttachment', has_attachment, 'messageCount', message_count
      ) order by ${sort} ${direction}, thread_id asc) from page), '[]'::jsonb) as threads
  `;
}

export function folderCountsQuery(userId: string) {
  return sql`select folder, count(distinct thread_id)::int as unread
    from hosted_messages where user_id = ${userId} and unread = true group by folder`;
}

export function collectionCountsQuery(userId: string) {
  return sql`select c.id, c.name, count(distinct m.thread_id)::int as total,
      count(distinct m.thread_id) filter (where m.unread)::int as unread
    from hosted_collections c
    left join hosted_messages m on m.user_id = c.user_id and m.folder = 'collection:' || c.id
    where c.user_id = ${userId} group by c.id, c.name order by c.name`;
}

export function threadAttachmentsQuery(userId: string, messageIds: string[]) {
  return sql`select a.id, a.message_id as "messageId", a.filename,
      a.mime_type as "mimeType", a.size, a.content_id as "contentId", a.inline,
      case when m.folder = 'drafts' then a.content else null end as content
    from hosted_attachments a join hosted_messages m on m.id = a.message_id
    where m.user_id = ${userId} and a.message_id in (${sql.join(messageIds.map((id) => sql`${id}`), sql`, `)})`;
}
