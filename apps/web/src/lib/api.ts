/**
 * API client for FastAPI backend
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.grindgto.com";

interface DrillRequest {
  drill_type: "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";
  hero_position?: string;
  villain_position?: string;
  enabled_positions?: string[];
}

interface SpotResponse {
  hand: string;
  hero_position: string;
  villain_position: string | null;
  action_type: string;
  available_actions: string[];
  scenario_key: string;
}

interface EvaluateRequest {
  hand: string;
  scenario_key: string;
  action: string;
}

interface EvaluateResponse {
  is_correct: boolean;
  is_acceptable: boolean;
  correct_action: string;
  player_action: string;
  frequency: number;
  player_action_frequency: number;
  explanation: string;
  explanation_zh: string;
}

interface RangeResponse {
  position: string;
  action_type: string;
  hands: Record<string, Record<string, number>>;
  drillable: string[];
  total_hands: number;
}

// MTT Drill Types
interface MttDrillRequest {
  mode: "push" | "defense" | "resteal" | "hu";
  enabled_positions?: string[];
  enabled_stack_depths?: string[];
  enabled_scenarios?: string[];
}

interface MttDrillSpotResponse {
  hand: string;
  position: string;
  stack_depth: string;
  mode: string;
  scenario: string | null;
  scenario_display: string | null;
  available_actions: string[];
}

interface MttDrillEvaluateRequest {
  hand: string;
  position: string;
  stack_depth: string;
  mode: string;
  action: string;
  scenario?: string;
}

interface MttDrillEvaluateResponse {
  is_correct: boolean;
  correct_action: string;
  explanation: string;
  explanation_zh: string;
  range_count: number;
  range_pct: number;
}

// AI Review Types
interface PositionStat {
  total: number;
  mistakes: number;
  mistake_rate: number;
  ev_loss: number;
}

interface LeakInfo {
  type: string;
  description: string;
  total_hands: number;
  mistakes: number;
  mistake_rate: number;
  ev_loss: number;
  common_mistakes?: Record<string, number>;
}

interface AIReviewRequest {
  position_stats: Record<string, PositionStat>;
  top_leaks: LeakInfo[];
  total_hands: number;
  analyzed_hands: number;
  mistakes: number;
  mistake_rate: number;
  total_ev_loss: number;
}

interface AIInsight {
  category: string;
  title: string;
  title_zh: string;
  description: string;
  description_zh: string;
  priority: number;
  drill_link: string | null;
}

interface AIReviewResponse {
  insights: AIInsight[];
  overall_assessment: string;
  overall_assessment_zh: string;
  skill_level: string;
  focus_areas: string[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Drill endpoints
  async generateSpot(request: DrillRequest): Promise<SpotResponse> {
    return this.fetch<SpotResponse>("/api/drill/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async evaluateAction(request: EvaluateRequest): Promise<EvaluateResponse> {
    return this.fetch<EvaluateResponse>("/api/evaluate/action", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // Range endpoints
  async getRfiRange(
    position: string,
    format: string = "6max"
  ): Promise<RangeResponse> {
    return this.fetch<RangeResponse>(
      `/api/ranges/rfi/${position}?format=${format}`
    );
  }

  async getVsRfiRange(
    heroPosition: string,
    villainPosition: string,
    format: string = "6max"
  ): Promise<RangeResponse> {
    return this.fetch<RangeResponse>(
      `/api/ranges/vs_rfi/${heroPosition}/${villainPosition}?format=${format}`
    );
  }

  async getVs3betRange(
    heroPosition: string,
    villainPosition: string,
    format: string = "6max"
  ): Promise<RangeResponse> {
    return this.fetch<RangeResponse>(
      `/api/ranges/vs_3bet/${heroPosition}/${villainPosition}?format=${format}`
    );
  }

  async getVs4betRange(
    heroPosition: string,
    villainPosition: string,
    format: string = "6max"
  ): Promise<RangeResponse> {
    return this.fetch<RangeResponse>(
      `/api/ranges/vs_4bet/${heroPosition}/${villainPosition}?format=${format}`
    );
  }

  async listRanges(format: string = "6max") {
    return this.fetch<{ format: string; available: Record<string, string[]> }>(
      `/api/ranges/list?format=${format}`
    );
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.fetch<{ status: string }>("/health");
  }

  // MTT Drill endpoints
  async generateMttDrillSpot(request: MttDrillRequest): Promise<MttDrillSpotResponse> {
    return this.fetch<MttDrillSpotResponse>("/api/mtt/drill/generate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async evaluateMttDrillAction(request: MttDrillEvaluateRequest): Promise<MttDrillEvaluateResponse> {
    return this.fetch<MttDrillEvaluateResponse>("/api/mtt/drill/evaluate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async listMttRanges(format: string = "6max") {
    return this.fetch<{
      format: string;
      available: {
        push_fold: { positions: string[]; stack_depths: string[] };
        defense: { scenarios: string[]; stack_depths: string[] };
        resteal: { scenarios: string[]; stack_depths: string[] };
        hu: { scenarios: string[]; stack_depths: string[] };
      };
    }>(`/api/mtt/list?format=${format}`);
  }

  // AI Review endpoint
  async getAIReview(request: AIReviewRequest): Promise<AIReviewResponse> {
    return this.fetch<AIReviewResponse>("/api/analyze/ai-review", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }
}

export const api = new ApiClient();
export type {
  DrillRequest,
  SpotResponse,
  EvaluateRequest,
  EvaluateResponse,
  RangeResponse,
  MttDrillRequest,
  MttDrillSpotResponse,
  MttDrillEvaluateRequest,
  MttDrillEvaluateResponse,
  PositionStat,
  LeakInfo,
  AIReviewRequest,
  AIInsight,
  AIReviewResponse,
};
