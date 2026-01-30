"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { API } from "@/utils/api";
import { LLMS } from "@/utils/constants";
import { ContextSerialized } from "@/utils/schemas/context";
import {
  ProjectSerialized,
  ProjectUpdatePayload,
  PromptSerialized,
} from "@/utils/schemas/project";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function Client(props: {
  project: ProjectSerialized;
  prompts: PromptSerialized[];
  contexts: ContextSerialized[];
}) {
  const { project: serverProject, prompts, contexts } = props;
  const router = useRouter();

  const projectQuery = useQuery({
    queryKey: ["projects", serverProject.id],
    queryFn: () => API.projects.get(serverProject.id),
    initialData: serverProject,
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: ProjectUpdatePayload) =>
      API.projects.update(serverProject.id, data),
    onSuccess: () => {
      toast.success("Project updated successfully");
      projectQuery.refetch();
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => API.projects.delete(serverProject.id),
    onSuccess: () => {
      toast.success("Project deleted successfully");
      router.push("/admin/projects");
    },
  });

  const project = projectQuery.data;

  const updateForm = useForm({
    defaultValues: {
      name: project.name,
      promptId: project.promptId,
      llmModel: project.llmModel as keyof typeof LLMS,
      topP: project.topP,
      topK: project.topK,
      temperature: project.temperature,
      current: project.current,
      contextIds: project.contexts.map((c) => c.id),
    },
    onSubmit: async ({ value }) => {
      updateProjectMutation.mutate(value);
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">"{project.name}" Project</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to delete this project? This action cannot be undone.",
                )
              ) {
                deleteProjectMutation.mutate();
              }
            }}
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2Icon />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Edit</Button>
            </SheetTrigger>
            <SheetContent className="overflow-auto">
              <SheetHeader>
                <SheetTitle>Edit Project</SheetTitle>
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
                            Project Name
                          </FieldLabel>
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
                  <updateForm.Field
                    name="promptId"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Prompt</FieldLabel>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a prompt" />
                            </SelectTrigger>
                            <SelectContent>
                              {prompts.map((prompt) => (
                                <SelectItem key={prompt.id} value={prompt.id}>
                                  {prompt.name}
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
                  <updateForm.Field
                    name="llmModel"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            LLM Model
                          </FieldLabel>
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
                  <updateForm.Field
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
                  <updateForm.Field
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
                  <updateForm.Field
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
                    <updateForm.Field
                      name="contextIds"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
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
                  <updateForm.Field
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
                        <Label htmlFor={field.name}>
                          Set as current project
                        </Label>
                      </div>
                    )}
                  />
                </FieldGroup>

                <SheetFooter>
                  <Button
                    type="submit"
                    disabled={updateProjectMutation.isPending}
                  >
                    Submit
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
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  LLM Model
                </dt>
                <dd className="text-sm">
                  {LLMS[project.llmModel as keyof typeof LLMS].name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Temperature
                </dt>
                <dd className="text-sm">{project.temperature}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Top P
                </dt>
                <dd className="text-sm">{project.topP}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Top K
                </dt>
                <dd className="text-sm">{project.topK}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
            <CardDescription>{project.prompt.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-32 whitespace-pre-wrap rounded-md border bg-muted p-3 text-sm">
              {project.prompt.content}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contexts</CardTitle>
            <CardDescription>
              {project.contexts.length} context(s) attached
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.contexts.map((context) => (
                <li key={context.id}>
                  <Link
                    href={`/admin/context`}
                    className="text-sm text-primary hover:underline"
                  >
                    {context.name}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
