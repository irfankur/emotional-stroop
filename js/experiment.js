/* Emotional Stroop Task (Bahasa Indonesia), jsPsych 8 + DataPipe -> OSF */
(function () {
  "use strict";
  const CFG = window.STUDY_CONFIG;
  const COLORS = window.COLORS;
  const STIM = window.STIMULI;
  const params = new URLSearchParams(window.location.search);

  // ?test=1 -> short version (4 trials per block, 4 practice); data downloaded locally
  const TEST_MODE = params.get("test") === "1";
  const USE_PIPE = !!CFG.DATAPIPE_EXPERIMENT_ID && !TEST_MODE;

  // Device detection: only a suggestion; the participant confirms it.
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const DETECTED = coarse || noHover ? "touch" : "keyboard";
  let INPUT = params.get("input") === "touch" || params.get("input") === "keyboard" ? params.get("input") : DETECTED;

  const N_PRACTICE = TEST_MODE ? 4 : CFG.PRACTICE_TRIALS;
  const N_BLOCK = TEST_MODE ? 4 : 60;
  const TOTAL_STEPS = 8 + N_PRACTICE + 2 * N_BLOCK; // pages + trials, for the progress bar
  let stepsDone = 0;

  const jsPsych = initJsPsych({
    display_element: "jspsych-target",
    show_progress_bar: true,
    auto_update_progress_bar: false,
    message_progress_bar: "",
    on_trial_finish: (data) => {
      if (["countdown", "fullscreen", "end", "save"].includes(data.task)) return;
      stepsDone++;
      jsPsych.progressBar.progress = Math.min(1, stepsDone / TOTAL_STEPS);
    },
  });
  if (TEST_MODE) window.__jsPsych = jsPsych; // for debugging in the browser console
  const R = jsPsych.randomization;
  const subject_id = R.randomID(10);
  const filename = `${subject_id}.csv`;
  const studyUrl = window.location.origin + window.location.pathname;

  jsPsych.data.addProperties({
    subject_id: subject_id,
    detected_input: DETECTED,
    test_mode: TEST_MODE,
    user_agent: navigator.userAgent,
    screen_w: window.screen.width,
    screen_h: window.screen.height,
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    pixel_ratio: window.devicePixelRatio,
    start_time: new Date().toISOString(),
  });

  // Warn before leaving mid-session (removed once data is saved)
  const leaveGuard = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", leaveGuard);

  // ---------------------------------------------------------------- helpers
  const shell = (inner) => `<div class="shell">${inner}</div>`;
  const btn = (cls) => (choice) => `<button class="jspsych-btn ${cls || ""}">${choice}</button>`;
  const primaryLast = (choice, i, arr) =>
    `<button class="jspsych-btn ${i === 1 ? "primary" : ""}">${choice}</button>`;
  const keyCaps = () =>
    `<div class="keys">${COLORS.map((c) => `<div class="key"><kbd>${c.key.toUpperCase()}</kbd><small>${c.label}</small></div>`).join("")}</div>`;
  const touchCaps = () =>
    `<div class="keys">${COLORS.map((c) => `<span class="chip">${c.label}</span>`).join("")}</div>`;
  const inkWord = (word, idx) => `<span class="word" style="color:${COLORS[idx].hex}">${word}</span>`;
  const iti = () => R.randomInt(CFG.ITI_MIN_MS, CFG.ITI_MAX_MS);

  const countdown = (label) => ({
    type: jsPsychCallFunction,
    async: true,
    func: (done) => {
      const el = jsPsych.getDisplayElement();
      let n = 3;
      const draw = () =>
        (el.innerHTML = `<div class="center-screen"><div><p class="muted">${label}</p><div class="countdown">${n}</div></div></div>`);
      draw();
      const iv = setInterval(() => {
        n--;
        if (n === 0) {
          clearInterval(iv);
          el.innerHTML = "";
          done();
        } else draw();
      }, 800);
    },
    data: { task: "countdown" },
  });

  // ------------------------------------------------------------------ trials
  const stroop = (word, valence, color, extra, feedback) => ({
    type: jsPsychStroopTrial,
    word: word,
    color: color,
    colors: COLORS,
    input: () => INPUT,
    fixation_duration: CFG.FIXATION_MS,
    trial_duration: CFG.WORD_MAX_MS,
    feedback: !!feedback,
    feedback_duration: CFG.FEEDBACK_MS,
    iti: iti,
    data: Object.assign({ valence: valence }, extra),
  });

  // Main task: each word shown twice, once per block, in two different colours.
  // Words are shuffled per participant, so the word-colour pairing is random,
  // while colour counts stay balanced (5 per colour, per category, per block).
  const blocks = [[], []];
  Object.keys(STIM).forEach((valence) => {
    R.shuffle(STIM[valence]).forEach((w, i) => {
      blocks[0].push({ word: w, valence: valence, color: COLORS[i % 4].name });
      blocks[1].push({ word: w, valence: valence, color: COLORS[(i + 2) % 4].name });
    });
  });
  const blockTrials = (b) =>
    R.shuffle(blocks[b])
      .slice(0, N_BLOCK)
      .map((t) => stroop(t.word, t.valence, t.color, { task: "test", block: b + 1 }));

  // Practice: XXXXX strings, each colour equally often, with feedback; repeated once if < 75% correct.
  let practiceRuns = 0;
  const practiceLoop = {
    timeline: [
      countdown("Latihan dimulai"),
      ...R.shuffle(Array.from({ length: N_PRACTICE }, (_, i) => COLORS[i % 4].name)).map((c) =>
        stroop("XXXXX", "latihan", c, { task: "practice" }, true)
      ),
    ],
    on_timeline_start: () => practiceRuns++,
    loop_function: (data) => {
      const acc = data.filter({ task: "practice" }).select("correct").mean();
      return acc < CFG.PRACTICE_PASS_ACCURACY && practiceRuns < 2;
    },
  };

  // ----------------------------------------------------------- intro screens
  const welcome = {
    type: jsPsychHtmlButtonResponse,
    stimulus: shell(`
      <div class="card">
        <p class="eyebrow">Eksperimen Psikologi</p>
        <h1>Tes Perhatian &amp; Emosi</h1>
        <p class="muted">Kata-kata berwarna akan muncul di layar. Tugas Anda sederhana: jawab <b>warnanya</b> secepat mungkin. Kedengarannya mudah&hellip;</p>
        <div class="facts">
          <div class="fact"><b>&plusmn;10 menit</b><span>sekali jalan, tanpa jeda panjang</span></div>
          <div class="fact"><b>Anonim</b><span>tanpa nama, email, atau nomor HP</span></div>
          <div class="fact"><b>Semua perangkat</b><span>HP, tablet, laptop, atau PC</span></div>
        </div>
        <h3>Sebelum mulai</h3>
        <ul class="clean">
          <li>Cari tempat yang tenang dan matikan notifikasi.</li>
          <li>Kerjakan sampai selesai dalam satu kali duduk.</li>
          <li>Pastikan kecerahan layar cukup agar warna terlihat jelas.</li>
        </ul>
      </div>`),
    choices: ["Mulai"],
    button_html: btn("primary"),
    data: { task: "welcome" },
  };

  const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: shell(`
      <div class="card">
        <p class="eyebrow">Langkah 1</p>
        <h2>Persetujuan ikut serta</h2>
        <p>Penelitian ini dilakukan oleh <b>${CFG.RESEARCHER_NAME}</b> (${CFG.INSTITUTION}) untuk mempelajari <b>perhatian dan emosi</b>.</p>
        <ul class="clean">
          <li>Anda akan menjawab warna kata-kata, lalu mengisi kuesioner singkat (7 pertanyaan).</li>
          <li>Beberapa kata bermuatan emosi, misalnya tentang rasa takut atau kesedihan. Semuanya kata sehari-hari.</li>
          <li>Data bersifat <b>anonim</b> dan hanya dilaporkan secara kelompok untuk keperluan ilmiah.</li>
          <li>Partisipasi sukarela. Anda boleh berhenti kapan saja dengan menutup halaman.</li>
        </ul>
        <details><summary>Syarat peserta &amp; kontak</summary>
          <p>Berusia 18 tahun ke atas, lancar membaca bahasa Indonesia, dan tidak buta warna.</p>
          <p class="small muted">Pertanyaan tentang penelitian: ${CFG.RESEARCHER_CONTACT}</p>
        </details>
        <p><b>Apakah Anda bersedia ikut serta?</b></p>
      </div>`),
    choices: ["Tidak", "Ya, saya setuju"],
    button_html: primaryLast,
    data: { task: "consent" },
    on_finish: (data) => {
      data.consent = data.response === 1;
      if (!data.consent) {
        window.removeEventListener("beforeunload", leaveGuard);
        jsPsych.abortExperiment(
          shell(`<div class="card"><h2>Terima kasih</h2><p>Anda memilih untuk tidak ikut serta. Halaman ini boleh ditutup.</p></div>`)
        );
      }
    },
  };

  const DEVICES = {
    keyboard: { ico: "⌨️", title: "Keyboard", sub: "Laptop atau PC (atau tablet dengan keyboard)" },
    touch: { ico: "📱", title: "Layar sentuh", sub: "HP atau tablet: ketuk tombol di layar" },
  };
  const deviceOrder = DETECTED === "touch" ? ["touch", "keyboard"] : ["keyboard", "touch"];
  const deviceChoice = {
    type: jsPsychHtmlButtonResponse,
    css_classes: ["device-choices"],
    stimulus: shell(`
      <div class="card">
        <p class="eyebrow">Langkah 2</p>
        <h2>Bagaimana Anda akan menjawab?</h2>
        <p class="muted">Pilih cara yang benar-benar akan Anda pakai. Di laptop, keyboard lebih cepat daripada mouse.</p>
      </div>`),
    choices: deviceOrder,
    button_html: (choice) => {
      const d = DEVICES[choice];
      return `<button class="jspsych-btn choice-card"><span class="ico" aria-hidden="true">${d.ico}</span>
        <span class="txt"><b>${d.title}${choice === DETECTED ? '<span class="badge">Disarankan</span>' : ""}</b><span>${d.sub}</span></span></button>`;
    },
    data: { task: "device" },
    on_finish: (data) => {
      INPUT = deviceOrder[data.response];
      data.input_method = INPUT;
      jsPsych.data.addProperties({ input_method: INPUT });
    },
  };

  const pill = (name, value, label, required) =>
    `<label class="opt"><input type="radio" name="${name}" value="${value}" ${required ? "required" : ""}><span>${label}</span></label>`;

  const demographics = {
    type: jsPsychSurveyHtmlForm,
    html: `
      <div class="form-wrap"><div class="card">
        <p class="eyebrow">Langkah 3</p>
        <h2>Tentang Anda</h2>
        <div class="field">
          <label class="lbl" for="usia">Usia <span class="hint">dalam tahun (minimal 18)</span></label>
          <input id="usia" type="number" name="usia" inputmode="numeric" min="18" max="99" required>
        </div>
        <fieldset class="field"><legend>Jenis kelamin</legend>
          <div class="opts">${pill("jenis_kelamin", "laki-laki", "Laki-laki", true)}${pill("jenis_kelamin", "perempuan", "Perempuan")}</div>
        </fieldset>
        <fieldset class="field"><legend>Apakah Anda lancar membaca bahasa Indonesia?</legend>
          <div class="opts">${pill("lancar_bahasa", "ya", "Ya", true)}${pill("lancar_bahasa", "tidak", "Tidak")}</div>
        </fieldset>
        <fieldset class="field"><legend>Apakah Anda buta warna? <span class="hint">sulit membedakan merah, hijau, biru, atau kuning</span></legend>
          <div class="opts">${pill("buta_warna", "tidak", "Tidak", true)}${pill("buta_warna", "ya", "Ya")}${pill("buta_warna", "tidak tahu", "Tidak tahu")}</div>
        </fieldset>
      </div></div>`,
    button_label: "Lanjut",
    autofocus: "usia",
    data: { task: "demographics" },
    on_load: () => {
      // move the submit button inside the card column
      const b = document.querySelector("#jspsych-survey-html-form-next");
      document.querySelector(".form-wrap .card").appendChild(b);
    },
    on_finish: (data) => {
      const r = data.response;
      jsPsych.data.addProperties({
        age: Number(r.usia),
        gender: r.jenis_kelamin,
        fluent_indonesian: r.lancar_bahasa,
        colorblind: r.buta_warna,
      });
    },
  };

  const fullscreenOn = {
    timeline: [
      {
        type: jsPsychFullscreen,
        fullscreen_mode: true,
        message: shell(`<div class="card"><h2>Mode layar penuh</h2><p class="muted">Agar tidak terganggu, tugas berjalan dalam layar penuh. Tekan <b>Esc</b> kapan saja untuk keluar.</p></div>`),
        button_label: "Masuk layar penuh",
        data: { task: "fullscreen" },
      },
    ],
    conditional_function: () => INPUT === "keyboard" && !!document.documentElement.requestFullscreen,
  };
  const fullscreenOff = {
    timeline: [{ type: jsPsychFullscreen, fullscreen_mode: false, data: { task: "fullscreen" } }],
    conditional_function: () => !!document.fullscreenElement,
  };

  const instructions = {
    type: jsPsychInstructions,
    pages: () => [
      shell(`<div class="card">
        <p class="eyebrow">Petunjuk 1 / 2</p>
        <h2>Jawab <u>warna</u> tulisannya, bukan artinya</h2>
        <p>Sebuah kata akan muncul di tengah layar dengan salah satu dari empat warna:</p>
        ${touchCaps()}
        <div class="demo">${inkWord("MEJA", 2)}<span class="arrow">→</span><span class="chip">BIRU</span></div>
        <div class="demo">${inkWord("SENANG", 0)}<span class="arrow">→</span><span class="chip">MERAH</span></div>
        <p class="muted small">Abaikan arti katanya. Fokus hanya pada warna tinta.</p>
      </div>`),
      shell(`<div class="card">
        <p class="eyebrow">Petunjuk 2 / 2</p>
        <h2>Cara menjawab</h2>
        ${
          INPUT === "touch"
            ? `<p>Ketuk <b>tombol nama warna</b> di bagian bawah layar. Pegang perangkat dengan nyaman dan siapkan kedua ibu jari.</p>${touchCaps()}`
            : `<p>Tekan tombol keyboard berikut. Letakkan dua jari tangan kiri di atas <b>A</b> dan <b>S</b>, serta dua jari tangan kanan di atas <b>K</b> dan <b>L</b>.</p>${keyCaps()}`
        }
        <ul class="clean">
          <li>Sebelum setiap kata muncul tanda <b>+</b>. Arahkan pandangan ke sana.</li>
          <li>Jawab <b>secepat dan setepat mungkin</b>. Kesalahan sesekali itu wajar.</li>
          <li>Pertama ada <b>latihan singkat</b> dengan tulisan XXXXX dan umpan balik benar/salah.</li>
        </ul>
      </div>`),
    ],
    show_clickable_nav: true,
    button_label_previous: "Kembali",
    button_label_next: "Lanjut",
    data: { task: "instructions" },
  };

  const startTest = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => {
      const acc = jsPsych.data.get().filter({ task: "practice" }).last(N_PRACTICE).select("correct").mean();
      return shell(`<div class="card">
        <p class="eyebrow">Latihan selesai · ketepatan ${Math.round(acc * 100)}%</p>
        <h2>Siap untuk tugas utama?</h2>
        <p>Sekarang kata-katanya adalah <b>kata biasa</b>. Tetap abaikan artinya dan jawab <b>warna tulisannya</b>.</p>
        <ul class="clean">
          <li>Tidak ada lagi umpan balik.</li>
          <li>Ada <b>2 bagian</b>, masing-masing sekitar 2 menit, dengan jeda di tengah.</li>
        </ul>
        ${INPUT === "touch" ? touchCaps() : keyCaps()}
      </div>`);
    },
    choices: ["Mulai bagian 1"],
    button_html: btn("primary"),
    data: { task: "instructions" },
  };

  const breakScreen = {
    type: jsPsychHtmlButtonResponse,
    stimulus: shell(`<div class="card">
      <p class="eyebrow">Bagian 1 dari 2 selesai</p>
      <h2>Istirahat sejenak</h2>
      <p>Bagus! Regangkan jari dan tarik napas. Lanjutkan saat Anda siap.</p>
      <p class="muted">Ingat: jawab <b>warna tulisan</b> secepat dan setepat mungkin.</p>
    </div>`),
    choices: ["Lanjut ke bagian 2"],
    button_html: btn("primary"),
    data: { task: "break" },
  };

  // GAD-7 (Spitzer et al., 2006). Indonesian wording: replace with the validated
  // Indonesian version (Budikayanti et al., 2019) if you obtain its exact text.
  const GAD_ITEMS = [
    "Merasa gugup, cemas, atau tegang",
    "Tidak mampu menghentikan atau mengendalikan rasa khawatir",
    "Terlalu mengkhawatirkan berbagai hal",
    "Sulit untuk merasa santai",
    "Sangat gelisah sehingga sulit untuk duduk diam",
    "Mudah merasa kesal atau tersinggung",
    "Merasa takut seolah-olah sesuatu yang buruk akan terjadi",
  ];
  const GAD_SCALE = ["Tidak sama sekali", "Beberapa hari", "Lebih dari separuh waktu", "Hampir setiap hari"];
  const gad7 = {
    type: jsPsychSurveyHtmlForm,
    html: `
      <div class="form-wrap"><div class="card">
        <p class="eyebrow">Langkah terakhir</p>
        <h2>Kuesioner singkat</h2>
        <p>Selama <b>2 minggu terakhir</b>, seberapa sering Anda terganggu oleh hal-hal berikut?</p>
        ${GAD_ITEMS.map(
          (q, i) => `<fieldset class="q"><legend>${i + 1}. ${q}</legend>
            <div class="opts">${GAD_SCALE.map((l, v) => pill(`gad${i + 1}`, v, l, v === 0)).join("")}</div></fieldset>`
        ).join("")}
      </div></div>`,
    button_label: "Kirim",
    data: { task: "gad7" },
    on_load: () => {
      const b = document.querySelector("#jspsych-survey-html-form-next");
      document.querySelector(".form-wrap .card").appendChild(b);
      window.scrollTo(0, 0);
    },
    on_finish: (data) => {
      const total = Object.values(data.response).reduce((a, b) => a + Number(b), 0);
      data.gad7_total = total;
      jsPsych.data.addProperties({ gad7_total: total });
    },
  };

  const addEnd = {
    type: jsPsychCallFunction,
    func: () => jsPsych.data.addProperties({ end_time: new Date().toISOString(), completed: true }),
    data: { task: "end" },
  };

  // Save: DataPipe with retries; local CSV download in test mode or as a backup.
  const saving = {
    type: jsPsychCallFunction,
    async: true,
    data: { task: "save" },
    func: (done) => {
      const el = jsPsych.getDisplayElement();
      const csv = () => jsPsych.data.get().csv();
      const finish = (how) => {
        window.removeEventListener("beforeunload", leaveGuard);
        done(how);
      };
      const showSaving = (msg) =>
        (el.innerHTML = `<div class="center-screen"><div><div class="spinner" role="status" aria-label="Menyimpan"></div><p>${msg}</p></div></div>`);

      if (!USE_PIPE) {
        showSaving("Menyiapkan data&hellip;");
        jsPsych.data.get().localSave("csv", filename);
        setTimeout(() => finish("local"), 600);
        return;
      }
      const attempt = async (tries) => {
        for (let i = 1; i <= tries; i++) {
          showSaving(i === 1 ? "Menyimpan jawaban Anda&hellip;" : `Mencoba lagi (${i}/${tries})&hellip;`);
          try {
            const res = await jsPsychPipe.saveData(CFG.DATAPIPE_EXPERIMENT_ID, filename, csv());
            if (res && !(res instanceof Error) && !res.error) return true;
            console.warn("DataPipe:", res);
          } catch (err) {
            console.warn("DataPipe:", err);
          }
          await new Promise((r) => setTimeout(r, 1500 * i));
        }
        return false;
      };
      const run = async () => {
        if (await attempt(3)) return finish("pipe");
        el.innerHTML = shell(`<div class="card">
          <h2>Data belum terkirim</h2>
          <p>Koneksi internet sepertinya terputus. Periksa koneksi Anda lalu tekan <b>Coba lagi</b>. Jangan tutup halaman ini.</p>
          <p class="muted small">Jika tetap gagal, unduh salinan data dan kirimkan ke peneliti: ${CFG.RESEARCHER_CONTACT}</p>
          <div class="actions">
            <button class="jspsych-btn" id="dl">Unduh salinan data</button>
            <button class="jspsych-btn primary" id="retry">Coba lagi</button>
          </div></div>`);
        el.querySelector("#dl").onclick = () => {
          jsPsych.data.get().localSave("csv", filename);
          finish("download");
        };
        el.querySelector("#retry").onclick = run;
      };
      run();
    },
  };

  const debrief = {
    type: jsPsychHtmlButtonResponse,
    stimulus: () =>
      shell(`<div class="card">
        <p class="eyebrow">${USE_PIPE ? "Data tersimpan ✓" : "Mode uji: data diunduh ke perangkat ini"}</p>
        <h1>Terima kasih!</h1>
        <p>Tugas tadi disebut <i>emotional Stroop task</i>. Kami ingin melihat apakah kata bermuatan emosi (misalnya <i>takut</i>) membuat orang sedikit lebih lambat menjawab warna dibandingkan kata netral (misalnya <i>meja</i>). Perlambatan ini menandakan bahwa arti kata menarik perhatian. Kuesioner yang Anda isi dipakai untuk melihat apakah hal ini berkaitan dengan tingkat kecemasan.</p>
        <details><summary>Butuh teman bicara?</summary>
          <p>Kuesioner tadi hanya alat skrining dan <b>bukan diagnosis</b>. Jika belakangan Anda sering merasa cemas atau tertekan, Anda dapat menghubungi psikolog, layanan konseling kampus, puskesmas, atau layanan kesehatan jiwa Kemenkes RI di <b>119 ekstensi 8</b>.</p>
        </details>
        <p class="muted small">Mohon tidak menceritakan tujuan penelitian ini kepada calon peserta lain. Pertanyaan: ${CFG.RESEARCHER_CONTACT}</p>
        <div class="actions"><button class="jspsych-btn" id="share">Bagikan ke teman</button></div>
        <p class="small muted" id="share-msg" aria-live="polite"></p>
      </div>`),
    choices: ["Selesai"],
    button_html: btn("primary"),
    data: { task: "debrief" },
    on_load: () => {
      const msg = document.getElementById("share-msg");
      document.getElementById("share").onclick = async () => {
        const text = "Ikut eksperimen psikologi singkat (±10 menit): jawab warna kata secepat mungkin!";
        try {
          if (navigator.share) {
            await navigator.share({ title: "Tes Perhatian & Emosi", text: text, url: studyUrl });
          } else {
            await navigator.clipboard.writeText(`${text} ${studyUrl}`);
            msg.textContent = "Tautan disalin. Tempel di WhatsApp atau media sosial Anda.";
          }
        } catch (e) {
          /* share sheet dismissed */
        }
      };
    },
    on_finish: () => {
      document.getElementById("jspsych-target").innerHTML = shell(
        `<div class="card"><h2>Selesai</h2><p class="muted">Halaman ini boleh ditutup.</p></div>`
      );
    },
  };

  // ---------------------------------------------------------------- timeline
  jsPsych.run([
    welcome,
    consent,
    deviceChoice,
    demographics,
    fullscreenOn,
    instructions,
    practiceLoop,
    startTest,
    countdown("Bagian 1"),
    { timeline: blockTrials(0) },
    breakScreen,
    countdown("Bagian 2"),
    { timeline: blockTrials(1) },
    fullscreenOff,
    gad7,
    addEnd,
    saving,
    debrief,
  ]);
})();
