import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Sector, LabelList, BarChart, Bar, Legend
} from "recharts";

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return w;
}

const C = {
  navy:"#1F4E79", navyLt:"#EBF2FF",
  sidebar:"#15396A", sidebarActive:"#2C5A93", sidebarText:"#AFC1DC", sidebarMuted:"#7E98BC",
  red:"#C0282D", redLt:"#FCECEC", amber:"#B45309", amberLt:"#FFF6E9",
  green:"#15803D", greenLt:"#E9F6EC", gray:"#6B7280", grayLt:"#F8FAFC",
  border:"#E5E7EB", white:"#FFFFFF", text:"#111827", textMd:"#374151", bg:"#F2F5F9",
  kpiBlue:"#2563EB", kpiTeal:"#0D9488", kpiGreen:"#16A34A",
  kpiAmber:"#F59E0B", kpiRed:"#DC2626", kpiPurple:"#7C3AED",
};

const ICON = {
  dashboard:(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>),
  portfolio:(<><path d="M4 5h16M4 12h16M4 19h10"/></>),
  warning:(<><path d="M12 3l9 16H3z"/><line x1="12" y1="9" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17"/></>),
  users:(<><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 6.5a3 3 0 010 5.8"/><path d="M21 20c0-2.5-1.6-4.6-3.8-5.4"/></>),
  clipboard:(<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 12l2 2 4-4"/></>),
  calc:(<><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8.5" y1="12" x2="8.5" y2="12"/><line x1="12" y1="12" x2="12" y2="12"/><line x1="15.5" y1="12" x2="15.5" y2="12"/><line x1="8.5" y1="16" x2="8.5" y2="16"/><line x1="12" y1="16" x2="12" y2="16"/></>),
  userPerf:(<><circle cx="12" cy="7" r="3.2"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></>),
  building:(<><rect x="5" y="3" width="14" height="18" rx="1.5"/><line x1="9" y1="7" x2="9" y2="7"/><line x1="15" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="9" y2="11"/><line x1="15" y1="11" x2="15" y2="11"/><line x1="10" y1="21" x2="14" y2="21"/></>),
  doc:(<><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><line x1="9.5" y1="12" x2="15" y2="12"/><line x1="9.5" y1="16" x2="15" y2="16"/></>),
  gear:(<><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.4-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.4-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.4 1 2-3.5-2-1.5a7 7 0 00.1-1z"/></>),
  chevronR:(<><path d="M9 6l6 6-6 6"/></>),
  chevronD:(<><path d="M6 9l6 6 6-6"/></>),
  wallet:(<><path d="M3 7a2 2 0 012-2h12a2 2 0 012 2v1"/><path d="M3 7v10a2 2 0 002 2h13a2 2 0 002-2v-3"/><path d="M21 11h-4a2 2 0 000 4h4z"/></>),
  thumb:(<><path d="M7 11v9H4v-9z"/><path d="M7 11l4-7a2 2 0 013 1.7V9h4.5a2 2 0 011.97 2.35l-1.1 7A2 2 0 0117.4 20H7"/></>),
  infoCircle:(<><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8"/></>),
  shield:(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/></>),
  infoDoc:(<><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></>),
  userCircle:(<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.3 19a6 6 0 0111.4 0"/></>),
  calendar:(<><rect x="4" y="5" width="16" height="16" rx="2"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="9" y1="3" x2="9" y2="6"/><line x1="15" y1="3" x2="15" y2="6"/></>),
  check:(<><circle cx="12" cy="12" r="9"/><path d="M8.3 12l2.4 2.4 4.6-5"/></>),
  search:(<><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>),
  download:(<><path d="M12 4v11"/><path d="M8 11l4 4 4-4"/><path d="M5 19h14"/></>),
  upload:(<><path d="M12 16V5"/><path d="M8 9l4-4 4 4"/><path d="M5 19h14"/></>),
};
const Ic = ({ n, size=18, sw=1.8, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={style}>{ICON[n]}</svg>
);

function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
const pick = (arr,rng)=>arr[Math.floor(rng()*arr.length)];

const UKER = [
  { kode:"0259", nama:"Kanca Polewali",   tipe:"KANCA", n:80 },
  { kode:"0645", nama:"KCP Wonomulyo",    tipe:"KCP",   n:52 },
  { kode:"2042", nama:"KCP Mamasa",       tipe:"KCP",   n:44 },
  { kode:"5031", nama:"Unit Sumarorong",  tipe:"UNIT",  n:28 },
  { kode:"5032", nama:"Unit Bumiayu",     tipe:"UNIT",  n:31 },
  { kode:"5033", nama:"Unit Campalagian", tipe:"UNIT",  n:35 },
  { kode:"5034", nama:"Unit Darma",       tipe:"UNIT",  n:26 },
  { kode:"5035", nama:"Unit Luyo",        tipe:"UNIT",  n:24 },
  { kode:"5036", nama:"Unit Mamasa",      tipe:"UNIT",  n:22 },
  { kode:"5037", nama:"Unit Polewali",    tipe:"UNIT",  n:34 },
  { kode:"5038", nama:"Unit Sidodadi",    tipe:"UNIT",  n:25 },
  { kode:"7490", nama:"Unit Pajalele",    tipe:"UNIT",  n:21 },
  { kode:"8026", nama:"Unit Mambi",       tipe:"UNIT",  n:18 },
];

const NAMA_AO = ["Andi","Budi","Citra","Dewi","Eka","Fajar","Gita","Hadi","Indah","Joko","Lina","Maman","Nadia","Oka","Putri","Rina","Sari","Tono","Umar","Vina","Wawan","Yuni"];
const PREFIX = ["PT.","CV.","UD.","Toko","Koperasi"];
const NAMA1 = ["Maju","Sinar","Sentosa","Karya","Cahaya","Mega","Bintang","Tiga","Mitra","Harapan","Surya","Berkah","Jaya","Sumber","Makmur","Sejahtera","Abadi","Mandiri","Lestari","Subur","Bahari","Rezeki","Barokah","Usaha"];
const NAMA2 = ["Bersama","Abadi","Jaya","Indah","Utama","Timur","Putra","Sukses","Mandiri","Makmur","Sentosa","Lestari","Sejahtera","Group","Tani","Niaga"];
const SEKTOR = ["Perdagangan","Pertanian","Jasa","Konstruksi","Perikanan","Industri"];

const KOL_ORDER = ["1","2A","2B","3","4","5"];
const KOL_COLOR = { "1":"#16A34A","2A":"#F59E0B","2B":"#EA580C","3":"#DC2626","4":"#B91C1C","5":"#7F1D1D" };
const KOL_LABEL = { "1":"Lancar","2A":"2A","2B":"2B","3":"3","4":"4","5":"5" };
const COV = { "1":0.01,"2A":0.05,"2B":0.15,"3":0.5,"4":0.75,"5":1.0 };
const BETTER = { "2A":"1","2B":"2A","3":"2B","4":"3","5":"4" };

const rng = mulberry32(20260531);
const AO = [];
UKER.forEach(u => {
  const k = u.tipe==="KANCA" ? 5 : u.tipe==="KCP" ? 3 : 2;
  const role = u.tipe==="UNIT" ? "Mantri" : "AO";
  for (let i=0;i<k;i++) AO.push({ id:`${u.kode}-${i}`, nama:`${role} ${pick(NAMA_AO,rng)}`, uker:u.kode });
});

const pickKol = () => { const r=rng(); return r<0.83?"1":r<0.88?"2A":r<0.92?"2B":r<0.955?"3":r<0.98?"4":"5"; };
const dpdFor = (kol) => { const R=(a,b)=>a+Math.floor(rng()*(b-a+1)); return kol==="1"?0:kol==="2A"?R(1,30):kol==="2B"?R(31,90):kol==="3"?R(91,120):kol==="4"?R(121,180):R(181,270); };
const segFor = (tipe) => { const r=rng(); return tipe==="UNIT"?(r<0.9?"Mikro":"Kecil"):tipe==="KCP"?(r<0.55?"Mikro":r<0.9?"Kecil":"Menengah"):(r<0.3?"Mikro":r<0.7?"Kecil":"Menengah"); };
const osFor = (seg) => { const R=(a,b)=>Math.round(a+rng()*(b-a)); return seg==="Mikro"?R(10,100):seg==="Kecil"?R(100,800):R(800,5000); };
const skorFor = (dpd) => { const b=dpd===0?97:dpd<=30?84:dpd<=60?72:dpd<=90?64:dpd<=120?52:dpd<=180?42:32; return clamp(Math.round(b+(rng()*12-6)),5,99); };
const genNama = () => `${pick(PREFIX,rng)} ${pick(NAMA1,rng)}${rng()<0.6?" "+pick(NAMA2,rng):""}`;

const DEBITUR = [];
let cifSeq = 12000000;
UKER.forEach(u => {
  const aoU = AO.filter(a=>a.uker===u.kode);
  for (let i=0;i<u.n;i++) {
    const kol = pickKol();
    const dpd = dpdFor(kol);
    const seg = segFor(u.tipe);
    const tier = kol==="1" ? "rendah" : (kol==="2A"||kol==="2B") ? "sedang" : "tinggi";
    const hasAction = tier!=="rendah" && rng() < (tier==="tinggi"?0.7:0.35);
    const resolved = hasAction && rng() < 0.3;
    const ao = pick(aoU,rng);
    DEBITUR.push({
      cif:String(cifSeq++), nama:genNama(), ao:ao.nama, aoId:ao.id,
      uker:u.kode, ukerNama:u.nama, segment:seg, sektor:pick(SEKTOR,rng),
      osJt:osFor(seg), kol, dpd, skor:skorFor(dpd), tier, hasAction, resolved,
    });
  }
});

const _aoCount = {};
DEBITUR.forEach(d => { _aoCount[d.aoId] = (_aoCount[d.aoId]||0)+1; });
const DEMO_AO_ID = Object.keys(_aoCount).sort((a,b)=>_aoCount[b]-_aoCount[a])[0];
const DEMO_AO = AO.find(a=>a.id===DEMO_AO_ID);
const DEMO_AO_UKER = UKER.find(u=>u.kode===DEMO_AO.uker);

const ALL_MENUS = ["dashboard","portfolio","ews","debitur","action","ckpn","kinerjaAO","kinerjaUnit","laporan","pengaturan"];
const ROLES = {
  pinca: { id:"pinca", nama:"Hery Susanto", title:"Pimpinan Cabang", icon:"userCircle", color:C.kpiBlue,
    desc:"Monitoring seluruh cabang & unit kerja", akses:"Lihat semua data · read-only (mode pantau)",
    scope:"all", editAction:false, editData:false, exportReport:true, menus:ALL_MENUS },
  mb: { id:"mb", nama:"Dewi Anggraini", title:"Manajer Bisnis", icon:"userPerf", color:C.kpiPurple,
    desc:"Pengendalian portofolio cabang", akses:"Kelola action plan, simulasi CKPN & kelola data",
    scope:"all", editAction:true, editData:true, exportReport:true, menus:ALL_MENUS },
  ao: { id:"ao", nama:DEMO_AO?DEMO_AO.nama:"Account Officer", title:"Account Officer / Mantri", icon:"userPerf", color:C.kpiTeal,
    desc:`Tindak lanjut debitur · ${DEMO_AO_UKER?DEMO_AO_UKER.nama:""}`, akses:"Hanya portofolio sendiri · input action plan",
    scope:"ao", editAction:true, editData:false, exportReport:false, menus:["dashboard","ews","debitur","action"] },
  collection: { id:"collection", nama:"Rudi Hartono", title:"Collection Officer", icon:"userPerf", color:C.kpiAmber,
    desc:"Penagihan debitur bermasalah", akses:"Debitur Kol 2-5 · update penagihan",
    scope:"bermasalah", editAction:true, editData:false, exportReport:false, menus:["dashboard","ews","debitur","action"] },
};

const PERIODE = {
  "Mei 2026": { f:1.00, date:"31 Mei 2026", months:["Des '25","Jan '26","Feb '26","Mar '26","Apr '26","Mei '26"], months12:["Jun '25","Jul '25","Agu '25","Sep '25","Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26","Apr '26","Mei '26"] },
  "Apr 2026": { f:0.972, date:"30 Apr 2026", months:["Nov '25","Des '25","Jan '26","Feb '26","Mar '26","Apr '26"], months12:["Mei '25","Jun '25","Jul '25","Agu '25","Sep '25","Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26","Apr '26"] },
  "Mar 2026": { f:0.945, date:"31 Mar 2026", months:["Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26"], months12:["Apr '25","Mei '25","Jun '25","Jul '25","Agu '25","Sep '25","Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26"] },
};
const PAT_OS    = [0.93,0.95,0.96,0.975,0.99,1.0];
const PAT_DEB   = [0.95,0.96,0.97,0.98,0.99,1.0];
const PAT_CKPN  = [0.87,0.90,0.92,0.95,0.98,1.0];
const PAT_TUNGG = [0.66,0.74,0.81,0.94,0.86,1.0];
const PAT_CKPN_12  = [0.62,0.65,0.68,0.72,0.76,0.81, 0.87,0.90,0.92,0.95,0.98,1.0];
const PAT_TUNGG_12 = [0.38,0.43,0.49,0.54,0.58,0.62, 0.66,0.74,0.81,0.94,0.86,1.0];

const fNum  = (n)=>Math.round(n).toLocaleString("id-ID");
const fMil  = (jt)=>"Rp "+(jt/1000).toLocaleString("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2})+" M";
const fJt   = (jt)=>"Rp "+Math.round(jt).toLocaleString("id-ID")+" Jt";
const fFull = (jt)=>"Rp "+Math.round(jt*1e6).toLocaleString("id-ID");
const fPct  = (x,d=2)=>x.toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d})+"%";
const fMilV = (v)=>v.toLocaleString("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1})+" M";

function buildModel(list, periode) {
  const P = PERIODE[periode] || PERIODE["Mei 2026"];
  const f = P.f;
  const sum = (arr,sel)=>arr.reduce((s,d)=>s+sel(d),0);

  const totalDeb = list.length;
  const totalOsJt = sum(list,d=>d.osJt) * f;
  const tier = { rendah:0, sedang:0, tinggi:0 };
  list.forEach(d=>tier[d.tier]++);

  const kol = KOL_ORDER.map(k=>{
    const items = list.filter(d=>d.kol===k);
    const cnt = items.length;
    return { kol:k, legend:KOL_LABEL[k], color:KOL_COLOR[k], value:cnt,
      pct: totalDeb? cnt/totalDeb*100 : 0, osJt: sum(items,d=>d.osJt)*f };
  });

  const osTinggi = sum(list.filter(d=>d.tier==="tinggi"),d=>d.osJt)*f;
  const npl = totalOsJt ? osTinggi/totalOsJt*100 : 0;

  const ckpnExisting = sum(list,d=>d.osJt*COV[d.kol]) * f;
  const ckpnSaving   = sum(list.filter(d=>d.hasAction),d=>d.osJt*(COV[d.kol]-COV[BETTER[d.kol]||d.kol])) * f;
  const ckpnAfter    = ckpnExisting - ckpnSaving;
  const savingPct    = ckpnExisting ? ckpnSaving/ckpnExisting*100 : 0;
  const tunggakanJt  = sum(list.filter(d=>d.dpd>0),d=>d.osJt) * f;

  const ser = (cur,pat)=>pat.map((p,i)=>({ bln:P.months[i], nilai:+(cur*p).toFixed(3) }));
  const delta = (pat)=> (1-pat[4]/pat[5])*100;

  const top10 = [...list].filter(d=>d.kol!=="1").sort((a,b)=>b.osJt-a.osJt).slice(0,10);

  const ringkasanEW = [
    { label:"Risiko Tinggi", value:tier.tinggi, color:C.red,   pct: totalDeb?tier.tinggi/totalDeb*100:0 },
    { label:"Risiko Sedang", value:tier.sedang, color:C.amber, pct: totalDeb?tier.sedang/totalDeb*100:0 },
    { label:"Risiko Rendah", value:tier.rendah, color:C.green, pct: totalDeb?tier.rendah/totalDeb*100:0 },
  ];

  const groupBy = (keyFn) => {
    const m = {};
    list.forEach(d=>{ const k=keyFn(d); (m[k]=m[k]||[]).push(d); });
    return m;
  };

  const gU = groupBy(d=>d.uker);
  const perUker = UKER.filter(u=>gU[u.kode]).map(u=>{
    const it = gU[u.kode];
    const os = sum(it,d=>d.osJt)*f;
    const osT = sum(it.filter(d=>d.tier==="tinggi"),d=>d.osJt)*f;
    const nplU = os?osT/os*100:0;
    return { kode:u.kode, nama:u.nama, label:`${u.nama}`, deb:it.length, osJt:os,
      npl:nplU, ckpn:sum(it,d=>d.osJt*COV[d.kol])*f, tinggi:it.filter(d=>d.tier==="tinggi").length,
      recovery:clamp(Math.round(92-nplU*2.6),55,95) };
  }).sort((a,b)=>b.osJt-a.osJt);

  const gA = groupBy(d=>d.aoId);
  const perAO = Object.values(gA).map(it=>{
    const a = it[0];
    return { nama:a.ao, uker:a.ukerNama, deb:it.length, osJt:sum(it,d=>d.osJt)*f,
      tinggi:it.filter(d=>d.tier==="tinggi").length,
      actionTotal:it.filter(d=>d.hasAction).length,
      actionSelesai:it.filter(d=>d.resolved).length,
      berhasil:it.filter(d=>d.resolved).length };
  }).sort((a,b)=>b.osJt-a.osJt);

  const gS = groupBy(d=>d.sektor);
  const perSektor = SEKTOR.filter(s=>gS[s]).map(s=>({ sektor:s, osJt:sum(gS[s],d=>d.osJt)*f, deb:gS[s].length }))
    .sort((a,b)=>b.osJt-a.osJt);
  const gSeg = groupBy(d=>d.segment);
  const perSegment = ["Mikro","Kecil","Menengah"].filter(s=>gSeg[s]).map(s=>({ segment:s, osJt:sum(gSeg[s],d=>d.osJt)*f, deb:gSeg[s].length }));

  const alasanTinggi = [
    "DPD melewati batas 90 hari",
    "Penurunan omzet > 50%, usaha terindikasi bermasalah",
    "Kolektibilitas memburuk, tunggakan pokok & bunga berlanjut",
    "Tunggakan angsuran > 3 bulan berturut-turut",
    "Usaha berhenti / tidak aktif berdasarkan kunjungan lapangan",
    "Nilai agunan menurun signifikan di bawah outstanding",
  ];
  const alasanSedang = [
    "DPD 1–90 hari, perlu monitoring & kunjungan rutin",
    "Saldo rekening menurun signifikan dalam 3 bulan terakhir",
    "Frekuensi transaksi debit-kredit menurun > 40%",
    "Penurunan saldo rata-rata rekening koran",
    "Keterlambatan pembayaran angsuran berulang",
    "Omzet usaha terindikasi turun 20–50%",
  ];
  const alasanRendah = [
    "Pembayaran angsuran rutin & tepat waktu — kondisi lancar",
    "Saldo rekening stabil, tidak ada anomali mutasi",
    "Mutasi rekening aktif & normal sesuai pola usaha",
    "Aktivitas usaha berjalan baik, tidak ada indikasi masalah",
  ];
  const mkAlertTime = (i) => {
    const h = String(Math.max(7, 17 - Math.floor(i/2))).padStart(2,"0");
    const mn = String(55 - (i*7)%56).padStart(2,"0");
    return `${P.date} ${h}:${mn}`;
  };
  const topTinggi = [...list].filter(d=>d.tier==="tinggi").sort((a,b)=>b.dpd-a.dpd).slice(0,8);
  const topSedang = [...list].filter(d=>d.tier==="sedang").sort((a,b)=>b.dpd-a.dpd).slice(0,6);
  const topRendah = [...list].filter(d=>d.tier==="rendah").sort((a,b)=>b.osJt-a.osJt).slice(0,4);
  const alerts = [
    ...topTinggi.map((d,i)=>({ level:"tinggi", text:`Debitur ${d.nama} (CIF ${d.cif}) — ${alasanTinggi[i%alasanTinggi.length]} · DPD ${d.dpd} hari`, time:mkAlertTime(i) })),
    ...topSedang.map((d,i)=>({ level:"sedang", text:`Debitur ${d.nama} (CIF ${d.cif}) — ${alasanSedang[i%alasanSedang.length]} · DPD ${d.dpd} hari`, time:mkAlertTime(i+8) })),
    ...topRendah.map((d,i)=>({ level:"rendah", text:`Debitur ${d.nama} (CIF ${d.cif}) — ${alasanRendah[i%alasanRendah.length]}`, time:mkAlertTime(i+14) })),
  ];

  const jenisFor = (d,i)=> d.tier==="tinggi" ? (i%2?"Restrukturisasi":"Kunjungan & Negosiasi")
    : (i%2?"Reminder & Monitoring":"Surat Peringatan 1");
  const actionPlans = list.filter(d=>d.hasAction).sort((a,b)=>b.osJt-a.osJt).slice(0,40).map((d,i)=>({
    tgl:`${20+(i%9)}/05/2026`, cif:d.cif, nama:d.nama, ao:d.ao, kol:d.kol,
    jenis:jenisFor(d,i), target:`${10+(i%18)}/06/2026`,
    status:d.resolved?"selesai":"in_progress", hasil:d.resolved?"Debitur konfirmasi membaik":"Dalam proses tindak lanjut",
  }));

  const ckpnDebitur = [...list].filter(d=>d.kol!=="1").sort((a,b)=>b.osJt*COV[b.kol]-a.osJt*COV[a.kol]).slice(0,10).map(d=>{
    const ex=d.osJt*COV[d.kol]*f; const sv=d.hasAction?d.osJt*(COV[d.kol]-COV[BETTER[d.kol]||d.kol])*f:0;
    return { nama:d.nama, osJt:d.osJt*f, kol:d.kol, ckpn:ex, saving:sv, pct: ex?sv/ex*100:0 };
  });

  const ser12 = (cur,pat)=>pat.map((p,i)=>({ bln:P.months12[i], nilai:+(cur*p).toFixed(3) }));

  return {
    P, totalDeb, totalOsJt, tier, kol, npl, ckpnExisting, ckpnAfter, ckpnSaving, savingPct,
    tunggakanJt,
    trendTunggakan: ser(tunggakanJt/1000, PAT_TUNGG),
    trendCKPN: ser(ckpnExisting/1000, PAT_CKPN),
    trendTunggakan12: ser12(tunggakanJt/1000, PAT_TUNGG_12),
    trendCKPN12: ser12(ckpnExisting/1000, PAT_CKPN_12),
    deltas:{ os:delta(PAT_OS), deb:delta(PAT_DEB), ckpn:delta(PAT_CKPN) },
    top10, ringkasanEW, perUker, perAO, perSektor, perSegment, alerts, actionPlans, ckpnDebitur,
  };
}

const risikoColor = { tinggi:C.red, sedang:C.amber, rendah:C.green };
const risikoBg    = { tinggi:C.redLt, sedang:C.amberLt, rendah:C.greenLt };
const risikoLabel = { tinggi:"Risiko Tinggi", sedang:"Risiko Sedang", rendah:"Risiko Rendah" };
const skorColor   = (s)=> s<60?C.kpiRed : s<80?C.kpiAmber : C.kpiGreen;
const statusLabel = { in_progress:"In Progress", selesai:"Selesai" };
const card = { background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:14, boxShadow:"0 1px 2px rgba(16,24,40,.04)" };

const CardTitle = ({ children, right }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, gap:8 }}>
    <div style={{ fontSize:12.5, fontWeight:700, color:"#1F2937", letterSpacing:.3, textTransform:"uppercase" }}>{children}</div>
    {right}
  </div>
);
const Badge = ({ level }) => (
  <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:risikoBg[level], color:risikoColor[level], fontSize:12, fontWeight:600 }}>{risikoLabel[level]}</span>
);
const SkorPill = ({ s }) => (
  <span style={{ display:"inline-block", minWidth:30, textAlign:"center", padding:"2px 8px", borderRadius:12, background:skorColor(s), color:"#fff", fontSize:11, fontWeight:700 }}>{s}</span>
);
const KpiCard = ({ icon, color, label, prefix, value, sub, subColor }) => (
  <div style={{ ...card, padding:"12px 14px", display:"flex", flexDirection:"column", minWidth:0 }}>
    <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6 }}>
      <div style={{ width:34, height:34, borderRadius:8, background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={icon} size={18} sw={1.9} /></div>
      <div style={{ fontSize:10.5, fontWeight:600, color:C.gray, letterSpacing:.3, textTransform:"uppercase", lineHeight:1.2 }}>{label}</div>
    </div>
    {prefix && <div style={{ fontSize:11.5, color:C.gray, marginBottom:-3 }}>{prefix}</div>}
    <div style={{ fontSize:22, fontWeight:700, color:C.text }}>{value}</div>
    <div style={{ fontSize:11, color:subColor || C.gray, marginTop:2, fontWeight:500 }}>{sub}</div>
  </div>
);
const renderActiveSlice = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 5} startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="#fff" strokeWidth={2} />;
};

const Donut = ({ data, centerTop, centerBottom, size=150, unit="debitur" }) => {
  const [active, setActive] = useState(-1);
  const outer = Math.round(size*0.45), inner = Math.round(size*0.31);
  const hov = active>=0 ? data[active] : null;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="legend" innerRadius={inner} outerRadius={outer}
            startAngle={90} endAngle={-270} stroke="#fff" strokeWidth={1.5} paddingAngle={1}
            activeIndex={active} activeShape={renderActiveSlice} isAnimationActive={false}
            onMouseEnter={(_,i)=>setActive(i)} onMouseLeave={()=>setActive(-1)}>
            {data.map((d,i)=><Cell key={i} fill={d.color} opacity={active===-1||active===i?1:0.4} style={{ transition:"opacity .15s", cursor:"pointer" }} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", pointerEvents:"none", textAlign:"center", padding:"0 10px" }}>
        {hov ? (<>
          <div style={{ fontSize: size>=170?12.5:11, fontWeight:700, color:hov.color, lineHeight:1.2 }}>{hov.legend || hov.label}</div>
          <div style={{ fontSize: size>=170?20:16, fontWeight:800, color:C.text }}>{fNum(hov.value)}</div>
          <div style={{ fontSize:10, color:C.gray }}>{unit}</div>
        </>) : (<>
          <div style={{ fontSize: size>=170?19:15, fontWeight:800, color:C.text }}>{centerTop}</div>
          <div style={{ fontSize: size>=170?12:10.5, color:C.gray }}>{centerBottom}</div>
        </>)}
      </div>
    </div>
  );
};

const RingCard = ({ title, data, total, totalLabel, fmtVal }) => (
  <div style={{ ...card, display:"flex", flexDirection:"column" }}>
    <CardTitle>{title}</CardTitle>
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 }}>
      <Donut data={data} size={190} centerTop={total} centerBottom={totalLabel} />
      <div style={{ width:"100%", maxWidth:300 }}>
        {data.map((d,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9, fontSize:12.5, padding:"6px 0", borderTop: i?`1px solid #F1F3F6`:"none" }}>
            <span style={{ width:11, height:11, borderRadius:"50%", background:d.color, flexShrink:0 }} />
            <span style={{ color:C.textMd }}>{d.legend || d.label}</span>
            <span style={{ marginLeft:"auto", color:C.text, fontWeight:700 }}>{fmtVal(d)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
const TrendChart = ({ data, color=C.kpiBlue }) => {
  const max = Math.max(...data.map(d=>d.nilai), 1);
  const top = Math.ceil(max*1.25);
  return (
    <ResponsiveContainer width="100%" height={170}>
      <LineChart data={data} margin={{ top:20, right:16, left:-4, bottom:0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
        <XAxis dataKey="bln" tick={{ fontSize:10.5, fill:C.gray }} tickLine={false} axisLine={{ stroke:C.border }} />
        <YAxis tick={{ fontSize:10.5, fill:C.gray }} tickLine={false} axisLine={false} domain={[0,top]} tickFormatter={(v)=>v+" M"} width={42} />
        <Tooltip formatter={(v)=>[fMilV(v),"Nilai"]} />
        <Line type="monotone" dataKey="nilai" stroke={color} strokeWidth={2.4} dot={{ r:3, fill:color, strokeWidth:0 }} activeDot={{ r:4 }}>
          <LabelList dataKey="nilai" position="top" formatter={(v)=>fMilV(v)} style={{ fontSize:9.5, fill:C.textMd, fontWeight:600 }} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
};
const BarH = ({ data, dataKey, nameKey, color=C.kpiBlue, fmt, height }) => (
  <ResponsiveContainer width="100%" height={height || data.length*26+18}>
    <BarChart data={data} layout="vertical" margin={{ top:0, right:54, left:6, bottom:0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" horizontal={false} />
      <XAxis type="number" tick={{ fontSize:10, fill:C.gray }} tickFormatter={fmt} axisLine={false} tickLine={false} />
      <YAxis type="category" dataKey={nameKey} width={116} tick={{ fontSize:11, fill:C.textMd }} axisLine={false} tickLine={false} />
      <Tooltip formatter={(v)=>[fmt?fmt(v):v]} />
      <Bar dataKey={dataKey} fill={color} radius={[0,4,4,0]} maxBarSize={16}>
        <LabelList dataKey={dataKey} position="right" formatter={fmt} style={{ fontSize:9.5, fill:C.textMd, fontWeight:600 }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
const BarV = ({ data, dataKey, nameKey, color=C.kpiBlue, fmt, height=205 }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top:14, right:10, left:-6, bottom:0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
      <XAxis dataKey={nameKey} tick={{ fontSize:10, fill:C.gray }} tickLine={false} axisLine={{ stroke:C.border }} interval={0} />
      <YAxis tick={{ fontSize:10, fill:C.gray }} tickFormatter={fmt} axisLine={false} tickLine={false} width={46} />
      <Tooltip formatter={(v)=>[fmt?fmt(v):v]} />
      <Bar dataKey={dataKey} fill={color} radius={[5,5,0,0]} maxBarSize={48} />
    </BarChart>
  </ResponsiveContainer>
);
const Select = ({ value, onChange, options, style }) => (
  <select value={value} onChange={onChange} style={{ padding:"6px 9px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12.5, background:C.white, color:C.textMd, cursor:"pointer", ...style }}>
    {options.map(o=> typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const Tabel = ({ headers, rows, colW, stickyHeader }) => (
  <div style={stickyHeader ? {} : { overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
      <thead>
        <tr>
          {headers.map((h,i)=>(
            <th key={i} style={{ padding:"9px 12px", color:C.gray, fontWeight:600, fontSize:10.5, textTransform:"uppercase", textAlign:"left", width:colW?.[i], whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}`, background:C.grayLt, ...(stickyHeader?{ position:"sticky", top:0, zIndex:1 }:{}) }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row,ri)=>(
          <tr key={ri} style={{ background: ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6` }}>
            {row.map((cell,ci)=><td key={ci} style={{ padding:"9px 12px", color:C.textMd, verticalAlign:"middle" }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const SubFilter = ({ children }) => (
  <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>{children}</div>
);


function Dashboard({ m, go }) {
  const w = useWindowWidth();
  const kpiCols   = w >= 1280 ? "repeat(6,1fr)" : w >= 900 ? "repeat(3,1fr)" : "repeat(2,1fr)";
  const chartsRow = w >= 1100 ? "1fr 1fr 1fr" : w >= 720 ? "1fr 1fr" : "1fr";
  const [blnTungg, setBlnTungg] = useState("6 Bulan");
  const [blnCKPN,  setBlnCKPN]  = useState("6 Bulan");
  const getTrend = (d6, d12, bln) => bln==="3 Bulan" ? d6.slice(-3) : bln==="12 Bulan" ? d12 : d6;
  const row3      = w >= 1150 ? "1.5fr 1fr 1fr" : "1fr";
  const row4      = w >= 1000 ? "1.3fr 1fr" : "1fr";
  const up = (x)=>(x>=0?"▲ ":"▼ ")+fPct(Math.abs(x),2)+" vs bln lalu";

  const KPI = [
    { icon:"wallet",     color:C.kpiBlue,   label:"Total Outstanding",       prefix:"Rp", value:fMil(m.totalOsJt).replace("Rp ",""), sub:up(m.deltas.os), subColor:C.green },
    { icon:"users",      color:C.kpiTeal,   label:"Total Debitur",                        value:fNum(m.totalDeb),                    sub:up(m.deltas.deb), subColor:C.green },
    { icon:"thumb",      color:C.kpiGreen,  label:"Debitur Lancar",                        value:fNum(m.tier.rendah),                 sub:fPct(m.ringkasanEW[2].pct)+" dari total", subColor:C.navy },
    { icon:"infoCircle", color:C.kpiAmber,  label:"Debitur Risiko (2A-2B)",                value:fNum(m.tier.sedang),                 sub:fPct(m.ringkasanEW[1].pct)+" dari total", subColor:C.amber },
    { icon:"warning",    color:C.kpiRed,    label:"Debitur Bermasalah (3-5)",              value:fNum(m.tier.tinggi),                 sub:fPct(m.ringkasanEW[0].pct)+" dari total", subColor:C.red },
    { icon:"shield",     color:C.kpiPurple, label:"CKPN Existing",           prefix:"Rp", value:fMil(m.ckpnExisting).replace("Rp ",""), sub:up(m.deltas.ckpn), subColor:C.red },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:kpiCols, gap:12 }}>
        {KPI.map((k,i)=><KpiCard key={i} {...k} />)}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:chartsRow, gap:12 }}>
        <div style={card}>
          <CardTitle>Distribusi Kolektibilitas</CardTitle>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Donut data={m.kol} centerTop={fMil(m.totalOsJt).replace("Rp ","")} centerBottom="Total" />
            <div style={{ flex:1 }}>
              {m.kol.map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, padding:"3px 0" }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }} />
                  <span style={{ color:C.textMd }}>{d.legend}</span>
                  <span style={{ marginLeft:"auto", color:C.text, fontWeight:600 }}>{fPct(d.pct)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={card}>
          <CardTitle right={<Select value={blnTungg} onChange={e=>setBlnTungg(e.target.value)} options={["3 Bulan","6 Bulan","12 Bulan"]} />}>Trend Tunggakan (DPD &gt; 0)</CardTitle>
          <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
          <TrendChart data={getTrend(m.trendTunggakan, m.trendTunggakan12, blnTungg)} color={C.kpiRed} />
        </div>
        <div style={card}>
          <CardTitle right={<Select value={blnCKPN} onChange={e=>setBlnCKPN(e.target.value)} options={["3 Bulan","6 Bulan","12 Bulan"]} />}>Trend CKPN</CardTitle>
          <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
          <TrendChart data={getTrend(m.trendCKPN, m.trendCKPN12, blnCKPN)} color={C.kpiBlue} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:row3, gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 0" }}><CardTitle>Top 10 Debitur Risiko Tinggi</CardTitle></div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr style={{ background:C.grayLt }}>
                  {["No","CIF","Nama Debitur","Outstanding","DPD","Kol","Skor"].map((h,i)=>(
                    <th key={i} style={{ padding:"8px 12px", color:C.gray, fontSize:10.5, fontWeight:600, textTransform:"uppercase", textAlign:i>=4?"center":"left", whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.top10.map((d,i)=>(
                  <tr key={d.cif} style={{ borderBottom:`1px solid #F1F3F6` }}>
                    <td style={{ padding:"8px 12px", color:C.gray }}>{i+1}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{d.cif}</td>
                    <td style={{ padding:"8px 12px", color:C.text, fontWeight:500 }}>{d.nama}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{fFull(d.osJt)}</td>
                    <td style={{ padding:"8px 12px", textAlign:"center", color:d.dpd>30?C.red:C.amber, fontWeight:600 }}>{d.dpd}</td>
                    <td style={{ padding:"8px 12px", textAlign:"center", color:C.textMd }}>{d.kol}</td>
                    <td style={{ padding:"8px 12px", textAlign:"center" }}><SkorPill s={d.skor} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:C.grayLt }}>
                  <td colSpan={3} style={{ padding:"9px 12px", fontWeight:700, color:C.text }}>Total</td>
                  <td style={{ padding:"9px 12px", fontWeight:700, color:C.text }}>{fFull(m.top10.reduce((s,d)=>s+d.osJt,0))}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <RingCard title="Ringkasan Early Warning"
          data={m.ringkasanEW.map(r=>({ ...r, legend:r.label }))}
          total={fNum(m.totalDeb)} totalLabel="Total"
          fmtVal={(d)=>`${fNum(d.value)} (${fPct(d.pct)})`} />

        <div style={{ ...card, display:"flex", flexDirection:"column" }}>
          <CardTitle>Potensi Penghematan CKPN</CardTitle>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[
                { l:"CKPN Existing", v:fMil(m.ckpnExisting).replace("Rp ",""), c:C.text },
                { l:"CKPN Setelah Action Plan", v:fMil(m.ckpnAfter).replace("Rp ",""), c:C.navy },
                { l:"Potensi Penghematan", v:fMil(m.ckpnSaving).replace("Rp ",""), c:C.green, extra:fPct(m.savingPct) },
              ].map((x,i)=>(
                <div key={i}>
                  <div style={{ fontSize:10, fontWeight:600, color:C.gray, textTransform:"uppercase", lineHeight:1.3, marginBottom:8, minHeight:26 }}>{x.l}</div>
                  <div style={{ fontSize:11, color:C.gray }}>Rp</div>
                  <div style={{ fontSize:21, fontWeight:800, color:x.c }}>{x.v}</div>
                  {x.extra && <div style={{ fontSize:14, fontWeight:700, color:x.c, marginTop:2 }}>{x.extra}</div>}
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { l:"CKPN Existing", val:m.ckpnExisting, pct:100, c:C.kpiPurple },
                { l:"CKPN Setelah Action Plan", val:m.ckpnAfter, pct: m.ckpnExisting? m.ckpnAfter/m.ckpnExisting*100 : 0, c:C.kpiBlue },
              ].map((b,i)=>(
                <div key={i}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, marginBottom:4 }}>
                    <span style={{ color:C.gray }}>{b.l}</span>
                    <span style={{ color:C.text, fontWeight:600 }}>{fMil(b.val)}</span>
                  </div>
                  <div style={{ height:12, background:C.grayLt, borderRadius:6, overflow:"hidden" }}>
                    <div style={{ width:`${b.pct}%`, height:"100%", background:b.c, borderRadius:6 }} />
                  </div>
                </div>
              ))}
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.greenLt, borderRadius:8 }}>
                <Ic n="download" size={16} style={{ color:C.green }} />
                <span style={{ fontSize:12.5, color:C.green }}>Potensi penghematan CKPN</span>
                <span style={{ marginLeft:"auto", fontSize:14, fontWeight:800, color:C.green }}>{fMil(m.ckpnSaving)} · {fPct(m.savingPct)}</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize:10.5, color:C.gray, fontStyle:"italic", marginTop:12 }}>*Perhitungan berdasarkan simulasi per {m.P.date}</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:row4, gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 0" }}><CardTitle>Aktivitas Action Plan Terbaru</CardTitle></div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr style={{ background:C.grayLt }}>
                  {["Tgl Input","CIF","Nama Debitur","Kol","Action Plan","PIC","Status"].map((h,i)=>(
                    <th key={i} style={{ padding:"8px 12px", color:C.gray, fontSize:10.5, fontWeight:600, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.actionPlans.slice(0,5).map((p,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid #F1F3F6` }}>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{p.tgl}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{p.cif}</td>
                    <td style={{ padding:"8px 12px", color:C.text, fontWeight:500 }}>{p.nama}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{p.kol}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{p.jenis}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd }}>{p.ao}</td>
                    <td style={{ padding:"8px 12px" }}><span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:p.status==="selesai"?C.greenLt:C.amberLt, color:p.status==="selesai"?C.green:C.amber, fontSize:11.5, fontWeight:600 }}>{statusLabel[p.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div onClick={()=>go("action")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua</div>
        </div>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 8px" }}><CardTitle>Alert Terbaru</CardTitle></div>
          <div>
            {m.alerts.slice(0,5).map((a,i)=>(
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 16px", borderBottom:`1px solid #F1F3F6` }}>
                <span style={{ color:risikoColor[a.level], flexShrink:0, marginTop:1 }}><Ic n={a.level==="rendah"?"check":"warning"} size={17} /></span>
                <div style={{ flex:1, fontSize:12.5, color:C.textMd, lineHeight:1.35 }}>{a.text}</div>
                <div style={{ fontSize:10.5, color:C.gray, whiteSpace:"nowrap", flexShrink:0 }}>{a.time}</div>
              </div>
            ))}
          </div>
          <div onClick={()=>go("ews")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua Alert</div>
        </div>
      </div>
    </div>
  );
}

function PortfolioStatus({ m }) {
  const w = useWindowWidth();
  const c3 = w >= 1100 ? "1.1fr 1fr 1fr" : w >= 760 ? "1fr 1fr" : "1fr";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"repeat(4,1fr)":"repeat(2,1fr)", gap:10 }}>
        <KpiCard icon="wallet" color={C.kpiBlue} label="Total Outstanding" prefix="Rp" value={fMil(m.totalOsJt).replace("Rp ","")} sub={fNum(m.totalDeb)+" debitur"} subColor={C.navy} />
        <KpiCard icon="thumb" color={C.kpiGreen} label="Debitur Lancar" value={fNum(m.tier.rendah)} sub={fPct(m.ringkasanEW[2].pct)+" dari total"} subColor={C.green} />
        <KpiCard icon="warning" color={C.kpiRed} label="NPL Ratio" value={fPct(m.npl)} sub="Kol 3-5 / Total OS" subColor={C.red} />
        <KpiCard icon="shield" color={C.kpiPurple} label="CKPN Existing" prefix="Rp" value={fMil(m.ckpnExisting).replace("Rp ","")} sub={"Coverage "+fPct(m.totalOsJt?m.ckpnExisting/m.totalOsJt*100:0)} subColor={C.red} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:c3, gap:12 }}>
        <div style={card}>
          <CardTitle>Distribusi Kolektibilitas</CardTitle>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <Donut data={m.kol} centerTop={fNum(m.totalDeb)} centerBottom="Debitur" />
            <div style={{ flex:1 }}>
              {m.kol.map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11.5, padding:"2px 0" }}>
                  <span style={{ width:9, height:9, borderRadius:2, background:d.color, flexShrink:0 }} />
                  <span style={{ color:C.textMd }}>Kol {d.legend}</span>
                  <span style={{ marginLeft:"auto", color:C.text, fontWeight:600 }}>{fNum(d.value)} · {fPct(d.pct,1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={card}>
          <CardTitle>Outstanding per Sektor</CardTitle>
          <BarV data={m.perSektor} dataKey="osJt" nameKey="sektor" color={C.kpiBlue} fmt={(v)=>fMilV(v/1000)} height={200} />
        </div>
        <div style={card}>
          <CardTitle>Outstanding per Segment</CardTitle>
          <BarV data={m.perSegment} dataKey="osJt" nameKey="segment" color={C.kpiPurple} fmt={(v)=>fMilV(v/1000)} height={200} />
        </div>
      </div>
      <div style={card}>
        <CardTitle>Outstanding per Unit Kerja</CardTitle>
        <BarH data={m.perUker} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)} />
      </div>
    </div>
  );
}

function EarlyWarning({ m }) {
  const w = useWindowWidth();
  const [filter, setFilter] = useState("semua");
  const alerts = filter==="semua" ? m.alerts : m.alerts.filter(a=>a.level===filter);
  const ukerAlert = m.perUker.map(u=>({ nama:u.nama, tinggi:u.tinggi })).filter(u=>u.tinggi>0).sort((a,b)=>b.tinggi-a.tinggi);
  const countByLevel = { tinggi:m.alerts.filter(a=>a.level==="tinggi").length, sedang:m.alerts.filter(a=>a.level==="sedang").length, rendah:m.alerts.filter(a=>a.level==="rendah").length };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=600?"repeat(3,1fr)":"1fr", gap:12 }}>
        {m.ringkasanEW.map((r)=>{
          const lv = r.label.includes("Tinggi")?"tinggi":r.label.includes("Sedang")?"sedang":"rendah";
          const alertCnt = countByLevel[lv];
          return (
            <div key={lv} onClick={()=>setFilter(f=>f===lv?"semua":lv)} style={{ ...card, border:`2px solid ${filter===lv?risikoColor[lv]:C.border}`, background:filter===lv?risikoBg[lv]:C.white, cursor:"pointer", textAlign:"center" }}>
              <div style={{ fontSize:30, fontWeight:800, color:risikoColor[lv] }}>{fNum(r.value)}</div>
              <div style={{ fontSize:13, color:risikoColor[lv], fontWeight:500 }}>{r.label} · {fPct(r.pct)}</div>
              {alertCnt > 0 && (
                <div style={{ marginTop:6, fontSize:11, color:risikoColor[lv], background:risikoBg[lv], borderRadius:12, display:"inline-block", padding:"2px 10px", border:`1px solid ${risikoColor[lv]}`, opacity:.85 }}>
                  {alertCnt} alert aktif
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <RingCard title="Komposisi Risiko Debitur"
          data={m.ringkasanEW.map(r=>({ ...r, legend:r.label }))}
          total={fNum(m.totalDeb)} totalLabel="Total"
          fmtVal={(d)=>`${fNum(d.value)} (${fPct(d.pct)})`} />
        <div style={card}>
          <CardTitle>Debitur Risiko Tinggi per Unit Kerja</CardTitle>
          <BarH data={ukerAlert} dataKey="tinggi" nameKey="nama" color={C.kpiRed} fmt={(v)=>fNum(v)} />
        </div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {["semua","tinggi","sedang","rendah"].map(lv=>{
              const cnt = lv==="semua" ? m.alerts.length : countByLevel[lv];
              const active = filter===lv;
              const col = lv==="semua" ? C.navy : risikoColor[lv];
              return (
                <button key={lv} onClick={()=>setFilter(lv)} style={{ padding:"4px 12px", border:`1px solid ${active?col:C.border}`, borderRadius:20, background:active?(lv==="semua"?C.navyLt:risikoBg[lv]):C.white, color:active?col:C.gray, fontSize:12, fontWeight:active?700:500, cursor:"pointer" }}>
                  {lv==="semua"?"Semua":risikoLabel[lv]} <span style={{ fontWeight:700 }}>({cnt})</span>
                </button>
              );
            })}
          </div>
          <span style={{ fontSize:12, color:C.gray }}>{alerts.length} item ditampilkan</span>
        </div>
        {alerts.length === 0 && (
          <div style={{ padding:"24px", textAlign:"center", color:C.gray, fontSize:13 }}>Tidak ada alert untuk filter ini</div>
        )}
        {alerts.map((a,i)=>(
          <div key={i} style={{ padding:"11px 16px", borderBottom:`1px solid #F1F3F6`, display:"flex", gap:12, alignItems:"flex-start" }}>
            <span style={{ color:risikoColor[a.level], marginTop:1, flexShrink:0 }}><Ic n={a.level==="rendah"?"check":"warning"} size={18} /></span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12.5, color:C.textMd, lineHeight:1.4 }}>{a.text}</div>
            </div>
            <div style={{ fontSize:11, color:C.gray, flexShrink:0, whiteSpace:"nowrap" }}>{a.time}</div>
            <Badge level={a.level} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DaftarDebitur({ list }) {
  const [cari, setCari] = useState("");
  const [kol, setKol] = useState("Semua Kolektibilitas");
  const [risiko, setRisiko] = useState("Semua Risiko");
  const [page, setPage] = useState(1);
  const perPage = 12;

  const filtered = list.filter(d=>{
    const okCari = d.nama.toLowerCase().includes(cari.toLowerCase()) || d.cif.includes(cari);
    const okKol = kol==="Semua Kolektibilitas" || ("Kol "+d.kol)===kol;
    const okRsk = risiko==="Semua Risiko" || risikoLabel[d.tier]===risiko;
    return okCari && okKol && okRsk;
  });
  const totalPage = Math.max(1, Math.ceil(filtered.length/perPage));
  const pg = Math.min(page, totalPage);
  const shown = filtered.slice((pg-1)*perPage, pg*perPage);
  const reset = (fn)=>(e)=>{ fn(e.target.value); setPage(1); };

  const inputS = { padding:"7px 10px 7px 32px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, background:C.white, color:C.text, width:240 };

  return (
    <div>
      <SubFilter>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:9, top:8, color:C.gray }}><Ic n="search" size={16} /></span>
          <input placeholder="Cari nama atau CIF..." value={cari} onChange={reset(setCari)} style={inputS} />
        </div>
        <Select value={kol} onChange={reset(setKol)} options={["Semua Kolektibilitas","Kol 1","Kol 2A","Kol 2B","Kol 3","Kol 4","Kol 5"]} />
        <Select value={risiko} onChange={reset(setRisiko)} options={["Semua Risiko","Risiko Tinggi","Risiko Sedang","Risiko Rendah"]} />
        <span style={{ marginLeft:"auto", fontSize:13, color:C.gray }}>{fNum(filtered.length)} debitur</span>
      </SubFilter>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <Tabel
          headers={["CIF","Nama Debitur","Unit Kerja","AO Pengelola","Outstanding","Kol","DPD","Skor","Status Risiko"]}
          colW={[88,150,120,120,110,46,50,56,120]}
          rows={shown.map(d=>[
            d.cif, d.nama, d.ukerNama, d.ao,
            <span style={{ fontWeight:500 }}>{fJt(d.osJt)}</span>,
            d.kol,
            <span style={{ color:d.dpd>30?C.red:d.dpd>0?C.amber:C.green, fontWeight:600 }}>{d.dpd}</span>,
            <SkorPill s={d.skor} />,
            <Badge level={d.tier} />,
          ])}
        />
        {filtered.length===0 && <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:14 }}>Tidak ada data</div>}
        {filtered.length>0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:C.gray }}>Menampilkan {(pg-1)*perPage+1}–{Math.min(pg*perPage,filtered.length)} dari {fNum(filtered.length)}</span>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={pg<=1} style={pgBtn(pg<=1)}>‹ Prev</button>
              <span style={{ fontSize:12.5, color:C.textMd }}>Hal {pg} / {totalPage}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPage,p+1))} disabled={pg>=totalPage} style={pgBtn(pg>=totalPage)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
const pgBtn = (dis)=>({ padding:"5px 12px", border:`1px solid ${C.border}`, borderRadius:6, background:C.white, color:dis?C.gray:C.navy, fontSize:12.5, cursor:dis?"default":"pointer", opacity:dis?.5:1 });

function ActionPlan({ m, perms }) {
  const w = useWindowWidth();
  const [extra, setExtra] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama:"", jenis:"Kunjungan", target:"", catatan:"" });
  const plans = [...extra, ...m.actionPlans];

  const handleTambah = () => {
    if (!form.nama) return;
    setExtra([{ tgl:new Date().toLocaleDateString("id-ID"), cif:"-", nama:form.nama, ao:"DEMO AO 1", kol:"2B",
      jenis:form.jenis, target:form.target||"-", status:"in_progress", hasil:form.catatan||"-" }, ...extra]);
    setShowForm(false); setForm({ nama:"", jenis:"Kunjungan", target:"", catatan:"" });
  };
  const inputS = { width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, background:C.white, color:C.text, boxSizing:"border-box" };

  const byJenis = Object.values(plans.reduce((a,p)=>{ a[p.jenis]=a[p.jenis]||{ jenis:p.jenis, n:0 }; a[p.jenis].n++; return a; },{}));
  const selesai = plans.filter(p=>p.status==="selesai").length;
  const statusData = [{ legend:"Selesai", value:selesai, color:C.green },{ legend:"In Progress", value:plans.length-selesai, color:C.amber }];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>Action Plan per Jenis Tindakan</CardTitle>
          <BarH data={byJenis} dataKey="n" nameKey="jenis" color={C.kpiBlue} fmt={(v)=>fNum(v)} />
        </div>
        <div style={card}>
          <CardTitle>Status Penyelesaian</CardTitle>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Donut data={statusData} centerTop={fNum(plans.length)} centerBottom="Action" unit="action" />
            <div style={{ flex:1 }}>
              {statusData.map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, padding:"5px 0" }}>
                  <span style={{ width:10, height:10, borderRadius:"50%", background:d.color }} />
                  <span style={{ color:C.textMd }}>{d.legend}</span>
                  <span style={{ marginLeft:"auto", color:C.text, fontWeight:600 }}>{fNum(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {perms?.editAction ? (
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button onClick={()=>setShowForm(v=>!v)} style={{ padding:"8px 18px", background:C.navy, color:C.white, border:"none", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:500 }}>{showForm?"Batal":"+ Tambah Tindak Lanjut"}</button>
      </div>
      ) : (
      <div style={{ ...card, background:C.grayLt, color:C.gray, fontSize:12.5, display:"flex", alignItems:"center", gap:8 }}>
        <Ic n="infoCircle" size={16} /> Mode monitoring — Anda hanya dapat melihat action plan, tidak dapat menambah/mengubah.
      </div>
      )}
      {showForm && perms?.editAction && (
        <div style={{ ...card, background:C.navyLt }}>
          <div style={{ fontSize:14, fontWeight:600, color:C.navy, marginBottom:12 }}>Tambah Tindak Lanjut Baru</div>
          <div style={{ display:"grid", gridTemplateColumns: w>=700?"1fr 1fr 1fr":"1fr", gap:10, marginBottom:10 }}>
            <div><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Nama Debitur</div><input value={form.nama} onChange={e=>setForm({...form,nama:e.target.value})} placeholder="Nama debitur..." style={inputS} /></div>
            <div><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Jenis Tindakan</div>
              <select value={form.jenis} onChange={e=>setForm({...form,jenis:e.target.value})} style={inputS}>{["Telepon Debitur","Kunjungan","Surat Peringatan 1","Restrukturisasi","Recovery"].map(j=><option key={j}>{j}</option>)}</select></div>
            <div><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Target Penyelesaian</div><input value={form.target} onChange={e=>setForm({...form,target:e.target.value})} placeholder="dd/mm/yyyy" style={inputS} /></div>
          </div>
          <div style={{ marginBottom:10 }}><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Hasil / Catatan</div><input value={form.catatan} onChange={e=>setForm({...form,catatan:e.target.value})} placeholder="Catatan tindak lanjut..." style={inputS} /></div>
          <button onClick={handleTambah} style={{ padding:"8px 20px", background:C.navy, color:C.white, border:"none", borderRadius:7, cursor:"pointer", fontSize:13 }}>Simpan</button>
        </div>
      )}
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <Tabel
          headers={["Tanggal","Nama Debitur","PIC","Kol","Jenis Tindakan","Target","Hasil","Status"]}
          colW={[90,150,95,46,150,95,160,110]}
          rows={plans.map(p=>[
            p.tgl, p.nama, p.ao, p.kol, p.jenis, p.target, p.hasil,
            <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:p.status==="selesai"?C.greenLt:C.amberLt, color:p.status==="selesai"?C.green:C.amber, fontSize:11.5, fontWeight:600 }}>{statusLabel[p.status]}</span>,
          ])}
        />
      </div>
    </div>
  );
}

function SimulasiCKPN({ m }) {
  const w = useWindowWidth();
  const threeCol = w >= 1000 ? "1fr 1fr 1fr" : "1fr";
  const bodyCol  = w >= 1100 ? "2fr 1fr" : "1fr";
  const ckpnUker = m.perUker.map(u=>({ nama:u.nama, ckpn:u.ckpn })).slice(0,8);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:threeCol, gap:12 }}>
        <KpiCard icon="shield" color={C.kpiPurple} label="CKPN Existing" prefix="Rp" value={fMil(m.ckpnExisting).replace("Rp ","")} sub="Berdasarkan kolektibilitas saat ini" />
        <KpiCard icon="clipboard" color={C.kpiBlue} label="CKPN Setelah Action Plan" prefix="Rp" value={fMil(m.ckpnAfter).replace("Rp ","")} sub="Jika action plan berhasil" subColor={C.navy} />
        <KpiCard icon="download" color={C.kpiGreen} label="Potensi Penghematan" prefix="Rp" value={fMil(m.ckpnSaving).replace("Rp ","")} sub={fPct(m.savingPct)+" dari CKPN Existing"} subColor={C.green} />
      </div>
      <div style={card}>
        <CardTitle>CKPN per Unit Kerja (Existing)</CardTitle>
        <BarH data={ckpnUker} dataKey="ckpn" nameKey="nama" color={C.kpiPurple} fmt={(v)=>fMilV(v/1000)} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:bodyCol, gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 0" }}><CardTitle>Top Kontribusi CKPN per Debitur</CardTitle></div>
          <Tabel
            headers={["Nama Debitur","Outstanding","Kol","CKPN Existing","Pot. Saving","% Saving"]}
            colW={[160,120,46,120,110,80]}
            rows={m.ckpnDebitur.map(d=>[
              d.nama, fJt(d.osJt), d.kol, fJt(d.ckpn),
              <span style={{ color:C.green, fontWeight:600 }}>{fJt(d.saving)}</span>,
              <span style={{ color:C.green, fontWeight:600 }}>{fPct(d.pct,1)}</span>,
            ])}
          />
        </div>
        <div style={card}>
          <CardTitle>Existing vs Setelah Action Plan</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[{ n:"Existing", v:m.ckpnExisting/1000 },{ n:"Setelah AP", v:m.ckpnAfter/1000 },{ n:"Saving", v:m.ckpnSaving/1000 }]} margin={{ top:16, right:10, left:-4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
              <XAxis dataKey="n" tick={{ fontSize:11, fill:C.gray }} tickLine={false} axisLine={{ stroke:C.border }} />
              <YAxis tick={{ fontSize:10, fill:C.gray }} tickFormatter={(v)=>v+" M"} axisLine={false} tickLine={false} width={42} />
              <Tooltip formatter={(v)=>[fMilV(v),"CKPN"]} />
              <Bar dataKey="v" radius={[5,5,0,0]} maxBarSize={64}>
                {[C.kpiPurple,C.kpiBlue,C.kpiGreen].map((c,i)=><Cell key={i} fill={c} />)}
                <LabelList dataKey="v" position="top" formatter={(v)=>fMilV(v)} style={{ fontSize:10, fill:C.textMd, fontWeight:600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KinerjaAO({ m }) {
  const w = useWindowWidth();
  const top = m.perAO.slice(0,10);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>Top 10 AO — Outstanding</CardTitle>
          <BarH data={top} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)} />
        </div>
        <div style={card}>
          <CardTitle>Top 10 AO — Debitur Risiko Tinggi</CardTitle>
          <BarH data={[...m.perAO].sort((a,b)=>b.tinggi-a.tinggi).slice(0,10)} dataKey="tinggi" nameKey="nama" color={C.kpiRed} fmt={(v)=>fNum(v)} />
        </div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 0" }}><CardTitle>Rekap Kinerja per AO / Mantri</CardTitle></div>
        <div style={{ maxHeight:420, overflowY:"auto", overflowX:"auto" }}>
          <Tabel stickyHeader
            headers={["AO / Mantri","Unit Kerja","Outstanding","Jml Debitur","Risiko Tinggi","Action Plan","Berhasil"]}
            colW={[130,140,120,90,100,90,90]}
            rows={m.perAO.map(k=>[
              k.nama, k.uker, fJt(k.osJt), k.deb,
              <span style={{ color:C.red, fontWeight:600 }}>{k.tinggi}</span>,
              k.actionTotal,
              <span style={{ color:C.navy, fontWeight:600 }}>{k.berhasil}</span>,
            ])}
          />
        </div>
      </div>
    </div>
  );
}

function KinerjaUnit({ m }) {
  const w = useWindowWidth();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>Outstanding per Unit Kerja</CardTitle>
          <BarH data={m.perUker} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)} />
        </div>
        <div style={card}>
          <CardTitle>NPL Ratio per Unit Kerja</CardTitle>
          <BarH data={[...m.perUker].sort((a,b)=>b.npl-a.npl)} dataKey="npl" nameKey="nama" color={C.kpiRed} fmt={(v)=>fPct(v,1)} />
        </div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 0" }}><CardTitle>Rekap Kinerja per Unit Kerja</CardTitle></div>
        <Tabel
          headers={["Unit Kerja","Outstanding","Debitur","NPL Ratio","CKPN","Recovery Rate"]}
          colW={[150,120,90,100,120,120]}
          rows={m.perUker.map(u=>[
            u.nama, fJt(u.osJt), fNum(u.deb),
            <span style={{ color:u.npl>5?C.red:u.npl>4?C.amber:C.green, fontWeight:600 }}>{fPct(u.npl,1)}</span>,
            fJt(u.ckpn),
            <span style={{ color:C.green, fontWeight:600 }}>{u.recovery}%</span>,
          ])}
        />
      </div>
    </div>
  );
}

function Laporan({ m, perms }) {
  const w = useWindowWidth();
  const canDl = perms?.exportReport;
  const reports = [
    { nama:"Laporan Portofolio Kredit", desc:"Outstanding, debitur, kolektibilitas per unit kerja" },
    { nama:"Laporan Early Warning System", desc:"Daftar alert & risk scoring debitur" },
    { nama:"Laporan Action Plan", desc:"Rekap tindak lanjut & progres penyelesaian" },
    { nama:"Laporan Simulasi CKPN", desc:"CKPN existing, potensial & penghematan" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"1fr 1fr":"1fr", gap:12 }}>
        {reports.map((r,i)=>(
          <div key={i} style={{ ...card, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:9, background:C.navyLt, color:C.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n="doc" size={20} /></div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13.5, fontWeight:600, color:C.text }}>{r.nama}</div>
              <div style={{ fontSize:12, color:C.gray }}>{r.desc} · per {m.P.date}</div>
            </div>
            <button disabled={!canDl} title={canDl?"":"Role Anda tidak memiliki akses unduh"} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:C.navy, color:C.white, border:"none", borderRadius:7, cursor:canDl?"pointer":"not-allowed", fontSize:12.5, fontWeight:500, opacity:canDl?1:.45 }}><Ic n="download" size={15} /> Unduh</button>
          </div>
        ))}
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 0" }}><CardTitle>Riwayat Import Data</CardTitle></div>
        <Tabel
          headers={["Tanggal Import","Jenis Data","Periode","Jumlah Record","Ukuran File","Status","Diproses Oleh"]}
          colW={[130,150,100,130,100,110,130]}
          rows={[
            ["31/05/2026 07:27","LW321 – Kolektibilitas","Mei 2026",fNum(DEBITUR.length)+" record","2,4 MB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Dewi Anggraini"],
            ["31/05/2026 07:29","CKPN per Unit Kerja","Mei 2026","13 unit kerja","84 KB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Dewi Anggraini"],
            ["30/04/2026 08:11","LW321 – Kolektibilitas","Apr 2026",fNum(DEBITUR.length-7)+" record","2,3 MB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Dewi Anggraini"],
            ["30/04/2026 08:14","CKPN per Unit Kerja","Apr 2026","13 unit kerja","81 KB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Dewi Anggraini"],
            ["31/03/2026 09:02","LW321 – Kolektibilitas","Mar 2026",fNum(DEBITUR.length-12)+" record","2,2 MB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Hery Susanto"],
            ["31/03/2026 09:04","CKPN per Unit Kerja","Mar 2026","13 unit kerja","79 KB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Hery Susanto"],
            ["29/02/2026 10:45","LW321 – Kolektibilitas","Feb 2026",fNum(DEBITUR.length-19)+" record","2,1 MB",<span style={{ color:C.amber, fontWeight:600 }}>⚠ Parsial</span>,"Dewi Anggraini"],
          ]}
        />
        <div style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}`, fontSize:11.5, color:C.gray }}>
          ⚠ Parsial = sebagian record gagal diproses karena format kolom tidak sesuai. Data valid tetap tersimpan.
        </div>
      </div>
    </div>
  );
}

function Pengaturan({ perms }) {
  const w = useWindowWidth();
  const [status, setStatus] = useState(null);
  const cols = w >= 900 ? "1fr 1fr" : "1fr";
  const canEdit = perms?.editData;
  const handleUpload = (jenis) => { if(!canEdit) return; setStatus({ jenis, loading:true }); setTimeout(()=>setStatus({ jenis, loading:false, record: jenis==="lw321"?DEBITUR.length:13 }), 1400); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {!canEdit && (
        <div style={{ ...card, background:C.amberLt, color:C.amber, fontSize:12.5, display:"flex", alignItems:"center", gap:8 }}>
          <Ic n="infoCircle" size={16} /> Mode lihat — hanya Manajer Bisnis yang dapat mengubah/import data & parameter.
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 0" }}><CardTitle>Parameter Risk Scoring (BR-04)</CardTitle></div>
          <Tabel headers={["Parameter","Bobot"]} colW={["70%","30%"]} rows={[["DPD (Days Past Due)","40%"],["Mutasi Rekening","20%"],["Aktivitas Usaha","20%"],["Riwayat Pembayaran","20%"]]} />
          <div style={{ padding:"12px 16px", display:"flex", gap:8, flexWrap:"wrap" }}>
            {[["80–100","Low Risk",C.green],["60–79","Medium Risk",C.amber],["<60","High Risk",C.red]].map(([rng2,lbl,c])=>(
              <div key={lbl} style={{ flex:"1 1 110px", border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                <div style={{ fontSize:15, fontWeight:700, color:c }}>{rng2}</div>
                <div style={{ fontSize:11, color:C.gray }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 0" }}><CardTitle>Daftar Unit Kerja — BO Polewali</CardTitle></div>
          <div style={{ maxHeight:300, overflowY:"auto", overflowX:"auto" }}>
            <Tabel stickyHeader headers={["No","Kode Uker","Nama Unit Kerja","Tipe"]} colW={[50,110,"auto",90]}
              rows={UKER.map((u,i)=>[i+1, <b style={{ color:C.navy }}>{u.kode}</b>, u.nama, u.tipe])} />
          </div>
        </div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12.5, fontWeight:700, color:"#1F2937", letterSpacing:.3, textTransform:"uppercase" }}>Contoh Format Data LW321</div>
          <span style={{ fontSize:11, color:C.gray, fontStyle:"italic" }}>Kolom utama yang dibaca sistem</span>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11.5, tableLayout:"auto" }}>
            <thead>
              <tr style={{ background:C.grayLt }}>
                {["CIFNO","NAMA_DEBITUR","KODE_UKER","UKER","KOL_ADK","PLAFON","BALANCE_IDR","TUNGGAKAN_POKOK","TUNGGAKAN_BUNGA","TGL_MENUNGGAK","PN_PENGELOLA_1","SEGMEN_LV1"].map((h,i)=>(
                  <th key={i} style={{ padding:"7px 10px", color:C.gray, fontWeight:600, fontSize:10, textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["SP55434","SUBARKAM","259","KC Polewali","1","150000000","36498414","0","0","-","00157966 – Dini Dewi Buawati","RITEL"],
                ["PCH0960","PEBRIANTO PATULAK","259","KC Polewali","1","70000000","31914971","0","0","-","00157966 – Dini Dewi Buawati","RITEL"],
                ["SX63095","SULTAN","259","KC Polewali","2","13000000","4000000","4000000","947590","11/04/2008","00056207 – Wahyuni","RITEL"],
                ["L184879","LSM PEMA SIDODADI","259","KC Polewali","3","6725231315","2305268181","2305268181","0","13/01/2000","00030487 – Subadri","RITEL"],
                ["MD72183","MALAHAYATI SAPRIWALI","259","KC Polewali","4","95000000","25985177","9619223","2143777","16/07/2008","00125634 – Nurfaida","RITEL"],
              ].map((row,ri)=>(
                <tr key={ri} style={{ background: ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6` }}>
                  {row.map((cell,ci)=>(
                    <td key={ci} style={{ padding:"6px 10px", color: ci===4?(cell==="1"?C.green:cell==="2"?C.amber:cell==="3"||cell==="4"?C.red:C.textMd):C.textMd, fontWeight:ci===4?700:400, whiteSpace:"nowrap" }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"10px 16px", borderTop:`1px solid ${C.border}`, fontSize:11, color:C.gray }}>
          Total 45 kolom pada file LW321 · Sistem membaca kolom wajib: CIFNO, NAMA_DEBITUR, KODE_UKER, KOL_ADK, BALANCE_IDR, TUNGGAKAN_POKOK, PN_PENGELOLA_1
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:cols, gap:12 }}>
        {[
          { id:"lw321", title:"Import Data LW321 (Core Banking)", desc:"Format Excel (.xlsx) / CSV · 45 kolom. Kolom wajib: CIFNO, NAMA_DEBITUR, KODE_UKER, KOL_ADK, BALANCE_IDR, TUNGGAKAN_POKOK, PN_PENGELOLA_1." },
          { id:"ckpn", title:"Import CKPN per Unit Kerja", desc:"Format Excel (.xlsx) / CSV. Kolom: KODE_UKER, PERIODE, CKPN_EXISTING, CKPN_POTENSIAL, COVERAGE_RATIO." },
        ].map(b=>(
          <div key={b.id} style={{ ...card, padding:20 }}>
            <div style={{ fontSize:14, fontWeight:600, color:C.navy, marginBottom:4 }}>{b.title}</div>
            <div style={{ fontSize:12, color:C.gray, marginBottom:14 }}>{b.desc}</div>
            <div style={{ border:`2px dashed ${C.border}`, borderRadius:8, padding:"22px", textAlign:"center", marginBottom:12, color:C.gray, fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <Ic n="upload" size={22} /> Klik atau drag file Excel/CSV ke sini
            </div>
            <button onClick={()=>handleUpload(b.id)} disabled={!canEdit} style={{ width:"100%", padding:"9px", background:C.navy, color:C.white, border:"none", borderRadius:7, cursor:canEdit?"pointer":"not-allowed", fontSize:13, fontWeight:500, opacity:canEdit?1:.45 }}>Upload &amp; Proses</button>
            {status?.jenis===b.id && (
              <div style={{ marginTop:10, padding:"10px 12px", borderRadius:7, background:status.loading?C.grayLt:C.greenLt, color:status.loading?C.gray:C.green, fontSize:13 }}>
                {status.loading ? "⏳ Memproses data..." : `✓ Berhasil import ${fNum(status.record)} ${b.id==="lw321"?"record · Risk scoring otomatis dijalankan":"unit kerja"}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const MENU = [
  { id:"dashboard",   label:"Dashboard",       icon:"dashboard", title:"DASHBOARD PORTOFOLIO", sub:"Data per __DATE__" },
  { id:"portfolio",   label:"Portfolio Status", icon:"portfolio", chevron:true, title:"PORTFOLIO STATUS", sub:"Status portofolio kredit · BO Polewali" },
  { id:"ews",         label:"Early Warning",    icon:"warning",   chevron:true, title:"EARLY WARNING SYSTEM", sub:"Alert otomatis berdasarkan kondisi debitur" },
  { id:"debitur",     label:"Daftar Debitur",   icon:"users",     chevron:true, title:"DAFTAR DEBITUR", sub:"Monitoring seluruh debitur · BO Polewali" },
  { id:"action",      label:"Action Plan",      icon:"clipboard", chevron:true, title:"ACTION PLAN", sub:"Tindak lanjut penyelamatan debitur" },
  { id:"ckpn",        label:"Simulasi CKPN",    icon:"calc",      chevron:true, title:"SIMULASI CKPN", sub:"Estimasi CKPN & potensi penghematan" },
  { id:"kinerjaAO",   label:"Kinerja AO",       icon:"userPerf",  chevron:true, title:"KINERJA AO / MANTRI", sub:"Rekap kinerja per Account Officer" },
  { id:"kinerjaUnit", label:"Kinerja Unit",     icon:"building",  chevron:true, title:"KINERJA UNIT KERJA", sub:"Rekap kinerja per unit kerja" },
  { id:"laporan",     label:"Laporan",          icon:"doc",       title:"LAPORAN", sub:"Unduh laporan & riwayat data" },
  { id:"pengaturan",  label:"Pengaturan",       icon:"gear",      chevron:true, title:"PENGATURAN", sub:"Import data, unit kerja & parameter sistem" },
];

function Sidebar({ page, setPage, menus, periode }) {
  const [hover, setHover] = useState(null);

  return (
    <aside style={{ width:236, background:C.sidebar, color:"#fff", display:"flex", flexDirection:"column", flexShrink:0, height:"100vh", overflowY:"auto" }}>
      <div style={{ padding:"16px 16px 8px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ background:"#fff", borderRadius:8, padding:"4px 9px", fontWeight:800, color:C.navy, fontSize:16, letterSpacing:.5 }}>BRI</div>
      </div>
      <div style={{ padding:"0 16px 14px" }}>
        <div style={{ fontSize:15, fontWeight:800, letterSpacing:.6 }}>EWS-CKPN</div>
        <div style={{ fontSize:11, color:"#9DB6D6" }}>Early Warning System</div>
      </div>
      <nav style={{ padding:"4px 8px", display:"flex", flexDirection:"column", gap:2 }}>
        {menus.map(m=>{
          const active = page===m.id;
          return (
            <div key={m.id} onClick={()=>setPage(m.id)} onMouseEnter={()=>setHover(m.id)} onMouseLeave={()=>setHover(null)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:8, cursor:"pointer",
                background: active?C.sidebarActive:hover===m.id?"rgba(255,255,255,.06)":"transparent",
                color: active?"#fff":C.sidebarText, fontSize:13, fontWeight:active?600:500, transition:"background .12s" }}>
              <span style={{ display:"flex", flexShrink:0 }}><Ic n={m.icon} size={18} /></span>
              <span style={{ flex:1 }}>{m.label}</span>
              {m.chevron && <Ic n="chevronR" size={14} sw={2} style={{ opacity:.5 }} />}
            </div>
          );
        })}
      </nav>
      <div style={{ marginTop:"auto", padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,.08)", fontSize:11, color:C.sidebarMuted }}>
        Demo · Data Mock · {periode}
      </div>
    </aside>
  );
}

function Login({ onLogin }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(135deg, ${C.sidebar} 0%, #0E2747 100%)`, padding:20, fontFamily:"system-ui,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:440, background:C.white, borderRadius:16, padding:"28px 26px", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <div style={{ background:C.navy, color:"#fff", borderRadius:8, padding:"4px 9px", fontWeight:800, fontSize:16, letterSpacing:.5 }}>BRI</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.navy, letterSpacing:.5 }}>EWS-CKPN</div>
            <div style={{ fontSize:11, color:C.gray }}>Early Warning System · BO Polewali</div>
          </div>
        </div>
        <div style={{ fontSize:18, fontWeight:700, color:C.text, marginTop:14 }}>Masuk ke Dashboard</div>
        <div style={{ fontSize:12.5, color:C.gray, marginBottom:16 }}>Pilih akun demo sesuai role pengguna</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {Object.values(ROLES).map(r=>(
            <button key={r.id} onClick={()=>onLogin(r.id)} style={{ display:"flex", alignItems:"center", gap:12, textAlign:"left",
              padding:"12px 14px", border:`1px solid ${C.border}`, borderRadius:10, background:C.white, cursor:"pointer", transition:"all .12s" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=r.color; e.currentTarget.style.background=C.grayLt; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.white; }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:r.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={r.icon} size={22} /></div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{r.title}</div>
                <div style={{ fontSize:12, color:C.gray }}>{r.nama} · {r.akses}</div>
              </div>
              <Ic n="chevronR" size={16} style={{ color:C.gray }} />
            </button>
          ))}
        </div>
        <div style={{ fontSize:11, color:C.gray, marginTop:16, textAlign:"center" }}>Mode demo — tanpa password. Hak akses & data menyesuaikan role.</div>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [filters, setFilters] = useState({ uker:"semua", ao:"semua", segment:"semua", periode:"Mei 2026" });
  const [profileOpen, setProfileOpen] = useState(false);

  const perms = role ? ROLES[role] : null;

  const list = useMemo(()=>{
    if (!perms) return [];
    return DEBITUR.filter(d=>{
      if (perms.scope==="ao" && d.aoId!==DEMO_AO_ID) return false;
      if (perms.scope==="bermasalah" && d.tier==="rendah") return false;
      return (filters.uker==="semua" || d.uker===filters.uker)
        && (filters.ao==="semua" || d.aoId===filters.ao)
        && (filters.segment==="semua" || d.segment===filters.segment);
    });
  }, [filters, perms]);
  const m = useMemo(()=>buildModel(list, filters.periode), [list, filters.periode]);

  if (!perms) return <Login onLogin={(id)=>{
    setRole(id); setPage("dashboard"); setProfileOpen(false);
    if (id==="ao") setFilters({ uker:DEMO_AO.uker, ao:DEMO_AO_ID, segment:"semua", periode:"Mei 2026" });
    else setFilters({ uker:"semua", ao:"semua", segment:"semua", periode:"Mei 2026" });
  }} />;

  const menus = MENU.filter(x=>perms.menus.includes(x.id));
  const safePage = perms.menus.includes(page) ? page : "dashboard";
  const cur = MENU.find(x=>x.id===safePage);
  const sub = cur.sub.replace("__DATE__", m.P.date);
  const pages = {
    dashboard:   <Dashboard m={m} go={(p)=>perms.menus.includes(p)&&setPage(p)} />,
    portfolio:   <PortfolioStatus m={m} />,
    ews:         <EarlyWarning m={m} />,
    debitur:     <DaftarDebitur list={list} />,
    action:      <ActionPlan m={m} perms={perms} />,
    ckpn:        <SimulasiCKPN m={m} />,
    kinerjaAO:   <KinerjaAO m={m} />,
    kinerjaUnit: <KinerjaUnit m={m} />,
    laporan:     <Laporan m={m} perms={perms} />,
    pengaturan:  <Pengaturan perms={perms} />,
  };
  const aktifFilter = perms.scope==="all" && (filters.uker!=="semua" || filters.segment!=="semua" || filters.ao!=="semua");

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"system-ui,'Segoe UI',Roboto,sans-serif", background:C.bg, color:C.text }}>
      <Sidebar page={safePage} setPage={setPage} menus={menus} periode={filters.periode} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <header style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"12px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#1F2937", letterSpacing:.3, whiteSpace:"nowrap" }}>{cur.title}</div>
            <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>
              {sub}
              {perms.scope==="ao" && <span style={{ color:C.navy, fontWeight:600 }}> · Portofolio {perms.nama} ({fNum(list.length)} debitur)</span>}
              {perms.scope==="bermasalah" && <span style={{ color:C.red, fontWeight:600 }}> · Debitur bermasalah ({fNum(list.length)})</span>}
              {aktifFilter && <span style={{ color:C.navy, fontWeight:600 }}> · Filter aktif: {fNum(list.length)} debitur</span>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:7, background:C.white, color:C.textMd, fontSize:12.5, cursor:"pointer" }}><Ic n="infoDoc" size={15} /> Info Data</button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12.5, color:C.gray }}>Periode</span>
              <Select value={filters.periode} onChange={e=>setFilters(f=>({ ...f, periode:e.target.value }))} options={["Mar 2026","Apr 2026","Mei 2026"]} />
            </div>
            <div style={{ width:1, height:30, background:C.border }} />
            <div style={{ position:"relative" }}>
              <div onClick={()=>setProfileOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:perms.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={perms.icon} size={20} /></div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:"#1F2937" }}>{perms.nama}</div>
                  <div style={{ fontSize:11, color:C.gray }}>{perms.title}</div>
                </div>
                <Ic n="chevronD" size={14} style={{ color:C.gray }} />
              </div>
              {profileOpen && (
                <div style={{ position:"absolute", right:0, top:46, width:248, background:C.white, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 10px 30px rgba(16,24,40,.15)", zIndex:20, overflow:"hidden" }}>
                  <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{perms.nama}</div>
                    <div style={{ fontSize:11.5, color:perms.color, fontWeight:600 }}>{perms.title}</div>
                    <div style={{ fontSize:11, color:C.gray, marginTop:4 }}>{perms.akses}</div>
                  </div>
                  <div style={{ padding:8 }}>
                    <div style={{ fontSize:10.5, color:C.gray, padding:"2px 6px 6px" }}>GANTI AKUN DEMO</div>
                    {Object.values(ROLES).map(r=>(
                      <div key={r.id} onClick={()=>{ setRole(r.id); setProfileOpen(false); setPage("dashboard"); if(r.id==="ao") setFilters({uker:DEMO_AO.uker,ao:DEMO_AO_ID,segment:"semua",periode:filters.periode}); else setFilters(f=>({...f,uker:"semua",ao:"semua",segment:"semua"})); }}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 6px", borderRadius:7, cursor:"pointer", background: r.id===role?C.grayLt:"transparent" }}>
                        <div style={{ width:24, height:24, borderRadius:"50%", background:r.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={r.icon} size={14} /></div>
                        <span style={{ fontSize:12.5, color:C.textMd, fontWeight: r.id===role?700:500 }}>{r.title}</span>
                      </div>
                    ))}
                    <div onClick={()=>{ setRole(null); setProfileOpen(false); }} style={{ marginTop:6, padding:"8px", textAlign:"center", borderTop:`1px solid ${C.border}`, color:C.red, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Keluar</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main style={{ flex:1, overflowY:"auto", background:C.bg, padding:16 }} onClick={()=>profileOpen&&setProfileOpen(false)}>
          {pages[safePage]}
        </main>
      </div>
    </div>
  );
}
