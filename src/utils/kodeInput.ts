import {
  PANJANG_KODE_ONLINE,
  prosesInputKodeKetik,
  validasiFormatKodeOnline,
} from '../services/gameOnlineService';

export const BARIS_QWERTY_ANGKA = ['2', '3', '4', '5', '6', '7', '8', '9'] as const;
export const BARIS_QWERTY_1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'P'] as const;
export const BARIS_QWERTY_2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'] as const;
export const BARIS_QWERTY_3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'] as const;

export type AlasanTolakKetik = 'terlarang' | 'simbol' | 'spasi' | 'penuh';

export interface HasilKetikSlot {
  slotKode: string[];
  kursor: number;
  diterima: boolean;
  indeksDiubah: number | null;
  alasanTolak: AlasanTolakKetik | null;
  pesanPeringatan: string | null;
}

export interface HasilHapusSlot {
  slotKode: string[];
  kursor: number;
  terhapus: boolean;
  indeksDihapus: number | null;
}

export interface HasilTempelSlot {
  slotKode: string[];
  kursor: number;
  kodeBersih: string;
  dariLinkPenuh: boolean;
  adaKarakterTerlarang: boolean;
  lengkap: boolean;
  pesanStatus: string | null;
  jenisStatus: 'sukses' | 'peringatan' | 'error';
}

export function buatSlotKodeKosong(): string[] {
  return Array.from({ length: PANJANG_KODE_ONLINE }, () => '');
}

export function apakahKarakterKodeValid(karakter: string): boolean {
  return /^[A-HJ-NP-Z2-9]$/.test(karakter.toUpperCase());
}

export function gabungSlotKode(slotKode: string[]): string {
  return slotKode.slice(0, PANJANG_KODE_ONLINE).join('');
}

export function hitungJumlahTerisiSlot(slotKode: string[]): number {
  let hitung = 0;
  for (let i = 0; i < PANJANG_KODE_ONLINE; i += 1) {
    if (slotKode[i]) hitung += 1;
  }
  return hitung;
}

export function apakahSlotKodeSiapMasuk(slotKode: string[]): boolean {
  for (let i = 0; i < PANJANG_KODE_ONLINE; i += 1) {
    if (!slotKode[i] || !apakahKarakterKodeValid(slotKode[i])) {
      return false;
    }
  }
  return validasiFormatKodeOnline(gabungSlotKode(slotKode));
}

export function normalisasiKursor(kursor: number): number {
  if (!Number.isFinite(kursor)) return 0;
  return Math.max(0, Math.min(PANJANG_KODE_ONLINE, Math.floor(kursor)));
}

export function ketikKarakterDiSlot(
  slotKode: string[],
  kursor: number,
  karakterMentah: string
): HasilKetikSlot {
  const salinan = [...slotKode];
  while (salinan.length < PANJANG_KODE_ONLINE) salinan.push('');
  const posisi = normalisasiKursor(kursor);

  if (karakterMentah === ' ' || karakterMentah === '-') {
    return {
      slotKode: salinan,
      kursor: posisi,
      diterima: false,
      indeksDiubah: null,
      alasanTolak: 'spasi',
      pesanPeringatan: 'Spasi dan tanda strip tidak perlu diketik.',
    };
  }

  const kapital = karakterMentah.toUpperCase();
  if (/^[IO01]$/.test(kapital)) {
    return {
      slotKode: salinan,
      kursor: posisi,
      diterima: false,
      indeksDiubah: null,
      alasanTolak: 'terlarang',
      pesanPeringatan: 'Kode tidak memakai huruf I, O dan angka 0, 1.',
    };
  }

  if (!apakahKarakterKodeValid(kapital)) {
    return {
      slotKode: salinan,
      kursor: posisi,
      diterima: false,
      indeksDiubah: null,
      alasanTolak: 'simbol',
      pesanPeringatan: 'Gunakan hanya huruf A-Z (tanpa I, O) dan angka 2-9.',
    };
  }

  if (posisi >= PANJANG_KODE_ONLINE) {
    return {
      slotKode: salinan,
      kursor: PANJANG_KODE_ONLINE,
      diterima: false,
      indeksDiubah: null,
      alasanTolak: 'penuh',
      pesanPeringatan: null,
    };
  }

  salinan[posisi] = kapital;
  const kursorBerikut = Math.min(PANJANG_KODE_ONLINE, posisi + 1);

  return {
    slotKode: salinan,
    kursor: kursorBerikut,
    diterima: true,
    indeksDiubah: posisi,
    alasanTolak: null,
    pesanPeringatan: null,
  };
}

export function hapusSebelumKursorSlot(
  slotKode: string[],
  kursor: number
): HasilHapusSlot {
  const salinan = [...slotKode];
  while (salinan.length < PANJANG_KODE_ONLINE) salinan.push('');
  const posisi = normalisasiKursor(kursor);

  if (posisi <= 0) {
    return {
      slotKode: salinan,
      kursor: 0,
      terhapus: false,
      indeksDihapus: null,
    };
  }

  const indeksTarget = posisi - 1;
  const adaIsi = Boolean(salinan[indeksTarget]);
  salinan[indeksTarget] = '';

  return {
    slotKode: salinan,
    kursor: indeksTarget,
    terhapus: adaIsi,
    indeksDihapus: adaIsi ? indeksTarget : null,
  };
}

export function hapusDiKursorSlot(
  slotKode: string[],
  kursor: number
): HasilHapusSlot {
  const salinan = [...slotKode];
  while (salinan.length < PANJANG_KODE_ONLINE) salinan.push('');
  const posisi = normalisasiKursor(kursor);

  if (posisi >= PANJANG_KODE_ONLINE || !salinan[posisi]) {
    return {
      slotKode: salinan,
      kursor: posisi,
      terhapus: false,
      indeksDihapus: null,
    };
  }

  salinan[posisi] = '';
  return {
    slotKode: salinan,
    kursor: posisi,
    terhapus: true,
    indeksDihapus: posisi,
  };
}

export function terapkanTempelKeSlot(teksMentah: string): HasilTempelSlot {
  const hasil = prosesInputKodeKetik(teksMentah);
  const slotBaru = buatSlotKodeKosong();
  for (let i = 0; i < hasil.kodeBersih.length && i < PANJANG_KODE_ONLINE; i += 1) {
    slotBaru[i] = hasil.kodeBersih[i];
  }

  const kursorBaru = Math.min(PANJANG_KODE_ONLINE, hasil.kodeBersih.length);
  const lengkap = hasil.kodeBersih.length === PANJANG_KODE_ONLINE;

  if (hasil.kodeBersih.length === 0) {
    return {
      slotKode: slotBaru,
      kursor: 0,
      kodeBersih: '',
      dariLinkPenuh: hasil.dariLinkPenuh,
      adaKarakterTerlarang: hasil.adaKarakterTerlarang,
      lengkap: false,
      pesanStatus: hasil.adaKarakterTerlarang
        ? 'Kode tidak valid: huruf I, O dan angka 0, 1 tidak digunakan.'
        : 'Teks yang ditempel tidak berisi kode game yang valid.',
      jenisStatus: 'error',
    };
  }

  if (!lengkap) {
    const infoTerlarang = hasil.adaKarakterTerlarang
      ? ' Huruf I, O dan angka 0, 1 diabaikan.'
      : '';
    return {
      slotKode: slotBaru,
      kursor: kursorBaru,
      kodeBersih: hasil.kodeBersih,
      dariLinkPenuh: hasil.dariLinkPenuh,
      adaKarakterTerlarang: hasil.adaKarakterTerlarang,
      lengkap: false,
      pesanStatus: `Kode belum lengkap (${hasil.kodeBersih.length} dari 8 karakter valid).${infoTerlarang}`,
      jenisStatus: 'peringatan',
    };
  }

  return {
    slotKode: slotBaru,
    kursor: PANJANG_KODE_ONLINE,
    kodeBersih: hasil.kodeBersih,
    dariLinkPenuh: hasil.dariLinkPenuh,
    adaKarakterTerlarang: hasil.adaKarakterTerlarang,
    lengkap: true,
    pesanStatus: hasil.dariLinkPenuh
      ? `Kode ${hasil.kodeBersih} berhasil diambil dari link game.`
      : null,
    jenisStatus: 'sukses',
  };
}
