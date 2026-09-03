/**
 * Claude Aspects Customization
 *
 * Allow admins to mix and match Claude AI capabilities
 * from any vertical into their workflow
 */

import { useState } from "react";
import { CheckCircle2, Circle, Zap, Brain, FileText, Scale } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/* CLAUDE ASPECTS BY VERTICAL                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export const CLAUDE_ASPECTS = {
  "immigration-mail": {
    name: "Immigration Mail",
    description: "Immigration case handling expertise",
    aspects: [
      {
        id: "immigration-research",
        name: "USCIS Research",
        description: "Research USCIS regulations, precedent, and procedures",
        icon: "Brain",
        complexity: "complex",
      },
      {
        id: "immigration-analysis",
        name: "Case Analysis",
        description: "Analyze eligibility, strengthen weak arguments",
        icon: "Scale",
        complexity: "complex",
      },
      {
        id: "immigration-strategy",
        name: "Immigration Strategy",
        description: "Develop winning immigration strategy",
        icon: "Zap",
        complexity: "complex",
      },
      {
        id: "immigration-letter",
        name: "Appeal Letter Generation",
        description: "Generate professional immigration appeal letters",
        icon: "FileText",
        complexity: "moderate",
      },
    ],
  },
  "dispute-mail": {
    name: "Dispute Mail",
    description: "Dispute resolution expertise",
    aspects: [
      {
        id: "dispute-research",
        name: "Dispute Law Research",
        description: "Research debt collection laws and consumer rights",
        icon: "Brain",
        complexity: "moderate",
      },
      {
        id: "dispute-analysis",
        name: "Debt Analysis",
        description: "Analyze debt validity and collection violations",
        icon: "Scale",
        complexity: "moderate",
      },
      {
        id: "dispute-strategy",
        name: "Dispute Strategy",
        description: "Develop dispute response strategy",
        icon: "Zap",
        complexity: "moderate",
      },
      {
        id: "dispute-letter",
        name: "Dispute Letter",
        description: "Generate professional dispute response letters",
        icon: "FileText",
        complexity: "simple",
      },
    ],
  },
  "cp-correspondence": {
    name: "CP Correspondence",
    description: "IRS notice handling expertise",
    aspects: [
      {
        id: "cp-research",
        name: "IRS Research",
        description: "Research IRS procedures and tax regulations",
        icon: "Brain",
        complexity: "complex",
      },
      {
        id: "cp-analysis",
        name: "Tax Analysis",
        description: "Analyze accuracy of IRS calculations",
        icon: "Scale",
        complexity: "complex",
      },
      {
        id: "cp-strategy",
        name: "Tax Strategy",
        description: "Develop IRS response strategy",
        icon: "Zap",
        complexity: "moderate",
      },
      {
        id: "cp-letter",
        name: "IRS Response Letter",
        description: "Generate IRS formal response letter",
        icon: "FileText",
        complexity: "moderate",
      },
    ],
  },
  "appeal-mail": {
    name: "Appeal Mail",
    description: "Appeals expertise",
    aspects: [
      {
        id: "appeal-research",
        name: "Appeal Research",
        description: "Research appeal procedures and precedent",
        icon: "Brain",
        complexity: "moderate",
      },
      {
        id: "appeal-analysis",
        name: "Appeal Strength Analysis",
        description: "Analyze appeal strength and success likelihood",
        icon: "Scale",
        complexity: "moderate",
      },
      {
        id: "appeal-strategy",
        name: "Appeal Strategy",
        description: "Develop winning appeal strategy",
        icon: "Zap",
        complexity: "moderate",
      },
      {
        id: "appeal-letter",
        name: "Appeal Letter",
        description: "Generate professional appeal letters",
        icon: "FileText",
        complexity: "simple",
      },
    ],
  },
  "records-request": {
    name: "Records Requests",
    description: "FOIA and records request expertise",
    aspects: [
      {
        id: "records-research",
        name: "Records Research",
        description: "Research FOIA procedures and timelines",
        icon: "Brain",
        complexity: "simple",
      },
      {
        id: "records-targeting",
        name: "Records Targeting",
        description: "Identify specific records to request",
        icon: "Scale",
        complexity: "simple",
      },
      {
        id: "records-foia",
        name: "FOIA Letter",
        description: "Generate FOIA request letters",
        icon: "FileText",
        complexity: "simple",
      },
    ],
  },
  "housing-mail": {
    name: "Housing Mail",
    description: "Housing and landlord expertise",
    aspects: [
      {
        id: "housing-research",
        name: "Housing Law Research",
        description: "Research tenant rights and housing law",
        icon: "Brain",
        complexity: "moderate",
      },
      {
        id: "housing-analysis",
        name: "Housing Analysis",
        description: "Analyze eviction and housing violations",
        icon: "Scale",
        complexity: "moderate",
      },
      {
        id: "housing-response",
        name: "Housing Response Letter",
        description: "Generate housing response letters",
        icon: "FileText",
        complexity: "simple",
      },
    ],
  },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* CLAUDE ASPECTS SELECTOR                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

interface ClaudeAspectsProps {
  selectedAspects: string[];
  onAspectsChange: (aspects: string[]) => void;
}

export function ClaudeAspectsSelector({
  selectedAspects,
  onAspectsChange,
}: ClaudeAspectsProps) {
  const [expandedVertical, setExpandedVertical] = useState<string | null>(null);

  const toggleAspect = (aspectId: string) => {
    if (selectedAspects.includes(aspectId)) {
      onAspectsChange(selectedAspects.filter((id) => id !== aspectId));
    } else {
      onAspectsChange([...selectedAspects, aspectId]);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Brain":
        return <Brain className="w-4 h-4" />;
      case "Scale":
        return <Scale className="w-4 h-4" />;
      case "Zap":
        return <Zap className="w-4 h-4" />;
      case "FileText":
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-2">
        Claude AI Aspects
      </h3>
      <p className="text-sm text-slate-600 mb-6">
        Mix and match Claude capabilities from any vertical to customize your
        workflow's AI assistance
      </p>

      <div className="space-y-3">
        {Object.entries(CLAUDE_ASPECTS).map(([verticalId, vertical]) => (
          <div key={verticalId}>
            {/* Vertical Header */}
            <button
              onClick={() =>
                setExpandedVertical(
                  expandedVertical === verticalId ? null : verticalId
                )
              }
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition border border-slate-200"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {expandedVertical === verticalId ? (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{vertical.name}</p>
                  <p className="text-xs text-slate-600">{vertical.description}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-white px-2 py-1 rounded">
                {vertical.aspects.filter((a) =>
                  selectedAspects.includes(a.id)
                ).length}/{vertical.aspects.length}
              </span>
            </button>

            {/* Aspects List */}
            {expandedVertical === verticalId && (
              <div className="ml-4 mt-2 space-y-2 pb-3 border-l-2 border-slate-200 pl-4">
                {vertical.aspects.map((aspect) => (
                  <button
                    key={aspect.id}
                    onClick={() => toggleAspect(aspect.id)}
                    className="w-full flex items-start gap-3 p-3 bg-slate-50 hover:bg-blue-50 rounded-lg transition border border-slate-200 hover:border-blue-300"
                  >
                    {/* Checkbox */}
                    <div className="mt-1 flex-shrink-0">
                      {selectedAspects.includes(aspect.id) ? (
                        <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {aspect.name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded">
                          {getIcon(aspect.icon)}
                          {aspect.complexity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {aspect.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-900">
          Selected Aspects: {selectedAspects.length}
        </p>
        <p className="text-xs text-blue-700 mt-1">
          These Claude capabilities will be integrated into your workflow's
          pipeline
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ASPECT COMBINATION VALIDATOR                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

export function validateAspectCombination(aspects: string[]): {
  valid: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  // Check for research aspect
  if (!aspects.some((a) => a.includes("research"))) {
    recommendations.push("Consider adding a research aspect for regulatory context");
  }

  // Check for analysis aspect
  if (!aspects.some((a) => a.includes("analysis"))) {
    recommendations.push("Add an analysis aspect to evaluate case strength");
  }

  // Check for letter generation
  if (!aspects.some((a) => a.includes("letter") || a.includes("response"))) {
    recommendations.push("Add a letter/document generation aspect");
  }

  return {
    valid: aspects.length > 0,
    recommendations,
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPER IMPORTS                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

import { ChevronDown, ChevronRight } from "lucide-react";
