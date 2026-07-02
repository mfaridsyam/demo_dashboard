import * as XLSX from 'xlsx-js-style';

const parseNum = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (!v) return 0;
  const s = String(v).trim().replace(/[^\d,.-]/g, '');
  // Handle Indonesian format: dots as thousands separator, comma as decimal
  if (s.includes(',')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(s) || 0;
};

const splitUkerCode = (raw) => {
  const s = String(raw || '').trim();
  const m = s.match(/^(\d+)\s*[-–]+\s*(.+)$/);
  return m ? { kode: m[1].trim(), nama: m[2].trim() } : { kode: '', nama: s };
};

export function parseCKPN(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

        // Auto-detect header row: look for row containing exactly "CIFNO"
        let hIdx = -1;
        for (let i = 0; i < Math.min(25, rows.length); i++) {
          if ((rows[i] || []).some(c => String(c || '').toUpperCase().trim() === 'CIFNO')) {
            hIdx = i; break;
          }
        }
        if (hIdx === -1) throw new Error('Kolom CIFNO tidak ditemukan. Pastikan ini adalah file BIAYA_CKPN_UKER.');

        const headers = (rows[hIdx] || []).map(h => String(h ?? '').trim().toUpperCase());
        const fi = (kw) => headers.findIndex(h => h.includes(kw));

        const I = {
          uker:          fi('UNIT KERJA'),
          kanca:         fi('KANTOR CABANG'),
          cifno:         fi('CIFNO'),
          nama:          fi('NAMA DEBITUR'),
          loanType:      fi('LOAN TYPE'),
          nilaiTercatat: fi('NILAI TERCATAT'),
          ckpnSebelum:   fi('CKPN SEBELUM'),
          ckpnBerjalan:  fi('CKPN BERJALAN'),
          biayaCkpn:     fi('BIAYA CKPN'),
          flagRestruk:   fi('FLAG RESTRUK'),
          stage:         fi('STAGE'),
          kol:           fi('KOLEKTIBILITAS'),
          umur:          fi('UMUR TUNGGAKAN'),
          segmentasi:    fi('SEGMENTASI'),
        };

        // Extract periode label from rows before header
        let periodeLabel = '';
        for (let i = 0; i < hIdx && !periodeLabel; i++) {
          for (const cell of (rows[i] || [])) {
            const s = String(cell || '').trim();
            const mDate = s.match(/\d{1,2}\s+\w{3,}\s+\d{4}/) || s.match(/\d{4}-\d{2}-\d{2}/);
            if (mDate) { periodeLabel = mDate[0].trim(); break; }
          }
        }

        const padKode = (k) => String(parseInt(k) || 0).padStart(4, '0');

        const debitur = [];
        for (let i = hIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          const cifno = String(row[I.cifno] || '').trim();
          if (!cifno || cifno === 'null' || cifno === '0') continue;

          const ukerRaw  = I.uker  >= 0 ? String(row[I.uker]  || '').trim() : '';
          const kancaRaw = I.kanca >= 0 ? String(row[I.kanca] || '').trim() : '';
          const { kode, nama: ukNama } = splitUkerCode(ukerRaw || kancaRaw);

          debitur.push({
            cifno,
            nama:           String(row[I.nama]  || '').trim(),
            kode_uker:      padKode(kode),
            uker_nama:      ukNama,
            loan_type:      I.loanType >= 0 ? String(row[I.loanType] || '').trim() : '',
            nilai_tercatat: parseNum(row[I.nilaiTercatat]),
            ckpn_sebelum:   parseNum(row[I.ckpnSebelum]),
            ckpn_berjalan:  parseNum(row[I.ckpnBerjalan]),
            biaya_ckpn:     parseNum(row[I.biayaCkpn]),
            flag_restruk:   String(row[I.flagRestruk] || 'N').trim().toUpperCase().startsWith('Y') ? 'Y' : 'N',
            stage:          parseInt(row[I.stage]) || 0,
            kol:            parseInt(row[I.kol])   || 1,
            umur_tunggakan: parseInt(row[I.umur])  || 0,
            segmentasi:     I.segmentasi >= 0 ? String(row[I.segmentasi] || '').trim() : '',
          });
        }

        if (!debitur.length) throw new Error('Tidak ada data CKPN yang terbaca. Periksa format file.');

        const totalCkpnBerjalan = debitur.reduce((s, d) => s + d.ckpn_berjalan, 0);
        const totalCkpnSebelum  = debitur.reduce((s, d) => s + d.ckpn_sebelum,  0);
        const totalBiayaCkpn    = debitur.reduce((s, d) => s + d.biaya_ckpn,    0);
        const totalNilai        = debitur.reduce((s, d) => s + d.nilai_tercatat, 0);
        const countRestruk      = debitur.filter(d => d.flag_restruk === 'Y').length;

        resolve({ debitur, periodeLabel, totalRows: debitur.length, totalCkpnBerjalan, totalCkpnSebelum, totalBiayaCkpn, totalNilai, countRestruk });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
