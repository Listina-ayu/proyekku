(function () {
  "use strict";

  const form = document.getElementById("chat-form");
  const input = document.getElementById("message-input");
  const messages = document.getElementById("messages");
  const conversation = document.getElementById("conversation");
  const welcome = document.getElementById("welcome");
  const knowledge = window.HERU_KNOWLEDGE;
  let previousCategory = "";
  let previousEntry = null;
  let answerCount = 0;

  const stopWords = new Set([
    "apa", "apakah", "bagaimana", "berapa", "dimana", "di", "ke", "dari", "yang",
    "dan", "atau", "untuk", "dengan", "tentang", "saya", "aku", "kami", "kamu",
    "ini", "itu", "ada", "bisa", "tolong", "dong", "ya", "kah", "kabupaten",
    "bojonegoro", "carikan", "jelaskan", "ceritakan", "minta", "info", "informasi"
  ]);

  function normalize(value) {
    return value.toLocaleLowerCase("id-ID")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ").trim();
  }

  function tokens(value) {
    return normalize(value).split(" ").filter((word) => word.length > 1 && !stopWords.has(word));
  }

  function scoreEntry(query, entry) {
    const normalizedQuery = normalize(query);
    const queryTokens = tokens(query);
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += normalizedKeyword.includes(" ") ? 7 : 4;
      } else {
        const keywordTokens = tokens(keyword);
        const matches = keywordTokens.filter((word) => queryTokens.includes(word)).length;
        if (matches) score += matches * (keywordTokens.length > 1 ? 1.5 : 2);
      }
    }
    if (entry.category === previousCategory && queryTokens.length <= 3) score += 1;
    return score;
  }

  function findEntries(query) {
    return knowledge
      .map((entry) => ({ entry, score: scoreEntry(query, entry) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function addMessage(role, text, source) {
    const row = document.createElement("article");
    row.className = "message-row " + role;

    if (role === "assistant") {
      const avatar = document.createElement("span");
      avatar.className = "message-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "H";
      row.appendChild(avatar);
    }

    const content = document.createElement("div");
    content.className = "message-content";
    const name = document.createElement("div");
    name.className = "message-name";
    name.textContent = role === "user" ? "Kamu" : "HeruAI";
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = text;
    content.append(name, bubble);

    if (source) {
      const sourceLine = document.createElement("div");
      sourceLine.className = "sources";
      const label = document.createElement("strong");
      label.textContent = "Rujukan: ";
      sourceLine.append(label, document.createTextNode(source));
      content.appendChild(sourceLine);
    }

    row.appendChild(content);
    messages.appendChild(row);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function includesAny(text, phrases) {
    return phrases.some((phrase) => text.includes(phrase));
  }

  function respond(query) {
    const text = normalize(query);
    const emergency = includesAny(text, [
      "darurat", "kecelakaan", "tidak sadar", "pingsan", "sesak napas", "susah napas",
      "sulit bernapas", "kebakaran", "terjebak", "banjir sekarang", "air masuk rumah",
      "butuh bantuan segera", "ancaman keselamatan", "longsor sekarang"
    ]);
    if (emergency) {
      return {
        text: "Jika ada ancaman langsung terhadap keselamatan, segera menjauh ke tempat aman dan hubungi layanan darurat resmi atau petugas setempat sekarang. Jika memungkinkan, minta bantuan orang di dekatmu. Saya tidak akan mengarang nomor darurat atau mengklaim laporan sudah diterima. Untuk banjir/cuaca, ikuti pengumuman BPBD dan petugas resmi.",
        source: "Arahan keselamatan dalam dokumen HeruAI; kanal darurat/BPBD resmi"
      };
    }

    if (tokens(text).some((word) => ["nik", "otp", "password", "sandi"].includes(word)) ||
        includesAny(text, ["nomor induk kependudukan", "kata sandi", "nomor rekening", "rekam medis"])) {
      return {
        text: "Demi keamanan, jangan kirim NIK, OTP, kata sandi, nomor rekening, rekam medis, atau dokumen identitas di chat umum. Saya bisa membantu menjelaskan prosedur secara umum tanpa data pribadi.",
        source: ""
      };
    }

    if (includesAny(text, ["halo", "hai", "helo", "selamat pagi", "selamat siang", "selamat sore", "selamat malam", "sugeng rawuh"])) {
      return { text: "Halo! Sugeng rawuh. Saya HeruAI, teman ngobrol  tentang Bojonegoro dan berbagai topik umum. Mau tanya apa hari ini?", source: "" };
    }
    if (includesAny(text, ["terima kasih", "makasih", "matur nuwun"])) {
      return { text: "Sama-sama! Senang bisa membantu. Kalau ada pertanyaan lain, langsung tulis saja.", source: "" };
    }
    if (includesAny(text, ["siapa kamu", "kamu siapa", "namamu", "nama kamu"])) {
      return { text: "Saya HeruAI, chatbot heuristik yang berjalan langsung di browser. Saya mencocokkan pertanyaan dengan pengetahuan lokal tentang Bojonegoro; saya bukan model generatif, tidak memakai API, dan tidak bisa mengambil informasi terbaru dari internet.", source: "" };
    }
    if (includesAny(text, ["apa kabar", "gimana kabar", "bagaimana kabarmu"])) {
      return { text: "Baik dan siap diajak ngobrol! Kamu sendiri bagaimana? Kalau mau, kita juga bisa membahas Bojonegoro.", source: "" };
    }
    if (includesAny(text, ["cerita lucu", "lelucon", "tebak tebakan", "jokes"])) {
      return { text: "Kenapa peta Bojonegoro jarang merasa kesepian? Karena selalu punya banyak kecamatan untuk dikunjungi! Mau ngobrol soal apa lagi?", source: "" };
    }

    if (previousEntry && includesAny(text, [
      "lebih lanjut", "lebih detail", "jelaskan lagi", "ceritakan lagi", "lokasinya",
      "dimana itu", "di mana itu", "sumbernya", "sumber resmi", "rujukannya",
      "apa lagi", "terus", "lanjut"
    ])) {
      if (previousEntry.category === "Gambaran umum" &&
          includesAny(text, ["lokasinya", "dimana itu", "di mana itu"])) {
        return {
          text: "Yang mana nih—Kayangan Api, Teksas Wonocolo, Negeri Atas Angin, atau tempat lain? Sebutkan namanya, nanti aku coba bantu jelaskan lokasinya.",
          source: ""
        };
      }
      if (includesAny(text, ["sumbernya", "sumber resmi", "rujukannya"])) {
        return {
          text: "Rujukan untuk informasi tadi: " + previousEntry.source + ". Untuk data yang berubah, sebaiknya cek langsung sumber resminya ya.",
          source: previousEntry.source
        };
      }
      return {
        text: "Tentu! " + previousEntry.answer + "\n\nMau tahu bagian tertentu lebih jauh? Kamu bisa tanya soal lokasi, cara menuju ke sana, atau hal lain yang ingin kamu pastikan.",
        source: previousEntry.source
      };
    }

    const results = findEntries(query);
    if (results.length && results[0].score >= 2) {
      previousCategory = results[0].entry.category;
      previousEntry = results[0].entry;
      const answer = results[0].entry.answer;
      if (includesAny(text, ["sakit", "gejala", "obat", "demam", "nyeri", "dokter", "medis"])) {
        return {
          text: "Aku bisa bantu dengan informasi umum. " + answer + "\n\nUntuk keluhan medis, tenaga kesehatan tetap sumber yang tepat ya. Ini bukan diagnosis; kalau kondisinya gawat, segera cari pertolongan langsung.",
          source: results[0].entry.source
        };
      }
      if (results[0].entry.category === "Gambaran umum") return { text: answer, source: results[0].entry.source };
      const openers = ["Tentu! ", "Begini ya. ", "Yang aku tahu, "];
      const opener = openers[answerCount % openers.length];
      answerCount += 1;
      return { text: opener + answer, source: results[0].entry.source };
    }

    if (text.length < 4 || ["wisata", "pendidikan", "kesehatan", "layanan", "ekonomi", "data", "budaya"].includes(text)) {
      return {
        text: "Boleh diperjelas sedikit? Misalnya sebutkan topik dan wilayah yang dimaksud: wisata di kecamatan mana, layanan apa, atau data tahun berapa. Saya bisa menjawab lebih tepat kalau pertanyaannya spesifik.",
        source: ""
      };
    }

    return {
      text: "Hmm, aku belum punya informasi yang cukup tepercaya untuk menjawab itu—aku tidak mau asal menebak. Kalau masih seputar Bojonegoro, coba ceritakan sedikit lebih spesifik: nama kecamatan/desa, jenis layanan, atau topik yang kamu cari. Aku bisa bantu soal wilayah, layanan publik, sekolah, kesehatan, pertanian, pekerjaan, UMKM, wisata, budaya, kuliner, transportasi, sampai lingkungan. Untuk jadwal atau data terbaru, kita tetap perlu cek sumber resminya.",
      source: ""
    };
  }

  function sendMessage(value) {
    const query = value.trim();
    if (!query) return;
    welcome.hidden = true;
    addMessage("user", query, "");
    const result = respond(query);
    addMessage("assistant", result.text, result.source);
    input.value = "";
    input.style.height = "auto";
    input.focus();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 130) + "px";
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll(".suggestion").forEach((button) => {
    button.addEventListener("click", () => sendMessage(button.dataset.prompt || ""));
  });
})();
