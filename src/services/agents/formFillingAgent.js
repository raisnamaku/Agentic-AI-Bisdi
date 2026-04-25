import { streamChat, generateResponse } from '../gemini';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

const SYSTEM_INSTRUCTION = `Kamu adalah Agen Pengisi Formulir Akademik yang ahli.
Tugasmu adalah membantu mahasiswa mengisi formulir dan membuat dokumen akademik.

ATURAN:
1. Tanya semua informasi yang diperlukan satu per satu jika belum lengkap
2. Validasi format data (NIM, tanggal, dll)
3. Gunakan bahasa Indonesia formal
4. Setelah semua data terkumpul, konfirmasi sebelum membuat dokumen
5. Output data dalam format JSON ketika siap untuk generate dokumen

FORMULIR YANG TERSEDIA:
- Surat Izin Tidak Masuk Kuliah
- Surat Permohonan Cuti Akademik
- Surat Permohonan Pindah Jurusan
- Surat Keterangan Aktif Kuliah
- Formulir Pengajuan Judul Skripsi
- Formulir Bimbingan Skripsi
- Surat Permohonan Ujian Susulan

Ketika semua data sudah lengkap, respond dengan format:
[FORM_READY]
{JSON data}
[/FORM_READY]`;

/**
 * Form Filling Agent - helps fill academic forms and generate Word docs
 */
export async function* formFillingAgent(query, chatHistory = []) {
  yield* streamChat(query, SYSTEM_INSTRUCTION, chatHistory);
}

/**
 * Extract form data from agent response
 */
export function extractFormData(response) {
  const match = response.match(/\[FORM_READY\]\s*([\s\S]*?)\s*\[\/FORM_READY\]/);
  if (!match) return null;
  
  try {
    return JSON.parse(match[1]);
  } catch (e) {
    console.error('Failed to parse form data:', e);
    return null;
  }
}

/**
 * Generate a Word document based on form type and data
 */
export async function generateDocument(formType, formData) {
  const generators = {
    'surat_izin': generateSuratIzin,
    'cuti_akademik': generateCutiAkademik,
    'keterangan_aktif': generateKeteranganAktif,
    'pengajuan_judul': generatePengajuanJudul,
    'bimbingan_skripsi': generateBimbingan,
    'ujian_susulan': generateUjianSusulan,
    'default': generateGenericLetter,
  };

  const generator = generators[formType] || generators['default'];
  return await generator(formData);
}

function createHeader(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, font: 'Times New Roman' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  });
}

function createParagraphText(text, options = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 24,
        font: 'Times New Roman',
        ...options,
      }),
    ],
    spacing: { after: 120 },
    alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  });
}

async function generateSuratIzin(data) {
  const doc = new Document({
    sections: [{
      children: [
        createHeader('SURAT IZIN TIDAK MASUK KULIAH'),
        createParagraphText(''),
        createParagraphText(`Kepada Yth.`),
        createParagraphText(`Dosen Pengampu Mata Kuliah ${data.mata_kuliah || '...'}`),
        createParagraphText(`di Tempat`),
        createParagraphText(''),
        createParagraphText(`Dengan hormat,`),
        createParagraphText(`Yang bertanda tangan di bawah ini:`),
        createParagraphText(`Nama: ${data.nama || '...'}`),
        createParagraphText(`NIM: ${data.nim || '...'}`),
        createParagraphText(`Program Studi: ${data.prodi || '...'}`),
        createParagraphText(`Semester: ${data.semester || '...'}`),
        createParagraphText(''),
        createParagraphText(`Dengan ini mengajukan izin tidak dapat mengikuti perkuliahan pada:`),
        createParagraphText(`Hari/Tanggal: ${data.tanggal || '...'}`),
        createParagraphText(`Mata Kuliah: ${data.mata_kuliah || '...'}`),
        createParagraphText(`Alasan: ${data.alasan || '...'}`),
        createParagraphText(''),
        createParagraphText(`Demikian surat izin ini saya sampaikan. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.`),
        createParagraphText(''),
        createParagraphText(''),
        createParagraphText(`Hormat saya,`, { center: true }),
        createParagraphText(''),
        createParagraphText(''),
        createParagraphText(data.nama || '...', { center: true }),
        createParagraphText(`NIM: ${data.nim || '...'}`, { center: true }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Izin_${data.nama || 'dokumen'}.docx`);
  return true;
}

async function generateCutiAkademik(data) {
  const doc = new Document({
    sections: [{
      children: [
        createHeader('SURAT PERMOHONAN CUTI AKADEMIK'),
        createParagraphText(''),
        createParagraphText(`Kepada Yth.`),
        createParagraphText(`Dekan ${data.fakultas || '...'}`),
        createParagraphText(`di Tempat`),
        createParagraphText(''),
        createParagraphText(`Yang bertanda tangan di bawah ini:`),
        createParagraphText(`Nama: ${data.nama || '...'}`),
        createParagraphText(`NIM: ${data.nim || '...'}`),
        createParagraphText(`Program Studi: ${data.prodi || '...'}`),
        createParagraphText(`Semester: ${data.semester || '...'}`),
        createParagraphText(''),
        createParagraphText(`Dengan ini mengajukan permohonan cuti akademik untuk semester ${data.semester_cuti || '...'} tahun akademik ${data.tahun_akademik || '...'}.`),
        createParagraphText(`Alasan: ${data.alasan || '...'}`),
        createParagraphText(''),
        createParagraphText(`Demikian permohonan ini saya sampaikan. Atas perhatian dan kebijaksanaan Bapak/Ibu, saya ucapkan terima kasih.`),
        createParagraphText(''),
        createParagraphText(`Hormat saya,`, { center: true }),
        createParagraphText(''),
        createParagraphText(''),
        createParagraphText(data.nama || '...', { center: true }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Cuti_Akademik_${data.nama || 'dokumen'}.docx`);
  return true;
}

async function generateKeteranganAktif(data) {
  return generateGenericLetter({ ...data, type: 'Keterangan Aktif Kuliah' });
}

async function generatePengajuanJudul(data) {
  const doc = new Document({
    sections: [{
      children: [
        createHeader('FORMULIR PENGAJUAN JUDUL SKRIPSI'),
        createParagraphText(''),
        createParagraphText(`Nama: ${data.nama || '...'}`),
        createParagraphText(`NIM: ${data.nim || '...'}`),
        createParagraphText(`Program Studi: ${data.prodi || '...'}`),
        createParagraphText(`Dosen Pembimbing: ${data.dosen_pembimbing || '...'}`),
        createParagraphText(''),
        createParagraphText(`Judul yang Diajukan:`, { bold: true }),
        createParagraphText(data.judul || '...'),
        createParagraphText(''),
        createParagraphText(`Latar Belakang Singkat:`, { bold: true }),
        createParagraphText(data.latar_belakang || '...'),
        createParagraphText(''),
        createParagraphText(`Rumusan Masalah:`, { bold: true }),
        createParagraphText(data.rumusan_masalah || '...'),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Pengajuan_Judul_${data.nama || 'dokumen'}.docx`);
  return true;
}

async function generateBimbingan(data) {
  return generateGenericLetter({ ...data, type: 'Bimbingan Skripsi' });
}

async function generateUjianSusulan(data) {
  return generateGenericLetter({ ...data, type: 'Permohonan Ujian Susulan' });
}

async function generateGenericLetter(data) {
  const doc = new Document({
    sections: [{
      children: [
        createHeader(data.type || 'SURAT'),
        createParagraphText(''),
        ...Object.entries(data)
          .filter(([key]) => key !== 'type')
          .map(([key, value]) =>
            createParagraphText(`${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`)
          ),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${(data.type || 'Dokumen').replace(/\s/g, '_')}_${data.nama || 'dokumen'}.docx`);
  return true;
}

/**
 * Check if a query should be handled by this agent
 */
export function canHandle(query) {
  const keywords = [
    'formulir', 'form', 'isi', 'buat surat', 'surat izin', 'cuti',
    'pengajuan', 'dokumen', 'word', 'download', 'cetak', 'print',
    'template', 'generate', 'skripsi', 'bimbingan', 'ujian susulan',
    'surat keterangan', 'tolong buatkan', 'buatkan surat', 'isian',
    'format surat', 'contoh surat'
  ];
  const lower = query.toLowerCase();
  return keywords.some(k => lower.includes(k));
}
