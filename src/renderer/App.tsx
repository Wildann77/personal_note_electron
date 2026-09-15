import React from 'react';
import { MainWindowLayout } from '@renderer/layouts/MainWindowLayout';
import { useUIStore } from '@renderer/stores/useUIStore';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@renderer/components/ui/dialog';

export const App: React.FC = () => {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);

  // Sync html dark class with store theme
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <MainWindowLayout
      title="Personal Note"
      headerLeftContent={
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary tracking-tight text-sm">Personal Note</span>
          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
            Fase 11 Shell
          </span>
        </div>
      }
      headerRightContent={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </Button>
        </div>
      }
      sidebarContent={
        <div className="flex flex-col h-full p-3 space-y-4 select-none">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
              Catatan
            </span>
            <Button size="sm" className="h-7 text-xs px-2.5">
              + Baru
            </Button>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded bg-card text-card-foreground border-l-2 border-primary font-medium cursor-pointer shadow-sm">
              <div className="truncate text-foreground font-semibold">Catatan Arsitektur</div>
              <div className="truncate text-muted-foreground text-[11px] mt-0.5">
                Desain TitleBar & Splitter...
              </div>
            </div>
            <div className="p-2 rounded hover:bg-muted/50 text-foreground cursor-pointer transition-colors">
              <div className="truncate font-semibold">Daftar Rencana</div>
              <div className="truncate text-muted-foreground text-[11px] mt-0.5">
                Fitur offline-first SQLite...
              </div>
            </div>
          </div>

          <div className="mt-auto pt-3 border-t border-border space-y-2">
            <div className="text-[11px] text-muted-foreground">
              Lebar Sidebar: <span className="font-mono text-primary">{sidebarWidth}px</span>
            </div>

            {/* Dialog UI test */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                  Test Dialog UI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Komponen Dialog shadcn/ui</DialogTitle>
                  <DialogDescription>
                    Dialog bekerja dengan benar di dalam frameless window Electron dengan
                    perlindungan no-drag.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2">
                  <DialogClose asChild>
                    <Button variant="default" size="sm" className="text-xs h-7">
                      Tutup
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      }
    >
      <div className="flex-1 h-full overflow-auto p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-lg space-y-4 p-6 rounded-lg border border-border bg-card shadow-sm text-left">
          <h2 className="text-lg font-bold text-foreground tracking-tight">
            Pengujian Fitur UI Fase 11
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Semua komponen chrome dan shell sudah siap diuji secara interaktif:
          </p>

          <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
            <li>
              <strong className="text-foreground">Drag TitleBar:</strong> Klik dan tahan area kosong
              header untuk memindahkan jendela aplikasi.
            </li>
            <li>
              <strong className="text-foreground">Double-Click TitleBar:</strong> Klik ganda pada
              area header untuk maximize/restore jendela.
            </li>
            <li>
              <strong className="text-foreground">Window Controls (Kanan Atas):</strong> Uji tombol
              Minimize (<code className="text-primary font-mono">_</code>), Maximize/Restore (
              <code className="text-primary font-mono">口</code>), dan Close (
              <code className="text-destructive font-mono">✕</code>). Tombol close berubah merah
              saat di-hover.
            </li>
            <li>
              <strong className="text-foreground">Splitter Resizer:</strong> Arahkan mouse ke garis
              pemisah antara sidebar dan kanvas ini (kursor berubah jadi{' '}
              <code className="font-mono">col-resize</code>
              ), lalu seret untuk mengubah lebar sidebar (min: 220px, max: 480px).
            </li>
            <li>
              <strong className="text-foreground">Double-Click Splitter:</strong> Klik ganda
              splitter untuk mereset lebar sidebar ke default (280px).
            </li>
            <li>
              <strong className="text-foreground">Persistensi:</strong> Tutup dan buka kembali app —
              lebar sidebar dan tema akan tetap tersimpan di localStorage.
            </li>
          </ol>
        </div>
      </div>
    </MainWindowLayout>
  );
};
