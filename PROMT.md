Kerjakan task [ID_TASK, misal: P1-T1] dari TASK.md dengan protokol ketat:

NOTE: GUNAKAN MCP CONTEXT7 UNTUK MEMBACA FILE KODE YANG DIPERLUKAN UNTUK MENGERJAKAN TASK INI ATAU WEB RESMI NYA LANGSUNG,JIKA BERKAITAN DENGAN SETUP YANG BUTUH INFORMATION YANG VALID, 

1. BACA & TELUSURI KONTEKS:
   - Buka TASK.md, cari item [ID_TASK]. Pahami Deskripsi, Target File, Kriteria Selesai, dan Referensi.
   - Wajib baca bab acuan yang dirujuk (ARCHITECTURE.md, DESIGN.md, atau PRD) sebelum coding. Jangan menebak arsitektur/API.
   - Jika temukan inkonsistensi atau kontradiksi antar dokumen (TASK.md vs ARCHITECTURE.md vs PRD vs DESIGN.md): STOP, laporkan inkonsistensinya, dan minta keputusan pengguna terkait dokumen acuan sebelum melangkah.

2. ATURAN IMPLEMENTASI (AGENTS.md):
   - Ikuti Clean Architecture & struktur folder di ARCHITECTURE.md §14.
   - Strict TypeScript: Zero `any`, gunakan Result<T, E> untuk IPC, tangani error eksplisit.
   - Patuhi batas keamanan: contextIsolation, sandbox, validateIpcSender, zero external network/telemetry.
   - Dilarang tambah dependensi baru atau buat file .md baru tanpa izin.

3. VERIFIKASI (DEFINITION OF DONE):
   - Jalankan `npx tsc --noEmit` (wajib 0 error).
   - Jalankan `npm run lint` (wajib lulus).
   - Jalankan `npm test` jika test terkait tersedia.
   - Perbaiki mandiri jika ada kegagalan verifikasi.

4. SINKRONISASI & SELESAIKAN:
   - Jika ada perubahan spesifikasi/desain/arsitektur yang perlu disesuaikan, perbarui dokumen terkait (ARCHITECTURE.md, DESIGN.md, TASK.md) agar dokumentasi tetap sinkron. INI PENTING JADI KAMU PERHATIKAN, JADI KAMU CEK DULU SEBELUM SELESAI TASK KALAU ADA PERUBAHAN ITU DI UPDATE DOKUMEN NYA  
   - Setelah lolos DoD, perbarui checkbox task di TASK.md: ubah `[ ]` menjadi `[x]`.
   - Laporkan ringkas: file diubah/dibuat, dokumen yang diperbarui, dan status verifikasi.
