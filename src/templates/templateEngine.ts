export function extractTemplateVariables(template: string): string[] {
  const matches = template.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g);

  return Array.from(new Set(Array.from(matches, (match) => match[1])));
}

export function findMissingTemplateVariables(
  template: string,
  availableColumns: string[]
): string[] {
  const requiredVariables = extractTemplateVariables(template);
  const availableColumnSet = new Set(availableColumns);

  return requiredVariables.filter(
    (variable) => !availableColumnSet.has(variable)
  );
}

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, variable) => {
    return variables[variable] ?? "";
  });
}