/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Sparkles, 
  Wind, 
  Leaf, 
  MessageSquare, 
  RotateCcw, 
  Send,
  Loader2,
  AlertCircle,
  Share2,
  Volume2,
  VolumeX,
  BookOpen,
  Camera,
  Music,
  Footprints,
  User
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Guides from './components/Guides';
import { auth, db, googleProvider, handleFirestoreError, testConnection } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit } from 'firebase/firestore';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Stats {
  confiance: number;
  complicite: number;
  pression: number;
  naturel: number;
}

type SouvenirCategory = 'Tout' | 'Confiance' | 'Complicité' | 'Naturel' | 'Moments Clés';

interface Souvenir {
  id: string;
  title: string;
  description: string;
  triggerHint?: string;
  icon: React.ReactNode;
  category: SouvenirCategory;
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

interface Notification {
  id: string;
  title: string;
  icon: React.ReactNode;
}

interface Scenario {
  context: string;
  camille: {
    message: string;
    emotions: string[];
    isSilent?: boolean;
  };
  choices: {
    text: string;
    impact: Partial<Stats>;
  }[];
}

const INITIAL_STATS: Stats = {
  confiance: 20,
  complicite: 10,
  pression: 5,
  naturel: 80,
};

const SOUND_MAP: Record<string, string> = {
  pensive: "https://www.soundjay.com/nature/rain-01.mp3",
  mefiante: "https://www.soundjay.com/nature/wind-01.mp3",
  amusee: "https://www.soundjay.com/misc/sounds/wind-chime-1.mp3",
  curieuse: "https://www.soundjay.com/nature/birds-singing-01.mp3",
  neutre: "https://www.soundjay.com/nature/river-1.mp3",
  revee: "https://www.soundjay.com/buttons/sounds/button-20.mp3",
};

const MUSIC_MAP: Record<string, string> = {
  neutre: "https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-magic-83.mp3",
  pensive: "https://assets.mixkit.co/music/preview/mixkit-slow-trail-deep-piano-loop-211.mp3",
  mefiante: "https://assets.mixkit.co/music/preview/mixkit-slow-trail-deep-piano-loop-211.mp3",
  amusee: "https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-night-761.mp3",
  curieuse: "https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-night-761.mp3",
  revee: "https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-night-761.mp3",
};

const SOUVENIR_SOUNDS: Record<string, string> = {
  spark: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3",
  trust: "https://www.soundjay.com/misc/sounds/magic-chime-01.mp3",
  calm: "https://www.soundjay.com/nature/sounds/wind-soft-1.mp3",
  activity: "https://www.soundjay.com/human/sounds/footsteps-on-grass-1.mp3",
  soul: "https://www.soundjay.com/misc/sounds/harp-glissando-01.mp3",
  true_bond: "https://www.soundjay.com/misc/sounds/heartbeat-1.mp3",
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{message: string, isUser: boolean}[]>([]);
  const [isSpecial, setIsSpecial] = useState(false);
  const [isLienReussi, setIsLienReussi] = useState(false);
  const [lastImpact, setLastImpact] = useState<Partial<Stats> | null>(null);
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'question', label: "Poser une vraie question", completed: false },
    { id: 'ecouter', label: "Écouter sans vouloir résoudre", completed: false },
    { id: 'rien_forcer', label: "Ne rien forcer", completed: false },
    { id: 'sincere', label: "Envoyer une phrase sincère", completed: false },
    { id: 'silence', label: "Laisser un silence exister", completed: false },
  ]);
  const [isMuted, setIsMuted] = useState(true);
  const [showSouvenirs, setShowSouvenirs] = useState(false);
  const [currentView, setCurrentView] = useState<'app' | 'guides'>('app');
  const [hint, setHint] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<SouvenirCategory>('Tout');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [contextualAdvice, setContextualAdvice] = useState<string | null>(null);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        setEditDisplayName(firebaseUser.displayName || '');
        setEditPhotoURL(firebaseUser.photoURL || '');
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setStats(data.stats || INITIAL_STATS);
            if (data.checklist) setChecklist(data.checklist);
          } else {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              displayName: firebaseUser.displayName,
              email: firebaseUser.email,
              stats: INITIAL_STATS,
              updatedAt: serverTimestamp()
            });
          }
        } catch (e) {
          handleFirestoreError(e, 'get', `users/${firebaseUser.uid}`);
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'history'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ 
        message: d.data().message, 
        isUser: d.data().isUser 
      }));
      if (docs.length > 0) {
        setHistory(docs);
      }
    }, (e) => handleFirestoreError(e, 'list', `users/${user.uid}/history`));

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSouvenirs([]);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'souvenirs'), orderBy('unlockedAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => {
        const data = d.data();
        let icon: React.ReactNode = "💛";
        if (data.souvenirId === 'spark') icon = <Sparkles className="w-4 h-4" />;
        if (data.souvenirId === 'trust') icon = <Shield className="w-4 h-4" />;
        if (data.souvenirId === 'calm') icon = <Wind className="w-4 h-4" />;
        if (data.souvenirId === 'activity') icon = <Footprints className="w-4 h-4" />;
        if (data.souvenirId === 'soul') icon = <Camera className="w-4 h-4" />;
        
        return {
          id: data.souvenirId,
          title: data.title,
          description: data.description,
          triggerHint: data.triggerHint,
          category: data.category as SouvenirCategory,
          icon
        } as Souvenir;
      });
      setSouvenirs(docs);
    }, (e) => handleFirestoreError(e, 'list', `users/${user.uid}/souvenirs`));

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (scenario && !isMuted) {
      const emotion = scenario.camille.emotions[0]?.toLowerCase() || 'neutre';
      if (audioRef.current) {
        const soundUrl = SOUND_MAP[emotion] || SOUND_MAP['neutre'];
        if (audioRef.current.src !== soundUrl) {
          audioRef.current.src = soundUrl;
          audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
      }
      if (musicRef.current) {
        const musicUrl = MUSIC_MAP[emotion] || MUSIC_MAP['neutre'];
        if (musicRef.current.src !== musicUrl) {
          musicRef.current.src = musicUrl;
          musicRef.current.volume = 0.1;
          musicRef.current.play().catch(e => console.log("Music play blocked", e));
        }
      }
    } else {
      audioRef.current?.pause();
      musicRef.current?.pause();
    }
  }, [scenario, isMuted]);

  const handleLogout = () => {
    signOut(auth);
    setStats(INITIAL_STATS);
    setHistory([]);
    setSouvenirs([]);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user, {
        displayName: editDisplayName,
        photoURL: editPhotoURL
      });
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editDisplayName,
        photoURL: editPhotoURL,
        updatedAt: serverTimestamp()
      });
      setShowProfileSettings(false);
      setNotifications(prev => [...prev, { 
        id: Math.random().toString(36).substr(2, 9), 
        title: "Profil mis à jour", 
        icon: <User className="w-4 h-4" /> 
      }]);
    } catch (e: any) {
      setError("Erreur lors de la mise à jour du profil.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateScenario = useCallback(async (currentStats: Stats, lastChoice?: string) => {
    setLoading(true);
    setError(null);
    try {
      const isFirstContact = !lastChoice;
      const progressLevel = currentStats.complicite;
      const lastMessages = history.slice(-4).map(m => `${m.isUser ? 'Joueur' : 'Camille'}: ${m.message}`).join('\n');
      
      const prompt = `
        Tu es un narrateur pour une expérience relationnelle immersive appelée "L'Art du Lien".
        Le joueur (Style: Patient, ne force rien) interagit avec Camille (Type: Réservée, ne fait pas confiance facilement).
        
        Stats actuelles :
        - Confiance: ${currentStats.confiance}/100
        - Complicité: ${currentStats.complicite}/100
        - Pression: ${currentStats.pression}/100
        - Naturel (Authenticité): ${currentStats.naturel}/100

        ${isFirstContact ? `
        C'est le PREMIER CONTACT. 
        Directives : Ton doux, sans pression, sujet neutre (environnement).
        ` : `
        Contexte d'évolution :
        ${progressLevel < 30 ? "Méfiance résiduelle. Camille reste sur la défensive." : 
          progressLevel < 60 ? "Ouverture lente. Elle commence à apprécier ta présence." : 
          progressLevel < 90 ? "Complicité réelle. Elle partage ses doutes et ses joies." :
          "Lien fusionnel. Le silence est aussi puissant que les mots."}
        
        Sujets à privilégier : souvenirs d'enfance, rêves, ennui, moments entre amis, musique, lectures, peurs d'avenir.
        Derniers messages :
        ${lastMessages}
        Dernier choix du joueur : "${lastChoice}"
        `}

        Directives comportementales :
        - Camille est RÉSERVÉE mais ÉVOLUTIVE : son ton doit refléter précisément son niveau de confiance.
        - VARIABILITÉ : Ses émotions doivent osciller (ex: nostalgique, puis soudainement joyeuse, ou pensive).
        - Si la PRESSION est élevée (>50), Camille devient fuyante, ses réponses se raccourcissent.
        - Le joueur suit : 1. nePasForcer(), 2. resterSoiMeme(), 3. laisserLeTempsFaire().
        
        Génère un scénario complexe et nuancé en FRANÇAIS (JSON format).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              context: { type: Type.STRING },
              camille: {
                type: Type.OBJECT,
                properties: {
                  message: { type: Type.STRING },
                  emotions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  isSilent: { type: Type.BOOLEAN }
                },
                required: ["message", "emotions"]
              },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    impact: {
                      type: Type.OBJECT,
                      properties: {
                        confiance: { type: Type.NUMBER },
                        complicite: { type: Type.NUMBER },
                        pression: { type: Type.NUMBER },
                        naturel: { type: Type.NUMBER },
                      }
                    }
                  }
                }
              }
            },
            required: ["context", "camille", "choices"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}") as Scenario;
      setScenario(data);
    } catch (err) {
      console.error(err);
      setError("Impossible de générer le prochain instant. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, [history]);

  useEffect(() => {
    generateScenario(INITIAL_STATS);
  }, [generateScenario]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, scenario, loading]);

  const handleChoice = (choice: Scenario['choices'][0]) => {
    const naturalBonus = 1.5;
    const newStats = {
      confiance: Math.min(100, Math.max(0, stats.confiance + (choice.impact.confiance || 0) + (naturalBonus / 2))),
      complicite: Math.min(100, Math.max(0, stats.complicite + (choice.impact.complicite || 0) + naturalBonus)),
      pression: Math.min(100, Math.max(0, stats.pression + (choice.impact.pression || 0))),
      naturel: Math.min(100, Math.max(0, stats.naturel + (choice.impact.naturel || 0))),
    };

    if (newStats.confiance > 40 && newStats.naturel > 70 && newStats.pression < 20) {
      setIsSpecial(true);
    } else {
      setIsSpecial(false);
    }

    if (newStats.confiance > 80 && newStats.complicite > 80 && newStats.naturel > 85 && newStats.pression < 10) {
      setIsLienReussi(true);
    } else {
      setIsLienReussi(false);
    }

    const unlockSouvenir = (id: string, title: string, description: string, hint: string, icon: React.ReactNode, category: SouvenirCategory) => {
      if (user) {
        setDoc(doc(db, 'users', user.uid, 'souvenirs', id), {
          souvenirId: id,
          title,
          description,
          triggerHint: hint,
          category,
          unlockedAt: serverTimestamp()
        }).catch(e => handleFirestoreError(e, 'create', `users/${user.uid}/souvenirs/${id}`));
      }

      setSouvenirs(prev => {
        if (prev.find(s => s.id === id)) return prev;
        if (!isMuted) {
          const soundUrl = SOUVENIR_SOUNDS[id];
          if (soundUrl) {
            const audio = new Audio(soundUrl);
            audio.volume = 0.4;
            audio.play().catch(console.error);
          }
        }
        const notificationId = Math.random().toString(36).substr(2, 9);
        setNotifications(current => [...current, { id: notificationId, title, icon }]);
        setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
        return [...prev, { id, title, description, triggerHint: hint, icon, category }];
      });
    };

    if (newStats.complicite > 30) unlockSouvenir("spark", "La Première Épingle", "Ce moment où Camille a cessé d'être une étrangère.", `Débloqué : Complicité > 30% (${Math.round(newStats.complicite)}%)`, <Sparkles className="w-4 h-4" />, 'Complicité');
    if (newStats.confiance > 60) unlockSouvenir("trust", "Le Mur qui Tombe", "Elle n'a plus peur de vos questions.", `Débloqué : Confiance > 60% (${Math.round(newStats.confiance)}%)`, <Shield className="w-4 h-4" />, 'Confiance');
    if (newStats.naturel > 90 && newStats.pression < 5) unlockSouvenir("calm", "La Paix Partagée", "Un silence qui en dit plus que mille mots.", `Débloqué : Naturel > 90% et Pression basse`, <Wind className="w-4 h-4" />, 'Naturel');

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        stats: newStats,
        updatedAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, 'update', `users/${user.uid}`));
      
      addDoc(collection(db, 'users', user.uid, 'history'), {
        message: scenario?.camille.message || "",
        isUser: false,
        timestamp: serverTimestamp()
      });
      addDoc(collection(db, 'users', user.uid, 'history'), {
        message: choice.text,
        isUser: true,
        timestamp: serverTimestamp()
      });
    }

    setStats(newStats);
    setLastImpact(choice.impact);

    const advices = [
      "L'écoute active est souvent plus parlante qu'une réponse argumentée.",
      "La patience est la variable clé de ❸ laisserLeTempsFaire().",
      "Authenticité : en restant toi-même, tu sécurises l'espace de Camille.",
      "Réduire la pression permet au naturel de reprendre ses droits.",
      "Le silence partagé n'est pas un vide, c'est un lien qui se solidifie.",
    ];
    let advice = advices[Math.floor(Math.random() * advices.length)];
    setContextualAdvice(advice);
    setTimeout(() => setContextualAdvice(null), 5000);
    setTimeout(() => setLastImpact(null), 3000);
    setScenario(null);
    generateScenario(newStats, choice.text);
  };

  const resetGame = () => {
    setStats(INITIAL_STATS);
    setHistory([]);
    setSouvenirs([]);
    setShowResetConfirm(false);
    generateScenario(INITIAL_STATS);
  };

  if (currentView === 'guides') return <Guides onBack={() => setCurrentView('app')} />;
  if (authLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-amber-400">LOADING_IDENTITY...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-5xl font-extralight tracking-tighter mb-12">L'Art du Lien</h1>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black px-12 py-6 rounded-full font-bold hover:bg-amber-400 transition-all">
          Commencer l'aventure
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.03)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.03)_0%,transparent_50%)]" />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <h1 className="text-2xl font-light mb-8">L'Art du Lien</h1>
            
            <div className="space-y-6">
              <StatItem icon={<Shield className="w-4 h-4 text-emerald-400" />} label="Confiance" value={stats.confiance} color="bg-emerald-400" impact={lastImpact?.confiance} />
              <StatItem icon={<Sparkles className="w-4 h-4 text-amber-400" />} label="Complicité" value={stats.complicite} color="bg-amber-400" impact={lastImpact?.complicite} />
              <StatItem icon={<Leaf className="w-4 h-4 text-lime-400" />} label="Naturel" value={stats.naturel} color="bg-lime-400" impact={lastImpact?.naturel} />
            </div>

            <div className="mt-12 space-y-3">
              <button onClick={() => setShowProfileSettings(true)} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-xs uppercase tracking-widest transition-all"><User className="w-3 h-3" /> Mon Profil</button>
              <button onClick={() => setCurrentView('guides')} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-amber-400/10 text-amber-400 text-xs uppercase tracking-widest transition-all"><BookOpen className="w-3 h-3" /> Guides Visuels</button>
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-red-500/10 text-red-400 text-xs uppercase tracking-widest transition-all">Déconnexion</button>
            </div>
          </div>

          <div className={`p-8 rounded-3xl border backdrop-blur-xl transition-all duration-700 ${stats.confiance > 50 ? 'bg-amber-400/5 border-amber-400/20 shadow-2xl shadow-amber-900/10' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center gap-4 mb-6">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border border-amber-400/20" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"><User className="w-6 h-6 text-white/40" /></div>
              )}
              <div>
                <h2 className="text-sm font-medium">{user.displayName || 'Joueur Anonyme'}</h2>
                <span className="text-[10px] text-white/20 font-mono tracking-tighter uppercase line-clamp-1">{user.email}</span>
              </div>
            </div>
            {stats.confiance <= 50 && <p className="text-[10px] text-white/20 italic leading-relaxed border-t border-white/5 pt-4">// Données sécurisées. Atteins 50% de confiance pour synchroniser.</p>}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl min-h-[600px]">
            <div ref={scrollRef} className="flex-grow overflow-y-auto pr-4 space-y-6 mb-8">
              {history.map((msg, i) => (
                <div key={i} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${msg.isUser ? 'bg-amber-400/10 text-amber-50 border border-amber-400/20 rounded-tr-none' : 'bg-white/5 text-white/80 border border-white/5 rounded-tl-none'}`}>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
              
              {loading && <div className="flex justify-start"><Loader2 className="w-4 h-4 animate-spin text-white/40" /></div>}
              
              {!loading && scenario && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <div className="py-4 border-y border-white/5"><p className="text-sm text-white/50 font-light italic">{scenario.context}</p></div>
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] p-6 rounded-3xl rounded-tl-none border ${scenario.camille.isSilent ? 'bg-white/5 border-dashed border-white/20' : 'bg-indigo-500/10 border-indigo-400/20'}`}>
                      <p className={`text-lg font-light leading-relaxed ${scenario.camille.isSilent ? 'text-white/40 italic' : 'text-white'}`}>
                        {scenario.camille.isSilent ? `(Camille ${scenario.camille.message.toLowerCase()})` : scenario.camille.message}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-4">
                    {contextualAdvice && <div className="text-center p-2 bg-amber-400/5 text-amber-400/60 font-mono text-[10px] italic border border-amber-400/10 rounded-full">{contextualAdvice}</div>}
                    {scenario.choices.map((choice, i) => (
                      <button key={i} onClick={() => handleChoice(choice)} className="w-full p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 text-left text-sm transition-all group">
                        <span className="text-white/80 group-hover:text-amber-400 transition-colors">{choice.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showProfileSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProfileSettings(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 p-8 rounded-[40px] shadow-2xl">
              <h2 className="text-xl font-light mb-8">Paramètres du Profil</h2>
              <div className="space-y-6">
                <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" placeholder="Ton nom..." />
                <input type="text" value={editPhotoURL} onChange={(e) => setEditPhotoURL(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm" placeholder="Photo URL (https://...)" />
                {editPhotoURL && <img src={editPhotoURL} alt="" className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-amber-400/20" referrerPolicy="no-referrer" />}
                <div className="flex gap-3 pt-6">
                  <button onClick={() => setShowProfileSettings(false)} className="flex-1 p-4 rounded-2xl bg-white/5 text-xs tracking-widest uppercase">Annuler</button>
                  <button onClick={handleUpdateProfile} className="flex-1 p-4 rounded-2xl bg-amber-400 text-black text-xs font-bold tracking-widest uppercase">{loading ? "..." : "Sauver"}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} loop /><audio ref={musicRef} loop />
    </div>
  );
}

function StatItem({ icon, label, value, color, impact }: { icon: React.ReactNode, label: string, value: number, color: string, impact?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] tracking-widest uppercase text-white/50">
        <div className="flex items-center gap-2">{icon} <span>{label}</span></div>
        <div className="flex items-center gap-2">
          <AnimatePresence>{impact !== 0 && impact !== undefined && <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={impact > 0 ? 'text-emerald-400' : 'text-rose-400'}>{impact > 0 ? '+' : ''}{impact}</motion.span>}</AnimatePresence>
          <span className="text-white/80">{Math.round(value)}%</span>
        </div>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden"><motion.div animate={{ width: `${value}%` }} className={`h-full ${color}`} /></div>
    </div>
  );
}
