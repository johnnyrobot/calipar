'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Pause,
  Link as LinkIcon,
  Filter,
  Search,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, StatusBadge, Modal } from '@/components/ui';
import { useAuthStore } from '@/lib/store';

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

interface StrategicInitiative {
  id: string;
  goalNumber: number;
  code: string;
  title: string;
  description: string;
}

export default function PlanningPage() {
  const { user } = useAuthStore();
  const [selectedGoal, setSelectedGoal] = useState<number | null>(null);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editedPlan, setEditedPlan] = useState<ActionPlan | null>(null);

  // ISMP Strategic Goals
  const strategicGoals = [
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

  // Mock action plans
  const actionPlans: ActionPlan[] = [
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

  const getStatusIcon = (status: ActionPlan['status']) => {
    switch (status) {
      case 'not_started':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'ongoing':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'institutionalized':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
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
        <Card className="bg-gradient-to-r from-lamc-blue to-blue-800 text-white">
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
            <span className="px-4 py-2 bg-lamc-gold text-lamc-blue rounded-full font-medium">
              Resource Request
            </span>
          </div>
        </Card>

        {/* ISMP Goals Overview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ISMP Strategic Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {strategicGoals.map((goal) => (
              <button
                key={goal.number}
                onClick={() => setSelectedGoal(selectedGoal === goal.number ? null : goal.number)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedGoal === goal.number
                    ? 'border-lamc-blue shadow-md bg-lamc-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`w-10 h-10 ${goal.color} rounded-lg flex items-center justify-center text-white font-bold mb-3`}>
                  {goal.number}
                </div>
                <h4 className="font-medium text-gray-900 text-sm">{goal.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {goal.objectives.length} objectives
                </p>
                <p className="text-xs text-lamc-blue font-medium mt-2">
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
                <h3 className="text-lg font-semibold text-gray-900">
                  Goal {selectedGoal}: {strategicGoals[selectedGoal - 1].title}
                </h3>
                <div className="mt-4 space-y-2">
                  {strategicGoals[selectedGoal - 1].objectives.map((obj) => (
                    <div
                      key={obj.code}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="w-10 h-6 flex items-center justify-center bg-gray-200 rounded text-xs font-medium text-gray-700">
                        {obj.code}
                      </span>
                      <span className="text-sm text-gray-700">{obj.title}</span>
                      <span className="ml-auto text-xs text-gray-500">
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
            <h3 className="text-lg font-semibold text-gray-900">Action Plans</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue w-64"
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
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No action plans found</h4>
                <p className="text-gray-500 mb-4">
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
                      isExpanded ? 'border-lamc-blue shadow-md' : 'hover:border-lamc-blue hover:shadow-md'
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
                      <div className="w-10 h-10 bg-lamc-light rounded-lg flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-lamc-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{plan.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(plan.status)}
                            <span className="text-sm text-gray-600">{getStatusLabel(plan.status)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-4">
                          {/* Mapped Initiatives */}
                          <div className="flex items-center gap-1">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Linked to:</span>
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
                            <span className="text-xs text-gray-500">
                              {plan.resourceRequests} resource request{plan.resourceRequests > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                        {isEditing ? (
                          <>
                            {/* Edit Mode */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title
                              </label>
                              <input
                                type="text"
                                value={displayPlan.title}
                                onChange={(e) =>
                                  setEditedPlan({ ...displayPlan, title: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                              </label>
                              <textarea
                                rows={3}
                                value={displayPlan.description}
                                onChange={(e) =>
                                  setEditedPlan({ ...displayPlan, description: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
                              >
                                <option value="not_started">Not Started</option>
                                <option value="ongoing">In Progress</option>
                                <option value="complete">Complete</option>
                                <option value="institutionalized">Institutionalized</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Linked ISMP Initiatives
                              </label>
                              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                {strategicGoals.flatMap((goal) =>
                                  goal.objectives.map((obj) => (
                                    <label
                                      key={obj.code}
                                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                                        className="w-4 h-4 text-lamc-blue border-gray-300 rounded focus:ring-lamc-blue"
                                      />
                                      <Badge variant="info" className="text-xs">
                                        {obj.code}
                                      </Badge>
                                      <span className="text-sm text-gray-700">{obj.title}</span>
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
                                className="w-4 h-4 text-lamc-blue border-gray-300 rounded focus:ring-lamc-blue"
                              />
                              <label htmlFor={`equity-${plan.id}`} className="text-sm text-gray-700">
                                This action plan addresses an equity gap
                              </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
                                  // TODO: Save to backend
                                  console.log('Saving plan:', editedPlan);
                                  setEditingPlanId(null);
                                  setEditedPlan(null);
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
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                              </label>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(plan.status)}
                                <span className="font-medium text-gray-900">
                                  {getStatusLabel(plan.status)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                              </label>
                              <p className="text-gray-600">{plan.description}</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                                    >
                                      <Badge variant="info" className="text-xs">
                                        {code}
                                      </Badge>
                                      <span className="text-sm text-gray-700">{initiative?.title}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {plan.addressesEquityGap && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Equity Focus
                                </label>
                                <Badge variant="warning" className="text-sm">
                                  This action plan addresses an equity gap
                                </Badge>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Resource Requests
                              </label>
                              <p className="text-gray-600">
                                {plan.resourceRequests > 0
                                  ? `${plan.resourceRequests} resource request${
                                      plan.resourceRequests > 1 ? 's' : ''
                                    } linked to this action plan`
                                  : 'No resource requests linked yet'}
                              </p>
                              {plan.resourceRequests > 0 && (
                                <Link
                                  href="/resources"
                                  className="text-lamc-blue hover:underline text-sm mt-2 inline-block"
                                >
                                  View resource requests →
                                </Link>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Created
                                </label>
                                <p className="text-sm text-gray-900">
                                  {new Date(plan.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Last Updated
                                </label>
                                <p className="text-sm text-gray-900">
                                  {new Date(plan.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Total Plans</p>
            <p className="text-2xl font-bold text-gray-900">{actionPlans.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-amber-600">
              {actionPlans.filter(p => p.status === 'ongoing').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {actionPlans.filter(p => p.status === 'complete' || p.status === 'institutionalized').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">Addressing Equity</p>
            <p className="text-2xl font-bold text-lamc-blue">
              {actionPlans.filter(p => p.addressesEquityGap).length}
            </p>
          </div>
        </div>
      </div>

      {/* New Action Plan Modal */}
      <Modal
        isOpen={showNewPlanModal}
        onClose={() => setShowNewPlanModal(false)}
        title="Create New Action Plan"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Plan Title
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              placeholder="Enter a descriptive title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              placeholder="Describe the action plan and expected outcomes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to ISMP Initiative
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue">
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
              className="w-4 h-4 text-lamc-blue border-gray-300 rounded focus:ring-lamc-blue"
            />
            <label htmlFor="equity-gap" className="text-sm text-gray-700">
              This action plan addresses an equity gap
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowNewPlanModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Action Plan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
