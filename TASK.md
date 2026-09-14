# TASK.md — Personal Note (Electron Desktop App)

> Diturunkan penuh dari `PRD-Personal-Note-App.md` dan `ARCHITECTURE.md` (v2.1.0, Approved).
> Dokumen ini adalah rencana kerja eksekusi tugas demi tugas, disusun granular per file/komponen agar bisa dikerjakan langsung oleh AI coding agent (mis. Claude Code) secara berurutan.

---

## 0. Asumsi & Keputusan Kunci (Ground Rules)

Keputusan-keputusan kunci ini **mengikat seluruh task di bawah** dan menyelesaikan konflik yang ditemukan antara PRD dan ARCHITECTURE.md:

1. **Status proyek: Greenfield.** Dibangun dari folder kosong, mengikuti struktur direktori di ARCHITECTURE.md §14 apa adanya. Tidak ada migrasi/refactor dari codebase tutorial lama.
2. **ARCHITECTURE.md v2.1.0 adalah single source of truth teknis.** Jika PRD ("Implementation Decisions") dan ARCHITECTURE.md berbeda, ARCHITECTURE.md menang. PRD kini telah diselaraskan dengan Architecture untuk 4 keputusan kunci:
   - **Skema tabel `notes`:** pakai kolom `title`, `snippet`, `revision`, `created_at`, `updated_at` terpisah (Architecture §6.2) — **bukan** derive timestamp dari konten Editor.js seperti disebut PRD lama. Alasan: dibutuhkan untuk index `updated_at`, OCC (`revision`), dan sidebar title/snippet tanpa parse ulang konten tiap render list.
   - **Operasi simpan:** **bukan** upsert tunggal seperti PRD lama sebut, melainkan `CreateNoteUseCase` dan `UpdateNoteUseCase` terpisah, dengan `UpdateNoteUseCase` menegakkan Optimistic Concurrency Control (`expectedRevision`) sesuai Architecture §7.
   - **Testing framework:** Vitest 5.x + Playwright 1.63.x + Testing Library (Architecture §13), **bukan** Jest seperti rekomendasi awal PRD.
   - **CI/CD:** PRD lama menandai "penyiapan CI/pipeline penuh" sebagai Out of Scope, tapi Architecture §16 sudah menyediakan konfigurasi siap pakai (`ci.yml`) sebagai bagian dari baseline production-ready. Diputuskan: **tetap dikerjakan** sebagai Fase 24 (bukan opsional).
3. **Granularitas:** setiap task idealnya = 1 file atau 1 komponen kohesif kecil. Task besar (mis. seluruh renderer) sengaja dipecah kecil-kecil supaya cocok dikerjakan satu-per-satu oleh AI tanpa context overload.

**Isu dari PRD "Further Notes" yang WAJIB dianggap selesai (bukan opsional) di baseline ini**, karena Architecture sudah mendesain solusinya:
| # | Isu di PRD | Task yang menyelesaikan |
|---|---|---|
| 1 | Cross-window sync hanya `CustomEvent` lokal per window, tidak sampai ke window lain | P4-T2 (`ElectronEventHub`), P10-T3 (`useSyncListener`) |
| 2 | Data catatan bisa ke-fetch dua kali saat startup | P15-T2 (`MainWindowLayout` single init) |
| 3 | Seluruh daftar catatan ikut disimpan ke localStorage lewat persist middleware | P9-T1 (`useNotesStore` non-persist), P9-T2 (`useUIStore` hanya state ringan) |
| 4 | Context menu klik-kanan pakai trik re-trigger event non-standar | P4-T3 (`MenuManager`), P6-T5 (`windowHandlers.ts`), P18-T2 (wiring akhir) |
| 5 | Delete lewat toolbar/ikon belum tuntas didemonstrasikan | Dinaikkan jadi wajib — P12-T3 (ikon hapus `NoteItem.tsx`), P14-T1 (`DeleteConfirmDialog`), US#24, US#25 |

**Legend status:** `[ ]` belum dikerjakan, `[x]` selesai. Update checkbox saat task selesai.

---

## Daftar Fase

0. Asumsi & Keputusan Kunci
1. Persiapan Proyek & Toolchain
2. Domain Layer & Shared Contracts
3. Infrastructure — Database & Durabilitas
4. Infrastructure — Windows, Events, Menu, Logger
5. Application Layer — Use Cases
6. IPC Gateway (Security, Schema, Handlers)
7. Preload Bridge
8. Application Lifecycle & Security Hardening (Main Entry Point)
9. Renderer — State Management (Zustand)
10. Renderer — Hooks & Utilitas Concurrency
11. Renderer — Shell & Window Chrome
12. Renderer — Sidebar / Daftar Catatan
13. Renderer — Editor Panel
14. Renderer — Dialog & Modal
15. Renderer — Komposisi App & Layout
16. Fitur Multi-Window
17. Fitur Dark Mode
18. Fitur Menu Bar & Context Menu
19. Testing — Unit Suite Regression & Coverage Verification
20. Testing — Integration Suite Regression & Concurrency Check
21. Testing — E2E Tier
22. Validasi Non-Functional Requirements
23. Packaging, Distribusi & Update Strategy
24. CI/CD Pipeline
25. QA Akhir & Release Readiness

> Catatan penomoran: daftar isi di atas memakai urutan kerja (dependency-first). Kode task tetap memakai prefix `P{n}` sesuai nomor fase supaya konsisten dirunut.

---

## Fase 1 — Persiapan Proyek & Toolchain

**Tujuan fase:** proyek bisa `npm start` menampilkan window Electron kosong, dengan seluruh tooling (TS strict, lint, format, Tailwind, native module rebuild) siap sebelum kode fitur ditulis.

- [x] **[P1-T1] Inisialisasi Electron Forge + Vite**
  - **Deskripsi:** Scaffold proyek baru pakai template `electron-forge` dengan plugin `@electron-forge/plugin-vite` (Vite 8.x). Ini fondasi build system: 3 config Vite terpisah (main/preload/renderer) plus HMR untuk React.
  - **File:** `package.json`, `forge.config.ts`, `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`
  - **Kriteria Selesai:** `npm start` membuka window Electron kosong tanpa error; HMR aktif saat file renderer diubah.
  - **Referensi:** Architecture §2, §14, §15.1–15.2.

- [x] **[P1-T2] Setup TypeScript Strict Mode**
  - **Deskripsi:** Buat `tsconfig.json` root dengan `strict: true` dan path yang konsisten untuk main/preload/renderer/shared, memastikan type-safety lintas batas IPC.
  - **File:** `tsconfig.json`
  - **Kriteria Selesai:** `tsc --noEmit` jalan tanpa error pada skeleton kosong.
  - **Referensi:** Architecture §2.

- [x] **[P1-T3] Setup ESLint 9 (Flat Config) + Prettier**
  - **Deskripsi:** Konfigurasi ESLint flat config dengan `typescript-eslint` (termasuk aturan React Hooks) untuk menangkap unused variable, unsafe `any`, dan pelanggaran arsitektur; Prettier terpisah dari ESLint (tanpa Husky pre-commit).
  - **File:** `eslint.config.mjs`, `.prettierrc`
  - **Kriteria Selesai:** `npm run lint` dan `npm run format:check` berjalan dan bisa dijalankan di CI nantinya.
  - **Referensi:** Architecture §2, §16.

- [x] **[P1-T4] Install & Konfigurasi Native Module Tooling**
  - **Deskripsi:** Pasang `better-sqlite3`, `@electron/rebuild`, dan `@electron-forge/plugin-auto-unpack-natives`. Pastikan binary native `.node` dikompilasi ulang terhadap ABI Electron dan diekstrak otomatis dari ASAR saat packaging.
  - **File:** `forge.config.ts` (plugin registration), `package.json`
  - **Kriteria Selesai:** `npx electron-rebuild` sukses; `require('better-sqlite3')` di main process tidak error saat app dijalankan dalam mode packaged.
  - **Referensi:** Architecture §2.

- [x] **[P1-T5] Externalize `better-sqlite3` dari Bundle Vite**
  - **Deskripsi:** Set `rollupOptions.external` di `vite.main.config.ts` agar `better-sqlite3` tidak ikut di-bundle (karena native binary, harus tetap sebagai dependency Node biasa).
  - **File:** `vite.main.config.ts`
  - **Kriteria Selesai:** Build production tidak mencoba bundle `better-sqlite3` ke dalam JS main process.
  - **Referensi:** Architecture §15.2.

- [x] **[P1-T6] Setup Tailwind CSS 4.3.x + CSS Variables Theme**
  - **Deskripsi:** Install Tailwind CSS versi 4.3.x pada `vite.renderer.config.ts`, siapkan skema warna berbasis CSS variable HSL untuk mendukung dark/light tanpa runtime overhead.
  - **File:** `vite.renderer.config.ts`, `src/renderer/assets/styles/globals.css`
  - **Kriteria Selesai:** Class utility Tailwind bisa dipakai di komponen React, variable warna HSL tersedia di `:root` dan `.dark`.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; class utility Tailwind ter-compile tanpa error styling.
  - **Referensi:** Architecture §2.

- [x] **[P1-T7] Setup shadcn/ui (Local Source Ownership) + Radix Primitives**
  - **Deskripsi:** Inisialisasi shadcn/ui dengan pola "local source ownership" (komponen di-copy ke repo, bukan dependency npm biasa), berbasis Radix UI primitives untuk aksesibilitas WAI-ARIA bawaan.
  - **File:** `components.json`, `src/renderer/lib/utils.ts`, `src/renderer/components/ui/` (folder awal, isi diisi di Fase 11)
  - **Kriteria Selesai:** CLI shadcn berhasil generate config (`components.json`) yang mengarah ke struktur folder Architecture §14, helper `cn` tersedia di `src/renderer/lib/utils.ts`.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; file `components.json` valid.
  - **Referensi:** Architecture §2, §14.

- [x] **[P1-T8] Setup Testing Toolchain (Vitest, Playwright, Testing Library)**
  - **Deskripsi:** Install dan konfigurasi Vitest 5.x (unit + integration), Playwright 1.63.x (E2E Electron), dan `@testing-library/react` 16.x. Siapkan folder `tests/unit`, `tests/integration`, `tests/e2e` kosong sesuai Architecture §14.
  - **File:** `vitest.config.ts`, `playwright.config.ts`, `tests/` (struktur folder)
  - **Kriteria Selesai:** Toolchain testing siap mengeksekusi test suite unit dan integrasi untuk fase-fase berikutnya.
  - **Verifikasi:** `npm run test:unit -- --passWithNoTests` dan `npm run test:integration -- --passWithNoTests` exit code 0; `npm run test:e2e` runnable tanpa error konfigurasi.
  - **Referensi:** Architecture §13, §14.

- [x] **[P1-T9] Setup Struktur Direktori Clean Architecture Kosong**
  - **Deskripsi:** Buat seluruh folder kosong (`src/main/{app,application,domain,infrastructure,ipc}`, `src/preload`, `src/renderer/{components,hooks,layouts,stores,utils,assets}`, `src/shared/{types,constants,utils}`) persis sesuai peta direktori Architecture §14, supaya task-task berikutnya tinggal isi file, bukan bikin struktur baru.
  - **File:** seluruh skeleton folder di `src/`
  - **Kriteria Selesai:** Struktur folder cocok 1:1 dengan diagram direktori di Architecture §14.
  - **Referensi:** Architecture §14.

- [x] **[P1-T10] Install Paket Dependensi Terkunci (Zod, Zustand, Editor.js, Virtualisasi, Logging, Radix UI)**
  - **Deskripsi:** Install seluruh dependensi pustaka runtime sesuai tabel spesifikasi Architecture §2 (Zod 4.x, Zustand 5.x, Editor.js 2.31.x suite, @tanstack/react-virtual 3.x, electron-log 5.4.x) serta Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-scroll-area`, `@radix-ui/react-slot`) dan `lucide-react`.
  - **File:** `package.json`
  - **Kriteria Selesai:** Seluruh paket eksternal terdaftar di `package.json`, lolos `npm install`, dan kompatibel dengan React 19 tanpa conflict.
  - **Verifikasi:** `npx tsc --noEmit`, `npm run lint`, dan `npm run test:unit` lulus 100%.
  - **Referensi:** Architecture §2, §14.

---

## Fase 2 — Domain Layer & Shared Contracts

**Tujuan fase:** kontrak tipe dan aturan bisnis murni yang dipakai lintas main/preload/renderer sudah didefinisikan sebelum layer lain dibangun (dependency inversion — semua bergantung ke sini, bukan sebaliknya).

- [x] **[P2-T1] Tipe Domain Bersama — `note.ts`**
  - **Deskripsi:** Definisikan `Note`, `NoteMetadata`, dan `GroupedNotes` (hasil pengelompokan waktu) sebagai tipe TypeScript murni yang dipakai main, preload, dan renderer.
  - **File:** `src/shared/types/note.ts`
  - **Kriteria Selesai:** Tipe mencakup field `id`, `title`, `snippet`, `content` (OutputData Editor.js), `revision`, `createdAt`, `updatedAt`.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus tanpa tipe `any`.
  - **Referensi:** Architecture §6.2, §8.2.

- [x] **[P2-T2] Kontrak `Result<T, E>` — `result.ts`**
  - **Deskripsi:** Definisikan discriminated union `Result<T, E = AppErrorPayload>` beserta `ErrorCode` (`VALIDATION_ERROR`, `NOT_FOUND`, `CONCURRENCY_ERROR`, `DATABASE_ERROR`, `IPC_SECURITY_ERROR`, `BACKUP_ERROR`, `INTERNAL_ERROR`) dan `AppErrorPayload`. Ini kontrak wajib untuk semua respons IPC.
  - **File:** `src/shared/types/result.ts`
  - **Kriteria Selesai:** Tipe cocok persis dengan Architecture §5.1.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §5.1.

- [x] **[P2-T3] Kontrak API Renderer — `api.ts`**
  - **Deskripsi:** Definisikan interface `window.electronAPI`, dipecah per Interface Segregation Principle: `notes`, `windowControls`, `backup` (jika diekspos), `theme`. Ini kontrak yang akan diimplementasikan preload bridge (Fase 7) dan dikonsumsi renderer.
  - **File:** `src/shared/types/api.ts`
  - **Kriteria Selesai:** Setiap sub-interface hanya berisi method yang relevan dengan tanggung jawabnya (client tidak bergantung pada fungsi yang tak diperlukan).
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §3.1 (ISP), PRD §Antarmuka Kunci.

- [x] **[P2-T4] Konstanta Kanal IPC — `ipc.ts`**
  - **Deskripsi:** Daftar semua nama channel IPC sebagai string constant (mis. `notes:create`, `notes:update`, `notes:delete`, `notes:getAll`, `notes:getById`, `NOTES_BROADCAST_CHANGED`, `window:minimize`, `window:maximize`, `window:close`, `windows:openChild`, `context-menu:show-note`), untuk mencegah typo string lepas di berbagai file.
  - **File:** `src/shared/constants/ipc.ts`
  - **Kriteria Selesai:** Semua handler dan preload nantinya mengimpor dari file ini, bukan hardcode string.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §14, §17 (Traceability Matrix).

- [x] **[P2-T5] Entity `Note` — `Note.ts` + Unit Test**
  - **Deskripsi:** Domain entity murni dengan invariant bisnis dasar (mis. revision tidak boleh negatif, title fallback `"Catatan Tanpa Judul"`). Tidak boleh punya dependency ke Electron/DB/React.
  - **File:** `src/main/domain/entities/Note.ts`, `tests/unit/Note.test.ts`
  - **Kriteria Selesai:** Entity tervalidasi dengan invariant bisnis ketat dan lulus uji unit tanpa mock.
  - **Verifikasi:** `npm run test:unit tests/unit/Note.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §3 (diagram Domain layer).

- [x] **[P2-T6] Interface Repository — `INoteRepository.ts`**
  - **Deskripsi:** Kontrak abstrak untuk akses data catatan: `create`, `update` (dengan `expectedRevision`), `delete`, `getAll`, `getById`. Use case bergantung pada interface ini, bukan implementasi konkret SQLite (Dependency Inversion).
  - **File:** `src/main/domain/repositories/INoteRepository.ts`
  - **Kriteria Selesai:** Signature method cukup untuk diimplementasikan baik oleh SQLite maupun in-memory (untuk testing).
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §3.1 (DIP, LSP).

- [x] **[P2-T7] Interface Event Hub — `IEventHub.ts`**
  - **Deskripsi:** Kontrak abstrak untuk broadcast mutasi data lintas window (`broadcastNoteMutation`), diimplementasikan konkret oleh `ElectronEventHub` di Fase 4.
  - **File:** `src/main/domain/services/IEventHub.ts`
  - **Kriteria Selesai:** Interface tidak menyebut `BrowserWindow`/`webContents` sama sekali (murni abstraksi domain).
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §3, §3.1 (DIP).

- [x] **[P2-T8] Domain Errors — `AppError.ts` + Unit Test**
  - **Deskripsi:** Kelas error domain (`AppError`) yang membawa `code: ErrorCode`, `message`, dan `details?`, dipakai use case untuk melempar error terstruktur yang nanti ditangkap `createProtectedHandler`.
  - **File:** `src/main/domain/errors/AppError.ts`, `tests/unit/AppError.test.ts`
  - **Kriteria Selesai:** Setiap `ErrorCode` di §5.1 punya cara jelas untuk dilempar via `AppError` dan menghasilkan payload terstruktur.
  - **Verifikasi:** `npm run test:unit tests/unit/AppError.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §5.2.

- [x] **[P2-T9] Domain Service — `NoteContentExtractor.ts` + Unit Test**
  - **Deskripsi:** Fungsi murni polimorfik yang mengubah blok Editor.js (`header`, `paragraph`, `list`, `checklist`, `code`, `quote`, dst) menjadi `{ title, snippet }` teks polos, dengan sanitasi HTML/entity. Tidak bergantung pada IPC/UI — murni transformasi data ke data.
  - **File:** `src/main/domain/services/NoteContentExtractor.ts`, `tests/unit/NoteContentExtractor.test.ts`
  - **Kriteria Selesai:** Menangani blok kosong (fallback `"Catatan Tanpa Judul"`), semua tipe blok yang didukung punya minimal 1 test case, dan membersihkan tag HTML/entity.
  - **Verifikasi:** `npm run test:unit tests/unit/NoteContentExtractor.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §8.1, §13; PRD US#10, US#11; PRD §Testing Decisions poin 1.

- [x] **[P2-T10] Domain Service — `timeSectioning.ts` + Unit Test**
  - **Deskripsi:** Fungsi murni `groupByTimeSection(notes, referenceDate)` yang mengelompokkan catatan ke `today`/`yesterday`/`previous` berdasarkan kalender lokal, masing-masing terurut dari terbaru ke terlama. Tidak bergantung React/Zustand/IPC.
  - **File:** `src/shared/utils/timeSectioning.ts`, `tests/unit/timeSectioning.test.ts`
  - **Kriteria Selesai:** Batas waktu dihitung dari awal hari lokal (kasus batas tengah malam tercakup), urutan grup selalu terbaru-ke-terlama.
  - **Verifikasi:** `npm run test:unit tests/unit/timeSectioning.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §8.2; PRD US#15, US#16; PRD §Testing Decisions poin 2.

---

## Fase 3 — Infrastructure: Database & Durabilitas

**Tujuan fase:** SQLite sebagai single source of truth siap, dengan migrasi, PRAGMA durability, dan pemulihan korupsi — sebelum use case apa pun menyentuhnya.

- [x] **[P3-T1] Koneksi Database & Pemulihan Korupsi — `DatabaseConnection.ts` + Integrasi Test**
  - **Deskripsi:** Singleton yang membuka SQLite di `app.getPath('userData')/personal_notes.db`, menjalankan `integrity_check`, dan bila korup: rename file lama ke `*.corrupt.<timestamp>.db` lalu buat database baru (auto-quarantine, bukan crash). Set PRAGMA `journal_mode=WAL`, `synchronous=NORMAL`, `foreign_keys=ON`, `busy_timeout=5000`.
  - **File:** `src/main/infrastructure/database/DatabaseConnection.ts`, `tests/integration/DatabaseConnection.test.ts`
  - **Kriteria Selesai:** `initialize()`, `getInstance()`, `close()` sesuai kode acuan; korupsi tidak membuat app crash, hanya isolasi file lama.
  - **Verifikasi:** `npm run test:integration tests/integration/DatabaseConnection.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §6.1, §6.3.

- [x] **[P3-T2] Migration Runner — `migrations.ts` + Integrasi Test**
  - **Deskripsi:** Sistem migrasi transaksional berbasis `PRAGMA user_version`. Migration pertama (`001_create_notes_table`) membuat tabel `notes` (`id` autoincrement, `title`, `snippet`, `content`, `revision` default 1, `created_at`, `updated_at`) plus index `idx_notes_updated_at`.
  - **File:** `src/main/infrastructure/database/migrations.ts`, `tests/integration/MigrationRunner.test.ts`
  - **Kriteria Selesai:** `MigrationRunner.run(db)` idempoten — jalan berkali-kali tidak mengulang migrasi yang sama; setiap migrasi dibungkus transaksi; `PRAGMA user_version` meningkat sesuai jumlah migrasi.
  - **Verifikasi:** `npm run test:integration tests/integration/MigrationRunner.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §6.2.

- [x] **[P3-T3] Implementasi Repository SQLite — `SQLiteNoteRepository.ts` + Integrasi Test**
  - **Deskripsi:** Implementasi konkret `INoteRepository` menggunakan `better-sqlite3`. `create` insert baru (`revision=1`), `update` melakukan `UPDATE ... WHERE id=? AND revision=?` (OCC — baris terpengaruh 0 berarti konflik), `delete` by id, `getAll` terurut `updated_at DESC`, `getById`. **Seluruh** query wajib parameterized (tidak ada string SQL mentah dari input user).
  - **File:** `src/main/infrastructure/repositories/SQLiteNoteRepository.ts`, `tests/integration/NoteRepository.test.ts`
  - **Kriteria Selesai:** Update dengan revisi salah mengembalikan 0 rows affected (bukan overwrite diam-diam); karakter spesial (kutip, simbol, emoji) tidak merusak query; pengujian menyeluruh terhadap in-memory database.
  - **Verifikasi:** `npm run test:integration tests/integration/NoteRepository.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §3.1 (LSP), §7, §13; PRD US#57, US#59; PRD §Testing Decisions poin 1.

- [ ] **[P3-T4] Backup Service — `BackupService.ts` + Integrasi Test**
  - **Deskripsi:** Rolling snapshot otomatis (maksimal 3 file) memakai SQLite Online Backup API (`db.backup()`), rotasi `notes.backup-1.db` → `-2` → `-3` sebelum menulis snapshot baru. Dipanggil saat app startup dan sebelum instalasi update (§15.3).
  - **File:** `src/main/infrastructure/backup/BackupService.ts`, `tests/integration/BackupService.test.ts`
  - **Kriteria Selesai:** Snapshot tidak pernah melebihi 3 file; backup berjalan tanpa mengunci database utama untuk operasi lain (non-blocking).
  - **Verifikasi:** `npm run test:integration tests/integration/BackupService.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §10.1, §15.3.

---

## Fase 4 — Infrastructure: Windows, Events, Menu, Logger

**Tujuan fase:** komponen infrastruktur non-database yang dibutuhkan oleh use case dan lifecycle app.

- [ ] **[P4-T1] Window Manager — `WindowManager.ts`**
  - **Deskripsi:** Kelola tracking seluruh `BrowserWindow` aktif (Map by `webContents.id`), `createMainWindow`, `createChildWindow(noteId)`, `getAllWindows`, `getMainWindow`, dan `isValidWebContents(id)` (dipakai validasi sender IPC di Fase 6).
  - **File:** `src/main/infrastructure/windows/WindowManager.ts`
  - **Kriteria Selesai:** Window baru otomatis terdaftar; window yang ditutup otomatis dihapus dari tracking map.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §4.3, §9, §14.

- [ ] **[P4-T2] Event Hub — `ElectronEventHub.ts` + Unit Test**
  - **Deskripsi:** Implementasi `IEventHub` yang menyiarkan mutasi data (`broadcastNoteMutation`) ke **seluruh** `BrowserWindow` terbuka lewat `webContents.send(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload)` — bukan `CustomEvent` lokal renderer. Ini **memperbaiki isu Further Notes #1** (sync lintas window tidak sampai ke window lain).
  - **File:** `src/main/infrastructure/events/ElectronEventHub.ts`, `tests/unit/ElectronEventHub.test.ts`
  - **Kriteria Selesai:** Mutasi dari window anak sampai ke window utama dan sebaliknya, tanpa perlu reload manual.
  - **Verifikasi:** `npm run test:unit tests/unit/ElectronEventHub.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §17 (PRD Further Note #1); PRD US#37.

- [ ] **[P4-T3] Menu Manager — `MenuManager.ts`**
  - **Deskripsi:** Bangun native application menu bar (item "Catatan Baru") dan handler context menu (`context-menu:show-note`) yang membawa payload `noteId` eksplisit lewat kanal IPC bersih (bukan trik re-trigger event). Ini **memperbaiki isu Further Notes #4**.
  - **File:** `src/main/infrastructure/menu/MenuManager.ts`
  - **Kriteria Selesai:** Klik "Catatan Baru" di menu bar memicu alur yang sama persis dengan tombol UI; context menu selalu merujuk `noteId` yang benar-benar diklik.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §17 (PRD Further Note #4); PRD US#52–55.

- [ ] **[P4-T4] Zero-Leak Logger — `logger.ts` + Unit Test**
  - **Deskripsi:** Konfigurasi `electron-log` dengan file rotation (maks 5MB), format timestamp, dan fungsi `sanitize()` yang me-redact field `content`/`blocks` sebelum ditulis ke log (mencegah kebocoran isi catatan pribadi ke file log).
  - **File:** `src/main/infrastructure/logger/logger.ts`, `tests/unit/logger.test.ts`
  - **Kriteria Selesai:** Log error/info/warn tersedia sebagai helper (`logger.info/warn/error`); isi catatan pengguna tidak pernah muncul mentah di file log.
  - **Verifikasi:** `npm run test:unit tests/unit/logger.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §11.

---

## Fase 5 — Application Layer: Use Cases

**Tujuan fase:** logika orkestrasi bisnis, hanya bergantung pada abstraksi domain (`INoteRepository`, `IEventHub`), bukan detail SQLite/Electron.

- [ ] **[P5-T1] `CreateNoteUseCase.ts` + Integrasi Test**
  - **Deskripsi:** Terima payload konten awal (boleh kosong), panggil `repository.create`, lalu broadcast mutasi lewat `IEventHub`. Harus selesai instan (<1 detik end-to-end sesuai NFR startup interaksi).
  - **File:** `src/main/application/notes/CreateNoteUseCase.ts`, `tests/integration/CreateNoteUseCase.test.ts`
  - **Kriteria Selesai:** Catatan baru langsung punya `id` valid dan revision 1, langsung ter-broadcast ke semua window.
  - **Verifikasi:** `npm run test:integration tests/integration/CreateNoteUseCase.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §17 (Kategori A); PRD US#1–6.

- [ ] **[P5-T2] `UpdateNoteUseCase.ts` (OCC Guard) + Integrasi Test**
  - **Deskripsi:** Terima `id`, `expectedRevision`, `content` baru. Panggil repository update; jika rows affected = 0, lempar `AppError('CONCURRENCY_ERROR', ...)`. Jika sukses, jalankan `NoteContentExtractor` untuk update title/snippet, lalu broadcast mutasi.
  - **File:** `src/main/application/notes/UpdateNoteUseCase.ts`, `tests/integration/UpdateNoteOCC.test.ts`
  - **Kriteria Selesai:** Konflik revisi terdeteksi dan dikembalikan sebagai error terstruktur, bukan silent overwrite; skenario race condition konkret tervalidasi otomatis.
  - **Verifikasi:** `npm run test:integration tests/integration/UpdateNoteOCC.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §7.1; PRD US#8, US#9.

- [ ] **[P5-T3] `DeleteNoteUseCase.ts` + Integrasi Test**
  - **Deskripsi:** Hapus catatan by id lewat repository, lalu broadcast mutasi penghapusan ke semua window (agar sidebar di window lain ikut update).
  - **File:** `src/main/application/notes/DeleteNoteUseCase.ts`, `tests/integration/DeleteNoteUseCase.test.ts`
  - **Kriteria Selesai:** Setelah dipanggil berulang cepat (banyak delete beruntun), tidak ada error/unresponsive; mutasi delete tersiar.
  - **Verifikasi:** `npm run test:integration tests/integration/DeleteNoteUseCase.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §17 (Kategori D); PRD US#24, US#27, US#29.

- [ ] **[P5-T4] `GetNotesUseCase.ts` + Integrasi Test**
  - **Deskripsi:** Ambil seluruh catatan terurut `updated_at DESC` dari repository. Dipanggil saat startup (single call, lihat P14-T2) dan refresh eksplisit.
  - **File:** `src/main/application/notes/GetNotesUseCase.ts`, `tests/integration/GetNotesUseCase.test.ts`
  - **Kriteria Selesai:** Hasil query siap langsung dikelompokkan oleh `timeSectioning` di renderer.
  - **Verifikasi:** `npm run test:integration tests/integration/GetNotesUseCase.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §17 (Kategori C); PRD US#22, US#23.

- [ ] **[P5-T5] `GetNoteByIdUseCase.ts` + Integrasi Test**
  - **Deskripsi:** Ambil satu catatan lengkap (termasuk `content` penuh) berdasarkan id, dipakai saat window anak dibuka atau saat user klik item di sidebar.
  - **File:** `src/main/application/notes/GetNoteByIdUseCase.ts`, `tests/integration/GetNoteByIdUseCase.test.ts`
  - **Kriteria Selesai:** Mengembalikan `NOT_FOUND` terstruktur jika id tidak ada.
  - **Verifikasi:** `npm run test:integration tests/integration/GetNoteByIdUseCase.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** PRD US#33.

- [ ] **[P5-T6] `OpenChildWindowUseCase.ts`**
  - **Deskripsi:** Buat `BrowserWindow` anak baru via `WindowManager`, dengan URL parameter `?type=child&noteId=<id>` supaya window anak sepenuhnya independen menentukan catatan yang ditampilkan (bukan lewat state global bersama).
  - **File:** `src/main/application/windows/OpenChildWindowUseCase.ts`
  - **Kriteria Selesai:** Bisa membuka lebih dari satu window anak sekaligus untuk catatan berbeda-beda; menutup satu window anak tidak memengaruhi window lain.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §17 (Kategori E); PRD US#30–36.

- [ ] **[P5-T7] `WindowControlsUseCase.ts`**
  - **Deskripsi:** Logika minimize/maximize(toggle)/close untuk window pemanggil, dengan pengecekan platform kondisional (API maximize tidak seragam di semua OS; tombol kustom disembunyikan total di macOS karena pakai traffic light native).
  - **File:** `src/main/application/windows/WindowControlsUseCase.ts`
  - **Kriteria Selesai:** Toggle maximize/restore bekerja dua arah; tidak error di platform mana pun.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** PRD §Keputusan Arsitektur — Multi Window; PRD US#43–45.

---

## Fase 6 — IPC Gateway (Security, Schema, Handlers)

**Tujuan fase:** satu-satunya gerbang antara renderer dan Application layer, dengan validasi sender + skema Zod sebelum use case dieksekusi.

- [ ] **[P6-T1] Validasi Sender IPC — `validateSender.ts` + Unit Test**
  - **Deskripsi:** Fungsi yang memverifikasi `event.sender` (webContents) benar-benar terdaftar di `WindowManager` sebelum request diproses. Melempar error `SECURITY_VIOLATION` bila tidak valid.
  - **File:** `src/main/ipc/security/validateSender.ts`, `tests/unit/validateSender.test.ts`
  - **Kriteria Selesai:** Request IPC dari sumber tak terdaftar ditolak sebelum menyentuh use case.
  - **Verifikasi:** `npm run test:unit tests/unit/validateSender.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §4.3.

- [ ] **[P6-T2] Wrapper Handler Terproteksi — `createHandler.ts` + Unit Test**
  - **Deskripsi:** `createProtectedHandler(schema, handler)` — urutan: validasi sender → parse Zod → eksekusi use case → bungkus hasil sebagai `Result<T>`. Menangkap `ZodError` → `VALIDATION_ERROR`, `AppError` → error code aslinya, error lain → `INTERNAL_ERROR` (di-log, pesan generik ke client).
  - **File:** `src/main/ipc/utils/createHandler.ts`, `tests/unit/createHandler.test.ts`
  - **Kriteria Selesai:** Semua path error mengembalikan bentuk `Result` yang konsisten, tidak pernah bocor stack trace mentah ke renderer.
  - **Verifikasi:** `npm run test:unit tests/unit/createHandler.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §5.2.

- [ ] **[P6-T3] Skema Zod — `noteSchemas.ts` + Unit Test**
  - **Deskripsi:** Skema validasi runtime untuk payload `create`, `update` (termasuk `expectedRevision`), `delete`, `getById`.
  - **File:** `src/main/ipc/schemas/noteSchemas.ts`, `tests/unit/noteSchemas.test.ts`
  - **Kriteria Selesai:** Payload tidak sesuai bentuk ditolak sebelum masuk ke use case.
  - **Verifikasi:** `npm run test:unit tests/unit/noteSchemas.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §4, §5.2.

- [ ] **[P6-T4] Handler Catatan — `noteHandlers.ts`**
  - **Deskripsi:** Registrasi `ipcMain.handle` untuk `notes:create`, `notes:update`, `notes:delete`, `notes:getAll`, `notes:getById`, masing-masing dibungkus `createProtectedHandler` dan memanggil use case terkait di Fase 5.
  - **File:** `src/main/ipc/handlers/noteHandlers.ts`
  - **Kriteria Selesai:** Setiap kanal punya 1:1 mapping ke use case, tidak ada logika bisnis bocor ke handler.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §17 (Kategori A–D).

- [ ] **[P6-T5] Handler Window & Context Menu — `windowHandlers.ts`**
  - **Deskripsi:** Registrasi `ipcMain.on` (one-way, tanpa nilai balik) untuk `window:minimize`, `window:maximize`, `window:close`, dan `windows:openChild`; plus kanal `context-menu:show-note` yang memicu context menu native dengan `noteId` eksplisit.
  - **File:** `src/main/ipc/handlers/windowHandlers.ts`
  - **Kriteria Selesai:** Perintah window tidak memakai pola request-response yang tidak perlu (sesuai keputusan pola komunikasi PRD §Antarmuka Kunci).
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** PRD §Antarmuka Kunci (pola IPC one-way vs request-response); Architecture §17 (PRD Further Note #4).

- [ ] **[P6-T6] Registry IPC — `index.ts`**
  - **Deskripsi:** Titik pendaftaran tunggal yang memanggil semua fungsi registrasi handler (`noteHandlers`, `windowHandlers`) saat app siap.
  - **File:** `src/main/ipc/index.ts`
  - **Kriteria Selesai:** Menambah handler baru di masa depan cukup daftar di satu tempat ini.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §14.

---

## Fase 7 — Preload Bridge

- [ ] **[P7-T1] Context Bridge — `preload/index.ts`**
  - **Deskripsi:** Ekspos `window.electronAPI` sesuai kontrak `api.ts` (Fase 2) via `contextBridge.exposeInMainWorld`, dipecah per sub-interface (`notes`, `windowControls`, `theme`, dst) sesuai Interface Segregation. 100% typed, nol penggunaan `any`. Termasuk registrasi listener untuk event broadcast (`onNotesChanged`) yang akan dipakai `useSyncListener` (Fase 10).
  - **File:** `src/preload/index.ts`
  - **Kriteria Selesai:** Renderer bisa memanggil `window.electronAPI.notes.create(...)` dst dengan type-safety penuh; tidak ada akses langsung ke modul Node dari renderer.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus tanpa ada modul Node (fs/path) yang terekspos ke window.
  - **Referensi:** Architecture §3.1 (ISP), §4.1; PRD §Antarmuka Kunci.

---

## Fase 8 — Application Lifecycle & Security Hardening (Main Entry Point)

**Tujuan fase:** menyatukan semua infrastruktur/IPC/menu menjadi satu proses main yang aman dan punya siklus hidup benar.

- [ ] **[P8-T1] Kebijakan Keamanan Navigasi — `security.ts` + Unit Test**
  - **Deskripsi:** `applySecurityPolicies(win)` — cegah `will-navigate` sembarang; intersepsi `window.open`/`target=_blank` lewat `setWindowOpenHandler`, hanya izinkan protokol `https:`, `http:`, `mailto:` dibuka via `shell.openExternal()`; protokol berbahaya (`file:`, `javascript:`, `data:`, `shell:`) diblokir total.
  - **File:** `src/main/app/security.ts`, `tests/unit/security.test.ts`
  - **Kriteria Selesai:** Klik link di dalam catatan membuka browser sistem, bukan navigasi window Electron; penolakan protokol berbahaya teruji.
  - **Verifikasi:** `npm run test:unit tests/unit/security.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §4.2.

- [ ] **[P8-T2] Konfigurasi BrowserWindow Aman**
  - **Deskripsi:** Pastikan setiap `BrowserWindow` (utama & anak) dibuat dengan `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, `allowRunningInsecureContent: false`, `frame: false`, dan path `preload` yang benar. Tambahkan meta tag CSP ketat di `index.html`.
  - **File:** `src/main/infrastructure/windows/WindowManager.ts` (opsi BrowserWindow), `src/renderer/index.html` (CSP meta)
  - **Kriteria Selesai:** DevTools security warning terkait sandbox/isolation tidak muncul; CSP memblokir inline script di luar kebutuhan.
  - **Verifikasi:** `npx tsc --noEmit` lulus; jalankan `npm start` dan verifikasi tidak ada warning keamanan di console DevTools.
  - **Referensi:** Architecture §4.1, §4.4.

- [ ] **[P8-T3] Siklus Hidup App & Single-Instance Lock — `AppLifecycle.ts`**
  - **Deskripsi:** `requestSingleInstanceLock()` (quit jika sudah ada instance lain, fokuskan window utama pada `second-instance`); `app.whenReady()` → inisialisasi DB → rolling backup awal → buat window utama; handle `activate` (macOS reopen), `window-all-closed` (quit di non-macOS), `before-quit` (tutup koneksi DB dengan bersih).
  - **File:** `src/main/app/AppLifecycle.ts`
  - **Kriteria Selesai:** Membuka aplikasi dua kali hanya fokus ke instance pertama, tidak membuat dua instance database.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §9.

- [ ] **[P8-T4] Entry Point Main Process — `main/index.ts`**
  - **Deskripsi:** Bootstrap final: panggil `AppLifecycle.bootstrap()`, daftarkan `MenuManager`, daftarkan IPC registry (`src/main/ipc/index.ts`), terapkan `applySecurityPolicies` ke setiap window baru.
  - **File:** `src/main/index.ts`
  - **Kriteria Selesai:** Menjalankan `npm start` menghasilkan app fungsional end-to-end untuk fase-fase yang sudah selesai sejauh ini (bisa buat window, DB siap, IPC terdaftar).
  - **Verifikasi:** `npm start` bootstrap tanpa error terminal atau crash; `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §14 (main/index.ts).

---

## Fase 9 — Renderer: State Management (Zustand)

- [ ] **[P9-T1] Notes Store (Runtime, Non-Persist) — `useNotesStore.ts` + Unit Test**
  - **Deskripsi:** Store Zustand untuk daftar catatan **di memori runtime saja** (diambil ulang dari SQLite via IPC saat dibutuhkan), **tidak** dipersist penuh ke localStorage. Ini memperbaiki isu Further Notes #3 (risiko bloat localStorage). Sediakan satu fungsi generik setter berbasis "nama field + nilai" (bukan setter terpisah per field), sesuai rekomendasi modul yang diuji di PRD §Testing Decisions poin 3.
  - **File:** `src/renderer/stores/useNotesStore.ts`, `tests/unit/useNotesStore.test.ts`
  - **Kriteria Selesai:** Refresh manual App tidak kehilangan performa karena localStorage besar; setter generik teruji unit terisolasi (field lain tidak berubah).
  - **Verifikasi:** `npm run test:unit tests/unit/useNotesStore.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §17 (PRD Further Note #3); PRD §Testing Decisions poin 3.

- [ ] **[P9-T2] UI Store (Persist Ringan) — `useUIStore.ts` + Unit Test**
  - **Deskripsi:** Store Zustand dengan middleware `persist` **hanya** untuk state ringan: `theme`, `sidebarWidth`, `activeNoteId`. Data catatan penuh tetap eksklusif di SQLite.
  - **File:** `src/renderer/stores/useUIStore.ts`, `tests/unit/useUIStore.test.ts`
  - **Kriteria Selesai:** Isi localStorage app tetap kecil (beberapa KB) berapa pun jumlah catatan pengguna; setter state UI teruji.
  - **Verifikasi:** `npm run test:unit tests/unit/useUIStore.test.ts` lulus; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §17 (PRD Further Note #3); PRD US#49.

---

## Fase 10 — Renderer: Hooks & Utilitas Concurrency

- [ ] **[P10-T1] Single-Flight Queue — `SingleFlightQueue.ts` + Unit Test**
  - **Deskripsi:** Antrean sisi renderer yang memastikan hanya ada satu request autosave "in-flight" pada satu waktu; request baru selama masih ada yang berjalan ditumpuk sebagai `pendingPayload` dan diproses setelah yang aktif selesai (anti race-condition pengetikan cepat).
  - **File:** `src/renderer/utils/SingleFlightQueue.ts`, `tests/unit/SingleFlightQueue.test.ts`
  - **Kriteria Selesai:** Mengetik cepat berturut-turut tidak memicu banyak request IPC paralel yang saling menyalip; pemrosesan payload pending tervalidasi.
  - **Verifikasi:** `npm run test:unit tests/unit/SingleFlightQueue.test.ts` lulus 100%; `npx tsc --noEmit` lulus.
  - **Referensi:** Architecture §7.2.

- [ ] **[P10-T2] Hook Editor & Autosave — `useEditor.ts`**
  - **Deskripsi:** Wrapper lifecycle Editor.js: init/destroy instance sesuai catatan aktif, debounce autosave (600ms sesuai Traceability Matrix), kirim ke `SingleFlightQueue` → IPC `notes:update` dengan `expectedRevision` yang dilacak lokal. Jika hasil `CONCURRENCY_ERROR`, trigger `ConflictResolveDialog` (Fase 14).
  - **File:** `src/renderer/hooks/useEditor.ts`
  - **Kriteria Selesai:** Autosave tidak terjadi di setiap keystroke, hanya setelah jeda; konflik revisi memunculkan dialog, bukan silent fail.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §17 (Kategori B); PRD US#8, US#9.

- [ ] **[P10-T3] Hook Sinkronisasi Broadcast — `useSyncListener.ts`**
  - **Deskripsi:** Dengarkan event broadcast dari main process (`NOTES_BROADCAST_CHANGED` via `window.electronAPI.notes.onBroadcastChanged`) dan update `useNotesStore` di window mana pun — termasuk window anak. Ini bagian renderer dari perbaikan Further Notes #1.
  - **File:** `src/renderer/hooks/useSyncListener.ts`
  - **Kriteria Selesai:** Edit di window anak langsung terlihat di window utama tanpa reload manual, dan sebaliknya.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §17 (PRD Further Note #1); PRD US#37.

---

## Fase 11 — Renderer: Shell & Window Chrome

- [ ] **[P11-T1] Komponen shadcn/ui Dasar**
  - **Deskripsi:** Generate/isi komponen lokal `button`, `dialog`, `alert-dialog`, `scroll-area` dari shadcn/ui (berbasis Radix), disesuaikan dengan token warna dari `globals.css`.
  - **File:** `src/renderer/components/ui/*`
  - **Kriteria Selesai:** Komponen dasar ini dipakai ulang oleh semua komponen fitur di fase berikutnya, aksesibel via keyboard.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; komponen UI ter-export valid.
  - **Referensi:** Architecture §2, §12 (WCAG 2.1 AA).

- [ ] **[P11-T2] Title Bar — `TitleBar.tsx`**
  - **Deskripsi:** Header custom frameless dengan area drag (`-webkit-app-region: drag`) untuk memindahkan window, memastikan tombol-tombol di dalamnya (`-webkit-app-region: no-drag`) tetap bisa diklik normal (tidak "tertelan" area drag).
  - **File:** `src/renderer/components/chrome/TitleBar.tsx`
  - **Kriteria Selesai:** Drag window berfungsi dari area kosong header; klik tombol kontrol tetap responsif.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; verifikasi via `npm start` drag window dan klik tombol kontrol responsif.
  - **Referensi:** Architecture §17 (Kategori F); PRD US#38–40.

- [ ] **[P11-T3] Window Controls Adaptif — `WindowControls.tsx`**
  - **Deskripsi:** Di macOS, sembunyikan seluruh tombol kustom (pakai traffic light native). Di Windows/Linux, tampilkan tombol minimize/maximize(toggle icon)/close kustom yang memanggil `window.electronAPI.windowControls.*`.
  - **File:** `src/renderer/components/chrome/WindowControls.tsx`
  - **Kriteria Selesai:** Perilaku benar di kedua kelompok platform (dicek via `process.platform` yang diekspos preload atau deteksi runtime lain yang aman).
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; kontrol tersembunyi di macOS dan tampil di Linux/Windows.
  - **Referensi:** Architecture §17 (Kategori F); PRD US#41–45.

- [ ] **[P11-T4] Splitter Resizer Sidebar/Editor**
  - **Deskripsi:** Komponen pemisah yang bisa diseret untuk mengubah lebar sidebar, dengan lebar minimum dan default yang wajar (dipersist ke `useUIStore.sidebarWidth`).
  - **File:** `src/renderer/layouts/MainWindowLayout.tsx` (atau komponen splitter khusus)
  - **Kriteria Selesai:** Lebar sidebar tidak bisa diseret melewati batas minimum; nilai lebar bertahan setelah app ditutup-buka lagi.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; resize interaktif bertahan di localStorage.
  - **Referensi:** PRD US#46, US#47.

---

## Fase 12 — Renderer: Sidebar / Daftar Catatan

- [ ] **[P12-T1] `NoteList.tsx` (Virtualized)**
  - **Deskripsi:** Render daftar catatan terkelompok, otomatis memakai `@tanstack/react-virtual` saat jumlah catatan >300 item agar DOM tetap ringan (mendukung skala hingga 10.000+ catatan).
  - **File:** `src/renderer/components/sidebar/NoteList.tsx`
  - **Kriteria Selesai:** Scroll tetap mulus pada dataset besar; di bawah 300 item render biasa (tanpa overhead virtualisasi tidak perlu).
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; virtualisasi aktif saat list item >300.
  - **Referensi:** Architecture §12 (NFR Skalabilitas), §17 (Kategori C).

- [ ] **[P12-T2] `TimeSectionGroup.tsx`**
  - **Deskripsi:** Render header grup ("Hari ini" / "Kemarin" / "Sebelumnya") beserta daftar `NoteItem` di dalamnya, berdasarkan hasil `timeSectioning`.
  - **File:** `src/renderer/components/sidebar/TimeSectionGroup.tsx`
  - **Kriteria Selesai:** Urutan grup selalu Hari ini → Kemarin → Sebelumnya; grup kosong tidak tampil sebagai section kosong yang aneh.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** PRD US#15, US#16.

- [ ] **[P12-T3] `NoteItem.tsx`**
  - **Deskripsi:** Item catatan tunggal: judul, snippet, penanda visual aktif (warna latar beda), klik untuk set sebagai catatan aktif, ikon tombol hapus (tempat sampah) untuk memicu `DeleteConfirmDialog` (US#24), dan trigger context menu (`onContextMenu`) yang mengirim `noteId` item yang **benar-benar diklik** — bukan catatan aktif saat ini.
  - **File:** `src/renderer/components/sidebar/NoteItem.tsx`
  - **Kriteria Selesai:** Klik kanan pada item non-aktif tetap menunjukkan context menu untuk item tersebut, bukan item aktif; tombol ikon tempat sampah membuka dialog konfirmasi hapus untuk catatan yang bersangkutan.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; context menu dan dialog delete menerima noteId yang tepat.
  - **Referensi:** PRD US#17, US#18, US#24, US#54, US#55.

- [ ] **[P12-T4] Empty States Sidebar & Toolbar "Catatan Baru"**
  - **Deskripsi:** Tampilan kosong yang jelas saat belum ada catatan sama sekali (dengan CTA buat catatan baru), dan tombol "Catatan Baru" di toolbar sidebar untuk kondisi daftar sudah berisi.
  - **File:** `src/renderer/components/sidebar/` (empty state + toolbar button)
  - **Kriteria Selesai:** Kedua entry point pembuatan catatan (empty state & toolbar) memanggil use case yang sama persis.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; create note terpicu dari kedua tombol.
  - **Referensi:** PRD US#1, US#2, US#20.

- [ ] **[P12-T5] Independent Scroll Sidebar**
  - **Deskripsi:** Pastikan area scroll sidebar (pakai `scroll-area` dari shadcn/ui) independen dari scroll area editor, keduanya tidak saling memengaruhi.
  - **File:** `src/renderer/layouts/MainWindowLayout.tsx`
  - **Kriteria Selesai:** Scroll di sidebar tidak menggerakkan editor dan sebaliknya.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; scrollbar editor dan sidebar terisolasi mandiri.
  - **Referensi:** PRD US#19.

---

## Fase 13 — Renderer: Editor Panel

- [ ] **[P13-T1] `NoteEditorContainer.tsx`**
  - **Deskripsi:** Pembungkus Editor.js dengan `key={note.id}` agar React benar-benar me-remount instance saat berpindah catatan (mencegah bug "konten catatan lama tersisa"). Header tetap terlihat (sticky) saat konten discroll; area konten scrollable independen.
  - **File:** `src/renderer/components/editor/NoteEditorContainer.tsx`
  - **Kriteria Selesai:** Berpindah dari catatan A ke B tidak pernah menampilkan sisa konten A sesaat pun.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; instance Editor.js me-remount saat id berganti.
  - **Referensi:** PRD US#12, US#13; Architecture §17 (Kategori B).

- [ ] **[P13-T2] Registry Tool Editor.js**
  - **Deskripsi:** Daftarkan tool resmi Editor.js: Header, Nested List, Checklist, Code, Quote, Delimiter — dapat diekstensi tanpa mengubah kode inti editor (Open/Closed Principle).
  - **File:** `src/renderer/components/editor/editorTools.ts`
  - **Kriteria Selesai:** Semua tool di daftar Architecture §2 tersedia dan berfungsi di editor.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §2, §3.1 (OCP); PRD US#7.

- [ ] **[P13-T3] Empty State Editor (Tanpa Catatan Aktif)**
  - **Deskripsi:** Tampilan kosong yang jelas di panel editor saat belum ada catatan yang dipilih/aktif.
  - **File:** `src/renderer/components/editor/` (empty state)
  - **Kriteria Selesai:** Tidak ada area kosong "rusak" tanpa penjelasan saat tidak ada catatan aktif.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** PRD US#21.

---

## Fase 14 — Renderer: Dialog & Modal

- [ ] **[P14-T1] `DeleteConfirmDialog.tsx`**
  - **Deskripsi:** `AlertDialog` (Radix) dengan teks konfirmasi eksplisit ("Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan."). Setelah konfirmasi: panggil delete, lalu jika catatan yang dihapus adalah catatan aktif, otomatis pilih catatan lain yang tersisa (atau tampilkan empty state jika tidak ada catatan tersisa).
  - **File:** `src/renderer/components/dialogs/DeleteConfirmDialog.tsx`
  - **Kriteria Selesai:** Tidak pernah menghapus tanpa konfirmasi; fallback pemilihan catatan aktif berikutnya selalu terjadi.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; konfirmasi memicu penghapusan catatan.
  - **Referensi:** PRD US#24–28.

- [ ] **[P14-T2] `ConflictResolveDialog.tsx`**
  - **Deskripsi:** Muncul saat `useEditor` menerima `CONCURRENCY_ERROR` dari autosave. Tawarkan opsi reload (ambil versi terbaru dari server) sesuai alur di Architecture §7.1.
  - **File:** `src/renderer/components/dialogs/ConflictResolveDialog.tsx`
  - **Kriteria Selesai:** User tidak pernah kehilangan data secara diam-diam saat terjadi konflik revisi antar window.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; dialog menampilkan opsi resolusi reload.
  - **Referensi:** Architecture §7.1; PRD US#60.

- [ ] **[P14-T3] `UpdateNoticeDialog.tsx` / Toast Update**
  - **Deskripsi:** Banner/toast yang muncul saat versi rilis GitHub lebih baru dari `app.getVersion()`, menampilkan changelog ringkas dan tombol "Unduh Pembaruan" yang membuka URL rilis via `shell.openExternal()`.
  - **File:** `src/renderer/components/dialogs/UpdateNoticeDialog.tsx`
  - **Kriteria Selesai:** Klik tombol membuka browser sistem ke halaman rilis, tidak menavigasi window Electron itu sendiri.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** Architecture §15.3; PRD US#61.

---

## Fase 15 — Renderer: Komposisi App & Layout

- [ ] **[P15-T1] `App.tsx` — Branching Main vs Child**
  - **Deskripsi:** Baca query param `?type=child` untuk menentukan apakah render `MainWindowLayout` (sidebar + editor) atau `ChildWindowLayout` (editor saja).
  - **File:** `src/renderer/App.tsx`
  - **Kriteria Selesai:** Window anak tidak pernah menampilkan sidebar penuh.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; route param `?type=child` terverifikasi.
  - **Referensi:** Architecture §17 (Kategori E); PRD US#32.

- [ ] **[P15-T2] `MainWindowLayout.tsx` — Single Initial Fetch**
  - **Deskripsi:** Layout jendela utama (TitleBar + Sidebar + Editor) dengan **satu** jalur pengambilan data awal saat mount (bukan dua — sekali dari "echo" langsung, sekali dari broadcast terpisah). Ini memperbaiki Further Notes #2.
  - **File:** `src/renderer/layouts/MainWindowLayout.tsx`
  - **Kriteria Selesai:** Data awal tampil instan tanpa flash kosong, dan tidak ada duplikasi state akibat dua sumber fetch.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; fetch notes hanya dipanggil satu kali saat initial render.
  - **Referensi:** Architecture §17 (PRD Further Note #2); PRD US#22, US#23.

- [ ] **[P15-T3] `ChildWindowLayout.tsx`**
  - **Deskripsi:** Layout jendela sekunder (TitleBar + Editor saja), baca `noteId` dari URL param, fetch catatan tersebut via `GetNoteByIdUseCase`.
  - **File:** `src/renderer/layouts/ChildWindowLayout.tsx`
  - **Kriteria Selesai:** Window anak selalu memuat catatan yang benar sesuai id di URL.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus.
  - **Referensi:** PRD US#33.

- [ ] **[P15-T4] `main.tsx` & `index.html`**
  - **Deskripsi:** Entry point React DOM root render; `index.html` tunggal dengan CSP meta tag (Fase 8) dan **inline script anti-FOUC** yang menerapkan class tema tersimpan **sebelum** React mounting.
  - **File:** `src/renderer/main.tsx`, `src/renderer/index.html`
  - **Kriteria Selesai:** Tidak ada kedipan tema salah sesaat sebelum tema benar diterapkan.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; inline anti-FOUC script tereksekusi sebelum render root.
  - **Referensi:** Architecture §17 (Kategori G); PRD US#50.

---

## Fase 16 — Fitur Multi-Window

- [ ] **[P16-T1] Tombol "Buka di Jendela Baru" (Toolbar Editor)**
  - **Deskripsi:** Tombol di toolbar editor yang memanggil `windows:openChild` dengan `noteId` catatan aktif.
  - **File:** `src/renderer/components/editor/` (tombol toolbar)
  - **Kriteria Selesai:** Window baru terbuka menampilkan catatan yang sama persis.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; verifikasi via `npm start` window anak terbuka dengan noteId aktif.
  - **Referensi:** PRD US#30.

- [ ] **[P16-T2] Aksi "Buka di Jendela Baru" (Context Menu)**
  - **Deskripsi:** Item context menu klik-kanan pada `NoteItem` yang memanggil use case yang sama seperti P16-T1, tanpa perlu membuka catatan itu dulu di window utama.
  - **File:** `src/renderer/components/sidebar/NoteItem.tsx` (wiring context menu)
  - **Kriteria Selesai:** Bisa langsung membuka window baru dari klik kanan di sidebar.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; verifikasi via `npm start` context menu membuka window baru.
  - **Referensi:** PRD US#31.

- [ ] **[P16-T3] Verifikasi Isolasi & Sinkronisasi Window Anak**
  - **Deskripsi:** Uji manual/terstruktur: beberapa window anak untuk catatan berbeda berjalan independen; menutup satu tidak memengaruhi yang lain; edit di window anak sinkron ke window lain via `useSyncListener` (Fase 10).
  - **File:** N/A (verifikasi lintas komponen sudah dibangun)
  - **Kriteria Selesai:** Semua kriteria US#34–37 terpenuhi termasuk sinkronisasi real-time.
  - **Verifikasi:** Jalankan `npm start`, buka 2 window anak, edit catatan dan pastikan sinkronisasi antar jendela berjalan instan.
  - **Referensi:** PRD US#34–37.

---

## Fase 17 — Fitur Dark Mode

- [ ] **[P17-T1] Toggle Dark/Light Mode**
  - **Deskripsi:** Saklar UI yang mengubah `useUIStore.theme` dan menerapkan class `dark`/`light` di root elemen.
  - **File:** komponen toggle di `src/renderer/components/` (mis. bagian header/settings)
  - **Kriteria Selesai:** Toggle berfungsi dua arah dan tersimpan persisten.
  - **Verifikasi:** `npx tsc --noEmit` dan `npm run lint` lulus; verifikasi perubahan class `.dark` pada `<html>` dan persistensi di localStorage.
  - **Referensi:** PRD US#48, US#49.

- [ ] **[P17-T2] Audit Konsistensi Tema Seluruh Komponen**
  - **Deskripsi:** Pastikan seluruh komponen (header, sidebar, editor, dialog, tombol) memakai CSS variable HSL dari `globals.css` sehingga otomatis konsisten saat tema berubah — tidak ada komponen yang "ketinggalan" tema.
  - **File:** review lintas `src/renderer/components/**`
  - **Kriteria Selesai:** Tidak ditemukan elemen hardcode warna yang tidak mengikuti variable tema.
  - **Verifikasi:** `npm run lint` lulus; grep codebase untuk memastikan tidak ada hardcoded color codes (seperti `#fff`, `#000`) di luar token theme.
  - **Referensi:** PRD US#51.

---

## Fase 18 — Fitur Menu Bar & Context Menu (Wiring Akhir)

- [ ] **[P18-T1] Verifikasi Menu Bar "Catatan Baru"**
  - **Deskripsi:** Pastikan item menu native memicu `CreateNoteUseCase` yang sama dengan tombol UI, dan hasilnya langsung tampil aktif di window utama.
  - **File:** N/A (verifikasi `MenuManager` dari Fase 4 + IPC dari Fase 6)
  - **Kriteria Selesai:** Hasil dari menu bar identik dengan hasil dari tombol UI.
  - **Verifikasi:** Jalankan `npm start`, klik menu bar "File -> Catatan Baru" (atau shortcut Cmd/Ctrl+N) dan verifikasi catatan baru langsung aktif di UI.
  - **Referensi:** PRD US#52, US#53.

- [ ] **[P18-T2] Verifikasi Context Menu (Minimal 2 Aksi)**
  - **Deskripsi:** Pastikan context menu pada item catatan berisi minimal "Buka di jendela baru" dan "Hapus", dan selalu merujuk pada `noteId` item yang diklik-kanan.
  - **File:** N/A (verifikasi P12-T3 + P4-T3 + P6-T5)
  - **Kriteria Selesai:** Tidak ada kasus context menu "salah sasaran" catatan.
  - **Verifikasi:** Jalankan `npm start`, klik-kanan item catatan non-aktif dan pastikan menu bertindak pada item tersebut.
  - **Referensi:** PRD US#54, US#55.

---

## Fase 19 — Testing: Unit Suite Regression & Coverage Verification

- [ ] **[P19-T1] Eksekusi Full Unit Test Suite & Audit Coverage**
  - **Deskripsi:** Jalankan seluruh unit test suite yang sudah dibangun bersamaan dengan fitur (Domain, Services, IPC utils, Stores, Concurrency queue) menggunakan Vitest dengan reporting coverage. Pastikan coverage modul domain dan utilitas murni mencapai target >85%.
  - **File:** `tests/unit/**/*.test.ts`, `vitest.config.ts`
  - **Kriteria Selesai:** Seluruh unit test suite lulus 100% tanpa mock yang bocor; coverage target tercapai.
  - **Verifikasi:** `npm run test:unit -- --coverage` lulus 100% dengan exit code 0.
  - **Referensi:** Architecture §13; PRD §Testing Decisions poin 1–3.

- [ ] **[P19-T2] Hardening Edge Cases & Boundary Values**
  - **Deskripsi:** Audit dan uji kasus batas ekstrem pada domain service: payload blok JSON rusak/malformed pada `NoteContentExtractor`, pergantian tahun kabisat dan daylight saving time pada `timeSectioning`, serta isolasi mutasi state tak terduga pada Zustand store.
  - **File:** `tests/unit/NoteContentExtractor.test.ts`, `tests/unit/timeSectioning.test.ts`, `tests/unit/useNotesStore.test.ts`
  - **Kriteria Selesai:** Tidak ada unhandled exception atau crash saat menerima input malformed/ekstrem.
  - **Verifikasi:** `npm run test:unit` mencakup skenario boundary tambahan dan seluruhnya lulus.
  - **Referensi:** Architecture §8, §13.

---

## Fase 20 — Testing: Integration Suite Regression & Concurrency Check

- [ ] **[P20-T1] Eksekusi Full Integration Test Suite (SQLite `:memory:`)**
  - **Deskripsi:** Jalankan seluruh rangkaian tes integrasi database dan use case: `DatabaseConnection`, `MigrationRunner`, `NoteRepository`, `CreateNoteUseCase`, `UpdateNoteUseCase`, `DeleteNoteUseCase`, `GetNotesUseCase`, dan `GetNoteByIdUseCase` terhadap SQLite in-memory murni.
  - **File:** `tests/integration/**/*.test.ts`
  - **Kriteria Selesai:** Seluruh tes integrasi lulus 100% tanpa error disk locking atau database corruption.
  - **Verifikasi:** `npm run test:integration` lulus 100% dengan exit code 0.
  - **Referensi:** Architecture §3.1, §6, §13.

- [ ] **[P20-T2] Simulasi OCC Concurrency & Stress Race Condition**
  - **Deskripsi:** Uji beban konkurensi: simulasikan window virtual melakukan update secara simultan terhadap catatan yang sama dengan revisi berbeda dan sama, pastikan hanya 1 update yang lolos per revisi dan sisanya menerima `CONCURRENCY_ERROR`.
  - **File:** `tests/integration/UpdateNoteOCC.test.ts`
  - **Kriteria Selesai:** Mekanisme OCC terbukti 100% tahan race condition tanpa silent overwrite.
  - **Verifikasi:** `npm run test:integration tests/integration/UpdateNoteOCC.test.ts` lulus tanpa anomali data.
  - **Referensi:** Architecture §7.1.

- [ ] **[P20-T3] Verifikasi Durabilitas Migrasi & Auto-Quarantine Recovery**
  - **Deskripsi:** Simulasikan file database korup (header acak) saat inisialisasi dan verifikasi mekanisme auto-quarantine berhasil membuat database fresh baru tanpa app crash, serta snapshot backup dapat di-restore dengan utuh.
  - **File:** `tests/integration/DatabaseConnection.test.ts`, `tests/integration/BackupService.test.ts`
  - **Kriteria Selesai:** Database korup otomatis diisolasi (`*.corrupt.<timestamp>.db`) dan app tetap berjalan normal.
  - **Verifikasi:** `npm run test:integration` skenario korupsi lulus 100%.
  - **Referensi:** Architecture §6.1, §6.3, §10.1.

---

## Fase 21 — Testing: E2E Tier (Playwright Electron)

- [ ] **[P21-T1] `multiWindowSync.spec.ts`**
  - **Deskripsi:** Skenario penuh: buka window anak untuk catatan X, edit di window anak, verifikasi window utama menerima update tanpa reload manual.
  - **File:** `tests/e2e/multiWindowSync.spec.ts`
  - **Kriteria Selesai:** Sinkronisasi multi-window bekerja real-time di Electron nyata.
  - **Verifikasi:** `npm run test:e2e tests/e2e/multiWindowSync.spec.ts` lulus.
  - **Referensi:** Architecture §13; PRD US#37.

- [ ] **[P21-T2] `noteAutosaveFlow.spec.ts`**
  - **Deskripsi:** Skenario: ketik di editor, tunggu debounce, verifikasi tersimpan (mis. reload dan cek konten tetap ada), verifikasi tidak ada request tersimpan di setiap keystroke.
  - **File:** `tests/e2e/noteAutosaveFlow.spec.ts`
  - **Kriteria Selesai:** Test memverifikasi jeda debounce dan hasil akhir tersimpan benar.
  - **Verifikasi:** `npm run test:e2e tests/e2e/noteAutosaveFlow.spec.ts` lulus.
  - **Referensi:** PRD US#8, US#9.

- [ ] **[P21-T3] E2E Tambahan: Delete Confirm & Drag Region**
  - **Deskripsi:** Skenario hapus catatan dengan dialog konfirmasi (batal vs konfirmasi), dan verifikasi area drag title bar tidak menelan klik tombol kontrol window.
  - **File:** `tests/e2e/deleteAndChrome.spec.ts`
  - **Kriteria Selesai:** Kedua alur tervalidasi otomatis lintas window Electron nyata (bukan mock DOM biasa).
  - **Verifikasi:** `npm run test:e2e tests/e2e/deleteAndChrome.spec.ts` lulus.
  - **Referensi:** Architecture §13; PRD US#26, US#40.

---

## Fase 22 — Validasi Non-Functional Requirements

- [ ] **[P22-T1] Profiling Performa**
  - **Deskripsi:** Ukur cold startup (target <800ms sampai UI siap ketik), note switching latency (<50ms), autosave commit time (<30ms), memory footprint idle (<150MB). Catat hasil dan bandingkan dengan target Architecture §12.
  - **File:** dokumentasi hasil profiling (mis. `docs/performance-report.md`)
  - **Kriteria Selesai:** Semua metrik terukur dan berada di bawah ambang target, atau ada catatan tindak lanjut jika belum.
  - **Referensi:** Architecture §12.

- [ ] **[P22-T2] Audit Aksesibilitas (WCAG 2.1 AA)**
  - **Deskripsi:** Verifikasi navigasi keyboard penuh (`Tab`, `Esc`, `Enter`), ARIA roles bawaan Radix pada semua dialog/menu, dan dukungan `motion-reduce:` pada animasi.
  - **File:** checklist a11y (mis. `docs/a11y-checklist.md`)
  - **Kriteria Selesai:** Semua interaksi utama bisa dilakukan tanpa mouse.
  - **Referensi:** Architecture §12.

---

## Fase 23 — Packaging, Distribusi & Update Strategy

- [ ] **[P23-T1] Konfigurasi Makers — `forge.config.ts` Final**
  - **Deskripsi:** Lengkapi `forge.config.ts` dengan `MakerSquirrel` (Windows, dengan `setupIcon`), `MakerZIP` (darwin/win32/linux), `MakerDMG` (macOS, dengan icon), `MakerDeb`/`MakerRpm` (Linux, dengan kategori Utility).
  - **File:** `forge.config.ts`
  - **Kriteria Selesai:** `npm run package`/`make` menghasilkan installer untuk ketiga platform di CI matrix (Fase 24).
  - **Referensi:** Architecture §15.1.

- [ ] **[P23-T2] Manual Update Notification**
  - **Deskripsi:** Saat app ready, cek endpoint GitHub Releases (`/repos/:owner/:repo/releases/latest`) tiap interval 24 jam. Jika versi lebih baru dari `app.getVersion()`, tampilkan toast/banner (via `UpdateNoticeDialog`, Fase 14) dengan tombol yang membuka URL rilis di browser sistem. Sebelum user menutup app untuk instal versi baru, pastikan `BackupService.createRollingSnapshot()` sudah jalan.
  - **File:** `src/main/infrastructure/update/UpdateChecker.ts` (baru) + wiring ke `AppLifecycle.ts`
  - **Kriteria Selesai:** Tidak ada auto-download/auto-install daemon berjalan di background (sesuai keputusan "aman tanpa risiko kegagalan daemon").
  - **Referensi:** Architecture §15.3; PRD US#61.

---

## Fase 24 — CI/CD Pipeline (GitHub Actions)

- [ ] **[P24-T1] `ci.yml` — Lint, Test, Build Matrix**
  - **Deskripsi:** Workflow 3 job berurutan: `lint-and-typecheck` (ESLint + `tsc --noEmit`) → `test-unit-integration` (Vitest unit + integration) → `build-matrix` (windows-latest/macos-latest/ubuntu-latest, jalankan `@electron/rebuild` lalu `npm run package`). Trigger pada push/PR ke `main`.
  - **File:** `.github/workflows/ci.yml`
  - **Kriteria Selesai:** PR ke `main` otomatis menjalankan seluruh pipeline dan gagal jika salah satu job gagal.
  - **Referensi:** Architecture §16.

---

## Fase 25 — QA Akhir & Release Readiness

- [ ] **[P25-T1] Cross-Check Traceability Matrix**
  - **Deskripsi:** Telusuri satu per satu User Story #1–#59 dari PRD terhadap fitur yang sudah diimplementasikan, memakai tabel Traceability Matrix Architecture §17 sebagai checklist verifikasi akhir.
  - **File:** N/A (checklist manual/dokumentasi QA)
  - **Kriteria Selesai:** Tidak ada User Story yang belum terpenuhi tanpa alasan eksplisit (dan alasan itu didokumentasikan bila memang sengaja dikeluarkan, mis. item di "Out of Scope" PRD).
  - **Referensi:** Architecture §17; PRD seluruh User Stories.

- [ ] **[P25-T2] Verifikasi Semua "Further Notes" Sudah Tuntas**
  - **Deskripsi:** Konfirmasi ulang kelima isu di tabel Bagian 0 (sync lintas window, duplikasi fetch startup, bloat localStorage, context menu non-standar, delete toolbar) benar-benar teratasi di build final, bukan cuma di level desain dokumen.
  - **File:** N/A (checklist QA)
  - **Kriteria Selesai:** Semua 5 baris tabel di Bagian 0 bisa dicentang selesai dengan bukti (test otomatis lulus atau verifikasi manual terekam).
  - **Referensi:** PRD §Further Notes; Architecture §17.

- [ ] **[P25-T3] Sanity Check "Out of Scope"**
  - **Deskripsi:** Pastikan hal-hal yang secara eksplisit di luar cakupan PRD **tidak** sengaja atau tidak sengaja terbangun/terganggu: sinkronisasi cloud, akun/login, ekspor PDF/Markdown, versi mobile/web, fitur pencarian teks, tag/label, undo/redo di luar bawaan Editor.js, enkripsi SQLite.
  - **File:** N/A (checklist QA)
  - **Kriteria Selesai:** Tidak ada scope creep yang menambah kompleksitas di luar PRD tanpa keputusan sadar.
  - **Referensi:** PRD §Out of Scope.

---

## Ringkasan Jumlah Task per Fase

| Fase | Nama | Jumlah Task |
|---|---|---|
| 1 | Persiapan Proyek & Toolchain | 9 |
| 2 | Domain Layer & Shared Contracts | 10 |
| 3 | Infrastructure — Database & Durabilitas | 4 |
| 4 | Infrastructure — Windows, Events, Menu, Logger | 4 |
| 5 | Application Layer — Use Cases | 7 |
| 6 | IPC Gateway | 6 |
| 7 | Preload Bridge | 1 |
| 8 | Lifecycle & Security Hardening | 4 |
| 9 | Renderer — State Management | 2 |
| 10 | Renderer — Hooks & Concurrency | 3 |
| 11 | Renderer — Shell & Window Chrome | 4 |
| 12 | Renderer — Sidebar | 5 |
| 13 | Renderer — Editor Panel | 3 |
| 14 | Renderer — Dialog & Modal | 3 |
| 15 | Renderer — Komposisi App & Layout | 4 |
| 16 | Fitur Multi-Window | 3 |
| 17 | Fitur Dark Mode | 2 |
| 18 | Fitur Menu Bar & Context Menu | 2 |
| 19 | Testing — Unit Suite Regression & Coverage | 2 |
| 20 | Testing — Integration Suite Regression & Stress | 3 |
| 21 | Testing — E2E Tier | 3 |
| 22 | Validasi NFR | 2 |
| 23 | Packaging & Update | 2 |
| 24 | CI/CD Pipeline | 1 |
| 25 | QA Akhir & Release Readiness | 3 |
| **Total** | | **92 task** |

---

## Cara Pakai Dokumen Ini dengan AI Coding Agent

1. Kerjakan fase **berurutan** (1 → 25) — urutan ini sengaja disusun dependency-first (domain → infra → application → IPC → preload → main entry → renderer → testing → packaging → CI).
2. Untuk tiap task, beri AI **hanya** task tersebut + referensi bagian Architecture/PRD yang disebut, supaya konteksnya fokus dan tidak overload.
3. Centang `[x]` setelah task selesai dan lulus **Kriteria Selesai** serta langkah **Verifikasi**-nya sebelum lanjut ke task berikutnya dalam fase yang sama.
4. **TDD / Shift-Left Testing:** Unit test dan integrasi test dibuat serta diverifikasi langsung bersamaan pada task fitur terkait di Fase 2–10. Fase 19–20 difokuskan untuk eksekusi suite regresi penuh, audit coverage (>85%), dan stress test OCC konkurensi.
5. Fase 25 adalah gerbang rilis — jangan tandai proyek selesai sebelum ketiga task di fase ini lulus.
