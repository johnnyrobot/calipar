'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Send,
  Eye,
  Search,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Modal, Spinner, Textarea } from '@/components/ui';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

// Shape of a review as returned by the backend reviews API.
interface ApiReview {
  id: string;
  org_name?: string;
  author_name?: string;
  cycle_year: string;
  review_type: 'comprehensive' | 'annual';
  status: 'in_review' | 'validated' | string;
  updated_at: string;
}

interface ReviewToValidate {
  id: string;
  orgName: string;
  authorName: string;
  cycleYear: string;
  reviewType: 'comprehensive' | 'annual';
  submittedAt: string;
  status: 'in_review' | 'validated';
}

interface RubricCriterion {
  id: string;
  category: string;
  criterion: string;
  description: string;
  maxScore: number;
  accjcStandard?: string;
  ismpGoal?: string;
}

interface RubricScore {
  criterionId: string;
  score: number;
  comment: string;
}

// Map a backend review record onto the validation-queue UI shape.
function mapApiReview(r: ApiReview): ReviewToValidate {
  return {
    id: r.id,
    orgName: r.org_name || 'Unnamed Program',
    authorName: r.author_name || 'Unknown Author',
    cycleYear: r.cycle_year,
    reviewType: r.review_type,
    submittedAt: r.updated_at,
    status: r.status === 'validated' ? 'validated' : 'in_review',
  };
}

export default function ValidationPage() {
  const { token } = useAuthStore();
  const [selectedReview, setSelectedReview] = useState<ReviewToValidate | null>(null);
  const [scores, setScores] = useState<Record<string, RubricScore>>({});
  const [overallComments, setOverallComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['mission', 'data', 'equity', 'planning']));

  // Mock reviews awaiting validation (graceful fallback when no token / API fails)
  const mockReviews = useMemo<ReviewToValidate[]>(() => [
    {
      id: '1',
      orgName: 'Biology Department',
      authorName: 'Dr. Sarah Martinez',
      cycleYear: '2024-2025',
      reviewType: 'comprehensive',
      submittedAt: '2024-12-10T14:30:00Z',
      status: 'in_review',
    },
    {
      id: '2',
      orgName: 'Mathematics Department',
      authorName: 'Dr. Michael Chen',
      cycleYear: '2024-2025',
      reviewType: 'annual',
      submittedAt: '2024-12-08T10:15:00Z',
      status: 'in_review',
    },
    {
      id: '3',
      orgName: 'English Department',
      authorName: 'Prof. Amanda Johnson',
      cycleYear: '2024-2025',
      reviewType: 'comprehensive',
      submittedAt: '2024-12-05T09:00:00Z',
      status: 'validated',
    },
  ], []);

  const [reviewsToValidate, setReviewsToValidate] = useState<ReviewToValidate[]>(mockReviews);

  // Fetch the validation queue from the backend (keeps mock fallback on error).
  const refreshQueue = async () => {
    try {
      if (token) {
        api.setToken(token);
        const data = await api.listReviews({ status: 'in_review' }) as ApiReview[];
        setReviewsToValidate(data.map(mapApiReview));
      }
    } catch (error) {
      console.error('Failed to load validation queue:', error);
      // Keep existing mock fallback
    }
  };

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        if (token) {
          api.setToken(token);
          const data = await api.listReviews({ status: 'in_review' }) as ApiReview[];
          setReviewsToValidate(data.map(mapApiReview));
        }
      } catch (error) {
        console.error('Failed to load validation queue:', error);
        // Keep existing mock fallback
      }
    };
    fetchQueue();
  }, [token]);

  // PROC Validation Rubric
  const rubricCriteria: RubricCriterion[] = [
    // Mission Alignment
    {
      id: 'mission_1',
      category: 'mission',
      criterion: 'Mission Statement Connection',
      description: 'Program clearly articulates how it supports the college mission and vision',
      maxScore: 4,
      accjcStandard: 'I.A.1',
    },
    {
      id: 'mission_2',
      category: 'mission',
      criterion: 'Core Values Integration',
      description: 'Program demonstrates alignment with CCC\'s 6 core values (LICE²S)',
      maxScore: 4,
      accjcStandard: 'I.A.4',
    },
    // Data Analysis
    {
      id: 'data_1',
      category: 'data',
      criterion: 'Data-Driven Analysis',
      description: 'Program uses quantitative data to support conclusions and recommendations',
      maxScore: 4,
      accjcStandard: 'I.B.1',
    },
    {
      id: 'data_2',
      category: 'data',
      criterion: 'Disaggregated Data Use',
      description: 'Program analyzes success data by student demographics (ethnicity, gender, Pell status)',
      maxScore: 4,
      accjcStandard: 'I.B.6',
    },
    {
      id: 'data_3',
      category: 'data',
      criterion: 'SLO Assessment Integration',
      description: 'Program includes CSLO/PSLO assessment results and uses them for improvement',
      maxScore: 4,
      accjcStandard: 'II.A.3',
    },
    // Equity Analysis
    {
      id: 'equity_1',
      category: 'equity',
      criterion: 'Disproportionate Impact Identification',
      description: 'Program identifies and addresses equity gaps using PPG methodology',
      maxScore: 4,
      accjcStandard: 'I.B.6',
      ismpGoal: '3.3',
    },
    {
      id: 'equity_2',
      category: 'equity',
      criterion: 'Equity-Minded Interventions',
      description: 'Action plans include specific strategies to close achievement gaps',
      maxScore: 4,
      ismpGoal: '3.3',
    },
    {
      id: 'equity_3',
      category: 'equity',
      criterion: 'HSI Alignment',
      description: 'Program addresses the needs of Hispanic/Latino students (77.5% of population)',
      maxScore: 4,
      ismpGoal: '3',
    },
    // Planning & Resource Allocation
    {
      id: 'planning_1',
      category: 'planning',
      criterion: 'ISMP Goal Alignment',
      description: 'Action plans are explicitly linked to one or more ISMP strategic goals',
      maxScore: 4,
      ismpGoal: '1-5',
    },
    {
      id: 'planning_2',
      category: 'planning',
      criterion: 'Golden Thread Connection',
      description: 'Resource requests are connected to action plans and strategic initiatives',
      maxScore: 4,
      accjcStandard: 'III.D.1',
    },
    {
      id: 'planning_3',
      category: 'planning',
      criterion: 'Action Plan Quality',
      description: 'Action plans are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
      maxScore: 4,
    },
    {
      id: 'planning_4',
      category: 'planning',
      criterion: 'Status Updates',
      description: 'Prior action plans include status updates (completed, ongoing, abandoned)',
      maxScore: 4,
      accjcStandard: 'I.B.9',
    },
  ];

  const categories = [
    { id: 'mission', title: 'Mission & Vision Alignment', icon: Star },
    { id: 'data', title: 'Data Analysis & SLO Assessment', icon: FileText },
    { id: 'equity', title: 'Equity & Disproportionate Impact', icon: AlertCircle },
    { id: 'planning', title: 'Planning & Resource Allocation', icon: ClipboardCheck },
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleScoreChange = (criterionId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterionId,
        score,
        comment: prev[criterionId]?.comment || '',
      },
    }));
  };

  const handleCommentChange = (criterionId: string, comment: string) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        criterionId,
        score: prev[criterionId]?.score || 0,
        comment,
      },
    }));
  };

  const getTotalScore = () => {
    return Object.values(scores).reduce((sum, s) => sum + (s.score || 0), 0);
  };

  const getMaxScore = () => {
    return rubricCriteria.reduce((sum, c) => sum + c.maxScore, 0);
  };

  const getCategoryScore = (categoryId: string) => {
    const categoryCriteria = rubricCriteria.filter(c => c.category === categoryId);
    const earned = categoryCriteria.reduce((sum, c) => sum + (scores[c.id]?.score || 0), 0);
    const max = categoryCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    return { earned, max };
  };

  const handleSubmitValidation = async () => {
    if (!selectedReview) return;

    setIsSubmitting(true);

    try {
      // Build criterion -> score map for the rubric submission.
      const rubricScores: Record<string, number> = Object.values(scores).reduce(
        (acc, s) => {
          acc[s.criterionId] = s.score;
          return acc;
        },
        {} as Record<string, number>,
      );

      if (token) {
        api.setToken(token);
        await api.validateReview(selectedReview.id, rubricScores, overallComments || undefined);
        // Refresh the queue so the validated review drops off the list.
        await refreshQueue();
      }
    } catch (error) {
      console.error('Failed to submit validation:', error);
    } finally {
      // Reset state
      setSelectedReview(null);
      setScores({});
      setOverallComments('');
      setShowSubmitModal(false);
      setIsSubmitting(false);
    }
  };

  const filteredReviews = reviewsToValidate.filter(review =>
    review.orgName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingReviews = filteredReviews.filter(r => r.status === 'in_review');

  return (
    <div className="min-h-screen">
      <Header
        title="PROC Validation"
        subtitle="Review and score program review submissions"
      />

      <div className="flex h-[calc(100vh-8rem)]">
        {/* Left Panel - Review List */}
        <aside className="w-80 bg-surface border-r border-brand-line flex flex-col">
          <div className="p-4 border-b border-brand-line">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
              <input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">
                Awaiting Validation ({pendingReviews.length})
              </h3>
              <div className="space-y-2">
                {pendingReviews.map((review) => (
                  <button
                    key={review.id}
                    onClick={() => setSelectedReview(review)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedReview?.id === review.id
                        ? 'bg-brand-primary-bg border-2 border-brand-primary'
                        : 'bg-surface-2 border border-brand-line hover:border-brand-line'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-ink truncate">{review.orgName}</p>
                        <p className="text-xs text-brand-muted">{review.authorName}</p>
                      </div>
                      <Badge variant="warning" className="text-xs flex-shrink-0">
                        {review.reviewType === 'comprehensive' ? '6-Year' : 'Annual'}
                      </Badge>
                    </div>
                    <p className="text-xs text-brand-muted mt-2">
                      Submitted {new Date(review.submittedAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>

              {filteredReviews.filter(r => r.status === 'validated').length > 0 && (
                <>
                  <h3 className="text-xs font-semibold text-brand-muted uppercase tracking-wider mt-6 mb-3">
                    Recently Validated
                  </h3>
                  <div className="space-y-2">
                    {filteredReviews.filter(r => r.status === 'validated').map((review) => (
                      <div
                        key={review.id}
                        className="p-3 rounded-lg bg-brand-success-bg border border-brand-line"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-brand-ink truncate">{review.orgName}</p>
                            <p className="text-xs text-brand-muted">{review.authorName}</p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-status-approved flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Right Panel - Rubric Scoring */}
        <main className="flex-1 overflow-y-auto bg-surface-2">
          {selectedReview ? (
            <div className="p-6">
              {/* Review Header */}
              <div className="bg-surface rounded-lg border border-brand-line p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-brand-ink font-display tracking-tight">{selectedReview.orgName}</h2>
                    <p className="text-sm text-brand-muted">
                      {selectedReview.cycleYear} {selectedReview.reviewType === 'comprehensive' ? 'Comprehensive' : 'Annual'} Review by {selectedReview.authorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href={`/reviews/${selectedReview.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Review
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Score Summary */}
                <div className="mt-4 pt-4 border-t border-brand-line">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-brand-muted">Total Score</p>
                      <p className="text-3xl font-bold text-brand-ink font-mono tabular-nums">
                        {getTotalScore()} <span className="text-lg text-brand-muted">/ {getMaxScore()}</span>
                      </p>
                    </div>
                    <div className="flex gap-4">
                      {categories.map((cat) => {
                        const { earned, max } = getCategoryScore(cat.id);
                        const percentage = max > 0 ? (earned / max) * 100 : 0;
                        return (
                          <div key={cat.id} className="text-center">
                            <p className="text-xs text-brand-muted mb-1">{cat.title.split(' ')[0]}</p>
                            <div className="w-16 h-2 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percentage >= 75 ? 'bg-status-approved' :
                                  percentage >= 50 ? 'bg-status-review' : 'bg-destructive'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-xs font-medium mt-1 font-mono tabular-nums">{earned}/{max}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rubric Categories */}
              <div className="space-y-4">
                {categories.map((category) => {
                  const categoryCriteria = rubricCriteria.filter(c => c.category === category.id);
                  const isExpanded = expandedCategories.has(category.id);
                  const { earned, max } = getCategoryScore(category.id);

                  return (
                    <Card key={category.id} className="overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-surface-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-primary-bg rounded-lg flex items-center justify-center">
                            <category.icon className="w-5 h-5 text-brand-ink" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-brand-ink font-display tracking-tight">{category.title}</h3>
                            <p className="text-sm text-brand-muted">
                              {categoryCriteria.length} criteria &bull; {earned}/{max} points
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-brand-muted" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-brand-muted" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-brand-line">
                          {categoryCriteria.map((criterion, index) => (
                            <div
                              key={criterion.id}
                              className={`p-4 ${index !== categoryCriteria.length - 1 ? 'border-b border-brand-line' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-brand-ink">{criterion.criterion}</h4>
                                    {criterion.accjcStandard && (
                                      <Badge variant="info" className="text-xs">ACCJC {criterion.accjcStandard}</Badge>
                                    )}
                                    {criterion.ismpGoal && (
                                      <Badge variant="warning" className="text-xs">ISMP Goal {criterion.ismpGoal}</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-brand-muted">{criterion.description}</p>
                                </div>

                                {/* Score Buttons */}
                                <div className="flex items-center gap-1">
                                  {[0, 1, 2, 3, 4].filter(s => s <= criterion.maxScore).map((score) => (
                                    <button
                                      key={score}
                                      onClick={() => handleScoreChange(criterion.id, score)}
                                      className={`w-8 h-8 rounded-lg text-sm font-medium font-mono tabular-nums transition-colors ${
                                        scores[criterion.id]?.score === score
                                          ? 'bg-brand-primary text-brand-on-ink'
                                          : 'bg-surface-2 text-brand-muted hover:bg-surface-2'
                                      }`}
                                    >
                                      {score}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Comment Input */}
                              <div className="mt-3">
                                <div className="relative">
                                  <MessageSquare className="absolute left-3 top-2.5 w-4 h-4 text-brand-muted" />
                                  <input
                                    type="text"
                                    placeholder="Add feedback for this criterion..."
                                    value={scores[criterion.id]?.comment || ''}
                                    onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-brand-line bg-surface rounded-lg text-sm focus:outline-none focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Overall Comments */}
              <Card className="mt-6">
                <h3 className="font-semibold text-brand-ink font-display tracking-tight mb-3">Overall Comments</h3>
                <Textarea
                  value={overallComments}
                  onChange={(e) => setOverallComments(e.target.value)}
                  placeholder="Provide overall feedback and recommendations for the program..."
                  rows={4}
                />
              </Card>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedReview(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowSubmitModal(true)}>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Validation
                </Button>
              </div>
            </div>
          ) : (
            /* No Review Selected */
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <ClipboardCheck className="w-16 h-16 text-brand-muted mb-4" />
              <h3 className="text-xl font-semibold text-brand-ink font-display tracking-tight mb-2">Select a Review</h3>
              <p className="text-brand-muted max-w-md">
                Choose a program review from the left panel to begin the PROC validation process.
                Each review is scored against the rubric aligned with ACCJC standards and ISMP goals.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Validation"
      >
        <div className="space-y-4">
          <p className="text-brand-muted">
            Are you sure you want to submit this validation? This will update the review status
            to &quot;Validated&quot; and notify the author.
          </p>

          <div className="bg-surface-2 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-brand-muted">Final Score</span>
              <span className="text-2xl font-bold text-brand-ink font-mono tabular-nums">{getTotalScore()}/{getMaxScore()}</span>
            </div>
            <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all"
                style={{ width: `${(getTotalScore() / getMaxScore()) * 100}%` }}
              />
            </div>
          </div>

          {Object.values(scores).filter(s => s.score < 2).length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-brand-review-bg border border-brand-line rounded-lg">
              <AlertCircle className="w-5 h-5 text-status-review flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-status-review">Low Scores Detected</p>
                <p className="text-sm text-status-review">
                  {Object.values(scores).filter(s => s.score < 2).length} criteria received scores below 2.
                  Consider adding specific feedback for improvement areas.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitValidation} disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Confirm & Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
