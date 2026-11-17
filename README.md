# Emotional Stroop Task (Bahasa Indonesia), online

A free online experiment built with **jsPsych 8**. It is hosted on **GitHub Pages**, and **DataPipe** saves each participant's data to your **Google Drive**. It works on phones, tablets (portrait and landscape), laptops and PCs. The participant confirms how they will answer (**keyboard** A/S/K/L, or **touch** buttons), and the detected option is marked as recommended. Keyboard keys are always accepted, so tablets with keyboards and touch laptops also work. Each trial records which input was actually used (`response_source`).

Session (~5 min): welcome → consent → device choice → demographics → instructions → 3-2-1 countdown → 5 practice trials (repeated once if fewer than 4 are correct) → 60 test trials in one session (each word once, no break) → GAD-7 → data saved (retries automatically; offers a backup download if the connection fails) → debrief with a "share with friends" button.

```
emotional-stroop/
├── index.html                  page + social-media preview tags
├── js/config.js                ← EDIT THIS: DataPipe ID, your contact
├── js/stimuli.js               word lists + colours
├── js/plugin-stroop-trial.js   custom Stroop trial (keyboard + touch)
├── js/experiment.js            full session timeline
├── css/style.css
└── assets/share.png            image shown when the link is shared
```

---

## 1. Try it on your computer first

From the `UTS` folder, start a local server:

```bash
python -m http.server 8765 --directory emotional-stroop
```

Then open these in your browser:

- `http://localhost:8765/?test=1` is a short version (4 practice, 6 test trials). The CSV is **downloaded** to your computer instead of sent to DataPipe.
- `http://localhost:8765/?test=1&input=touch` forces the phone layout.
- `http://localhost:8765/` is the full version.

---

## 2. Put it online with GitHub Pages (free)

1. On GitHub, create a **new public repository** named `emotional-stroop`.
2. Upload **the contents** of this folder: drag `index.html`, `js/`, `css/`, `assets/` and `README.md` onto the repo's *Add file → Upload files* page, then commit. Or use git:
   ```bash
   cd emotional-stroop
   git init
   git add .
   git commit -m "Emotional Stroop task"
   git branch -M main
   git remote add origin https://github.com/irfankur/emotional-stroop.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages → Build and deployment**, set *Source: Deploy from a branch*, *Branch: `main` / `(root)`*, then **Save**.
4. After about 1 minute, your experiment is live at **`https://irfankur.github.io/emotional-stroop/`**.
5. In `index.html`, replace both `irfankur` entries in the `og:image` and `og:url` lines with your GitHub username, then commit again. This makes WhatsApp, X and Facebook show the preview image.

---

## 3. Connect DataPipe → Google Drive (so data saves automatically)

The exact screens may differ slightly; DataPipe's own docs are at https://pipe.jspsych.org/docs.

1. **Sign-in:** if you sign in to DataPipe with OSF, add another sign-in method (Google, GitHub, ORCID or email) under *Account settings*. OSF sign-in is being retired, and without another method you can lose access to your experiments.
2. **Connect storage:** in DataPipe's *Account settings*, connect **Google Drive**. This is the quickest option, and the data stays private in your own Drive. Dataverse (institutional) and Zenodo (public, with a DOI) are the other options.
3. Click **Create new experiment**, give it a title, and choose Google Drive. DataPipe creates a folder for it in your Drive. Leave **Psych-DS metadata** off unless you need it: the setting locks after the first submission.
4. On the experiment's page, switch **Enable data collection** ON, and copy the **Experiment ID**.
5. Paste the ID into `js/config.js` (`DATAPIPE_EXPERIMENT_ID: "…"`), then commit and push. While the ID is empty, the live site shows a "data collection paused" notice instead of the task.
6. **Pilot:** run the live link once yourself without `?test=1`. A file `<random-id>.csv` should appear in the Drive folder within a few seconds. Delete it afterwards.

> `?test=1` always skips DataPipe, so test runs never end up in your data.

---

## 4. Share on social media

**Link:** `https://irfankur.github.io/emotional-stroop/`

- **WhatsApp / X / Facebook / LINE:** paste the link. The preview card uses `assets/share.png`.
- **Instagram:** use the **Link sticker** in Stories, or put the link in your bio. Links in post captions are not clickable.
- **TikTok:** put the link in your bio.
- **QR code** (for posters or slides): generate one from the link with any free QR generator.

Caption template (Bahasa Indonesia):

> 🧠 **Bantu penelitian psikologi, cuma ±5 menit!**
> Kamu akan melihat kata-kata berwarna dan menebak **warnanya** secepat mungkin. Kedengarannya gampang… coba saja! 😄
> ✅ Anonim, tanpa nama/nomor HP
> ✅ Bisa di HP atau laptop (laptop lebih disarankan)
> ✅ Usia 18+, lancar bahasa Indonesia, tidak buta warna
> 👉 [link]
> Terima kasih banyak & boleh bantu share ya 🙏

Tips: ask people to do it **in a quiet place, in one go**, and **not to tell others what the study is about**.

---

## 5. Getting the data

In the experiment's Google Drive folder there is one CSV per participant: select all files and download them. Each row is one jsPsych trial. For the analysis, filter on `task == "test"`.

| Column | Meaning |
|---|---|
| `subject_id` | random participant code |
| `task` | `consent`, `demographics`, `practice`, `test`, `gad7`, … |
| `block` | always 1 (one test session) |
| `word`, `valence` | stimulus word and `negatif` / `positif` / `netral` |
| `color`, `response`, `correct` | ink colour, answer given, true/false |
| `rt` | reaction time in ms (on `test` rows; on other rows it is the time spent on that page) |
| `timeout` | true if no answer within 2500 ms |
| `input_method` | layout the participant chose: `keyboard` or `touch` (`detected_input` = what the device suggested) |
| `response_source` | what was actually pressed: `keyboard`, `touch`, `mouse` or `pen` |
| `onset_source`, `page_hidden` | timing checks: drop trials where `page_hidden` is true |
| `age`, `gender`, `fluent_indonesian`, `colorblind` | demographics (repeated on every row) |
| `gad7_total` | GAD-7 total score, 0–21 (repeated on every row) |
| `completed` | true when the participant reached the end |

The exclusion and analysis rules are in the proposal (Bab 3.3 and 3.6).

---

## 6. Before you launch: checklist

- [x] `config.js`: DataPipe experiment ID (Google Drive) and contact filled in
- [ ] `index.html`: `irfankur` replaced
- [ ] Word lists checked against the Sianipar et al. (2016) Indonesian norms (valence, frequency); edit them in `js/stimuli.js` **and** the proposal's Tabel 3.2
- [ ] GAD-7 wording: the items in `js/experiment.js` are a working translation. If you get the validated Indonesian text (Budikayanti et al., 2019), paste it in
- [ ] Lecturer / ethics approval, if your course requires it
- [ ] Pilot run: files arrive in Google Drive, and keyboard and phone both work
- [ ] DataPipe data collection switched **ON**; switch it OFF when you finish
