const bcrypt = require('bcryptjs');
const { db: SatdikDB, JENJANG } = require('../models/Satdik');
const { db: UserDB, ROLES } = require('../models/User');
const { db: AcademicYearDB } = require('../models/AcademicYear');
const { db: LapgiatDB, STATUS } = require('../models/Lapgiat');

const seedData = async () => {
  console.log('--- Starting Data Seeder for Lapgiat Backend ---');

  // 1. Seed Academic Year
  const ayList = await AcademicYearDB.find();
  if (ayList.length === 0) {
    await AcademicYearDB.create({ year: '2025/2026', isCurrent: true });
    console.log('[Seeder] Academic Year 2025/2026 created.');
  }

  // 2. Seed Satdik
  const defaultSatdiks = [
    // TK
    { kodeSatdik: 'TK-01', nama: 'TK Hang Tuah 1 Tg. Priok', jenjang: JENJANG.TK, orderIndex: 1 },
    { kodeSatdik: 'TK-02', nama: 'TK Hang Tuah 2 Cilincing', jenjang: JENJANG.TK, orderIndex: 2 },
    { kodeSatdik: 'TK-04', nama: 'TK Hang Tuah 4 Ps. Minggu', jenjang: JENJANG.TK, orderIndex: 3 },
    { kodeSatdik: 'TK-05', nama: 'TK Hang Tuah 5 Cilandak', jenjang: JENJANG.TK, orderIndex: 4 },
    { kodeSatdik: 'TK-06', nama: 'TK Hang Tuah 6 Ciangsana', jenjang: JENJANG.TK, orderIndex: 5 },
    { kodeSatdik: 'TK-07', nama: 'TK Hang Tuah 7 Cipulir', jenjang: JENJANG.TK, orderIndex: 6 },
    { kodeSatdik: 'TK-08', nama: 'TK Hang Tuah 8 Jonggol', jenjang: JENJANG.TK, orderIndex: 7 },
    { kodeSatdik: 'TK-09', nama: 'TK Hang Tuah 9 Bilingual Klp. Gading', jenjang: JENJANG.TK, orderIndex: 8 },
    { kodeSatdik: 'TK-11', nama: 'TK Hang Tuah 11 Pangkalan Jati', jenjang: JENJANG.TK, orderIndex: 9 },

    // SD
    { kodeSatdik: 'SD-01', nama: 'SD Plus Hang Tuah 1 Tg. Priok', jenjang: JENJANG.SD, orderIndex: 10 },
    { kodeSatdik: 'SD-02', nama: 'SD Plus Hang Tuah 2 Jonggol', jenjang: JENJANG.SD, orderIndex: 11 },
    { kodeSatdik: 'SD-03', nama: 'SD Hang Tuah 3 Ps. Minggu', jenjang: JENJANG.SD, orderIndex: 12 },
    { kodeSatdik: 'SD-04', nama: 'SD Plus Hang Tuah 4 Cipulir', jenjang: JENJANG.SD, orderIndex: 13 },
    { kodeSatdik: 'SD-05', nama: 'SD Plus Hang Tuah 5 Cilincing', jenjang: JENJANG.SD, orderIndex: 14 },
    { kodeSatdik: 'SD-06', nama: 'SD Plus Hang Tuah 6 Klp. Gading', jenjang: JENJANG.SD, orderIndex: 15 },
    { kodeSatdik: 'SD-07', nama: 'SD Plus Hang Tuah 7 Ciangsana', jenjang: JENJANG.SD, orderIndex: 16 },
    { kodeSatdik: 'SD-08', nama: 'SD Hang Tuah 8 Klp. Gading', jenjang: JENJANG.SD, orderIndex: 17 },

    // SMP
    { kodeSatdik: 'SMP-01', nama: 'SMP Hang Tuah 1 Cilincing', jenjang: JENJANG.SMP, orderIndex: 18 },
    { kodeSatdik: 'SMP-02', nama: 'SMP Hang Tuah 2 Cipulir', jenjang: JENJANG.SMP, orderIndex: 19 },
    { kodeSatdik: 'SMP-03', nama: 'SMP Hang Tuah 3 Klp. Gading', jenjang: JENJANG.SMP, orderIndex: 20 },
    { kodeSatdik: 'SMP-04', nama: 'SMP Hang Tuah 4 Ciangsana', jenjang: JENJANG.SMP, orderIndex: 21 },
    { kodeSatdik: 'SMP-05', nama: 'SMP Hang Tuah 5', jenjang: JENJANG.SMP, orderIndex: 22 },
    { kodeSatdik: 'SMP-06', nama: 'SMP Hang Tuah 6 Jonggol', jenjang: JENJANG.SMP, orderIndex: 23 },

    // SMK
    { kodeSatdik: 'SMK-01', nama: 'SMK Hang Tuah 1 Klp. Gading', jenjang: JENJANG.SMK, orderIndex: 24 },
    { kodeSatdik: 'SMK-02', nama: 'SMK Hang Tuah 2', jenjang: JENJANG.SMK, orderIndex: 25 },
    { kodeSatdik: 'SMK-DENTAL', nama: 'SMK Dental Asisten Sekesal Hang Tuah', jenjang: JENJANG.SMK, orderIndex: 26 },

    // SMA
    { kodeSatdik: 'SMA-01', nama: 'SMA Hang Tuah 1 Cipulir', jenjang: JENJANG.SMA, orderIndex: 27 },

    // Pengurus Daerah
    { kodeSatdik: 'PD-JKT', nama: 'Pengurus Daerah Jakarta', jenjang: JENJANG.PENGURUS, orderIndex: 28 }
  ];

  const existingSatdiks = await SatdikDB.find();
  const createdSatdikMap = new Map();

  for (const item of defaultSatdiks) {
    let found = existingSatdiks.find(s => s.kodeSatdik === item.kodeSatdik);
    if (!found) {
      found = await SatdikDB.create(item);
    }
    createdSatdikMap.set(item.kodeSatdik, found);
  }
  console.log(`[Seeder] ${defaultSatdiks.length} Satdik seeded.`);

  // 3. Seed Users
  const defaultUsers = [
    {
      username: 'admin',
      passwordRaw: 'admin123',
      nama: 'Super Administrator',
      role: ROLES.SUPER_ADMIN,
      satdikId: null
    },
    {
      username: 'pengurus',
      passwordRaw: 'pengurus123',
      nama: 'Ny. Hening Uki Prasetia (Ketua Pengurus)',
      role: ROLES.PENGURUS_DAERAH,
      satdikId: createdSatdikMap.get('PD-JKT')?.id || null
    },
    {
      username: 'kasatdik_tk1',
      passwordRaw: 'kasatdik123',
      nama: 'Kasatdik TK Hang Tuah 1 Tg. Priok',
      role: ROLES.KASATDIK,
      satdikId: createdSatdikMap.get('TK-01')?.id || null
    },
    {
      username: 'kasatdik_sd1',
      passwordRaw: 'kasatdik123',
      nama: 'Kasatdik SD Plus Hang Tuah 1',
      role: ROLES.KASATDIK,
      satdikId: createdSatdikMap.get('SD-01')?.id || null
    }
  ];

  for (const u of defaultUsers) {
    const existing = await UserDB.findOne(item => item.username === u.username);
    if (!existing) {
      const hashedPassword = await bcrypt.hash(u.passwordRaw, 10);
      await UserDB.create({
        username: u.username,
        password: hashedPassword,
        nama: u.nama,
        role: u.role,
        satdikId: u.satdikId
      });
      console.log(`[Seeder] User '${u.username}' created.`);
    }
  }

  // 4. Seed Initial Sample Lapgiat Entries (24 Juni 2026)
  const existingLapgiat = await LapgiatDB.find();
  if (existingLapgiat.length === 0) {
    const sampleEntries = [
      {
        kodeSatdik: 'TK-01',
        uraianKegiatan: 'Kegiatan Berbaris, menyanyi bersama dan kegiatan Keagamaan',
        keteranganPeserta: 'Diikuti oleh semua Murid Kelompok A dan B'
      },
      {
        kodeSatdik: 'TK-02',
        uraianKegiatan: 'Kegiatan Mewarnai gambar anak laki-laki dan perempuan, Meronce dengan kertas warna',
        keteranganPeserta: 'Diikuti oleh semua Murid Kelompok A dan B'
      },
      {
        kodeSatdik: 'TK-04',
        uraianKegiatan: 'Lomba mengumpulkan bola warna, Meniup pompom & Menjepit dengan penjepit jemuran',
        keteranganPeserta: 'Diikuti oleh semua Murid Kelompok A dan B'
      },
      {
        kodeSatdik: 'SD-01',
        uraianKegiatan: 'Pembiasaan Sholat Duha bersama, Mendengarkan Tausiyah dan Kegiatan Belajar',
        keteranganPeserta: 'Diikuti oleh semua Murid kelas I s.d. VI'
      },
      {
        kodeSatdik: 'SMP-01',
        uraianKegiatan: 'Sholat Dhuha Berjamaah, Sarapan bersama MBG dan Kegiatan Belajar Mengajar',
        keteranganPeserta: 'Diikuti oleh semua Murid kelas VII dan IX'
      },
      {
        kodeSatdik: 'SMK-01',
        uraianKegiatan: 'Istighotsah Bersama (Muslim), Ibadah Pagi (Nasrani), MBG Bersama dan Kegiatan Pembelajaran',
        keteranganPeserta: 'Diikuti oleh semua Murid kelas X dan XII Belajar seperti biasa'
      },
      {
        kodeSatdik: 'SMA-01',
        uraianKegiatan: 'Kegiatan Rutin Pengibaran Bendera Pagi, Praktek dan bacaan Sholat dan Kegiatan Belajar Kultum perwakilan siswa kelas XII',
        keteranganPeserta: 'Diikuti oleh semua Murid kelas X s.d. XII (Muslim)'
      },
      {
        kodeSatdik: 'PD-JKT',
        uraianKegiatan: 'Menghadiri Kegiatan doa bersama pembangunan 2 ruang kelas baru',
        keteranganPeserta: 'Dihadiri oleh KSPI, Kasi Sarpras YHT, Penasehat Komite dan Komite Sekolah'
      }
    ];

    for (const entry of sampleEntries) {
      const satdik = createdSatdikMap.get(entry.kodeSatdik);
      if (satdik) {
        await LapgiatDB.create({
          satdikId: satdik.id,
          tanggalKegiatan: '2026-06-24',
          uraianKegiatan: entry.uraianKegiatan,
          keteranganPeserta: entry.keteranganPeserta,
          status: STATUS.APPROVED,
          notes: ''
        });
      }
    }
    console.log(`[Seeder] ${sampleEntries.length} sample Lapgiat entries created.`);
  }

  console.log('--- Seeding Completed Successfully ---');
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
