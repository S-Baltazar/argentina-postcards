import React, { useState, useEffect, useRef } from 'react';
import {
  Feather, Send, Mail, Users, UserPlus, Copy, Check, LogOut,
  Stamp as StampIcon, Inbox, SendHorizonal, X, Trash2, ZoomIn, AlertTriangle
} from 'lucide-react';
import paperVintage from './assets/paper_vintage.jpg';
import { PRESET_STAMPS, TOTAL_ARGENTINE_STAMPS } from './stampsData';
import { StampBadge, StampZoomModal } from './StampVisual';
import StampPickerModal from './StampPickerModal';

function WaxSeal({ size = 'md', animatePress = false }) {
  const dims = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';
  return (
    <div
      className={`${dims} rounded-full relative flex items-center justify-center select-none transition-all duration-500 ${animatePress ? 'scale-110' : ''}`}
      style={{
        background: 'radial-gradient(circle at 35% 30%, #c42828 0%, #8e1616 55%, #540909 100%)',
        boxShadow: '0 8px 18px rgba(0,0,0,0.45), inset 0 2px 5px rgba(255,190,190,0.35), inset 0 -4px 8px rgba(40,0,0,0.6)'
      }}
    >
      <div className="w-[74%] h-[74%] rounded-full border-2 border-[#d45d5d]/60 flex items-center justify-center shadow-inner">
        <Feather size={size === 'lg' ? 26 : 18} className="text-[#f5d5a7] drop-shadow" />
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('pv_token') || '');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '', city: 'Buenos Aires' });
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState('compose'); // compose | inbox | sent | delete-sent
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friendQuery, setFriendQuery] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [recipientId, setRecipientId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [stamp, setStamp] = useState({ type: 'preset', id: PRESET_STAMPS[0]?.id });
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [zoomStamp, setZoomStamp] = useState(null);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Fases: open -> sliding (entra carta) -> folding (cierra solapa) -> sealing (lacre) -> flipping (gira al frente) -> flying (vuela)
  const [sendStage, setSendStage] = useState('open');
  const [letterTucked, setLetterTucked] = useState(false);
  const [toast, setToast] = useState('');
  const [letters, setLetters] = useState({ inbox: [], sent: [] });
  const [readingLetter, setReadingLetter] = useState(null);
  // Fases apertura: front -> unflipping -> unsealing -> unfolding -> slidingOut -> opened
  const [openStage, setOpenStage] = useState('opened');
  const openTimersRef = useRef([]);

  const clearOpenTimers = () => {
    openTimersRef.current.forEach(clearTimeout);
    openTimersRef.current = [];
  };

  const closeReadingModal = () => {
    clearOpenTimers();
    setReadingLetter(null);
    setOpenStage('opened');
  };

  const handleOpenEnvelope = (item) => {
    clearOpenTimers();
    setReadingLetter(item);
    setOpenStage('front');

    if (item.recipientId === user?.id && !item.opened) {
      apiFetch(`/api/letters/${item.id}/open`, { method: 'PATCH' })
        .then(() => {
          setLetters(prev => ({
            ...prev,
            inbox: prev.inbox.map(l => (l.id === item.id ? { ...l, opened: true } : l))
          }));
        })
        .catch(() => { });
    }

    openTimersRef.current = [
      setTimeout(() => setOpenStage('unflipping'), 80),
      setTimeout(() => setOpenStage('unsealing'), 800),
      setTimeout(() => setOpenStage('unfolding'), 1300),
      setTimeout(() => setOpenStage('slidingOut'), 2000),
      setTimeout(() => setOpenStage('opened'), 2750)
    ];
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const apiFetch = async (url, options = {}) => {
    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {})
        }
      });
    } catch {
      throw new Error('No se pudo conectar con el servidor Node.js. Verifica que esté corriendo en la carpeta server.');
    }
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (res.status >= 500 || !text) {
        throw new Error(`El servidor Node.js (puerto 4000) no respondió (HTTP ${res.status}). Reinicia "npm start" en la carpeta server.`);
      }
      throw new Error(`Respuesta inesperada (HTTP ${res.status}): ${text.slice(0, 80)}`);
    }
    if (!res.ok) throw new Error(data.error || (res.status >= 500 ? 'El servidor Node.js no está encendido en el puerto 4000. Ejecuta "npm start" en la carpeta server.' : 'Error en la solicitud'));
    return data;
  };

  const refreshFriendsData = async () => {
    const [fr, reqs, lt] = await Promise.all([
      apiFetch('/api/friends'),
      apiFetch('/api/friends/requests'),
      apiFetch('/api/letters')
    ]);
    const validFriends = fr.filter(f => f.id !== user?.id);
    setFriends(validFriends);
    setFriendRequests(reqs);
    setRecipientId(prev => (validFriends.some(f => f.id === prev) ? prev : (validFriends[0]?.id || '')));
    setLetters(lt);
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch('/api/me'),
      apiFetch('/api/friends'),
      apiFetch('/api/friends/requests'),
      apiFetch('/api/letters')
    ])
      .then(([me, fr, reqs, lt]) => {
        const validFriends = fr.filter(f => f.id !== me.id);
        setUser(me);
        setFriends(validFriends);
        setFriendRequests(reqs);
        setRecipientId(prev => (validFriends.some(f => f.id === prev) ? prev : (validFriends[0]?.id || '')));
        setLetters(lt);
      })
      .catch(() => {
        localStorage.removeItem('pv_token');
        setToken('');
        setUser(null);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !user?.id) return;
    const sync = () => {
      refreshFriendsData().catch(() => {});
    };
    const intervalId = setInterval(sync, 6000);
    window.addEventListener('focus', sync);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', sync);
    };
  }, [token, user?.id]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });
      localStorage.setItem('pv_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pv_token');
    setToken('');
    setUser(null);
    setFriends([]);
    setFriendRequests({ incoming: [], outgoing: [] });
    setRecipientId('');
    setLetters({ inbox: [], sent: [] });
    setTitle('');
    setBody('');
    setReadingLetter(null);
    setTab('compose');
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setFriendMsg('');
    const q = friendQuery.trim().toLowerCase();
    if (user && (q === user.username.toLowerCase() || q === user.friendCode.toLowerCase())) {
      setFriendMsg('No puedes agregarte a ti mismo.');
      return;
    }
    try {
      const res = await apiFetch('/api/friends/add', {
        method: 'POST',
        body: JSON.stringify({ query: friendQuery })
      });
      if (res.status === 'accepted' && res.friend) {
        if (!friends.find(f => f.id === res.friend.id)) {
          setFriends(prev => [...prev, res.friend]);
        }
        setFriendRequests(prev => ({
          ...prev,
          incoming: prev.incoming.filter(r => r.id !== res.friend.id)
        }));
        setRecipientId(res.friend.id);
        setFriendQuery('');
        setFriendMsg(`¡${res.friend.username} ya te había enviado solicitud! Ahora son amigos.`);
      } else if (res.request) {
        setFriendRequests(prev => ({
          ...prev,
          outgoing: [...prev.outgoing, res.request]
        }));
        setFriendQuery('');
        setFriendMsg(`Solicitud enviada a ${res.request.username}. Podrán escribirse cuando la acepte.`);
      }
    } catch (err) {
      setFriendMsg(err.message);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setFriendMsg('');
    try {
      const res = await apiFetch(`/api/friends/requests/${requestId}/accept`, { method: 'POST' });
      setFriendRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r.requestId !== requestId)
      }));
      if (res.friend && !friends.find(f => f.id === res.friend.id)) {
        setFriends(prev => [...prev, res.friend]);
        setRecipientId(prev => prev || res.friend.id);
      }
      showToast(`¡Aceptaste la solicitud de ${res.friend?.username || 'tu amigo'}!`);
      refreshFriendsData().catch(() => {});
    } catch (err) {
      setFriendMsg(err.message);
    }
  };

  const handleRejectRequest = async (requestId, username) => {
    setFriendMsg('');
    try {
      await apiFetch(`/api/friends/requests/${requestId}/reject`, { method: 'POST' });
      setFriendRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r.requestId !== requestId)
      }));
      showToast(`Solicitud de ${username} denegada.`);
    } catch (err) {
      setFriendMsg(err.message);
    }
  };

  const handleRemoveFriend = async (friendId, username) => {
    setFriendMsg('');
    try {
      await apiFetch(`/api/friends/${friendId}`, { method: 'DELETE' });
      const remaining = friends.filter(f => f.id !== friendId);
      setFriends(remaining);
      if (recipientId === friendId) {
        setRecipientId(remaining[0]?.id || '');
      }
      showToast(`Eliminaste a ${username} de tus amigos.`);
      refreshFriendsData().catch(() => {});
    } catch (err) {
      setFriendMsg(err.message);
    }
  };

  const handleSendLetter = () => {
    if (!recipientId) {
      showToast('Agrega o selecciona un amigo destinatario primero.');
      setShowFriendsModal(true);
      return;
    }
    if (recipientId === user?.id) {
      showToast('No puedes enviarte una carta a ti mismo. Elige otro destinatario.');
      return;
    }
    if (!body.trim()) {
      showToast('Escribe tu carta antes de cerrar el sobre.');
      return;
    }

    setLetterTucked(false);
    setSendStage('sliding');
    // Un frame después inicia la transición suave de la carta entrando al bolsillo
    setTimeout(() => setLetterTucked(true), 60);

    // 2. La solapa superior pivota desde el borde superior y cierra el sobre
    setTimeout(() => setSendStage('folding'), 820);

    // 3. El lacre rojo se estampa en la punta de la solapa cerrada
    setTimeout(() => setSendStage('sealing'), 1550);

    // 4. El sobre sellado gira 180° en 3D para mostrar el frente con estampilla y destinatario
    setTimeout(() => setSendStage('flipping'), 2250);

    // 5. El sobre despega y vuela
    setTimeout(async () => {
      setSendStage('flying');
      try {
        await apiFetch('/api/letters', {
          method: 'POST',
          body: JSON.stringify({ recipientId, title, body, stamp })
        });
        const updated = await apiFetch('/api/letters');
        setLetters(updated);
        setTimeout(() => {
          setSendStage('open');
          setLetterTucked(false);
          setTitle('');
          setBody('');
          showToast('¡Carta sellada con lacre rojo y enviada con éxito!');
        }, 950);
      } catch (err) {
        setSendStage('open');
        setLetterTucked(false);
        showToast(err.message);
      }
    }, 3050);
  };

  const handleDeleteSentLetter = async (e, letterId) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/api/letters/${letterId}`, { method: 'DELETE' });
      setLetters(prev => ({
        inbox: prev.inbox.filter(l => l.id !== letterId),
        sent: prev.sent.filter(l => l.id !== letterId)
      }));
      if (readingLetter?.id === letterId) setReadingLetter(null);
      showToast('Carta eliminada para ambas partes.');
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteAllSent = async () => {
    try {
      const res = await apiFetch('/api/letters/sent/all', { method: 'DELETE' });
      setLetters(prev => ({
        inbox: prev.inbox.filter(l => l.senderId !== user.id),
        sent: []
      }));
      setConfirmDeleteAll(false);
      showToast(`Se eliminaron ${res.deletedCount} carta(s) para ambas partes.`);
    } catch (err) {
      showToast(err.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(circle at top, #3b281e 0%, #1d1410 100%)' }}>
        <div
          className="w-full max-w-md rounded-sm shadow-2xl p-8 border-4 border-[#5c4028]/50 relative"
          style={{ backgroundImage: `url(${paperVintage})`, backgroundSize: 'cover' }}
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#8e1616] border-2 border-[#c24141] shadow-inner flex items-center justify-center text-[#f7e7c4]">
              <Feather size={26} />
            </div>
            <h1 className="font-serif-vintage text-3xl text-[#2c1e16] font-bold">Correo Vintage</h1>
            <p className="font-typewriter text-xs text-[#5c4028] mt-1">Postales y cartas epistolares argentinas</p>
          </div>

          <div className="flex border-b border-[#5c4028]/30 mb-5 font-typewriter text-sm">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 ${authMode === 'login' ? 'border-b-2 border-[#8e1616] font-bold text-[#8e1616]' : 'text-[#5c4028]'}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 ${authMode === 'register' ? 'border-b-2 border-[#8e1616] font-bold text-[#8e1616]' : 'text-[#5c4028]'}`}
            >
              Crear Usuario
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4 font-typewriter">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5c4028] mb-1">Usuario</label>
              <input
                type="text"
                required
                value={authForm.username}
                onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                placeholder="ej. balta_postal"
                className="w-full px-3 py-2 bg-[#faf3e3]/85 border border-[#8c6b48] rounded-sm focus:outline-none focus:border-[#8e1616]"
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#5c4028] mb-1">Ciudad (para el matasellos)</label>
                <input
                  type="text"
                  value={authForm.city}
                  onChange={e => setAuthForm({ ...authForm, city: e.target.value })}
                  placeholder="Buenos Aires"
                  className="w-full px-3 py-2 bg-[#faf3e3]/85 border border-[#8c6b48] rounded-sm focus:outline-none focus:border-[#8e1616]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#5c4028] mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-[#faf3e3]/85 border border-[#8c6b48] rounded-sm focus:outline-none focus:border-[#8e1616]"
              />
            </div>

            {authError && (
              <p className="text-xs text-[#8e1616] bg-[#8e1616]/10 p-2 rounded-sm border border-[#8e1616]/30">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#8e1616] hover:bg-[#751010] text-[#fdf6e7] font-bold tracking-wide rounded-sm shadow-md transition"
            >
              {authMode === 'register' ? 'Registrarme y Entrar' : 'Entrar al Escritorio'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const selectedFriend = friends.find(f => f.id === recipientId);
  const isAnimating = sendStage !== 'open';
  const flapClosed = sendStage === 'folding' || sendStage === 'sealing' || sendStage === 'flipping' || sendStage === 'flying';
  const showSeal = sendStage === 'sealing' || sendStage === 'flipping' || sendStage === 'flying';
  const showFront = sendStage === 'flipping' || sendStage === 'flying';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(circle at top, #3b281e 0%, #1a120e 100%)' }}>
      <header className="border-b border-[#5c4028]/40 bg-[#18100c]/80 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-[#f3e5c8]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#8e1616] flex items-center justify-center shadow">
            <Feather size={18} />
          </div>
          <div>
            <h1 className="font-serif-vintage text-lg font-bold leading-none">Correo Vintage</h1>
            <span className="font-typewriter text-[11px] text-[#cbb692]">{user.username} • {user.city}</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2 font-typewriter text-xs">
          <button
            onClick={() => setTab('compose')}
            className={`px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition ${tab === 'compose' ? 'bg-[#8e1616] text-white' : 'bg-[#2e2018] hover:bg-[#3f2c21] text-[#e4d3b3]'}`}
          >
            <Feather size={14} /> Escribir
          </button>
          <button
            onClick={() => setTab('inbox')}
            className={`px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition ${tab === 'inbox' ? 'bg-[#8e1616] text-white' : 'bg-[#2e2018] hover:bg-[#3f2c21] text-[#e4d3b3]'}`}
          >
            <Inbox size={14} /> Recibidas ({letters.inbox.length})
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition ${tab === 'sent' ? 'bg-[#8e1616] text-white' : 'bg-[#2e2018] hover:bg-[#3f2c21] text-[#e4d3b3]'}`}
          >
            <SendHorizonal size={14} /> Enviadas ({letters.sent.length})
          </button>
          <button
            onClick={() => { setTab('delete-sent'); setConfirmDeleteAll(false); }}
            className={`px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition ${tab === 'delete-sent' ? 'bg-[#8e1616] text-white' : 'bg-[#2e2018] hover:bg-[#3f2c21] text-[#e4d3b3]'}`}
          >
            <Trash2 size={14} /> Eliminar Enviadas
          </button>
          <button
            onClick={() => {
              setShowFriendsModal(true);
              refreshFriendsData().catch(() => {});
            }}
            className="px-3 py-1.5 rounded-sm bg-[#3a2a1e] hover:bg-[#4e3829] text-[#f3e5c8] flex items-center gap-1.5 relative"
          >
            <Users size={14} /> Amigos ({friends.length})
            {friendRequests.incoming.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#d97706] text-black leading-none">
                +{friendRequests.incoming.length}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-sm bg-[#2a1d17] hover:bg-[#452c22] text-[#cbb692]"
          >
            <LogOut size={15} />
          </button>
        </nav>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#2b1e16] border border-[#c8a97e] text-[#f9eed7] px-4 py-2.5 rounded-sm shadow-2xl font-typewriter text-xs">
          {toast}
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        {tab === 'compose' && (
          <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
            <div className="w-full max-w-2xl">
              {!isAnimating ? (
                /* MODO ESCRITURA: Hoja abierta cómoda + pie de sobre postal */
                <div className="relative">
                  <div
                    className="relative z-10 mx-auto w-[96%] rounded-t-sm shadow-2xl p-6 md:p-8 border border-[#b5986d]"
                    style={{
                      backgroundImage: `url(${paperVintage})`,
                      backgroundSize: 'cover',
                      minHeight: '390px'
                    }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#7a5c3c]/35 pb-4 mb-5">
                      <div className="space-y-2 flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 font-typewriter text-xs text-[#5c4028]">
                          <span>PARA:</span>
                          <select
                            value={recipientId}
                            onChange={e => setRecipientId(e.target.value)}
                            className="bg-[#faf2e1]/80 border border-[#8c6b48] px-2 py-1 rounded-sm text-[#2c1e16] font-bold focus:outline-none"
                          >
                            {friends.length === 0 && <option value="">Sin amigos aún...</option>}
                            {friends.map(f => (
                              <option key={f.id} value={f.id}>{f.username} ({f.city})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowFriendsModal(true)}
                            className="text-[#8e1616] underline hover:no-underline text-xs"
                          >
                            + Invitar
                          </button>
                        </div>
                        <input
                          type="text"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Asunto de la carta..."
                          className="w-full bg-transparent font-typewriter text-lg font-bold text-[#2c1e16] placeholder-[#7a5c3c]/60 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <StampBadge stamp={stamp} onZoom={setZoomStamp} />
                        </div>
                        <div className="flex items-center gap-2 font-typewriter text-[10px]">
                          <button
                            type="button"
                            onClick={() => setZoomStamp(stamp)}
                            className="text-[#5c4028] hover:text-[#2c1e16] flex items-center gap-0.5 underline"
                            title="Ampliar estampilla"
                          >
                            <ZoomIn size={11} /> Zoom
                          </button>
                          <span className="text-[#8c6b48]">•</span>
                          <button
                            type="button"
                            onClick={() => setShowStampPicker(true)}
                            className="text-[#8e1616] font-bold underline flex items-center gap-1"
                          >
                            <StampIcon size={11} /> Cambiar ({TOTAL_ARGENTINE_STAMPS})
                          </button>
                        </div>
                      </div>
                    </div>

                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      placeholder="Querido amigo, te escribo estas líneas desde..."
                      rows={9}
                      className="w-full bg-transparent font-typewriter text-[15px] leading-7 text-[#241811] placeholder-[#7a5c3c]/55 resize-none focus:outline-none"
                    />

                    <div className="mt-4 pt-3 border-t border-[#7a5c3c]/25 flex items-center justify-between text-xs font-typewriter text-[#5c4028]">
                      <span>DE: {user.username} ({user.city})</span>
                      <span>{new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Base del sobre esperando recibir la carta */}
                  <div
                    className="relative z-20 -mt-2 mx-auto w-full rounded-b-sm shadow-2xl px-6 py-5 flex flex-wrap items-center justify-between gap-4 border-t-2 border-[#a98555]"
                    style={{ background: 'linear-gradient(180deg, #d7bd92 0%, #bd9c69 100%)' }}
                  >
                    <div className="font-typewriter text-xs text-[#4b3421]">
                      <span className="uppercase tracking-widest font-bold block text-sm">Sobre Postal Vintage</span>
                      <span className="text-[11px] text-[#5c4028]">
                        {selectedFriend ? `Listo para enviar a ${selectedFriend.username}` : 'Elige un amigo destinatario'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendLetter}
                      className="px-6 py-2.5 bg-[#8e1616] hover:bg-[#721010] text-[#fdf6e7] font-typewriter text-sm font-bold rounded-sm shadow-xl flex items-center gap-2 transition hover:scale-105 active:scale-95"
                    >
                      <Send size={15} /> Cerrar sobre y enviar
                    </button>
                  </div>
                </div>
              ) : (
                /* ESCENA 3D DE CIERRE DEL SOBRE (sliding -> folding -> sealing -> flipping -> flying) */
                <div className={`w-full max-w-[580px] mx-auto pt-44 pb-8 ${sendStage === 'flying' ? 'animate-fly-away' : ''}`}>
                  <div className="relative h-[340px] w-full" style={{ perspective: '1400px' }}>
                    <div
                      className="relative w-full h-full transition-transform duration-700 ease-in-out"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: showFront ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* CARA TRASERA DEL SOBRE (donde entra la carta, cierra la solapa y se sella con lacre) */}
                      <div
                        className="absolute inset-0 rounded-sm shadow-2xl border border-[#8e6b3f]"
                        style={{
                          backfaceVisibility: 'hidden',
                          background: 'linear-gradient(135deg, #b89460 0%, #9f7c4a 100%)'
                        }}
                      >
                        {/* Fondo interior del sobre */}
                        <div
                          className="absolute inset-0 opacity-35 pointer-events-none"
                          style={{
                            backgroundImage: `url(${paperVintage})`,
                            backgroundSize: 'cover',
                            filter: 'sepia(0.5) brightness(0.8)'
                          }}
                        />

                        {/* Carta entrando suavemente dentro del bolsillo (recortada abajo para que no sobresalga) */}
                        <div className="absolute inset-x-0 bottom-0 top-[-210px] overflow-hidden pointer-events-none z-10">
                          <div
                            className="mx-auto w-[88%] h-[280px] rounded-sm shadow-lg p-5 border border-[#b5986d] transition-all duration-700 ease-in-out"
                            style={{
                              backgroundImage: `url(${paperVintage})`,
                              backgroundSize: 'cover',
                              transform: letterTucked
                                ? 'translateY(240px) scale(0.92)'
                                : 'translateY(30px) scale(0.96)'
                            }}
                          >
                            <div className="font-typewriter text-xs text-[#5c4028] border-b border-[#7a5c3c]/30 pb-2 mb-2 flex justify-between">
                              <span className="font-bold truncate">{title || 'Carta Postal'}</span>
                              <span>Para: {selectedFriend?.username}</span>
                            </div>
                            <p className="font-typewriter text-xs text-[#3b291a] line-clamp-5 leading-5">
                              {body}
                            </p>
                          </div>
                        </div>

                        {/* Bolsillo en V del sobre (izquierda, derecha, abajo) */}
                        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-sm">
                          <div
                            className="absolute inset-0"
                            style={{
                              clipPath: 'polygon(0 0, 52% 52%, 0 100%)',
                              background: 'linear-gradient(90deg, #c6a471 0%, #d9be94 100%)'
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              clipPath: 'polygon(100% 0, 48% 52%, 100% 100%)',
                              background: 'linear-gradient(-90deg, #c6a471 0%, #d9be94 100%)'
                            }}
                          />
                          <div
                            className="absolute inset-0"
                            style={{
                              clipPath: 'polygon(0 100%, 50% 45%, 100% 100%)',
                              background: 'linear-gradient(0deg, #be9b66 0%, #dfc69d 100%)',
                              filter: 'drop-shadow(0 -3px 5px rgba(0,0,0,0.22))'
                            }}
                          />
                        </div>

                        {/* Solapa superior: anclada EXACTAMENTE al borde superior (top: 0) */}
                        <div
                          className="absolute left-0 top-0 w-full h-[185px] transition-transform duration-700 ease-in-out pointer-events-none"
                          style={{
                            transformOrigin: 'top center',
                            transform: flapClosed ? 'rotateX(0deg)' : 'rotateX(176deg)',
                            zIndex: flapClosed ? 30 : 5,
                            clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                            background: flapClosed
                              ? 'linear-gradient(180deg, #e2caa2 0%, #cbb082 100%)'
                              : 'linear-gradient(180deg, #c7a572 0%, #b08d58 100%)',
                            filter: flapClosed ? 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))' : 'none'
                          }}
                        />

                        {/* Sello de cera estampado justo en la punta de la solapa cerrada */}
                        {showSeal && (
                          <div
                            className="absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2 z-40 animate-stamp-press"
                            style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))' }}
                          >
                            <WaxSeal size="lg" animatePress />
                          </div>
                        )}
                      </div>

                      {/* CARA FRONTAL DEL SOBRE (estampilla real, matasellos y destinatario) */}
                      <div
                        className="absolute inset-0 rounded-sm shadow-2xl border border-[#8e6b3f] p-6 md:p-8 flex flex-col justify-between overflow-hidden"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          background: 'linear-gradient(135deg, #e6d1ab 0%, #ceb284 100%)'
                        }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="font-typewriter text-xs text-[#5c4028]">
                            <span className="uppercase tracking-widest font-bold block text-[10px] opacity-75">Remitente</span>
                            <span className="font-bold">{user.username}</span>
                            <span className="block text-[11px]">{user.city}</span>
                          </div>

                          <div className="relative flex items-center justify-center">
                            <StampBadge stamp={stamp} size="sm" />
                            <div className="absolute -left-6 -bottom-2 pointer-events-none w-16 h-16 border-2 border-black/45 rounded-full flex items-center justify-center -rotate-12">
                              <div className="text-[7px] font-mono tracking-wider text-black/75 font-bold uppercase text-center leading-tight">
                                CORREOS<br />{user?.city?.slice(0, 8) || 'ARG'}<br />{new Date().getFullYear()}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="my-auto pl-4 md:pl-10 border-l-2 border-[#8c6b48]/40">
                          <span className="font-typewriter text-[10px] uppercase tracking-widest text-[#6e5034] block mb-1">
                            Destinatario
                          </span>
                          <div className="font-serif-vintage italic text-2xl md:text-3xl font-bold text-[#2b1d12]">
                            {selectedFriend?.username || 'Querido Amigo'}
                          </div>
                          <div className="font-typewriter text-xs text-[#4b3421] mt-1">
                            {selectedFriend?.city || 'Buenos Aires'} • República Argentina
                          </div>
                        </div>

                        <div className="flex justify-between items-center font-typewriter text-[10px] uppercase tracking-widest text-[#6e5034] border-t border-[#8c6b48]/30 pt-2">
                          <span>Correo Postal Certificado</span>
                          <span>Sellado con lacre rojo</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Estado actual de la animación */}
                  <p className="text-center font-typewriter text-xs text-[#f5d08a] mt-5">
                    {sendStage === 'sliding' && 'Guardando la carta dentro del sobre...'}
                    {sendStage === 'folding' && 'Cerrando la solapa del sobre...'}
                    {sendStage === 'sealing' && 'Estampando el sello de lacre rojo...'}
                    {sendStage === 'flipping' && 'Preparando frente con estampilla y matasellos...'}
                    {sendStage === 'flying' && '¡Carta en camino!'}
                  </p>
                </div>
              )}
            </div>

            {/* Escritorio lateral con sello de lacre */}
            <div className="flex flex-col items-center gap-3 bg-[#241812]/80 border border-[#6e5034]/40 rounded-sm p-5 shadow-xl lg:mt-24">
              <div className={`transition-all duration-500 ${showSeal ? 'opacity-25 scale-75' : 'opacity-100 scale-100'}`}>
                <WaxSeal size="lg" />
              </div>
              <div className="text-center font-typewriter">
                <span className="block text-xs font-bold text-[#f3e5c8]">Sello de Lacre</span>
                <span className="block text-[11px] text-[#cbb692] max-w-[140px] mt-0.5">
                  {sendStage === 'open' && 'Listo para sellar el sobre al enviar'}
                  {sendStage === 'sliding' && 'Guardando carta...'}
                  {sendStage === 'folding' && 'Cerrando solapa...'}
                  {(sendStage === 'sealing' || sendStage === 'flipping' || sendStage === 'flying') && 'Lacre fundido y sellado'}
                </span>
              </div>
            </div>
          </div>
        )}

        <StampPickerModal
          isOpen={showStampPicker}
          onClose={() => setShowStampPicker(false)}
          currentStamp={stamp}
          onSelectStamp={(newStamp) => setStamp(newStamp)}
          userCity={user?.city || 'Buenos Aires'}
        />

        {(tab === 'inbox' || tab === 'sent') && (
          <div className="w-full max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="font-serif-vintage text-2xl text-[#f3e5c8]">
                {tab === 'inbox' ? 'Buzón de Cartas Recibidas' : 'Cartas Enviadas'}
              </h2>
              {tab === 'sent' && letters.sent.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setTab('delete-sent'); setConfirmDeleteAll(false); }}
                  className="px-3 py-1.5 bg-[#8e1616] hover:bg-[#700f0f] text-white font-typewriter text-xs rounded-sm flex items-center gap-1.5 shadow"
                >
                  <Trash2 size={13} /> Administrar / Eliminar enviadas
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(tab === 'inbox' ? letters.inbox : letters.sent).map(item => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEnvelope(item)}
                  className="cursor-pointer rounded-sm p-5 shadow-2xl border border-[#8e6b3f] relative overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between min-h-[210px]"
                  style={{ background: 'linear-gradient(135deg, #e6d1ab 0%, #ceb284 100%)' }}
                >
                  {/* Líneas sutiles de pliegue del sobre cerrado */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-25"
                    style={{
                      background: 'linear-gradient(to bottom right, transparent 49.5%, #8c6b48 50%, transparent 50.5%)'
                    }}
                  />

                  {/* Cabecera del sobre: Remitente y Estampilla con Matasellos */}
                  <div className="relative z-10 flex justify-between items-start gap-3">
                    <div className="font-typewriter text-xs text-[#5c4028] min-w-0">
                      <span className="text-[10px] uppercase tracking-widest opacity-75 block">
                        {tab === 'inbox' ? 'Remitente' : 'Enviada por ti'}
                      </span>
                      <span className="font-bold text-[#2c1e16] block truncate">
                        {item.senderName}
                      </span>
                      <span className="text-[11px] block">{item.senderCity}</span>
                    </div>

                    <div className="relative flex items-center justify-center shrink-0">
                      <StampBadge stamp={item.stamp} size="sm" onZoom={setZoomStamp} />
                      <div className="absolute -left-5 -bottom-1.5 pointer-events-none w-12 h-12 border border-black/40 rounded-full flex items-center justify-center -rotate-12">
                        <div className="text-[5.5px] font-mono tracking-wider text-black/70 font-bold uppercase text-center leading-tight">
                          CORREOS<br />{item.senderCity?.slice(0, 6) || 'ARG'}<br />{new Date(item.sentAt).getFullYear()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Centro: Destinatario manuscrito + indicación de sobre sellado */}
                  <div className="relative z-10 my-4 pl-3 border-l-2 border-[#8c6b48]/45">
                    <span className="font-typewriter text-[10px] uppercase tracking-widest text-[#6e5034] block">
                      Destinatario
                    </span>
                    <div className="font-serif-vintage italic text-xl font-bold text-[#2b1d12] truncate">
                      {item.recipientName}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-typewriter text-[#7a1616] font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8e1616] inline-block shadow-sm" />
                      {tab === 'inbox' && !item.opened ? 'Sobre sellado • Nuevo' : 'Sobre sellado con lacre'}
                    </div>
                  </div>

                  {/* Pie del sobre: Fecha y Botón Abrir Sobre */}
                  <div className="relative z-10 pt-2.5 border-t border-[#8c6b48]/30 flex items-center justify-between gap-2 text-[11px] font-typewriter text-[#5c4028]">
                    <span>{new Date(item.sentAt).toLocaleDateString('es-AR')}</span>
                    <div className="flex items-center gap-2">
                      {tab === 'sent' && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSentLetter(e, item.id)}
                          className="px-2 py-1 text-[#8e1616] hover:bg-[#8e1616]/10 rounded-sm font-bold flex items-center gap-1"
                          title="Borrar carta para ambos"
                        >
                          <Trash2 size={12} /> Borrar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEnvelope(item);
                        }}
                        className="px-3 py-1.5 bg-[#8e1616] hover:bg-[#700f0f] text-[#fdf6e7] font-bold rounded-sm shadow flex items-center gap-1.5 transition"
                      >
                        <Mail size={12} /> Abrir sobre
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(tab === 'inbox' ? letters.inbox : letters.sent).length === 0 && (
                <p className="font-typewriter text-sm text-[#cbb692] col-span-2">
                  Todavía no hay cartas aquí.
                </p>
              )}
            </div>
          </div>
        )}

        {/* APARTADO DEDICADO PARA ELIMINAR CARTAS MANDADAS (para ambas partes) */}
        {tab === 'delete-sent' && (
          <div className="w-full max-w-3xl bg-[#241812]/90 border border-[#8c6b48]/60 rounded-sm p-6 text-[#f3e5c8] shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#5c4028]/50 pb-4 mb-5">
              <div>
                <h2 className="font-serif-vintage text-2xl font-bold flex items-center gap-2">
                  <Trash2 size={22} className="text-[#e05252]" /> Eliminar Cartas Enviadas
                </h2>
                <p className="font-typewriter text-xs text-[#cbb692] mt-1">
                  Las cartas que elimines en este apartado se borrarán permanentemente de tu historial y también del buzón del destinatario.
                </p>
              </div>

              {letters.sent.length > 0 && (
                <div>
                  {!confirmDeleteAll ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAll(true)}
                      className="px-4 py-2 bg-[#8e1616] hover:bg-[#700f0f] text-white font-typewriter text-xs font-bold rounded-sm flex items-center gap-1.5 shadow"
                    >
                      <Trash2 size={14} /> Eliminar todas ({letters.sent.length})
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-[#3b1515] border border-[#c94a4a] px-3 py-1.5 rounded-sm font-typewriter text-xs">
                      <AlertTriangle size={14} className="text-[#f5d08a]" />
                      <span>¿Borrar todas para ambos?</span>
                      <button
                        type="button"
                        onClick={handleDeleteAllSent}
                        className="px-2.5 py-1 bg-[#b91c1c] hover:bg-[#991b1b] text-white font-bold rounded-sm"
                      >
                        Sí, borrar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAll(false)}
                        className="px-2 py-1 bg-[#2e2018] text-[#cbb692] rounded-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {letters.sent.length === 0 ? (
              <div className="py-12 text-center font-typewriter text-sm text-[#cbb692]">
                No tienes cartas enviadas para eliminar.
              </div>
            ) : (
              <div className="space-y-3">
                {letters.sent.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 bg-[#1a110c] border border-[#5c4028]/50 rounded-sm p-4"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <StampBadge stamp={item.stamp} size="sm" onZoom={setZoomStamp} />
                      <div className="font-typewriter min-w-0">
                        <div className="text-[11px] text-[#f5d08a] uppercase">
                          Para: {item.recipientName} • {new Date(item.sentAt).toLocaleDateString('es-AR')}
                        </div>
                        <h3 className="text-sm font-bold text-[#f3e5c8] truncate">{item.title}</h3>
                        <p className="text-xs text-[#cbb692] line-clamp-1 mt-0.5">{item.body}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-typewriter text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenEnvelope(item)}
                        className="px-3 py-1.5 bg-[#38271e] hover:bg-[#4e3829] text-[#f3e5c8] rounded-sm"
                      >
                        Abrir sobre
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSentLetter(e, item.id)}
                        className="px-3 py-1.5 bg-[#8e1616] hover:bg-[#700f0f] text-white font-bold rounded-sm flex items-center gap-1.5 shadow"
                      >
                        <Trash2 size={13} /> Eliminar para ambos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {readingLetter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeReadingModal}>
          {openStage !== 'opened' ? (
            /* ANIMACIÓN 3D DE APERTURA DEL SOBRE (front -> unflipping -> unsealing -> unfolding -> slidingOut) */
            <div className="w-full max-w-[580px] mx-auto pt-36 pb-6" onClick={e => e.stopPropagation()}>
              <div className="relative h-[340px] w-full" style={{ perspective: '1400px' }}>
                <div
                  className="relative w-full h-full transition-transform duration-700 ease-in-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: openStage === 'front' ? 'rotateY(180deg)' : 'rotateY(0deg)'
                  }}
                >
                  {/* CARA TRASERA DEL SOBRE (sello de lacre se rompe, solapa abre, carta sale) */}
                  <div
                    className="absolute inset-0 rounded-sm shadow-2xl border border-[#8e6b3f]"
                    style={{
                      backfaceVisibility: 'hidden',
                      background: 'linear-gradient(135deg, #b89460 0%, #9f7c4a 100%)'
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-35 pointer-events-none"
                      style={{
                        backgroundImage: `url(${paperVintage})`,
                        backgroundSize: 'cover',
                        filter: 'sepia(0.5) brightness(0.8)'
                      }}
                    />

                    {/* Hoja de la carta saliendo hacia arriba desde el bolsillo */}
                    <div className="absolute inset-x-0 bottom-0 top-[-210px] overflow-hidden pointer-events-none z-10">
                      <div
                        className="mx-auto w-[88%] h-[280px] rounded-sm shadow-lg p-5 border border-[#b5986d] transition-all duration-700 ease-out"
                        style={{
                          backgroundImage: `url(${paperVintage})`,
                          backgroundSize: 'cover',
                          transform: openStage === 'slidingOut'
                            ? 'translateY(12px) scale(0.98)'
                            : 'translateY(240px) scale(0.92)'
                        }}
                      >
                        <div className="font-typewriter text-xs text-[#5c4028] border-b border-[#7a5c3c]/30 pb-2 mb-2 flex justify-between">
                          <span className="font-bold truncate">{readingLetter.title}</span>
                          <span>De: {readingLetter.senderName}</span>
                        </div>
                        <p className="font-typewriter text-xs text-[#3b291a] line-clamp-5 leading-5">
                          {readingLetter.body}
                        </p>
                      </div>
                    </div>

                    {/* Bolsillo en V del sobre */}
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-sm">
                      <div
                        className="absolute inset-0"
                        style={{
                          clipPath: 'polygon(0 0, 52% 52%, 0 100%)',
                          background: 'linear-gradient(90deg, #c6a471 0%, #d9be94 100%)'
                        }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          clipPath: 'polygon(100% 0, 48% 52%, 100% 100%)',
                          background: 'linear-gradient(-90deg, #c6a471 0%, #d9be94 100%)'
                        }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          clipPath: 'polygon(0 100%, 50% 45%, 100% 100%)',
                          background: 'linear-gradient(0deg, #be9b66 0%, #dfc69d 100%)',
                          filter: 'drop-shadow(0 -3px 5px rgba(0,0,0,0.22))'
                        }}
                      />
                    </div>

                    {/* Solapa superior abriéndose */}
                    <div
                      className="absolute left-0 top-0 w-full h-[185px] transition-transform duration-700 ease-in-out pointer-events-none"
                      style={{
                        transformOrigin: 'top center',
                        transform: (openStage === 'unfolding' || openStage === 'slidingOut')
                          ? 'rotateX(176deg)'
                          : 'rotateX(0deg)',
                        zIndex: (openStage === 'unfolding' || openStage === 'slidingOut') ? 5 : 30,
                        clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                        background: (openStage === 'unfolding' || openStage === 'slidingOut')
                          ? 'linear-gradient(180deg, #c7a572 0%, #b08d58 100%)'
                          : 'linear-gradient(180deg, #e2caa2 0%, #cbb082 100%)',
                        filter: (openStage === 'unfolding' || openStage === 'slidingOut')
                          ? 'none'
                          : 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))'
                      }}
                    />

                    {/* Sello de lacre rojo desprendiéndose */}
                    <div
                      className={`absolute left-1/2 top-[53%] -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-500 ${openStage === 'unsealing'
                        ? 'scale-125 opacity-0 -translate-y-10'
                        : (openStage === 'unfolding' || openStage === 'slidingOut')
                          ? 'scale-75 opacity-0 pointer-events-none'
                          : 'scale-100 opacity-100'
                        }`}
                      style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.55))' }}
                    >
                      <WaxSeal size="lg" />
                    </div>
                  </div>

                  {/* CARA FRONTAL DEL SOBRE CERRADO */}
                  <div
                    className="absolute inset-0 rounded-sm shadow-2xl border border-[#8e6b3f] p-6 md:p-8 flex flex-col justify-between overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      background: 'linear-gradient(135deg, #e6d1ab 0%, #ceb284 100%)'
                    }}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="font-typewriter text-xs text-[#5c4028]">
                        <span className="uppercase tracking-widest font-bold block text-[10px] opacity-75">Remitente</span>
                        <span className="font-bold">{readingLetter.senderName}</span>
                        <span className="block text-[11px]">{readingLetter.senderCity}</span>
                      </div>

                      <div className="relative flex items-center justify-center">
                        <StampBadge stamp={readingLetter.stamp} size="sm" />
                        <div className="absolute -left-6 -bottom-2 pointer-events-none w-16 h-16 border-2 border-black/45 rounded-full flex items-center justify-center -rotate-12">
                          <div className="text-[7px] font-mono tracking-wider text-black/75 font-bold uppercase text-center leading-tight">
                            CORREOS<br />{readingLetter.senderCity?.slice(0, 8) || 'ARG'}<br />{new Date(readingLetter.sentAt).getFullYear()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="my-auto pl-4 md:pl-10 border-l-2 border-[#8c6b48]/40">
                      <span className="font-typewriter text-[10px] uppercase tracking-widest text-[#6e5034] block mb-1">
                        Destinatario
                      </span>
                      <div className="font-serif-vintage italic text-2xl md:text-3xl font-bold text-[#2b1d12]">
                        {readingLetter.recipientName}
                      </div>
                      <div className="font-typewriter text-xs text-[#4b3421] mt-1">
                        {new Date(readingLetter.sentAt).toLocaleDateString('es-AR')}
                      </div>
                    </div>

                    <div className="flex justify-between items-center font-typewriter text-[10px] uppercase tracking-widest text-[#6e5034] border-t border-[#8c6b48]/30 pt-2">
                      <span>Correo Postal Certificado</span>
                      <span>Sellado con lacre rojo</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between font-typewriter text-xs text-[#f5d08a]">
                <span>
                  {openStage === 'front' && 'Preparando sobre...'}
                  {openStage === 'unflipping' && 'Girando el sobre hacia el lacre...'}
                  {openStage === 'unsealing' && 'Rompiendo el sello de lacre rojo...'}
                  {openStage === 'unfolding' && 'Abriendo la solapa del sobre...'}
                  {openStage === 'slidingOut' && 'Extrayendo la carta...'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearOpenTimers();
                    setOpenStage('opened');
                  }}
                  className="text-[#cbb692] hover:text-white underline"
                >
                  Leer directamente →
                </button>
              </div>
            </div>
          ) : (
            /* CARTA ABIERTA PARA LEER */
            <div
              className="w-full max-w-xl rounded-sm p-8 shadow-2xl border-2 border-[#a88a5e] relative"
              style={{ backgroundImage: `url(${paperVintage})`, backgroundSize: 'cover' }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={closeReadingModal} className="absolute top-4 right-4 text-[#5c4028] hover:text-black">
                <X size={20} />
              </button>
              <div className="flex justify-between items-start gap-4 border-b border-[#7a5c3c]/35 pb-4 mb-5 pr-6">
                <div className="font-typewriter">
                  <span className="text-xs text-[#6e5034]">
                    DE: {readingLetter.senderName} ({readingLetter.senderCity}) • PARA: {readingLetter.recipientName}
                  </span>
                  <h3 className="text-xl font-bold text-[#2c1e16] mt-1">{readingLetter.title}</h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StampBadge stamp={readingLetter.stamp} onZoom={setZoomStamp} />
                  <button
                    type="button"
                    onClick={() => setZoomStamp(readingLetter.stamp)}
                    className="text-[10px] font-typewriter text-[#5c4028] hover:text-black underline flex items-center gap-0.5"
                  >
                    <ZoomIn size={11} /> Zoom estampilla
                  </button>
                </div>
              </div>
              <p className="font-typewriter text-[15px] leading-7 text-[#241811] whitespace-pre-wrap min-h-[180px]">
                {readingLetter.body}
              </p>
              {readingLetter.senderId === user.id && (
                <div className="mt-6 pt-3 border-t border-[#7a5c3c]/30 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSentLetter(e, readingLetter.id)}
                    className="px-4 py-2 bg-[#8e1616] hover:bg-[#700f0f] text-white font-typewriter text-xs font-bold rounded-sm flex items-center gap-1.5 shadow"
                  >
                    <Trash2 size={13} /> Eliminar carta para ambas partes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <StampZoomModal stamp={zoomStamp} onClose={() => setZoomStamp(null)} />

      {showFriendsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4" onClick={() => setShowFriendsModal(false)}>
          <div className="w-full max-w-md bg-[#2a1d16] border border-[#8c6b48] rounded-sm p-6 text-[#f3e5c8] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif-vintage text-xl flex items-center gap-2"><UserPlus size={18} /> Invitar Amigos</h3>
              <button onClick={() => setShowFriendsModal(false)}><X size={18} /></button>
            </div>

            <div className="bg-[#1b120e] p-3 rounded-sm border border-[#6e5034] mb-4 font-typewriter text-xs">
              <span className="text-[#cbb692] block mb-1">Tu código de invitación para compartir:</span>
              <div className="flex items-center justify-between">
                <strong className="text-base text-[#f5d08a] tracking-wider">{user.friendCode}</strong>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(user.friendCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-[#8e1616] rounded-sm flex items-center gap-1 text-white"
                >
                  {copiedCode ? <Check size={13} /> : <Copy size={13} />} {copiedCode ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <form onSubmit={handleAddFriend} className="flex gap-2 font-typewriter text-xs mb-3">
              <input
                type="text"
                required
                value={friendQuery}
                onChange={e => setFriendQuery(e.target.value)}
                placeholder="Usuario o código POSTAL-..."
                className="flex-1 px-3 py-2 bg-[#1b120e] border border-[#6e5034] rounded-sm text-[#f3e5c8]"
              />
              <button type="submit" className="px-4 py-2 bg-[#8e1616] hover:bg-[#700f0f] text-white font-bold rounded-sm">
                Enviar solicitud
              </button>
            </form>
            {friendMsg && <p className="font-typewriter text-xs text-[#f5d08a] mb-3">{friendMsg}</p>}

            {/* Solicitudes recibidas para aceptar o denegar */}
            {friendRequests.incoming.length > 0 && (
              <div className="mb-4">
                <h4 className="font-typewriter text-[11px] uppercase tracking-wider text-[#f5d08a] font-bold mb-2">
                  Solicitudes recibidas ({friendRequests.incoming.length})
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto font-typewriter text-xs">
                  {friendRequests.incoming.map(reqItem => (
                    <div key={reqItem.requestId} className="flex items-center justify-between gap-2 bg-[#1b120e] border border-[#d97706]/50 px-3 py-2 rounded-sm">
                      <div className="min-w-0">
                        <span className="font-bold text-[#f3e5c8] block truncate">{reqItem.username}</span>
                        <span className="text-[10px] text-[#cbb692]">{reqItem.city} • {reqItem.friendCode}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(reqItem.requestId)}
                          className="px-2.5 py-1 bg-[#236338] hover:bg-[#1a4d2b] text-white font-bold rounded-sm flex items-center gap-1"
                        >
                          <Check size={12} /> Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(reqItem.requestId, reqItem.username)}
                          className="px-2.5 py-1 bg-[#8e1616] hover:bg-[#700f0f] text-white font-bold rounded-sm flex items-center gap-1"
                        >
                          <X size={12} /> Denegar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Solicitudes enviadas pendientes */}
            {friendRequests.outgoing.length > 0 && (
              <div className="mb-4">
                <h4 className="font-typewriter text-[11px] uppercase tracking-wider text-[#cbb692] mb-1.5">
                  Solicitudes enviadas pendientes ({friendRequests.outgoing.length})
                </h4>
                <div className="space-y-1.5 max-h-24 overflow-y-auto font-typewriter text-xs">
                  {friendRequests.outgoing.map(reqItem => (
                    <div key={reqItem.requestId} className="flex justify-between items-center bg-[#1b120e]/70 px-3 py-1.5 rounded-sm text-[#cbb692]">
                      <span>{reqItem.username} ({reqItem.city})</span>
                      <span className="text-[10px] text-[#f5d08a]">Pendiente</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-typewriter text-[11px] uppercase tracking-wider text-[#cbb692] mb-1.5">
                Amigos confirmados ({friends.length})
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto font-typewriter text-xs">
                {friends.map(f => (
                  <div key={f.id} className="flex justify-between items-center gap-2 bg-[#38271e] px-3 py-2 rounded-sm">
                    <div className="min-w-0">
                      <span className="block truncate font-bold text-[#f3e5c8]">{f.username} ({f.city})</span>
                      <span className="text-[10px] text-[#cbb692]">{f.friendCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(f.id, f.username)}
                      className="px-2.5 py-1 bg-[#8e1616] hover:bg-[#700f0f] text-white font-bold rounded-sm flex items-center gap-1 shrink-0"
                      title={`Eliminar a ${f.username} de tus amigos`}
                    >
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                ))}
                {friends.length === 0 && (
                  <p className="text-[#cbb692]/75 text-[11px]">Aún no tienes amigos confirmados.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
