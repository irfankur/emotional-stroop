// =====================================================================
//  CONFIGURATION: the only file you need to edit before sharing.
// =====================================================================
window.STUDY_CONFIG = {
  // Experiment ID from https://pipe.jspsych.org (looks like "AbC123xYz").
  // Leave empty ("") while testing: data is then downloaded as a CSV
  // file on the device instead of being sent to OSF.
  DATAPIPE_EXPERIMENT_ID: "ZIUw1scSn5iS",

  // Shown on the consent and debrief pages.
  RESEARCHER_NAME: "Irfan Kurniawan",
  RESEARCHER_CONTACT: "ipanikur66@gmail.com / 081298515327",
  INSTITUTION: "Fakultas Psikologi, Universitas Indonesia Maju",

  // Task timing (ms). Keep these in sync with the proposal (Bab 3.5).
  FIXATION_MS: 500,
  WORD_MAX_MS: 2500,
  ITI_MIN_MS: 400,
  ITI_MAX_MS: 700,
  FEEDBACK_MS: 700,

  PRACTICE_TRIALS: 5,
  PRACTICE_PASS_ACCURACY: 0.75, // 5 trials -> at least 4 correct
};
