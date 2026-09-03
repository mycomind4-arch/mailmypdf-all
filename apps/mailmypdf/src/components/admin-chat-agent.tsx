/**
 * Admin Chat Agent
 *
 * Conversational interface for admins to manage workflows and verticals
 * Agent can interpret commands and make real-time edits to the platform
 */

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Send,
  Loader,
  CheckCircle2,
  AlertCircle,
  Code2,
  MessageCircle,
  Zap,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  action?: {
    type: string;
    status: "pending" | "success" | "error";
    description: string;
  };
}

interface AgentCommand {
  action: string;
  target: string; // "workflow" | "vertical" | "landing-page"
  params: Record<string, any>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* ADMIN CHAT AGENT                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

export function AdminChatAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content:
        "Hello! I'm your MailMyPDF platform assistant. I can help you manage workflows, edit verticals, customize landing pages, and make changes to any part of the platform. What would you like to do today?",
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const processAgentMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem("admin-session-token");

      const response = await fetch("/api/admin/chat-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error("Agent request failed");
      return response.json();
    },
    onSuccess: (data) => {
      // Add agent response
      const agentMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "agent",
        content: data.response,
        timestamp: new Date(),
        action: data.action
          ? {
              type: data.action.type,
              status: data.action.status,
              description: data.action.description,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, agentMessage]);
      setIsLoading(false);

      // If action succeeded, show success
      if (data.action?.status === "success") {
        setTimeout(() => {
          // Reload or update UI
          window.location.reload();
        }, 2000);
      }
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "agent",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Process with agent
    await processAgentMutation.mutateAsync(inputValue);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Platform Agent</h1>
            <p className="text-xs text-slate-600">
              AI-powered platform management assistant
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg p-4 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-bl-none"
                    : "bg-white text-slate-900 rounded-br-none border border-slate-200"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>

                {/* Action Status */}
                {msg.action && (
                  <div
                    className={`mt-3 p-2 rounded text-xs flex items-center gap-2 ${
                      msg.action.status === "success"
                        ? "bg-green-100 text-green-800"
                        : msg.action.status === "error"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {msg.action.status === "success" ? (
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                    ) : msg.action.status === "error" ? (
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <Loader className="w-3 h-3 flex-shrink-0 animate-spin" />
                    )}
                    {msg.action.description}
                  </div>
                )}

                <p className="text-xs mt-2 opacity-70">
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-slate-900 p-4 rounded-lg rounded-br-none border border-slate-200 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm">Processing your request...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Commands */}
      <div className="max-w-3xl mx-auto w-full px-6 py-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() =>
              setInputValue(
                "Add a new workflow to immigration mail called CP2025 Response"
              )
            }
            className="text-left px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-xs text-slate-700"
          >
            <span className="font-medium">Add Workflow</span>
          </button>
          <button
            onClick={() =>
              setInputValue("Change the immigration mail vertical color to blue")
            }
            className="text-left px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-xs text-slate-700"
          >
            <span className="font-medium">Edit Vertical</span>
          </button>
          <button
            onClick={() =>
              setInputValue(
                "Create a new landing page for appeal mail with green theme"
              )
            }
            className="text-left px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-xs text-slate-700"
          >
            <span className="font-medium">New Landing Page</span>
          </button>
          <button
            onClick={() =>
              setInputValue("List all available workflows and their status")
            }
            className="text-left px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-xs text-slate-700"
          >
            <span className="font-medium">View Workflows</span>
          </button>
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-slate-200 bg-white sticky bottom-0 px-6 py-4"
      >
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tell me what you want to change... (e.g., 'Add a new workflow to immigration mail')"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* EXAMPLE COMMANDS THE AGENT UNDERSTANDS                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export const AGENT_COMMAND_EXAMPLES = [
  "Add a new workflow called 'Student Loan Appeal' to appeal mail",
  "Change the immigration mail landing page headline to 'Professional Immigration Appeals'",
  "Update the dispute mail vertical description",
  "Create a new landing page for housing mail with orange color scheme",
  "Add Claude research aspect to the CP2000 workflow",
  "List all workflows in the immigration vertical",
  "Change the housing mail icon to a house",
  "Add a new vertical called 'Student Loans'",
  "Update the pricing for immigration mail workflows to $299",
  "Delete the old CP2015 workflow",
  "Duplicate the USCIS appeal workflow to create a new one",
  "Change the color scheme of all appeal workflows to green",
  "Add a testimonials section to the immigration landing page",
  "Update the SEO keywords for the dispute mail vertical",
  "Create a staging version of the immigration vertical for testing",
];
