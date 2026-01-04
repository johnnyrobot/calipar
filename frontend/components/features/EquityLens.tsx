'use client';

import { useState } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  Users,
  TrendingDown,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button, Badge, Spinner } from '@/components/ui';

interface EquityGap {
  id: string;
  group: string;
  metric: string;
  value: number;
  benchmark: number;
  gap: number;
  severity: 'high' | 'medium' | 'low';
  ismpGoal?: string;
  accjcStandard?: string;
}

interface EquityLensSuggestion {
  id: string;
  type: 'gap_detected' | 'narrative_missing' | 'goal_suggestion';
  title: string;
  description: string;
  actionText: string;
  relatedGap?: EquityGap;
}

interface EquityLensProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId?: string;
  sectionKey?: string;
  onApplySuggestion?: (suggestion: EquityLensSuggestion) => void;
}

export function EquityLens({
  isOpen,
  onClose,
  reviewId,
  sectionKey,
  onApplySuggestion,
}: EquityLensProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);

  // Mock equity gap data
  const [equityGaps] = useState<EquityGap[]>([
    {
      id: '1',
      group: 'African American Students',
      metric: 'Course Success Rate',
      value: 65.5,
      benchmark: 72.5,
      gap: -7.0,
      severity: 'high',
      ismpGoal: '3.3',
      accjcStandard: 'I.B.6',
    },
    {
      id: '2',
      group: 'Pell Grant Recipients',
      metric: 'Course Success Rate',
      value: 68.9,
      benchmark: 72.5,
      gap: -3.6,
      severity: 'medium',
      ismpGoal: '3.3',
      accjcStandard: 'I.B.6',
    },
    {
      id: '3',
      group: 'Hispanic/Latino Students',
      metric: 'Course Success Rate',
      value: 70.2,
      benchmark: 72.5,
      gap: -2.3,
      severity: 'low',
      ismpGoal: '3.3',
      accjcStandard: 'I.B.6',
    },
  ]);

  // Mock suggestions
  const [suggestions] = useState<EquityLensSuggestion[]>([
    {
      id: '1',
      type: 'gap_detected',
      title: 'Significant Equity Gap Detected',
      description:
        'African American students show a 7.0 percentage point gap in course success. This exceeds the 3pp threshold and requires attention per ACCJC Standard I.B.6.',
      actionText: 'Add to Action Plan',
      relatedGap: equityGaps[0],
    },
    {
      id: '2',
      type: 'narrative_missing',
      title: 'Equity Discussion Missing',
      description:
        'Your narrative does not address the identified equity gaps. Consider adding a paragraph discussing strategies to support disproportionately impacted students.',
      actionText: 'Generate Suggestion',
    },
    {
      id: '3',
      type: 'goal_suggestion',
      title: 'Link to ISMP Goal 3.3',
      description:
        'The equity gaps identified align with ISMP Goal 3.3 (Reduce equity gaps for disproportionately impacted students). Consider creating an action plan linked to this goal.',
      actionText: 'Create Action Plan',
    },
  ]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
    setHasAnalyzed(true);
  };

  const getSeverityColor = (severity: EquityGap['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityBadge = (severity: EquityGap['severity']) => {
    switch (severity) {
      case 'high':
        return <Badge variant="error">Critical</Badge>;
      case 'medium':
        return <Badge variant="warning">Moderate</Badge>;
      case 'low':
        return <Badge variant="info">Minor</Badge>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold">Equity Lens Assistant</h2>
              <p className="text-xs text-amber-100">ISMP Goal 3 | ACCJC I.B.6</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasAnalyzed ? (
          /* Pre-Analysis State */
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Equity Check
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Analyze your program review for equity considerations and ensure
              compliance with ACCJC Standard I.B.6 (disaggregated data analysis).
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4 mr-2" />
                  Run Equity Check
                </>
              )}
            </Button>
            <p className="text-xs text-gray-400 mt-4">
              This analysis uses disaggregated data to identify achievement gaps
              across demographic groups.
            </p>
          </div>
        ) : (
          /* Analysis Results */
          <div className="p-4 space-y-4">
            {/* Summary */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">
                    {equityGaps.filter((g) => g.severity === 'high').length} Critical
                    Gap{equityGaps.filter((g) => g.severity === 'high').length !== 1 ? 's' : ''}{' '}
                    Detected
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Your program data shows disproportionate impact for certain
                    student groups. These should be addressed in your narrative.
                  </p>
                </div>
              </div>
            </div>

            {/* ISMP Target Comparison */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-800 text-sm">ISMP Target</h4>
              </div>
              <p className="text-sm text-blue-700">
                Your program's overall success rate (68.5%) is{' '}
                <strong>below the ISMP target (67%)</strong>. Consider addressing
                this in your action plan.
              </p>
            </div>

            {/* Equity Gaps List */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Identified Equity Gaps
              </h4>
              <div className="space-y-2">
                {equityGaps.map((gap) => (
                  <div
                    key={gap.id}
                    className={`border rounded-lg overflow-hidden ${getSeverityColor(
                      gap.severity
                    )}`}
                  >
                    <button
                      onClick={() =>
                        setExpandedGap(expandedGap === gap.id ? null : gap.id)
                      }
                      className="w-full p-3 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <TrendingDown className="w-4 h-4" />
                        <div>
                          <p className="font-medium text-sm">{gap.group}</p>
                          <p className="text-xs opacity-75">
                            {gap.gap}pp from benchmark
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(gap.severity)}
                        {expandedGap === gap.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    {expandedGap === gap.id && (
                      <div className="px-3 pb-3 pt-0 border-t border-current/10">
                        <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                          <div>
                            <p className="text-gray-500">Current Rate</p>
                            <p className="font-semibold">{gap.value}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Benchmark</p>
                            <p className="font-semibold">{gap.benchmark}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">ISMP Goal</p>
                            <p className="font-semibold">Goal {gap.ismpGoal}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">ACCJC Standard</p>
                            <p className="font-semibold">{gap.accjcStandard}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Recommendations
              </h4>
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <h5 className="font-medium text-gray-900 text-sm mb-1">
                      {suggestion.title}
                    </h5>
                    <p className="text-xs text-gray-500 mb-3">
                      {suggestion.description}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onApplySuggestion?.(suggestion)}
                    >
                      {suggestion.actionText}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <a
              href="#"
              className="flex items-center gap-1 hover:text-lamc-blue"
            >
              ACCJC Standard I.B.6
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>&middot;</span>
            <a
              href="#"
              className="flex items-center gap-1 hover:text-lamc-blue"
            >
              ISMP Goal 3
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {hasAnalyzed && (
            <Button size="sm" variant="outline" onClick={handleAnalyze}>
              Re-analyze
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EquityLens;
