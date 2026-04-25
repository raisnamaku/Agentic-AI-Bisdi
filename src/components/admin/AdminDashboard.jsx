import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Trash2, FolderOpen, FileUp, Database } from 'lucide-react';
import Sidebar from '../common/Sidebar';
import { supabase } from '../../services/supabase';
import { storeDocumentChunks } from '../../services/rag';
import * as pdfjsLib from 'pdfjs-dist';

// Setup PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [stats, setStats] = useState({ total: 0, chunks: 0, types: 0 });

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setDocuments(data);
        const types = new Set(data.map(d => d.file_type));
        setStats({ total: data.length, chunks: data.reduce((s, d) => s + (d.chunk_count || 0), 0), types: types.size });
      }
    } catch (err) { console.error('Fetch docs error:', err); }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const readFileContent = async (file) => {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } else {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }
  };

  const processFile = async (file) => {
    const id = Date.now() + '-' + file.name;
    setUploading(prev => [...prev, { id, name: file.name, size: file.size, status: 'processing', progress: 10 }]);

    try {
      // Upload file to Supabase Storage
      const filePath = `documents/${Date.now()}-${file.name}`;
      setUploading(prev => prev.map(u => u.id === id ? { ...u, progress: 30 } : u));

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      setUploading(prev => prev.map(u => u.id === id ? { ...u, progress: 50 } : u));

      // Read text content
      let textContent = '';
      try {
        textContent = await readFileContent(file);
      } catch (e) {
        console.error("Text extraction failed:", e);
        textContent = `[File: ${file.name}] Content could not be extracted as text. File type: ${file.type}`;
      }

      // Create document record
      const { data: docRecord, error: dbError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          file_type: file.name.split('.').pop().toLowerCase(),
          file_path: filePath,
          file_size: file.size,
          content_preview: textContent.substring(0, 500),
          chunk_count: 0,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setUploading(prev => prev.map(u => u.id === id ? { ...u, progress: 70 } : u));

      // Generate embeddings and store chunks
      if (textContent.length > 0) {
        const chunks = await storeDocumentChunks(docRecord.id, textContent, { filename: file.name });
        await supabase.from('documents').update({ chunk_count: chunks.length }).eq('id', docRecord.id);
      }

      setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'done', progress: 100 } : u));
      fetchDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      setUploading(prev => prev.map(u => u.id === id ? { ...u, status: 'error', error: err.message } : u));
    }
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(processFile);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Hapus dokumen "${doc.name}"?`)) return;
    try {
      await supabase.from('document_chunks').delete().eq('document_id', doc.id);
      await supabase.storage.from('documents').remove([doc.file_path]);
      await supabase.from('documents').delete().eq('id', doc.id);
      fetchDocuments();
    } catch (err) { console.error('Delete error:', err); }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const tabs = [
    { id: 'upload', label: 'Upload Dokumen', icon: <Upload size={20} /> },
    { id: 'documents', label: 'Kelola Dokumen', icon: <FolderOpen size={20} /> },
  ];

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
      <main className="main-content">
        <div className="admin-header">
          <div>
            <h2>Panel Admin</h2>
            <p>Kelola dokumen untuk basis pengetahuan chatbot</p>
          </div>
        </div>
        <div className="admin-content">
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-icon blue"><FileText size={24} /></div>
              <div className="stat-info"><h3>{stats.total}</h3><p>Total Dokumen</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon gold"><Database size={24} /></div>
              <div className="stat-info"><h3>{stats.chunks}</h3><p>Chunk Tersimpan</p></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><FolderOpen size={24} /></div>
              <div className="stat-info"><h3>{stats.types}</h3><p>Tipe File</p></div>
            </div>
          </div>

          {activeTab === 'upload' && (
            <div className="upload-section">
              <h3>Upload Dokumen Baru</h3>
              <div
                className={`upload-dropzone ${dragOver ? 'dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true;
                  input.accept = '.txt,.pdf,.doc,.docx,.md,.csv'; input.onchange = e => handleFiles(e.target.files); input.click(); }}
              >
                <FileUp size={48} />
                <p>Drag & drop file atau <span>klik untuk upload</span></p>
                <p className="hint">Mendukung TXT, PDF, DOC, DOCX, MD, CSV</p>
              </div>
              {uploading.length > 0 && (
                <div className="upload-progress">
                  {uploading.map(item => (
                    <div key={item.id} className="upload-file-item">
                      <FileText size={20} />
                      <div className="upload-file-info">
                        <p>{item.name}</p>
                        <span>{formatSize(item.size)}</span>
                        {item.status === 'processing' && (
                          <div className="progress-bar"><div className="progress-bar-fill" style={{ width: item.progress + '%' }} /></div>
                        )}
                      </div>
                      <span className={`upload-file-status ${item.status}`}>
                        {item.status === 'processing' ? 'Memproses...' : item.status === 'done' ? '✓ Selesai' : '✗ Gagal'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="doc-list-section">
              <h3>Dokumen Tersimpan</h3>
              {documents.length === 0 ? (
                <div className="doc-list-empty">Belum ada dokumen yang di-upload</div>
              ) : (
                <table className="doc-table">
                  <thead>
                    <tr><th>Nama</th><th>Tipe</th><th>Ukuran</th><th>Chunks</th><th>Tanggal</th><th></th></tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id}>
                        <td style={{ fontWeight: 500 }}>{doc.name}</td>
                        <td><span className="doc-type-badge">{doc.file_type}</span></td>
                        <td>{formatSize(doc.file_size)}</td>
                        <td>{doc.chunk_count || 0}</td>
                        <td>{new Date(doc.created_at).toLocaleDateString('id-ID')}</td>
                        <td><button className="doc-delete-btn" onClick={() => handleDelete(doc)}><Trash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
