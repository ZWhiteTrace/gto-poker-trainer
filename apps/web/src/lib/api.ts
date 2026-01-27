/**
 * API client for FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
}

export const api = new ApiClient();
export type { DrillRequest, SpotResponse, EvaluateRequest, EvaluateResponse, RangeResponse };
