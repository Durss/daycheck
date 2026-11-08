import type CalendarData from "@/vo/CalendarData";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter: number = 0,
  ) {
    super(message);
  }
}

/**
 * Calls to the server API
 */
export default class Api {
  private static readonly BASE_URL =
    import.meta.env.BASE_URL + "api/calendars/";

  /**
   * Gets a calendar from the server, null if it doesn't exist
   */
  public static getCalendar(id: string): Promise<CalendarData | null> {
    return this.request("GET", id);
  }

  /**
   * Creates or replaces a calendar on the server. Returns the stored version.
   * @param keepalive	lets the request complete even if the page is being closed
   */
  public static putCalendar(
    data: CalendarData,
    keepalive: boolean = false,
  ): Promise<CalendarData> {
    return this.request("PUT", data.id, data, keepalive);
  }

  public static deleteCalendar(id: string): Promise<void> {
    return this.request("DELETE", id);
  }

  private static async request(
    method: string,
    id: string,
    body?: any,
    keepalive: boolean = false,
  ): Promise<any> {
    const res = await fetch(this.BASE_URL + encodeURIComponent(id), {
      method,
      keepalive,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status == 404 && method == "GET") return null;
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = (await res.json()).error || message;
      } catch (error) {
        /*ignore*/
      }
      throw new ApiError(
        res.status,
        message,
        parseInt(res.headers.get("Retry-After")) || 0,
      );
    }
    if (res.status == 204) return null;
    return res.json();
  }
}
