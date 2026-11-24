import assert from 'node:assert/strict';
import { ALFABET_KODE_ONLINE, validasiFormatKodeOnline } from '../services/gameOnlineService';
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
  ketikKarakterDiSlot,
  terapkanTempelKeSlot,
} from '../utils/kodeInput';

function jalankanSemuaUjiKodeInput(): void {
  // 1. Verifikasi tata letak QWERTY tepat berisi 32 karakter valid (tanpa I, O, 0, 1)
  assert.deepEqual([...BARIS_QWERTY_ANGKA], ['2', '3', '4', '5', '6', '7', '8', '9']);
  assert.deepEqual([...BARIS_QWERTY_1], ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'P']);
  assert.deepEqual([...BARIS_QWERTY_2], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L']);
  assert.deepEqual([...BARIS_QWERTY_3], ['Z', 'X', 'C', 'V', 'B', 'N', 'M']);

  const semuaTombol: string[] = [
    ...BARIS_QWERTY_ANGKA,
    ...BARIS_QWERTY_1,
    ...BARIS_QWERTY_2,
    ...BARIS_QWERTY_3,
  ];
  assert.equal(semuaTombol.length, ALFABET_KODE_ONLINE.length);
  for (const ch of ALFABET_KODE_ONLINE) {
    assert.ok(semuaTombol.includes(ch), `Karakter valid ${ch} harus ada di papan ketik`);
  }
  for (const terlarang of ['I', 'O', '0', '1']) {
    assert.ok(!semuaTombol.includes(terlarang), `Karakter ${terlarang} dilarang tampil`);
  }

  // 2. Ketik 8 karakter dengan papan ketik layar / huruf kecil -> kapital, siap masuk
  let slot = buatSlotKodeKosong();
  let kursor = 0;
  for (const ch of ['a', 'b', 'c', 'd', '2', '3', '4', '5']) {
    const res = ketikKarakterDiSlot(slot, kursor, ch);
    assert.equal(res.diterima, true);
    slot = res.slotKode;
    kursor = res.kursor;
  }
  assert.equal(gabungSlotKode(slot), 'ABCD2345');
  assert.equal(kursor, 8);
  assert.equal(apakahSlotKodeSiapMasuk(slot), true);
  assert.equal(validasiFormatKodeOnline(gabungSlotKode(slot)), true);

  // 3. Tolak I, O, 0, 1, spasi, dan simbol tanpa mengubah isi atau kursor
  for (const ditolak of ['i', 'I', 'o', 'O', '0', '1', ' ', '-', '!', '@']) {
    const resTolak = ketikKarakterDiSlot(slot, 3, ditolak);
    assert.equal(resTolak.diterima, false, `Harus menolak ${ditolak}`);
    assert.equal(gabungSlotKode(resTolak.slotKode), 'ABCD2345');
    assert.equal(resTolak.kursor, 3);
  }

  // 4. Backspace dan memperbaiki satu karakter di tengah
  // Kursor diletakkan di kotak ke-4 (indeks 3, berisi 'D') -> Backspace menghapus sebelum kursor (indeks 2, 'C')
  const resHapusTengah = hapusSebelumKursorSlot(slot, 3);
  assert.equal(resHapusTengah.terhapus, true);
  assert.equal(resHapusTengah.kursor, 2);
  assert.deepEqual(resHapusTengah.slotKode, ['A', 'B', '', 'D', '2', '3', '4', '5']);
  assert.equal(apakahSlotKodeSiapMasuk(resHapusTengah.slotKode), false);

  // Ketik huruf pengganti 'K' di indeks 2 -> kode menjadi ABKD2345 lengkap kembali
  const resPerbaiki = ketikKarakterDiSlot(resHapusTengah.slotKode, resHapusTengah.kursor, 'k');
  assert.equal(resPerbaiki.diterima, true);
  assert.equal(resPerbaiki.kursor, 3);
  assert.equal(gabungSlotKode(resPerbaiki.slotKode), 'ABKD2345');
  assert.equal(apakahSlotKodeSiapMasuk(resPerbaiki.slotKode), true);

  // Backspace di posisi kursor 0 tidak menghapus apa-apa
  const resAwal = hapusSebelumKursorSlot(resPerbaiki.slotKode, 0);
  assert.equal(resAwal.terhapus, false);
  assert.equal(resAwal.kursor, 0);
  assert.equal(gabungSlotKode(resAwal.slotKode), 'ABKD2345');

  // Delete di kursor 1 menghapus karakter di kotak 1
  const resDel = hapusDiKursorSlot(resPerbaiki.slotKode, 1);
  assert.equal(resDel.terhapus, true);
  assert.deepEqual(resDel.slotKode, ['A', '', 'K', 'D', '2', '3', '4', '5']);

  // 5. Tempel kode ber-spasi/strip, tempel link penuh, dan kode tempel tidak lengkap
  const tempelSpasiStrip = terapkanTempelKeSlot('  jev6 - 57wr  ');
  assert.equal(tempelSpasiStrip.lengkap, true);
  assert.equal(tempelSpasiStrip.kodeBersih, 'JEV657WR');
  assert.equal(tempelSpasiStrip.kursor, 8);
  assert.equal(apakahSlotKodeSiapMasuk(tempelSpasiStrip.slotKode), true);

  const tempelLinkPenuh = terapkanTempelKeSlot('https://duelotak.web.app/#/g/ab23-cd45?sumber=wa');
  assert.equal(tempelLinkPenuh.lengkap, true);
  assert.equal(tempelLinkPenuh.dariLinkPenuh, true);
  assert.equal(tempelLinkPenuh.kodeBersih, 'AB23CD45');

  const tempelTidakLengkap = terapkanTempelKeSlot('ab-01-cd');
  assert.equal(tempelTidakLengkap.lengkap, false);
  assert.equal(tempelTidakLengkap.kodeBersih, 'ABCD');
  assert.equal(tempelTidakLengkap.kursor, 4);
  assert.equal(tempelTidakLengkap.jenisStatus, 'peringatan');
  assert.ok(tempelTidakLengkap.pesanStatus?.includes('4 dari 8'));

  console.log('Semua uji Papan Ketik Kode QWERTY (tata letak, huruf kecil->besar, tolak I/O/0/1, kursor tengah + backspace, tempel spasi/strip/link) LULUS.');
}

jalankanSemuaUjiKodeInput();
