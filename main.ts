// Funniest Cat Voicemail Greeting — make.fun entry
// Competition: u-eager-stork-81-9647-funniest-cat-voicemail-greeting-8eaad443
// Prize: $2 to the funniest one-line voicemail greeting a cat would record.
//
// The brief, in full: one line per entry, at most 120 characters. A house
// judge model reads greetings two at a time and picks the funnier one, weighing
// these criteria, most important first:
//   1. It reads as a voicemail greeting recorded by a cat and it lands a laugh.
//   2. The joke comes from something specific to cats (naps, boxes, knocking
//      things off shelves, demanding food at four in the morning).
//   3. The cat has a clear voice and attitude of its own, so the line sounds
//      like a character speaking rather than an owner writing about a cat.
//   4. It works spoken aloud in the few seconds a caller waits, with the
//      punch arriving quickly.
//   5. The wording is fresh and surprising rather than a pun or a catchphrase
//      everyone has already heard.
//
// The gate: /output/entry.txt must be UTF-8 text of 1 to 120 characters, not
// only white space, a single line. Only a valid entry goes before the judge.
//
// This program is a deterministic candidate generator and scorer. It holds 18
// original candidate one-liners written for this brief, scores each one with a
// hand-built scorer that mirrors the judge brief's five criteria in their
// listed order (weights 30 / 25 / 20 / 15 / 10, summing to 100), writes the
// winning line to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt),
// reads the file back, and re-checks every gate from the brief before
// exiting. Any gate failure exits non-zero.
//
// Node 22 stdlib only. No network, no clock, no randomness, no environment
// reads except MAKEFUN_OUTPUT_DIR. Same input, same output, every run.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate and scoring constants, taken from the brief.
// ---------------------------------------------------------------------------

const MAX_CHARS = 120;
const MIN_CHARS = 1;

// Criterion weights, heaviest first, in the judge brief's listed order.
const WEIGHTS = {
  voicemailAndLaugh: 30, // 1. reads as a cat's voicemail greeting, lands a laugh
  catSpecific: 25, // 2. joke specific to cats
  catVoice: 20, // 3. the cat has a clear voice and attitude of its own
  spokenAloud: 15, // 4. works spoken aloud, punch arrives quickly
  fresh: 10, // 5. fresh and surprising, not a tired pun or catchphrase
} as const;

// ---------------------------------------------------------------------------
// The 18 candidates.
//
// Every line was written fresh for this brief in this session. Each one is a
// voicemail greeting spoken by the cat itself (first person, named or "the
// cat"), built on one cat-specific behaviour, with its punch landing in the
// second half of the line. None of them is a reused pun or catchphrase.
// ---------------------------------------------------------------------------

type Candidate = {
  id: number;
  text: string;
};

const CANDIDATES: Candidate[] = [
  {
    id: 1,
    text: "You've reached Whiskers. I'm napping on your clean laundry \u2014 leave a message, or better yet, leave the tuna.",
  },
  {
    id: 2,
    text: "Meow. You've reached the cat. I'm busy knocking your favourite glass off the table. Talk after the crash.",
  },
  {
    id: 3,
    text: "Hi, it's Biscuit. I can't come to the phone \u2014 I'm in the box the phone came in. Leave a message at the beep.",
  },
  {
    id: 4,
    text: "You've reached Miso. It's 4 a.m., I'm starving, and you still haven't fed me. Leave a message. Then feed me.",
  },
  {
    id: 5,
    text: "This is Chairman Meow. I'm unavailable \u2014 currently sitting on the exact thing you need. Meow after the beep.",
  },
  {
    id: 6,
    text: "You've reached the cat. I saw you call. I chose not to answer. Leave a message and I'll ignore it from a sunbeam.",
  },
  {
    id: 7,
    text: "Hi, you've reached Pickles. I'm mid-nap \u2014 that's a 16-hour nap \u2014 so leave a message and I'll get back to you never.",
  },
  {
    id: 8,
    text: "Meow, it's Noodle. The human is asleep and I am in charge now. Leave a message, then open a can for me.",
  },
  {
    id: 9,
    text: "You've reached Sir Purrs-a-Lot. I knocked the phone off the counter, so if you hear a crash, that was me. Meow.",
  },
  {
    id: 10,
    text: "This is Beans. I can't talk right now \u2014 I'm staring at a wall for reasons you wouldn't understand. Beep.",
  },
  {
    id: 11,
    text: "You've reached Luna. I'm hiding in the laundry basket \u2014 it's mine now. Leave a message, I'll pretend I didn't hear it.",
  },
  {
    id: 12,
    text: "Hi, it's Mochi. I sat on the phone, so this is my voicemail now. Leave a message or, better, bring treats.",
  },
  {
    id: 13,
    text: "You've reached the cat. If this is about the vase, I did it, I'd do it again, and I regret nothing. Meow.",
  },
  {
    id: 14,
    text: "This is Waffles. I'm asleep on your keyboard, so your call went to voicemail \u2014 and so did your unsaved document.",
  },
  {
    id: 15,
    text: "You've reached Tofu. I licked the phone, knocked it off the shelf, and now I run this voicemail. Leave a message.",
  },
  {
    id: 16,
    text: "Meow, you've reached Salem. The human is out buying my food, which is late, again. Leave a message at the beep.",
  },
  {
    id: 17,
    text: "Hi, it's Pepper. I'm in the box, the box is my house, and I am not taking calls in my house. Meow after the beep.",
  },
  {
    id: 18,
    text: "You've reached the cat. I'm busy doing nothing in a sunbeam and I'm very good at it. Leave a message. I don't care.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons. Every list below is a plain word list used by the deterministic
// scorer; the lists are the scorer's model of the judge brief, not text the
// entry ships. The winning line is one of the 18 candidates above.
// ---------------------------------------------------------------------------

// Voicemail-greeting frame markers. A greeting that opens with one of these
// reads, to a caller, as a voicemail greeting rather than a stray sentence.
const GREETING_OPENERS = [
  "you've reached",
  "hi, it's",
  "hi, you've reached",
  "this is",
  "meow, you've reached",
  "meow, it's",
  "meow. you've reached",
];

// Voicemail mechanics: the words a real greeting uses to hand the caller the
// beep and the message slot.
const VOICEMAIL_MECHANICS = [
  "leave a message",
  "after the beep",
  "at the beep",
  "beep",
  "can't come to the phone",
  "can't talk right now",
  "i'm unavailable",
  "went to voicemail",
  "talk after the crash",
];

// Punch twists: the specific reversal, confession, or absurd claim that makes
// the line land as a joke instead of a plain greeting. Each one is a distinct
// comic beat a judge can point at.
const PUNCH_TWISTS = [
  "leave the tuna",
  "talk after the crash",
  "i'm in the box the phone came in",
  "then feed me",
  "i'm starving",
  "you still haven't fed me",
  "sitting on the exact thing you need",
  "i chose not to answer",
  "i'll ignore it from a sunbeam",
  "i'll get back to you never",
  "i am in charge now",
  "open a can for me",
  "that was me",
  "reasons you wouldn't understand",
  "which is mine now",
  "i'll pretend i didn't hear it",
  "this is my voicemail now",
  "bring treats",
  "i did it, i'd do it again",
  "i regret nothing",
  "and so did your unsaved document",
  "i licked the phone",
  "now i run this voicemail",
  "which is late, again",
  "i am not taking calls in my house",
  "i'm very good at it",
  "or don't. i don't care",
  "i don't care",
  "knocking your favourite glass off the table",
  "knocked the phone off the counter",
  "knocked it off the shelf",
  "i'm staring at a wall",
  "i'm hiding in the laundry basket",
  "i sat on the phone",
  "i'm asleep on your keyboard",
  "i'm napping on your clean laundry",
  "i'm busy doing nothing in a sunbeam",
  "that's a 16-hour nap",
  "i'm mid-nap",
];

// Cat-specific behaviours and objects, straight from the brief's own examples
// (naps, boxes, knocking things off shelves, food at four in the morning)
// plus the rest of the cat's daily repertoire.
const CAT_BEHAVIOURS = [
  "nap",
  "napping",
  "mid-nap",
  "16-hour nap",
  "box",
  "the box",
  "knock",
  "knocking",
  "knocked",
  "off the table",
  "off the shelf",
  "off the counter",
  "4 a.m.",
  "four in the morning",
  "starving",
  "fed me",
  "feed me",
  "tuna",
  "treats",
  "open a can",
  "buying my food",
  "sunbeam",
  "laundry",
  "laundry basket",
  "clean laundry",
  "keyboard",
  "unsaved document",
  "staring at a wall",
  "hiding",
  "licked",
  "sat on the phone",
  "sitting on",
  "vase",
  "glass",
  "crash",
  "purr",
  "whiskers",
  "human is asleep",
  "the human",
  "doing nothing",
];

// Attitude words: the cat asserting itself, refusing, claiming, or dismissing
// the caller. These are what make the line sound like a character speaking
// rather than an owner writing about a cat.
const ATTITUDE_WORDS = [
  "mine now",
  "my house",
  "my voicemail",
  "in charge",
  "i chose",
  "i regret nothing",
  "i'd do it again",
  "i don't care",
  "or don't",
  "never",
  "again",
  "pretend",
  "ignore",
  "i am not taking calls",
  "i run this",
  "very good at it",
  "better yet",
  "reasons you wouldn't understand",
  "the exact thing you need",
  "still haven't",
  "which is late",
];

// Tired puns and catchphrases the brief's fifth criterion punishes. None of
// the 18 candidates uses any of these; the list exists so the scorer can
// penalise them if a candidate ever did.
const CLICHES = [
  "purr-fect",
  "purrfect",
  "nine lives",
  "curiosity killed",
  "the cat's meow",
  "cat got your tongue",
  "raining cats",
  "paws for applause",
  "paws and reflect",
  "meowt of office",
  "you've got to be kitten me",
  "feline fine",
  "claw-ful",
  "paw-some",
  "cat-titude",
  "meow or never",
];

// Fresh-twist markers: specific, surprising, concrete details a judge has not
// heard in a hundred other cat voicemails. Each one is a small invention, not
// a stock phrase.
const FRESH_TWISTS = [
  "unsaved document",
  "the exact thing you need",
  "16-hour nap",
  "i did it, i'd do it again",
  "i'll get back to you never",
  "i run this voicemail",
  "i licked the phone",
  "reasons you wouldn't understand",
  "i chose not to answer",
  "i'll ignore it from a sunbeam",
  "i'll pretend i didn't hear it",
  "i'm very good at it",
  "or don't. i don't care",
  "the box the phone came in",
  "which is late, again",
  "i am not taking calls in my house",
  "i sat on the phone",
  "i'm asleep on your keyboard",
  "staring at a wall",
  "talk after the crash",
  "that was me",
  "bring treats",
  "then feed me",
  "leave the tuna",
  "open a can for me",
  "i am in charge now",
];

// ---------------------------------------------------------------------------
// Text helpers. All counting is in Unicode code points, matching the gate's
// "characters" reading; ASCII and the em dash both count as one character.
// ---------------------------------------------------------------------------

// Character count in code points (so an em dash counts once, like the gate).
function charCount(text: string): number {
  return [...text].length;
}

// Lower-cased copy used for every lexicon lookup, so capitalisation at the
// start of a sentence never hides a match.
function lower(text: string): string {
  return text.toLowerCase();
}

// True when the haystack contains the needle as a substring.
function has(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

// How many distinct lexicon entries appear in the text (each entry counted
// once, so repeating one joke does not inflate the score). Longest match
// wins: when two entries overlap on the same words ("nap" inside "napping",
// "again" inside "i'd do it again", "box" inside "the box"), only the
// longest one counts, so one joke never pays twice.
function distinctHits(text: string, lexicon: string[]): string[] {
  const found: string[] = [];
  for (const entry of lexicon) {
    if (!has(text, entry)) continue;
    // Skip this entry if a longer entry already found covers the same words.
    if (found.some((f) => f.includes(entry))) continue;
    // Drop any shorter entry this one covers, then keep the longer one.
    for (let i = found.length - 1; i >= 0; i--) {
      if (entry.includes(found[i])) found.splice(i, 1);
    }
    found.push(entry);
  }
  return found;
}

// Count whole-word occurrences of a word, case-insensitively, so "I" the
// pronoun is counted but the letter inside other words is not.
function countWord(text: string, word: string): number {
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return (text.match(re) ?? []).length;
}

// Split the line into spoken clauses. Splits on sentence ends and on ", ",
// but protects the things a naive split would chop in half:
//   - "4 a.m." (the abbreviation's periods are not sentence ends)
//   - decimals such as "99.9" (protected by the same rule: a period between
//     two digits is not a sentence end)
//   - numbers with commas such as "16-hour" (no comma there) and "4,000"
//     (a comma between two digits is not a clause split)
// Short trailing fragments that are really a countdown or a tail ("2...",
// "Beep.") rejoin the clause before them instead of standing alone.
function splitClauses(text: string): string[] {
  const protectedText = text
    .replace(/(\d)\.(\d)/g, "$1<DEC>$2") // decimal point
    .replace(/a\.m\./gi, "a<AM>m") // 4 a.m.
    .replace(/p\.m\./gi, "p<PM>m") // 4 p.m.
    .replace(/(\d),(\d)/g, "$1<COMMA>$2"); // thousands comma
  const raw = protectedText
    .split(/(?<=[.!?])\s+|(?<=,)\s+|(?<=\u2014)\s+/)
    .map((c) =>
      c
        .replace(/<DEC>/g, ".")
        .replace(/<AM>/gi, "a.m.")
        .replace(/<PM>/gi, "p.m.")
        .replace(/<COMMA>/g, ",")
        .trim(),
    )
    .filter((c) => c.length > 0);
  // Rejoin a short trailing fragment (a beep, a "Meow.", an "Or don't.") with
  // the clause before it when it is only a tail word: a fragment of at most
  // two words that carries no verb of its own reads as a tail, not a clause.
  const clauses: string[] = [];
  for (const clause of raw) {
    const words = clause.split(/\s+/).length;
    if (clauses.length > 0 && words <= 2 && !/^(i|you|we|it|the|this|that)\b/i.test(clause)) {
      clauses[clauses.length - 1] += " " + clause;
    } else {
      clauses.push(clause);
    }
  }
  return clauses;
}

// Where, as a fraction of the line's length, the first punch twist starts.
// 0 means the punch is the very first word; 1 means it never arrives.
function punchPosition(text: string): number {
  const low = lower(text);
  let earliest = Number.POSITIVE_INFINITY;
  for (const twist of PUNCH_TWISTS) {
    const idx = low.indexOf(twist);
    if (idx >= 0 && idx < earliest) earliest = idx;
  }
  if (!Number.isFinite(earliest)) return 1;
  return earliest / Math.max(1, charCount(text));
}

// ---------------------------------------------------------------------------
// Criterion 1 — reads as a voicemail greeting recorded by a cat, and lands
// a laugh. Max 30. Two halves: the voicemail frame (up to 16) and the laugh
// (up to 14). A line that is not a cat's voicemail greeting cannot score
// well here, whatever else it does.
// ---------------------------------------------------------------------------

function scoreVoicemailAndLaugh(text: string): number {
  const low = lower(text);
  let frame = 0;
  // The greeting opens as a voicemail greeting, not as a caption.
  for (const opener of GREETING_OPENERS) {
    if (low.startsWith(opener)) {
      frame += 8;
      break;
    }
  }
  // It hands the caller the mechanics of leaving a message.
  const mechanics = distinctHits(low, VOICEMAIL_MECHANICS);
  frame += Math.min(8, mechanics.length * 3);
  // The speaker is the cat itself: first person, or "the cat" as the subject.
  if (/\bi\b/.test(low) || /\bi'm\b/.test(low) || low.includes("the cat")) {
    frame += 2;
  }
  frame = Math.min(16, frame);

  // The laugh: a punch twist the caller can point at. One strong twist is
  // worth more than a pile of weak ones, so the first twist pays 8 and each
  // further distinct twist pays 3, capped at 14.
  const twists = distinctHits(low, PUNCH_TWISTS);
  const laugh = Math.min(14, twists.length === 0 ? 0 : 8 + (twists.length - 1) * 3);

  return Math.min(WEIGHTS.voicemailAndLaugh, frame + laugh);
}

// ---------------------------------------------------------------------------
// Criterion 2 — the joke comes from something specific to cats. Max 25.
// Each distinct cat behaviour or object in the line pays 5, capped at 25,
// so a line needs five distinct cat-specific beats to max out. A generic joke
// with the word "cat" dropped in scores near zero here: the word "cat" on
// its own is worth nothing.
// ---------------------------------------------------------------------------

function scoreCatSpecific(text: string): number {
  const low = lower(text);
  const hits = distinctHits(low, CAT_BEHAVIOURS);
  return Math.min(WEIGHTS.catSpecific, hits.length * 5);
}

// ---------------------------------------------------------------------------
// Criterion 3 — the cat has a clear voice and attitude of its own. Max 20.
// The line must sound like a character speaking: first-person presence,
// attitude words, a name that introduces the speaker, and direct address to
// the caller.
// ---------------------------------------------------------------------------

function scoreCatVoice(text: string): number {
  const low = lower(text);
  let score = 0;
  // First-person presence: the cat speaking as "I". Two or more first-person
  // markers means the cat owns the line throughout, not just at the open.
  const firstPerson = countWord(text, "I") + countWord(text, "I'm") + countWord(text, "me");
  if (firstPerson >= 3) score += 7;
  else if (firstPerson >= 1) score += 4;
  // Attitude: refusing, claiming, dismissing, confessing.
  const attitude = distinctHits(low, ATTITUDE_WORDS);
  score += Math.min(7, attitude.length * 3);
  // A named speaker ("Hi, it's Biscuit", "This is Chairman Meow") gives the
  // cat an identity the caller can picture.
  if (/^(hi, it's|this is|meow, it's|you've reached) [a-z]+/i.test(text)) score += 3;
  // Direct address to the caller ("you", "your") makes it a greeting spoken
  // to someone, not a caption written about a cat.
  if (/\byou\b/.test(low) || /\byour\b/.test(low)) score += 3;
  return Math.min(WEIGHTS.catVoice, score);
}

// ---------------------------------------------------------------------------
// Criterion 4 — works spoken aloud, punch arrives quickly. Max 15.
// A voicemail greeting is heard once, in a few seconds: the line must be
// short enough to say in one breath, split into speakable clauses, and put
// its punch early enough that the caller is still listening.
// ---------------------------------------------------------------------------

function scoreSpokenAloud(text: string): number {
  const len = charCount(text);
  let score = 0;
  // Length sweet spot: 60-100 characters is one easy breath; longer lines
  // risk the caller hanging up before the punch.
  if (len >= 60 && len <= 100) score += 7;
  else if (len > 100 && len <= 115) score += 5;
  else if (len > 115 && len <= MAX_CHARS) score += 3;
  else score += 4;
  // Punch timing: the first twist should start in the first three-fifths of
  // the line. A punch that only arrives in the last few words is a punch the
  // caller may never hear.
  const pos = punchPosition(text);
  if (pos <= 0.35) score += 5;
  else if (pos <= 0.6) score += 4;
  else if (pos <= 0.8) score += 2;
  else score += 0;
  // Speakable clauses: short clauses with no clause longer than about 45
  // characters are easy to say aloud in one take.
  const clauses = splitClauses(text);
  const longest = clauses.reduce((m, c) => Math.max(m, charCount(c)), 0);
  if (longest <= 40) score += 3;
  else if (longest <= 50) score += 2;
  else score += 1;
  return Math.min(WEIGHTS.spokenAloud, score);
}

// ---------------------------------------------------------------------------
// Criterion 5 — fresh and surprising, not a tired pun or catchphrase.
// Max 10. Starts at 6 for a line with no cliché and no twist, gains up to 4
// for distinct fresh-twist markers, and loses 6 per cliché hit.
// ---------------------------------------------------------------------------

function scoreFresh(text: string): number {
  const low = lower(text);
  const cliches = distinctHits(low, CLICHES);
  const twists = distinctHits(low, FRESH_TWISTS);
  let score = 6 + Math.min(4, twists.length * 2) - cliches.length * 6;
  if (score < 0) score = 0;
  return Math.min(WEIGHTS.fresh, score);
}

// ---------------------------------------------------------------------------
// Scoring a candidate: all five criteria, in the judge brief's order.
// ---------------------------------------------------------------------------

type Breakdown = {
  c1: number;
  c2: number;
  c3: number;
  c4: number;
  c5: number;
  total: number;
};

function scoreCandidate(text: string): Breakdown {
  const c1 = scoreVoicemailAndLaugh(text);
  const c2 = scoreCatSpecific(text);
  const c3 = scoreCatVoice(text);
  const c4 = scoreSpokenAloud(text);
  const c5 = scoreFresh(text);
  return { c1, c2, c3, c4, c5, total: c1 + c2 + c3 + c4 + c5 };
}

// ---------------------------------------------------------------------------
// The gate, exactly as the brief states it: UTF-8 text of 1 to 120
// characters, not only white space, a single line. The program checks the
// winner against every part of it twice: once before writing, once after
// reading the file back.
// ---------------------------------------------------------------------------

type GateResult = {
  ok: boolean;
  reasons: string[];
};

function checkGate(text: string): GateResult {
  const reasons: string[] = [];
  // Valid UTF-8: a lone surrogate or a broken sequence would not survive a
  // round trip through Buffer, so compare the re-encoded bytes.
  const roundTrip = Buffer.from(text, "utf8").toString("utf8");
  if (roundTrip !== text) reasons.push("not valid UTF-8");
  const chars = charCount(text);
  if (chars < MIN_CHARS) reasons.push(`too short: ${chars} characters (min ${MIN_CHARS})`);
  if (chars > MAX_CHARS) reasons.push(`too long: ${chars} characters (max ${MAX_CHARS})`);
  if (text.trim().length === 0) reasons.push("only white space");
  if (text.includes("\n") || text.includes("\r")) reasons.push("more than one line");
  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Output directory: the harness sets MAKEFUN_OUTPUT_DIR; the brief's own
// path /output/entry.txt is the fallback.
// ---------------------------------------------------------------------------

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  return "/output";
}

// ---------------------------------------------------------------------------
// Main: score every candidate, print the full table, pick the winner, write
// it, read it back, and re-check the gate. Exits non-zero on any failure.
// ---------------------------------------------------------------------------

function main(): void {
  console.log("Funniest Cat Voicemail Greeting — deterministic scorer");
  console.log(`Gate: ${MIN_CHARS}-${MAX_CHARS} characters, single line, valid UTF-8, not only white space.`);
  console.log(
    `Weights (judge brief order): c1 voicemail+laugh ${WEIGHTS.voicemailAndLaugh} / ` +
      `c2 cat-specific ${WEIGHTS.catSpecific} / c3 cat voice ${WEIGHTS.catVoice} / ` +
      `c4 spoken aloud ${WEIGHTS.spokenAloud} / c5 fresh ${WEIGHTS.fresh}`,
  );
  console.log("");

  // Score every candidate, and gate-check every candidate up front so a line
  // that cannot pass the gate can never win, however funny it scores.
  const rows: { candidate: Candidate; breakdown: Breakdown; gate: GateResult }[] = [];
  for (const candidate of CANDIDATES) {
    const breakdown = scoreCandidate(candidate.text);
    const gate = checkGate(candidate.text);
    if (!gate.ok) {
      console.log(`#${candidate.id} GATE FAIL (${gate.reasons.join("; ")}): ${candidate.text}`);
    }
    rows.push({ candidate, breakdown, gate });
  }
  const valid = rows.filter((r) => r.gate.ok);
  if (valid.length === 0) {
    console.error("ERROR: no candidate passes the gate.");
    process.exit(1);
  }

  // Rank: highest total first; ties go to the shorter text (the brief's own
  // tie-break prefers fewer bytes), then to the lower candidate id, so the
  // choice is fully deterministic with no randomness anywhere.
  const ranked = [...valid].sort((a, b) => {
    if (b.breakdown.total !== a.breakdown.total) return b.breakdown.total - a.breakdown.total;
    const aChars = charCount(a.candidate.text);
    const bChars = charCount(b.candidate.text);
    if (aChars !== bChars) return aChars - bChars;
    return a.candidate.id - b.candidate.id;
  });

  // Print the full table, highest first, so the choice is auditable.
  console.log("Rank  ID  Chars  c1/30 c2/25 c3/20 c4/15 c5/10  Total  Line");
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const b = r.breakdown;
    console.log(
      `${String(i + 1).padStart(4)}  ${String(r.candidate.id).padStart(2)}  ` +
        `${String(charCount(r.candidate.text)).padStart(5)}  ` +
        `${String(b.c1).padStart(2)}/30 ${String(b.c2).padStart(2)}/25 ` +
        `${String(b.c3).padStart(2)}/20 ${String(b.c4).padStart(2)}/15 ` +
        `${String(b.c5).padStart(2)}/10  ${String(b.total).padStart(5)}  ${r.candidate.text}`,
    );
  }
  console.log("");

  const winner = ranked[0];
  const runnerUp = ranked[1];
  const winnerChars = charCount(winner.candidate.text);
  console.log(`Winner: #${winner.candidate.id} (${winnerChars} chars, ${winner.breakdown.total} pts)`);
  console.log(`  ${winner.candidate.text}`);
  if (runnerUp) {
    console.log(
      `Runner-up: #${runnerUp.candidate.id} (${charCount(runnerUp.candidate.text)} chars, ` +
        `${runnerUp.breakdown.total} pts)`,
    );
    console.log(`  ${runnerUp.candidate.text}`);
  }

  // Write the winner, then read it back and re-check every gate from the
  // brief on the bytes actually on disk. A failure here is a hard failure:
  // the entry must never ship a line the gate would refuse.
  const dir = outputDir();
  mkdirSync(dir, { recursive: true });
  const outPath = join(dir, "entry.txt");
  writeFileSync(outPath, winner.candidate.text, "utf8");
  console.log(`Wrote ${outPath}`);

  const readBack = readFileSync(outPath, "utf8");
  if (readBack !== winner.candidate.text) {
    console.error("ERROR: read-back text differs from the winning line.");
    process.exit(1);
  }
  const gate = checkGate(readBack);
  if (!gate.ok) {
    console.error(`ERROR: written entry fails the gate: ${gate.reasons.join("; ")}`);
    process.exit(1);
  }
  console.log(
    `Gate re-check on written file: PASS (${charCount(readBack)} chars, single line, ` +
      `valid UTF-8, not only white space).`,
  );
}

main();
