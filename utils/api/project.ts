import { request } from ".";
import { LimitOffset, PaginatedResponse } from "../schemas/base";
import {
  ProjectCreatePayload,
  ProjectSerialized,
  ProjectUpdatePayload,
  PromptCreatePayload,
  PromptSerialized,
  PromptUpdatePayload,
} from "../schemas/project";

export const projectApi = {
  list: (filters: LimitOffset) =>
    request<PaginatedResponse<ProjectSerialized>>("/projects", "GET", filters),
  create: (data: ProjectCreatePayload) =>
    request<ProjectSerialized>("/projects", "POST", data),
  get: (id: string) => request<ProjectSerialized>(`/projects/${id}`, "GET"),
  update: (id: string, data: ProjectUpdatePayload) =>
    request<ProjectSerialized>(`/projects/${id}`, "PUT", data),
  delete: (id: string) => request(`/projects/${id}`, "DELETE"),
};

export const promptApi = {
  list: () => request<PromptSerialized[]>("/prompts", "GET"),
  create: (data: PromptCreatePayload) =>
    request<PromptSerialized>("/prompts", "POST", data),
  get: (id: string) => request<PromptSerialized>(`/prompts/${id}`, "GET"),
  update: (id: string, data: PromptUpdatePayload) =>
    request<PromptSerialized>(`/prompts/${id}`, "PUT", data),
  delete: (id: string) => request(`/prompts/${id}`, "DELETE"),
};
