import type { GameFixture, Variant } from './types'

// Seven accounts per game: indices 0–4 AVAILABLE, 5 RESERVED, 6 DELISTED.
export const gameFixtures: GameFixture[] = [
  {
    code: 'ML',
    variant: (i) => {
      const rows: Variant[] = [
        { title: 'Mythic Glory 120 Skin', rank: 'Mythic Glory', level: 65, extra: { jumlah_skin: 120, hero_favorit: 'Ling' }, price: 1_250_000 },
        { title: 'Mythic Fanny Collector', rank: 'Mythic', level: 52, extra: { jumlah_skin: 87, hero_favorit: 'Fanny' }, price: 850_000 },
        { title: 'Legend Full Emblem', rank: 'Legend', level: 40, extra: { jumlah_skin: 45 }, price: 450_000 },
        { title: 'Epic Hemat', rank: 'Epic', level: 30, extra: {}, price: 275_000 },
        { title: 'Grandmaster 210 Skin', rank: 'Grandmaster', level: 58, extra: { jumlah_skin: 210, hero_favorit: 'Lancelot' }, price: 1_900_000 },
        { title: 'Mythical Honor Siap Pakai', rank: 'Mythical Honor', level: 60, extra: {}, price: 650_000 },
        { title: 'Warrior Starter', rank: 'Warrior', level: 12, extra: {}, price: 150_000 },
      ]
      return rows[i]
    },
  },
  {
    code: 'COC',
    variant: (i) => {
      const rows: Variant[] = [
        { title: 'TH15 Max Hero', rank: 'TH15', level: 220, extra: { town_hall: 15, tahun_buat: 2016 }, price: 950_000 },
        { title: 'TH14 Semi Max', rank: 'TH14', level: 205, extra: { town_hall: 14, tahun_buat: 2018 }, price: 1_450_000 },
        { title: 'TH12 Farming Base', rank: 'TH12', level: 160, extra: { town_hall: 12, tahun_buat: 2019 }, price: 550_000 },
        { title: 'TH11 Murah', rank: 'TH11', level: 130, extra: { town_hall: 11 }, price: 325_000 },
        { title: 'TH16 Donasi Clan', rank: 'TH16', level: 240, extra: { town_hall: 16, tahun_buat: 2015 }, price: 2_400_000 },
        { title: 'TH13 Progresif', rank: 'TH13', level: 180, extra: { town_hall: 13 }, price: 725_000 },
        { title: 'TH9 Starter', rank: 'TH9', level: 90, extra: {}, price: 180_000 },
      ]
      return rows[i]
    },
  },
  {
    code: 'GI',
    variant: (i) => {
      const rows: Variant[] = [
        { title: 'AR60 14 Karakter 5★', rank: 'AR60', level: 60, extra: { adventure_rank: 60, region: 'Asia', jumlah_karakter: 14, jumlah_senjata_5: 4 }, price: 1_750_000 },
        { title: 'AR58 Whale Account', rank: 'AR58', level: 58, extra: { adventure_rank: 58, region: 'America', jumlah_karakter: 20, jumlah_senjata_5: 8 }, price: 2_250_000 },
        { title: 'AR55 Archon Ready', rank: 'AR55', level: 55, extra: { adventure_rank: 55, region: 'Asia', jumlah_karakter: 9 }, price: 1_100_000 },
        { title: 'AR50 Starter Gacha', rank: 'AR50', level: 50, extra: { adventure_rank: 50, region: 'Europe' }, price: 625_000 },
        { title: 'AR60 Full Archon', rank: 'AR60', level: 60, extra: { adventure_rank: 60, region: 'Asia', jumlah_karakter: 28, jumlah_senjata_5: 12 }, price: 3_500_000 },
        { title: 'AR56 Explore Sumeru', rank: 'AR56', level: 56, extra: { adventure_rank: 56, region: 'Asia', jumlah_karakter: 12 }, price: 1_350_000 },
        { title: 'AR45 Murah', rank: 'AR45', level: 45, extra: { adventure_rank: 45, region: 'Asia' }, price: 400_000 },
      ]
      return rows[i]
    },
  },
  {
    code: 'FF',
    variant: (i) => {
      const rows: Variant[] = [
        { title: 'Grandmaster Banyak Diamond', rank: 'Grandmaster', level: 70, extra: { diamond: 2200 }, price: 750_000 },
        { title: 'Heroic Bundel Elite', rank: 'Heroic', level: 60, extra: { diamond: 800 }, price: 500_000 },
        { title: 'Master Akun Lama', rank: 'Master', level: 48, extra: { diamond: 300 }, price: 300_000 },
        { title: 'Gold Hemat', rank: 'Gold', level: 25, extra: {}, price: 175_000 },
        { title: 'Grandmaster Full Bundle', rank: 'Grandmaster', level: 72, extra: { diamond: 5000 }, price: 1_200_000 },
        { title: 'Platinum Siap Main', rank: 'Platinum', level: 38, extra: { diamond: 150 }, price: 425_000 },
        { title: 'Bronze Starter', rank: 'Bronze', level: 10, extra: {}, price: 95_000 },
      ]
      return rows[i]
    },
  },
  {
    code: 'VLRT',
    variant: (i) => {
      const rows: Variant[] = [
        { title: 'Immortal 3 Prime', rank: 'Immortal 3', level: 180, extra: { jumlah_skin: 55 }, price: 1_500_000 },
        { title: 'Ascendant 2 Reaver', rank: 'Ascendant 2', level: 150, extra: { jumlah_skin: 32 }, price: 2_000_000 },
        { title: 'Diamond 1 Full Agent', rank: 'Diamond 1', level: 120, extra: { jumlah_skin: 18 }, price: 900_000 },
        { title: 'Platinum 3 Hemat', rank: 'Platinum 3', level: 85, extra: {}, price: 500_000 },
        { title: 'Radiant 500RR', rank: 'Radiant', level: 220, extra: { jumlah_skin: 90 }, price: 2_850_000 },
        { title: 'Diamond 3 Ready Ranked', rank: 'Diamond 3', level: 100, extra: { jumlah_skin: 12 }, price: 1_050_000 },
        { title: 'Silver Starter', rank: 'Silver 2', level: 40, extra: {}, price: 250_000 },
      ]
      return rows[i]
    },
  },
]
