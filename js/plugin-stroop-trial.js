/*
 * jsPsych 8 plugin: one emotional Stroop trial.
 * Sequence: fixation "+" -> coloured word (until response or timeout)
 *           -> optional feedback -> blank inter-trial interval.
 * Keyboard keys are ALWAYS accepted (tablets with keyboards, touch laptops).
 * On-screen buttons are shown in "touch" mode.
 * RT is measured from the first animation frame after the word is drawn.
 */
var jsPsychStroopTrial = (function (jspsych) {
  "use strict";

  const info = {
    name: "stroop-trial",
    version: "1.1.0",
    parameters: {
      word: { type: jspsych.ParameterType.STRING, default: undefined },
      color: { type: jspsych.ParameterType.STRING, default: undefined }, // colour name
      colors: { type: jspsych.ParameterType.COMPLEX, default: undefined }, // window.COLORS
      input: { type: jspsych.ParameterType.STRING, default: "keyboard" }, // "keyboard" | "touch"
      fixation_duration: { type: jspsych.ParameterType.INT, default: 500 },
      trial_duration: { type: jspsych.ParameterType.INT, default: 2500 },
      feedback: { type: jspsych.ParameterType.BOOL, default: false },
      feedback_duration: { type: jspsych.ParameterType.INT, default: 700 },
      iti: { type: jspsych.ParameterType.INT, default: 500 },
    },
    data: {
      word: { type: jspsych.ParameterType.STRING },
      color: { type: jspsych.ParameterType.STRING },
      response: { type: jspsych.ParameterType.STRING },
      correct: { type: jspsych.ParameterType.BOOL },
      timeout: { type: jspsych.ParameterType.BOOL },
      rt: { type: jspsych.ParameterType.FLOAT },
      input_method: { type: jspsych.ParameterType.STRING }, // layout shown: keyboard | touch
      response_source: { type: jspsych.ParameterType.STRING }, // keyboard | touch | mouse | pen
      onset_source: { type: jspsych.ParameterType.STRING }, // "frame" (normal) or "fallback"
      page_hidden: { type: jspsych.ParameterType.BOOL }, // true = participant switched away
    },
  };

  class StroopTrialPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const colors = trial.colors;
      const ink = colors.find((c) => c.name === trial.color);
      const touch = trial.input === "touch";

      const panel = touch
        ? `<div class="st-buttons" role="group" aria-label="Pilih warna">${colors
            .map((c) => `<button type="button" class="st-btn" data-color="${c.name}">${c.label}</button>`)
            .join("")}</div>`
        : `<div class="st-legend" aria-hidden="true">${colors
            .map((c) => `<div class="key"><kbd>${c.key.toUpperCase()}</kbd><small>${c.label}</small></div>`)
            .join("")}</div>`;

      display_element.innerHTML = `
        <div class="st-wrap">
          <div class="st-stage"><div class="st-stim st-fix" id="st-stim" aria-live="polite">+</div></div>
          ${panel}
        </div>`;
      const stim = display_element.querySelector("#st-stim");
      const buttons = Array.from(display_element.querySelectorAll(".st-btn"));

      let onset = null;
      let onsetSource = null;
      let done = false;
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));

      const respond = (colorName, evTime, source) => {
        if (done || onset === null) return;
        done = true;
        const now = performance.now();
        // event.timeStamp shares the performance.now() clock in modern browsers
        const t = evTime && evTime > onset && evTime <= now + 1 ? evTime : now;
        finish(colorName, Math.round((t - onset) * 10) / 10, source);
      };

      const onKey = (e) => {
        if (e.repeat) return;
        const k = (e.key || "").toLowerCase();
        const c = colors.find((x) => x.key === k);
        if (c) {
          e.preventDefault();
          respond(c.name, e.timeStamp, "keyboard");
        }
      };
      const onTap = (e) => {
        e.preventDefault();
        const b = e.currentTarget;
        b.classList.add("pressed");
        respond(b.dataset.color, e.timeStamp, e.pointerType || "touch");
      };
      const noMenu = (e) => e.preventDefault();

      const cleanup = () => {
        document.removeEventListener("keydown", onKey);
        buttons.forEach((b) => b.removeEventListener("pointerdown", onTap));
        display_element.removeEventListener("contextmenu", noMenu);
      };

      const finish = (response, rt, source) => {
        timers.forEach(clearTimeout);
        cleanup();
        const timeout = response === null;
        const correct = !timeout && response === trial.color;
        const data = {
          word: trial.word,
          color: trial.color,
          response: response,
          correct: correct,
          timeout: timeout,
          rt: timeout ? null : rt,
          input_method: trial.input,
          response_source: source || null,
          onset_source: onsetSource,
          page_hidden: document.hidden,
        };

        const end = () => {
          stim.textContent = "";
          stim.className = "st-stim";
          buttons.forEach((b) => b.classList.remove("pressed"));
          setTimeout(() => this.jsPsych.finishTrial(data), trial.iti);
        };

        if (trial.feedback) {
          stim.style.color = "";
          stim.className = "st-stim st-feedback " + (correct ? "ok" : "bad");
          stim.textContent = timeout ? "Terlalu lambat" : correct ? "✓ Benar" : "✗ Salah";
          setTimeout(end, trial.feedback_duration);
        } else {
          end();
        }
      };

      document.addEventListener("keydown", onKey);
      buttons.forEach((b) => b.addEventListener("pointerdown", onTap));
      display_element.addEventListener("contextmenu", noMenu);

      // fixation -> word
      later(() => {
        stim.textContent = trial.word;
        stim.style.color = ink.hex;
        stim.className = "st-stim st-word";
        let started = false;
        const start = (fromFrame) => {
          if (started) return;
          started = true;
          onset = performance.now();
          onsetSource = fromFrame ? "frame" : "fallback";
          later(() => {
            if (!done) {
              done = true;
              finish(null, null, null);
            }
          }, trial.trial_duration);
        };
        requestAnimationFrame(() => start(true));
        // Safety net: if no frame is drawn within 100 ms (e.g. hidden tab), start anyway.
        later(() => start(false), 100);
      }, trial.fixation_duration);
    }
  }

  StroopTrialPlugin.info = info;
  return StroopTrialPlugin;
})(jsPsychModule);
