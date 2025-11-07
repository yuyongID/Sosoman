/**
 * Flow definition describing how multiple test cases are orchestrated.
 */
export interface TestFlowStep {
  id: string;
  caseId: string;
  /** Optional delay before executing the step, expressed in milliseconds. */
  delayMs?: number;
  /** Mapping of variable names to expressions referencing prior outputs. */
  bindings?: Record<string, string>;
}

export interface TestFlow {
  id: string;
  name: string;
  description?: string;
  steps: TestFlowStep[];
  createdAt: string;
  updatedAt: string;
}
