import * as XLSX from 'xlsx';

const HEADER_ROW = 3; // row 4 di Excel (0-indexed)

function excelDateToJS(val) {
  if (!val || val === '-') return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial date
    const utc = (val - 25569) * 86400 * 1000;
    return new Date(utc);
  }
  if (typeof val === 'string') {
    const p = val.split('/');
    if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    const p2 = val.split('-');
    if (p2.length === 3) return new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
  }
  return null;
}

function calcDPD(periodeDate, tglMenunggak) {
  if (!tglMenunggak || tglMenunggak === 0 || tglMenunggak === '-') return 0;
  const tgl = excelDateToJS(tglMenunggak);
  if (!tgl || isNaN(tgl.getTime())) return 0;
  const diff = periodeDate.getTime() - tgl.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function mapKol(kolAdk, dpd) {
  const k = parseInt(kolAdk) || 1;
  if (k === 1) return '1';
  if (k === 2) return dpd <= 30 ? '2A' : '2B';
  if (k === 3) return '3';
  if (k === 4) return '4';
  return '5';
}

function mapTier(kol) {
  if (kol === '1') return 'rendah';
  if (kol === '2A' || kol === '2B') return 'sedang';
  return 'tinggi';
}

function mapSegment(plafonIDR) {
  const p = parseFloat(plafonIDR) || 0;
  if (p <= 100_000_000) return 'Mikro';
  if (p <= 800_000_000) return 'Kecil';
  return 'Menengah';
}

function extractMantriName(pnStr) {
  if (!pnStr || pnStr === '-') return 'Mantri';
  const s = String(pnStr).trim();
  const parts = s.split(/\s*[–\-]\s*/);
  return parts.length > 1 ? parts.slice(1).join(' ').trim() : s;
}

function calcSkor(dpd) {
  const b = dpd === 0 ? 97 : dpd <= 30 ? 84 : dpd <= 60 ? 72 : dpd <= 90 ? 64 : dpd <= 120 ? 52 : dpd <= 180 ? 42 : 32;
  return Math.max(5, Math.min(99, b));
}

function padCode(kode) {
  if (!kode) return '0000';
  return String(parseInt(kode) || 0).padStart(4, '0');
}

const BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export function parseLW321(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

        if (rows.length < HEADER_ROW + 2) throw new Error('Format file tidak sesuai — header tidak ditemukan');

        // Ambil header dari baris ke-4 (index 3)
        const headers = (rows[HEADER_ROW] || []).map(h => String(h ?? '').trim().toUpperCase());

        const idx = (name) => headers.indexOf(name.toUpperCase());

        const I = {
          periode:          idx('PERIODE'),
          kodeUker:         idx('KODE_UKER'),
          uker:             idx('UKER'),
          nama:             idx('NAMA_DEBITUR'),
          cif:              idx('CIFNO'),
          tglMenunggak:     idx('TGL_MENUNGGAK'),
          kolAdk:           idx('KOL_ADK'),
          tunggakan:        idx('TUNGGAKAN POKOK'),
          tunggakanBunga:   idx('TUNGGAKAN BUNGA'),
          tunggakanPinalti: idx('TUNGGAKAN PINALTI'),
          descSegmen:       idx('DESC SEGMEN LV1'),
          mantri:           idx('PN PENGELOLA 1'),
          balance:          idx('BALANCE DALAM IDR'),
          plafon:           idx('PLAFON DALAM IDR'),
        };

        // Validasi kolom wajib
        const missing = Object.entries(I).filter(([k,v]) => v === -1 && ['nama','cif','kolAdk','balance','kodeUker'].includes(k)).map(([k]) => k);
        if (missing.length > 0) throw new Error(`Kolom tidak ditemukan: ${missing.join(', ')}`);

        const debitur = [];
        const ukerMap = {};
        let periodeDate = new Date();
        let periodeLabel = `${BULAN[periodeDate.getMonth()]} ${periodeDate.getFullYear()}`;
        let periodeStr = '';
        let datePrinted = String(rows[1]?.[0] || '').replace('Date Printed : ', '').trim();

        for (let i = HEADER_ROW + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[I.nama]) continue;

          const balanceIDR = parseFloat(row[I.balance]) || 0;
          if (balanceIDR <= 0) continue;

          // Periode dari baris pertama data
          if (debitur.length === 0 && row[I.periode]) {
            const pd = excelDateToJS(row[I.periode]);
            if (pd && !isNaN(pd.getTime())) {
              periodeDate = pd;
              periodeLabel = `${BULAN[pd.getMonth()]} ${pd.getFullYear()}`;
              periodeStr = `${String(pd.getDate()).padStart(2,'0')}/${String(pd.getMonth()+1).padStart(2,'0')}/${pd.getFullYear()}`;
            }
          }

          const ukerKode = padCode(row[I.kodeUker]);
          const ukerNama = String(row[I.uker] || '').trim();
          if (ukerKode && ukerNama && !ukerMap[ukerKode]) {
            ukerMap[ukerKode] = ukerNama;
          }

          const tglMenunggak = row[I.tglMenunggak];
          const dpd = calcDPD(periodeDate, tglMenunggak);
          const kol = mapKol(row[I.kolAdk], dpd);
          const tier = mapTier(kol);

          const mantriRaw = row[I.mantri];
          const mantriNama = extractMantriName(mantriRaw);
          const mantriPn = String(mantriRaw || '').split(/\s*[–\-]\s*/)[0].trim();
          const mantriId = mantriPn || `${ukerKode}-0`;

          const plafonIDR = parseFloat(row[I.plafon]) || balanceIDR;
          const segment = mapSegment(plafonIDR);
          const balanceJt = balanceIDR / 1_000_000;

          const descSegmenRaw = String(row[I.descSegmen] || '').trim();
          const descSegmen = descSegmenRaw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

          const tunggakanPokokIdr   = parseFloat(row[I.tunggakan])        || 0;
          const tunggakanBungaIdr   = parseFloat(row[I.tunggakanBunga])   || 0;
          const tunggakanPinaltiIdr = parseFloat(row[I.tunggakanPinalti]) || 0;
          const months = Math.ceil(dpd / 30) || 0;
          const tPokok   = tunggakanPokokIdr   > 0 ? Math.round(tunggakanPokokIdr   / 1_000_000) : Math.round(balanceJt * (dpd / 360));
          const tBunga   = tunggakanBungaIdr   > 0 ? Math.round(tunggakanBungaIdr   / 1_000_000) : Math.round(tPokok * 0.15 / 12 * months);
          const tDenda   = Math.round(tPokok * 0.02 * months); // tidak ada di file, tetap estimasi
          const tPenalty = tunggakanPinaltiIdr > 0 ? Math.round(tunggakanPinaltiIdr / 1_000_000) : (dpd > 90 ? Math.round(tPokok * 0.01) : 0);

          debitur.push({
            cif:      String(row[I.cif] || '').trim(),
            nama:     String(row[I.nama] || '').trim(),
            ao:       mantriNama,
            aoId:     mantriId,
            pn:       mantriPn,
            uker:     ukerKode,
            ukerNama,
            segment,
            sektor:   descSegmen || 'Lainnya',
            osJt:     balanceJt,
            kol,
            dpd,
            skor:     calcSkor(dpd),
            tier,
            hasAction: tier !== 'rendah',
            resolved:  false,
            tunggakanPokok:   tPokok,
            tunggakanBunga:   tBunga,
            tunggakanDenda:   tDenda,
            tunggakanPenalty: tPenalty,
            tunggakanTotal:   tPokok + tBunga + tDenda + tPenalty,
          });
        }

        if (debitur.length === 0) throw new Error('Tidak ada data debitur yang terbaca dari file');

        const ukerList = Object.entries(ukerMap).map(([kode, nama]) => ({
          kode,
          nama,
          tipe: kode.startsWith('5') ? 'UNIT' : kode.startsWith('0') && parseInt(kode) > 300 ? 'KCP' : 'KANCA',
          n: debitur.filter(d => d.uker === kode).length,
        })).sort((a, b) => a.kode.localeCompare(b.kode));

        resolve({ debitur, periodeLabel, periodeStr, datePrinted, ukerList, totalRows: debitur.length });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
