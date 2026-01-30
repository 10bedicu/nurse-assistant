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
import { PromptSerialized } from "@/utils/schemas/project";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";

export default function Client(props: { prompts: PromptSerialized[] }) {
  const { prompts: serverPrompts } = props;

  const promptsQuery = useQuery({
    queryKey: ["prompts"],
    queryFn: () => API.prompts.list(),
    initialData: serverPrompts,
  });

  const createPromptMutation = useMutation({
    mutationFn: (data: { name: string; content: string }) =>
      API.prompts.create(data),
    onSuccess: () => {
      toast.success("Prompt created successfully");
      promptsQuery.refetch();
      form.reset();
    },
  });

  const prompts = promptsQuery.data;

  const form = useForm({
    defaultValues: {
      name: "",
      content: "",
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

      createPromptMutation.mutate(value);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">Prompts</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Create</Button>
          </SheetTrigger>
          <SheetContent className="overflow-auto">
            <SheetHeader>
              <SheetTitle>Create Prompt</SheetTitle>
              <SheetDescription>
                Create a new prompt template for your projects.
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
                        <FieldLabel htmlFor={field.name}>
                          Name <span className="text-destructive">*</span>
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
                <form.Field
                  name="content"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Content <span className="text-destructive">*</span>
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
                          className="min-h-32"
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
                <Button type="submit" disabled={createPromptMutation.isPending}>
                  {createPromptMutation.isPending ? "Creating..." : "Submit"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
      <div className="flex flex-col gap-4 mt-8">
        {prompts.map((prompt) => (
          <Link key={prompt.id} href={`/admin/prompts/${prompt.id}`}>
            <Card>
              <CardHeader>
                <CardTitle>{prompt.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {prompt.content}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
