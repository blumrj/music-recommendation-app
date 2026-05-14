import type { AxiosInstance } from "axios";
import axios from "axios";

export interface User {
  id: string;
  email: string;
  name: string;
  spotifyId: string;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api";
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add request interceptor to attach JWT token to every request
    this.client.interceptors.request.use(
      (config) => {
        // Get access token from localStorage
        const token = localStorage.getItem("accessToken");
        
        // Add token to Authorization header
        // Format: "Authorization: Bearer <token>"
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle token expiration
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Check if error is 401 (Unauthorized) and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Token expired, try to refresh it
            const refreshToken = localStorage.getItem("refreshToken");

            if (!refreshToken) {
              // No refresh token, must login again
              this.logout();
              return Promise.reject(error);
            }

            // Call refresh endpoint to get new access token
            const response = await axios.post(
              `${this.baseURL}/auth/refresh`,
              { refreshToken }
            );

            const { accessToken } = response.data;

            // Store new access token
            localStorage.setItem("accessToken", accessToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, user needs to login again
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Logout - clear tokens and redirect to login
  private logout(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
  }

  // Auth - returns login URL string (browser redirects to Spotify)
  getLoginUrl(): string {
    return `${this.baseURL}/auth/login`;
  }

  // Auth - get current user profile
  // Requires valid JWT token (attached by request interceptor)
  async getMe(): Promise<User> {
    const response = await this.client.get(`/auth/me`);
    return response.data;
  }

  // Recommendations - get album suggestions based on weather/mood and location
  // Requires: User location (latitude, longitude)
  // Optional: userId to load personalized profile
  // Returns: Weather mood + personalized album recommendations
  async getRecommendations(lat: number, lon: number, userId?: string): Promise<Record<string, unknown>> {
    let url = `/recommendations?lat=${lat}&lon=${lon}`;
    if (userId) {
      url += `&userId=${userId}`;
    }
    const response = await this.client.get(url);
    return response.data;
  }

  // ===== FAVORITES =====

  // Get user's favorite albums
  async getFavorites(): Promise<Record<string, unknown>[]> {
    const response = await this.client.get(`/albums/favorites/all`);
    return response.data;
  }

  // Save album to favorites
  async saveFavorite(data: {
    albumSpotifyId: string;
    albumName: string;
    artist: string;
    imageUrl: string;
    spotifyUrl: string;
  }): Promise<Record<string, unknown>> {
    const response = await this.client.post(`/albums/favorites/save`, data);
    return response.data;
  }

  // Remove album from favorites
  async removeFavorite(spotifyId: string): Promise<void> {
    await this.client.delete(`/albums/favorites/${spotifyId}`);
  }

  // ===== USER PROFILE & TASTE =====

  // Get user's profile with onboarding status
  // Returns: { id, email, profileGenerated, surveyCount, needsOnboarding, readyForAnalysis }
  async getUserProfile(): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/users/profile`);
    return response.data;
  }

  // Get available albums for survey (saved albums minus already-surveyed ones)
  // Returns: { albums: [...], totalCount, message }
  async getAvailableAlbumsForSurvey(): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/users/albums-for-survey`);
    return response.data;
  }

  // Get user's surveyed albums
  // Returns: { albums: [...], totalCount }
  async getSurveyedAlbums(): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/users/surveyed-albums`);
    return response.data;
  }

  // Save album survey response
  async saveSurvey(spotifyAlbumId: string, data: {
    albumName: string;
    artist: string;
    imageUrl: string;
    // Old format (backward compatible)
    seasons?: string[];
    emotions?: string[];
    whenYouListen?: string[];
    movementPreference?: string;
    vibe?: string[];
    optionalNote?: string;
    // Phase 1: New 7D slider responses (0-100 scale)
    valence_response?: number;          // 0=Sad, 100=Happy
    arousal_response?: number;          // 0=Calm, 100=Energized
    tension_response?: number;          // 0=Relaxed, 100=Tense
    warmth_response?: number;           // 0=Cold, 100=Warm
    intimacy_response?: number;         // 0=Distant, 100=Personal
    density_response?: number;          // 0=Sparse, 100=Rich
    groundedness_response?: number;     // 0=Dreamy, 100=Grounded
  }): Promise<Record<string, unknown>> {
    const response = await this.client.post(
      `/albums/${spotifyAlbumId}/survey`,
      data
    );
    return response.data;
  }

  // Get user's taste profile
  async getTasteProfile(): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/users/taste-profile`);
    return response.data;
  }

  // Analyze taste profile from surveys
  async analyzeTaste(): Promise<Record<string, unknown>> {
    const response = await this.client.post(`/users/analyze-taste`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
