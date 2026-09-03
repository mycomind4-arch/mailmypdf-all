/**
 * Admin Workflow Creator
 *
 * Complete admin tool to:
 * 1. Select vertical
 * 2. Choose workflow type
 * 3. Generate workflow + SEO landing page
 * 4. Preview and publish
 */

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Plus,
  ChevronRight,
  Eye,
  Zap,
  CheckCircle,
  AlertCircle,
  Globe,
  FileText,
  Loader,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

interface Vertical {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface WorkflowType {
  id: string;
  name: string;
  description: string;
  complexity: "simple" | "moderate" | "complex";
  estimatedHours: number;
  tags: string[];
}

interface GeneratedLandingPage {
  title: string;
  description: string;
  headline: string;
  subheadline: string;
  features: string[];
  pricing: string;
  cta: string;
  seoKeywords: string[];
  metaDescription: string;
  ogImage: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* SAMPLE DATA                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

const VERTICALS: Vertical[] = [
  {
    id: "immigration-mail",
    name: "Immigration Mail",
    description: "Government correspondence for immigration cases",
    icon: "Globe",
    color: "blue",
  },
  {
    id: "dispute-mail",
    name: "Dispute Mail",
    description: "Dispute resolution and debt collection responses",
    icon: "AlertCircle",
    color: "red",
  },
  {
    id: "cp-correspondence",
    name: "CP Correspondence",
    description: "IRS CP2000 and similar tax notices",
    icon: "Calculator",
    color: "green",
  },
  {
    id: "appeal-mail",
    name: "Appeal Mail",
    description: "Appeals for benefits and claims",
    icon: "Scale",
    color: "purple",
  },
  {
    id: "records-request",
    name: "Records Requests",
    description: "FOIA and public records requests",
    icon: "FolderOpen",
    color: "yellow",
  },
  {
    id: "housing-mail",
    name: "Housing Mail",
    description: "Landlord/tenant and housing disputes",
    icon: "Home",
    color: "orange",
  },
];

const WORKFLOW_TYPES: Record<string, WorkflowType[]> = {
  "immigration-mail": [
    {
      id: "uscis-gc-appeal",
      name: "USCIS Green Card Appeal",
      description: "Appeal denied or delayed green card application",
      complexity: "complex",
      estimatedHours: 6,
      tags: ["USCIS", "Green Card", "Appeals"],
    },
    {
      id: "visa-application",
      name: "Visa Application Response",
      description: "Respond to visa interview questions or denials",
      complexity: "moderate",
      estimatedHours: 4,
      tags: ["Visa", "Embassy"],
    },
    {
      id: "foia-request",
      name: "FOIA Request to USCIS",
      description: "Request immigration file or records",
      complexity: "simple",
      estimatedHours: 2,
      tags: ["FOIA", "Records"],
    },
    {
      id: "advance-parole",
      name: "Advance Parole (Travel Document)",
      description: "Request advance parole for travel",
      complexity: "moderate",
      estimatedHours: 3,
      tags: ["Travel", "I-131"],
    },
    {
      id: "ead-work-permit",
      name: "EAD/Work Permit Request",
      description: "Request or renew employment authorization",
      complexity: "moderate",
      estimatedHours: 3,
      tags: ["Work Permit", "EAD", "I-765"],
    },
  ],
  "dispute-mail": [
    {
      id: "debt-collection-response",
      name: "Debt Collection Response",
      description: "Respond to debt collection letter",
      complexity: "moderate",
      estimatedHours: 2,
      tags: ["Debt", "Collection"],
    },
    {
      id: "credit-dispute",
      name: "Credit Report Dispute",
      description: "Dispute inaccurate credit report items",
      complexity: "simple",
      estimatedHours: 1.5,
      tags: ["Credit", "Dispute"],
    },
  ],
  "cp-correspondence": [
    {
      id: "cp2000-response",
      name: "CP2000 Response",
      description: "Respond to IRS accuracy-related notice",
      complexity: "complex",
      estimatedHours: 5,
      tags: ["IRS", "CP2000", "Taxes"],
    },
    {
      id: "cp2015-response",
      name: "CP2015 Response",
      description: "Respond to failure to pay notice",
      complexity: "moderate",
      estimatedHours: 3,
      tags: ["IRS", "CP2015"],
    },
  ],
  "appeal-mail": [
    {
      id: "benefits-appeal",
      name: "Benefits Appeal",
      description: "Appeal denied benefits (SSDI, unemployment, etc.)",
      complexity: "moderate",
      estimatedHours: 4,
      tags: ["Benefits", "Appeal"],
    },
    {
      id: "insurance-appeal",
      name: "Insurance Claim Appeal",
      description: "Appeal denied insurance claim",
      complexity: "moderate",
      estimatedHours: 3,
      tags: ["Insurance", "Claim"],
    },
  ],
  "records-request": [
    {
      id: "foia-federal",
      name: "Federal FOIA Request",
      description: "Request records from federal agency",
      complexity: "simple",
      estimatedHours: 1.5,
      tags: ["FOIA", "Federal"],
    },
  ],
  "housing-mail": [
    {
      id: "eviction-response",
      name: "Eviction Notice Response",
      description: "Respond to eviction notice",
      complexity: "moderate",
      estimatedHours: 2,
      tags: ["Eviction", "Tenant"],
    },
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* ADMIN WORKFLOW CREATOR                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export function AdminWorkflowCreator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "customize" | "preview" | "publish">("select");
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [generatedPage, setGeneratedPage] = useState<GeneratedLandingPage | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [customizationText, setCustomizationText] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVertical || !selectedWorkflow) {
        throw new Error("Please select vertical and workflow");
      }

      // Call server to generate workflow + landing page
      const response = await fetch("/api/admin/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verticalId: selectedVertical,
          workflowId: selectedWorkflow,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate workflow");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedPage(data.landingPage);
      setStep("preview");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/publish-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verticalId: selectedVertical,
          workflowId: selectedWorkflow,
          landingPage: generatedPage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to publish workflow");
      }

      return response.json();
    },
    onSuccess: () => {
      setStep("publish");
    },
  });

  const vertical = VERTICALS.find((v) => v.id === selectedVertical);
  const workflows = selectedVertical ? WORKFLOW_TYPES[selectedVertical] || [] : [];
  const workflow = workflows.find((w) => w.id === selectedWorkflow);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <AdminLoginScreen
        onLogin={(token) => {
          setSessionToken(token);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Workflow Creator</h1>
              <p className="text-sm text-slate-600">
                Generate new workflows with AI + auto-generated landing pages
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-6 overflow-x-auto">
            <div className={`flex items-center gap-3 whitespace-nowrap ${step === "select" ? "opacity-100" : "opacity-50"}`}>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <span className="font-medium text-slate-900">Select</span>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

            <div className={`flex items-center gap-3 whitespace-nowrap ${step === "customize" ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                step === "customize" || step === "preview" || step === "publish"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}>
                2
              </div>
              <span className="font-medium text-slate-900">Customize</span>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

            <div className={`flex items-center gap-3 whitespace-nowrap ${step === "preview" ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                step === "preview" || step === "publish"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}>
                3
              </div>
              <span className="font-medium text-slate-900">Preview</span>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

            <div className={`flex items-center gap-3 whitespace-nowrap ${step === "publish" ? "opacity-100" : "opacity-50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
                step === "publish"
                  ? "bg-green-600 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}>
                {step === "publish" ? "✓" : "4"}
              </div>
              <span className="font-medium text-slate-900">Publish</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-end">
        <button
          onClick={() => {
            setIsAuthenticated(false);
            setSessionToken(null);
          }}
          className="text-sm text-slate-600 hover:text-slate-900 transition"
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {step === "select" && (
          <SelectStep
            verticals={VERTICALS}
            selectedVertical={selectedVertical}
            onSelectVertical={setSelectedVertical}
            workflows={workflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={setSelectedWorkflow}
            workflow={workflow}
            onNext={() => setStep("customize")}
            isLoading={generateMutation.isPending}
          />
        )}

        {step === "customize" && workflow && (
          <CustomizeStep
            vertical={vertical}
            workflow={workflow}
            referenceImage={referenceImage}
            onReferenceImageChange={setReferenceImage}
            customizationText={customizationText}
            onCustomizationTextChange={setCustomizationText}
            onBack={() => setStep("select")}
            onGenerate={async () => {
              await generateMutation.mutate();
            }}
            isLoading={generateMutation.isPending}
          />
        )}

        {step === "preview" && generatedPage && (
          <PreviewStep
            vertical={vertical}
            workflow={workflow}
            landingPage={generatedPage}
            onBack={() => setStep("customize")}
            onPublish={() => publishMutation.mutate()}
            isLoading={publishMutation.isPending}
          />
        )}

        {step === "publish" && (
          <PublishStep
            vertical={vertical}
            workflow={workflow}
            onCreateAnother={() => {
              setStep("select");
              setSelectedVertical(null);
              setSelectedWorkflow(null);
              setGeneratedPage(null);
              setReferenceImage(null);
              setCustomizationText("");
            }}
          />
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* LOGIN SCREEN                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function AdminLoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      onLogin(data.sessionToken);
    } catch (err) {
      setError("Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">MailMyPDF Admin</h1>
          <p className="text-sm text-slate-600 mt-2">Workflow Creator Dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mailmypdf.ai"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Credentials hint */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-slate-600 mb-2">Demo Credentials:</p>
          <p className="text-xs font-mono text-slate-700">
            admin@mailmypdf.ai
          </p>
          <p className="text-xs font-mono text-slate-700">666mdr222</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* STEP 1: SELECT VERTICAL & WORKFLOW                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

function SelectStep({
  verticals,
  selectedVertical,
  onSelectVertical,
  workflows,
  selectedWorkflow,
  onSelectWorkflow,
  workflow,
  onNext,
  isLoading,
}: any) {
  return (
    <div className="grid grid-cols-3 gap-8">
      {/* Verticals */}
      <div className="col-span-1 space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">1. Select Vertical</h2>
          <div className="space-y-2">
            {verticals.map((vertical: Vertical) => (
              <button
                key={vertical.id}
                onClick={() => onSelectVertical(vertical.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedVertical === vertical.id
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <p className="font-medium text-slate-900">{vertical.name}</p>
                <p className="text-xs text-slate-600 mt-1">{vertical.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Workflows */}
      <div className="col-span-1 space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">2. Select Workflow</h2>
          {workflows.length > 0 ? (
            <div className="space-y-2">
              {workflows.map((w: WorkflowType) => (
                <button
                  key={w.id}
                  onClick={() => onSelectWorkflow(w.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition ${
                    selectedWorkflow === w.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <p className="font-medium text-slate-900 text-sm">{w.name}</p>
                  <p className="text-xs text-slate-600 mt-1">{w.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">
                      {w.complexity}
                    </span>
                    <span className="text-xs text-slate-600">
                      {w.estimatedHours}h
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Select a vertical first</p>
          )}
        </div>
      </div>

      {/* Preview Selection */}
      <div className="col-span-1 space-y-4">
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Summary</h2>

          {selectedVertical && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-slate-600 mb-1">Vertical</p>
              <p className="font-medium text-slate-900">{verticals.find((v: Vertical) => v.id === selectedVertical)?.name}</p>
            </div>
          )}

          {workflow && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-slate-600 mb-1">Workflow</p>
              <p className="font-medium text-slate-900">{workflow.name}</p>
              <p className="text-xs text-slate-600 mt-1">{workflow.description}</p>
            </div>
          )}

          {selectedVertical && selectedWorkflow && (
            <button
              onClick={onNext}
              disabled={isLoading}
              className="w-full mt-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              <>
                <ChevronRight className="w-4 h-4" />
                Customize Landing Page
              </>
            </button>
          )}

          {!selectedVertical && (
            <p className="text-sm text-slate-600 italic">
              Select a vertical and workflow to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* STEP 2: CUSTOMIZE LANDING PAGE                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function CustomizeStep({
  vertical,
  workflow,
  referenceImage,
  onReferenceImageChange,
  customizationText,
  onCustomizationTextChange,
  onBack,
  onGenerate,
  isLoading,
}: any) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onReferenceImageChange(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Customize Landing Page
        </h2>
        <p className="text-slate-600">
          {vertical?.name} → {workflow?.name}
        </p>
        <p className="text-sm text-slate-600 mt-2">
          (Optional) Upload a reference image or describe how you want it to look
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Reference Image Upload */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Reference Image</h3>
          <p className="text-sm text-slate-600 mb-4">
            Upload a reference image of how you want the landing page to look
          </p>

          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Reference"
                  className="w-full h-48 object-cover rounded-lg border border-slate-300"
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    onReferenceImageChange(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-6 py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-center"
              >
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-900">Click to upload</p>
                <p className="text-sm text-slate-600">or drag and drop</p>
                <p className="text-xs text-slate-600 mt-2">PNG, JPG, GIF up to 10MB</p>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Customization Text */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Design Notes</h3>
          <p className="text-sm text-slate-600 mb-4">
            Describe how you want the landing page to look
          </p>

          <textarea
            value={customizationText}
            onChange={(e) => onCustomizationTextChange(e.target.value)}
            placeholder={`Example:\n- Modern and professional design\n- Blue and white color scheme\n- Emphasize speed and simplicity\n- Include testimonials section\n- Call-to-action button in top-right`}
            rows={8}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 flex gap-3">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
        >
          ← Back
        </button>

        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Landing Page
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* STEP 3: PREVIEW LANDING PAGE                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

function PreviewStep({
  vertical,
  workflow,
  landingPage,
  onBack,
  onPublish,
  isLoading,
}: any) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow-md p-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Landing Page Preview</h2>
          <p className="text-sm text-slate-600 mt-1">
            {vertical?.name} → {workflow?.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={`px-3 py-2 rounded transition ${
                previewMode === "desktop"
                  ? "bg-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={`px-3 py-2 rounded transition ${
                previewMode === "mobile"
                  ? "bg-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mobile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Preview */}
        <div className="col-span-2">
          <div
            className={`bg-white rounded-lg shadow-lg overflow-hidden ${
              previewMode === "mobile" ? "max-w-sm mx-auto" : ""
            }`}
          >
            <LandingPagePreview page={landingPage} />
          </div>
        </div>

        {/* Details */}
        <div className="col-span-1 space-y-4">
          {/* Title & Description */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-slate-900 mb-3">Page Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-600 mb-1">Title</p>
                <p className="font-medium text-slate-900">{landingPage.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Meta Description</p>
                <p className="text-sm text-slate-700">{landingPage.metaDescription}</p>
              </div>
            </div>
          </div>

          {/* SEO Keywords */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              SEO Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {landingPage.seoKeywords.slice(0, 6).map((keyword: string, idx: number) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 space-y-3">
            <button
              onClick={onBack}
              className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Back
            </button>
            <button
              onClick={onPublish}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Publish Workflow
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* STEP 3: SUCCESS                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

function PublishStep({ vertical, workflow, onCreateAnother }: any) {
  const workflowUrl = `/${vertical?.id}/${workflow?.id}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-12 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-slate-900">Workflow Published!</h2>

        <p className="text-slate-600 max-w-md mx-auto">
          Your new workflow "{workflow?.name}" is now live and ready for users.
          The SEO landing page has been automatically generated and published.
        </p>

        {/* Details */}
        <div className="bg-slate-50 rounded-lg p-6 text-left space-y-3 my-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Vertical:</span>
            <span className="font-medium text-slate-900">{vertical?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Workflow:</span>
            <span className="font-medium text-slate-900">{workflow?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Live URL:</span>
            <span className="font-mono text-sm text-blue-600">{workflowUrl}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Published:</span>
            <span className="font-medium text-slate-900">Just now</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <a
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View Live Page
          </a>

          <button
            onClick={onCreateAnother}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Another
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* LANDING PAGE PREVIEW                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function LandingPagePreview({ page }: { page: GeneratedLandingPage }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{page.headline}</h1>
          <p className="text-xl text-slate-600 mb-8">{page.subheadline}</p>
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            {page.cta}
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
          What You Get
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {page.features.map((feature: string, idx: number) => (
            <div key={idx} className="flex items-start gap-3 bg-white p-4 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700">{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-3xl font-bold text-blue-400">{page.pricing}</p>
          <button className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium">
            {page.cta}
          </button>
        </div>
      </section>
    </div>
  );
}
