export type HealthResponse = {
  status: string;
};

export type RenderResponse = {
  renderId: string;
  status: string;
  progress: number;
  error?: string | null;
  videoMp4Url?: string | null;
  videoWebmUrl?: string | null;
  thumbnailUrl?: string | null;
  cached?: boolean;
};

async function request<T>(url: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchImpl(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getHealth(baseUrl: string, fetchImpl: typeof fetch = fetch): Promise<HealthResponse> {
  return request<HealthResponse>(`${baseUrl.replace(/\/$/, "")}/health`, {}, fetchImpl);
}

export async function createRender(
  baseUrl: string,
  spec: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<RenderResponse> {
  return request<RenderResponse>(
    `${baseUrl.replace(/\/$/, "")}/v1/renders`,
    { method: "POST", body: JSON.stringify({ spec }) },
    fetchImpl,
  );
}

export async function getRender(
  baseUrl: string,
  renderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RenderResponse> {
  return request<RenderResponse>(`${baseUrl.replace(/\/$/, "")}/v1/renders/${renderId}`, {}, fetchImpl);
}
