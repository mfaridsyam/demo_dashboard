import * as XLSX from 'xlsx-js-style';

const MONTHS_ID = {
  JANUARI: 'jan', FEBRUARI: 'feb', MARET: 'mar', APRIL: 'apr',
  MEI: 'mei', JUNI: 'jun', JULI: 'jul', AGUSTUS: 'agu',
  SEPTEMBER: 'sep', OKTOBER: 'okt', NOVEMBER: 'nov', DESEMBER: 'des',
};
const ALL_MONTHS = ['jan','feb','mar','apr','mei','jun','jul','agu','sep','okt','nov','des'];

const parseNum = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (!v) return 0;
  const s = String(v).trim().replace(/[^\d,.-]/g, '');
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(s) || 0;
};

export function parseRecoveryPH(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

        // Auto-detect header row: find row with CIFNO
        let hIdx = -1;
        for (let i = 0; i < Math.min(20, rows.length); i++) {
          if ((rows[i] || []).some(c => String(c || '').toUpperCase().trim() === 'CIFNO')) {
            hIdx = i; break;
          }
        }
        if (hIdx === -1) throw new Error('Kolom CIFNO tidak ditemukan. Pastikan ini adalah file Rincian Debitur Recovery PH.');

        const row1 = (rows[hIdx]     || []).map(h => String(h ?? '').trim().toUpperCase());
        const row2 = (rows[hIdx + 1] || []).map(h => String(h ?? '').trim().toUpperCase());

        // Two-row header: row1 has month names (merged), row2 has OS/Recovery PH/Realisasi PH
        const hasTwoRow = row2.some(h => h === 'OS' || h.includes('RECOVERY PH') || h.includes('REALISASI'));
        const dataStart  = hIdx + (hasTwoRow ? 2 : 1);

        // Fixed column indices from row1 (exact match for ambiguous names)
        const fiExact = (kw) => row1.findIndex(h => h.replace(/_/g, ' ').trim() === kw);
        const fiPart  = (kw) => row1.findIndex(h => h.includes(kw));

        const I = {
          kodeUker: fiExact('KODE UKER') !== -1 ? fiExact('KODE UKER') : fiPart('KODE UKER'),
          uker:     row1.findIndex(h => h.trim() === 'UKER'),
          cifno:    fiExact('CIFNO'),
          nama:     fiExact('NAMA DEBITUR') !== -1 ? fiExact('NAMA DEBITUR') : fiPart('NAMA DEBITUR'),
          segmen:   fiExact('SEGMEN') !== -1 ? fiExact('SEGMEN') : fiPart('SEGMEN'),
          produk:   fiExact('PRODUK'),
          jenis:    fiPart('JENIS RECOVERY'),
          orgamt:   fiPart('ORGAMT'),
        };

        // Find month column groups from row1 + row2
        const monthCols  = {};  // { 'jan': { os: colIdx, rec: colIdx, real: colIdx } }
        const availMonths = [];

        for (let col = 0; col < row1.length; col++) {
          const cell1 = row1[col];
          if (!cell1) continue;
          const monthKey = MONTHS_ID[cell1.trim()];
          if (!monthKey) continue;

          if (!monthCols[monthKey]) {
            monthCols[monthKey] = { os: -1, rec: -1, real: -1 };
            availMonths.push(monthKey);
          }
          // Look in row2 at this col and next 2 for sub-headers
          for (let sub = 0; sub < 4; sub++) {
            const c2 = (row2[col + sub] || '').trim();
            if (c2 === 'OS')                  monthCols[monthKey].os   = col + sub;
            else if (c2.includes('RECOVERY PH'))  monthCols[monthKey].rec  = col + sub;
            else if (c2.includes('REALISASI'))     monthCols[monthKey].real = col + sub;
          }
        }

        // Find Recovery Akumulasi column
        const akulIdx = row2.findIndex(h => h.includes('AKUMULASI'));

        const latestMonth = availMonths.length ? availMonths[availMonths.length - 1] : null;
        const latestCols  = latestMonth ? monthCols[latestMonth] : {};

        const debitur = [];
        for (let i = dataStart; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          const cifno = String(row[I.cifno] || '').trim();
          if (!cifno || cifno === 'null' || cifno === '0') continue;

          // Build monthly data for all 12 months
          const monthly = {};
          for (const m of ALL_MONTHS) {
            const mc = monthCols[m];
            monthly[`${m}_os`]   = mc ? parseNum(row[mc.os])   : 0;
            monthly[`${m}_rec`]  = mc ? parseNum(row[mc.rec])  : 0;
            monthly[`${m}_real`] = mc ? parseNum(row[mc.real]) : 0;
          }

          debitur.push({
            cifno,
            nama:           String(row[I.nama]   || '').trim(),
            kode_uker:      I.kodeUker >= 0 ? String(row[I.kodeUker] || '').trim() : '',
            uker_nama:      I.uker     >= 0 ? String(row[I.uker]     || '').trim() : '',
            segmen:         I.segmen   >= 0 ? String(row[I.segmen]   || '').trim() : '',
            produk:         I.produk   >= 0 ? String(row[I.produk]   || '').trim() : '',
            jenis_recovery: I.jenis    >= 0 ? String(row[I.jenis]    || '').trim() : '',
            orgamt_base:    I.orgamt   >= 0 ? parseNum(row[I.orgamt]) : 0,
            latest_os:       latestCols.os   >= 0 ? parseNum(row[latestCols.os])   : 0,
            latest_rec_ph:   latestCols.rec  >= 0 ? parseNum(row[latestCols.rec])  : 0,
            latest_real_ph:  latestCols.real >= 0 ? parseNum(row[latestCols.real]) : 0,
            recovery_akumulasi: akulIdx >= 0 ? parseNum(row[akulIdx]) : 0,
            monthly_data: JSON.stringify(Object.fromEntries(
              ALL_MONTHS.map(m => [m, { os: monthly[`${m}_os`], rec: monthly[`${m}_rec`], real: monthly[`${m}_real`] }])
            )),
          });
        }

        if (!debitur.length) throw new Error('Tidak ada data Recovery PH yang terbaca. Periksa format file.');

        const totalLatestOs     = debitur.reduce((s, d) => s + d.latest_os, 0);
        const totalLatestRecPh  = debitur.reduce((s, d) => s + d.latest_rec_ph, 0);
        const totalLatestRealPh = debitur.reduce((s, d) => s + d.latest_real_ph, 0);
        const totalAkumulasi    = debitur.reduce((s, d) => s + d.recovery_akumulasi, 0);
        const achievementPct    = totalLatestRecPh > 0 ? (totalLatestRealPh / totalLatestRecPh * 100) : 0;

        resolve({ debitur, availMonths, latestMonth, totalRows: debitur.length, totalLatestOs, totalLatestRecPh, totalLatestRealPh, totalAkumulasi, achievementPct });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
