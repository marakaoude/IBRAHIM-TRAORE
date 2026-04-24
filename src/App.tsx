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
  Download,
  Volume2,
  VolumeX,
  BookOpen,
  Camera,
  Music,
  Footprints,
  User,
  Heart,
  ThumbsUp,
  Star,
  Search,
  X as CloseIcon,
  ImagePlus,
  LayoutGrid,
  Trash2,
  Plus,
  BookText,
  PenLine,
  History,
  Sun,
  Moon
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import Guides from './components/Guides';
import { auth, db, googleProvider, handleFirestoreError, testConnection } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit, deleteDoc } from 'firebase/firestore';

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

interface Artwork {
  id: string;
  imageUrl: string;
  title: string;
  description?: string;
  createdAt: any;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  momentSnapshot: string;
  statsAtTime: Stats;
  createdAt: any;
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
    confidence: number;
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

const MAX_MESSAGE_LENGTH = 280;

const CamilleAvatar = ({ emotion, showHarshFeedback, size = "large" }: { emotion: string, showHarshFeedback: boolean, size?: "small" | "large" }) => {
  const isPensive = emotion === 'pensive';
  const isAmused = emotion === 'amusee';
  const isSurprised = emotion === 'curieuse';
  const isSuspicious = emotion === 'mefiante';

  const glowColors: Record<string, string> = {
    amusee: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]',
    pensive: 'shadow-[0_0_20px_rgba(147,197,253,0.3)]',
    curieuse: 'shadow-[0_0_20px_rgba(167,139,250,0.3)]',
    mefiante: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]',
  };

  const dimensions = size === "small" ? "w-8 h-8" : "w-12 h-12";
  const eyeDim = size === "small" ? "w-0.5 h-1" : "w-1 h-1.5";
  const eyeGap = size === "small" ? "gap-1" : "gap-2";

  return (
    <motion.div 
      animate={showHarshFeedback ? { 
        x: [-2, 2, -2, 2, 0],
        scale: [1, 1.1, 1],
        borderColor: ['rgba(255,255,255,0.1)', 'rgba(244,63,94,0.5)', 'rgba(255,255,255,0.1)']
      } : {
        rotate: isPensive ? [0, -5, 5, 0] : 0,
        y: isAmused ? [0, -4, 0] : 0,
        scale: isSurprised ? [1, 1.2, 1] : isSuspicious ? 0.95 : 1,
      }}
      transition={showHarshFeedback ? { duration: 0.4 } : {
        rotate: isPensive ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : {},
        y: isAmused ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : {},
        scale: isSurprised ? { duration: 0.5 } : { duration: 1 }
      }}
      className={`${dimensions} rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 relative overflow-hidden ${glowColors[emotion] || ''}`}
    >
      <AnimatePresence mode="wait">
        {showHarshFeedback ? (
          <motion.div 
            key="harsh"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 bg-rose-500/20 flex items-center justify-center"
          >
            <AlertCircle className={`w-${size === 'small' ? '4' : '6'} h-${size === 'small' ? '4' : '6'} text-rose-400`} />
          </motion.div>
        ) : (
          <motion.div 
            key="face"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex flex-col items-center ${size === 'small' ? 'gap-0.5' : 'gap-1.5'}`}
          >
            {/* Eyes */}
            <div className={`flex ${eyeGap}`}>
              <motion.div 
                animate={{ 
                  scaleY: isSurprised ? [1, 1.5, 1] : [1, 1, 0.1, 1],
                }}
                transition={{ 
                  duration: isSurprised ? 0.3 : 4, 
                  repeat: Infinity, 
                  repeatDelay: isSurprised ? 0 : Math.random() * 5 + 2 
                }}
                className={`${eyeDim} bg-white/40 rounded-full`} 
              />
              <motion.div 
                animate={{ 
                  scaleY: isSurprised ? [1, 1.5, 1] : [1, 1, 0.1, 1],
                }}
                transition={{ 
                  duration: isSurprised ? 0.3 : 4, 
                  repeat: Infinity, 
                  repeatDelay: isSurprised ? 0 : Math.random() * 5 + 2 
                }}
                className={`${eyeDim} bg-white/40 rounded-full`} 
              />
            </div>
            {/* Mouth / Name Initial */}
            <span className={`${size === 'small' ? 'text-[8px]' : 'text-[10px]'} font-serif italic text-white/20`}>C.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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

const STAT_ADVICE: Record<string, string[]> = {
  confiance: [
    "La confiance est un château de cartes, chaque geste compte.",
    "Un secret partagé solidifie les fondations.",
    "La méfiance n'est qu'un bouclier contre la peur."
  ],
  complicite: [
    "La complicité naît dans les silences confortables.",
    "Les rires partagés sont les ponts les plus solides.",
    "Comprendre sans parler est le stade ultime du lien."
  ],
  naturel: [
    "Le naturel est le souffle de la relation.",
    "Pas besoin de masques ici, la vérité suffit.",
    "L'authenticité désarme les défenses les plus rudes."
  ],
  pression: [
    "La pression étouffe le lien naissant.",
    "Laisse Camille venir à toi, ne la poursuis pas.",
    "Le temps est ton allié, pas ton ennemi."
  ]
};

interface InteractiveMoment {
  id: string;
  title: string;
  camilleThought: string;
  visualEffect: 'golden-glimmer' | 'deep-blue-depth' | 'verdant-growth';
}

const MOMENTS_DEFINITIONS: Record<string, InteractiveMoment> = {
  'regard': {
    id: 'regard',
    title: "Le Premier Regard",
    camilleThought: "Elle ne détourne pas les yeux, pour la première fois. Il y a une clarté étrange entre vous.",
    visualEffect: 'golden-glimmer'
  },
  'silence': {
    id: 'silence',
    title: "Le Silence Absolu",
    camilleThought: "Elle savoure le vide. Elle réalise que tes silences ne sont pas des attentes, mais des refuges.",
    visualEffect: 'deep-blue-depth'
  },
  'confident': {
    id: 'confident',
    title: "Le Premier Confident",
    camilleThought: "Elle s'interrompt, ses doigts jouant avec le bord de sa tasse. Pour la première fois, elle ne cherche pas à plaire, mais à être vue. Elle te confie un fragment d'elle qui n'appartient qu'à son enfance.",
    visualEffect: 'deep-blue-depth'
  },
  'racines': {
    id: 'racines',
    title: "Racines Communes",
    camilleThought: "L'impression que vos histoires s'entremêlent. Camille se sent soudainement très proche de toi.",
    visualEffect: 'verdant-growth'
  }
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{id: string, message: string, isUser: boolean, reactions?: string[]}[]>([]);
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
  const [musicMuted, setMusicMuted] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [soundVolume, setSoundVolume] = useState(0.5);
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
  const [activeMoment, setActiveMoment] = useState<InteractiveMoment | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentReactions, setCurrentReactions] = useState<string[]>([]);
  const [showHarshFeedback, setShowHarshFeedback] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gallery, setGallery] = useState<Artwork[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryViewMode, setGalleryViewMode] = useState<'grid' | 'list'>('grid');
  const [gallerySortBy, setGallerySortBy] = useState<'date' | 'title'>('date');
  const [uploadingArt, setUploadingArt] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [pendingJournalMoment, setPendingJournalMoment] = useState<{message: string, stats: Stats} | null>(null);
  
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
        id: d.id,
        message: d.data().message, 
        isUser: d.data().isUser,
        reactions: d.data().reactions || (d.data().reaction ? [d.data().reaction] : [])
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
    if (!user) {
      setGallery([]);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ 
        id: d.id,
        imageUrl: d.data().imageUrl,
        title: d.data().title,
        description: d.data().description,
        createdAt: d.data().createdAt
      }));
      setGallery(docs);
    }, (e) => handleFirestoreError(e, 'list', `users/${user.uid}/gallery`));

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) {
      setJournal([]);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'journal'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ 
        id: d.id,
        title: d.data().title,
        content: d.data().content,
        momentSnapshot: d.data().momentSnapshot,
        statsAtTime: d.data().statsAtTime,
        createdAt: d.data().createdAt
      }));
      setJournal(docs);
    }, (e) => handleFirestoreError(e, 'list', `users/${user.uid}/journal`));

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.volume = musicMuted ? 0 : musicVolume * 0.2; // Keep music relatively quiet
    }
  }, [musicVolume, musicMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = soundMuted ? 0 : soundVolume;
    }
  }, [soundVolume, soundMuted]);

  useEffect(() => {
    if (scenario) {
      const emotion = scenario.camille.emotions[0]?.toLowerCase() || 'neutre';
      
      if (audioRef.current && !soundMuted) {
        const soundUrl = SOUND_MAP[emotion] || SOUND_MAP['neutre'];
        if (audioRef.current.src !== soundUrl) {
          audioRef.current.src = soundUrl;
          audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
      } else {
        audioRef.current?.pause();
      }

      if (musicRef.current && !musicMuted) {
        const musicUrl = MUSIC_MAP[emotion] || MUSIC_MAP['neutre'];
        if (musicRef.current.src !== musicUrl) {
          musicRef.current.src = musicUrl;
          musicRef.current.play().catch(e => console.log("Music play blocked", e));
        }
      } else {
        musicRef.current?.pause();
      }
    } else {
      audioRef.current?.pause();
      musicRef.current?.pause();
    }
  }, [scenario, soundMuted, musicMuted]);

  const addNotification = (notif: Notification) => {
    setNotifications(prev => {
      const next = [...prev, notif];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
  };

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
      addNotification({ 
        id: Math.random().toString(36).substr(2, 9), 
        title: "Profil mis à jour", 
        icon: <User className="w-4 h-4" /> 
      });
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

        État interne de Camille :
        ${currentStats.pression > 60 ? "- Camille se sent étouffée. Elle est sur le point de se retirer complètement. Ses réponses doivent être glaciales, brèves, ou elle peut même rester silencieuse." :
          currentStats.pression > 30 ? "- Elle ressent une légère tension. Elle pèse chaque mot et cherche des signes de pression cachée de ta part." :
          "- Elle se sent libre et en sécurité. Sa garde baisse naturellement."}
        
        ${currentStats.confiance < 30 ? "- Elle te considère encore comme un étranger potentiel. Elle est vigilante et protectrice de son espace personnel." :
          currentStats.confiance < 70 ? "- Elle commence à s'ancrer dans la relation. Elle partage des fragments d'elle-même mais garde les portes de sortie en vue." :
          "- Elle s'abandonne à la complicité. Elle te fait confiance pour porter ses silences."}

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
        - Camille est RÉSERVÉE mais ÉVOLUTIVE : son ton doit refléter précisément son niveau de confiance et de complicité.
        - VARIABILITÉ : Ses émotions doivent osciller (ex: nostalgique, puis soudainement joyeuse, ou pensive).
        - PRESSION ÉLEVÉE (>30) : Ses messages DOIVENT devenir plus courts, plus vagues et évasifs. Elle évite activement de répondre aux questions personnelles.
        - CONFIANCE ÉLEVÉE (>60) : Ses messages DOIVENT devenir plus riches, elle partage des anecdotes personnelles, des souvenirs, et pose des questions sur le joueur pour approfondir la relation.
        - IMPACTS : Ne génère JAMAIS de choix avec un impact négatif supérieur à -10 sur la confiance, la complicité ou le naturel. Ne génère JAMAIS de choix augmentant la pression de plus de +5 points.
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
                  isSilent: { type: Type.BOOLEAN },
                  confidence: { type: Type.NUMBER }
                },
                required: ["message", "emotions", "confidence"]
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

  const triggeredMoments = useRef<Set<string>>(new Set());

  const handleChoice = (choice: Scenario['choices'][0]) => {
    // Validation of impacts
    const isTooHarsh = 
      (choice.impact.confiance || 0) < -10 || 
      (choice.impact.complicite || 0) < -10 || 
      (choice.impact.naturel || 0) < -10 || 
      (choice.impact.pression || 0) > 5;

    if (isTooHarsh) {
      setShowHarshFeedback(true);
      setTimeout(() => {
        setShowHarshFeedback(false);
        const notificationId = Math.random().toString(36).substr(2, 9);
        addNotification({ 
          id: notificationId, 
          title: "Approche trop brusque", 
          icon: <AlertCircle className="w-4 h-4" /> 
        });
        setContextualAdvice("Camille semble se braquer avant même que tu n'agisses. Essaie une approche plus douce.");
        setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
      }, 1500);
      return;
    }

    const naturalBonus = 1.5;
    const newStats = {
      confiance: Math.min(100, Math.max(0, stats.confiance + (choice.impact.confiance || 0) + (naturalBonus / 2))),
      complicite: Math.min(100, Math.max(0, stats.complicite + (choice.impact.complicite || 0) + naturalBonus)),
      pression: Math.min(100, Math.max(0, stats.pression + (choice.impact.pression || 0))),
      naturel: Math.min(100, Math.max(0, stats.naturel + (choice.impact.naturel || 0))),
    };

    // Interactive Moments Triggers
    if (newStats.naturel > 85 && !triggeredMoments.current.has('regard')) {
      const moment = MOMENTS_DEFINITIONS['regard'];
      setActiveMoment(moment);
      triggeredMoments.current.add('regard');
      const notificationId = Math.random().toString(36).substr(2, 9);
      addNotification({ id: notificationId, title: moment.title, icon: <Sparkles className="w-4 h-4" /> });
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 5000);
    } else if (newStats.pression < 5 && newStats.confiance > 40 && !triggeredMoments.current.has('silence')) {
      const moment = MOMENTS_DEFINITIONS['silence'];
      setActiveMoment(moment);
      triggeredMoments.current.add('silence');
      const notificationId = Math.random().toString(36).substr(2, 9);
      addNotification({ id: notificationId, title: moment.title, icon: <Wind className="w-4 h-4" /> });
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 5000);
    } else if (newStats.complicite > 70 && newStats.confiance > 60 && !triggeredMoments.current.has('racines')) {
      const moment = MOMENTS_DEFINITIONS['racines'];
      setActiveMoment(moment);
      triggeredMoments.current.add('racines');
      const notificationId = Math.random().toString(36).substr(2, 9);
      addNotification({ id: notificationId, title: moment.title, icon: <Leaf className="w-4 h-4" /> });
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 5000);
    } else if (newStats.complicite >= 50 && newStats.confiance > 60 && !triggeredMoments.current.has('confident')) {
      const moment = MOMENTS_DEFINITIONS['confident'];
      setActiveMoment(moment);
      triggeredMoments.current.add('confident');
      const notificationId = Math.random().toString(36).substr(2, 9);
      addNotification({ id: notificationId, title: moment.title, icon: <Heart className="w-4 h-4" /> });
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 5000);
    }

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
      if (souvenirs.find(s => s.id === id)) return;

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

      if (!soundMuted) {
        const soundUrl = SOUVENIR_SOUNDS[id];
        if (soundUrl) {
          const audio = new Audio(soundUrl);
          audio.volume = soundVolume * 0.8;
          audio.play().catch(console.error);
        }
      }
      
      const notificationId = Math.random().toString(36).substr(2, 9);
      addNotification({ id: notificationId, title, icon });
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
      setSouvenirs(prev => [...prev, { id, title, description, triggerHint: hint, icon, category }]);
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
        timestamp: serverTimestamp(),
        reactions: currentReactions
      });
      addDoc(collection(db, 'users', user.uid, 'history'), {
        message: choice.text,
        isUser: true,
        timestamp: serverTimestamp()
      });
      setCurrentReactions([]);
    }

    setStats(newStats);
    setLastImpact(choice.impact);

    const getContextualAdvice = (currentStats: Stats) => {
      if (currentStats.pression > 40) return "La tension monte. Camille a besoin d'air, réduis la cadence.";
      if (currentStats.confiance < 30) return "Elle est encore sur la défensive. Sois constant et patient.";
      if (currentStats.complicite > 60) return "Le lien se renforce. Les sujets profonds sont désormais accessibles.";
      if (currentStats.naturel > 80) return "Ton authenticité porte ses fruits. Elle se sent en sécurité.";
      return "Chaque interaction est une graine. Laisse le temps faire son œuvre.";
    };

    setContextualAdvice(getContextualAdvice(newStats));
    setTimeout(() => setContextualAdvice(null), 8000);
    setTimeout(() => setLastImpact(null), 3000);

    // Detect positive moments for journal
    if (choice.impact && (choice.impact.complicite || 0) >= 3) {
      setPendingJournalMoment({
        message: scenario?.camille.message || "",
        stats: newStats
      });
    } else {
      setPendingJournalMoment(null);
    }

    setScenario(null);
    generateScenario(newStats, choice.text);
  };

  const [userInput, setUserInput] = useState('');

  const handleSendMessage = () => {
    if (!userInput.trim() || loading || userInput.length > MAX_MESSAGE_LENGTH) return;
    
    // Impact of free text is calculated by a base value + randomness
    // In a more complex version, we could use AI to evaluate the impact
    const baseImpact = {
      confiance: 0.5,
      complicite: 1,
      pression: userInput.length > 50 ? 5 : 1,
      naturel: 2
    };

    handleChoice({
      text: userInput,
      impact: baseImpact
    });
    
    setUserInput('');
  };

  const resetGame = () => {
    setStats(INITIAL_STATS);
    setHistory([]);
    setSouvenirs([]);
    setShowResetConfirm(false);
    generateScenario(INITIAL_STATS);
  };

  const handleShareMessage = (messageId: string) => {
    const url = `${window.location.origin}/?messageId=${messageId}`;
    navigator.clipboard.writeText(url);
    const notificationId = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { 
      id: notificationId, 
      title: "Lien du message copié", 
      icon: <Share2 className="w-4 h-4" /> 
    }]);
    setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
  };

  const handleSaveImage = async (emotion: string) => {
    const imageUrl = `https://picsum.photos/seed/${emotion}-${user?.uid || 'guest'}/1200/1200`;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camille-atmosphere-${emotion}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const notificationId = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { 
        id: notificationId, 
        title: `Atmosphère "${emotion}" enregistrée`, 
        icon: <Download className="w-4 h-4" /> 
      }]);
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
    } catch (e) {
      console.error("Failed to save image", e);
      setError("Erreur lors de l'enregistrement de l'image.");
    }
  };

  const handleReact = async (messageId: string, reaction: string) => {
    if (!user || !messageId) return;
    try {
      const msg = history.find(m => m.id === messageId);
      const reactions = msg?.reactions || [];
      const hasReaction = reactions.includes(reaction);
      
      const { arrayUnion, arrayRemove } = await import('firebase/firestore');
      const msgRef = doc(db, 'users', user.uid, 'history', messageId);
      
      await updateDoc(msgRef, { 
        reactions: hasReaction ? arrayRemove(reaction) : arrayUnion(reaction) 
      });
      
      if (!hasReaction) {
        // Optional: sound effect for reaction
        const audio = new Audio("https://www.soundjay.com/buttons/button-45.mp3");
        audio.volume = 0.2;
        audio.play().catch(() => {});
      }
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${user.uid}/history/${messageId}`);
    }
  };

  const handleUploadArtwork = async (file: File) => {
    if (!user) return;
    setUploadingArt(true);
    try {
      // Simulate upload by converting to DataURL (limited to small files)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        await addDoc(collection(db, 'users', user.uid, 'gallery'), {
          imageUrl: dataUrl,
          title: file.name.split('.')[0] || "Sans titre",
          createdAt: serverTimestamp()
        });
        setUploadingArt(false);
        const notificationId = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { 
          id: notificationId, 
          title: "Œuvre ajoutée à la galerie", 
          icon: <ImagePlus className="w-4 h-4" /> 
        }]);
        setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      handleFirestoreError(e, 'create', `users/${user.uid}/gallery`);
      setUploadingArt(false);
    }
  };

  const handleDeleteArtwork = async (artId: string) => {
    if (!user) return;
    try {
      const artRef = doc(db, 'users', user.uid, 'gallery', artId);
      await deleteDoc(artRef); 
    } catch (e) {
      handleFirestoreError(e, 'delete', `users/${user.uid}/gallery/${artId}`);
    }
  };

  const handleLogMoment = async () => {
    if (!user || !pendingJournalMoment) return;
    try {
      const titles = [
        "Un éclat de complicité",
        "Une parenthèse enchantée",
        "Résonance mutuelle",
        "L'art de se comprendre",
        "Instant de grâce"
      ];
      const randomTitle = titles[Math.floor(Math.random() * titles.length)];
      
      await addDoc(collection(db, 'users', user.uid, 'journal'), {
        title: randomTitle,
        content: `Un moment de connexion intense. Complicité : ${Math.round(pendingJournalMoment.stats.complicite)}%.`,
        momentSnapshot: pendingJournalMoment.message,
        statsAtTime: pendingJournalMoment.stats,
        createdAt: serverTimestamp()
      });
      
      setPendingJournalMoment(null);
      const notificationId = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { 
        id: notificationId, 
        title: "Moment immortalisé dans le journal", 
        icon: <PenLine className="w-4 h-4" /> 
      }]);
      setTimeout(() => setNotifications(current => current.filter(n => n.id !== notificationId)), 4000);
    } catch (e) {
      handleFirestoreError(e, 'create', `users/${user.uid}/journal`);
    }
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journal', entryId));
    } catch (e) {
      handleFirestoreError(e, 'delete', `users/${user.uid}/journal/${entryId}`);
    }
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
    <div data-theme={theme} className={`min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)] selection:text-white transition-colors duration-500`}>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(251,191,36,0.03)_0%,transparent_50%),radial-gradient(circle_at_100%_100%,rgba(168,85,247,0.03)_0%,transparent_50%)]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6 h-[calc(100vh-6rem)] overflow-y-auto pr-2 custom-scrollbar">
          <div className="p-8 rounded-3xl bg-[var(--surface-low)] border border-[var(--border-dim)] backdrop-blur-xl">
            <div className="flex items-center gap-4 mb-8">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profil" className="w-10 h-10 rounded-full border border-[var(--border-dim)]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--surface-mid)] flex items-center justify-center"><User className="w-5 h-5 text-[var(--text-secondary)]" /></div>
              )}
              <h1 className="text-2xl font-light">L'Art du Lien</h1>
            </div>
            
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {isLienReussi && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-amber-400 text-black rounded-2xl flex items-center justify-center gap-2 mb-6 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span className="text-[10px] uppercase font-black tracking-widest italic">Lien Harmonisé</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {contextualAdvice && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-2xl text-[10px] text-amber-400 leading-relaxed font-mono italic text-center"
                  >
                    "{contextualAdvice}"
                  </motion.div>
                )}
              </AnimatePresence>
              
              <BubbleStat 
                icon={<Shield className="w-4 h-4 text-emerald-400" />} 
                label="Confiance" 
                value={stats.confiance} 
                color="bg-emerald-400" 
                impact={lastImpact?.confiance}
                onHover={(active) => {
                  if (active) setContextualAdvice(STAT_ADVICE.confiance[Math.floor(Math.random() * 3)]);
                  else setContextualAdvice(null);
                }}
              />
              <BubbleStat 
                icon={<Sparkles className="w-4 h-4 text-amber-400" />} 
                label="Complicité" 
                value={stats.complicite} 
                color="bg-amber-400" 
                impact={lastImpact?.complicite}
                onHover={(active) => {
                  if (active) setContextualAdvice(STAT_ADVICE.complicite[Math.floor(Math.random() * 3)]);
                  else setContextualAdvice(null);
                }}
              />
              <BubbleStat 
                icon={<Leaf className="w-4 h-4 text-lime-400" />} 
                label="Naturel" 
                value={stats.naturel} 
                color="bg-lime-400" 
                impact={lastImpact?.naturel}
                onHover={(active) => {
                  if (active) setContextualAdvice(STAT_ADVICE.naturel[Math.floor(Math.random() * 3)]);
                  else setContextualAdvice(null);
                }}
              />
              <BubbleStat 
                icon={<AlertCircle className="w-4 h-4 text-rose-400" />} 
                label="Pression" 
                value={stats.pression} 
                color="bg-rose-400" 
                impact={lastImpact?.pression}
                onHover={(active) => {
                  if (active) setContextualAdvice(STAT_ADVICE.pression[Math.floor(Math.random() * 3)]);
                  else setContextualAdvice(null);
                }}
              />
            </div>

            <div className="mt-12 space-y-6">
              <div className="space-y-4 p-4 rounded-2xl bg-[var(--surface-low)] border border-[var(--border-dim)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                    {theme === 'dark' ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />} Thème
                  </div>
                  <div className="flex bg-[var(--surface-low)] p-1 rounded-xl border border-[var(--border-dim)]">
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-[var(--accent)] text-black shadow-lg shadow-amber-400/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Moon className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setTheme('light')}
                      className={`p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-[var(--accent)] text-white shadow-lg shadow-amber-600/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                      <Sun className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                    <Music className="w-3 h-3" /> Musique
                  </div>
                  <button 
                    onClick={() => setMusicMuted(!musicMuted)}
                    className={`p-2 rounded-lg transition-all ${musicMuted ? 'bg-red-500/10 text-red-400' : 'bg-amber-400/10 text-amber-400'}`}
                  >
                    {musicMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
                {!musicMuted && (
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={musicVolume} 
                    onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent)] h-1 bg-[var(--surface-low)] rounded-lg appearance-none cursor-pointer"
                  />
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">
                    <Volume2 className="w-3 h-3" /> Effets
                  </div>
                  <button 
                    onClick={() => setSoundMuted(!soundMuted)}
                    className={`p-2 rounded-lg transition-all ${soundMuted ? 'bg-red-500/10 text-red-400' : 'bg-emerald-400/10 text-emerald-400'}`}
                  >
                    {soundMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                </div>
                {!soundMuted && (
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={soundVolume} 
                    onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 h-1 bg-[var(--surface-low)] rounded-lg appearance-none cursor-pointer"
                  />
                )}
              </div>

              <div className="space-y-3">
                <button onClick={() => setShowProfileSettings(true)} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-[var(--surface-low)] border border-[var(--border-dim)] hover:bg-[var(--surface-mid)] text-xs uppercase tracking-widest transition-all"><User className="w-3 h-3" /> Mon Profil</button>
                <button onClick={() => setIsJournalOpen(true)} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-dim)] text-xs uppercase tracking-widest transition-all hover:bg-amber-400/20"><BookText className="w-3 h-3" /> Journal de Bord</button>
                <button onClick={() => setIsGalleryOpen(true)} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs uppercase tracking-widest transition-all hover:bg-indigo-500/20"><LayoutGrid className="w-3 h-3" /> Ma Galerie d'Art</button>
                <button onClick={() => setCurrentView('guides')} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)] text-xs uppercase tracking-widest transition-all"><BookOpen className="w-3 h-3" /> Guides Visuels</button>
                <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full p-3 rounded-2xl bg-rose-500/10 text-rose-400 text-xs uppercase tracking-widest transition-all">Déconnexion</button>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--surface-low)] border border-[var(--border-dim)] backdrop-blur-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium tracking-widest uppercase text-[var(--text-secondary)] flex items-center gap-2">
                <Camera className="w-4 h-4" /> Souvenirs
              </h2>
              <span className="text-[10px] font-mono bg-[var(--surface-mid)] px-2 py-0.5 rounded-full">{souvenirs.length}</span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(['Tout', 'Confiance', 'Complicité', 'Naturel'] as SouvenirCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`text-[9px] px-3 py-1 rounded-full border whitespace-nowrap transition-all ${
                    activeFilter === cat 
                      ? 'bg-amber-400 border-amber-400 text-black font-bold' 
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {souvenirs
                  .filter(s => activeFilter === 'Tout' || s.category === activeFilter)
                  .map((souvenir, i) => (
                    <motion.div
                      key={souvenir.id}
                      initial={{ opacity: 0, scale: 0.8, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.05 }}
                      className="group relative p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-amber-400/30 transition-all cursor-help focus:outline-none"
                      tabIndex={0}
                      onMouseEnter={() => setHint(souvenir.triggerHint || null)}
                      onMouseLeave={() => setHint(null)}
                    >
                      <div className="absolute -top-1 -right-1">
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }} 
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="w-3 h-3 bg-amber-400 rounded-full blur-[2px]" 
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                          {souvenir.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xs font-bold text-white/90 group-hover:text-amber-400 transition-colors">{souvenir.title}</h3>
                          <p className="text-[10px] text-white/40 line-clamp-2 mt-1 leading-relaxed">{souvenir.description}</p>
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {hint === souvenir.triggerHint && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute z-50 bottom-full mb-2 left-0 right-0 p-3 bg-black border border-white/10 rounded-xl text-[9px] text-amber-400/80 italic shadow-2xl backdrop-blur-xl"
                          >
                            {souvenir.triggerHint}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
              </AnimatePresence>
              {souvenirs.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
                  <p className="text-[10px] text-white/20 uppercase tracking-widest font-mono">Aucun souvenir débloqué</p>
                </div>
              )}
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
          <div className="flex flex-col p-8 rounded-3xl bg-[var(--surface-low)] border border-[var(--border-dim)] backdrop-blur-xl min-h-[600px]">
            {/* Search Bar */}
            <div className="mb-6 relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className={`w-4 h-4 transition-colors ${searchTerm ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`} />
              </div>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrer l'historique par mot-clé..."
                className="w-full bg-[var(--surface-low)] border border-[var(--border-dim)] rounded-2xl py-3 pl-12 pr-12 text-xs focus:outline-none focus:border-[var(--accent)] transition-all font-mono italic"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-4 flex items-center text-[var(--text-secondary)] hover:text-rose-400 transition-colors"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-grow overflow-y-auto pr-4 space-y-6 mb-8 custom-scrollbar">
              {history.filter(msg => msg.message.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && history.length > 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-white/20 space-y-4">
                  <Search className="w-12 h-12 stroke-[1px]" />
                  <p className="text-[10px] uppercase tracking-widest font-mono italic">Aucun message ne correspond à "{searchTerm}"</p>
                </div>
              )}
              {history.filter(msg => msg.message.toLowerCase().includes(searchTerm.toLowerCase())).map((msg, i) => (
                <div key={msg.id || i} className={`flex items-start gap-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                  {!msg.isUser && (
                    <CamilleAvatar emotion="neutre" showHarshFeedback={false} size="small" />
                  )}
                  <div className="group relative focus:outline-none" tabIndex={0}>
                      <div className={`max-w-[400px] p-4 rounded-2xl ${msg.isUser ? 'bg-[var(--accent-dim)] text-[var(--text-primary)] border border-[var(--accent-dim)] rounded-tr-none' : 'bg-[var(--surface-low)] text-[var(--text-primary)] border border-[var(--border-dim)] rounded-tl-none'}`}>
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-1">
                          <AnimatePresence>
                            {(msg.reactions || []).map((reaction) => (
                              <motion.div 
                                key={reaction}
                                initial={{ opacity: 0, scale: 0.5, y: 5 }}
                                animate={{ opacity: 0.6, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center"
                              >
                                <span className="text-[10px] p-1 rounded bg-white/10 uppercase tracking-tighter flex items-center">
                                  {reaction === 'heart' && <Heart className="w-2 h-2 inline fill-rose-400 text-rose-400 mr-1" />}
                                  {reaction === 'thumbsup' && <ThumbsUp className="w-2 h-2 inline text-amber-400 mr-1" />}
                                  {reaction === 'star' && <Star className="w-2 h-2 inline fill-amber-300 text-amber-300 mr-1" />}
                                  {reaction === 'heart' ? 'Aimé' : reaction === 'thumbsup' ? 'Approuvé' : 'Étoilé'}
                                </span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>

                      {!msg.isUser && msg.id && (
                        <div className="mt-2 flex items-center gap-3 px-1">
                          <button 
                            onClick={() => handleReact(msg.id!, 'heart')}
                            className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border ${(msg.reactions || []).includes('heart') ? 'text-rose-400 bg-rose-400/20 border-rose-400/50' : 'text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-rose-400 hover:border-rose-400/30'}`}
                          >
                            <Heart className={`w-3 h-3 ${(msg.reactions || []).includes('heart') ? 'fill-current' : ''}`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Cœur</span>
                          </button>
                          <button 
                            onClick={() => handleReact(msg.id!, 'thumbsup')}
                            className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border ${(msg.reactions || []).includes('thumbsup') ? 'text-amber-400 bg-amber-400/20 border-amber-400/50' : 'text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-amber-400 hover:border-amber-400/30'}`}
                          >
                            <ThumbsUp className={`w-3 h-3 ${(msg.reactions || []).includes('thumbsup') ? 'fill-current' : ''}`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Super</span>
                          </button>
                          <button 
                            onClick={() => handleReact(msg.id!, 'star')}
                            className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border ${(msg.reactions || []).includes('star') ? 'text-amber-300 bg-amber-300/20 border-amber-300/50' : 'text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-amber-300 hover:border-amber-300/30'}`}
                          >
                            <Star className={`w-3 h-3 ${(msg.reactions || []).includes('star') ? 'fill-current' : ''}`} />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Étoile</span>
                          </button>
                          <button 
                            onClick={() => handleShareMessage(msg.id!)}
                            className="flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-indigo-400 hover:border-indigo-400/30"
                          >
                            <Share2 className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Partager</span>
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
              
              {loading && <div className="flex justify-start"><Loader2 className="w-4 h-4 animate-spin text-white/40" /></div>}
              
              {!loading && scenario && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <div className="py-4 border-y border-white/5"><p className="text-sm text-white/50 font-light italic">{scenario.context}</p></div>
                  <div className="flex justify-start items-start gap-4">
                    <CamilleAvatar 
                      emotion={scenario.camille.emotions[0]?.toLowerCase() || 'neutre'} 
                      showHarshFeedback={showHarshFeedback} 
                    />

                    <div className="group relative focus:outline-none" tabIndex={0}>
                      <div className={`max-w-[100%] p-6 rounded-3xl rounded-tl-none border transition-all duration-700 ${
                        showHarshFeedback ? 'border-rose-500/50 bg-rose-500/5' : 
                        scenario.camille.isSilent ? 'bg-[var(--surface-low)] border-dashed border-[var(--border-dim)]' : 
                        'bg-indigo-500/10 border-indigo-400/20'
                      } ${
                        scenario.camille.emotions[0] === 'amusee' ? 'shadow-[0_0_20px_rgba(251,191,36,0.15)]' :
                        scenario.camille.emotions[0] === 'curieuse' ? 'shadow-[0_0_20px_rgba(167,139,250,0.15)]' :
                        scenario.camille.emotions[0] === 'pensive' ? 'shadow-[0_0_20px_rgba(56,189,248,0.15)]' : ''
                      }`}>
                        <p className={`text-lg font-light leading-relaxed ${showHarshFeedback ? 'text-rose-200' : scenario.camille.isSilent ? 'text-[var(--text-secondary)] italic' : 'text-[var(--text-primary)]'}`}>
                          {showHarshFeedback ? "Camille se recroqueville..." : scenario.camille.isSilent ? `(Camille ${scenario.camille.message.toLowerCase()})` : scenario.camille.message}
                        </p>
                        
                        <div className="mt-2 flex flex-wrap gap-1">
                          <AnimatePresence>
                            {currentReactions.map((reaction) => (
                              <motion.div 
                                key={reaction}
                                initial={{ opacity: 0, scale: 0.5, y: 5 }}
                                animate={{ opacity: 0.6, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center"
                              >
                                <span className="text-[10px] p-1 rounded bg-white/10 uppercase tracking-tighter flex items-center">
                                  {reaction === 'heart' && <Heart className="w-2 h-2 inline fill-rose-400 text-rose-400 mr-1" />}
                                  {reaction === 'thumbsup' && <ThumbsUp className="w-2 h-2 inline text-amber-400 mr-1" />}
                                  {reaction === 'star' && <Star className="w-2 h-2 inline fill-amber-300 text-amber-300 mr-1" />}
                                  {reaction === 'heart' ? 'Aimé' : reaction === 'thumbsup' ? 'Approuvé' : 'Étoilé'}
                                </span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>

                        {scenario.camille.confidence !== undefined && (
                          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                            <span className="text-[9px] uppercase tracking-widest text-white/20 font-mono italic">Index de fiabilité émotionnelle</span>
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded-full">{Math.round(scenario.camille.confidence * 100)}%</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-3 px-1">
                        <button 
                          onClick={() => setCurrentReactions(prev => prev.includes('heart') ? prev.filter(r => r !== 'heart') : [...prev, 'heart'])}
                          className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border ${currentReactions.includes('heart') ? 'text-rose-400 bg-rose-400/20 border-rose-400/50' : 'text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-rose-400 hover:border-rose-400/30'}`}
                        >
                          <Heart className={`w-3 h-3 ${currentReactions.includes('heart') ? 'fill-current' : ''}`} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Cœur</span>
                        </button>
                        <button 
                          onClick={() => setCurrentReactions(prev => prev.includes('thumbsup') ? prev.filter(r => r !== 'thumbsup') : [...prev, 'thumbsup'])}
                          className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border ${currentReactions.includes('thumbsup') ? 'text-amber-400 bg-amber-400/20 border-amber-400/50' : 'text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-amber-400 hover:border-amber-400/30'}`}
                        >
                          <ThumbsUp className={`w-3 h-3 ${currentReactions.includes('thumbsup') ? 'fill-current' : ''}`} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Super</span>
                        </button>
                        <button 
                          onClick={() => setCurrentReactions(prev => prev.includes('star') ? prev.filter(r => r !== 'star') : [...prev, 'star'])}
                          className={`flex items-center gap-1.5 p-1.5 px-3 rounded-full transition-all border ${currentReactions.includes('star') ? 'text-amber-300 bg-amber-300/20 border-amber-300/50' : 'text-[var(--text-secondary)] bg-[var(--surface-low)] border-[var(--border-dim)] hover:text-amber-300 hover:border-amber-300/30'}`}
                        >
                          <Star className={`w-3 h-3 ${currentReactions.includes('star') ? 'fill-current' : ''}`} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Étoile</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 pt-4">
                    <AnimatePresence>
                      {contextualAdvice && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="text-center p-3 bg-amber-400/10 text-amber-400 font-mono text-[10px] italic border border-amber-400/20 rounded-full"
                        >
                          {contextualAdvice}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {scenario.choices.map((choice, i) => (
                      <motion.button 
                        key={i} 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleChoice(choice)} 
                        className="w-full p-5 rounded-2xl bg-[var(--surface-low)] border border-[var(--border-dim)] hover:bg-[var(--surface-mid)] hover:border-[var(--accent)] text-left text-sm transition-all group"
                      >
                        <span className="text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{choice.text}</span>
                      </motion.button>
                    ))}
                    
                    <AnimatePresence>
                      {pendingJournalMoment && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          onClick={handleLogMoment}
                          className="w-full p-4 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-400/30 transition-all"
                        >
                          <PenLine className="w-4 h-4" />
                          Journaliser cet instant précieux
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="pt-6 border-t border-[var(--border-dim)]">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          value={userInput} 
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Écris quelque chose à Camille..."
                          className={`flex-1 bg-[var(--surface-low)] border ${userInput.length > MAX_MESSAGE_LENGTH ? 'border-rose-500/50' : 'border-[var(--border-dim)]'} rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-[var(--accent)] transition-all text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]`}
                        />
                        <button 
                          onClick={handleSendMessage}
                          disabled={loading || !userInput.trim() || userInput.length > MAX_MESSAGE_LENGTH}
                          className="p-4 bg-amber-400 text-black rounded-2xl hover:bg-amber-300 disabled:opacity-50 disabled:hover:bg-amber-400 transition-all shadow-lg shadow-amber-900/20"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center px-2">
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono italic">// La réponse de Camille dépendra de la pression ressentie (${Math.round(stats.pression)}%)</p>
                        <span className={`text-[10px] font-mono ${userInput.length > MAX_MESSAGE_LENGTH ? 'text-rose-400' : 'text-[var(--text-secondary)]'}`}>
                          {userInput.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium tracking-widest uppercase text-white/40 flex items-center gap-2">
                <Camera className="w-4 h-4" /> Galerie d'Atmosphères
              </h2>
              <p className="text-[10px] text-white/20 italic tracking-tighter uppercase px-3 py-1 bg-white/5 rounded-full border border-white/10">Capturer l'instant</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['pensive', 'neutre', 'amusee', 'revee'].map((emotion, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10"
                >
                  <img 
                    src={`https://picsum.photos/seed/${emotion}-${user?.uid || 'guest'}/400/400`} 
                    alt={emotion} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleSaveImage(emotion)}
                      className="p-3 bg-white text-black rounded-full hover:bg-amber-400 transition-all shadow-xl flex items-center gap-2 group/btn"
                    >
                      <Download className="w-4 h-4" />
                      <span className="max-w-0 overflow-hidden group-hover/btn:max-w-xs transition-all duration-500 text-[10px] font-bold uppercase tracking-widest">Sauver</span>
                    </button>
                  </div>
                </motion.div>
              ))}
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
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Nom d'affichage</label>
                  <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[var(--accent)] outline-none" placeholder="Ton nom..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">URL de la Photo</label>
                  <input type="text" value={editPhotoURL} onChange={(e) => setEditPhotoURL(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-[var(--accent)] outline-none" placeholder="https://..." />
                </div>
                {editPhotoURL && <img src={editPhotoURL} alt="" className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-[var(--accent)]" referrerPolicy="no-referrer" />}
                <div className="flex gap-3 pt-6">
                  <button onClick={() => setShowProfileSettings(false)} className="flex-1 p-4 rounded-2xl bg-white/5 text-xs tracking-widest uppercase hover:bg-white/10 transition-all">Annuler</button>
                  <button onClick={handleUpdateProfile} className="flex-1 p-4 rounded-2xl bg-[var(--accent)] text-black text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-all">{loading ? "..." : "Sauver"}</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeMoment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            {/* Visual Effects */}
            {activeMoment.visualEffect === 'golden-glimmer' && (
              <motion.div 
                animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.15)_0%,transparent_70%)]" 
              />
            )}
            {activeMoment.visualEffect === 'deep-blue-depth' && (
              <motion.div 
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ repeat: Infinity, duration: 6 }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_70%)]" 
              />
            )}
            {activeMoment.visualEffect === 'verdant-growth' && (
              <motion.div 
                animate={{ scale: [1, 1.05, 1], rotate: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 8 }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1)_0%,transparent_70%)]" 
              />
            )}

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="relative text-center max-w-lg"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 mx-auto mb-8 bg-white/10 rounded-full flex items-center justify-center border border-white/20"
              >
                <Sparkles className="w-8 h-8 text-amber-400" />
              </motion.div>
              
              <h2 className="text-4xl font-extralight tracking-widest mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic uppercase">
                {activeMoment.title}
              </h2>
              
              <p className="text-xl font-light leading-relaxed text-white/70 mb-12">
                {activeMoment.camilleThought}
              </p>
              
              <button 
                onClick={() => setActiveMoment(null)}
                className="px-12 py-4 bg-white text-black font-bold rounded-full hover:bg-amber-400 transition-all uppercase tracking-widest text-xs"
              >
                Continuer le lien
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-6 right-6 z-[300] space-y-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="p-4 bg-amber-400 text-black rounded-2xl shadow-2xl flex items-center gap-4 min-w-[200px] pointer-events-auto"
            >
              <div className="bg-black/10 p-2 rounded-lg">{notification.icon}</div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 italic">Lien synchronisé</p>
                <p className="font-bold text-sm">{notification.title}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isLienReussi && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-amber-400 backdrop-blur-3xl overflow-hidden"
          >
            {/* Celebration Particles / Shapes */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    x: Math.random() * window.innerWidth, 
                    y: Math.random() * window.innerHeight,
                    scale: 0,
                    rotate: 0
                  }}
                  animate={{ 
                    y: [null, -100, 100],
                    scale: [0, 1, 0.5],
                    rotate: [0, 180, 360],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 5, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute w-4 h-4 text-black/20"
                >
                  <Sparkles className="w-full h-full" />
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: 0.5 }}
              className="relative text-center max-w-2xl bg-black/5 p-12 rounded-[60px] border border-black/10 backdrop-blur-md"
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 mx-auto mb-10 flex items-center justify-center"
              >
                <div className="absolute inset-0 border-4 border-dashed border-black/20 rounded-full" />
                <Shield className="w-16 h-16 text-black" />
              </motion.div>
              
              <h1 className="text-6xl font-black tracking-tightest mb-6 text-black uppercase italic">
                Lien Réussi
              </h1>
              
              <p className="text-2xl font-light leading-relaxed text-black/70 mb-12 max-w-md mx-auto">
                Tu as atteint l'équilibre rare de la confiance absolue et du naturel partagé. Le mur est tombé.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-12">
                <div className="p-6 bg-black/5 rounded-3xl border border-black/5">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-black/40 mb-1">Confiance</p>
                  <p className="text-3xl font-black text-black">{Math.round(stats.confiance)}%</p>
                </div>
                <div className="p-6 bg-black/5 rounded-3xl border border-black/5">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-black/40 mb-1">Complicité</p>
                  <p className="text-3xl font-black text-black">{Math.round(stats.complicite)}%</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setIsLienReussi(false)}
                  className="px-12 py-5 bg-black text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
                >
                  Continuer à explorer
                </button>
                <button 
                  onClick={resetGame}
                  className="text-[10px] uppercase font-bold tracking-tighter text-black/40 hover:text-black transition-colors"
                >
                  Recommencer une nouvelle histoire
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGalleryOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div>
                  <h2 className="text-2xl font-light tracking-tighter flex items-center gap-3">
                    <LayoutGrid className="w-6 h-6 text-indigo-400" />
                    Ma Galerie d'Art
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-mono mt-1 italic">Archive de tes créations et inspirations</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                    <button onClick={() => setGalleryViewMode('grid')} className={`p-2 rounded-full ${galleryViewMode === 'grid' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
                    <button onClick={() => setGalleryViewMode('list')} className={`p-2 rounded-full ${galleryViewMode === 'list' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}><BookText className="w-4 h-4" /></button>
                  </div>
                  <select 
                    value={gallerySortBy} 
                    onChange={(e) => setGallerySortBy(e.target.value as 'date' | 'title')}
                    className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white uppercase tracking-widest focus:outline-none"
                  >
                    <option value="date">Date</option>
                    <option value="title">Titre</option>
                  </select>
                  <label className="cursor-pointer bg-white text-black px-6 py-3 rounded-full text-xs font-bold hover:bg-indigo-400 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {uploadingArt ? 'Synchronisation...' : 'Ajouter une œuvre'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadArtwork(file);
                      }}
                      disabled={uploadingArt}
                    />
                  </label>
                  <button onClick={() => setIsGalleryOpen(false)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                {gallery.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-white/10 space-y-6">
                    <ImagePlus className="w-24 h-24 stroke-[0.5px]" />
                    <div className="text-center">
                      <p className="text-sm font-light italic">Ta galerie est vide pour le moment.</p>
                      <p className="text-[10px] uppercase tracking-widest mt-2">Partage tes premières créations pour nourrir ton univers.</p>
                    </div>
                  </div>
                ) : (
                  <div className={`grid gap-6 ${galleryViewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {[...gallery].sort((a, b) => {
                      if (gallerySortBy === 'title') return a.title.localeCompare(b.title);
                      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                      return dateB.getTime() - dateA.getTime();
                    }).map((art) => (
                      <motion.div 
                        key={art.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`group relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 focus:outline-none ${galleryViewMode === 'grid' ? 'aspect-square' : 'flex items-center gap-6 p-4'}`}
                        tabIndex={0}
                      >
                        <img src={art.imageUrl} alt={art.title} className={`${galleryViewMode === 'grid' ? 'w-full h-full object-cover transition-transform duration-700 group-hover:scale-110' : 'w-48 h-32 rounded-2xl object-cover'} `} referrerPolicy="no-referrer" />
                        <div className={`${galleryViewMode === 'grid' ? 'absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all' : 'flex-1'}`}>
                          <h3 className="text-sm font-medium text-white truncate">{art.title}</h3>
                          {art.description && <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{art.description}</p>}
                          <div className={`mt-4 flex items-center justify-between ${galleryViewMode === 'list' && 'mt-0'}`}>
                            <span className="text-[9px] font-mono text-white/30 uppercase tracking-tighter">
                              {art.createdAt?.toDate ? art.createdAt.toDate().toLocaleDateString() : 'Instant présent'}
                            </span>
                            <button 
                              onClick={() => handleDeleteArtwork(art.id)}
                              className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Journal Modal */}
        {isJournalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-3xl"
            onClick={(e) => e.target === e.currentTarget && setIsJournalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-5xl h-[85vh] bg-[#0A0A0A] rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(251,191,36,0.05)] flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extralight tracking-tighter text-white flex items-center gap-3">
                    <BookText className="w-6 h-6 text-amber-400" />
                    Journal de Bord des Instants Partagés
                  </h2>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 mt-1">Mémoire vive des éclats de complicité et de grâce</p>
                </div>
                <button onClick={() => setIsJournalOpen(false)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                {journal.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-white/10 space-y-6">
                    <History className="w-24 h-24 stroke-[0.5px]" />
                    <div className="text-center">
                      <p className="text-sm font-light italic">Ton journal est encore vierge de souvenirs marquants.</p>
                      <p className="text-[10px] uppercase tracking-widest mt-2">Nourris ton lien avec Camille pour immortaliser vos plus beaux instants.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {journal.map((entry) => (
                      <motion.div 
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-amber-400/20 transition-all relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDeleteJournalEntry(entry.id)}
                            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="p-2 rounded-xl bg-amber-400/10 text-amber-400">
                              <PenLine className="w-4 h-4" />
                            </span>
                            <h3 className="text-lg font-light text-amber-50">{entry.title}</h3>
                          </div>
                          
                          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 italic">
                            <p className="text-xs text-white/60 leading-relaxed uppercase tracking-widest font-mono line-clamp-3">"{entry.momentSnapshot}"</p>
                          </div>
                          
                          <p className="text-sm text-white/40 leading-relaxed font-light">{entry.content}</p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                                <span className="text-[10px] font-mono text-white/60">{entry.statsAtTime?.complicite || 0}%</span>
                              </div>
                              <div className="flex items-center gap-1.5 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span className="text-[10px] font-mono text-white/60">{entry.statsAtTime?.confiance || 0}%</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                              {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Instant présent'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} loop /><audio ref={musicRef} loop />
    </div>
  );
}

function BubbleStat({ icon, label, value, color, impact, onHover }: { icon: React.ReactNode, label: string, value: number, color: string, impact?: number, onHover?: (active: boolean) => void }) {
  return (
    <div 
      className="flex items-center gap-4 cursor-help group"
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 3 + Math.random(), ease: "easeInOut" }}
        className={`${color} rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.3)] shrink-0 relative overflow-hidden`}
        style={{ 
          width: `${30 + (value * 0.3)}px`, 
          height: `${30 + (value * 0.3)}px`
        }}
      >
        <div className="absolute inset-0 bg-white/20 rounded-full blur-[1px] translate-x-[-15%] translate-y-[-15%]" />
        <div className="text-black/80">{icon}</div>
      </motion.div>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-[10px] tracking-widest uppercase text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{label}</span>
        <div className="flex items-center gap-2">
          <AnimatePresence>{impact !== 0 && impact !== undefined && <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={impact > 0 ? 'text-emerald-400' : 'text-rose-400'}>{impact > 0 ? '+' : ''}{impact}</motion.span>}</AnimatePresence>
          <span className="text-[var(--text-primary)] text-xs font-mono">{Math.round(value)}%</span>
        </div>
      </div>
    </div>
  );
}
