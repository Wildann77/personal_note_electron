import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Button, buttonVariants } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@renderer/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@renderer/components/ui/alert-dialog';
import { ScrollArea } from '@renderer/components/ui/scroll-area';

describe('UI Components (shadcn/ui + Radix)', () => {
  afterEach(() => {
    cleanup();
  });
  describe('Button Component', () => {
    it('renders default variant button properly', () => {
      render(<Button>Simpan</Button>);
      const btn = screen.getByRole('button', { name: 'Simpan' });
      expect(btn).toBeDefined();
      expect(btn.className).toContain('bg-primary');
    });

    it('renders destructive variant button properly', () => {
      render(<Button variant="destructive">Hapus</Button>);
      const btn = screen.getByRole('button', { name: 'Hapus' });
      expect(btn.className).toContain('bg-destructive');
    });

    it('renders different sizes (sm, lg, icon)', () => {
      const smClasses = buttonVariants({ size: 'sm' });
      expect(smClasses).toContain('h-9');

      const lgClasses = buttonVariants({ size: 'lg' });
      expect(lgClasses).toContain('h-11');

      const iconClasses = buttonVariants({ size: 'icon' });
      expect(iconClasses).toContain('h-10 w-10');
    });

    it('renders asChild with custom element using Radix Slot', () => {
      render(
        <Button asChild>
          <a href="#test-link">Tautan</a>
        </Button>,
      );
      const link = screen.getByRole('link', { name: 'Tautan' });
      expect(link).toBeDefined();
      expect(link.getAttribute('href')).toBe('#test-link');
      expect(link.className).toContain('bg-primary');
    });

    it('disables button when disabled prop is set', () => {
      render(<Button disabled>Nonaktif</Button>);
      const btn = screen.getByRole('button', { name: 'Nonaktif' });
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

  describe('Dialog Component', () => {
    it('renders dialog trigger and opens content on click', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Buka Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Judul Dialog</DialogTitle>
              <DialogDescription>Deskripsi Dialog</DialogDescription>
            </DialogHeader>
            <div>Isi konten dialog</div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Tutup</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>,
      );

      const trigger = screen.getByRole('button', { name: 'Buka Dialog' });
      expect(trigger).toBeDefined();

      fireEvent.click(trigger);

      expect(await screen.findByText('Judul Dialog')).toBeDefined();
      expect(screen.getByText('Deskripsi Dialog')).toBeDefined();
      expect(screen.getByText('Isi konten dialog')).toBeDefined();
    });
  });

  describe('AlertDialog Component', () => {
    it('renders alert dialog and shows actions when opened', async () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Konfirmasi Hapus</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Catatan Ini?</AlertDialogTitle>
              <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction className={buttonVariants({ variant: 'destructive' })}>
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );

      const trigger = screen.getByRole('button', { name: 'Konfirmasi Hapus' });
      fireEvent.click(trigger);

      expect(await screen.findByText('Hapus Catatan Ini?')).toBeDefined();
      expect(screen.getByText('Tindakan ini tidak dapat dibatalkan.')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Batal' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Ya, Hapus' })).toBeDefined();
    });
  });

  describe('ScrollArea Component', () => {
    it('renders scroll area container and children', () => {
      const { container } = render(
        <ScrollArea className="h-48 w-48">
          <div>Item Konten Panjang</div>
        </ScrollArea>,
      );

      expect(container.firstChild).toBeDefined();
      expect(screen.getByText('Item Konten Panjang')).toBeDefined();
    });
  });
});
