# Tool Input Examples — Selection Guidance

## Purpose

Improve tool selection accuracy by providing concrete input examples for the most-used tools. When choosing which tool to use, reference these examples to match the current task to the correct tool.

## ADR-5 Compliance

These examples apply ONLY to always-loaded (Tier 1/2) and essential Tier 3 tools. Non-essential Tier 3 tools are discovered via tool search — do NOT reference examples for them.

## Tool Examples

### context7 — Library Documentation Lookup
Use when you need up-to-date documentation for a library or framework.
- **React docs:** `resolve-library-id("react")` then `get-library-docs` with topic "server components"
- **Supabase RLS:** `resolve-library-id("supabase")` then `get-library-docs` with topic "row level security"
- **Jest mocks:** `resolve-library-id("jest")` then `get-library-docs` with topic "mock functions"

### git — Version Control
Use for repository state, history, and branch management.
- **Check changes:** `git diff --stat` — file-level summary of uncommitted changes
- **Recent history:** `git log --oneline -10` — last 10 commits with conventional messages
- **Branch comparison:** `git diff main...HEAD --stat` — all changes since branching from main

### coderabbit — Automated Code Review
Use before commits and PRs for quality validation. Runs in WSL.
- **Pre-commit:** `wsl bash -c 'cd /mnt/c/.../lmas-core && ~/.local/bin/coderabbit --prompt-only -t uncommitted'`
- **Pre-PR:** `wsl bash -c 'cd /mnt/c/.../lmas-core && ~/.local/bin/coderabbit --prompt-only --base main'`

### dev-browser — Browser Automation (PADRAO)
Use for ALL browser automation. Script-based, persistent state, sandbox WASM. Substitui claude-in-chrome para automacao.
- **Navegar e inspecionar:**
  ```bash
  dev-browser <<'EOF'
  const page = await browser.getPage("main");
  await page.goto("https://example.com");
  console.log(JSON.stringify({ url: page.url(), title: await page.title() }));
  EOF
  ```
- **ARIA snapshot (descoberta de elementos — preferir sobre screenshots):**
  ```bash
  dev-browser <<'EOF'
  const page = await browser.getPage("main");
  const snap = await page.snapshotForAI();
  console.log(snap.full);
  EOF
  ```
- **Interagir (click, fill, form):**
  ```bash
  dev-browser <<'EOF'
  const page = await browser.getPage("login");
  await page.fill("#email", "user@example.com");
  await page.fill("#password", "pass");
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard");
  console.log("Login OK:", page.url());
  EOF
  ```
- **Screenshot:**
  ```bash
  dev-browser <<'EOF'
  const page = await browser.getPage("main");
  const path = await saveScreenshot(await page.screenshot(), "debug.png");
  console.log(path);
  EOF
  ```
- **Conectar ao Chrome existente:** `dev-browser --connect <<'EOF' ... EOF`
- **Tips:** Usar `--timeout 10` para fail fast. Named pages persistem entre scripts. `--headless` para automacao sem janela.

### pdf-processing — PDF Manipulation (Python)
Use for extracting tables, merging, splitting, creating PDFs, and OCR. Libs instaladas globalmente.
- **Extrair tabelas:** `python -c "import pdfplumber; pdf=pdfplumber.open('file.pdf'); t=pdf.pages[0].extract_table(); print(t)"`
- **Extrair texto:** `python -c "import pdfplumber; pdf=pdfplumber.open('file.pdf'); print(pdf.pages[0].extract_text())"`
- **Merge PDFs:** `python -c "from pypdf import PdfMerger; m=PdfMerger(); m.append('a.pdf'); m.append('b.pdf'); m.write('merged.pdf')"`
- **Split PDF:** `python -c "from pypdf import PdfReader,PdfWriter; r=PdfReader('file.pdf'); [PdfWriter().add_page(r.pages[i]) or PdfWriter().write(f'page_{i}.pdf') for i in range(len(r.pages))]"`
- **OCR (scanned):** `python -c "from pdf2image import convert_from_path; import pytesseract; [print(pytesseract.image_to_string(img)) for img in convert_from_path('scan.pdf')]"`
- **Criar PDF:** Use reportlab (Canvas ou Platypus). Ref: `framework/references/anthropic-pdf-skill.md`

### pptx-processing — PowerPoint Presentations
Use for creating, reading, and editing PowerPoint files. Design system com 10 paletas anti-AI-slop.
- **Ler PPTX:** `python -m markitdown presentation.pptx`
- **Criar slide (Node.js):** `node -e "const P=require('pptxgenjs');const p=new P();const s=p.addSlide();s.addText('Title',{x:0.5,y:0.5,fontSize:36,bold:true});p.writeFile({fileName:'output.pptx'})"`
- **Verificar placeholders:** `python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum"`
- **Design:** 10 paletas curadas. 1 cor domina (60-70%). Body 14-16pt, titles 36-44pt. NUNCA slides só texto.

### supabase — Database Operations
Use for migrations and database management.
- **Apply migrations:** `supabase db push`
- **Check status:** `supabase migration list`

### github-cli — GitHub Operations
Use for PRs, issues, and repository management. `@devops` exclusive for push/PR.
- **Create PR:** `gh pr create --title 'feat: ...' --body '## Summary...'`
- **List issues:** `gh issue list --state open --label bug`
- **PR status:** `gh pr view 123 --json reviews,statusCheckRollup`

### nogic — Code Intelligence (Essential)
Use for code analysis, dependency tracking, and usage patterns.
- **Dependencies:** Analyze import chain for a specific module
- **Usages:** Find all locations where a function is called

### code-graph — Dependency Analysis (Essential)
Use for dependency graphs and circular dependency detection.
- **Dependency tree:** Generate graph for a package with configurable depth
- **Circular check:** Detect circular dependency chains in the project

### docker-gateway — MCP Infrastructure
Use for managing Docker-based MCP servers. `@devops` manages infrastructure.
- **Health check:** `curl http://localhost:8080/health`
- **List servers:** `docker mcp server ls`

### defuddle — Web Content Extraction
Use for extracting clean markdown from web pages with minimal tokens. Preferred over WebFetch for articles, docs, and blog posts.
- **Extract article:** `npx -y defuddle parse https://example.com/article --md`
- **Save to file:** `npx -y defuddle parse https://example.com/doc --md -o content.md`
- **Get metadata:** `npx -y defuddle parse https://example.com -p title`
- **Pre-process for *absorb:** `npx -y defuddle parse <url> --md` then analyze clean output

### obsidian-rest-api — Vault Operations
Use for reading, writing, and searching the Obsidian vault. Requires Obsidian app running.
- **Read note:** `curl -s -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" https://localhost:27124/vault/path/to/note.md`
- **Create note:** `curl -s -k -X PUT -H "Authorization: Bearer $OBSIDIAN_API_KEY" -H "Content-Type: text/markdown" --data-binary @- https://localhost:27124/vault/path/to/note.md`
- **Search:** `curl -s -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" "https://localhost:27124/search/simple/?query=keyword"`
- **List dir:** `curl -s -k -H "Authorization: Bearer $OBSIDIAN_API_KEY" https://localhost:27124/vault/framework/`

## Reference

Full examples registry: `.lmas-core/data/mcp-tool-examples.yaml`
Tool registry: `.lmas-core/data/tool-registry.yaml`
