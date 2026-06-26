/**
 * API client for CALIPAR backend
 *
 * Features:
 * - Automatic token refresh on 401 responses
 * - Token expiration monitoring
 * - Graceful session handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Token refresh callback type
type TokenRefreshCallback = () => Promise<string | null>;
type LogoutCallback = () => void;

interface RequestOptions extends RequestInit {
  token?: string;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private tokenRefreshCallback: TokenRefreshCallback | null = null;
  private logoutCallback: LogoutCallback | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private tokenExpirationTime: number | null = null;
  private refreshTimerId: NodeJS.Timeout | null = null;

  // Refresh token 5 minutes before expiration
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;
  // Minimum time between refresh attempts
  private readonly MIN_REFRESH_INTERVAL_MS = 30 * 1000;
  private lastRefreshAttempt = 0;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the authentication token
   */
  setToken(token: string | null) {
    this.token = token;

    if (token) {
      // Try to extract expiration from JWT token
      this.scheduleTokenRefresh(token);
    } else {
      this.clearRefreshTimer();
      this.tokenExpirationTime = null;
    }
  }

  /**
   * Set the callback for refreshing tokens
   */
  setTokenRefreshCallback(callback: TokenRefreshCallback) {
    this.tokenRefreshCallback = callback;
  }

  /**
   * Set the callback for logging out on auth failure
   */
  setLogoutCallback(callback: LogoutCallback) {
    this.logoutCallback = callback;
  }

  /**
   * Parse JWT to extract expiration time
   */
  private parseJwtExpiration(token: string): number | null {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        // exp is in seconds, convert to milliseconds
        return payload.exp * 1000;
      }
    } catch (e) {
      // Not a valid JWT or can't parse - that's okay for dev tokens
      console.debug('[API] Could not parse JWT expiration:', e);
    }
    return null;
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(token: string) {
    this.clearRefreshTimer();

    const expiration = this.parseJwtExpiration(token);
    if (!expiration) {
      // For non-JWT tokens (dev mode), don't schedule refresh
      return;
    }

    this.tokenExpirationTime = expiration;
    const now = Date.now();
    const timeUntilExpiry = expiration - now;
    const timeUntilRefresh = timeUntilExpiry - this.REFRESH_BUFFER_MS;

    if (timeUntilRefresh > 0) {
      console.debug(`[API] Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000)}s`);
      this.refreshTimerId = setTimeout(() => {
        this.refreshTokenProactively();
      }, timeUntilRefresh);
    } else if (timeUntilExpiry > 0) {
      // Token is close to expiring, refresh immediately
      console.debug('[API] Token near expiration, refreshing immediately');
      this.refreshTokenProactively();
    }
  }

  /**
   * Clear the refresh timer
   */
  private clearRefreshTimer() {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  /**
   * Proactively refresh the token before it expires
   */
  private async refreshTokenProactively(): Promise<void> {
    if (!this.tokenRefreshCallback) return;

    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL_MS) {
      console.debug('[API] Skipping proactive refresh - too soon since last attempt');
      return;
    }

    try {
      console.debug('[API] Proactively refreshing token...');
      const newToken = await this.tokenRefreshCallback();
      if (newToken) {
        console.debug('[API] Token refreshed successfully');
        // setToken will be called by the auth context, which will schedule the next refresh
      }
    } catch (error) {
      console.error('[API] Proactive token refresh failed:', error);
      // Don't logout on proactive refresh failure - let the next API call handle it
    }
  }

  /**
   * Refresh the token (called on 401 response)
   */
  private async refreshToken(): Promise<string | null> {
    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokenRefreshCallback) {
      console.debug('[API] No token refresh callback set');
      return null;
    }

    const now = Date.now();
    if (now - this.lastRefreshAttempt < this.MIN_REFRESH_INTERVAL_MS) {
      console.debug('[API] Token refresh throttled');
      return null;
    }

    this.isRefreshing = true;
    this.lastRefreshAttempt = now;

    this.refreshPromise = this.tokenRefreshCallback()
      .then((token) => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        return token;
      })
      .catch((error) => {
        this.isRefreshing = false;
        this.refreshPromise = null;
        console.error('[API] Token refresh failed:', error);
        return null;
      });

    return this.refreshPromise;
  }

  /**
   * Make an API request with automatic token refresh on 401
   */
  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { token, skipAuth, _isRetry, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (!skipAuth && (this.token || token)) {
      headers['Authorization'] = `Bearer ${token || this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && !_isRetry && !skipAuth) {
      console.debug('[API] Received 401, attempting token refresh...');

      // Check if we're using a dev token (don't attempt refresh for dev tokens)
      const isDevToken = this.token?.startsWith('dev-token-') || this.token?.startsWith('demo-');

      if (isDevToken) {
        // In dev mode with mock auth, just throw error without logging out
        // This allows pages to fall back to mock data
        console.debug('[API] Dev token detected, skipping refresh and logout');
        throw new Error('API call failed in development mode');
      }

      const newToken = await this.refreshToken();

      if (newToken) {
        // Retry the request with the new token
        console.debug('[API] Retrying request with refreshed token');
        return this.request<T>(endpoint, {
          ...options,
          token: newToken,
          _isRetry: true,
        });
      } else {
        // Token refresh failed - logout user
        console.debug('[API] Token refresh failed, logging out');
        if (this.logoutCallback) {
          this.logoutCallback();
        }
        throw new Error('Session expired. Please sign in again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(): boolean {
    if (!this.tokenExpirationTime) return false;
    return Date.now() >= this.tokenExpirationTime - this.REFRESH_BUFFER_MS;
  }

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiry(): number | null {
    if (!this.tokenExpirationTime) return null;
    return Math.max(0, this.tokenExpirationTime - Date.now());
  }

  // Auth endpoints
  async login(idToken: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  async seedUser(userData: {
    firebase_uid: string;
    email: string;
    full_name: string;
    role?: string;
  }) {
    return this.request('/api/auth/seed', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Reviews endpoints
  async listReviews(orgId?: string) {
    const params = orgId ? `?org_id=${orgId}` : '';
    return this.request(`/api/reviews${params}`);
  }

  async createReview(data: {
    org_id: string;
    cycle_year: string;
    review_type?: string;
  }) {
    return this.request('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReview(id: string) {
    return this.request(`/api/reviews/${id}`);
  }

  async updateReview(id: string, data: { content?: object; status?: string }) {
    return this.request(`/api/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async submitReview(id: string) {
    return this.request(`/api/reviews/${id}/submit`, {
      method: 'POST',
    });
  }

  // Sections endpoints
  async listSections(reviewId: string) {
    return this.request(`/api/reviews/${reviewId}/sections`);
  }

  async updateSection(reviewId: string, sectionKey: string, data: {
    content?: string;
    status?: string;
    ai_drafts?: object;
  }) {
    return this.request(`/api/reviews/${reviewId}/sections/${sectionKey}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // AI endpoints
  async analyzeTrends(data: { data: object; context?: string; focus_areas?: string[] }) {
    return this.request('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async expandNarrative(data: { bullets: string[]; context?: string; tone?: string }) {
    return this.request('/api/ai/expand', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async equityCheck(reviewId: string, sectionContent: object) {
    return this.request('/api/ai/equity-check', {
      method: 'POST',
      body: JSON.stringify({ review_id: reviewId, section_content: sectionContent }),
    });
  }

  async chat(message: string, conversationHistory?: object[]) {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: conversationHistory }),
    });
  }

  // Data endpoints
  async getTerms() {
    return this.request('/api/data/terms');
  }

  async getEnrollment(term: string) {
    return this.request(`/api/data/enrollment?term=${encodeURIComponent(term)}`);
  }

  async compareEnrollment(term1: string, term2: string) {
    return this.request(
      `/api/data/enrollment/compare?term1=${encodeURIComponent(term1)}&term2=${encodeURIComponent(term2)}`
    );
  }

  async getSuccessData(discipline: string, term?: string) {
    const params = term ? `&term=${encodeURIComponent(term)}` : '';
    return this.request(`/api/data/success?discipline=${encodeURIComponent(discipline)}${params}`);
  }

  async getCSLOData(course: string) {
    return this.request(`/api/data/cslo?course=${encodeURIComponent(course)}`);
  }

  // Planning endpoints
  async listInitiatives(goalNumber?: number) {
    const params = goalNumber ? `?goal_number=${goalNumber}` : '';
    return this.request(`/api/initiatives${params}`);
  }

  async createActionPlan(data: {
    review_id: string;
    title: string;
    description: string;
    addresses_equity_gap?: boolean;
    justification?: string;
  }) {
    return this.request('/api/action-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getActionPlan(id: string) {
    return this.request(`/api/action-plans/${id}`);
  }

  async updateActionPlan(id: string, data: {
    title?: string;
    description?: string;
    status?: string;
    addresses_equity_gap?: boolean;
    justification?: string;
  }) {
    return this.request(`/api/action-plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async mapInitiative(planId: string, initiativeId: string) {
    return this.request(`/api/action-plans/${planId}/map-initiative`, {
      method: 'POST',
      body: JSON.stringify({ initiative_id: initiativeId }),
    });
  }

  // Resources endpoints
  async createResource(data: {
    action_plan_id: string;
    object_code: string;
    description: string;
    amount: number;
    justification: string;
    tco_notes?: string;
    priority?: number;
  }) {
    return this.request('/api/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listResources(actionPlanId?: string) {
    const params = actionPlanId ? `?action_plan_id=${actionPlanId}` : '';
    return this.request(`/api/resources${params}`);
  }

  async getResourceSummary() {
    return this.request('/api/resources/summary');
  }

  async updateResourcePriority(id: string, priority: number) {
    return this.request(`/api/resources/${id}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  }

  async fundResource(id: string, isFunded: boolean, fundedAmount?: number) {
    return this.request(`/api/resources/${id}/fund`, {
      method: 'PATCH',
      body: JSON.stringify({ is_funded: isFunded, funded_amount: fundedAmount }),
    });
  }

  // Validation endpoints
  async validateReview(reviewId: string, rubricScores: object, comments?: string) {
    return this.request(`/api/reviews/${reviewId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ rubric_scores: rubricScores, comments }),
    });
  }

  async getValidationScores(reviewId: string) {
    return this.request(`/api/reviews/${reviewId}/validation-scores`);
  }

  async approveReview(reviewId: string) {
    return this.request(`/api/reviews/${reviewId}/approve`, {
      method: 'POST',
    });
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

export const api = new ApiClient(API_URL);
export default api;
