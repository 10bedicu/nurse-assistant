"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/utils/api";
import {
  ContextSerialized,
  ContextCreatePayload,
} from "@/utils/schemas/context";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Client(props: { context: ContextSerialized }) {
  const { context: serverContext } = props;
  const router = useRouter();

  const contextQuery = useQuery({
    queryKey: ["context", serverContext.id],
    queryFn: () => API.context.get(serverContext.id),
    initialData: serverContext,
  });

  const updateContextMutation = useMutation({
    mutationFn: (data: ContextCreatePayload) =>
      API.context.update(serverContext.id, data),
    onSuccess: () => {
      toast.success("Context updated successfully");
      contextQuery.refetch();
    },
  });

  const deleteContextMutation = useMutation({
    mutationFn: () => API.context.delete(serverContext.id),
    onSuccess: () => {
      toast.success("Context deleted successfully");
      router.push("/admin/context");
    },
    onError: (error: any) => {
      toast.error(
        error?.message ||
          "Failed to delete context. It may be in use by projects or test suites.",
      );
    },
  });

  const context = contextQuery.data;

  const updateForm = useForm({
    defaultValues: {
      name: context.name,
      text: context.text || "",
      filePath: context.filePath || "",
    },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) {
        toast.error("Context name is required");
        return;
      }

      updateContextMutation.mutate(value);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">"{context.name}" Context</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to delete this context? This action cannot be undone and will fail if the context is used by any projects or test suites.",
                )
              ) {
                deleteContextMutation.mutate();
              }
            }}
            disabled={deleteContextMutation.isPending}
          >
            <Trash2Icon />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Edit</Button>
            </SheetTrigger>
            <SheetContent className="overflow-auto">
              <SheetHeader>
                <SheetTitle>Edit Context</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateForm.handleSubmit();
                }}
              >
                <FieldGroup className="px-4">
                  <updateForm.Field
                    name="name"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Context Name{" "}
                            <span className="text-destructive">*</span>
                          </FieldLabel>
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
                  <updateForm.Field
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
                            placeholder="Context text"
                            autoComplete="off"
                            className="min-h-64"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                  <updateForm.Field
                    name="filePath"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            File Path
                          </FieldLabel>
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
                  <Button
                    type="submit"
                    disabled={updateContextMutation.isPending}
                  >
                    {updateContextMutation.isPending ? "Saving..." : "Submit"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid gap-4 mt-8">
        {context.text && (
          <Card>
            <CardHeader>
              <CardTitle>Text Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-32 whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">
                {context.text}
              </div>
            </CardContent>
          </Card>
        )}

        {context.filePath && (
          <Card>
            <CardHeader>
              <CardTitle>File Path</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono">{context.filePath}</p>
            </CardContent>
          </Card>
        )}

        {!context.text && !context.filePath && (
          <Card>
            <CardHeader>
              <CardTitle>No Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This context has no text or file path set.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
