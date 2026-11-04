// Design Ref: §6 — 브라우저 화면에서 서버 API를 부르는 도우미.
// 서버가 돌려주는 { data } / { error: { message } } 형식을 풀어서, 성공하면 data를 주고 실패하면 쉬운 한국어 문구의 오류를 던진다.
import { ROLE_HEADER, type Role } from "./role";

/** 화면에 그대로 보여 줘도 되는 문구를 담은 오류 */
export class ApiClientError extends Error {}

const FALLBACK_MESSAGE = "처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

function readErrorMessage(json: unknown): string | null {
  if (json && typeof json === "object" && "error" in json) {
    const error = (json as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string") return error.message;
  }
  return null;
}

/** 서버 API 호출. role을 주면 요청 머리글(x-role)로 현재 역할을 알린다 */
export async function callApi<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    role?: Role;
    body?: unknown;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.role) headers[ROLE_HEADER] = options.role;

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(
      "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.",
    );
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    // 본문이 비어 있거나 JSON이 아니면 아래에서 일반 문구를 쓴다
  }

  if (!response.ok) {
    throw new ApiClientError(readErrorMessage(json) ?? FALLBACK_MESSAGE);
  }
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  throw new ApiClientError(FALLBACK_MESSAGE);
}
