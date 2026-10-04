interface RecoveryCaseSnapshot {
  schema: string;
  id: string;
  ownerId: string;
  subject?: string;
  desiredOutcome: string;
  state: string;
  revision: number;
  evidenceIds: string[];
  matterIds: string[];
  updatedAt: string;
  soughtValue?: { amountMinor: number; currency: string };
  waiting?: { reason: string; dueAt?: string };
  resolution?: { outcome: string; recoveredValue?: { amountMinor: number; currency: string } };
}
interface RecoveryCaseView {
  case: RecoveryCaseSnapshot;
  source?: { candidate?: { accountId?: string; transactionIds?: string[]; reason?: string } };
  evidence: { id: string; name: string; securityStatus: string; available: boolean }[];
}
interface RecoveryOpenAi {
  toolOutput?: unknown;
  theme?: "light" | "dark";
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sendFollowUpMessage?: (args: { prompt: string }) => Promise<unknown>;
}
type RecoveryWindow = Window & { openai?: RecoveryOpenAi; ResizeObserver?: typeof ResizeObserver };

/** Portable app controller. Authority stays in the authenticated MCP tools, never browser state. */
export function mountRecoveryCaseApp(hostWindow: RecoveryWindow, doc: Document): void {
  type RecordValue = Record<string, unknown>;
  const object = (value: unknown): RecordValue | null =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as RecordValue) : null;
  const uuid = (value: unknown): value is string =>
    typeof value === "string" &&
    /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(value);
  const bounded = (value: unknown, max = 4000): value is string =>
    typeof value === "string" && value.length <= max;
  const validMoney = (value: unknown) => {
    const m = object(value);
    return Boolean(
      m &&
      Number.isSafeInteger(m.amountMinor) &&
      Number(m.amountMinor) >= 0 &&
      typeof m.currency === "string" &&
      /^[A-Z]{3}$/.test(m.currency),
    );
  };
  const byId = <T extends HTMLElement = HTMLElement>(id: string): T => doc.getElementById(id) as T;
  const field = (id: string) => byId<HTMLInputElement>(id);
  const create = (tag: string, text?: string, className?: string) => {
    const n = doc.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (className) n.className = className;
    return n;
  };
  const states: Record<string, string> = {
    intake: "Intake",
    active: "Active review",
    waiting: "Waiting for a reply",
    resolved: "Outcome confirmed",
    cancelled: "Cancelled",
  };
  let views: RecoveryCaseView[] = [],
    current: RecoveryCaseView | null = null;
  let epoch = 0,
    busy = false,
    stale = false,
    bridgeTools = false,
    bridgeMessages = false,
    bridgeContext = false;
  let initialized = false,
    closed = false,
    lastSize = "";
  const applyTheme = (value: unknown) => {
    if (value === "light" || value === "dark")
      doc.documentElement.style.setProperty("color-scheme", value);
  };
  const reportSize = () => {
    if (!initialized || closed) return;
    const rect = doc.body.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.height) || !Number.isFinite(rect.width)) return;
    const height = Math.ceil(rect.height),
      width = Math.ceil(rect.width),
      key = width + ":" + height;
    if (height <= 0 || width <= 0 || key === lastSize) return;
    lastSize = key;
    notify("ui/notifications/size-changed", { height, width });
  };
  const observer = hostWindow.ResizeObserver ? new hostWindow.ResizeObserver(reportSize) : null;
  let nextId = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: number }
  >();
  const post = (value: unknown) => hostWindow.parent.postMessage(value, "*");
  const notify = (method: string, params: unknown = {}) => post({ jsonrpc: "2.0", method, params });
  function request(method: string, params: RecordValue): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = hostWindow.setTimeout(() => {
        pending.delete(id);
        reject(new Error("HOST_TIMEOUT"));
      }, 15000);
      pending.set(id, { resolve, reject, timer });
      post({ jsonrpc: "2.0", id, method, params });
    });
  }
  function parseView(value: unknown): RecoveryCaseView | null {
    const row = object(value),
      g = object(row?.case);
    if (
      !g ||
      g.schema !== "mailmypdf.case-goal/v1" ||
      !uuid(g.id) ||
      !uuid(g.ownerId) ||
      typeof g.state !== "string" ||
      !Object.hasOwn(states, g.state) ||
      !Number.isSafeInteger(g.revision) ||
      Number(g.revision) < 1 ||
      !bounded(g.desiredOutcome) ||
      !g.desiredOutcome.trim() ||
      (g.subject !== undefined && !bounded(g.subject, 500)) ||
      !Array.isArray(g.evidenceIds) ||
      g.evidenceIds.length > 1000 ||
      !g.evidenceIds.every(uuid) ||
      !Array.isArray(g.matterIds) ||
      g.matterIds.length > 1000 ||
      !g.matterIds.every(uuid) ||
      (g.soughtValue !== undefined && !validMoney(g.soughtValue))
    )
      return null;
    const waiting = object(g.waiting),
      resolution = object(g.resolution);
    if (
      g.state === "waiting" &&
      (!waiting ||
        !bounded(waiting.reason) ||
        (waiting.dueAt !== undefined &&
          (typeof waiting.dueAt !== "string" || !Number.isFinite(Date.parse(waiting.dueAt)))))
    )
      return null;
    if (
      g.state === "resolved" &&
      (!resolution ||
        !bounded(resolution.outcome) ||
        (resolution.recoveredValue !== undefined && !validMoney(resolution.recoveredValue)))
    )
      return null;
    const evidence = Array.isArray(row?.evidence)
      ? row.evidence.filter((v) => {
          const e = object(v);
          return (
            e &&
            uuid(e.id) &&
            (g.evidenceIds as string[]).includes(e.id) &&
            bounded(e.name, 512) &&
            typeof e.available === "boolean" &&
            bounded(e.securityStatus, 100)
          );
        })
      : [];
    return {
      case: structuredClone(g) as unknown as RecoveryCaseSnapshot,
      source: object(row?.source) as RecoveryCaseView["source"],
      evidence: structuredClone(evidence) as RecoveryCaseView["evidence"],
    };
  }
  function unwrap(response: unknown): unknown {
    const r = object(response);
    if (!r || r.isError === true || r.error) throw new Error("TOOL_FAILED");
    return r.structuredContent ?? r;
  }
  const canCall = () =>
    !closed && (bridgeTools || typeof hostWindow.openai?.callTool === "function");
  async function callTool(name: string, args: RecordValue): Promise<unknown> {
    if (bridgeTools) return request("tools/call", { name, arguments: args });
    if (hostWindow.openai?.callTool) {
      const invoke = hostWindow.openai.callTool.bind(hostWindow.openai);
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = hostWindow.setTimeout(() => {
          pending.delete(id);
          reject(new Error("HOST_TIMEOUT"));
        }, 15000);
        pending.set(id, { resolve, reject, timer });
        const complete = (value: unknown, failed = false) => {
          const waiter = pending.get(id);
          if (!waiter) return;
          pending.delete(id);
          hostWindow.clearTimeout(waiter.timer);
          if (failed) waiter.reject(new Error("HOST_ERROR"));
          else waiter.resolve(value);
        };
        try {
          Promise.resolve(invoke(name, args)).then(
            (value) => complete(value),
            () => complete(null, true),
          );
        } catch {
          complete(null, true);
        }
      });
    }
    throw new Error("HOST_UNAVAILABLE");
  }
  function decimals(currency: string): number {
    return (
      new Intl.NumberFormat(undefined, { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  }
  function money(value?: { amountMinor: number; currency: string }): string {
    if (!value) return "Not specified";
    try {
      const formatter = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: value.currency,
      });
      const d = decimals(value.currency),
        scale = 10n ** BigInt(d),
        minor = BigInt(value.amountMinor);
      return formatter
        .formatToParts(Number(minor / scale))
        .map((part) =>
          part.type === "fraction" ? String(minor % scale).padStart(d, "0") : part.value,
        )
        .join("");
    } catch {
      return String(value.amountMinor) + " minor units " + value.currency;
    }
  }
  function amountMinor(input: string, currency: string): number {
    const d = decimals(currency),
      match = /^(\d+)(?:\.(\d+))?$/.exec(input);
    if (!match || (match[2]?.length ?? 0) > d || input.length > 32)
      throw new Error("AMOUNT_INVALID");
    const value =
      BigInt(match[1]) * 10n ** BigInt(d) + BigInt((match[2] ?? "").padEnd(d, "0") || "0");
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("AMOUNT_INVALID");
    return Number(value);
  }
  function hideForms() {
    for (const id of ["waiting-form", "resolution-form", "cancel-panel"]) byId(id).hidden = true;
    byId("dismiss-forms").hidden = true;
  }
  function resetForms() {
    hideForms();
    for (const id of ["wait-reason", "wait-due", "outcome", "recovered-amount"])
      field(id).value = "";
    field("confirm-outcome").checked = false;
    field("confirm-cancel").checked = false;
  }
  function error(text: string) {
    byId("error").textContent = text;
    byId("error").hidden = false;
  }
  function contextSelection() {
    if (!current || !bridgeContext) return;
    void request("ui/update-model-context", {
      structuredContent: {
        selectedRecoveryCase: {
          id: current.case.id,
          state: current.case.state,
          revision: current.case.revision,
        },
      },
    }).catch(() => {});
  }
  function render() {
    byId("case-list").replaceChildren();
    byId("evidence-list").replaceChildren();
    byId("resolution-evidence").replaceChildren();
    byId("source-list").replaceChildren();
    byId("detail").hidden = !current;
    byId("list-view").hidden = Boolean(current);
    byId("empty").hidden = Boolean(current) || views.length > 0;
    byId("list-count").textContent =
      views.length + (views.length === 1 ? " saved case" : " saved cases");
    byId("back").hidden = !current;
    byId("reload").textContent = current ? "Reload saved case" : "Refresh cases";
    byId("bridge-note").hidden = canCall();
    for (const view of views) {
      const g = view.case,
        card = create("article", undefined, "case-row"),
        text = create("div");
      text.append(
        create("span", states[g.state], "badge"),
        create("h2", g.subject || "Recovery case"),
        create("p", g.desiredOutcome),
        create("span", money(g.soughtValue) + " · candidate value", "muted"),
      );
      const button = create("button", "Open case") as HTMLButtonElement;
      button.type = "button";
      button.disabled = busy || !canCall();
      button.addEventListener("click", () => openCase(g.id, g.ownerId));
      card.append(text, button);
      byId("case-list").append(card);
    }
    const g = current?.case;
    const terminal = !g || ["resolved", "cancelled"].includes(g.state),
      blocked = busy || stale || !canCall();
    for (const id of [
      "activate",
      "resume",
      "show-waiting",
      "show-resolution",
      "show-cancel",
      "confirm-resolution",
      "confirm-waiting",
      "cancel-case",
    ])
      (byId(id) as HTMLButtonElement).disabled = blocked || terminal;
    (byId("reload") as HTMLButtonElement).disabled = busy || !canCall();
    (byId("back") as HTMLButtonElement).disabled = busy || !canCall();
    (byId("add-evidence") as HTMLButtonElement).disabled =
      closed || busy || terminal || !(bridgeMessages || hostWindow.openai?.sendFollowUpMessage);
    byId("activate").hidden = g?.state !== "intake";
    byId("resume").hidden = g?.state !== "waiting";
    byId("show-waiting").hidden = g?.state !== "active";
    byId("show-resolution").hidden = terminal || g?.state === "intake";
    byId("show-cancel").hidden = terminal;
    byId("waiting-status").hidden = g?.state !== "waiting";
    byId("resolution-status").hidden = g?.state !== "resolved";
    if (!current || !g) {
      hideForms();
      return;
    }
    byId("case-title").textContent = g.subject || "Recovery case";
    byId("status").textContent = states[g.state];
    byId("desired-outcome").textContent = g.desiredOutcome;
    byId("candidate-value").textContent = money(g.soughtValue);
    byId("evidence-count").textContent = String(g.evidenceIds.length);
    byId("matter-count").textContent = String(g.matterIds.length);
    byId("next-step").textContent =
      g.state === "intake"
        ? "Start your review, then add receipts or statements in the conversation."
        : g.state === "waiting"
          ? "Keep your evidence together while you wait. Resume when you hear back."
          : g.state === "resolved"
            ? "Your confirmed outcome and linked evidence are saved together."
            : g.state === "cancelled"
              ? "This case is closed. Its history and evidence links are retained."
              : "Review your evidence and follow up. Record the outcome only when you can confirm it.";
    byId("wait-summary").textContent = g.waiting?.reason || "";
    const due = g.waiting?.dueAt ? new Date(g.waiting.dueAt) : null;
    byId("deadline").textContent = due
      ? due.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : "No deadline set";
    byId("overdue").hidden = !due || due.getTime() > Date.now();
    byId("confirmed-outcome").textContent = g.resolution?.outcome || "";
    byId("confirmed-value").textContent = g.resolution?.recoveredValue
      ? money(g.resolution.recoveredValue)
      : "No recovered amount recorded";
    byId("currency-label").textContent = g.soughtValue?.currency || "Amount unavailable";
    byId("amount-help").textContent = g.soughtValue
      ? "Optional · " +
        g.soughtValue.currency +
        ", up to " +
        decimals(g.soughtValue.currency) +
        " decimal places. Only enter an amount you can confirm."
      : "No currency was recorded. Save the outcome without a recovered amount.";
    field("recovered-amount").disabled = !g.soughtValue;
    const evidence = new Map(current.evidence.map((e) => [e.id, e]));
    for (const id of g.evidenceIds) {
      const e = evidence.get(id),
        name = e?.name || "Document unavailable",
        available = e?.available === true;
      byId("evidence-list").append(create("li", name + (available ? "" : " · unavailable")));
      const label = create("label", undefined, "check-row"),
        input = create("input") as HTMLInputElement;
      input.type = "checkbox";
      input.value = id;
      input.disabled = !available;
      input.name = "resolution-evidence";
      label.append(
        input,
        create("span", name + (available ? "" : " · attach current evidence in chat")),
      );
      byId("resolution-evidence").append(label);
    }
    if (!g.evidenceIds.length)
      byId("evidence-list").append(
        create("li", "Add a receipt, statement, or other evidence in the conversation."),
      );
    byId("no-resolution-evidence").hidden = current.evidence.some((e) => e.available);
    const candidate = current.source?.candidate;
    if (bounded(candidate?.accountId, 512))
      byId("source-list").append(create("li", "Account alias: " + candidate.accountId));
    if (Array.isArray(candidate?.transactionIds))
      for (const id of candidate.transactionIds.slice(0, 50))
        if (bounded(id, 512)) byId("source-list").append(create("li", "Source transaction: " + id));
  }
  function apply(value: unknown): boolean {
    const data = object(value),
      single = parseView(data),
      many =
        Array.isArray(data?.cases) && data.cases.length <= 100 ? data.cases.map(parseView) : null;
    epoch++;
    busy = false;
    stale = false;
    resetForms();
    byId("error").hidden = true;
    byId("feedback").textContent = "";
    if (single) {
      current = single;
      views = [];
    } else if (many && many.every((v) => v !== null)) {
      current = null;
      views = many as RecoveryCaseView[];
    } else {
      current = null;
      views = [];
      error("The case result is unavailable. Ask in chat to reopen your saved cases.");
    }
    render();
    contextSelection();
    return Boolean(single || many?.every((v) => v !== null));
  }
  async function run(
    name: string,
    args: RecordValue,
    expected?: { id: string; owner: string; revision?: number },
  ): Promise<void> {
    if (busy || !canCall()) return;
    const started = epoch;
    busy = true;
    byId("error").hidden = true;
    render();
    try {
      const data = unwrap(await callTool(name, args));
      if (epoch !== started) return;
      if (expected) {
        const view = parseView(data);
        if (
          !view ||
          view.case.id !== expected.id ||
          view.case.ownerId !== expected.owner ||
          (expected.revision !== undefined && view.case.revision !== expected.revision)
        )
          throw new Error("RECEIPT_MISMATCH");
      }
      if (!apply(data)) throw new Error("RESULT_INVALID");
      byId("feedback").textContent =
        name === "update_recovery_case" ? "Case updated and saved." : "Latest saved case loaded.";
    } catch {
      if (epoch !== started) return;
      stale = true;
      resetForms();
      error(
        "Could not confirm the case result. Reload the latest saved case before making another change. No update will be retried automatically.",
      );
    } finally {
      if (epoch === started) {
        busy = false;
        render();
      }
    }
  }
  async function openCase(id: string, owner: string) {
    await run("get_recovery_case", { case_id: id }, { id, owner });
  }
  async function update(event: RecordValue, confirm = false) {
    if (!current || stale || ["resolved", "cancelled"].includes(current.case.state)) return;
    const g = current.case;
    await run(
      "update_recovery_case",
      {
        case_id: g.id,
        expected_revision: g.revision,
        event,
        ...(confirm ? { user_confirmed_resolution: true } : {}),
      },
      { id: g.id, owner: g.ownerId, revision: g.revision + 1 },
    );
  }
  byId("activate").addEventListener("click", () => update({ type: "activate" }));
  byId("resume").addEventListener("click", () => update({ type: "resume" }));
  byId("reload").addEventListener("click", () =>
    current
      ? openCase(current.case.id, current.case.ownerId)
      : run("list_recovery_cases", { limit: 25 }),
  );
  byId("back").addEventListener("click", () => run("list_recovery_cases", { limit: 25 }));
  for (const [button, form] of [
    ["show-waiting", "waiting-form"],
    ["show-resolution", "resolution-form"],
    ["show-cancel", "cancel-panel"],
  ])
    byId(button).addEventListener("click", () => {
      hideForms();
      byId("error").hidden = true;
      byId("feedback").textContent = "";
      byId(form).hidden = false;
      byId("dismiss-forms").hidden = false;
      field(
        form === "waiting-form"
          ? "wait-reason"
          : form === "resolution-form"
            ? "outcome"
            : "confirm-cancel",
      ).focus();
    });
  byId("dismiss-forms").addEventListener("click", hideForms);
  for (const form of ["waiting-form", "resolution-form"])
    byId(form).addEventListener("input", () => {
      if (!busy && !stale) byId("error").hidden = true;
    });
  const saveWaiting = async (e: Event) => {
    e.preventDefault();
    const reason = field("wait-reason").value.trim(),
      date = field("wait-due").value;
    if (
      !reason ||
      reason.length > 4000 ||
      (date && (!Number.isFinite(Date.parse(date)) || Date.parse(date) <= Date.now()))
    ) {
      error("Add a reason and choose a future deadline, or leave the deadline blank.");
      return;
    }
    await update({
      type: "wait",
      reason,
      ...(date ? { dueAt: new Date(date).toISOString() } : {}),
    });
  };
  byId("waiting-form").addEventListener("submit", saveWaiting);
  byId("confirm-waiting").addEventListener("click", saveWaiting);
  const saveResolution = async (e: Event) => {
    e.preventDefault();
    if (!current) return;
    const outcome = field("outcome").value.trim(),
      raw = field("recovered-amount").value.trim();
    const ids = Array.from(
      byId("resolution-evidence").querySelectorAll<HTMLInputElement>("input:checked"),
    )
      .filter(
        (input) =>
          !input.disabled && current?.evidence.some((e) => e.id === input.value && e.available),
      )
      .map((input) => input.value);
    if (!outcome || outcome.length > 4000 || !field("confirm-outcome").checked || !ids.length) {
      error(
        "Describe the confirmed outcome, choose supporting evidence, and confirm that the outcome happened.",
      );
      return;
    }
    let recoveredValue: { amountMinor: number; currency: string } | undefined;
    if (raw) {
      try {
        const currency = current.case.soughtValue?.currency;
        if (!currency) throw new Error("CURRENCY_MISSING");
        recoveredValue = { amountMinor: amountMinor(raw, currency), currency };
      } catch {
        error("Enter a valid amount using the currency and decimal places shown.");
        return;
      }
    }
    await update(
      { type: "resolve", outcome, evidenceIds: ids, ...(recoveredValue ? { recoveredValue } : {}) },
      true,
    );
  };
  byId("resolution-form").addEventListener("submit", saveResolution);
  byId("confirm-resolution").addEventListener("click", saveResolution);
  for (const [form, button] of [
    ["waiting-form", "confirm-waiting"],
    ["resolution-form", "confirm-resolution"],
  ]) {
    byId(form).addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.target as HTMLElement)?.tagName === "INPUT") {
        e.preventDefault();
        byId(button).focus();
      }
    });
  }
  byId("cancel-case").addEventListener("click", async () => {
    if (!field("confirm-cancel").checked) {
      error("Confirm that you want to close this case.");
      return;
    }
    await update({ type: "cancel" });
  });
  byId("add-evidence").addEventListener("click", async () => {
    if (!current || busy) return;
    const prompt =
      "Help me attach supporting document evidence to my saved recovery case " +
      current.case.id +
      ". Confirm the document before linking it; do not send correspondence.";
    try {
      if (bridgeMessages)
        await request("ui/message", { role: "user", content: [{ type: "text", text: prompt }] });
      else if (hostWindow.openai?.sendFollowUpMessage)
        await hostWindow.openai.sendFollowUpMessage({ prompt });
      byId("feedback").textContent = "Continue in the conversation to add your evidence.";
    } catch {
      error("Ask in the conversation to attach evidence to this recovery case.");
    }
  });
  hostWindow.addEventListener("message", (event: MessageEvent) => {
    if (closed || event.source !== hostWindow.parent) return;
    const message = object(event.data);
    if (!message || message.jsonrpc !== "2.0") return;
    if (
      message.method === "ui/resource-teardown" &&
      (typeof message.id === "number" || typeof message.id === "string")
    ) {
      dispose();
      post({ jsonrpc: "2.0", id: message.id, result: {} });
      return;
    }
    if (
      message.method === undefined &&
      typeof message.id === "number" &&
      pending.has(message.id) &&
      (Object.hasOwn(message, "result") || Object.hasOwn(message, "error"))
    ) {
      const waiter = pending.get(message.id)!;
      pending.delete(message.id);
      hostWindow.clearTimeout(waiter.timer);
      if (message.error) waiter.reject(new Error("HOST_ERROR"));
      else waiter.resolve(message.result);
      return;
    }
    if (message.method === "ui/notifications/tool-result") {
      try {
        apply(unwrap(message.params));
      } catch {
        apply(null);
      }
    } else if (message.method === "ui/notifications/tool-cancelled") {
      apply(null);
    } else if (message.method === "ui/notifications/host-context-changed") {
      applyTheme(object(message.params)?.theme);
    } else if (message.method === "ui/notifications/tool-input") {
      epoch++;
      busy = false;
      stale = true;
      resetForms();
      render();
    }
  });
  hostWindow.addEventListener("openai:set_globals", ((event: CustomEvent) => {
    const globals = object(object(event.detail)?.globals);
    if (closed) return;
    if (globals && Object.hasOwn(globals, "theme")) applyTheme(globals.theme);
    if (globals && Object.hasOwn(globals, "toolOutput")) apply(globals.toolOutput);
  }) as EventListener);
  function dispose() {
    closed = true;
    epoch++;
    busy = false;
    observer?.disconnect();
    resetForms();
    for (const waiter of pending.values()) {
      hostWindow.clearTimeout(waiter.timer);
      waiter.reject(new Error("APP_CLOSED"));
    }
    pending.clear();
    render();
  }
  hostWindow.addEventListener("pagehide", dispose);
  applyTheme(hostWindow.openai?.theme);
  observer?.observe(doc.body);
  if (hostWindow.openai?.toolOutput !== undefined) apply(hostWindow.openai.toolOutput);
  else {
    resetForms();
    render();
  }
  void request("ui/initialize", {
    protocolVersion: "2026-01-26",
    appInfo: {
      name: "mailmypdf-recovery-case",
      title: "MailMyPDF recovery cases",
      version: "1.0.0",
    },
    appCapabilities: {},
  })
    .then((value) => {
      const result = object(value),
        capabilities = object(result?.hostCapabilities);
      bridgeTools = Boolean(capabilities?.serverTools);
      bridgeMessages = Boolean(object(capabilities?.message)?.text);
      bridgeContext = Boolean(capabilities?.updateModelContext);
      initialized = true;
      applyTheme(object(result?.hostContext)?.theme);
      notify("ui/notifications/initialized");
      reportSize();
      render();
      contextSelection();
    })
    .catch(() => {
      byId("bridge-note").hidden = canCall();
    });
}
