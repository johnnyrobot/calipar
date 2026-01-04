'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  FileText,
  ChevronRight,
  Calendar,
  User,
  MoreVertical,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, StatusBadge, Input, Spinner } from '@/components/ui';
import { useAuthStore, useReviewsStore } from '@/lib/store';
import api from '@/lib/api';

interface Review {
  id: string;
  org_id: string;
  org_name?: string;
  author_id: string;
  author_name?: string;
  cycle_year: string;
  review_type: 'comprehensive' | 'annual';
  status: 'draft' | 'in_review' | 'validated' | 'approved';
  content: object;
  created_at: string;
  updated_at: string;
  progress?: number;
}

export default function ReviewsPage() {
  const { user, token } = useAuthStore();
  const { reviews, setReviews, setLoading, isLoading } = useReviewsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Mock data for development
  const mockReviews: Review[] = [
    {
      id: '1',
      org_id: 'bio-001',
      org_name: 'Biology Department',
      author_id: 'user-1',
      author_name: 'Dr. Sarah Martinez',
      cycle_year: '2024-2025',
      review_type: 'comprehensive',
      status: 'draft',
      content: {},
      created_at: '2024-11-15T10:00:00Z',
      updated_at: '2024-12-10T14:30:00Z',
      progress: 45,
    },
    {
      id: '2',
      org_id: 'cs-001',
      org_name: 'Computer Science & IT',
      author_id: 'user-2',
      author_name: 'Prof. Michael Johnson',
      cycle_year: '2024-2025',
      review_type: 'annual',
      status: 'in_review',
      content: {},
      created_at: '2024-10-20T09:00:00Z',
      updated_at: '2024-12-08T11:15:00Z',
      progress: 100,
    },
    {
      id: '3',
      org_id: 'nur-001',
      org_name: 'Nursing Program',
      author_id: 'user-3',
      author_name: 'Dr. Emily Williams',
      cycle_year: '2024-2025',
      review_type: 'comprehensive',
      status: 'validated',
      content: {},
      created_at: '2024-09-01T08:00:00Z',
      updated_at: '2024-12-05T16:45:00Z',
      progress: 100,
    },
    {
      id: '4',
      org_id: 'math-001',
      org_name: 'Mathematics Department',
      author_id: 'user-4',
      author_name: 'Dr. James Chen',
      cycle_year: '2024-2025',
      review_type: 'annual',
      status: 'approved',
      content: {},
      created_at: '2024-08-15T10:00:00Z',
      updated_at: '2024-11-20T09:30:00Z',
      progress: 100,
    },
    {
      id: '5',
      org_id: 'eng-001',
      org_name: 'English Department',
      author_id: 'user-5',
      author_name: 'Prof. Lisa Anderson',
      cycle_year: '2024-2025',
      review_type: 'comprehensive',
      status: 'draft',
      content: {},
      created_at: '2024-11-01T11:00:00Z',
      updated_at: '2024-12-09T13:00:00Z',
      progress: 25,
    },
  ];

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        if (token) {
          api.setToken(token);
          const data = await api.listReviews() as Review[];
          setReviews(data);
        } else {
          // Use mock data for development
          setReviews(mockReviews as any);
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        // Fall back to mock data
        setReviews(mockReviews as any);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [token, setReviews, setLoading]);

  // Use mock data if reviews store is empty
  const displayReviews = reviews.length > 0 ? reviews : mockReviews;

  const filteredReviews = displayReviews.filter((review: any) => {
    const matchesSearch =
      searchQuery === '' ||
      review.org_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.author_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || review.status === statusFilter;
    const matchesType = typeFilter === 'all' || review.review_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'in_review':
        return 'warning';
      case 'validated':
        return 'info';
      case 'approved':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Program Reviews"
        subtitle="Manage and track your program review submissions"
      />

      <div className="p-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="validated">Validated</option>
              <option value="approved">Approved</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lamc-blue"
            >
              <option value="all">All Types</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="annual">Annual</option>
            </select>

            <Link href="/reviews/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Review
              </Button>
            </Link>
          </div>
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first program review'}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <Link href="/reviews/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Review
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review: any) => (
              <Link
                key={review.id}
                href={`/reviews/${review.id}`}
                className="block"
              >
                <Card className="hover:border-lamc-blue hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-lamc-light rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-lamc-blue" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {review.org_name || 'Unnamed Program'}
                          </h3>
                          <StatusBadge status={review.status} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {review.author_name || 'Unknown Author'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {review.cycle_year}
                          </span>
                          <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {review.review_type}
                          </span>
                        </div>
                        {review.progress !== undefined && review.status === 'draft' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{review.progress}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-48">
                              <div
                                className="h-full bg-lamc-blue rounded-full transition-all"
                                style={{ width: `${review.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-gray-500">
                        <p>Last updated</p>
                        <p className="font-medium text-gray-700">
                          {formatDate(review.updated_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Reviews', value: displayReviews.length, color: 'text-gray-900' },
            { label: 'Draft', value: displayReviews.filter((r: any) => r.status === 'draft').length, color: 'text-gray-600' },
            { label: 'In Review', value: displayReviews.filter((r: any) => r.status === 'in_review').length, color: 'text-amber-600' },
            { label: 'Validated', value: displayReviews.filter((r: any) => r.status === 'validated').length, color: 'text-blue-600' },
            { label: 'Approved', value: displayReviews.filter((r: any) => r.status === 'approved').length, color: 'text-green-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
