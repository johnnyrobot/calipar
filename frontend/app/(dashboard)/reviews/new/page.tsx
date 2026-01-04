'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Modal, Spinner } from '@/components/ui';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

interface Department {
  id: string;
  name: string;
  type: string;
  lastReviewYear?: string;
  reviewType?: 'comprehensive' | 'annual';
}

export default function NewReviewPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [cycleYear, setCycleYear] = useState('2024-2025');
  const [reviewType, setReviewType] = useState<'comprehensive' | 'annual'>('comprehensive');
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState('');

  // Mock departments for development
  const departments: Department[] = [
    { id: 'bio-001', name: 'Biology', type: 'Instructional', lastReviewYear: '2021-2022', reviewType: 'comprehensive' },
    { id: 'cs-001', name: 'Computer Science & IT', type: 'Instructional', lastReviewYear: '2023-2024', reviewType: 'annual' },
    { id: 'eng-001', name: 'English', type: 'Instructional', lastReviewYear: '2022-2023', reviewType: 'comprehensive' },
    { id: 'math-001', name: 'Mathematics', type: 'Instructional', lastReviewYear: '2020-2021', reviewType: 'comprehensive' },
    { id: 'nur-001', name: 'Nursing', type: 'CTE', lastReviewYear: '2023-2024', reviewType: 'annual' },
    { id: 'chem-001', name: 'Chemistry', type: 'Instructional' },
    { id: 'phys-001', name: 'Physics', type: 'Instructional' },
    { id: 'psych-001', name: 'Psychology', type: 'Instructional', lastReviewYear: '2022-2023', reviewType: 'comprehensive' },
    { id: 'hist-001', name: 'History', type: 'Instructional' },
    { id: 'art-001', name: 'Art', type: 'Instructional', lastReviewYear: '2021-2022', reviewType: 'comprehensive' },
  ];

  // Available cycle years
  const cycleYears = [
    '2024-2025',
    '2025-2026',
    '2026-2027',
  ];

  // Determine if comprehensive or annual based on 6-year cycle
  const getRecommendedType = (dept: Department): 'comprehensive' | 'annual' => {
    if (!dept.lastReviewYear) return 'comprehensive';

    const lastYear = parseInt(dept.lastReviewYear.split('-')[0]);
    const currentYear = 2024;
    const yearsSinceComprehensive = currentYear - lastYear;

    // Comprehensive every 6 years, annual in between
    if (yearsSinceComprehensive >= 6 || dept.reviewType === 'comprehensive') {
      return 'comprehensive';
    }
    return 'annual';
  };

  const selectedDept = departments.find(d => d.id === selectedDepartment);

  useEffect(() => {
    if (selectedDept) {
      setReviewType(getRecommendedType(selectedDept));
    }
  }, [selectedDepartment]);

  const handleCreateReview = async () => {
    if (!selectedDepartment) {
      setError('Please select a department');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      if (token) {
        api.setToken(token);
        const response = await api.createReview({
          org_id: selectedDepartment,
          cycle_year: cycleYear,
          review_type: reviewType,
        }) as any;

        router.push(`/reviews/${response.id}`);
      } else {
        // For development, simulate creation and redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        router.push(`/reviews/${selectedDepartment}-${Date.now()}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create review. Please try again.');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Start New Program Review"
        subtitle="Begin a new program review for the selected department"
      />

      <div className="p-6 max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          href="/reviews"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-lamc-blue transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reviews</span>
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Select Department */}
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-lamc-blue text-white rounded-full flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Select Department</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartment(dept.id)}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDepartment === dept.id
                    ? 'border-lamc-blue bg-lamc-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Building2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  selectedDepartment === dept.id ? 'text-lamc-blue' : 'text-gray-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{dept.name}</p>
                  <p className="text-sm text-gray-500">{dept.type}</p>
                  {dept.lastReviewYear && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last review: {dept.lastReviewYear}
                    </p>
                  )}
                </div>
                {selectedDepartment === dept.id && (
                  <CheckCircle2 className="w-5 h-5 text-lamc-blue flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Step 2: Review Cycle */}
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-lamc-blue text-white rounded-full flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Review Cycle</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <div className="flex gap-3">
                {cycleYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setCycleYear(year)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      cycleYear === year
                        ? 'border-lamc-blue bg-lamc-light text-lamc-blue'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    {year}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Type
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewType('comprehensive')}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    reviewType === 'comprehensive'
                      ? 'border-lamc-blue bg-lamc-light'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className={`w-5 h-5 ${reviewType === 'comprehensive' ? 'text-lamc-blue' : 'text-gray-400'}`} />
                    <span className="font-medium text-gray-900">Comprehensive</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Full program review with all sections (required every 6 years)
                  </p>
                </button>

                <button
                  onClick={() => setReviewType('annual')}
                  className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                    reviewType === 'annual'
                      ? 'border-lamc-blue bg-lamc-light'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className={`w-5 h-5 ${reviewType === 'annual' ? 'text-lamc-blue' : 'text-gray-400'}`} />
                    <span className="font-medium text-gray-900">Annual Update</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Brief update on goals and action plans
                  </p>
                </button>
              </div>

              {selectedDept && (
                <div className="mt-3 flex items-start gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Based on the 6-year cycle, a <strong>{getRecommendedType(selectedDept)}</strong> review
                    is recommended for {selectedDept.name}.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Step 3: Template Information */}
        <Card className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-lamc-blue text-white rounded-full flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Review Template</h2>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              {reviewType === 'comprehensive' ? 'Comprehensive Review' : 'Annual Update'} Sections
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {reviewType === 'comprehensive' ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Program Overview
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Student Success & Outcomes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Curriculum Review
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Equity Analysis
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Action Plans & Goals
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Resource Needs
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Progress on Prior Goals
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Updated Action Plans
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Resource Updates
                  </div>
                </>
              )}
            </div>

            {selectedDept?.type === 'CTE' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  CTE programs require additional sections: Labor Market Analysis, Advisory Board Minutes
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Summary & Create Button */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>

          {selectedDept ? (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Department</span>
                <span className="font-medium text-gray-900">{selectedDept.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Academic Year</span>
                <span className="font-medium text-gray-900">{cycleYear}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Review Type</span>
                <span className="font-medium text-gray-900 capitalize">{reviewType}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">Author</span>
                <span className="font-medium text-gray-900">{user?.full_name || 'You'}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 mb-6">Select a department to continue.</p>
          )}

          <div className="flex gap-3">
            <Link href="/reviews" className="flex-1">
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button
              className="flex-1"
              onClick={() => setShowConfirmModal(true)}
              disabled={!selectedDepartment || isCreating}
            >
              {isCreating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Review
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Create Program Review"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You are about to create a new {reviewType} program review for{' '}
            <strong>{selectedDept?.name}</strong> for the {cycleYear} academic year.
          </p>

          {selectedDept?.lastReviewYear && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
              <p>
                <strong>Note:</strong> The previous review for this department was completed in{' '}
                {selectedDept.lastReviewYear}. Relevant data from that review may be pre-populated
                to save time.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReview} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Creating...
                </>
              ) : (
                'Confirm & Create'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
