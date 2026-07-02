import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { parseLW321 } from "./lw321Parser.js";
import { parseCKPN } from "./ckpnParser.js";
import { parseRecoveryPH } from "./recoveryPhParser.js";
import { fetchUploads, insertUpload, deleteUpload, fetchDebitur, bulkInsertDebitur, fetchActionPlans, saveActionPlan, updateActionPlan, deleteActionPlan, fetchCkpnSummary, bulkInsertCkpn, fetchRecPhSummary, bulkInsertRecPh, fetchCkpnTrend, fetchRecPhTrend, fetchMantriAgg, fetchMantriAggCross, fetchAuthMe, fetchUsers, createUser, updateUser } from "./apiClient.js";
import { supabase } from "./supabaseClient.js";
// Satu SheetJS saja: xlsx-js-style (superset xlsx + dukung styling). Mengimpor 'xlsx' juga akan
// menimbulkan konflik global XLSX yang membuat style hilang saat di-bundle.
import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
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
  percent:(<><circle cx="7.5" cy="7.5" r="2.8"/><circle cx="16.5" cy="16.5" r="2.8"/><line x1="19" y1="5" x2="5" y2="19"/></>),
  trend:(<><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></>),
};
const Ic = ({ n, size=18, sw=1.8, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={style}>{ICON[n]}</svg>
);


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


const KOL_ORDER = ["1","2A","2B","3","4","5"];
const KOL_COLOR = { "1":"#16A34A","2A":"#F59E0B","2B":"#EA580C","3":"#DC2626","4":"#B91C1C","5":"#7F1D1D" };
const KOL_LABEL = { "1":"Lancar","2A":"2A","2B":"2B","3":"3","4":"4","5":"5" };
const COV = { "1":0.01,"2A":0.05,"2B":0.15,"3":0.5,"4":0.75,"5":1.0 };
const BETTER = { "2A":"1","2B":"2A","3":"2B","4":"3","5":"4" };

const DEMO_KEPALA_UKER_KODE = "5037";

const ALL_MENUS = ["dashboard","portfolio","ews","debitur","action","ckpn","kinerjaAO","kinerjaUnit","osKurang50","buatLaporan","secMantri","mantriRealisasi","mantriOs","mantriSmlRp","mantriNplRp","mantriSmlPct","mantriNplPct","mantriNetDgSml","mantriNetDgNpl","manajemen","pengaturan"];
// Login pakai PN → dipetakan ke email Supabase "<PN>@ews.local". Ubah di sini bila domainnya diganti.
const AUTH_EMAIL_DOMAIN = "ews.local";
const ROLES = {
  pinca:      { id:"pinca",      nama:"Hery Santoso",   title:"Pimpinan Cabang",        icon:"userCircle", color:C.kpiBlue,
    desc:"Monitoring seluruh cabang & unit kerja",      akses:"Lihat semua data · read-only (mode pantau)",
    scope:"all",         editAction:false, editData:false, exportReport:true,
    menus:ALL_MENUS.filter(m=>m!=="pengaturan"&&m!=="manajemen") },
  mb:         { id:"mb",         nama:"A. Achmad Rizal", title:"Manajer Bisnis",         icon:"userPerf",   color:C.kpiPurple,
    desc:"Pengendalian portofolio cabang",              akses:"Kelola action plan, simulasi CKPN & laporan",
    scope:"all",         editAction:true,  editData:false, exportReport:true,  menus:ALL_MENUS.filter(m=>m!=="manajemen"&&m!=="pengaturan") },
  kepalaUnit: { id:"kepalaUnit", nama:"Syamsuddin",      title:"Kepala Unit",             icon:"building",   color:C.kpiTeal,
    desc:`Pengelolaan unit kerja · ${UKER.find(u=>u.kode===DEMO_KEPALA_UKER_KODE)?.nama||""}`, akses:"Hanya data unit sendiri · input action plan",
    scope:"uker",        editAction:true,  editData:false, exportReport:false, menus:["dashboard","ews","debitur","action"] },
  ao:         { id:"ao",         nama:"RM/Mantri",      title:"Account Officer / Mantri", icon:"userPerf", color:C.kpiTeal,
    desc:"Tindak lanjut debitur portofolio sendiri",              akses:"Hanya portofolio sendiri · input action plan",
    scope:"ao",          editAction:true,  editData:false, exportReport:false, menus:["dashboard","ews","debitur","action"] },
  collection: { id:"collection", nama:"Yulmand Raymon Hallatu", title:"Collection Officer", icon:"userPerf",  color:C.kpiAmber,
    desc:"Penagihan debitur bermasalah",                akses:"Debitur Kol 2-5 · update penagihan",
    scope:"bermasalah",  editAction:true,  editData:false, exportReport:false, menus:["dashboard","ews","debitur","action"] },
  admin:      { id:"admin",      nama:"Admin IT",       title:"Administrator IT",        icon:"gear",       color:C.gray,
    desc:"Manajemen user & konfigurasi sistem · akses penuh",  akses:"Kelola akun pengguna · upload file · akses semua fitur",
    scope:"all",         editAction:true,  editData:true,  exportReport:true,  menus:ALL_MENUS },
  superadmin: { id:"superadmin", nama:"Super Admin IT",  title:"Super Administrator IT",   icon:"gear",       color:"#92400E",
    desc:"Kasta tertinggi · kelola semua akun termasuk Admin IT", akses:"Kelola semua akun · akses penuh sistem",
    scope:"all",         editAction:true,  editData:true,  exportReport:true,  menus:ALL_MENUS },
};


const PERIODE = {
  "Mei 2026": { f:1.00, date:"31 Mei 2026", months:["Des '25","Jan '26","Feb '26","Mar '26","Apr '26","Mei '26"], months12:["Jun '25","Jul '25","Agu '25","Sep '25","Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26","Apr '26","Mei '26"] },
  "Apr 2026": { f:0.972, date:"30 Apr 2026", months:["Nov '25","Des '25","Jan '26","Feb '26","Mar '26","Apr '26"], months12:["Mei '25","Jun '25","Jul '25","Agu '25","Sep '25","Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26","Apr '26"] },
  "Mar 2026": { f:0.945, date:"31 Mar 2026", months:["Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26"], months12:["Apr '25","Mei '25","Jun '25","Jul '25","Agu '25","Sep '25","Okt '25","Nov '25","Des '25","Jan '26","Feb '26","Mar '26"] },
};
const _BNAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function getPeriode(label) {
  if (PERIODE[label]) return PERIODE[label];
  const parts = String(label || '').split(' ');
  const bi = _BNAMES.indexOf(parts[0]);
  const y = parseInt(parts[1]);
  if (bi === -1 || isNaN(y)) return PERIODE['Mei 2026'];
  const mo = n => { let m = bi+n, yr = y; while(m<0){m+=12;yr--;} while(m>11){m-=12;yr++;} return `${_BNAMES[m]} '${String(yr).slice(-2)}`; };
  const lastDay = new Date(y, bi+1, 0).getDate();
  return { f:1.0, date:`${lastDay} ${parts[0]} ${y}`, months:[-5,-4,-3,-2,-1,0].map(mo), months12:[-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0].map(mo) };
}

// IndexedDB cache helpers — hindari reload 49k baris setiap halaman dibuka
async function _idbOpen() {
  return new Promise((res,rej)=>{ const r=indexedDB.open('ews-ckpn-v1',1); r.onupgradeneeded=e=>e.target.result.createObjectStore('data'); r.onsuccess=e=>res(e.target.result); r.onerror=()=>rej(r.error); });
}
async function idbGet(key) {
  try { const db=await _idbOpen(); return new Promise(res=>{ const r=db.transaction('data','readonly').objectStore('data').get(key); r.onsuccess=()=>res(r.result??null); r.onerror=()=>res(null); }); } catch { return null; }
}
async function idbSet(key,val) {
  try { const db=await _idbOpen(); return new Promise(res=>{ const tx=db.transaction('data','readwrite'); tx.objectStore('data').put(val,key); tx.oncomplete=res; tx.onerror=res; }); } catch { /* */ }
}
// Subsistem data mock (PAT_*/SNAPSHOT_*/buildTrendData) dihapus — dashboard memakai data upload asli sepenuhnya.

const fNum  = (n)=>Math.round(n).toLocaleString("id-ID");
const fMil  = (jt)=>"Rp "+(jt/1000).toLocaleString("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2})+" M";
// Potong ke Juta (truncate, TIDAK dibulatkan): 26.693,92 Jt → "26.693 Jt", sesuai angka riil di file.
const fJt   = (jt)=>"Rp "+Math.trunc(jt).toLocaleString("id-ID")+" Jt";
const fFull = (jt)=>"Rp "+Math.round(jt*1e6).toLocaleString("id-ID");
const fPct  = (x,d=2)=>x.toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d})+"%";
const fMilV = (v)=>v.toLocaleString("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1})+" M";

function buildModel(list, periode, uploadHistory, uploadHistoryAll) {
  const P = getPeriode(periode);
  const f = P.f;
  const sum = (arr,sel)=>arr.reduce((s,d)=>s+sel(d),0);

  const totalDeb = new Set(list.map(d => d.cif)).size; // nasabah unik (untuk KPI)
  const totalLoans = list.length; // total rekening/baris (untuk denominator %)
  const totalOsJt = sum(list,d=>d.osJt) * f;
  const tier = { rendah:0, sedang:0, tinggi:0 };
  list.forEach(d=>tier[d.tier]++);

  const kol = KOL_ORDER.map(k=>{
    const items = list.filter(d=>d.kol===k);
    const cnt = items.length;
    return { kol:k, legend:KOL_LABEL[k], color:KOL_COLOR[k], value:cnt,
      pct: totalLoans? cnt/totalLoans*100 : 0, osJt: sum(items,d=>d.osJt)*f };
  });

  const osTinggi = sum(list.filter(d=>d.tier==="tinggi"),d=>d.osJt)*f;
  const npl = totalOsJt ? osTinggi/totalOsJt*100 : 0;

  const ckpnExisting = sum(list,d=>d.osJt*COV[d.kol]) * f;
  const ckpnSaving   = sum(list.filter(d=>d.hasAction),d=>d.osJt*(COV[d.kol]-COV[BETTER[d.kol]||d.kol])) * f;
  const ckpnAfter    = ckpnExisting - ckpnSaving;
  const savingPct    = ckpnExisting ? ckpnSaving/ckpnExisting*100 : 0;
  const tunggakanJt  = sum(list.filter(d=>d.dpd>0),d=>d.osJt) * f;
  const totalTunggakanAll = sum(list,d=>d.tunggakanTotal||0) * f;

  // --- Trend dari data upload asli: kerangka bulan tetap (P.months), 0 bila bulan itu belum ada file ---
  // Konversi label periode "Jun 2026" -> "Jun '26" agar cocok dgn P.months
  const toShort = (pl) => { const [mon,yr] = String(pl||'').split(' '); return `${mon} '${String(yr).slice(-2)}`; };
  const curShort = toShort(periode);
  // Trend OS & Tunggakan dari file LW321. Trend CKPN TIDAK dihitung dari LW321 — CKPN punya file sendiri
  // (jenis 'ckpn'), ditangani di dashboard memakai ckpnData.
  const osByShort = {}, tunggByShort = {}, debByShort = {};
  (uploadHistory || []).forEach(u => {
    const s = toShort(u.periodeLabel);
    if (u.totalOsJt        != null) osByShort[s]    = +(u.totalOsJt/1000).toFixed(3);
    if (u.totalTunggakanJt != null) tunggByShort[s] = +(u.totalTunggakanJt/1000).toFixed(3);
    if (u.rowCount         != null) debByShort[s]   = u.rowCount;
  });
  // Nilai bulan berjalan dari data yang sedang dimuat — fallback bila kolom total belum diisi di DB
  const liveOS    = +(totalOsJt/1000).toFixed(3);
  const liveTungg = +(totalTunggakanAll/1000).toFixed(3);
  const skeleton = (months, byShort, live) => {
    const map = { ...byShort };
    if (live != null && map[curShort] == null) map[curShort] = live;
    return months.map(mLabel => ({ bln: mLabel, nilai: map[mLabel] != null ? map[mLabel] : 0 }));
  };
  const trendOS_raw  = skeleton(P.months, osByShort, liveOS);
  const trendDeb_raw = skeleton(P.months, debByShort, totalLoans);
  // Delta nyata "vs bln lalu": bandingkan bulan berjalan vs bulan sebelumnya pada skeleton.
  // null = tidak ada pembanding (bulan lalu belum ada file) → jangan tampilkan angka palsu.
  const realDelta = (series) => {
    if (!series || series.length < 2) return null;
    const cur = series[series.length - 1].nilai, prev = series[series.length - 2].nilai;
    if (prev == null || prev === 0) return null;
    return (cur - prev) / prev * 100;
  };

  // Deduplikasi per CIF: satu debitur bisa punya >1 rekening di LW321
  const cifMapT10 = {};
  list.filter(d=>d.tier==="tinggi").forEach(d=>{
    if (!cifMapT10[d.cif]) {
      cifMapT10[d.cif] = { ...d };
    } else {
      cifMapT10[d.cif].osJt += d.osJt;
      cifMapT10[d.cif].tunggakanTotal = (cifMapT10[d.cif].tunggakanTotal||0) + (d.tunggakanTotal||0);
      if (d.dpd > cifMapT10[d.cif].dpd) {
        cifMapT10[d.cif].dpd   = d.dpd;
        cifMapT10[d.cif].kol   = d.kol;
        cifMapT10[d.cif].skor  = d.skor;
      }
    }
  });
  const top10 = Object.values(cifMapT10).sort((a,b)=>b.dpd-a.dpd).slice(0,10);

  const ringkasanEW = [
    { label:"Risiko Tinggi", value:tier.tinggi, color:C.red,   pct: totalLoans?tier.tinggi/totalLoans*100:0 },
    { label:"Risiko Sedang", value:tier.sedang, color:C.amber, pct: totalLoans?tier.sedang/totalLoans*100:0 },
    { label:"Risiko Rendah", value:tier.rendah, color:C.green, pct: totalLoans?tier.rendah/totalLoans*100:0 },
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
      recovery:0 }; // recovery tidak ada di LW321 → 0 (butuh sumber data Recovery tersendiri)
  }); // urutan mengikuti UKER array (KANCA → KCP → Unit)

  const gA = groupBy(d=>d.aoId);
  const perAO = Object.values(gA).map(it=>{
    const a = it[0];
    return { nama:a.ao, aoId:a.aoId, kodeUker:a.uker, uker:a.ukerNama, pn:a.pn||"", deb:it.length, osJt:sum(it,d=>d.osJt)*f,
      tinggi:it.filter(d=>d.tier==="tinggi").length,
      actionTotal:it.filter(d=>d.hasAction).length,
      actionSelesai:it.filter(d=>d.resolved).length,
      berhasil:it.filter(d=>d.resolved).length };
  }).sort((a,b)=>b.osJt-a.osJt);

  const gS = groupBy(d=>d.sektor);
  const perSektor = Object.entries(gS)
    .map(([s,items])=>({ sektor:s, osJt:sum(items,d=>d.osJt)*f, deb:items.length }))
    .sort((a,b)=>b.osJt-a.osJt);
  const gSeg = groupBy(d=>d.segment);
  const perSegment = ["Mikro","Kecil","Menengah"].filter(s=>gSeg[s]).map(s=>({ segment:s, osJt:sum(gSeg[s],d=>d.osJt)*f, deb:gSeg[s].length }));

  // Alert dari data asli: fakta per debitur (Kol, DPD, tunggakan, restruk). Tanpa narasi/jam karangan.
  // "time" = tanggal data (snapshot), bukan jam fiktif.
  const alasanFakta = (d) => {
    const parts = [`Kol ${d.kol}`, `DPD ${d.dpd} hari`];
    if ((d.tunggakanTotal||0) > 0) parts.push(`tunggakan ${fJt(d.tunggakanTotal*f)}`);
    if (d.flagRestruk === 'Y')     parts.push('restrukturisasi');
    return parts.join(' · ');
  };
  const topTinggi = [...list].filter(d=>d.tier==="tinggi").sort((a,b)=>b.dpd-a.dpd).slice(0,8);
  const topSedang = [...list].filter(d=>d.tier==="sedang").sort((a,b)=>b.dpd-a.dpd).slice(0,6);
  const alerts = [
    ...topTinggi.map(d=>({ level:"tinggi", text:`Debitur ${d.nama} (CIF ${d.cif}) — ${alasanFakta(d)}`, time:P.date })),
    ...topSedang.map(d=>({ level:"sedang", text:`Debitur ${d.nama} (CIF ${d.cif}) — ${alasanFakta(d)}`, time:P.date })),
  ];

  const actionPlans = [];

  const ckpnDebitur = [...list].filter(d=>d.kol!=="1").sort((a,b)=>b.osJt*COV[b.kol]-a.osJt*COV[a.kol]).slice(0,10).map(d=>{
    const ex=d.osJt*COV[d.kol]*f; const sv=d.hasAction?d.osJt*(COV[d.kol]-COV[BETTER[d.kol]||d.kol])*f:0;
    return { nama:d.nama, osJt:d.osJt*f, kol:d.kol, ckpn:ex, saving:sv, pct: ex?sv/ex*100:0 };
  });

  // Realisasi baru & Nett Disbursed TIDAK ada di file LW321 → tidak dikarang (butuh sumber data tersendiri).
  const realisasiPerUker = perUker.map(u => ({ kode:u.kode, nama:u.nama, realisasiJt:0 }));
  const realisasiJt = 0;
  const nettDisbursed = 0;

  perUker.filter(u=>u.npl>4.5).slice(0,4).forEach(u=>{
    alerts.push({ level:"sedang", tag:"alertOS", text:`Unit ${u.nama} — NPL ${fPct(u.npl)} · ${u.tinggi} debitur risiko tinggi · OS: ${fJt(u.osJt)}`, time:P.date });
  });
  perAO.filter(a=>a.tinggi>=3).slice(0,3).forEach(a=>{
    alerts.push({ level:"sedang", tag:"alertOS", text:`${a.pn||""} – ${a.nama} — ${a.tinggi} debitur risiko tinggi · OS: ${fJt(a.osJt)}`, time:P.date });
  });

  // Restrukturisasi dari LW321 (FLAG RESTRUK = 'Y')
  const listRestruk     = list.filter(d => d.flagRestruk === 'Y');
  const countRestrukLW  = listRestruk.length;
  const osRestrukJt     = sum(listRestruk, d => d.osJt) * f;
  const restrukPerKol   = ['1','2A','2B','3','4','5'].map(k => {
    const items = listRestruk.filter(d => d.kol === k);
    return { kol: k, count: items.length, osJt: sum(items, d => d.osJt) * f };
  }).filter(k => k.count > 0);
  const topRestruk      = [...listRestruk].sort((a, b) => b.osJt - a.osJt).slice(0, 10).map(d => ({
    nama: d.nama, cif: d.cif, kol: d.kol, osJt: d.osJt * f, dpd: d.dpd, ukerNama: d.ukerNama,
  }));

  const trendTunggakan_raw = skeleton(P.months,   tunggByShort, liveTungg);
  const trendTunggakan12   = skeleton(P.months12, tunggByShort, liveTungg);

  // Tampilan "Bulan Ini" (harian): kerangka semua tanggal 1..hari ini, 0 bila tanggal itu belum ada file
  const [pMon, pYr] = String(periode || '').split(' ');
  const pBi = _BNAMES.indexOf(pMon), pYrNum = parseInt(pYr);
  const dayTotals = {}; // tanggal (1-31) -> upload di tanggal itu (yang terakhir menang, uploadHistoryAll ASC)
  (uploadHistoryAll || []).filter(u => u.periodeLabel === periode).forEach(u => {
    const dd = parseInt(String(u.tglFile || '').split('-')[2]);
    if (dd) dayTotals[dd] = u;
  });
  let dailySkeleton = [];
  if (pBi !== -1 && !isNaN(pYrNum)) {
    const nowD = new Date();
    const isCurMonth = nowD.getMonth() === pBi && nowD.getFullYear() === pYrNum;
    const lastDay = isCurMonth ? nowD.getDate() : new Date(pYrNum, pBi + 1, 0).getDate();
    // Titik awal: tanggal terakhir bulan kemarin sebagai baseline (nilainya = upload terakhir bulan itu).
    const prevBi = (pBi + 11) % 12, prevYr = pBi === 0 ? pYrNum - 1 : pYrNum;
    const prevLabel = `${_BNAMES[prevBi]} ${prevYr}`;
    let prevLast = null;
    (uploadHistoryAll || []).filter(u => u.periodeLabel === prevLabel).forEach(u => {
      if (!prevLast || String(u.tglFile) > String(prevLast.tglFile)) prevLast = u;
    });
    const lastDayPrev = new Date(prevYr, prevBi + 1, 0).getDate();
    dailySkeleton.push({ label: `${lastDayPrev} ${_BNAMES[prevBi]}`, u: prevLast });
    for (let d = 1; d <= lastDay; d++) dailySkeleton.push({ label: `${d} ${pMon}`, u: dayTotals[d] || null });
  }
  const dailySel = (sel) => dailySkeleton.map(x => ({ bln: x.label, nilai: x.u ? +(sel(x.u)/1000).toFixed(3) : 0, tipe: "harian" }));
  const realBulanIniTungg = dailySel(u => u.totalTunggakanJt || 0);
  const realBulanIniOS    = dailySel(u => u.totalOsJt || 0);
  // "Bulan Ini" tersedia selama ada setidaknya satu upload LW321 di periode yang dipilih —
  // tidak harus bulan kalender sekarang (agar tetap muncul meski periode = bulan lalu).
  const trendData = { isCurrentMonth: dailySkeleton.some(x => x.u !== null) };

  return {
    P, totalDeb, totalOsJt, tier, kol, npl, ckpnExisting, ckpnAfter, ckpnSaving, savingPct,
    tunggakanJt, totalTunggakanAll,
    trendTunggakan: trendTunggakan_raw,
    trendTunggakan12,
    trendData,
    realBulanIniTungg, realBulanIniOS,
    countRestrukLW, osRestrukJt, restrukPerKol, topRestruk,
    deltas:{ os:realDelta(trendOS_raw), deb:realDelta(trendDeb_raw) },
    top10, ringkasanEW, perUker, perAO, perSektor, perSegment, alerts, actionPlans, ckpnDebitur,
    realisasiJt, nettDisbursed, realisasiPerUker,
  };
}

const risikoColor = { tinggi:C.red, sedang:C.amber, rendah:C.green };
const risikoBg    = { tinggi:C.redLt, sedang:C.amberLt, rendah:C.greenLt };
const risikoLabel = { tinggi:"Risiko Tinggi", sedang:"Risiko Sedang", rendah:"Risiko Rendah" };
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
const KpiCard = ({ icon, color, label, prefix, value, sub, subColor, big }) => (
  <div style={{ ...card, padding: big?"18px 20px":"12px 14px", display:"flex", flexDirection:"column", minWidth:0 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: big?10:6 }}>
      <div style={{ width:big?44:34, height:big?44:34, borderRadius:big?11:8, background:color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={icon} size={big?22:18} sw={1.9} /></div>
      <div style={{ fontSize:big?11.5:10.5, fontWeight:600, color:C.gray, letterSpacing:.3, textTransform:"uppercase", lineHeight:1.2 }}>{label}</div>
    </div>
    {prefix && <div style={{ fontSize:big?13:11.5, color:C.gray, marginBottom:-4 }}>{prefix}</div>}
    <div style={{ fontSize:big?30:22, fontWeight:700, color:C.text, lineHeight:1.15 }}>{value}</div>
    <div style={{ fontSize:big?12:11, color:subColor || C.gray, marginTop:3, fontWeight:500 }}>{sub}</div>
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
const TrendChart = ({ data, color=C.kpiBlue, infoLabel }) => {
  const max = Math.max(...data.map(d=>d.nilai), 1);
  const top = Math.ceil(max*1.25);
  const CustomDot = ({ cx, cy, payload }) => {
    if (!cx || !cy) return null;
    const h = payload?.tipe === "harian";
    return <circle cx={cx} cy={cy} r={h?2:5} fill={h?color+"99":color} strokeWidth={0} />;
  };
  const CustomLabel = ({ x, y, value, index }) => {
    if (!data[index] || data[index].tipe === "harian") return null;
    return <text x={x} y={y-7} textAnchor="middle" fontSize={9.5} fill={C.textMd} fontWeight={600}>{fMilV(value)}</text>;
  };
  // Tick bulanan: nama bulan + tahun 4-digit di baris kedua, agar "Mei '26" tak terbaca seperti tanggal "26 Mei".
  // Mode harian ("5 Mei") tidak punya apostrof → tampil satu baris apa adanya.
  const MonthTick = ({ x, y, payload }) => {
    const [mon, yy] = String(payload?.value || "").split(" '");
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={11} textAnchor="middle" fontSize={9.5} fill={C.gray}>{mon}</text>
        {yy && <text x={0} y={0} dy={22} textAnchor="middle" fontSize={8} fill={C.gray}>{`20${yy}`}</text>}
      </g>
    );
  };
  const expandYr = (l) => String(l).replace(/'(\d{2})$/, "20$1"); // "Mei '26" → "Mei 2026"
  return (
    <div style={{ position:"relative" }}>
      {infoLabel && <div style={{ position:"absolute", right:0, top:-2, fontSize:10.5, color:C.gray, fontWeight:500, zIndex:1 }}>{infoLabel}</div>}
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top:22, right:16, left:-4, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
          <XAxis dataKey="bln" tick={<MonthTick />} tickLine={false} axisLine={{ stroke:C.border }}
            height={30} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize:10.5, fill:C.gray }} tickLine={false} axisLine={false} domain={[0,top]} tickFormatter={(v)=>v+" M"} width={42} />
          <Tooltip formatter={(v)=>[fMilV(v),"Nilai"]} labelFormatter={expandYr} />
          <Line type="monotone" dataKey="nilai" stroke={color} strokeWidth={2} dot={<CustomDot />} activeDot={{ r:5 }} isAnimationActive={false}>
            <LabelList content={<CustomLabel />} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
const BarH = ({ data, dataKey, nameKey, color=C.kpiBlue, fmt, height, onBarClick }) => (
  <ResponsiveContainer width="100%" height={height || data.length*26+18}>
    <BarChart data={data} layout="vertical" margin={{ top:0, right:54, left:6, bottom:0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" horizontal={false} />
      <XAxis type="number" tick={{ fontSize:10, fill:C.gray }} tickFormatter={fmt} axisLine={false} tickLine={false} />
      <YAxis type="category" dataKey={nameKey} width={116} tick={{ fontSize:11, fill:C.textMd }} axisLine={false} tickLine={false} />
      <Tooltip formatter={(v)=>[fmt?fmt(v):v]} />
      <Bar dataKey={dataKey} fill={color} radius={[0,4,4,0]} maxBarSize={16} isAnimationActive={false}
        onClick={onBarClick ? (entry) => onBarClick(entry) : undefined}
        style={onBarClick ? { cursor:"pointer" } : {}}>
        <LabelList dataKey={dataKey} position="right" formatter={fmt} style={{ fontSize:9.5, fill:C.textMd, fontWeight:600 }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
const BarV = ({ data, dataKey, nameKey, color=C.kpiBlue, fmt, height=205, onBarClick }) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top:14, right:10, left:-6, bottom:0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
      <XAxis dataKey={nameKey} tick={{ fontSize:10, fill:C.gray }} tickLine={false} axisLine={{ stroke:C.border }} interval={0} />
      <YAxis tick={{ fontSize:10, fill:C.gray }} tickFormatter={fmt} axisLine={false} tickLine={false} width={46} />
      <Tooltip formatter={(v)=>[fmt?fmt(v):v]} />
      <Bar dataKey={dataKey} fill={color} radius={[5,5,0,0]} maxBarSize={48} isAnimationActive={false}
        onClick={onBarClick ? (entry)=>onBarClick(entry) : undefined}
        style={onBarClick ? { cursor:"pointer" } : {}} />
    </BarChart>
  </ResponsiveContainer>
);
const Select = ({ value, onChange, options, style }) => (
  <select value={value} onChange={onChange} style={{ padding:"6px 9px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12.5, background:C.white, color:C.textMd, cursor:"pointer", ...style }}>
    {options.map(o=> typeof o==="string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const Tabel = ({ headers, rows, colW, stickyHeader, onRowClick }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
      <thead style={stickyHeader ? { position:"sticky", top:0, zIndex:2 } : {}}>
        <tr>
          {headers.map((h,i)=>(
            <th key={i} style={{ padding:"9px 12px", color:C.gray, fontWeight:600, fontSize:10.5, textTransform:"uppercase", textAlign:"left", width:colW?.[i], whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}`, background:C.grayLt }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row,ri)=>(
          <tr key={ri}
            onClick={onRowClick ? ()=>onRowClick(ri) : undefined}
            style={{ background: ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor: onRowClick?"pointer":"default" }}
            onMouseEnter={onRowClick ? e=>{ e.currentTarget.style.background=C.grayLt; e.currentTarget.style.filter="brightness(0.96)"; } : undefined}
            onMouseLeave={onRowClick ? e=>{ e.currentTarget.style.background=ri%2===0?C.white:C.grayLt; e.currentTarget.style.filter="none"; } : undefined}>
            {row.map((cell,ci)=><td key={ci} style={{ padding:"9px 12px", color:C.textMd, verticalAlign:"middle" }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);


function DashboardPinca({ m, go, goKinerjaDebitur, ckpnData, recPhData }) {
  const w = useWindowWidth();
  const kpiCols   = w >= 1280 ? "repeat(6,1fr)" : w >= 900 ? "repeat(3,1fr)" : "repeat(2,1fr)";
  const chartsRow = w >= 1100 ? "1fr 1fr 1fr" : w >= 720 ? "1fr 1fr" : "1fr";
  const [blnTungg, setBlnTungg] = useState("6 Bulan");
  const [blnCKPN,  setBlnCKPN]  = useState("6 Bulan");
  const [top10Sort, setTop10Sort] = useState("default"); // default(=DPD terbesar) | os-desc | os-asc | dpd-desc | dpd-asc
  const top10Sorted = top10Sort==="os-desc" ? [...m.top10].sort((a,b)=>b.osJt-a.osJt)
                    : top10Sort==="os-asc"  ? [...m.top10].sort((a,b)=>a.osJt-b.osJt)
                    : top10Sort==="dpd-asc" ? [...m.top10].sort((a,b)=>a.dpd-b.dpd)
                    : [...m.top10].sort((a,b)=>b.dpd-a.dpd); // default & dpd-desc
  // Helper gaya tabel terbaru (header navy + baris filter di bawah header)
  const t10Navy = (align="left")=>({ padding:"0 12px", height:34, lineHeight:"34px", background:`#${M_NAVY}`, color:"#fff", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:align, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.12)" });
  const t10Filt = { padding:"5px 7px", background:C.grayLt, borderBottom:`1px solid ${C.border}` };
  const t10Sel  = { width:"100%", padding:"3px 4px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.textMd, cursor:"pointer", boxSizing:"border-box" };
  const t10Opts = [{ value:"",label:"Default" },{ value:"desc",label:"Terbesar" },{ value:"asc",label:"Terkecil" }];
  const t10OsVal  = top10Sort==="os-desc"?"desc":top10Sort==="os-asc"?"asc":"";
  const t10DpdVal = top10Sort==="dpd-desc"?"desc":top10Sort==="dpd-asc"?"asc":"";
  const setT10 = (col)=>(e)=>{ const v=e.target.value; setTop10Sort(v?`${col}-${v}`:"default"); };
  const hasBulanIni = m.trendData?.isCurrentMonth;
  const trendOpts     = hasBulanIni ? ["Bulan Ini","3 Bulan","6 Bulan","12 Bulan"] : ["3 Bulan","6 Bulan","12 Bulan"];
  const trendOptsCKPN = ["3 Bulan","6 Bulan","12 Bulan"]; // CKPN bulanan saja (tidak harian)
  const getTrend = (d6, d12, bln, dailyKey) => {
    if (bln === "Bulan Ini") {
      if (dailyKey === "trendTunggakan") return m.realBulanIniTungg || [];
      if (dailyKey === "trendOS")        return m.realBulanIniOS    || [];
      return [];
    }
    if (bln === "3 Bulan")   return d6.slice(-3);
    if (bln === "12 Bulan")  return d12;
    return d6;
  };
  const row3      = w >= 1150 ? "1.5fr 1fr 1fr" : "1fr";
  // Delta nyata; null = belum ada data bulan sebelumnya untuk dibandingkan
  const up        = (x)=> x==null ? "Belum ada data bln lalu" : (x>=0?"▲ ":"▼ ")+fPct(Math.abs(x),2)+" vs bln lalu";
  const upColor   = (x)=> x==null ? C.gray : (x>=0?C.green:C.red);

  // --- CKPN dari FILE CKPN (jenis 'ckpn'), BUKAN dari LW321. Kosong/0 bila file CKPN belum diupload. ---
  const ckpnFile      = !!ckpnData;
  const ckpnExistingF = ckpnData?.totalCkpnBerjalanJt || 0; // dalam Jt (juta)
  // Petakan dari tgl_file (YYYY-MM-DD) → "Mei '26" agar cocok dgn P.months, apa pun format periode_label-nya
  const _shortCkDate = (t) => { const p=String(t||'').split('-'); const mi=parseInt(p[1])-1; return (mi>=0 && _BNAMES[mi]) ? `${_BNAMES[mi]} '${String(p[0]).slice(-2)}` : null; };
  const ckpnByMonth = {};
  (ckpnData?.trend || []).forEach(r => { const k = _shortCkDate(r.tgl_file); if (k) ckpnByMonth[k] = +Number(r.nilai||0).toFixed(3); }); // r.nilai sudah dalam Miliar
  const ckpnTrend6  = (m.P?.months   || []).map(l => ({ bln:l, nilai: ckpnByMonth[l] || 0 }));
  const ckpnTrend12 = (m.P?.months12 || []).map(l => ({ bln:l, nilai: ckpnByMonth[l] || 0 }));
  const ckpnBulanIni = (() => {
    const nowD = new Date(), mi = nowD.getMonth(), yr = nowD.getFullYear(), dv = {};
    (ckpnData?.trend || []).forEach(r => {
      const [ty,tm,td] = String(r.tgl_file||'').split('-').map(n=>parseInt(n));
      if (ty===yr && tm===mi+1 && td) dv[td] = +Number(r.nilai||0).toFixed(3);
    });
    const out = []; for (let d=1; d<=nowD.getDate(); d++) out.push({ bln:`${d} ${_BNAMES[mi]}`, nilai: dv[d]||0, tipe:"harian" });
    return out;
  })();
  const _ck1 = ckpnTrend6[ckpnTrend6.length-1]?.nilai, _ck0 = ckpnTrend6[ckpnTrend6.length-2]?.nilai;
  const ckpnDelta = (ckpnTrend6.length>=2 && _ck0) ? (_ck1 - _ck0)/_ck0*100 : null;
  const getCkpnTrend = (bln) => bln==="Bulan Ini" ? ckpnBulanIni : bln==="3 Bulan" ? ckpnTrend6.slice(-3) : bln==="12 Bulan" ? ckpnTrend12 : ckpnTrend6;

  const KPI_BIG = [
    { icon:"wallet",  color:C.kpiBlue,   label:"Total Outstanding",       prefix:"Rp", value:fMil(m.totalOsJt).replace("Rp ",""),           sub:up(m.deltas.os),                                     subColor:upColor(m.deltas.os) },
    { icon:"warning", color:C.kpiRed,    label:"Debitur Bermasalah (3-5)",              value:fNum(m.tier.tinggi),                            sub:fPct(m.ringkasanEW[0].pct)+" dari total debitur",    subColor:C.red },
    { icon:"shield",  color:C.kpiPurple, label:"CKPN Existing",           prefix:"Rp", value:fMil(ckpnExistingF).replace("Rp ",""),          sub: ckpnFile ? up(ckpnDelta) : "Belum ada file CKPN", subColor: ckpnFile ? upColor(ckpnDelta) : C.gray },
  ];
  const KPI_SMALL = [
    { icon:"thumb",      color:C.kpiGreen,  label:"Realisasi Baru Bln Ini",  prefix:"Rp", value:fMil(m.realisasiJt||0).replace("Rp ",""),        sub:"Pinjaman baru bulan ini",                           subColor:C.green },
    { icon:"download",   color:C.kpiTeal,   label:"Nett Disbursed",          prefix:"Rp", value:fMil(m.nettDisbursed||0).replace("Rp ",""),        sub:"Realisasi dikurangi pelunasan",                     subColor:C.navy },
    { icon:"wallet",     color:C.kpiRed,    label:"Total Tunggakan",         prefix:"Rp", value:fMil(m.totalTunggakanAll||0).replace("Rp ",""),    sub:"Estimasi seluruh tunggakan",                        subColor:C.red },
    { icon:"users",      color:C.kpiTeal,   label:"Total Debitur",                        value:fNum(m.totalDeb),                                  sub:up(m.deltas.deb),                                    subColor:upColor(m.deltas.deb) },
    { icon:"infoCircle", color:C.kpiAmber,  label:"Debitur Risiko (2A-2B)",               value:fNum(m.tier.sedang),                               sub:fPct(m.ringkasanEW[1].pct)+" dari total",            subColor:C.amber },
    { icon:"thumb",      color:C.kpiGreen,  label:"Debitur Lancar",                        value:fNum(m.tier.rendah),                               sub:fPct(m.ringkasanEW[2].pct)+" dari total",            subColor:C.navy },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=720?"repeat(3,1fr)":"1fr", gap:12 }}>
        {KPI_BIG.map((k,i)=><KpiCard key={i} big {...k} />)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:kpiCols, gap:12 }}>
        {KPI_SMALL.map((k,i)=><KpiCard key={i} {...k} />)}
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
          <CardTitle right={<Select value={blnTungg} onChange={e=>setBlnTungg(e.target.value)} options={trendOpts} />}>Trend Tunggakan (DPD &gt; 0)</CardTitle>
          <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
          <TrendChart data={getTrend(m.trendTunggakan, m.trendTunggakan12, blnTungg, "trendTunggakan")} color={C.kpiRed} />
        </div>
        <div style={card}>
          <CardTitle right={<Select value={blnCKPN} onChange={e=>setBlnCKPN(e.target.value)} options={trendOptsCKPN} />}>Trend CKPN</CardTitle>
          <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
          <TrendChart data={getCkpnTrend(blnCKPN)} color={C.kpiBlue} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:row3, gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 10px" }}>
            <CardTitle>Top 10 Debitur Risiko Tinggi</CardTitle>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead>
                <tr>
                  <th style={t10Navy("center")}>No</th>
                  <th style={t10Navy()}>CIF</th>
                  <th style={t10Navy()}>Nama Debitur</th>
                  <th style={t10Navy("right")}>Outstanding</th>
                  <th style={t10Navy("center")}>DPD</th>
                  <th style={t10Navy("center")}>Kol</th>
                </tr>
                <tr>
                  <th style={t10Filt}></th>
                  <th style={t10Filt}></th>
                  <th style={t10Filt}></th>
                  <th style={t10Filt}><select value={t10OsVal} onChange={setT10("os")} style={t10Sel}>{t10Opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={t10Filt}><select value={t10DpdVal} onChange={setT10("dpd")} style={t10Sel}>{t10Opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={t10Filt}></th>
                </tr>
              </thead>
              <tbody>
                {top10Sorted.map((d,i)=>{
                  const clickable = !!goKinerjaDebitur;
                  return (
                  <tr key={i} onClick={clickable ? ()=>goKinerjaDebitur(d) : undefined}
                    style={{ background:i%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:clickable?"pointer":"default" }}
                    onMouseEnter={clickable ? (e=>e.currentTarget.style.filter="brightness(0.97)") : undefined}
                    onMouseLeave={clickable ? (e=>e.currentTarget.style.filter="none") : undefined}>
                    <td style={{ padding:"8px 12px", color:C.gray, textAlign:"center" }}>{i+1}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd, fontFamily:"monospace", fontSize:11.5 }}>{d.cif}</td>
                    <td style={{ padding:"8px 12px", color:C.text, fontWeight:600 }}>{d.nama}</td>
                    <td style={{ padding:"8px 12px", color:C.textMd, textAlign:"right" }}>{fFull(d.osJt)}</td>
                    <td style={{ padding:"8px 12px", textAlign:"center", color:d.dpd>30?C.red:d.dpd>0?C.amber:C.green, fontWeight:700 }}>{d.dpd}</td>
                    <td style={{ padding:"8px 12px", textAlign:"center", color:C.textMd }}>{d.kol}</td>
                  </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:`#${M_BEIGE}`, borderTop:`1px solid ${C.border}` }}>
                  <td colSpan={3} style={{ padding:"9px 12px", fontWeight:700, color:C.text }}>Total</td>
                  <td style={{ padding:"9px 12px", fontWeight:700, color:C.text, textAlign:"right" }}>{fFull(top10Sorted.reduce((s,d)=>s+d.osJt,0))}</td>
                  <td colSpan={2}></td>
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
          <CardTitle right={<span style={{ fontSize:10, fontWeight:700, color:C.amber, background:C.amberLt, padding:"2px 8px", borderRadius:10, letterSpacing:.3 }}>ESTIMASI</span>}>Potensi Penghematan CKPN</CardTitle>
          <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:10 }}>Simulasi berbasis kolektibilitas LW321 (bukan dari file CKPN)</div>
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              {[
                { l:"CKPN Existing (est.)", v:fMil(m.ckpnExisting).replace("Rp ",""), c:C.text },
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
                { l:"CKPN Existing (est.)", val:m.ckpnExisting, pct:100, c:C.kpiPurple },
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

      {/* ── CKPN Aktual ─────────────────────────────────────────────────── */}
      {ckpnData && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ height:1, flex:1, background:C.border }} />
            <div style={{ fontSize:11, fontWeight:700, color:C.gray, letterSpacing:.8, textTransform:"uppercase" }}>
              Data CKPN Aktual &mdash; {ckpnData.periodeLabel}
            </div>
            <div style={{ height:1, flex:1, background:C.border }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:w>=1280?"repeat(4,1fr)":w>=720?"repeat(2,1fr)":"1fr", gap:12 }}>
            <KpiCard icon="shield"  color={C.kpiPurple} label="CKPN Berjalan"         prefix="Rp" value={fMil(ckpnData.totalCkpnBerjalanJt).replace("Rp ","")} sub={`${fNum(ckpnData.totalRows)} debitur`} />
            <KpiCard icon="clipboard" color={ckpnData.totalBiayaCkpnJt>=0?C.kpiRed:C.kpiGreen} label="Biaya CKPN"
              prefix="Rp" value={fMil(Math.abs(ckpnData.totalBiayaCkpnJt)).replace("Rp ","")}
              sub={ckpnData.totalBiayaCkpnJt>=0?"Peningkatan provisi":"Penurunan provisi"} subColor={ckpnData.totalBiayaCkpnJt>=0?C.red:C.green} />
            <KpiCard icon="warning" color={C.kpiAmber} label="Debitur Restrukturisasi"
              value={fNum(ckpnData.countRestruk)}
              sub={`${ckpnData.totalRows?(ckpnData.countRestruk/ckpnData.totalRows*100).toFixed(1):0}% dari total CKPN`} />
            <KpiCard icon="download" color={C.kpiBlue} label="CKPN Sebelum" prefix="Rp" value={fMil(ckpnData.totalCkpnSebelumJt).replace("Rp ","")} sub="Periode lalu" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:w>=900?"1fr 1fr":"1fr", gap:12 }}>
            {ckpnData.byKol?.length > 0 && (
              <div style={card}>
                <CardTitle>CKPN Berjalan per Kolektibilitas (Juta)</CardTitle>
                <BarH data={ckpnData.byKol.map(d=>({ ...d, nama:`Kol ${d.kol}` }))} dataKey="totalJt" nameKey="nama" color={C.kpiPurple} fmt={(v)=>fJt(v)} />
              </div>
            )}
            {ckpnData.trend?.length > 0 && (
              <div style={card}>
                <CardTitle>Trend CKPN Berjalan</CardTitle>
                <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
                <TrendChart data={ckpnData.trend} color={C.kpiPurple} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Recovery PH ─────────────────────────────────────────────────── */}
      {recPhData && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ height:1, flex:1, background:C.border }} />
            <div style={{ fontSize:11, fontWeight:700, color:C.gray, letterSpacing:.8, textTransform:"uppercase" }}>
              Recovery PH &mdash; {recPhData.periodeLabel}
            </div>
            <div style={{ height:1, flex:1, background:C.border }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:w>=1280?"repeat(4,1fr)":w>=720?"repeat(2,1fr)":"1fr", gap:12 }}>
            <KpiCard icon="wallet"    color={C.kpiBlue}   label="Outstanding Recovery"  prefix="Rp" value={fMil(recPhData.totalOsJt).replace("Rp ","")}    sub={`${fNum(recPhData.totalRows)} debitur`} />
            <KpiCard icon="clipboard" color={C.kpiPurple} label="Target Recovery PH"    prefix="Rp" value={fMil(recPhData.totalRecPhJt).replace("Rp ","")}  sub={`Bulan ${(recPhData.latestMonth||'').toUpperCase()}`} />
            <KpiCard icon="download"  color={C.kpiTeal}   label="Realisasi PH"          prefix="Rp" value={fMil(recPhData.totalRealPhJt).replace("Rp ","")} sub="Pengembalian aktual" subColor={C.green} />
            <KpiCard icon="thumb"     color={recPhData.achievementPct>=100?C.kpiGreen:recPhData.achievementPct>=70?C.kpiAmber:C.kpiRed}
              label="Achievement Rate" value={`${recPhData.achievementPct.toFixed(1)}%`}
              sub="Realisasi / Target" subColor={recPhData.achievementPct>=100?C.green:recPhData.achievementPct>=70?C.amber:C.red} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:w>=900?"1fr 1fr":"1fr", gap:12 }}>
            <div style={card}>
              <CardTitle>Progress Recovery PH</CardTitle>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[
                  { l:"Target Recovery PH", val:recPhData.totalRecPhJt, pct:100, c:C.kpiPurple },
                  { l:"Realisasi PH",       val:recPhData.totalRealPhJt, pct:recPhData.totalRecPhJt ? Math.min(100, recPhData.totalRealPhJt/recPhData.totalRecPhJt*100) : 0, c:C.kpiTeal },
                ].map((b,i)=>(
                  <div key={i}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11.5, marginBottom:4 }}>
                      <span style={{ color:C.gray }}>{b.l}</span>
                      <span style={{ color:C.text, fontWeight:600 }}>{fMil(b.val)}</span>
                    </div>
                    <div style={{ height:12, background:C.grayLt, borderRadius:6, overflow:"hidden" }}>
                      <div style={{ width:`${b.pct}%`, height:"100%", background:b.c, borderRadius:6, transition:"width .4s ease" }} />
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, marginTop:4,
                  background:recPhData.achievementPct>=100?C.greenLt:recPhData.achievementPct>=70?C.amberLt:C.redLt }}>
                  <Ic n={recPhData.achievementPct>=100?"thumb":"warning"} size={16} />
                  <span style={{ fontSize:12.5, color:recPhData.achievementPct>=100?C.green:recPhData.achievementPct>=70?C.amber:C.red }}>Achievement Rate Recovery PH</span>
                  <span style={{ marginLeft:"auto", fontSize:15, fontWeight:800, color:recPhData.achievementPct>=100?C.green:recPhData.achievementPct>=70?C.amber:C.red }}>
                    {recPhData.achievementPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            {recPhData.trend?.length > 0 && (
              <div style={card}>
                <CardTitle>Trend Outstanding Recovery</CardTitle>
                <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
                <TrendChart data={recPhData.trend} color={C.kpiTeal} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardMB({ m, go }) {
  const w = useWindowWidth();
  const kpiCols = w >= 900 ? "repeat(3,1fr)" : "1fr";
  const inProgress = m.actionPlans.filter(p=>p.status==="in_progress");
  const selesai = m.actionPlans.filter(p=>p.status==="selesai").length;
  const statusData = [{ legend:"Selesai", value:selesai, color:C.green },{ legend:"In Progress", value:inProgress.length, color:C.amber }];
  const alertTinggi = m.alerts.filter(a=>a.level==="tinggi");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:kpiCols, gap:12 }}>
        <KpiCard icon="wallet" color={C.kpiBlue} label="Total Outstanding" prefix="Rp" value={fMil(m.totalOsJt).replace("Rp ","")} sub={fNum(m.totalDeb)+" debitur"} subColor={C.navy} />
        <KpiCard icon="warning" color={C.kpiRed} label="NPL Ratio" value={fPct(m.npl)} sub="Kol 3-5 / Total OS" subColor={C.red} />
        <KpiCard icon="shield" color={C.kpiPurple} label="CKPN Existing" prefix="Rp" value={fMil(m.ckpnExisting).replace("Rp ","")} sub={"Potensi hemat "+fMil(m.ckpnSaving)} subColor={C.green} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>NPL Ratio per Unit Kerja</CardTitle>
          <BarH data={[...m.perUker].sort((a,b)=>b.npl-a.npl)} dataKey="npl" nameKey="nama" color={C.kpiRed} fmt={(v)=>fPct(v,1)} />
        </div>
        <div style={card}>
          <CardTitle>Progress Action Plan</CardTitle>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Donut data={statusData} centerTop={fNum(m.actionPlans.length)} centerBottom="Action" unit="action" />
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
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 0" }}><CardTitle>Action Plan Belum Selesai</CardTitle></div>
        <Tabel headers={["Tgl Input","Nama Debitur","PIC","Kol","Jenis Tindakan","Target","Status"]} colW={[90,150,140,46,160,95,110]}
          rows={inProgress.slice(0,8).map(p=>[
            p.tgl, p.nama, p.ao, p.kol, p.jenis, p.target,
            <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:C.amberLt, color:C.amber, fontSize:11.5, fontWeight:600 }}>In Progress</span>,
          ])} />
        <div onClick={()=>go("action")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua</div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 8px" }}><CardTitle>Alert Risiko Tinggi</CardTitle></div>
        {alertTinggi.length===0 && <div style={{ padding:16, color:C.gray, fontSize:13, textAlign:"center" }}>Tidak ada alert risiko tinggi</div>}
        {alertTinggi.slice(0,5).map((a,i)=>(
          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 16px", borderBottom:`1px solid #F1F3F6` }}>
            <span style={{ color:C.red, flexShrink:0, marginTop:1 }}><Ic n="warning" size={17} /></span>
            <div style={{ flex:1, fontSize:12.5, color:C.textMd, lineHeight:1.35 }}>{a.text}</div>
            <div style={{ fontSize:10.5, color:C.gray, whiteSpace:"nowrap", flexShrink:0 }}>{a.time}</div>
          </div>
        ))}
        <div onClick={()=>go("ews")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua Alert</div>
      </div>
    </div>
  );
}

function DashboardKepalaUnit({ m, go }) {
  const w = useWindowWidth();
  const actionUnit = m.actionPlans.slice(0,5);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"repeat(3,1fr)":"1fr", gap:12 }}>
        <KpiCard icon="wallet" color={C.kpiBlue} label="Total OS Unit" prefix="Rp" value={fMil(m.totalOsJt).replace("Rp ","")} sub={fNum(m.totalDeb)+" debitur"} subColor={C.navy} />
        <KpiCard icon="warning" color={C.kpiRed} label="NPL Unit" value={fPct(m.npl)} sub="Kol 3-5 / Total OS" subColor={C.red} />
        <KpiCard icon="shield" color={C.kpiPurple} label="CKPN Unit" prefix="Rp" value={fMil(m.ckpnExisting).replace("Rp ","")} sub={"Coverage "+fPct(m.totalOsJt?m.ckpnExisting/m.totalOsJt*100:0)} subColor={C.red} />
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 0" }}><CardTitle>Debitur Risiko Tinggi di Unit Ini</CardTitle></div>
        <Tabel headers={["CIF","Nama Debitur","RM/Mantri","Outstanding","DPD","Kol"]} colW={[88,160,110,110,50,46]}
          rows={m.top10.slice(0,5).map(d=>[
            d.cif, d.nama, d.ao,
            <span style={{ fontWeight:500 }}>{fJt(d.osJt)}</span>,
            <span style={{ color:C.red, fontWeight:600 }}>{d.dpd}</span>,
            d.kol,
          ])} />
        <div onClick={()=>go("debitur")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua Debitur</div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 0" }}><CardTitle>Action Plan AO di Unit Ini</CardTitle></div>
        <Tabel headers={["Tgl","Nama Debitur","PIC","Kol","Jenis","Target","Status"]} colW={[80,150,140,46,150,90,110]}
          rows={actionUnit.map(p=>[
            p.tgl, p.nama, p.ao, p.kol, p.jenis, p.target,
            <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:p.status==="selesai"?C.greenLt:C.amberLt, color:p.status==="selesai"?C.green:C.amber, fontSize:11.5, fontWeight:600 }}>{statusLabel[p.status]}</span>,
          ])} />
        <div onClick={()=>go("action")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua</div>
      </div>
    </div>
  );
}

function DashboardAO({ m, go }) {
  const w = useWindowWidth();
  const debBermasalah = m.tier.sedang + m.tier.tinggi;
  const actionPending = m.actionPlans.filter(p=>p.status==="in_progress");
  const alertAO = m.alerts.filter(a=>a.level!=="rendah").slice(0,5);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"repeat(3,1fr)":"1fr", gap:12 }}>
        <KpiCard icon="wallet" color={C.kpiBlue} label="Total OS Binaan" prefix="Rp" value={fMil(m.totalOsJt).replace("Rp ","")} sub={fNum(m.totalDeb)+" debitur"} subColor={C.navy} />
        <KpiCard icon="warning" color={C.kpiRed} label="Debitur Bermasalah" value={fNum(debBermasalah)} sub={fNum(m.tier.tinggi)+" risiko tinggi"} subColor={C.red} />
        <KpiCard icon="clipboard" color={C.kpiAmber} label="Action Plan Pending" value={fNum(actionPending.length)} sub="Perlu diselesaikan" subColor={C.amber} />
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 0" }}><CardTitle>Action Plan Saya</CardTitle></div>
        <Tabel headers={["Tgl","Nama Debitur","Kol","Jenis Tindakan","Target","Status"]} colW={[80,170,46,170,90,110]}
          rows={actionPending.slice(0,6).map(p=>[
            p.tgl, p.nama, p.kol, p.jenis, p.target,
            <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:C.amberLt, color:C.amber, fontSize:11.5, fontWeight:600 }}>In Progress</span>,
          ])} />
        <div onClick={()=>go("action")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua</div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px 8px" }}><CardTitle>Alert Debitur Binaan</CardTitle></div>
        {alertAO.length===0 && <div style={{ padding:16, color:C.gray, fontSize:13, textAlign:"center" }}>Tidak ada alert aktif</div>}
        {alertAO.map((a,i)=>(
          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 16px", borderBottom:`1px solid #F1F3F6` }}>
            <span style={{ color:risikoColor[a.level], flexShrink:0, marginTop:1 }}><Ic n="warning" size={17} /></span>
            <div style={{ flex:1, fontSize:12.5, color:C.textMd, lineHeight:1.35 }}>{a.text}</div>
            <div style={{ fontSize:10.5, color:C.gray, whiteSpace:"nowrap", flexShrink:0 }}>{a.time}</div>
          </div>
        ))}
        <div onClick={()=>go("ews")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua Alert</div>
      </div>
    </div>
  );
}

function DashboardCollection({ m, go }) {
  const w = useWindowWidth();
  const kol25 = m.kol.filter(k=>k.kol!=="1");
  const jmlKol25 = kol25.reduce((s,k)=>s+k.value,0);
  const totalTunggakan = m.totalTunggakanAll||m.tunggakanJt;
  const actionPenagihan = m.actionPlans.filter(p=>p.status==="in_progress");
  const progressData = [{ legend:"Selesai", value:m.actionPlans.filter(p=>p.status==="selesai").length, color:C.green },{ legend:"In Progress", value:actionPenagihan.length, color:C.amber }];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"repeat(2,1fr)":"1fr", gap:12 }}>
        <KpiCard icon="warning" color={C.kpiRed} label="Debitur Kol 2-5" value={fNum(jmlKol25)} sub={"Risiko: "+fNum(m.tier.tinggi)+" tinggi, "+fNum(m.tier.sedang)+" sedang"} subColor={C.red} />
        <KpiCard icon="wallet" color={C.kpiAmber} label="Total Tunggakan" prefix="Rp" value={fMil(totalTunggakan).replace("Rp ","")} sub="Estimasi total tunggakan" subColor={C.amber} />
      </div>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"1fr 1fr":"1fr", gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 0" }}><CardTitle>Action Plan Penagihan Pending</CardTitle></div>
          <Tabel headers={["Nama Debitur","PIC","Kol","Jenis","Target"]} colW={[160,140,46,160,90]}
            rows={actionPenagihan.slice(0,6).map(p=>[p.nama, p.ao, p.kol, p.jenis, p.target])} />
          <div onClick={()=>go("action")} style={{ textAlign:"center", padding:"10px", borderTop:`1px solid ${C.border}`, color:C.navy, fontSize:12.5, fontWeight:600, cursor:"pointer" }}>Lihat Semua</div>
        </div>
        <div style={card}>
          <CardTitle>Progress Recovery</CardTitle>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Donut data={progressData} centerTop={fNum(m.actionPlans.length)} centerBottom="Action" unit="action" />
            <div style={{ flex:1 }}>
              {progressData.map((d,i)=>(
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
    </div>
  );
}

function PortfolioStatus({ m, ckpnData, goDebitur }) {
  const w = useWindowWidth();
  const c3 = w >= 1100 ? "1.1fr 1fr 1fr" : w >= 760 ? "1fr 1fr" : "1fr";
  const ckpnF = ckpnData?.totalCkpnBerjalanJt || 0; // CKPN dari file CKPN (jenis 'ckpn'), BUKAN dari LW321
  const clickHint = <span style={{ fontSize:10, color:C.gray, fontWeight:500 }}>klik bar → debitur</span>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=900?"repeat(4,1fr)":"repeat(2,1fr)", gap:10 }}>
        <KpiCard icon="wallet" color={C.kpiBlue} label="Total Outstanding" prefix="Rp" value={fMil(m.totalOsJt).replace("Rp ","")} sub={fNum(m.totalDeb)+" debitur"} subColor={C.navy} />
        <KpiCard icon="thumb" color={C.kpiGreen} label="Debitur Lancar" value={fNum(m.tier.rendah)} sub={fPct(m.ringkasanEW[2].pct)+" dari total"} subColor={C.green} />
        <KpiCard icon="warning" color={C.kpiRed} label="NPL Ratio" value={fPct(m.npl)} sub="Kol 3-5 / Total OS" subColor={C.red} />
        <KpiCard icon="shield" color={C.kpiPurple} label="CKPN Existing" prefix="Rp" value={fMil(ckpnF).replace("Rp ","")} sub={ckpnData ? "Coverage "+fPct(m.totalOsJt?ckpnF/m.totalOsJt*100:0) : "Belum ada file CKPN"} subColor={ckpnData ? C.red : C.gray} />
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
          <CardTitle right={goDebitur && clickHint}>Outstanding per Sektor</CardTitle>
          <BarV data={m.perSektor} dataKey="osJt" nameKey="sektor" color={C.kpiBlue} fmt={(v)=>fMilV(v/1000)} height={200}
            onBarClick={goDebitur ? (e)=>e?.sektor && goDebitur({ sektor:e.sektor }) : undefined} />
        </div>
        <div style={card}>
          <CardTitle right={goDebitur && clickHint}>Outstanding per Segment</CardTitle>
          <BarV data={m.perSegment} dataKey="osJt" nameKey="segment" color={C.kpiPurple} fmt={(v)=>fMilV(v/1000)} height={200}
            onBarClick={goDebitur ? (e)=>e?.segment && goDebitur({ segment:e.segment }) : undefined} />
        </div>
      </div>
      <div style={card}>
        <CardTitle>Outstanding per Unit Kerja</CardTitle>
        <BarH data={m.perUker} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)} />
      </div>
      <div style={card}>
        <CardTitle>Realisasi per Unit Kerja</CardTitle>
        <BarH data={m.realisasiPerUker||[]} dataKey="realisasiJt" nameKey="nama" color={C.kpiGreen} fmt={(v)=>fMilV(v/1000)} />
      </div>
    </div>
  );
}

function EarlyWarning({ m }) {
  const w = useWindowWidth();
  const [filter, setFilter] = useState("semua");
  const alerts = filter==="semua" ? m.alerts : filter==="alertOS" ? m.alerts.filter(a=>a.tag==="alertOS") : m.alerts.filter(a=>a.level===filter);
  const ukerAlert = m.perUker.map(u=>({ nama:u.nama, tinggi:u.tinggi })).filter(u=>u.tinggi>0).sort((a,b)=>b.tinggi-a.tinggi);
  const countByLevel = { tinggi:m.alerts.filter(a=>a.level==="tinggi").length, sedang:m.alerts.filter(a=>a.level==="sedang").length };

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
            {["semua","tinggi","sedang","alertOS"].map(lv=>{
              const cnt = lv==="semua" ? m.alerts.length : lv==="alertOS" ? m.alerts.filter(a=>a.tag==="alertOS").length : countByLevel[lv];
              const active = filter===lv;
              const col = lv==="semua" ? C.navy : lv==="alertOS" ? C.kpiTeal : risikoColor[lv];
              const bg  = lv==="semua" ? C.navyLt : lv==="alertOS" ? "#E0F2F1" : risikoBg[lv];
              return (
                <button key={lv} onClick={()=>setFilter(lv)} style={{ padding:"4px 12px", border:`1px solid ${active?col:C.border}`, borderRadius:20, background:active?bg:C.white, color:active?col:C.gray, fontSize:12, fontWeight:active?700:500, cursor:"pointer" }}>
                  {lv==="semua"?"Semua":lv==="alertOS"?"Alert OS":risikoLabel[lv]} <span style={{ fontWeight:700 }}>({cnt})</span>
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

const SIM_BULAN_OPTS = [1,2,3,6,9,12,18,24,36,48,60];

function BreakdownRow({ d, colSpan = 10 }) {
  const dpd2    = d.dpd || 0;
  const months2 = Math.ceil(dpd2/30) || 0;
  const tP  = d.tunggakanPokok   != null ? d.tunggakanPokok   : Math.round(d.osJt*(dpd2/360));
  const tB  = d.tunggakanBunga   != null ? d.tunggakanBunga   : Math.round(tP*0.15/12*months2);
  const tD  = d.tunggakanDenda   != null ? d.tunggakanDenda   : Math.round(tP*0.02*months2);
  const tPy = d.tunggakanPenalty != null ? d.tunggakanPenalty : (dpd2>90?Math.round(tP*0.01):0);
  const tT  = d.tunggakanTotal   != null ? d.tunggakanTotal   : tP+tB+tD+tPy;

  const defaultBulan = dpd2 > 0 ? Math.max(1, Math.round(dpd2/30)) : 12;
  // include defaultBulan in options if not already present
  const opts = SIM_BULAN_OPTS.includes(defaultBulan) ? SIM_BULAN_OPTS : [...SIM_BULAN_OPTS, defaultBulan].sort((a,b)=>a-b);

  const [simBulan, setSimBulan] = useState(defaultBulan);
  const cicilan = simBulan > 0 ? Math.round((tT||0) / simBulan) : 0;

  return (
    <tr style={{ background:"#F0F7FF" }}>
      <td colSpan={colSpan} style={{ padding:"10px 24px 14px" }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.navy, marginBottom:8 }}>Breakdown Komponen Tunggakan — {d.nama}</div>
        <table style={{ borderCollapse:"collapse", fontSize:12.5 }}>
          <thead>
            <tr style={{ background:C.navyLt }}>
              {["Komponen","Nominal"].map(h=>(
                <th key={h} style={{ padding:"6px 16px", color:C.navy, fontWeight:600, fontSize:11, textAlign:h==="Nominal"?"right":"left", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[["Tunggakan Pokok",tP],["Tunggakan Bunga",tB],["Tunggakan Denda",tD],["Tunggakan Penalty",tPy]].map(([label,val])=>(
              <tr key={label} style={{ borderBottom:`1px solid #D1E4F6` }}>
                <td style={{ padding:"5px 16px", color:C.textMd }}>{label}</td>
                <td style={{ padding:"5px 16px", color:C.textMd, textAlign:"right" }}>{fJt(val||0)}</td>
              </tr>
            ))}
            <tr style={{ background:C.navy }}>
              <td style={{ padding:"6px 16px", color:"#fff", fontWeight:700 }}>Total Tunggakan</td>
              <td style={{ padding:"6px 16px", color:"#fff", fontWeight:700, textAlign:"right" }}>{fJt(tT||0)}</td>
            </tr>
            {(tT||0) > 0 && <>
              <tr>
                <td style={{ padding:"7px 16px 4px", color:C.gray, fontSize:12 }}>
                  Simulasi cicilan — pilih tenor:
                </td>
                <td style={{ padding:"7px 16px 4px", textAlign:"right" }}>
                  <select value={simBulan} onChange={e=>setSimBulan(Number(e.target.value))}
                    style={{ padding:"4px 9px", border:`1.5px solid ${C.kpiBlue}`, borderRadius:7, fontSize:12, color:C.text, background:C.white, cursor:"pointer" }}>
                    {opts.map(b=>(
                      <option key={b} value={b}>
                        {b} bulan{b===defaultBulan&&dpd2>0?` — default (DPD ${dpd2} hr)`:""}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr style={{ background:"#EBF5FF" }}>
                <td style={{ padding:"5px 16px 8px", color:C.kpiBlue, fontWeight:700, fontSize:13 }}>Estimasi Cicilan/Bulan</td>
                <td style={{ padding:"5px 16px 8px", color:C.kpiBlue, fontWeight:700, fontSize:13, textAlign:"right" }}>{fJt(cicilan)}</td>
              </tr>
            </>}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

const KOL_RANK = {'1':1,'2A':2,'2B':3,'3':4,'4':5,'5':6};
function groupByCif(list) {
  const m = {};
  list.forEach(d => {
    if (!m[d.cif]) {
      m[d.cif] = { ...d, totalOsJt: d.osJt, loans: [d] };
    } else {
      m[d.cif].loans.push(d);
      m[d.cif].totalOsJt += d.osJt;
      if ((KOL_RANK[d.kol]||0) > (KOL_RANK[m[d.cif].kol]||0)) { m[d.cif].kol=d.kol; m[d.cif].tier=d.tier; m[d.cif].skor=d.skor; }
      if (d.dpd > m[d.cif].dpd) m[d.cif].dpd = d.dpd;
      if (d.flagRestruk === 'Y') m[d.cif].flagRestruk = 'Y';
    }
  });
  return Object.values(m);
}

// Filter multi-pilih ala Excel untuk kolom Unit Kerja. Panel pakai portal + position:fixed
// agar tidak terpotong oleh container tabel yang overflow:auto.
function UkerMultiFilter({ options, selected, onToggle, onClear, btnStyle, borderColor }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ left:0, top:0, width:200 });
  useEffect(()=>{
    if(!open) return;
    const place = ()=>{ const r=btnRef.current?.getBoundingClientRect(); if(r) setPos({ left:r.left, top:r.bottom+4, width:Math.max(r.width,190) }); };
    place();
    const onDoc = (e)=>{ if(btnRef.current && !btnRef.current.contains(e.target) && !e.target.closest?.('[data-uker-pop]')) setOpen(false); };
    const onKey = (e)=>{ if(e.key==='Escape') setOpen(false); };
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return ()=>{ window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const label = selected.size===0 ? "Semua Unit"
    : selected.size===1 ? (options.find(o=>selected.has(o.kode))?.nama || "1 unit")
    : `${selected.size} unit dipilih`;
  const filt = options.filter(o=>!q || o.nama.toLowerCase().includes(q.toLowerCase()));
  const rowSt = { display:"flex", alignItems:"center", gap:6, padding:"4px 5px", fontSize:11.5, color:"#374151", cursor:"pointer", borderRadius:4, whiteSpace:"nowrap" };
  return (
    <>
      <button ref={btnRef} type="button" onClick={()=>setOpen(o=>!o)}
        style={{ ...btnStyle, textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center", gap:4, fontWeight: selected.size?700:400, color: selected.size?"#15396A":btnStyle.color }}>
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
        <span style={{ fontSize:8, opacity:.55, flexShrink:0 }}>▼</span>
      </button>
      {open && createPortal(
        <div data-uker-pop style={{ position:"fixed", left:pos.left, top:pos.top, width:pos.width, maxHeight:320, overflowY:"auto", background:"#fff", border:`1px solid ${borderColor}`, borderRadius:7, boxShadow:"0 8px 24px rgba(0,0,0,.18)", zIndex:9999, padding:6 }}>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari unit…"
            style={{ width:"100%", padding:"5px 7px", border:`1px solid ${borderColor}`, borderRadius:5, fontSize:11.5, marginBottom:5, boxSizing:"border-box" }} />
          <div onClick={()=>{ onClear(); }} style={{ ...rowSt, fontWeight:700 }}>
            <input type="checkbox" readOnly checked={selected.size===0} style={{ cursor:"pointer" }} /> Semua Unit
          </div>
          <div style={{ height:1, background:borderColor, margin:"4px 0" }} />
          {filt.length===0 && <div style={{ padding:"6px 5px", fontSize:11, color:"#9CA3AF" }}>Tidak ada unit</div>}
          {filt.map(o=>(
            <div key={o.kode} onClick={()=>onToggle(o.kode)}
              style={{ ...rowSt, background: selected.has(o.kode)?"#EBF2FF":"transparent" }}>
              <input type="checkbox" readOnly checked={selected.has(o.kode)} style={{ cursor:"pointer" }} /> {o.nama}
            </div>
          ))}
        </div>, document.body)}
    </>
  );
}

function DaftarDebitur({ list, preset }) {
  const [cari, setCari] = useState("");
  const [kol, setKol] = useState("Semua Kolektibilitas");
  const [risiko, setRisiko] = useState("Semua Risiko");
  const [restruk, setRestruk] = useState("Semua");
  const [sektor, setSektor]   = useState(preset?.sektor  || "Semua Sektor");
  const [segment, setSegment] = useState(preset?.segment || "Semua Segmen");
  const [unitSel, setUnitSel] = useState(new Set()); // kosong = semua unit (multi-pilih ala Excel)
  const [sortBy, setSortBy] = useState("default"); // default | os-desc | os-asc | dpd-desc | dpd-asc
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [expandedCifs, setExpandedCifs] = useState(new Set());
  const [expandedLoan, setExpandedLoan] = useState(null);

  const ukerList = UKER.filter(u=>list.some(d=>d.uker===u.kode));
  const sektorList  = useMemo(()=>[...new Set(list.map(d=>d.sektor).filter(Boolean))].sort(), [list]);
  const segmentList = useMemo(()=>["Mikro","Kecil","Menengah"].filter(s=>list.some(d=>d.segment===s)), [list]);
  const groups = useMemo(()=>groupByCif(list), [list]);

  const filtered = groups.filter(g=>{
    const okCari    = !cari || g.nama.toLowerCase().includes(cari.toLowerCase()) || g.cif.toLowerCase().includes(cari.toLowerCase());
    const okKol     = kol==="Semua Kolektibilitas" || g.loans.some(d=>("Kol "+d.kol)===kol);
    const okRsk     = risiko==="Semua Risiko" || g.loans.some(d=>risikoLabel[d.tier]===risiko);
    const okUker    = unitSel.size===0 || g.loans.some(d=>unitSel.has(d.uker));
    const okRestruk = restruk==="Semua" || (restruk==="Y" ? g.flagRestruk==="Y" : g.flagRestruk!=="Y");
    const okSektor  = sektor==="Semua Sektor"   || g.loans.some(d=>d.sektor===sektor);
    const okSegment = segment==="Semua Segmen"  || g.loans.some(d=>d.segment===segment);
    return okCari && okKol && okRsk && okUker && okRestruk && okSektor && okSegment;
  });
  const sorted = sortBy==="os-desc"  ? [...filtered].sort((a,b)=>b.totalOsJt-a.totalOsJt)
               : sortBy==="os-asc"   ? [...filtered].sort((a,b)=>a.totalOsJt-b.totalOsJt)
               : sortBy==="dpd-desc" ? [...filtered].sort((a,b)=>b.dpd-a.dpd)
               : sortBy==="dpd-asc"  ? [...filtered].sort((a,b)=>a.dpd-b.dpd)
               : filtered;
  const totalPage = Math.max(1, Math.ceil(sorted.length/perPage));
  const pg = Math.min(page, totalPage);
  const shown = sorted.slice((pg-1)*perPage, pg*perPage);

  const toggleCif  = (cif) => setExpandedCifs(prev=>{ const n=new Set(prev); n.has(cif)?n.delete(cif):n.add(cif); return n; });
  const toggleLoan = (key) => setExpandedLoan(prev=>prev===key?null:key);

  const tdS = (extra={})=>({ padding:"9px 12px", color:C.textMd, ...extra });
  const onF = (fn)=>(e)=>{ fn(e.target.value); setPage(1); };
  // Urutan via dropdown di kolom Outstanding/DPD (hanya satu kolom aktif sekaligus)
  const osSort  = sortBy==="os-desc"?"desc":sortBy==="os-asc"?"asc":"";
  const dpdSort = sortBy==="dpd-desc"?"desc":sortBy==="dpd-asc"?"asc":"";
  const setColSort = (col)=>(e)=>{ const v=e.target.value; setSortBy(v?`${col}-${v}`:"default"); setPage(1); };
  const hSelSt = { width:"100%", padding:"3px 4px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.textMd, cursor:"pointer", boxSizing:"border-box" };
  const hInpSt = { width:"100%", padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.text, boxSizing:"border-box" };
  const navyTh = (align="left")=>({ height:34, lineHeight:"34px", padding:"0 10px", background:`#${M_NAVY}`, color:"#fff", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:align, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.12)", userSelect:"none", position:"sticky", top:0, zIndex:5 });
  const filtTh = { padding:"5px 6px", background:C.grayLt, borderBottom:`1px solid ${C.border}`, position:"sticky", top:34, zIndex:5 };
  const colW = [88,150,120,110,90,100,110,58,80,72,118];
  const anyFilter = cari || unitSel.size>0 || kol!=="Semua Kolektibilitas" || risiko!=="Semua Risiko" || restruk!=="Semua" || sektor!=="Semua Sektor" || segment!=="Semua Segmen" || sortBy!=="default";
  const resetFilters = ()=>{ setCari(""); setUnitSel(new Set()); setKol("Semua Kolektibilitas"); setRisiko("Semua Risiko"); setRestruk("Semua"); setSektor("Semua Sektor"); setSegment("Semua Segmen"); setSortBy("default"); setPage(1); };
  const toggleUker = (kode)=>{ setUnitSel(prev=>{ const n=new Set(prev); n.has(kode)?n.delete(kode):n.add(kode); return n; }); setPage(1); };
  const clearUker  = ()=>{ setUnitSel(new Set()); setPage(1); };
  const sortOpts = [{value:"",label:"Default"},{value:"desc",label:"Terbesar"},{value:"asc",label:"Terkecil"}];

  return (
    <div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Daftar Debitur — filter di tiap kolom</div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {anyFilter && <button onClick={resetFilters} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Reset Filter</button>}
            <span style={{ fontSize:12.5, color:C.gray }}>{fNum(sorted.length)} nasabah</span>
          </div>
        </div>
        <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"66vh" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
            <colgroup>{colW.map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
            <thead>
              <tr>
                <th style={navyTh()}>CIF</th>
                <th style={navyTh()}>Nama Debitur</th>
                <th style={navyTh()}>Unit Kerja</th>
                <th style={navyTh()}>RM/Mantri</th>
                <th style={navyTh()}>Segment</th>
                <th style={navyTh()}>Sektor Usaha</th>
                <th style={navyTh("right")}>Outstanding</th>
                <th style={navyTh("center")}>Kol</th>
                <th style={navyTh("center")}>Restruk</th>
                <th style={navyTh("center")}>DPD</th>
                <th style={navyTh()}>Status Risiko</th>
              </tr>
              <tr>
                <th style={filtTh}></th>
                <th style={filtTh}><input value={cari} onChange={onF(setCari)} placeholder="Cari nama/CIF…" style={hInpSt} /></th>
                <th style={filtTh}><UkerMultiFilter options={ukerList} selected={unitSel} onToggle={toggleUker} onClear={clearUker} btnStyle={hSelSt} borderColor={C.border} /></th>
                <th style={filtTh}></th>
                <th style={filtTh}><select value={segment} onChange={onF(setSegment)} style={hSelSt}><option>Semua Segmen</option>{segmentList.map(s=><option key={s}>{s}</option>)}</select></th>
                <th style={filtTh}><select value={sektor} onChange={onF(setSektor)} style={hSelSt}><option>Semua Sektor</option>{sektorList.map(s=><option key={s}>{s}</option>)}</select></th>
                <th style={filtTh}><select value={osSort} onChange={setColSort("os")} style={hSelSt}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={kol} onChange={onF(setKol)} style={hSelSt}><option>Semua Kolektibilitas</option><option>Kol 1</option><option>Kol 2A</option><option>Kol 2B</option><option>Kol 3</option><option>Kol 4</option><option>Kol 5</option></select></th>
                <th style={filtTh}><select value={restruk} onChange={onF(setRestruk)} style={hSelSt}><option>Semua</option><option>Y</option><option>N</option></select></th>
                <th style={filtTh}><select value={dpdSort} onChange={setColSort("dpd")} style={hSelSt}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={risiko} onChange={onF(setRisiko)} style={hSelSt}><option>Semua Risiko</option><option>Risiko Tinggi</option><option>Risiko Sedang</option><option>Risiko Rendah</option></select></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g, ri)=>{
                const multi = g.loans.length > 1;
                const cifExp = expandedCifs.has(g.cif);
                const rows = [];
                rows.push(
                  <tr key={g.cif} onClick={()=>{ multi ? toggleCif(g.cif) : toggleLoan(g.cif+"-0"); }}
                    style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}>
                    <td style={tdS()}>{g.cif}</td>
                    <td style={tdS({ fontWeight:500, color:C.text })}>
                      {g.nama}
                      {multi && <span style={{ marginLeft:6, fontSize:10, background:C.navyLt, color:C.navy, borderRadius:4, padding:"1px 5px", fontWeight:600 }}>{g.loans.length} pinjaman</span>}
                    </td>
                    <td style={tdS()}>{g.ukerNama}</td>
                    <td style={tdS()}>{g.ao}</td>
                    <td style={tdS()}>{g.segment}</td>
                    <td style={tdS()}>{g.sektor}</td>
                    <td style={tdS({ fontWeight:500, textAlign:"right" })}>{fJt(g.totalOsJt)}</td>
                    <td style={tdS({ textAlign:"center" })}>{g.kol}</td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>
                      {g.flagRestruk === 'Y'
                        ? <span style={{ fontSize:10.5, fontWeight:700, color:C.amber, background:C.amberLt, padding:"2px 7px", borderRadius:4 }}>Y</span>
                        : <span style={{ fontSize:10.5, color:C.gray }}>N</span>}
                    </td>
                    <td style={{ padding:"9px 12px", textAlign:"center", color:g.dpd>30?C.red:g.dpd>0?C.amber:C.green, fontWeight:600 }}>{g.dpd}</td>
                    <td style={{ padding:"9px 12px" }}><Badge level={g.tier} /></td>
                  </tr>
                );
                if (multi && cifExp) {
                  g.loans.forEach((loan, li) => {
                    const lkey = `${g.cif}-${li}`;
                    const lExp = expandedLoan === lkey;
                    rows.push(
                      <tr key={lkey} onClick={()=>toggleLoan(lkey)} style={{ background:"#EFF6FF", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                        <td style={{ padding:"7px 12px 7px 22px", color:C.navy, fontWeight:500, fontSize:12 }}><span style={{ fontSize:10, color:C.gray, marginRight:6 }}>↳</span>Pinjaman {li+1}</td>
                        <td></td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12 }}>{loan.ukerNama}</td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12 }}>{loan.ao}</td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12 }}>{loan.segment}</td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12 }}>{loan.sektor}</td>
                        <td style={{ padding:"7px 12px", fontWeight:600, color:C.navy, fontSize:12, textAlign:"right" }}>{fJt(loan.osJt)}</td>
                        <td style={{ padding:"7px 12px", fontSize:12, color:C.textMd, textAlign:"center" }}>{loan.kol}</td>
                        <td style={{ padding:"7px 12px", textAlign:"center" }}>
                          {loan.flagRestruk === 'Y'
                            ? <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:C.amberLt, padding:"2px 6px", borderRadius:4 }}>Y</span>
                            : <span style={{ fontSize:10, color:C.gray }}>N</span>}
                        </td>
                        <td style={{ padding:"7px 12px", fontSize:12, color:loan.dpd>30?C.red:loan.dpd>0?C.amber:C.green, fontWeight:600, textAlign:"center" }}>{loan.dpd}</td>
                        <td style={{ padding:"7px 12px" }}><Badge level={loan.tier} /></td>
                      </tr>
                    );
                    if (lExp) rows.push(<BreakdownRow key={lkey+"-exp"} d={loan} colSpan={11} />);
                  });
                }
                if (!multi && expandedLoan === g.cif+"-0") {
                  rows.push(<BreakdownRow key={g.cif+"-exp"} d={g.loans[0]} colSpan={11} />);
                }
                return rows;
              })}
            </tbody>
          </table>
        </div>
        {sorted.length===0 && <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:14 }}>Tidak ada data</div>}
        {sorted.length>0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:C.gray }}>Menampilkan {(pg-1)*perPage+1}–{Math.min(pg*perPage,sorted.length)} dari {fNum(sorted.length)} nasabah</span>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:12, color:C.gray }}>Baris/hal:</span>
              <input type="text" inputMode="numeric" value={perPage} onChange={e=>{ const v=e.target.value.replace(/\D/g,""); setPerPage(Math.max(1, Math.min(1000, parseInt(v)||12))); setPage(1); }}
                style={{ width:56, padding:"4px 8px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12.5, color:C.text, textAlign:"right" }} />
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

function ActionPlan({ m, perms, list = [] }) {
  const w = useWindowWidth();
  const [dbPlans, setDbPlans] = useState([]);
  const [loadingAP, setLoadingAP] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ cif:"", nama:"", ao:"", aoId:"", kol:"", jenis:"Kunjungan", target:"", catatan:"" });
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const plans = dbPlans;

  useEffect(() => {
    fetchActionPlans().then(({ data }) => {
      setDbPlans((data || []).map(r => ({
        id: r.id, tgl: r.tgl, cif: r.cif || "-", nama: r.nama,
        ao: r.ao || "-", kol: r.kol || "-", jenis: r.jenis || "-",
        target: r.target || "-", status: r.status, hasil: r.hasil || "-",
      })));
    }).finally(() => setLoadingAP(false));
  }, []);

  const clearSug = () => { setSuggestions([]); setActiveField(null); };

  // Pool debitur sesuai RM/Mantri yang dipilih: pakai aoId bila dipilih dari saran,
  // selain itu cocokkan nama RM/Mantri yang diketik. Kalau RM/Mantri kosong → semua debitur.
  const debiturPool = () => {
    if (form.aoId) return list.filter(d=>d.aoId===form.aoId);
    const q = (form.ao||"").toLowerCase().trim();
    if (q) return list.filter(d=>(d.ao||"").toLowerCase().includes(q));
    return list;
  };

  const handleCifChange = (val) => {
    setForm(f=>({...f, cif:val}));
    const q = val.toLowerCase().trim();
    if (q.length >= 2) {
      const toks = q.split(/\s+/).filter(Boolean);
      setSuggestions(debiturPool().filter(d=>{ const c=d.cif.toLowerCase(), n=d.nama.toLowerCase(); return c.includes(q) || toks.every(tk=>n.includes(tk)); }).slice(0,8));
      setActiveField('cif');
    } else clearSug();
  };

  const handleNamaChange = (val) => {
    setForm(f=>({...f, nama:val}));
    const q = val.toLowerCase().trim();
    if (q.length >= 2) {
      const toks = q.split(/\s+/).filter(Boolean);
      setSuggestions(debiturPool().filter(d=>{ const n=d.nama.toLowerCase(); return toks.every(tk=>n.includes(tk)); }).slice(0,8));
      setActiveField('nama');
    } else clearSug();
  };

  const handleAoChange = (val) => {
    setForm(f=>({...f, ao:val, aoId:""})); // ketik manual → lepas kunci aoId terpilih
    if (val.length >= 2) {
      const q = val.toLowerCase();
      const seen = new Set();
      setSuggestions(list.filter(d=>{ if(seen.has(d.aoId)) return false; if(!d.ao.toLowerCase().includes(q)) return false; seen.add(d.aoId); return true; }).slice(0,8));
      setActiveField('ao');
    } else clearSug();
  };

  const selectSug = (d) => {
    if (activeField === 'ao') {
      // pilih RM/Mantri → kunci ke aoId-nya & kosongkan debitur agar mengikuti mantri ini
      setForm(f=>({...f, ao:d.ao, aoId:d.aoId, cif:"", nama:""}));
    } else {
      setForm(f=>({...f, cif:d.cif, nama:d.nama, ao:d.ao, aoId:d.aoId, kol:d.kol}));
    }
    clearSug();
  };

  const handleTambah = async () => {
    if (!form.nama || saving) return;
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await saveActionPlan({
      cif: form.cif || null, nama: form.nama,
      ao: form.ao || null, kol: form.kol,
      jenis: form.jenis, target: form.target || null,
      catatan: form.catatan || null, tgl: today,
    });
    setSaving(false);
    if (error) { alert('Gagal menyimpan: ' + error.message); return; }
    setDbPlans(prev => [{ id:data.id, tgl:data.tgl, cif:data.cif||"-", nama:data.nama, ao:data.ao||"-", kol:data.kol||"-", jenis:data.jenis||"-", target:data.target||"-", status:data.status, hasil:data.hasil||"-" }, ...prev]);
    setShowForm(false);
    setForm({ cif:"", nama:"", ao:"", aoId:"", kol:"", jenis:"Kunjungan", target:"", catatan:"" });
    clearSug();
  };
  // Isi/ubah "Hasil" (keterangan hasil tindak lanjut). Status WAJIB ikut dikirim
  // karena backend meng-UPDATE status & hasil sekaligus.
  const editHasil = async (p) => {
    const cur = p.hasil && p.hasil !== "-" ? p.hasil : "";
    const v = window.prompt(`Hasil tindak lanjut — ${p.nama}:`, cur);
    if (v === null) return; // batal
    const val = v.trim();
    const { data, error } = await updateActionPlan(p.id, { status: p.status, hasil: val || null });
    if (error) { alert("Gagal menyimpan hasil: " + error.message); return; }
    setDbPlans(prev => prev.map(x => x.id === p.id ? { ...x, hasil: (data?.hasil) || val || "-" } : x));
  };
  const inputS = { width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, background:C.white, color:C.text, boxSizing:"border-box" };
  const sugBox = { position:"absolute", top:"100%", left:0, right:0, zIndex:200, background:C.white, border:`1px solid ${C.border}`, borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.12)", marginTop:2, maxHeight:260, overflowY:"auto" };
  const sugRow = { padding:"8px 12px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, fontSize:12.5 };

  const [cariAP, setCariAP] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [filterJenis, setFilterJenis] = useState("Semua Jenis");
  const [filterKolAP, setFilterKolAP] = useState("Semua Kol");
  const [filterUkerAP, setFilterUkerAP] = useState("Semua Unit");
  const [pageAP, setPageAP] = useState(1);
  const perPageAP = 10;

  // Unit Kerja diturunkan dari debitur (cif → ukerNama), fallback lewat nama RM/Mantri
  const cifUker = useMemo(()=>{ const o={}; (list||[]).forEach(d=>{ if(d.cif && o[d.cif]===undefined) o[d.cif]=d.ukerNama; }); return o; }, [list]);
  const aoUker  = useMemo(()=>{ const o={}; (list||[]).forEach(d=>{ if(d.ao && o[d.ao]===undefined) o[d.ao]=d.ukerNama; }); return o; }, [list]);
  const ukerOf  = (p)=> shortUker(cifUker[p.cif] || aoUker[p.ao] || "");

  const jenisOptions = ["Semua Jenis", ...Array.from(new Set(plans.map(p=>p.jenis)))];
  const kolOptions   = ["Semua Kol",   ...Array.from(new Set(plans.map(p=>p.kol))).sort()];
  const ukerOptions  = ["Semua Unit",  ...Array.from(new Set(plans.map(p=>ukerOf(p)).filter(Boolean))).sort()];

  const filteredPlans = plans.filter(p=>{
    const okCari   = p.nama.toLowerCase().includes(cariAP.toLowerCase()) || p.cif?.includes(cariAP);
    const okStatus = filterStatus==="Semua Status" || (filterStatus==="In Progress"?p.status==="in_progress":p.status==="selesai");
    const okJenis  = filterJenis==="Semua Jenis"   || p.jenis===filterJenis;
    const okKol    = filterKolAP==="Semua Kol"     || p.kol===filterKolAP.replace("Kol ","");
    const okUker   = filterUkerAP==="Semua Unit"   || ukerOf(p)===filterUkerAP;
    return okCari && okStatus && okJenis && okKol && okUker;
  });
  const anyFilterAP = cariAP || filterStatus!=="Semua Status" || filterJenis!=="Semua Jenis" || filterKolAP!=="Semua Kol" || filterUkerAP!=="Semua Unit";
  const resetAP = ()=>{ setCariAP(""); setFilterStatus("Semua Status"); setFilterJenis("Semua Jenis"); setFilterKolAP("Semua Kol"); setFilterUkerAP("Semua Unit"); setPageAP(1); };
  const apNavyTh = (align="left")=>({ height:34, lineHeight:"34px", padding:"0 12px", background:`#${M_NAVY}`, color:"#fff", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:align, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.12)", position:"sticky", top:0, zIndex:5 });
  const apFiltTh = { padding:"5px 7px", background:C.grayLt, borderBottom:`1px solid ${C.border}`, position:"sticky", top:34, zIndex:5 };
  const apSel = { width:"100%", padding:"3px 4px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.textMd, cursor:"pointer", boxSizing:"border-box" };
  const apInp = { width:"100%", padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.text, boxSizing:"border-box" };
  const onFAP = (fn)=>(e)=>{ fn(e.target.value); setPageAP(1); };
  const totalPageAP = Math.max(1, Math.ceil(filteredPlans.length/perPageAP));
  const pgAP = Math.min(pageAP, totalPageAP);
  const shownPlans = filteredPlans.slice((pgAP-1)*perPageAP, pgAP*perPageAP);

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
            <div style={{ position:"relative" }}>
              <div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>CIF</div>
              <input value={form.cif} onChange={e=>handleCifChange(e.target.value)} onBlur={()=>setTimeout(clearSug,150)} placeholder={form.aoId||form.ao ? "Ketik CIF/nama debitur RM ini…" : "Ketik CIF atau nama..."} style={inputS} autoComplete="off" />
              {activeField==='cif' && suggestions.length>0 && (
                <div style={sugBox}>
                  {suggestions.map((d,i)=>(
                    <div key={i} style={sugRow} onMouseDown={()=>selectSug(d)} onMouseEnter={e=>e.currentTarget.style.background=C.navyLt} onMouseLeave={e=>e.currentTarget.style.background=C.white}>
                      <div style={{ fontWeight:600, color:C.text }}>{d.cif} <span style={{ fontSize:11, fontWeight:400, color:C.gray }}>· {d.kol}</span></div>
                      <div style={{ color:C.textMd }}>{d.nama}</div>
                      <div style={{ fontSize:11, color:C.gray }}>{d.ao} · {d.ukerNama}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position:"relative" }}>
              <div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Nama Debitur <span style={{ color:C.red }}>*</span></div>
              <input value={form.nama} onChange={e=>handleNamaChange(e.target.value)} onBlur={()=>setTimeout(clearSug,150)} placeholder={form.aoId||form.ao ? "Ketik nama debitur RM ini…" : "Ketik nama debitur..."} style={inputS} autoComplete="off" />
              {activeField==='nama' && suggestions.length>0 && (
                <div style={sugBox}>
                  {suggestions.map((d,i)=>(
                    <div key={i} style={sugRow} onMouseDown={()=>selectSug(d)} onMouseEnter={e=>e.currentTarget.style.background=C.navyLt} onMouseLeave={e=>e.currentTarget.style.background=C.white}>
                      <div style={{ fontWeight:600, color:C.text }}>{d.nama} <span style={{ fontSize:11, fontWeight:400, color:C.gray }}>· Kol {d.kol}</span></div>
                      <div style={{ fontSize:11, color:C.gray }}>CIF {d.cif} · {d.ao} · {d.ukerNama}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ position:"relative" }}>
              <div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>RM / Mantri</div>
              <input value={form.ao} onChange={e=>handleAoChange(e.target.value)} onBlur={()=>setTimeout(clearSug,150)} placeholder="Ketik nama RM / Mantri..." style={inputS} autoComplete="off" />
              {activeField==='ao' && suggestions.length>0 && (
                <div style={sugBox}>
                  {suggestions.map((d,i)=>(
                    <div key={i} style={sugRow} onMouseDown={()=>selectSug(d)} onMouseEnter={e=>e.currentTarget.style.background=C.navyLt} onMouseLeave={e=>e.currentTarget.style.background=C.white}>
                      <div style={{ fontWeight:600, color:C.text }}>{d.ao}</div>
                      <div style={{ fontSize:11, color:C.gray }}>{d.pn} · {d.ukerNama}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Kolektibilitas <span style={{ fontSize:10.5, color:C.gray, fontWeight:400 }}>(otomatis dari debitur)</span></div>
              <div style={{ ...inputS, background:C.grayLt, color: form.kol?C.text:C.gray, display:"flex", alignItems:"center", fontWeight: form.kol?600:400 }}>{form.kol ? `Kol ${form.kol}` : "— pilih debitur dulu —"}</div></div>
            <div><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Jenis Tindakan</div>
              <select value={form.jenis} onChange={e=>setForm({...form,jenis:e.target.value})} style={inputS}>{["Telepon Debitur","Kunjungan","Surat Peringatan 1","Restrukturisasi","Recovery"].map(j=><option key={j}>{j}</option>)}</select></div>
            <div><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Target Penyelesaian</div><input type="date" value={form.target} onChange={e=>setForm({...form,target:e.target.value})} style={inputS} /></div>
          </div>
          <div style={{ marginBottom:10 }}><div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>Catatan Tindak Lanjut</div><input value={form.catatan} onChange={e=>setForm({...form,catatan:e.target.value})} placeholder="Catatan tindak lanjut..." style={inputS} /></div>
          <button onClick={handleTambah} disabled={saving} style={{ padding:"8px 20px", background:saving?C.gray:C.navy, color:C.white, border:"none", borderRadius:7, cursor:saving?"not-allowed":"pointer", fontSize:13 }}>{saving?"Menyimpan...":"Simpan"}</button>
        </div>
      )}
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Daftar Action Plan</div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {anyFilterAP && <button onClick={resetAP} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Reset Filter</button>}
            <span style={{ fontSize:12.5, color:C.gray }}>{filteredPlans.length} action plan</span>
          </div>
        </div>
        {loadingAP ? (
          <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:14 }}>Memuat data...</div>
        ) : (
        <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"58vh" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
            <colgroup>{[92,150,130,130,52,150,92,180,108,72].map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
            <thead>
              <tr>
                <th style={apNavyTh()}>Tanggal</th>
                <th style={apNavyTh()}>Nama Debitur</th>
                <th style={apNavyTh()}>Unit Kerja</th>
                <th style={apNavyTh()}>RM/Mantri</th>
                <th style={apNavyTh("center")}>Kol</th>
                <th style={apNavyTh()}>Jenis Tindakan</th>
                <th style={apNavyTh()}>Target</th>
                <th style={apNavyTh()}>Hasil</th>
                <th style={apNavyTh("center")}>Status</th>
                <th style={apNavyTh("center")}></th>
              </tr>
              <tr>
                <th style={apFiltTh}></th>
                <th style={apFiltTh}><input value={cariAP} onChange={onFAP(setCariAP)} placeholder="Cari nama/CIF…" style={apInp} /></th>
                <th style={apFiltTh}><select value={filterUkerAP} onChange={onFAP(setFilterUkerAP)} style={apSel}>{ukerOptions.map(u=><option key={u}>{u}</option>)}</select></th>
                <th style={apFiltTh}></th>
                <th style={apFiltTh}><select value={filterKolAP} onChange={onFAP(setFilterKolAP)} style={apSel}>{kolOptions.map(k=><option key={k} value={k}>{k==="Semua Kol"?k:"Kol "+k}</option>)}</select></th>
                <th style={apFiltTh}><select value={filterJenis} onChange={onFAP(setFilterJenis)} style={apSel}>{jenisOptions.map(j=><option key={j}>{j}</option>)}</select></th>
                <th style={apFiltTh}></th>
                <th style={apFiltTh}></th>
                <th style={apFiltTh}><select value={filterStatus} onChange={onFAP(setFilterStatus)} style={apSel}>{["Semua Status","In Progress","Selesai"].map(s=><option key={s}>{s}</option>)}</select></th>
                <th style={apFiltTh}></th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.length===0
                ? <tr><td colSpan={10} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Tidak ada data</td></tr>
                : shownPlans.map((p,ri)=>(
                  <tr key={p.id} style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6` }}>
                    <td style={{ padding:"9px 12px", color:C.textMd, whiteSpace:"nowrap" }}>{p.tgl}</td>
                    <td style={{ padding:"9px 12px", color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.nama}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ukerOf(p) || "-"}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.ao}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"center", fontWeight:600 }}>{p.kol}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd }}>{p.jenis}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, whiteSpace:"nowrap" }}>{p.target}</td>
                    <td style={{ padding:"9px 12px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {perms?.editAction
                        ? <span onClick={()=>editHasil(p)} title="Klik untuk isi/ubah hasil" style={{ cursor:"pointer", color:(p.hasil&&p.hasil!=="-")?C.textMd:C.navy, borderBottom:`1px dashed ${C.border}`, fontWeight:(p.hasil&&p.hasil!=="-")?400:600 }}>{p.hasil&&p.hasil!=="-" ? p.hasil : "+ isi hasil"}</span>
                        : (p.hasil || "-")}
                    </td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>
                      <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:p.status==="selesai"?C.greenLt:C.amberLt, color:p.status==="selesai"?C.green:C.amber, fontSize:11.5, fontWeight:600 }}>{statusLabel[p.status]}</span>
                    </td>
                    <td style={{ padding:"9px 8px", textAlign:"center" }}>
                      <div style={{ display:"flex", gap:4, justifyContent:"center" }}>
                        {p.status==="in_progress" && perms?.editAction && (
                          <button title="Tandai Selesai" onClick={async()=>{
                            const cur = p.hasil && p.hasil!=="-" ? p.hasil : "";
                            const v = window.prompt(`Tandai SELESAI — isi hasil tindak lanjut untuk ${p.nama}:`, cur);
                            if (v===null) return; // batal → status tidak diubah
                            const val = v.trim();
                            const { data, error } = await updateActionPlan(p.id, { status:"selesai", hasil: val || null });
                            if (error) { alert("Gagal: " + error.message); return; }
                            setDbPlans(prev=>prev.map(x=>x.id===p.id?{...x,status:"selesai",hasil:(data?.hasil)||val||"-"}:x));
                          }} style={{ padding:"2px 8px", fontSize:11, background:C.greenLt, color:C.green, border:`1px solid ${C.green}`, borderRadius:4, cursor:"pointer" }}>✓</button>
                        )}
                        {perms?.editAction && (
                          <button title="Hapus" onClick={async()=>{
                            if(!window.confirm(`Hapus action plan "${p.nama}"?`)) return;
                            const { error } = await deleteActionPlan(p.id);
                            if (!error) setDbPlans(prev=>prev.filter(x=>x.id!==p.id));
                          }} style={{ padding:"2px 8px", fontSize:11, background:C.redLt, color:C.red, border:`1px solid ${C.red}`, borderRadius:4, cursor:"pointer" }}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        )}
        {filteredPlans.length>0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:C.gray }}>Menampilkan {(pgAP-1)*perPageAP+1}–{Math.min(pgAP*perPageAP,filteredPlans.length)} dari {filteredPlans.length}</span>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <button onClick={()=>setPageAP(p=>Math.max(1,p-1))} disabled={pgAP<=1} style={pgBtn(pgAP<=1)}>‹ Prev</button>
              <span style={{ fontSize:12.5, color:C.textMd }}>Hal {pgAP} / {totalPageAP}</span>
              <button onClick={()=>setPageAP(p=>Math.min(totalPageAP,p+1))} disabled={pgAP>=totalPageAP} style={pgBtn(pgAP>=totalPageAP)}>Next ›</button>
            </div>
          </div>
        )}
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

function KinerjaAO({ m, list, plans, goKinerjaDebitur }) {
  const w = useWindowWidth();
  const [cari, setCari]     = useState("");
  const [unitF, setUnitF]   = useState("semua");
  const [sortBy, setSortBy] = useState("default"); // default(OS desc) | os-* | deb-* | tinggi-* | action-* | berhasil-*

  // Action Plan & Berhasil dari tabel action_plans ASLI (gabung via cif → aoId mantri)
  const rows = useMemo(()=>{
    const cifToAo = {};
    (list||[]).forEach(d=>{ if(d.cif && cifToAo[d.cif]===undefined) cifToAo[d.cif] = d.aoId ?? null; }); // samakan dgn aoId mentah di perAO
    const tally = {}; // aoId -> { total, selesai }
    (plans||[]).forEach(p=>{
      const ao = cifToAo[p.cif];
      if (ao===undefined) return; // plan utk debitur di luar data periode ini → diabaikan
      if (!tally[ao]) tally[ao] = { total:0, selesai:0 };
      tally[ao].total += 1;
      if (p.status==="selesai") tally[ao].selesai += 1;
    });
    return m.perAO.map(k=>{ const t = tally[k.aoId] || { total:0, selesai:0 }; return { ...k, apTotal:t.total, apSelesai:t.selesai }; });
  }, [m.perAO, list, plans]);

  const unitOpts = useMemo(()=>[...new Set(rows.map(k=>k.uker).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(()=>{
    let arr = rows.filter(k=>{
      const okCari = !cari || (k.nama||"").toLowerCase().includes(cari.toLowerCase()) || (k.pn||"").toLowerCase().includes(cari.toLowerCase());
      const okUnit = unitF==="semua" || k.uker===unitF;
      return okCari && okUnit;
    });
    const [col,dir] = sortBy.split("-");
    const keyMap = { os:"osJt", deb:"deb", tinggi:"tinggi", action:"apTotal", berhasil:"apSelesai" };
    const kk = keyMap[col];
    // Selalu group by UKER (KANCA → KCP → Unit), lalu sort kolom di dalam tiap grup
    const rankMap = {}; UKER.forEach((u,i)=>{ rankMap[u.kode]=i; });
    arr = [...arr].sort((a,b)=>{
      const ra=rankMap[a.kodeUker]??999, rb=rankMap[b.kodeUker]??999;
      if (ra !== rb) return ra - rb;
      if (kk) return dir==="asc" ? a[kk]-b[kk] : b[kk]-a[kk];
      return b.osJt - a.osJt; // default within-group: OS terbesar
    });
    return arr;
  }, [rows, cari, unitF, sortBy]);

  const goMantri = (k)=>{ if(k && goKinerjaDebitur) goKinerjaDebitur({ uker:k.kodeUker, aoId:k.aoId }); };

  // Style header tabel ala Excel
  const navyTh = (align="left")=>({ height:34, lineHeight:"34px", padding:"0 12px", background:`#${M_NAVY}`, color:"#fff", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:align, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.12)", userSelect:"none", position:"sticky", top:0, zIndex:5 });
  const filtTh = { padding:"5px 7px", background:C.grayLt, borderBottom:`1px solid ${C.border}`, position:"sticky", top:34, zIndex:5 };
  const hSel = { width:"100%", padding:"3px 4px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.textMd, cursor:"pointer", boxSizing:"border-box" };
  const hInp = { width:"100%", padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.text, boxSizing:"border-box" };
  const sortOpts = [{ value:"",label:"Default" },{ value:"desc",label:"Terbesar" },{ value:"asc",label:"Terkecil" }];
  const colVal = (tok)=>{ const [c,d]=sortBy.split("-"); return c===tok?d:""; };
  const setColSort = (tok)=>(e)=>{ const v=e.target.value; setSortBy(v?`${tok}-${v}`:"default"); };
  const anyFilter = cari || unitF!=="semua" || sortBy!=="default";
  const resetF = ()=>{ setCari(""); setUnitF("semua"); setSortBy("default"); };

  // Kolom + ekspor
  const aoCols = [
    { key:"nama",     label:"RM/Mantri",        align:"left",  type:"text", get:k=>k.nama||"-" },
    { key:"pn",       label:"PN",               align:"left",  type:"text", get:k=>k.pn||"-" },
    { key:"uker",     label:"Unit Kerja",       align:"left",  type:"text", get:k=>shortUker(k.uker)||"-" },
    { key:"osJt",     label:"Outstanding (Jt)", align:"right", type:"num",  get:k=>Math.trunc(k.osJt) },
    { key:"deb",      label:"Jml Debitur",      align:"right", type:"num",  get:k=>k.deb },
    { key:"tinggi",   label:"Risiko Tinggi",    align:"right", type:"num",  get:k=>k.tinggi },
    { key:"action",   label:"Action Plan",      align:"right", type:"num",  get:k=>k.apTotal },
    { key:"berhasil", label:"Berhasil",         align:"right", type:"num",  get:k=>k.apSelesai },
  ];
  const aoFile = (ext)=>`Kinerja_RM_Mantri_${new Date().toISOString().slice(0,10)}.${ext}`;
  const aoExportExcel = () => {
    const cols=aoCols, nC=cols.length;
    const aoa=[ ["Rekap Kinerja per RM/Mantri — BO Polewali"], [`Periode ${m.P.date} · ${filtered.length} RM/Mantri`], [], cols.map(c=>c.label), ...filtered.map(k=>cols.map(c=>c.get(k))) ];
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"]=cols.map(c=>({ wch: c.key==="nama"?22 : c.key==="uker"?20 : c.key==="pn"?12 : 14 }));
    ws["!merges"]=[{s:{r:0,c:0},e:{r:0,c:nC-1}},{s:{r:1,c:0},e:{r:1,c:nC-1}}];
    const thin=(rgb)=>({style:"thin",color:{rgb}});
    const border={top:thin("E5E7EB"),bottom:thin("E5E7EB"),left:thin("E5E7EB"),right:thin("E5E7EB")};
    if(ws["A1"]) ws["A1"].s={font:{bold:true,sz:13,color:{rgb:"1B2A6E"}}};
    if(ws["A2"]) ws["A2"].s={font:{sz:10,color:{rgb:"6B7280"}}};
    const hR=3;
    for(let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r:hR,c}); if(ws[a]) ws[a].s={fill:{patternType:"solid",fgColor:{rgb:M_NAVY}},font:{bold:true,color:{rgb:"FFFFFF"},sz:10},alignment:{horizontal:"center",vertical:"center",wrapText:true},border}; }
    filtered.forEach((k,ri)=>{
      const bg = ri%2?"F4F7FB":"FFFFFF";
      for(let c=0;c<nC;c++){ const col=cols[c]; const ad=XLSX.utils.encode_cell({r:hR+1+ri,c}); if(!ws[ad]) continue;
        const st={fill:{patternType:"solid",fgColor:{rgb:bg}},font:{sz:10,color:{rgb:"344054"}},alignment:{horizontal:col.align,vertical:"center"},border};
        if(col.key==="tinggi" && k.tinggi>0){ st.font.color={rgb:"B91C1C"}; st.font.bold=true; }
        ws[ad].s=st;
        if(col.type==="num") ws[ad].z='#,##0';
      }
    });
    ws["!rows"]=[{hpt:20},{hpt:14},{hpt:6},{hpt:22}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Kinerja RM-Mantri");
    XLSX.writeFile(wb, aoFile("xlsx"));
  };
  const aoExportPDF = () => {
    const doc=new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    const pw=doc.internal.pageSize.getWidth();
    doc.setFontSize(13); doc.setTextColor(15,42,80); doc.text("Rekap Kinerja per RM/Mantri — BO Polewali", 40, 40);
    doc.setFontSize(9); doc.setTextColor(120,120,120); doc.text(`Periode ${m.P.date} · ${filtered.length} RM/Mantri`, 40, 56);
    autoTable(doc, {
      startY:72,
      head:[aoCols.map(c=>c.label)],
      body: filtered.map(k=>aoCols.map(c=> c.type==="num" ? Number(c.get(k)).toLocaleString("en-US") : String(c.get(k)))),
      styles:{ fontSize:9, cellPadding:5, lineColor:[229,231,235], lineWidth:0.5, valign:"middle" },
      headStyles:{ fillColor:hexRGB(M_NAVY), textColor:255, fontStyle:"bold", halign:"center" },
      alternateRowStyles:{ fillColor:[244,247,251] },
      columnStyles: Object.fromEntries(aoCols.map((c,i)=>[i,{ halign:c.align }])),
      margin:{ left:40, right:40 }, showHead:"everyPage",
      didParseCell:(d)=>{ if(d.section!=="body") return; const col=aoCols[d.column.index]; if(col.key==="tinggi"){ const k=filtered[d.row.index]; if(k&&k.tinggi>0){ d.cell.styles.textColor=hexRGB("B91C1C"); d.cell.styles.fontStyle="bold"; } } },
      didDrawCell:(d)=>{ // garis pemisah navy antar unit (selalu aktif karena selalu group by UKER)
        if(d.section!=="body") return;
        const i=d.row.index;
        if(i<=0 || filtered[i]?.kodeUker===filtered[i-1]?.kodeUker) return;
        const navy=hexRGB(M_NAVY);
        doc.setDrawColor(navy[0],navy[1],navy[2]); doc.setLineWidth(1.5);
        doc.line(d.cell.x, d.cell.y, d.cell.x+d.cell.width, d.cell.y);
      },
    });
    const barOs  = m.perAO.slice(0,10).map(k=>({ label:k.nama, value:k.osJt/1000 }));
    const barRsk = [...m.perAO].sort((a,b)=>b.tinggi-a.tinggi).slice(0,10).map(k=>({ label:k.nama, value:k.tinggi }));
    doc.addPage();
    doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(15,42,80);
    doc.text("Grafik Kinerja RM/Mantri — BO Polewali", 40, 40);
    doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text(`Periode ${m.P.date}`, 40, 55);
    const colW=(pw-80-20)/2;
    drawBarsPDF(doc, { x:40,         y:88, w:colW, h:440, title:"Top 10 RM/Mantri — Outstanding (Rp M)",   rows:barOs,  valFmt:v=>fR(v),                colorHex:"0D9488" });
    drawBarsPDF(doc, { x:40+colW+20, y:88, w:colW, h:440, title:"Top 10 RM/Mantri — Debitur Risiko Tinggi", rows:barRsk, valFmt:v=>String(Math.round(v)), colorHex:"DC2626" });
    doc.save(aoFile("pdf"));
  };

  const onBar = (entry)=>{ if(!entry) return; const k=m.perAO.find(x=>x.nama===entry.nama && x.pn===entry.pn) || entry; goMantri(k); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Tabel dulu (atas) */}
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Rekap Kinerja per RM/Mantri</div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {anyFilter && <button onClick={resetF} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Reset Filter</button>}
            <span style={{ fontSize:12.5, color:C.gray, marginRight:2 }}>{fNum(filtered.length)} RM/Mantri</span>
            <button onClick={aoExportExcel} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiGreen, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> Excel</button>
            <button onClick={aoExportPDF}   style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiRed, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> PDF</button>
          </div>
        </div>
        <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"64vh" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
            <colgroup>{[150,92,150,120,90,100,100,90].map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
            <thead>
              <tr>
                <th style={navyTh()}>RM/Mantri</th>
                <th style={navyTh()}>PN</th>
                <th style={navyTh()}>Unit Kerja</th>
                <th style={navyTh("right")}>Outstanding</th>
                <th style={navyTh("right")}>Jml Debitur</th>
                <th style={navyTh("right")}>Risiko Tinggi</th>
                <th style={navyTh("right")}>Action Plan</th>
                <th style={navyTh("right")}>Berhasil</th>
              </tr>
              <tr>
                <th style={filtTh}><input value={cari} onChange={e=>setCari(e.target.value)} placeholder="Cari nama/PN…" style={hInp} /></th>
                <th style={filtTh}></th>
                <th style={filtTh}><select value={unitF} onChange={e=>setUnitF(e.target.value)} style={hSel}><option value="semua">Semua Unit</option>{unitOpts.map(u=><option key={u} value={u}>{shortUker(u)}</option>)}</select></th>
                <th style={filtTh}><select value={colVal("os")}       onChange={setColSort("os")}       style={hSel}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={colVal("deb")}      onChange={setColSort("deb")}      style={hSel}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={colVal("tinggi")}   onChange={setColSort("tinggi")}   style={hSel}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={colVal("action")}   onChange={setColSort("action")}   style={hSel}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={colVal("berhasil")} onChange={setColSort("berhasil")} style={hSel}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0
                ? <tr><td colSpan={8} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Tidak ada RM/Mantri sesuai filter.</td></tr>
                : filtered.map((k,ri)=>{
                    const clickable = !!goKinerjaDebitur;
                    // Garis pemisah antar unit (selalu aktif karena grup selalu per UKER)
                    const newGroup = ri>0 && filtered[ri-1]?.kodeUker !== k.kodeUker;
                    return (
                    <tr key={(k.aoId||k.nama)+ri} onClick={clickable?()=>goMantri(k):undefined}
                      style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, borderTop: newGroup?`2px solid ${C.navy}`:undefined, cursor:clickable?"pointer":"default" }}
                      onMouseEnter={clickable?(e=>e.currentTarget.style.filter="brightness(0.97)"):undefined}
                      onMouseLeave={clickable?(e=>e.currentTarget.style.filter="none"):undefined}>
                      <td style={{ padding:"9px 12px", color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{k.nama}</td>
                      <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11.5, color:C.navy }}>{k.pn||"—"}</td>
                      <td style={{ padding:"9px 12px", color:C.textMd, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{shortUker(k.uker)}</td>
                      <td style={{ padding:"9px 12px", color:C.textMd, fontWeight:500, textAlign:"right" }}>{fJt(k.osJt)}</td>
                      <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"right" }}>{fNum(k.deb)}</td>
                      <td style={{ padding:"9px 12px", color:k.tinggi>0?C.red:C.gray, fontWeight:600, textAlign:"right" }}>{k.tinggi}</td>
                      <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"right" }}>{k.apTotal}</td>
                      <td style={{ padding:"9px 12px", color:k.apSelesai>0?C.green:C.gray, fontWeight:600, textAlign:"right" }}>{k.apSelesai}</td>
                    </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grafik di bawah tabel — bar bisa diklik */}
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>Top 10 RM/Mantri — Outstanding</CardTitle>
          <BarH data={m.perAO.slice(0,10)} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)} onBarClick={onBar} />
        </div>
        <div style={card}>
          <CardTitle>Top 10 RM/Mantri — Debitur Risiko Tinggi</CardTitle>
          <BarH data={[...m.perAO].sort((a,b)=>b.tinggi-a.tinggi).slice(0,10)} dataKey="tinggi" nameKey="nama" color={C.kpiRed} fmt={(v)=>fNum(v)} onBarClick={onBar} />
        </div>
      </div>
    </div>
  );
}

function KinerjaUnit({ m, list, preset }) {
  const w = useWindowWidth();
  const f = m.P.f;

  // Navigation
  const [selUker, setSelUker] = useState(null);
  const [selAO,   setSelAO]   = useState(null);
  const appliedPresetRef = useRef(null); // anti re-apply preset yang sama
  const keepExpandRef    = useRef(false); // pertahankan breakdown saat deep-link
  const autoPageCifRef   = useRef(null);  // lompat ke halaman berisi debitur deep-link

  // Level-0 sort
  const [unitSort, setUnitSort] = useState("default");

  // Level-1 sort + filter (mantri) — filter ala Excel di header
  const [mantriCari,        setMantriCari]        = useState("");
  const [mantriSort,        setMantriSort]        = useState("nama"); // nama | os-desc | os-asc | npl-desc | npl-asc
  const [mantriKolFilter,   setMantriKolFilter]   = useState("semua");

  // Level-2 filter / sort / page / expand
  const [debCari,       setDebCari]       = useState("");
  const [debSektorF,    setDebSektorF]    = useState("semua");
  const [kolFilter,     setKolFilter]     = useState("semua");
  const [risikoFilter,  setRisikoFilter]  = useState("semua");
  const [restrukFilter, setRestrukFilter] = useState("semua");
  const [debSortBy,     setDebSortBy]     = useState("default"); // default | os-desc | os-asc | dpd-desc | dpd-asc
  const [debPage,      setDebPage]      = useState(1);
  const [debPerPage,   setDebPerPage]   = useState(20);
  const [expandedCif,  setExpandedCif]  = useState(null);

  // Reset filters when navigating between levels
  useEffect(() => {
    setDebCari(""); setDebSektorF("semua"); setKolFilter("semua"); setRisikoFilter("semua"); setRestrukFilter("semua"); setDebSortBy("default"); setDebPage(1);
    setMantriCari(""); setMantriSort("nama"); setMantriKolFilter("semua");
    // Jangan nol-kan breakdown bila navigasi ini dipicu deep-link (preset).
    if (keepExpandRef.current) keepExpandRef.current = false;
    else setExpandedCif(null);
  }, [selUker, selAO]);

  // Deep-link dari Dashboard / Kinerja RM-Mantri: buka unit → mantri (→ debitur dgn breakdown bila ada cif).
  // Effect ini SETELAH reset di atas agar expandedCif tidak ikut ter-reset.
  useEffect(() => {
    if (!preset || !preset.uker) return;
    const key = `${preset.uker}|${preset.aoId}|${preset.cif||''}`;
    if (appliedPresetRef.current === key) return;
    appliedPresetRef.current = key;
    const u = m.perUker.find(x => x.kode === preset.uker);
    if (!u) return;
    keepExpandRef.current = true;
    autoPageCifRef.current = preset.cif || null;
    setSelUker(u);
    setSelAO(preset.aoId || "__none__");
    setExpandedCif(preset.cif || null);
  }, [preset, m.perUker]);

  // Level-1: mantri list computation
  const mantriList = useMemo(() => {
    if (!selUker) return [];
    const items = list.filter(d => d.uker === selUker.kode);
    const map = {};
    items.forEach(d => {
      const key = d.aoId || "__none__";
      if (!map[key]) map[key] = { key, aoId:d.aoId||null, nama:d.aoId?(d.ao||"—"):"Tanpa RM/Mantri", pn:d.pn||"", items:[] };
      map[key].items.push(d);
    });
    return Object.values(map).map(g => {
      const os  = g.items.reduce((s,d)=>s+d.osJt*f,0);
      const osT = g.items.filter(d=>d.tier==="tinggi").reduce((s,d)=>s+d.osJt*f,0);
      return { ...g, deb:g.items.length, osJt:os,
        ckpn:g.items.reduce((s,d)=>s+d.osJt*COV[d.kol]*f,0),
        tinggi:g.items.filter(d=>d.tier==="tinggi").length,
        sedang:g.items.filter(d=>d.tier==="sedang").length,
        npl: os ? osT/os*100 : 0 };
    }).sort((a,b)=>b.osJt-a.osJt);
  }, [selUker, list, f]);

  // Level-1: filtered + sorted mantri
  const sortedMantri = useMemo(() => {
    let items = [...mantriList];
    if (mantriCari) items = items.filter(a => a.nama.toLowerCase().includes(mantriCari.toLowerCase()) || (a.pn||"").toLowerCase().includes(mantriCari.toLowerCase()));
    if (mantriKolFilter !== "semua") items = items.filter(a => a.items.some(d => d.kol === mantriKolFilter));
    if (mantriSort === "os-desc")   return items.sort((a,b)=>b.osJt-a.osJt);
    if (mantriSort === "os-asc")    return items.sort((a,b)=>a.osJt-b.osJt);
    if (mantriSort === "deb-desc")  return items.sort((a,b)=>b.deb-a.deb);
    if (mantriSort === "deb-asc")   return items.sort((a,b)=>a.deb-b.deb);
    if (mantriSort === "npl-desc")  return items.sort((a,b)=>b.npl-a.npl);
    if (mantriSort === "npl-asc")   return items.sort((a,b)=>a.npl-b.npl);
    if (mantriSort === "ckpn-desc") return items.sort((a,b)=>b.ckpn-a.ckpn);
    if (mantriSort === "ckpn-asc")  return items.sort((a,b)=>a.ckpn-b.ckpn);
    return items.sort((a,b)=>a.nama.localeCompare(b.nama, "id"));  // "nama" = A-Z (default)
  }, [mantriList, mantriSort, mantriKolFilter, mantriCari]);

  // Level-2: raw items for selected ao (default urut OS terbesar)
  const aoItems = useMemo(() => {
    if (!selUker || selAO===null) return [];
    const items = list.filter(d => d.uker === selUker.kode);
    const f2 = selAO === "__none__" ? items.filter(d=>!d.aoId) : items.filter(d=>d.aoId===selAO);
    return [...f2].sort((a,b)=>b.osJt-a.osJt);
  }, [selUker, selAO, list]);

  const sektorListLvl2 = useMemo(()=>[...new Set(aoItems.map(d=>d.sektor).filter(Boolean))].sort(), [aoItems]);

  // Level-2: filtered + sorted debitur
  const filteredDebitur = useMemo(() => {
    let items = [...aoItems];
    if (debCari) items = items.filter(d => d.nama.toLowerCase().includes(debCari.toLowerCase()) || (d.cif||"").toLowerCase().includes(debCari.toLowerCase()));
    if (debSektorF    !== "semua") items = items.filter(d => d.sektor === debSektorF);
    if (kolFilter     !== "semua") items = items.filter(d => d.kol === kolFilter);
    if (risikoFilter  !== "semua") items = items.filter(d => risikoLabel[d.tier] === risikoFilter);
    if (restrukFilter !== "semua") items = items.filter(d => (d.flagRestruk || 'N') === restrukFilter);
    if      (debSortBy === "os-desc")  items.sort((a,b)=>b.osJt-a.osJt);
    else if (debSortBy === "os-asc")   items.sort((a,b)=>a.osJt-b.osJt);
    else if (debSortBy === "dpd-desc") items.sort((a,b)=>b.dpd-a.dpd);
    else if (debSortBy === "dpd-asc")  items.sort((a,b)=>a.dpd-b.dpd);
    return items; // default: urutan aoItems (OS terbesar)
  }, [aoItems, debCari, debSektorF, kolFilter, risikoFilter, restrukFilter, debSortBy]);

  // Deep-link: lompat ke halaman yang memuat debitur target (sekali, lalu ref dibersihkan)
  useEffect(() => {
    const cif = autoPageCifRef.current;
    if (!cif || selAO === null) return;
    const idx = filteredDebitur.findIndex(d => d.cif === cif);
    if (idx >= 0) setDebPage(Math.floor(idx / debPerPage) + 1);
    autoPageCifRef.current = null;
  }, [filteredDebitur, selAO, debPerPage]);

  // Level-0: sorted units for table (bar charts stay OS/NPL order as-is)
  const sortedUker = useMemo(() => {
    const arr = [...m.perUker];
    const [col, dir] = unitSort.split("-");
    if (col === "nama") return arr.sort((a,b)=> dir==="desc" ? b.nama.localeCompare(a.nama,"id") : a.nama.localeCompare(b.nama,"id"));
    const keyMap = { os:"osJt", deb:"deb", npl:"npl", ckpn:"ckpn", rec:"recovery" };
    const k = keyMap[col];
    if (k) return arr.sort((a,b)=> dir==="asc" ? (a[k]-b[k]) : (b[k]-a[k]));
    return arr;  // "default" = urutan UKER (KANCA → KCP → Unit)
  }, [m.perUker, unitSort]);

  const aoObj    = selAO !== null ? mantriList.find(a=>a.key===selAO) : null;
  const totalPg  = Math.max(1, Math.ceil(filteredDebitur.length / debPerPage));
  const curPg    = Math.min(debPage, totalPg);
  const paged    = filteredDebitur.slice((curPg-1)*debPerPage, curPg*debPerPage);

  // ── Style header tabel ala Excel (navy + baris filter sticky) ──
  const navyTh = (align="left")=>({ height:34, lineHeight:"34px", padding:"0 12px", background:`#${M_NAVY}`, color:"#fff", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:align, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.12)", userSelect:"none", position:"sticky", top:0, zIndex:5 });
  const filtTh = { padding:"5px 7px", background:C.grayLt, borderBottom:`1px solid ${C.border}`, position:"sticky", top:34, zIndex:5 };
  const hSelSt = { width:"100%", padding:"3px 4px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.textMd, cursor:"pointer", boxSizing:"border-box" };
  const hInpSt = { width:"100%", padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.text, boxSizing:"border-box" };
  const sortOpts3 = [{ value:"",label:"Default" },{ value:"desc",label:"Terbesar" },{ value:"asc",label:"Terkecil" }];
  // Level-2: sort kolom Outstanding/DPD + reset
  const onDF = (fn)=>(e)=>{ fn(e.target.value); setDebPage(1); };
  const osSort  = debSortBy==="os-desc"?"desc":debSortBy==="os-asc"?"asc":"";
  const dpdSort = debSortBy==="dpd-desc"?"desc":debSortBy==="dpd-asc"?"asc":"";
  const setColSort = (col)=>(e)=>{ const v=e.target.value; setDebSortBy(v?`${col}-${v}`:"default"); setDebPage(1); };
  const anyDebFilter = debCari || debSektorF!=="semua" || kolFilter!=="semua" || risikoFilter!=="semua" || restrukFilter!=="semua" || debSortBy!=="default";
  const resetDebFilters = ()=>{ setDebCari(""); setDebSektorF("semua"); setKolFilter("semua"); setRisikoFilter("semua"); setRestrukFilter("semua"); setDebSortBy("default"); setDebPage(1); };
  // Level-1: sort kolom Outstanding/NPL + reset
  const mOsSort   = mantriSort==="os-desc"?"desc":mantriSort==="os-asc"?"asc":"";
  const mDebSort  = mantriSort==="deb-desc"?"desc":mantriSort==="deb-asc"?"asc":"";
  const mNplSort  = mantriSort==="npl-desc"?"desc":mantriSort==="npl-asc"?"asc":"";
  const mCkpnSort = mantriSort==="ckpn-desc"?"desc":mantriSort==="ckpn-asc"?"asc":"";
  const setMSort = (col)=>(e)=>{ const v=e.target.value; setMantriSort(v?`${col}-${v}`:"nama"); };
  const anyMantriFilter = mantriCari || mantriKolFilter!=="semua" || mantriSort!=="nama";
  const resetMantriFilters = ()=>{ setMantriCari(""); setMantriKolFilter("semua"); setMantriSort("nama"); };
  // Level-0: sort kolom rekap unit (Unit Kerja / OS / Debitur / NPL / CKPN / Recovery)
  const ukColTok    = { nama:"nama", osJt:"os", deb:"deb", npl:"npl", ckpn:"ckpn", recovery:"rec" };
  const colSortVal  = (tok)=>{ const [c,d]=unitSort.split("-"); return c===tok ? d : ""; };
  const setUkSort   = (tok)=>(e)=>{ const v=e.target.value; setUnitSort(v?`${tok}-${v}`:"default"); };

  // ── Helpers ──
  const kol3bg  = { "1":C.greenLt,"2A":C.amberLt,"2B":"#FFF3CD","3":C.redLt,"4":"#FFD6CC","5":"#F7C5C0" };
  const kol3fg  = { "1":C.green,"2A":C.amber,"2B":"#856404","3":C.red,"4":"#C0392B","5":"#922B21" };
  const KolBadge = ({k}) => <span style={{ padding:"2px 8px", borderRadius:20, background:kol3bg[k]||C.grayLt, color:kol3fg[k]||C.gray, fontSize:11.5, fontWeight:700 }}>Kol {k}</span>;
  const nplColor = (v) => v>5?C.red:v>4?C.amber:C.green;
  const nplHex   = (v) => v>5?"B91C1C":v>4?"B45309":"15803D";

  // Kolom tabel Rekap Kinerja per Unit Kerja (dipakai render + ekspor)
  const ukCols = [
    { key:"nama",     label:"Unit Kerja",        align:"left",  type:"text", get:u=>u.nama,            render:u=>u.nama },
    { key:"osJt",     label:"Outstanding (Jt)",  align:"right", type:"num",  get:u=>Math.trunc(u.osJt), render:u=>fJt(u.osJt) },
    { key:"deb",      label:"Debitur",           align:"right", type:"num",  get:u=>u.deb,             render:u=>fNum(u.deb) },
    { key:"npl",      label:"NPL Ratio (%)",     align:"right", type:"pct",  get:u=>+u.npl.toFixed(2), render:u=>fPct(u.npl,1) },
    { key:"ckpn",     label:"CKPN (Jt)",         align:"right", type:"num",  get:u=>Math.trunc(u.ckpn), render:u=>fJt(u.ckpn) },
    { key:"recovery", label:"Recovery Rate (%)", align:"right", type:"pct",  get:u=>u.recovery,        render:u=>u.recovery+"%" },
  ];
  const ukExportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([ukCols.map(c=>c.label), ...sortedUker.map(u=>ukCols.map(c=>c.get(u)))]);
    ws["!cols"] = ukCols.map(c=>({ wch: c.key==="nama"?24:16 }));
    ws["!rows"] = [{ hpt:22 }];
    const thin=(rgb)=>({ style:"thin", color:{ rgb } });
    const border={ top:thin("E5E7EB"), bottom:thin("E5E7EB"), left:thin("E5E7EB"), right:thin("E5E7EB") };
    const nC=ukCols.length;
    for(let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r:0,c}); if(ws[a]) ws[a].s={ fill:{patternType:"solid",fgColor:{rgb:M_NAVY}}, font:{bold:true,color:{rgb:"FFFFFF"},sz:10}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border }; }
    sortedUker.forEach((u,ri)=>{
      const bg = ri%2 ? "F4F7FB" : "FFFFFF";
      for(let c=0;c<nC;c++){ const col=ukCols[c]; const a=XLSX.utils.encode_cell({r:ri+1,c}); if(!ws[a]) continue;
        const st={ fill:{patternType:"solid",fgColor:{rgb:bg}}, font:{sz:10,color:{rgb:"344054"}}, alignment:{horizontal:col.align,vertical:"center"}, border };
        if(col.key==="npl"){ st.font.color={rgb:nplHex(u.npl)}; st.font.bold=true; }
        ws[a].s=st;
        if(col.type==="num") ws[a].z='#,##0';
        if(col.type==="pct") ws[a].z='0.00"%"';
      }
    });
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Kinerja Unit");
    XLSX.writeFile(wb, `Kinerja_Unit_${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const ukExportPDF = () => {
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });
    doc.setFontSize(13); doc.setTextColor(15,42,80); doc.text("Rekap Kinerja per Unit Kerja — BO Polewali", 40, 40);
    doc.setFontSize(9); doc.setTextColor(120,120,120); doc.text(`Periode ${m.P.date} · ${sortedUker.length} unit kerja`, 40, 56);
    autoTable(doc, {
      startY:70,
      head:[ukCols.map(c=>c.label)],
      body: sortedUker.map(u=>ukCols.map(c=> c.type==="num" ? Number(c.get(u)).toLocaleString("en-US") : c.type==="pct" ? fR(c.get(u))+"%" : String(c.get(u)))),
      styles:{ fontSize:9, cellPadding:5, lineColor:[229,231,235], lineWidth:0.5, valign:"middle" },
      headStyles:{ fillColor:hexRGB(M_NAVY), textColor:255, fontStyle:"bold", halign:"center" },
      alternateRowStyles:{ fillColor:[244,247,251] },
      columnStyles: Object.fromEntries(ukCols.map((c,i)=>[i,{ halign:c.align }])),
      margin:{ left:40, right:40 },
      didParseCell:(d)=>{ if(d.section!=="body") return; const col=ukCols[d.column.index]; if(col.key==="npl"){ const u=sortedUker[d.row.index]; if(u){ d.cell.styles.textColor=hexRGB(nplHex(u.npl)); d.cell.styles.fontStyle="bold"; } } },
    });
    // Halaman terpisah untuk grafik (Outstanding & NPL per unit kerja)
    const ukBarOs  = [...m.perUker].sort((a,b)=>b.osJt-a.osJt).slice(0,20).map(u=>({ label:u.nama, value:u.osJt/1000 }));
    const ukBarNpl = [...m.perUker].sort((a,b)=>b.npl-a.npl).slice(0,20).map(u=>({ label:u.nama, value:u.npl }));
    if (ukBarOs.length) {
      doc.addPage();
      doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(15,42,80);
      doc.text("Grafik Kinerja per Unit Kerja — BO Polewali", 40, 40);
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120,120,120);
      doc.text(`Periode ${m.P.date}`, 40, 55);
      drawBarsPDF(doc, { x:40, y:88,  w:515, h:330, title:"Outstanding per Unit Kerja (Rp M)", rows:ukBarOs,  valFmt:v=>fR(v),      colorHex:"0D9488" });
      drawBarsPDF(doc, { x:40, y:450, w:515, h:330, title:"NPL Ratio per Unit Kerja (%)",      rows:ukBarNpl, valFmt:v=>fR(v)+"%", colorHex:"DC2626" });
    }
    doc.save(`Kinerja_Unit_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // Kolom + ekspor tabel Rekap Kinerja per RM/Mantri (level detail unit)
  const mantriCols = [
    { key:"nama", label:"RM/Mantri",        align:"left",  type:"text", get:a=>a.key==="__none__"?"(Tanpa RM/Mantri)":a.nama },
    { key:"pn",   label:"PN",               align:"left",  type:"text", get:a=>a.pn||"-" },
    { key:"deb",  label:"Debitur",          align:"right", type:"num",  get:a=>a.deb },
    { key:"osJt", label:"Outstanding (Jt)", align:"right", type:"num",  get:a=>Math.trunc(a.osJt) },
    { key:"kol",  label:"Kol Bermasalah",   align:"left",  type:"text", get:a=>`${a.tinggi} tinggi · ${a.sedang} sedang` },
    { key:"npl",  label:"NPL Ratio (%)",    align:"right", type:"pct",  get:a=>+a.npl.toFixed(2) },
    { key:"ckpn", label:"CKPN (Jt)",        align:"right", type:"num",  get:a=>Math.trunc(a.ckpn) },
  ];
  const mantriKpiExp = () => (selUker ? [
    { label:"Total Debitur", val:fNum(selUker.deb) },
    { label:"Outstanding",   val:fJt(selUker.osJt) },
    { label:"NPL Ratio",     val:fPct(selUker.npl,1) },
    { label:"Risiko Tinggi", val:fNum(selUker.tinggi) },
  ] : []);
  const mantriFileName = (ext) => `Kinerja_${(selUker?.nama||"Unit").replace(/[^\w]+/g,"_")}_${new Date().toISOString().slice(0,10)}.${ext}`;
  const mantriExportExcel = () => {
    if (!selUker) return;
    const cols = mantriCols, nC = cols.length, kpis = mantriKpiExp();
    const aoa = [];
    aoa.push([`Rekap Kinerja per RM/Mantri — ${selUker.nama}`]);  // r0 judul
    aoa.push([`Periode ${m.P.date}`]);                            // r1
    aoa.push([]);                                                 // r2
    aoa.push(cols.map((_,i)=> i<4 ? kpis[i].label : ""));         // r3 label KPI
    aoa.push(cols.map((_,i)=> i<4 ? kpis[i].val   : ""));         // r4 nilai KPI
    aoa.push([]);                                                 // r5
    const hR = 6;
    aoa.push(cols.map(c=>c.label));                               // r6 header tabel
    sortedMantri.forEach(a=> aoa.push(cols.map(c=>c.get(a))));    // data
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = cols.map((c,i)=>({ wch: i===0?24 : i===4?20 : 15 }));
    ws["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:nC-1} }, { s:{r:1,c:0}, e:{r:1,c:nC-1} }];
    const thin=(rgb)=>({ style:"thin", color:{ rgb } });
    const border={ top:thin("E5E7EB"), bottom:thin("E5E7EB"), left:thin("E5E7EB"), right:thin("E5E7EB") };
    if(ws["A1"]) ws["A1"].s={ font:{ bold:true, sz:13, color:{rgb:"1B2A6E"} } };
    if(ws["A2"]) ws["A2"].s={ font:{ sz:10, color:{rgb:"6B7280"} } };
    for(let i=0;i<4;i++){
      const la=XLSX.utils.encode_cell({r:3,c:i}), va=XLSX.utils.encode_cell({r:4,c:i});
      if(ws[la]) ws[la].s={ fill:{patternType:"solid",fgColor:{rgb:M_NAVY}}, font:{bold:true,sz:9,color:{rgb:"FFFFFF"}}, alignment:{horizontal:"center",vertical:"center"}, border };
      if(ws[va]) ws[va].s={ fill:{patternType:"solid",fgColor:{rgb:"F4F7FB"}}, font:{bold:true,sz:12,color:{rgb:"111827"}}, alignment:{horizontal:"center",vertical:"center"}, border };
    }
    for(let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r:hR,c}); if(ws[a]) ws[a].s={ fill:{patternType:"solid",fgColor:{rgb:M_NAVY}}, font:{bold:true,color:{rgb:"FFFFFF"},sz:10}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border }; }
    sortedMantri.forEach((a,ri)=>{
      const bg = ri%2 ? "F4F7FB" : "FFFFFF";
      for(let c=0;c<nC;c++){ const col=cols[c]; const ad=XLSX.utils.encode_cell({r:hR+1+ri,c}); if(!ws[ad]) continue;
        const st={ fill:{patternType:"solid",fgColor:{rgb:bg}}, font:{sz:10,color:{rgb:"344054"}}, alignment:{horizontal:col.align,vertical:"center"}, border };
        if(col.key==="npl"){ st.font.color={rgb:nplHex(a.npl)}; st.font.bold=true; }
        ws[ad].s=st;
        if(col.type==="num") ws[ad].z='#,##0';
        if(col.type==="pct") ws[ad].z='0.00"%"';
      }
    });
    ws["!rows"]=[{hpt:20},{hpt:14},{hpt:6},{hpt:16},{hpt:24},{hpt:6},{hpt:22}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Kinerja RM");
    XLSX.writeFile(wb, mantriFileName("xlsx"));
  };
  const mantriExportPDF = () => {
    if (!selUker) return;
    const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(13); doc.setTextColor(15,42,80); doc.text(`Rekap Kinerja per RM/Mantri — ${selUker.nama}`, 40, 40);
    doc.setFontSize(9); doc.setTextColor(120,120,120); doc.text(`Periode ${m.P.date} · ${sortedMantri.length} RM/Mantri`, 40, 56);
    const kpis = mantriKpiExp();
    const cardY=70, cardH=46, gap=12, cardW=(pw-80-gap*3)/4;
    kpis.forEach((k,i)=>{
      const x=40+i*(cardW+gap);
      doc.setDrawColor(229,231,235); doc.setFillColor(248,250,252);
      doc.roundedRect(x,cardY,cardW,cardH,4,4,"FD");
      doc.setFontSize(7.5); doc.setTextColor(107,114,128); doc.text(k.label.toUpperCase(), x+12, cardY+17);
      doc.setFontSize(13); doc.setTextColor(17,24,39); doc.text(String(k.val), x+12, cardY+36);
    });
    autoTable(doc, {
      startY: cardY+cardH+16,
      head:[mantriCols.map(c=>c.label)],
      body: sortedMantri.map(a=>mantriCols.map(c=> c.type==="num" ? Number(c.get(a)).toLocaleString("en-US") : c.type==="pct" ? fR(c.get(a))+"%" : String(c.get(a)))),
      styles:{ fontSize:9, cellPadding:5, lineColor:[229,231,235], lineWidth:0.5, valign:"middle" },
      headStyles:{ fillColor:hexRGB(M_NAVY), textColor:255, fontStyle:"bold", halign:"center" },
      alternateRowStyles:{ fillColor:[244,247,251] },
      columnStyles: Object.fromEntries(mantriCols.map((c,i)=>[i,{ halign:c.align }])),
      margin:{ left:40, right:40 },
      didParseCell:(d)=>{ if(d.section!=="body") return; const col=mantriCols[d.column.index]; if(col.key==="npl"){ const a=sortedMantri[d.row.index]; if(a){ d.cell.styles.textColor=hexRGB(nplHex(a.npl)); d.cell.styles.fontStyle="bold"; } } },
    });
    // Halaman terpisah untuk grafik (sama seperti tampilan web)
    const barRowsOs  = [...sortedMantri.filter(a=>a.key!=="__none__"&&a.osJt>0)].sort((a,b)=>b.osJt-a.osJt).slice(0,20).map(a=>({ label:a.nama, value:a.osJt/1000 }));
    const barRowsRsk = [...sortedMantri.filter(a=>a.key!=="__none__"&&a.tinggi>0)].sort((a,b)=>b.tinggi-a.tinggi).slice(0,20).map(a=>({ label:a.nama, value:a.tinggi }));
    if (barRowsOs.length || barRowsRsk.length) {
      doc.addPage();
      doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(15,42,80);
      doc.text(`Grafik Kinerja RM/Mantri — ${selUker.nama}`, 40, 40);
      doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.setTextColor(120,120,120);
      doc.text(`Periode ${m.P.date}`, 40, 55);
      const colW = (pw-80-20)/2;
      drawBarsPDF(doc, { x:40,           y:88, w:colW, h:450, title:"Outstanding per RM/Mantri (Rp M)",      rows:barRowsOs,  valFmt:v=>fR(v),                colorHex:"0D9488" });
      drawBarsPDF(doc, { x:40+colW+20,   y:88, w:colW, h:450, title:"Debitur Risiko Tinggi per RM/Mantri",   rows:barRowsRsk, valFmt:v=>String(Math.round(v)), colorHex:"DC2626" });
    }
    doc.save(mantriFileName("pdf"));
  };

  // Kolom + ekspor tabel Daftar Debitur (level detail RM/Mantri) — ekspor SELURUH baris (semua halaman digabung)
  const dpdHex   = (v)=> v>30?"C0282D":v>0?"B45309":"15803D";
  const riskHexT = (t)=> t==="tinggi"?"C0282D":t==="sedang"?"B45309":"15803D";
  const debCols = [
    { key:"cif",     label:"CIF",              align:"left",   type:"text", get:d=>d.cif },
    { key:"nama",    label:"Nama Debitur",     align:"left",   type:"text", get:d=>d.nama },
    { key:"sektor",  label:"Sektor Usaha",     align:"left",   type:"text", get:d=>d.sektor||"-" },
    { key:"osJt",    label:"Outstanding (Jt)", align:"right",  type:"num",  get:d=>Math.trunc(d.osJt) },
    { key:"kol",     label:"Kol",              align:"center", type:"text", get:d=>`Kol ${d.kol}` },
    { key:"restruk", label:"Restruk",          align:"center", type:"text", get:d=>d.flagRestruk==='Y'?'Y':'N' },
    { key:"dpd",     label:"DPD",              align:"right",  type:"num",  get:d=>d.dpd||0 },
    { key:"risiko",  label:"Status Risiko",    align:"left",   type:"text", get:d=>risikoLabel[d.tier]||"-" },
  ];
  const debKpiExp = () => (selAO!==null ? [
    { label:"Total Debitur", val:fNum(aoItems.length) },
    { label:"Outstanding",   val:fJt(aoItems.reduce((s,d)=>s+d.osJt*f,0)) },
    { label:"Risiko Tinggi", val:fNum(aoItems.filter(d=>d.tier==="tinggi").length) },
    { label:"NPL Ratio",     val:fPct(aoObj?.npl||0,1) },
  ] : []);
  const debFileName = (ext) => `Debitur_${(aoObj?.nama||"RM").replace(/[^\w]+/g,"_")}_${new Date().toISOString().slice(0,10)}.${ext}`;
  const debExportExcel = () => {
    if (selAO===null) return;
    const cols = debCols, nC = cols.length, kpis = debKpiExp(), rows = filteredDebitur;
    const aoa = [];
    aoa.push([`Daftar Debitur — ${aoObj?.nama||""}`]);                 // r0 judul
    aoa.push([`${selUker?.nama||""} · Periode ${m.P.date}`]);          // r1
    aoa.push([]);                                                      // r2
    aoa.push(cols.map((_,i)=> i<4 ? kpis[i].label : ""));             // r3 label KPI
    aoa.push(cols.map((_,i)=> i<4 ? kpis[i].val   : ""));             // r4 nilai KPI
    aoa.push([]);                                                      // r5
    const hR = 6;
    aoa.push(cols.map(c=>c.label));                                    // r6 header
    rows.forEach(d=> aoa.push(cols.map(c=>c.get(d))));                 // data (semua baris)
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = cols.map((c)=>({ wch: c.key==="nama"?26 : c.key==="sektor"?18 : c.key==="risiko"?16 : 13 }));
    ws["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:nC-1} }, { s:{r:1,c:0}, e:{r:1,c:nC-1} }];
    const thin=(rgb)=>({ style:"thin", color:{ rgb } });
    const border={ top:thin("E5E7EB"), bottom:thin("E5E7EB"), left:thin("E5E7EB"), right:thin("E5E7EB") };
    if(ws["A1"]) ws["A1"].s={ font:{ bold:true, sz:13, color:{rgb:"1B2A6E"} } };
    if(ws["A2"]) ws["A2"].s={ font:{ sz:10, color:{rgb:"6B7280"} } };
    for(let i=0;i<4;i++){
      const la=XLSX.utils.encode_cell({r:3,c:i}), va=XLSX.utils.encode_cell({r:4,c:i});
      if(ws[la]) ws[la].s={ fill:{patternType:"solid",fgColor:{rgb:M_NAVY}}, font:{bold:true,sz:9,color:{rgb:"FFFFFF"}}, alignment:{horizontal:"center",vertical:"center"}, border };
      if(ws[va]) ws[va].s={ fill:{patternType:"solid",fgColor:{rgb:"F4F7FB"}}, font:{bold:true,sz:12,color:{rgb:"111827"}}, alignment:{horizontal:"center",vertical:"center"}, border };
    }
    for(let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r:hR,c}); if(ws[a]) ws[a].s={ fill:{patternType:"solid",fgColor:{rgb:M_NAVY}}, font:{bold:true,color:{rgb:"FFFFFF"},sz:10}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border }; }
    rows.forEach((d,ri)=>{
      const bg = ri%2 ? "F4F7FB" : "FFFFFF";
      for(let c=0;c<nC;c++){ const col=cols[c]; const ad=XLSX.utils.encode_cell({r:hR+1+ri,c}); if(!ws[ad]) continue;
        const st={ fill:{patternType:"solid",fgColor:{rgb:bg}}, font:{sz:10,color:{rgb:"344054"}}, alignment:{horizontal:col.align,vertical:"center"}, border };
        if(col.key==="dpd")    { st.font.color={rgb:dpdHex(d.dpd||0)}; st.font.bold=true; }
        if(col.key==="risiko") { st.font.color={rgb:riskHexT(d.tier)}; st.font.bold=true; }
        if(col.key==="restruk" && d.flagRestruk==='Y') { st.font.color={rgb:"B45309"}; st.font.bold=true; }
        ws[ad].s=st;
        if(col.type==="num") ws[ad].z='#,##0';
      }
    });
    ws["!rows"]=[{hpt:20},{hpt:14},{hpt:6},{hpt:16},{hpt:24},{hpt:6},{hpt:22}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Daftar Debitur");
    XLSX.writeFile(wb, debFileName("xlsx"));
  };
  const debExportPDF = () => {
    if (selAO===null) return;
    const rows = filteredDebitur;
    const doc = new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(13); doc.setTextColor(15,42,80); doc.text(`Daftar Debitur — ${aoObj?.nama||""}`, 40, 40);
    doc.setFontSize(9); doc.setTextColor(120,120,120); doc.text(`${selUker?.nama||""} · Periode ${m.P.date} · ${fNum(rows.length)} debitur`, 40, 56);
    const kpis = debKpiExp();
    const cardY=70, cardH=46, gap=12, cardW=(pw-80-gap*3)/4;
    kpis.forEach((k,i)=>{
      const x=40+i*(cardW+gap);
      doc.setDrawColor(229,231,235); doc.setFillColor(248,250,252);
      doc.roundedRect(x,cardY,cardW,cardH,4,4,"FD");
      doc.setFontSize(7.5); doc.setTextColor(107,114,128); doc.text(k.label.toUpperCase(), x+12, cardY+17);
      doc.setFontSize(13); doc.setTextColor(17,24,39); doc.text(String(k.val), x+12, cardY+36);
    });
    autoTable(doc, {
      startY: cardY+cardH+16,
      showHead:"everyPage",   // header tabel diulang tiap halaman
      head:[debCols.map(c=>c.label)],
      body: rows.map(d=>debCols.map(c=> c.type==="num" ? Number(c.get(d)).toLocaleString("en-US") : String(c.get(d)))),
      styles:{ fontSize:8.5, cellPadding:4, lineColor:[229,231,235], lineWidth:0.5, valign:"middle" },
      headStyles:{ fillColor:hexRGB(M_NAVY), textColor:255, fontStyle:"bold", halign:"center" },
      alternateRowStyles:{ fillColor:[244,247,251] },
      columnStyles: Object.fromEntries(debCols.map((c,i)=>[i,{ halign:c.align }])),
      margin:{ left:40, right:40 },
      didParseCell:(dc)=>{ if(dc.section!=="body") return; const col=debCols[dc.column.index]; const d=rows[dc.row.index]; if(!d) return;
        if(col.key==="dpd")    { dc.cell.styles.textColor=hexRGB(dpdHex(d.dpd||0)); dc.cell.styles.fontStyle="bold"; }
        if(col.key==="risiko") { dc.cell.styles.textColor=hexRGB(riskHexT(d.tier)); dc.cell.styles.fontStyle="bold"; }
        if(col.key==="restruk" && d.flagRestruk==='Y') { dc.cell.styles.textColor=hexRGB("B45309"); dc.cell.styles.fontStyle="bold"; }
      },
    });
    doc.save(debFileName("pdf"));
  };

  const kolOpts = ["semua","1","2A","2B","3","4","5"].map(v=>({ value:v, label:v==="semua"?"Semua Kolektibilitas":`Kol ${v}` }));
  const risOpts = [{ value:"semua",label:"Semua Risiko" },{ value:"Risiko Tinggi",label:"Risiko Tinggi" },{ value:"Risiko Sedang",label:"Risiko Sedang" },{ value:"Risiko Rendah",label:"Risiko Rendah" }];

  // Breadcrumb
  const crumb = (
    <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:C.gray, marginBottom:8, flexWrap:"wrap" }}>
      <span onClick={()=>{ setSelUker(null); setSelAO(null); }} style={{ cursor:"pointer", color:C.kpiBlue, fontWeight:600 }}>Kinerja Unit</span>
      {selUker && <>
        <span>›</span>
        <span onClick={selAO!==null?()=>setSelAO(null):undefined}
          style={{ cursor:selAO!==null?"pointer":"default", color:selAO!==null?C.kpiBlue:C.text, fontWeight:600 }}>
          {selUker.nama}
        </span>
      </>}
      {aoObj && <><span>›</span><span style={{ color:C.text, fontWeight:600 }}>{aoObj.nama}</span></>}
    </div>
  );

  // KPI card row
  const kpiGrid = (items) => (
    <div style={{ display:"grid", gridTemplateColumns: w>=900?"repeat(4,1fr)":"repeat(2,1fr)", gap:10, marginBottom:4 }}>
      {items.map(k=>(
        <div key={k.label} style={{ ...card, padding:"10px 14px" }}>
          <div style={{ fontSize:10.5, color:C.gray, fontWeight:600, textTransform:"uppercase", marginBottom:4 }}>{k.label}</div>
          <div style={{ fontSize:17, fontWeight:800, color:k.color }}>{k.val}</div>
        </div>
      ))}
    </div>
  );

  // Pagination
  const Pagination = ({ pg, total, set }) => {
    if (total <= 1) return null;
    const btnSt = (active,disabled) => ({ padding:"4px 9px", border:`1px solid ${active?C.navy:C.border}`, borderRadius:6,
      background:active?C.navy:C.white, color:active?"#fff":disabled?C.gray:C.text, cursor:disabled?"default":"pointer", fontSize:12, fontWeight:active?700:400 });
    const pages = [];
    const start = Math.max(1, Math.min(pg-2, total-4));
    for (let i=start; i<=Math.min(start+4, total); i++) pages.push(i);
    return (
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:5, padding:"10px 0 6px", flexWrap:"wrap" }}>
        <button disabled={pg===1}     onClick={()=>set(1)}      style={btnSt(false,pg===1)}>«</button>
        <button disabled={pg===1}     onClick={()=>set(pg-1)}   style={btnSt(false,pg===1)}>‹</button>
        {pages.map(p=><button key={p} onClick={()=>set(p)}      style={btnSt(p===pg,false)}>{p}</button>)}
        <button disabled={pg===total} onClick={()=>set(pg+1)}   style={btnSt(false,pg===total)}>›</button>
        <button disabled={pg===total} onClick={()=>set(total)}  style={btnSt(false,pg===total)}>»</button>
        <span style={{ fontSize:12, color:C.gray, marginLeft:4 }}>Hal {pg}/{total}</span>
      </div>
    );
  };

  /* ── LEVEL 2: Daftar debitur mantri ── */
  if (selUker && selAO !== null) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {crumb}
        {kpiGrid([
          { label:"Total Debitur", val:fNum(aoItems.length),                                    color:C.navy },
          { label:"Outstanding",   val:fJt(aoItems.reduce((s,d)=>s+d.osJt*f,0)),               color:C.kpiTeal },
          { label:"Risiko Tinggi", val:fNum(aoItems.filter(d=>d.tier==="tinggi").length),       color:C.kpiRed },
          { label:"NPL Ratio",     val:fPct(aoObj?.npl||0,1), color:nplColor(aoObj?.npl||0) },
        ])}

        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Daftar Debitur — {aoObj?.nama||""}</div>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:C.gray }}>Baris/hal:</span>
              <input type="text" inputMode="numeric" value={debPerPage} onChange={e=>{ const v=e.target.value.replace(/\D/g,""); setDebPerPage(Math.max(1, Math.min(1000, parseInt(v)||20))); setDebPage(1); }}
                style={{ width:54, padding:"4px 8px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12.5, color:C.text, textAlign:"right" }} />
              {anyDebFilter && <button onClick={resetDebFilters} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Reset Filter</button>}
              <span style={{ fontSize:12.5, color:C.gray, marginRight:2 }}>{fNum(filteredDebitur.length)} debitur</span>
              <button onClick={debExportExcel} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiGreen, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> Excel</button>
              <button onClick={debExportPDF}   style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiRed, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> PDF</button>
            </div>
          </div>
          <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"62vh" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
              <colgroup>{[90,180,120,116,60,72,60,120].map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
              <thead>
                <tr>
                  <th style={navyTh()}>CIF</th>
                  <th style={navyTh()}>Nama Debitur</th>
                  <th style={navyTh()}>Sektor Usaha</th>
                  <th style={navyTh("right")}>Outstanding</th>
                  <th style={navyTh("center")}>Kol</th>
                  <th style={navyTh("center")}>Restruk</th>
                  <th style={navyTh("center")}>DPD</th>
                  <th style={navyTh()}>Status Risiko</th>
                </tr>
                <tr>
                  <th style={filtTh}></th>
                  <th style={filtTh}><input value={debCari} onChange={onDF(setDebCari)} placeholder="Cari nama/CIF…" style={hInpSt} /></th>
                  <th style={filtTh}><select value={debSektorF} onChange={onDF(setDebSektorF)} style={hSelSt}><option value="semua">Semua Sektor</option>{sektorListLvl2.map(s=><option key={s} value={s}>{s}</option>)}</select></th>
                  <th style={filtTh}><select value={osSort} onChange={setColSort("os")} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={kolFilter} onChange={onDF(setKolFilter)} style={hSelSt}>{kolOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={restrukFilter} onChange={onDF(setRestrukFilter)} style={hSelSt}><option value="semua">Semua</option><option value="Y">Y</option><option value="N">N</option></select></th>
                  <th style={filtTh}><select value={dpdSort} onChange={setColSort("dpd")} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={risikoFilter} onChange={onDF(setRisikoFilter)} style={hSelSt}>{risOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                </tr>
              </thead>
              <tbody>
                {filteredDebitur.length === 0
                  ? <tr><td colSpan={8} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Tidak ada debitur sesuai filter.</td></tr>
                  : paged.map((d, ri) => {
                      const isExp = expandedCif === d.cif;
                      const dpd2  = d.dpd || 0;
                      return [
                        <tr key={d.cif+ri} onClick={()=>setExpandedCif(isExp?null:d.cif)}
                          style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}
                          onMouseEnter={e=>{ e.currentTarget.style.filter="brightness(0.97)"; }}
                          onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}>
                          <td style={{ padding:"9px 12px", color:C.textMd, fontFamily:"monospace", fontSize:11.5 }}>{d.cif}</td>
                          <td style={{ padding:"9px 12px", color:C.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.nama}</td>
                          <td style={{ padding:"9px 12px", color:C.textMd }}>{d.sektor}</td>
                          <td style={{ padding:"9px 12px", fontWeight:500, color:C.textMd, textAlign:"right" }}>{fJt(d.osJt)}</td>
                          <td style={{ padding:"9px 12px", textAlign:"center" }}><KolBadge k={d.kol} /></td>
                          <td style={{ padding:"9px 12px", textAlign:"center" }}>
                            {d.flagRestruk === 'Y'
                              ? <span style={{ fontSize:10.5, fontWeight:700, color:C.amber, background:C.amberLt, padding:"2px 7px", borderRadius:4 }}>Y</span>
                              : <span style={{ fontSize:10.5, color:C.gray }}>N</span>}
                          </td>
                          <td style={{ padding:"9px 12px", color:dpd2>30?C.red:dpd2>0?C.amber:C.green, fontWeight:600, textAlign:"center" }}>{dpd2}</td>
                          <td style={{ padding:"9px 12px" }}><Badge level={d.tier} /></td>
                        </tr>,
                        isExp && <BreakdownRow key={d.cif+ri+"-exp"} d={d} colSpan={8} />,
                      ];
                    })}
              </tbody>
            </table>
          </div>
          <Pagination pg={curPg} total={totalPg} set={(p)=>{ setDebPage(p); setExpandedCif(null); }} />
        </div>
      </div>
    );
  }

  /* ── LEVEL 1: Detail unit → daftar mantri ── */
  if (selUker) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {crumb}
        {kpiGrid([
          { label:"Total Debitur", val:fNum(selUker.deb),    color:C.navy },
          { label:"Outstanding",   val:fJt(selUker.osJt),    color:C.kpiTeal },
          { label:"NPL Ratio",     val:fPct(selUker.npl,1),  color:nplColor(selUker.npl) },
          { label:"Risiko Tinggi", val:fNum(selUker.tinggi),  color:C.kpiRed },
        ])}
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Rekap Kinerja per RM/Mantri — {selUker.nama}</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {anyMantriFilter && <button onClick={resetMantriFilters} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Reset Filter</button>}
              <span style={{ fontSize:12.5, color:C.gray, marginRight:2 }}>{sortedMantri.length} RM/Mantri</span>
              <button onClick={mantriExportExcel} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiGreen, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> Excel</button>
              <button onClick={mantriExportPDF}   style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiRed, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> PDF</button>
            </div>
          </div>
          <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"60vh" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
              <colgroup>{[170,92,78,120,150,100,110].map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
              <thead>
                <tr>
                  <th style={navyTh()}>RM/Mantri</th>
                  <th style={navyTh()}>PN</th>
                  <th style={navyTh("right")}>Debitur</th>
                  <th style={navyTh("right")}>Outstanding</th>
                  <th style={navyTh()}>Kol Bermasalah</th>
                  <th style={navyTh("right")}>NPL Ratio</th>
                  <th style={navyTh("right")}>CKPN</th>
                </tr>
                <tr>
                  <th style={filtTh}><input value={mantriCari} onChange={e=>setMantriCari(e.target.value)} placeholder="Cari nama/PN…" style={hInpSt} /></th>
                  <th style={filtTh}></th>
                  <th style={filtTh}><select value={mDebSort} onChange={setMSort("deb")} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={mOsSort} onChange={setMSort("os")} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={mantriKolFilter} onChange={e=>setMantriKolFilter(e.target.value)} style={hSelSt}>{kolOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={mNplSort} onChange={setMSort("npl")} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                  <th style={filtTh}><select value={mCkpnSort} onChange={setMSort("ckpn")} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                </tr>
              </thead>
              <tbody>
                {sortedMantri.length === 0
                  ? <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Tidak ada RM/Mantri sesuai filter.</td></tr>
                  : sortedMantri.map((a, ri)=>(
                      <tr key={a.key} onClick={()=>setSelAO(a.key)}
                        style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}
                        onMouseEnter={e=>{ e.currentTarget.style.filter="brightness(0.97)"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}>
                        <td style={{ padding:"9px 12px", fontWeight:600, color:a.key==="__none__"?C.gray:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.nama}</td>
                        <td style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:11.5, color:C.navy }}>{a.pn||"—"}</td>
                        <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"right" }}>{fNum(a.deb)}</td>
                        <td style={{ padding:"9px 12px", color:C.textMd, fontWeight:500, textAlign:"right" }}>{fJt(a.osJt)}</td>
                        <td style={{ padding:"9px 12px", color:a.tinggi>0?C.red:C.green, fontWeight:600 }}>{a.tinggi} tinggi · {a.sedang} sedang</td>
                        <td style={{ padding:"9px 12px", color:nplColor(a.npl), fontWeight:600, textAlign:"right" }}>{fPct(a.npl,1)}</td>
                        <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"right" }}>{fJt(a.ckpn)}</td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grafik di bawah tabel */}
        <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
          <div style={card}>
            <CardTitle>Outstanding per RM/Mantri</CardTitle>
            <BarH data={[...sortedMantri.filter(a=>a.key!=="__none__"&&a.osJt>0)].sort((a,b)=>b.osJt-a.osJt)} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)}
              onBarClick={entry=>{ const a=mantriList.find(x=>x.nama===entry.nama); if(a) setSelAO(a.key); }} />
          </div>
          <div style={card}>
            <CardTitle>Debitur Risiko Tinggi per RM/Mantri</CardTitle>
            <BarH data={[...sortedMantri.filter(a=>a.key!=="__none__"&&a.tinggi>0)].sort((a,b)=>b.tinggi-a.tinggi)} dataKey="tinggi" nameKey="nama" color={C.kpiRed} fmt={fNum}
              onBarClick={entry=>{ const a=mantriList.find(x=>x.nama===entry.nama); if(a) setSelAO(a.key); }} />
          </div>
        </div>
      </div>
    );
  }

  /* ── LEVEL 0: Daftar unit ── */
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Bar atas: jumlah unit + ekspor */}
      <div style={{ display:"flex", justifyContent:"flex-end", gap:8, alignItems:"center" }}>
        <span style={{ fontSize:12.5, color:C.gray }}>{m.perUker.length} unit kerja</span>
        <button onClick={ukExportExcel} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiGreen, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> Excel</button>
        <button onClick={ukExportPDF}   style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:C.kpiRed, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={14} /> PDF</button>
      </div>

      {/* Tabel rekap — header navy + urutan per kolom ala Excel (sticky) */}
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Rekap Kinerja per Unit Kerja</div>
          {unitSort!=="default" && <button onClick={()=>setUnitSort("default")} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Urutan Default</button>}
        </div>
        <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"64vh" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
            <colgroup>{[220,150,110,130,140,140].map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
            <thead>
              <tr>
                {ukCols.map((c,i)=>(
                  <th key={i} style={navyTh(c.align)}>{c.label}</th>
                ))}
              </tr>
              <tr>
                {ukCols.map((c,i)=>{
                  if (c.key==="nama") return <th key={i} style={filtTh}></th>;
                  const tok = ukColTok[c.key];
                  return <th key={i} style={filtTh}><select value={colSortVal(tok)} onChange={setUkSort(tok)} style={hSelSt}>{sortOpts3.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {sortedUker.map((u,ri)=>(
                <tr key={u.kode} onClick={()=>setSelUker(u)} style={{ background:ri%2?C.grayLt:C.white, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.97)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>
                  {ukCols.map((c,ci)=>(
                    <td key={ci} style={{ padding:"9px 14px", textAlign:c.align, whiteSpace:"nowrap",
                      color: c.key==="npl"?nplColor(u.npl) : c.key==="nama"?C.text : C.textMd,
                      fontWeight: (c.key==="nama"||c.key==="npl")?600:400 }}>{c.render(u)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grafik di bawah tabel */}
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>Outstanding per Unit Kerja</CardTitle>
          <BarH data={[...m.perUker].sort((a,b)=>b.osJt-a.osJt)} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)}
            onBarClick={entry=>setSelUker(m.perUker.find(u=>u.nama===entry.nama))} />
        </div>
        <div style={card}>
          <CardTitle>NPL Ratio per Unit Kerja</CardTitle>
          <BarH data={[...m.perUker].sort((a,b)=>b.npl-a.npl)} dataKey="npl" nameKey="nama" color={C.kpiRed} fmt={(v)=>fPct(v,1)}
            onBarClick={entry=>setSelUker(m.perUker.find(u=>u.nama===entry.nama))} />
        </div>
      </div>
    </div>
  );
}

function downloadReport(type, m, list) {
  const wb = XLSX.utils.book_new();
  const tgl = m.P.date;
  const fn = tgl.replace(/\s/g,"_");
  const safe = (n) => n > 900719925 ? 0 : (n || 0);
  const addSheet = (name, aoa, widths) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (widths) ws["!cols"] = widths.map(w=>({ wch:w }));
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0,31));
  };

  if (type === "portofolio") {
    addSheet("Ringkasan", [
      ["LAPORAN PORTOFOLIO KREDIT — BO POLEWALI"],
      [`Tanggal: ${tgl}`],[],
      ["INDIKATOR","NILAI","SATUAN"],
      ["Total Outstanding", +((m.totalOsJt||0)/1000).toFixed(3), "Miliar Rp"],
      ["Total Debitur", m.totalDeb, "debitur"],
      ["NPL Ratio", +m.npl.toFixed(2), "%"],
      ["CKPN Existing", +((m.ckpnExisting||0)/1000).toFixed(3), "Miliar Rp"],
      ["Realisasi Baru", +((m.realisasiJt||0)/1000).toFixed(3), "Miliar Rp"],
      ["Nett Disbursed", +((m.nettDisbursed||0)/1000).toFixed(3), "Miliar Rp"],
      ["Debitur Lancar (Kol 1)", m.tier.rendah, "debitur"],
      ["Debitur Risiko (Kol 2A-2B)", m.tier.sedang, "debitur"],
      ["Debitur Bermasalah (Kol 3-5)", m.tier.tinggi, "debitur"],
      ["Total Tunggakan Est.", +((m.totalTunggakanAll||0)/1000).toFixed(3), "Miliar Rp"],
    ], [32,16,14]);
    addSheet("Per Unit Kerja", [
      [`PORTOFOLIO PER UNIT KERJA — ${tgl}`],[],
      ["No","Kode","Nama Unit Kerja","Outstanding (Jt)","Jml Debitur","Risiko Tinggi","NPL Ratio (%)","CKPN (Jt)","Recovery (%)"],
      ...m.perUker.map((u,i)=>[i+1, u.kode, u.nama, Math.trunc(u.osJt), u.deb, u.tinggi, +u.npl.toFixed(2), Math.trunc(u.ckpn), u.recovery]),
      [],[" TOTAL","","",Math.trunc(m.totalOsJt), m.totalDeb,"",+m.npl.toFixed(2), Math.trunc(m.ckpnExisting),""],
    ], [4,8,22,16,12,12,13,12,12]);
    addSheet("Daftar Debitur", [
      [`DAFTAR DEBITUR — ${tgl}`],[],
      ["No","CIF","Nama Debitur","Unit Kerja","RM/Mantri","PN","Segment","Sektor","Outstanding (Jt)","Kolektibilitas","DPD","Status Risiko"],
      ...list.map((d,i)=>[i+1, d.cif, d.nama, d.ukerNama, d.ao, d.pn||"", d.segment, d.sektor, Math.trunc(d.osJt), d.kol, d.dpd, risikoLabel[d.tier]||d.tier]),
    ], [4,12,30,20,25,10,10,12,16,12,6,14]);
    addSheet("Distribusi Kolektibilitas", [
      [`DISTRIBUSI KOLEKTIBILITAS — ${tgl}`],[],
      ["Kolektibilitas","Label","Jumlah Debitur","Persentase (%)","Outstanding (Jt)"],
      ...m.kol.map(k=>[k.kol, k.legend, k.value, +k.pct.toFixed(2), Math.trunc(k.osJt)]),
    ], [14,10,16,16,16]);
    XLSX.writeFile(wb, `Portofolio_Kredit_${fn}.xlsx`);
  }

  else if (type === "ews") {
    const tinggiList = [...list].filter(d=>d.tier==="tinggi").sort((a,b)=>b.dpd-a.dpd);
    const alertCnt = { tinggi:m.alerts.filter(a=>a.level==="tinggi").length, sedang:m.alerts.filter(a=>a.level==="sedang").length, rendah:m.alerts.filter(a=>a.level==="rendah").length };
    addSheet("Ringkasan EWS", [
      ["LAPORAN EARLY WARNING SYSTEM — BO POLEWALI"],
      [`Tanggal: ${tgl}`],[],
      ["Kategori Risiko","Jumlah Debitur","Persentase (%)","Alert Aktif"],
      ["Risiko Tinggi (Kol 3-5)", m.tier.tinggi, +m.ringkasanEW[0].pct.toFixed(2), alertCnt.tinggi],
      ["Risiko Sedang (Kol 2A-2B)", m.tier.sedang, +m.ringkasanEW[1].pct.toFixed(2), alertCnt.sedang],
      ["Risiko Rendah (Kol 1)", m.tier.rendah, +m.ringkasanEW[2].pct.toFixed(2), alertCnt.rendah],
      ["TOTAL", m.totalDeb, 100, m.alerts.length],
    ], [28,16,14,12]);
    addSheet("Debitur Risiko Tinggi", [
      [`DEBITUR RISIKO TINGGI — ${tgl}`],[],
      ["No","CIF","Nama Debitur","Unit Kerja","RM/Mantri","PN","Outstanding (Jt)","DPD","Kolektibilitas","Tunggakan Est. (Jt)"],
      ...tinggiList.map((d,i)=>[i+1, d.cif, d.nama, d.ukerNama, d.ao, d.pn||"", Math.trunc(d.osJt), d.dpd, d.kol, Math.trunc(d.tunggakanTotal||0)]),
    ], [4,12,30,20,25,10,16,6,12,18]);
    addSheet("EWS Per Unit Kerja", [
      [`EWS PER UNIT KERJA — ${tgl}`],[],
      ["No","Unit Kerja","Total Debitur","Risiko Tinggi","Risiko Sedang","Risiko Rendah","NPL Ratio (%)"],
      ...m.perUker.map((u,i)=>{
        const it = list.filter(d=>d.uker===u.kode);
        return [i+1, u.nama, u.deb, u.tinggi, it.filter(d=>d.tier==="sedang").length, it.filter(d=>d.tier==="rendah").length, +u.npl.toFixed(2)];
      }),
    ], [4,22,14,12,14,14,13]);
    addSheet("Daftar Alert", [
      [`DAFTAR ALERT — ${tgl}`],[],
      ["No","Level","Deskripsi Alert","Waktu"],
      ...m.alerts.map((a,i)=>[i+1, a.level.toUpperCase(), a.text, a.time]),
    ], [4,10,75,20]);
    XLSX.writeFile(wb, `EarlyWarning_${fn}.xlsx`);
  }

  else if (type === "action") {
    const selesai = m.actionPlans.filter(p=>p.status==="selesai");
    const inProg = m.actionPlans.filter(p=>p.status==="in_progress");
    addSheet("Ringkasan", [
      ["LAPORAN ACTION PLAN — BO POLEWALI"],
      [`Tanggal: ${tgl}`],[],
      ["Indikator","Nilai"],
      ["Total Action Plan", m.actionPlans.length],
      ["Selesai", selesai.length],
      ["In Progress", inProg.length],
      ["Completion Rate (%)", m.actionPlans.length ? +((selesai.length/m.actionPlans.length)*100).toFixed(1) : 0],
    ], [30,14]);
    addSheet("Daftar Action Plan", [
      [`DAFTAR ACTION PLAN — ${tgl}`],[],
      ["No","Tanggal Input","Nama Debitur","PIC (PN – RM/Mantri)","Kolektibilitas","Jenis Tindakan","Target","Status","Hasil / Catatan"],
      ...m.actionPlans.map((p,i)=>[i+1, p.tgl, p.nama, p.ao, p.kol, p.jenis, p.target, p.status==="selesai"?"Selesai":"In Progress", p.hasil]),
    ], [4,13,30,28,13,22,12,13,35]);
    addSheet("Action Plan Selesai", [
      [`ACTION PLAN SELESAI — ${tgl}`],[],
      ["No","Tanggal","Nama Debitur","PIC","Jenis","Hasil"],
      ...selesai.map((p,i)=>[i+1, p.tgl, p.nama, p.ao, p.jenis, p.hasil]),
    ], [4,13,30,28,22,35]);
    XLSX.writeFile(wb, `ActionPlan_${fn}.xlsx`);
  }

  else if (type === "ckpn") {
    const covPct = m.totalOsJt ? +((m.ckpnExisting/m.totalOsJt)*100).toFixed(2) : 0;
    addSheet("Ringkasan CKPN", [
      ["LAPORAN SIMULASI CKPN — BO POLEWALI"],
      [`Tanggal: ${tgl}`],[],
      ["Indikator","Nilai (Jt)","Keterangan"],
      ["CKPN Existing", Math.trunc(m.ckpnExisting), "Berdasarkan kolektibilitas saat ini"],
      ["CKPN Setelah Action Plan", Math.trunc(m.ckpnAfter), "Estimasi jika action plan berhasil"],
      ["Potensi Penghematan", Math.trunc(m.ckpnSaving), `${m.savingPct.toFixed(1)}% dari CKPN Existing`],
      ["Coverage Rate CKPN (%)", covPct, "CKPN Existing / Total Outstanding × 100"],
      ["Total Outstanding", Math.trunc(m.totalOsJt), "Basis perhitungan"],
    ], [30,14,38]);
    addSheet("CKPN Per Unit Kerja", [
      [`CKPN PER UNIT KERJA — ${tgl}`],[],
      ["No","Unit Kerja","Outstanding (Jt)","CKPN Existing (Jt)","Coverage (%)","Recovery Rate (%)"],
      ...m.perUker.map((u,i)=>[i+1, u.nama, Math.trunc(u.osJt), Math.trunc(u.ckpn), u.osJt ? +((u.ckpn/u.osJt)*100).toFixed(2) : 0, u.recovery]),
      [],[" TOTAL","",Math.trunc(m.totalOsJt), Math.trunc(m.ckpnExisting), covPct,""],
    ], [4,22,16,18,13,16]);
    addSheet("CKPN Per Kolektibilitas", [
      [`CKPN PER KOLEKTIBILITAS — ${tgl}`],[],
      ["Kol","Label","Coverage Rate","Jml Debitur","Outstanding (Jt)","CKPN (Jt)"],
      ...m.kol.map(k=>{ const cov={1:0.01,"2A":0.05,"2B":0.15,3:0.5,4:0.75,5:1.0}[k.kol]||0; return [k.kol, k.legend, `${(cov*100).toFixed(0)}%`, k.value, Math.trunc(k.osJt), Math.trunc(k.osJt*cov)]; }),
    ], [6,10,13,14,16,14]);
    addSheet("Top Kontributor CKPN", [
      [`TOP KONTRIBUTOR CKPN — ${tgl}`],[],
      ["No","Nama Debitur","Outstanding (Jt)","Kol","CKPN Existing (Jt)","Pot. Saving (Jt)","% Saving"],
      ...m.ckpnDebitur.map((d,i)=>[i+1, d.nama, Math.trunc(d.osJt), d.kol, Math.trunc(d.ckpn), Math.trunc(d.saving), +d.pct.toFixed(1)]),
    ], [4,30,16,6,18,16,10]);
    XLSX.writeFile(wb, `SimulasiCKPN_${fn}.xlsx`);
  }
}

function Laporan({ m, list, perms }) {
  const w = useWindowWidth();
  const canDl = perms?.exportReport;
  const reports = [
    { type:"portofolio", nama:"Laporan Portofolio Kredit",   desc:"Outstanding, debitur, kolektibilitas per unit kerja", sheets:"4 sheet: Ringkasan · Per Unit Kerja · Daftar Debitur · Distribusi Kol" },
    { type:"ews",        nama:"Laporan Early Warning System", desc:"Daftar alert & risk scoring debitur",                sheets:"4 sheet: Ringkasan EWS · Debitur Risiko Tinggi · EWS Per Unit · Daftar Alert" },
    { type:"action",     nama:"Laporan Action Plan",          desc:"Rekap tindak lanjut & progres penyelesaian",         sheets:"3 sheet: Ringkasan · Daftar Action Plan · Action Selesai" },
    { type:"ckpn",       nama:"Laporan Simulasi CKPN",        desc:"CKPN existing, potensial & penghematan",             sheets:"4 sheet: Ringkasan · Per Unit Kerja · Per Kolektibilitas · Top Kontributor" },
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
              <div style={{ fontSize:10.5, color:C.kpiTeal, marginTop:2 }}>{r.sheets}</div>
            </div>
            <button onClick={()=>canDl&&downloadReport(r.type, m, list||[])} disabled={!canDl} title={canDl?"Unduh Excel (.xlsx)":"Role Anda tidak memiliki akses unduh"} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:C.navy, color:C.white, border:"none", borderRadius:7, cursor:canDl?"pointer":"not-allowed", fontSize:12.5, fontWeight:500, opacity:canDl?1:.45, flexShrink:0 }}><Ic n="download" size={15} /> Unduh</button>
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
            ["31/03/2026 09:02","LW321 – Kolektibilitas","Mar 2026",fNum(DEBITUR.length-12)+" record","2,2 MB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Hery Santoso"],
            ["31/03/2026 09:04","CKPN per Unit Kerja","Mar 2026","13 unit kerja","79 KB",<span style={{ color:C.green, fontWeight:600 }}>✓ Sukses</span>,"Hery Santoso"],
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

function OsKurang50({ list, m }) {
  const [selUker, setSelUker] = useState(null);
  const [debPage, setDebPage] = useState(1);
  // Filter per-kolom (gaya tabel terbaru)
  const [osCari,    setOsCari]    = useState("");
  const [osSektorF, setOsSektorF] = useState("semua");
  const [osKolF,    setOsKolF]    = useState("semua");
  const [restrukFilter, setRestrukFilter] = useState("semua");
  const [sortBy,    setSortBy]    = useState("os-asc"); // <col>-asc|<col>-desc | "default"
  const [expandedCifs, setExpandedCifs] = useState(new Set());
  const [expandedLoan, setExpandedLoan] = useState(null);
  const PER_PAGE = 20;

  const resetOsFilters = () => { setOsCari(""); setOsSektorF("semua"); setOsKolF("semua"); setRestrukFilter("semua"); setSortBy("os-asc"); setDebPage(1); };
  useEffect(() => { setDebPage(1); setExpandedCifs(new Set()); setExpandedLoan(null); resetOsFilters(); }, [selUker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debitur dengan OS < 50% plafon (hanya yang plafonJt tersedia & > 0)
  const osFiltered = useMemo(() => list.filter(d => d.plafonJt > 0 && d.osJt < d.plafonJt * 0.5), [list]);

  // Unit kerja list
  const unitList = useMemo(() => {
    const m = {};
    osFiltered.forEach(d => {
      if (!m[d.uker]) {
        const u = UKER.find(u => u.kode === d.uker);
        m[d.uker] = { kode:d.uker, nama:d.ukerNama||(u?.nama||d.uker), items:[], totalOs:0, totalPlafon:0 };
      }
      m[d.uker].items.push(d);
      m[d.uker].totalOs    += d.osJt;
      m[d.uker].totalPlafon += d.plafonJt;
    });
    return Object.values(m).sort((a,b) => b.items.length - a.items.length);
  }, [osFiltered]);

  // Daftar sektor di unit terpilih (untuk dropdown filter)
  const osSektorList = useMemo(() => {
    if (!selUker) return [];
    return [...new Set(osFiltered.filter(d => d.uker === selUker.kode).map(d => d.sektor).filter(Boolean))].sort();
  }, [osFiltered, selUker]);

  // Debitur di unit terpilih (CIF-grouped) — filter per kolom + 1 sort aktif
  const unitDebitur = useMemo(() => {
    if (!selUker) return [];
    const base = groupByCif(osFiltered.filter(d => d.uker === selUker.kode));
    const cari = osCari.trim().toLowerCase();
    const f = base.filter(g => {
      const okCari    = !cari || g.nama.toLowerCase().includes(cari) || g.cif.toLowerCase().includes(cari);
      const okSektor  = osSektorF === "semua" || g.loans.some(l => l.sektor === osSektorF);
      const okKol     = osKolF === "semua" || g.loans.some(l => l.kol === osKolF);
      const okRestruk = restrukFilter === "semua" || (g.flagRestruk || 'N') === restrukFilter;
      return okCari && okSektor && okKol && okRestruk;
    });
    const plf = g => g.loans.reduce((s,l)=>s+l.plafonJt,0);
    const pct = g => { const p = plf(g); return p > 0 ? g.totalOsJt/p : 0; };
    const cmp = {
      "os-asc":(a,b)=>a.totalOsJt-b.totalOsJt, "os-desc":(a,b)=>b.totalOsJt-a.totalOsJt,
      "plafon-asc":(a,b)=>plf(a)-plf(b),        "plafon-desc":(a,b)=>plf(b)-plf(a),
      "pct-asc":(a,b)=>pct(a)-pct(b),           "pct-desc":(a,b)=>pct(b)-pct(a),
      "dpd-asc":(a,b)=>a.dpd-b.dpd,             "dpd-desc":(a,b)=>b.dpd-a.dpd,
    }[sortBy];
    return cmp ? [...f].sort(cmp) : f;
  }, [selUker, osFiltered, osCari, osSektorF, osKolF, restrukFilter, sortBy]);

  const totalPage = Math.max(1, Math.ceil(unitDebitur.length / PER_PAGE));
  const pg = Math.min(debPage, totalPage);
  const shown = unitDebitur.slice((pg-1)*PER_PAGE, pg*PER_PAGE);

  const toggleCif  = (cif) => setExpandedCifs(prev => { const n=new Set(prev); n.has(cif)?n.delete(cif):n.add(cif); return n; });
  const toggleLoan = (key) => setExpandedLoan(prev => prev===key?null:key);

  const pctBadge = (os, plafon) => {
    const pct = plafon > 0 ? (os/plafon*100).toFixed(1) : "—";
    return <span style={{ fontSize:10.5, background:"#FEF9C3", color:"#854D0E", borderRadius:4, padding:"1px 5px", fontWeight:600 }}>{pct}%</span>;
  };

  // --- Desain tabel terbaru (header navy + sticky) & export Excel/PDF ---
  const navyTh = (align="left")=>({ height:34, lineHeight:"34px", padding:"0 12px", background:`#${M_NAVY}`, color:"#fff", fontWeight:700, fontSize:10, textTransform:"uppercase", textAlign:align, whiteSpace:"nowrap", borderRight:"1px solid rgba(255,255,255,.12)", userSelect:"none", position:"sticky", top:0, zIndex:5 });
  const dlBtn  = (bg)=>({ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:bg, color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer" });
  const dpdHex = (v)=> v>30?"C0282D":v>0?"B45309":"15803D";
  const sumPlafon = (g)=> g.loans.reduce((s,l)=>s+l.plafonJt,0);
  const pctVal    = (g)=>{ const p=sumPlafon(g); return p>0 ? g.totalOsJt/p*100 : 0; };
  const osCols = [
    { key:"cif",     label:"CIF",              align:"left",   type:"text", get:g=>g.cif },
    { key:"nama",    label:"Nama Debitur",     align:"left",   type:"text", get:g=>g.nama },
    { key:"ao",      label:"RM/Mantri",        align:"left",   type:"text", get:g=>g.ao },
    { key:"sektor",  label:"Sektor",           align:"left",   type:"text", get:g=>g.sektor },
    { key:"os",      label:"Outstanding (Jt)", align:"right",  type:"num",  get:g=>Math.trunc(g.totalOsJt) },
    { key:"plafon",  label:"Plafon (Jt)",      align:"right",  type:"num",  get:g=>Math.trunc(sumPlafon(g)) },
    { key:"pct",     label:"OS/Plafon (%)",    align:"right",  type:"num",  get:g=>+pctVal(g).toFixed(1) },
    { key:"kol",     label:"Kol",              align:"center", type:"text", get:g=>g.kol },
    { key:"restruk", label:"Restruk",          align:"center", type:"text", get:g=>g.flagRestruk==='Y'?'Y':'N' },
    { key:"dpd",     label:"DPD",              align:"center", type:"num",  get:g=>g.dpd||0 },
  ];
  const osPeriode  = m?.P?.date || new Date().toLocaleDateString("id-ID");
  const osFileBase = () => `OS_Kurang_50_${shortUker(selUker?.nama||"Unit").replace(/[^\w]+/g,"_")}_${new Date().toISOString().slice(0,10)}`;

  const osExportExcel = () => {
    const cols=osCols, nC=cols.length, rows=unitDebitur;
    const aoa=[];
    aoa.push([`Debitur OS < 50% Plafon — ${shortUker(selUker?.nama||"")}`]);
    aoa.push([`Periode ${osPeriode} · ${fNum(rows.length)} debitur`]);
    aoa.push([]);
    const hR=3;
    aoa.push(cols.map(c=>c.label));
    rows.forEach(g=> aoa.push(cols.map(c=>c.get(g))));
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"]=cols.map(c=>({ wch: c.key==="nama"?26 : c.key==="ao"?20 : c.key==="cif"?12 : (c.key==="os"||c.key==="plafon")?14 : 11 }));
    ws["!merges"]=[{s:{r:0,c:0},e:{r:0,c:nC-1}},{s:{r:1,c:0},e:{r:1,c:nC-1}}];
    const thin=(rgb)=>({style:"thin",color:{rgb}});
    const border={top:thin("E5E7EB"),bottom:thin("E5E7EB"),left:thin("E5E7EB"),right:thin("E5E7EB")};
    if(ws["A1"]) ws["A1"].s={ font:{bold:true,sz:13,color:{rgb:"1B2A6E"}} };
    if(ws["A2"]) ws["A2"].s={ font:{sz:10,color:{rgb:"6B7280"}} };
    for(let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r:hR,c}); if(ws[a]) ws[a].s={ fill:{patternType:"solid",fgColor:{rgb:M_NAVY}}, font:{bold:true,color:{rgb:"FFFFFF"},sz:10}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border }; }
    rows.forEach((g,ri)=>{ const bg=ri%2?"F4F7FB":"FFFFFF";
      for(let c=0;c<nC;c++){ const col=cols[c]; const ad=XLSX.utils.encode_cell({r:hR+1+ri,c}); if(!ws[ad]) continue;
        const st={ fill:{patternType:"solid",fgColor:{rgb:bg}}, font:{sz:10,color:{rgb:"344054"}}, alignment:{horizontal:col.align,vertical:"center"}, border };
        if(col.key==="dpd"){ st.font.color={rgb:dpdHex(g.dpd||0)}; st.font.bold=true; }
        if(col.key==="restruk" && g.flagRestruk==='Y'){ st.font.color={rgb:"B45309"}; st.font.bold=true; }
        ws[ad].s=st;
        if(col.type==="num") ws[ad].z = col.key==="pct" ? '0.0' : '#,##0';
      }
    });
    ws["!rows"]=[{hpt:20},{hpt:14},{hpt:6},{hpt:22}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"OS Kurang 50");
    XLSX.writeFile(wb, osFileBase()+".xlsx");
  };

  const osExportPDF = () => {
    const cols=osCols, rows=unitDebitur;
    const doc=new jsPDF({ orientation:"landscape", unit:"pt", format:"a4" });
    doc.setFontSize(13); doc.setTextColor(27,42,110); doc.text(`Debitur OS < 50% Plafon — ${shortUker(selUker?.nama||"")}`, 40, 40);
    doc.setFontSize(9);  doc.setTextColor(120,120,120); doc.text(`Periode ${osPeriode} · ${fNum(rows.length)} debitur`, 40, 56);
    autoTable(doc, {
      startY:70, showHead:"everyPage",
      head:[cols.map(c=>c.label)],
      body: rows.map(g=>cols.map(c=> c.type==="num" ? Number(c.get(g)).toLocaleString("en-US") : String(c.get(g)))),
      styles:{ fontSize:8.5, cellPadding:4, lineColor:[229,231,235], lineWidth:0.5, valign:"middle" },
      headStyles:{ fillColor:hexRGB(M_NAVY), textColor:255, fontStyle:"bold", halign:"center" },
      alternateRowStyles:{ fillColor:[244,247,251] },
      columnStyles: Object.fromEntries(cols.map((c,i)=>[i,{ halign:c.align }])),
      margin:{ left:40, right:40 },
      didParseCell:(dc)=>{ if(dc.section!=="body") return; const col=cols[dc.column.index]; const g=rows[dc.row.index]; if(!g) return;
        if(col.key==="dpd"){ dc.cell.styles.textColor=hexRGB(dpdHex(g.dpd||0)); dc.cell.styles.fontStyle="bold"; }
        if(col.key==="restruk" && g.flagRestruk==='Y'){ dc.cell.styles.textColor=hexRGB("B45309"); dc.cell.styles.fontStyle="bold"; }
      },
    });
    doc.save(osFileBase()+".pdf");
  };

  // --- Filter per-kolom (gaya tabel terbaru) ---
  const hSelSt = { width:"100%", padding:"3px 4px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.textMd, cursor:"pointer", boxSizing:"border-box" };
  const hInpSt = { width:"100%", padding:"3px 6px", border:`1px solid ${C.border}`, borderRadius:5, fontSize:11, background:C.white, color:C.text, boxSizing:"border-box" };
  const filtTh = { padding:"5px 6px", background:C.grayLt, borderBottom:`1px solid ${C.border}`, position:"sticky", top:34, zIndex:5 };
  const onF = (fn)=>(e)=>{ fn(e.target.value); setDebPage(1); };
  const sortOpts = [{ value:"", label:"Default" },{ value:"desc", label:"Terbesar" },{ value:"asc", label:"Terkecil" }];
  const colSortVal = (col)=> sortBy===`${col}-desc` ? "desc" : sortBy===`${col}-asc` ? "asc" : "";
  const setColSort = (col)=>(e)=>{ const v=e.target.value; setSortBy(v?`${col}-${v}`:"default"); setDebPage(1); };
  const osKolOpts = ["semua","1","2A","2B","3","4","5"].map(v=>({ value:v, label:v==="semua"?"Semua Kol":`Kol ${v}` }));
  const anyOsFilter = osCari || osSektorF!=="semua" || osKolF!=="semua" || restrukFilter!=="semua" || sortBy!=="os-asc";

  if (!selUker) return (
    <div>
      {osFiltered.length === 0 && (
        <div style={{ ...card, textAlign:"center", padding:32, color:C.gray }}>
          <div style={{ fontSize:16, marginBottom:8 }}>Belum ada data plafon</div>
          <div style={{ fontSize:13 }}>Upload ulang file LW321 agar kolom plafon tersimpan ke database.</div>
        </div>
      )}
      {unitList.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:16 }}>
          {unitList.map(u => (
            <div key={u.kode} onClick={()=>setSelUker(u)} style={{ ...card, cursor:"pointer", transition:"box-shadow .15s" }}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow=card.boxShadow}>
              <div style={{ fontWeight:700, fontSize:14, color:C.navy, marginBottom:4 }}>{shortUker(u.nama)}</div>
              <div style={{ fontSize:12, color:C.gray, marginBottom:12 }}>{u.kode}</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, color:C.text }}>{fNum(u.items.length)} debitur OS &lt; 50%</span>
                <span style={{ fontSize:13, fontWeight:600, color:C.amber }}>{fJt(u.totalOs)} Jt</span>
              </div>
              <div style={{ height:4, borderRadius:2, background:C.border, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100, u.totalOs/u.totalPlafon*100)}%`, background:C.amber, borderRadius:2 }} />
              </div>
              <div style={{ fontSize:11, color:C.gray, marginTop:4, textAlign:"right" }}>Rata-rata OS/Plafon: {(u.totalOs/u.totalPlafon*100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <button onClick={()=>setSelUker(null)} style={{ ...pgBtn(false), padding:"6px 12px" }}>← Kembali</button>
        <span style={{ fontWeight:700, fontSize:15, color:C.navy }}>{shortUker(selUker.nama)}</span>
        <span style={{ fontSize:12, color:C.gray }}>{selUker.kode} · {fNum(unitDebitur.length)} nasabah OS &lt; 50% plafon</span>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap", gap:8 }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Debitur OS &lt; 50% Plafon</div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {anyOsFilter && <button onClick={resetOsFilters} style={{ fontSize:12, color:C.navy, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>Reset Filter</button>}
            <span style={{ fontSize:12.5, color:C.gray, marginRight:2 }}>{fNum(unitDebitur.length)} debitur</span>
            <button onClick={osExportExcel} style={dlBtn(C.kpiGreen)}><Ic n="download" size={14} /> Excel</button>
            <button onClick={osExportPDF}   style={dlBtn(C.kpiRed)}><Ic n="download" size={14} /> PDF</button>
          </div>
        </div>
        <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"64vh" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
            <colgroup>{[86,170,124,98,112,96,104,64,80,66].map((cw,i)=><col key={i} style={{ width:cw }} />)}</colgroup>
            <thead>
              <tr>
                <th style={navyTh()}>CIF</th>
                <th style={navyTh()}>Nama Debitur</th>
                <th style={navyTh()}>RM/Mantri</th>
                <th style={navyTh()}>Sektor</th>
                <th style={navyTh("right")}>Outstanding</th>
                <th style={navyTh("right")}>Plafon</th>
                <th style={navyTh("right")}>OS / Plafon</th>
                <th style={navyTh("center")}>Kol</th>
                <th style={navyTh("center")}>Restruk</th>
                <th style={navyTh("center")}>DPD</th>
              </tr>
              <tr>
                <th style={filtTh}></th>
                <th style={filtTh}><input value={osCari} onChange={onF(setOsCari)} placeholder="Cari nama/CIF…" style={hInpSt} /></th>
                <th style={filtTh}></th>
                <th style={filtTh}><select value={osSektorF} onChange={onF(setOsSektorF)} style={hSelSt}><option value="semua">Semua Sektor</option>{osSektorList.map(s=><option key={s} value={s}>{s}</option>)}</select></th>
                <th style={filtTh}><select value={colSortVal("os")}     onChange={setColSort("os")}     style={hSelSt}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={colSortVal("plafon")} onChange={setColSort("plafon")} style={hSelSt}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={colSortVal("pct")}    onChange={setColSort("pct")}    style={hSelSt}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={osKolF} onChange={onF(setOsKolF)} style={hSelSt}>{osKolOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
                <th style={filtTh}><select value={restrukFilter} onChange={onF(setRestrukFilter)} style={hSelSt}><option value="semua">Semua</option><option value="Y">Y</option><option value="N">N</option></select></th>
                <th style={filtTh}><select value={colSortVal("dpd")}    onChange={setColSort("dpd")}    style={hSelSt}>{sortOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((g, ri) => {
                const multi = g.loans.length > 1;
                const cifExp = expandedCifs.has(g.cif);
                const plf = sumPlafon(g);
                const rows = [];
                rows.push(
                  <tr key={g.cif} onClick={()=>{ multi ? toggleCif(g.cif) : toggleLoan(g.cif+"-0"); }}
                    style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}
                    onMouseEnter={e=>{ e.currentTarget.style.filter="brightness(0.97)"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}>
                    <td style={{ padding:"9px 12px", color:C.textMd, whiteSpace:"nowrap" }}>{g.cif}</td>
                    <td style={{ padding:"9px 12px", fontWeight:500, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      <span style={{ marginRight:6, color:C.gray, fontSize:10 }}>{multi ? (cifExp?"▾":"▸") : ""}</span>
                      {g.nama}
                      {multi && <span style={{ marginLeft:6, fontSize:10, background:C.navyLt, color:C.navy, borderRadius:4, padding:"1px 5px", fontWeight:600 }}>{g.loans.length} pinjaman</span>}
                    </td>
                    <td style={{ padding:"9px 12px", color:C.textMd, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.ao}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.sektor}</td>
                    <td style={{ padding:"9px 12px", fontWeight:600, color:C.amber, textAlign:"right", whiteSpace:"nowrap" }}>{fJt(g.totalOsJt)}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"right", whiteSpace:"nowrap" }}>{fJt(plf)}</td>
                    <td style={{ padding:"9px 12px", textAlign:"right" }}>{pctBadge(g.totalOsJt, plf)}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd, textAlign:"center" }}>{g.kol}</td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>
                      {g.flagRestruk === 'Y'
                        ? <span style={{ fontSize:10.5, fontWeight:700, color:C.amber, background:C.amberLt, padding:"2px 7px", borderRadius:4 }}>Y</span>
                        : <span style={{ fontSize:10.5, color:C.gray }}>N</span>}
                    </td>
                    <td style={{ padding:"9px 12px", textAlign:"center", color:g.dpd>30?C.red:g.dpd>0?C.amber:C.green, fontWeight:600 }}>{g.dpd}</td>
                  </tr>
                );
                if (multi && cifExp) {
                  g.loans.forEach((loan, li) => {
                    const lkey = `${g.cif}-${li}`;
                    const lExp = expandedLoan === lkey;
                    rows.push(
                      <tr key={lkey} onClick={()=>toggleLoan(lkey)}
                        style={{ background:"#FFF7ED", borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                        <td style={{ padding:"7px 12px 7px 24px", color:C.navy, fontWeight:500, fontSize:12, whiteSpace:"nowrap" }}>
                          <span style={{ fontSize:10, color:C.gray, marginRight:6 }}>↳</span>Pinjaman {li+1}
                        </td>
                        <td style={{ padding:"7px 12px", fontSize:12 }}></td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{loan.ao}</td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{loan.sektor}</td>
                        <td style={{ padding:"7px 12px", fontWeight:600, color:C.amber, fontSize:12, textAlign:"right", whiteSpace:"nowrap" }}>{fJt(loan.osJt)}</td>
                        <td style={{ padding:"7px 12px", color:C.textMd, fontSize:12, textAlign:"right", whiteSpace:"nowrap" }}>{fJt(loan.plafonJt)}</td>
                        <td style={{ padding:"7px 12px", fontSize:12, textAlign:"right" }}>{pctBadge(loan.osJt, loan.plafonJt)}</td>
                        <td style={{ padding:"7px 12px", fontSize:12, color:C.textMd, textAlign:"center" }}>{loan.kol}</td>
                        <td style={{ padding:"7px 12px", textAlign:"center" }}>
                          {loan.flagRestruk === 'Y'
                            ? <span style={{ fontSize:10, fontWeight:700, color:C.amber, background:C.amberLt, padding:"2px 6px", borderRadius:4 }}>Y</span>
                            : <span style={{ fontSize:10, color:C.gray }}>N</span>}
                        </td>
                        <td style={{ padding:"7px 12px", fontSize:12, textAlign:"center", color:loan.dpd>30?C.red:loan.dpd>0?C.amber:C.green, fontWeight:600 }}>{loan.dpd}</td>
                      </tr>
                    );
                    if (lExp) rows.push(<BreakdownRow key={lkey+"-exp"} d={loan} colSpan={10} />);
                  });
                }
                if (!multi && expandedLoan === g.cif+"-0") {
                  rows.push(<BreakdownRow key={g.cif+"-exp"} d={g.loans[0]} colSpan={10} />);
                }
                return rows;
              })}
              {unitDebitur.length === 0 && (
                <tr><td colSpan={10} style={{ padding:24, textAlign:"center", color:C.gray }}>Tidak ada debitur OS &lt; 50% di unit ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {unitDebitur.length > 0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:C.gray }}>Menampilkan {(pg-1)*PER_PAGE+1}–{Math.min(pg*PER_PAGE,unitDebitur.length)} dari {fNum(unitDebitur.length)}</span>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <button onClick={()=>setDebPage(p=>Math.max(1,p-1))} disabled={pg<=1} style={pgBtn(pg<=1)}>‹ Prev</button>
              <span style={{ fontSize:12.5, color:C.textMd }}>Hal {pg} / {totalPage}</span>
              <button onClick={()=>setDebPage(p=>Math.min(totalPage,p+1))} disabled={pg>=totalPage} style={pgBtn(pg>=totalPage)}>Next ›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Kartu upload multi-file: antrean beberapa file, tiap file punya tanggal sendiri.
// Diproses berurutan (sequential) + jeda kecil antar file agar browser tidak "not responding".
function MultiUploadCard({ jenis, title, dotColor, description, dateHint, canEdit, locked, lockedByTitle, onUpload, onQueueComplete, onActiveChange }) {
  const yest = () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; };
  const [entries,   setEntries]   = useState([]); // { id, file, tgl }
  const [uploading, setUploading] = useState(false);
  const [pct,       setPct]       = useState(0);
  const [pctLabel,  setPctLabel]  = useState('');
  const [err,       setErr]       = useState(null);
  const inputRef = useRef(null);
  const idRef    = useRef(0);

  const disabled = !canEdit || locked;
  const active   = entries.length > 0 || uploading;

  // Laporkan ke induk apakah kartu ini sedang "aktif" (punya antrean / sedang upload) → untuk mutual-exclusive
  useEffect(() => { onActiveChange?.(jenis, active); }, [active, jenis]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (fileList) => {
    if (disabled) return;
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    setErr(null);
    setEntries(prev => [...prev, ...files.map(f => ({ id: ++idRef.current, file: f, tgl: yest() }))]);
    if (inputRef.current) inputRef.current.value = ''; // reset agar file yang sama bisa dipilih lagi
  };
  const removeEntry = (id)    => setEntries(prev => prev.filter(e => e.id !== id));
  const setEntryTgl = (id, v) => setEntries(prev => prev.map(e => e.id === id ? { ...e, tgl: v } : e));

  const doUpload = async () => {
    if (disabled || uploading || !entries.length) return;
    setUploading(true); setErr(null);
    const queue = [...entries];
    const failed = [];
    for (let i = 0; i < queue.length; i++) {
      const e = queue[i];
      setPct(0); setPctLabel(`File ${i+1}/${queue.length}: ${e.file.name}`);
      try {
        await onUpload(e.file, e.tgl, (p, l) => { setPct(p); setPctLabel(`File ${i+1}/${queue.length} · ${e.file.name}${l ? ' — ' + l : ''}`); });
        setEntries(prev => prev.filter(x => x.id !== e.id)); // sukses → keluarkan dari antrean
      } catch (ex) {
        failed.push(`${e.file.name}: ${ex.message || 'gagal diproses'}`);
      }
      await new Promise(r => setTimeout(r, 50)); // beri napas ke event loop (cegah hang)
    }
    setUploading(false); setPct(0); setPctLabel('');
    if (failed.length) setErr(`${failed.length} file gagal:\n${failed.join('\n')}`);
    try { await onQueueComplete?.(); } catch { /* abaikan */ }
  };

  return (
    <div style={{ ...card, padding:20, opacity: locked ? 0.6 : 1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
        <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>{title}</div>
      </div>
      <div style={{ fontSize:12, color:C.gray, marginBottom:12 }}>{description}</div>

      {locked && (
        <div style={{ marginBottom:10, padding:'8px 12px', background:C.amberLt, border:`1px solid ${C.amber}`, borderRadius:7, fontSize:12, color:C.amber }}>
          Selesaikan / kosongkan upload <b>{lockedByTitle || 'yang sedang aktif'}</b> dulu sebelum mengisi yang ini.
        </div>
      )}

      {/* Antrean file — tiap file punya tanggal data sendiri */}
      {entries.map((e, i) => (
        <div key={e.id} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', marginBottom:8, background:C.grayLt }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <Ic n="doc" size={15} />
            <span style={{ fontSize:12.5, color:C.text, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{e.file.name}</span>
            {!uploading && <button onClick={()=>removeEntry(e.id)} title="Hapus dari antrean"
              style={{ border:'none', background:'none', color:C.gray, cursor:'pointer', fontSize:17, lineHeight:1, padding:'0 4px' }}>×</button>}
          </div>
          <label style={{ fontSize:10.5, fontWeight:600, color:C.textMd, display:'block', marginBottom:3 }}>Tanggal Data File{entries.length>1?` #${i+1}`:''}</label>
          <input type="date" value={e.tgl} onChange={ev=>setEntryTgl(e.id, ev.target.value)} disabled={uploading}
            style={{ width:'100%', padding:'6px 9px', border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:12.5, color:C.text, background:C.white, boxSizing:'border-box', outline:'none' }} />
        </div>
      ))}

      {uploading ? (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:12, color:C.textMd, marginBottom:6 }}>{pctLabel || 'Memproses...'}</div>
          <div style={{ background:C.border, borderRadius:99, height:10, overflow:'hidden', marginBottom:5 }}>
            <div style={{ height:'100%', borderRadius:99, background:dotColor, width:`${pct}%`, transition:'width 0.25s ease' }} />
          </div>
          <div style={{ fontSize:12, fontWeight:700, color:dotColor, textAlign:'right' }}>{pct}%</div>
        </div>
      ) : (
        <div onClick={()=>!disabled && inputRef.current?.click()} onDragOver={e=>e.preventDefault()}
          onDrop={e=>{ e.preventDefault(); addFiles(e.dataTransfer.files); }}
          style={{ border:`2px dashed ${err?C.red:C.border}`, borderRadius:8, padding:'14px', textAlign:'center', marginBottom:10,
            color:C.gray, fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', gap:5,
            cursor:disabled?'not-allowed':'pointer', background:disabled?C.grayLt:'transparent' }}>
          <Ic n="upload" size={20} />
          {entries.length ? '+ Tambah file lagi (klik atau drag)' : 'Klik atau drag file Excel (.xlsx) — bisa pilih beberapa'}
        </div>
      )}

      {err && <div style={{ marginBottom:10, padding:'8px 12px', background:C.redLt, border:`1px solid ${C.red}`, borderRadius:7, fontSize:12, color:C.red, whiteSpace:'pre-line' }}>{err}</div>}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <button onClick={doUpload} disabled={disabled||uploading||!entries.length}
          style={{ flex:1, minWidth:140, padding:'9px', background:dotColor, color:C.white, border:'none', borderRadius:7,
            cursor:(!disabled&&entries.length&&!uploading)?'pointer':'not-allowed', fontSize:13, fontWeight:500,
            opacity:(!disabled&&entries.length&&!uploading)?1:.45 }}>
          {uploading ? 'Memproses...' : `Upload & Proses${entries.length?` (${entries.length} file)`:''}`}
        </button>
        {!uploading && (
          <button onClick={()=>!disabled && inputRef.current?.click()} disabled={disabled}
            style={{ padding:'9px 14px', background:C.white, color:dotColor, border:`1.5px solid ${dotColor}`, borderRadius:7,
              cursor:disabled?'not-allowed':'pointer', fontSize:13, fontWeight:600, opacity:disabled?.45:1 }}>+ Tambah</button>
        )}
        {entries.length>0 && !uploading && (
          <button onClick={()=>{ setEntries([]); setErr(null); }}
            style={{ padding:'9px 14px', background:C.white, color:C.gray, border:`1px solid ${C.border}`, borderRadius:7, cursor:'pointer', fontSize:13 }}>Bersihkan</button>
        )}
      </div>

      {dateHint && <div style={{ fontSize:11, color:C.gray, marginTop:8 }}>{dateHint}</div>}

      <input ref={inputRef} type="file" accept=".xlsx,.xls" multiple style={{ display:'none' }} onChange={e=>addFiles(e.target.files)} />
    </div>
  );
}

function Pengaturan({ perms, onUpload, onReset, onDataChanged, onUploadCkpn, onUploadRecPh }) {
  const w = useWindowWidth();
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);
  const [selected,    setSelected]    = useState(() => new Set()); // id upload yang dicentang
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // Hanya satu jenis yang boleh punya antrean upload pada satu waktu (mutual-exclusive)
  const [activeJenis, setActiveJenis] = useState(null);
  const handleActive = (jenis, isActive) => setActiveJenis(prev => isActive ? jenis : (prev === jenis ? null : prev));
  const UPLOAD_TITLES = { lw321:'LW321 — Data Aktif', ckpn:'CKPN per Unit Kerja', rec_ph:'Recovery PH — Rincian Debitur' };

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const { data } = await fetchUploads({ order: 'desc' });
      setHistory(data || []);
      setSelected(new Set()); // reset centang setiap kali data dimuat ulang
    } finally { setHistLoading(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (up) => {
    if (!window.confirm(`Hapus upload "${up.periode_label}" (${Number(up.row_count).toLocaleString("id-ID")} debitur)?\n\nSemua data debitur dari upload ini akan ikut terhapus.`)) return;
    setDeletingId(up.id);
    try {
      await deleteUpload(up.id);
      await loadHistory();
      if (onDataChanged) await onDataChanged();
    } finally { setDeletingId(null); }
  };

  // Hapus beberapa / semua upload sekaligus (sekuensial agar cascade DB tidak kebanjiran)
  const deleteMany = async (ups) => {
    if (!ups.length) return;
    const totalDeb = ups.reduce((s,u)=>s+(Number(u.row_count)||0),0);
    if (!window.confirm(`Hapus ${ups.length} upload (${totalDeb.toLocaleString("id-ID")} debitur)?\n\nSemua data debitur dari upload-upload ini akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.`)) return;
    setBulkDeleting(true);
    try {
      for (const up of ups) await deleteUpload(up.id);
      await loadHistory();
      if (onDataChanged) await onDataChanged();
    } finally { setBulkDeleting(false); }
  };
  const handleDeleteSelected = () => deleteMany(history.filter(u => selected.has(u.id)));
  const handleDeleteAll      = () => deleteMany(history);

  const toggleSel = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = history.length > 0 && selected.size === history.length;
  const toggleSelAll = () => setSelected(allSelected ? new Set() : new Set(history.map(u=>u.id)));
  const cols3 = w >= 1200 ? "1fr 1fr 1fr" : w >= 900 ? "1fr 1fr" : "1fr";
  const canEdit = perms?.editData;
  const lockedFor = (jenis) => activeJenis && activeJenis !== jenis;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {!canEdit && (
        <div style={{ ...card, background:C.amberLt, color:C.amber, fontSize:12.5, display:"flex", alignItems:"center", gap:8 }}>
          <Ic n="infoCircle" size={16} /> Mode lihat — hanya Admin IT yang dapat mengupload file LW321 & CKPN.
        </div>
      )}
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 0" }}><CardTitle>Daftar Unit Kerja — BO Polewali</CardTitle></div>
        <div style={{ maxHeight:300, overflowY:"auto", overflowX:"auto" }}>
          <Tabel stickyHeader headers={["No","Kode Uker","Nama Unit Kerja","Tipe"]} colW={[50,110,"auto",90]}
            rows={UKER.map((u,i)=>[i+1, <b style={{ color:C.navy }}>{u.kode}</b>, u.nama, u.tipe])} />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:cols3, gap:12 }}>

        <MultiUploadCard
          jenis="lw321" title="LW321 — Data Aktif" dotColor={C.green}
          description="Upload file LW321 harian · Header baris ke-4 · Data tersedia H+1 · bisa beberapa file sekaligus"
          dateHint="Tiap file punya tanggal sendiri — pilih tanggal data di dalam file (bukan tanggal upload)"
          canEdit={canEdit} locked={lockedFor('lw321')} lockedByTitle={UPLOAD_TITLES[activeJenis]}
          onUpload={onUpload} onActiveChange={handleActive}
          onQueueComplete={async ()=>{ await loadHistory(); if (onDataChanged) await onDataChanged(); }}
        />

        <MultiUploadCard
          jenis="ckpn" title="CKPN per Unit Kerja" dotColor={C.kpiPurple}
          description="Upload bulanan bersamaan Recovery PH. File BIAYA_CKPN_UKER.xlsx dari sistem BRI."
          canEdit={canEdit} locked={lockedFor('ckpn')} lockedByTitle={UPLOAD_TITLES[activeJenis]}
          onUpload={onUploadCkpn} onActiveChange={handleActive}
          onQueueComplete={async ()=>{ await loadHistory(); }}
        />

        <MultiUploadCard
          jenis="rec_ph" title="Recovery PH — Rincian Debitur" dotColor={C.kpiTeal}
          description="Upload bulanan awal bulan. File Rincian Debitur Recovery Ekstra dan Realisasi PH.xlsx."
          canEdit={canEdit} locked={lockedFor('rec_ph')} lockedByTitle={UPLOAD_TITLES[activeJenis]}
          onUpload={onUploadRecPh} onActiveChange={handleActive}
          onQueueComplete={async ()=>{ await loadHistory(); }}
        />

      </div>

      {/* Riwayat Upload */}
      {canEdit && (
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.3 }}>Riwayat Upload Database</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {selected.size > 0 && (
                <button onClick={handleDeleteSelected} disabled={bulkDeleting}
                  style={{ fontSize:12, color:C.white, background:C.red, border:`1px solid ${C.red}`, borderRadius:6, padding:"5px 12px", cursor:"pointer", fontWeight:600, opacity:bulkDeleting?.6:1 }}>
                  {bulkDeleting ? "Menghapus..." : `Hapus Terpilih (${selected.size})`}
                </button>
              )}
              {history.length > 0 && (
                <button onClick={handleDeleteAll} disabled={bulkDeleting}
                  style={{ fontSize:12, color:C.red, background:C.redLt, border:`1px solid ${C.red}`, borderRadius:6, padding:"5px 12px", cursor:"pointer", fontWeight:500, opacity:bulkDeleting?.6:1 }}>
                  Hapus Semua
                </button>
              )}
              <button onClick={loadHistory} disabled={bulkDeleting} style={{ fontSize:12, color:C.gray, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 10px", cursor:"pointer", opacity:bulkDeleting?.6:1 }}>
                {histLoading ? "Memuat..." : "Refresh"}
              </button>
            </div>
          </div>
          {histLoading && !history.length ? (
            <div style={{ padding:"24px", textAlign:"center", color:C.gray, fontSize:13 }}>Memuat riwayat...</div>
          ) : !history.length ? (
            <div style={{ padding:"24px", textAlign:"center", color:C.gray, fontSize:13 }}>Belum ada data upload</div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:C.grayLt }}>
                    <th style={{ padding:"9px 0 9px 14px", width:34, borderBottom:`1px solid ${C.border}` }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleSelAll} disabled={bulkDeleting}
                        ref={el => { if (el) el.indeterminate = selected.size > 0 && !allSelected; }}
                        title="Pilih semua" style={{ cursor:"pointer" }} />
                    </th>
                    {["Jenis","Tanggal Data","Periode","Jumlah Debitur","Diupload Oleh","Waktu Upload",""].map((h,i)=>(
                      <th key={i} style={{ padding:"9px 14px", color:C.gray, fontWeight:600, fontSize:11, textTransform:"uppercase",
                        textAlign:i===5||i===3?"right":"left", whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const latestTgl = {};
                    history.forEach(up => {
                      if (!latestTgl[up.jenis] || up.tgl_file > latestTgl[up.jenis]) latestTgl[up.jenis] = up.tgl_file;
                    });
                    return history.map((up, i) => {
                      const isActive = latestTgl[up.jenis] === up.tgl_file;
                      const isSel = selected.has(up.id);
                      return (
                        <tr key={up.id} style={{ background: isSel ? C.navyLt : (i%2===0?C.white:C.grayLt), borderBottom:`1px solid ${C.border}` }}>
                          <td style={{ padding:"10px 0 10px 14px" }}>
                            <input type="checkbox" checked={isSel} onChange={()=>toggleSel(up.id)} disabled={bulkDeleting} style={{ cursor:"pointer" }} />
                          </td>
                          <td style={{ padding:"10px 14px", fontWeight:600, color:C.navy, textTransform:"uppercase", fontSize:12 }}>
                            {up.jenis}
                            {isActive && <span style={{ marginLeft:6, fontSize:10, background:C.greenLt, color:C.green, border:`1px solid ${C.green}`, borderRadius:4, padding:"1px 5px" }}>Aktif</span>}
                          </td>
                          <td style={{ padding:"10px 14px", color:C.text }}>{up.tgl_file ? up.tgl_file.slice(0,10).split('-').reverse().join('/') : '-'}</td>
                          <td style={{ padding:"10px 14px", color:C.text }}>{up.periode_label}</td>
                          <td style={{ padding:"10px 14px", color:C.text, textAlign:"right" }}>{Number(up.row_count).toLocaleString("id-ID")}</td>
                          <td style={{ padding:"10px 14px", color:C.gray, fontFamily:"monospace", fontSize:12 }}>{up.uploaded_by || "-"}</td>
                          <td style={{ padding:"10px 14px", color:C.gray, textAlign:"right", fontSize:12 }}>
                            {new Date(up.created_at).toLocaleString("id-ID",{ dateStyle:"short", timeStyle:"short" })}
                          </td>
                          <td style={{ padding:"10px 14px", textAlign:"center" }}>
                            <button onClick={()=>handleDelete(up)} disabled={deletingId===up.id || bulkDeleting}
                              style={{ padding:"5px 12px", background:C.redLt, color:C.red, border:`1px solid ${C.red}`,
                                borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:500, opacity:(deletingId===up.id||bulkDeleting)?.5:1 }}>
                              {deletingId===up.id ? "Menghapus..." : "Hapus"}
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManajemenUser({ currentUser }) {
  const [users,   setUsers]   = useState(null); // null = memuat
  const [loadErr, setLoadErr] = useState("");
  const [formOpen, setFormOpen]  = useState(false);
  const [editId,   setEditId]    = useState(null);
  const emptyForm = { nama:"", pn:"", username:"", password:"", role:"mb", uker:"", aoId:"", aktif:true };
  const [form, setForm] = useState(emptyForm);
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoadErr("");
    const { data, error } = await fetchUsers();
    if (error) { setLoadErr(error.message || "Gagal memuat daftar user"); setUsers([]); return; }
    setUsers(data || []);
  };
  useEffect(() => { load(); }, []);

  const isSuperAdmin = currentUser?.role === "superadmin";

  // Superadmin bisa kelola semua role. Admin IT hanya bisa kelola di bawahnya.
  const ROLE_OPT = isSuperAdmin
    ? [
        { value:"mb",         label:"Manajer Bisnis" },
        { value:"kepalaUnit", label:"Kepala Unit" },
        { value:"pinca",      label:"Pimpinan Cabang" },
        { value:"admin",      label:"Admin IT" },
      ]
    : [
        { value:"mb",         label:"Manajer Bisnis" },
        { value:"kepalaUnit", label:"Kepala Unit" },
        { value:"pinca",      label:"Pimpinan Cabang" },
      ];

  const ROLE_COLOR = { pinca:C.kpiBlue, mb:C.kpiPurple, kepalaUnit:C.kpiTeal, admin:C.gray, superadmin:"#92400E" };
  const ROLE_LABEL = { pinca:"Pimpinan Cabang", mb:"Manajer Bisnis", kepalaUnit:"Kepala Unit", admin:"Admin IT", superadmin:"Super Admin IT" };

  // Akun dilindungi (tidak bisa disentuh role saat ini)
  const isProtected = (u) => u.role === "superadmin" || (!isSuperAdmin && u.role === "admin");

  const autoUser = (nama) => {
    const p = nama.trim().toLowerCase().split(/\s+/);
    return p.length >= 2 ? `${p[0]}.${p[p.length-1]}` : p[0] || "";
  };

  const needUker  = !["mb","admin","superadmin","pinca"].includes(form.role);

  const openNew  = () => { setEditId(null); setForm(emptyForm); setErr(""); setFormOpen(true); };
  const openEdit = (u) => {
    if (isProtected(u)) return;
    setEditId(u.id);
    setForm({ nama:u.nama, pn:u.pn||"", username:u.username, password:"", role:u.role, uker:u.uker||"", aoId:u.ao_id||"", aktif:!!u.aktif });
    setErr(""); setFormOpen(true);
  };
  const cancel = () => { setFormOpen(false); setEditId(null); setErr(""); };

  const toggle = async (u) => {
    if (isProtected(u) || busy) return;
    setBusy(true); setLoadErr("");
    const { data, error } = await updateUser(u.id, { aktif: u.aktif ? 0 : 1 });
    setBusy(false);
    if (error) { setLoadErr(error.message || "Gagal mengubah status akun"); return; }
    if (data) setUsers(prev => (prev||[]).map(x => x.id===u.id ? data : x));
  };

  const save = async () => {
    if (busy) return;
    if (!form.nama.trim() || !form.pn.trim() || !form.username.trim()) { setErr("Nama, PN, dan username wajib diisi."); return; }
    if (!editId && !form.password.trim()) { setErr("Password wajib diisi untuk akun baru."); return; }
    if (needUker && !form.uker) { setErr("Pilih unit kerja terlebih dahulu."); return; }
    setBusy(true); setErr("");
    if (editId) {
      const patch = { nama:form.nama.trim(), role:form.role, uker:needUker?form.uker:null, ao_id:null, aktif:form.aktif?1:0 };
      if (form.password.trim()) patch.password = form.password.trim();
      const { data, error } = await updateUser(editId, patch);
      setBusy(false);
      if (error) { setErr(error.message || "Gagal menyimpan perubahan."); return; }
      if (data) setUsers(prev => (prev||[]).map(u => u.id===editId ? data : u));
    } else {
      const { data, error } = await createUser({ pn:form.pn.trim(), nama:form.nama.trim(), username:form.username.trim(), password:form.password, role:form.role, uker:needUker?form.uker:null });
      setBusy(false);
      if (error) { setErr(error.message || "Gagal membuat akun."); return; }
      if (data) setUsers(prev => [...(prev||[]), data]);
    }
    cancel();
  };

  const lbl = { fontSize:12, fontWeight:600, color:C.textMd, display:"block", marginBottom:5 };
  const inp = { padding:"9px 11px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.text, width:"100%", boxSizing:"border-box", outline:"none", background:C.white };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Header bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:13, color:C.gray }}>
          {users === null ? "Memuat…" : <>
            {users.length} akun &nbsp;·&nbsp; <span style={{ color:C.green, fontWeight:600 }}>{users.filter(u=>u.aktif).length} aktif</span>
            {users.filter(u=>!u.aktif).length > 0 && <span style={{ color:C.gray }}> &nbsp;·&nbsp; {users.filter(u=>!u.aktif).length} nonaktif</span>}
          </>}
          {loadErr && <span style={{ color:C.red, marginLeft:10 }}>· {loadErr}</span>}
        </div>
        {!formOpen && (
          <button onClick={openNew}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:C.navy, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            <span style={{ fontSize:17, lineHeight:1 }}>+</span> Tambah Akun
          </button>
        )}
      </div>

      {/* Form inline */}
      {formOpen && (
        <div style={{ ...card, border:`1.5px solid ${C.navy}40`, padding:"20px 22px" }}>
          <div style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:18 }}>
            {editId ? "Edit Akun" : "Tambah Akun Baru"}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px 16px" }}>
            <div>
              <label style={lbl}>Nama Lengkap</label>
              <input style={inp} value={form.nama}
                onChange={e=>{ const v=e.target.value; setForm(f=>({ ...f, nama:v, username:editId?f.username:autoUser(v) })); setErr(""); }}
                placeholder="Nama lengkap pegawai" />
            </div>
            <div>
              <label style={lbl}>PN (Nomor Pegawai)</label>
              <input style={{ ...inp, ...(editId?{ background:C.grayLt, color:C.gray, cursor:"not-allowed" }:{}) }}
                value={form.pn} disabled={!!editId}
                onChange={e=>{ setForm(f=>({ ...f, pn:e.target.value.replace(/\s/g,"") })); setErr(""); }}
                placeholder="contoh: 90188658" />
              {editId && <div style={{ fontSize:10.5, color:C.gray, marginTop:3 }}>PN tak bisa diubah (dipakai untuk login)</div>}
            </div>
            <div>
              <label style={lbl}>Username</label>
              <input style={{ ...inp, ...(editId?{ background:C.grayLt, color:C.gray, cursor:"not-allowed" }:{}) }}
                value={form.username} disabled={!!editId}
                onChange={e=>{ setForm(f=>({ ...f, username:e.target.value })); setErr(""); }}
                placeholder="contoh: budi.santoso" />
            </div>
            <div>
              <label style={lbl}>Password{editId && " (opsional)"}</label>
              <input style={inp} type="text" value={form.password} onChange={e=>{ setForm(f=>({ ...f, password:e.target.value })); setErr(""); }}
                placeholder={editId ? "Kosongkan bila tidak diganti" : "min. 6 karakter"} />
            </div>
            <div>
              <label style={lbl}>Role</label>
              <select style={inp} value={form.role}
                onChange={e=>{ setForm(f=>({ ...f, role:e.target.value, uker:"", aoId:"" })); setErr(""); }}>
                {ROLE_OPT.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {needUker && (
              <div>
                <label style={lbl}>Unit Kerja</label>
                <select style={inp} value={form.uker}
                  onChange={e=>{ setForm(f=>({ ...f, uker:e.target.value, aoId:"" })); setErr(""); }}>
                  <option value="">— Pilih Unit Kerja —</option>
                  {UKER.map(u=><option key={u.kode} value={u.kode}>{u.nama}</option>)}
                </select>
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:8, paddingTop:18 }}>
              <input type="checkbox" id="f-aktif" checked={form.aktif}
                onChange={e=>setForm(f=>({ ...f, aktif:e.target.checked }))}
                style={{ width:16, height:16, cursor:"pointer" }} />
              <label htmlFor="f-aktif" style={{ fontSize:13, color:C.textMd, cursor:"pointer" }}>Akun aktif</label>
            </div>
          </div>
          {err && <div style={{ marginTop:12, fontSize:12.5, color:C.red, background:C.redLt, padding:"8px 12px", borderRadius:7 }}>{err}</div>}
          <div style={{ display:"flex", gap:8, marginTop:18 }}>
            <button onClick={save} disabled={busy}
              style={{ padding:"8px 20px", background:C.navy, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:busy?"default":"pointer", opacity:busy?.7:1 }}>
              {busy ? "Menyimpan…" : (editId ? "Simpan Perubahan" : "Tambah Akun")}
            </button>
            <button onClick={cancel}
              style={{ padding:"8px 16px", background:C.grayLt, color:C.textMd, border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, cursor:"pointer" }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Tabel */}
      <div style={{ ...card, padding:0, overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:C.grayLt }}>
              {["Nama","PN","Username","Role","Unit Kerja","Status","Aksi"].map((h,i)=>(
                <th key={i} style={{ padding:"10px 14px", color:C.gray, fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.3, textAlign:"left", borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users === null ? (
              <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Memuat user…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Belum ada user.</td></tr>
            ) : users.map((u,i)=>{
              const roleColor = ROLE_COLOR[u.role] || C.gray;
              return (
                <tr key={u.id} style={{ background:i%2===0?C.white:"#FAFBFD", borderBottom:`1px solid #F1F3F6`, opacity:u.aktif?1:.6 }}>
                  <td style={{ padding:"10px 14px", fontWeight:600, color:C.text, whiteSpace:"nowrap" }}>{u.nama}</td>
                  <td style={{ padding:"10px 14px", fontFamily:"monospace", fontSize:12, color:C.navy }}>{u.pn||"—"}</td>
                  <td style={{ padding:"10px 14px", color:C.textMd }}>{u.username}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:"2px 10px", borderRadius:20, background:roleColor+"22", color:roleColor }}>
                      {ROLE_LABEL[u.role]||u.role}
                    </span>
                  </td>
                  <td style={{ padding:"10px 14px", color:C.gray, fontSize:12.5 }}>
                    {u.uker ? (UKER.find(uk=>uk.kode===u.uker)?.nama||u.uker) : <span style={{ color:C.border }}>Semua Unit</span>}
                  </td>
                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                    {u.aktif
                      ? <span style={{ fontSize:12, fontWeight:600, color:C.green }}>● Aktif</span>
                      : <span style={{ fontSize:12, fontWeight:600, color:C.gray  }}>○ Nonaktif</span>}
                  </td>
                  <td style={{ padding:"10px 14px" }}>
                    {isProtected(u) ? (
                      <span style={{ fontSize:11, color: u.role==="superadmin"?"#92400E":C.gray, fontWeight:600,
                        background: u.role==="superadmin"?"#FEF3C7":"#F3F4F6",
                        padding:"4px 10px", borderRadius:20, whiteSpace:"nowrap" }}>
                        {u.role==="superadmin" ? "⭐ Dilindungi" : "🔒 Hanya Super Admin"}
                      </span>
                    ) : (
                      <div style={{ display:"flex", gap:6, whiteSpace:"nowrap" }}>
                        <button onClick={()=>openEdit(u)}
                          style={{ padding:"5px 12px", fontSize:12, fontWeight:600, background:C.navyLt, color:C.navy, border:"none", borderRadius:6, cursor:"pointer" }}>
                          Edit
                        </button>
                        <button onClick={()=>toggle(u)} disabled={busy}
                          style={{ padding:"5px 12px", fontSize:12, fontWeight:600, background:u.aktif?C.redLt:C.greenLt, color:u.aktif?C.red:C.green, border:"none", borderRadius:6, cursor:busy?"default":"pointer", opacity:busy?.6:1 }}>
                          {u.aktif?"Nonaktifkan":"Aktifkan"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Export helper: tangkap elemen DOM jadi PDF (multi-halaman A4) ──────────────
async function exportDomToPDF(el, filename, orientation = "portrait") {
  if (!el) return;
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#F1F5F9",
    useCORS: true,
    logging: false,
    // Penting: JANGAN ubah lebar window di clone — biarkan sama dgn layar agar SVG Recharts
    // tetap pas di dalam kartunya (kalau diubah, chart meluber & label terpotong).
    width: el.scrollWidth,
    height: el.scrollHeight,
    onclone: (clonedDoc) => {
      // Klip chart agar tidak keluar dari kotaknya saat di-capture
      const st = clonedDoc.createElement("style");
      st.textContent = ".recharts-responsive-container,.recharts-wrapper,.recharts-surface{overflow:hidden!important}";
      clonedDoc.head.appendChild(st);
    },
  });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = canvas.height * (pageW / canvas.width);
  let heightLeft = imgH, position = 0;
  pdf.addImage(img, "PNG", 0, position, pageW, imgH);
  heightLeft -= pageH;
  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, position, pageW, imgH);
    heightLeft -= pageH;
  }
  pdf.save(filename);
}

// ── Halaman "Buat Laporan": pilih kolom + filter + urutan + jumlah baris → tabel yang bisa diunduh ──
// Nama unit cukup 2 kata (buang akhiran "Polewali"): "Unit Luyo Polewali" → "Unit Luyo".
const shortUker = (s) => String(s||"").trim().split(/\s+/).slice(0,2).join(" ");
const REPORT_COLS = [
  { key:"cif",       label:"CIF",              get:g=>g.cif },
  { key:"nama",      label:"Nama Debitur",     get:g=>g.nama },
  { key:"ukerNama",  label:"Unit Kerja",       get:g=>shortUker(g.ukerNama) },
  { key:"ao",        label:"RM/Mantri",        get:g=>g.ao },
  { key:"pn",        label:"PN",               get:g=>g.pn||"" },
  { key:"segment",   label:"Segment",          get:g=>g.segment },
  { key:"sektor",    label:"Sektor",           get:g=>g.sektor },
  { key:"osJt",      label:"Outstanding (Jt)", get:g=>Math.trunc(g.totalOsJt), num:true },
  { key:"kol",       label:"Kol",              get:g=>g.kol },
  { key:"restruk",   label:"Restruk",          get:g=>g.flagRestruk },
  { key:"dpd",       label:"DPD",              get:g=>g.dpd, num:true },
  { key:"tier",      label:"Status Risiko",    get:g=>risikoLabel[g.tier]||g.tier },
  { key:"tunggakan", label:"Tunggakan (Jt)",   get:g=>Math.trunc(g.tunggakan||0), num:true },
];
const REPORT_DEFAULT = ["cif","nama","ukerNama","ao","osJt","kol","dpd","tier"];

function BuatLaporan({ list }) {
  const w = useWindowWidth();
  const ukerOpts   = UKER.filter(u=>list.some(d=>d.uker===u.kode));
  const sektorOpts = [...new Set(list.map(d=>d.sektor).filter(Boolean))].sort();
  const [cols, setCols]       = useState(REPORT_DEFAULT);
  const [uker, setUker]       = useState("semua");
  const [kol, setKol]         = useState("Semua");
  const [risiko, setRisiko]   = useState("Semua");
  const [sektor, setSektor]   = useState("Semua");
  const [restruk, setRestruk] = useState("Semua");
  const [sortBy, setSortBy]   = useState("os");
  const [limit, setLimit]     = useState("25");
  const [gen, setGen]         = useState(null);

  const toggleCol = (k) => setCols(prev => prev.includes(k) ? prev.filter(x=>x!==k) : [...prev, k]);

  const build = () => {
    let groups = groupByCif(list).map(g => ({ ...g, tunggakan: g.loans.reduce((s,l)=>s+(l.tunggakanTotal||0),0) }));
    groups = groups.filter(g =>
      (kol==="Semua"     || ("Kol "+g.kol)===kol) &&
      (risiko==="Semua"  || (risikoLabel[g.tier]||g.tier)===risiko) &&
      (sektor==="Semua"  || g.loans.some(d=>d.sektor===sektor)) &&
      (restruk==="Semua" || (restruk==="Y" ? g.flagRestruk==="Y" : g.flagRestruk!=="Y"))
    );
    const sortFn = sortBy==="os" ? (a,b)=>b.totalOsJt-a.totalOsJt : sortBy==="dpd" ? (a,b)=>b.dpd-a.dpd : null;
    const lim = limit==="all" ? Infinity : (parseInt(limit)||25);
    const selCols = REPORT_COLS.filter(c=>cols.includes(c.key));
    // Kelompokkan per Unit Kerja mengikuti urutan daftar UKER; top N PER unit.
    const unitList = uker==="semua" ? UKER : UKER.filter(u=>u.kode===uker);
    const blocks = [];
    unitList.forEach(u => {
      let rows = groups.filter(g => g.uker === u.kode);
      if (!rows.length) return;
      if (sortFn) rows = [...rows].sort(sortFn);
      rows = rows.slice(0, lim);
      if (rows.length) blocks.push({ uker: shortUker(rows[0].ukerNama || u.nama), rows, osJt: rows.reduce((s,g)=>s+g.totalOsJt,0) });
    });
    setGen({ selCols, blocks, total: blocks.reduce((s,b)=>s+b.rows.length,0) });
  };

  const stamp = () => new Date().toISOString().slice(0,10);
  // Warna kotak untuk sel kategori: [bgHex, textHex]
  const cellColor = (key, v) => {
    const s = String(v);
    if (key === "tier")
      return { "Risiko Tinggi":["FEE2E2","B91C1C"], "Risiko Sedang":["FEF3C7","B45309"], "Risiko Rendah":["DCFCE7","15803D"] }[s] || null;
    if (key === "kol")
      return ["3","4","5"].includes(s) ? ["FEE2E2","B91C1C"] : ["2A","2B"].includes(s) ? ["FEF3C7","B45309"] : ["DCFCE7","15803D"];
    if (key === "restruk" && s === "Y") return ["FEF3C7","B45309"];
    return null;
  };
  const alignOf = (c) => c.num ? "right" : ["kol","restruk","tier"].includes(c.key) ? "center" : "left";

  const dlExcel = () => {
    if (!gen) return;
    const nC = gen.selCols.length;
    const thin = (rgb)=>({ style:"thin", color:{ rgb } });
    const border = { top:thin("E5E7EB"), bottom:thin("E5E7EB"), left:thin("E5E7EB"), right:thin("E5E7EB") };
    // Susun baris: header kolom, lalu per unit → baris judul unit (merge) + data (top N per unit)
    const aoa = [ gen.selCols.map(c=>c.label) ];
    const meta = [ { type:"header" } ];
    gen.blocks.forEach(b => {
      aoa.push([`${b.uker} — ${b.rows.length} nasabah`, ...Array(nC-1).fill("")]);
      meta.push({ type:"unit" });
      b.rows.forEach(g => { aoa.push(gen.selCols.map(c=>c.get(g))); meta.push({ type:"data", g }); });
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = gen.selCols.map(c=>({ wch: c.num?14 : c.key==="nama"?28 : (c.key==="ukerNama"||c.key==="ao")?20 : 16 }));
    ws["!rows"] = [{ hpt: 22 }];
    ws["!merges"] = [];
    let stripe = 0;
    meta.forEach((mr, r) => {
      if (mr.type === "header") {
        for (let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r,c}); if(ws[a]) ws[a].s = { fill:{patternType:"solid",fgColor:{rgb:"0F2A50"}}, font:{color:{rgb:"FFFFFF"},bold:true,sz:10}, alignment:{horizontal:"center",vertical:"center",wrapText:true}, border }; }
      } else if (mr.type === "unit") {
        ws["!merges"].push({ s:{r,c:0}, e:{r,c:nC-1} });
        for (let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r,c}); if(ws[a]) ws[a].s = { fill:{patternType:"solid",fgColor:{rgb:"DDE7F3"}}, font:{color:{rgb:"0F2A50"},bold:true,sz:10.5}, alignment:{horizontal:"left",vertical:"center"}, border }; }
        stripe = 0;
      } else {
        const bg = stripe++%2===0 ? "FFFFFF" : "F4F7FB";
        for (let c=0;c<nC;c++){
          const col = gen.selCols[c]; const a=XLSX.utils.encode_cell({r,c}); if(!ws[a]) continue;
          const cc = cellColor(col.key, ws[a].v);
          ws[a].s = { fill:{patternType:"solid",fgColor:{rgb: cc?cc[0]:bg}}, font:{sz:10,color:{rgb:cc?cc[1]:"344054"},bold:!!cc}, alignment:{horizontal:alignOf(col),vertical:"center"}, border };
          if (col.num) ws[a].z = "#,##0";
        }
      }
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Debitur");
    XLSX.writeFile(wb, `Laporan_Debitur_${stamp()}.xlsx`);
  };

  const dlPDF = () => {
    if (!gen) return;
    const landscape = gen.selCols.length > 7;
    const doc = new jsPDF({ orientation: landscape?"landscape":"portrait", unit:"pt", format:"a4" });
    doc.setFontSize(13); doc.setTextColor(15,42,80); doc.text("Laporan Daftar Debitur — BO Polewali", 40, 40);
    doc.setFontSize(9);  doc.setTextColor(120,120,120); doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")} · ${gen.total} nasabah`, 40, 56);
    const hexRGB = (h)=>[parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    const nC = gen.selCols.length;
    const body = [];
    gen.blocks.forEach(b => {
      body.push([{ content:`${b.uker} — ${b.rows.length} nasabah`, colSpan:nC, styles:{ fillColor:[221,231,243], textColor:[15,42,80], fontStyle:"bold", halign:"left" } }]);
      b.rows.forEach(g => body.push(gen.selCols.map(c=> c.num ? Number(c.get(g)).toLocaleString("id-ID") : String(c.get(g)))));
    });
    const columnStyles = {};
    gen.selCols.forEach((c,i)=>{ columnStyles[i] = { halign: alignOf(c) }; });
    autoTable(doc, {
      startY: 68,
      head: [gen.selCols.map(c=>c.label)],
      body,
      styles:{ fontSize:8, cellPadding:3, overflow:"linebreak", valign:"middle", lineColor:[229,231,235], lineWidth:0.5 },
      headStyles:{ fillColor:[15,42,80], textColor:255, fontStyle:"bold", halign:"center" },
      columnStyles,
      margin:{ left:40, right:40 },
      didParseCell: (d) => {
        if (d.section !== "body" || d.cell.colSpan > 1) return; // lewati baris judul unit
        const col = gen.selCols[d.column.index];
        if (!col) return;
        const cc = cellColor(col.key, d.cell.raw);
        if (cc) { d.cell.styles.fillColor = hexRGB(cc[0]); d.cell.styles.textColor = hexRGB(cc[1]); d.cell.styles.fontStyle = "bold"; }
      },
    });
    doc.save(`Laporan_Debitur_${stamp()}.pdf`);
  };

  const fld = (label, node) => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:11, fontWeight:600, color:C.textMd }}>{label}</label>
      {node}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={card}>
        <CardTitle>1 · Pilih Kolom yang Ditampilkan</CardTitle>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {REPORT_COLS.map(c=>{
            const on = cols.includes(c.key);
            return (
              <button key={c.key} onClick={()=>toggleCol(c.key)}
                style={{ padding:"6px 12px", borderRadius:20, fontSize:12.5, fontWeight:600, cursor:"pointer",
                  border:`1.5px solid ${on?C.navy:C.border}`, background:on?C.navyLt:C.white, color:on?C.navy:C.gray }}>
                {on?"✓ ":""}{c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <CardTitle>2 · Filter &amp; Urutan</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns: w>=1000?"repeat(4,1fr)":w>=600?"repeat(2,1fr)":"1fr", gap:12 }}>
          {fld("Unit Kerja", <Select value={uker} onChange={e=>setUker(e.target.value)} options={[{value:"semua",label:"Semua Unit Kerja"}, ...ukerOpts.map(u=>({value:u.kode,label:u.nama}))]} />)}
          {fld("Kolektibilitas", <Select value={kol} onChange={e=>setKol(e.target.value)} options={["Semua","Kol 1","Kol 2A","Kol 2B","Kol 3","Kol 4","Kol 5"]} />)}
          {fld("Status Risiko", <Select value={risiko} onChange={e=>setRisiko(e.target.value)} options={["Semua","Risiko Tinggi","Risiko Sedang","Risiko Rendah"]} />)}
          {fld("Sektor", <Select value={sektor} onChange={e=>setSektor(e.target.value)} options={["Semua", ...sektorOpts]} />)}
          {fld("Restruk", <Select value={restruk} onChange={e=>setRestruk(e.target.value)} options={["Semua","Y","N"]} />)}
          {fld("Urutkan", <Select value={sortBy} onChange={e=>setSortBy(e.target.value)} options={[{value:"os",label:"Outstanding tertinggi"},{value:"dpd",label:"DPD tertinggi"},{value:"default",label:"Urutan default"}]} />)}
          {fld("Jumlah baris / unit", <Select value={limit} onChange={e=>setLimit(e.target.value)} options={[{value:"5",label:"5 / unit"},{value:"10",label:"10 / unit"},{value:"25",label:"25 / unit"},{value:"50",label:"50 / unit"},{value:"100",label:"100 / unit"},{value:"all",label:"Semua"}]} />)}
          <div style={{ display:"flex", alignItems:"flex-end" }}>
            <button onClick={build} disabled={cols.length===0}
              style={{ width:"100%", padding:"9px", background:cols.length?C.navy:C.border, color:"#fff", border:"none", borderRadius:7, fontSize:13.5, fontWeight:600, cursor:cols.length?"pointer":"not-allowed" }}>
              Buat Tabel
            </button>
          </div>
        </div>
        {cols.length===0 && <div style={{ fontSize:12, color:C.red, marginTop:8 }}>Pilih minimal satu kolom dulu.</div>}
      </div>

      {gen && (
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>Hasil — {fNum(gen.total)} nasabah · {gen.blocks.length} unit kerja</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={dlExcel} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:C.kpiGreen, color:"#fff", border:"none", borderRadius:7, fontSize:12.5, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={15} /> Unduh Excel</button>
              <button onClick={dlPDF}   style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:C.kpiRed, color:"#fff", border:"none", borderRadius:7, fontSize:12.5, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={15} /> Unduh PDF</button>
            </div>
          </div>
          <div style={{ overflowX:"auto", maxHeight:520, overflowY:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5 }}>
              <thead style={{ position:"sticky", top:0, zIndex:1 }}>
                <tr>
                  {gen.selCols.map(c=>(
                    <th key={c.key} style={{ padding:"9px 12px", color:C.gray, fontWeight:600, fontSize:10.5, textTransform:"uppercase", textAlign:c.num?"right":"left", whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}`, background:C.grayLt }}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gen.blocks.map((b)=>[
                  <tr key={"u-"+b.uker}>
                    <td colSpan={gen.selCols.length} style={{ padding:"7px 12px", background:"#DDE7F3", color:C.navy, fontWeight:700, fontSize:12, borderBottom:`1px solid ${C.border}` }}>
                      {b.uker} — {fNum(b.rows.length)} nasabah
                    </td>
                  </tr>,
                  ...b.rows.map((g,ri)=>(
                    <tr key={b.uker+g.cif+ri} style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6` }}>
                      {gen.selCols.map(c=>(
                        <td key={c.key} style={{ padding:"8px 12px", color:C.textMd, textAlign:c.num?"right":"left", whiteSpace:"nowrap" }}>
                          {c.num ? Number(c.get(g)).toLocaleString("id-ID") : c.get(g)}
                        </td>
                      ))}
                    </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
          {gen.total===0 && <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:14 }}>Tidak ada data sesuai filter.</div>}
        </div>
      )}
    </div>
  );
}

// ===================== DATA MANTRI — laporan bergaya KAKA MANTRI (data dummy) =====================
const M_NAVY = "1B2A6E", M_ORANGE = "E8821E", M_BEIGE = "FBF0CE", M_STRIPE = "F2F2F2", M_BBORD = "E5D9B6";
const fR = (n) => Number(n||0).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
const hexRGB = (h)=>[parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];

// Gambar bar chart horizontal sederhana langsung di jsPDF (vektor, tidak butuh html2canvas)
// rows: [{ label, value }]; valFmt: (value)=>string; colorHex: "RRGGBB"
function drawBarsPDF(doc, { x, y, w, h, title, rows, valFmt, colorHex }) {
  const navy = hexRGB(M_NAVY);
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(navy[0],navy[1],navy[2]);
  doc.text(title, x, y);
  doc.setFont('helvetica','normal');
  if (!rows || !rows.length) { doc.setFontSize(9); doc.setTextColor(150,150,150); doc.text("Tidak ada data.", x, y+18); return; }
  const top = y + 12;
  const maxVal = Math.max(...rows.map(r=>r.value), 1);
  const labelW = 130, valW = 54;
  const barAreaW = Math.max(40, w - labelW - valW);
  const rowH = Math.min(20, (h - 14) / rows.length);
  const col = hexRGB(colorHex);
  rows.forEach((r,i)=>{
    const cy = top + i*rowH, midY = cy + rowH*0.62;
    doc.setFontSize(7.5); doc.setTextColor(70,70,70);
    const lbl = String(r.label||'').length>26 ? String(r.label).slice(0,25)+'…' : String(r.label||'');
    doc.text(lbl, x+labelW-5, midY, { align:'right' });
    const bw = Math.max(1.5, (r.value/maxVal)*barAreaW);
    doc.setFillColor(col[0],col[1],col[2]);
    doc.rect(x+labelW, cy+1.5, bw, Math.max(3, rowH-4), 'F');
    doc.setTextColor(40,40,40); doc.setFontSize(7.5);
    doc.text(valFmt(r.value), x+labelW+bw+4, midY);
  });
}
const pencHex = (p)=> p>=100 ? ["DCFCE7","15803D"] : p>=80 ? ["FEF3C7","B45309"] : ["FEE2E2","B91C1C"];
const deltaHex = (v)=> v<0 ? "B91C1C" : "15803D"; // negatif merah, >=0 hijau

const mcol = (label, kind="num", header="navy") => ({ label, kind, header });
const M_POS = [ mcol("POSISI 31/12/2025"), mcol("POSISI 31/05/2026"), mcol("POSISI 25/06/2026"), mcol("POSISI 26/06/2026") ];
const M_DELTA3 = [ mcol("(Delta Hari Kemarin) Δ THD 25/06/2026","delta","orange"), mcol("(Delta Bulan Lalu) Δ THD 31/05/2026","delta","orange"), mcol("(Delta Akhir Tahun) Δ THD 31/12/2025","delta","orange") ];
const M_PCTTAIL = [
  mcol("Delta (%) RKA BULAN 5","delta"), mcol("PENC (%) RKA BULAN 5","badge"),
  mcol("Delta (%) RKA BULAN 6","delta"), mcol("PENC (%) RKA BULAN 6","badge"),
  mcol("Delta (%) RKA BULAN 12","delta"), mcol("PENC (%) RKA BULAN 12","badge"),
];
const MANTRI_CFG = {
  mantriRealisasi: {
    title:"Realisasi Pinjaman Mantri 1 Tahun",
    sub:"Data Realisasi Pinjaman Bulan Ini, Bulan Lalu, dan Realisasi 1 Tahun Sesuai PN Prakarsa (Pinjaman Yang Masih Aktif).",
    idCols:[ {label:"KODE UKER",key:"kode"}, {label:"UNIT",key:"unit"} ],
    valCols:[ mcol("REALISASI TGL 1 S/D 31/05/2026"), mcol("REALISASI TGL 1 S/D 25/06/2026"), mcol("REALISASI TGL 1 S/D 26/06/2026"),
      mcol("(Delta Hari Kemarin) Δ THD 25/06/2026","delta","orange"), mcol("(Delta Bulan Lalu) Δ THD 31/05/2026","delta","orange"),
      ...Array.from({length:12},(_,i)=>mcol(`REALISASI BLN ${i+1} (PN PRAKARSA)`)),
      mcol("TOTAL REALISASI S/D BLN 6 (PN PRAKARSA)"), mcol("TARGET MANTRI BULAN 6"), mcol("PENC (Rp) BULAN 6"), mcol("PENC (%) BULAN 6","badge") ],
    sections:[ {prefix:"TOTAL (Rp)",key:"rp"}, {prefix:"TOTAL (Rek)",key:"rek"} ] },
  mantriOs: {
    title:"Os Dan Rek Pinjaman Mantri Per Uker", sub:"Os Dan Rek Pinjaman Mantri Per Uker Sesuai Kelolaan Mantri Saat Ini.",
    idCols:[ {label:"UNIT",key:"unit"} ], valCols:[ ...M_POS, ...M_DELTA3 ],
    sections:[ {prefix:"TOTAL (Rp) OS",key:"rp"}, {prefix:"TOTAL (Rek) Pinj",key:"rek"} ] },
  mantriSmlRp: {
    title:"SML (Rp & Rek) Pinjaman Mantri Per Uker", sub:"SML (Rp & Rek) Pinjaman Per Mantri Per Uker Sesuai Kelolaan Mantri Saat Ini.",
    idCols:[ {label:"UNIT",key:"unit"} ], valCols:[ ...M_POS, ...M_DELTA3 ],
    sections:[ {prefix:"TOTAL (Rp) SML",key:"rp"}, {prefix:"TOTAL (Rek) SML",key:"rek"} ] },
  mantriNplRp: {
    title:"NPL (Rp & Rek) Pinjaman Mantri Per Uker", sub:"NPL (Rp & Rek) Pinjaman Per Mantri Per Uker Sesuai Kelolaan Mantri Saat Ini.",
    idCols:[ {label:"UNIT",key:"unit"} ], valCols:[ ...M_POS, ...M_DELTA3 ],
    sections:[ {prefix:"TOTAL (Rp) NPL",key:"rp"}, {prefix:"TOTAL (Rek) NPL",key:"rek"} ] },
  mantriSmlPct: {
    title:"SML (%) Pinjaman Mantri Per Uker", sub:"SML (%) Pinjaman Per Mantri Per Uker Sesuai Kelolaan Mantri Saat Ini.",
    idCols:[ {label:"UNIT",key:"unit"} ],
    valCols:[ mcol("RKA BULAN 5","num","orange"),mcol("RKA BULAN 6","num","orange"),mcol("RKA BULAN 12","num","orange"), ...M_POS, ...M_DELTA3, ...M_PCTTAIL ],
    sections:[ {prefix:"TOTAL (%) SML",key:"pct"} ] },
  mantriNplPct: {
    title:"NPL (%) Pinjaman Mantri Per Uker", sub:"NPL (%) Pinjaman Per Mantri Per Uker Sesuai Kelolaan Mantri Saat Ini.",
    idCols:[ {label:"UNIT",key:"unit"} ],
    valCols:[ mcol("RKA BULAN 5","num","orange"),mcol("RKA BULAN 6","num","orange"),mcol("RKA BULAN 12","num","orange"), ...M_POS, ...M_DELTA3, ...M_PCTTAIL ],
    sections:[ {prefix:"TOTAL (%) NPL",key:"pct"} ] },
  mantriNetDgSml: {
    title:"Pencapaian Net Downgrade SML Per Mantri", sub:"Data Berdasarkan Posisi LW321. Wajib Upload Nominatif PH Terbaru Untuk Mengetahui Pinjaman Yang Ke PH.",
    idCols:[ {label:"KODE UKER",key:"kode"}, {label:"UNIT",key:"unit"} ],
    valCols:[ mcol("KELOLAAN LANCAR 31/05/2026"), mcol("MAX DOWNGRADE SML (0.4% X KELOLAAN LANCAR)"),
      mcol("SML DOWNGRADE 26/06/2026","num","orange"), mcol("SML UPGRADE 26/06/2026","num","orange"),
      mcol("NET DOWNGRADE SML","delta"), mcol("PENCAP% NET DOWNGRADE SML","badge") ],
    sections:[ {prefix:"TOTAL (Rp)",key:"rp"}, {prefix:"TOTAL (Rek)",key:"rek"} ] },
  mantriNetDgNpl: {
    title:"Pencapaian Net Downgrade NPL Per Mantri", sub:"Data Berdasarkan Posisi LW321. Wajib Upload Nominatif PH Terbaru Untuk Mengetahui Pinjaman Yang Ke PH.",
    idCols:[ {label:"KODE UKER",key:"kode"}, {label:"UNIT",key:"unit"} ],
    valCols:[ mcol("KELOLAAN SML 31/05/2026"), mcol("MAX DOWNGRADE NPL (5% X KELOLAAN SML)"),
      mcol("NPL DOWNGRADE 26/06/2026","num","orange"), mcol("NPL UPGRADE 26/06/2026 (NOMINATIF PH TGL 6/25/2026)","num","orange"),
      mcol("NET DOWNGRADE NPL","delta"), mcol("PENCAP% NET DOWNGRADE NPL","badge") ],
    sections:[ {prefix:"TOTAL (Rp)",key:"rp"}, {prefix:"TOTAL (Rek)",key:"rek"} ] },
};
// ── Agregasi per-mantri dari snapshot LW321 (beberapa tanggal) ───────────────
const round2 = (v)=> Math.round((+v||0)*100)/100;
const POS_REPORTS = new Set(["mantriOs","mantriSmlRp","mantriNplRp","mantriSmlPct","mantriNplPct"]); // pakai kolom POSISI tiap tanggal
const PCT_REPORTS = new Set(["mantriSmlPct","mantriNplPct"]);

// Nilai metrik report dari satu baris agregat backend (atau jumlahan baris unit).
function metricFromAgg(reportId, row, key) {
  if (!row) return 0;
  const n = (x)=>Number(x)||0;
  switch (reportId) {
    case "mantriOs":     return key==="rek" ? n(row.rek)     : n(row.os);
    case "mantriSmlRp":  return key==="rek" ? n(row.sml_rek) : n(row.sml_rp);
    case "mantriNplRp":  return key==="rek" ? n(row.npl_rek) : n(row.npl_rp);
    case "mantriSmlPct": { const os=n(row.os); return os>0 ? n(row.sml_rp)/os*100 : 0; }
    case "mantriNplPct": { const os=n(row.os); return os>0 ? n(row.npl_rp)/os*100 : 0; }
    default: return 0;
  }
}
// Jumlahkan beberapa baris agregat → satu baris (untuk total unit).
function sumAggRows(rows) {
  const o = { os:0, rek:0, lancar_rp:0, lancar_rek:0, sml_rp:0, sml_rek:0, npl_rp:0, npl_rek:0 };
  rows.forEach(r => { for (const k in o) o[k] += Number(r[k])||0; });
  return o;
}

function buildMantriData(reportId, snaps) {
  const baseCfg = MANTRI_CFG[reportId];
  const refs = Array.isArray(snaps) ? snaps : [];     // urut lama → baru
  const terkini = refs.length ? refs[refs.length-1] : null;

  // Agregat per-unit tiap snapshot (untuk baris TOTAL).
  const refsU = refs.map(s => {
    const grp = {};
    Object.values(s.byMantri||{}).forEach(r => { (grp[r.kode_uker] = grp[r.kode_uker] || []).push(r); });
    const byUnit = {}; Object.entries(grp).forEach(([k,rows]) => byUnit[k] = sumAggRows(rows));
    return { ...s, byUnit };
  });

  // cfg dinamis: kolom POSISI & delta mengikuti tanggal snapshot yang benar-benar ada.
  // Delta diurutkan: kemarin → bulan lalu → akhir tahun (sama seperti Kaka Mantri).
  const DELTA_DESC = { kemarin:'Delta Hari Kemarin', bulanLalu:'Delta Bulan Lalu', akhirThn:'Delta Akhir Tahun' };
  let cfg = baseCfg, lead = [], tail = [];
  // Refs untuk delta: semua kecuali terkini, dibalik (kemarin → bulanLalu → akhirThn)
  const refsForDelta = refs.slice(0,-1).slice().reverse();
  if (POS_REPORTS.has(reportId) && refs.length) {
    const posCols   = refs.map(r => mcol(`POSISI ${r.label}`));
    const deltaCols = refsForDelta.map(r => {
      const desc = DELTA_DESC[r.key];
      return mcol(desc ? `(${desc}) Δ THD ${r.label}` : `Δ THD ${r.label}`, "delta", "orange");
    });
    if (PCT_REPORTS.has(reportId)) { lead = baseCfg.valCols.slice(0,3); tail = baseCfg.valCols.slice(10); }
    cfg = { ...baseCfg, valCols:[...lead, ...posCols, ...deltaCols, ...tail] };
  }

  // Vals satu entitas (mantri/unit) dari baris agregatnya per snapshot.
  const valsOf = (rowPerRef, key) => {
    if (POS_REPORTS.has(reportId) && refs.length) {
      const pos = refs.map((r,ri) => round2(metricFromAgg(reportId, rowPerRef[ri], key)));
      const cur = pos[pos.length-1];
      // Delta diurutkan sesuai refsForDelta (kemarin → bulanLalu → akhirThn)
      const deltas = refsForDelta.map(r => { const ri = refs.indexOf(r); return round2(cur - pos[ri]); });
      return [ ...lead.map(()=>0), ...pos, ...deltas, ...tail.map(()=>0) ];
    }
    // Non-posisi (Net DG, Realisasi): hanya snapshot terkini; pergerakan/realisasi belum ada → 0.
    const row = rowPerRef[rowPerRef.length-1];
    const vals = new Array(baseCfg.valCols.length).fill(0);
    const n = (x)=>Number(x)||0;
    if (reportId==="mantriNetDgSml")      { const kel = key==="rek"?n(row?.lancar_rek):n(row?.lancar_rp); vals[0]=round2(kel); vals[1]=key==="rp"?round2(kel*0.004):0; }
    else if (reportId==="mantriNetDgNpl") { const kel = key==="rek"?n(row?.sml_rek):n(row?.sml_rp);       vals[0]=round2(kel); vals[1]=key==="rp"?round2(kel*0.05):0; }
    return vals;
  };

  // Semesta unit/mantri = snapshot terkini ("sesuai kelolaan mantri saat ini").
  // Hanya BRI Unit (nama diawali "UNIT") — KC/KCP dikecualikan dari laporan mantri per unit.
  // Catatan: kode unit tidak selalu diawali '5' (mis. PAJALELE 7490, MAMBI 8026).
  const hasKode = cfg.idCols.some(c => c.key === "kode");
  const unitMap = {};
  Object.values(terkini?.byMantri || {}).forEach(r => {
    if (!/^unit\b/i.test(String(r.uker_nama||"").trim())) return;
    const U = unitMap[r.kode_uker] || (unitMap[r.kode_uker] = { kode:r.kode_uker, nama:shortUker(r.uker_nama||r.kode_uker), mantri:[] });
    U.mantri.push({ key:`${r.kode_uker}|${r.ao_id}`, pn:r.pn||r.ao_id||"", nama:r.ao||"-", os:Number(r.os)||0 });
  });
  const units = Object.values(unitMap).sort((a,b)=>String(a.kode).localeCompare(String(b.kode)));
  units.forEach(u => u.mantri.sort((a,b)=>b.os-a.os));

  const blocks = units.map(u => ({
    unitName:u.nama, kode:u.kode,
    sections: cfg.sections.map((sec) => {
      const rows = u.mantri.map((mt) => {
        const rowPerRef = refsU.map(s => s.byMantri[mt.key]);
        const who = mt.pn || "(PN kosong)";
        const unit = hasKode ? `${who} - ${mt.nama}` : `${u.kode} - ${who} - ${mt.nama}`;
        return { kode:u.kode, unit, vals: valsOf(rowPerRef, sec.key) };
      });
      const total = valsOf(refsU.map(s => s.byUnit[u.kode]), sec.key);
      return { label:`${sec.prefix} ${u.nama}`, total, rows };
    }),
  }));
  return { cfg, blocks };
}
const Pill = ({ v }) => { const [bg,fg]=pencHex(v); return <span style={{ display:"inline-block", minWidth:50, textAlign:"center", padding:"2px 7px", borderRadius:5, background:`#${bg}`, color:`#${fg}`, fontWeight:700, fontSize:10 }}>{fR(v)}%</span>; };

function MantriReport({ reportId, snaps }) {
  const { cfg, blocks } = useMemo(()=>buildMantriData(reportId, snaps), [reportId, snaps]);
  const loading = snaps === null;
  const idN = cfg.idCols.length;
  const nCol = idN + cfg.valCols.length;
  const headBg = (c)=> c.header==="orange" ? `#${M_ORANGE}` : `#${M_NAVY}`;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={card}>
        <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>{cfg.title}</div>
        <div style={{ fontSize:12.5, color:C.gray, marginTop:2 }}>{cfg.sub}</div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={()=>exportMantriExcel(reportId, snaps)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:C.kpiGreen, color:"#fff", border:"none", borderRadius:7, fontSize:12.5, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={15} /> Simpan Excel</button>
          <button onClick={()=>exportMantriPDF(reportId, snaps)}   style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:C.kpiRed, color:"#fff", border:"none", borderRadius:7, fontSize:12.5, fontWeight:600, cursor:"pointer" }}><Ic n="download" size={15} /> Simpan PDF</button>
        </div>
        <div style={{ fontSize:11, color:C.amber, marginTop:8 }}>* Kolom POSISI diisi dari snapshot LW321 di tiap tanggal yang tersedia (akhir tahun lalu, akhir bulan lalu, kemarin, terkini) beserta selisihnya. Kolom yang sumber datanya belum tersedia — realisasi, target RKA, & pergerakan downgrade/upgrade (butuh Nominatif PH) — ditampilkan 0.</div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:"68vh" }}>
          <table style={{ borderCollapse:"collapse", fontSize:11 }}>
            <thead><tr>
              {[...cfg.idCols, ...cfg.valCols].map((c,i)=>{
                const isId = i < idN;
                return <th key={i} style={{ padding:"7px 9px", background: isId?`#${M_NAVY}`:headBg(c), color:"#fff", fontWeight:700, fontSize:9, textAlign:isId?"left":"center",
                  border:"1px solid #fff", minWidth:isId?(idN>1&&i===0?70:200):92, maxWidth:200, whiteSpace:"normal", lineHeight:1.2, verticalAlign:"middle",
                  position:"sticky", top:0, zIndex:2 }}>{c.label}</th>;
              })}
            </tr></thead>
            <tbody>
              {blocks.length === 0 && (
                <tr><td colSpan={nCol} style={{ padding:24, textAlign:"center", color:C.gray, fontSize:12.5 }}>{loading ? "Memuat data mantri…" : "Belum ada data LW321. Upload file LW321 terlebih dahulu."}</td></tr>
              )}
              {blocks.map((b)=> b.sections.map((sec,si)=>[
                <tr key={b.kode+si+"t"} style={{ background:`#${M_BEIGE}`, fontWeight:700 }}>
                  {cfg.idCols.map((ic,ii)=><td key={ii} style={{ padding:"6px 9px", border:`1px solid #${M_BBORD}`, color:C.text, fontSize:10.5, whiteSpace:"nowrap" }}>{ii===idN-1?sec.label:""}</td>)}
                  {cfg.valCols.map((c,ci)=>{ const v=sec.total[ci]; return (
                    <td key={ci} style={{ padding:"6px 9px", border:`1px solid #${M_BBORD}`, textAlign: c.kind==="badge"?"center":"right", color: c.kind==="delta"?`#${deltaHex(v)}`:C.text, fontSize:10.5, whiteSpace:"nowrap" }}>
                      {c.kind==="badge" ? <Pill v={v} /> : fR(v)}
                    </td>); })}
                </tr>,
                ...sec.rows.map((r,ri)=>(
                  <tr key={b.kode+si+ri} style={{ background: ri%2?`#${M_STRIPE}`:"#fff" }}>
                    {cfg.idCols.map((ic,ii)=><td key={ii} style={{ padding:"5px 9px", border:"1px solid #eee", color:C.textMd, fontSize:10.5, whiteSpace:"nowrap" }}>{r[ic.key]}</td>)}
                    {cfg.valCols.map((c,ci)=>{ const v=r.vals[ci]; return (
                      <td key={ci} style={{ padding:"5px 9px", border:"1px solid #eee", textAlign: c.kind==="badge"?"center":"right", color: c.kind==="delta"?`#${deltaHex(v)}`:C.textMd, fontWeight: c.kind==="delta"?600:400, fontSize:10.5, whiteSpace:"nowrap" }}>
                        {c.kind==="badge" ? <Pill v={v} /> : fR(v)}
                      </td>); })}
                  </tr>
                )),
              ]))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function exportMantriExcel(reportId, snaps) {
  const { cfg, blocks } = buildMantriData(reportId, snaps);
  const idN = cfg.idCols.length, nC = idN + cfg.valCols.length;
  const aoa = [], meta = [];
  aoa.push([...cfg.idCols.map(c=>c.label), ...cfg.valCols.map(c=>c.label)]); meta.push({ t:"head" });
  blocks.forEach(b => b.sections.forEach(sec => {
    aoa.push([...cfg.idCols.map((c,i)=> i===idN-1 ? sec.label : ""), ...sec.total]); meta.push({ t:"total" });
    sec.rows.forEach((r,ri)=>{ aoa.push([...cfg.idCols.map(c=>r[c.key]), ...r.vals]); meta.push({ t:"data", ri }); });
  }));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [...cfg.idCols.map(c=>({ wch: c.key==="kode" ? 10 : 38 })), ...cfg.valCols.map(c=>({ wch: 14 }))];
  ws["!rows"] = [{ hpt: 30 }];
  const thin=(rgb)=>({ style:"thin", color:{ rgb } });
  const border={ top:thin("D9D9D9"), bottom:thin("D9D9D9"), left:thin("D9D9D9"), right:thin("D9D9D9") };
  meta.forEach((mr, r) => {
    for (let c=0;c<nC;c++){ const a=XLSX.utils.encode_cell({r,c}); if(!ws[a]) continue;
      const isVal = c>=idN; const col = isVal ? cfg.valCols[c-idN] : null; const v = ws[a].v;
      if (mr.t==="head") {
        ws[a].s = { fill:{patternType:"solid",fgColor:{rgb: col&&col.header==="orange"?M_ORANGE:M_NAVY}}, font:{bold:true,color:{rgb:"FFFFFF"},sz:8}, alignment:{horizontal:isVal?"center":"left",vertical:"center",wrapText:true}, border };
      } else if (mr.t==="total") {
        const st = { fill:{patternType:"solid",fgColor:{rgb:M_BEIGE}}, font:{bold:true,sz:9,color:{rgb:"344054"}}, alignment:{horizontal:isVal?"right":"left",vertical:"center"}, border };
        if (isVal && col.kind==="delta" && typeof v==="number") st.font.color={rgb:deltaHex(v)};
        if (isVal && col.kind==="badge" && typeof v==="number"){ const [bg,fg]=pencHex(v); st.fill.fgColor={rgb:bg}; st.font.color={rgb:fg}; st.alignment.horizontal="center"; ws[a].z='0.00"%"'; }
        else if (isVal) ws[a].z='#,##0.00';
        ws[a].s = st;
      } else {
        const st = { fill:{patternType:"solid",fgColor:{rgb: mr.ri%2?M_STRIPE:"FFFFFF"}}, font:{sz:9,color:{rgb:"344054"}}, alignment:{horizontal:isVal?"right":"left",vertical:"center"}, border };
        if (isVal && col.kind==="delta" && typeof v==="number"){ st.font.color={rgb:deltaHex(v)}; st.font.bold=true; }
        if (isVal && col.kind==="badge" && typeof v==="number"){ const [bg,fg]=pencHex(v); st.fill.fgColor={rgb:bg}; st.font.color={rgb:fg}; st.font.bold=true; st.alignment.horizontal="center"; ws[a].z='0.00"%"'; }
        else if (isVal) ws[a].z='#,##0.00';
        ws[a].s = st;
      }
    }
  });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Mantri");
  XLSX.writeFile(wb, `${cfg.title.replace(/[^\w]+/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportMantriPDF(reportId, snaps) {
  const { cfg, blocks } = buildMantriData(reportId, snaps);
  const idN = cfg.idCols.length;
  const wide = cfg.valCols.length > 10;
  const doc = new jsPDF({ orientation:"landscape", unit:"pt", format: wide?"a3":"a4" });
  const san = (s)=> String(s).replace(/Δ/g, "");
  const head = [[...cfg.idCols.map(c=>c.label), ...cfg.valCols.map(c=>san(c.label))]];
  const columnStyles = Object.fromEntries(cfg.idCols.map((c,i)=>[i, { halign:"left", cellWidth: c.key==="kode" ? 34 : 138 }]));

  // Satu unit kerja = satu halaman (header kolom diulang per halaman), seperti KAKA Mantri.
  blocks.forEach((b, bi) => {
    if (bi > 0) doc.addPage();
    doc.setFontSize(12); doc.setTextColor(15,42,80); doc.text(cfg.title, 28, 26);
    const body = [], rowMeta = [];
    b.sections.forEach(sec => {
      body.push([...cfg.idCols.map((c,i)=> i===idN-1 ? sec.label : ""), ...sec.total.map((v,ci)=> cfg.valCols[ci].kind==="badge"?fR(v)+"%":fR(v))]); rowMeta.push({ t:"total" });
      sec.rows.forEach(r=>{ body.push([...cfg.idCols.map(c=>r[c.key]), ...r.vals.map((v,ci)=> cfg.valCols[ci].kind==="badge"?fR(v)+"%":fR(v))]); rowMeta.push({ t:"data" }); });
    });
    autoTable(doc, {
      startY: 38, head, body,
      styles:{ fontSize: wide?5.5:7, cellPadding:2, overflow:"linebreak", valign:"middle", lineColor:[217,217,217], lineWidth:0.3, halign:"right" },
      columnStyles,
      headStyles:{ fillColor:hexRGB(M_NAVY), textColor:255, fontStyle:"bold", halign:"center" },
      margin:{ left:28, right:28 },
      didParseCell: (d) => {
        const ci = d.column.index, col = ci>=idN ? cfg.valCols[ci-idN] : null;
        if (d.section==="head") { if (col && col.header==="orange") d.cell.styles.fillColor = hexRGB(M_ORANGE); return; }
        const m = rowMeta[d.row.index];
        if (m && m.t==="total") { d.cell.styles.fillColor = hexRGB(M_BEIGE); d.cell.styles.fontStyle="bold"; }
        if (col) {
          const raw = parseFloat(String(d.cell.raw).replace(/[,%]/g,""));
          if (col.kind==="delta" && !isNaN(raw)) d.cell.styles.textColor = hexRGB(deltaHex(raw));
          if (col.kind==="badge" && !isNaN(raw)) { const [bg,fg]=pencHex(raw); d.cell.styles.fillColor=hexRGB(bg); d.cell.styles.textColor=hexRGB(fg); d.cell.styles.halign="center"; d.cell.styles.fontStyle="bold"; }
        }
      },
    });
  });
  doc.save(`${cfg.title.replace(/[^\w]+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`);
}

const MENU = [
  { id:"dashboard",   label:"Dashboard",       icon:"dashboard", title:"DASHBOARD PORTOFOLIO", sub:"Data per __DATE__" },
  { id:"portfolio",   label:"Portfolio Status", icon:"portfolio", chevron:true, title:"PORTFOLIO STATUS", sub:"Status portofolio kredit · BO Polewali" },
  { id:"ews",         label:"Early Warning",    icon:"warning",   chevron:true, title:"EARLY WARNING SYSTEM", sub:"Alert otomatis berdasarkan kondisi debitur" },
  { id:"debitur",     label:"Daftar Debitur",   icon:"users",     chevron:true, title:"DAFTAR DEBITUR", sub:"Monitoring seluruh debitur · BO Polewali" },
  { id:"action",      label:"Action Plan",      icon:"clipboard", chevron:true, title:"ACTION PLAN", sub:"Tindak lanjut penyelamatan debitur" },
  { id:"ckpn",        label:"Simulasi CKPN",    icon:"calc",      chevron:true, title:"SIMULASI CKPN", sub:"Estimasi CKPN & potensi penghematan" },
  { id:"kinerjaAO",   label:"Kinerja RM/Mantri", icon:"userPerf",  chevron:true, title:"KINERJA RM/MANTRI", sub:"Rekap kinerja per RM/Mantri" },
  { id:"kinerjaUnit", label:"Kinerja Unit",     icon:"building",  chevron:true, title:"KINERJA UNIT KERJA", sub:"Rekap kinerja per unit kerja" },
  { id:"osKurang50",  label:"OS < 50%",         icon:"percent",   chevron:true, title:"DEBITUR OS < 50% PLAFON", sub:"Debitur dengan outstanding di bawah 50% plafon awal" },
  { id:"buatLaporan", label:"Buat Laporan",     icon:"infoDoc",   chevron:true, title:"BUAT LAPORAN DEBITUR", sub:"Susun kolom & filter, lalu unduh Excel atau PDF" },
  { id:"secMantri",       section:true, label:"Data Mantri" },
  { id:"mantriRealisasi", label:"Realisasi Mantri 1 Tahun", icon:"wallet",  chevron:true, title:"REALISASI MANTRI 1 TAHUN", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriOs",        label:"Os Mantri",                icon:"trend",   chevron:true, title:"OS MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriSmlRp",     label:"SML (Rp) Mantri",          icon:"warning", chevron:true, title:"SML (RP) MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriNplRp",     label:"NPL (Rp) Mantri",          icon:"warning", chevron:true, title:"NPL (RP) MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriSmlPct",    label:"SML (%) Mantri",           icon:"percent", chevron:true, title:"SML (%) MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriNplPct",    label:"NPL (%) Mantri",           icon:"percent", chevron:true, title:"NPL (%) MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriNetDgSml",  label:"Net DG SML Mantri",        icon:"shield",  chevron:true, title:"NET DG SML MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"mantriNetDgNpl",  label:"Net DG NPL Mantri",        icon:"shield",  chevron:true, title:"NET DG NPL MANTRI", sub:"Tabel + ekspor Excel/PDF" },
  { id:"manajemen",   label:"Manajemen User",   icon:"users",     chevron:true, title:"MANAJEMEN USER", sub:"Kelola akun & hak akses pengguna sistem" },
  { id:"pengaturan",  label:"Pengaturan",       icon:"gear",      chevron:true, title:"PENGATURAN", sub:"Import data, unit kerja & parameter sistem" },
];

function Sidebar({ page, setPage, menus, periode }) {
  const [hover, setHover] = useState(null);

  return (
    <aside style={{ width:236, background:C.sidebar, color:"#fff", display:"flex", flexDirection:"column", flexShrink:0, height:"100vh", overflowY:"auto" }}>
      <div style={{ padding:"16px 16px 8px", display:"flex", alignItems:"center", gap:10 }}>
        <img src="https://res.cloudinary.com/dnacoymkh/image/upload/v1781780191/Frame_468_rkqtlz.png" alt="BRI" style={{ height:48, width:"auto", display:"block" }} />
      </div>
      <div style={{ padding:"0 16px 14px" }}>
        <div style={{ fontSize:15, fontWeight:800, letterSpacing:.6 }}>EWS-CKPN</div>
        <div style={{ fontSize:11, color:"#9DB6D6" }}>Early Warning System</div>
      </div>
      <nav style={{ padding:"4px 8px", display:"flex", flexDirection:"column", gap:2 }}>
        {menus.map(m=>{
          if (m.section) return (
            <div key={m.id} style={{ padding:"14px 14px 4px", fontSize:9.5, fontWeight:700, letterSpacing:.8, color:C.sidebarMuted, textTransform:"uppercase" }}>{m.label}</div>
          );
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
        <div>Demo · Data Mock · {periode}</div>
        <div style={{ marginTop:6, display:"flex", alignItems:"center", gap:6 }}>
          <span>Dibuat oleh</span>
          <a href="https://mfaridsyam.vercel.app" target="_blank" rel="noopener noreferrer"
            style={{ color:"#BCD3F0", fontWeight:700, textDecoration:"none", borderBottom:"1px solid rgba(188,211,240,.4)" }}
            onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#BCD3F0"}>
            mfaridsyam.vercel.app
          </a>
        </div>
      </div>
    </aside>
  );
}

function Login({ onLogin }) {
  const [pn,       setPn]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const p = pn.trim();
    if (!p || !password) { setError("PN dan password wajib diisi."); return; }
    setBusy(true); setError("");
    const err = await onLogin(p, password);
    if (err) { setError(err); setBusy(false); } // sukses → App melepas komponen ini
  };

  const inp = (extra={}) => ({
    padding:"10px 12px", border:`1.5px solid ${error?C.red:C.border}`, borderRadius:8,
    fontSize:13.5, color:C.text, outline:"none", width:"100%", boxSizing:"border-box", ...extra
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(135deg, ${C.sidebar} 0%, #0E2747 100%)`, padding:20,
      fontFamily:"system-ui,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ background:C.white, borderRadius:16, padding:"28px 26px", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
            <img src="https://res.cloudinary.com/dnacoymkh/image/upload/v1780721401/Logo_header_mini_blue_lengkap_wblfyh.png" alt="BRI" style={{ height:46, width:"auto" }} />
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:C.navy, letterSpacing:.5 }}>EWS-CKPN</div>
              <div style={{ fontSize:11, color:C.gray }}>Early Warning System · BO Polewali</div>
            </div>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:2 }}>Masuk</div>
          <div style={{ fontSize:12.5, color:C.gray, marginBottom:20 }}>Gunakan PN &amp; password dari petugas IT cabang.</div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.textMd, display:"block", marginBottom:5 }}>PN (Nomor Personel)</label>
              <input type="text" autoFocus autoComplete="username" inputMode="numeric"
                value={pn} onChange={e=>{ setPn(e.target.value.replace(/\s/g,"")); setError(""); }}
                placeholder="contoh: 90188658"
                style={inp()} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.textMd, display:"block", marginBottom:5 }}>Password</label>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} autoComplete="current-password"
                  value={password} onChange={e=>{ setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  style={inp({ paddingRight:54 })} />
                <button type="button" onClick={()=>setShowPw(s=>!s)}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", color:C.gray, fontSize:11.5, fontWeight:600, padding:"2px 4px" }}>
                  {showPw?"Sembunyikan":"Tampilkan"}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ fontSize:12.5, color:C.red, background:C.redLt, padding:"9px 12px", borderRadius:7, fontWeight:500 }}>{error}</div>
            )}
            <button type="submit" disabled={busy}
              style={{ width:"100%", padding:"11px", background:C.navy, color:C.white, border:"none",
                borderRadius:9, fontSize:14, fontWeight:700, cursor:busy?"default":"pointer", opacity:busy?.7:1, marginTop:2 }}>
              {busy ? "Memverifikasi…" : "Masuk"}
            </button>
          </form>

          <div style={{ fontSize:11.5, color:C.gray, textAlign:"center", marginTop:16 }}>
            Lupa password? Hubungi petugas IT cabang.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [debiturPreset, setDebiturPreset] = useState(null); // filter awal Daftar Debitur (mis. dari klik chart sektor/segmen)
  const [kinerjaPreset, setKinerjaPreset] = useState(null); // deep-link Kinerja Unit → unit → mantri → debitur (breakdown terbuka)
  const contentRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [filters, setFilters] = useState({ uker:"semua", ao:"semua", segment:"semua", periode:"Mei 2026" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [periodeOpen, setPeriodeOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [availablePeriodes, setAvailablePeriodes] = useState([]);
  const [uploadedData, setUploadedData] = useState(null);
  const [ckpnData,     setCkpnData]     = useState(null);
  const [recPhData,    setRecPhData]    = useState(null);
  const [mantriSnaps,  setMantriSnaps]  = useState(null); // snapshot agregat per mantri (akhir thn lalu, akhir bln lalu, kemarin, terkini)
  const [actionPlansData, setActionPlansData] = useState([]); // action plan asli (tabel action_plans) untuk rekap mantri
  const [dbLoading, setDbLoading] = useState(false);
  const [dbProgress, setDbProgress] = useState(0);
  const [dbProgressLabel, setDbProgressLabel] = useState("");
  const [authChecking, setAuthChecking] = useState(Boolean(supabase)); // true saat memulihkan sesi awal

  // Fungsi inti: load debitur untuk upload tertentu (cek IDB cache dulu)
  const loadDebiturForUpload = async (upload, uploadHistory, uploadHistoryAll = []) => {
    const cacheKey = `debitur-${upload.id}`;
    const cached = await idbGet(cacheKey);
    if (cached?.debitur?.length) {
      setDbProgress(100); setDbProgressLabel("Data dimuat dari cache");
      setUploadedData({ ...cached, uploadHistory, uploadHistoryAll });
      setFilters(f => ({ ...f, periode: upload.periode_label }));
      return;
    }
    const totalRows = upload.row_count || 0;
    setDbProgressLabel(`Memuat data ${upload.periode_label}...`);
    const PAGE = 1000;
    let allRows = [], page = 0, hasMore = true;
    while (hasMore) {
      const from = page * PAGE;
      const { data: rows, error } = await fetchDebitur({ upload_id: upload.id, from, to: from + PAGE - 1 });
      if (error) throw error;
      if (!rows?.length) { hasMore = false; break; }
      allRows = allRows.concat(rows);
      hasMore = rows.length === PAGE;
      page++;
      if (totalRows > 0) {
        const pct = Math.min(98, Math.round(allRows.length / totalRows * 100));
        setDbProgress(pct);
        setDbProgressLabel(`Memuat data... ${allRows.length.toLocaleString("id-ID")} dari ${totalRows.toLocaleString("id-ID")} debitur`);
      }
    }
    setDbProgress(100); setDbProgressLabel("Selesai");
    if (!allRows.length) return;
    const debitur = allRows.map(r => ({
      cif: r.cif, nama: r.nama, ao: r.ao, aoId: r.ao_id, pn: r.pn,
      uker: r.kode_uker, ukerNama: r.uker_nama, segment: r.segment,
      sektor: r.sektor, osJt: r.os_jt, kol: r.kol, dpd: r.dpd,
      skor: r.skor, tier: r.tier, flagRestruk: r.flag_restruk || 'N',
      hasAction: r.has_action, resolved: r.resolved,
      tunggakanPokok: r.tunggakan_pokok, tunggakanBunga: r.tunggakan_bunga,
      tunggakanDenda: r.tunggakan_denda, tunggakanPenalty: r.tunggakan_penalty,
      tunggakanTotal: r.tunggakan_total,
      plafonJt: r.plafon_jt ?? 0,
    }));
    const uploadData = {
      debitur,
      periodeLabel: upload.periode_label,
      periodeStr: upload.periode_str || '',
      datePrinted: upload.date_printed || '',
      totalRows: debitur.length,
    };
    setUploadedData({ ...uploadData, uploadHistory, uploadHistoryAll });
    setFilters(f => ({ ...f, periode: upload.periode_label }));
    idbSet(cacheKey, uploadData);
  };

  const loadLatestData = async () => {
    setDbLoading(true); setDbProgress(0);
    setDbProgressLabel("Menghubungkan ke database...");
    try {
      // Query utama — hanya kolom yang pasti ada
      const { data: allUploads, error: upErr } = await fetchUploads({ fields: 'id,tgl_file,periode_label,row_count', jenis: 'lw321', order: 'desc' });
      if (upErr || !allUploads?.length) return;
      // Deduplicate per periode_label — pakai tgl_file terbaru (allUploads sudah sorted desc)
      const seen = new Set();
      setAvailablePeriodes(allUploads.filter(u => seen.has(u.periode_label) ? false : seen.add(u.periode_label)));

      // Query opsional — trend data (gagal diam-diam kalau kolom belum dibuat)
      let uploadHistory = [], uploadHistoryAll = [];
      const { data: withTotals } = await fetchUploads({ fields: 'id,tgl_file,periode_label,row_count,total_os_jt,total_tunggakan_jt', jenis: 'lw321', order: 'asc' });
      if (withTotals) {
        const valid = withTotals.filter(u => u.total_os_jt != null);
        if (valid.length >= 1) {
          const mapU = u => ({ periodeLabel: u.periode_label, tglFile: u.tgl_file, rowCount: u.row_count, totalOsJt: u.total_os_jt, totalTunggakanJt: u.total_tunggakan_jt });
          // Semua upload dengan tgl_file (untuk Bulan Ini per-tanggal)
          uploadHistoryAll = valid.map(mapU);
          // Deduplikasi per periode — acuan file bulanan = tgl_file TERBESAR (tanggal terakhir bulan itu).
          // Eksplisit pilih max(tgl_file) agar tidak bergantung urutan query.
          const seenP = new Map();
          valid.forEach(u => {
            const prev = seenP.get(u.periode_label);
            if (!prev || String(u.tgl_file) > String(prev.tgl_file)) seenP.set(u.periode_label, u);
          });
          uploadHistory = [...seenP.values()].map(mapU);
        }
      }

      await loadDebiturForUpload(allUploads[0], uploadHistory, uploadHistoryAll);
    } catch (err) {
      console.error('Gagal load data dari database:', err);
    } finally {
      setDbLoading(false);
    }
  };

  const loadCkpnData = async () => {
    try {
      const { data: uploads } = await fetchUploads({ jenis: 'ckpn', order: 'desc' });
      if (!uploads?.length) return;
      const [{ data: summary }, { data: trend }] = await Promise.all([
        fetchCkpnSummary(uploads[0].id),
        fetchCkpnTrend(),
      ]);
      if (!summary) return;
      setCkpnData({ uploadId: uploads[0].id, periodeLabel: uploads[0].periode_label, ...summary, trend: trend || [] });
    } catch (err) { console.warn('Gagal load CKPN data:', err); }
  };

  const loadRecPhData = async () => {
    try {
      const { data: uploads } = await fetchUploads({ jenis: 'rec_ph', order: 'desc' });
      if (!uploads?.length) return;
      const [{ data: summary }, { data: trend }] = await Promise.all([
        fetchRecPhSummary(uploads[0].id),
        fetchRecPhTrend(),
      ]);
      if (!summary) return;
      setRecPhData({ uploadId: uploads[0].id, periodeLabel: uploads[0].periode_label, ...summary, trend: trend || [] });
    } catch (err) { console.warn('Gagal load Recovery PH data:', err); }
  };

  const loadActionPlans = async () => {
    try { const { data } = await fetchActionPlans(); if (data) setActionPlansData(data); }
    catch (err) { console.warn('Gagal load Action Plan:', err); }
  };

  // Muat snapshot agregat per-mantri untuk laporan Data Mantri.
  // Pilih tanggal acuan dari upload LW321 yang BENAR-BENAR ADA: terkini, kemarin (H-1),
  // akhir bulan lalu, akhir tahun lalu — lalu ambil agregat SQL per snapshot.
  const loadMantriSnaps = async () => {
    try {
      const { data: ups } = await fetchUploads({ fields: 'id,tgl_file,periode_label', jenis: 'lw321', order: 'desc' });
      if (!ups?.length) { setMantriSnaps([]); return; }
      const seen = new Set(); const byDate = [];
      ups.forEach(u => { const d = String(u.tgl_file).slice(0,10); if (!seen.has(d)) { seen.add(d); byDate.push({ ...u, d }); } });
      const terkini = byDate[0];
      const tDate = new Date(terkini.d);
      const kemarin   = byDate.find(u => u.d < terkini.d);
      // bulanLalu = upload dari bulan sebelum kemarin (bukan sebelum terkini),
      // agar ketika kemarin=30/06 dan terkini=01/07 kita dapat 31/05 (bukan 30/06 lagi).
      const kDate     = kemarin ? new Date(kemarin.d) : tDate;
      const bulanLalu = byDate.find(u => { const dt = new Date(u.d); return dt.getFullYear() < kDate.getFullYear() || (dt.getFullYear() === kDate.getFullYear() && dt.getMonth() < kDate.getMonth()); });
      const akhirThn  = byDate.find(u => new Date(u.d).getFullYear() < tDate.getFullYear());
      const fmt = (d) => { const [y,mo,da] = d.split('-'); return `${da}/${mo}/${y}`; };
      const refDefs = [
        akhirThn  && { key:'akhirThn',  id:akhirThn.id,  d:akhirThn.d },
        bulanLalu && { key:'bulanLalu', id:bulanLalu.id, d:bulanLalu.d },
        kemarin   && { key:'kemarin',   id:kemarin.id,   d:kemarin.d },
        { key:'terkini', id:terkini.id, d:terkini.d },
      ].filter(Boolean).filter((r,i,arr) => arr.findIndex(x=>x.id===r.id)===i);
      // agg-cross: kelolaan TERKINI sebagai acuan, OS diambil dari tiap snapshot historis.
      // Memerlukan index idx_cif di tabel debitur (sudah di-migrate otomatis di server.js).
      const terkiniRef = refDefs[refDefs.length - 1];
      const refOnlyIds = refDefs.slice(0, -1).map(r => r.id);
      const { data: crossData } = await fetchMantriAggCross(terkiniRef.id, refOnlyIds);
      setMantriSnaps(refDefs.map(r => ({ key:r.key, label:fmt(r.d), date:r.d, byMantri:(crossData || {})[r.id] || {} })));
    } catch (err) { console.warn('Gagal load snapshot mantri:', err); setMantriSnaps([]); }
  };
  // Muat lazy saat pertama masuk salah satu tab Data Mantri
  useEffect(() => {
    if (mantriSnaps === null && typeof page === "string" && page.startsWith("mantri")) loadMantriSnaps();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  // Refresh action plan tiap kali masuk halaman Kinerja RM/Mantri (agar ikut input terbaru)
  useEffect(() => {
    if (page !== "kinerjaAO") return;
    fetchActionPlans().then(({ data }) => { if (data) setActionPlansData(data); }).catch(()=>{});
  }, [page]);

  const CHUNK = 300;

  const handleUploadCkpn = async (file, fileTanggal, onProgress) => {
    onProgress?.(5, "Parsing file CKPN...");
    const result = await parseCKPN(file);
    onProgress?.(20, `${result.totalRows.toLocaleString("id-ID")} baris terbaca`);

    const { data: upload, error } = await insertUpload({
      jenis: 'ckpn', tgl_file: fileTanggal,
      periode_label: result.periodeLabel || fileTanggal.slice(0, 7),
      row_count: result.totalRows, uploaded_by: currentUser?.pn || 'admin',
    });
    if (error || !upload) throw new Error(error?.message || 'Gagal menyimpan upload');
    onProgress?.(28, "Menyimpan ke database...");

    const total = result.debitur.length;
    for (let i = 0; i < total; i += CHUNK) {
      const chunk = result.debitur.slice(i, i + CHUNK).map(d => ({ upload_id: upload.id, ...d }));
      const { error: bulkErr } = await bulkInsertCkpn(chunk);
      if (bulkErr) throw new Error(bulkErr.message);
      onProgress?.(28 + Math.round(Math.min(i + CHUNK, total) / total * 68), `Menyimpan ${Math.min(i+CHUNK,total)} dari ${total}...`);
    }

    const M = 1_000_000;
    const computeByKol = (deb) => {
      const map = {};
      deb.forEach(d => {
        const k = String(d.kol);
        if (!map[k]) map[k] = { kol: parseInt(k), totalJt: 0, count: 0 };
        map[k].totalJt += d.ckpn_berjalan / M;
        map[k].count++;
      });
      return Object.values(map).sort((a, b) => a.kol - b.kol);
    };
    const computeBySegmen = (deb) => {
      const map = {};
      deb.forEach(d => {
        const s = d.segmentasi || 'Lainnya';
        if (!map[s]) map[s] = { segmen: s, totalJt: 0, count: 0 };
        map[s].totalJt += d.ckpn_berjalan / M;
        map[s].count++;
      });
      return Object.values(map).sort((a, b) => b.totalJt - a.totalJt);
    };

    onProgress?.(98, "Memuat data dashboard...");
    await loadCkpnData();
    onProgress?.(100, "Selesai!");
  };

  const handleUploadRecPh = async (file, fileTanggal, onProgress) => {
    onProgress?.(5, "Parsing file Recovery PH...");
    const result = await parseRecoveryPH(file);
    onProgress?.(20, `${result.totalRows.toLocaleString("id-ID")} baris terbaca`);

    const MONTH_ID_LABEL = { jan:'Jan',feb:'Feb',mar:'Mar',apr:'Apr',mei:'Mei',jun:'Jun',jul:'Jul',agu:'Agu',sep:'Sep',okt:'Okt',nov:'Nov',des:'Des' };
    const periodeLabel = result.latestMonth ? `${MONTH_ID_LABEL[result.latestMonth]||result.latestMonth} ${new Date().getFullYear()}` : fileTanggal.slice(0, 7);

    const { data: upload, error } = await insertUpload({
      jenis: 'rec_ph', tgl_file: fileTanggal,
      periode_label: periodeLabel,
      row_count: result.totalRows, uploaded_by: currentUser?.pn || 'admin',
    });
    if (error || !upload) throw new Error(error?.message || 'Gagal menyimpan upload');
    onProgress?.(28, "Menyimpan ke database...");

    const total = result.debitur.length;
    for (let i = 0; i < total; i += CHUNK) {
      const chunk = result.debitur.slice(i, i + CHUNK).map(d => ({ upload_id: upload.id, ...d }));
      const { error: bulkErr } = await bulkInsertRecPh(chunk);
      if (bulkErr) throw new Error(bulkErr.message);
      onProgress?.(28 + Math.round(Math.min(i + CHUNK, total) / total * 68), `Menyimpan ${Math.min(i+CHUNK,total)} dari ${total}...`);
    }

    onProgress?.(98, "Memuat data dashboard...");
    await loadRecPhData();
    onProgress?.(100, "Selesai!");
  };

  const switchPeriode = async (upload) => {
    if (upload.periode_label === uploadedData?.periodeLabel) { setPeriodeOpen(false); return; }
    setPeriodeOpen(false);
    setDbLoading(true); setDbProgress(0);
    try {
      const uploadHistory    = uploadedData?.uploadHistory    || [];
      const uploadHistoryAll = uploadedData?.uploadHistoryAll || [];
      await loadDebiturForUpload(upload, uploadHistory, uploadHistoryAll);
    } catch (err) {
      console.error('Gagal ganti periode:', err);
    } finally {
      setDbLoading(false);
    }
  };


  const handleUploadFile = async (file, tglData, onProgress) => {
    if (!file) return;
    onProgress?.(3, "Membaca file Excel...");
    const result = await parseLW321(file);

    try {
      onProgress?.(8, "Menyimpan metadata upload...");
      const totalOsJt = result.debitur.reduce((s,d)=>s+d.osJt, 0);
      const totalTunggakanJt = result.debitur.reduce((s,d)=>s+(d.tunggakanTotal||0), 0);
      // Catatan: CKPN TIDAK dihitung/disimpan dari LW321 — CKPN punya file sendiri (jenis 'ckpn').
      const basePayload = {
        jenis: 'lw321',
        tgl_file: tglData || new Date().toISOString().split('T')[0],
        periode_label: result.periodeLabel,
        periode_str: result.periodeStr,
        date_printed: result.datePrinted,
        row_count: result.totalRows,
        uploaded_by: currentUser?.pn || 'admin',
      };
      const { data: upload, error: upErr } = await insertUpload({ ...basePayload, total_os_jt: totalOsJt, total_tunggakan_jt: totalTunggakanJt });
      if (upErr) throw new Error(upErr.message);

      const CHUNK = 500;
      const total = result.debitur.length;
      const mkRow = (d, withPlafon) => {
        const r = {
          upload_id: upload.id,
          cif: d.cif, nama: d.nama, ao: d.ao, ao_id: d.aoId, pn: d.pn,
          kode_uker: d.uker, uker_nama: d.ukerNama, segment: d.segment,
          sektor: d.sektor, os_jt: d.osJt, kol: d.kol, dpd: d.dpd,
          skor: d.skor, tier: d.tier, flag_restruk: d.flagRestruk || 'N',
          has_action: d.hasAction, resolved: d.resolved,
          tunggakan_pokok: d.tunggakanPokok, tunggakan_bunga: d.tunggakanBunga,
          tunggakan_denda: d.tunggakanDenda, tunggakan_penalty: d.tunggakanPenalty,
          tunggakan_total: d.tunggakanTotal,
        };
        if (withPlafon) r.plafon_jt = d.plafonJt ?? null;
        return r;
      };
      for (let i = 0; i < total; i += CHUNK) {
        const { error } = await bulkInsertDebitur(result.debitur.slice(i, i + CHUNK).map(d => mkRow(d, true)));
        if (error) throw new Error(error.message);
        const saved = Math.min(i + CHUNK, total);
        onProgress?.(10 + Math.round(saved / total * 88), `Menyimpan ${saved.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} debitur...`);
      }
      onProgress?.(100, "Selesai!");
    } catch (err) {
      console.error('Gagal simpan ke database:', err);
    }

    setUploadedData(result);
    setFilters(f => ({ ...f, uker:"semua", ao:"semua", segment:"semua", periode: result.periodeLabel }));
  };

  const perms = role ? ROLES[role] : null;

  const sourceDebitur = uploadedData?.debitur || [];

  const list = useMemo(()=>{
    if (!perms) return [];
    return sourceDebitur.filter(d=>{
      if (perms.scope==="ao"         && currentUser?.aoId && d.aoId!==currentUser.aoId) return false;
      if (perms.scope==="bermasalah" && d.tier==="rendah") return false;
      if (perms.scope==="uker"       && currentUser?.uker && d.uker!==currentUser.uker) return false;
      return (filters.uker==="semua" || d.uker===filters.uker)
        && (filters.ao==="semua" || d.aoId===filters.ao)
        && (filters.segment==="semua" || d.segment===filters.segment);
    });
  }, [filters, perms, sourceDebitur, currentUser]);
  const m = useMemo(()=>buildModel(list, filters.periode, uploadedData?.uploadHistory, uploadedData?.uploadHistoryAll), [list, filters.periode, uploadedData?.uploadHistory, uploadedData?.uploadHistoryAll]);

  // Masuk ke aplikasi setelah profil (role) didapat dari backend.
  const enterWithProfile = (profile) => {
    const user = { id:profile.id, pn:profile.pn, nama:profile.nama, username:profile.username, role:profile.role, uker:profile.uker ?? null, aoId:profile.ao_id ?? null };
    setCurrentUser(user); setRole(user.role); setPage("dashboard"); setProfileOpen(false);
    if (user.role==="ao")   setFilters({ uker:user.uker||"semua", ao:user.aoId||"semua", segment:"semua", periode:"Jun 2026" });
    else if (user.uker)     setFilters({ uker:user.uker, ao:"semua", segment:"semua", periode:"Jun 2026" });
    else                    setFilters({ uker:"semua", ao:"semua", segment:"semua", periode:"Jun 2026" });
    setDbLoading(true); setDbProgress(0);
    loadLatestData(); loadCkpnData(); loadRecPhData(); loadActionPlans();
  };

  // Login: PN → email Supabase → verifikasi → ambil profil (role) dari tabel MySQL users.
  const doLogin = async (pnInput, password) => {
    if (!supabase) return "Autentikasi belum dikonfigurasi. Hubungi IT.";
    const { error } = await supabase.auth.signInWithPassword({ email:`${pnInput}@${AUTH_EMAIL_DOMAIN}`, password });
    if (error) return "PN atau password salah.";
    const { data: profile } = await fetchAuthMe();
    if (!profile) { await supabase.auth.signOut(); return "Akun tidak terdaftar atau nonaktif. Hubungi IT."; }
    enterWithProfile(profile);
    return null;
  };

  const handleLogout = async () => {
    if (supabase) { try { await supabase.auth.signOut(); } catch { /* */ } }
    setCurrentUser(null); setRole(null); setPage("dashboard"); setProfileOpen(false);
    setCkpnData(null); setRecPhData(null); setMantriSnaps(null);
    setFilters({ uker:"semua", ao:"semua", segment:"semua", periode:"Mei 2026" });
  };

  // Pulihkan sesi saat halaman dibuka; keluar otomatis bila sesi berakhir.
  useEffect(() => {
    if (!supabase) { setAuthChecking(false); return; }
    let active = true;
    (async () => {
      try {
        const { data:{ session } } = await supabase.auth.getSession();
        if (active && session) {
          const { data: profile } = await fetchAuthMe();
          if (active && profile) enterWithProfile(profile);
        }
      } catch { /* */ }
      if (active) setAuthChecking(false);
    })();
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { setCurrentUser(null); setRole(null); }
    });
    return () => { active = false; subscription?.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (authChecking) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, gap:12 }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>EWS-CKPN</div>
      <div style={{ fontSize:12.5, color:C.gray }}>Memeriksa sesi…</div>
    </div>
  );
  if (!perms) return <Login onLogin={doLogin} />;

  if (dbLoading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:C.bg, gap:20 }}>
      <div style={{ textAlign:"center", marginBottom:4 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy, marginBottom:4 }}>EWS-CKPN</div>
        <div style={{ fontSize:12.5, color:C.gray }}>{dbProgressLabel || "Memuat data dari database..."}</div>
      </div>
      <div style={{ width:320, background:C.border, borderRadius:99, height:8, overflow:"hidden" }}>
        <div style={{ height:"100%", borderRadius:99, background:C.navy, width:`${dbProgress}%`, transition:"width 0.3s ease" }} />
      </div>
      <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{dbProgress}%</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const menus = MENU.filter(x=>perms.menus.includes(x.id));
  const safePage = perms.menus.includes(page) ? page : "dashboard";
  const cur = MENU.find(x=>x.id===safePage);
  const sub = cur.sub.replace("__DATE__", m.P.date);
  const DashboardComp = role==="ao" ? DashboardAO : role==="collection" ? DashboardCollection : role==="kepalaUnit" ? DashboardKepalaUnit : DashboardPinca;
  // Navigasi ke Daftar Debitur dengan filter awal (mis. dari klik chart sektor/segmen di Portfolio)
  const goDebitur = (preset) => { if (!perms.menus.includes("debitur")) return; setDebiturPreset(preset || null); setPage("debitur"); };
  // Deep-link dari Dashboard: klik nama debitur → Kinerja Unit (unit → mantri → debitur, breakdown terbuka)
  const goKinerjaDebitur = (d) => { if (!d || !perms.menus.includes("kinerjaUnit")) return; setKinerjaPreset({ uker:d.uker, aoId:d.aoId, cif:d.cif }); setPage("kinerjaUnit"); };
  // Ekspor tampilan halaman (dashboard/portfolio) jadi PDF — untuk dibagikan Pinca ke grup
  const handleExportPDF = async () => {
    if (!contentRef.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      const fn = `${cur.title.replace(/[^\w]+/g,"_")}_${(m.P.date||"").replace(/\s+/g,"")}.pdf`;
      await exportDomToPDF(contentRef.current, fn, "portrait");
    } catch (e) { console.error("Gagal membuat PDF:", e); window.alert("Gagal membuat PDF: " + (e?.message || e)); }
    finally { setPdfBusy(false); }
  };
  const pages = {
    dashboard:   <DashboardComp m={m} go={(p)=>perms.menus.includes(p)&&setPage(p)} goKinerjaDebitur={goKinerjaDebitur} perms={perms} ckpnData={ckpnData} recPhData={recPhData} />,
    portfolio:   <PortfolioStatus m={m} ckpnData={ckpnData} goDebitur={goDebitur} />,
    ews:         <EarlyWarning m={m} />,
    debitur:     <DaftarDebitur list={list} preset={debiturPreset} />,
    action:      <ActionPlan m={m} perms={perms} list={list} />,
    ckpn:        <SimulasiCKPN m={m} />,
    kinerjaAO:   <KinerjaAO m={m} list={list} plans={actionPlansData} goKinerjaDebitur={goKinerjaDebitur} />,
    kinerjaUnit: <KinerjaUnit m={m} list={list} preset={kinerjaPreset} />,
    osKurang50:  <OsKurang50 list={list} m={m} />,
    buatLaporan: <BuatLaporan list={list} />,
    mantriRealisasi: <MantriReport reportId="mantriRealisasi" snaps={mantriSnaps} />,
    mantriOs:        <MantriReport reportId="mantriOs" snaps={mantriSnaps} />,
    mantriSmlRp:     <MantriReport reportId="mantriSmlRp" snaps={mantriSnaps} />,
    mantriNplRp:     <MantriReport reportId="mantriNplRp" snaps={mantriSnaps} />,
    mantriSmlPct:    <MantriReport reportId="mantriSmlPct" snaps={mantriSnaps} />,
    mantriNplPct:    <MantriReport reportId="mantriNplPct" snaps={mantriSnaps} />,
    mantriNetDgSml:  <MantriReport reportId="mantriNetDgSml" snaps={mantriSnaps} />,
    mantriNetDgNpl:  <MantriReport reportId="mantriNetDgNpl" snaps={mantriSnaps} />,
    laporan:     <Laporan m={m} list={list} perms={perms} />,
    manajemen:   <ManajemenUser currentUser={currentUser} />,
    pengaturan:  <Pengaturan perms={perms} onUpload={handleUploadFile} uploadedData={uploadedData} onReset={()=>{ setUploadedData(null); setFilters(f=>({...f,periode:"Jun 2026"})); }} onDataChanged={async()=>{ setMantriSnaps(null); await loadLatestData(); }} onUploadCkpn={handleUploadCkpn} onUploadRecPh={handleUploadRecPh} />,
  };
  const aktifFilter = perms.scope==="all" && (filters.uker!=="semua" || filters.segment!=="semua" || filters.ao!=="semua");

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"system-ui,'Segoe UI',Roboto,sans-serif", background:C.bg, color:C.text }}>
      <Sidebar page={safePage} setPage={(p)=>{ setDebiturPreset(null); setKinerjaPreset(null); setPage(p); }} menus={menus} periode={filters.periode} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <header style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"12px 22px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, gap:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:800, color:"#1F2937", letterSpacing:.3, whiteSpace:"nowrap" }}>{cur.title}</div>
            <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>
              {sub}
              {perms.scope==="ao" && <span style={{ color:C.navy, fontWeight:600 }}> · Portofolio {currentUser?.nama||perms.nama} ({fNum(list.length)} debitur)</span>}
              {perms.scope==="bermasalah" && <span style={{ color:C.red, fontWeight:600 }}> · Debitur bermasalah ({fNum(list.length)})</span>}
              {perms.scope==="uker" && <span style={{ color:C.kpiTeal, fontWeight:600 }}> · Unit {UKER.find(uk=>uk.kode===currentUser?.uker)?.nama||""} ({fNum(list.length)} debitur)</span>}
              {aktifFilter && <span style={{ color:C.navy, fontWeight:600 }}> · Filter aktif: {fNum(list.length)} debitur</span>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            {["dashboard","portfolio"].includes(safePage) && (
              <button onClick={handleExportPDF} disabled={pdfBusy} title="Unduh tampilan ini sebagai PDF"
                style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:7, background:pdfBusy?C.grayLt:C.white, color:C.textMd, fontSize:12.5, cursor:pdfBusy?"wait":"pointer" }}>
                <Ic n="download" size={15} /> {pdfBusy ? "Membuat PDF…" : "Unduh PDF"}
              </button>
            )}
            <button onClick={()=>setInfoOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", border:`1px solid ${C.border}`, borderRadius:7, background:C.white, color:C.textMd, fontSize:12.5, cursor:"pointer" }}><Ic n="infoDoc" size={15} /> Info Data</button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12.5, color:C.gray }}>Periode</span>
              {uploadedData ? (
                <div style={{ position:"relative" }}>
                  <button onClick={()=>setPeriodeOpen(o=>!o)}
                    style={{ fontSize:12.5, fontWeight:600, color:C.navy, padding:"6px 10px", border:`1px solid ${periodeOpen?C.navy:C.border}`,
                      borderRadius:7, background:C.white, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    {uploadedData.periodeLabel}
                    {availablePeriodes.length > 1 && <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round"/></svg>}
                  </button>
                  {periodeOpen && availablePeriodes.length > 0 && (
                    <>
                      <div onClick={()=>setPeriodeOpen(false)} style={{ position:"fixed", inset:0, zIndex:98 }} />
                      <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:C.white, border:`1px solid ${C.border}`,
                        borderRadius:8, boxShadow:"0 4px 16px rgba(0,0,0,.1)", zIndex:99, minWidth:140, overflow:"hidden" }}>
                        {availablePeriodes.map(up => {
                          const isActive = up.periode_label === uploadedData.periodeLabel;
                          return (
                            <button key={up.id} onClick={()=>switchPeriode(up)}
                              style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"9px 14px",
                                background: isActive ? C.navyLt : "none", border:"none", fontSize:12.5, color: isActive ? C.navy : C.text,
                                fontWeight: isActive ? 700 : 400, cursor:"pointer", textAlign:"left", gap:8 }}>
                              {up.periode_label}
                              {isActive && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4l3.5 3.5L11 1" stroke={C.navy} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Select value={filters.periode} onChange={e=>setFilters(f=>({ ...f, periode:e.target.value }))} options={["Mar 2026","Apr 2026","Mei 2026"]} />
              )}
            </div>
            <div style={{ width:1, height:30, background:C.border }} />
            <div style={{ position:"relative" }}>
              <div onClick={()=>setProfileOpen(o=>!o)} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:perms.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Ic n={perms.icon} size={20} /></div>
                <div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:"#1F2937" }}>{currentUser?.nama||perms.nama}</div>
                  <div style={{ fontSize:11, color:C.gray }}>{perms.title}</div>
                </div>
                <Ic n="chevronD" size={14} style={{ color:C.gray }} />
              </div>
              {profileOpen && (
                <div style={{ position:"absolute", right:0, top:46, width:248, background:C.white, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 10px 30px rgba(16,24,40,.15)", zIndex:20, overflow:"hidden" }}>
                  <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{currentUser?.nama||perms.nama}</div>
                    <div style={{ fontSize:11.5, color:perms.color, fontWeight:600, marginTop:1 }}>{perms.title}</div>
                    {currentUser?.username && <div style={{ fontSize:11, color:C.gray, fontFamily:"monospace", marginTop:3 }}>@{currentUser.username}</div>}
                    {currentUser?.pn && <div style={{ fontSize:11, color:C.gray, marginTop:1 }}>PN {currentUser.pn}</div>}
                    {currentUser?.uker && <div style={{ fontSize:11, color:C.gray, marginTop:1 }}>{UKER.find(uk=>uk.kode===currentUser.uker)?.nama||currentUser.uker}</div>}
                  </div>
                  <div style={{ padding:"6px 8px" }}>
                    <div onClick={handleLogout}
                      style={{ padding:"9px 12px", textAlign:"center", color:C.red, fontSize:13, fontWeight:700, cursor:"pointer", borderRadius:7 }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.redLt}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      Keluar
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main style={{ flex:1, overflowY:"auto", background:C.bg, padding:16 }} onClick={()=>profileOpen&&setProfileOpen(false)}>
          <div ref={contentRef}>{pages[safePage]}</div>
        </main>
      </div>

      {/* Watermark / kredit pembuat — klik buka portfolio di tab baru */}
      <a href="https://mfaridsyam.vercel.app" target="_blank" rel="noopener noreferrer" title="Portfolio — Muhammad Farid Syam"
        style={{ position:"fixed", right:14, bottom:12, zIndex:90, fontSize:11, fontWeight:700, color:"rgba(15,42,80,.5)",
          background:"rgba(255,255,255,.72)", border:"1px solid rgba(15,42,80,.14)", borderRadius:20, padding:"4px 12px",
          textDecoration:"none", boxShadow:"0 2px 8px rgba(0,0,0,.08)", display:"flex", alignItems:"center", gap:6, letterSpacing:.2 }}
        onMouseEnter={e=>{ e.currentTarget.style.color="rgba(15,42,80,.95)"; e.currentTarget.style.background="rgba(255,255,255,.95)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.color="rgba(15,42,80,.5)"; e.currentTarget.style.background="rgba(255,255,255,.72)"; }}>
        <span style={{ fontSize:9 }}>◆</span> mfaridsyam.vercel.app
      </a>

      {infoOpen && (
        <div onClick={()=>setInfoOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:14, width:"100%", maxWidth:620, maxHeight:"88vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ padding:"18px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Ic n="infoDoc" size={18} style={{ color:C.navy }} />
                <span style={{ fontSize:15, fontWeight:700, color:C.text }}>Informasi Data</span>
              </div>
              <button onClick={()=>setInfoOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", color:C.gray, fontSize:18, lineHeight:1 }}>✕</button>
            </div>

            <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:20 }}>

              {/* Tentang Aplikasi */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Tentang Aplikasi</div>
                <div style={{ ...card, background:C.navyLt, border:`1px solid #C7D9F0` }}>
                  <div style={{ fontSize:13.5, fontWeight:700, color:C.navy, marginBottom:6 }}>EWS-CKPN — Early Warning System</div>
                  <div style={{ fontSize:12.5, color:C.textMd, lineHeight:1.7 }}>
                    Sistem pemantauan portofolio kredit berbasis risiko untuk mendukung pengambilan keputusan Pimpinan Cabang, Manajer Bisnis, dan Mantri di wilayah BO Polewali.
                    Aplikasi ini menampilkan kondisi kolektibilitas debitur secara real-time, memfasilitasi input action plan penyelamatan, serta menyimulasikan estimasi CKPN berdasarkan skenario tindak lanjut.
                  </div>
                  <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
                    {["Monitoring Portofolio","Early Warning Alert","Simulasi CKPN","Action Plan","Kinerja RM/Mantri"].map(t=>(
                      <span key={t} style={{ fontSize:11, padding:"2px 10px", borderRadius:20, background:C.white, color:C.navy, border:`1px solid #C7D9F0`, fontWeight:600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sumber Data */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Sumber Data & Pembaruan</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    { label:"Sumber Data",       value:"Sistem Informasi Kredit BRI (SIKREDIT) · Core Banking", icon:"infoDoc" },
                    { label:"Cakupan Wilayah",   value:"BO Polewali — 1 Kanca, 2 KCP, 10 Unit Kerja", icon:"building" },
                    { label:"Total Debitur",      value:`${fNum(DEBITUR.length)} debitur aktif (data mock per Mei 2026)`, icon:"users" },
                    { label:"Periode Tersedia",   value:"Maret 2026 · April 2026 · Mei 2026", icon:"calendar" },
                    { label:"Tanggal Ekstrak",    value:"31 Mei 2026 · 17:00 WIB", icon:"check" },
                    { label:"Frekuensi Update",   value:"Bulanan — setiap akhir bulan buku", icon:"infoCircle" },
                  ].map((r,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 12px", background:C.grayLt, borderRadius:8 }}>
                      <Ic n={r.icon} size={15} style={{ color:C.navy, marginTop:1, flexShrink:0 }} />
                      <div style={{ fontSize:12, color:C.gray, width:130, flexShrink:0 }}>{r.label}</div>
                      <div style={{ fontSize:12.5, color:C.text, fontWeight:500 }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metodologi */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.5, marginBottom:10 }}>Metodologi Perhitungan</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    { judul:"Klasifikasi Risiko", isi:"Rendah = Kol 1 (DPD 0) · Sedang = Kol 2A & 2B (DPD 1–90) · Tinggi = Kol 3–5 (DPD > 90)" },
                    { judul:"Skor Risiko (1–99)", isi:"Berbasis DPD dan riwayat pembayaran. Skor ≥ 80 = rendah, 60–79 = sedang, < 60 = tinggi. Semakin rendah skor, semakin berisiko." },
                    { judul:"CKPN Existing",      isi:"Dihitung berdasarkan Outstanding × Coverage Rate per kolektibilitas: Kol 1→1%, 2A→5%, 2B→15%, 3→50%, 4→75%, 5→100%." },
                    { judul:"Potensi Penghematan CKPN", isi:"Estimasi penurunan CKPN jika action plan berhasil menurunkan kolektibilitas debitur satu tingkat ke atas (mis. Kol 3→2B)." },
                    { judul:"NPL Ratio",          isi:"Outstanding Kol 3–5 dibagi Total Outstanding × 100%. Mengacu pada definisi NPL standar OJK." },
                  ].map((m,i)=>(
                    <div key={i} style={{ padding:"10px 14px", border:`1px solid ${C.border}`, borderRadius:8, background:C.white }}>
                      <div style={{ fontSize:12.5, fontWeight:700, color:C.navy, marginBottom:4 }}>{m.judul}</div>
                      <div style={{ fontSize:12, color:C.textMd, lineHeight:1.6 }}>{m.isi}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize:11, color:C.gray, textAlign:"center", paddingTop:4, borderTop:`1px solid ${C.border}` }}>
                Versi 1.1 · Data bersifat simulasi untuk keperluan demo · © 2026 BRI BO Polewali
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
