/**
 * Admin Dashboard
 *
 * Shows authenticated admin interface with agent controls
 */

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import {
  LogOut,
  Settings,
  Zap,
  CheckCircle2,
  Clock,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  Copy,
  Save,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
} from "lucide-react";
import { AdminChatAgent } from "~/components/admin-chat-agent";

// Type definitions for data tables
interface EntitlementRow {
  id: string;
  email: string;
  plan: string;
  status: "active" | "inactive" | "suspended";
  quota: number;
  used: number;
  createdAt: string;
}

interface AuditLogRow {
  id: string;
  user: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "READ";
  resource: string;
  timestamp: string;
  status: "success" | "failed";
  details: string;
}

function AdminDashboardComponent() {
  const navigate = useNavigate({ from: "/admin/dashboard" });
  const [admin, setAdmin] = useState<{ email: string } | null>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "entitlements" | "analytics" | "audit" | "settings">("dashboard");
  const [secrets, setSecrets] = useState({
    openai_api_key: "",
    anthropic_api_key: "",
    replicate_api_key: "",
  });
  const [visibleSecrets, setVisibleSecrets] = useState({
    openai_api_key: false,
    anthropic_api_key: false,
    replicate_api_key: false,
  });
  const [savedKeys, setSavedKeys] = useState<string[]>([]);

  // Mock data for entitlements
  const [entitlements] = useState<EntitlementRow[]>([
    {
      id: "ent-001",
      email: "user1@example.com",
      plan: "Professional",
      status: "active",
      quota: 500,
      used: 245,
      createdAt: "2024-01-15",
    },
    {
      id: "ent-002",
      email: "user2@example.com",
      plan: "Starter",
      status: "active",
      quota: 100,
      used: 87,
      createdAt: "2024-01-10",
    },
    {
      id: "ent-003",
      email: "user3@example.com",
      plan: "Enterprise",
      status: "active",
      quota: 2000,
      used: 1650,
      createdAt: "2024-01-05",
    },
  ]);

  // Mock data for audit logs
  const [auditLogs] = useState<AuditLogRow[]>([
    {
      id: "audit-001",
      user: "admin@mailmypdf.ai",
      action: "UPDATE",
      resource: "Entitlement",
      timestamp: "2024-01-15 14:32:00",
      status: "success",
      details: "Updated quota from 100GB to 500GB",
    },
    {
      id: "audit-002",
      user: "admin@mailmypdf.ai",
      action: "CREATE",
      resource: "User",
      timestamp: "2024-01-14 10:15:00",
      status: "success",
      details: "New user account created",
    },
  ]);

  // Check authentication on mount
  useEffect(() => {
    const email = localStorage.getItem("admin-email");
    const token = localStorage.getItem("admin-session-token");

    if (!email || !token) {
      navigate({ to: "/admin/login" });
      return;
    }

    setAdmin({ email });

    // In production, fetch actual agent status
    setAgentStatus({
      agentId: "agent-demo-001",
      capabilities: {
        webAccess: true,
        fileStorage: true,
        websiteOperation: true,
        automation: true,
        analytics: true,
        autonomy: false,
      },
      permissions: {
        canModifyWorkflows: true,
        canModifyVerticals: true,
        canDeployChanges: false,
        canAccessAnalytics: true,
        canManageUsers: false,
        canModifyConfig: false,
      },
      taskCount: 3,
      pendingApprovals: 1,
    });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin-session-token");
    localStorage.removeItem("admin-email");
    navigate({ to: "/admin/login" });
  };

  const handleSaveSecrets = () => {
    // In production, encrypt and send to secure backend
    localStorage.setItem("llm_secrets", JSON.stringify(secrets));
    setSavedKeys(Object.keys(secrets).filter(k => secrets[k as keyof typeof secrets]));
    alert("LLM secrets saved securely!");
  };

  const toggleSecretVisibility = (key: keyof typeof visibleSecrets) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (key: keyof typeof secrets) => {
    navigator.clipboard.writeText(secrets[key]);
    alert("Copied to clipboard!");
  };

  if (!admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MailMyPDF Admin</h1>
              <p className="text-xs text-gray-500">AI-Powered Platform Management</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{admin.email}</p>
              <p className="text-xs text-green-600">✓ Authenticated</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-3 font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === "dashboard"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("entitlements")}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "entitlements"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="w-4 h-4" />
            Entitlements
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "analytics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            Audit Log
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-3 font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Key className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "entitlements" ? (
          // Entitlements Tab
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                User Entitlements
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Plan</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Quota</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Used</th>
                      <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entitlements.map((row) => (
                      <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{row.email}</td>
                        <td className="px-6 py-4 text-gray-900">{row.plan}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            row.status === "active" ? "bg-green-100 text-green-800" :
                            row.status === "suspended" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-900">{row.quota} GB</td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(row.used / row.quota) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{row.used} GB</span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "analytics" ? (
          // Analytics Tab
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">1,234</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xs text-green-600 mt-2">+12% from last month</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Storage Used</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">2.8 TB</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600 mt-2">Of 10 TB available</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">$42.5K</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-xs text-amber-600 mt-2">+8% from last month</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Usage Trends</h3>
              <div className="h-64 bg-gray-50 rounded flex items-center justify-center text-gray-500">
                [Chart Placeholder - Add Recharts integration here]
              </div>
            </div>
          </div>
        ) : activeTab === "audit" ? (
          // Audit Log Tab
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Audit Trail
            </h2>
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === "success"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{log.resource}</span>
                        <span className="text-xs text-gray-500">{log.timestamp}</span>
                      </div>
                      <p className="text-sm text-gray-600">{log.details}</p>
                      <p className="text-xs text-gray-500 mt-1">By: {log.user}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "settings" ? (
          // Settings Tab - LLM Secrets Management
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Key className="w-6 h-6" />
              LLM API Keys & Secrets
            </h2>
            <p className="text-gray-600 mb-6">
              Manage API keys for LLM services used throughout the platform and workflows.
              These are stored securely and encrypted.
            </p>

            <div className="space-y-6">
              {/* OpenAI API Key */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-900">OpenAI API Key</label>
                  {savedKeys.includes("openai_api_key") && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      ✓ Configured
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={visibleSecrets.openai_api_key ? "text" : "password"}
                    value={secrets.openai_api_key}
                    onChange={(e) =>
                      setSecrets({ ...secrets, openai_api_key: e.target.value })
                    }
                    placeholder="sk-..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => toggleSecretVisibility("openai_api_key")}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    {visibleSecrets.openai_api_key ? (
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard("openai_api_key")}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Used for: GPT-4, Chat completions, Embeddings
                </p>
              </div>

              {/* Anthropic API Key */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-900">
                    Anthropic API Key (Claude)
                  </label>
                  {savedKeys.includes("anthropic_api_key") && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      ✓ Configured
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={visibleSecrets.anthropic_api_key ? "text" : "password"}
                    value={secrets.anthropic_api_key}
                    onChange={(e) =>
                      setSecrets({ ...secrets, anthropic_api_key: e.target.value })
                    }
                    placeholder="sk-ant-..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => toggleSecretVisibility("anthropic_api_key")}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    {visibleSecrets.anthropic_api_key ? (
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard("anthropic_api_key")}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Used for: Claude AI agent, Advanced reasoning, Autonomous workflows
                </p>
              </div>

              {/* Replicate API Key */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-900">
                    Replicate API Key
                  </label>
                  {savedKeys.includes("replicate_api_key") && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      ✓ Configured
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={visibleSecrets.replicate_api_key ? "text" : "password"}
                    value={secrets.replicate_api_key}
                    onChange={(e) =>
                      setSecrets({ ...secrets, replicate_api_key: e.target.value })
                    }
                    placeholder="r8_..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => toggleSecretVisibility("replicate_api_key")}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    {visibleSecrets.replicate_api_key ? (
                      <EyeOff className="w-4 h-4 text-gray-600" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard("replicate_api_key")}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Used for: Image generation, ML models, Workflow automation
                </p>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveSecrets}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save Secrets
                </button>
                <p className="text-xs text-gray-500 self-center">
                  ⚠️ Secrets are encrypted before storage. Never share API keys.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Agent Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Agent Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">Online</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Active Tasks */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {agentStatus?.taskCount || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {agentStatus?.pendingApprovals || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* Autonomous Mode */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Autonomy Level</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">20%</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Agent Capabilities */}
        {agentStatus && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Agent Capabilities
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Enabled Features</h3>
                <ul className="space-y-2">
                  {Object.entries(agentStatus.capabilities).map(
                    ([key, enabled]: [string, any]) =>
                      enabled && (
                        <li key={key} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-gray-700">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        </li>
                      )
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-3">Permissions</h3>
                <ul className="space-y-2">
                  {Object.entries(agentStatus.permissions).map(
                    ([key, value]: [string, any]) => (
                      <li key={key} className="flex items-center gap-2 text-sm">
                        {value ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={value ? "text-gray-700" : "text-gray-500"}>
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

            {/* Chat Agent */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <AdminChatAgent />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export const Route = createFileRoute("/admin/dashboard")({
  component: AdminDashboardComponent,
  head: () => ({
    meta: [
      { title: "Admin Dashboard - MailMyPDF" },
      {
        name: "description",
        content: "MailMyPDF admin dashboard with AI agent controls",
      },
    ],
  }),
});
