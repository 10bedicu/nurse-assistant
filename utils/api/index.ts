import { contextApi } from "./context";
import { testApi } from "./tests";
import { projectApi, promptApi } from "./project";
import { chatApi, chatMessageApi } from "./chat";

type endpoint = `/${string}`;

export type ResponseError = {
  [key: string]: string[] | undefined;
};

type methods = "POST" | "GET" | "PATCH" | "DELETE" | "PUT";

type options = {
  formdata?: boolean;
  external?: boolean;
  headers?: Record<string, string>;
  auth?: boolean;
};

export const request = async <T = Record<string, unknown>>(
  endpoint: endpoint,
  method: methods = "GET",
  data: Record<string, unknown> = {},
  options: options = {},
): Promise<T> => {
  const { formdata, external, headers, auth: isAuth } = options;
  let deviceInfo = {};
  let decodedAuthToken = "";

  // Check if running in Next.js by checking if import.meta.env exists
  // Vite has import.meta.env, Next.js doesn't

  let localToken = null;

  if (typeof document !== "undefined") {
    decodedAuthToken = decodeURIComponent(
      document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("writerooAuthToken="))
        ?.replace("writerooAuthToken=", "") || "{}",
    );
    deviceInfo = {
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { cookies } = (globalThis as any).require("next/headers");
    const cookieStore = await cookies();
    const cookie = cookieStore.get("writerooAuthToken");
    decodedAuthToken = decodeURIComponent(cookie?.value || "{}");
    deviceInfo = {
      user_agent: "next-server",
    };
  }
  localToken = decodedAuthToken;

  const auth =
    isAuth === false || typeof localToken === "undefined" || localToken === null
      ? undefined
      : "Bearer " + localToken;

  let url = external ? endpoint : "/api" + endpoint;
  let payload: BodyInit | null = formdata ? (data as unknown as BodyInit) : JSON.stringify(data);

  if (method === "GET") {
    const requestParams = data
      ? `?${Object.keys(data)
          .filter((key) => data[key] !== null && data[key] !== undefined)
          .map((key) => `${key}=${data[key]}`)
          .join("&")}`
      : "";
    url += requestParams;
    payload = null;
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: (external
        ? { ...headers }
        : {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Device-Info": JSON.stringify(deviceInfo),
            Authorization: auth,
            ...headers,
          }) as HeadersInit,
      body: payload,
    });
    const txt = await response.clone().text();
    if (txt === "") {
      return {} as T;
    }
    const json = await response.clone().json();
    if (json && response.ok) {
      return json;
    } else {
      throw json;
    }
  } catch (error) {
    throw error;
  }
};

export const API = {
  tests: testApi,
  context: contextApi,
  projects: projectApi,
  prompts: promptApi,
  chats: chatApi,
  chatMessages: chatMessageApi,
};
