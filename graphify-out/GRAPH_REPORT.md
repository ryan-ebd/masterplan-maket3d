# Graph Report - .  (2026-08-13)

## Corpus Check
- 2 files · ~111,815 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1523 nodes · 2538 edges · 101 communities (70 shown, 31 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.67)
- Token cost: 28,711 input · 0 output

## Community Hubs (Navigation)
- Overpass & Elevation Pipeline
- Next.js API Routes
- Shadcn Installer & Tests
- Design Token Values A
- Banner Design Skill
- CIP BM25 Search
- Design Token Starter JSON
- Semantic Color Tokens
- UI Styling & Frontend Skills
- CIP & Logo Design Docs
- Slides Search Engine
- Polygon Editor & Geo
- Design Token Values B
- UI-UX BM25 Core
- Design System Generator Output
- HTML Token Validator
- Tailwind Config Tests A
- TypeScript Config
- Design System & QA Docs
- Logo BM25 Search
- Auth & Project Forms
- Design System Generator
- Planner Workspace & LLM Chat
- Client & Planner Dashboards
- Slide Generator Script
- Tailwind Config Generator
- Slides Copywriting Formulas
- Dark Mode Resolution
- Client Project Detail & Viewer
- Background Image Fetcher
- Icon Generator
- Design Token Values C
- Design System Search Logic
- Runtime Dependencies
- Auth.js Configuration
- Tailwind Config Methods
- Color Extraction Script
- Asset Validator
- Design System Search Execution
- NPM Scripts & Fixtures
- Token Validator CJS
- Tailwind Config Gen Tests
- Config File Generation
- Brand Context Injector
- Token Embedder
- Generator Initialization
- Auth Landing Pages
- Logo Generator
- Token CSS Generator
- Motion Duration Tokens
- Primitive Token Values
- Brand Token Sync
- Validate Tokens Tests
- 3D Scene Components
- Env Var Smoke Test
- Palette Selection Logic
- Next.js Starter Assets
- UI-Styling Test Dependencies
- Root Layout & Fonts
- Map Provider Components
- Prisma Package Config
- Prisma DB Migration (Init)
- NextAuth Type Augmentation
- Radius Tokens (lg)
- Radius Tokens (sm)
- ESLint Flat Config
- Default Radius Tokens
- Radius Tokens (xl)
- Border Radius None
- Data Validation Script
- Brand Token Sync Test
- Slide Token Validator Delegate
- Tailwind Framework Path Tests
- DB Seed Script
- Color Add Test
- Font Add Test
- Spacing Add Test
- Plugin Recommend Test
- Next.js Plugin Test
- Config No-Content Test
- Config Write Test
- Framework Init Test
- earcut Dependency
- gltf-transform Core
- gltf-transform Functions
- osmtogeojson Types
- lucide-react Dependency
- next Dependency
- next-auth Dependency
- Next.js Config
- osmtogeojson Dependency
- Prisma Client Dependency
- react Dependency
- react-dom Dependency
- react-hook-form Dependency
- swr Dependency
- three.js Dependency
- turf.js Dependency
- PostCSS Config
- Auth Route Handlers

## God Nodes (most connected - your core abstractions)
1. `TailwindConfigGenerator` - 58 edges
2. `TestTailwindConfigGenerator` - 35 edges
3. `ShadcnInstaller` - 34 edges
4. `DesignSystemGenerator` - 29 edges
5. `TestShadcnInstaller` - 26 edges
6. `handleApiError()` - 19 edges
7. `prisma` - 16 edges
8. `compilerOptions` - 16 edges
9. `color` - 15 edges
10. `search()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `shadcn/ui` --conceptually_related_to--> `tailwindcss`  [EXTRACTED]
  .claude/skills/ui-styling/SKILL.md → package.json
- `UI Styling Skill` --references--> `tailwindcss`  [EXTRACTED]
  .claude/skills/ui-styling/SKILL.md → package.json
- `PUT()` --calls--> `validateBoundaryRing()`  [EXTRACTED]
  app/api/projects/[id]/boundary/route.ts → lib/geo.ts
- `KlienLayout()` --calls--> `homeForRole()`  [EXTRACTED]
  app/klien/layout.tsx → lib/authz.ts
- `Beranda()` --calls--> `homeForRole()`  [EXTRACTED]
  app/page.tsx → lib/authz.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **UI Styling Skill Main Dev Testing Stack (pytest/pytest-cov/pytest-mock)** — _claude_skills_ui_styling_scripts_requirements_pytest, _claude_skills_ui_styling_scripts_requirements_pytest_cov, _claude_skills_ui_styling_scripts_requirements_pytest_mock [INFERRED 0.75]
- **UI Styling Skill Tests Directory Testing Stack (pytest/pytest-cov/pytest-mock)** — _claude_skills_ui_styling_scripts_tests_requirements_pytest, _claude_skills_ui_styling_scripts_tests_requirements_pytest_cov, _claude_skills_ui_styling_scripts_tests_requirements_pytest_mock [INFERRED 0.75]
- **Brand-to-Token Sync Pipeline** — _claude_skills_brand_skill_brand_guidelines_source_of_truth, _claude_skills_brand_skill_sync_brand_to_tokens, _claude_skills_brand_skill_inject_brand_context, _claude_skills_brand_references_update_brand_update_command, _claude_skills_design_system_skill_design_system_skill [EXTRACTED 1.00]
- **Three-Layer Token System** — _claude_skills_design_system_references_primitive_tokens_primitive_tokens, _claude_skills_design_system_references_semantic_tokens_semantic_tokens, _claude_skills_design_system_references_component_tokens_component_tokens, _claude_skills_design_system_references_token_architecture_three_layer_token_architecture [EXTRACTED 1.00]
- **Banner Production Workflow** — _claude_skills_banner_design_skill_banner_design, _claude_skills_banner_design_skill_gemini_batch_process, _claude_skills_banner_design_skill_screenshot_export, _claude_skills_banner_design_references_banner_sizes_and_styles_banner_sizes_reference, _claude_skills_brand_skill_inject_brand_context [EXTRACTED 1.00]
- **Complete Brand Package Workflow (Logo → CIP → Slides)** — _claude_skills_design_skill_logo_design, _claude_skills_design_skill_cip_design, _claude_skills_design_skill_slides [EXTRACTED 1.00]
- **Gemini AI Generation Pipeline** — _claude_skills_design_skill_scripts_logo_generate_py, _claude_skills_design_skill_scripts_cip_generate_py, _claude_skills_design_skill_scripts_icon_generate_py, _claude_skills_design_skill_gemini_nano_banana, _claude_skills_design_skill_gemini_3_1_pro_preview [EXTRACTED 1.00]
- **Slides Knowledge Base** — _claude_skills_design_references_slides_create_slides_create, _claude_skills_design_references_slides_layout_patterns_layout_patterns, _claude_skills_design_references_slides_html_template_html_slide_template, _claude_skills_design_references_slides_copywriting_formulas_copywriting_formulas, _claude_skills_design_references_slides_strategies_slide_strategies [EXTRACTED 1.00]
- **Maket3D 3D Generation Flow** — readme_pipeline_3d, readme_osm_overpass, readme_google_elevation, readme_viewer_r3f, readme_job_runner_tanpa_redis [EXTRACTED 1.00]
- **Slides Skill Knowledge Base** — _claude_skills_slides_skill_slides, _claude_skills_slides_references_layout_patterns_layout_patterns, _claude_skills_slides_references_html_template_html_slide_template, _claude_skills_slides_references_copywriting_formulas_copywriting_formulas, _claude_skills_slides_references_slide_strategies_slide_strategies [EXTRACTED 1.00]
- **UI Styling Stack (shadcn/ui + Radix + Tailwind)** — _claude_skills_ui_styling_skill_shadcn_ui, _claude_skills_ui_styling_skill_radix_ui [EXTRACTED 1.00]
- **Next.js Starter Template Asset Set** — public_file_file_icon, public_globe_globe_icon, public_next_nextjs_logo, public_vercel_vercel_logo, public_window_window_icon [INFERRED 0.95]

## Communities (101 total, 31 thin omitted)

### Community 0 - "Overpass & Elevation Pipeline"
Cohesion: 0.06
Nodes (65): openRing(), OverpassGeomElement, ringkasKonteks(), DEFAULT_HEIGHT_ZONA, ELEVATION_GRID_MAX, klasifikasiJalan(), LAYER_LABELS, OVERPASS_ENDPOINTS (+57 more)

### Community 1 - "Next.js API Routes"
Cohesion: 0.07
Nodes (57): POST(), GET(), MAPTYPE, runtime, GET(), runtime, PUT(), POST() (+49 more)

### Community 2 - "Shadcn Installer & Tests"
Cohesion: 0.05
Nodes (33): main(), Path, Add all available shadcn/ui components. Args: overwrite: If True, overwrite…, Handle shadcn/ui component installation., List installed components. Returns: Tuple of (success, message with component…, Initialize installer. Args: project_root: Project root directory (default:…, Check if shadcn is initialized in project. Returns: True if components.json…, Get list of already installed components. Returns: List of installed component… (+25 more)

### Community 3 - "Design Token Values A"
Cohesion: 0.05
Nodes (53): $type, $value, $type, $value, $type, $value, $type, $value (+45 more)

### Community 4 - "Banner Design Skill"
Cohesion: 0.05
Nodes (50): Banner Sizes Reference, CTA Rules, Visual Hierarchy 3-Zone Rule, Banner Design Skill, Gemini Batch Process Script, Safe Zone Rules, Chrome DevTools Screenshot Export, Asset Approval Checklist (+42 more)

### Community 5 - "CIP BM25 Search"
Cohesion: 0.07
Nodes (42): BM25, detect_domain(), get_cip_brief(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection (+34 more)

### Community 6 - "Design Token Starter JSON"
Cohesion: 0.04
Nodes (48): $type, $value, background, destructive, destructive-foreground, foreground, muted, muted-foreground (+40 more)

### Community 7 - "Semantic Color Tokens"
Cohesion: 0.06
Nodes (45): $type, $value, $type, $value, bg, fg, font-size, hover-bg (+37 more)

### Community 8 - "UI Styling & Frontend Skills"
Cohesion: 0.05
Nodes (44): Apache License 2.0, Frontend Design Skill, Apache License 2.0 (ui-styling), Canvas Design System, shadcn/ui Accessibility Patterns, shadcn/ui Component Reference, shadcn/ui Theming & Dark Mode, Tailwind Customization (@theme directive) (+36 more)

### Community 9 - "CIP & Logo Design Docs"
Cohesion: 0.07
Nodes (42): 22 Art Direction Styles, Banner Sizes and Styles Reference, Safe Zones, CIP Deliverable Guide, CIP Design Reference, Corporate Identity Program, CIP Mockup Prompt Engineering, CIP Design Style Guide (+34 more)

### Community 10 - "Slides Search Engine"
Cohesion: 0.09
Nodes (36): format_context(), format_result(), main(), Format a single search result for display, Format contextual recommendations for display., BM25, calculate_pattern_break(), detect_domain() (+28 more)

### Community 11 - "Polygon Editor & Geo"
Cohesion: 0.12
Nodes (30): EditorPoligon(), PoligonEditable(), RFC-7946, BOUNDARY_LIMITS, BoundaryValidation, closeRing(), formatLuasKm2(), LatLng (+22 more)

### Community 12 - "Design Token Values B"
Cohesion: 0.06
Nodes (34): $type, $value, $type, $value, $type, $value, $type, $value (+26 more)

### Community 13 - "UI-UX BM25 Core"
Cohesion: 0.10
Nodes (21): BM25, _domain_keywords(), _get_bm25(), _load_csv(), _load_product_keywords(), _normalize(), Apply synonym substitution before tokenizing., BM25 ranking algorithm for text search (+13 more)

### Community 14 - "Design System Generator Output"
Cohesion: 0.09
Nodes (27): ansi_ljust(), _detect_page_type(), format_ascii_box(), format_markdown(), format_master_md(), format_page_override_md(), generate_design_system(), _generate_intelligent_overrides() (+19 more)

### Community 15 - "HTML Token Validator"
Cohesion: 0.14
Nodes (24): get_context(), is_allowed_exception(), is_allowed_rgba(), is_inside_block(), load_css_variables(), main(), print_result(), print_summary() (+16 more)

### Community 16 - "Tailwind Config Tests A"
Cohesion: 0.07
Nodes (14): Test adding custom breakpoints., Test TailwindConfigGenerator class., Test initialization with default settings., Test generating config with custom colors., Test validating valid configuration., Test validating config with empty theme extensions., Test writing configuration to file., Test writing config to invalid path. (+6 more)

### Community 17 - "TypeScript Config"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 18 - "Design System & QA Docs"
Cohesion: 0.11
Nodes (25): UI/UX Pro Max Skill (design database), Design System Master File (SUPERSEDED), Glassmorphism Style, Interactive 3D Configurator Page Pattern, Meja Studio Maket Visual Identity, PostgreSQL 16 Service (maket3d-db, port 5433), External Blocker: Google Maps Key Referrer Restrictions, Bug Fix: Layer Toggle via glTF extras userData.layer (+17 more)

### Community 19 - "Logo BM25 Search"
Cohesion: 0.12
Nodes (19): BM25, detect_domain(), _load_csv(), Load CSV and return list of dicts, Core search function using BM25, Auto-detect the most relevant domain from query, Main search function with auto-domain detection, Search across all domains and combine results (+11 more)

### Community 20 - "Auth & Project Forms"
Cohesion: 0.16
Nodes (14): PERAN, FormNilai, FormProyekBaru(), PickerTitik(), Alert(), VARIAN, Button(), PropsButton (+6 more)

### Community 21 - "Design System Generator"
Cohesion: 0.14
Nodes (11): DesignSystemGenerator, _palette_is_dark(), WCAG relative luminance of a #RRGGBB string, or None if unparseable., True when a colors.csv row's Background is a dark surface., Generates design system recommendations from aggregated searches., Load reasoning rules from CSV., _relative_luminance(), TestReasoningMatch (+3 more)

### Community 22 - "Planner Workspace & LLM Chat"
Cohesion: 0.18
Nodes (14): GelembungPesan(), Pesan, ChatResp, PanelLlm(), SuggestResp, ProyekView, WorkspacePerencana(), DraftRing (+6 more)

### Community 23 - "Client & Planner Dashboards"
Cohesion: 0.21
Nodes (14): DashboardKlien(), Beranda(), DashboardPerencana(), KARTU_SELECT, BadgeStatus(), KONFIG, btnCls(), Card() (+6 more)

### Community 24 - "Slide Generator Script"
Cohesion: 0.15
Nodes (19): _e(), generate_chart_slide(), generate_cta_slide(), generate_deck(), generate_metrics_slide(), generate_problem_slide(), generate_solution_slide(), generate_testimonial_slide() (+11 more)

### Community 25 - "Tailwind Config Generator"
Cohesion: 0.10
Nodes (11): Generate Tailwind CSS configuration files., Add full color palette (50-950 shades) for a base color. Args: name: Color name…, TailwindConfigGenerator, Test adding full color palette., Test that adding same plugin twice doesn't duplicate., Test generating TypeScript configuration., Test generating JavaScript configuration., Test generating config with plugins. (+3 more)

### Community 26 - "Slides Copywriting Formulas"
Cohesion: 0.13
Nodes (19): AIDA Formula, Copywriting Formulas, FAB Formula (Features-Advantages-Benefits), PAS Formula (Problem-Agitate-Solution), Slides Create Command, Chart.js, HTML Slide Template, Layout Patterns (+11 more)

### Community 27 - "Dark Mode Resolution"
Cohesion: 0.16
Nodes (10): _filter_anti_patterns_for_mode(), _query_wants_dark(), True when a styles.csv row describes itself as dark-first., True when the query explicitly asks for a dark theme., Resolve the mode the rest of the output has to agree with., Drop "avoid dark mode" advice once dark mode is the resolved answer., _resolve_color_mode(), _style_is_dark_primary() (+2 more)

### Community 28 - "Client Project Detail & Viewer"
Cohesion: 0.20
Nodes (12): LANGKAH, ModelView, KartuInfoBangunan(), SUMBER, MODE_BASEMAP, PanelLayer(), InfoBangunan, ModeBasemap (+4 more)

### Community 29 - "Background Image Fetcher"
Cohesion: 0.17
Nodes (17): generate_css_for_background(), get_background_image(), get_curated_images(), get_overlay_css(), get_pexels_search_url(), load_backgrounds_config(), load_brand_colors(), main() (+9 more)

### Community 30 - "Icon Generator"
Cohesion: 0.20
Nodes (15): apply_color(), apply_viewbox_size(), extract_svgs(), generate_batch(), generate_icon(), generate_sizes(), load_env(), main() (+7 more)

### Community 31 - "Design Token Values C"
Cohesion: 0.12
Nodes (16): $type, $value, $type, $value, $type, $value, $type, $value (+8 more)

### Community 32 - "Design System Search Logic"
Cohesion: 0.20
Nodes (7): detect_domain(), Auto-detect the most relevant domain from query. Matches are weighted by…, Main search function with auto-domain detection, search(), Known query -> expected top-domain sanity checks (not exact-row pinning, since…, TestDomainDetection, TestSearchDomains

### Community 33 - "Runtime Dependencies"
Cohesion: 0.13
Nodes (15): @anthropic-ai/sdk, bcryptjs, dependencies, @anthropic-ai/sdk, bcryptjs, @react-three/drei, @react-three/fiber, server-only (+7 more)

### Community 34 - "Auth.js Configuration"
Cohesion: 0.22
Nodes (8): KlienLayout(), PerencanaLayout(), authConfig, { handlers, auth, signIn, signOut }, loginSchema, HeaderNav(), homeForRole(), config

### Community 35 - "Tailwind Config Methods"
Cohesion: 0.13
Nodes (8): main(), Add custom font families. Args: fonts: Dict of font_type: [font_names] e.g.,…, Add custom spacing values. Args: spacing: Dict of name: value e.g., {'18':…, Add custom breakpoints. Args: breakpoints: Dict of name: width e.g., {'3xl':…, Add plugin requirements. Args: plugins: List of plugin names e.g.,…, Get plugin recommendations based on configuration. Returns: List of recommended…, Validate configuration. Returns: Tuple of (valid, message), Add custom colors to theme. Args: colors: Dict of color_name: color_value Value…

### Community 36 - "Color Extraction Script"
Cohesion: 0.22
Nodes (11): calculateCompliance(), colorDistance(), displayPalette(), extractHexColors(), findNearestBrandColor(), fs, generateImageMagickCommand(), hexToRgb() (+3 more)

### Community 37 - "Asset Validator"
Cohesion: 0.25
Nodes (13): checkManifest(), formatBytes(), formatOutput(), fs, main(), parseFilename(), path, RULES (+5 more)

### Community 38 - "Design System Search Execution"
Cohesion: 0.14
Nodes (8): Execute searches across multiple domains., Find matching reasoning rule for a category., Apply reasoning rules to search results., Select best matching result based on priority keywords., Extract results list from search result dict., Generate complete design system recommendation. variance/motion/density are…, Bucket a 1-10 dial value into its tier config. Returns None if value is None., _resolve_dial()

### Community 39 - "NPM Scripts & Fixtures"
Cohesion: 0.15
Nodes (12): Create temporary project structure., scripts, build, db:migrate, db:seed, db:up, dev, fixture (+4 more)

### Community 40 - "Token Validator CJS"
Cohesion: 0.24
Nodes (11): extensions, formatReport(), fs, getFiles(), main(), parseArgs(), path, patterns (+3 more)

### Community 41 - "Tailwind Config Gen Tests"
Cohesion: 0.20
Nodes (8): Tests for tailwind_config_gen.py, Reduce a generated TS/JS config to a bare assignable object so it can be handed…, Regression guard for the missing-comma bug between the ``theme`` block and…, The property preceding ``plugins`` must end with a comma (pure-Python check, so…, The emitted config parses as valid JS via ``node --check``., _strip_to_object(), TestGeneratedConfigIsValidJs, parametrize

### Community 42 - "Config File Generation"
Cohesion: 0.20
Nodes (6): Generate configuration file content. Returns: Configuration file as string, Generate TypeScript configuration., Generate JavaScript configuration., Format plugins array for config. Validates each plugin name against a strict…, Add indentation to JSON string., Write configuration to file. Returns: Tuple of (success, message)

### Community 43 - "Brand Context Injector"
Cohesion: 0.31
Nodes (10): extractColorsFromTable(), extractCoreAttributes(), extractHexColors(), extractImageStyle(), extractTypography(), extractVoice(), fs, generatePromptAddition() (+2 more)

### Community 44 - "Token Embedder"
Cohesion: 0.20
Nodes (9): args, extractTokens(), fs, minimal, MINIMAL_TOKENS, path, projectRoot, tokensPath (+1 more)

### Community 45 - "Generator Initialization"
Cohesion: 0.22
Nodes (6): Any, Path, Initialize generator. Args: typescript: If True, generate .ts config, else .js…, Determine default output path., Create base configuration structure., Get default content paths for framework.

### Community 46 - "Auth Landing Pages"
Cohesion: 0.27
Nodes (4): LANGKAH, FormDaftar(), FormMasuk(), GarisKontur()

### Community 47 - "Logo Generator"
Cohesion: 0.29
Nodes (9): enhance_prompt(), generate_batch(), generate_logo(), load_env(), main(), Enhance the logo prompt with style and industry modifiers, Generate a logo using Gemini models with image generation Args: aspect_ratio:…, Generate multiple logo variants with different styles (+1 more)

### Community 48 - "Token CSS Generator"
Cohesion: 0.36
Nodes (9): flattenTokens(), fs, generateCSS(), generateTailwind(), main(), parseArgs(), path, resolveReference() (+1 more)

### Community 49 - "Motion Duration Tokens"
Cohesion: 0.20
Nodes (10): fast, normal, slow, $type, $value, $type, $value, duration (+2 more)

### Community 50 - "Primitive Token Values"
Cohesion: 0.24
Nodes (10): $type, $value, $type, $value, primitive, radius, shadow, full (+2 more)

### Community 51 - "Brand Token Sync"
Cohesion: 0.33
Nodes (8): adjustBrightness(), { execFileSync }, extractColorsFromMarkdown(), fs, generateColorScale(), main(), path, updateDesignTokens()

### Community 52 - "Validate Tokens Tests"
Cohesion: 0.28
Nodes (8): Path, Regression tests for validate-tokens.cjs. The validator used to skip any line…, A hardcoded hex on the same line as a var() token is still a violation., A line that references only tokens produces no false positives., _run(), test_flags_hardcoded_hex_sharing_line_with_token(), test_token_only_line_reports_no_violation(), CompletedProcess

### Community 53 - "3D Scene Components"
Cohesion: 0.28
Nodes (3): ModelErrorBoundary, BasemapPlane(), ModelMaket()

### Community 54 - "Env Var Smoke Test"
Cohesion: 0.39
Nodes (8): cekAnthropic(), cekElevation(), cekGeocoding(), cekMapsClientKey(), cekOverpass(), Hasil, jalan(), main()

### Community 55 - "Palette Selection Logic"
Cohesion: 0.43
Nodes (3): Pick the highest-ranked palette matching the resolved mode. Only the dark case…, _select_palette_for_mode(), TestPaletteSelection

### Community 56 - "Next.js Starter Assets"
Cohesion: 0.38
Nodes (7): File/Document Icon (Next.js starter), Globe Icon (Next.js starter), Next.js Framework, Next.js Wordmark Logo, Vercel Triangle Logo, Vercel Platform, Browser Window Icon (Next.js starter)

### Community 57 - "UI-Styling Test Dependencies"
Cohesion: 0.47
Nodes (6): pytest (>=8.0.0), pytest-cov (>=4.1.0), pytest-mock (>=3.12.0), pytest (>=7.4.0), pytest-cov (>=4.1.0), pytest-mock (>=3.11.1)

### Community 58 - "Root Layout & Fonts"
Cohesion: 0.33
Nodes (4): bricolage, instrument, metadata, plexMono

### Community 60 - "Prisma Package Config"
Cohesion: 0.33
Nodes (5): name, prisma, seed, private, version

### Community 61 - "Prisma DB Migration (Init)"
Cohesion: 0.60
Nodes (5): "LlmSession", "Model3D", "ProcessingJob", "Project", "User"

### Community 62 - "NextAuth Type Augmentation"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 63 - "Radius Tokens (lg)"
Cohesion: 0.60
Nodes (5): lg, $type, $value, lg, lg

### Community 64 - "Radius Tokens (sm)"
Cohesion: 0.60
Nodes (5): sm, sm, sm, $type, $value

### Community 65 - "ESLint Flat Config"
Cohesion: 0.40
Nodes (4): compat, __dirname, eslintConfig, __filename

### Community 66 - "Default Radius Tokens"
Cohesion: 0.67
Nodes (4): $type, $value, default, default

### Community 67 - "Radius Tokens (xl)"
Cohesion: 0.67
Nodes (4): xl, xl, $type, $value

### Community 68 - "Border Radius None"
Cohesion: 0.67
Nodes (4): $type, $value, none, none

### Community 69 - "Data Validation Script"
Cohesion: 0.83
Nodes (3): _check_file(), main(), _read_rows()

## Ambiguous Edges - Review These
- `UI Styling Skill` → `Apache License 2.0 (ui-styling)`  [AMBIGUOUS]
  .claude/skills/ui-styling/LICENSE.txt · relation: references
- `pytest (>=8.0.0)` → `pytest (>=7.4.0)`  [AMBIGUOUS]
  .claude/skills/ui-styling/scripts/requirements.txt · relation: conceptually_related_to
- `pytest-mock (>=3.12.0)` → `pytest-mock (>=3.11.1)`  [AMBIGUOUS]
  .claude/skills/ui-styling/scripts/requirements.txt · relation: conceptually_related_to

## Knowledge Gaps
- **307 isolated node(s):** `fs`, `path`, `fs`, `path`, `fs` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `UI Styling Skill` and `Apache License 2.0 (ui-styling)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `pytest (>=8.0.0)` and `pytest (>=7.4.0)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `pytest-mock (>=3.12.0)` and `pytest-mock (>=3.11.1)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `primitive` connect `Primitive Token Values` to `Design Token Values A`, `Design Token Starter JSON`, `Design Token Values B`, `Motion Duration Tokens`, `Design Token Values C`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `BM25` connect `CIP BM25 Search` to `Design System Search Logic`, `UI-UX BM25 Core`, `Design System Generator`, `Design System Generator Output`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `color` connect `Design Token Values A` to `Primitive Token Values`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `TailwindConfigGenerator` (e.g. with `TestGeneratedConfigIsValidJs` and `TestTailwindConfigGenerator`) actually correct?**
  _`TailwindConfigGenerator` has 2 INFERRED edges - model-reasoned connections that need verification._