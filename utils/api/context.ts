import { request } from ".";
import { ContextCreatePayload, ContextSerialized } from "../schemas/context";

export const contextApi = {
  list: () => request<ContextSerialized[]>("/context", "GET"),
  create: (data: ContextCreatePayload) =>
    request<ContextSerialized>("/context", "POST", data),
  get: (id: string) => request<ContextSerialized>(`/context/${id}`, "GET"),
  update: (id: string, data: ContextCreatePayload) =>
    request<ContextSerialized>(`/context/${id}`, "PUT", data),
  delete: (id: string) => request(`/context/${id}`, "DELETE"),
};
