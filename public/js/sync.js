// Dimuat SETELAH app.js. Ambil data pakar dari Supabase, simpan untuk offline, hitung Certainty Factor,
// kirim diagnosa (gejala + foto) ke pakar, dan tampilkan balasan pakar.
const LV=[[0,"Tidak ada"],[.4,"Sedikit yakin"],[.6,"Cukup yakin"],[.8,"Yakin"],[1,"Sangat yakin"]];
let lastR=[];

// ===== Foto dari tab Foto yang ikut dikirim ke pakar =====
let fotoAI=null,sedangKirim=false;
function kecil(src,max=720){return new Promise((ok,no)=>{const im=new Image();
 im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");
  c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
  ok(c.toDataURL("image/jpeg",.65))};
 im.onerror=()=>no(new Error("Foto tidak bisa diproses"));im.src=src})}
async function keCek(){
 if(!photo)return;
 try{const f=await kecil(photo);
  fotoAI={foto:f,crop:fcrop,ai:(pred&&pred!=="loading"&&Array.isArray(pred.kandidat))?pred.kandidat.map(x=>({nama:x.nama,keyakinan:x.keyakinan,alasan:x.alasan})):[]};
  if(fcrop!=="tidak")ccrop=fcrop;
  cc={};tab="cek";sel=null;render();scrollTo(0,0)}
 catch(e){alert(e.message)}}
// tambahkan tombol "Kirim ke pakar" di bawah hasil foto AI
const _hasil=hasil;
hasil=function(){
 const h=_hasil();
 if(!photo||pred==="loading")return h;
 return h+`<div style="height:6px"></div><button class="btn" onclick="keCek()">Kirim ke pakar</button>
 <div class="note">Setelah ini Anda diarahkan ke Cek gejala. Isi gejala yang terlihat, lalu kirim. Foto ikut terkirim ke pakar.</div>`};

function cek(){
if(!prof.auto){prof.auto=1;autoLokasi()}
const S=symp(),on=S.filter(x=>cc[x]);let res="";
if(on.length){
 const r=D.filter(d=>cocok(d,ccrop)).map(d=>{let cf=0,m=0;
  d.g.forEach((g,i)=>{const u=cc[g];if(!u)return;m++;const [mb,md]=(d.m&&d.m[i])||[.8,.1];const c=Math.max(0,mb-md)*u;cf=cf+c*(1-cf)});
  return{d,m,cf}}).filter(x=>x.m).sort((a,b)=>b.cf-a.cf).slice(0,3);
 lastR=r.map(x=>({nama:x.d.n,cf:Math.round(x.cf*100)}));
 res=`<h2>Kemungkinan penyebab</h2>${r.map(x=>`<button class="item" onclick="sel=${D.indexOf(x.d)};tab='pustaka';render();scrollTo(0,0)"><b>${x.d.n}</b><small>Tingkat kepastian ${Math.round(x.cf*100)}% (${x.m} dari ${x.d.g.length} ciri)</small><div class="bar"><i style="width:${Math.round(x.cf*100)}%"></i></div></button>`).join("")}
 ${profilHTML()}<button class="btn" onclick="kirim()">Kirim ke pakar${fotoAI?" (dengan foto)":""}</button><div style="height:10px"></div>
 <div class="note">Hasil dihitung dengan metode Certainty Factor dari gejala yang Anda pilih. Bila ragu atau serangan berat, tunjukkan tanaman ke POPT atau penyuluh.</div>`}
const fb=fotoAI?`<div class="card"><b>Foto terlampir</b><p style="margin:4px 0 8px">Foto ini akan dikirim ke pakar bersama gejala di bawah.</p><img class="pv" src="${fotoAI.foto}" alt="Foto yang dikirim"><button class="btn sec" style="margin-top:8px" onclick="fotoAI=null;render()">Lepas foto</button></div>`:"";
return`<h2>Cek gejala</h2>${fb}${chips(ccrop,CR,"setCC")}${ccrop==="sayur"?jenChips():""}<div class="card">${S.map(x=>`<div style="margin:0 0 12px"><span>${x}</span><br><select data-k="${esc(x)}" onchange="cc[this.dataset.k]=+this.value;render()" style="margin-top:4px;padding:8px;width:100%">${LV.map(([v,l])=>`<option value="${v}" ${(cc[x]||0)===v?"selected":""}>${l}</option>`).join("")}</select></div>`).join("")}</div>
<button class="btn sec" onclick="cc={};render()">Hapus pilihan</button><div style="height:14px"></div>${res}`}

// ===== Identitas dan lokasi pengirim =====
let prof={nama:"",kel:"",lok:"",lokDet:"",lat:null,lon:null,det:"",auto:0};
try{Object.assign(prof,JSON.parse(localStorage.prof||"{}"))}catch(e){}
prof.det="";prof.auto=0;
(function(){const st=document.createElement("style");st.textContent=".inp{font:inherit;padding:10px;width:100%;box-sizing:border-box;border:1px solid #b9c7bd;border-radius:10px;background:transparent;color:inherit;margin:4px 0 10px}";document.head.appendChild(st)})();
function simpanProf(){try{localStorage.prof=JSON.stringify({nama:prof.nama,kel:prof.kel,lok:prof.lok,lokDet:prof.lokDet,lat:prof.lat,lon:prof.lon})}catch(e){}}
function setProf(k,v){prof[k]=v;if(k==="lok"&&v.trim()!==prof.lokDet){prof.lat=null;prof.lon=null}simpanProf()}
function profilHTML(){return`<div class="card"><b>Data pengirim</b>
 <label style="display:block;margin-top:8px">Nama</label><input class="inp" value="${esc(prof.nama)}" oninput="setProf('nama',this.value)" placeholder="Nama Anda" autocomplete="name">
 <label>Kelompok tani</label><input class="inp" value="${esc(prof.kel)}" oninput="setProf('kel',this.value)" placeholder="Nama kelompok tani">
 <label>Lokasi (desa/kelurahan)</label><input class="inp" value="${esc(prof.lok)}" oninput="setProf('lok',this.value)" placeholder="Contoh: Lambanapu">
 <button class="btn sec" onclick="deteksiLokasi()">${prof.det==="loading"?"Membaca lokasi...":"Deteksi lokasi saya"}</button>
 ${prof.det&&prof.det!=="loading"?`<p style="margin:8px 0 0"><small>${esc(prof.det)}</small></p>`:""}
 <p style="margin:8px 0 0"><small>Lokasi dipakai pakar untuk memetakan daerah yang banyak terserang. Koordinat dibulatkan (sekitar 100 m).</small></p></div>`}
function deteksiLokasi(){
 if(!navigator.geolocation){prof.det="HP ini tidak mendukung deteksi lokasi. Isi lokasi secara manual.";render();return}
 prof.det="loading";render();
 navigator.geolocation.getCurrentPosition(async pos=>{
  prof.lat=+pos.coords.latitude.toFixed(3);prof.lon=+pos.coords.longitude.toFixed(3);
  try{const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&addressdetails=1&accept-language=id&lat="+pos.coords.latitude+"&lon="+pos.coords.longitude);
   const a=(await r.json()).address||{},nm=a.village||a.suburb||a.neighbourhood||a.hamlet||a.town||a.city_district||"";
   if(nm){prof.lok=nm;prof.lokDet=nm;prof.det="Lokasi terbaca: "+nm+". Ubah kalau kurang tepat."}
   else prof.det="Koordinat terbaca, tetapi nama desa tidak ditemukan. Ketik nama desa Anda."}
  catch(e){prof.det="Koordinat terbaca, tetapi nama desa tidak bisa diambil (tidak ada internet?). Ketik nama desa Anda."}
  simpanProf();render()},
  e=>{prof.det=e.code===1?"Izin lokasi ditolak. Isi nama desa secara manual.":"Lokasi belum terbaca. Isi nama desa secara manual.";render()},
  {enableHighAccuracy:false,timeout:12000,maximumAge:600000})}
async function autoLokasi(){try{if(prof.lok||!navigator.permissions)return;const p=await navigator.permissions.query({name:"geolocation"});if(p.state==="granted")deteksiLokasi()}catch(e){}}
async function kirim(){
 if(sedangKirim)return;
 if(!prof.lok.trim()){alert("Isi lokasi (nama desa) dulu, atau tekan Deteksi lokasi saya.");return}
 sedangKirim=true;simpanProf();
 const body={nama:prof.nama.trim()||"Petani",kelompok:prof.kel.trim()||null,lokasi:prof.lok.trim(),lat:prof.lat,lon:prof.lon,tanaman:ccrop+(ccrop==="sayur"&&jen!=="semua"?" ("+jen+")":""),hasil:lastR,kode:kodeku(),
  gejala:symp().filter(x=>cc[x]).map(x=>({g:x,u:cc[x]}))};
 if(fotoAI){body.foto=fotoAI.foto;body.hasil_ai=fotoAI.ai}
 try{const r=await fetch(SB.url+"/rest/v1/riwayat",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(body)});
  if(!r.ok){alert("Gagal mengirim (kode "+r.status+"). Hubungi admin: SQL tambahan di Supabase mungkin belum dijalankan.");return}
  fotoAI=null;photo=null;pred=null;perr="";cc={};lastR=[];
  alert("Terkirim ke pakar. Saran pakar bisa dilihat nanti di menu Balasan.");
  tab="balasan";sel=null;render();muatBalasan();scrollTo(0,0)}
 catch(e){alert("Tidak ada internet. Coba lagi nanti.")}
 finally{sedangKirim=false}}

(async()=>{
 const apply=a=>{if(Array.isArray(a)&&a.length){D.length=0;D.push(...a);render()}};
 try{apply(JSON.parse(localStorage.kb))}catch(e){}
 if(SB.url.includes("XXXX"))return;
 try{const r=await fetch(SB.url+"/rest/v1/kb?id=eq.1&select=data",{headers:{apikey:SB.key}});
  const j=await r.json();if(j[0]){localStorage.kb=JSON.stringify(j[0].data);apply(j[0].data)}}catch(e){}
})();

// ===== Balasan pakar =====
function kodeku(){let k=localStorage.kodeku;if(!k){k=(crypto.randomUUID?crypto.randomUUID():Date.now()+""+Math.random()).replace(/[^a-z0-9]/gi,"");localStorage.kodeku=k}return k}
let bal=null,balErr="",balBaru=0;
async function muatBalasan(){
 bal="loading";balErr="";render();
 try{const r=await fetch(SB.url+"/rest/v1/rpc/cek_balasan",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({k:kodeku()})});
  if(!r.ok){balErr="Gagal memuat balasan (kode "+r.status+"). Pastikan SQL tambahan sudah dijalankan di Supabase.";throw 0}bal=await r.json();localStorage.balasan=JSON.stringify(bal);localStorage.balLihat=bal.filter(x=>x.balasan).length;balBaru=0}
 catch(e){try{bal=JSON.parse(localStorage.balasan||"[]")}catch(x){bal=[]}if(!balErr)balErr="Tidak ada internet. Menampilkan data terakhir."}
 render()}
function balasan(){
 let h=`<h2>Balasan pakar</h2><small>Kode HP: ${kodeku().slice(0,6)}</small>`;
 if(bal===null||bal==="loading")return h+`<div class="note">Memuat...</div>`;
 if(balErr)h+=`<div class="note">${esc(balErr)}</div>`;
 if(!bal.length)return h+`<div class="note">Belum ada hasil yang dikirim dari HP ini. Kirim lewat menu Cek gejala, tombol Kirim ke pakar.</div>`;
 return h+bal.map(b=>`<div class="card"><b>${esc(b.tanaman)}</b> <small>${new Date(b.created_at).toLocaleDateString("id-ID")}</small>
 <p>${(b.hasil||[]).map(x=>esc(x.nama)+" "+x.cf+"%").join(", ")}</p>
 ${b.balasan?`<h3>Saran pakar</h3><p style="white-space:pre-line">${esc(b.balasan)}</p>`:`<div class="note">Belum dibalas pakar. Cek lagi nanti.</div>`}</div>`).join("")}
TABS.push(["balasan","Balasan"]);
function renderNav(){
$("#nav").innerHTML=TABS.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" onclick="tab='${k}';sel=null;render();scrollTo(0,0);${k==="balasan"?"muatBalasan()":""}">${l}${k==="balasan"&&balBaru?`<span class="bd">${balBaru}</span>`:""}</button>`).join("")}
function render(){
renderNav();
$("#app").innerHTML=({pustaka,foto,cek,kalender,tentang,balasan})[tab]()}

// ===== Notifikasi balasan pakar tanpa refresh =====
(function(){const st=document.createElement("style");st.textContent=".toast{position:fixed;left:12px;right:12px;top:12px;z-index:9999;background:#0b4a2e;color:#fff;padding:14px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-weight:600;cursor:pointer}.bd{background:#e67e22;color:#fff;border-radius:999px;padding:1px 7px;font-size:12px;margin-left:6px}";document.head.appendChild(st)})();
function toast(t,fn){const o=document.createElement("div");o.className="toast";o.setAttribute("role","status");o.textContent=t;o.onclick=()=>{o.remove();fn&&fn()};document.body.appendChild(o);setTimeout(()=>o.remove(),9000)}
async function pantauBalasan(){
 if(document.hidden||!localStorage.kodeku||SB.url.includes("XXXX")||bal==="loading")return;
 try{const r=await fetch(SB.url+"/rest/v1/rpc/cek_balasan",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({k:kodeku()})});
  if(!r.ok)return;const arr=await r.json();if(!Array.isArray(arr))return;
  const n=arr.filter(x=>x.balasan).length;localStorage.balasan=JSON.stringify(arr);
  if(tab==="balasan"){bal=arr;balErr="";localStorage.balLihat=n;balBaru=0;render();return}
  const baru=n-(+localStorage.balLihat||0);
  if(baru>0&&baru!==balBaru){balBaru=baru;renderNav();toast("Pakar sudah membalas diagnosa Anda. Ketuk untuk melihat.",()=>{tab="balasan";sel=null;render();muatBalasan();scrollTo(0,0)})}
 }catch(e){}}
setInterval(pantauBalasan,20000);setTimeout(pantauBalasan,3000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pantauBalasan()});
