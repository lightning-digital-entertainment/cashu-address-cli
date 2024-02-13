import prompts from "prompts";

export function waitForEnter() {
  return prompts({
    type: "text",
    name: "waiting",
    message: "Hit enter to continue...",
  });
}
