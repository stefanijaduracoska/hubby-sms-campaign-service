import { describe, expect, it } from "vitest";
import {
  extractTemplateVariables,
  findMissingTemplateVariables,
  renderTemplate,
} from "../src/templates/templateEngine";

describe("templateEngine", () => {
  it("extracts unique template variables", () => {
    const result = extractTemplateVariables(
      "Hi {{first_name}}, your {{plan}} ends soon. Bye {{ first_name }}."
    );

    expect(result).toEqual(["first_name", "plan"]);
  });

  it("finds missing variables compared to available CSV columns", () => {
    const result = findMissingTemplateVariables(
      "Hi {{first_name}}, your plan ends on {{expiry}}.",
      ["iccid", "first_name"]
    );

    expect(result).toEqual(["expiry"]);
  });

  it("renders a template with recipient variables", () => {
    const result = renderTemplate(
      "Hi {{first_name}}, your plan ends on {{expiry}}.",
      {
        first_name: "Ana",
        expiry: "2026-05-20",
      }
    );

    expect(result).toBe("Hi Ana, your plan ends on 2026-05-20.");
  });
});