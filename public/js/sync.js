// Dimuat SETELAH app.js. Ambil data pakar dari Supabase, simpan untuk offline, dan hitung Certainty Factor.
const LV=[[0,"Tidak ada"],[.4,"Sedikit yakin"],[.6,"Cukup yakin"],[.8,"Yakin"],[1,"Sangat yakin"]];
let lastR=[];
function cek(){
const S=symp(),on=S.filter(x=>cc[x]);let res="";
if(on.length){
 const r=D.filter(d=>d.t===ccrop).map(d=>{let cf=0,m=0;
  d.g.forEach((g,i)=>{const u=cc[g];if(!u)return;m++;const [mb,md]=(d.m&&d.m[i])||[.8,.1];const c=Math.max(0,mb-md)*u;cf=cf+c*(1-cf)});
  return{d,m,cf}}).filter(x=>x.m).sort((a,b)=>b.cf-a.cf).slice(0,3);
 lastR=r.map(x=>({nama:x.d.n,cf:Math.round(x.cf*100)}));
 res=`<h2>Kemungkinan penyebab</h2>${r.map(x=>`<button class="item" onclick="sel=${D.indexOf(x.d)};tab='pustaka';render();scrollTo(0,0)"><b>${x.d.n}</b><small>Tingkat kepastian ${Math.round(x.cf*100)}% (${x.m} dari ${x.d.g.length} ciri)</small><div class="bar"><i style="width:${Math.round(x.cf*100)}%"></i></div></button>`).join("")}
 <button class="btn sec" onclick="kirim()">Kirim hasil ke pakar</button><div style="height:10px"></div>
 <div class="note">Ini perkiraan metode Certainty Factor dari ciri yang dipilih, bukan diagnosis pasti. Bila ragu, tunjukkan tanaman ke POPT atau penyuluh.</div>`}
return`<h2>Cek gejala</h2>${chips(ccrop,CR,"setCC")}<div class="card">${S.map(x=>`<div style="margin:0 0 12px"><span>${x}</span><br><select data-k="${esc(x)}" onchange="cc[this.dataset.k]=+this.value;render()" style="margin-top:4px;padding:8px;width:100%">${LV.map(([v,l])=>`<option value="${v}" ${(cc[x]||0)===v?"selected":""}>${l}</option>`).join("")}</select></div>`).join("")}</div>
<button class="btn sec" onclick="cc={};render()">Hapus pilihan</button><div style="height:14px"></div>${res}`}
async function kirim(){
 const nama=prompt("Nama Anda (boleh dikosongkan):")||"Petani";
 try{const r=await fetch(SB.url+"/rest/v1/riwayat",{method:"POST",headers:{apikey:SB.key,Authorization:"Bearer "+SB.key,"Content-Type":"application/json"},body:JSON.stringify({nama,tanaman:ccrop,hasil:lastR})});
  alert(r.ok?"Terkirim ke pakar. Terima kasih.":"Gagal mengirim.")}catch(e){alert("Tidak ada internet. Coba lagi nanti.")}}
(async()=>{
 const apply=a=>{if(Array.isArray(a)&&a.length){D.length=0;D.push(...a);render()}};
 try{apply(JSON.parse(localStorage.kb))}catch(e){}
 if(SB.url.includes("XXXX"))return;
 try{const r=await fetch(SB.url+"/rest/v1/kb?id=eq.1&select=data",{headers:{apikey:SB.key,Authorization:"Bearer "+SB.key}});
  const j=await r.json();if(j[0]){localStorage.kb=JSON.stringify(j[0].data);apply(j[0].data)}}catch(e){}
})();
