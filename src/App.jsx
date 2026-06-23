import { useState, useEffect, useMemo, useRef } from "react";
import { parseLW321 } from "./lw321Parser.js";
import { supabase } from "./supabaseClient.js";
import * as XLSX from 'xlsx';
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


const KOL_ORDER = ["1","2A","2B","3","4","5"];
const KOL_COLOR = { "1":"#16A34A","2A":"#F59E0B","2B":"#EA580C","3":"#DC2626","4":"#B91C1C","5":"#7F1D1D" };
const KOL_LABEL = { "1":"Lancar","2A":"2A","2B":"2B","3":"3","4":"4","5":"5" };
const COV = { "1":0.01,"2A":0.05,"2B":0.15,"3":0.5,"4":0.75,"5":1.0 };
const BETTER = { "2A":"1","2B":"2A","3":"2B","4":"3","5":"4" };

const DEMO_KEPALA_UKER_KODE = "5037";

const ALL_MENUS = ["dashboard","portfolio","ews","debitur","action","ckpn","kinerjaAO","kinerjaUnit","manajemen","pengaturan"];
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
    desc:"Manajemen user & konfigurasi sistem",         akses:"Kelola akun pengguna · upload file LW321 & CKPN",
    scope:"all",         editAction:false, editData:true,  exportReport:false, menus:["dashboard","manajemen","pengaturan"] },
};

const DEMO_KU_UKER  = "5032";
const USERS = [
  { id:"u-it-1",  pn:"90188658", nama:"Muhammad Farid Syam",   username:"farid.syam",      password:"demo123", role:"admin",      uker:null,         aoId:null, aktif:true },
  { id:"u-it-2",  pn:"387188",   nama:"Deni Suhardiman",       username:"deni.suhardiman", password:"demo123", role:"admin",      uker:null,         aoId:null, aktif:true },
  { id:"u-pinca", pn:"56848",    nama:"Hery Santoso",          username:"hery.santoso",    password:"demo123", role:"pinca",      uker:null,         aoId:null, aktif:true },
  { id:"u-mb",    pn:"79028",    nama:"A. Achmad Rizal",       username:"achmad.rizal",    password:"demo123", role:"mb",         uker:null,         aoId:null, aktif:true },
  { id:"u-ku",    pn:"176363",   nama:"Syamsuddin",            username:"syamsuddin",      password:"demo123", role:"kepalaUnit", uker:DEMO_KU_UKER, aoId:null, aktif:true },
];

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
const PAT_OS    = [0.93,0.95,0.96,0.975,0.99,1.0];
const PAT_DEB   = [0.95,0.96,0.97,0.98,0.99,1.0];
const PAT_CKPN  = [0.87,0.90,0.92,0.95,0.98,1.0];
const PAT_TUNGG = [0.66,0.74,0.81,0.94,0.86,1.0];
const PAT_CKPN_12  = [0.62,0.65,0.68,0.72,0.76,0.81, 0.87,0.90,0.92,0.95,0.98,1.0];
const PAT_TUNGG_12 = [0.38,0.43,0.49,0.54,0.58,0.62, 0.66,0.74,0.81,0.94,0.86,1.0];

// --- Snapshot harian & bulanan (mock) ---
const HARI_KERJA_JUNI = ["1 Jun","2 Jun","3 Jun","4 Jun","5 Jun","8 Jun","9 Jun","10 Jun","11 Jun","12 Jun","15 Jun","16 Jun","17 Jun","18 Jun","19 Jun","20 Jun"];

// Nilai acuan Mei '26 (akhir bulan) — estimasi konsisten dengan pola buildModel
const _SB = { osJt:28500, totalDeb:440, npl:7.80, ckpnJt:1185, tunggakanJt:3180 };
const _PAT6_DEB = [0.95,0.96,0.97,0.98,0.99,1.0];
const _PAT6_NPL = [0.83,0.87,0.90,0.94,0.97,1.0];

const SNAPSHOT_BULANAN = ["Des '25","Jan '26","Feb '26","Mar '26","Apr '26","Mei '26"].map((bulan,i)=>({
  bulan, tipe:"bulanan",
  osJt:        Math.round(_SB.osJt        * PAT_OS[i]),
  totalDeb:    Math.round(_SB.totalDeb    * _PAT6_DEB[i]),
  npl:         +(_SB.npl                 * _PAT6_NPL[i]).toFixed(2),
  ckpnJt:      Math.round(_SB.ckpnJt     * PAT_CKPN[i]),
  tunggakanJt: Math.round(_SB.tunggakanJt* PAT_TUNGG[i]),
}));

const rngSnap = mulberry32(20260620);
const SNAPSHOT_HARIAN = (()=>{
  const mei = SNAPSHOT_BULANAN[5];
  const rows = [];
  let cur = {
    osJt:        Math.round(mei.osJt        * 1.004),
    totalDeb:    mei.totalDeb,
    npl:         mei.npl,
    ckpnJt:      Math.round(mei.ckpnJt      * 1.005),
    tunggakanJt: Math.round(mei.tunggakanJt * 1.004),
  };
  for (const tgl of HARI_KERJA_JUNI) {
    cur = {
      osJt:        Math.round(cur.osJt        * (1 + (rngSnap()-0.5)*0.006  + 0.0004)),
      totalDeb:    cur.totalDeb + (rngSnap() > 0.58 ? 1 : 0),
      npl:         +Math.min(10.5, Math.max(6.0, cur.npl + (rngSnap()-0.46)*0.12)).toFixed(2),
      ckpnJt:      Math.round(cur.ckpnJt      * (1 + (rngSnap()-0.5)*0.008  + 0.0005)),
      tunggakanJt: Math.round(cur.tunggakanJt * (1 + (rngSnap()-0.5)*0.008  + 0.0004)),
    };
    rows.push({ tgl, tipe:"harian", ...cur });
  }
  return rows;
})();

// --- POIN 2: buildTrendData ---
function buildTrendData(periode, serCKPN, serTunggakan, serOS, npl) {
  const now = new Date(); const curLabel = `${_BNAMES[now.getMonth()]} ${now.getFullYear()}`;
  const isCurrentMonth = periode === curLabel;
  const monthly = (ser) => ser.map(d => ({ ...d, tipe:"bulanan" }));

  if (!isCurrentMonth) {
    return {
      trendOS:        monthly(serOS),
      trendCKPN:      monthly(serCKPN),
      trendTunggakan: monthly(serTunggakan),
      trendNPL:       serCKPN.map((d,i) => ({ bln:d.bln, nilai:+(_PAT6_NPL[i]*npl).toFixed(2), tipe:"bulanan" })),
      isCurrentMonth: false,
      label: "6 bulan terakhir",
    };
  }

  // Skala SNAPSHOT_HARIAN relatif terhadap titik Mei '26
  const meiCKPN  = serCKPN[serCKPN.length-1].nilai;
  const meiTungg = serTunggakan[serTunggakan.length-1].nilai;
  const meiOS    = serOS[serOS.length-1].nilai;
  const bCKPN    = SNAPSHOT_BULANAN[5].ckpnJt;
  const bTungg   = SNAPSHOT_BULANAN[5].tunggakanJt;
  const bOS      = SNAPSHOT_BULANAN[5].osJt;

  const dailyCKPN  = SNAPSHOT_HARIAN.map(s => ({ bln:s.tgl, nilai:+(s.ckpnJt/bCKPN*meiCKPN).toFixed(3),          tipe:"harian" }));
  const dailyTungg = SNAPSHOT_HARIAN.map(s => ({ bln:s.tgl, nilai:+(s.tunggakanJt/bTungg*meiTungg).toFixed(3),    tipe:"harian" }));
  const dailyOS    = SNAPSHOT_HARIAN.map(s => ({ bln:s.tgl, nilai:+(s.osJt/bOS*meiOS).toFixed(3),                 tipe:"harian" }));
  const dailyNPL   = SNAPSHOT_HARIAN.map(s => ({ bln:s.tgl, nilai:s.npl, tipe:"harian" }));

  return {
    trendOS:        [...monthly(serOS),        ...dailyOS],
    trendCKPN:      [...monthly(serCKPN),      ...dailyCKPN],
    trendTunggakan: [...monthly(serTunggakan), ...dailyTungg],
    trendNPL:       [...serCKPN.map((d,i) => ({ bln:d.bln, nilai:+(_PAT6_NPL[i]*npl).toFixed(2), tipe:"bulanan" })), ...dailyNPL],
    isCurrentMonth: true,
    label: "6 bln + harian Jun 2026",
  };
}

const fNum  = (n)=>Math.round(n).toLocaleString("id-ID");
const fMil  = (jt)=>"Rp "+(jt/1000).toLocaleString("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2})+" M";
const fJt   = (jt)=>"Rp "+Math.round(jt).toLocaleString("id-ID")+" Jt";
const fFull = (jt)=>"Rp "+Math.round(jt*1e6).toLocaleString("id-ID");
const fPct  = (x,d=2)=>x.toLocaleString("id-ID",{minimumFractionDigits:d,maximumFractionDigits:d})+"%";
const fMilV = (v)=>v.toLocaleString("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1})+" M";

function buildModel(list, periode, uploadHistory) {
  const P = getPeriode(periode);
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
  const totalTunggakanAll = sum(list,d=>d.tunggakanTotal||0) * f;

  const ser = (cur,pat)=>pat.map((p,i)=>({ bln:P.months[i], nilai:+(cur*p).toFixed(3) }));
  const realH = uploadHistory && uploadHistory.length >= 2;
  const trendOS_raw = realH
    ? uploadHistory.map(u=>({ bln:u.periodeLabel, nilai:+(u.totalOsJt/1000).toFixed(3) }))
    : ser(totalOsJt/1000, PAT_OS);
  const delta = (pat)=> (1-pat[4]/pat[5])*100;

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
  }); // urutan mengikuti UKER array (KANCA → KCP → Unit)

  const gA = groupBy(d=>d.aoId);
  const perAO = Object.values(gA).map(it=>{
    const a = it[0];
    return { nama:a.ao, uker:a.ukerNama, pn:a.pn||"", deb:it.length, osJt:sum(it,d=>d.osJt)*f,
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
    tgl:`${20+(i%9)}/05/2026`, cif:d.cif, nama:d.nama, ao:d.pn?`${d.pn} – ${d.ao}`:d.ao, kol:d.kol,
    jenis:jenisFor(d,i), target:`${10+(i%18)}/06/2026`,
    status:d.resolved?"selesai":"in_progress", hasil:d.resolved?"Debitur konfirmasi membaik":"Dalam proses tindak lanjut",
  }));

  const ckpnDebitur = [...list].filter(d=>d.kol!=="1").sort((a,b)=>b.osJt*COV[b.kol]-a.osJt*COV[a.kol]).slice(0,10).map(d=>{
    const ex=d.osJt*COV[d.kol]*f; const sv=d.hasAction?d.osJt*(COV[d.kol]-COV[BETTER[d.kol]||d.kol])*f:0;
    return { nama:d.nama, osJt:d.osJt*f, kol:d.kol, ckpn:ex, saving:sv, pct: ex?sv/ex*100:0 };
  });

  const ser12 = (cur,pat)=>pat.map((p,i)=>({ bln:P.months12[i], nilai:+(cur*p).toFixed(3) }));

  const realisasiPctArr = [0.09,0.11,0.10,0.08,0.12,0.09,0.10,0.11,0.08,0.10,0.09,0.12,0.10];
  const realisasiPerUker = perUker.map((u,i)=>({ kode:u.kode, nama:u.nama, realisasiJt:Math.round(u.osJt*realisasiPctArr[i%realisasiPctArr.length]) }));
  const realisasiJt = realisasiPerUker.reduce((s,u)=>s+u.realisasiJt,0);
  const nettDisbursed = Math.round(realisasiJt - totalOsJt * 0.072);

  perUker.filter(u=>u.npl>4.5).slice(0,4).forEach(u=>{
    alerts.push({ level:"sedang", tag:"alertOS", text:`Unit ${u.nama} — Estimasi penurunan outstanding > 10% (bulan ini vs bulan lalu) · OS: ${fJt(u.osJt)}`, time:mkAlertTime(alerts.length) });
  });
  perAO.filter(a=>a.tinggi>=3).slice(0,3).forEach(a=>{
    alerts.push({ level:"sedang", tag:"alertOS", text:`${a.pn||""} – ${a.nama} — Estimasi penurunan outstanding RM/Mantri > 15% · OS: ${fJt(a.osJt)}`, time:mkAlertTime(alerts.length) });
  });

  const trendCKPN_raw    = ser(ckpnExisting/1000, PAT_CKPN);
  const trendTunggakan_raw = realH
    ? uploadHistory.map(u=>({ bln:u.periodeLabel, nilai:+(u.totalTunggakanJt/1000).toFixed(3) }))
    : ser(tunggakanJt/1000, PAT_TUNGG);
  const trendTunggakan12 = realH
    ? uploadHistory.map(u=>({ bln:u.periodeLabel, nilai:+(u.totalTunggakanJt/1000).toFixed(3) }))
    : ser12(tunggakanJt/1000, PAT_TUNGG_12);
  const trendData = buildTrendData(periode, trendCKPN_raw, trendTunggakan_raw, trendOS_raw, npl);

  return {
    P, totalDeb, totalOsJt, tier, kol, npl, ckpnExisting, ckpnAfter, ckpnSaving, savingPct,
    tunggakanJt, totalTunggakanAll,
    trendTunggakan: trendTunggakan_raw,
    trendCKPN: trendCKPN_raw,
    trendTunggakan12,
    trendCKPN12: ser12(ckpnExisting/1000, PAT_CKPN_12),
    trendData,
    deltas:{ os:delta(PAT_OS), deb:delta(PAT_DEB), ckpn:delta(PAT_CKPN) },
    top10, ringkasanEW, perUker, perAO, perSektor, perSegment, alerts, actionPlans, ckpnDebitur,
    realisasiJt, nettDisbursed, realisasiPerUker,
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
  return (
    <div style={{ position:"relative" }}>
      {infoLabel && <div style={{ position:"absolute", right:0, top:-2, fontSize:10.5, color:C.gray, fontWeight:500, zIndex:1 }}>{infoLabel}</div>}
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={data} margin={{ top:22, right:16, left:-4, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
          <XAxis dataKey="bln" tick={{ fontSize:9.5, fill:C.gray }} tickLine={false} axisLine={{ stroke:C.border }}
            interval="preserveStartEnd" />
          <YAxis tick={{ fontSize:10.5, fill:C.gray }} tickLine={false} axisLine={false} domain={[0,top]} tickFormatter={(v)=>v+" M"} width={42} />
          <Tooltip formatter={(v)=>[fMilV(v),"Nilai"]} labelFormatter={(l)=>l} />
          <Line type="monotone" dataKey="nilai" stroke={color} strokeWidth={2} dot={<CustomDot />} activeDot={{ r:5 }}>
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
      <Bar dataKey={dataKey} fill={color} radius={[0,4,4,0]} maxBarSize={16}
        onClick={onBarClick ? (entry) => onBarClick(entry) : undefined}
        style={onBarClick ? { cursor:"pointer" } : {}}>
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
const SubFilter = ({ children }) => (
  <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>{children}</div>
);


function DashboardPinca({ m, go }) {
  const w = useWindowWidth();
  const kpiCols   = w >= 1280 ? "repeat(6,1fr)" : w >= 900 ? "repeat(3,1fr)" : "repeat(2,1fr)";
  const chartsRow = w >= 1100 ? "1fr 1fr 1fr" : w >= 720 ? "1fr 1fr" : "1fr";
  const [blnTungg, setBlnTungg] = useState("6 Bulan");
  const [blnCKPN,  setBlnCKPN]  = useState("6 Bulan");
  const [sortTop10, setSortTop10] = useState("dpd");
  const top10Sorted = [...m.top10].sort((a,b)=> sortTop10==="os" ? b.osJt-a.osJt : b.dpd-a.dpd);
  const hasBulanIni = m.trendData?.isCurrentMonth;
  const trendOpts   = hasBulanIni ? ["Bulan Ini","3 Bulan","6 Bulan","12 Bulan"] : ["3 Bulan","6 Bulan","12 Bulan"];
  const getTrend = (d6, d12, bln, dailyKey) => {
    if (bln === "Bulan Ini") return (m.trendData[dailyKey] || []).filter(d=>d.tipe==="harian");
    if (bln === "3 Bulan")   return d6.slice(-3);
    if (bln === "12 Bulan")  return d12;
    return d6;
  };
  const row3      = w >= 1150 ? "1.5fr 1fr 1fr" : "1fr";
  const row4      = w >= 1000 ? "1.3fr 1fr" : "1fr";
  const up = (x)=>(x>=0?"▲ ":"▼ ")+fPct(Math.abs(x),2)+" vs bln lalu";

  const KPI_BIG = [
    { icon:"wallet",  color:C.kpiBlue,   label:"Total Outstanding",       prefix:"Rp", value:fMil(m.totalOsJt).replace("Rp ",""),           sub:up(m.deltas.os),                                     subColor:m.deltas.os>=0?C.green:C.red },
    { icon:"warning", color:C.kpiRed,    label:"Debitur Bermasalah (3-5)",              value:fNum(m.tier.tinggi),                            sub:fPct(m.ringkasanEW[0].pct)+" dari total debitur",    subColor:C.red },
    { icon:"shield",  color:C.kpiPurple, label:"CKPN Existing",           prefix:"Rp", value:fMil(m.ckpnExisting).replace("Rp ",""),         sub:up(m.deltas.ckpn)+" · potensi hemat "+fMil(m.ckpnSaving).replace("Rp ",""), subColor:C.red },
  ];
  const KPI_SMALL = [
    { icon:"thumb",      color:C.kpiGreen,  label:"Realisasi Baru Bln Ini",  prefix:"Rp", value:fMil(m.realisasiJt||0).replace("Rp ",""),        sub:"Pinjaman baru bulan ini",                           subColor:C.green },
    { icon:"download",   color:C.kpiTeal,   label:"Nett Disbursed",          prefix:"Rp", value:fMil(m.nettDisbursed||0).replace("Rp ",""),        sub:"Realisasi dikurangi pelunasan",                     subColor:C.navy },
    { icon:"wallet",     color:C.kpiRed,    label:"Total Tunggakan",         prefix:"Rp", value:fMil(m.totalTunggakanAll||0).replace("Rp ",""),    sub:"Estimasi seluruh tunggakan",                        subColor:C.red },
    { icon:"users",      color:C.kpiTeal,   label:"Total Debitur",                        value:fNum(m.totalDeb),                                  sub:up(m.deltas.deb),                                    subColor:m.deltas.deb>=0?C.green:C.red },
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
          <CardTitle right={<Select value={blnCKPN} onChange={e=>setBlnCKPN(e.target.value)} options={trendOpts} />}>Trend CKPN</CardTitle>
          <div style={{ fontSize:11, color:C.gray, marginTop:-6, marginBottom:4 }}>(Dalam Miliar Rupiah)</div>
          <TrendChart data={getTrend(m.trendCKPN, m.trendCKPN12, blnCKPN, "trendCKPN")} color={C.kpiBlue} />
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:row3, gap:12 }}>
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px 0" }}>
            <CardTitle right={
              <div style={{ display:"flex", gap:4 }}>
                {[{ k:"dpd", label:"DPD Tertinggi" },{ k:"os", label:"Outstanding Tertinggi" }].map(opt=>(
                  <button key={opt.k} onClick={()=>setSortTop10(opt.k)} style={{ padding:"3px 10px", border:`1px solid ${sortTop10===opt.k?C.navy:C.border}`, borderRadius:20, background:sortTop10===opt.k?C.navyLt:C.white, color:sortTop10===opt.k?C.navy:C.gray, fontSize:11, fontWeight:sortTop10===opt.k?700:500, cursor:"pointer" }}>{opt.label}</button>
                ))}
              </div>
            }>Top 10 Debitur Risiko Tinggi</CardTitle>
          </div>
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
                {top10Sorted.map((d,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid #F1F3F6` }}>
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
                  <td style={{ padding:"9px 12px", fontWeight:700, color:C.text }}>{fFull(top10Sorted.reduce((s,d)=>s+d.osJt,0))}</td>
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
        <Tabel headers={["CIF","Nama Debitur","RM/Mantri","Outstanding","DPD","Kol","Skor"]} colW={[88,160,110,110,50,46,56]}
          rows={m.top10.slice(0,5).map(d=>[
            d.cif, d.nama, d.ao,
            <span style={{ fontWeight:500 }}>{fJt(d.osJt)}</span>,
            <span style={{ color:C.red, fontWeight:600 }}>{d.dpd}</span>,
            d.kol, <SkorPill s={d.skor} />,
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
            {["semua","tinggi","sedang","rendah","alertOS"].map(lv=>{
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

function DaftarDebitur({ list }) {
  const [cari, setCari] = useState("");
  const [kol, setKol] = useState("Semua Kolektibilitas");
  const [risiko, setRisiko] = useState("Semua Risiko");
  const [selectedUker, setSelectedUker] = useState([]);
  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);
  const [expandedCif, setExpandedCif] = useState(null);
  const perPage = 12;

  const ukerList = UKER.filter(u=>list.some(d=>d.uker===u.kode));

  const filtered = list.filter(d=>{
    const okCari = d.nama.toLowerCase().includes(cari.toLowerCase()) || d.cif.includes(cari);
    const okKol = kol==="Semua Kolektibilitas" || ("Kol "+d.kol)===kol;
    const okRsk = risiko==="Semua Risiko" || risikoLabel[d.tier]===risiko;
    const okUker = selectedUker.length===0 || selectedUker.includes(d.uker);
    return okCari && okKol && okRsk && okUker;
  });
  const sorted = sortBy==="dpd" ? [...filtered].sort((a,b)=>b.dpd-a.dpd)
               : sortBy==="os"  ? [...filtered].sort((a,b)=>b.osJt-a.osJt)
               : filtered;
  const totalPage = Math.max(1, Math.ceil(sorted.length/perPage));
  const pg = Math.min(page, totalPage);
  const shown = sorted.slice((pg-1)*perPage, pg*perPage);
  const reset = (fn)=>(e)=>{ fn(e.target.value); setPage(1); };

  const inputS = { padding:"7px 10px 7px 32px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, background:C.white, color:C.text, width:240 };

  return (
    <div>
      <SubFilter>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:9, top:8, color:C.gray }}><Ic n="search" size={16} /></span>
          <input placeholder="Cari nama atau CIF..." value={cari} onChange={reset(setCari)} style={inputS} />
        </div>
        <MultiSelectUnit options={ukerList} selected={selectedUker} onChange={(v)=>{ setSelectedUker(v); setPage(1); }} />
        <Select value={kol} onChange={reset(setKol)} options={["Semua Kolektibilitas","Kol 1","Kol 2A","Kol 2B","Kol 3","Kol 4","Kol 5"]} />
        <Select value={risiko} onChange={reset(setRisiko)} options={["Semua Risiko","Risiko Tinggi","Risiko Sedang","Risiko Rendah"]} />
        <Select value={sortBy} onChange={(e)=>{ setSortBy(e.target.value); setPage(1); }} options={[{ value:"default", label:"Urutan Default" },{ value:"dpd", label:"DPD Tertinggi" },{ value:"os", label:"Outstanding Tertinggi" }]} />
        <span style={{ marginLeft:"auto", fontSize:13, color:C.gray }}>{fNum(sorted.length)} debitur</span>
      </SubFilter>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
            <thead>
              <tr>
                {["CIF","Nama Debitur","Unit Kerja","RM/Mantri Pengelola","Sektor Usaha","Outstanding","Kol","DPD","Skor","Status Risiko"].map((h,i)=>(
                  <th key={i} style={{ padding:"9px 12px", color:C.gray, fontWeight:600, fontSize:10.5, textTransform:"uppercase", textAlign:"left", width:[88,150,120,110,100,110,46,50,56,120][i], whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}`, background:C.grayLt }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((d,ri)=>{
                const isExp = expandedCif===d.cif;
                return [
                  <tr key={d.cif} onClick={()=>setExpandedCif(isExp?null:d.cif)} style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}>
                    <td style={{ padding:"9px 12px", color:C.textMd }}>{d.cif}</td>
                    <td style={{ padding:"9px 12px", color:C.text, fontWeight:500 }}>{d.nama}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd }}>{d.ukerNama}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd }}>{d.ao}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd }}>{d.sektor}</td>
                    <td style={{ padding:"9px 12px", fontWeight:500, color:C.textMd }}>{fJt(d.osJt)}</td>
                    <td style={{ padding:"9px 12px", color:C.textMd }}>{d.kol}</td>
                    <td style={{ padding:"9px 12px", color:d.dpd>30?C.red:d.dpd>0?C.amber:C.green, fontWeight:600 }}>{d.dpd}</td>
                    <td style={{ padding:"9px 12px" }}><SkorPill s={d.skor} /></td>
                    <td style={{ padding:"9px 12px" }}><Badge level={d.tier} /></td>
                  </tr>,
                  isExp && <BreakdownRow key={d.cif+"-exp"} d={d} colSpan={10} />
                ];
              })}
            </tbody>
          </table>
        </div>
        {sorted.length===0 && <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:14 }}>Tidak ada data</div>}
        {sorted.length>0 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderTop:`1px solid ${C.border}` }}>
            <span style={{ fontSize:12, color:C.gray }}>Menampilkan {(pg-1)*perPage+1}–{Math.min(pg*perPage,sorted.length)} dari {fNum(sorted.length)}</span>
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

function MultiSelectUnit({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  useEffect(()=>{
    const handler = (e)=>{ if (!document.getElementById("msu-drop")?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return ()=>document.removeEventListener("mousedown", handler);
  }, []);
  const allSelected = selected.length === 0;
  const label = allSelected ? "Semua Unit" : selected.length === 1 ? options.find(o=>o.kode===selected[0])?.nama : `${selected.length} Unit dipilih`;
  const toggle = (kode) => {
    onChange(selected.includes(kode) ? selected.filter(k=>k!==kode) : [...selected, kode]);
  };
  return (
    <div id="msu-drop" style={{ position:"relative" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ padding:"6px 10px", border:`1px solid ${selected.length>0?C.navy:C.border}`, borderRadius:7, fontSize:12.5, background:selected.length>0?C.navyLt:C.white, color:selected.length>0?C.navy:C.textMd, cursor:"pointer", display:"flex", alignItems:"center", gap:6, minWidth:148, whiteSpace:"nowrap" }}>
        <Ic n="building" size={14} />
        <span style={{ flex:1, textAlign:"left" }}>{label}</span>
        <Ic n="chevronD" size={13} />
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, zIndex:200, background:C.white, border:`1px solid ${C.border}`, borderRadius:9, boxShadow:"0 6px 24px rgba(0,0,0,.13)", minWidth:220, maxHeight:320, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:6 }}>
            <button onClick={()=>onChange([])} style={{ flex:1, padding:"4px 0", fontSize:11.5, border:`1px solid ${C.border}`, borderRadius:6, background:C.white, color:C.navy, cursor:"pointer", fontWeight:600 }}>Semua</button>
            <button onClick={()=>onChange(options.map(o=>o.kode))} style={{ flex:1, padding:"4px 0", fontSize:11.5, border:`1px solid ${C.border}`, borderRadius:6, background:C.white, color:C.gray, cursor:"pointer" }}>Pilih Semua</button>
          </div>
          <div style={{ overflowY:"auto", padding:"6px 0" }}>
            {options.map(o=>{
              const checked = selected.includes(o.kode);
              return (
                <label key={o.kode} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 12px", cursor:"pointer", background:checked?C.navyLt:"transparent", fontSize:12.5, color:checked?C.navy:C.textMd }}>
                  <input type="checkbox" checked={checked} onChange={()=>toggle(o.kode)} style={{ accentColor:C.navy, width:14, height:14, cursor:"pointer", flexShrink:0 }} />
                  <span style={{ flex:1 }}>{o.nama}</span>
                  <span style={{ fontSize:11, color:C.gray, background:C.grayLt, borderRadius:10, padding:"1px 7px" }}>{o.tipe}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionPlan({ m, perms }) {
  const w = useWindowWidth();
  const [extra, setExtra] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama:"", jenis:"Kunjungan", target:"", catatan:"" });
  const plans = [...extra, ...m.actionPlans];

  const handleTambah = () => {
    if (!form.nama) return;
    setExtra([{ tgl:new Date().toLocaleDateString("id-ID"), cif:"-", nama:form.nama, ao:"Demo Mantri 1", kol:"2B",
      jenis:form.jenis, target:form.target||"-", status:"in_progress", hasil:form.catatan||"-" }, ...extra]);
    setShowForm(false); setForm({ nama:"", jenis:"Kunjungan", target:"", catatan:"" });
  };
  const inputS = { width:"100%", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, background:C.white, color:C.text, boxSizing:"border-box" };

  const [cariAP, setCariAP] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua Status");
  const [filterJenis, setFilterJenis] = useState("Semua Jenis");
  const [filterKolAP, setFilterKolAP] = useState("Semua Kol");
  const [pageAP, setPageAP] = useState(1);
  const perPageAP = 10;

  const jenisOptions = ["Semua Jenis", ...Array.from(new Set(plans.map(p=>p.jenis)))];
  const kolOptions   = ["Semua Kol",   ...Array.from(new Set(plans.map(p=>p.kol))).sort()];

  const filteredPlans = plans.filter(p=>{
    const okCari   = p.nama.toLowerCase().includes(cariAP.toLowerCase()) || p.cif?.includes(cariAP);
    const okStatus = filterStatus==="Semua Status" || (filterStatus==="In Progress"?p.status==="in_progress":p.status==="selesai");
    const okJenis  = filterJenis==="Semua Jenis"   || p.jenis===filterJenis;
    const okKol    = filterKolAP==="Semua Kol"     || p.kol===filterKolAP.replace("Kol ","");
    return okCari && okStatus && okJenis && okKol;
  });
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
        <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:9, top:8, color:C.gray }}><Ic n="search" size={15} /></span>
            <input placeholder="Cari nama debitur..." value={cariAP} onChange={e=>{ setCariAP(e.target.value); setPageAP(1); }} style={{ padding:"6px 10px 6px 30px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12.5, background:C.white, color:C.text, width:200 }} />
          </div>
          <Select value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPageAP(1); }} options={["Semua Status","In Progress","Selesai"]} />
          <Select value={filterJenis}  onChange={e=>{ setFilterJenis(e.target.value);  setPageAP(1); }} options={jenisOptions} />
          <Select value={filterKolAP}  onChange={e=>{ setFilterKolAP(e.target.value);  setPageAP(1); }} options={kolOptions.map(k=>k==="Semua Kol"?k:"Kol "+k)} style={{}} />
          <span style={{ marginLeft:"auto", fontSize:12, color:C.gray }}>{filteredPlans.length} action plan</span>
        </div>
        <Tabel
          headers={["Tanggal","Nama Debitur","PIC","Kol","Jenis Tindakan","Target","Hasil","Status"]}
          colW={[90,150,95,46,150,95,160,110]}
          rows={shownPlans.map(p=>[
            p.tgl, p.nama, p.ao, p.kol, p.jenis, p.target, p.hasil,
            <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:p.status==="selesai"?C.greenLt:C.amberLt, color:p.status==="selesai"?C.green:C.amber, fontSize:11.5, fontWeight:600 }}>{statusLabel[p.status]}</span>,
          ])}
        />
        {filteredPlans.length===0 && <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:14 }}>Tidak ada data</div>}
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

function KinerjaAO({ m }) {
  const w = useWindowWidth();
  const top = m.perAO.slice(0,10);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"grid", gridTemplateColumns: w>=1000?"1fr 1fr":"1fr", gap:12 }}>
        <div style={card}>
          <CardTitle>Top 10 RM/Mantri — Outstanding</CardTitle>
          <BarH data={top} dataKey="osJt" nameKey="nama" color={C.kpiTeal} fmt={(v)=>fMilV(v/1000)} />
        </div>
        <div style={card}>
          <CardTitle>Top 10 RM/Mantri — Debitur Risiko Tinggi</CardTitle>
          <BarH data={[...m.perAO].sort((a,b)=>b.tinggi-a.tinggi).slice(0,10)} dataKey="tinggi" nameKey="nama" color={C.kpiRed} fmt={(v)=>fNum(v)} />
        </div>
      </div>
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 0" }}><CardTitle>Rekap Kinerja per RM/Mantri</CardTitle></div>
        <div style={{ height:"calc(100vh - 520px)", overflowY:"auto" }}>
          <Tabel stickyHeader
            headers={["RM/Mantri","PN","Unit Kerja","Outstanding","Jml Debitur","Risiko Tinggi","Action Plan","Berhasil"]}
            colW={[130,90,140,120,90,100,90,90]}
            rows={m.perAO.map(k=>[
              k.nama, <span style={{ fontFamily:"monospace", fontSize:11.5, color:C.navy }}>{k.pn}</span>, k.uker, fJt(k.osJt), k.deb,
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

function KinerjaUnit({ m, list }) {
  const w = useWindowWidth();
  const f = m.P.f;

  // Navigation
  const [selUker, setSelUker] = useState(null);
  const [selAO,   setSelAO]   = useState(null);

  // Level-0 sort
  const [unitSort, setUnitSort] = useState("default");

  // Level-1 sort + filter
  const [mantriSort,        setMantriSort]        = useState("nama");
  const [mantriKolFilter,   setMantriKolFilter]   = useState("semua");
  const [mantriRisFilter,   setMantriRisFilter]   = useState("semua");

  // Level-2 filter / sort / page / expand
  const [kolFilter,    setKolFilter]    = useState("semua");
  const [risikoFilter, setRisikoFilter] = useState("semua");
  const [debSort,      setDebSort]      = useState("dpd");
  const [debPage,      setDebPage]      = useState(1);
  const [expandedCif,  setExpandedCif]  = useState(null);
  const PER_PAGE = 20;

  // Reset filters when navigating between levels
  useEffect(() => {
    setKolFilter("semua"); setRisikoFilter("semua"); setDebSort("dpd"); setDebPage(1);
    setExpandedCif(null);
    setMantriSort("nama"); setMantriKolFilter("semua"); setMantriRisFilter("semua");
  }, [selUker, selAO]);

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
    if (mantriKolFilter !== "semua") items = items.filter(a => a.items.some(d => d.kol === mantriKolFilter));
    if (mantriRisFilter !== "semua") items = items.filter(a => a.items.some(d => risikoLabel[d.tier] === mantriRisFilter));
    if (mantriSort === "npl")    return items.sort((a,b)=>b.npl-a.npl);
    if (mantriSort === "risiko") return items.sort((a,b)=>b.tinggi-a.tinggi);
    if (mantriSort === "os")     return items.sort((a,b)=>b.osJt-a.osJt);
    return items.sort((a,b)=>a.nama.localeCompare(b.nama, "id"));  // "nama" = A-Z
  }, [mantriList, mantriSort, mantriKolFilter, mantriRisFilter]);

  // Level-2: raw items for selected ao
  const aoItems = useMemo(() => {
    if (!selUker || selAO===null) return [];
    const items = list.filter(d => d.uker === selUker.kode);
    return selAO === "__none__" ? items.filter(d=>!d.aoId) : items.filter(d=>d.aoId===selAO);
  }, [selUker, selAO, list]);

  // Level-2: filtered + sorted debitur
  const filteredDebitur = useMemo(() => {
    let items = [...aoItems];
    if (kolFilter    !== "semua") items = items.filter(d => d.kol === kolFilter);
    if (risikoFilter !== "semua") items = items.filter(d => risikoLabel[d.tier] === risikoFilter);
    if      (debSort === "dpd")  items.sort((a,b) => b.dpd - a.dpd);
    else if (debSort === "kol")  { const ko={"5":1,"4":2,"3":3,"2B":4,"2A":5,"1":6}; items.sort((a,b)=>(ko[a.kol]||6)-(ko[b.kol]||6)); }
    else                          items.sort((a,b) => b.osJt - a.osJt);
    return items;
  }, [aoItems, kolFilter, risikoFilter, debSort]);

  // Level-0: sorted units for table (bar charts stay OS/NPL order as-is)
  const sortedUker = useMemo(() => {
    if (unitSort === "npl")    return [...m.perUker].sort((a,b)=>b.npl-a.npl);
    if (unitSort === "risiko") return [...m.perUker].sort((a,b)=>b.tinggi-a.tinggi);
    if (unitSort === "os")     return [...m.perUker].sort((a,b)=>b.osJt-a.osJt);
    return m.perUker;  // "default" = urutan UKER (KANCA → KCP → Unit)
  }, [m.perUker, unitSort]);

  const aoObj    = selAO !== null ? mantriList.find(a=>a.key===selAO) : null;
  const totalPg  = Math.max(1, Math.ceil(filteredDebitur.length / PER_PAGE));
  const curPg    = Math.min(debPage, totalPg);
  const paged    = filteredDebitur.slice((curPg-1)*PER_PAGE, curPg*PER_PAGE);

  // ── Helpers ──
  const kol3bg  = { "1":C.greenLt,"2A":C.amberLt,"2B":"#FFF3CD","3":C.redLt,"4":"#FFD6CC","5":"#F7C5C0" };
  const kol3fg  = { "1":C.green,"2A":C.amber,"2B":"#856404","3":C.red,"4":"#C0392B","5":"#922B21" };
  const KolBadge = ({k}) => <span style={{ padding:"2px 8px", borderRadius:20, background:kol3bg[k]||C.grayLt, color:kol3fg[k]||C.gray, fontSize:11.5, fontWeight:700 }}>Kol {k}</span>;
  const nplColor = (v) => v>5?C.red:v>4?C.amber:C.green;

  const unitSortOpts   = [{ value:"default",label:"Urutan Default" },{ value:"os",label:"Outstanding Tertinggi" },{ value:"npl",label:"NPL Ratio Tertinggi" },{ value:"risiko",label:"Risiko Terbanyak" }];
  const mantriSortOpts = [{ value:"nama",label:"Urutan A–Z" },{ value:"os",label:"Outstanding Tertinggi" },{ value:"npl",label:"NPL Ratio Tertinggi" },{ value:"risiko",label:"Risiko Terbanyak" }];
  const debSortOpts    = [{ value:"dpd",label:"DPD Tertinggi" },{ value:"os",label:"Outstanding Tertinggi" },{ value:"kol",label:"Kolektibilitas Terburuk" }];
  const kolOpts = ["semua","1","2A","2B","3","4","5"].map(v=>({ value:v, label:v==="semua"?"Semua Kolektibilitas":`Kol ${v}` }));
  const risOpts = [{ value:"semua",label:"Semua Risiko" },{ value:"Risiko Tinggi",label:"Risiko Tinggi" },{ value:"Risiko Sedang",label:"Risiko Sedang" },{ value:"Risiko Rendah",label:"Risiko Rendah" }];

  // Sticky filter bar — rendered OUTSIDE any overflow:hidden card
  const filterBarSt = { display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:4 };

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

        {/* Sticky filter bar — outside card so overflow:hidden doesn't block sticky */}
        <div style={filterBarSt}>
          <Select value={kolFilter}    onChange={e=>{ setKolFilter(e.target.value);    setDebPage(1); }} options={kolOpts} />
          <Select value={risikoFilter} onChange={e=>{ setRisikoFilter(e.target.value); setDebPage(1); }} options={risOpts} />
          <Select value={debSort} onChange={e=>{ setDebSort(e.target.value); setDebPage(1); }} options={debSortOpts} />
          <span style={{ marginLeft:"auto", fontSize:12.5, color:C.gray }}>{fNum(filteredDebitur.length)} debitur</span>
        </div>

        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 6px" }}><CardTitle>Daftar Debitur — {aoObj?.nama||""}</CardTitle></div>
          {filteredDebitur.length === 0
            ? <div style={{ padding:24, textAlign:"center", color:C.gray, fontSize:13 }}>Tidak ada debitur sesuai filter.</div>
            : <>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
                    <thead>
                      <tr>
                        {["CIF","Nama Debitur","Sektor Usaha","Outstanding","Kol","DPD","Skor","Status Risiko"].map((h,i)=>(
                          <th key={i} style={{ padding:"9px 12px", color:C.gray, fontWeight:600, fontSize:10.5, textTransform:"uppercase", textAlign:"left", width:[88,170,100,110,46,50,56,120][i], whiteSpace:"nowrap", borderBottom:`1px solid ${C.border}`, background:C.grayLt }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((d, ri) => {
                        const isExp = expandedCif === d.cif;
                        const dpd2  = d.dpd || 0;
                        return [
                          <tr key={d.cif+ri} onClick={()=>setExpandedCif(isExp?null:d.cif)}
                            style={{ background:ri%2===0?C.white:C.grayLt, borderBottom:`1px solid #F1F3F6`, cursor:"pointer" }}
                            onMouseEnter={e=>{ e.currentTarget.style.filter="brightness(0.97)"; }}
                            onMouseLeave={e=>{ e.currentTarget.style.filter="none"; }}>
                            <td style={{ padding:"9px 12px", color:C.textMd, fontFamily:"monospace", fontSize:11.5 }}>{d.cif}</td>
                            <td style={{ padding:"9px 12px", color:C.text, fontWeight:600 }}>{d.nama}</td>
                            <td style={{ padding:"9px 12px", color:C.textMd }}>{d.sektor}</td>
                            <td style={{ padding:"9px 12px", fontWeight:500, color:C.textMd }}>{fJt(d.osJt)}</td>
                            <td style={{ padding:"9px 12px" }}><KolBadge k={d.kol} /></td>
                            <td style={{ padding:"9px 12px", color:dpd2>30?C.red:dpd2>0?C.amber:C.green, fontWeight:600 }}>{dpd2}</td>
                            <td style={{ padding:"9px 12px" }}><SkorPill s={d.skor} /></td>
                            <td style={{ padding:"9px 12px" }}><Badge level={d.tier} /></td>
                          </tr>,
                          isExp && <BreakdownRow key={d.cif+ri+"-exp"} d={d} colSpan={8} />,
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination pg={curPg} total={totalPg} set={(p)=>{ setDebPage(p); setExpandedCif(null); }} />
              </>
          }
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

        {/* Filter bar untuk daftar mantri */}
        <div style={filterBarSt}>
          <Select value={mantriKolFilter} onChange={e=>setMantriKolFilter(e.target.value)} options={kolOpts} />
          <Select value={mantriRisFilter} onChange={e=>setMantriRisFilter(e.target.value)} options={risOpts} />
          <Select value={mantriSort}      onChange={e=>setMantriSort(e.target.value)}       options={mantriSortOpts} />
          <span style={{ marginLeft:"auto", fontSize:12.5, color:C.gray }}>{sortedMantri.length} RM/Mantri</span>
        </div>

        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"12px 16px 6px" }}><CardTitle>Rekap Kinerja per RM/Mantri — {selUker.nama}</CardTitle></div>
          <Tabel
            headers={["RM/Mantri","PN","Debitur","Outstanding","Kol Bermasalah","NPL Ratio","CKPN"]}
            colW={[160,90,80,120,140,100,120]}
            onRowClick={ri=>setSelAO(sortedMantri[ri].key)}
            rows={sortedMantri.map(a=>[
              <span style={{ fontWeight:600, color:a.key==="__none__"?C.gray:C.text }}>{a.nama}</span>,
              <span style={{ fontFamily:"monospace", fontSize:11.5, color:C.navy }}>{a.pn||"—"}</span>,
              fNum(a.deb),
              fJt(a.osJt),
              <span style={{ color:a.tinggi>0?C.red:C.green, fontWeight:600 }}>{a.tinggi} tinggi · {a.sedang} sedang</span>,
              <span style={{ color:nplColor(a.npl), fontWeight:600 }}>{fPct(a.npl,1)}</span>,
              fJt(a.ckpn),
            ])}
          />
        </div>
      </div>
    );
  }

  /* ── LEVEL 0: Daftar unit ── */
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Sort bar untuk daftar unit */}
      <div style={filterBarSt}>
        <Select value={unitSort} onChange={e=>setUnitSort(e.target.value)} options={unitSortOpts} />
        <span style={{ marginLeft:"auto", fontSize:12.5, color:C.gray }}>{m.perUker.length} unit kerja</span>
      </div>

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
      <div style={{ ...card, padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 16px 6px" }}><CardTitle>Rekap Kinerja per Unit Kerja</CardTitle></div>
        <Tabel
          headers={["Unit Kerja","Outstanding","Debitur","NPL Ratio","CKPN","Recovery Rate"]}
          colW={[150,120,90,100,120,120]}
          onRowClick={ri=>setSelUker(sortedUker[ri])}
          rows={sortedUker.map(u=>[
            <span style={{ fontWeight:600 }}>{u.nama}</span>,
            fJt(u.osJt), fNum(u.deb),
            <span style={{ color:nplColor(u.npl), fontWeight:600 }}>{fPct(u.npl,1)}</span>,
            fJt(u.ckpn),
            <span style={{ color:C.green, fontWeight:600 }}>{u.recovery}%</span>,
          ])}
        />
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
      ...m.perUker.map((u,i)=>[i+1, u.kode, u.nama, Math.round(u.osJt), u.deb, u.tinggi, +u.npl.toFixed(2), Math.round(u.ckpn), u.recovery]),
      [],[" TOTAL","","",Math.round(m.totalOsJt), m.totalDeb,"",+m.npl.toFixed(2), Math.round(m.ckpnExisting),""],
    ], [4,8,22,16,12,12,13,12,12]);
    addSheet("Daftar Debitur", [
      [`DAFTAR DEBITUR — ${tgl}`],[],
      ["No","CIF","Nama Debitur","Unit Kerja","RM/Mantri","PN","Segment","Sektor","Outstanding (Jt)","Kolektibilitas","DPD","Skor","Status Risiko"],
      ...list.map((d,i)=>[i+1, d.cif, d.nama, d.ukerNama, d.ao, d.pn||"", d.segment, d.sektor, Math.round(d.osJt), d.kol, d.dpd, d.skor, risikoLabel[d.tier]||d.tier]),
    ], [4,12,30,20,25,10,10,12,16,12,6,6,14]);
    addSheet("Distribusi Kolektibilitas", [
      [`DISTRIBUSI KOLEKTIBILITAS — ${tgl}`],[],
      ["Kolektibilitas","Label","Jumlah Debitur","Persentase (%)","Outstanding (Jt)"],
      ...m.kol.map(k=>[k.kol, k.legend, k.value, +k.pct.toFixed(2), Math.round(k.osJt)]),
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
      ["No","CIF","Nama Debitur","Unit Kerja","RM/Mantri","PN","Outstanding (Jt)","DPD","Kolektibilitas","Skor","Tunggakan Est. (Jt)"],
      ...tinggiList.map((d,i)=>[i+1, d.cif, d.nama, d.ukerNama, d.ao, d.pn||"", Math.round(d.osJt), d.dpd, d.kol, d.skor, Math.round(d.tunggakanTotal||0)]),
    ], [4,12,30,20,25,10,16,6,12,6,18]);
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
      ["CKPN Existing", Math.round(m.ckpnExisting), "Berdasarkan kolektibilitas saat ini"],
      ["CKPN Setelah Action Plan", Math.round(m.ckpnAfter), "Estimasi jika action plan berhasil"],
      ["Potensi Penghematan", Math.round(m.ckpnSaving), `${m.savingPct.toFixed(1)}% dari CKPN Existing`],
      ["Coverage Rate CKPN (%)", covPct, "CKPN Existing / Total Outstanding × 100"],
      ["Total Outstanding", Math.round(m.totalOsJt), "Basis perhitungan"],
    ], [30,14,38]);
    addSheet("CKPN Per Unit Kerja", [
      [`CKPN PER UNIT KERJA — ${tgl}`],[],
      ["No","Unit Kerja","Outstanding (Jt)","CKPN Existing (Jt)","Coverage (%)","Recovery Rate (%)"],
      ...m.perUker.map((u,i)=>[i+1, u.nama, Math.round(u.osJt), Math.round(u.ckpn), u.osJt ? +((u.ckpn/u.osJt)*100).toFixed(2) : 0, u.recovery]),
      [],[" TOTAL","",Math.round(m.totalOsJt), Math.round(m.ckpnExisting), covPct,""],
    ], [4,22,16,18,13,16]);
    addSheet("CKPN Per Kolektibilitas", [
      [`CKPN PER KOLEKTIBILITAS — ${tgl}`],[],
      ["Kol","Label","Coverage Rate","Jml Debitur","Outstanding (Jt)","CKPN (Jt)"],
      ...m.kol.map(k=>{ const cov={1:0.01,"2A":0.05,"2B":0.15,3:0.5,4:0.75,5:1.0}[k.kol]||0; return [k.kol, k.legend, `${(cov*100).toFixed(0)}%`, k.value, Math.round(k.osJt), Math.round(k.osJt*cov)]; }),
    ], [6,10,13,14,16,14]);
    addSheet("Top Kontributor CKPN", [
      [`TOP KONTRIBUTOR CKPN — ${tgl}`],[],
      ["No","Nama Debitur","Outstanding (Jt)","Kol","CKPN Existing (Jt)","Pot. Saving (Jt)","% Saving"],
      ...m.ckpnDebitur.map((d,i)=>[i+1, d.nama, Math.round(d.osJt), d.kol, Math.round(d.ckpn), Math.round(d.saving), +d.pct.toFixed(1)]),
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

function Pengaturan({ perms, onUpload, uploadedData, onReset, onDataChanged }) {
  const w = useWindowWidth();
  const [uploading,      setUploading]      = useState(false);
  const [uploadError,    setUploadError]    = useState(null);
  const [pendingFile,    setPendingFile]    = useState(null);
  const [uploadPct,      setUploadPct]      = useState(0);
  const [uploadPctLabel, setUploadPctLabel] = useState("");
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; };
  const [fileTanggal, setFileTanggal] = useState(yesterday);
  const [history,     setHistory]     = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);
  const fileRef = useRef(null);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const { data } = await supabase.from('uploads').select('*').order('tgl_file', { ascending: false });
      setHistory(data || []);
    } finally { setHistLoading(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleDelete = async (up) => {
    if (!window.confirm(`Hapus upload "${up.periode_label}" (${Number(up.row_count).toLocaleString("id-ID")} debitur)?\n\nSemua data debitur dari upload ini akan ikut terhapus.`)) return;
    setDeletingId(up.id);
    try {
      await supabase.from('uploads').delete().eq('id', up.id);
      await loadHistory();
      if (onDataChanged) await onDataChanged();
    } finally { setDeletingId(null); }
  };
  const cols  = w >= 900  ? "1fr 1fr" : "1fr";
  const cols3 = w >= 1200 ? "1fr 1fr 1fr" : w >= 900 ? "1fr 1fr" : "1fr";
  const canEdit = perms?.editData;

  const handleFileSelect = (file) => {
    if (!file || !canEdit) return;
    setPendingFile(file);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!pendingFile || !canEdit) return;
    setUploading(true); setUploadError(null); setUploadPct(0); setUploadPctLabel("");
    try {
      await onUpload(pendingFile, fileTanggal, (pct, label) => {
        setUploadPct(pct);
        setUploadPctLabel(label);
      });
      setPendingFile(null);
      setUploadPct(0);
      await loadHistory();
    }
    catch (err) { setUploadError(err.message || 'Gagal membaca file'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {!canEdit && (
        <div style={{ ...card, background:C.amberLt, color:C.amber, fontSize:12.5, display:"flex", alignItems:"center", gap:8 }}>
          <Ic n="infoCircle" size={16} /> Mode lihat — hanya Admin IT yang dapat mengupload file LW321 & CKPN.
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
      <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={e=>handleFileSelect(e.target.files?.[0])} />
      <div style={{ display:"grid", gridTemplateColumns:cols3, gap:12 }}>

        {/* LW321 — Data Aktif */}
        <div style={{ ...card, padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.green, flexShrink:0 }} />
            <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>LW321 — Data Aktif</div>
          </div>
          <div style={{ fontSize:12, color:C.gray, marginBottom:12 }}>Upload file LW321 harian · Header baris ke-4 · Data tersedia H+1</div>

          {/* Date picker */}
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11.5, fontWeight:600, color:C.textMd, display:"block", marginBottom:5 }}>Tanggal Data File</label>
            <input type="date" value={fileTanggal} onChange={e=>setFileTanggal(e.target.value)} disabled={!canEdit}
              style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:13,
                color:C.text, background:canEdit?C.white:C.grayLt, boxSizing:"border-box", outline:"none" }} />
            <div style={{ fontSize:11, color:C.gray, marginTop:4 }}>Pilih tanggal data di dalam file (bukan tanggal upload)</div>
          </div>

          {uploading ? (
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:C.textMd, marginBottom:6 }}>{uploadPctLabel || "Memproses..."}</div>
              <div style={{ background:C.border, borderRadius:99, height:10, overflow:"hidden", marginBottom:5 }}>
                <div style={{ height:"100%", borderRadius:99, background:C.navy, width:`${uploadPct}%`, transition:"width 0.25s ease" }} />
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:C.navy, textAlign:"right" }}>{uploadPct}%</div>
            </div>
          ) : (
            <div onClick={()=>canEdit && fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
              onDrop={e=>{ e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0]); }}
              style={{ border:`2px dashed ${pendingFile?C.navy:uploadError?C.red:C.border}`, borderRadius:8, padding:"16px", textAlign:"center",
                marginBottom:10, color:pendingFile?C.navy:C.gray, fontSize:13, display:"flex", flexDirection:"column", alignItems:"center",
                gap:5, cursor:canEdit?"pointer":"default", background:pendingFile?C.navyLt:canEdit?"transparent":C.grayLt }}>
              <Ic n={pendingFile?"doc":"upload"} size={20} />
              {pendingFile ? pendingFile.name : uploadedData ? "Drag atau klik untuk pilih file baru" : "Klik atau drag file LW321 (.xlsx)"}
            </div>
          )}
          {uploadError && <div style={{ marginBottom:10, padding:"8px 12px", background:C.redLt, border:`1px solid ${C.red}`, borderRadius:7, fontSize:12, color:C.red }}>{uploadError}</div>}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleUpload} disabled={!canEdit||uploading||!pendingFile}
              style={{ flex:1, padding:"9px", background:C.navy, color:C.white, border:"none", borderRadius:7,
                cursor:(canEdit&&pendingFile&&!uploading)?"pointer":"not-allowed", fontSize:13, fontWeight:500,
                opacity:(canEdit&&pendingFile&&!uploading)?1:.45 }}>
              {uploading ? "Memproses..." : "Upload & Proses"}
            </button>
            {pendingFile && <button onClick={()=>{ setPendingFile(null); setUploadError(null); }} style={{ padding:"9px 14px", background:C.white, color:C.gray, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:13 }}>Batal</button>}
          </div>
        </div>

        {/* CKPN — masih mock */}
        <div style={{ ...card, padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.kpiPurple, flexShrink:0 }} />
            <div style={{ fontSize:14, fontWeight:600, color:C.navy }}>Import CKPN per Unit Kerja</div>
          </div>
          <div style={{ fontSize:12, color:C.gray, marginBottom:14 }}>Upload bulanan per akhir bulan. Format Excel (.xlsx) / CSV. Kolom: KODE_UKER, PERIODE, CKPN_EXISTING, CKPN_POTENSIAL, COVERAGE_RATIO.</div>
          <div style={{ border:`2px dashed ${C.border}`, borderRadius:8, padding:"22px", textAlign:"center", marginBottom:12,
            color:C.gray, fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:6, background:C.grayLt }}>
            <Ic n="upload" size={22} /> Klik atau drag file Excel/CSV ke sini
          </div>
          <button disabled style={{ width:"100%", padding:"9px", background:C.navy, color:C.white, border:"none", borderRadius:7,
            cursor:"not-allowed", fontSize:13, fontWeight:500, opacity:.45 }}>Segera Hadir</button>
        </div>

      </div>

      {/* Riwayat Upload */}
      {canEdit && (
        <div style={{ ...card, padding:0, overflow:"hidden" }}>
          <div style={{ padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.navy, textTransform:"uppercase", letterSpacing:.3 }}>Riwayat Upload Database</div>
            <button onClick={loadHistory} style={{ fontSize:12, color:C.gray, background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
              {histLoading ? "Memuat..." : "Refresh"}
            </button>
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
                      return (
                        <tr key={up.id} style={{ background: i%2===0?C.white:C.grayLt, borderBottom:`1px solid ${C.border}` }}>
                          <td style={{ padding:"10px 14px", fontWeight:600, color:C.navy, textTransform:"uppercase", fontSize:12 }}>
                            {up.jenis}
                            {isActive && <span style={{ marginLeft:6, fontSize:10, background:C.greenLt, color:C.green, border:`1px solid ${C.green}`, borderRadius:4, padding:"1px 5px" }}>Aktif</span>}
                          </td>
                          <td style={{ padding:"10px 14px", color:C.text }}>{up.tgl_file}</td>
                          <td style={{ padding:"10px 14px", color:C.text }}>{up.periode_label}</td>
                          <td style={{ padding:"10px 14px", color:C.text, textAlign:"right" }}>{Number(up.row_count).toLocaleString("id-ID")}</td>
                          <td style={{ padding:"10px 14px", color:C.gray, fontFamily:"monospace", fontSize:12 }}>{up.uploaded_by || "-"}</td>
                          <td style={{ padding:"10px 14px", color:C.gray, textAlign:"right", fontSize:12 }}>
                            {new Date(up.created_at).toLocaleString("id-ID",{ dateStyle:"short", timeStyle:"short" })}
                          </td>
                          <td style={{ padding:"10px 14px", textAlign:"center" }}>
                            <button onClick={()=>handleDelete(up)} disabled={deletingId===up.id}
                              style={{ padding:"5px 12px", background:C.redLt, color:C.red, border:`1px solid ${C.red}`,
                                borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:500, opacity:deletingId===up.id?.5:1 }}>
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

function ManajemenUser({ localUsers, setLocalUsers }) {
  const [formOpen, setFormOpen]  = useState(false);
  const [editId,   setEditId]    = useState(null);
  const emptyForm = { nama:"", pn:"", username:"", password:"", role:"mb", uker:"", aoId:"", aktif:true };
  const [form, setForm] = useState(emptyForm);
  const [err,  setErr]  = useState("");

  const ROLE_OPT = [
    { value:"mb",         label:"Manajer Bisnis" },
    { value:"kepalaUnit", label:"Kepala Unit" },
    { value:"admin",      label:"Admin IT" },
  ];
  const ROLE_COLOR = { pinca:C.kpiBlue, mb:C.kpiPurple, kepalaUnit:C.kpiTeal, admin:C.gray };
  const ROLE_LABEL = { pinca:"Pimpinan Cabang", mb:"Manajer Bisnis", kepalaUnit:"Kepala Unit", admin:"Admin IT" };

  const autoUser = (nama) => {
    const p = nama.trim().toLowerCase().split(/\s+/);
    return p.length >= 2 ? `${p[0]}.${p[p.length-1]}` : p[0] || "";
  };

  const needUker  = !["mb","admin","pinca"].includes(form.role);

  const openNew  = () => { setEditId(null); setForm(emptyForm); setErr(""); setFormOpen(true); };
  const openEdit = (u) => { setEditId(u.id); setForm({ nama:u.nama, pn:u.pn||"", username:u.username, password:u.password, role:u.role, uker:u.uker||"", aoId:u.aoId||"", aktif:u.aktif }); setErr(""); setFormOpen(true); };
  const cancel   = () => { setFormOpen(false); setEditId(null); setErr(""); };
  const toggle   = (id) => setLocalUsers(prev => prev.map(u => u.id===id ? { ...u, aktif:!u.aktif } : u));

  const save = () => {
    if (!form.nama.trim() || !form.username.trim() || !form.password.trim()) { setErr("Nama, username, dan password wajib diisi."); return; }
    if (needUker && !form.uker) { setErr("Pilih unit kerja terlebih dahulu."); return; }
    const dupUser = localUsers.find(u => u.username === form.username.trim() && u.id !== editId);
    if (dupUser) { setErr("Username sudah dipakai oleh akun lain."); return; }
    if (editId) {
      setLocalUsers(prev => prev.map(u => u.id===editId ? { ...u, ...form, uker:needUker?form.uker:null, aoId:null } : u));
    } else {
      setLocalUsers(prev => [...prev, {
        id: `u-new-${Date.now()}`, pn:form.pn, nama:form.nama.trim(),
        username:form.username.trim(), password:form.password,
        role:form.role, uker:needUker?form.uker:null, aoId:null, aktif:form.aktif
      }]);
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
          {localUsers.length} akun &nbsp;·&nbsp; <span style={{ color:C.green, fontWeight:600 }}>{localUsers.filter(u=>u.aktif).length} aktif</span>
          {localUsers.filter(u=>!u.aktif).length > 0 && <span style={{ color:C.gray }}> &nbsp;·&nbsp; {localUsers.filter(u=>!u.aktif).length} nonaktif</span>}
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
              <input style={inp} value={form.pn} onChange={e=>{ setForm(f=>({ ...f, pn:e.target.value })); setErr(""); }}
                placeholder="contoh: 90188658" />
            </div>
            <div>
              <label style={lbl}>Username</label>
              <input style={inp} value={form.username} onChange={e=>{ setForm(f=>({ ...f, username:e.target.value })); setErr(""); }}
                placeholder="contoh: budi.santoso" />
            </div>
            <div>
              <label style={lbl}>Password</label>
              <input style={inp} type="text" value={form.password} onChange={e=>{ setForm(f=>({ ...f, password:e.target.value })); setErr(""); }}
                placeholder="min. 6 karakter" />
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
            <button onClick={save}
              style={{ padding:"8px 20px", background:C.navy, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {editId ? "Simpan Perubahan" : "Tambah Akun"}
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
            {localUsers.map((u,i)=>{
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
                    <div style={{ display:"flex", gap:6, whiteSpace:"nowrap" }}>
                      <button onClick={()=>openEdit(u)}
                        style={{ padding:"5px 12px", fontSize:12, fontWeight:600, background:C.navyLt, color:C.navy, border:"none", borderRadius:6, cursor:"pointer" }}>
                        Edit
                      </button>
                      <button onClick={()=>toggle(u.id)}
                        style={{ padding:"5px 12px", fontSize:12, fontWeight:600, background:u.aktif?C.redLt:C.greenLt, color:u.aktif?C.red:C.green, border:"none", borderRadius:6, cursor:"pointer" }}>
                        {u.aktif?"Nonaktifkan":"Aktifkan"}
                      </button>
                    </div>
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

const MENU = [
  { id:"dashboard",   label:"Dashboard",       icon:"dashboard", title:"DASHBOARD PORTOFOLIO", sub:"Data per __DATE__" },
  { id:"portfolio",   label:"Portfolio Status", icon:"portfolio", chevron:true, title:"PORTFOLIO STATUS", sub:"Status portofolio kredit · BO Polewali" },
  { id:"ews",         label:"Early Warning",    icon:"warning",   chevron:true, title:"EARLY WARNING SYSTEM", sub:"Alert otomatis berdasarkan kondisi debitur" },
  { id:"debitur",     label:"Daftar Debitur",   icon:"users",     chevron:true, title:"DAFTAR DEBITUR", sub:"Monitoring seluruh debitur · BO Polewali" },
  { id:"action",      label:"Action Plan",      icon:"clipboard", chevron:true, title:"ACTION PLAN", sub:"Tindak lanjut penyelamatan debitur" },
  { id:"ckpn",        label:"Simulasi CKPN",    icon:"calc",      chevron:true, title:"SIMULASI CKPN", sub:"Estimasi CKPN & potensi penghematan" },
  { id:"kinerjaAO",   label:"Kinerja RM/Mantri", icon:"userPerf",  chevron:true, title:"KINERJA RM/MANTRI", sub:"Rekap kinerja per RM/Mantri" },
  { id:"kinerjaUnit", label:"Kinerja Unit",     icon:"building",  chevron:true, title:"KINERJA UNIT KERJA", sub:"Rekap kinerja per unit kerja" },
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

function Login({ onLogin, localUsers }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [demoOpen, setDemoOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const u = localUsers.find(u => u.username === username.trim().toLowerCase() && u.password === password);
    if (!u)        { setError("Username atau password salah.");    return; }
    if (!u.aktif)  { setError("Akun tidak aktif. Hubungi IT.");   return; }
    setError(""); onLogin(u);
  };

  const ROLE_LABEL = { admin:"Admin IT", pinca:"Pimpinan Cabang", mb:"Manajer Bisnis", kepalaUnit:"Kepala Unit", ao:"AO / Mantri", collection:"Collection Officer" };
  const grouped = ["admin","pinca","mb","kepalaUnit","ao","collection"]
    .map(r=>({ role:r, users:localUsers.filter(u=>u.role===r && u.aktif) })).filter(g=>g.users.length);

  const inp = (extra={}) => ({
    padding:"10px 12px", border:`1.5px solid ${error?C.red:C.border}`, borderRadius:8,
    fontSize:13.5, color:C.text, outline:"none", width:"100%", boxSizing:"border-box", ...extra
  });

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(135deg, ${C.sidebar} 0%, #0E2747 100%)`, padding:20,
      fontFamily:"system-ui,'Segoe UI',Roboto,sans-serif" }}>
      <div style={{ width:"100%", maxWidth:420, display:"flex", flexDirection:"column", gap:12 }}>

        {/* Form login */}
        <div style={{ background:C.white, borderRadius:16, padding:"28px 26px", boxShadow:"0 20px 50px rgba(0,0,0,.3)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
            <img src="https://res.cloudinary.com/dnacoymkh/image/upload/v1780721401/Logo_header_mini_blue_lengkap_wblfyh.png" alt="BRI" style={{ height:46, width:"auto" }} />
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:C.navy, letterSpacing:.5 }}>EWS-CKPN</div>
              <div style={{ fontSize:11, color:C.gray }}>Early Warning System · BO Polewali</div>
            </div>
          </div>
          <div style={{ fontSize:18, fontWeight:700, color:C.text, marginBottom:2 }}>Masuk</div>
          <div style={{ fontSize:12.5, color:C.gray, marginBottom:20 }}>Gunakan username & password dari petugas IT</div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:C.textMd, display:"block", marginBottom:5 }}>Username</label>
              <input type="text" autoFocus autoComplete="username"
                value={username} onChange={e=>{ setUsername(e.target.value); setError(""); }}
                placeholder="contoh: hery.santoso"
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
            <button type="submit"
              style={{ width:"100%", padding:"11px", background:C.navy, color:C.white, border:"none",
                borderRadius:9, fontSize:14, fontWeight:700, cursor:"pointer", marginTop:2 }}>
              Masuk
            </button>
          </form>

          <div style={{ fontSize:11.5, color:C.gray, textAlign:"center", marginTop:16 }}>
            Lupa password? Hubungi petugas IT cabang.
          </div>
        </div>

        {/* Demo Cepat */}
        <div style={{ background:"rgba(255,255,255,.08)", borderRadius:12, border:"1px solid rgba(255,255,255,.13)", overflow:"hidden" }}>
          <button onClick={()=>setDemoOpen(o=>!o)}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"11px 16px", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,.85)", fontSize:13, fontWeight:600 }}>
            <span>Demo Cepat — pilih akun</span>
            <Ic n={demoOpen?"chevronD":"chevronR"} size={16} style={{ color:"rgba(255,255,255,.6)" }} />
          </button>
          {demoOpen && (
            <div style={{ padding:"0 10px 10px", display:"flex", flexDirection:"column", gap:2 }}>
              {grouped.map(g=>(
                <div key={g.role}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.45)", textTransform:"uppercase",
                    letterSpacing:.6, padding:"8px 4px 4px" }}>{ROLE_LABEL[g.role]}</div>
                  {g.users.map(u=>(
                    <button key={u.id} onClick={()=>onLogin(u)}
                      style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"8px 10px", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.09)",
                        borderRadius:8, cursor:"pointer", textAlign:"left", marginBottom:3 }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.14)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:"#fff" }}>{u.nama}</div>
                        <div style={{ fontSize:10.5, color:"rgba(255,255,255,.5)", fontFamily:"monospace" }}>
                          {u.username} · {u.password}
                        </div>
                      </div>
                      {u.uker && <div style={{ fontSize:10, color:"rgba(255,255,255,.4)", flexShrink:0, marginLeft:8 }}>
                        {UKER.find(uk=>uk.kode===u.uker)?.nama||""}
                      </div>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [filters, setFilters] = useState({ uker:"semua", ao:"semua", segment:"semua", periode:"Mei 2026" });
  const [profileOpen, setProfileOpen] = useState(false);
  const [periodeOpen, setPeriodeOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [availablePeriodes, setAvailablePeriodes] = useState([]);
  const [uploadedData, setUploadedData] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbProgress, setDbProgress] = useState(0);
  const [dbProgressLabel, setDbProgressLabel] = useState("");
  const [localUsers, setLocalUsers] = useState(USERS);

  // Fungsi inti: load debitur untuk upload tertentu (cek IDB cache dulu)
  const loadDebiturForUpload = async (upload, uploadHistory) => {
    const cacheKey = `debitur-${upload.id}`;
    const cached = await idbGet(cacheKey);
    if (cached?.debitur?.length) {
      setDbProgress(100); setDbProgressLabel("Data dimuat dari cache");
      setUploadedData({ ...cached, uploadHistory });
      setFilters(f => ({ ...f, periode: upload.periode_label }));
      return;
    }
    const totalRows = upload.row_count || 0;
    setDbProgressLabel(`Memuat data ${upload.periode_label}...`);
    const PAGE = 1000;
    let allRows = [], page = 0, hasMore = true;
    while (hasMore) {
      const from = page * PAGE;
      const { data: rows, error } = await supabase
        .from('debitur').select('*').eq('upload_id', upload.id)
        .range(from, from + PAGE - 1);
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
      skor: r.skor, tier: r.tier, hasAction: r.has_action, resolved: r.resolved,
      tunggakanPokok: r.tunggakan_pokok, tunggakanBunga: r.tunggakan_bunga,
      tunggakanDenda: r.tunggakan_denda, tunggakanPenalty: r.tunggakan_penalty,
      tunggakanTotal: r.tunggakan_total,
    }));
    const uploadData = {
      debitur,
      periodeLabel: upload.periode_label,
      periodeStr: upload.periode_str || '',
      datePrinted: upload.date_printed || '',
      totalRows: debitur.length,
    };
    setUploadedData({ ...uploadData, uploadHistory });
    setFilters(f => ({ ...f, periode: upload.periode_label }));
    idbSet(cacheKey, uploadData);
  };

  const loadLatestData = async () => {
    setDbLoading(true); setDbProgress(0);
    setDbProgressLabel("Menghubungkan ke database...");
    try {
      const { data: allUploads } = await supabase
        .from('uploads')
        .select('id, tgl_file, periode_label, row_count, total_os_jt, total_tunggakan_jt')
        .eq('jenis', 'lw321').order('tgl_file', { ascending: false });
      if (!allUploads?.length) return;
      setAvailablePeriodes(allUploads);
      const uploadHistory = [...allUploads]
        .filter(u => u.total_os_jt != null)
        .sort((a,b) => a.tgl_file.localeCompare(b.tgl_file))
        .map(u => ({ periodeLabel: u.periode_label, totalOsJt: u.total_os_jt, totalTunggakanJt: u.total_tunggakan_jt }));
      await loadDebiturForUpload(allUploads[0], uploadHistory);
    } catch (err) {
      console.error('Gagal load data dari database:', err);
    } finally {
      setDbLoading(false);
    }
  };

  const switchPeriode = async (upload) => {
    if (upload.periode_label === uploadedData?.periodeLabel) { setPeriodeOpen(false); return; }
    setPeriodeOpen(false);
    setDbLoading(true); setDbProgress(0);
    try {
      const uploadHistory = availablePeriodes
        .filter(u => u.total_os_jt != null)
        .sort((a,b) => a.tgl_file.localeCompare(b.tgl_file))
        .map(u => ({ periodeLabel: u.periode_label, totalOsJt: u.total_os_jt, totalTunggakanJt: u.total_tunggakan_jt }));
      await loadDebiturForUpload(upload, uploadHistory);
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
      const totalTunggakanJt = result.debitur.filter(d=>d.dpd>0).reduce((s,d)=>s+d.osJt, 0);
      const { data: upload, error: upErr } = await supabase
        .from('uploads')
        .insert({
          jenis: 'lw321',
          tgl_file: tglData || new Date().toISOString().split('T')[0],
          periode_label: result.periodeLabel,
          periode_str: result.periodeStr,
          date_printed: result.datePrinted,
          row_count: result.totalRows,
          uploaded_by: currentUser?.pn || 'admin',
          total_os_jt: totalOsJt,
          total_tunggakan_jt: totalTunggakanJt,
        })
        .select()
        .single();

      if (upErr) throw upErr;

      const CHUNK = 500;
      const rows = result.debitur.map(d => ({
        upload_id: upload.id,
        cif: d.cif, nama: d.nama, ao: d.ao, ao_id: d.aoId, pn: d.pn,
        kode_uker: d.uker, uker_nama: d.ukerNama, segment: d.segment,
        sektor: d.sektor, os_jt: d.osJt, kol: d.kol, dpd: d.dpd,
        skor: d.skor, tier: d.tier, has_action: d.hasAction, resolved: d.resolved,
        tunggakan_pokok: d.tunggakanPokok, tunggakan_bunga: d.tunggakanBunga,
        tunggakan_denda: d.tunggakanDenda, tunggakan_penalty: d.tunggakanPenalty,
        tunggakan_total: d.tunggakanTotal,
      }));

      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase.from('debitur').insert(rows.slice(i, i + CHUNK));
        if (error) throw error;
        const saved = Math.min(i + CHUNK, rows.length);
        const pct = 10 + Math.round(saved / rows.length * 88);
        onProgress?.(pct, `Menyimpan ${saved.toLocaleString("id-ID")} dari ${rows.length.toLocaleString("id-ID")} debitur...`);
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
  const m = useMemo(()=>buildModel(list, filters.periode, uploadedData?.uploadHistory), [list, filters.periode, uploadedData?.uploadHistory]);

  const handleLogin = (user) => {
    setCurrentUser(user); setRole(user.role); setPage("dashboard"); setProfileOpen(false);
    setDbLoading(true); setDbProgress(0);
    if (user.role==="ao")         setFilters({ uker:user.uker||"semua", ao:user.aoId||"semua", segment:"semua", periode:"Jun 2026" });
    else if (user.uker)           setFilters({ uker:user.uker, ao:"semua", segment:"semua", periode:"Jun 2026" });
    else                          setFilters({ uker:"semua", ao:"semua", segment:"semua", periode:"Jun 2026" });
    loadLatestData();
  };
  const handleLogout = () => { setCurrentUser(null); setRole(null); setPage("dashboard"); setProfileOpen(false); setFilters({ uker:"semua", ao:"semua", segment:"semua", periode:"Mei 2026" }); };

  if (!perms) return <Login onLogin={handleLogin} localUsers={localUsers} />;

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
  const pages = {
    dashboard:   <DashboardComp m={m} go={(p)=>perms.menus.includes(p)&&setPage(p)} perms={perms} />,
    portfolio:   <PortfolioStatus m={m} />,
    ews:         <EarlyWarning m={m} />,
    debitur:     <DaftarDebitur list={list} />,
    action:      <ActionPlan m={m} perms={perms} />,
    ckpn:        <SimulasiCKPN m={m} />,
    kinerjaAO:   <KinerjaAO m={m} />,
    kinerjaUnit: <KinerjaUnit m={m} list={list} />,
    laporan:     <Laporan m={m} list={list} perms={perms} />,
    manajemen:   <ManajemenUser localUsers={localUsers} setLocalUsers={setLocalUsers} />,
    pengaturan:  <Pengaturan perms={perms} onUpload={handleUploadFile} uploadedData={uploadedData} onReset={()=>{ setUploadedData(null); setFilters(f=>({...f,periode:"Jun 2026"})); }} onDataChanged={loadLatestData} />,
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
              {perms.scope==="ao" && <span style={{ color:C.navy, fontWeight:600 }}> · Portofolio {currentUser?.nama||perms.nama} ({fNum(list.length)} debitur)</span>}
              {perms.scope==="bermasalah" && <span style={{ color:C.red, fontWeight:600 }}> · Debitur bermasalah ({fNum(list.length)})</span>}
              {perms.scope==="uker" && <span style={{ color:C.kpiTeal, fontWeight:600 }}> · Unit {UKER.find(uk=>uk.kode===currentUser?.uker)?.nama||""} ({fNum(list.length)} debitur)</span>}
              {aktifFilter && <span style={{ color:C.navy, fontWeight:600 }}> · Filter aktif: {fNum(list.length)} debitur</span>}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
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
                    <div style={{ fontSize:10, fontWeight:700, color:C.gray, letterSpacing:.5, textTransform:"uppercase", padding:"4px 6px 6px" }}>Ganti Akun Demo</div>
                    {(()=>{
                      const RLABEL = { admin:"Admin IT", pinca:"Pimpinan Cabang", mb:"Manajer Bisnis", kepalaUnit:"Kepala Unit", ao:"AO / Mantri", collection:"Collection" };
                      const RCOLOR = { admin:C.gray, pinca:C.kpiBlue, mb:C.kpiPurple, kepalaUnit:C.kpiTeal, ao:C.kpiTeal, collection:C.kpiAmber };
                      return localUsers.filter(u=>u.aktif).map(u=>(
                        <div key={u.id} onClick={()=>{ handleLogin(u); setProfileOpen(false); }}
                          style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px", borderRadius:7, cursor:"pointer",
                            background: u.id===currentUser?.id ? C.grayLt : "transparent" }}
                          onMouseEnter={e=>e.currentTarget.style.background=C.grayLt}
                          onMouseLeave={e=>e.currentTarget.style.background=u.id===currentUser?.id?C.grayLt:"transparent"}>
                          <div style={{ width:26, height:26, borderRadius:"50%", background:RCOLOR[u.role]||C.gray, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:11, fontWeight:700 }}>
                            {u.nama.charAt(0)}
                          </div>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.nama}</div>
                            <div style={{ fontSize:10.5, color:RCOLOR[u.role]||C.gray, fontWeight:500 }}>{RLABEL[u.role]||u.role}</div>
                          </div>
                          {u.id===currentUser?.id && <div style={{ marginLeft:"auto", fontSize:10, color:C.gray, flexShrink:0 }}>●</div>}
                        </div>
                      ));
                    })()}
                    <div style={{ borderTop:`1px solid ${C.border}`, margin:"4px 0" }} />
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
          {pages[safePage]}
        </main>
      </div>

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
