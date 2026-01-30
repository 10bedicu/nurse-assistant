"use client";

import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
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
  TestCaseCreatePayload,
  testCaseCreateSchema,
  TestRunCreatePayload,
  TestSuiteSerialized,
  TestSuiteUpdatePayload,
} from "@/utils/schemas/tests";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PlayIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Client(props: {
  suite: TestSuiteSerialized;
  contexts: ContextSerialized[];
}) {
  const { suite: serverSuite, contexts } = props;
  const router = useRouter();

  const suiteQuery = useQuery({
    queryKey: ["suites", serverSuite.id],
    queryFn: () => API.tests.suites.get(serverSuite.id),
    initialData: serverSuite,
  });

  const updateSuiteMutation = useMutation({
    mutationFn: (data: TestSuiteUpdatePayload) =>
      API.tests.suites.update(serverSuite.id, data),
    onSuccess: () => {
      toast.success("Test suite updated successfully");
      suiteQuery.refetch();
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: (data: TestCaseCreatePayload) =>
      API.tests.suites.cases.create(serverSuite.id, data),
    onSuccess: () => {
      toast.success("Test case created successfully");
      suiteQuery.refetch();
      createCaseForm.reset();
    },
  });

  const createTestRunMutation = useMutation({
    mutationFn: (data: TestRunCreatePayload) =>
      API.tests.suites.run(suite.id, data),
    onSuccess: (data) => {
      toast.success("Test run created successfully");
      router.push(`/tests/runs/${data.id}`);
    },
  });

  const deleteCaseMutation = useMutation({
    mutationFn: (caseId: string) =>
      API.tests.suites.cases.delete(serverSuite.id, caseId),
    onSuccess: () => {
      toast.success("Test case deleted successfully");
      suiteQuery.refetch();
    },
  });

  const suite = suiteQuery.data;

  const createCaseForm = useForm({
    defaultValues: {
      questionText: "",
      questionAudioPath: "",
      questionImagePath: "",
      expectedAnswer: "",
    } as TestCaseCreatePayload,
    validators: {
      onSubmit: testCaseCreateSchema,
    },
    onSubmit: async ({ value }) => {
      createCaseMutation.mutate({
        questionText: "questionText" in value ? value.questionText : undefined,
        questionAudioPath:
          "questionAudioPath" in value ? value.questionAudioPath : undefined,
        questionImagePath: ("questionImagePath" in value
          ? value.questionImagePath
          : undefined) as string,
        expectedAnswer: value.expectedAnswer,
      });
    },
  });

  const updateContextForm = useForm({
    defaultValues: {
      contextIds: suite.contexts.map((c) => c.id),
      name: suite.name,
    },
    onSubmit: async ({ value }) => {
      updateSuiteMutation.mutate({
        name: value.name,
        contextIds: value.contextIds,
      });
    },
  });

  const createRunForm = useForm({
    defaultValues: {
      llmModel: Object.keys(LLMS)[0] as keyof typeof LLMS,
      prompt: "",
      temperature: 0.7,
      topP: 1,
      topK: 40,
    },
    onSubmit: async ({ value }) => {
      createTestRunMutation.mutate({
        llmModel: value.llmModel,
        prompt: value.prompt,
        temperature: value.temperature,
        topP: value.topP,
        topK: value.topK,
      });
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">"{suite.name}" Test Suite</h1>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant={"secondary"}>Edit</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Edit Suite</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateContextForm.handleSubmit();
                }}
              >
                <FieldGroup className="px-4">
                  <updateContextForm.Field
                    name="name"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Suite Name
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter suite name"
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
                    <FieldLabel>Context</FieldLabel>
                    <updateContextForm.Field
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
                </FieldGroup>
                <div className="px-4 mt-4">
                  <Button
                    asChild
                    disabled={createCaseMutation.isPending}
                    variant={"secondary"}
                    className="w-full"
                  >
                    <Link href={"/admin/context?new=true"}>Create Context</Link>
                  </Button>
                </div>
                <SheetFooter>
                  <Button disabled={createCaseMutation.isPending} type="submit">
                    Submit
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <PlayIcon />
                Run
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create Test Run</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createRunForm.handleSubmit();
                }}
              >
                <FieldGroup className="px-4">
                  <createRunForm.Field
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
                  <createRunForm.Field
                    name="prompt"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Prompt</FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter prompt"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                  <createRunForm.Field
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
                  <createRunForm.Field
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
                  <createRunForm.Field
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
                            min="1"
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
                </FieldGroup>

                <SheetFooter>
                  <Button
                    disabled={createTestRunMutation.isPending}
                    type="submit"
                  >
                    Run Tests
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <p>
        <span className="italics opacity-60">Context : </span>{" "}
        {suite.contexts.map((context) => (
          <Button
            asChild
            key={context.id}
            variant={"link"}
            className="inline p-0 text-base"
          >
            <Link href={`/context/${context.id}`}>{context.name}</Link>
          </Button>
        ))}
      </p>
      <h2 className="text-lg font-semibold mt-8">Questions</h2>
      <div className="flex flex-col gap-4 mt-4">
        {suite.testCases.map((testCase) => (
          <Card key={testCase.id}>
            <CardHeader>
              <CardTitle>Q : {testCase.questionText}</CardTitle>
              <CardDescription>A : {testCase.expectedAnswer}</CardDescription>
              <CardAction>
                <Button variant="outline">Edit</Button>
                <Button
                  variant="link"
                  className="text-red-500"
                  onClick={() => deleteCaseMutation.mutate(testCase.id)}
                >
                  Delete
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
        ))}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant={"secondary"}>Add new question</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create Test Case</SheetTitle>
            </SheetHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCaseForm.handleSubmit();
              }}
            >
              <FieldGroup className="px-4">
                <createCaseForm.Field
                  name="questionText"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Question Text
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Enter question text"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <createCaseForm.Field
                  name="expectedAnswer"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Expected Answer
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Enter expected answer"
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
                <Button disabled={createCaseMutation.isPending} type="submit">
                  Submit
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
