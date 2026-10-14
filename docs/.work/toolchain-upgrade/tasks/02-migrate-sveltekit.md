# 02: Run the localized static PWA on SvelteKit 3

**What to build:** A contributor can develop, build, and verify Yard Bridge on stable SvelteKit 3, and players retain working language navigation and offline shell reloads. Use the official migrator first, finish its remaining compatibility fixes, and align CI and contributor guidance with the verified framework workflow.

**Blocked by:** 01 (Run the project on Bun 1.4.3). Its verified baseline isolates framework migration failures from the Bun upgrade.

**Status:** ready-for-agent

Spec: [Toolchain upgrade](../spec.md)

- [ ] Check the latest Kit 2 release and deprecation warnings, satisfy documented prerequisites, and run the official SvelteKit 3 migrator before manual framework changes.
- [ ] Record the migrator version, command, findings, generated TODOs, and their resolution. If prerequisites block execution, record the minimal repair and retry.
- [ ] Stable Kit 3 and compatible framework dependencies resolve without hidden peer conflicts; a clean frozen installation succeeds.
- [ ] Library subpath imports, component-generator aliases, environment imports, hook types, and framework TypeScript settings work with Kit 3.
- [ ] Framework synchronization and Paraglide generation work from a clean checkout without a prior dev or build run.
- [ ] The service worker uses supported APIs, resolves manifest entry paths correctly, and passes an explicit check in its own TypeScript project.
- [ ] The complete quality workflow passes, including frontend, backend, and worker checking, all existing test projects, static build, language navigation, and offline shell behavior.
- [ ] Cached shell responses remain limited to known shell assets; backend and unknown requests retain their network behavior, and the static output contract is preserved.
- [ ] CI configuration and contributor/agent guidance match the verified framework commands and preserve every required quality gate and its failure propagation.
- [ ] Validation stays isolated using the dummy backend URL and disabled live smoke testing; preserve the existing Convex client integration without hosted writes or deployment changes.
- [ ] Record exact versions, commands, results, migration findings, and limitations under Comments, distinguishing local verification from unexecuted CI or hosted checks.

## Comments

Implementation pending. Keep the accepted static hosting and Convex architecture.
