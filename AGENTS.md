# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

A test DApp for minting an arbitrary ERC20 token from any connected wallet on any EVM network. The user enters a network, an ERC20 contract address, an amount, and a recipient, then calls the token's `mint` function. UI follows `screenshot.png` at the repo root: a centered "Mint Tokens" card with Network select → Token address → Amount → Recipient → primary "Mint Tokens" button, plus a top bar with "Connect / Wrong network" on the right (RainbowKit).

The styling baseline is the existing Vite scaffold's CSS variables in `src/index.css` (`--accent`, `--accent-bg`, `--border`, `--code-bg`, light/dark via `prefers-color-scheme`) and the button/card patterns in `src/App.css`. Reuse these tokens instead of introducing a CSS framework.

## Current state

Fresh Vite scaffold — `src/App.tsx` is still the default React+Vite splash page. None of the DApp dependencies (RainbowKit, wagmi, viem) are installed yet, and the toolchain swap described below (Biome, Lefthook, pnpm) has not happened. Treat the scaffold as the starting point, not the target.

## Commands

Package manager is **pnpm** (lockfile is `pnpm-lock.yaml`).

- `pnpm dev` — Vite dev server with HMR
- `pnpm build` — `tsc -b` (project references) then `vite build`. The TS step uses `tsconfig.app.json` for `src/` and `tsconfig.node.json` for config files; both must pass.
- `pnpm lint` — ESLint (will move to Biome — see below)
- `pnpm preview` — preview the production build

## Toolchain direction

The project intends to replace ESLint with **Biome** (single tool for lint + format) and add **Lefthook** for git hooks. When making that switch:
- Remove `eslint`, `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, `globals`, and `eslint.config.js`.
- Replace `package.json` `"lint"` script with `biome check .` (or `biome ci .` for CI), and add `"format": "biome format --write ."`.
- Lefthook config lives in `lefthook.yml`; pre-commit should run `biome check --staged --no-errors-on-unmatched` and `tsc -b --noEmit`.

## Architecture notes

- **React 19** + **TypeScript 6** + **Vite 8**. `tsconfig.app.json` enables `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`/`noUnusedParameters` — keep imports type-only where appropriate (`import type { ... }`) and don't leave unused symbols.
- **Web3 stack** (to be added): wagmi v2 + viem + RainbowKit. Wrap the app in `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider` in `src/main.tsx`. Configure chains via wagmi's `createConfig` with public RPC transports by default; expose chain selection in the Network dropdown rather than hard-coding a single chain.
- **Mint call**: most ERC20s expose `mint(address to, uint256 amount)` but the signature/access control varies per token. Use viem's `parseAbi(['function mint(address,uint256)'])` + `useWriteContract` from wagmi, surface revert reasons from the simulated call (`useSimulateContract`) so the user sees why a non-mintable token fails. Convert the human amount to base units with `parseUnits(amount, decimals)` after reading `decimals()` from the token (`useReadContract`).
- **"Wrong network"** state in the header (per `screenshot.png`) maps to wagmi's `useAccount().chain` vs. the chain selected in the form — show the switch-network action via RainbowKit's modal.
- **Styling**: stay in plain CSS modules / global CSS using the existing variables. Don't pull in Tailwind / shadcn / MUI — the scaffold's hand-rolled tokens are the design system.

## Conventions

- 2-space indent, single quotes, no semicolons (matches existing `src/` files and will be the Biome default once configured).
- Keep components small and colocated; this is a single-page demo, no router needed.
- Prefer viem primitives directly over custom abstraction layers — the codebase should stay small.
