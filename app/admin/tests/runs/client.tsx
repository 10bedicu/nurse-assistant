"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TEST_RUN_STATUS } from "@/prisma/client/index-browser";
import { API } from "@/utils/api";
import { LLMS } from "@/utils/constants";
import { getNextPageParam } from "@/utils/query-utils";
import { PaginatedResponse } from "@/utils/schemas/base";
import { TestRunSerialized } from "@/utils/schemas/tests";
import { useInfiniteQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import Link from "next/link";
import { InfiniteScroll } from "@/components/infinite-scroll";

export default function Client(props: {
  runs: PaginatedResponse<TestRunSerialized>;
}) {
  const testRunsQuery = useInfiniteQuery({
    queryKey: ["runs"],
    queryFn: ({ pageParam = 0 }) =>
      API.tests.runs.list({ limit: 20, offset: pageParam }),
    initialData: { pages: [props.runs], pageParams: [0] },
    initialPageParam: 0,
    getNextPageParam: getNextPageParam,
  });

  const testRuns = testRunsQuery.data?.pages.flatMap((page) => page.results);

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">Test Runs</h1>
      </div>
      <InfiniteScroll
        onLoadMore={() => testRunsQuery.fetchNextPage()}
        hasMore={testRunsQuery.hasNextPage ?? false}
        isFetching={testRunsQuery.isFetching}
        className="mt-4 flex flex-col gap-4"
      >
        {testRuns.map((run) => {
          const metrics = [
            {
              name: "Started At",
              value: dayjs(run.createdAt).format("DD MMM YYYY, hh:mm A"),
            },
            {
              name: "Completed At",
              value: run.completedAt
                ? dayjs(run.completedAt).format("DD MMM YYYY, hh:mm A")
                : "In Progress",
            },
            {
              name: "LLM",
              value:
                LLMS[run.llmModel as keyof typeof LLMS].name || run.llmModel,
            },
            {
              name: "Temperature",
              value: run.temperature.toString(),
            },
            {
              name: "Top P",
              value: run.topP.toString(),
            },
            {
              name: "Top K",
              value: run.topK.toString(),
            },
            {
              name: "Prompt",
              value:
                run.prompt.slice(0, 30) + (run.prompt.length > 30 ? "..." : ""),
            },
          ];

          const isRunning = run.runs.some((r) => r.status === "RUNNING");
          const isComplete = run.runs.every((r) => r.status === "COMPLETED");
          const isFailed =
            run.runs.some((r) => r.status === "FAILED") && !isRunning;

          const completePercentage = Math.round(
            (run.runs.filter((r) => r.status === "COMPLETED").length /
              run.runs.length) *
              100,
          );

          return (
            <Link href={`/admin/tests/runs/${run.id}`} key={run.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{run.suite.name}</CardTitle>
                  <CardDescription className="grid grid-cols-2 gap-1 text-xs">
                    {metrics.map((metric) => (
                      <div key={metric.name}>
                        <strong>{metric.name}:</strong> {metric.value}
                      </div>
                    ))}
                  </CardDescription>
                  <CardAction>
                    {isFailed && (
                      <div className="text-red-600 font-semibold">FAILED</div>
                    )}
                    {isRunning && (
                      <div className="text-blue-600 font-semibold">RUNNING</div>
                    )}
                    {isComplete && (
                      <div className="text-green-600 font-semibold">
                        COMPLETED
                      </div>
                    )}
                  </CardAction>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </InfiniteScroll>
    </div>
  );
}
