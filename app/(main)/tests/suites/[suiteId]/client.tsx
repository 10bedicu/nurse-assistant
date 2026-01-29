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
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
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

export default function Client(props: { suite: TestSuiteSerialized }) {
  const { suite: serverSuite } = props;

  const suitesQuery = useQuery({
    queryKey: ["suites", serverSuite.id],
    queryFn: () => API.tests.suites.get(serverSuite.id),
    initialData: serverSuite,
  });

  const suite = suitesQuery.data;

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">
          "{serverSuite.name}" Test Suite
        </h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Edit</Button>
          </SheetTrigger>
        </Sheet>
      </div>
      <div className="flex flex-col gap-4 mt-8"></div>
    </div>
  );
}
