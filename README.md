# Sangam

**A voice agent that talks like you.**

Sangam is a code-switching intelligence layer for voice agents. It measures how a person mixes Hindi and English, and keeps an agent's replies in the same style. It is built on Gnani's speech APIs (Prisma and Timbre) for the Great Indian AI Internship Challenge.

Status: planning done, build in progress. Nothing here is a finished product yet.

## Start here

| Doc                                          | What it covers                                               |
| -------------------------------------------- | ------------------------------------------------------------ |
| [docs/PLAN.md](docs/PLAN.md)                 | Goals, scope tiers, risks, decisions, Day-1 checklist        |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repo layout, data flow, tagger and metrics, realtime service |
| [docs/API.md](docs/API.md)                   | `profile`, `guide`, `check` endpoint drafts                  |
| [docs/EVAL.md](docs/EVAL.md)                 | Evaluation plan and honesty rules                            |
| [docs/TASKS.md](docs/TASKS.md)               | Day-by-day task list                                         |
| [docs/CONTENT.md](docs/CONTENT.md)           | Demo storyboard, posts, write-up, interview prep             |
| [docs/GNANI_NOTES.md](docs/GNANI_NOTES.md)   | What we verified about Gnani's APIs (to fill in)             |

## Rules

- Keys live in `.env` only. Never commit or paste them.
- Synthetic data, or volunteer data with consent. No stored audio.
- The app says clearly what is mocked.

## Prior work

Accommodation in code-switched human-machine dialogue: Parekh et al., "Understanding Linguistic Accommodation in Code-Switched Human-Machine Dialogues", CoNLL 2020. Code-Mixing Index: Das and Gambäck (2014).
