// KITY – lista kitów pokazywanych w zakładce "Kity".
// Żeby dodać nowy kit: skopiuj cały blok { ... } (od "{" do "},"), wklej pod spodem i zmień dane.
// Obrazki wrzuć do folderu "kity" i wpisz ich nazwy w "plik".
window.KITY = [
  {
    nazwa: "Kreska PvP",
    ikona: "logo.png",
    obrazki: [
      { plik: "kity/kreska-pvp-zbroja.png", opis: "Zbroja i druga ręka" },
      { plik: "kity/kreska-pvp-ekwipunek.png", opis: "Ekwipunek" }
    ],
    enchanty: [
      { co: "Zbroja", ench: "4/3" },
      { co: "Miecz", ench: "3/3" },
      { co: "Mace", ench: "Wind Burst III" },
      { co: "Spear", ench: "Lunge I" }
    ]
  }
];
