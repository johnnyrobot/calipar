'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Link as LinkIcon,
  Search,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Modal } from '@/components/ui';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'ongoing' | 'complete' | 'institutionalized';
  addressesEquityGap: boolean;
  mappedInitiatives: string[];
  resourceRequests: number;
  createdAt: string;
  updatedAt: string;
}

interface StrategicGoal {
  number: number;
  title: string;
  color: string;
  objectives: { code: string; title: string }[];
}

// Shapes returned by the backend planning endpoints.
interface InitiativeResponse {
  id: string;
  goal_number: number;
  code: string;
  title: string;
  description: string;
  performance_measure?: string | null;
  baseline_value?: string | null;
  target_value?: string | null;
}

interface ActionPlanResponse {
  id: string;
  review_id: string;
  title: string;
  description: string;
  status: ActionPlan['status'];
  addresses_equity_gap: boolean;
  justification?: string | null;
  created_at: string;
  updated_at: string;
  initiatives: InitiativeResponse[];
}

// Minimal shape needed to populate the "Program Review" selector in the
// create-action-plan modal (an action plan belongs to a program review).
interface ReviewOption {
  id: string;
  org_name?: string | null;
  cycle_year: string;
}

const EMPTY_NEW_PLAN = {
  reviewId: '',
  title: '',
  description: '',
  initiativeCode: '',
  addressesEquityGap: false,
  justification: '',
};

// Goal colors aren't stored in the backend, so map them by ISMP goal number.
const goalColors: Record<number, string> = {
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-amber-500',
  4: 'bg-purple-500',
  5: 'bg-red-500',
};

// Build the nested goal/objective structure the UI expects from the flat
// initiative list. Rows whose code is just the goal number (e.g. "3") supply the
// goal title; rows with a dotted code (e.g. "3.1") are the objectives.
function buildGoals(initiatives: InitiativeResponse[]): StrategicGoal[] {
  const byGoal = new Map<number, StrategicGoal>();
  for (const init of initiatives) {
    let goal = byGoal.get(init.goal_number);
    if (!goal) {
      goal = {
        number: init.goal_number,
        title: '',
        color: goalColors[init.goal_number] ?? 'bg-slate-500',
        objectives: [],
      };
      byGoal.set(init.goal_number, goal);
    }
    if (init.code.includes('.')) {
      goal.objectives.push({ code: init.code, title: init.description });
    } else {
      goal.title = init.title;
    }
  }
  for (const goal of byGoal.values()) {
    if (!goal.title) goal.title = `Goal ${goal.number}`;
  }
  return Array.from(byGoal.values()).sort((a, b) => a.number - b.number);
}

function mapActionPlan(p: ActionPlanResponse): ActionPlan {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    addressesEquityGap: p.addresses_equity_gap,
    mappedInitiatives: p.initiatives.map((i) => i.code),
    resourceRequests: 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export default function PlanningPage() {
  const { token } = useAuthStore();
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editedPlan, setEditedPlan] = useState<ActionPlan | null>(null);
  // Backend-loaded data; null means "not loaded" so the mock fallback is used.
  const [apiGoals, setApiGoals] = useState<StrategicGoal[] | null>(null);
  const [apiPlans, setApiPlans] = useState<ActionPlan[] | null>(null);
  // Raw initiatives (for mapping code→id) and reviews (for the create selector).
  const [apiInitiatives, setApiInitiatives] = useState<InitiativeResponse[] | null>(null);
  const [reviews, setReviews] = useState<ReviewOption[]>([]);
  // New-action-plan modal form state.
  const [newPlan, setNewPlan] = useState(EMPTY_NEW_PLAN);
  const [creatingPlan, setCreatingPlan] = useState(false);

  // ISMP Strategic Goals (fallback used when the backend is unavailable)
  const mockStrategicGoals: StrategicGoal[] = [
    {
      number: 1,
      title: 'Expand Access',
      color: 'bg-blue-500',
      objectives: [
        { code: '1.1', title: 'Increase awareness of CCC in the community' },
        { code: '1.2', title: 'Improve accessibility to classes and services' },
        { code: '1.3', title: 'Expand enrollment in CTE programs' },
        { code: '1.4', title: 'Expand community-based outreach and partnerships' },
      ],
    },
    {
      number: 2,
      title: 'Student-Centered Institution',
      color: 'bg-green-500',
      objectives: [
        { code: '2.1', title: 'Increase student engagement' },
        { code: '2.2', title: 'Increase students\' use of support services' },
        { code: '2.3', title: 'Expand educational pathways and student success programs' },
        { code: '2.4', title: 'Continuously improve campus facilities and technology' },
      ],
    },
    {
      number: 3,
      title: 'Student Success and Equity',
      color: 'bg-amber-500',
      objectives: [
        { code: '3.1', title: 'Increase course success and retention rates' },
        { code: '3.2', title: 'Increase students achieving educational goals' },
        { code: '3.3', title: 'Reduce equity gaps for disproportionately impacted students' },
        { code: '3.4', title: 'Support student learning through SLO assessment' },
      ],
    },
    {
      number: 4,
      title: 'Organizational Effectiveness',
      color: 'bg-purple-500',
      objectives: [
        { code: '4.1', title: 'Improve participatory governance and communication' },
        { code: '4.2', title: 'Continuously improve through assessment and evaluation' },
        { code: '4.3', title: 'Invest in professional development for all employees' },
        { code: '4.4', title: 'Promote a diverse, inclusive, and equitable campus culture' },
      ],
    },
    {
      number: 5,
      title: 'Financial Stability',
      color: 'bg-red-500',
      objectives: [
        { code: '5.1', title: 'Develop alternative revenue streams' },
        { code: '5.2', title: 'Align resource allocation with institutional priorities' },
        { code: '5.3', title: 'Increase operational efficiency' },
      ],
    },
  ];

  // Mock action plans (fallback used when the backend is unavailable)
  const mockActionPlans: ActionPlan[] = [
    {
      id: '1',
      title: 'Implement Supplemental Instruction for Gateway Courses',
      description: 'Establish SI program for high-enrollment courses with historically low success rates',
      status: 'ongoing',
      addressesEquityGap: true,
      mappedInitiatives: ['3.1', '3.3'],
      resourceRequests: 2,
      createdAt: '2024-09-15',
      updatedAt: '2024-12-01',
    },
    {
      id: '2',
      title: 'Expand Online Tutoring Hours',
      description: 'Increase availability of online tutoring to serve evening and weekend students',
      status: 'complete',
      addressesEquityGap: true,
      mappedInitiatives: ['2.2', '3.1'],
      resourceRequests: 1,
      createdAt: '2024-08-01',
      updatedAt: '2024-11-15',
    },
    {
      id: '3',
      title: 'Update Curriculum for Industry Alignment',
      description: 'Review and revise course content based on advisory board feedback',
      status: 'not_started',
      addressesEquityGap: false,
      mappedInitiatives: ['1.3', '2.3'],
      resourceRequests: 0,
      createdAt: '2024-11-01',
      updatedAt: '2024-11-01',
    },
    {
      id: '4',
      title: 'Faculty Professional Development on Equity-Minded Pedagogy',
      description: 'Organize workshops and training sessions on culturally responsive teaching',
      status: 'ongoing',
      addressesEquityGap: true,
      mappedInitiatives: ['3.3', '4.3', '4.4'],
      resourceRequests: 1,
      createdAt: '2024-10-01',
      updatedAt: '2024-12-05',
    },
  ];

  // Prefer backend data; fall back to mock only when nothing has loaded
  // (no token / fetch error). An empty array from the API is a real result.
  const strategicGoals = apiGoals ?? mockStrategicGoals;
  const actionPlans = apiPlans ?? mockActionPlans;

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      try {
        api.setToken(token);
        const [initiatives, plans, reviewList] = await Promise.all([
          api.listInitiatives() as Promise<InitiativeResponse[]>,
          api.listActionPlans() as Promise<ActionPlanResponse[]>,
          api.listReviews() as Promise<ReviewOption[]>,
        ]);
        if (initiatives.length) {
          setApiGoals(buildGoals(initiatives));
          setApiInitiatives(initiatives);
        }
        setApiPlans(plans.map(mapActionPlan));
        setReviews(reviewList);
      } catch (error) {
        console.error('Failed to load planning data:', error);
        // Keep the mock fallback on error.
      }
    };
    load();
  }, [token]);

  const handleSavePlan = async () => {
    if (!editedPlan) return;
    const plan = editedPlan;
    // Mapping changes are diffed against the plan as it was before editing.
    const original = (apiPlans ?? mockActionPlans).find((p) => p.id === plan.id);
    // Optimistically reflect the edit locally (keeps demo / no-token mode working).
    setApiPlans((prev) =>
      (prev ?? mockActionPlans).map((p) =>
        p.id === plan.id ? { ...plan, updatedAt: new Date().toISOString() } : p
      )
    );
    try {
      if (token) {
        api.setToken(token);
        let updated = (await api.updateActionPlan(plan.id, {
          title: plan.title,
          description: plan.description,
          status: plan.status,
          addresses_equity_gap: plan.addressesEquityGap,
        })) as ActionPlanResponse;

        // Persist initiative-mapping changes: map newly-checked initiatives and
        // unmap unchecked ones (resolving each objective code to its initiative id).
        const before = new Set(original?.mappedInitiatives ?? []);
        const after = new Set(plan.mappedInitiatives);
        const idOf = (code: string) =>
          apiInitiatives?.find((i) => i.code === code)?.id;
        for (const code of [...after].filter((c) => !before.has(c))) {
          const id = idOf(code);
          if (id) updated = (await api.mapInitiative(plan.id, id)) as ActionPlanResponse;
        }
        for (const code of [...before].filter((c) => !after.has(c))) {
          const id = idOf(code);
          if (id) updated = (await api.unmapInitiative(plan.id, id)) as ActionPlanResponse;
        }

        const mapped = mapActionPlan(updated);
        // Reconcile with the server response, preserving the resource-request count
        // (not returned by these endpoints).
        setApiPlans((prev) =>
          (prev ?? mockActionPlans).map((p) =>
            p.id === mapped.id ? { ...mapped, resourceRequests: p.resourceRequests } : p
          )
        );
      }
    } catch (error) {
      console.error('Failed to save action plan:', error);
    } finally {
      setEditingPlanId(null);
      setEditedPlan(null);
    }
  };

  const closeNewPlanModal = () => {
    setShowNewPlanModal(false);
    setNewPlan(EMPTY_NEW_PLAN);
  };

  // Backend requires a justification whenever the plan addresses an equity gap.
  const newPlanValid =
    !!newPlan.reviewId &&
    !!newPlan.title.trim() &&
    !!newPlan.description.trim() &&
    (!newPlan.addressesEquityGap || !!newPlan.justification.trim());

  const handleCreatePlan = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !newPlanValid || creatingPlan) return;
    setCreatingPlan(true);
    try {
      api.setToken(token);
      let created = (await api.createActionPlan({
        review_id: newPlan.reviewId,
        title: newPlan.title.trim(),
        description: newPlan.description.trim(),
        addresses_equity_gap: newPlan.addressesEquityGap,
        justification: newPlan.justification.trim() || undefined,
      })) as ActionPlanResponse;

      // Optionally link the selected ISMP initiative (mapInitiative needs the
      // initiative's id, which we resolve from the loaded list by its code).
      const initiativeId = apiInitiatives?.find(
        (i) => i.code === newPlan.initiativeCode
      )?.id;
      if (initiativeId) {
        try {
          created = (await api.mapInitiative(created.id, initiativeId)) as ActionPlanResponse;
        } catch (err) {
          console.error('Failed to link initiative to the new plan:', err);
        }
      }

      setApiPlans((prev) => [mapActionPlan(created), ...(prev ?? [])]);
      closeNewPlanModal();
    } catch (error) {
      console.error('Failed to create action plan:', error);
    } finally {
      setCreatingPlan(false);
    }
  };

  const getStatusIcon = (status: ActionPlan['status']) => {
    switch (status) {
      case 'not_started':
        return <Clock className="w-4 h-4 text-brand-muted" />;
      case 'ongoing':
        return <AlertCircle className="w-4 h-4 text-status-review" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-status-approved" />;
      case 'institutionalized':
        return <CheckCircle2 className="w-4 h-4 text-brand-primary" />;
      default:
        return <Clock className="w-4 h-4 text-brand-muted" />;
    }
  };

  const getStatusLabel = (status: ActionPlan['status']) => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'ongoing':
        return 'In Progress';
      case 'complete':
        return 'Complete';
      case 'institutionalized':
        return 'Institutionalized';
      default:
        return status;
    }
  };

  const filteredPlans = actionPlans.filter((plan) => {
    const matchesSearch = searchQuery === '' ||
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGoal = selectedGoal === null ||
      plan.mappedInitiatives.some(code => code.startsWith(`${selectedGoal}.`));

    return matchesSearch && matchesGoal;
  });

  return (
    <div className="min-h-screen">
      <Header
        title="Integrated Planning"
        subtitle="The Golden Thread - Link program goals to ISMP strategic initiatives"
      />

      <div className="p-6 space-y-6">
        {/* Golden Thread Visualization */}
        <Card className="bg-gradient-to-r from-brand-ink to-brand-ink-soft text-white">
          <h3 className="text-lg font-semibold mb-4">The Golden Thread</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <span className="px-4 py-2 bg-white/20 rounded-full">College Mission</span>
            <ChevronRight className="w-4 h-4" />
            <span className="px-4 py-2 bg-white/20 rounded-full">ISMP Strategic Goal</span>
            <ChevronRight className="w-4 h-4" />
            <span className="px-4 py-2 bg-white/20 rounded-full">Program Goal</span>
            <ChevronRight className="w-4 h-4" />
            <span className="px-4 py-2 bg-white/20 rounded-full">Action Plan</span>
            <ChevronRight className="w-4 h-4" />
            <span className="px-4 py-2 bg-brand-accent text-brand-ink rounded-full font-medium">
              Resource Request
            </span>
          </div>
        </Card>

        {/* ISMP Goals Overview */}
        <div>
          <h3 className="text-lg font-semibold text-brand-ink font-display tracking-tight mb-4">ISMP Strategic Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {strategicGoals.map((goal) => (
              <button
                key={goal.number}
                onClick={() => setSelectedGoal(selectedGoal === goal.number ? null : goal.number)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedGoal === goal.number
                    ? 'border-brand-primary shadow-md bg-brand-primary-bg'
                    : 'border-brand-line hover:border-brand-primary'
                }`}
              >
                <div className={`w-10 h-10 ${goal.color} rounded-lg flex items-center justify-center text-white font-bold mb-3`}>
                  {goal.number}
                </div>
                <h4 className="font-medium text-brand-ink text-sm">{goal.title}</h4>
                <p className="text-xs text-brand-muted mt-1">
                  {goal.objectives.length} objectives
                </p>
                <p className="text-xs text-brand-primary font-medium mt-2">
                  {actionPlans.filter(p => p.mappedInitiatives.some(code => code.startsWith(`${goal.number}.`))).length} action plans
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Goal Details */}
        {selectedGoal && (
          <Card>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 ${strategicGoals[selectedGoal - 1].color} rounded-lg flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                {selectedGoal}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-ink font-display tracking-tight">
                  Goal {selectedGoal}: {strategicGoals[selectedGoal - 1].title}
                </h3>
                <div className="mt-4 space-y-2">
                  {strategicGoals[selectedGoal - 1].objectives.map((obj) => (
                    <div
                      key={obj.code}
                      className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg"
                    >
                      <span className="w-10 h-6 flex items-center justify-center bg-surface-2 border border-brand-line rounded text-xs font-medium text-brand-text font-mono tabular-nums">
                        {obj.code}
                      </span>
                      <span className="text-sm text-brand-text">{obj.title}</span>
                      <span className="ml-auto text-xs text-brand-muted">
                        {actionPlans.filter(p => p.mappedInitiatives.includes(obj.code)).length} plans
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Action Plans */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-ink font-display tracking-tight">Action Plans</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg w-64"
                />
              </div>
              <Button onClick={() => setShowNewPlanModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Action Plan
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPlans.length === 0 ? (
              <Card className="text-center py-12">
                <Target className="w-12 h-12 text-brand-muted mx-auto mb-4" />
                <h4 className="text-lg font-medium text-brand-ink font-display tracking-tight mb-2">No action plans found</h4>
                <p className="text-brand-muted mb-4">
                  {selectedGoal
                    ? `No plans mapped to Goal ${selectedGoal}`
                    : 'Create your first action plan to get started'}
                </p>
                <Button onClick={() => setShowNewPlanModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Action Plan
                </Button>
              </Card>
            ) : (
              filteredPlans.map((plan) => {
                const isExpanded = expandedPlanId === plan.id;
                const isEditing = editingPlanId === plan.id;
                const displayPlan = isEditing && editedPlan ? editedPlan : plan;

                return (
                  <Card
                    key={plan.id}
                    className={`transition-all ${
                      isExpanded ? 'border-brand-primary shadow-md' : 'hover:border-brand-primary hover:shadow-md'
                    }`}
                  >
                    {/* Summary View */}
                    <div
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => {
                        if (!isEditing) {
                          setExpandedPlanId(isExpanded ? null : plan.id);
                        }
                      }}
                    >
                      <div className="w-10 h-10 bg-brand-primary-bg rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-brand-ink" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-brand-ink font-display tracking-tight">{plan.title}</h4>
                            <p className="text-sm text-brand-muted mt-1">{plan.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(plan.status)}
                            <span className="text-sm text-brand-muted">{getStatusLabel(plan.status)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-4">
                          {/* Mapped Initiatives */}
                          <div className="flex items-center gap-1">
                            <LinkIcon className="w-4 h-4 text-brand-accent" />
                            <span className="text-xs text-brand-muted">Linked to:</span>
                            {plan.mappedInitiatives.map((code) => (
                              <Badge key={code} variant="info" className="text-xs">
                                {code}
                              </Badge>
                            ))}
                          </div>

                          {/* Equity Flag */}
                          {plan.addressesEquityGap && (
                            <Badge variant="warning" className="text-xs">
                              Addresses Equity Gap
                            </Badge>
                          )}

                          {/* Resource Requests */}
                          {plan.resourceRequests > 0 && (
                            <span className="text-xs text-brand-muted">
                              {plan.resourceRequests} resource request{plan.resourceRequests > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-brand-muted flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-brand-muted flex-shrink-0" />
                      )}
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-brand-line space-y-6">
                        {isEditing ? (
                          <>
                            {/* Edit Mode */}
                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Title
                              </label>
                              <input
                                type="text"
                                value={displayPlan.title}
                                onChange={(e) =>
                                  setEditedPlan({ ...displayPlan, title: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Description
                              </label>
                              <textarea
                                rows={3}
                                value={displayPlan.description}
                                onChange={(e) =>
                                  setEditedPlan({ ...displayPlan, description: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Status
                              </label>
                              <select
                                value={displayPlan.status}
                                onChange={(e) =>
                                  setEditedPlan({
                                    ...displayPlan,
                                    status: e.target.value as ActionPlan['status'],
                                  })
                                }
                                className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                              >
                                <option value="not_started">Not Started</option>
                                <option value="ongoing">In Progress</option>
                                <option value="complete">Complete</option>
                                <option value="institutionalized">Institutionalized</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Linked ISMP Initiatives
                              </label>
                              <div className="space-y-2 max-h-48 overflow-y-auto border border-brand-line rounded-lg p-3">
                                {strategicGoals.flatMap((goal) =>
                                  goal.objectives.map((obj) => (
                                    <label
                                      key={obj.code}
                                      className="flex items-center gap-3 p-2 hover:bg-surface-2 rounded cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={displayPlan.mappedInitiatives.includes(obj.code)}
                                        onChange={(e) => {
                                          const newInitiatives = e.target.checked
                                            ? [...displayPlan.mappedInitiatives, obj.code]
                                            : displayPlan.mappedInitiatives.filter((c) => c !== obj.code);
                                          setEditedPlan({
                                            ...displayPlan,
                                            mappedInitiatives: newInitiatives,
                                          });
                                        }}
                                        className="w-4 h-4 text-brand-primary border-brand-line rounded focus:ring-brand-primary"
                                      />
                                      <Badge variant="info" className="text-xs">
                                        {obj.code}
                                      </Badge>
                                      <span className="text-sm text-brand-text">{obj.title}</span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`equity-${plan.id}`}
                                checked={displayPlan.addressesEquityGap}
                                onChange={(e) =>
                                  setEditedPlan({ ...displayPlan, addressesEquityGap: e.target.checked })
                                }
                                className="w-4 h-4 text-brand-primary border-brand-line rounded focus:ring-brand-primary"
                              />
                              <label htmlFor={`equity-${plan.id}`} className="text-sm text-brand-text">
                                This action plan addresses an equity gap
                              </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-brand-line">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPlanId(null);
                                  setEditedPlan(null);
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSavePlan();
                                }}
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* View Mode */}
                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Status
                              </label>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(plan.status)}
                                <span className="font-medium text-brand-ink">
                                  {getStatusLabel(plan.status)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Description
                              </label>
                              <p className="text-brand-muted">{plan.description}</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Linked ISMP Initiatives
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {plan.mappedInitiatives.map((code) => {
                                  const initiative = strategicGoals
                                    .flatMap((goal) => goal.objectives)
                                    .find((obj) => obj.code === code);
                                  return (
                                    <div
                                      key={code}
                                      className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-lg"
                                    >
                                      <Badge variant="info" className="text-xs">
                                        {code}
                                      </Badge>
                                      <span className="text-sm text-brand-text">{initiative?.title}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {plan.addressesEquityGap && (
                              <div>
                                <label className="block text-sm font-medium text-brand-text mb-2">
                                  Equity Focus
                                </label>
                                <Badge variant="warning" className="text-sm">
                                  This action plan addresses an equity gap
                                </Badge>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-brand-text mb-2">
                                Resource Requests
                              </label>
                              <p className="text-brand-muted">
                                {plan.resourceRequests > 0
                                  ? `${plan.resourceRequests} resource request${
                                      plan.resourceRequests > 1 ? 's' : ''
                                    } linked to this action plan`
                                  : 'No resource requests linked yet'}
                              </p>
                              {plan.resourceRequests > 0 && (
                                <Link
                                  href="/resources"
                                  className="text-brand-ink hover:underline text-sm mt-2 inline-block"
                                >
                                  View resource requests →
                                </Link>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-line">
                              <div>
                                <label className="block text-xs font-medium text-brand-muted mb-1">
                                  Created
                                </label>
                                <p className="text-sm text-brand-ink font-mono tabular-nums">
                                  {new Date(plan.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-brand-muted mb-1">
                                  Last Updated
                                </label>
                                <p className="text-sm text-brand-ink font-mono tabular-nums">
                                  {new Date(plan.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-brand-line">
                              <Button
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPlanId(null);
                                }}
                              >
                                Collapse
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingPlanId(plan.id);
                                  setEditedPlan(plan);
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit Action Plan
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-lg border border-brand-line p-4 text-center">
            <p className="text-sm text-brand-muted">Total Plans</p>
            <p className="text-2xl font-bold text-brand-ink font-mono tabular-nums">{actionPlans.length}</p>
          </div>
          <div className="bg-surface rounded-lg border border-brand-line p-4 text-center">
            <p className="text-sm text-brand-muted">In Progress</p>
            <p className="text-2xl font-bold text-status-review font-mono tabular-nums">
              {actionPlans.filter(p => p.status === 'ongoing').length}
            </p>
          </div>
          <div className="bg-surface rounded-lg border border-brand-line p-4 text-center">
            <p className="text-sm text-brand-muted">Completed</p>
            <p className="text-2xl font-bold text-status-approved font-mono tabular-nums">
              {actionPlans.filter(p => p.status === 'complete' || p.status === 'institutionalized').length}
            </p>
          </div>
          <div className="bg-surface rounded-lg border border-brand-line p-4 text-center">
            <p className="text-sm text-brand-muted">Addressing Equity</p>
            <p className="text-2xl font-bold text-brand-ink font-mono tabular-nums">
              {actionPlans.filter(p => p.addressesEquityGap).length}
            </p>
          </div>
        </div>
      </div>

      {/* New Action Plan Modal */}
      <Modal
        isOpen={showNewPlanModal}
        onClose={closeNewPlanModal}
        title="Create New Action Plan"
      >
        <form className="space-y-4" onSubmit={handleCreatePlan}>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Program Review
            </label>
            <select
              value={newPlan.reviewId}
              onChange={(e) => setNewPlan((p) => ({ ...p, reviewId: e.target.value }))}
              className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
            >
              <option value="">Select a program review...</option>
              {reviews.map((r) => (
                <option key={r.id} value={r.id}>
                  {(r.org_name ?? 'Program Review') + ' — ' + r.cycle_year}
                </option>
              ))}
            </select>
            {reviews.length === 0 && (
              <p className="mt-1 text-xs text-brand-muted">
                No program reviews available — an action plan must belong to a review.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Action Plan Title
            </label>
            <input
              type="text"
              value={newPlan.title}
              onChange={(e) => setNewPlan((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              placeholder="Enter a descriptive title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={newPlan.description}
              onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              placeholder="Describe the action plan and expected outcomes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Link to ISMP Initiative
            </label>
            <select
              value={newPlan.initiativeCode}
              onChange={(e) => setNewPlan((p) => ({ ...p, initiativeCode: e.target.value }))}
              className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
            >
              <option value="">Select an initiative...</option>
              {strategicGoals.flatMap(goal =>
                goal.objectives.map(obj => (
                  <option key={obj.code} value={obj.code}>
                    {obj.code} - {obj.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="equity-gap"
              checked={newPlan.addressesEquityGap}
              onChange={(e) => setNewPlan((p) => ({ ...p, addressesEquityGap: e.target.checked }))}
              className="w-4 h-4 text-brand-primary border-brand-line rounded focus:ring-brand-primary"
            />
            <label htmlFor="equity-gap" className="text-sm text-brand-text">
              This action plan addresses an equity gap
            </label>
          </div>
          {newPlan.addressesEquityGap && (
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Justification <span className="text-status-review">*</span>
              </label>
              <textarea
                rows={2}
                value={newPlan.justification}
                onChange={(e) => setNewPlan((p) => ({ ...p, justification: e.target.value }))}
                className="w-full px-3 py-2 border border-brand-line bg-surface rounded-lg focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                placeholder="Required: explain how this plan addresses the equity gap"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={closeNewPlanModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newPlanValid} isLoading={creatingPlan} loadingText="Creating...">
              Create Action Plan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
