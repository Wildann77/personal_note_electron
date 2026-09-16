---
name: Personal Note
colors:
  dark:
    background: "#000000"
    foreground: "#ffffff"
    brand: "#9146ff"        # Ultraviolet Accent
    primary: "#9146ff"
    primary-foreground: "#ffffff"
    card: "#18181b"
    card-foreground: "#f4f4f5"
    popover: "#18181b"
    popover-foreground: "#f4f4f5"
    muted: "#27272a"
    muted-foreground: "#a1a1aa"
    border: "#1f1f23"
    input: "#27272a"
    ring: "#9146ff"
    accent: "#9146ff"
    accent-foreground: "#ffffff"
    destructive: "#f43f5e"
    destructive-foreground: "#ffffff"
    success: "#10b981"
    warning: "#eab308"

  light:
    background: "#ffffff"
    foreground: "#09090b"
    brand: "#9146ff"
    primary: "#9146ff"
    primary-foreground: "#ffffff"
    card: "#f7f7f8"
    card-foreground: "#09090b"
    popover: "#ffffff"
    popover-foreground: "#09090b"
    muted: "#f4f4f5"
    muted-foreground: "#71717a"
    border: "#e5e5e7"
    input: "#e4e4e7"
    ring: "#9146ff"
    accent: "#9146ff"
    accent-foreground: "#ffffff"
    destructive: "#e11d48"
    destructive-foreground: "#ffffff"
    success: "#059669"
    warning: "#ca8a04"

typography:
  fontFamily:
    sans: "Roobert, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  chrome:
    fontSize: "12px"
    lineHeight: "1.4"
  sidebar:
    titleFontSize: "13px"
    snippetFontSize: "12px"
    timestampFontSize: "11px"
    lineHeight: "1.45"
  editor:
    fontSize: "15.5px"
    lineHeight: "1.65"
    heading1:
      fontSize: "26px"
      fontWeight: "700"
      lineHeight: "1.3"
      letterSpacing: "-0.025em"
    heading2:
      fontSize: "21px"
      fontWeight: "600"
      lineHeight: "1.35"
      letterSpacing: "-0.02em"
    heading3:
      fontSize: "17px"
      fontWeight: "600"
      lineHeight: "1.4"
      letterSpacing: "-0.015em"

layout:
  titleBarHeight: "38px"
  sidebar:
    minWidth: "220px"
    defaultWidth: "280px"
    maxWidth: "480px"
  editor:
    maxWidth: "740px"

rounded:
  sm: "4px"
  default: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
---

# Design System: Personal Note Desktop

## 1. Ikhtisar & Filosofi Desain

Sistem desain **Personal Note** dirancang khusus untuk aplikasi desktop pencatat *local-first* (Electron + React + SQLite + Editor.js + shadcn/ui). Mengutamakan fokus menulis tanpa distraksi (*calm craft*), ergonomi jendela desktop modern, dan responsivitas instan dengan estetika kontras tajam.

### Prinsip Utama:
1. **Distraction-Free Writing Canvas:** Editor teks block-based menjadi panggung utama. Elemen chrome (header, sidebar, toolbar) bersifat hening (*quiet UI*), memberi ruang visual maksimal pada tulisan.
2. **Tactile Desktop Ergonomics:** Jendela frameless dengan header kustom yang bisa diseret (*draggable*), tombol kontrol jendela adaptif per-platform (macOS traffic lights native vs Windows/Linux custom controls), dan splitter resizer yang responsif.
3. **Split Information Density:** 
   - **Sidebar:** Padat dan efisien (13px base) untuk navigasi cepat ratusan catatan terkelompok waktu.
   - **Editor:** Lapang dan nyaman (15.5px base, line-height 1.65, max-width 740px terpusat) untuk mencegah kelelahan mata saat sesi menulis panjang.
4. **Subtle Surface Depth:** Menggunakan kanvas hitam pekat (`#000000`), elevasi permukaan (`#18181b`), dan batas tipis (`#1f1f23`) yang dipadu dengan aksen Ultraviolet (`#9146ff`) untuk penanda status dan elemen interaktif utama.
5. **No Visual Fluff:** Transisi mikro instan (120ms - 150ms ease-out), tanpa animasi berlebihan yang memperlambat alur kerja produktivitas.

---

## 2. Palet Warna & Pemetaan Token shadcn/ui (Tailwind CSS 4.3.x)

Arsitektur token warna dirancang berbasis **CSS Variables (HSL)** pada `src/renderer/assets/styles/globals.css` untuk kompatibilitas penuh dengan komponen shadcn/ui dan pergantian tema tanpa *flash* (*anti-FOUC*).

### 2.1 Nilai Warna Dasar

| Token Name | Dark Mode (Hex / HSL) | Light Mode (Hex / HSL) | Peran UI |
| :--- | :--- | :--- | :--- |
| **`--background`** | `#000000` (`0 0% 0%`) | `#ffffff` (`0 0% 100%`) | Kanvas dasar aplikasi |
| **`--foreground`** | `#ffffff` (`0 0% 100%`) | `#09090b` (`240 10% 3.9%`) | Teks utama |
| **`--card`** | `#18181b` (`240 5% 10%`) | `#f7f7f8` (`240 5% 97%`) | Permukaan sidebar item & dialog |
| **`--card-foreground`** | `#f4f4f5` (`240 5% 96%`) | `#09090b` (`240 10% 3.9%`) | Teks di atas card |
| **`--primary`** | `#9146ff` (`264 100% 64%`) | `#9146ff` (`264 100% 64%`) | Aksen Ultraviolet utama, tombol primer |
| **`--primary-foreground`**| `#ffffff` (`0 0% 100%`) | `#ffffff` (`0 0% 100%`) | Teks di atas tombol primer |
| **`--muted`** | `#27272a` (`240 4% 16%`) | `#f4f4f5` (`240 5% 96%`) | Latar hover item, separator |
| **`--muted-foreground`** | `#a1a1aa` (`240 5% 65%`) | `#71717a` (`240 4% 46%`) | Teks snippet, timestamp, caption |
| **`--border`** | `#1f1f23` (`240 6% 13%`) | `#e5e5e7` (`240 3% 90%`) | Border splitter, pemisah header |
| **`--input`** | `#27272a` (`240 4% 16%`) | `#e4e4e7` (`240 5% 90%`) | Border form input / search |
| **`--ring`** | `#9146ff` (`264 100% 64%`) | `#9146ff` (`264 100% 64%`) | Outline aksesibilitas fokus keyboard |
| **`--destructive`** | `#f43f5e` (`349 89% 60%`) | `#e11d48` (`347 77% 50%`) | Tombol hapus & dialog konfirmasi (Rose) |
| **`--success`** | `#10b981` (`160 84% 39%`) | `#059669` (`160 84% 39%`) | Indikator auto-save tersimpan (Emerald) |
| **`--warning`** | `#eab308` (`48 96% 53%`) | `#ca8a04` (`42 93% 40%`) | Indikator konflik revisi OCC (Ochre) |

---

## 3. Tipografi & Hirarki Teks

Menggunakan perpaduan sans-serif geometris modern (**Roobert** / **Inter**) untuk keterbacaan tinggi di layar monitor.

```
+---------------------------------------------------------------------------------+
| Window Chrome / Header (12px, font-medium, tracking-tight)                     |
+---------------------------------------+-----------------------------------------+
| SIDEBAR (Density: Compact)            | EDITOR (Density: Comfortable)           |
|                                       |                                         |
| Group Header: 11px uppercase tracking | Document H1: 26px font-bold             |
| Note Title:   13px font-semibold      | Document H2: 21px font-semibold         |
| Note Snippet: 12px font-normal muted  | Document H3: 17px font-semibold         |
| Timestamp:    11px font-normal muted  | Body Text:   15.5px line-height: 1.65   |
|                                       | Code Blocks: 13.5px font-mono           |
+---------------------------------------+-----------------------------------------+
```

### 3.1 Aturan Tipografi
- **Tanpa Huruf Kapital Semua (No ALL-CAPS):** Judul catatan dan konten mengikuti sentence case natural. Hanya header kelompok waktu ("HARI INI", "KEMARIN", "SEBELUMNYA") yang menggunakan huruf kapital kecil (*tracked small caps*, 10-11px, `letter-spacing: 0.05em`) sebagai penanda hierarki navigasi.
- **Line Length Ideal Editor:** Area teks editor dibatasi maksimal `740px` (sekitar 75-80 karakter per baris) agar mata tidak lelah menyusuri baris panjang.

---

## 4. Struktur Tata Letak & Window Chrome (Frameless)

### 4.1 Visual Wireframe Layout Jendela Utama

```
+-----------------------------------------------------------------------------------------+
| [AppName]     [Sync Status]  | (drag area)   [Auto-save Dot] [Open Window] [_] [口] [X] |  <- Split TitleBar (38px)
+------------------------------+----------------------------------------------------------+
|  + Toolbar: [Catatan Baru +] |                                                          |
|------------------------------|                      EDITOR CANVAS                       |
|  ▼ HARI INI                  |                   (Max-width: 740px)                     |
|  +------------------------+  |                                                          |
|  || Catatan Rapat Penting |  |  # Catatan Rapat Penting                                 |
|  || Pembahasan arsitek... |  |                                                          |
|  || 09:15                 |  |  Rapat membahas sinkronisasi multi-window dengan         |
|  +------------------------+  |  pendekatan Optimistic Concurrency Control (OCC)...      |
|  (Active: Border Ungu Kiri)  |                                                          |
|                              |  - Blok 1: Poin arsitektur                               |
|  Catatan Desain UI           |  - Blok 2: Keputusan SQLite WAL                          |
|  Diskusi warna dan fon...    |                                                          |
|  08:30                       |                                                          |
|                              |                                                          |
|  ▼ KEMARIN                   |                                                          |
|  Daftar Belanja Mingguan     |                                                          |
|  Kopi, susu oat, telu...     |                                                          |
|                              |                                                          |
|  [|| Splitter Resizer]       |                                                          |
+------------------------------+----------------------------------------------------------+
```

### 4.2 Split TitleBar (Window Chrome)
- **Tinggi Bar:** `38px` tepat.
- **Drag Region:** Area kosong menggunakan `-webkit-app-region: drag`. Seluruh tombol interaktif (kontrol jendela, tombol toolbar, switch tema) wajib eksplisit `-webkit-app-region: no-drag` agar klik tidak tertelan.
- **Platform Adaptation:**
  - **macOS:** Tombol native traffic-lights ditampilkan di pojok kiri atas sidebar. Tombol kustom Windows/Linux disembunyikan.
  - **Windows / Linux:** Tombol traffic-lights disembunyikan. Tombol kustom minimize (`_`), maximize/restore (`口`), dan close (`✕`) diletakkan di pojok kanan atas editor header. Tombol close berubah warna saat di-hover (`bg-[#f43f5e] text-white`).
- **Gaya Split Header:** Header terbelah sejajar dengan splitter sidebar:
  - Header Sidebar: Menampilkan identitas aplikasi & tombol toggle tema dark/light.
  - Header Editor: Menampilkan indikator status auto-save (dot hijau "Tersimpan" / dot kuning "Menyimpan...") dan tombol aksi `Buka di Jendela Baru` (ikon pop-out).

### 4.3 Splitter Resizer
- Garis vertikal pemisah berlebar `1px` (`border-border`), dengan hit-box transparan `6px` (`cursor-col-resize`) untuk kenyamanan penarikan kursor.
- Lebar batas: Minimum `220px`, bawaan `280px`, maksimum `480px`. Nilai lebar disimpan ke `useUIStore.sidebarWidth`.

---

## 5. Spesifikasi Komponen UI (shadcn/ui + Radix)

### 5.1 Sidebar Note Item (`NoteItem.tsx`)
- **Idle State:** Latar transparan, judul putih (`text-foreground`), cuplikan abu-abu (`text-muted-foreground`), tombol hapus (ikon tempat sampah) ber-opacity `0` (muncul hanya saat item di-hover `opacity-100`).
- **Hover State:** Latar berubah menjadi `bg-muted/50`, transisi 120ms.
- **Active State (Catatan Terpilih):**
  - Latar berubah menjadi `bg-card` (kontras dengan latar `#000000` sidebar).
  - **Penanda Aksen Kiri:** Garis vertikal `3px` solid warna Ultraviolet (`bg-[#9146ff]`) menempel di sisi kiri item dengan radius rounded `2px`.
  - Teks judul tetap kontras tegas.
- **Context Menu Trigger:** Klik-kanan memunculkan menu native dengan aksi `"Buka di Jendela Baru"` dan `"Hapus Catatan"`.

### 5.2 Block Editor Canvas (`NoteEditorContainer.tsx`)
- Membungkus Editor.js 2.31.x dengan styling kustom pada elemen blok:
  - Paragraf: `text-[15.5px] leading-[1.65] text-foreground`
  - Headings (H1/H2/H3): margin top proporsional, font-weight 600/700, tracking rapat.
  - Checklist: Kotak centang kustom dengan aksen brand violet saat tercentang.
  - Code Block: Latar `bg-card`, border `border-border`, font monospace `13.5px`, padding `12px`.
  - Inline Tools: Toolbar melayang Editor.js bergaya dark mode mengikuti token `--popover` dan `--border`.

### 5.3 Dialog Konfirmasi & Resolusi (Radix AlertDialog / Dialog)
1. **`DeleteConfirmDialog`:**
   - Judul: "Hapus Catatan Ini?"
   - Deskripsi: "Catatan akan dihapus permanen dari database lokal. Tindakan ini tidak dapat dibatalkan."
   - Aksi: Tombol Batal (`variant="outline"`) dan Tombol Hapus (`variant="destructive"` dengan latar rose `#f43f5e`).
2. **`ConflictResolveDialog` (Optimistic Concurrency Control):**
   - Muncul saat ada revisi bersamaan lintas window.
   - Header beraksen kuning/amber (`text-warning`).
   - Pilihan: "Muat Ulang dari Database" (menimpa draft lokal) vs "Salin Isi Lokal" (menyalin teks ke clipboard sebelum reload).
3. **`UpdateNoticeDialog`:**
   - Menginfokan versi baru tersedia di GitHub Releases.
   - Tombol utama: "Unduh di Browser" (`variant="default"` violet), membuka tautan rilis eksternal.

### 5.4 Empty States
- **Sidebar Kosong (Belum Ada Catatan):**
  - Ikon buku/pensil minimalis dengan warna `text-muted-foreground`.
  - Teks: "Belum ada catatan".
  - Tombol CTA: `[+ Buat Catatan Pertama]` (`variant="default"`, warna brand).
- **Editor Kosong (Belum Ada Catatan Aktif Dipilih):**
  - Terpusat di tengah editor canvas.
  - Teks ramah: "Pilih catatan dari daftar di samping, atau buat catatan baru untuk mulai menulis."
  - Hanya muncul jika pengguna belum memilih catatan (`activeNoteId === null`).

### 5.5 Loading States & Skeleton (Standar UI - shadcn/ui)
- Komponen `Skeleton` (`src/renderer/components/ui/skeleton.tsx`) menjadi standar resmi indikator pemuatan UI (*loading state*) di seluruh aplikasi untuk mencegah visual layout shift dan flickering.
- **Transisi Catatan (`EditorSkeleton.tsx`):**
  - Saat berpindah catatan di sidebar, canvas editor dilarang menampilkan Empty State sesaat (anti-glitch/flicker).
  - Tampilkan `EditorSkeleton` dengan animasi pulse halus (`animate-pulse bg-muted/60`), meniru placeholder sticky header dan susunan blok teks editor canvas 740px selagi query IPC berlangsung.
  - Begitu data catatan tiba, instance editor langsung me-remount bersih (`key={activeNote.id}`).

---

## 6. Aksesibilitas, Fokus & Gerakan (Motion)

- **Fokus Keyboard (WAI-ARIA):** Seluruh elemen interaktif memiliki `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none`.
- **Navigasi Keyboard:** List catatan di sidebar mendukung navigasi panah atas/bawah dan tombol Enter untuk membuka catatan.
- **Motion Durations:**
  - Dialog / Overlay Open: `150ms ease-out`
  - Hover background & border: `120ms ease-in-out`
  - Auto-save status pulse: `300ms ease`
  - Resizer Splitter: `0ms` (responsif real-time tanpa animasi lag).
- **Reduced Motion:** Saat OS mengaktifkan mode reduced motion, seluruh transisi instan (`transition: none !important`).

---

## 7. Anti-FOUC (Flash of Unstyled Content / Theme Flash)

Untuk memenuhi PRD US #50, tema (dark / light) dimuat secara sinkron di `index.html` sebelum React DOM pertama kali di-mount:
```html
<script>
  (function() {
    try {
      const stored = localStorage.getItem('personal-note-ui-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.theme === 'light') {
          document.documentElement.classList.remove('dark');
          return;
        }
      }
    } catch (e) {}
    document.documentElement.classList.add('dark');
  })();
</script>
```
Ini menjamin kanvas tidak berkedip putih sesaat ketika aplikasi dibuka dalam tema gelap.
