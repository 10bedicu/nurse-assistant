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
import { PromptSerialized } from "@/utils/schemas/project";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DownloadIcon, PlayIcon, UploadIcon, Volume2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TestCasesImportPayload } from "@/utils/schemas/tests";

type QuestionInputMode = "text" | "audio";

export default function Client(props: {
  suite: TestSuiteSerialized;
  contexts: ContextSerialized[];
}) {
  const { suite: serverSuite, contexts } = props;
  const router = useRouter();
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [createQuestionMode, setCreateQuestionMode] =
    useState<QuestionInputMode>("text");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suiteQuery = useQuery({
    queryKey: ["suites", serverSuite.id],
    queryFn: () => API.tests.suites.get(serverSuite.id),
    initialData: serverSuite,
  });

  const promptsQuery = useQuery({
    queryKey: ["prompts"],
    queryFn: () => API.prompts.list(),
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

  const updateCaseMutation = useMutation({
    mutationFn: (data: { caseId: string; payload: TestCaseCreatePayload }) =>
      API.tests.suites.cases.update(serverSuite.id, data.caseId, data.payload),
    onSuccess: () => {
      toast.success("Test case updated successfully");
      suiteQuery.refetch();
      setEditingCaseId(null);
    },
  });

  const createTestRunMutation = useMutation({
    mutationFn: (data: TestRunCreatePayload) =>
      API.tests.suites.run(suite.id, data),
    onSuccess: (data) => {
      toast.success("Test run created successfully");
      router.push(`/admin/tests/runs/${data.id}`);
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

  const deleteSuiteMutation = useMutation({
    mutationFn: () => API.tests.suites.delete(serverSuite.id),
    onSuccess: () => {
      toast.success("Test suite deleted successfully");
      router.push("/admin/tests/suites");
    },
  });

  const importCasesMutation = useMutation({
    mutationFn: (data: TestCasesImportPayload) =>
      API.tests.suites.cases.import(serverSuite.id, data),
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} questions`);
      suiteQuery.refetch();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to import questions");
    },
  });

  const suite = suiteQuery.data;

  // Export all questions as JSON
  const exportQuestions = () => {
    const questions = suite.testCases.map((tc) => ({
      questionText: tc.questionText || undefined,
      questionAudioPath: tc.questionAudioPath || undefined,
      questionImagePath: tc.questionImagePath || undefined,
      expectedAnswer: tc.expectedAnswer,
    }));

    const exportData = {
      suiteName: suite.name,
      exportedAt: new Date().toISOString(),
      questions,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${suite.name.replace(/[^a-z0-9]/gi, "_")}_questions.json`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle file import
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Support both formats: { questions: [...] } or just [...]
        const questions = Array.isArray(data) ? data : data.questions;

        if (!questions || !Array.isArray(questions)) {
          toast.error(
            "Invalid JSON format. Expected { questions: [...] } or an array of questions.",
          );
          return;
        }

        importCasesMutation.mutate({ questions });
      } catch (err) {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be selected again
    event.target.value = "";
  };

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
      promptId: "",
      temperature: 0.7,
      topP: 1,
      topK: 40,
    },
    onSubmit: async ({ value }) => {
      const selectedPrompt = promptsQuery.data?.find(
        (p) => p.id === value.promptId,
      );
      if (!selectedPrompt) {
        toast.error("Please select a prompt");
        return;
      }
      createTestRunMutation.mutate({
        llmModel: value.llmModel,
        prompt: selectedPrompt.content,
        temperature: value.temperature,
        topP: value.topP,
        topK: value.topK,
      });
    },
  });

  return (
    <div>
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-semibold">"{suite.name}" Test Suite</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportQuestions}
            disabled={suite.testCases.length === 0}
          >
            <DownloadIcon className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={importCasesMutation.isPending}
          >
            <UploadIcon className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button
            variant="outline"
            className="text-red-500"
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${suite.name}"?`)) {
                deleteSuiteMutation.mutate();
              }
            }}
            disabled={deleteSuiteMutation.isPending}
          >
            Delete
          </Button>
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
            <SheetContent className="overflow-y-auto">
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
                    name="promptId"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      const selectedPrompt = promptsQuery.data?.find(
                        (p) => p.id === field.state.value,
                      );
                      return (
                        <>
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Prompt</FieldLabel>
                            <Select
                              value={field.state.value}
                              onValueChange={(value) =>
                                field.handleChange(value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a prompt" />
                              </SelectTrigger>
                              <SelectContent>
                                {promptsQuery.data?.map((prompt) => (
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
                          {selectedPrompt && (
                            <Field>
                              <FieldLabel>Prompt Content</FieldLabel>
                              <Textarea
                                value={selectedPrompt.content}
                                readOnly
                                className="min-h-25 opacity-70"
                              />
                            </Field>
                          )}
                        </>
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
            <Link href={`/admin/context/${context.id}`}>{context.name}</Link>
          </Button>
        ))}
      </p>
      <h2 className="text-lg font-semibold mt-8">Questions</h2>
      <div className="flex flex-col gap-4 mt-4">
        {suite.testCases.map((testCase) => (
          <Card key={testCase.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {testCase.questionAudioPath && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Volume2Icon className="h-3 w-3" />
                    Audio
                  </Badge>
                )}
                <CardTitle className="flex-1">
                  Q : {testCase.questionText || "Audio Question"}
                </CardTitle>
              </div>
              {testCase.questionAudioPath && (
                <div className="mt-2">
                  <audio
                    controls
                    className="w-full max-w-md h-10"
                    src={"/audio_files/" + testCase.questionAudioPath}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              <CardDescription>A : {testCase.expectedAnswer}</CardDescription>
              <CardAction>
                <Sheet
                  open={editingCaseId === testCase.id}
                  onOpenChange={(open) => {
                    if (!open) setEditingCaseId(null);
                  }}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setEditingCaseId(testCase.id)}
                    >
                      Edit
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Edit Test Case</SheetTitle>
                    </SheetHeader>
                    <EditCaseForm
                      testCase={testCase}
                      onSubmit={(data) => {
                        updateCaseMutation.mutate({
                          caseId: testCase.id,
                          payload: data,
                        });
                      }}
                      isPending={updateCaseMutation.isPending}
                    />
                  </SheetContent>
                </Sheet>
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
                <Field>
                  <FieldLabel>Question Input Type</FieldLabel>
                  <Select
                    value={createQuestionMode}
                    onValueChange={(value) =>
                      setCreateQuestionMode(value as QuestionInputMode)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select input type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="audio">Audio URL</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {createQuestionMode === "text" ? (
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
                ) : (
                  <createCaseForm.Field
                    name="questionAudioPath"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Question Audio URL
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter audio URL"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                )}
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

function EditCaseForm({
  testCase,
  onSubmit,
  isPending,
}: {
  testCase: {
    questionText: string | null;
    questionAudioPath: string | null;
    expectedAnswer: string;
  };
  onSubmit: (data: TestCaseCreatePayload) => void;
  isPending: boolean;
}) {
  const [questionMode, setQuestionMode] = useState<QuestionInputMode>(
    testCase.questionAudioPath ? "audio" : "text",
  );
  const editCaseForm = useForm({
    defaultValues: {
      questionText: testCase.questionText || "",
      questionAudioPath: testCase.questionAudioPath || "",
      questionImagePath: "",
      expectedAnswer: testCase.expectedAnswer,
    } as TestCaseCreatePayload,
    validators: {
      onSubmit: testCaseCreateSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit({
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        editCaseForm.handleSubmit();
      }}
    >
      <FieldGroup className="px-4">
        <Field>
          <FieldLabel>Question Input Type</FieldLabel>
          <Select
            value={questionMode}
            onValueChange={(value) =>
              setQuestionMode(value as QuestionInputMode)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select input type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="audio">Audio URL</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {questionMode === "text" ? (
          <editCaseForm.Field
            name="questionText"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Question Text</FieldLabel>
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
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        ) : (
          <editCaseForm.Field
            name="questionAudioPath"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Question Audio URL
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter audio URL"
                    autoComplete="off"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        )}
        <editCaseForm.Field
          name="expectedAnswer"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Expected Answer</FieldLabel>
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
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <SheetFooter>
        <Button disabled={isPending} type="submit">
          Update
        </Button>
      </SheetFooter>
    </form>
  );
}
