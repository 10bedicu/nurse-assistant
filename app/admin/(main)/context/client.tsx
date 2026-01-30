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
import {
  ContextCreatePayload,
  contextCreateSchema,
  ContextSerialized,
} from "@/utils/schemas/context";
import { Textarea } from "@/components/ui/textarea";

export default function Client(props: { context: ContextSerialized[] }) {
  const { context: serverContext } = props;

  const contextQuery = useQuery({
    queryKey: ["context"],
    queryFn: () => API.context.list(),
    initialData: serverContext,
  });

  const createContextMutation = useMutation({
    mutationFn: (data: ContextCreatePayload) => API.context.create(data),
    onSuccess: () => {
      toast.success("Context created successfully");
      contextQuery.refetch();
      form.reset();
    },
  });

  const contexts = contextQuery.data;

  const form = useForm({
    defaultValues: {
      name: "",
      text: "",
      filePath: "",
    } as ContextCreatePayload,
    validators: {
      onSubmit: contextCreateSchema,
    },
    onSubmit: async ({ value }) => {
      createContextMutation.mutate(value);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">Context</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Create</Button>
          </SheetTrigger>
          <SheetContent className="overflow-auto">
            <SheetHeader>
              <SheetTitle>Create Context</SheetTitle>
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
                          placeholder="Enter context name"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="text"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Text</FieldLabel>
                        <Textarea
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Context"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="filePath"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>File Path</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="File path"
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
      <div className="flex flex-col gap-4 mt-8">
        {contexts.map((context) => (
          <Card key={context.id}>
            <CardHeader>
              <CardTitle>{context.name}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
