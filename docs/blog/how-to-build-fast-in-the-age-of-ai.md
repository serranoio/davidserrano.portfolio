---
slug: how-to-build-fast-in-the-age-of-ai
title: How To Build From 0-1 in the age of AI
date: 11/13/26
tags: [spiritual, tech]
---



_Intentionally talking in jargon so that you know it's not written by AI_


* It's a damn marathon!
* Glossary
* Guardrails
* Fully Runnable Local CI


## Glossary

> _Maintaining a glossary prolly has been the most underrated part of my AI workflow._

A glossary, taxonomy, or just simply put documentation, allows you to develop & maintain a running mental model of your codebase. 

A good way to put AI development today is that you should feel like youre always onboarding to your **own** repo LOL. Pre AI, remember that feeling where you joined a new company, a new team, or simply read a new repo on github, your team gave you time to _feel_ the codebase. Today, you only have the chance to understand the high level systems. You must always start high level.

Off the top of my head, I cannot remember everything in The House of Arcana. My dad cannot even remember my birthday, how tf do you expect me to remember something I generated yesterday?


Your codebase is going to move so fast, with layers upon layers of systems. It took weeks at your work to develop a mental model of systems,


:::tip
 Minimize points of execution in your codebase. Have one lint command that connects all lint commands. Have one deployment command that handles deployment of every part of your infra. Have one testing command. This is because youre going to add x package tomorrow with different linting, testing, etc. It gets very messy fast! And then because you're moving so fast, you don't have time to maintain it. So the solution is to hook it up back into the system.
:::


##

## Prompting





## Guardrails

* Before taking your system to production, you have to make a rule that states that nothing should be backwards compatible. Do not make compromises for out of date schemas either. AI defaults to adhering to the system.

* AI loves to make one off tooling. Make a guardrail which states that anything that can be reused can and should be stated. Example: I have a UI screenshot CLI that the agent uses & adds features onto.

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
Arcana should feel beautiful with very little on it: refined, sensual, precise, and alive. Expose the data; let proportion, typography, contrast, and interaction carry the beauty. Every visible element earns its place through function and receives deliberate aesthetic treatment.

Thin Precision:

Expose the Essential: remove enclosing boxes, repeated labels, and permanent controls where they compete with the selected market, chart, or key readings.
Deliberate Proportion: generous space around important content, tightly composed controls, and clear differences in type scale and weight.
Consequential Detail: spacing, alignment, edges, and accents improve readability, hierarchy, state, or flow. Restraint still has presence.
Surface Hierarchy: deep graphite, subtle tonal separation, precise edges, and depth that explains layering.
Tactile Response: hover, focus, selection, and dragging respond immediately. Motion expresses interaction or real system changes and respects reduced motion.
Concentrated Color: attention has a destination. Selection, chart data, and operational status remain distinguishable.
Calm Power: capable, composed, and worth inspecting. A populated screen invites attention and rewards it with clarity.
Converged Truth: beauty is discovered, not manufactured. Like a rose's spiral, form follows the simplest rule that fits the evidence; nothing is shown that the system did not observe.
```

## Fully Runnable Local CI


## Fuzz the Shit Out of your Codebase



## It's a Damn Marathon!

I am not the brightest student. I could not build you the most highly performant systems. I was not good at leetcode. But AI bridges the gap 