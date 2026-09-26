export function MailingRecordDownloads({ id, token }: { id: string; token: string }) {
  return (
    <section
      className="mt-8 border-t border-dashed border-rule pt-6"
      aria-labelledby="record-heading"
    >
      <h2 id="record-heading" className="font-serif text-xl">
        Your mailing record
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Save the exact document hash, recorded addresses, provider reference, tracking details,
        and event history. Download the original PDF separately and keep both files private.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {(
          [
            ["evidence", "Download mailing evidence (.pdf)"],
            ["summary", "Download evidence data (.json)"],
            ["document", "Download original PDF"],
          ] as const
        ).map(([artifact, label]) => (
          <form
            key={artifact}
            action={`/api/orders/${id}/record`}
            method="post"
            target="_blank"
            rel="noopener noreferrer"
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="artifact" value={artifact} />
            <button
              type="submit"
              className="rounded-full border border-rule px-4 py-2 text-sm hover:bg-paper"
            >
              {label}
            </button>
          </form>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        This is a mailing evidence record, not a payment receipt. Certified and tracked mailings add
        carrier tracking events as they arrive. Original PDFs may be unavailable after retention cleanup.
      </p>
    </section>
  );
}
