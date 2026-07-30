const PDFDocument = require('pdfkit');
const { db: LapgiatDB } = require('../models/Lapgiat');
const { db: LapgiatMediaDB } = require('../models/LapgiatMedia');
const { db: SatdikDB } = require('../models/Satdik');
const { db: AppSettingDB } = require('../models/AppSetting');
const { db: AcademicYearDB } = require('../models/AcademicYear');
const { PDF_KOP_SETTING_KEY, DEFAULT_PDF_KOP } = require('./settingController');
const path = require('path');
const fs = require('fs');

const INDONESIAN_DAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUM’AT', 'SABTU'];
const INDONESIAN_MONTHS = [
  'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
  'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
];

const formatReportDate = (dateValue) => {
  const parts = String(dateValue || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return String(dateValue || '').toUpperCase();

  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${INDONESIAN_DAYS[date.getUTCDay()]}, ${day} ${INDONESIAN_MONTHS[month - 1]} ${year}`;
};

const exportPdf = async (req, res, next) => {
  try {
    const { tanggal, tahunAjaran } = req.query;

    const queryDate = tanggal || '2026-06-24';
    const academicYears = await AcademicYearDB.find();
    const currentAcademicYear = academicYears.find(item => item.isCurrent);
    const queryTA = tahunAjaran || currentAcademicYear?.year || '2025/2026';

    const satdikList = await SatdikDB.find();
    const orderMap = { TK: 1, SD: 2, SMP: 3, SMK: 4, SMA: 5, PENGURUS: 6 };
    satdikList.sort((a, b) => {
      const ordA = orderMap[a.jenjang] || 99;
      const ordB = orderMap[b.jenjang] || 99;
      if (ordA !== ordB) return ordA - ordB;
      return (a.orderIndex || 0) - (b.orderIndex || 0);
    });

    const allLapgiat = await LapgiatDB.find();
    const allMedia = await LapgiatMediaDB.find();
    const kopSetting = await AppSettingDB.findOne(item => item.key === PDF_KOP_SETTING_KEY);
    const kop = {
      ...DEFAULT_PDF_KOP,
      ...((kopSetting && kopSetting.value) ? kopSetting.value : {})
    };
    const orgHeaderAlign = String(kop.orgAlign || 'center').toLowerCase() === 'left' ? 'left' : 'center';
    const titleHeaderAlign = String(kop.titleAlign || 'center').toLowerCase() === 'left' ? 'left' : 'center';
    const yearHeaderAlign = String(kop.yearAlign || 'center').toLowerCase() === 'left' ? 'left' : 'center';

    const mediaMap = new Map();
    allMedia.forEach(m => {
      if (!mediaMap.has(String(m.lapgiatId))) mediaMap.set(String(m.lapgiatId), []);
      mediaMap.get(String(m.lapgiatId)).push(m);
    });

    const lapgiatMap = new Map();
    allLapgiat.forEach(l => {
      if (l.tanggalKegiatan === queryDate || !tanggal) {
        lapgiatMap.set(String(l.satdikId), l);
      }
    });

    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: true,
      info: {
        Title: `Lapgiat Harian ${queryDate}`,
        Author: 'Yayasan Hang Tuah Pengurus Daerah Jakarta'
      }
    });
    const startX = 44;
    const tableWidth = 516;
    const colWidths = [98, 228, 190];
    const pageBottom = 806;
    const cellPaddingX = 6;
    const cellPaddingY = 7;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Lapgiathar_di_Lingkungan_Daerah_Jakarta_YHT_tgl_${queryDate}.pdf`
    );

    doc.pipe(res);

    const strokeCell = (x, y, width, height) => {
      doc.lineWidth(0.45).rect(x, y, width, height).stroke('#555555');
    };

    const drawNumberRow = (y) => {
      const height = 10;
      let x = startX;
      doc.fillColor('#111111').font('Helvetica').fontSize(7);
      colWidths.forEach((width, index) => {
        strokeCell(x, y, width, height);
        doc.text(String(index + 1), x, y + 1.5, { width, align: 'center' });
        x += width;
      });
      return y + height;
    };

    const drawColumnHeader = (y) => {
      const height = 23;
      let x = startX;
      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(9);
      ['YHT/SATDIK', 'KEGIATAN', 'KETERANGAN'].forEach((label, index) => {
        const width = colWidths[index];
        strokeCell(x, y, width, height);
        doc.text(label, x, y + 7, {
          width,
          align: 'center',
          characterSpacing: 1.3
        });
        x += width;
      });
      return drawNumberRow(y + height);
    };

    const addContinuationPage = () => {
      doc.addPage({ size: 'A4', margin: 0 });
      return drawNumberRow(68);
    };

    // Kop dan judul mengikuti posisi pada dokumen contoh.
    const orgX = orgHeaderAlign === 'left' ? 57 : startX;
    const orgWidth = orgHeaderAlign === 'left' ? 205 : tableWidth;
    doc.fillColor('#111111').font('Helvetica').fontSize(8.5);
    doc.text(kop.orgLine1, orgX, 25, {
      width: orgWidth,
      align: orgHeaderAlign,
      characterSpacing: 2.1
    });
    doc.text(kop.orgLine2, orgX, 39, {
      width: orgWidth,
      align: orgHeaderAlign,
      characterSpacing: 1.75,
      underline: true
    });

    doc.font('Helvetica-Bold').fontSize(10.5);
    doc.text(kop.titleLine1, startX, 68, {
      width: tableWidth,
      align: titleHeaderAlign,
      characterSpacing: 2.4
    });
    doc.text(kop.titleLine2, startX, 84, {
      width: tableWidth,
      align: titleHeaderAlign,
      characterSpacing: 2.1
    });
    doc.text(`TAHUN AJARAN ${queryTA}`, startX, 100, {
      width: tableWidth,
      align: yearHeaderAlign,
      characterSpacing: 1.7
    });
    doc.font('Helvetica-Bold').fontSize(10.5).text(formatReportDate(queryDate), startX, 128, {
      width: tableWidth,
      align: 'center',
      characterSpacing: 1.5
    });

    let currentY = drawColumnHeader(152);

    for (const satdik of satdikList) {
      const lapgiat = lapgiatMap.get(String(satdik.id));
      if (!lapgiat) continue;

      const texts = [
        satdik.nama || '-',
        lapgiat.uraianKegiatan || '-',
        lapgiat.keteranganPeserta || '-'
      ];
      const mediaList = (mediaMap.get(String(lapgiat.id)) || [])
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .slice(0, 4);

      doc.font('Helvetica').fontSize(9.5);
      const textHeights = texts.map((text, index) =>
        doc.heightOfString(text, { width: colWidths[index] - (cellPaddingX * 2), lineGap: 1.2 })
      );
      const textRowHeight = Math.max(43, Math.ceil(Math.max(...textHeights) + (cellPaddingY * 2)));
      const photoRows = mediaList.length > 0 ? Math.ceil(mediaList.length / 2) : 0;
      const photoRowHeight = photoRows > 0 ? photoRows * 150 : 0;
      const blockHeight = textRowHeight + photoRowHeight;

      if (currentY + blockHeight > pageBottom) {
        currentY = addContinuationPage();
      }

      let x = startX;
      texts.forEach((text, index) => {
        const width = colWidths[index];
        strokeCell(x, currentY, width, textRowHeight);
        doc.fillColor('#111111').font('Helvetica').fontSize(9.5).text(
          text,
          x + cellPaddingX,
          currentY + cellPaddingY,
          {
            width: width - (cellPaddingX * 2),
            height: textRowHeight - (cellPaddingY * 2),
            lineGap: 1.2
          }
        );
        x += width;
      });
      currentY += textRowHeight;

      if (photoRows > 0) {
        strokeCell(startX, currentY, tableWidth, photoRowHeight);
        const photoCellWidth = tableWidth / 2;
        mediaList.forEach((media, index) => {
          const relPath = media.path || '';
          const photoPath = relPath.startsWith('/uploads/')
            ? path.join(__dirname, '..', 'uploads', path.basename(relPath))
            : path.join(__dirname, '..', relPath);
          if (!fs.existsSync(photoPath)) return;

          const row = Math.floor(index / 2);
          const col = index % 2;
          const photoX = startX + (col * photoCellWidth) + 2;
          const photoY = currentY + (row * 150) + 2;
          try {
            doc.image(photoPath, photoX, photoY, {
              fit: [photoCellWidth - 4, 146],
              align: 'center',
              valign: 'center'
            });
          } catch (e) {
            // File gambar rusak tidak menggagalkan seluruh laporan.
          }
        });
        currentY += photoRowHeight;
      }
    }

    if (currentY + 75 > pageBottom) {
      doc.addPage({ size: 'A4', margin: 0 });
      currentY = 68;
    }

    const signatureX = startX + colWidths[0] + colWidths[1];
    currentY += 21;
    doc.fillColor('#111111').font('Helvetica').fontSize(8.5).text(kop.signatureTitle, signatureX, currentY, {
      width: colWidths[2],
      align: 'center',
      characterSpacing: 1.25
    });
    doc.text('Ttd', signatureX, currentY + 18, {
      width: colWidths[2],
      align: 'center',
      characterSpacing: 1
    });
    doc.text(kop.signatureName, signatureX, currentY + 34, {
      width: colWidths[2],
      align: 'center',
      characterSpacing: 1.1
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const { tanggal } = req.query;
    const allLapgiat = await LapgiatDB.find();
    const satdikList = await SatdikDB.find();
    const satdikMap = new Map(satdikList.map(s => [String(s.id), s]));

    const filtered = tanggal ? allLapgiat.filter(l => l.tanggalKegiatan === tanggal) : allLapgiat;

    const data = filtered.map(l => {
      const satdik = satdikMap.get(String(l.satdikId));
      return {
        id: l.id,
        satdik: satdik ? satdik.nama : '',
        jenjang: satdik ? satdik.jenjang : '',
        tanggalKegiatan: l.tanggalKegiatan,
        uraianKegiatan: l.uraianKegiatan,
        keteranganPeserta: l.keteranganPeserta,
        status: l.status
      };
    });

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  exportPdf,
  exportExcel
};
