export const noticeResponseProduct = {
  id: "notice-response",
  name: "NoticeResponse",
  tagline: "Understand the notice. Build your response. Put it on the record.",
  description: "A guided workflow for official notices: extract the important facts, verify them, build a formal response, and hand the final document to MailMyPDF for mailing and proof.",
  responseTypes: ["Dispute or correction", "Request reconsideration", "Request an extension", "Provide requested documents", "Request a hearing", "Acknowledge and respond", "Other formal response"],
} as const;

export type NoticeResponseType = (typeof noticeResponseProduct.responseTypes)[number];

export type NoticeSignal = { value: string; confidence: number };
export type NoticeAnalysis = {
  sender: NoticeSignal | null;
  noticeDate: NoticeSignal | null;
  responseDeadline: NoticeSignal | null;
  referenceNumber: NoticeSignal | null;
  requestedAction: NoticeSignal | null;
  consequence: NoticeSignal | null;
  noticeType: NoticeSignal | null;
  warnings: string[];
};