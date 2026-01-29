import { request } from ".";
import { LimitOffset, PaginatedResponse } from "../schemas/base";
import { TestSuiteCreatePayload, TestSuiteSerialized } from "../schemas/tests";

export const testApi = {
  suites: {
    list: (filters: LimitOffset) =>
      request<PaginatedResponse<TestSuiteSerialized>>(
        "/tests/suites",
        "GET",
        filters,
      ),
    create: (data: TestSuiteCreatePayload) =>
      request("/tests/suites", "POST", data),
    get: (id: string) =>
      request<TestSuiteSerialized>(`/tests/suites/${id}`, "GET"),
  },
};
