let tab="pustaka",crop="semua",sel=null,mon=NOW,ccrop="padi",cc={},photo=null,jen="semua";
const $=s=>document.querySelector(s);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function chips(cur,opts,fn){return`<div class="row">${opts.map(([v,l])=>`<button class="chip" aria-pressed="${cur===v}" onclick="${fn}('${v}')">${l}</button>`).join("")}</div>`}
// Aplikasi ini hanya untuk PADI dan CABAI. Cabai disimpan sebagai t="sayur" (jenis "cabai").
TAN.sayur="Cabai";
const CR=[["padi","Padi"],["sayur","Cabai"]];
const boleh=d=>!!d&&(d.t==="padi"||(d.t==="sayur"&&((d.j||[]).includes("cabai")||(!(d.j&&d.j.length)&&/cabai|cabe|lombok/i.test(d.n||"")))));
const saring=()=>{const x=D.filter(boleh);D.length=0;D.push(...x)};
saring();
// Tanaman yang dinonaktifkan admin disembunyikan dari Foto dan Cek gejala.
let tanOn={};try{tanOn=JSON.parse(localStorage.tanon||"{}")||{}}catch(e){}
const CRaktif=()=>CR.filter(([v])=>tanOn[v]!==false);
// Jenis sayuran (cabai, tomat, dst). Penyakit tanpa jenis berlaku untuk semua sayuran.
const cap=t=>String(t).charAt(0).toUpperCase()+String(t).slice(1);
const cocok=(d,c)=>d.t===c&&(c!=="sayur"||jen==="semua"||!d.j||!d.j.length||d.j.includes(jen));
function jenisList(){return[...new Set(D.filter(d=>d.t==="sayur").flatMap(d=>d.j||[]))].sort()}
function jenChips(){return""}
function setJen(v){jen=v;cc={};render()}
const tag=d=>`<span class="tag">${d.k}</span><span class="tag ${d.s?"sb":""}">${d.s?"Tercatat di Sumba Timur":"Data umum"}</span>`;
function detail(d){return`<button class="chip" onclick="sel=null;render()">Kembali</button>
<div class="card" style="margin-top:12px"><h2>${d.n}</h2>${tag(d)}<span class="tag">${TAN[d.t]}</span>
<h3>Cara mengenali</h3><ul>${d.g.map(x=>`<li>${x}</li>`).join("")}</ul>
<h3>Penanganan</h3><ul>${d.c.map(x=>`<li>${x}</li>`).join("")}</ul>
<h3>Bulan waspada</h3><p>${d.w.map(m=>MON[m-1]).join(", ")}</p>
<div class="note">Dosis dan jenis pestisida tidak dicantumkan di sini. Tanyakan ke POPT, penyuluh, atau BPTPH sebelum menyemprot.</div></div>`}
function pustaka(){
if(sel!==null)return detail(D[sel]);
const L=D.map((d,i)=>[d,i]).filter(([d])=>crop==="semua"||cocok(d,crop));
return`<h2>Pustaka hama dan penyakit</h2>${chips(crop,[["semua","Semua"],...CR],"setCrop")}${crop==="sayur"?jenChips():""}
${L.map(([d,i])=>`<button class="item" onclick="sel=${i};render();scrollTo(0,0)"><b>${d.n}</b><small>${TAN[d.t]}, ${d.k}${d.s?", tercatat di Sumba Timur":""}</small></button>`).join("")}`}
function kalender(){
const L=D.filter(d=>d.w.includes(mon+1));
return`<h2>Kalender waspada</h2><p>Pilih bulan untuk melihat yang perlu diwaspadai. Bulan ini ditandai garis oranye.</p>
<div class="mon">${MON.map((m,i)=>`<button class="${i===NOW?"now":""}" aria-pressed="${i===mon}" onclick="mon=${i};render()">${m}</button>`).join("")}</div>
${["padi","sayur"].map(c=>{const x=L.filter(d=>d.t===c);return`<div class="card"><b>${TAN[c]}</b>${x.length?x.map(d=>`<div style="margin-top:8px"><button class="item" style="margin:0" onclick="sel=${D.indexOf(d)};tab='pustaka';render();scrollTo(0,0)"><b>${d.n}</b><small>${d.k}</small></button></div>`).join(""):`<p style="color:var(--mut);margin:6px 0 0">Tidak ada yang tercatat bulan ini.</p>`}</div>`}).join("")}
<div class="note">Kalender mengikuti pola musim NTT (hujan sekitar November sampai Maret, kemarau April sampai Oktober). Bila ragu, tanyakan ke POPT atau BPTPH.</div>`}
function symp(){const s=[];D.filter(d=>cocok(d,ccrop)).forEach(d=>d.g.forEach(g=>s.includes(g)||s.push(g)));return s}
function cek(){
const S=symp(),on=S.filter(x=>cc[x]);
let res="";
if(on.length){const r=D.filter(d=>cocok(d,ccrop)).map(d=>({d,m:d.g.filter(g=>cc[g]).length,p:d.g.filter(g=>cc[g]).length/d.g.length})).filter(x=>x.m>0).sort((a,b)=>b.p-a.p||b.m-a.m).slice(0,3);
res=`<h2>Kemungkinan penyebab</h2>${r.map(x=>`<button class="item" onclick="sel=${D.indexOf(x.d)};tab='pustaka';render();scrollTo(0,0)"><b>${x.d.n}</b><small>${x.m} dari ${x.d.g.length} ciri cocok</small><div class="bar"><i style="width:${Math.round(x.p*100)}%"></i></div></button>`).join("")}
<div class="note">Ini perkiraan dari ciri yang dipilih, bukan diagnosis pasti. Bila ragu, tunjukkan tanaman ke POPT atau penyuluh.</div>`}
return`<h2>Cek gejala</h2>${chips(ccrop,CR,"setCC")}<div class="card">${S.map(x=>`<label class="ck"><input type="checkbox" ${cc[x]?"checked":""} onchange="cc[this.dataset.k]=this.checked;render()" data-k="${esc(x)}"><span>${x}</span></label>`).join("")}</div>
<button class="btn sec" onclick="cc={};render()">Hapus pilihan</button><div style="height:14px"></div>${res}`}
// ====== DIAGNOSA FOTO ONLINE (lewat /api/diagnose) ======
let fcrop="padi",pred=null,perr="";
function resize(file,max=1024){return new Promise((ok,no)=>{const im=new Image(),u=URL.createObjectURL(file);
  im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");
    c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
    URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",.82))};
  im.onerror=()=>no(new Error("Foto tidak bisa dibuka"));im.src=u})}
async function pick(i){const f=i.files[0];i.value="";if(!f)return;pred="loading";perr="";render();
  try{photo=await resize(f);render();
    const r=await fetch("/api/diagnose",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({image:photo.split(",")[1],tanaman:fcrop,kandidat:D.filter(d=>fcrop==="tidak"?tanOn[d.t]!==false:cocok(d,fcrop)).map(d=>d.n)})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||"Layanan belum bisa dihubungi");
    pred=j;
  }catch(e){pred=null;perr=navigator.onLine?e.message:"Tidak ada internet. Pakai Cek gejala atau Pustaka, keduanya tetap jalan tanpa internet."}
  render()}
function setF(v){fcrop=v;render()}
function hasil(){
  if(pred==="loading")return `<div class="note">Sedang mengenali foto. Tunggu beberapa detik...</div>`;
  if(perr)return `<div class="note">${esc(perr)}</div>`;
  if(!pred)return "";
  let h="";
  if(!pred.foto_layak)h+=`<div class="note"><b>Foto kurang jelas.</b> ${esc(pred.catatan||"Foto ulang lebih dekat, fokus, dengan cahaya cukup.")}</div>`;
  if(pred.kandidat.length){h+=`<h2>Kemungkinan penyebab</h2>`+pred.kandidat.map(x=>{
    const i=D.findIndex(d=>d.n===x.nama),p=Math.round(x.keyakinan*100);
    const inner=`<b>${esc(x.nama)}</b><small>Keyakinan ${p}%. ${esc(x.alasan)}</small><div class="bar"><i style="width:${p}%"></i></div>`;
    return i>=0?`<button class="item" onclick="sel=${i};tab='pustaka';render();scrollTo(0,0)">${inner}</button>`:`<div class="item">${inner}</div>`}).join("");
    if(pred.kandidat[0].keyakinan<0.5)h+=`<div class="note"><b>AI tidak terlalu yakin.</b> Foto ulang dari dekat, atau pakai Cek gejala dan tanyakan ke POPT.</div>`}
  else if(pred.foto_layak)h+=`<div class="note">Tidak ditemukan hama atau penyakit yang jelas. ${esc(pred.catatan)}</div>`;
  return h+`<div class="note">Hasil AI hanya perkiraan. Bila ragu atau serangan berat, tunjukkan tanaman ke POPT atau penyuluh.</div>`;
}
function foto(){return`<h2>Foto tanaman</h2><div class="card"><p>Pilih tanaman, lalu foto bagian yang sakit atau hama yang terlihat. Perlu internet.</p>
${chips(fcrop,[...CRaktif(),["tidak","Tidak tahu"]],"setF")}${fcrop==="sayur"?jenChips():""}
<input type="file" accept="image/*" capture="environment" id="fcam" style="display:none" onchange="pick(this)">
<input type="file" accept="image/*" id="fgal" style="display:none" onchange="pick(this)">
<button class="btn" onclick="$('#fcam').click()">Ambil foto dengan kamera</button>
<div style="height:10px"></div>
<button class="btn sec" onclick="$('#fgal').click()">Unggah foto dari galeri</button>
${photo?`<img class="pv" src="${photo}" alt="Foto tanaman yang dipilih">`:""}</div>${hasil()}`}
function tentang(){return`<h2>Tentang Tani Cerdas</h2><div class="card"><p>Tani Cerdas Sumba Timur membantu petani mengenali hama dan penyakit padi dan cabai. Pengetahuannya berasal dari data penyuluhan pertanian dan dikelola oleh pakar lewat halaman admin.</p>
<ul><li>Pustaka, Cek gejala, dan Kalender bisa dipakai tanpa internet.</li><li>Foto dan Balasan pakar memerlukan internet.</li><li>Untuk serangan berat atau dosis pestisida, tanyakan ke POPT atau penyuluh.</li></ul></div>`}
const TABS=[["pustaka","Pustaka"],["foto","Foto"],["cek","Cek gejala"],["kalender","Kalender"],["tentang","Info"]];
function render(){
$("#nav").innerHTML=TABS.map(([k,l])=>`<button role="tab" aria-selected="${tab===k}" onclick="tab='${k}';sel=null;render();scrollTo(0,0)">${l}</button>`).join("");
$("#app").innerHTML=({pustaka,foto,cek,kalender,tentang})[tab]()}
function setCrop(v){crop=v;render()}
function setCC(v){ccrop=v;cc={};render()}

render();
