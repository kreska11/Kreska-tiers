// USTAWIENIA STRONY
// Dane aplikacji z Firebase (Project settings -> Your apps).
// Te dane NIE są tajne – bezpieczeństwo zapewniają reguły w firestore.rules.
// ownerNick = Twój nick. To konto jest właścicielem strony
// (musi się zgadzać z nickiem wpisanym w firestore.rules).

window.KT_CONFIG = {
  firebase: {
    apiKey: "AIzaSyC94tx6syHIqvhs-lypTC8MiohRHpGVp0c",
    authDomain: "kreska-tiers.firebaseapp.com",
    projectId: "kreska-tiers",
    storageBucket: "kreska-tiers.firebasestorage.app",
    messagingSenderId: "33893141436",
    appId: "1:33893141436:web:8a7be6a8c415514bb2f9b9"
  },
  ownerNick: "Kreska11",

  // Tryby w rankingu (zakładki nad rankingiem). id = krótka nazwa bez spacji, używana w bazie.
  // Nowy tryb trzeba też dopisać w firestore.rules (lista trybów w funkcji validPts).
  tryby: [
    { id: "kreska", nazwa: "Kreska PvP", ikona: "logo.png" },
    { id: "ironpot", nazwa: "Iron OP Pot", ikona: "tryby/iron-op-pot.png" }
  ],

  // Ile punktów trzeba mieć na dany tier (od najwyższego do najniższego).
  // Każdy próg musi być MNIEJSZY od poprzedniego. Poniżej LT5 gracz jest "bez tieru".
  progi: {
    HT1: 60, LT1: 45,
    HT2: 30, LT2: 20,
    HT3: 10, LT3: 6,
    HT4: 4,  LT4: 3,
    HT5: 2,  LT5: 1
  }
};
