export type WorkflowId = "respond-to-notice" | "supporting-documents" | "explanation-letter";

export type WorkflowStep = "intro" | "document" | "facts" | "objective" | "draft" | "review" | "attachments" | "recipient" | "mailing" | "checkout" | "submitted";

export interface WorkflowDefinition {
  id: WorkflowId;
  title: string;
  description: string;
  disclaimer: string;
  steps: WorkflowStep[];
}

export const workflows: Record<WorkflowId, WorkflowDefinition> = {
  "respond-to-notice": {
    id: "respond-to-notice",
    title: "Respond to a Notice",
    description: "Organize an immigration-related notice, confirm its important details, prepare a response, and get it ready to mail.",
    disclaimer: "Immigration Mail provides document preparation and mailing assistance. It is not a law firm and does not provide legal advice.",
    steps: ["intro", "document", "facts", "objective", "draft", "review", "attachments", "recipient", "mailing", "checkout", "submitted"],
  },
  "supporting-documents": {
    id: "supporting-documents",
    title: "Submit Supporting Documents",
    description: "Prepare a clear cover letter and organize supporting documentation for an immigration-related mailing.",
    disclaimer: "Review all requirements and instructions from the relevant agency or your qualified legal professional before sending.",
    steps: ["intro", "facts", "draft", "review", "attachments", "recipient", "mailing", "checkout", "submitted"],
  },
  "explanation-letter": {
    id: "explanation-letter",
    title: "Prepare an Explanation Letter",
    description: "Turn your own facts and objective into a professional, editable correspondence draft.",
    disclaimer: "AI-assisted drafting is not legal advice and should be reviewed carefully before sending.",
    steps: ["intro", "facts", "objective", "draft", "review", "attachments", "recipient", "mailing", "checkout", "submitted"],
  },
};
