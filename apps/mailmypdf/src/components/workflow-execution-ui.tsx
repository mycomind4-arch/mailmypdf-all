/**
 * Workflow Execution UI Components
 *
 * User-friendly interface for executing workflows stage-by-stage.
 * Guides users through the workflow with:
 * - Stage questions
 * - Real-time AI analysis
 * - Document generation and review
 * - Progress tracking
 * - Document export/sending
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Clock,
  FileText,
  MessageCircle,
  AlertCircle,
  Download,
  Send,
  Edit2,
  Eye,
  Zap,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW CONTAINER                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

interface WorkflowContainerProps {
  workflowName: string;
  progress: number;
  currentStageIndex: number;
  totalStages: number;
  onComplete: () => void;
}

export function WorkflowContainer({
  workflowName,
  progress,
  currentStageIndex,
  totalStages,
  onComplete,
}: WorkflowContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{workflowName}</h1>
            <p className="text-sm text-slate-600">
              Step {currentStageIndex + 1} of {totalStages}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 mx-8">
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 mt-1">{progress}% complete</p>
          </div>

          {/* Status Badge */}
          <div className="text-right">
            {progress === 100 ? (
              <button
                onClick={onComplete}
                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
              >
                Complete Workflow
              </button>
            ) : (
              <span className="text-sm font-medium text-blue-600">
                In Progress
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Sidebar - Stage Navigation */}
        <StageNavigationSidebar
          totalStages={totalStages}
          currentStageIndex={currentStageIndex}
        />

        {/* Main Panel */}
        <div className="flex-1">
          <CurrentStagePanel />
        </div>

        {/* Right Panel - Documents & Messages */}
        <div className="w-80">
          <DocumentsPanel />
          <MessagesPanel />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* STAGE NAVIGATION SIDEBAR                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

interface StageNavigationSidebarProps {
  totalStages: number;
  currentStageIndex: number;
}

function StageNavigationSidebar({
  totalStages,
  currentStageIndex,
}: StageNavigationSidebarProps) {
  const stageNames = [
    "Intake",
    "Research",
    "Analysis",
    "Strategy",
    "Draft",
    "Review",
    "Assembly",
    "Approval",
  ];

  return (
    <div className="w-64 bg-white rounded-lg shadow-md p-6 h-fit sticky top-24">
      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
        Workflow Stages
      </h3>

      <div className="space-y-3">
        {Array.from({ length: totalStages }).map((_, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;

          return (
            <div key={index} className="flex items-start gap-3">
              {/* Icon */}
              <div
                className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                      ? "bg-blue-500 text-white ring-2 ring-blue-300"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {isCompleted ? "✓" : index + 1}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium transition ${
                    isCurrent
                      ? "text-blue-600"
                      : isCompleted
                        ? "text-green-600"
                        : "text-slate-600"
                  }`}
                >
                  {stageNames[index]}
                </p>
                <p className="text-xs text-slate-500">
                  {isCompleted ? "Completed" : isCurrent ? "Current" : "Coming up"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* CURRENT STAGE PANEL                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

function CurrentStagePanel() {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock stage data
  const stage = {
    title: "Tell Us About Your Case",
    description:
      "Help us understand your situation so we can create the best strategy.",
    fields: [
      {
        id: "case_type",
        label: "What type of case is this?",
        type: "select",
        required: true,
        options: [
          { label: "Green Card Appeal", value: "gc_appeal" },
          { label: "Visa Application", value: "visa_app" },
          { label: "FOIA Request", value: "foia" },
        ],
      },
      {
        id: "details",
        label: "Describe your situation",
        type: "textarea",
        required: true,
        placeholder: "Tell us what happened and what you need help with...",
      },
      {
        id: "deadline",
        label: "Do you have a deadline?",
        type: "date",
        required: false,
      },
    ],
    estimatedTime: "10 minutes",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Form submitted:", formData);
    setIsSubmitting(false);

    // Move to next stage
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      {/* Stage Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {stage.title}
        </h2>
        <p className="text-slate-600 mb-4">{stage.description}</p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>Estimated time: {stage.estimatedTime}</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {stage.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-slate-900">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.type === "select" ? (
              <select
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                required={field.required}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="">Select an option...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                placeholder={field.placeholder}
                required={field.required}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            ) : field.type === "date" ? (
              <input
                type="date"
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                required={field.required}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            ) : (
              <input
                type="text"
                value={formData[field.id] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, [field.id]: e.target.value })
                }
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            )}
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Zap className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <span>Next Stage</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* DOCUMENTS PANEL                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function DocumentsPanel() {
  const documents = [
    {
      id: "doc-1",
      name: "Appeal Letter",
      type: "letter",
      status: "approved",
      createdAt: new Date(),
    },
    {
      id: "doc-2",
      name: "Supporting Affidavit",
      type: "affidavit",
      status: "draft",
      createdAt: new Date(),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Documents ({documents.length})
      </h3>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {doc.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      doc.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {doc.status === "approved" ? "✓ Approved" : "Draft"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  title="View"
                  className="p-1 hover:bg-slate-200 rounded transition"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  title="Edit"
                  className="p-1 hover:bg-slate-200 rounded transition"
                >
                  <Edit2 className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  title="Download"
                  className="p-1 hover:bg-slate-200 rounded transition"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <p className="text-sm text-slate-500 italic">
          No documents yet. Complete the next stage to generate them.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* MESSAGES PANEL                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function MessagesPanel() {
  const messages = [
    {
      id: "msg-1",
      type: "ai",
      content:
        "Starting workflow. Let's get your case information first.",
      timestamp: new Date(Date.now() - 600000),
    },
    {
      id: "msg-2",
      type: "system",
      content: "Analyzing your input for immigration case patterns...",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "msg-3",
      type: "ai",
      content:
        "Found similar successful cases. Strategy focuses on regulatory compliance.",
      timestamp: new Date(Date.now() - 60000),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
        <MessageCircle className="w-4 h-4" />
        Analysis ({messages.length})
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-3 rounded-lg text-sm ${
              msg.type === "ai"
                ? "bg-blue-50 border border-blue-200"
                : msg.type === "system"
                  ? "bg-slate-50 border border-slate-200"
                  : "bg-slate-100 border border-slate-300"
            }`}
          >
            <div className="flex items-start gap-2">
              {msg.type === "ai" ? (
                <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-slate-900">{msg.content}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {format(msg.timestamp, "h:mm a")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* DOCUMENT REVIEW MODAL                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

interface DocumentReviewModalProps {
  isOpen: boolean;
  document: any;
  onApprove: () => void;
  onRequestRevision: (feedback: string) => void;
  onClose: () => void;
}

export function DocumentReviewModal({
  isOpen,
  document,
  onApprove,
  onRequestRevision,
  onClose,
}: DocumentReviewModalProps) {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">{document.name}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            {document.content}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t p-6 flex gap-3">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Request Changes
          </button>

          <button
            onClick={onApprove}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            ✓ Approve & Continue
          </button>
        </div>

        {/* Feedback Form */}
        {showFeedback && (
          <div className="border-t p-6">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What would you like to change?"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-3"
            />
            <button
              onClick={() => onRequestRevision(feedback)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Request Revision
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
