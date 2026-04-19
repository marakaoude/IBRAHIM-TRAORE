import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, Smartphone, Sparkles, Shield, Wind, CheckSquare, Info } from 'lucide-react';

interface GuidesProps {
  onBack: () => void;
}

export default function Guides({ onBack }: GuidesProps) {
  const cards = [
    {
      id: 1,
      title: '✦ Les 3 lignes de code ✦',
      content: (
        <div className="flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="font-mono bg-black/5 backdrop-blur-[2px] p-10 rounded-[40px] text-2xl lg:text-3xl leading-relaxed text-left shadow-inner border border-black/5"
          >
            <span className="text-amber-600">❶</span> nePasForcer();<br />
            <span className="text-amber-600">❷</span> resterSoiMeme();<br />
            <span className="text-amber-600">❸</span> laisserLeTempsFaire();
          </motion.div>
          <div className="mt-12 opacity-80 text-xl font-light tracking-wide uppercase">
            ⚡ relation.simple() 💛
          </div>
        </div>
      ),
      badge: '💛 guide.programmation',
      style: "bg-gradient-to-br from-[#FFF3E3] to-[#FFE0B5] text-[#4a3b2c]",
    },
    {
      id: 2,
      title: '🐞 Déboguer une relation',
      content: (
        <div className="flex flex-col items-center w-full max-w-2xl px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-[60px] p-12 text-left text-xl lg:text-2xl font-medium leading-relaxed shadow-xl border border-white"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="font-bold text-red-500 uppercase text-sm tracking-widest">Runtime Error</span>
            </div>
            <p className="mb-8">« Il/elle ne répond pas assez vite »</p>
            
            <div className="h-px bg-black/5 mb-8" />
            
            <div className="space-y-4">
              <p className="font-bold text-emerald-600 uppercase text-sm tracking-widest mb-4">Patch Log :</p>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black/20" />
                <p>Vérifier la variable « pression »</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black/20" />
                <p>Lancer activité légère sans attente</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-black/20" />
                <div>
                  <p className="mb-2">Relire la documentation :</p>
                  <span className="font-mono bg-black/5 px-4 py-2 rounded-2xl text-base lg:text-lg italic border border-black/5 block">
                    "Les vrais liens ne se créent pas en un jour"
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ),
      badge: '💛 debug.affectif',
      style: "bg-gradient-to-br from-[#E8F0FE] to-[#D4E4FC] text-[#1a2c3e]",
    },
    {
      id: 3,
      title: '⚡ Fonction Secrète',
      content: (
        <div className="flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, rotate: -2 }}
            whileInView={{ opacity: 1, rotate: 0 }}
            className="font-mono bg-[#1a1a1a] text-[#c5e0b4] text-lg lg:text-xl leading-relaxed text-left rounded-[48px] p-12 shadow-3xl border border-white/5 relative group"
          >
            <div className="absolute top-6 right-8 text-amber-400/20 group-hover:text-amber-400/40 transition-colors">
              <Sparkles className="w-10 h-10" />
            </div>
            <span className="text-[#b3e0c0]">function</span> <span className="text-[#ffd966]">lienVrai</span>() {'{'}<br />
            &nbsp;&nbsp;<span className="text-[#f0a3a3]">this</span>.confiance = <span className="text-[#c5e0b4]">"gagnée petit à petit"</span>;<br />
            &nbsp;&nbsp;<span className="text-[#f0a3a3]">this</span>.complicite = <span className="text-[#c5e0b4]">"silencieuse mais réelle"</span>;<br />
            &nbsp;&nbsp;<span className="text-[#f0a3a3]">this</span>.simplicite = <span className="text-[#c5e0b4]">"préservée coûte que coûte"</span>;<br />
            &nbsp;&nbsp;<span className="text-[#f0a3a3]">return</span> <span className="text-[#ffb347]">"💛"</span>;<br />
            {'}'}
          </motion.div>
          <div className="font-mono text-xl opacity-70 mt-12 flex items-center gap-3">
            lienVrai().then(console.log) <span className="text-amber-400">// 💛</span>
          </div>
        </div>
      ),
      badge: '// programme avec le cœur',
      style: "bg-gradient-to-br from-[#1E2F26] to-[#121915] text-[#d4ecd9]",
    },
    {
      id: 4,
      title: '🎲 Défi 48h',
      content: (
        <div className="flex flex-col items-center">
          <div className="bg-black/5 p-12 rounded-[60px] mb-12 text-left text-2xl lg:text-3xl font-medium leading-relaxed space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-xl border-2 border-black/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-black/0" />
              </div>
              <span>Poser une vraie question</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-xl border-2 border-black/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-black/0" />
              </div>
              <span>Écouter sans vouloir résoudre</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-xl border-2 border-black/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-black/0" />
              </div>
              <span>Ne rien forcer</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-xl border-2 border-black/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-black/0" />
              </div>
              <span>Envoyer une phrase sincère</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-8 h-8 rounded-xl border-2 border-black/20 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-black/0" />
              </div>
              <span>Laisser un silence exister</span>
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-bold tracking-tight px-12 py-4 bg-black/5 rounded-full">
            3 cases ✅ → Le lien avance
          </div>
        </div>
      ),
      badge: '💛 48h.challenge',
      style: "bg-gradient-to-br from-[#FFF9E6] to-[#FFF2CF] text-[#5a4a2a]",
    },
    {
      id: 5,
      title: '',
      content: (
        <div className="flex flex-col items-center px-12 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-4xl lg:text-5xl font-serif italic leading-tight space-y-4"
          >
            <p className="block">« Les vrais liens</p>
            <p className="block opacity-60">ne se créent pas en un jour…»</p>
            <p className="block">ils viennent naturellement.</p>
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="my-16 text-6xl"
          >
            💛
          </motion.div>

          <div className="text-2xl lg:text-3xl font-serif italic tracking-tight relative">
            <div className="absolute -left-8 -top-8 text-6xl opacity-10">“</div>
            Même sans tout dire, <br /> on sait.
          </div>
        </div>
      ),
      badge: '✨ simplicité & confiance',
      style: "bg-gradient-to-br from-[#FEF7E8] to-[#FCE9CA] text-[#4d3a2a]",
    }
  ];

  const handleDownload = () => {
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Guide relationnel 💛</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#111;display:flex;flex-direction:column;align-items:center;padding:60px 20px;font-family:Inter,sans-serif}.gallery{display:flex;flex-direction:column;align-items:center;gap:60px;max-width:1080px;width:100%}.story-card{width:1080px;height:1080px;border-radius:80px;box-shadow:0 50px 100px -20px rgba(0,0,0,0.5);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:120px;position:relative;margin-bottom:40px;background-size:cover}@media (max-width:1120px){.story-card{width:90vw;height:90vw;padding:8vw;border-radius:12vw}}.title{font-weight:700;font-size:3.8rem;margin-bottom:3rem;letter-spacing:-0.03em}.code-block{font-family:JetBrains Mono,monospace;font-weight:500;background:rgba(0,0,0,0.05);padding:3rem 4rem;border-radius:50px;font-size:1.8rem;line-height:2.8rem;text-align:left;display:inline-block}.badge{position:absolute;bottom:60px;right:80px;font-size:1.2rem;background:rgba(255,255,245,0.2);backdrop-filter:blur(10px);padding:12px 30px;border-radius:100px;font-family:monospace;border:1px solid rgba(255,255,255,0.1);opacity:0.6}.card1{background:linear-gradient(145deg,#FFF3E3,#FFE0B5);color:#4a3b2c}.card2{background:linear-gradient(135deg,#E8F0FE,#D4E4FC);color:#1a2c3e}.card3{background:linear-gradient(125deg,#1E2F26,#121915);color:#d4ecd9}.card4{background:linear-gradient(110deg,#FFF9E6,#FFF2CF);color:#5a4a2a}.card5{background:linear-gradient(160deg,#FEF7E8,#FCE9CA);color:#4d3a2a}</style></head><body><div class="gallery"><div class="story-card card1"><div class="title">✦ Les 3 lignes de code ✦</div><div class="code-block">❶ nePasForcer();<br>❷ resterSoiMeme();<br>❸ laisserLeTempsFaire();</div><div class="badge">💛 guide.programmation</div></div><div class="story-card card2"><div class="title">🐞 Déboguer une relation</div><div style="background:rgba(255,255,255,0.9);border-radius:60px;padding:60px;width:90%;text-align:left;font-size:1.6rem;font-weight:500;box-shadow:0 20px 40px rgba(0,0,0,0.05)"><span style="font-weight:800;color:#e11d48">❌ Erreur :</span> « Il/elle ne répond pas assez vite »<br><br><span style="font-weight:800;color:#059669">✔ Patch :</span><br>• Vérifier la variable « pression »<br>• Lancer activité légère sans attente<br>• Relire la doc :<br><span style="font-family:monospace;background:#f0f0f0;padding:8px 24px;border-radius:100px;font-size:1.3rem;font-style:italic;display:block;margin-top:20px">"Les vrais liens ne se créent pas en un jour"</span></div><div class="badge">💛 debug.affectif</div></div><div class="story-card card3"><div class="title" style="color:#ffd966">⚡ Fonction Secrète</div><div class="code-block" style="background:#000;color:#c5e0b4;font-size:1.6rem;border:1px solid rgba(255,255,255,0.1)"><span style="color:#b3e0c0">function</span> <span style="color:#ffd966">lienVrai</span>() {<br>&nbsp;&nbsp;<span style="color:#f0a3a3">this</span>.confiance = <span style="color:#c5e0b4">"gagnée petit à petit"</span>;<br>&nbsp;&nbsp;<span style="color:#f0a3a3">this</span>.complicite = <span style="color:#c5e0b4">"silencieuse mais réelle"</span>;<br>&nbsp;&nbsp;<span style="color:#f0a3a3">this</span>.simplicite = <span style="color:#c5e0b4">"préservée coûte que coûte"</span>;<br>&nbsp;&nbsp;<span style="color:#f0a3a3">return</span> <span style="color:#ffb347">"💛"</span>;<br>}</div><div class="badge">programmeur_du_coeur</div></div></div></body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'L_Art_du_Lien_Guides_Stories.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-24 select-none selection:bg-amber-400/20">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.03)_0%,transparent_70%)]" />

      <header className="fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between backdrop-blur-3xl bg-black/40 border-b border-white/5">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={onBack}
          className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-[10px] tracking-widest uppercase text-white/60 group-hover:text-white transition-colors">Sortie de Session</span>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleDownload}
          className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-amber-400 text-black hover:bg-amber-300 transition-all font-bold shadow-2xl shadow-amber-900/30 active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span className="font-mono text-[10px] tracking-widest uppercase">Exporter pour Stories</span>
        </motion.button>
      </header>

      <div className="max-w-4xl mx-auto px-6 space-y-32">
        <div className="text-center space-y-8 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-mono text-[9px] tracking-[0.4em] uppercase"
          >
            <Smartphone className="w-4 h-4" />
            Format Carré 1:1 Optimized
          </motion.div>
          <h1 className="text-4xl lg:text-7xl font-light tracking-tighter">Guides Relationnels</h1>
          <p className="text-white/40 font-light max-w-xl mx-auto leading-relaxed text-lg">
            Des fondamentaux gravés pour vos stories. <br />
            Chaque carte est une étape vers la complicité vraie.
          </p>
        </div>

        <div className="space-y-40 pb-40">
          {cards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className={`relative aspect-square w-full max-w-[1080px] mx-auto rounded-[80px] shadow-[0_50px_100px_rgba(0,0,0,0.6)] group overflow-hidden flex flex-col items-center justify-center p-12 lg:p-24 text-center ${card.style}`}
            >
              <div className="absolute top-12 left-12 opacity-5 group-hover:opacity-10 transition-opacity">
                <Shield className="w-16 h-16" />
              </div>

              {card.title && (
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl lg:text-6xl font-bold tracking-tighter mb-12 leading-tight"
                >
                  {card.title}
                </motion.h2>
              )}
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                {card.content}
              </motion.div>
              
              <div className="absolute bottom-12 right-12 font-mono text-[10px] lg:text-xs tracking-[0.3em] opacity-30 uppercase border-b border-black/10 pb-1">
                {card.badge}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <footer className="text-center pb-24 space-y-4">
        <div className="w-12 h-px bg-white/10 mx-auto" />
        <p className="font-mono text-[9px] tracking-[0.5em] text-white/20 uppercase">
          L'Art du Lien • Session active
        </p>
      </footer>
    </div>
  );
}
