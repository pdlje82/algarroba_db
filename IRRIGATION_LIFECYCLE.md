# Irrigation lifecycle and carob examples

Open **Irrigation → Irrigation lifecycle**. Its inspector introduces the four phases,
units, timing, age context, abbreviations and limitations. The graph and Visible topics
list follow the stored order: Nursery, Settlement, Summer maintenance, Support.
Support can overlap the earlier field phases. Ordered folders retain their sequence;
other folders keep their normal grouping controls.

Select a phase to read its plant-neutral purpose, unit, frequency/trigger considerations,
applicable-period and age/stock concepts. The phase does not prescribe a numerical dose.
Carob recommendations and finca quantities are on the corresponding carob community
nodes. LIFE NIEBLAS project schedules remain on LIFE NIEBLAS and its methods.
**Source findings and guidance** retains the source context for the selected topic. Citation buttons open the registered
PDF at its one-based PDF position; printed numbering may differ.

## Reading quantities

- **L/plant/event** is the dose for one watering application. Frequency and period
  are separate fields; unknown is different from zero.
- The LIFE NIEBLAS project record holds its nursery average, traceable to the original batch quantity and plant count; this is not a generic phase dose or a carob prescription.
- Ranges remain ranges. Seasonal totals, annual area allocations, container sizes
  and reservoir fills retain their separate meanings and original source wording.
- Generic LIFE project schedules are reference evidence, not automatic carob values.
- Existing legacy L/plant/watering baselines remain equivalent and unchanged.
- **Use source value** requires compatible, quantified, species-specific evidence.
  An explicit user-adjusted value can retain other evidence as its documented basis.

The glossary explains AFDS and IND/IFWC. SAD retains the maintenance passage's
spelling and an explicitly curated correspondence with AFDS; no expansion is invented.
Plant nursery age is distinguished from years since field planting. No automatic
age-based dose curve or stopping age is supplied.

## Community context

Open **Habitats & conditions → Plant communities → Carob plant communities**:

- **Mediterranean carob associations** retains the original carob-community ID and
  its broad companion evidence; the old label remains searchable.
- **Carob communities in Almería** connects the regional setting to Las Labores,
  La Alcantarilla and La Tórtola. Potential vegetation, observed companions and
  surrounding landscape remain distinct.

Finca watering practices retain their method, location, season and age context.
The wider examples at Huerta Los Tamayos, El Triguero, Buenavista and Los Lirios
are held with the carob community context, which links to the general phase definitions. Restoration models and production practices
are not botanical community classifications. Source discrepancies remain visible.

## Maintenance and verification

The accepted input is `imports/irrigation-lifecycle-carob-context-2026-11-08-v2.json`,
advancing revision 6 to 7. Its source edition hashes were checked. The previous
candidate was used only in isolated QA, remains in imports for traceability, and has an audit copy under output/irrigation-audit.
Never modify an accepted batch ID; corrections require a new batch and current revision.

Group descriptions, references and layout are optional stored metadata, validated
through the checked importer. Vertical layout uses the member array's order.
The rendering code is generic and does not hardcode lifecycle topic identities.

Checks: 57 frontend tests, 74 backend passes (one existing skip), production build,
20 browser checks and SQLite integrity. Detailed audit material is under
`output/irrigation-audit/`: reviewed text, source-page images, intake checks, browser
screenshots/results and live before/after fingerprints. The batch records 41 reviewed
PDF positions; it does not claim complete coverage of either manual. No source bytes,
species identities, plant images, saved explorations or working plans were replaced.

Run the normal npm/Python checks. For the focused browser scenario use a fresh
isolated copy of the current accepted SQLite database, then
`scripts/irrigation-qa-server.py --database FRESH_QA.sqlite` (port 8771), and
`npm run test:irrigation-lifecycle` with KGB_PLAYWRIGHT_MODULE set. The historical
initial-intake verification helper is retained for its pre-intake audit; current
context-separation checks are recorded under output/irrigation-context/.
Browser mutations must never target port 8765.


## Context correction

The context-separation batch supersedes the original placement of concrete regimes
on lifecycle nodes. It changes descriptions, finding associations and contextual
connections; all source finding wording, immutable irrigation evidence, language
metadata and working-plan values are retained. General carob nursery/establishment
advice and the wider finca examples are on Mediterranean carob associations.
Almería-specific evidence is on Carob communities in Almería. Neither node implies
that all associated species share the carob amounts or that all fincas use one regime.


The accepted context-separation input is
imports/irrigation-context-separation-2026-11-08.json (revision 9 to 10). It replaces
the original placement of advice without modifying the earlier accepted batch IDs.
