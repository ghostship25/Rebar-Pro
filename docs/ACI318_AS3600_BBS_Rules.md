# BBS Rules Reference: ACI 318 and AS 3600 (for Rebar-Pro)

**Audience:** GitHub Copilot and developers extending Rebar-Pro (https://ghostship25.github.io/Rebar-Pro/).
**Scope:** The rules from ACI 318 (US) and AS 3600 (Australia) that affect a Bar Bending Schedule (BBS): bar data, bend and hook geometry, cover, spacing, development and lap lengths, cut-length calculation, and validation checks.
**Current app baseline:** IS 2502 / BS 8666 shape codes, member wizards, 1D cutting-stock optimizer. ACI and AS are to be added as **selectable code profiles**, not replacements.

---

## 0. Read this first (accuracy and licensing)

1. ACI 318 and AS 3600 are copyrighted. This file is a **paraphrased engineering summary**, not the standards' text. Clause numbers are given for traceability.
2. Items marked **`VERIFY`** were written from memory of the standards or are edition-dependent. A licensed engineer must confirm them against the project's cited edition before the app labels output "compliant".
3. Items marked **`LOAD-FROM-STANDARD`** are tables whose values must be entered from a licensed copy. Do **not** invent numbers for them. Leave them `null` and surface a UI warning.
4. Neither standard defines BBS **shape codes or schedule layout**. Those come from detailing practice (ACI 315 / CRSI in the US; BS 8666 / IS 2502 / local industry guides elsewhere). The existing shape-code logic stays.
5. The app is a calculation aid. Output must carry a disclaimer: *"Verify against the governing standard and the engineer of record's drawings."*

Editions assumed: **ACI 318-19** (check whether the project cites a newer edition) and **AS 3600:2018** (with amendments).

---

## 1. Architecture guidance for Copilot

### 1.1 Code-profile pattern

Implement each standard as a data-driven profile. The calculation engine must read from the profile and never hard-code constants.

```yaml
profile:
  id: aci318-19
  name: "ACI 318-19"
  units_native: "mm"        # metric bars supported; imperial #3-#18 also supported
  bar_table: [...]          # see section 3
  bend_rules: {...}         # see section 4
  cover_rules: {...}        # see section 6
  development: {...}        # see section 7
  lap: {...}                # see section 8
  stock_lengths_m: [12]     # user-editable; common default 12 m (also 6, 9, 15 where available)
```

Profiles to add: `aci318-19`, `as3600-2018`. Keep existing: `is2502`, `bs8666`.

### 1.2 Rules for the engine

- All internal calculations in **mm**. Convert imperial at the UI boundary only.
- Every rule lookup returns `{ value, clause, verify: boolean }`. Display the clause in tooltips and in an export "Assumptions" section.
- Round **cut lengths up to the nearest 5 mm or 10 mm** (user setting; default 5 mm). Never round down.
- If a required table is `null`, block "Final" export and show: "Missing code data: <table name>".
- Add unit tests for every formula in sections 5 to 8 (see section 11 for test vectors).

---

## 2. Terminology

| Symbol | Meaning |
|---|---|
| `d` or `db` | Nominal bar diameter (mm) |
| `D` | Internal (inside) bend diameter (mm), also called pin diameter |
| `fy` / `fsy` | Specified yield strength (MPa) |
| `f'c` | Specified concrete compressive strength (MPa) |
| `ld` / `Lsy.t` | Development length in tension (ACI / AS) |
| `λ` | Lightweight-concrete factor (ACI), 1.0 for normal-weight |
| `cd` | Smaller of cover to bar or half the clear spacing between bars (AS 3600) |

---

## 3. Bar data

### 3.1 ACI 318 (US bars)

Soft-metric designations (ASTM A615M / A706M) and imperial equivalents.

| Imperial | Metric | Nominal dia (mm) | Mass (kg/m) |
|---|---|---|---|
| #3 | 10 | 9.5 | 0.560 |
| #4 | 13 | 12.7 | 0.994 |
| #5 | 16 | 15.9 | 1.552 |
| #6 | 19 | 19.1 | 2.235 |
| #7 | 22 | 22.2 | 3.042 |
| #8 | 25 | 25.4 | 3.973 |
| #9 | 29 | 28.7 | 5.060 |
| #10 | 32 | 32.3 | 6.404 |
| #11 | 36 | 35.8 | 7.907 |
| #14 | 43 | 43.0 | 11.38 |
| #18 | 57 | 57.3 | 20.24 |

- Common grades: 60 (420 MPa) and 80 (550 MPa). Grade 40 (280) exists for older work. Grade 100 (690) appears in newer editions with limits. `VERIFY` which grades the project allows.
- Minimum yield used in formulas is capped by ACI limits for shear/confinement steel. `VERIFY` at 20.2.2.

### 3.2 AS 3600 (Australian bars, AS/NZS 4671)

| Designation | Nominal dia (mm) | Mass (kg/m) |
|---|---|---|
| R10 | 10 | 0.617 |
| R12 | 12 | 0.888 |
| N10 | 10 | 0.617 |
| N12 | 12 | 0.888 |
| N16 | 16 | 1.58 |
| N20 | 20 | 2.47 |
| N24 | 24 | 3.55 |
| N28 | 28 | 4.83 |
| N32 | 32 | 6.31 |
| N36 | 36 | 7.99 |
| N40 | 40 | 9.86 |

- Grades: `D500N` (normal ductility), `D500E` (seismic ductility), `D500L` (low ductility, mainly mesh and small wire), `R250N` (plain round).
- `fsy = 500 MPa` for D500 grades, `250 MPa` for R250N.
- Ductility class matters in design. The BBS should print the grade on every bar line.

### 3.3 Mass formula (all codes)

```
mass_kg_per_m = d_mm^2 / 162.2        // 7850 kg/m3 steel; matches tables to within about 0.5%
```

Use the table values when available; use the formula only as a fallback.

---

## 4. Bends, hooks and internal bend diameters

### 4.1 ACI 318-19, 25.3

**Standard hooks (development of bars in tension and compression), 25.3.1**

| Hook | Bend | Straight extension at free end |
|---|---|---|
| 90° | 90° | `12 db` |
| 180° | 180° | greater of `4 db` and `65 mm` |

Minimum inside bend diameter `D` for these hooks (main bars):

| Bar | `D` |
|---|---|
| #3 to #8 (10 to 25 mm) | `6 db` |
| #9 to #11 (29 to 36 mm) | `8 db` |
| #14 and #18 (43 and 57 mm) | `10 db` |

**Stirrup, tie and hoop hooks, 25.3.2**

| Bar | Minimum `D` | Notes |
|---|---|---|
| #3 to #5 (10 to 16 mm) | `4 db` | |
| #6 to #8 (19 to 25 mm) | `6 db` | |

| Hook type | Extension at free end |
|---|---|
| 90° stirrup/tie hook | `6 db` for #3 to #5; `12 db` for #6 to #8 `VERIFY` |
| 135° stirrup/tie hook | greater of `6 db` and `75 mm` `VERIFY` |
| 180° stirrup/tie hook | greater of `4 db` and `65 mm` `VERIFY` |

**Seismic hooks (Chapter 18), `VERIFY`:** hoops and crossties in special moment frames and similar members use 135° hooks, with extension typically the greater of `6 db` and `75 mm`. Crossties may use a 90° hook on one end only where the code allows it. Alternate end hooks on consecutive crossties along the member.

**Bending rules to enforce in the app:**
- Do not bend a bar smaller than the minimum `D` for its size and use.
- Cold-bending only. No re-bending or field straightening of bars already bent, except as the code and specification allow.
- Epoxy-coated bars: larger bend radii may be required by the specification. Make `D` multiplier user-editable.

### 4.2 AS 3600:2018, Cl 17.2

AS 3600 specifies minimum internal bend diameters by **bar type and use** (main bars vs fitments) in a table in **Cl 17.2.3**. The table values are `LOAD-FROM-STANDARD`.

```yaml
as3600_min_internal_bend_diameter:
  main_bars:  { R: null, N: null }      # LOAD-FROM-STANDARD, Table in Cl 17.2.3
  fitments:   { R: null, N: null }      # LOAD-FROM-STANDARD, Table in Cl 17.2.3
```

**Hooks and cogs (Cl 17.2.2), `VERIFY`:** AS 3600 uses 180° hooks (extension about `4 db`), 90° cogs (extension about `12 db`), and 135° hooks for fitments, with end extensions defined for each. Enter the exact extension lengths from the standard into the profile. Do not rely on this summary for production values.

**Fitment anchorage (Cl 17.2.4 or nearby), `VERIFY`:** closed fitments must be anchored with hooks that engage the longitudinal bars. Include a UI hint that hooks in alternating corners are good practice.

### 4.3 Practical pin-size rule for the app

If a profile has `null` for a bend diameter, the app **must not** silently fall back to another code's value. Options: block the bar, or ask the user to enter `D` manually and mark the line "manual override".

---

## 5. Cut-length calculation (all codes)

BBS cut lengths are driven by **geometry**, not by the standard text. Use one consistent method.

### 5.1 Method: out-to-out dimensions with bend deductions

```
cut_length = sum(out_to_out segment dimensions) - sum(bend deductions) + sum(hook/end allowances)
```

Dimensions A, B, C... are measured to the **outside surfaces** of the bar (the way detailers dimension shapes).

### 5.2 Bend deduction for a bend through angle `alpha`

With inside bend diameter `D` and bar diameter `d`, outer radius is `Ro = D/2 + d`.

```
deduction(alpha) = 2 * Ro * tan(alpha / 2) - alpha_rad * (D + d) / 2
```

where `alpha` is the **turn angle** (a 90° bend turns the bar through 90°).

For the common 90° bend this reduces to:

```
deduction_90 = 0.2146 * D + 1.2146 * d
```

| Pin `D` | 90° deduction |
|---|---|
| `4 d` | `2.07 d` |
| `5 d` | `2.29 d` |
| `6 d` | `2.50 d` |
| `8 d` | `2.93 d` |

For turn angles of 135° or more, out-to-out dimensions are unreliable. Use the **centerline method** below.

### 5.3 Centerline method (preferred for hooks and bends of 135° or more)

```
centerline_radius = (D + d) / 2
arc_length        = alpha_rad * centerline_radius
cut_length        = sum(straight tangent lengths) + sum(arc_length) + sum(free-end extensions)
```

Hook allowance (straight tangent lengths excluded):

```
hook_allowance = arc_length(alpha) + extension_length
```

Examples (for reference in tests, with `D` taken from the profile):
- 180° hook: `pi * (D + d) / 2 + extension`
- 135° hook: `(3*pi/4) * (D + d) / 2 + extension`
- 90° hook: `(pi/2) * (D + d) / 2 + extension`

State in the UI which method each shape code uses.

### 5.4 Rounding and tolerances

- Round up to the nearest 5 or 10 mm (user setting).
- Fabrication tolerances belong in the specification, not in the cut length. Do not silently add or subtract them.
- Total weight per line: `qty * cut_length_m * mass_per_m`, with total weight rounded to 0.01 kg for display.

### 5.5 Stirrup/fitment dimensions from member size

Be explicit about what the wizard measures. The two common conventions:
- **Outside of bar (default for BBS):** `A = b - 2*cover`, `B = h - 2*cover`. Cover is taken to the outer surface of the stirrup.
- **Centerline:** `A = b - 2*cover - d`, `B = h - 2*cover - d`.

The wizard must show which convention is in use and use the same one in the deduction maths. Mixing them is the most common source of wrong cut lengths.

---

## 6. Concrete cover

### 6.1 ACI 318-19, 20.5.1.3 (cast-in-place, nonprestressed)

| Exposure | Member / bar | Minimum cover (mm) |
|---|---|---|
| Cast against and permanently in contact with ground | all | 75 |
| Exposed to weather or in contact with ground | #6 to #18 | 50 |
| Exposed to weather or in contact with ground | #5 and smaller (and W31/D31 wire and smaller) | 40 |
| Not exposed to weather or in contact with ground | Slabs, walls, joists: #14 and #18 | 40 |
| Not exposed to weather or in contact with ground | Slabs, walls, joists: #11 and smaller | 20 |
| Not exposed to weather or in contact with ground | Beams, columns, pedestals, tension ties: primary reinforcement, stirrups, ties, spirals, hoops | 40 |

Larger cover applies for corrosive environments, fire rating (Chapter 4 exposure categories), and where the specification requires it. `VERIFY` against the exposure categories in Chapter 19 and the fire requirements of the building code.

### 6.2 AS 3600:2018, Cl 4.10 (and Section 5 for fire)

Cover depends on:
1. **Exposure classification** (A1, A2, B1, B2, C1, C2, U) from Cl 4.3.
2. **Concrete grade (`f'c`)** and, for some conditions, formwork and compaction method.
3. **Fire resistance period (FRP)** from Section 5.

Required cover is the **greater** of the durability value and the fire value, and it also must satisfy the bond requirement (cover not less than bar diameter in many cases).

```yaml
as3600_cover:
  durability_table: null      # LOAD-FROM-STANDARD: Table 4.10.3.2 (by exposure classification and f'c)
  fire_table: null            # LOAD-FROM-STANDARD: Section 5 (by FRP and member type)
  cast_against_ground: null   # LOAD-FROM-STANDARD: Cl 4.10.3.x
  bond_minimum: "not less than bar diameter"   # VERIFY
```

The app should let the user pick **exposure classification** and **FRP**, then look up cover from the loaded tables. If tables are not loaded, show "Cover must be entered manually".

---

## 7. Development length

### 7.1 ACI 318-19, 25.4

**Straight bars in tension (25.4.2).** General form:

```
ld = ( fy * psi_t * psi_e * psi_s * psi_g ) / ( 1.1 * lambda * sqrt(f'c) * ((cb + Ktr)/db) ) * db      // SI: mm, MPa      VERIFY constants
```

with `(cb + Ktr)/db <= 2.5`, and `ld >= 300 mm`.

**Simplified table (25.4.2.3), `VERIFY`:**

| Conditions | #6 (19 mm) and smaller | #7 (22 mm) and larger |
|---|---|---|
| Clear spacing >= `db` and clear cover >= `db` with minimum stirrups/ties along `ld`, **or** clear spacing >= `2 db` and cover >= `db` | `ld = fy * psi_t * psi_e / (2.1 * lambda * sqrt(f'c)) * db` | `ld = fy * psi_t * psi_e / (1.7 * lambda * sqrt(f'c)) * db` |
| Other cases | `ld = fy * psi_t * psi_e / (1.4 * lambda * sqrt(f'c)) * db` | `ld = fy * psi_t * psi_e / (1.1 * lambda * sqrt(f'c)) * db` |

Modification factors (24.4.2.4 / 25.4.2.5 area, `VERIFY`):

| Factor | Condition | Value |
|---|---|---|
| `psi_t` (casting position) | Horizontal bars with more than 300 mm of fresh concrete below | 1.3 |
| | Other | 1.0 |
| `psi_e` (coating) | Epoxy-coated, cover < `3 db` or clear spacing < `6 db` | 1.5 |
| | Other epoxy-coated | 1.2 |
| | Uncoated | 1.0 |
| `psi_s` (size) | #6 and smaller | 0.8 |
| | #7 and larger | 1.0 |
| `psi_g` (grade) | Grade 60 | 1.0 |
| | Grade 80 | 1.15 |
| | Grade 100 | 1.3 |
| `lambda` | Normal-weight concrete | 1.0 |

The product `psi_t * psi_e` need not exceed 1.7. Never allow `ld < 300 mm`.

**Standard hooked bars in tension (25.4.3), `VERIFY`:**

```
ldh = ( fy * psi_e * psi_c * psi_r ) / ( 23 * lambda * sqrt(f'c) ) * db^1.5      // SI form, constants VERIFY
ldh >= max( 8 * db, 150 mm )
```

Hook development length is measured from the critical section to the outside edge of the hook.

**Bars in compression (25.4.9):** `ldc` is the greater of `0.24 * fy * db / (lambda * sqrt(f'c))`, `0.043 * fy * db` (SI), and 200 mm. `VERIFY`.

### 7.2 AS 3600:2018, Cl 13.1

**Basic development length in tension (13.1.2.2), `VERIFY`:**

```
Lsy.tb = max( 0.5 * k1 * k3 * fsy * db / ( k2 * sqrt(f'c) ),  0.058 * fsy * k1 * db )
k1 = 1.3 for horizontal bars with more than 300 mm of concrete cast below, otherwise 1.0
k2 = (132 - db) / 100        // db in mm
k3 = 1.0 - 0.15 * (cd - db) / db ,   0.7 <= k3 <= 1.0
```

**Refined length (13.1.2.3), `VERIFY`:**

```
Lsy.t = k4 * k5 * Lsy.tb   >=  0.058 * fsy * k1 * db     // use the lower limit as stated in the standard
k4 : transverse reinforcement factor, between 0.7 and 1.0
k5 : transverse compressive stress factor, between 0.7 and 1.0
```

The simple option is to use `k4 = k5 = 1.0`, which gives a conservative length.

**Compression (13.1.5), `VERIFY`:**

```
Lsy.cb = max( 0.24 * fsy * db / sqrt(f'c),  0.043 * fsy * db )
```

**Hooks and cogs in development length:** AS 3600 allows credit for standard hooks and cogs at ends. Only apply the credit as the standard specifies (13.1.2.7 or similar, `VERIFY`).

---

## 8. Lap splices

### 8.1 ACI 318-19, 25.5

**Tension laps (25.5.2):**

| `As,provided / As,required` | Max % of `As` spliced within lap length | Class | Lap length |
|---|---|---|---|
| >= 2.0 | <= 50% | A | `1.0 ld` |
| >= 2.0 | > 50% | B | `1.3 ld` |
| < 2.0 | any | B | `1.3 ld` |

- Minimum lap is **300 mm** for tension laps.
- `ld` used for lap length is the full development length for the bar (no reduction for excess reinforcement). The 300 mm minimum applies to the final lap length. `VERIFY`.
- Bars spliced by non-contact lap: transverse spacing between lapped bars must not exceed the lesser of one-fifth of the lap length and 150 mm. `VERIFY`.

**Compression laps (25.5.5), `VERIFY`:**

```
if fy <= 420 MPa : lap = max( 0.071 * fy * db, 300 mm )
if fy  > 420 MPa : lap = max( (0.13 * fy - 24) * db, 300 mm )
if f'c < 21 MPa  : increase lap by one-third
```

**Mechanical or welded splices:** must develop at least 125% of `fy` (Type 1 mechanical) per 25.5.7 / 25.5.8 and Chapter 18 for seismic. The BBS should flag such splices for coupler schedule, not a lap length.

**Seismic detailing:** lap splice locations are restricted (not within joints or plastic hinge regions) and need closer transverse reinforcement. `VERIFY` Chapter 18.

### 8.2 AS 3600:2018, Cl 13.2

```
Lsy.t.lap = k7 * Lsy.t
k7 = 1.25 or 1.5 depending on lap arrangement (spacing, cover, bars in the same layer)    // VERIFY, LOAD-FROM-STANDARD
Lsy.c.lap = Lsy.c    for compression laps                                                // VERIFY
```

- Minimum lap lengths and spacing limits for lapped bars are set in Cl 13.2. `LOAD-FROM-STANDARD`.
- Do not splice at points of maximum tension where avoidable. Stagger splices where practical.

---

## 9. Bar spacing and arrangement

### 9.1 ACI 318-19, 25.2

Minimum clear spacing between parallel bars in a layer is the greatest of:
- `25 mm`
- `db`
- `(4/3) * d_agg` (maximum aggregate size)

Between layers (beams): clear spacing at least `25 mm`. Columns: clear spacing between longitudinal bars at least the greatest of `40 mm`, `1.5 db`, `(4/3) d_agg`. `VERIFY`.

### 9.2 AS 3600:2018, Cl 17.1 area, `VERIFY`

Spacing is set so concrete can be placed and compacted around bars. Typical rule: clear spacing not less than the greater of the bar diameter and a multiple of the aggregate size. `LOAD-FROM-STANDARD` for the exact rule, and include a UI field for aggregate size.

---

## 10. Validation checks the app should run

Run on every bar line. Each check returns `PASS`, `WARN` or `FAIL` plus the clause.

| # | Check | Severity |
|---|---|---|
| 1 | Bend diameter >= profile minimum for the bar size and use (main vs fitment) | FAIL |
| 2 | Hook extension >= profile minimum | FAIL |
| 3 | Cover >= profile minimum for the selected exposure | FAIL |
| 4 | Clear spacing >= profile minimum | WARN or FAIL |
| 5 | Lap length >= computed lap and >= minimum (300 mm for ACI tension) | FAIL |
| 6 | Straight bar length does not exceed the user stock length unless a lap is scheduled | WARN |
| 7 | Cut length after bend deductions > 0 and each straight leg >= minimum practical length (for example 4 db plus bend allowances) | FAIL |
| 8 | Bars shown in the schedule are available in the chosen standard (for example no `N14`) | FAIL |
| 9 | Shape dimensions fit inside the member size less cover | FAIL |
| 10 | Any `null` profile table used by the line | BLOCK final export |
| 11 | Epoxy-coated bars flagged for specification-driven bend radius | WARN |
| 12 | Seismic member: 135° hooks and hook extensions checked | FAIL |

---

## 11. Test vectors (unit tests)

Use these to guard the formulas. Values are derived from the formulas above.

**T1. 90° deduction, ACI main bar, 12 mm**
- `d = 12`, `D = 6d = 72`
- `deduction_90 = 0.2146*72 + 1.2146*12 = 15.45 + 14.58 = 30.03 mm`
- L-bar with out-to-out legs 500 and 300: `cut = 500 + 300 - 30.03 = 769.97 mm`, rounded up to 770 mm (5 mm rounding: 770).

**T2. 90° deduction, stirrup bar 10 mm with `D = 4d`**
- `deduction_90 = 2.073 * 10 = 20.73 mm`

**T3. Bar mass**
- `d = 16`: `16^2 / 162.2 = 1.578 kg/m` (table value 1.58 for N16, 1.552 for #5 at 15.9 mm). Tests must use the table, with the formula as fallback.

**T4. ACI compression lap**
- `fy = 420`, `db = 20`: `0.071 * 420 * 20 = 596.4 mm`. Use 600 mm after rounding.

**T5. 180° hook allowance (centerline method)**
- `d = 16`, `D = 6d = 96`: arc = `pi * (96 + 16) / 2 = 175.9 mm`. Extension = max(`4d = 64`, 65) = 65 mm. Hook allowance = `240.9 mm`.

**T6. ACI tension lap class**
- Provided/required = 1.5, 100% spliced: Class B, lap `= 1.3 ld`.

---

## 12. UI and data requirements

1. **Standard selector** (IS 2502, BS 8666, ACI 318-19, AS 3600:2018) in project settings.
2. Bar-size list, hook rules, bend rules and cover rules all come from the selected profile.
3. **Units:** show metric by default and let ACI users toggle bar naming (`#5` or `16`).
4. Member wizards (beam, column, slab, footing) read the cover and spacing rules from the profile.
5. The cutting-stock optimizer must:
   - Take stock length from the profile (editable).
   - Add a lap allowance for bars longer than stock length, using the lap rules of the active profile.
   - Group by bar size and grade, never mix.
6. **Export:** include an "Assumptions and clauses" section listing the standard, edition, grade, exposure class, bend diameters, and every `VERIFY` item used.
7. **Disclaimer** in every export, as in section 0.

---

## 13. Instructions for Copilot

- Do not hard-code constants. Read them from the profile.
- Do not guess values marked `LOAD-FROM-STANDARD`. Leave `null` and surface a warning.
- Add JSDoc or docstrings with the clause reference on every rule function.
- Keep the existing IS 2502 / BS 8666 shape-code logic unchanged. Add ACI and AS as new profiles that reuse the same shape engine.
- Write unit tests for each formula using section 11 as the seed set.
- Never silently convert between codes. If a rule is missing, show it.

---

## 14. References (for the repo's docs folder)

- ACI CODE-318-19, *Building Code Requirements for Structural Concrete* (and any later edition the project cites).
- ACI 315, *Details and Detailing of Concrete Reinforcement*; ACI SP-66, *ACI Detailing Manual*.
- CRSI, *Manual of Standard Practice*.
- AS 3600:2018, *Concrete structures*.
- AS/NZS 4671, *Steel for the reinforcement of concrete*.
- AS/NZS 4672, *Steel prestressing materials* (reference only).
- BS 8666, *Scheduling, dimensioning, bending and cutting of steel reinforcement for concrete* (used by the current app).
- IS 2502, *Code of practice for bending and fixing of bars for concrete reinforcement* (used by the current app).
