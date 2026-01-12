'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Sparkles,
  FileText,
  BarChart2,
  Target,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Wand2,
  Upload,
  Eye,
  Edit3,
  Scale,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Badge, StatusBadge, Modal, Spinner, RichTextEditor, AutosaveIndicator } from '@/components/ui';
import { EquityLens, DataInjectionPanel } from '@/components/features';
import { useAuthStore } from '@/lib/store';
import { useAutosave } from '@/lib/useAutosave';
import api from '@/lib/api';

interface ReviewSection {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  dataWidgets?: string[];
  required: boolean;
}

interface Review {
  id: string;
  org_id: string;
  org_name: string;
  author_id: string;
  author_name: string;
  cycle_year: string;
  review_type: 'comprehensive' | 'annual';
  status: 'draft' | 'in_review' | 'validated' | 'approved';
  content: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();
  const reviewId = params.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<Record<string, string>>({});
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showEquityLens, setShowEquityLens] = useState(false);

  // Autosave callback
  const handleAutosave = useCallback(async (content: Record<string, string>) => {
    if (!review) return;

    try {
      if (token) {
        await api.updateReview(reviewId, { content });
      }

      setReview(prev => prev ? {
        ...prev,
        content,
        updated_at: new Date().toISOString(),
      } : null);
    } catch (error) {
      console.error('Autosave failed:', error);
      throw error; // Re-throw so useAutosave knows it failed
    }
  }, [review, reviewId, token]);

  // Autosave hook
  const {
    status: autosaveStatus,
    lastSaved,
    saveNow,
    registerChange,
    hasUnsavedChanges,
  } = useAutosave({
    delay: 2000, // 2 second debounce
    onSave: handleAutosave,
    enabled: review?.status === 'draft', // Only autosave drafts
  });

  // Define review sections
  const sections: ReviewSection[] = [
    {
      key: 'program_overview',
      title: 'Program Overview',
      icon: FileText,
      description: 'Mission alignment and program description',
      status: 'completed',
      required: true,
    },
    {
      key: 'student_success',
      title: 'Student Success & Outcomes',
      icon: Users,
      description: 'Success rates, retention, and completion data',
      status: 'in_progress',
      dataWidgets: ['enrollment', 'success_rates', 'demographics'],
      required: true,
    },
    {
      key: 'curriculum',
      title: 'Curriculum Review',
      icon: BookOpen,
      description: 'Course offerings, currency, and SLO assessment',
      status: 'not_started',
      dataWidgets: ['cslo_performance', 'curriculum_currency'],
      required: true,
    },
    {
      key: 'equity_analysis',
      title: 'Equity Analysis',
      icon: BarChart2,
      description: 'Disproportionate impact and equity gaps',
      status: 'not_started',
      dataWidgets: ['equity_gaps', 'di_analysis'],
      required: true,
    },
    {
      key: 'action_plans',
      title: 'Action Plans & Goals',
      icon: Target,
      description: 'Program goals linked to ISMP strategic initiatives',
      status: 'not_started',
      required: true,
    },
    {
      key: 'resource_needs',
      title: 'Resource Needs',
      icon: Target,
      description: 'Equipment, staffing, and budget requests',
      status: 'not_started',
      required: false,
    },
  ];

  // Mock review data for development
  const mockReview: Review = {
    id: reviewId,
    org_id: 'bio-001',
    org_name: 'Biology Department',
    author_id: user?.id || 'user-1',
    author_name: user?.full_name || 'Dr. Sarah Martinez',
    cycle_year: '2024-2025',
    review_type: 'comprehensive',
    status: 'draft',
    content: {
      program_overview: 'The Biology Department offers a comprehensive curriculum designed to prepare students for transfer to four-year institutions and careers in the life sciences. Our program emphasizes hands-on laboratory experience and critical thinking skills.',
      student_success: '',
    },
    created_at: '2024-11-15T10:00:00Z',
    updated_at: '2024-12-10T14:30:00Z',
  };

  useEffect(() => {
    const fetchReview = async () => {
      setIsLoading(true);
      try {
        if (token) {
          api.setToken(token);
          const data = await api.getReview(reviewId) as Review;
          setReview(data);
          setSectionContent(data.content as Record<string, string> || {});
        } else {
          // Use mock data for development
          setReview(mockReview);
          setSectionContent(mockReview.content as Record<string, string> || {});
        }
      } catch (error) {
        console.error('Failed to fetch review:', error);
        // Fall back to mock data
        setReview(mockReview);
        setSectionContent(mockReview.content as Record<string, string> || {});
      } finally {
        setIsLoading(false);
      }
    };

    fetchReview();
  }, [reviewId, token]);

  const handleSaveSection = async () => {
    if (!activeSection || !review) return;

    setIsSaving(true);
    try {
      // Use the autosave saveNow function for immediate save
      await saveNow();
    } catch (error) {
      console.error('Failed to save section:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle content changes and register for autosave
  const handleContentChange = (value: string) => {
    const newContent = {
      ...sectionContent,
      [activeSection!]: value,
    };
    setSectionContent(newContent);
    registerChange(newContent);
  };

  const handleAnalyzeTrends = async () => {
    setIsAnalyzing(true);
    setShowAIAssistant(true);

    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 2000));

      setAiResponse(`**Trend Analysis for Student Success**

Based on the data provided, here are the key insights:

1. **Overall Success Rate**: Your program's success rate of 68.5% is slightly below the ISMP target of 67%, showing room for improvement.

2. **Enrollment Trends**:
   - Online enrollment increased by 12% year-over-year
   - Evening section enrollment declined by 8%
   - Fill rate improved from 72% to 78%

3. **Equity Considerations** (ISMP Goal 3.3):
   - Hispanic/Latino students show a 2.3pp gap below the institution average
   - African American students show a 7.0pp gap - this requires attention per ACCJC Standard I.B.6

4. **Recommendations**:
   - Consider expanding online tutoring support
   - Investigate causes of evening enrollment decline
   - Develop targeted interventions for disproportionately impacted groups

Would you like me to expand any of these points into narrative form?`);
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAiResponse('Sorry, I encountered an error analyzing the data. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExpandNarrative = async () => {
    setIsAnalyzing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const narrative = `The Biology Department has demonstrated steady progress in student success outcomes during the 2024-2025 academic year. Analysis of enrollment data reveals a significant shift toward online modalities, with a 12% increase in online course enrollment compared to the previous year. This trend aligns with ISMP Goal 2.4 (Continuously improve campus facilities and technology) and reflects student preferences for flexible learning options.

However, our review of disaggregated data per ACCJC Standard I.B.6 reveals areas requiring targeted intervention. Specifically, African American students in our program experience a 7.0 percentage point gap below the institutional success rate average. This disproportionate impact directly relates to ISMP Goal 3.3 (Reduce equity gaps for disproportionately impacted students) and will be addressed through our proposed action plan for enhanced tutoring and peer mentoring support.

The department's fill rate has improved to 78%, exceeding the college target and demonstrating efficient use of instructional resources. Moving forward, we will continue to monitor these metrics and implement evidence-based strategies to close achievement gaps while maintaining program quality.`;

      setSectionContent(prev => ({
        ...prev,
        [activeSection!]: (prev[activeSection!] || '') + '\n\n' + narrative,
      }));

      setAiResponse('Narrative added to your section. Review and edit as needed.');
    } catch (error) {
      console.error('Narrative expansion failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!review) return;

    try {
      if (token) {
        await api.submitReview(reviewId);
      }

      setReview({
        ...review,
        status: 'in_review',
      });

      setShowSubmitModal(false);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const getSectionStatus = (key: string) => {
    const content = sectionContent[key];
    if (!content || content.trim() === '') return 'not_started';
    if (content.length < 200) return 'in_progress';
    return 'completed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const completedSections = sections.filter(s => getSectionStatus(s.key) === 'completed').length;
  const progress = Math.round((completedSections / sections.length) * 100);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Review Not Found</h2>
          <p className="text-gray-500 mb-4">The requested review could not be found.</p>
          <Link href="/reviews">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reviews
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title={review.org_name}
        subtitle={`${review.cycle_year} ${review.review_type === 'comprehensive' ? 'Comprehensive' : 'Annual'} Review`}
      />

      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/reviews"
              className="flex items-center gap-2 text-gray-600 hover:text-lamc-blue transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Reviews</span>
            </Link>
            <div className="h-4 w-px bg-gray-300" />
            <StatusBadge status={review.status} />
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave Indicator */}
            <AutosaveIndicator
              status={autosaveStatus}
              lastSaved={lastSaved}
              hasUnsavedChanges={hasUnsavedChanges}
            />

            {/* Progress */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{progress}% complete</span>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lamc-blue rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEquityLens(true)}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <Scale className="w-4 h-4 mr-2" />
              Equity Check
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSection}
              disabled={isSaving || !activeSection}
            >
              {isSaving ? <Spinner size="sm" className="mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>

            {review.status === 'draft' && (
              <Button size="sm" onClick={() => setShowSubmitModal(true)}>
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Section Navigation */}
        <aside className="w-72 bg-white border-r border-gray-200 min-h-[calc(100vh-8rem)] p-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            Sections
          </h3>
          <nav className="space-y-1">
            {sections.map((section) => {
              const status = getSectionStatus(section.key);
              const isActive = activeSection === section.key;

              return (
                <button
                  key={section.key}
                  onClick={() => setActiveSection(section.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-lamc-light text-lamc-blue'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-lamc-blue' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" title={section.title}>{section.title}</span>
                      {section.required && (
                        <span className="text-red-500 text-xs flex-shrink-0">*</span>
                      )}
                    </div>
                  </div>
                  {getStatusIcon(status)}
                </button>
              );
            })}
          </nav>

          {/* Section Legend */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Legend</p>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <span>Not Started</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {activeSection ? (
            <div className="max-w-4xl">
              {/* Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {sections.find(s => s.key === activeSection)?.title}
                </h2>
                <p className="text-gray-500 mt-1">
                  {sections.find(s => s.key === activeSection)?.description}
                </p>
              </div>

              {/* Data Injection Panel (for applicable sections) */}
              {sections.find(s => s.key === activeSection)?.dataWidgets && (
                <DataInjectionPanel
                  sectionKey={activeSection}
                  reviewId={reviewId}
                  onAnalyze={handleAnalyzeTrends}
                  isAnalyzing={isAnalyzing}
                />
              )}

              {/* AI Assistant Response */}
              {showAIAssistant && aiResponse && (
                <Card className="mb-6 border-lamc-gold bg-amber-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-lamc-gold rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">AI Analysis</h4>
                        <button
                          onClick={() => setShowAIAssistant(false)}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="prose prose-sm max-w-none text-gray-700">
                        {aiResponse.split('\n').map((line, i) => (
                          <p key={i}>
                            {line.split('**').map((part, j) =>
                              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                            )}
                          </p>
                        ))}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" onClick={handleExpandNarrative} disabled={isAnalyzing}>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Expand to Narrative
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit Suggestions
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Content Editor */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Narrative</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Add Evidence
                    </Button>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>

                <RichTextEditor
                  value={sectionContent[activeSection] || ''}
                  onChange={handleContentChange}
                  placeholder="Start writing your narrative here... You can also use the AI assistant to analyze data and generate content."
                  minHeight="350px"
                />

                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {(sectionContent[activeSection] || '').split(/\s+/).filter(Boolean).length} words
                  </span>
                  <span>
                    Last saved: {new Date(review.updated_at).toLocaleString()}
                  </span>
                </div>
              </Card>
            </div>
          ) : (
            /* No Section Selected */
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <FileText className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a Section
              </h3>
              <p className="text-gray-500 max-w-md">
                Choose a section from the sidebar to begin editing your program review.
                Required sections are marked with an asterisk (*).
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Submit Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Review for Validation"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you ready to submit this program review for validation? Once submitted,
            you will not be able to make further edits until the review is returned.
          </p>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Submission Checklist</h4>
            <div className="space-y-2">
              {sections.filter(s => s.required).map(section => {
                const status = getSectionStatus(section.key);
                return (
                  <div key={section.key} className="flex items-center gap-2 text-sm">
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={status === 'completed' ? 'text-gray-700' : 'text-red-600'}>
                      {section.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitReview}>
              <Send className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </div>
        </div>
      </Modal>

      {/* Equity Lens Sidebar */}
      <EquityLens
        isOpen={showEquityLens}
        onClose={() => setShowEquityLens(false)}
        reviewId={reviewId}
        sectionKey={activeSection || undefined}
        onApplySuggestion={(suggestion) => {
          console.log('Apply suggestion:', suggestion);
          // In production, this would add content to the narrative or create action plans
        }}
      />
    </div>
  );
}
