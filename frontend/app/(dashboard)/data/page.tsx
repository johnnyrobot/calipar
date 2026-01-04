'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  GraduationCap,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  Target,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Button, Badge, Spinner } from '@/components/ui';

interface EnrollmentData {
  term: string;
  total: number;
  inPerson: number;
  online: number;
  hybrid: number;
  fillRate: number;
}

interface SuccessData {
  term: string;
  successRate: number;
  retentionRate: number;
  withdrawalRate: number;
}

interface CSLOData {
  id: string;
  coursePrefix: string;
  courseNumber: string;
  courseName: string;
  sloNumber: number;
  sloDescription: string;
  assessmentMethod: string;
  studentsAssessed: number;
  metStandard: number;
  metStandardPct: number;
  target: number;
  status: 'exceeds' | 'meets' | 'below';
}

export default function DataPage() {
  const [selectedTerm, setSelectedTerm] = useState('Fall 2024');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [viewBy, setViewBy] = useState<'overall' | 'ethnicity' | 'gender' | 'pell'>('overall');
  const [activeTab, setActiveTab] = useState<'enrollment' | 'slo'>('enrollment');
  const [isLoading, setIsLoading] = useState(false);

  const terms = ['Fall 2024', 'Spring 2024', 'Fall 2023', 'Spring 2023'];
  const departments = [
    { value: 'all', label: 'All Departments' },
    { value: 'biology', label: 'Biology' },
    { value: 'cs', label: 'Computer Science' },
    { value: 'english', label: 'English' },
    { value: 'math', label: 'Mathematics' },
    { value: 'nursing', label: 'Nursing' },
  ];

  // Mock enrollment data
  const enrollmentData: EnrollmentData[] = [
    { term: 'Fall 2024', total: 12450, inPerson: 5200, online: 4800, hybrid: 2450, fillRate: 78 },
    { term: 'Spring 2024', total: 11800, inPerson: 4900, online: 4500, hybrid: 2400, fillRate: 75 },
    { term: 'Fall 2023', total: 11200, inPerson: 5500, online: 3800, hybrid: 1900, fillRate: 72 },
    { term: 'Spring 2023', total: 10500, inPerson: 5200, online: 3500, hybrid: 1800, fillRate: 70 },
  ];

  // Mock success data
  const successData: SuccessData[] = [
    { term: 'Fall 2024', successRate: 72.5, retentionRate: 85.2, withdrawalRate: 8.3 },
    { term: 'Spring 2024', successRate: 71.8, retentionRate: 84.5, withdrawalRate: 8.8 },
    { term: 'Fall 2023', successRate: 70.2, retentionRate: 83.1, withdrawalRate: 9.2 },
    { term: 'Spring 2023', successRate: 69.5, retentionRate: 82.4, withdrawalRate: 9.8 },
  ];

  // Mock disaggregated data
  const disaggregatedData = {
    ethnicity: [
      { group: 'Hispanic/Latino', successRate: 70.2, enrollment: 9600, gap: -2.3 },
      { group: 'White', successRate: 74.8, enrollment: 1200, gap: 2.3 },
      { group: 'African American', successRate: 65.5, enrollment: 620, gap: -7.0 },
      { group: 'Asian', successRate: 78.2, enrollment: 580, gap: 5.7 },
      { group: 'Other', successRate: 71.5, enrollment: 450, gap: -1.0 },
    ],
    gender: [
      { group: 'Female', successRate: 74.1, enrollment: 6850, gap: 1.6 },
      { group: 'Male', successRate: 70.5, enrollment: 5400, gap: -2.0 },
      { group: 'Non-binary', successRate: 72.3, enrollment: 200, gap: -0.2 },
    ],
    pell: [
      { group: 'Pell Recipients', successRate: 68.9, enrollment: 7200, gap: -3.6 },
      { group: 'Non-Pell', successRate: 76.8, enrollment: 5250, gap: 4.3 },
    ],
  };

  // Mock CSLO data (from eLumen)
  const csloData: CSLOData[] = [
    {
      id: '1',
      coursePrefix: 'BIOL',
      courseNumber: '101',
      courseName: 'Principles of Biology',
      sloNumber: 1,
      sloDescription: 'Apply the scientific method to analyze biological phenomena',
      assessmentMethod: 'Lab Report Rubric',
      studentsAssessed: 245,
      metStandard: 198,
      metStandardPct: 80.8,
      target: 70,
      status: 'exceeds',
    },
    {
      id: '2',
      coursePrefix: 'BIOL',
      courseNumber: '101',
      courseName: 'Principles of Biology',
      sloNumber: 2,
      sloDescription: 'Explain cellular processes including metabolism and genetics',
      assessmentMethod: 'Embedded Exam Questions',
      studentsAssessed: 245,
      metStandard: 172,
      metStandardPct: 70.2,
      target: 70,
      status: 'meets',
    },
    {
      id: '3',
      coursePrefix: 'BIOL',
      courseNumber: '101',
      courseName: 'Principles of Biology',
      sloNumber: 3,
      sloDescription: 'Analyze evolutionary relationships and ecological interactions',
      assessmentMethod: 'Research Paper',
      studentsAssessed: 238,
      metStandard: 147,
      metStandardPct: 61.8,
      target: 70,
      status: 'below',
    },
    {
      id: '4',
      coursePrefix: 'BIOL',
      courseNumber: '201',
      courseName: 'Human Anatomy',
      sloNumber: 1,
      sloDescription: 'Identify anatomical structures of the human body',
      assessmentMethod: 'Practical Exam',
      studentsAssessed: 85,
      metStandard: 72,
      metStandardPct: 84.7,
      target: 70,
      status: 'exceeds',
    },
    {
      id: '5',
      coursePrefix: 'BIOL',
      courseNumber: '201',
      courseName: 'Human Anatomy',
      sloNumber: 2,
      sloDescription: 'Explain physiological processes of major organ systems',
      assessmentMethod: 'Case Study Analysis',
      studentsAssessed: 85,
      metStandard: 61,
      metStandardPct: 71.8,
      target: 70,
      status: 'meets',
    },
    {
      id: '6',
      coursePrefix: 'MICR',
      courseNumber: '101',
      courseName: 'Introduction to Microbiology',
      sloNumber: 1,
      sloDescription: 'Apply aseptic technique in laboratory procedures',
      assessmentMethod: 'Lab Skills Checklist',
      studentsAssessed: 64,
      metStandard: 59,
      metStandardPct: 92.2,
      target: 70,
      status: 'exceeds',
    },
  ];

  // CSLO Summary calculations
  const csloSummary = {
    totalSLOs: csloData.length,
    exceeds: csloData.filter(c => c.status === 'exceeds').length,
    meets: csloData.filter(c => c.status === 'meets').length,
    below: csloData.filter(c => c.status === 'below').length,
    avgPerformance: Math.round(csloData.reduce((acc, c) => acc + c.metStandardPct, 0) / csloData.length * 10) / 10,
  };

  const currentEnrollment = enrollmentData.find(d => d.term === selectedTerm) || enrollmentData[0];
  const currentSuccess = successData.find(d => d.term === selectedTerm) || successData[0];
  const previousEnrollment = enrollmentData[1];
  const previousSuccess = successData[1];

  const getChangePercent = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Data Analytics"
        subtitle="Explore enrollment, success, and SLO data with disaggregation"
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
            >
              {terms.map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
          >
            {departments.map(dept => (
              <option key={dept.value} value={dept.value}>{dept.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">View by:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['overall', 'ethnicity', 'gender', 'pell'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setViewBy(option)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    viewBy === option
                      ? 'bg-white text-lamc-blue shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option === 'pell' ? 'Pell Status' : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Data Type Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('enrollment')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'enrollment'
                ? 'border-lamc-blue text-lamc-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Enrollment & Success
            </div>
          </button>
          <button
            onClick={() => setActiveTab('slo')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'slo'
                ? 'border-lamc-blue text-lamc-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              SLO Assessment
            </div>
          </button>
        </div>

        {activeTab === 'enrollment' && (
        <>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Enrollment</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {currentEnrollment.total.toLocaleString()}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {parseFloat(getChangePercent(currentEnrollment.total, previousEnrollment.total)) > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${
                parseFloat(getChangePercent(currentEnrollment.total, previousEnrollment.total)) > 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {getChangePercent(currentEnrollment.total, previousEnrollment.total)}% from last term
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {currentSuccess.successRate}%
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {currentSuccess.successRate > previousSuccess.successRate ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${
                currentSuccess.successRate > previousSuccess.successRate
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {(currentSuccess.successRate - previousSuccess.successRate).toFixed(1)}pp from last term
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Retention Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {currentSuccess.retentionRate}%
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1">
              {currentSuccess.retentionRate > previousSuccess.retentionRate ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-sm ${
                currentSuccess.retentionRate > previousSuccess.retentionRate
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {(currentSuccess.retentionRate - previousSuccess.retentionRate).toFixed(1)}pp from last term
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Fill Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {currentEnrollment.fillRate}%
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${currentEnrollment.fillRate}%` }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Enrollment by Mode */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Enrollment by Mode of Instruction
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'In-Person', value: currentEnrollment.inPerson, color: 'bg-blue-500' },
              { label: 'Online', value: currentEnrollment.online, color: 'bg-green-500' },
              { label: 'Hybrid/Hyflex', value: currentEnrollment.hybrid, color: 'bg-amber-500' },
            ].map((mode) => (
              <div key={mode.label} className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-3">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-gray-100"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(mode.value / currentEnrollment.total) * 351.86} 351.86`}
                      className={mode.color.replace('bg-', 'text-')}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">
                      {Math.round((mode.value / currentEnrollment.total) * 100)}%
                    </span>
                  </div>
                </div>
                <p className="font-medium text-gray-900">{mode.label}</p>
                <p className="text-sm text-gray-500">{mode.value.toLocaleString()} students</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Disaggregated Data */}
        {viewBy !== 'overall' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Success Rates by {viewBy === 'pell' ? 'Pell Status' : viewBy.charAt(0).toUpperCase() + viewBy.slice(1)}
              </h3>
              <Badge variant="info">ISMP Goal 3.3</Badge>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Comparing against institution-wide success rate of {currentSuccess.successRate}%
            </p>
            <div className="space-y-4">
              {disaggregatedData[viewBy as keyof typeof disaggregatedData].map((item) => (
                <div key={item.group} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700">{item.group}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.gap < -3 ? 'bg-red-500' : item.gap < 0 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${item.successRate}%` }}
                        />
                      </div>
                      <span className="w-14 text-sm font-medium text-gray-900">
                        {item.successRate}%
                      </span>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className={`text-sm font-medium ${
                      item.gap < -3 ? 'text-red-600' : item.gap < 0 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {item.gap > 0 ? '+' : ''}{item.gap}pp
                    </span>
                  </div>
                  <div className="w-24 text-right text-sm text-gray-500">
                    {item.enrollment.toLocaleString()} students
                  </div>
                </div>
              ))}
            </div>
            {viewBy === 'ethnicity' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Equity Alert:</strong> African American students show a 7.0 percentage point gap below the institution average.
                  This should be addressed in your program review per ACCJC Standard I.B.6.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Historical Trends */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Historical Enrollment Trends
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Term</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">In-Person</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Online</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Hybrid</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Fill Rate</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentData.map((row, index) => (
                  <tr key={row.term} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-3 px-4 font-medium text-gray-900">{row.term}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{row.total.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{row.inPerson.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{row.online.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{row.hybrid.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-medium ${
                        row.fillRate >= 75 ? 'text-green-600' : row.fillRate >= 65 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {row.fillRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
        )}

        {/* SLO Assessment Tab */}
        {activeTab === 'slo' && (
        <>
        {/* SLO Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total CSLOs Assessed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {csloSummary.totalSLOs}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Across {new Set(csloData.map(c => c.coursePrefix + c.courseNumber)).size} courses
            </p>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Exceeds Target</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {csloSummary.exceeds}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-3">
              {Math.round((csloSummary.exceeds / csloSummary.totalSLOs) * 100)}% of assessed SLOs
            </p>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Meets Target</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">
                  {csloSummary.meets}
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-amber-600 mt-3">
              {Math.round((csloSummary.meets / csloSummary.totalSLOs) * 100)}% of assessed SLOs
            </p>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Below Target</p>
                <p className="text-3xl font-bold text-red-600 mt-1">
                  {csloSummary.below}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-sm text-red-600 mt-3">
              Requires attention per ACCJC II.A.3
            </p>
          </Card>
        </div>

        {/* Average SLO Performance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Overall SLO Performance</h3>
            <Badge variant="info">ISMP Goal 3.4</Badge>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-gray-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${(csloSummary.avgPerformance / 100) * 351.86} 351.86`}
                  className={csloSummary.avgPerformance >= 70 ? 'text-green-500' : 'text-amber-500'}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-bold text-gray-900">{csloSummary.avgPerformance}%</span>
                <span className="text-xs text-gray-500">Avg. Met Standard</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">Exceeds Target (&gt;70%)</span>
                <span className="ml-auto text-sm font-medium">{csloSummary.exceeds} SLOs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-sm text-gray-700">Meets Target (=70%)</span>
                <span className="ml-auto text-sm font-medium">{csloSummary.meets} SLOs</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-700">Below Target (&lt;70%)</span>
                <span className="ml-auto text-sm font-medium">{csloSummary.below} SLOs</span>
              </div>
            </div>
          </div>
        </Card>

        {/* CSLO Detail Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Course SLO Assessment Results</h3>
            <div className="text-xs text-gray-500">Data from eLumen</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Course</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SLO</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Assessment</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Assessed</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Met Standard</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {csloData.map((slo, index) => (
                  <tr key={slo.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">
                        {slo.coursePrefix} {slo.courseNumber}
                      </div>
                      <div className="text-xs text-gray-500">{slo.courseName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">SLO {slo.sloNumber}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate" title={slo.sloDescription}>
                        {slo.sloDescription}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {slo.assessmentMethod}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-gray-700">
                      {slo.studentsAssessed}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              slo.status === 'exceeds' ? 'bg-green-500' :
                              slo.status === 'meets' ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${slo.metStandardPct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-14 text-right">
                          {slo.metStandardPct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {slo.status === 'exceeds' && (
                        <Badge variant="success">Exceeds</Badge>
                      )}
                      {slo.status === 'meets' && (
                        <Badge variant="warning">Meets</Badge>
                      )}
                      {slo.status === 'below' && (
                        <Badge variant="error">Below</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Action Required Alert */}
        {csloSummary.below > 0 && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-red-800 mb-1">Action Required</h4>
                <p className="text-sm text-red-700 mb-3">
                  {csloSummary.below} SLO(s) are below the 70% target threshold. Per ACCJC Standard II.A.3,
                  the institution must develop and implement improvements based on assessment results.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                    Create Action Plan
                  </Button>
                  <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                    View Recommendations
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
        </>
        )}
      </div>
    </div>
  );
}
