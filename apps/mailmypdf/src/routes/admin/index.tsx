/**
 * Admin Dashboard
 * Manage workflows, metadata, content, and analytics
 */

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage workflows, content, and settings</p>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Total Workflows</div>
            <div className="text-3xl font-bold text-gray-900">13</div>
            <div className="text-green-600 text-sm mt-2">All active</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Total Guides</div>
            <div className="text-3xl font-bold text-gray-900">9</div>
            <div className="text-yellow-600 text-sm mt-2">4 need content</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Monthly Searches</div>
            <div className="text-3xl font-bold text-gray-900">74K</div>
            <div className="text-blue-600 text-sm mt-2">Target volume</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Active Categories</div>
            <div className="text-3xl font-bold text-gray-900">9</div>
            <div className="text-green-600 text-sm mt-2">All organized</div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workflow Management */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Workflow Management</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full px-4 py-2 text-left bg-blue-50 hover:bg-blue-100 rounded text-blue-700 font-medium transition-colors">
                ➕ Add New Workflow
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                ✏️ Edit Workflows
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                📊 Workflow Analytics
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                🔍 Metadata Editor
              </button>
            </div>
          </div>

          {/* Content Management */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Content Management</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full px-4 py-2 text-left bg-green-50 hover:bg-green-100 rounded text-green-700 font-medium transition-colors">
                📝 Write New Guide
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                ✏️ Edit Guides
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                📂 Manage Categories
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                🔗 Internal Links
              </button>
            </div>
          </div>

          {/* SEO Management */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">SEO Management</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full px-4 py-2 text-left bg-purple-50 hover:bg-purple-100 rounded text-purple-700 font-medium transition-colors">
                🎯 Keyword Research
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                🗺️ Sitemap Generator
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                📋 SEO Checklist
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                🔍 Audit Report
              </button>
            </div>
          </div>

          {/* Settings & Integration */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Settings & Integration</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                ⚙️ Site Settings
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                💳 Payment Gateway
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                📊 Analytics Integration
              </button>
              <button className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded text-gray-700 font-medium transition-colors">
                👥 User Management
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Statistics</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Page Load Time (Avg)</span>
              <span className="font-bold text-green-600">1.2s</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">SEO Score (Estimated)</span>
              <span className="font-bold text-blue-600">85/100</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Mobile Friendly</span>
              <span className="font-bold text-green-600">✓ Yes</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Accessibility Score</span>
              <span className="font-bold text-yellow-600">78/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
