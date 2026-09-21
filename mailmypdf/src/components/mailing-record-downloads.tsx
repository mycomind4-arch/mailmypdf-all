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
        Save the recorded addresses, order amount, provider reference, and event history. Download
        the original PDF separately. Keep both files private.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {(
          [
            ["summary", "Download order record (.json)"],
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
        This record is not a payment receipt or certified proof of delivery. Those artifacts are not
        available here. Original PDFs may be unavailable after retention cleanup; a failed download
        opens an explanation.
      </p>
    </section>
  );
}
