/**
 * MailMyPDF Workflow Hub
 *
 * Unified workflow discovery, account workspace, and navigation center
 * for authenticated users across the entire MailMyPDF ecosystem.
 *
 * Features:
 * - Aggregated workflows from all 8+ verticals
 * - Smart categorization and search
 * - In-progress workflow tracking
 * - Popular workflows section
 * - Browse by category
 * - Favorites persistence
 * - Entitlements-aware display (available/premium/locked)
 * - Responsive layout (desktop/tablet/mobile)
 */

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  Plus,
  Star,
  ArrowRight,
  Zap,
  Clock,
  CheckCircle,
  Lock,
  Grid,
  List,
  X,
  Heart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthenticatedSidebar } from "@/components/authenticated-sidebar";
import {
  getWorkflowHubData,
  searchWorkflows,
  getWorkflowsByCategory,
  toggleWorkflowFavorite,
  getWorkflowCategories,
  type WorkflowCatalogEntry,
  type UserWorkflowState,
  type WorkflowCategory,
} from "@/lib/workflow-hub.functions";

export const Route = createFileRoute("/workflows/")({
  component: WorkflowHub,
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/auth" });
    }
  },
});

function WorkflowHub() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategory | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Data queries
  const { data: hubData, isLoading: hubLoading } = useQuery({
    queryKey: ["workflow-hub"],
    queryFn: () => getWorkflowHubData.fetch(),
  });

  const { data: categories } = useQuery({
    queryKey: ["workflow-categories"],
    queryFn: () => getWorkflowCategories.fetch(),
  });

  const { data: searchResults } = useQuery({
    queryKey: ["workflow-search", searchQuery],
    queryFn: () => (searchQuery ? searchWorkflows.fetch(searchQuery) : null),
    enabled: !!searchQuery,
  });

  const { data: categoryResults } = useQuery({
    queryKey: ["workflow-category", selectedCategory],
    queryFn: () =>
      selectedCategory ? getWorkflowsByCategory.fetch(selectedCategory) : null,
    enabled: !!selectedCategory,
  });

  // Favorites mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: (workflowId: string) => {
      const isFavorite = hubData?.userFavorites.includes(workflowId) ?? false;
      return toggleWorkflowFavorite.fetch(workflowId, !isFavorite);
    },
  });

  // Computed
  const displayWorkflows = selectedCategory
    ? categoryResults
    : searchQuery
      ? searchResults
      : null;

  const greeting = getGreeting();

  if (hubLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <AuthenticatedSidebar
        user={user}
        userRole="member"
        organizationName="MailMyPDF"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-rule/60 bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Greeting */}
            <div className="flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl">{greeting}</h1>
              <p className="text-sm text-ink-soft">{user?.email}</p>
            </div>

            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-sm">
              <SearchInput
                query={searchQuery}
                setQuery={setSearchQuery}
                onClear={() => setSelectedCategory(null)}
              />
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate({ to: "/ecosystem" })}
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 text-sm font-medium text-white hover:-translate-y-0.5 transition-transform"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Workflow</span>
              <span className="inline sm:hidden">New</span>
            </button>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="md:hidden rounded-lg border border-rule p-2 hover:bg-card transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Search Bar */}
          {showSearch && (
            <div className="mt-4 md:hidden">
              <SearchInput
                query={searchQuery}
                setQuery={setSearchQuery}
                onClear={() => setSelectedCategory(null)}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Summary Cards Section */}
          {!searchQuery && !selectedCategory && hubData && (
            <section>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 gap-4">
                <SummaryCard
                  icon={Zap}
                  label="Available"
                  value={hubData.availableWorkflowsCount}
                  color="cobalt"
                />
                <SummaryCard
                  icon={Clock}
                  label="In Progress"
                  value={hubData.userInProgressWorkflows.length}
                  color="amber"
                />
                <SummaryCard
                  icon={CheckCircle}
                  label="Completed"
                  value={hubData.userCompletedCount}
                  color="success"
                />
                <SummaryCard
                  icon={Heart}
                  label="Favorites"
                  value={hubData.userFavorites.length}
                  color="rose"
                />
              </div>
            </section>
          )}

          {/* In-Progress Workflows Section */}
          {!searchQuery &&
            !selectedCategory &&
            hubData &&
            hubData.userInProgressWorkflows.length > 0 && (
              <InProgressSection workflows={hubData.userInProgressWorkflows} />
            )}

          {/* Search Results */}
          {(searchQuery || selectedCategory) && displayWorkflows && (
            <SearchResultsSection
              query={searchQuery}
              category={selectedCategory}
              workflows={displayWorkflows}
              favorites={hubData?.userFavorites || []}
              onClear={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
              onToggleFavorite={(wfId) => toggleFavoriteMutation.mutate(wfId)}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          )}

          {/* Popular Workflows Section */}
          {!searchQuery && !selectedCategory && hubData && (
            <PopularWorkflowsSection
              workflows={hubData.popularWorkflows}
              favorites={hubData.userFavorites}
              onToggleFavorite={(wfId) => toggleFavoriteMutation.mutate(wfId)}
            />
          )}

          {/* Browse by Category Section */}
          {!searchQuery && !selectedCategory && categories && (
            <CategoryBrowseSection
              categories={categories}
              onSelectCategory={setSelectedCategory}
            />
          )}

          {/* All Workflows Section (when not searching/filtering) */}
          {!searchQuery && !selectedCategory && hubData && (
            <AllWorkflowsSection
              workflows={hubData.workflows}
              favorites={hubData.userFavorites}
              onToggleFavorite={(wfId) => toggleFavoriteMutation.mutate(wfId)}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          )}

          {/* Empty State */}
          {searchQuery && searchResults?.length === 0 && (
            <div className="rounded-lg border border-rule/60 bg-card p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-ink-soft" />
              <p className="text-lg font-medium">No workflows found</p>
              <p className="text-sm text-ink-soft mt-2">
                Try searching for "{searchQuery}" with different keywords
              </p>
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* COMPONENTS                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function SearchInput({
  query,
  setQuery,
  onClear,
}: {
  query: string;
  setQuery: (q: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
      <input
        type="text"
        placeholder="Search workflows..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-10 pr-10 py-2 rounded-lg border border-rule bg-card hover:border-rule-dark focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/10 transition-colors"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            onClear();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    cobalt: "bg-cobalt/10 text-cobalt",
    amber: "bg-amber-100/50 text-amber-700",
    success: "bg-emerald-100/50 text-emerald-700",
    rose: "bg-rose-100/50 text-rose-700",
  };

  return (
    <div className="rounded-lg border border-rule/60 bg-card p-4 hover:bg-card-hover transition-colors cursor-default">
      <div className={`inline-flex rounded-lg p-2 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-ink-soft mt-1">{label}</p>
    </div>
  );
}

function InProgressSection({ workflows }: { workflows: UserWorkflowState[] }) {
  return (
    <section>
      <h2 className="font-serif text-2xl mb-4">In Progress</h2>
      <div className="space-y-3">
        {workflows.map((workflow) => (
          <div
            key={workflow.runId}
            className="rounded-lg border border-rule/60 bg-card p-4 hover:bg-card-hover transition-colors"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{workflow.workflowId}</h3>
                <p className="text-xs text-ink-soft">
                  {formatDistanceToNow(new Date(workflow.updatedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-2 bg-rule/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cobalt transition-all"
                      style={{ width: `${workflow.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-soft w-8">
                    {workflow.progressPercent}%
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-soft flex-shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PopularWorkflowsSection({
  workflows,
  favorites,
  onToggleFavorite,
}: {
  workflows: WorkflowCatalogEntry[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl mb-4">Popular Workflows</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            isFavorite={favorites.includes(workflow.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}

function CategoryBrowseSection({
  categories,
  onSelectCategory,
}: {
  categories: any[];
  onSelectCategory: (cat: WorkflowCategory) => void;
}) {
  return (
    <section>
      <h2 className="font-serif text-2xl mb-4">Browse by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {categories.map((category) => (
          <button
            key={category.category}
            onClick={() => onSelectCategory(category.category as WorkflowCategory)}
            className="group rounded-lg border border-rule/60 bg-card p-4 text-center hover:bg-card-hover hover:border-rule-dark transition-colors"
          >
            <div className="text-2xl mb-2">{category.icon}</div>
            <p className="text-sm font-medium group-hover:text-cobalt transition-colors">
              {category.label}
            </p>
            <p className="text-xs text-ink-soft mt-1">{category.count} workflows</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function AllWorkflowsSection({
  workflows,
  favorites,
  onToggleFavorite,
  viewMode,
  setViewMode,
}: {
  workflows: WorkflowCatalogEntry[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl">All Workflows</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-cobalt text-white"
                : "border border-rule/60 hover:bg-card"
            }`}
          >
            <Grid className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-lg p-2 transition-colors ${
              viewMode === "list"
                ? "bg-cobalt text-white"
                : "border border-rule/60 hover:bg-card"
            }`}
          >
            <List className="h-5 w-5" />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              isFavorite={favorites.includes(workflow.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((workflow) => (
            <WorkflowListItem
              key={workflow.id}
              workflow={workflow}
              isFavorite={favorites.includes(workflow.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SearchResultsSection({
  query,
  category,
  workflows,
  favorites,
  onClear,
  onToggleFavorite,
  viewMode,
  setViewMode,
}: {
  query: string;
  category: WorkflowCategory | null;
  workflows: WorkflowCatalogEntry[];
  favorites: string[];
  onClear: () => void;
  onToggleFavorite: (id: string) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-2xl">
            {query ? `Search Results: "${query}"` : `Category: ${category}`}
          </h2>
          <p className="text-sm text-ink-soft mt-1">{workflows.length} workflows found</p>
        </div>
        <button
          onClick={onClear}
          className="rounded-lg border border-rule/60 bg-card px-4 py-2 text-sm font-medium hover:bg-card-hover transition-colors"
        >
          Clear
        </button>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              isFavorite={favorites.includes(workflow.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {workflows.map((workflow) => (
            <WorkflowListItem
              key={workflow.id}
              workflow={workflow}
              isFavorite={favorites.includes(workflow.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WorkflowCard({
  workflow,
  isFavorite,
  onToggleFavorite,
}: {
  workflow: WorkflowCatalogEntry;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="group rounded-lg border border-rule/60 bg-card p-5 hover:bg-card-hover hover:border-rule-dark transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="text-2xl">{getWorkflowIcon(workflow.icon)}</div>
        <button
          onClick={() => onToggleFavorite(workflow.id)}
          className={`rounded-lg p-2 transition-colors ${
            isFavorite
              ? "bg-rose-100/50 text-rose-700"
              : "hover:bg-paper text-ink-soft"
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
        </button>
      </div>

      <h3 className="font-medium text-lg mb-1">{workflow.title}</h3>
      <p className="text-sm text-ink-soft mb-3 line-clamp-2">{workflow.tagline}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-cobalt bg-cobalt/10 px-2 py-1 rounded">
            {workflow.verticalName}
          </span>
          {workflow.isPremium && (
            <span className="text-xs font-medium text-amber-700 bg-amber-100/50 px-2 py-1 rounded flex items-center gap-1">
              <Lock className="h-3 w-3" /> Premium
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => navigate({ to: workflow.route })}
        className="w-full rounded-lg border border-rule/60 bg-paper px-3 py-2 text-sm font-medium hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors"
      >
        {workflow.primaryCTA}
      </button>
    </div>
  );
}

function WorkflowListItem({
  workflow,
  isFavorite,
  onToggleFavorite,
}: {
  workflow: WorkflowCatalogEntry;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-rule/60 bg-card p-4 hover:bg-card-hover transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getWorkflowIcon(workflow.icon)}</span>
            <h3 className="font-medium truncate">{workflow.title}</h3>
          </div>
          <p className="text-sm text-ink-soft truncate">{workflow.tagline}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden md:inline text-xs font-medium text-cobalt bg-cobalt/10 px-2 py-1 rounded">
            {workflow.verticalName}
          </span>
          <button
            onClick={() => onToggleFavorite(workflow.id)}
            className={`rounded-lg p-2 transition-colors ${
              isFavorite
                ? "bg-rose-100/50 text-rose-700"
                : "hover:bg-paper text-ink-soft"
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={() => navigate({ to: workflow.route })}
            className="rounded-lg border border-rule/60 bg-paper px-3 py-2 text-sm font-medium hover:bg-cobalt hover:text-white hover:border-cobalt transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-paper p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header skeleton */}
        <div className="h-12 w-48 bg-card rounded-lg animate-pulse" />

        {/* Cards skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-card rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getWorkflowIcon(iconName: string): string {
  const icons: Record<string, string> = {
    Landmark: "🏛️",
    Scale: "⚖️",
    ShieldAlert: "🛡️",
    Home: "🏠",
    FileCheck: "📋",
    FileText: "📄",
    Briefcase: "💼",
    Building2: "🏢",
    FolderOpen: "📂",
    Clock: "⏰",
    Mail: "✉️",
    AlertCircle: "⚠️",
    HeartPulse: "💓",
    ShieldCheck: "✅",
    DollarSign: "💵",
    Calculator: "🧮",
    Globe: "🌍",
  };

  return icons[iconName] || "⚡";
}
