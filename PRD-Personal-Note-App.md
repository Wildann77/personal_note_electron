# PRD: Personal Note — Aplikasi Desktop Notes (Electron + React + SQLite)

> Dokumen ini adalah Spesifikasi Kebutuhan Produk (PRD) resmi untuk Personal Note Desktop App. Menjadi acuan tunggal perilaku fungsional (pembuatan, pengeditan, penghapusan note, multi-window, dark mode, custom title bar, durabilitas SQLite, OCC, dan update notification), diselaraskan 100% dengan ARCHITECTURE.md v2.1.0 dan TASK.md.

---

## Problem Statement

Sebagai pengguna, saya membutuhkan aplikasi pencatat (notes) versi **desktop** yang:

- Bisa dipakai **offline**, cepat dibuka, dan tidak bergantung pada koneksi internet atau akun cloud.
- Memungkinkan saya membuat, mengedit, dan menghapus catatan dengan editor **block-based** (bukan sekadar textarea polos), sehingga pengalaman menulis terasa modern dan terstruktur.
- Memungkinkan saya membuka **beberapa catatan sekaligus di jendela terpisah**, karena saya sering ingin membandingkan atau menyalin isi dari satu catatan ke catatan lain tanpa harus berpindah-pindah tab dalam satu jendela saja.
- Menampilkan daftar catatan saya secara **terorganisir berdasarkan waktu** (Hari ini, Kemarin, Sebelumnya), sehingga catatan yang baru saya kerjakan mudah ditemukan tanpa harus mencari manual.
- Memberi saya kendali penuh atas jendela aplikasi (minimize, maximize, close) dengan tampilan yang **konsisten dengan kebiasaan platform saya** — tombol native di macOS, tombol custom di Windows/Linux — sekaligus tetap terasa modern dengan **frameless window** yang bisa saya seret (drag) sendiri.
- Memiliki **mode gelap (dark mode)** yang bisa saya nyalakan/matikan, dan pilihan saya diingat setiap kali saya membuka ulang aplikasi.
- Bisa **menghapus catatan** dengan aman (ada konfirmasi), baik lewat tombol maupun klik kanan.
- Tidak kehilangan data saat aplikasi ditutup — semua catatan harus tersimpan secara persisten di perangkat saya.

Saat ini belum ada solusi yang memenuhi semua kebutuhan tersebut sekaligus dalam satu aplikasi ringan yang saya kendalikan sendiri datanya (self-hosted/local-first).

---

## Solution

Dari sudut pandang pengguna, solusinya adalah aplikasi desktop **"Personal Note"** yang dibangun di atas Electron (via Electron Forge) dengan React + TypeScript sebagai lapisan UI, Tailwind CSS + shadcn/ui untuk styling komponen, Editor.js sebagai block editor, Zustand sebagai state management, dan SQLite sebagai database lokal penyimpan catatan.

Pengguna akan mendapatkan:

1. **Panel kiri (sidebar)** berisi daftar seluruh catatan, dikelompokkan berdasarkan waktu terakhir diedit (Hari ini / Kemarin / Sebelumnya), diurutkan dari yang paling baru diedit ke yang paling lama.
2. **Panel kanan (editor)** yang menampilkan editor block-based untuk catatan yang sedang aktif, dengan auto-save setiap kali ada perubahan.
3. **Header custom** tanpa frame bawaan OS, bisa diseret (drag) untuk memindahkan jendela, dengan tombol kontrol jendela yang menyesuaikan platform.
4. **Multi-window**: pengguna bisa membuka catatan tertentu di jendela baru (via tombol "buka di tab baru"/menu klik-kanan/menu aplikasi), agar bisa mengedit beberapa catatan secara paralel.
5. **Context menu** (klik kanan) pada item catatan untuk aksi cepat: buka di jendela baru, hapus catatan.
6. **Menu aplikasi native** (menu bar) dengan opsi "Catatan Baru" yang bisa dipicu tanpa menyentuh mouse ke tombol UI.
7. **Toggle dark/light mode** yang disimpan secara persisten dan otomatis diterapkan saat aplikasi dibuka kembali (tanpa "flash" tema salah saat loading).
8. **Penyimpanan lokal via SQLite**, sehingga semua data tetap berada di perangkat pengguna dan tidak hilang ketika aplikasi ditutup/di-restart.
9. **Resolusi konflik konkurensi (OCC)**: dialog interaktif saat terjadi tumpang tindih edisi lintas jendela, melindungi pengguna dari kehilangan progres tulisan.
10. **Notifikasi pembaruan manual & pencadangan data**: pemberitahuan in-app saat rilis baru tersedia di GitHub Releases serta kemampuan pencadangan database lokal manual dan otomatis.

---

## User Stories

> Format: **Sebagai** `<peran>`, **saya ingin** `<kebutuhan>`, **sehingga** `<manfaat>`.

### A. Pembuatan Catatan

1. Sebagai pengguna, saya ingin menekan tombol "Catatan Baru" di panel kosong (empty state), sehingga saya bisa langsung mulai menulis tanpa langkah tambahan.
2. Sebagai pengguna, saya ingin menekan tombol "Catatan Baru" di toolbar daftar catatan (saat daftar sudah berisi catatan lain), sehingga saya bisa menambah catatan baru kapan saja tanpa harus menghapus/menutup catatan yang sedang aktif.
3. Sebagai pengguna, saya ingin membuat catatan baru lewat menu aplikasi (File/Menu bar → "Catatan Baru" atau shortcut keyboard Ctrl/Cmd+N), sehingga saya punya cara alternatif via keyboard/menu native tanpa harus mengklik UI kustom.
4. Sebagai pengguna, saya ingin catatan baru yang saya buat langsung tersimpan ke database dan langsung terlihat aktif di editor, sehingga saya bisa langsung mengetik tanpa jeda yang terasa.
5. Sebagai pengguna, saya ingin proses pembuatan catatan baru (dari klik tombol sampai catatan siap diedit) terasa instan (di bawah 1 detik), sehingga alur kerja saya tidak terganggu oleh loading.
6. Sebagai pengguna, saya tidak perlu mengisi judul secara eksplisit saat membuat catatan baru, karena judul akan diturunkan otomatis dari isi tulisan saya.

### B. Mengedit Catatan

7. Sebagai pengguna, saya ingin mengetik/menyusun isi catatan menggunakan editor block-based (paragraf, list, checklist, dll — sesuai kapabilitas Editor.js), sehingga saya punya format penulisan yang lebih kaya dibanding textarea polos.
8. Sebagai pengguna, saya ingin perubahan yang saya ketik disimpan otomatis (auto-save) tanpa saya harus menekan tombol simpan, dilengkapi indikator visual status penyimpanan ("Menyimpan...", "Tersimpan HH:mm", "Konflik revisi", "Gagal menyimpan") di header editor, sehingga saya selalu yakin tulisan saya aman.
9. Sebagai pengguna, saya ingin auto-save di-debounce (tidak menyimpan di setiap ketukan tombol, melainkan setelah jeda singkat setelah saya berhenti mengetik), sehingga performa aplikasi tetap ringan saat saya mengetik cepat.
10. Sebagai pengguna, saya ingin judul catatan pada daftar sidebar otomatis mengikuti teks pada blok pertama catatan saya, sehingga saya tidak perlu mengelola judul secara manual.
11. Sebagai pengguna, saya ingin melihat cuplikan (preview) teks dari isi catatan pada item daftar, sehingga saya bisa mengenali catatan tanpa harus membukanya.
12. Sebagai pengguna, saya ingin area editor bisa di-scroll ketika isi catatan melebihi tinggi jendela, sehingga saya tetap bisa membaca/menulis catatan panjang dengan nyaman dan header tetap terlihat (sticky).
13. Sebagai pengguna, saya ingin ketika berpindah dari satu catatan aktif ke catatan lain, editor benar-benar memuat ulang instance-nya (bukan menyisakan konten catatan sebelumnya), sehingga saya tidak salah mengedit catatan yang salah.

### C. Melihat & Menavigasi Daftar Catatan

14. Sebagai pengguna, saya ingin melihat seluruh catatan saya dalam satu daftar di panel kiri, sehingga saya punya gambaran menyeluruh atas semua catatan yang saya miliki.
15. Sebagai pengguna, saya ingin daftar catatan dikelompokkan ke dalam bagian **"Hari ini"**, **"Kemarin"**, dan **"Sebelumnya"** berdasarkan waktu terakhir diedit, sehingga saya bisa cepat menemukan catatan berdasarkan kebaruannya.
16. Sebagai pengguna, saya ingin di dalam masing-masing kelompok waktu, catatan diurutkan dari yang paling baru diedit ke yang paling lama, sehingga catatan yang sedang saya kerjakan selalu berada di posisi paling atas.
17. Sebagai pengguna, saya ingin mengklik salah satu item di daftar untuk menjadikannya catatan aktif dan menampilkan isinya di editor, sehingga navigasi antar catatan terasa cepat.
18. Sebagai pengguna, saya ingin item catatan yang sedang aktif diberi penanda visual berbeda (warna latar berbeda), sehingga saya selalu tahu catatan mana yang sedang saya lihat/edit.
19. Sebagai pengguna, saya ingin daftar catatan tetap bisa di-scroll secara independen dari area editor, sehingga saya tetap bisa menjelajah daftar panjang tanpa memengaruhi tampilan editor.
20. Sebagai pengguna, saya ingin melihat kondisi kosong (empty state) yang jelas pada daftar ketika saya belum memiliki catatan sama sekali, sehingga saya tahu harus mulai dari mana (tombol buat catatan baru).
21. Sebagai pengguna, saya ingin melihat kondisi kosong yang jelas pada area editor ketika belum ada catatan yang aktif/dipilih, sehingga tampilan tidak terlihat rusak/kosong tanpa penjelasan.
22. Sebagai pengguna, saya ingin ketika aplikasi baru dibuka (fresh start), seluruh catatan yang pernah saya buat sebelumnya otomatis dimuat dan ditampilkan tanpa aksi tambahan dari saya, sehingga aplikasi terasa "mengingat" saya.
23. Sebagai pengguna, saya ingin proses pemuatan catatan saat startup terasa instan/tanpa jeda terlihat (data sudah siap sebelum UI ditampilkan), sehingga tidak ada kedipan/flash tampilan kosong sebelum data muncul.

### D. Menghapus Catatan

24. Sebagai pengguna, saya ingin menghapus catatan lewat ikon hapus (tempat sampah) pada item catatan, sehingga saya punya akses cepat untuk membersihkan catatan yang tidak diperlukan.
25. Sebagai pengguna, saya ingin menghapus catatan lewat menu klik-kanan (context menu) pada item catatan, sehingga saya punya cara alternatif tanpa harus mencari ikon kecil.
26. Sebagai pengguna, saya ingin diminta konfirmasi ("Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.") sebelum catatan benar-benar terhapus, sehingga saya tidak kehilangan catatan secara tidak sengaja.
27. Sebagai pengguna, saya ingin setelah sebuah catatan dihapus, daftar catatan diperbarui secara otomatis di semua tempat yang menampilkannya, sehingga saya tidak melihat data yang sudah tidak valid.
28. Sebagai pengguna, saya ingin jika catatan yang saya hapus adalah catatan yang sedang aktif, aplikasi otomatis memilihkan catatan lain yang tersisa (atau menampilkan empty state jika tidak ada catatan tersisa) sebagai catatan aktif berikutnya, sehingga saya tidak dibiarkan menatap layar kosong tanpa arah.
29. Sebagai pengguna, saya ingin bisa menghapus banyak catatan secara berurutan tanpa aplikasi menjadi error/tidak responsif, sehingga proses "bersih-bersih" catatan lama terasa aman dilakukan.

### E. Multi-Window / Membuka Catatan di Jendela Baru

30. Sebagai pengguna, saya ingin membuka sebuah catatan pada jendela baru yang terpisah (via tombol khusus di toolbar), sehingga saya bisa membandingkan dua catatan berdampingan di layar saya.
31. Sebagai pengguna, saya ingin bisa membuka catatan di jendela baru lewat menu klik-kanan ("Buka di jendela baru") pada item catatan di daftar, sehingga saya tidak harus membuka catatan itu dulu di jendela utama sebelum memindahkannya.
32. Sebagai pengguna, saya ingin jendela baru yang terbuka hanya menampilkan editor untuk catatan tersebut (tanpa sidebar daftar catatan penuh), sehingga jendela tersebut ringan dan fokus pada satu catatan saja.
33. Sebagai pengguna, saya ingin jendela baru tersebut memuat isi catatan yang benar sesuai catatan yang saya pilih untuk dibuka, sehingga tidak ada catatan yang tertukar.
34. Sebagai pengguna, saya ingin mengedit catatan pada jendela sekunder dan perubahannya tersimpan ke database yang sama seperti jendela utama, sehingga tidak ada dua sumber data yang berbeda untuk satu catatan yang sama.
35. Sebagai pengguna, saya ingin bisa membuka lebih dari satu jendela sekunder secara bersamaan (untuk catatan yang berbeda-beda), sehingga saya bisa bekerja dengan banyak catatan sekaligus.
36. Sebagai pengguna, saya ingin bisa menutup jendela sekunder kapan saja tanpa memengaruhi jendela utama atau jendela sekunder lain yang masih terbuka, sehingga saya bebas mengatur ruang kerja saya.
37. Sebagai pengguna, saya ingin ketika saya mengedit sebuah catatan di jendela utama, lalu berpindah ke jendela lain yang menampilkan catatan yang sama, saya melihat pembaruan terbaru dari catatan tersebut (sinkron), sehingga saya tidak bekerja dengan data yang basi. *(Lihat catatan keterbatasan teknis pada bagian Further Notes — perilaku real-time lintas jendela ini belum sepenuhnya andal pada implementasi sumber dan perlu ditinjau ulang.)*

### F. Window Chrome / Kontrol Jendela

38. Sebagai pengguna, saya ingin aplikasi tampil sebagai **frameless window** (tanpa title bar bawaan OS), sehingga tampilannya terasa modern dan sesuai identitas visual aplikasi.
39. Sebagai pengguna, saya ingin bisa menyeret (drag) jendela aplikasi dengan mengklik-tahan area header kustom, sehingga saya tetap bisa memindahkan jendela meski tidak ada title bar native.
40. Sebagai pengguna, saya ingin area drag pada header tidak "menelan" interaksi tombol-tombol di dalamnya (misalnya tombol close/minimize/maximize tetap bisa diklik meski berada di dalam area yang bisa di-drag), sehingga kontrol jendela tetap berfungsi normal.
41. Sebagai pengguna macOS, saya ingin melihat tombol traffic-light native (merah/kuning/hijau) bawaan macOS, sehingga pengalaman saya konsisten dengan aplikasi native macOS lainnya.
42. Sebagai pengguna Windows/Linux, saya ingin melihat tombol kontrol kustom (minimize, maximize/restore, close) yang sesuai dengan gaya sistem operasi saya, karena tombol traffic-light macOS tidak relevan/tidak familiar di platform ini.
43. Sebagai pengguna, saya ingin menekan tombol minimize kustom untuk meminimalkan jendela ke taskbar, sehingga saya bisa menyembunyikan aplikasi sementara tanpa menutupnya.
44. Sebagai pengguna, saya ingin menekan tombol maximize kustom untuk memaksimalkan jendela ke seluruh layar, dan menekannya kembali untuk mengembalikan (restore) ke ukuran semula, sehingga satu tombol berfungsi sebagai toggle.
45. Sebagai pengguna, saya ingin menekan tombol close kustom atau shortcut Ctrl/Cmd+W untuk menutup jendela aktif, sehingga saya punya cara cepat mengakhiri sesi tanpa bergantung pada title bar native.
46. Sebagai pengguna, saya ingin lebar minimum dan lebar default panel sidebar sudah diatur wajar sejak awal (tidak terlalu sempit/lebar), sehingga saya tidak perlu mengatur ulang tata letak setiap membuka aplikasi.
47. Sebagai pengguna, saya ingin bisa menggeser (resize) batas antara panel sidebar dan panel editor secara manual, sehingga saya bisa menyesuaikan proporsi tampilan sesuai preferensi saya.

### G. Dark Mode

48. Sebagai pengguna, saya ingin ada saklar (toggle switch) untuk menyalakan/mematikan dark mode, sehingga saya bisa memilih tema sesuai kenyamanan mata saya.
49. Sebagai pengguna, saya ingin pilihan tema (gelap/terang) saya disimpan secara persisten, sehingga saya tidak perlu mengatur ulang setiap kali membuka aplikasi.
50. Sebagai pengguna, saya ingin tema yang tersimpan diterapkan **sebelum** konten utama dirender (bukan sesudahnya), sehingga tidak ada efek "kedipan" (flash) tema yang salah sesaat sebelum tema yang benar diterapkan.
51. Sebagai pengguna, saya ingin seluruh komponen UI (header, daftar catatan, editor, tombol) menyesuaikan tampilannya secara konsisten saat dark mode aktif, sehingga tidak ada elemen yang "ketinggalan" tema terang/gelap.

### H. Menu Aplikasi & Context Menu

52. Sebagai pengguna, saya ingin ada item menu "Catatan Baru" pada menu bar aplikasi, sehingga saya punya jalur akses cepat untuk membuat catatan tanpa harus mengarahkan mouse ke tombol UI tertentu.
53. Sebagai pengguna, saya ingin memilih "Catatan Baru" dari menu bar langsung membuat catatan baru dan menampilkannya sebagai catatan aktif di jendela utama, sehingga hasilnya konsisten dengan pembuatan catatan lewat tombol UI.
54. Sebagai pengguna, saya ingin mengklik kanan pada item catatan di daftar untuk memunculkan context menu berisi minimal dua aksi: "Buka di jendela baru" dan "Hapus", sehingga aksi umum bisa diakses cepat tanpa berpindah ke toolbar.
55. Sebagai pengguna, saya ingin context menu tersebut selalu merujuk pada catatan yang benar (sesuai item yang saya klik-kanan), bukan catatan lain yang sedang aktif, sehingga aksi yang saya pilih tidak salah sasaran.

### I. Penyimpanan & Ketahanan Data

56. Sebagai pengguna, saya ingin seluruh catatan saya tersimpan secara lokal di perangkat saya (SQLite), sehingga saya tidak kehilangan data ketika aplikasi ditutup, di-restart, atau perangkat dimatikan.
57. Sebagai pengguna, saya ingin karakter khusus/tidak biasa yang saya ketik pada catatan (kutip, simbol, dsb) tidak merusak data atau menyebabkan error penyimpanan, sehingga saya bebas menulis apa pun tanpa was-was.
58. Sebagai pengguna, saya ingin setiap catatan menyimpan informasi waktu terakhir diedit, sehingga fitur pengelompokan "Hari ini/Kemarin/Sebelumnya" dan pengurutan "terbaru di atas" bisa berjalan akurat.
59. Sebagai pengguna, saya ingin operasi simpan (create/update) dan hapus pada database berjalan andal walau saya melakukan banyak perubahan berturut-turut dalam waktu singkat, sehingga tidak ada data yang tertinggal/tercecer.
62. Sebagai pengguna, saya ingin dapat mencadangkan database secara manual lewat tombol khusus di header/TitleBar dan dilindungi mekanisme auto-quarantine saat file database terkorupsi, disertai notifikasi status pencadangan (toast), sehingga riwayat data saya terlindungi dari kehilangan fatal.

### J. Resolusi Konflik Konkurensi

60. Sebagai pengguna, saya ingin ketika terjadi konflik revisi saat auto-save (karena catatan yang sama diedit di jendela lain), aplikasi menampilkan dialog resolusi konflik (`ConflictResolveDialog`) yang memberi pilihan jelas antara "Muat Ulang dari Database", "Salin Isi Lokal", atau "Timpa Database", sehingga tulisan saya tidak hilang diam-diam.

### K. Pembaruan Aplikasi

61. Sebagai pengguna, saya ingin menerima notifikasi in-app (`UpdateNoticeDialog` / `UpdateNoticeToast`) saat versi baru aplikasi tersedia di GitHub Releases, lengkap dengan tautan untuk mengunduhnya secara manual di browser sistem.

---

## Implementation Decisions

### Modul-Modul Utama

Berikut adalah pembagian modul yang akan dibangun/dimodifikasi. Pembagian ini secara sengaja diarahkan untuk memisahkan **modul dalam (deep module)** — modul dengan antarmuka sederhana namun menangani kompleksitas internal yang signifikan — dari lapisan UI yang bersifat lebih dangkal (tinggal merangkai).

1. **Modul Akses Data Catatan (Data Access Layer)** — *deep module*.
   Membungkus seluruh interaksi dengan SQLite di balik antarmuka repository terstandar (`INoteRepository`): membuat/menyiapkan tabel dan indeks melalui runner migrasi, membuat catatan baru (`CreateNoteUseCase`), memperbarui catatan dengan verifikasi versi (`UpdateNoteUseCase` dengan Optimistic Concurrency Control), mengambil seluruh catatan (terurut berdasarkan `updated_at DESC`), mengambil satu catatan berdasarkan ID, dan menghapus catatan secara permanen (hard delete via parameterized query). Seluruh detail SQL, escaping/parameterized query, penanganan konkurensi, serta migrasi skema disembunyikan di balik modul ini. Modul ini tidak mengetahui apa pun tentang IPC atau UI — ia murni aturan domain dan persistensi data.

2. **Modul Pengelompokan Catatan Berdasarkan Waktu (Time Sectioning)** — *deep module*.
   Fungsi murni yang menerima daftar seluruh catatan (dengan timestamp masing-masing) dan mengembalikan objek terstruktur berisi tiga kelompok: catatan hari ini, catatan kemarin, dan catatan sebelumnya (masing-masing sudah terurut dari yang terbaru). Fungsi ini tidak bergantung pada React, Zustand, atau IPC — murni transformasi data ke data, sehingga sangat mudah diuji secara terisolasi.

3. **Lapisan IPC / Jembatan Proses (Main ⇄ Renderer Bridge)**.
   Bertanggung jawab menerjemahkan permintaan dari renderer menjadi pemanggilan Modul Akses Data, serta menyiarkan (broadcast) perubahan data ke seluruh jendela yang relevan. Modul ini menjadi satu-satunya titik yang mengetahui perbedaan antara pola komunikasi *one-way* (`send`/`on`) dan *request-response* (`invoke`/`handle`).

4. **Modul Manajemen Jendela (Window Manager)**.
   Bertanggung jawab membuat jendela utama dan jendela anak (child window untuk "buka di jendela baru"), termasuk pengaturan properti jendela (frameless, ukuran, entry point renderer masing-masing), serta menangani permintaan minimize/maximize/close, termasuk logika toggle maximize dan pembatasan perilaku macOS-only secara kondisional berdasarkan platform.

5. **Modul Menu Aplikasi & Context Menu**.
   Membangun menu bar aplikasi (termasuk item "Catatan Baru") dan context menu klik-kanan pada item catatan (berisi "Buka di jendela baru" dan "Hapus"), serta menghubungkan pilihan menu ke event yang sesuai di sisi main process.

6. **Preload Bridge / Exposed API (`window.electronAPI`)**.
   Lapisan context-bridge yang mengekspos sekumpulan fungsi terbatas dan aman ke renderer: pengambilan/penyimpanan/penghapusan catatan, kontrol jendela, pembukaan jendela anak, pembukaan context menu, serta pendaftaran listener untuk event yang disiarkan dari main process (misalnya saat startup data siap, atau saat ada perubahan data dari proses lain).

7. **Store Status Aplikasi (State Management)**.
   Pemisahan tegas dua lapis store Zustand (Architecture §8.3):
   - `useNotesStore`: store runtime murni di memori untuk mengelola daftar catatan dan catatan aktif tanpa persistensi ke `localStorage`. Seluruh data catatan selalu bersumber langsung dari SQLite (*Single Source of Truth*), menjamin performa tinggi dan mencegah risiko pembengkakan kuota penyimpanan lokal.
   - `useUIStore`: store ringan dengan middleware `persist` ke `localStorage` khusus untuk preferensi visual antarmuka pengguna (`theme`, `sidebarWidth`, dan `activeNoteId`).

8. **Komponen UI Renderer**: Wrapper (root layout + splitter), Header (draggable + tombol kontrol jendela), Daftar Catatan (list + item + pengelompokan waktu), Editor (pembungkus Editor.js + scroll area), Empty State (untuk kondisi tanpa catatan aktif/tanpa catatan sama sekali), serta entry point terpisah untuk jendela anak (renderer + App khusus, tanpa sidebar).

### Antarmuka Kunci

- **Kontrak data catatan**: sebuah catatan memiliki identitas unik (ID numerik auto-increment), judul (`title`), kutipan ringkas (`snippet`), isi konten terstruktur (`content` serialisasi Editor.js), nomor versi revisi (`revision` untuk OCC), waktu pembuatan (`created_at`), dan waktu pembaruan terakhir (`updated_at`). Kolom metadata terpisah ini memfasilitasi pengindeksan, pengurutan instan, dan render sidebar tanpa keharusan mem-parsing ulang JSON konten pada setiap pemuatan daftar.
- **Kontrak operasi simpan & pembaruan (OCC Guard)**: operasi simpan dipisahkan menjadi dua Use Case terpisah:
  1. *Create*: menerima konten catatan awal, menghasilkan ID baru dengan `revision = 1`.
  2. *Update*: menerima `id`, `content`, serta `expectedRevision`. Main process memverifikasi bahwa revisi di database sesuai sebelum melakukan update dan menaikkan nomor revisi (`revision + 1`). Jika revisi tidak cocok (terjadi konflik edisi antar jendela), operasi melempar `CONCURRENCY_ERROR` yang langsung memicu `ConflictResolveDialog` di sisi renderer untuk memberi opsi muat ulang atau salin teks lokal.
- **Kontrak API yang diekspos ke renderer** mencakup antarmuka tersegregasi (`window.electronAPI`): `notes.getAll()`, `notes.getById(id)`, `notes.create(input)`, `notes.update(input)`, `notes.delete(id)`, kontrol jendela (`minimize`, `maximize`, `close`), buka catatan pada jendela baru, buka context menu, serta pendaftaran listener untuk event siaran data lintas-jendela yang dimediasi oleh Main Process.
- **Pola komunikasi IPC dipilih berdasarkan kebutuhan respons**: gunakan pola *request-response* bertipe terdiskriminasi `Result<T, AppErrorPayload>` (`invoke`/`handle`) dengan validasi runtime Zod untuk operasi data (simpan, ambil, hapus), dan gunakan pola *one-way* (`send`) untuk kontrol jendela atau siaran (broadcast via `webContents.send`) ke seluruh jendela yang aktif.

### Skema Data

- Tabel `notes` disiapkan secara idempoten melalui runner migrasi berbasis `PRAGMA user_version` (Architecture §6.2) dengan skema eksplisit:
  ```sql
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Catatan Tanpa Judul',
    snippet TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
  ```
- Kolom `title`, `snippet`, `revision`, `created_at`, dan `updated_at` disimpan sebagai kolom terpisah (bukan diekstrak dinamis dari metadata Editor.js) untuk memungkinkan pengindeksan performa tinggi, pengurutan instan, dan penegakan Optimistic Concurrency Control (`revision`).
- Operasi penyimpanan memisahkan antara `CreateNoteUseCase` dan `UpdateNoteUseCase` dengan pengawalan revisi (`expectedRevision`), bukan *upsert* tunggal polos tanpa deteksi konflik balapan (race conditions) antar jendela.
- Seluruh input dari pengguna wajib divalidasi dengan Zod di gerbang IPC dan dieksekusi melalui parameterized query SQLite (`better-sqlite3`), mencegah SQL injection dan korupsi data.

### Keputusan Arsitektur — Multi Window

- Jendela anak (child window) berjalan di atas bundle Vite tunggal yang sama dengan jendela utama, berbagi berkas HTML dasar dan skrip preload. Branching layout dilakukan secara dinamis di `App.tsx` melalui parameter query URL (`?type=child&noteId=<id>`), menampilkan `ChildWindowLayout` (editor saja tanpa sidebar) secara mandiri dan terisolasi.
- Identitas catatan yang harus dimuat oleh jendela anak dikirimkan melalui parameter pada URL jendela tersebut (bukan lewat state global bersama), sehingga setiap jendela anak sepenuhnya independen dalam menentukan catatan mana yang ia tampilkan.
- Pembaruan status maximize dieksekusi secara kondisional berdasarkan platform (macOS vs lainnya), karena API terkait tidak tersedia secara seragam di semua platform. Tampilan tombol kontrol jendela kustom juga disembunyikan sepenuhnya di macOS (memanfaatkan traffic light native), dan hanya ditampilkan pada platform lain.

### Keputusan Arsitektur — Sinkronisasi Data Antar Komponen/Jendela

- Sinkronisasi mutasi data antar jendela dimediasi secara sentral oleh Main Process melalui `ElectronEventHub` (`webContents.send(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload)`). Komponen React di seluruh jendela terbuka (jendela utama maupun sekunder) mendengarkan siaran ini via hook `useSyncListener` dan menyelaraskan `useNotesStore` lokal secara real-time tanpa reload halaman manual.

---

## Testing Decisions

### Kriteria Tes yang Baik

Tes yang baik untuk fitur ini hanya menguji **perilaku eksternal** (input → output/efek yang teramati), bukan detail implementasi internal seperti nama variabel state React, struktur JSX, atau class CSS. Sebagai contoh: uji "jika saya menyimpan catatan dengan ID kosong, catatan baru tersimpan dan dapat diambil kembali dengan ID yang valid" adalah tes yang baik; menguji "fungsi internal memanggil `db.serialize` tepat sekali" adalah tes yang rapuh dan sebaiknya dihindari.

### Modul yang Direkomendasikan untuk Diuji

1. **Modul Akses Data Catatan** — karena ini adalah *deep module* murni (fungsi terhadap data, terisolasi dari UI dan IPC), modul ini paling mudah dan paling bernilai untuk diuji secara otomatis. Skenario yang perlu dicakup: menyimpan catatan baru mengembalikan daftar yang memuat catatan tersebut; menyimpan ulang dengan ID yang sama memperbarui (bukan menduplikasi) catatan; mengambil satu catatan berdasarkan ID mengembalikan data yang sesuai; menghapus catatan menghilangkannya dari hasil pengambilan seluruh catatan; input dengan karakter khusus tidak menyebabkan kegagalan operasi.
2. **Modul Pengelompokan Catatan Berdasarkan Waktu** — fungsi murni, sangat mudah diuji dengan berbagai kombinasi timestamp (tepat hari ini, tepat 24 jam lalu, lebih dari 48 jam lalu, dsb) untuk memastikan setiap catatan jatuh ke kelompok yang benar dan urutan di dalam tiap kelompok selalu dari yang terbaru.
3. **Logika pembaruan state pada store utama** (fungsi setter generik berbasis "judul field + nilai") — pastikan setiap jenis pembaruan field mengubah bagian state yang benar tanpa memengaruhi bagian lain.

Ketiga modul di atas telah diimplementasikan dan diverifikasi secara otomatis melalui rangkaian pengujian unit dan integrasi (Vitest) dengan kelulusan 100%.

### Strategi Pengujian (Three-Tier Testing)

Sesuai Architecture §13 dan spesifikasi stack §2, sistem pengujian mengadopsi arsitektur tiga tingkat:
1. **Tier 1: Unit Tests (Vitest 5.x)** — Pengujian logika murni domain tanpa Electron API (`NoteContentExtractor`, `timeSectioning`).
2. **Tier 2: Integration Tests (Vitest 5.x + SQLite `:memory:`)** — Pengujian `NoteRepository`, transaksi database, `MigrationRunner`, serta `CreateNoteUseCase` & `UpdateNoteUseCase` (OCC guard). Komponen UI diuji dengan React Testing Library.
3. **Tier 3: E2E Tests (Playwright 1.63.x Electron)** — Otomasi pengujian end-to-end aplikasi Electron utuh (komunikasi IPC sungguhan, siklus autosave, dan sinkronisasi mutasi multi-window).

### Di Luar Cakupan Pengujian Otomatis

- Pengujian visual komparasi piksel demi piksel (*pixel snapshot comparison*).
- Pengujian terhadap perilaku internal pustaka pihak ketiga (engine Editor.js internal, struktur internal Radix UI).

---

## Out of Scope

- Sinkronisasi data lintas perangkat atau ke cloud (aplikasi ini murni local-first/offline).
- Sistem akun pengguna, login, atau autentikasi.
- Ekspor catatan ke format lain (PDF, Markdown, dsb).
- Versi mobile atau web dari aplikasi ini.
- Fitur pencarian teks di seluruh catatan.
- Pengategorian/label/tag catatan di luar pengelompokan berbasis waktu (Hari ini/Kemarin/Sebelumnya).
- Riwayat versi (undo/redo) di luar kemampuan bawaan Editor.js pada sesi berjalan saat ini.
- Enkripsi data catatan yang tersimpan di SQLite.

*(Catatan Penyelarasan: Penyiapan pipeline CI/CD GitHub Actions lengkap serta sinkronisasi multi-window dengan mediasi Main Process & OCC yang sebelumnya di luar cakupan PRD, kini telah **resmi masuk ke dalam cakupan proyek** sesuai ARCHITECTURE.md §7, §16 dan TASK.md Fase 24).*

---

## Further Notes

- **Sinkronisasi lintas jendela (Terselesaikan)**: Pada baseline produksi saat ini, keterbatasan event lokal renderer telah **resmi diselesaikan** dengan penyiaran mutasi dari Main Process (`ElectronEventHub`) ke seluruh `webContents` jendela yang terbuka (`NOTES_BROADCAST_CHANGED`) dan ditangkap oleh `useSyncListener` (Architecture §8, §17).
- **Duplikasi pengambilan data saat startup**: Pada implementasi saat ini dipastikan hanya ada satu jalur pengambilan data awal yang otentik (`hasFetchedRef` pada `MainWindowLayout`) agar tidak ada efek samping performa/duplikasi render.
- **Penyimpanan daftar catatan di local storage (Terselesaikan)**: Risiko pembengkakan localStorage telah **resmi diselesaikan** dengan memisahkan `useNotesStore` murni di memori runtime (SQLite sebagai single source of truth) dan hanya menyimpan state ringan (`theme`, `sidebarWidth`, `activeNoteId`) di `useUIStore` (Architecture §8.3, §17).
- **Mekanisme context menu klik-kanan**: Menggunakan jalur komunikasi IPC yang bersih dan konsisten (`context-menu:show-note` dengan payload `noteId` eksplisit) dan ditangani secara native oleh `MenuManager`.
- **Delete lewat toolbar/ikon**: Aksi hapus lewat tombol ikon tempat sampah di sidebar berstatus **user story resmi** (User Story #24) dan terlindungi modal konfirmasi (`DeleteConfirmDialog`, User Story #26).
- **Cakupan menu aplikasi (menu bar)**: Menyediakan menu "Catatan Baru" (Ctrl/Cmd+N), navigasi jendela, dan aksi standar desktop lainnya.
