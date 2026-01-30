"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { API } from "@/utils/api";
import { getNextPageParam } from "@/utils/query-utils";
import { PaginatedResponse } from "@/utils/schemas/base";
import {
  TestSuiteCreatePayload,
  testSuiteCreateSchema,
  TestSuiteSerialized,
} from "@/utils/schemas/tests";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { InfiniteScroll } from "@/components/infinite-scroll";

export default function Client(props: {
  suites: PaginatedResponse<TestSuiteSerialized>;
}) {
  const { suites: serverSuites } = props;

  const suitesQuery = useInfiniteQuery({
    queryKey: ["suites"],
    queryFn: ({ pageParam = 0 }) =>
      API.tests.suites.list({ limit: 20, offset: pageParam }),
    initialData: { pages: [serverSuites], pageParams: [0] },
    initialPageParam: 0,
    getNextPageParam: getNextPageParam,
  });

  const createSuiteMutation = useMutation({
    mutationFn: (data: TestSuiteCreatePayload) => API.tests.suites.create(data),
    onSuccess: () => {
      toast.success("Test suite created successfully");
      suitesQuery.refetch();
    },
  });

  const suites = suitesQuery.data?.pages.flatMap((page) => page.results);

  const form = useForm({
    defaultValues: {
      name: "",
    },
    validators: {
      onSubmit: testSuiteCreateSchema,
    },
    onSubmit: async ({ value }) => {
      createSuiteMutation.mutate(value);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">Test Suites</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Create</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create Test Suite</SheetTitle>
              <SheetDescription>
                Enter the name for the new test suite.
              </SheetDescription>
            </SheetHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <FieldGroup className="px-4">
                <form.Field
                  name="name"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Enter test suite name"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
              </FieldGroup>

              <SheetFooter>
                <Button type="submit">Submit</Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
      <InfiniteScroll
        onLoadMore={() => suitesQuery.fetchNextPage()}
        hasMore={suitesQuery.hasNextPage ?? false}
        isFetching={suitesQuery.isFetching}
        className="flex flex-col gap-4 mt-8"
      >
        {suites.map((suite) => (
          <Link key={suite.id} href={`/admin/tests/suites/${suite.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{suite.name}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </InfiniteScroll>
    </div>
  );
}
