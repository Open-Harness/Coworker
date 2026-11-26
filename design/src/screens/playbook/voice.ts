export const VOICE_BEFORE = "Opens with the weather, a greeting, or the fact.";
export const VOICE_AFTER = "Opens with the fact. No greeting line.";
export const VOICE = `# Bo’s way of writing

How Bo writes to someone who may buy. From 212 mails Bo sent in two years. Use it when a mail goes out in Bo’s name.

## How it sounds

- ${VOICE_BEFORE}
- One thought to a sentence. Rarely more than 14 words.
- Asks one question, last, that can be answered in a line.
- Signs “Bo”. Never “best regards”.

## What Bo never does

- Say what we are before saying what we saw.
- Use a word the reader would not say aloud.
- Ask for “a quick call”. Bo names a day.

## When it does not fit

Bo writes longer to people Bo has met. Look in the CRM: if there was a call, read that mail first.`;
export const VOICE_FILES: Readonly<Record<string, string>> = {
  "examples.md": "# Examples\n\nTwelve mails Bo sent, with what came back. Names are taken out.\n\n> You opened in Ghent last week. With two sites, who sees what is in which warehouse? If that is still a spreadsheet, I can show you how Harbor did it, Thursday at 10?\n>\n> Bo",
  "never.md": "# Never\n\n- I hope this finds you well\n- Just circling back\n- Quick question\n- We are the leading",
};
