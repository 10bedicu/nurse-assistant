import { request } from ".";
import { LimitOffset, PaginatedResponse } from "../schemas/base";
import {
  TestCaseCreatePayload,
  TestCaseSerialized,
  TestCasesImportPayload,
  TestRunCreatePayload,
  TestRunSerialized,
  TestSuiteCreatePayload,
  TestSuiteSerialized,
  TestSuiteUpdatePayload,
} from "../schemas/tests";

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
    update: (id: string, data: TestSuiteUpdatePayload) =>
      request<TestSuiteSerialized>(`/tests/suites/${id}`, "PUT", data),
    get: (id: string) =>
      request<TestSuiteSerialized>(`/tests/suites/${id}`, "GET"),
    delete: (id: string) => request(`/tests/suites/${id}`, "DELETE"),
    cases: {
      update: (suiteId: string, caseId: string, data: TestCaseCreatePayload) =>
        request<TestCaseSerialized>(
          `/tests/suites/${suiteId}/cases/${caseId}`,
          "PUT",
          data,
        ),
      create: (suiteId: string, data: TestCaseCreatePayload) =>
        request(`/tests/suites/${suiteId}/cases`, "POST", data),
      delete: (suiteId: string, caseId: string) =>
        request(`/tests/suites/${suiteId}/cases/${caseId}`, "DELETE"),
      import: (suiteId: string, data: TestCasesImportPayload) =>
        request<{ imported: number; cases: TestCaseSerialized[] }>(
          `/tests/suites/${suiteId}/cases/import`,
          "POST",
          data,
        ),
    },
    run: (suiteId: string, data: TestRunCreatePayload) =>
      request<TestRunSerialized>(`/tests/suites/${suiteId}/run`, "POST", data),
  },
  runs: {
    list: (filters: LimitOffset) =>
      request<PaginatedResponse<TestRunSerialized>>(
        "/tests/runs",
        "GET",
        filters,
      ),
    get: (id: string) => request<TestRunSerialized>(`/tests/runs/${id}`, "GET"),
  },
};
