// KITY – lista kitów pokazywanych w zakładce "Kity".
// Żeby dodać nowy kit: skopiuj cały blok { ... } (od "{" do "},"), wklej pod spodem i zmień dane
// (albo wyślij Claude'owi zrzuty ekwipunku i listę enchantów).
//
// przedmioty: nazwa przedmiotu -> lista enchantów (pokazują się w dymku po najechaniu myszką).
// obrazki: zrzut + położenie slotów na zrzucie (w pikselach) + nazwy przedmiotów w każdym slocie
//          (wiersz po wierszu; null = pusty slot).
window.KITY = [
  {
    nazwa: "Kreska PvP",
    ikona: "logo.png",
    przedmioty: {
      "Leather Cap": ["Protection IV", "Unbreaking III"],
      "Leather Tunic": ["Protection IV", "Unbreaking III"],
      "Leather Pants": ["Protection IV", "Unbreaking III"],
      "Leather Boots": ["Protection IV", "Unbreaking III"],
      "Wooden Sword": ["Sharpness III", "Unbreaking III"],
      "Mace": ["Wind Burst III"],
      "Wooden Spear": ["Lunge I"],
      "Fishing Rod": ["Unbreaking III"]
    },
    obrazki: [
      {
        plik: "kity/kreska-pvp-zbroja.png",
        opis: "Zbroja i druga ręka",
        x: [0, 35, 71, 107, 143], y: [0], slot: 31,
        sloty: [
          ["Leather Cap", "Leather Tunic", "Leather Pants", "Leather Boots", "Totem of Undying"]
        ]
      },
      {
        plik: "kity/kreska-pvp-ekwipunek.png",
        opis: "Ekwipunek",
        x: [6, 42, 78, 114, 150, 186, 222, 258, 294], y: [9, 45, 81, 125], slot: 32,
        sloty: [
          ["Leather Cap", "Leather Tunic", "Leather Pants", "Leather Boots", "Cobblestone", "Splash Potion of Slow Falling", "Totem of Undying", "Totem of Undying", "Totem of Undying"],
          ["Respawn Anchor", "Glowstone", "Honey Block", "Blue Ice", "Cobblestone", "Splash Potion of the Turtle Master", "Wooden Spear", "Totem of Undying", "Totem of Undying"],
          ["Wooden Sword", "Obsidian", "End Crystal", "Slime Block", "Cobblestone", "Armor Stand", "Armor Stand", "Totem of Undying", "Sweet Berries"],
          ["Wooden Sword", "Wind Charge", "Mace", "Fishing Rod", "Cobblestone", "Ender Pearl", "Totem of Undying", "Golden Carrot", "Sweet Berries"]
        ]
      }
    ]
  }
];
