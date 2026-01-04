'use client';

import { useState } from 'react';
import {
  DollarSign,
  Plus,
  ShoppingCart,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  GripVertical,
  Link as LinkIcon,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Modal } from '@/components/ui';

interface ResourceRequest {
  id: string;
  objectCode: string;
  objectCodeName: string;
  description: string;
  amount: number;
  justification: string;
  tcoNotes?: string;
  priority: number;
  actionPlanId: string;
  actionPlanTitle: string;
  isFunded: boolean;
  fundedAmount?: number;
}

const objectCodes = [
  { code: '1000', name: 'Academic Salaries' },
  { code: '2000', name: 'Classified Salaries' },
  { code: '3000', name: 'Employee Benefits' },
  { code: '4000', name: 'Books and Supplies' },
  { code: '5000', name: 'Other Operating Expenses' },
  { code: '6000', name: 'Capital Outlay' },
];

export default function ResourcesPage() {
  const [showCartModal, setShowCartModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  // Mock resource requests
  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>([
    {
      id: '1',
      objectCode: '2000',
      objectCodeName: 'Classified Salaries',
      description: 'Part-time Lab Technician (20 hrs/week)',
      amount: 28000,
      justification: 'Support increased enrollment in laboratory courses and maintain equipment',
      tcoNotes: 'Includes benefits at 35% - Total annual cost approximately $37,800',
      priority: 1,
      actionPlanId: 'ap-1',
      actionPlanTitle: 'Implement Supplemental Instruction for Gateway Courses',
      isFunded: false,
    },
    {
      id: '2',
      objectCode: '6000',
      objectCodeName: 'Capital Outlay',
      description: 'Laboratory Equipment Upgrade - Microscopes (10 units)',
      amount: 15000,
      justification: 'Replace aging microscopes to support Biology 101 and Microbiology courses',
      tcoNotes: 'IT support costs: $500/year maintenance. 5-year warranty included.',
      priority: 2,
      actionPlanId: 'ap-1',
      actionPlanTitle: 'Implement Supplemental Instruction for Gateway Courses',
      isFunded: true,
      fundedAmount: 12000,
    },
    {
      id: '3',
      objectCode: '5000',
      objectCodeName: 'Other Operating Expenses',
      description: 'Online Tutoring Platform Subscription',
      amount: 8500,
      justification: 'Annual subscription for 24/7 online tutoring services to support equity goals',
      priority: 3,
      actionPlanId: 'ap-2',
      actionPlanTitle: 'Expand Online Tutoring Hours',
      isFunded: true,
      fundedAmount: 8500,
    },
    {
      id: '4',
      objectCode: '4000',
      objectCodeName: 'Books and Supplies',
      description: 'Open Educational Resources (OER) Development',
      amount: 5000,
      justification: 'Faculty stipends for developing zero-cost textbook alternatives',
      priority: 4,
      actionPlanId: 'ap-4',
      actionPlanTitle: 'Faculty Professional Development on Equity-Minded Pedagogy',
      isFunded: false,
    },
  ]);

  const totalRequested = resourceRequests.reduce((sum, r) => sum + r.amount, 0);
  const totalFunded = resourceRequests.reduce((sum, r) => sum + (r.fundedAmount || 0), 0);
  const fundedCount = resourceRequests.filter(r => r.isFunded).length;

  const moveRequest = (id: string, direction: 'up' | 'down') => {
    const index = resourceRequests.findIndex(r => r.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === resourceRequests.length - 1)
    ) {
      return;
    }

    const newRequests = [...resourceRequests];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newRequests[index], newRequests[swapIndex]] = [newRequests[swapIndex], newRequests[index]];

    // Update priorities
    newRequests.forEach((req, i) => {
      req.priority = i + 1;
    });

    setResourceRequests(newRequests);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Resource Requests"
        subtitle="Manage resource allocation requests linked to action plans"
      />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{resourceRequests.length}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Requested</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalRequested.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Funded</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalFunded.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-purple-600">
                  {resourceRequests.length - fundedCount}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowNewRequestModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Resource Request
            </Button>
            <Button variant="outline" onClick={() => setShowCartModal(true)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              View Cart ({resourceRequests.filter(r => !r.isFunded).length})
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Drag to reorder priorities
          </p>
        </div>

        {/* Resource Requests List */}
        <div className="space-y-3">
          {resourceRequests.map((request, index) => (
            <Card
              key={request.id}
              className={`transition-all ${
                request.isFunded ? 'bg-green-50 border-green-200' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Priority & Drag Handle */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => moveRequest(request.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">#{request.priority}</span>
                  </div>
                  <button
                    onClick={() => moveRequest(request.id, 'down')}
                    disabled={index === resourceRequests.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{request.description}</h4>
                        {request.isFunded ? (
                          <Badge variant="success">Funded</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
                            {request.objectCode}
                          </span>
                          {request.objectCodeName}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        ${request.amount.toLocaleString()}
                      </p>
                      {request.isFunded && request.fundedAmount && request.fundedAmount < request.amount && (
                        <p className="text-sm text-green-600">
                          Funded: ${request.fundedAmount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Linked Action Plan */}
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Linked to:</span>
                    <span className="text-lamc-blue font-medium">{request.actionPlanTitle}</span>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
                    className="mt-3 text-sm text-lamc-blue hover:underline flex items-center gap-1"
                  >
                    {expandedRequest === request.id ? 'Hide details' : 'Show details'}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedRequest === request.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedRequest === request.id && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Justification</p>
                        <p className="text-sm text-gray-700">{request.justification}</p>
                      </div>
                      {request.tcoNotes && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                            Total Cost of Ownership Notes
                          </p>
                          <p className="text-sm text-gray-700">{request.tcoNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!request.isFunded && (
                  <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Object Code Reference */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Object Code Reference</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {objectCodes.map((code) => (
              <div
                key={code.code}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm font-mono font-medium">
                  {code.code}
                </span>
                <span className="text-sm text-gray-700">{code.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Object codes follow LACCD chart of accounts. Select the appropriate code when submitting resource requests.
          </p>
        </Card>
      </div>

      {/* New Request Modal */}
      <Modal
        isOpen={showNewRequestModal}
        onClose={() => setShowNewRequestModal(false)}
        title="Add Resource Request"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Action Plan <span className="text-red-500">*</span>
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue">
              <option value="">Select an action plan...</option>
              <option value="ap-1">Implement Supplemental Instruction for Gateway Courses</option>
              <option value="ap-2">Expand Online Tutoring Hours</option>
              <option value="ap-4">Faculty Professional Development on Equity-Minded Pedagogy</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Resource requests must be linked to an action plan (The Golden Thread)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Object Code <span className="text-red-500">*</span>
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue">
              <option value="">Select object code...</option>
              {objectCodes.map((code) => (
                <option key={code.code} value={code.code}>
                  {code.code} - {code.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              placeholder="Brief description of the resource"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              placeholder="Explain why this resource is needed and how it supports the action plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TCO Notes (Optional)
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue"
              placeholder="Any ongoing costs, maintenance, or total cost of ownership considerations"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowNewRequestModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cart Modal */}
      <Modal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        title="Resource Request Cart"
      >
        <div className="space-y-4">
          {resourceRequests.filter(r => !r.isFunded).length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              {resourceRequests.filter(r => !r.isFunded).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{request.description}</p>
                    <p className="text-sm text-gray-500">
                      {request.objectCode} - {request.objectCodeName}
                    </p>
                  </div>
                  <p className="font-bold text-gray-900">${request.amount.toLocaleString()}</p>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-lamc-blue">
                    ${resourceRequests.filter(r => !r.isFunded).reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
                  </span>
                </div>
                <Button className="w-full">
                  Submit Resource Requests
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
