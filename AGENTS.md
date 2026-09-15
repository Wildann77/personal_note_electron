# AGENTS.md — Panduan AI Coding Agent

> **Proyek:** Personal Note Desktop App (Offline-First, Zero-Leak, SQLite Single Source of Truth)  
> **Arsitektur:** Clean Architecture 4-Lapis + Electron Security Hardening (Chromium Sandbox)  
> **Format Acuan:** [agents.md specification](https://agents.md)

Dokumen ini adalah acuan instruksi utama bagi AI Coding Agent (Cursor, Devin, Claude Code, Antigravity, dll.) yang bekerja di repositori ini. Seluruh instruksi bersifat mengikat (*strictly enforced*).

---

## 1. Peta Navigasi Dokumen Acuan (Hub & Spoke Router)

Agar efisien token, file ini memuat aturan operasional ringkas. Untuk detail implementasi spesifik, Agent **WAJIB** merujuk ke bab yang dipetakan pada dokumen sumber berikut:

| Topik Spesifik | Dokumen Sumber & Bagian | Keterangan Singkat |
| :--- | :--- | :--- |
| **Kebutuhan & User Stories** | [`PRD-Personal-Note-App.md`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/PRD-Personal-Note-App.md) | Daftar lengkap User Story (US #1–50) & Acceptance Criteria. |
| **Clean Architecture & Lapisan** | [`ARCHITECTURE.md §3`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L59-L120) | Batasan Domain, Use Cases, Infrastructure, & Presentation. |
| **Keamanan & Sandbox** | [`ARCHITECTURE.md §4`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L123-L210) | Konfigurasi BrowserWindow, `validateSender`, CSP, URL external. |
| **Kontrak IPC & Result Type** | [`ARCHITECTURE.md §5`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L211-L260) | `Result<T, E>`, discriminated union, `createProtectedHandler`. |
| **Database & Migrasi SQLite** | [`ARCHITECTURE.md §6`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L261-L350) | Skema DDL tabel `notes`, PRAGMA WAL, `MigrationRunner`. |
| **OCC & Concurrency Guard** | [`ARCHITECTURE.md §7`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L351-L410) | Mekanisme kolom `revision` dan `SingleFlightQueue`. |
| **EventHub & Cross-Window** | [`ARCHITECTURE.md §8`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L411-L470) | Broadcast mutasi data real-time via `webContents.send`. |
| **Multi-Window Lifecycle** | [`ARCHITECTURE.md §9`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L471-L540) | Pengelolaan `WindowManager`, layout single vs child window. |
| **Desain, Token & Palet Warna** | [`DESIGN.md`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/DESIGN.md) | CSS Variables HSL, palet dark/light, styling Editor.js, Anti-FOUC. |
| **Struktur Folder Lengkap** | [`ARCHITECTURE.md §14`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L777-L908) | Penempatan file presisi di Main, Preload, Renderer, & Shared. |
| **Packaging & Native Rebuild** | [`ARCHITECTURE.md §15`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L911-L985) | Electron Forge, plugin Vite, `better-sqlite3` externalization. |
| **Daftar Tugas & Rencana Kerja** | [`TASK.md`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/TASK.md) | Rencana fase (Fase 1–25) sebagai panduan referensi eksekusi. |

---

## 2. Tech Stack Baseline

Seluruh dependensi dikunci pada versi stabil terkini:

- **Desktop Runtime:** Electron 44.x (Stable 44.3.x)
- **Build System:** Electron Forge 7.x + `@electron-forge/plugin-vite` (Vite 8.x)
- **Native Module:** `@electron/rebuild` + `@electron-forge/plugin-auto-unpack-natives`
- **Language:** TypeScript 5.9.x (Strict Mode murni, zero `any`)
- **Database:** SQLite 3 via `better-sqlite3 13.x` (Direct C++ synchronous binding, WAL mode)
- **Frontend UI:** React 19.3.x + Tailwind CSS 4.3.x + shadcn/ui (Radix primitives) + `clsx`, `tailwind-merge` & `class-variance-authority 0.7.x`
- **Block Editor:** Editor.js 2.31.x + Official Tool Suite
- **State Management:** Zustand 5.x (`useNotesStore` in-memory, `useUIStore` persist ringan)
- **Virtualisasi:** `@tanstack/react-virtual 3.x` (Daftar catatan > 300 item)
- **Runtime Validation:** Zod 4.x (Validasi payload IPC)
- **Testing:** Vitest 5.x (Unit & Integration) + Playwright 1.63.x (E2E Electron) + `@testing-library/react 16.x`
- **Logging:** `electron-log 5.4.x` (Rotasi lokal terstruktur, zero-leak)
- **Lint & Format:** ESLint 9.x (Flat Config) + Prettier 3.x

### Dependensi yang DILARANG Keras (Explicitly Rejected)
- ❌ **Redux / Redux Toolkit:** Gunakan Zustand 5.x.
- ❌ **React Query / TanStack Query:** Tidak ada API server remote; akses via IPC SQLite.
- ❌ **ORM Berat (Prisma / TypeORM):** Gunakan parameterized raw SQL `better-sqlite3`.
- ❌ **Day.js / date-fns:** Gunakan native JS `Date` di domain service.
- ❌ **Sentry / Cloud Telemetry:** Mutlak dilarang (Prinsip Zero-Leak).

---

## 3. Perintah Utama Proyek (Command Reference)

```bash
# Menjalankan aplikasi desktop (dev mode + HMR)
npm start

# Validasi kode statis & typecheck
npm run lint
npm run format:check
npx tsc --noEmit

# Pengujian otomatis
npm test                  # Vitest (Unit & Integration)
npm run test:unit         # Unit tests saja
npm run test:integration  # Integration tests (SQLite in-memory)
npm run test:e2e          # Playwright Electron E2E

# Rebuild native modules C++
npx electron-rebuild -f -w better-sqlite3

# Packaging & Distribusi
npm run package           # Package binary lokal
npm run make              # Generate installer OS (Squirrel/DMG/Deb/Zip)
```

---

## 4. Aturan Arsitektur & Batasan Lapisan (Clean Architecture)

Arsitektur dibagi menjadi 4 lapisan terisolasi. Ketergantungan hanya boleh mengarah ke dalam (*inward dependency*):

1. **Domain Layer (`src/main/domain/` & `src/shared/types/`):**
   - Berisi entity (`Note`), interface kontrak (`INoteRepository`, `IEventHub`), dan service murni (`NoteContentExtractor`, `timeSectioning`).
   - **Dilarang:** Mengimpor modul Electron, Node.js FS, SQLite, atau React.
2. **Application Layer (`src/main/application/`):**
   - Berisi Use Cases bisnis (`CreateNoteUseCase`, `UpdateNoteUseCase`, `DeleteNoteUseCase`, `GetNotesUseCase`, `OpenChildWindowUseCase`).
   - Orkestrasi transaksi, pengecekan konkurensi (OCC), dan broadcast mutasi.
   - Bergantung hanya pada antarmuka Domain, bukan implementasi konkret.
3. **Infrastructure Layer (`src/main/infrastructure/`):**
   - Berisi implementasi nyata: `SQLiteNoteRepository` (`better-sqlite3`), `WindowManager`, `ElectronEventHub`, `BackupService`, `logger`.
   - Mengimplementasikan interface Domain.
4. **Presentation & IPC Layer (`src/main/ipc/`, `src/preload/`, `src/renderer/`):**
   - **Main IPC:** Menggunakan `createProtectedHandler(schema, handler)` dengan validasi `validateSender` dan Zod 4.x schema. Mengembalikan format `Result<T, E>`.
   - **Preload:** `contextBridge.exposeInMainWorld('electronAPI', ...)` yang 100% bertipe.
   - **Renderer:** Komponen React 19 deklaratif, Zustand stores, dan styling Tailwind CSS 4.3.x.

---

## 5. Ringkasan Struktur Direktori (`src/`)

```
src/
├── main/                   # MAIN PROCESS (Node.js)
│   ├── index.ts            # Bootstrap & Lifecycle
│   ├── app/                # AppLifecycle & Security Policies
│   ├── application/        # Use Cases (notes/, windows/)
│   ├── domain/             # Entities, Repository Interfaces, Domain Services, Errors
│   ├── infrastructure/     # SQLite, WindowManager, EventHub, Logger, Menu
│   └── ipc/                # Security (validateSender), Schemas (Zod), Handlers
├── preload/                # PRELOAD BRIDGE
│   └── index.ts            # ContextBridge (window.electronAPI)
├── renderer/               # RENDERER PROCESS (React 19)
│   ├── index.html          # HTML entry point (dengan Anti-FOUC script & CSP)
│   ├── main.tsx            # React DOM bootstrap
│   ├── App.tsx             # Window routing (?type=child vs main)
│   ├── components/         # ui/, chrome/, sidebar/, editor/, dialogs/
│   ├── hooks/              # useEditor.ts, useSyncListener.ts
│   ├── layouts/            # MainWindowLayout.tsx, ChildWindowLayout.tsx
│   ├── lib/                # utils.ts (helper cn shadcn/ui)
│   ├── stores/             # useNotesStore.ts (memori), useUIStore.ts (persist)
│   └── utils/              # SingleFlightQueue.ts
└── shared/                 # SHARED CODE (Types, Constants, Pure Utils)
    ├── types/              # note.ts, result.ts, api.ts
    ├── constants/          # ipc.ts (channel names)
    └── utils/              # timeSectioning.ts
```
*Detail tata letak file lengkap: lihat [`ARCHITECTURE.md §14`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L777-L908).*

---

## 6. Standar Penulisan Kode (Coding Standards)

- **Strict TypeScript:** `noImplicitAny: true`, `strictNullChecks: true`. Dilarang menggunakan tipe `any` (gunakan `unknown` dengan type guards/Zod jika tipe belum pasti).
- **Naming Conventions:**
  - Komponen React, Class, Interface, Type: `PascalCase` (mis. `MainWindowLayout.tsx`, `NoteRepository`).
  - Method, Fungsi, Variabel, Store: `camelCase` (mis. `createProtectedHandler`, `useNotesStore`).
  - Konstanta IPC & Enums: `UPPER_SNAKE_CASE` (mis. `IPC_CHANNELS.NOTES_CREATE`).
  - File non-komponen: `camelCase.ts` atau `PascalCase.ts` sesuai konteks class/use case.
- **Error Handling:** Semua kanal IPC mengembalikan tipe seragam `Result<T, AppErrorPayload>`:
  ```typescript
  type Result<T, E = AppErrorPayload> =
    | { success: true; data: T }
    | { success: false; error: E };
  ```
- **Komponen UI:** Simpan komponen shadcn/ui secara lokal di `src/renderer/components/ui/` (prinsip source ownership).

---

## 7. Protokol Keamanan & Anti-Kebocoran (Security & Zero-Leak)

1. **Konfigurasi BrowserWindow Mutlak:**
   - `sandbox: true`
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `webSecurity: true`
2. **Validasi Pengirim IPC:** Setiap panggilan IPC wajib dicek via `validateIpcSender(event)` untuk memastikan request hanya berasal dari `webContents` yang terdaftar di `WindowManager`.
3. **Navigasi Luar Terkunci:** Cegah `will-navigate`. Buka tautan eksternal (`http:`, `https:`, `mailto:`) hanya melalui `shell.openExternal()`. Blokir mutlak protokol `file:`, `javascript:`, atau `shell:`.
4. **Content Security Policy (CSP):** Meta tag ketat wajib ada di `index.html`.
5. **Zero Telemetry / Zero Cloud:** Tidak boleh ada pengiriman data ke server luar, analytics, atau layanan pemantau jarak jauh. Logging hanya disimpan di disk lokal via `electron-log`.

---

## 8. Konkurensi & Performa

- **Optimistic Concurrency Control (OCC):** Setiap mutasi `notes:update` wajib menyertakan `expectedRevision`. Main process menolak mutasi jika revisi di DB tidak cocok (`CONCURRENCY_ERROR`), mencegah *silent overwrites* lintas jendela.
- **Single-Flight Queue:** Renderer menggunakan antrean simpan satu arah di `SingleFlightQueue.ts` agar autosave pengetikan tidak tumpang tindih.
- **SQLite Single Source of Truth:** Seluruh data catatan hidup di `better-sqlite3` dengan mode WAL (`PRAGMA journal_mode = WAL;`) dan `PRAGMA synchronous = NORMAL;`.
- **Dilarang Persist Catatan ke LocalStorage:** `useNotesStore` (daftar catatan) murni di memori; `localStorage` hanya dipakai oleh `useUIStore` untuk preferensi ringan (tema, ukuran sidebar).
- **Anti-FOUC:** Tema (dark/light) dimuat sinkron sebelum React mount lewat inline script di `index.html` (lihat [`DESIGN.md §7`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/DESIGN.md#L264-L285)).

---

## 9. Aturan Pengujian (Testing Strategy)

Pengujian dibagi dalam 3 tier ketat (lihat [`ARCHITECTURE.md §13`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L770-L775)):
1. **Tier 1 (Unit):** Vitest 5.x untuk domain murni (`NoteContentExtractor`, `timeSectioning`, state logic).
2. **Tier 2 (Integration):** Vitest 5.x dengan SQLite in-memory (`:memory:`) untuk memvalidasi Use Cases, `NoteRepository`, transaksi OCC, dan migrasi skema.
3. **Tier 3 (E2E):** Playwright 1.63.x Electron untuk alur real-time cross-window sync, autosave, dan kontrol window.

---

## 10. Do & Don't Rules (STRICT)

### DO (Wajib Dilakukan)
- ✅ Baca dokumentasi acuan (`ARCHITECTURE.md`, `DESIGN.md`, `TASK.md`) sebelum menulis kode fitur.
- ✅ Pastikan setiap perubahan kode lulus `npm run lint` dan `npx tsc --noEmit`.
- ✅ Gunakan parameterized queries untuk setiap interaksi SQL SQLite.
- ✅ Tangani perbedaan OS (macOS traffic lights native vs Windows/Linux custom buttons) pada komponen TitleBar.
- ✅ Re-mount Editor.js dengan `key={note.id}` saat berganti catatan aktif untuk mencegah sisa state DOM.

### DON'T (Dilarang Keras)
- ❌ Jangan menambahkan library baru tanpa justifikasi arsitektur atau izin pengguna.
- ❌ Jangan pernah mengimpor modul Node.js (mis. `fs`, `path`, `child_process`) langsung di sisi Renderer.
- ❌ Jangan lakukan hardcode secret, API key, atau URL luar.
- ❌ Jangan membuat file `.md` dokumentasi baru tanpa instruksi eksplisit pengguna.
- ❌ Jangan bypass validasi Zod atau `validateSender` pada IPC handler.

---

## 11. Workflow AI Agent & Kriteria Selesai (Definition of Done)

### Alur Kerja Agent
1. **Pahami Konteks:** Periksa `TASK.md` untuk memahami lingkup kerja fase terkait.
2. **Periksa Kode Eksisting:** Selalu telusuri file yang bersinggungan sebelum membuat file baru.
3. **Tulis Kode Modular:** Tempatkan file sesuai pembagian folder Clean Architecture (§5).
4. **Verifikasi Statis & Dinamis:** Jalankan typecheck, lint, dan unit test relevan.

### Kriteria Selesai (Definition of Done)
Sebuah tugas dinyatakan selesai jika dan hanya jika:
1. Kode berhasil dikompilasi tanpa error TypeScript (`npx tsc --noEmit`).
2. Kode mematuhi standar ESLint flat config (`npm run lint`).
3. Seluruh unit/integration test yang terdampak lulus (`npm test`).
4. Batasan keamanan (sandbox, sender validation, zero-leak) terjaga penuh.
5. Struktur file selaras 100% dengan [`ARCHITECTURE.md §14`](file:///mnt/windows/Users/boyblanco/Documents/code/web/personal_note_electron/ARCHITECTURE.md#L777-L908).
