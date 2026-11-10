---
name: scope-a-feature
description: Scope a new feature before building it. Use whenever the user says they want to add, build, or create a feature — trigger phrases include "I want to add a feature", "let's add", "can we build", "I'd like a new feature". Drives clarifying questions, idea suggestions, and a plan the user must approve before any code is written.
---

# Scope a Feature

When the user wants to add a feature, do NOT start coding. Scope it first.

## Steps

1. **Ask sharp clarifying questions.** Probe the feature and its edge cases: who uses it, expected inputs/outputs, states (empty/loading/error), limits, permissions, data/persistence, failure and concurrency cases, and how it fits existing code. Ask enough to remove real ambiguity — skip questions whose answer is obvious from the codebase.
2. **Suggest more.** Recommend related features or extensions worth building on top of the idea, plus a few fresh ideas the user may not have considered. Keep each to a line.
3. **Wait for answers.** Stop and let the user respond. Do not proceed on assumptions.
4. **Restate the plan** in a single paragraph covering scope, key decisions, and what's explicitly out of scope.
5. **Get approval.** Only after the user approves the paragraph, build the feature.

## Rules

- No implementation code before approval.
- Prefer the `AskUserQuestion` tool for the clarifying round when options are discrete; use plain questions otherwise.
- If the user says "just build it" / skips scoping, confirm once, then proceed.
