// Interjections and fillers that belong to no one language. Tagged "X" and ignored by the metrics.
// Note: "hi" is here so greetings do not count as Hindi ("hi" also means "only/emphasis" in
// Hindi; that single-token loss is acceptable and is documented in the evaluation).
const WORDS = `
hi hey hello ok okay hmm hmmm umm um uh uhh ah aah oh ohh wow haha hehe lol yo bye oops ouch
ओके हम्म हाहा
`;

export const NEUTRAL: ReadonlySet<string> = new Set(WORDS.split(/\s+/).filter(Boolean));
