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
import { PromptSerialized, PromptUpdatePayload } from "@/utils/schemas/project";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Client(props: { prompt: PromptSerialized }) {
  const { prompt: serverPrompt } = props;
  const router = useRouter();

  const promptQuery = useQuery({
    queryKey: ["prompts", serverPrompt.id],
    queryFn: () => API.prompts.get(serverPrompt.id),
    initialData: serverPrompt,
  });

  const updatePromptMutation = useMutation({
    mutationFn: (data: PromptUpdatePayload) =>
      API.prompts.update(serverPrompt.id, data),
    onSuccess: () => {
      toast.success("Prompt updated successfully");
      promptQuery.refetch();
    },
  });

  const deletePromptMutation = useMutation({
    mutationFn: () => API.prompts.delete(serverPrompt.id),
    onSuccess: () => {
      toast.success("Prompt deleted successfully");
      router.push("/admin/prompts");
    },
    onError: (error: any) => {
      toast.error(
        error?.message ||
          "Failed to delete prompt. It may be in use by projects.",
      );
    },
  });

  const prompt = promptQuery.data;

  const updateForm = useForm({
    defaultValues: {
      name: prompt.name,
      content: prompt.content,
    },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) {
        toast.error("Prompt name is required");
        return;
      }
      if (!value.content.trim()) {
        toast.error("Prompt content is required");
        return;
      }

      updatePromptMutation.mutate(value);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">"{prompt.name}" Prompt</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to delete this prompt? This action cannot be undone and will fail if the prompt is used by any projects.",
                )
              ) {
                deletePromptMutation.mutate();
              }
            }}
            disabled={deletePromptMutation.isPending}
          >
            <Trash2Icon />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Edit</Button>
            </SheetTrigger>
            <SheetContent className="overflow-auto">
              <SheetHeader>
                <SheetTitle>Edit Prompt</SheetTitle>
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
                            Prompt Name
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter prompt name"
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
                    name="content"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Prompt Content
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter prompt content"
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
                </FieldGroup>

                <SheetFooter>
                  <Button
                    type="submit"
                    disabled={updatePromptMutation.isPending}
                  >
                    {updatePromptMutation.isPending ? "Saving..." : "Submit"}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid gap-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Prompt Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-64 whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">
              {prompt.content}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
