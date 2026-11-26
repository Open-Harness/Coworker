import type { SuggestionCategory } from "~/modules/ui/types.ts";

/** Ways to begin that use what this assistant can really do. */
export const suggestions: readonly SuggestionCategory[] = [
  {
    key: "writing",
    label: "Writing",
    icon: "write",
    suggestions: [
      {
        heading: "Draft a document",
        body: "A report or plan everyone can open and edit by asking",
        prompt: "Write a one-page document about ",
      },
      { heading: "Improve a text", body: "Clearer, shorter, same meaning", prompt: "Improve this text and explain the changes:\n\n" },
      { heading: "Draft an email", body: "Polished, for the reader you name", prompt: "Draft an email to " },
      {
        heading: "Summarize",
        body: "The decisions and open questions in a text",
        prompt: "Summarize the decisions and open questions in:\n\n",
      },
    ],
  },
  {
    key: "code",
    label: "Code",
    icon: "code",
    suggestions: [
      { heading: "Write a function", body: "With its edge cases and a test", prompt: "Write a function, with a test, that " },
      {
        heading: "Explain code",
        body: "What it does and what could go wrong",
        prompt: "Explain what this code does and what could go wrong:\n\n",
      },
      {
        heading: "Find the bug",
        body: "From the code and what you saw happen",
        prompt: "Find the bug. What I expected, what happened, and the code:\n\n",
      },
      { heading: "Review a design", body: "Trade-offs and what is missing", prompt: "Review this design and tell me what is missing:\n\n" },
    ],
  },
  {
    key: "research",
    label: "Research",
    icon: "research",
    suggestions: [
      {
        heading: "Read a web page",
        body: "Fetch a public page and pull out what matters",
        prompt: "Read this page and tell me what matters: https://",
      },
      { heading: "Compare pages", body: "Two sources side by side in a table", prompt: "Read both pages and compare them in a table: " },
      { heading: "Search our chats", body: "What was said here before", prompt: "Search our earlier chats for " },
      { heading: "Explain a topic", body: "From the basics to the details", prompt: "Explain, from the basics to the details, " },
    ],
  },
  {
    key: "plan",
    label: "Plan",
    icon: "plan",
    suggestions: [
      { heading: "Remind us later", body: "The assistant comes back to this chat at a set time", prompt: "In two hours, remind us to " },
      { heading: "A recurring check", body: "Something to do every day or week", prompt: "Every weekday at 9:00, " },
      { heading: "Plan a project", body: "Steps, owners and risks in a document", prompt: "Make a project plan, as a document, for " },
      { heading: "Weigh a decision", body: "Options, costs and a recommendation", prompt: "Help us decide between " },
    ],
  },
];
