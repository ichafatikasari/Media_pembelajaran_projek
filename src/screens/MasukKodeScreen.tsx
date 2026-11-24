import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardPaste,
  Clock3,
  Delete,
  Home,
  KeyRound,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { pergiKeKodeOnline } from '../app/router';
import { useAppStore } from '../app/store';
import { Button3D } from '../components/Button3D';
import { Modal } from '../components/Modal';
import { RuteHash } from '../data/types';
import {
  ambilGameOnlineDariKode,
  PANJANG_KODE_ONLINE,
} from '../services/gameOnlineService';
import {
  mainkanBunyiTolakKode,
  mainkanKlikHapus,
  mainkanKlikKetik,
  sinkronPengaturanAudio,
  tandaiInteraksiAudio,
} from '../utils/audio';
import {
  apakahSlotKodeSiapMasuk,
  BARIS_QWERTY_1,
  BARIS_QWERTY_2,
  BARIS_QWERTY_3,
  BARIS_QWERTY_ANGKA,
  buatSlotKodeKosong,
  gabungSlotKode,
  hapusDiKursorSlot,
  hapusSebelumKursorSlot,
  hitungJumlahTerisiSlot,
  ketikKarakterDiSlot,
  terapkanTempelKeSlot,
} from '../utils/kodeInput';

interface MasukKodeScreenProps {
  onNavigasi: (rute: RuteHash) => void;
}

type JenisStatusKode = 'info' | 'sukses' | 'peringatan' | 'error' | 'kedaluwarsa';

interface StatusPesanKode {
  jenis: JenisStatusKode;
  teks: string;
}

export const MasukKodeScreen: React.FC<MasukKodeScreenProps> = ({ onNavigasi }) => {
  const { gameAktif, tampilkanToast } = useAppStore();
  const sfxAktif = gameAktif?.pengaturan.suara ?? true;

  const [slotKode, setSlotKode] = useState<string[]>(() => buatSlotKodeKosong());
  const [kursor, setKursor] = useState<number>(0);
  const [revisiSlot, setRevisiSlot] = useState<number[]>(() =>
    Array.from({ length: PANJANG_KODE_ONLINE }, () => 0)
  );
  const [statusPesan, setStatusPesan] = useState<StatusPesanKode | null>(null);
  const [goyangKotak, setGoyangKotak] = useState<boolean>(false);
  const [tombolDitekan, setTombolDitekan] = useState<string | null>(null);
  const [sedangMemeriksa, setSedangMemeriksa] = useState<boolean>(false);

  const [modalTempelTerbuka, setModalTempelTerbuka] = useState<boolean>(false);
  const [teksModalTempel, setTeksModalTempel] = useState<string>('');

  const timerGoyangRef = useRef<number | null>(null);
  const timerTekanRef = useRef<number | null>(null);
  const ditanganiPointerRef = useRef<string | null>(null);
  const timerPointerRef = useRef<number | null>(null);
  const inputModalTempelRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    sinkronPengaturanAudio(sfxAktif, false, false);
  }, [sfxAktif]);

  useEffect(() => {
    return () => {
      if (timerGoyangRef.current !== null) window.clearTimeout(timerGoyangRef.current);
      if (timerTekanRef.current !== null) window.clearTimeout(timerTekanRef.current);
      if (timerPointerRef.current !== null) window.clearTimeout(timerPointerRef.current);
    };
  }, []);

  useEffect(() => {
    if (modalTempelTerbuka) {
      const id = window.setTimeout(() => inputModalTempelRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [modalTempelTerbuka]);

  const picuGoyangKotak = useCallback(() => {
    setGoyangKotak(false);
    if (timerGoyangRef.current !== null) {
      window.clearTimeout(timerGoyangRef.current);
    }
    window.requestAnimationFrame(() => {
      setGoyangKotak(true);
      timerGoyangRef.current = window.setTimeout(() => {
        setGoyangKotak(false);
        timerGoyangRef.current = null;
      }, 450);
    });
  }, []);

  const sorotTombolSementara = useCallback((idTombol: string) => {
    setTombolDitekan(idTombol);
    if (timerTekanRef.current !== null) {
      window.clearTimeout(timerTekanRef.current);
    }
    timerTekanRef.current = window.setTimeout(() => {
      setTombolDitekan(null);
      timerTekanRef.current = null;
    }, 130);
  }, []);

  const naikkanRevisiSlot = useCallback((indeksList: number[]) => {
    if (indeksList.length === 0) return;
    setRevisiSlot((prev) => {
      const next = [...prev];
      for (const idx of indeksList) {
        if (idx >= 0 && idx < next.length) {
          next[idx] += 1;
        }
      }
      return next;
    });
  }, []);

  const handleKetikKarakter = useCallback(
    (karakter: string) => {
      if (sedangMemeriksa) return;
      tandaiInteraksiAudio();
      const hasil = ketikKarakterDiSlot(slotKode, kursor, karakter);

      if (!hasil.diterima) {
        if (hasil.alasanTolak !== 'penuh') {
          mainkanBunyiTolakKode(sfxAktif);
          picuGoyangKotak();
          if (hasil.pesanPeringatan) {
            setStatusPesan({ jenis: 'peringatan', teks: hasil.pesanPeringatan });
          }
        }
        return;
      }

      mainkanKlikKetik(sfxAktif);
      setSlotKode(hasil.slotKode);
      setKursor(hasil.kursor);
      if (hasil.indeksDiubah !== null) {
        naikkanRevisiSlot([hasil.indeksDiubah]);
        sorotTombolSementara(hasil.slotKode[hasil.indeksDiubah]);
      }
      setStatusPesan(null);
    },
    [
      kursor,
      naikkanRevisiSlot,
      picuGoyangKotak,
      sedangMemeriksa,
      sfxAktif,
      slotKode,
      sorotTombolSementara,
    ]
  );

  const handleHapusSatu = useCallback(() => {
    if (sedangMemeriksa) return;
    tandaiInteraksiAudio();
    const hasil = hapusSebelumKursorSlot(slotKode, kursor);
    mainkanKlikHapus(sfxAktif);
    sorotTombolSementara('HAPUS');
    setSlotKode(hasil.slotKode);
    setKursor(hasil.kursor);
    setStatusPesan(null);
  }, [kursor, sedangMemeriksa, sfxAktif, slotKode, sorotTombolSementara]);

  const handleHapusDiKursor = useCallback(() => {
    if (sedangMemeriksa) return;
    tandaiInteraksiAudio();
    const hasil = hapusDiKursorSlot(slotKode, kursor);
    if (!hasil.terhapus) return;
    mainkanKlikHapus(sfxAktif);
    setSlotKode(hasil.slotKode);
    setKursor(hasil.kursor);
    setStatusPesan(null);
  }, [kursor, sedangMemeriksa, sfxAktif, slotKode]);

  const handleBersihkan = useCallback(() => {
    if (sedangMemeriksa) return;
    tandaiInteraksiAudio();
    mainkanKlikHapus(sfxAktif);
    sorotTombolSementara('BERSIHKAN');
    setSlotKode(buatSlotKodeKosong());
    setKursor(0);
    setStatusPesan(null);
  }, [sedangMemeriksa, sfxAktif, sorotTombolSementara]);

  const prosesTempelTeks = useCallback(
    (teksMentah: string) => {
      if (sedangMemeriksa) return;
      tandaiInteraksiAudio();
      const hasil = terapkanTempelKeSlot(teksMentah);
      setSlotKode(hasil.slotKode);
      setKursor(hasil.kursor);

      const indeksTerisi: number[] = [];
      for (let i = 0; i < PANJANG_KODE_ONLINE; i += 1) {
        if (hasil.slotKode[i]) indeksTerisi.push(i);
      }
      naikkanRevisiSlot(indeksTerisi);

      if (!hasil.lengkap) {
        mainkanBunyiTolakKode(sfxAktif);
        picuGoyangKotak();
        setStatusPesan({
          jenis: hasil.jenisStatus === 'error' ? 'error' : 'peringatan',
          teks:
            hasil.pesanStatus ??
            'Kode yang ditempel belum lengkap 8 karakter yang valid.',
        });
        return;
      }

      mainkanKlikKetik(sfxAktif);
      if (hasil.dariLinkPenuh) {
        setStatusPesan({
          jenis: 'sukses',
          teks: hasil.pesanStatus ?? `Kode ${hasil.kodeBersih} diambil dari link game.`,
        });
        tampilkanToast(`Kode ${hasil.kodeBersih} diambil dari link game.`, 'info');
      } else {
        setStatusPesan({
          jenis: 'sukses',
          teks: `Kode ${hasil.kodeBersih} berhasil ditempel. Tekan MASUK untuk membuka game.`,
        });
      }
    },
    [naikkanRevisiSlot, picuGoyangKotak, sedangMemeriksa, sfxAktif, tampilkanToast]
  );

  const siapMasuk = useMemo(() => apakahSlotKodeSiapMasuk(slotKode), [slotKode]);
  const jumlahTerisi = useMemo(() => hitungJumlahTerisiSlot(slotKode), [slotKode]);
  const kodeGabung = useMemo(() => gabungSlotKode(slotKode), [slotKode]);

  const handleMasuk = useCallback(async () => {
    if (sedangMemeriksa) return;
    tandaiInteraksiAudio();

    if (!siapMasuk) {
      mainkanBunyiTolakKode(sfxAktif);
      picuGoyangKotak();
      setStatusPesan({
        jenis: 'peringatan',
        teks: `Kode belum lengkap (${jumlahTerisi}/8). Lengkapi semua 8 karakter terlebih dahulu.`,
      });
      return;
    }

    mainkanKlikKetik(sfxAktif);
    setSedangMemeriksa(true);
    try {
      const hasil = await ambilGameOnlineDariKode(kodeGabung);
      if (hasil.ok) {
        pergiKeKodeOnline(kodeGabung);
        return;
      }

      mainkanBunyiTolakKode(sfxAktif);
      picuGoyangKotak();

      if (hasil.alasan === 'kedaluwarsa') {
        setStatusPesan({
          jenis: 'kedaluwarsa',
          teks: 'Kode game ini sudah kedaluwarsa dan tidak dapat dibuka lagi. Minta guru membagikan kode terbaru.',
        });
      } else if (hasil.alasan === 'tidak_ditemukan') {
        setStatusPesan({
          jenis: 'error',
          teks: 'Kode tidak ditemukan. Periksa lagi huruf dan angkanya.',
        });
      } else if (hasil.alasan === 'offline') {
        setStatusPesan({
          jenis: 'error',
          teks: 'Perangkat sedang offline atau layanan online belum tersedia. Periksa internet atau buka file Paket (.json).',
        });
      } else {
        setStatusPesan({
          jenis: 'error',
          teks: hasil.pesanError,
        });
      }
    } finally {
      setSedangMemeriksa(false);
    }
  }, [jumlahTerisi, kodeGabung, picuGoyangKotak, sedangMemeriksa, sfxAktif, siapMasuk]);

  const handleTempelDariTombol = useCallback(async () => {
    if (sedangMemeriksa) return;
    tandaiInteraksiAudio();
    sorotTombolSementara('TEMPEL');
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const teks = await navigator.clipboard.readText();
        if (teks.trim()) {
          prosesTempelTeks(teks);
          return;
        }
        mainkanBunyiTolakKode(sfxAktif);
        picuGoyangKotak();
        setStatusPesan({
          jenis: 'peringatan',
          teks: 'Papan klip (clipboard) kosong. Salin kode atau link game terlebih dahulu.',
        });
        return;
      }
    } catch {
      // Browser membatasi izin baca clipboard -> buka modal tempel fallback
    }
    setTeksModalTempel('');
    setModalTempelTerbuka(true);
  }, [picuGoyangKotak, prosesTempelTeks, sedangMemeriksa, sfxAktif, sorotTombolSementara]);

  // Dukungan keyboard fisik langsung tanpa harus mengeklik kotak + Ctrl+V / paste global
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalTempelTerbuka) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setModalTempelTerbuka(false);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleHapusSatu();
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        handleHapusDiKursor();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setKursor((prev) => Math.max(0, prev - 1));
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setKursor((prev) => Math.min(PANJANG_KODE_ONLINE, prev + 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        void handleMasuk();
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onNavigasi('/');
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        handleKetikKarakter(e.key);
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (modalTempelTerbuka) return;
      const teks = e.clipboardData?.getData('text') ?? '';
      if (teks) {
        e.preventDefault();
        prosesTempelTeks(teks);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [
    handleHapusDiKursor,
    handleHapusSatu,
    handleKetikKarakter,
    handleMasuk,
    modalTempelTerbuka,
    onNavigasi,
    prosesTempelTeks,
  ]);

  // Penanganan sentuh/klik seragam: respons cepat via pointerdown tanpa dobel dengan click
  const buatAksiTombol = (idTombol: string, aksi: () => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      ditanganiPointerRef.current = idTombol;
      if (timerPointerRef.current !== null) window.clearTimeout(timerPointerRef.current);
      timerPointerRef.current = window.setTimeout(() => {
        ditanganiPointerRef.current = null;
      }, 400);
      aksi();
    },
    onClick: () => {
      if (ditanganiPointerRef.current === idTombol) {
        ditanganiPointerRef.current = null;
        return;
      }
      aksi();
    },
  });

  const renderTombolKarakter = (karakter: string, tipe: 'angka' | 'huruf') => {
    const sedangDitekan = tombolDitekan === karakter;
    const warnaDasar =
      tipe === 'angka'
        ? sedangDitekan
          ? 'border-[#FFE875] bg-[#FFE047] text-[#071236] translate-y-[4px] shadow-[0_1px_0_#C79A00]'
          : 'border-[#FFE875] bg-[#FFD400] text-[#071236] shadow-[0_5px_0_#C79A00] hover:bg-[#FFE047] active:translate-y-[4px] active:shadow-[0_1px_0_#C79A00]'
        : sedangDitekan
          ? 'border-[#8FB7FF] bg-[#3B82FF] text-white translate-y-[4px] shadow-[0_1px_0_#0A2FA8]'
          : 'border-[#7AA7FF] bg-[#1E6BFF] text-white shadow-[0_5px_0_#0A2FA8] hover:bg-[#337BFF] active:translate-y-[4px] active:shadow-[0_1px_0_#0A2FA8]';

    return (
      <button
        key={karakter}
        type="button"
        aria-label={`Tombol ${karakter}`}
        disabled={sedangMemeriksa}
        {...buatAksiTombol(karakter, () => handleKetikKarakter(karakter))}
        className={`font-display flex h-[68px] min-h-[56px] w-[96px] cursor-pointer items-center justify-center rounded-2xl border-3 text-2xl font-black transition-transform select-none focus-visible:outline-4 focus-visible:outline-[#FFD400] ${warnaDasar}`}
      >
        {karakter}
      </button>
    );
  };

  const renderKotakSlot = (idx: number) => {
    const huruf = slotKode[idx] ?? '';
    const aktif = kursor === idx;
    const adalahError =
      statusPesan?.jenis === 'error' || statusPesan?.jenis === 'kedaluwarsa';

    let gayaKotak = 'border-[#3C62D4] bg-[#071236] text-[#5F8BFF]';
    if (adalahError) {
      gayaKotak = aktif
        ? 'border-[#FFD400] bg-[#5C0D1F] text-[#FFD7DF] ring-4 ring-[#FFD400]/50'
        : 'border-[#FF6B86] bg-[#450B1C] text-[#FFD7DF]';
    } else if (aktif) {
      gayaKotak = huruf
        ? 'border-[#FFD400] bg-[#1C3FA8] text-[#FFD400] ring-4 ring-[#FFD400]/45'
        : 'border-[#FFD400] bg-[#1C3FA8] text-[#FFD400] ring-4 ring-[#FFD400]/45';
    } else if (huruf) {
      gayaKotak = 'border-[#57E893] bg-[#071236] text-[#FFD400]';
    }

    return (
      <button
        key={idx}
        type="button"
        aria-label={`Kotak kode ke-${idx + 1}: ${huruf || 'kosong'}`}
        aria-pressed={aktif}
        {...buatAksiTombol(`SLOT_${idx}`, () => {
          tandaiInteraksiAudio();
          mainkanKlikKetik(sfxAktif);
          setKursor(idx);
        })}
        className={`font-mono flex h-[88px] min-h-[56px] w-[88px] cursor-pointer items-center justify-center rounded-2xl border-4 text-5xl font-black shadow-[0_6px_0_#040B24] transition-colors select-none focus-visible:outline-4 focus-visible:outline-[#FFD400] ${gayaKotak}`}
      >
        {huruf ? (
          <span
            key={`${idx}-${huruf}-${revisiSlot[idx]}`}
            className="anim-karakter-masuk inline-block"
          >
            {huruf}
          </span>
        ) : aktif ? (
          <span aria-hidden="true" className="text-[#FFD400]">
            _
          </span>
        ) : (
          ''
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full w-full flex-col justify-between gap-2.5 bg-[#0B1B4D] px-8 py-3">
      {/* Header Atas */}
      <div className="kartu-3d flex shrink-0 items-center justify-between gap-4 rounded-3xl border-4 border-[#FFD400] bg-[#12276B] px-6 py-2.5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-3 border-[#071236] bg-[#FFD400] text-[#071236]">
            <KeyRound size={26} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display teks-outline-tebal text-2xl font-bold text-[#FFD400]">
              MASUK DENGAN KODE GAME
            </h1>
            <p className="text-sm font-bold text-[#DCE7FF]">
              Ketuk papan ketik di layar, ketik lewat keyboard fisik, atau tempel kode / link game.
            </p>
          </div>
        </div>

        <Button3D variant="navy" size="md" onClick={() => onNavigasi('/')}>
          <Home size={20} />
          <span>Kembali ke Beranda</span>
        </Button3D>
      </div>

      {/* 8 Kotak Kode dalam Satu Baris (4 - 4) + Pesan Status */}
      <div className="kartu-3d flex shrink-0 flex-col items-center gap-3 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] px-6 py-3.5">
        <div
          data-testid="wadah-kotak-kode"
          className={`flex items-center justify-center gap-2.5 ${goyangKotak ? 'anim-goyang-panel' : ''}`}
        >
          {[0, 1, 2, 3].map((idx) => renderKotakSlot(idx))}
          <div className="mx-2 h-2.5 w-6 rounded-full bg-[#FFD400]" aria-hidden="true" />
          {[4, 5, 6, 7].map((idx) => renderKotakSlot(idx))}
        </div>

        {/* Bilah Pesan Status / Peringatan / Error */}
        <div
          role="status"
          aria-live="polite"
          className={`flex min-h-[48px] w-full max-w-[920px] items-center justify-center gap-2.5 rounded-2xl border-2 px-5 py-2 text-center ${
            statusPesan?.jenis === 'error'
              ? 'border-[#FF6B86] bg-[#5C0D1F] text-[#FFE0E6]'
              : statusPesan?.jenis === 'kedaluwarsa'
                ? 'border-[#FF9100] bg-[#4D1D00] text-[#FFE0B2]'
                : statusPesan?.jenis === 'peringatan'
                  ? 'border-[#FFD400] bg-[#452800] text-[#FFE875]'
                  : statusPesan?.jenis === 'sukses' || siapMasuk
                    ? 'border-[#57E893] bg-[#063B20] text-[#7CFFAF]'
                    : 'border-[#2A4CB8] bg-[#071236] text-[#DCE7FF]'
          }`}
        >
          {statusPesan?.jenis === 'error' && (
            <AlertTriangle size={20} className="shrink-0 text-[#FF8A9E]" />
          )}
          {statusPesan?.jenis === 'kedaluwarsa' && (
            <Clock3 size={20} className="shrink-0 text-[#FFB74D]" />
          )}
          {statusPesan?.jenis === 'peringatan' && (
            <AlertTriangle size={20} className="shrink-0 text-[#FFD400]" />
          )}

          <span className="text-base font-extrabold">
            {statusPesan ? (
              statusPesan.teks
            ) : siapMasuk ? (
              <>
                Kode 8 karakter lengkap! Tekan tombol <strong>MASUK</strong> di bawah.
              </>
            ) : (
              <>
                Terisi <strong className="tabular-angka text-[#FFD400]">{jumlahTerisi}/8</strong>{' '}
                karakter · Ketuk sebuah kotak untuk memindahkan kursor · Tanpa I, O, 0, 1.
              </>
            )}
          </span>
        </div>
      </div>

      {/* Papan Ketik Layar Bergaya QWERTY */}
      <div className="kartu-3d flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-3xl border-4 border-[#3C62D4] bg-[#12276B] px-6 py-3">
        {/* Baris 1 (Angka): 2 3 4 5 6 7 8 9 */}
        <div className="flex items-center justify-center gap-2">
          {BARIS_QWERTY_ANGKA.map((k) => renderTombolKarakter(k, 'angka'))}
        </div>

        {/* Baris 2: Q W E R T Y U P */}
        <div className="flex items-center justify-center gap-2">
          {BARIS_QWERTY_1.map((k) => renderTombolKarakter(k, 'huruf'))}
        </div>

        {/* Baris 3: A S D F G H J K L */}
        <div className="flex items-center justify-center gap-2">
          {BARIS_QWERTY_2.map((k) => renderTombolKarakter(k, 'huruf'))}
        </div>

        {/* Baris 4: Z X C V B N M + HAPUS (⌫) lebih lebar */}
        <div className="flex items-center justify-center gap-2">
          {BARIS_QWERTY_3.map((k) => renderTombolKarakter(k, 'huruf'))}
          <button
            type="button"
            aria-label="Hapus satu karakter sebelum kursor"
            disabled={sedangMemeriksa}
            {...buatAksiTombol('HAPUS', handleHapusSatu)}
            className={`font-display flex h-[68px] min-h-[56px] w-[196px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-3 border-[#FFC46B] bg-[#FF9100] px-4 text-xl font-black text-[#071236] transition-transform select-none focus-visible:outline-4 focus-visible:outline-[#FFD400] ${
              tombolDitekan === 'HAPUS'
                ? 'translate-y-[4px] bg-[#FFA726] shadow-[0_1px_0_#B85800]'
                : 'shadow-[0_5px_0_#B85800] hover:bg-[#FFA726] active:translate-y-[4px] active:shadow-[0_1px_0_#B85800]'
            }`}
          >
            <Delete size={24} strokeWidth={2.7} />
            <span>HAPUS (⌫)</span>
          </button>
        </div>

        {/* Baris Bawah: TEMPEL, BERSIHKAN, MASUK */}
        <div className="mt-1 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={sedangMemeriksa}
            {...buatAksiTombol('TEMPEL', () => void handleTempelDariTombol())}
            className={`font-display flex h-[70px] min-h-[56px] w-[200px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-3 border-[#B39DDB] bg-[#7C4DFF] px-5 text-xl font-black text-white transition-transform select-none focus-visible:outline-4 focus-visible:outline-[#FFD400] ${
              tombolDitekan === 'TEMPEL'
                ? 'translate-y-[4px] bg-[#9575CD] shadow-[0_1px_0_#4A1FD1]'
                : 'shadow-[0_5px_0_#4A1FD1] hover:bg-[#8E64FF] active:translate-y-[4px] active:shadow-[0_1px_0_#4A1FD1]'
            }`}
          >
            <ClipboardPaste size={22} strokeWidth={2.5} />
            <span>TEMPEL</span>
          </button>

          <button
            type="button"
            disabled={sedangMemeriksa}
            {...buatAksiTombol('BERSIHKAN', handleBersihkan)}
            className={`font-display flex h-[70px] min-h-[56px] w-[220px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl border-3 border-[#5F8BFF] bg-[#071236] px-5 text-xl font-black text-[#DCE7FF] transition-transform select-none hover:border-[#FFD400] hover:text-white focus-visible:outline-4 focus-visible:outline-[#FFD400] ${
              tombolDitekan === 'BERSIHKAN'
                ? 'translate-y-[4px] shadow-[0_1px_0_#040B24]'
                : 'shadow-[0_5px_0_#040B24] active:translate-y-[4px] active:shadow-[0_1px_0_#040B24]'
            }`}
          >
            <RotateCcw size={21} strokeWidth={2.5} />
            <span>BERSIHKAN</span>
          </button>

          <button
            type="button"
            disabled={!siapMasuk || sedangMemeriksa}
            {...buatAksiTombol('MASUK', () => void handleMasuk())}
            className={`font-display flex h-[70px] min-h-[56px] w-[380px] items-center justify-center gap-3 rounded-2xl border-4 px-6 text-2xl font-black transition-transform select-none focus-visible:outline-4 focus-visible:outline-[#FFD400] ${
              siapMasuk && !sedangMemeriksa
                ? 'cursor-pointer border-[#57E893] bg-[#00C853] text-white shadow-[0_6px_0_#007A33] hover:bg-[#00DB5B] active:translate-y-[4px] active:shadow-[0_2px_0_#007A33]'
                : 'cursor-not-allowed border-[#2A4CB8] bg-[#173287] text-[#8FB1FF] opacity-75 shadow-[0_5px_0_#071236]'
            }`}
          >
            {sedangMemeriksa ? (
              <>
                <Loader2 size={26} className="animate-spin" />
                <span>MEMERIKSA KODE...</span>
              </>
            ) : (
              <>
                <span>MASUK</span>
                <ArrowRight size={28} strokeWidth={3} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Tempel Fallback (hanya muncul jika browser memblokir pembacaan clipboard langsung) */}
      <Modal
        terbuka={modalTempelTerbuka}
        judul="Tempel Kode atau Link Game"
        onTutup={() => setModalTempelTerbuka(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold text-[#DCE7FF]">
            Peramban membatasi akses otomatis ke papan klip. Tempel kode 8 karakter atau link lengkap (misalnya{' '}
            <span className="font-mono text-[#FFD400]">.../#/g/ABCD2345</span>) di bawah ini:
          </p>
          <input
            ref={inputModalTempelRef}
            type="text"
            value={teksModalTempel}
            onChange={(e) => setTeksModalTempel(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (pasted) {
                e.preventDefault();
                setModalTempelTerbuka(false);
                prosesTempelTeks(pasted);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && teksModalTempel.trim()) {
                e.preventDefault();
                setModalTempelTerbuka(false);
                prosesTempelTeks(teksModalTempel);
              }
            }}
            placeholder="Tempel di sini (Ctrl+V atau tahan lalu Tempel)..."
            className="min-h-[52px] w-full rounded-2xl border-2 border-[#3C62D4] bg-[#071236] px-4 text-base font-bold text-white placeholder-[#8FB1FF] focus:border-[#FFD400] focus:outline-none"
          />
          <div className="flex justify-end gap-3">
            <Button3D
              variant="navy"
              size="md"
              onClick={() => setModalTempelTerbuka(false)}
            >
              <span>Batal</span>
            </Button3D>
            <Button3D
              variant="hijau"
              size="md"
              onClick={() => {
                setModalTempelTerbuka(false);
                prosesTempelTeks(teksModalTempel);
              }}
            >
              <span>Gunakan Kode</span>
            </Button3D>
          </div>
        </div>
      </Modal>
    </div>
  );
};
