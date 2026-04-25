import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Sidebar from '../common/Sidebar';
import { executeAgent, formFillingAgent as formAgent } from '../../services/agents/orchestrator';
import { extractFormData, generateDocument } from '../../services/agents/formFillingAgent';
import logoImg from '../../assets/logo.png';

const AGENT_LABELS = {
  document_qa: 'Pencarian Dokumen',
  form_filling: 'Pengisian Formulir',
  academic_info: 'Info Akademik',
};

const SUGGESTIONS = [
  'Apa saja syarat untuk mendaftar wisuda?',
  'Buatkan surat izin tidak masuk kuliah',
  'Bagaimana prosedur pengajuan cuti akademik?',
  'Informasi tentang beasiswa yang tersedia',
];

export default function StudentDashboard() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async (text) => {
    const query = text || input.trim();
    if (!query || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = { role: 'user', content: query, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsg = { role: 'assistant', content: '', agent: null, timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const chatHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      let fullResponse = '';

      for await (const chunk of executeAgent(query, chatHistory)) {
        if (chunk.type === 'agent_info') {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], agent: chunk.agent };
            return updated;
          });
        } else if (chunk.type === 'text') {
          fullResponse += chunk.content;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullResponse };
            return updated;
          });
        }
      }

      // Check if form is ready to generate
      const formData = extractFormData(fullResponse);
      if (formData) {
        try {
          const formType = formData.form_type || 'default';
          delete formData.form_type;
          await generateDocument(formType, formData);
          setMessages(prev => [...prev, {
            role: 'assistant', content: '✅ Dokumen berhasil dibuat dan di-download! Silakan cek folder Downloads Anda.',
            agent: 'form_filling', timestamp: Date.now()
          }]);
        } catch (err) {
          console.error('Error generating document:', err);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `⚠️ Maaf, terjadi kesalahan: ${err.message}. Pastikan API key sudah dikonfigurasi dengan benar.`
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const tabs = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={20} /> },
  ];

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
      <main className="main-content">
        <div className="chat-container">
          <div className="chat-header">
            <div className="chat-header-dot" />
            <div>
              <h3>DigiChatbot Akademik</h3>
              <span>Multi-Agent AI • Siap membantu Anda</span>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="chat-welcome-icon"><img src={logoImg} alt="Bot" /></div>
                <h2>Halo! Saya DigiChatbot 👋</h2>
                <p>Asisten akademik berbasis AI yang siap membantu Anda menjawab pertanyaan, mengisi formulir, dan banyak lagi.</p>
                <div className="chat-welcome-chips">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => handleSend(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div>
                    {msg.agent && (
                      <div className={`agent-badge ${msg.agent}`}>
                        {AGENT_LABELS[msg.agent] || msg.agent}
                      </div>
                    )}
                    <div className="message-content">
                      {msg.role === 'assistant' ? (
                        msg.content ? <ReactMarkdown>{msg.content}</ReactMarkdown> : (
                          <div className="typing-indicator">
                            <span /><span /><span />
                          </div>
                        )
                      ) : msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pertanyaan Anda..."
                rows={1}
                disabled={isStreaming}
              />
              <button className="chat-send-btn" onClick={() => handleSend()} disabled={!input.trim() || isStreaming}>
                <Send />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
