import { AutomationOperator } from "@prisma/client";

export type RuleLike = {
  metricKey: string;
  operator: AutomationOperator;
  value: number;
};

export type EvaluationContext = {
  metrics: Record<string, string | number | boolean | null | undefined>;
};

function compare(operator: AutomationOperator, left: unknown, right: number): boolean {
  const leftAsNumber = typeof left === "number" ? left : Number(left);

  switch (operator) {
    case AutomationOperator.GREATER_THAN:
      return Number.isFinite(leftAsNumber) && leftAsNumber > right;
    case AutomationOperator.GREATER_THAN_OR_EQUAL:
      return Number.isFinite(leftAsNumber) && leftAsNumber >= right;
    case AutomationOperator.LESS_THAN:
      return Number.isFinite(leftAsNumber) && leftAsNumber < right;
    case AutomationOperator.LESS_THAN_OR_EQUAL:
      return Number.isFinite(leftAsNumber) && leftAsNumber <= right;
    case AutomationOperator.EQUAL:
      return Number.isFinite(leftAsNumber) && leftAsNumber === right;
    case AutomationOperator.NOT_EQUAL:
      return Number.isFinite(leftAsNumber) && leftAsNumber !== right;
    case AutomationOperator.CONTAINS:
      return String(left ?? "").toLowerCase().includes(String(right).toLowerCase());
    case AutomationOperator.NOT_CONTAINS:
      return !String(left ?? "").toLowerCase().includes(String(right).toLowerCase());
    default:
      return false;
  }
}

export function evaluateAutomationRules(
  rules: RuleLike[],
  context: EvaluationContext,
): {
  passed: boolean;
  checks: Array<{ metricKey: string; operator: AutomationOperator; expected: number; actual: unknown; passed: boolean }>;
} {
  const checks = rules.map((rule) => {
    const actual = context.metrics[rule.metricKey];
    const passed = compare(rule.operator, actual, rule.value);

    return {
      metricKey: rule.metricKey,
      operator: rule.operator,
      expected: rule.value,
      actual,
      passed,
    };
  });

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}
