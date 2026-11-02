import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { environmentOf } from "./env";

describe("the shell", () => {
  it("names the product", () => {
    render(<App path="/" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("{{marketing}}");
  });

  // jsdom is `localhost`, and the tests build with no `__{{NAME}}_VERSION__`: a dash, never `undefined`.
  it("names the environment and the version, or a dash, at the foot of the screen", () => {
    render(<App path="/" />);
    expect(document.querySelector(".environment")?.textContent).toBe("LOCAL - -");
  });
  // {{#multiapp}}

  it("names the app its path opens", () => {
    render(<App path="/{{app_first}}/x" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("{{marketing}} — {{app_first}}");
  });
  // {{/multiapp}}
});

describe("environmentOf", () => {
  it("reads the environment off the hostname", () => {
    expect(environmentOf("{{domain}}")).toBe("production");
    expect(environmentOf("qa.{{domain}}")).toBe("QA");
    expect(environmentOf("{{name}}-dev.{{dev_subdomain}}.workers.dev")).toBe("dev");
    expect(environmentOf("{{name}}-3-{{name}}-dev.{{dev_subdomain}}.workers.dev")).toBe("preview");
    expect(environmentOf("{{name}}-3.localhost")).toBe("local");
    expect(environmentOf("local.{{domain}}")).toBe("local");
  });
});
