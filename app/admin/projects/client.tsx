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
  ProjectCreatePayload,
  projectCreateSchema,
  ProjectSerialized,
  PromptSerialized,
} from "@/utils/schemas/project";
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { ContextSerialized } from "@/utils/schemas/context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLMS } from "@/utils/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InfiniteScroll } from "@/components/infinite-scroll";

export default function Client(props: {
  projects: PaginatedResponse<ProjectSerialized>;
  prompts: PromptSerialized[];
  contexts: ContextSerialized[];
}) {
  const { projects: serverProjects, prompts, contexts } = props;

  const projectsQuery = useInfiniteQuery({
    queryKey: ["projects"],
    queryFn: ({ pageParam = 0 }) =>
      API.projects.list({ limit: 20, offset: pageParam }),
    initialData: { pages: [serverProjects], pageParams: [0] },
    initialPageParam: 0,
    getNextPageParam: getNextPageParam,
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectCreatePayload) => API.projects.create(data),
    onSuccess: () => {
      toast.success("Project created successfully");
      projectsQuery.refetch();
      form.reset();
    },
  });

  const projects = projectsQuery.data?.pages.flatMap((page) => page.results);

  const form = useForm({
    defaultValues: {
      name: "",
      promptId: "",
      llmModel: Object.keys(LLMS)[0],
      topP: 1,
      topK: 40,
      temperature: 0.7,
      current: false,
      contextIds: [] as string[],
    },
    onSubmit: async ({ value }) => {
      // Validate required fields
      if (!value.name.trim()) {
        toast.error("Project name is required");
        return;
      }
      if (!value.promptId) {
        toast.error("Please select a prompt");
        return;
      }

      createProjectMutation.mutate({
        ...value,
        llmModel: value.llmModel as keyof typeof LLMS,
      });
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Create</Button>
          </SheetTrigger>
          <SheetContent className="overflow-auto">
            <SheetHeader>
              <SheetTitle>Create Project</SheetTitle>
              <SheetDescription>
                Create a new project with a prompt and LLM configuration.
                {prompts.length === 0 && (
                  <span className="block mt-2 text-destructive">
                    You need to create a prompt first before creating a project.
                  </span>
                )}
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
                          placeholder="Enter project name"
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
                  name="promptId"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Prompt <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) => field.handleChange(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a prompt" />
                          </SelectTrigger>
                          <SelectContent>
                            {prompts.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground">
                                No prompts available
                              </div>
                            ) : (
                              prompts.map((prompt) => (
                                <SelectItem key={prompt.id} value={prompt.id}>
                                  {prompt.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="llmModel"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>LLM Model</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(value) =>
                            field.handleChange(value as keyof typeof LLMS)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select LLM model" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(LLMS).map(([model, data]) => (
                              <SelectItem key={model} value={model}>
                                {data.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="temperature"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Temperature
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(parseFloat(e.target.value))
                          }
                          aria-invalid={isInvalid}
                          placeholder="0.7"
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
                  name="topP"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Top P</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="number"
                          step="0.1"
                          min="0"
                          max="1"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(parseFloat(e.target.value))
                          }
                          aria-invalid={isInvalid}
                          placeholder="1"
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
                  name="topK"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Top K</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="number"
                          step="1"
                          min="0"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(parseInt(e.target.value))
                          }
                          aria-invalid={isInvalid}
                          placeholder="40"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <div className="flex flex-col gap-4">
                  <FieldLabel>Contexts</FieldLabel>
                  <form.Field
                    name="contextIds"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return contexts.map((context) => (
                        <Field
                          data-invalid={isInvalid}
                          key={field.name + context.id}
                          orientation={"horizontal"}
                        >
                          <Checkbox
                            id={field.name + "-" + context.id}
                            name={field.name}
                            value={context.id}
                            checked={field.state.value.includes(context.id)}
                            onCheckedChange={(checked) => {
                              let newValue = [...field.state.value];
                              if (checked) {
                                newValue.push(context.id);
                              } else {
                                newValue = newValue.filter(
                                  (id) => id !== context.id,
                                );
                              }
                              field.handleChange(newValue);
                            }}
                          />
                          <FieldLabel htmlFor={field.name + "-" + context.id}>
                            {context.name}
                          </FieldLabel>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      ));
                    }}
                  />
                </div>
                <form.Field
                  name="current"
                  children={(field) => (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={field.name}
                        checked={field.state.value}
                        onCheckedChange={(checked) =>
                          field.handleChange(!!checked)
                        }
                      />
                      <Label htmlFor={field.name}>Set as current project</Label>
                    </div>
                  )}
                />
              </FieldGroup>

              <SheetFooter>
                <Button
                  type="submit"
                  disabled={
                    createProjectMutation.isPending || prompts.length === 0
                  }
                >
                  {createProjectMutation.isPending ? "Creating..." : "Submit"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
      <InfiniteScroll
        onLoadMore={() => projectsQuery.fetchNextPage()}
        hasMore={projectsQuery.hasNextPage ?? false}
        isFetching={projectsQuery.isFetching}
        className="flex flex-col gap-4 mt-8"
      >
        {projects?.map((project) => (
          <Link key={project.id} href={`/admin/projects/${project.id}`}>
            <Card className={project.current ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{project.name}</CardTitle>
                  {project.current && <Badge variant="default">Current</Badge>}
                </div>
                <CardDescription>
                  {LLMS[project.llmModel as keyof typeof LLMS].name} •{" "}
                  {project.prompt.name}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </InfiniteScroll>
    </div>
  );
}
