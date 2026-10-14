# 01: Run the project on Bun 1.4.3

**What to build:** A contributor can install, develop, build, and verify Yard Bridge using Bun 1.4.3, with CI configuration and contributor guidance matching the working commands. Preserve the existing static localized PWA and package linker behavior.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

Spec: [Toolchain upgrade](../spec.md)

- [ ] Establish the isolated baseline and record actual results. Resolve environmental blockers before claiming successful validation.
- [ ] Bun 1.4.3 is the project pin and the version selected by CI; lockfile migration and dependency changes are reviewed.
- [ ] A clean checkout installs with a frozen lockfile using Bun 1.4.3 and retains the existing linker behavior.
- [ ] Documented development and preview commands work, and the static build preserves the existing output contract and configured language routes.
- [ ] The complete existing quality workflow passes, including unit, browser component, in-memory Convex, and offline PWA tests; environment loading works through the actual commands.
- [ ] CI configuration and contributor guidance match the verified Bun workflow, retain browser installation and all required gates, and propagate failures.
- [ ] Validation uses the dummy public backend URL and disables live smoke testing. No hosted data, backend synchronization, or hosted settings are touched.
- [ ] Record versions, commands, verification results, and remaining limitations under Comments, distinguishing local verification from unexecuted CI or hosted checks.

## Comments

Implementation pending. Framework and Vite+ migration belong to the following tickets.
