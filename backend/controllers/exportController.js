const PDFDocument = require('pdfkit');
const { db: LapgiatDB } = require('../models/Lapgiat');
const { db: LapgiatMediaDB } = require('../models/LapgiatMedia');
const { db: SatdikDB } = require('../models/Satdik');
const path = require('path');
const fs = require('fs');

const exportPdf = async (req, res, next) => {
  try {
    const { tanggal, tahunAjaran } = req.query;

    const queryDate = tanggal || '2026-06-24';
    const queryTA = tahunAjaran || '2025/2026';

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

    // Setup PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Lapgiat_${queryDate}.pdf`);

    doc.pipe(res);

    // Header
    doc.font('Helvetica-Bold').fontSize(12).text('YAYASAN HANG TUAH', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(12).text('PENGURUS DAERAH JAKARTA', { align: 'center' });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(13).text('KEGIATAN HARIAN DI LINGKUNGAN', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(13).text('DAERAH JAKARTA YAYASAN HANG TUAH', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).text(`TAHUN AJARAN ${queryTA}`, { align: 'center' });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(11).text(`TANGGAL: ${queryDate.toUpperCase()}`, { align: 'center' });
    doc.moveDown(1);

    // Table Headers
    const startX = 24;
    let currentY = doc.y;
    const colWidths = [95, 145, 145, 145]; // Total width ~ 530

    doc.rect(startX, currentY, 550, 25).fillAndStroke('#f0f0f0', '#000000');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);

    doc.text('YHT / SATDIK', startX + 5, currentY + 7, { width: colWidths[0] - 10, align: 'center' });
    doc.text('KEGIATAN', startX + colWidths[0] + 5, currentY + 7, { width: colWidths[1] - 10, align: 'center' });
    doc.text('KETERANGAN', startX + colWidths[0] + colWidths[1] + 5, currentY + 7, { width: colWidths[2] - 10, align: 'center' });
    doc.text('MEDIA', startX + colWidths[0] + colWidths[1] + colWidths[2] + 5, currentY + 7, { width: colWidths[3] - 10, align: 'center' });

    currentY += 25;

    // Table Content Rows
    for (const satdik of satdikList) {
      const lapgiat = lapgiatMap.get(String(satdik.id));

      const satdikName = satdik.nama;
      const kegiatanText = lapgiat ? lapgiat.uraianKegiatan : '- Belum ada laporan -';
      const keteranganText = lapgiat ? lapgiat.keteranganPeserta : '-';
      const mediaList = lapgiat ? (mediaMap.get(String(lapgiat.id)) || []) : [];

      const rowHeight = 110;

      // Check for Page Overflow
      if (currentY + rowHeight > 750) {
        doc.addPage();
        currentY = 40;
      }

      // Draw Row Border
      doc.rect(startX, currentY, colWidths[0], rowHeight).stroke();
      doc.rect(startX + colWidths[0], currentY, colWidths[1], rowHeight).stroke();
      doc.rect(startX + colWidths[0] + colWidths[1], currentY, colWidths[2], rowHeight).stroke();
      doc.rect(startX + colWidths[0] + colWidths[1] + colWidths[2], currentY, colWidths[3], rowHeight).stroke();

      // Column 1: Satdik
      doc.font('Helvetica-Bold').fontSize(8.5).text(satdikName, startX + 5, currentY + 8, {
        width: colWidths[0] - 10,
        align: 'left'
      });

      // Column 2: Kegiatan
      doc.font('Helvetica').fontSize(8).text(kegiatanText, startX + colWidths[0] + 5, currentY + 8, {
        width: colWidths[1] - 10,
        align: 'left'
      });

      // Column 3: Keterangan
      doc.font('Helvetica').fontSize(8).text(keteranganText, startX + colWidths[0] + colWidths[1] + 5, currentY + 8, {
        width: colWidths[2] - 10,
        align: 'left'
      });

      // Column 4: Media Dokumentasi
      const photoX = startX + colWidths[0] + colWidths[1] + colWidths[2] + 5;
      const photoY = currentY + 8;
      if (mediaList.length > 0) {
        for (let p = 0; p < Math.min(mediaList.length, 4); p++) {
          const relPath = mediaList[p].path || '';
          const photoPath = relPath.startsWith('/uploads/')
            ? path.join(__dirname, '..', 'uploads', path.basename(relPath))
            : path.join(__dirname, '..', relPath);

          if (fs.existsSync(photoPath)) {
            try {
              const row = Math.floor(p / 2);
              const col = p % 2;
              doc.image(photoPath, photoX + (col * 68), photoY + (row * 38), { fit: [60, 32] });
            } catch (e) {
              // Ignore corrupted images
            }
          }
        }
      } else {
        doc.font('Helvetica-Oblique').fontSize(7).text('Tidak ada dokumentasi', photoX, photoY + 12, {
          width: colWidths[3] - 10,
          align: 'center'
        });
      }

      currentY += rowHeight;
    }

    // TTD Section
    if (currentY + 100 > 750) {
      doc.addPage();
      currentY = 40;
    }

    currentY += 20;
    const ttdX = 350;
    doc.font('Helvetica-Bold').fontSize(9).text('Ketua Pengurus Daerah', ttdX, currentY, { align: 'center' });
    currentY += 15;
    doc.font('Helvetica').fontSize(8.5).text('Ttd', ttdX, currentY, { align: 'center' });
    currentY += 40;
    doc.font('Helvetica-Bold').fontSize(9.5).text('Ny. Hening Uki Prasetia', ttdX, currentY, { align: 'center' });

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
