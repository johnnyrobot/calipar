'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Users,
  GraduationCap,
  AlertCircle,
  RefreshCw,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, Button, Spinner } from '@/components/ui';

interface DataMetric {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  status?: 'positive' | 'negative' | 'neutral' | 'warning';
  target?: string | number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

interface DataInjectionPanelProps {
  sectionKey: string;
  reviewId: string;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

// Mock data configurations per section
const sectionDataConfig: Record<string, {
  title: string;
  metrics: DataMetric[];
  chartData?: ChartData;
  hasDisaggregation?: boolean;
}> = {
  student_success: {
    title: 'Student Success Data',
    hasDisaggregation: true,
    metrics: [
      { label: 'Success Rate', value: '68.5%', change: -1.2, changeLabel: 'vs last term', status: 'warning', target: '67%' },
      { label: 'Retention Rate', value: '85.2%', change: 2.1, changeLabel: 'vs last term', status: 'positive' },
      { label: 'Completion Rate', value: '62.3%', change: 0.8, changeLabel: 'vs last term', status: 'neutral', target: '67%' },
      { label: 'Enrollment', value: '1,245', change: 5.2, changeLabel: 'YoY', status: 'positive' },
    ],
    chartData: {
      labels: ['Fall 2022', 'Spring 2023', 'Fall 2023', 'Spring 2024', 'Fall 2024'],
      datasets: [
        { label: 'Success Rate', data: [71.2, 69.8, 70.5, 69.7, 68.5], color: '#1e40af' },
        { label: 'Retention Rate', data: [82.1, 83.5, 84.2, 84.8, 85.2], color: '#059669' },
      ]
    }
  },
  curriculum: {
    title: 'Curriculum & SLO Data',
    hasDisaggregation: false,
    metrics: [
      { label: 'Active Courses', value: 45, status: 'neutral' },
      { label: 'Courses >5yr', value: 8, status: 'warning', changeLabel: 'need update' },
      { label: 'CSLO Achievement', value: '78%', change: 3.2, changeLabel: 'vs last cycle', status: 'positive' },
      { label: 'PSLO Achievement', value: '82%', change: 1.5, changeLabel: 'vs last cycle', status: 'positive' },
    ],
  },
  equity_analysis: {
    title: 'Equity & Demographics Data',
    hasDisaggregation: true,
    metrics: [
      { label: 'Hispanic/Latino', value: '67.2%', change: -0.8, changeLabel: 'gap from avg', status: 'warning' },
      { label: 'African American', value: '61.5%', change: -7.0, changeLabel: 'gap from avg', status: 'negative' },
      { label: 'White', value: '72.1%', change: 3.6, changeLabel: 'above avg', status: 'neutral' },
      { label: 'Pell Recipients', value: '64.8%', change: -3.7, changeLabel: 'gap from avg', status: 'warning' },
    ],
    chartData: {
      labels: ['Hispanic/Latino', 'African American', 'White', 'Asian', 'Other'],
      datasets: [
        { label: 'Success Rate', data: [67.2, 61.5, 72.1, 75.3, 69.8], color: '#1e40af' },
        { label: 'Institution Avg', data: [68.5, 68.5, 68.5, 68.5, 68.5], color: '#9ca3af' },
      ]
    }
  },
};

// Disaggregation options
const disaggregationOptions = [
  { key: 'overall', label: 'Overall' },
  { key: 'ethnicity', label: 'Ethnicity' },
  { key: 'gender', label: 'Gender' },
  { key: 'pell', label: 'Pell Status' },
  { key: 'age', label: 'Age Group' },
];

// Term options
const termOptions = [
  { key: 'fall_2024', label: 'Fall 2024' },
  { key: 'spring_2024', label: 'Spring 2024' },
  { key: 'fall_2023', label: 'Fall 2023' },
  { key: 'spring_2023', label: 'Spring 2023' },
];

export function DataInjectionPanel({
  sectionKey,
  reviewId,
  onAnalyze,
  isAnalyzing = false,
}: DataInjectionPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<typeof sectionDataConfig[string] | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('fall_2024');
  const [selectedDisaggregation, setSelectedDisaggregation] = useState('overall');
  const [compareTerm, setCompareTerm] = useState<string | null>(null);

  // Simulate data fetching based on section
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const config = sectionDataConfig[sectionKey];
      if (config) {
        setData(config);
      } else {
        setError('No data available for this section');
      }
    } catch (err) {
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sectionKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData, selectedTerm, selectedDisaggregation]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'warning':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case 'positive':
        return 'bg-green-50 border-green-200';
      case 'negative':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-40 bg-blue-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-blue-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-40 bg-white rounded-lg border border-blue-100 animate-pulse" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="mb-6 bg-red-50 border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-lamc-blue" />
          {data.title}
        </h3>
        <div className="flex items-center gap-2">
          {/* Term Selector */}
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lamc-blue"
            >
              {termOptions.map((term) => (
                <option key={term.key} value={term.key}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>

          {/* Compare Term */}
          <select
            value={compareTerm || ''}
            onChange={(e) => setCompareTerm(e.target.value || null)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-lamc-blue"
          >
            <option value="">Compare to...</option>
            {termOptions.filter(t => t.key !== selectedTerm).map((term) => (
              <option key={term.key} value={term.key}>
                vs {term.label}
              </option>
            ))}
          </select>

          {onAnalyze && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <TrendingUp className="w-4 h-4 mr-2" />
              )}
              Analyze Trends
            </Button>
          )}
        </div>
      </div>

      {/* Disaggregation Toggles */}
      {data.hasDisaggregation && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">View by:</span>
          <div className="flex gap-1">
            {disaggregationOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setSelectedDisaggregation(option.key)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedDisaggregation === option.key
                    ? 'bg-lamc-blue text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {data.metrics.map((metric, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 border ${getStatusBgColor(metric.status)}`}
          >
            <p className="text-sm text-gray-500 mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            {metric.change !== undefined && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${getStatusColor(metric.status)}`}>
                {metric.change > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : metric.change < 0 ? (
                  <TrendingDown className="w-3 h-3" />
                ) : null}
                <span>
                  {metric.change > 0 ? '+' : ''}{metric.change}% {metric.changeLabel}
                </span>
              </div>
            )}
            {metric.target && (
              <p className="text-xs text-gray-400 mt-1">
                Target: {metric.target}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Simple Bar Chart Visualization */}
      {data.chartData && (
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Trend Analysis</h4>
          <div className="space-y-3">
            {data.chartData.datasets.map((dataset, datasetIndex) => (
              <div key={datasetIndex}>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{dataset.label}</span>
                  <span>{dataset.data[dataset.data.length - 1]}%</span>
                </div>
                <div className="flex gap-1 h-8">
                  {dataset.data.map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 relative group"
                    >
                      <div
                        className="absolute bottom-0 w-full rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${(value / 100) * 100}%`,
                          backgroundColor: dataset.color || '#1e40af',
                        }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {data.chartData?.labels[i]}: {value}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  {data.chartData?.labels.map((label, i) => (
                    <span key={i} className="flex-1 text-center truncate">
                      {label.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Source Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>Data source: Institutional Research • Last updated: Dec 10, 2024</span>
        <button className="hover:text-lamc-blue transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </Card>
  );
}

export default DataInjectionPanel;
