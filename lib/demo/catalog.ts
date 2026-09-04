import type { Address, Attachment, Message, ThreadDetail } from "@/lib/mail/types";

/** Stands in for whoever is signed in; the demo provider swaps it at read time. */
export const OWNER_EMAIL = "ada@redakt.local";

const ada: Address = { name: "Ada Meridian", email: OWNER_EMAIL };

type Body = { html?: string; text?: string; snippet?: string };

type Seed = Body & {
  id: string;
  folder?: ThreadDetail["folder"];
  subject: string;
  from: Address;
  to?: Address[];
  cc?: Address[];
  date: string;
  unread?: boolean;
  attachments?: Attachment[];
  replies?: Array<Body & { from: Address; date: string }>;
};

/** Real mail previews are the opening line, not a hand-written summary. */
function preview(body: Body) {
  if (body.snippet) return body.snippet;
  const source = body.text ?? body.html ?? "";
  const flat = source
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 140 ? `${flat.slice(0, 140).trimEnd()}…` : flat;
}

function thread(seed: Seed): ThreadDetail {
  const to = seed.to ?? [ada];
  const first: Message = {
    id: `msg_${seed.id}_0`,
    threadId: seed.id,
    from: seed.from,
    to,
    cc: seed.cc,
    date: seed.date,
    subject: seed.subject,
    snippet: preview(seed),
    html: seed.html,
    text: seed.text,
    attachments: seed.attachments ?? [],
  };
  const rest = (seed.replies ?? []).map((reply, index) => ({
    id: `msg_${seed.id}_${index + 1}`,
    threadId: seed.id,
    from: reply.from,
    to: reply.from.email === ada.email ? [seed.from] : [ada],
    date: reply.date,
    subject: seed.subject.startsWith("Re:") ? seed.subject : `Re: ${seed.subject}`,
    snippet: preview(reply),
    html: reply.html,
    text: reply.text,
    attachments: [] as Attachment[],
  }));
  const messages = [first, ...rest].sort((a, b) => a.date.localeCompare(b.date));
  const last = messages[messages.length - 1];
  return {
    id: seed.id,
    folder: seed.folder ?? "inbox",
    subject: seed.subject,
    from: last.from,
    snippet: last.snippet,
    date: last.date,
    unread: seed.unread ?? false,
    hasAttachment: messages.some((message) =>
      message.attachments.some((file) => !file.inline),
    ),
    messageCount: messages.length,
    messages,
  };
}

const mira: Address = { name: "Mira Chen", email: "mira@fieldnotes.co" };
const northline: Address = { name: "Northline Studio", email: "billing@northline.studio" };
const redakt: Address = { name: "Remail", email: "hello@remail.dev" };
const jordan: Address = { name: "Jordan Vale", email: "jordan@vale.design" };
const priya: Address = { name: "Priya Shah", email: "priya@orbit.systems" };
const luis: Address = { name: "Luis Ortega", email: "luis@northline.studio" };
const samir: Address = { name: "Samir Okonkwo", email: "samir@kite.legal" };
const elena: Address = { name: "Elena Voss", email: "elena@paperhour.co" };
const noah: Address = { name: "Noah Park", email: "noah@park.dev" };
const aisha: Address = { name: "Aisha Rahman", email: "aisha@lumen.mail" };
const kenji: Address = { name: "Kenji Mori", email: "kenji@mori.lab" };
const newsletter: Address = { name: "Define Weekly", email: "news@define.app" };
const noreply: Address = { name: "GitHub", email: "noreply@github.com" };
const calendar: Address = { name: "Calendar", email: "calendar@redakt.local" };

const featured: ThreadDetail[] = [
  thread({
    id: "thr_early",
    subject: "Get early access to Remail",
    from: redakt,
    date: "2026-08-31T06:56:00.000Z",
    unread: true,
    html: `<p>Hi Ada,</p>
<p>You told us back in March that you wanted a mail client that got out of the way, and that everything you'd tried either buried you in features or held your domain hostage. We've spent the last five months building the thing you described, and it's ready for you to try.</p>
<p>Remail is a work inbox for your own domain. Resend handles sending and domain-wide receiving while Remail provides reading, writing, search, and threading.</p>
<p>A few things worth knowing before you start:</p>
<ul>
  <li>Setup takes about ten minutes, most of which is waiting for DNS to propagate.</li>
  <li>We don't have a mobile app yet. The web client works on a phone, but it's not the focus.</li>
  <li>Domain-wide receiving keeps every address together in one inbox.</li>
</ul>
<p>Open <a href="https://github.com">the repository</a> if you'd rather read the code before you trust it with your mail. Everything except the hosted billing layer is open source.</p>
<p>Thanks for waiting this long.</p>
<p>— The Remail team</p>`,
  }),
  thread({
    id: "thr_welcome",
    subject: "Welcome to your inbox",
    from: redakt,
    date: "2026-08-31T14:12:00.000Z",
    unread: true,
    html: `<p>Ada —</p>
<p>This is your first mailbox, and right now it's the only thing in it. Here's what to do next.</p>
<p>Add your domain from the sidebar. We'll generate the four DNS records you need and check them every thirty seconds until they go live. Until all four are green, mail sent to your address will bounce, so don't hand it out yet.</p>
<p>Once DNS is live, send yourself a message from another account to confirm delivery end to end. If it doesn't arrive within a minute, the DNS panel will tell you which record is wrong rather than making you dig through a log.</p>
<p>Everything else can wait. You don't need to configure filters, signatures or folders to start using this.</p>
<p>— Remail</p>`,
    replies: [
      {
        from: ada,
        date: "2026-09-01T10:10:00.000Z",
        text: `Got the domain verified on the second try — the DKIM record was the one I'd fat-fingered, and the panel caught it before I'd even finished pasting.

One piece of feedback while it's fresh: the reader should feel like paper, not a settings page. Right now there's a lot of chrome around the message itself, and my eye keeps landing on the controls instead of the text. If I'm reading a long email I want the interface to disappear.

Not urgent, just noting it before I forget.

Ada`,
      },
      {
        from: redakt,
        date: "2026-09-01T11:40:00.000Z",
        html: `<p>That's the right instinct, and it's the note we hear most often from people who read a lot of long mail.</p>
<p>We're pulling the controls out of the message surface entirely in the next release — they'll live in the header and on hover, so a message at rest is just the text the sender wrote. Treating DNS as a first-class screen came from the same principle, and it's the change people notice first.</p>
<p>Keep the notes coming.</p>`,
      },
    ],
  }),
  thread({
    id: "thr_invoice",
    subject: "Invoice 1842 is ready",
    from: northline,
    date: "2026-08-30T20:40:00.000Z",
    unread: true,
    html: `<p>Hi Ada,</p>
<p>Invoice <strong>1842</strong> covering the August retainer is attached. The total is $4,200, due by 14 September on our usual net-14 terms.</p>
<p>This month breaks down as 32 hours of design work against the reader redesign, 11 hours of front-end support during the DNS onboarding rebuild, and the fixed monthly retainer. The hourly overage is slightly higher than July because of the two extra review rounds on the composer, which we flagged at the time.</p>
<p>Bank details are unchanged from last month. If your PO number has changed for the new quarter, let me know before you process it and I'll reissue rather than have your finance team amend it on their side.</p>
<p>Thanks as always,<br />Luis</p>
<p>—<br />Northline Studio · billing@northline.studio</p>`,
    attachments: [
      {
        id: "att_invoice",
        filename: "invoice-1842.pdf",
        mimeType: "application/pdf",
        size: 84200,
      },
    ],
    replies: [
      {
        from: ada,
        date: "2026-08-31T09:02:00.000Z",
        text: `Logged and approved on our side. PO-441 is still current, and it's already printed on the PDF, so nothing needs reissuing.

Finance runs payments on Thursdays, so this will land on the 10th rather than sitting until the due date.

One thing for next month: could you split the retainer and the hourly overage onto separate lines? Our books treat them as different cost centres and right now someone has to unpick it by hand.

Ada`,
      },
      {
        from: northline,
        date: "2026-08-31T16:12:00.000Z",
        html: `<p>Paid — thanks for the quick turnaround, and noted on the split. I've updated the template so September onwards will show retainer and overage as separate line items with their own subtotals.</p>
<p>Receipt is on our portal if your finance team needs it for reconciliation; I won't attach it here unless you want a copy in the thread.</p>
<p>Luis</p>`,
      },
    ],
  }),
  thread({
    id: "thr_notes",
    subject: "Notes from Thursday",
    from: mira,
    date: "2026-08-28T23:05:00.000Z",
    text: `Ada —

Writing these up while they're still fresh, because I think Thursday was the most useful two hours we've spent on this product.

Three things I don't want to lose:

1. We should treat DNS as a first-class screen, not a help article. Every competitor buries this in documentation and then acts surprised when people can't receive mail. If the first thing a new user does is a technical task, that task deserves real design attention rather than a link to a support page.

2. The reader should feel like paper, not a settings page. This is the one I keep coming back to. When you open a message you are there to read, and every control we put on that surface is competing with the sender's words. I'd rather ship a reader that looks under-designed than one that looks busy.

3. Keyboard first. Always. Not "keyboard shortcuts exist" — I mean the primary path through every flow should be reachable without touching a pointer, and we should test it that way rather than bolting shortcuts on afterwards.

The thing we didn't resolve: whether threads should collapse quoted replies by default. Jordan thinks yes, I think it hides context that people actually scan for. Worth twenty minutes next week rather than someone deciding it in a pull request.

Mira`,
  }),
  thread({
    id: "thr_design",
    subject: "Review: tab connectors",
    from: jordan,
    date: "2026-08-31T09:30:00.000Z",
    unread: true,
    html: `<p>I've pushed the first pass at the connected tabs. Worth a look before I go further, because the approach has a consequence I want to flag.</p>
<p>The active tab now merges into the pane below it rather than floating above as a separate pill. To make that read correctly, the tab has to share the pane's fill, drop its bottom corners, and overlap the pane by a pixel so no hairline draws through the join. There are small curved fillets on either side that carry the tab's edge down into the pane surface.</p>
<p>The consequence: the active tab stops being a control visually and becomes part of the pane. That's the effect we want, but it means the raised treatment we just added to tabs only applies to the inactive ones. I think that's correct — the active tab isn't something you'd click, you're already there — but it's a reversal of what we agreed last week, so I'd rather you saw it than found it.</p>
<p>Jordan</p>`,
    replies: [
      {
        from: ada,
        date: "2026-08-31T18:12:00.000Z",
        text: `Looked at it on both themes. The join itself is clean — I can't see a seam at any zoom level I tried, which is the part I expected to be fiddly.

The problem is the first tab. When the strip is flush with the pane's left edge, the left fillet has nothing to curve into, so you get a little notch of background hanging off the corner. It reads as a rendering bug rather than a deliberate shape.

I think the fix is to suppress the left fillet when the tab is first, and square off the pane's top-left corner to match, so the tab's own rounding becomes the outer corner of the whole assembly. That should make them read as one surface instead of two that happen to touch.

Agreed on the raised treatment. The active tab shouldn't look pressable.`,
      },
      {
        from: jordan,
        date: "2026-08-31T18:40:00.000Z",
        text: `Agreed on both counts, and squaring the pane corner is the part I'd have missed. Without it you'd still get a sliver of background between the tab's flat bottom edge and the pane's rounded corner, which is the same bug in a smaller form.

I'll gate it on the breakpoint rather than the tab index, since the strip isn't flush at mobile widths — the menu button sits in front of the tabs there, so the first tab does need its fillet on small screens.`,
      },
      {
        from: mira,
        date: "2026-08-31T19:01:00.000Z",
        text: `Coming in late on this one, but there's a hover problem too.

Because every tab now sits on the strip's bottom edge, an inactive tab's hover background runs straight into the pane and looks joined to it for as long as the pointer is there. Only the active tab should touch the pane. The others need to stop a few pixels short.

Worth doing carefully: if you just shrink the inactive tabs, their labels will sit on a different baseline from the active one and the text will jump when you switch tabs. The active tab needs to grow by the same amount the others give up, and pad it back so the content box is identical.`,
      },
      {
        from: ada,
        date: "2026-08-31T19:22:00.000Z",
        text: `Good catch, and the same applies to the new-tab button at the end of the strip — it's sitting flush against the pane for the same reason.

While we're in there, the mobile menu button has it too. Same row, same cause.`,
      },
      {
        from: jordan,
        date: "2026-08-31T20:10:00.000Z",
        text: `All three fixed with one clearance value shared between them, and the active tab grows and pads to match so the labels stay put. I measured the midpoints before and after to be sure.

Patch is up.`,
      },
      {
        from: priya,
        date: "2026-08-31T21:04:00.000Z",
        text: `Does this survive 320px? We've had tab strips regress at that width twice now, and both times it was the overflow behaviour rather than the tabs themselves.

Specifically I want to know what happens to the new-tab button when there are four or five tabs open on a phone. If it scrolls off the end with no affordance, people won't find it.`,
      },
      {
        from: ada,
        date: "2026-09-01T09:12:00.000Z",
        html: `<p>Checked it. The strip lets the tabs give up width first, so the new-tab button stays on screen — I measured it at x=316 in a 320px viewport with no horizontal scroll on the document.</p>
<p>One thing that did bite us: an earlier version had the strip as a scroll container, which clipped the fillets because they sit outside each tab's own box. That's been removed. Worth remembering if anyone reaches for <code>overflow-x: auto</code> here again.</p>`,
      },
      {
        from: jordan,
        date: "2026-09-01T10:03:00.000Z",
        text: `Noted. I'll leave a comment in the styles so the next person doesn't reintroduce it.

Taking a pass at the overlay stacking next — there's something wrong with how the composer dialog layers against the tab strip and I don't think it's related to this change.`,
      },
      {
        from: mira,
        date: "2026-09-01T10:44:00.000Z",
        text: `It's related. The active tab took a z-index to lift it above its neighbours, and because nothing contains it, that index applies against the whole document — including anything portalled to the body.

So the compose dialog opens, the scrim covers the app, and the active tab punches straight through it. You can see it in the screenshot I posted: everything dims except one tab.`,
      },
      {
        from: ada,
        date: "2026-09-01T11:20:00.000Z",
        text: `Right diagnosis. The fix is to contain it rather than escalate the dialog above it — give the tab list its own stacking context so the tab's z-index is a local matter between tabs.

If we bump the dialog instead, every future portal has to out-bid the tab strip, and we'll be having this conversation again the first time someone adds a tooltip.`,
      },
      {
        from: jordan,
        date: "2026-09-01T15:04:00.000Z",
        html: `<p>Contained it on the list and confirmed the dialog now covers the strip. The join still paints correctly over the pane, which was the thing I was worried about breaking.</p>
<p>Shipping this. Summary of what changed since the first pass: fillets only on the sides where the pane continues, the first tab shares the pane's start corner above the mobile breakpoint, inactive tabs keep a clearance from the pane, and the tab list is its own stacking context.</p>
<p>Jordan</p>`,
      },
    ],
  }),
  thread({
    id: "thr_hire",
    subject: "Onsite for Nia",
    from: priya,
    date: "2026-08-29T09:12:00.000Z",
    cc: [luis],
    html: `<p>Nia has come back with Friday, so I'd like to lock the loop in today if you can confirm your slot.</p>
<p>The plan is four sessions of forty-five minutes each, with a real break in the middle rather than the fifteen-minute gap we tried last time — everyone came out of that one exhausted and the last interviewer got a worse conversation than the first.</p>
<p>I've got you down for the systems session. What I'd like from that hour is a read on how she reasons about a problem where the constraints conflict, not whether she's memorised a particular architecture. If she asks clarifying questions before writing anything, that's the signal.</p>
<p>Luis is running the design exercise and will sit in on the critique afterwards.</p>
<p>Priya</p>`,
    replies: [
      {
        from: luis,
        date: "2026-08-29T12:10:00.000Z",
        text: `Happy to sit in on the critique as well as run the exercise.

One request: can we give her the brief the evening before rather than at the start of the session? Watching someone read a prompt cold tells us how fast they read, not how well they think. Everyone we've hired who worked out well came in having already formed an opinion.`,
      },
      {
        from: ada,
        date: "2026-08-29T13:02:00.000Z",
        text: `Agreed on sending the brief ahead, and I'd keep my session to forty-five minutes hard. Every loop where we've run long, the candidate has been the one paying for it.

Friday works. Put me anywhere except immediately after lunch.`,
      },
      {
        from: priya,
        date: "2026-08-29T17:30:00.000Z",
        text: `Booked: Friday, room 3, starting at 10:00. You're second, so 10:50 to 11:35, safely clear of lunch.

Brief goes out to Nia this evening. Calendar holds are in your inboxes now — accept them so she doesn't get a decline notification if anything shifts.

Priya`,
      },
    ],
  }),
  thread({
    id: "thr_postmortem",
    subject: "Postmortem: Tuesday's delivery delay",
    from: kenji,
    date: "2026-08-26T08:15:00.000Z",
    unread: true,
    cc: [priya, mira],
    html: `<p>Writing this up while the details are still accurate. Short version: for four hours on Tuesday, inbound mail to customer domains was delayed by up to ninety minutes. Nothing was lost, nothing was returned to senders, and no customer data was exposed.</p>
<p><strong>What happened.</strong> At 09:14 UTC we deployed a change to the queue worker that added a per-domain rate limiter. The limiter was correct, but the default bucket size was set from a constant that had been written for a per-account limit, not a per-domain one. On domains with more than a handful of mailboxes, inbound mail started queueing behind a limit roughly forty times tighter than intended.</p>
<p><strong>Why we didn't catch it.</strong> Staging has three test domains, each with a single mailbox. The bug is invisible below about eight mailboxes on one domain, so every test we ran passed. Our synthetic delivery check also uses a single-mailbox domain, which is why the alert never fired — from the monitor's point of view, delivery was healthy the entire time.</p>
<p><strong>How we found out.</strong> A customer emailed support at 11:40 to ask whether we were having problems, which is the worst possible detection path and the thing I most want to fix.</p>
<p><strong>What we've changed already.</strong> The constant is corrected and the limiter now logs when a bucket is more than half consumed, so we'd see pressure before it becomes delay. Staging has a domain with twenty mailboxes on it as of yesterday.</p>
<p><strong>What's still open.</strong> The synthetic check needs to run against a multi-mailbox domain, and we need an alert on queue age rather than only on queue depth — depth looked completely normal throughout, because mail was flowing, just slowly. I'll have both in place by the end of next week.</p>
<p>Happy to walk through any of this in more detail.</p>
<p>Kenji</p>`,
    replies: [
      {
        from: priya,
        date: "2026-08-26T10:02:00.000Z",
        text: `Thank you for writing this so plainly — particularly the part about the detection path, which is the bit most people would have left out.

The queue-age alert is the important one. Depth-based alerting has now missed two incidents in a row, and both times the symptom was the same: work was moving, just not fast enough to matter. I'd treat that as the actual finding rather than the constant.

Do you want help with the synthetic check, or is that a one-person job?`,
      },
      {
        from: kenji,
        date: "2026-08-26T11:20:00.000Z",
        text: `One-person job, but I'd like a second pair of eyes on the alert thresholds once it's in. Getting those wrong in the other direction is its own problem — an alert that fires on every deploy stops being read within a fortnight.

I'll send you the numbers before I commit to them.`,
      },
    ],
  }),
  thread({
    id: "thr_newsletter",
    subject: "Weekly: shadows, sheen, and send windows",
    from: newsletter,
    date: "2026-08-27T08:00:00.000Z",
    html: `<style>
      .define-logo-dark { display: none; }
      @media (prefers-color-scheme: dark) {
        .define-shell { background: #111 !important; color: #f4f1ea !important; }
        .define-copy { color: #ddd4c4 !important; }
        .define-kicker { color: #c4b59a !important; }
        .define-meta, .define-meta a { color: #9f9587 !important; }
        .define-action { background: #f4f1ea !important; color: #111 !important; }
        .define-logo-light { display: none !important; }
        .define-logo-dark { display: block !important; }
      }
    </style>
    <table class="define-shell" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f2e9;color:#211d18;font-family:Georgia,serif">
      <tr><td style="padding:32px 28px">
        <img class="define-logo-light" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='212'%20height='24'%20viewBox='0%200%20212%2024'%3E%3Ctext%20x='0'%20y='18'%20font-family='Georgia,serif'%20font-size='16'%20letter-spacing='3'%20fill='%23211d18'%3EDEFINE%20WEEKLY%3C/text%3E%3C/svg%3E" width="212" height="24" alt="Define Weekly">
        <img class="define-logo-dark" src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='212'%20height='24'%20viewBox='0%200%20212%2024'%3E%3Ctext%20x='0'%20y='18'%20font-family='Georgia,serif'%20font-size='16'%20letter-spacing='3'%20fill='%23f4f1ea'%3EDEFINE%20WEEKLY%3C/text%3E%3C/svg%3E" width="212" height="24" alt="Define Weekly">
        <p class="define-kicker" style="letter-spacing:.18em;text-transform:uppercase;font-size:11px;color:#746959">Issue 34</p>
        <h1 style="font-weight:500;font-size:28px;line-height:1.2;margin:12px 0 20px">Shadows, sheen, and send windows</h1>
        <p class="define-copy" style="font-size:16px;line-height:1.6;color:#4d453a">Three things this week, all of them about the gap between a design that photographs well and one that survives contact with real content.</p>
        <h2 style="font-size:18px;font-weight:500;margin:28px 0 10px">A shadow is five layers, not one</h2>
        <p class="define-copy" style="font-size:16px;line-height:1.6;color:#4d453a">The single large blur that reads fine on a marketing page falls apart the moment you stack twelve of the same card in a list, because each one's falloff bleeds into its neighbours and the whole column turns muddy. The alternative is three to five layers at two to eight percent alpha, with the last layer a sub-pixel ring standing in for a border. Individually none of them are visible. Together they read as a physical edge.</p>
        <h2 style="font-size:18px;font-weight:500;margin:28px 0 10px">Sheen belongs to the surface, not the size</h2>
        <p class="define-copy" style="font-size:16px;line-height:1.6;color:#4d453a">If the highlight on a raised surface fades over a percentage of the element's height, a button and a dialog get visually different materials — the button gets a crisp top edge and the dialog gets a wash down half its face. Fix the falloff to a distance in pixels and both read as the same material catching the same light.</p>
        <h2 style="font-size:18px;font-weight:500;margin:28px 0 10px">The send window is a design decision</h2>
        <p class="define-copy" style="font-size:16px;line-height:1.6;color:#4d453a">Holding a message for thirty seconds before it leaves changes what the send button means. It stops being a commitment and becomes an intention, and the interface has to say so — which is why the pending message belongs in the thread where you'll look for it, not in a toast that disappears while you're still reading it.</p>
        <p style="margin:28px 0"><a class="define-action" href="https://demo.define.app" style="background:#211d18;color:#f7f2e9;padding:10px 16px;text-decoration:none;border-radius:999px">Read the full issue</a></p>
        <p class="define-meta" style="font-size:13px;color:#746959;margin-top:32px">You're getting this because you signed up at define.app. <a href="https://demo.define.app" style="color:#746959">Unsubscribe</a>.</p>
      </td></tr>
    </table>`,
  }),
  thread({
    id: "thr_files_only",
    subject: "Brand kit",
    from: luis,
    date: "2026-08-26T19:44:00.000Z",
    unread: true,
    html: `<p>Latest lockups are attached — the SVG for anything on screen, the PDF for the printer.</p>
<p>Use the SVG wherever you can. The PDF has the logo outlined at 300dpi for the cards, but it'll look soft if you drop it into a web page at any size above about 200px.</p>
<p>Luis</p>`,
    attachments: [
      { id: "att_logo", filename: "logo.svg", mimeType: "image/svg+xml", size: 4200 },
      { id: "att_print", filename: "brand-kit.pdf", mimeType: "application/pdf", size: 240000 },
    ],
  }),
  thread({
    id: "thr_nosubject",
    subject: "",
    from: noah,
    date: "2026-08-25T22:18:00.000Z",
    unread: true,
    text: `Can you look at the DKIM selector before we cut DNS tomorrow? I think we're publishing s1 but signing with s2, which would pass locally and fail everywhere else.`,
  }),
  thread({
    id: "thr_spam1",
    folder: "spam",
    subject: "Your mailbox is almost full",
    from: { name: "Storage Alert", email: "alert@mail-security.invalid" },
    date: "2026-08-30T04:12:00.000Z",
    html: `<p>Your mailbox has reached 98% of its storage quota. Incoming messages will be rejected once the limit is reached.</p>
<p><a href="https://example.invalid">Click here to verify your account and restore full capacity.</a></p>
<p>This is an automated message. Do not reply.</p>`,
  }),
  thread({
    id: "thr_spam2",
    folder: "spam",
    subject: "CEO request: wire transfer",
    from: { name: "Ada Meridian", email: "ada.meridian@protonmail.invalid" },
    date: "2026-08-29T11:03:00.000Z",
    text: `Are you at your desk? I need you to process a payment before noon and I'm going into meetings for the rest of the day so I won't be able to take a call.

Let me know when you're ready and I'll send the details.`,
  }),
  thread({
    id: "thr_spam3",
    folder: "spam",
    subject: "You have (1) new voicemail",
    from: { name: "Voice", email: "voice@notify.invalid" },
    date: "2026-08-21T07:40:00.000Z",
    html: `<p>You received a new voice message at 07:38. Duration 0:42.</p><p><a href="https://example.invalid">Play message</a></p>`,
  }),
  thread({
    id: "thr_draft1",
    folder: "drafts",
    subject: "Hold on the Q3 invoice",
    from: ada,
    to: [northline],
    date: "2026-08-31T08:14:00.000Z",
    text: `Luis — before you send the September invoice, can we split August across two POs? Finance opened a new cost centre for the onboarding work and they'd rather it didn't land against the design retainer.

I don't have the second PO number yet, I'm chasing it. Don't hold the invoice for me if`,
  }),
  thread({
    id: "thr_draft2",
    folder: "drafts",
    subject: "Intro: Mira × Jordan",
    from: ada,
    to: [mira, jordan],
    date: "2026-08-24T15:02:00.000Z",
    text: `Both of you have spent the last month independently arriving at the same opinion about the reader chrome, and neither of you knows the other has.

Mira — Jordan is the one who`,
  }),
  thread({
    id: "thr_arch1",
    folder: "archived",
    subject: "Office closed 18 Aug",
    from: elena,
    date: "2026-08-18T09:00:00.000Z",
    text: `The building is doing electrical work on Monday so the office will be shut all day. Back as normal on the 19th.

If you need anything from your desk, get it before Friday evening — they're cutting power at 18:00 and the door badges won't work.

Elena`,
  }),
  thread({
    id: "thr_arch2",
    folder: "archived",
    subject: "Signed: workspace agreement",
    from: samir,
    date: "2026-07-12T16:20:00.000Z",
    html: `<p>Both parties have now signed. The countersigned copy is attached for your records.</p>
<p>Two dates worth putting in a calendar: the initial term runs twelve months from 1 August, and the notice window for renewal opens on 1 May. If you intend not to renew, that has to be in writing before 1 June or it rolls over automatically for another year.</p>
<p>Nothing else needed from you.</p>
<p>Samir Okonkwo<br />Kite Legal</p>`,
    attachments: [
      { id: "att_agree", filename: "workspace-agreement.pdf", mimeType: "application/pdf", size: 128000 },
    ],
  }),
  thread({
    id: "thr_arch3",
    folder: "archived",
    subject: "Old MX records",
    from: kenji,
    date: "2026-06-02T11:11:00.000Z",
    text: `Safe to drop the Google MX records after Friday. I've been watching the logs for a fortnight and nothing has been delivered through them since the cutover on the 14th.

I'd leave the SPF include in place for another month though. A couple of the automated senders still route through Workspace and they'd start failing silently the moment we pull it.

Kenji`,
  }),
  thread({
    id: "thr_sent1",
    folder: "sent",
    subject: "Re: Notes from Thursday",
    from: ada,
    to: [mira],
    date: "2026-08-29T08:40:00.000Z",
    text: `"Paper, not a settings page" is the line I'm going to keep quoting back at people, so thank you for writing it down.

On the quoted-replies question: I'm with you rather than Jordan, but I don't think either of us has evidence. Everything I believe about it comes from how I read mail, which is not how most people read mail. Let's watch three or four people use a long thread before we decide.

Ada`,
  }),
];

const bulkFrom: Address[] = [mira, jordan, priya, luis, samir, elena, noah, aisha, kenji, noreply, calendar];

/** [subject, opening line, rest of the body, unread, has attachment] */
const bulkSeeds: Array<[string, string, string, boolean, boolean]> = [
  ["Standup notes, 1 Sep", "Three of us were out so this is short.", "Jordan is on the tab strip and expects to be done today. Priya is still blocked on the staging domain — she's raised it twice now and I think it needs someone with access to just do it rather than another ticket. I'm picking up the list query so the toolbar has something real to talk to.\n\nNo blockers worth escalating beyond the staging one.", true, false],
  ["DKIM selector rotation", "We're rotating the signing key on Thursday morning.", "The new selector (s2) is already published and has been resolving for a week, so there's nothing to wait for on the DNS side. At 09:00 I'll switch the signer over, then leave s1 published for a further seven days so anything already in flight still verifies.\n\nYou shouldn't notice anything. If you do start seeing DMARC failures in the reports after Thursday, tell me immediately rather than assuming it'll settle.", true, false],
  ["Printer in 4B is jammed", "The big printer on the fourth floor has eaten another envelope run.", "I've pulled what I can reach but there's something wedged behind the fuser that needs a person with a service key. Ticket is in with facilities.\n\nUse 2A in the meantime. It's slower but it hasn't jammed since March.", false, false],
  ["Flight to Lisbon", "Booked — out Wednesday morning, back Sunday evening.", "I'll be reachable but on a five-hour offset, so anything that needs me same-day should land before about 14:00 your time.\n\nMira has the DNS handover and knows where the runbook is. If something breaks that isn't in it, that's a good sign the runbook needs another page rather than a phone call.", false, false],
  ["Re: SPF include chain", "We're at eleven DNS lookups and the limit is ten.", "Some receivers are already returning permerror, which is why the newsletter bounced at two of the larger providers last week and not at the others.\n\nThe fix is to flatten the includes into explicit IP ranges, which works but means we have to re-flatten whenever a provider changes their addresses. The alternative is dropping two senders we don't really use any more. I'd rather do the second.", true, false],
  ["Photos from the roof", "Took these at golden hour and none of them are usable.", "The light was right for about four minutes and I spent three of them changing lenses. Posting them anyway so nobody else wastes an evening trying the same angle — the parapet blocks exactly the part of the skyline you'd want.", false, true],
  ["Q3 headcount", "Holding the contractor role until October.", "Not a budget problem — the work it was meant to cover has moved behind the delivery rebuild, and hiring someone to sit idle for six weeks is worse for them than for us.\n\nThe two permanent roles are unaffected and Nia's loop goes ahead on Friday as planned.", true, false],
  ["Calendar: design critique", "Thursday 16:00–16:45, room 2.", "Bring work in progress rather than finished screens. The last two critiques turned into presentations because everyone brought something they'd already decided on, and nobody got anything useful out of them.", false, false],
  ["GitHub: 12 failing checks", "typecheck is red on main.", "Twelve jobs failing, all the same root cause: the list query changed shape and three call sites still destructure the old array response.\n\nI'd revert rather than roll forward — it's a two-line revert and the fix touches a provider interface I don't want to rush at this hour.", true, false],
  ["Coffee next week?", "Been meaning to catch up properly since you moved teams.", "Tuesday after 11 works for me, or any morning Thursday onward. There's the place on Bell Street that isn't loud, which rules out most of the alternatives near the office.", false, false],
  ["Mailbox quota at 82%", "You're at 82% of your 15 GB.", "Nothing is at risk yet, but the bulk of it is attachments from June — a couple of video files account for about 3 GB on their own.\n\nYou can clear the largest items from the storage panel without touching the messages themselves.", false, false],
  ["Translation pass", "First pass on the German strings is back.", "Mostly clean, but the inbox empty state doesn't survive translation: \"No messages yet\" becomes a sentence with a clause order that makes the \"yet\" land oddly, and the German runs about 40% longer so it wraps to three lines in the panel.\n\nWorth rewording the source string rather than special-casing the translation.", true, false],
  ["Vendor: paperhour.co", "They can do the cream stock, two week lead time.", "Slightly more than we budgeted per unit, but they'll do the whole run on one press pass, which means no colour drift between the first box and the last. The cheaper quote we got splits it across two runs.\n\nI'd pay the difference.", false, false],
  ["Keys for the studio", "Left the spare set with Jordan.", "He's in until six most days. If you need them outside that, the building manager has a set but wants twenty-four hours' notice and photo ID.", false, false],
  ["Re: onsite lunch", "Booked the corner table for six at 12:30.", "Nia is vegetarian — I've told them, but it's worth someone checking on the day because the last two times we've had a table there the kitchen has forgotten.", false, false],
  ["Export of last month's mail", "mbox export attached, 14 MB.", "This is everything from 1 to 31 August including sent, as requested. Threads are preserved and attachments are inline in the file rather than stripped.\n\nIt'll open in most clients directly. If you need it split by folder instead, say so and I'll re-run it.", false, true],
  ["Typo on the login screen", "It says \"mail box\" rather than \"mailbox\" on the sign-in page.", "Only appears in the subtitle under the heading, and only on the sign-in variant — the create-account version has it right, which is presumably how it survived review.", true, false],
  ["Time off 12–16 Oct", "Taking that week off.", "Nothing is scheduled to land in it. Mira has DNS and Kenji has the delivery queue, which covers everything that has ever actually paged someone.\n\nI'll leave the runbook links pinned before I go.", false, false],
  ["New device logged in", "A new sign-in was recorded on a Mac in London.", "If this was you, no action is needed. If it wasn't, revoke the session from the security panel and change your password — revoking alone won't stop a second sign-in with the same credentials.", false, false],
  ["Podcast notes", "Listened on the train, worth your time from about eighteen minutes in.", "The first section is a sponsor read and a fairly standard origin story. The interesting part is the middle, where she talks about deleting a feature that forty percent of their users touched weekly and why the metric was measuring the wrong thing.", false, false],
  ["Re: brand kit", "Use the SVG, not the PNG.", "The PNG in the shared folder is from the old lockup and still has the wordmark at the previous weight. I've asked Luis to delete it so nobody else picks it up by accident.", false, false],
  ["Server reboot window", "Sunday 02:00 UTC, expected five minutes.", "Kernel patch on the mail hosts. Inbound mail queues at the edge during the restart and delivers on the other side, so nothing is lost — worst case a message that would have arrived at 02:01 arrives at 02:06.\n\nNo action needed from anyone.", true, false],
  ["Intro to Lumen", "Aisha is looking at self-hosted mail for her team of about thirty.", "She's read the docs and got as far as the DNS section before hitting the question everyone hits, which is what happens to deliverability reputation when you move a domain that's been on Workspace for six years.\n\nI said you'd be the right person to answer that honestly rather than optimistically.", false, false],
  ["Receipt: Figma seats", "Renewed for twelve months, card on file.", "Same seat count as last year. The invoice is attached for expenses.", false, true],
  ["Mute this thread", "I mean the printer one, not this one.", "Forty-one replies about a paper jam. I've muted it but I wanted to say out loud that it happened.", false, false],
  ["Long subject to check truncation in the thread list when the pane is narrow and the date still has to sit at the end", "The subject on this one is deliberately absurd.", "It exists so we can see whether the row truncates cleanly at every width or whether the date gets pushed off the end. It should ellipsis, not wrap the row to a second line.", false, false],
  ["日本語のテスト", "件名と本文の混在を確認するためのメールです。", "行の高さと文字の詰まり具合を確認したいので、二段落目も日本語で書いています。欧文と混ざったとき、たとえば mailbox のような単語が入ったときの折り返しも見ておきたいところです。", true, false],
  ["Emoji in the subject", "Making sure the row still aligns when the subject has a symbol in it.", "Some fonts render emoji at a different height from the surrounding text, which can push the whole row down by a pixel or two. Worth confirming it doesn't.", false, false],
  ["Follow-up: Lisbon wifi", "The hotel network blocks outbound SMTP on 25 and 587.", "Which means the desktop client won't send from there, though it will still receive. The web client works normally because it's all over 443.\n\nIf you're travelling and mail suddenly stops sending, this is almost always why.", false, false],
];

const bulk = bulkSeeds.map(([subject, opening, rest, unread, attach], index) =>
  thread({
    id: `thr_bulk_${index}`,
    subject,
    from: bulkFrom[index % bulkFrom.length],
    date: new Date(Date.UTC(2026, 7, 20 - Math.floor(index / 2), 9 + (index % 8), 4 * index)).toISOString(),
    unread,
    html: `<p>${opening}</p>${rest
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph}</p>`)
      .join("")}`,
    attachments: attach
      ? [
          {
            id: `att_bulk_${index}`,
            filename: index % 2 ? "export.mbox" : "receipt.pdf",
            mimeType: index % 2 ? "application/mbox" : "application/pdf",
            size: 14000 + index * 800,
          },
        ]
      : undefined,
  }),
);

export const demoThreads: ThreadDetail[] = [...featured, ...bulk];
