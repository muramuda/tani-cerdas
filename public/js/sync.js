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
const S=symp(),on=S.filter(x=>cc[x]);let res="";
if(on.length){
 const r=D.filter(d=>cocok(d,ccrop)).map(d=>{let cf=0,m=0;
  d.g.forEach((g,i)=>{const u=cc[g];if(!u)return;m++;const [mb,md]=(d.m&&d.m[i])||[.8,.1];const c=Math.max(0,mb-md)*u;cf=cf+c*(1-cf)});
  return{d,m,cf}}).filter(x=>x.m).sort((a,b)=>b.cf-a.cf).slice(0,3);
 lastR=r.map(x=>({nama:x.d.n,cf:Math.round(x.cf*100)}));
 res=`<h2>Kemungkinan penyebab</h2>${r.map(x=>`<button class="item" onclick="sel=${D.indexOf(x.d)};tab='pustaka';render();scrollTo(0,0)"><b>${x.d.n}</b><small>Tingkat kepastian ${Math.round(x.cf*100)}% (${x.m} dari ${x.d.g.length} ciri)</small><div class="bar"><i style="width:${Math.round(x.cf*100)}%"></i></div></button>`).join("")}
 <button class="btn" onclick="kirim()">Kirim ke pakar${fotoAI?" (dengan foto)":""}</button><div style="height:10px"></div>
 <div class="note">Hasil dihitung dengan metode Certainty Factor dari gejala yang Anda pilih. Bila ragu atau serangan berat, tunjukkan tanaman ke POPT atau penyuluh.</div>`}
const fb=fotoAI?`<div class="card"><b>Foto terlampir</b><p style="margin:4px 0 8px">Foto ini akan dikirim ke pakar bersama gejala di bawah.</p><img class="pv" src="${fotoAI.foto}" alt="Foto yang dikirim"><button class="btn sec" style="margin-top:8px" onclick="fotoAI=null;render()">Lepas foto</button></div>`:"";
return`<h2>Cek gejala</h2>${fb}${chips(ccrop,CR,"setCC")}${ccrop==="sayur"?jenChips():""}<div class="card">${S.map(x=>`<div style="margin:0 0 12px"><span>${x}</span><br><select data-k="${esc(x)}" onchange="cc[this.dataset.k]=+this.value;render()" style="margin-top:4px;padding:8px;width:100%">${LV.map(([v,l])=>`<option value="${v}" ${(cc[x]||0)===v?"selected":""}>${l}</option>`).join("")}</select></div>`).join("")}</div>
<button class="btn sec" onclick="cc={};render()">Hapus pilihan</button><div style="height:14px"></div>${res}`}

async function kirim(){
 if(sedangKirim)return;
 const n=prompt("Nama Anda (boleh dikosongkan):");if(n===null)return;
 sedangKirim=true;
 const body={nama:n.trim()||"Petani",tanaman:ccrop+(ccrop==="sayur"&&jen!=="semua"?" ("+jen+")":""),hasil:lastR,kode:kodeku(),
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
let bal=null,balErr="";
async function muatBalasan(){
 bal="loading";balErr="";render();
 try{const r=await fetch(SB.url+"/rest/v1/rpc/cek_balasan",{method:"POST",headers:{apikey:SB.key,"Content-Type":"application/json"},body:JSON.stringify({k:kodeku()})});
  if(!r.ok){balErr="Gagal memuat balasan (kode "+r.status+"). Pastikan SQL tambahan sudah dijalankan di Supabase.";throw 0}bal=await r.json();localStorage.balasan=JSON.stringify(bal)}
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
function render(){
$("#nav").innerHTML=TABS.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" onclick="tab='${k}';sel=null;render();scrollTo(0,0);${k==="balasan"?"muatBalasan()":""}">${l}</button>`).join("");
$("#app").innerHTML=({pustaka,foto,cek,kalender,tentang,balasan})[tab]()}
