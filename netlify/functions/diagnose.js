// Fungsi server Netlify. Kunci API diambil dari Environment Variables, TIDAK ada di kode.
const env = k => (typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get(k)) || process.env[k];
const PROVIDER = () => env("AI_PROVIDER") || (env("GEMINI_API_KEY") ? "gemini" : "anthropic");
const hits = new Map(); // pembatas sederhana per IP (best effort)
const out = (status, obj) => ({ statusCode: status, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return out(405, { error: "Metode tidak diizinkan" });
  const provider = PROVIDER();
  const keyName = provider === "gemini" ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  if (!env(keyName)) return out(500, { error: "Server belum dikonfigurasi (" + keyName + " kosong)" });

  const ip = String(event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  if (recent.length >= 30) return out(429, { error: "Terlalu banyak foto dalam satu jam. Coba lagi nanti." });
  recent.push(now); hits.set(ip, recent);

  let body;
  try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString() : event.body || "{}"); }
  catch (e) { return out(400, { error: "Permintaan tidak valid" }); }
  const { image, tanaman, kandidat } = body;
  if (typeof image !== "string" || image.length < 100 || image.length > 3_000_000 || !/^[A-Za-z0-9+/=]+$/.test(image))
    return out(400, { error: "Foto tidak valid atau terlalu besar" });
  const list = (Array.isArray(kandidat) ? kandidat : []).filter(x => typeof x === "string" && x.length < 80).slice(0, 30);
  const tan = ["padi", "jagung", "sayur", "tidak"].includes(tanaman) ? tanaman : "tidak";

  const prompt = `Kamu membantu petani di Kabupaten Sumba Timur, NTT mengenali hama atau penyakit tanaman dari foto.
Tanaman yang dipilih petani: ${tan === "tidak" ? "tidak diketahui" : tan}.
Daftar kandidat (utamakan memilih dari daftar ini, tulis nama persis sama):
${list.map(x => "- " + x).join("\n")}
Jika foto jelas menunjukkan hal lain di luar daftar, tulis nama umumnya. Jika tanaman tampak sehat atau tidak bisa dipastikan, katakan terus terang.

Aturan:
- Nilai dulu apakah foto layak (fokus, cukup cahaya, objek terlihat). Jika tidak, foto_layak=false dan jelaskan cara memotret ulang di "catatan".
- "keyakinan" adalah angka 0 sampai 1 yang jujur. Jangan melebih-lebihkan. Beri paling banyak 3 kandidat.
- "alasan": satu atau dua kalimat bahasa Indonesia sederhana tentang apa yang terlihat di foto.
- Jangan menyebut dosis atau merek pestisida.
Balas HANYA JSON, tanpa teks lain, dengan bentuk:
{"foto_layak":true,"tanaman_terlihat":"...","kandidat":[{"nama":"...","keyakinan":0.0,"alasan":"..."}],"catatan":"..."}`;

  // Netlify memutus fungsi yang terlalu lama (bawaan 10 detik), jadi kita batasi sendiri agar pesannya jelas.
  const limit = Number(env("AI_TIMEOUT_MS")) || 9000;
  try {
    let txt = "";
    if (provider === "gemini") {
      const primary = env("GEMINI_MODEL") || "gemini-flash-latest";
      const fb = (env("GEMINI_FALLBACK_MODELS") || "gemini-flash-latest,gemini-3.1-flash-lite").split(",").map(x => x.trim()).filter(Boolean);
      // Urutan percobaan: model utama, cadangan, lalu model utama sekali lagi
      const attempts = [primary, ...fb.filter(m => m !== primary), primary];
      const deadline = Date.now() + limit;
      let r = null;
      for (const model of attempts) {
        const left = deadline - Date.now();
        if (left < 3000) break;
        r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
          method: "POST", signal: AbortSignal.timeout(left),
          headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1200, ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}) }
          })
        });
        if (r.ok) break;
        if (![404, 500, 503, 504].includes(r.status)) break; // 429, 400, 403 dst: tidak perlu dicoba model lain
        console.log("Gemini " + r.status + " pada model " + model + ", mencoba berikutnya");
        await new Promise(res => setTimeout(res, 700));
      }
      if (!r) return out(504, { error: "AI terlalu lama menjawab. Coba foto lagi." });
      if (r.status === 429) return out(429, { error: "Batas pemakaian gratis tercapai. Coba lagi beberapa menit lagi." });
      if (!r.ok) return out(502, { error: "Layanan AI sedang bermasalah (kode " + r.status + "). Coba lagi sebentar lagi." });
      const j = await r.json();
      txt = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || "").join("");
    } else {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(limit),
        headers: { "x-api-key": env("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: env("ANTHROPIC_MODEL") || "claude-sonnet-5-5", max_tokens: 700,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
            { type: "text", text: prompt }] }]
        })
      });
      if (!r.ok) return out(502, { error: "Layanan AI sedang bermasalah (kode " + r.status + ")" });
      const j = await r.json();
      txt = (j.content || []).map(c => c.text || "").join("");
    }
    const a = txt.indexOf("{"), b = txt.lastIndexOf("}");
    const o = JSON.parse(txt.slice(a, b + 1));
    return out(200, {
      foto_layak: o.foto_layak !== false,
      tanaman_terlihat: String(o.tanaman_terlihat || "").slice(0, 80),
      catatan: String(o.catatan || "").slice(0, 400),
      kandidat: (Array.isArray(o.kandidat) ? o.kandidat : []).slice(0, 3).map(k => ({
        nama: String(k.nama || "").slice(0, 80),
        keyakinan: Math.max(0, Math.min(1, Number(k.keyakinan) || 0)),
        alasan: String(k.alasan || "").slice(0, 300)
      }))
    });
  } catch (e) {
    if (e && (e.name === "TimeoutError" || e.name === "AbortError")) return out(504, { error: "AI terlalu lama menjawab. Coba foto lagi." });
    return out(502, { error: "Gagal memproses hasil dari AI" });
  }
};
