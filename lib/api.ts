import { FilterParams, PaginatedResponse } from "@/types/boxscore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function getBoxScores(params?: FilterParams): Promise<PaginatedResponse> {
  const queryParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
  }

  const url = `${API_BASE_URL}/api/boxscores/filter${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch box scores");
  }

  return response.json();
}
