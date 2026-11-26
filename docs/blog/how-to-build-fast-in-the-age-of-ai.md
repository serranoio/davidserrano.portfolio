---
published: true
slug: how-to-build-fast-in-the-age-of-ai
title: Assembling The Slopcannon: How To Build From 0-1 in the age of AI
date: 11/13/26
tags: [spiritual, tech]
---

_Intentionally talking in jargon so that you know it's not written by AI_

* It's a damn marathon!
* Glossary
* Prompting
* Guardrails
* Fully Runnable Local CI

## Step 0. Take 2 steps back to plan to jump a million steps forward

No coding yet. The development strategy matters more than coding features at the beginning. Examples:

* If you plan on using worktrees or git cloning, make sure your agents know about this. Build deterministic tooling around it, aka scripts so that this process is fast.
* If you have a database that needs to be tested, make sure you have a test harness that sets up test databases and cleans them up afterwards, and that worktree databases are hooked up into worktree databases and don't pollute main.

## Glossary

> _Maintaining a glossary prolly has been the most underrated part of my AI workflow._

A glossary, taxonomy, or just simply put documentation, allows you to develop & maintain a running mental model of your codebase.

A good way to put AI development today is that you should feel like youre always onboarding to your **own** repo LOL. Pre AI, remember that feeling where you joined a new company, a new team, or simply read a new repo on github, your team gave you time to _feel_ the codebase. Today, you only have the chance to understand the high level systems. 

Off the top of my head, I cannot remember everything in The House of Arcana. My dad cannot even remember my birthday, how tf do you expect me to remember something I generated yesterday? Another way to put this is that facts that we learned in school stuck with us because we constantly practiced them. But now, we generate new architectures in 10 minutes and are expected to understand the behavior. NOPE. Don't even try teaching yourself. Have the agent teach you.

Your codebase is going to move so fast with layers upon layers of systems. It took weeks at your work to develop a mental model of systems when you onboarded onto a new repo, how do you expect yourself to remember a constantly moving codebase?

**Minimizing the amount of context required to develop your system e2e** has to be a fire insight I have derived from this. This materializes as minimizing the points of execution in your codebase. Have one deployment command that handles deployment of every part of your infra. Have one testing command that wires all testing commands together: it runs unit tests, functional tests, e2e tests, smoke tests. This is because youre going to add x package tomorrow with different linting, testing, requirements etc. It gets very messy fast! And then because you're moving so fast, you don't have time to maintain it. So the solution is to hook it up back into the system. If you have some dangling mechanism, it will die in the SLOP CANNON.

> I would read my glossary at the gym every morning to ensure it was coherent and it made sense. I don't aim for remembering my system like it's a quiz, instead I aim for that enjoyment that you get where when it makes sense, you feel satisfcation.

## Prompting

My prompting technique is described in [The Art of Skill Building With AI](./the-art-of-skill-building-with-ai.md), and really, optimizing skill building is just optimizing developing a mental model and putting that down to muscle memory.

> As a dancer, I can literally FEEL the body movements that I train as I write this right now. It is a skill that I have put down into muscle memory, literally lol.

The biggest insight here without going to the other article is **don't just make an implementation plan, make a coherent actions** Your implementation plan describes the code changes required for your codebase. Your coherent actions decides how that is executed. In the following example, the agent has to investigate in step 1, your mostly resolved plan goes in step 2. The agent then coordinates the MR e2e until it's done.

```
## Coherent Actions

1. **Resolve the unknown.** Read the spec or measure.
2. **If the answer is A,** build the simple version. Apply steps 4-7
3. **If the answer is B,** come back with a new proposal before coding.
4. **Make a worktree.**
5. **Build it.**
6. **Open the PR**
7. **Poll pipelines until green**

```


## Guardrails

Guardrails make sure that your agents don't fall of the rails. Here are a couple of guardrails:
* Before taking your system to production, you have to make a rule that states that nothing should be backwards compatible. Do not make compromises for out of date schemas either. AI defaults to adhering to the system. You will acquire tech debt fast if you don't do this.
* AI loves to make one off tooling. Make a guardrail which states that anything that can be reused can and should be stated. Example: I have a UI screenshot CLI that the agent uses so it doesnt make its own every time. If it is supposed to be a one off script, put it in high level `/scripts`

### Make a design philosophy.

Of course having a design system with itemized tokens is mandatory. But a design philosphy is next level up. Firstly, here is the design system:

```
## STYLE-GR-05: Design System Tokens Are The Visual Source Of Truth

**Rule**: UI visual values must flow through the design-system token API.
Color, type, spacing, radius, shadow, glass, motion, density, flow, focus,
z-index, and control values belong in the owning design-system token module.
Component styles consume token references and CSS custom properties instead of
inventing local visual values.

**Review fails if**:

- component styles introduce raw visual literals that belong in tokens
- multiple components define competing values for the same visual concept
- dimensional visual values use `px` instead of `rem`
- token values do not expose CSS custom properties
- component styles consume token values without `var(--arcana-*)` references
```

```
// Example CSS property
 [data-home-tagline] {
      margin: 0;
      color: var(--arcana-color-text-muted);
      font-size: var(--arcana-type-size-body);
      letter-spacing: var(--arcana-type-letter-spacing-label);
      animation: home-rise var(--arcana-flow-home-bloom) var(--arcana-motion-easing) var(--arcana-motion-slow) both;
    }
```

Here is the design philosphy. What is important is that it gives your agent that initial direction.
```
Arcana is derived from the golden ratio. A rose does not decide to be beautiful:
each seed turns the golden angle (≈137.5°) from the last because that
arrangement overlaps least, and the spiral is what follows. Arcana is designed
the same way. Beauty is discovered, never applied: it is what remains when every
element sits where the evidence puts it. The result should feel refined,
sensual, precise, and alive, with very little on the screen.

The ratio is literal. Spacing steps through the Fibonacci sequence (1, 2, 3, 5,
8, 13, 21, 34, 55), whose neighbours converge on it, and the Arcana Rose turns
by the golden angle.

```

## Fully Runnable Local CI


IMO, one of the biggest software engineering mistakes done (even pre AI) has to be coupling our CI gates to Gitlab Pipelines or Github Actions and not being able to run them locally. I get it, sometimes something requires a token and has to be ran in a protected environment. Please make that layer as thin as possible and move all your testing layers to be ran locally. In general, all tests should be made as low as possible in the stack. Before you tell me that the test plan comes after and we don't have time to do these 'fancy development things', stop it lol. Make your test harness first, and trust me your development will be ten-fold faster. Your verification speed would speed up from pipeline time to local time. Sheesh. 

> _The test plan should not be made into separate tickets, they should be folded into each feature, planned from the beginning!!_

```
Unit tests <- functional tests <- integration tests <- e2e tests <- scale tests <- performance tests <- deployment tests (play | stage | prod)
```

## It's a Damn Marathon!

More than ever in the history of humankind, AI has been elevating the playing field for everyone, comparatively to every technology that has elevated those with lesser opportunities. This is a damn blessing and I could never be more grateful :). Embrace the marathon bro. You are never going to get it right the first time. If want instant pleasure go do a bunch of drugs. No, stop don't actually do that. But I want you to let go to enjoy the journey in its entirety: the highs, the lows and everything in between. Not only that, but please let go from only liking things that give you easy pleasure as [Passion is forged](./the-forge.md)
