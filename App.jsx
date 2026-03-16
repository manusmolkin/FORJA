import { useState, useEffect } from "react";

const STORAGE_KEY = "forja-data";
const API_KEY_STORAGE = "forja-api-key";

const MUSCLE_GROUPS = {
  chest: { label: "Pecho", icon: "\u{1FAC1}", color: "#E74C3C" },
  back: { label: "Espalda", icon: "\u{1F519}", color: "#3498DB" },
  shoulders: { label: "Hombros", icon: "\u{1F53A}", color: "#E67E22" },
  biceps: { label: "B\u00EDceps", icon: "\u{1F4AA}", color: "#2ECC71" },
  triceps: { label: "Tr\u00EDceps", icon: "\u{1F9BE}", color: "#1ABC9C" },
  legs: { label: "Piernas", icon: "\u{1F9B5}", color: "#9B59B6" },
  glutes: { label: "Gl\u00FAteos", icon: "\u{1F351}", color: "#F39C12" },
  abs: { label: "Abdominales", icon: "\u{1F3AF}", color: "#E91E63" },
  forearms: { label: "Antebrazos", icon: "\u270A", color: "#795548" },
};

const EXERCISE_CATALOG = {
  chest: ["Press banca", "Press inclinado", "Aperturas", "Fondos", "Press con mancuernas", "Cruces en polea"],
  back: ["Dominadas", "Remo con barra", "Remo con mancuerna", "Jal\u00F3n al pecho", "Remo en polea baja", "Pull-over"],
  shoulders: ["Press militar", "Elevaciones laterales", "Elevaciones frontales", "P\u00E1jaros", "Face pull", "Press Arnold"],
  biceps: ["Curl con barra", "Curl con mancuernas", "Curl martillo", "Curl concentrado", "Curl en polea", "Curl predicador"],
  triceps: ["Extensi\u00F3n en polea", "Press franc\u00E9s", "Fondos en banco", "Patada de tr\u00EDceps", "Extensi\u00F3n sobre cabeza", "Press cerrado"],
  legs: ["Sentadilla", "Prensa", "Extensi\u00F3n de cu\u00E1driceps", "Curl femoral", "Peso muerto rumano", "Zancadas", "Sentadilla b\u00FAlgara"],
  glutes: ["Hip thrust", "Peso muerto sumo", "Patada de gl\u00FAteo", "Abducci\u00F3n de cadera", "Puente de gl\u00FAteo"],
  abs: ["Crunch", "Plancha", "Ab wheel", "Elevaci\u00F3n de piernas", "Russian twist", "Crunch en polea"],
  forearms: ["Curl de mu\u00F1eca", "Curl reverso", "Farmer walk", "Dead hang"],
};

const CARDIO_TYPES = {
  running: { label: "Correr", icon: "\u{1F3C3}", unit: "km", secondaryUnit: "min" },
  cycling: { label: "Bicicleta", icon: "\u{1F6B4}", unit: "km", secondaryUnit: "min" },
  swimming: { label: "Nadar", icon: "\u{1F3CA}", unit: "m", secondaryUnit: "min" },
  rowing: { label: "Remo", icon: "\u{1F6A3}", unit: "m", secondaryUnit: "min" },
  jump_rope: { label: "Saltar la soga", icon: "\u23ED\uFE0F", unit: "min", secondaryUnit: "saltos" },
  elliptical: { label: "El\u00EDptica", icon: "\u{1F504}", unit: "min", secondaryUnit: "nivel" },
  hiit: { label: "HIIT", icon: "\u26A1", unit: "min", secondaryUnit: "rondas" },
  walking: { label: "Caminar", icon: "\u{1F6B6}", unit: "km", secondaryUnit: "min" },
  stairs: { label: "Escaleras", icon: "\u{1FA9C}", unit: "pisos", secondaryUnit: "min" },
};

const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
const genId = () => Math.random().toString(36).substr(2, 9);

function load() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function save(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }
function getKey() { try { return localStorage.getItem(API_KEY_STORAGE) || ""; } catch { return ""; } }
function setKey(k) { try { localStorage.setItem(API_KEY_STORAGE, k); } catch {} }

const EMPTY = { sessions: [], cardioSessions: [], customExercises: {}, coachNotes: [] };

function targets(history) {
  if (!history?.length) return null;
  const last = history.at(-1);
  const sets = last.sets || [];
  if (!sets.length) return null;
  const avg = sets.reduce((s, x) => s + x.reps, 0) / sets.length;
  const mw = Math.max(...sets.map(s => s.weight));
  let tw = mw, tr = Math.round(avg), ts = sets.length, sug = "";
  if (avg >= 12) { tw = Math.ceil((mw * 1.025) / 0.5) * 0.5; tr = 8; sug = `Subir peso a ${tw}kg. Apuntar a 8 reps.`; }
  else if (avg >= 8) { tr = Math.round(avg) + 1; sug = `Mantener ${mw}kg. Apuntar a ${tr} reps.`; }
  else if (avg >= 6) { if (sets.length < 5) { ts = sets.length + 1; sug = `Mantener ${mw}kg \u00D7 ${Math.round(avg)} reps. Agregar 1 serie (total ${ts}).`; } else { tr = Math.round(avg) + 1; sug = `Mantener ${mw}kg. Intentar ${tr} reps.`; } }
  else { tw = Math.floor((mw * 0.95) / 0.5) * 0.5; tr = 8; sug = `Reducir peso a ${tw}kg para lograr 8 reps con buena t\u00E9cnica.`; }
  return { targetWeight: tw, targetReps: tr, targetSets: ts, suggestion: sug };
}

function coachPrompt(ses, all, fb) {
  const exd = ses.exercises.map(ex => {
    const ss = ex.sets.map((s, i) => `  Serie ${i + 1}: ${s.weight}kg \u00D7 ${s.reps} reps`).join("\n");
    return `${ex.name} (${MUSCLE_GROUPS[ex.muscleGroup]?.label}):\n${ss}`;
  }).join("\n\n");
  const recent = all.slice(-5).map(s => `${formatDate(s.date)}: ${[...new Set(s.exercises.map(e => MUSCLE_GROUPS[e.muscleGroup]?.label))].join(", ")}`).join("\n");
  return `Sos un coach de fuerza e hipertrofia basado en evidencia (ACSM, NSCA, Schoenfeld et al.).
El usuario complet\u00F3 esta sesi\u00F3n:
Fecha: ${formatDate(ses.date)}
Ejercicios:\n${exd}
${ses.cardio?.length ? `Cardio: ${ses.cardio.map(c => `${CARDIO_TYPES[c.type]?.label}: ${c.primary} ${CARDIO_TYPES[c.type]?.unit}`).join(", ")}` : ""}
Sesiones recientes:\n${recent}
Comentario: "${fb}"
Respond\u00E9 en espa\u00F1ol, conciso (m\u00E1x 150 palabras). Evalu\u00E1:
1. Volumen e intensidad para fuerza/hipertrofia.
2. Recomendaciones concretas para la pr\u00F3xima sesi\u00F3n.
3. Frecuencia y recuperaci\u00F3n.
S\u00E9 directo y pr\u00E1ctico.`;
}

async function callAI(prompt, key) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.map(c => c.text || "").join("") || "Sin respuesta.";
}

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="20" fill="url(#fg)" />
      <defs><linearGradient id="fg" x1="0" y1="0" x2="100" y2="100"><stop offset="0%" stopColor="#FF6B35" /><stop offset="100%" stopColor="#D62828" /></linearGradient></defs>
      <path d="M25 65 L75 65 L70 55 L65 45 L35 45 L30 55 Z" fill="#FFF" opacity="0.95" />
      <rect x="40" y="30" width="20" height="18" rx="3" fill="#FFF" opacity="0.95" />
      <rect x="20" y="65" width="60" height="6" rx="3" fill="#FFF" opacity="0.7" />
      <circle cx="72" cy="32" r="3" fill="#FFD166" /><circle cx="78" cy="26" r="2" fill="#FFD166" opacity="0.7" /><circle cx="65" cy="28" r="1.5" fill="#FFD166" opacity="0.5" />
    </svg>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [{ id: "workout", label: "Entreno", icon: "\u{1F3CB}\uFE0F" }, { id: "cardio", label: "Cardio", icon: "\u{1F3C3}" }, { id: "progress", label: "Progreso", icon: "\u{1F4CA}" }, { id: "history", label: "Historial", icon: "\u{1F4CB}" }, { id: "settings", label: "Config", icon: "\u2699\uFE0F" }];
  return (<div style={S.tabBar}>{tabs.map(t => (<button key={t.id} onClick={() => onChange(t.id)} style={{ ...S.tab, ...(active === t.id ? S.tabActive : {}) }}><span style={{ fontSize: 18 }}>{t.icon}</span><span style={{ fontSize: 10, fontWeight: active === t.id ? 700 : 400 }}>{t.label}</span></button>))}</div>);
}

function SettingsTab({ apiKey, onApiKeyChange }) {
  const [k, setK] = useState(apiKey);
  const [saved, setSaved] = useState(false);
  const sv = () => { onApiKeyChange(k); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div style={S.page}>
      <h2 style={S.sectionTitle}>{"\u2699\uFE0F"} Configuraci\u00F3n</h2>
      <div style={S.card}>
        <h3 style={{ fontSize: 14, color: "#FF6B35", margin: "0 0 8px", fontFamily: "'Oswald', sans-serif" }}>API Key de Anthropic</h3>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 12, lineHeight: 1.5 }}>Para que el Coach IA funcione necesit\u00E1s una API key. Se guarda solo en tu dispositivo. Conseguila en <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={{ color: "#FF6B35" }}>console.anthropic.com</a></p>
        <input type="password" value={k} onChange={e => setK(e.target.value)} placeholder="sk-ant-api..." style={{ ...S.input, marginBottom: 12 }} />
        <button onClick={sv} style={{ ...S.primaryBtn, width: "100%" }}>{saved ? "\u2713 Guardada" : "Guardar API Key"}</button>
      </div>
      <div style={{ ...S.card, marginTop: 16 }}>
        <h3 style={{ fontSize: 14, color: "#E74C3C", margin: "0 0 8px", fontFamily: "'Oswald', sans-serif" }}>Borrar todos los datos</h3>
        <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Elimina todas las sesiones, cardio y notas del coach.</p>
        <button onClick={() => { if (window.confirm("\u00BFSeguro? Se borrar\u00E1n TODOS los datos.")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } }} style={{ ...S.primaryBtn, width: "100%", background: "linear-gradient(135deg, #E74C3C, #C0392B)" }}>Borrar datos</button>
      </div>
    </div>
  );
}

function WorkoutTab({ data, setData, apiKey }) {
  const [ses, setSes] = useState(null);
  const [sg, setSg] = useState(null);
  const [showFb, setShowFb] = useState(false);
  const [fb, setFb] = useState("");
  const [aiRes, setAiRes] = useState("");
  const [aiLoad, setAiLoad] = useState(false);

  const start = () => { setSes({ id: genId(), date: today(), exercises: [], cardio: [] }); setSg(null); };

  const addEx = (name, group) => {
    const hist = data.sessions.flatMap(s => s.exercises).filter(e => e.name === name);
    const tg = targets(hist);
    setSes(s => ({ ...s, exercises: [...s.exercises, { id: genId(), name, muscleGroup: group, sets: tg ? Array.from({ length: tg.targetSets }, () => ({ weight: tg.targetWeight, reps: tg.targetReps, done: false })) : [{ weight: 0, reps: 10, done: false }], targets: tg }] }));
    setSg(null);
  };

  const upSet = (eid, idx, f, v) => setSes(s => ({ ...s, exercises: s.exercises.map(ex => ex.id === eid ? { ...ex, sets: ex.sets.map((st, i) => i === idx ? { ...st, [f]: f === "done" ? v : Number(v) } : st) } : ex) }));
  const addSet = (eid) => setSes(s => ({ ...s, exercises: s.exercises.map(ex => ex.id === eid ? { ...ex, sets: [...ex.sets, { weight: ex.sets.at(-1)?.weight || 0, reps: ex.sets.at(-1)?.reps || 10, done: false }] } : ex) }));
  const rmSet = (eid, idx) => setSes(s => ({ ...s, exercises: s.exercises.map(ex => ex.id === eid ? { ...ex, sets: ex.sets.filter((_, i) => i !== idx) } : ex) }));
  const rmEx = (eid) => setSes(s => ({ ...s, exercises: s.exercises.filter(ex => ex.id !== eid) }));

  const submit = async () => {
    setAiLoad(true);
    const toSave = { ...ses, feedback: fb };
    const ns = [...data.sessions, toSave];
    const nd = { ...data, sessions: ns };
    if (apiKey) {
      try { const txt = await callAI(coachPrompt(toSave, ns, fb), apiKey); setAiRes(txt); nd.coachNotes = [...nd.coachNotes, { sessionId: toSave.id, date: toSave.date, note: txt, feedback: fb }]; }
      catch (e) { setAiRes("Error: " + e.message + "\nSesi\u00F3n guardada igualmente."); }
    } else { setAiRes("Sin API key. Sesi\u00F3n guardada. And\u00E1 a Config para activar el Coach IA."); }
    setData(nd); save(nd); setAiLoad(false);
  };

  const reset = () => { setSes(null); setShowFb(false); setFb(""); setAiRes(""); };

  if (showFb) return (
    <div style={S.page}>
      <h2 style={S.sectionTitle}>{"\u{1F4DD}"} \u00BFC\u00F3mo estuvo la sesi\u00F3n?</h2>
      {!aiRes ? (<>
        <textarea value={fb} onChange={e => setFb(e.target.value)} placeholder="Cont\u00E1 c\u00F3mo te sentiste... \u00BFPesado? \u00BFF\u00E1cil? \u00BFDolor? \u00BFDescansaste bien?" style={S.textarea} rows={5} />
        <button onClick={submit} disabled={!fb.trim() || aiLoad} style={{ ...S.primaryBtn, opacity: !fb.trim() || aiLoad ? 0.5 : 1, width: "100%", marginTop: 12 }}>{aiLoad ? "\u{1F525} Analizando..." : "Enviar al Coach IA"}</button>
      </>) : (
        <div style={S.aiCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ fontSize: 24 }}>{"\u{1F9E0}"}</span><span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700, color: "#FF6B35" }}>COACH FORJA</span></div>
          <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#E0E0E0" }}>{aiRes}</p>
          <button onClick={reset} style={{ ...S.primaryBtn, marginTop: 16, width: "100%" }}>Cerrar sesi\u00F3n \u2713</button>
        </div>
      )}
    </div>
  );

  if (!ses) {
    const last = data.sessions.at(-1);
    return (
      <div style={S.page}>
        <div style={S.heroCard}>
          <span style={{ fontSize: 48 }}>{"\u{1F525}"}</span>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, margin: "8px 0 4px" }}>\u00BFListo para forjar?</h2>
          <p style={{ fontSize: 13, color: "#AAA", margin: 0 }}>{last ? `\u00DAltima sesi\u00F3n: ${formatDate(last.date)}` : "Comenz\u00E1 a registrar tus entrenamientos"}</p>
          <button onClick={start} style={{ ...S.primaryBtn, marginTop: 16, width: "100%" }}>Iniciar sesi\u00F3n</button>
        </div>
        {data.coachNotes.length > 0 && <div style={{ marginTop: 20 }}><h3 style={S.sectionTitle}>{"\u{1F9E0}"} \u00DAltima nota del Coach</h3><div style={S.aiCard}><p style={{ fontSize: 13, lineHeight: 1.5, color: "#CCC", whiteSpace: "pre-wrap" }}>{data.coachNotes.at(-1).note}</p><p style={{ fontSize: 11, color: "#888", marginTop: 8 }}>{formatDate(data.coachNotes.at(-1).date)}</p></div></div>}
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={S.sectionTitle}>Sesi\u00F3n en curso</h2><span style={{ fontSize: 12, color: "#888" }}>{formatDate(ses.date)}</span>
      </div>
      {ses.exercises.map(ex => (
        <div key={ex.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><span style={{ fontSize: 12, color: MUSCLE_GROUPS[ex.muscleGroup]?.color, fontWeight: 700 }}>{MUSCLE_GROUPS[ex.muscleGroup]?.icon} {MUSCLE_GROUPS[ex.muscleGroup]?.label}</span><h3 style={{ margin: "4px 0 0", fontSize: 16, fontFamily: "'Oswald', sans-serif", color: "#FFF" }}>{ex.name}</h3></div>
            <button onClick={() => rmEx(ex.id)} style={S.smallBtn}>{"\u2715"}</button>
          </div>
          {ex.targets && <div style={S.targetBadge}>{"\u{1F3AF}"} {ex.targets.suggestion}</div>}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 40px 40px", gap: 6, marginBottom: 6 }}>
              <span style={S.colH}>#</span><span style={S.colH}>Kg</span><span style={S.colH}>Reps</span><span style={S.colH}>{"\u2713"}</span><span></span>
            </div>
            {ex.sets.map((set, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 40px 40px", gap: 6, alignItems: "center", marginBottom: 4, opacity: set.done ? 0.6 : 1 }}>
                <span style={{ fontSize: 13, color: "#888", textAlign: "center" }}>{idx + 1}</span>
                <input type="number" value={set.weight} onChange={e => upSet(ex.id, idx, "weight", e.target.value)} style={S.input} step="0.5" />
                <input type="number" value={set.reps} onChange={e => upSet(ex.id, idx, "reps", e.target.value)} style={S.input} />
                <button onClick={() => upSet(ex.id, idx, "done", !set.done)} style={{ ...S.checkBtn, background: set.done ? "#2ECC71" : "rgba(255,255,255,0.05)", color: set.done ? "#FFF" : "#666" }}>{"\u2713"}</button>
                <button onClick={() => rmSet(ex.id, idx)} style={S.smallBtn}>{"\u2212"}</button>
              </div>
            ))}
            <button onClick={() => addSet(ex.id)} style={S.addSetBtn}>+ Serie</button>
          </div>
        </div>
      ))}
      {!sg ? (
        <div><h3 style={{ ...S.sectionTitle, fontSize: 14, marginTop: 20 }}>Agregar ejercicio</h3>
          <div style={S.muscleGrid}>{Object.entries(MUSCLE_GROUPS).map(([k, v]) => (<button key={k} onClick={() => setSg(k)} style={S.muscleBtn}><span style={{ fontSize: 22 }}>{v.icon}</span><span style={{ fontSize: 11, color: v.color, fontWeight: 600 }}>{v.label}</span></button>))}</div></div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, marginBottom: 8 }}><button onClick={() => setSg(null)} style={S.smallBtn}>{"\u2190"}</button><h3 style={{ fontSize: 14, color: MUSCLE_GROUPS[sg].color, margin: 0, fontFamily: "'Oswald', sans-serif" }}>{MUSCLE_GROUPS[sg].icon} {MUSCLE_GROUPS[sg].label}</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{(EXERCISE_CATALOG[sg] || []).map(n => (<button key={n} onClick={() => addEx(n, sg)} style={S.exOpt}>{n}</button>))}</div>
        </div>
      )}
      {ses.exercises.length > 0 && <button onClick={() => setShowFb(true)} style={{ ...S.primaryBtn, marginTop: 24, width: "100%" }}>Finalizar sesi\u00F3n {"\u{1F525}"}</button>}
    </div>
  );
}

function CardioTab({ data, setData }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("running");
  const [p, setP] = useState("");
  const [s, setS2] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const sv = () => { const nd = { ...data, cardioSessions: [...data.cardioSessions, { id: genId(), type, primary: Number(p), secondary: Number(s), date, notes }] }; setData(nd); save(nd); setAdding(false); setP(""); setS2(""); setNotes(""); };
  const del = (id) => { const nd = { ...data, cardioSessions: data.cardioSessions.filter(c => c.id !== id) }; setData(nd); save(nd); };
  if (adding) { const ct = CARDIO_TYPES[type]; return (
    <div style={S.page}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><button onClick={() => setAdding(false)} style={S.smallBtn}>{"\u2190"}</button><h2 style={S.sectionTitle}>Registrar Cardio</h2></div>
      <label style={S.label}>Tipo</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>{Object.entries(CARDIO_TYPES).map(([k, v]) => (<button key={k} onClick={() => setType(k)} style={{ ...S.muscleBtn, border: type === k ? "2px solid #FF6B35" : "1px solid rgba(255,255,255,0.08)", background: type === k ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.03)" }}><span style={{ fontSize: 20 }}>{v.icon}</span><span style={{ fontSize: 10 }}>{v.label}</span></button>))}</div>
      <label style={S.label}>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...S.input, marginBottom: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={S.label}>{ct.unit}</label><input type="number" value={p} onChange={e => setP(e.target.value)} style={S.input} placeholder="0" step="0.1" /></div>
        <div><label style={S.label}>{ct.secondaryUnit}</label><input type="number" value={s} onChange={e => setS2(e.target.value)} style={S.input} placeholder="0" /></div>
      </div>
      <label style={S.label}>Notas</label><textarea value={notes} onChange={e => setNotes(e.target.value)} style={S.textarea} rows={2} />
      <button onClick={sv} disabled={!p} style={{ ...S.primaryBtn, marginTop: 12, width: "100%", opacity: p ? 1 : 0.5 }}>Guardar</button>
    </div>
  ); }
  const sorted = [...data.cardioSessions].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div style={S.page}>
      <h2 style={S.sectionTitle}>{"\u{1F3C3}"} Cardio</h2>
      <button onClick={() => setAdding(true)} style={{ ...S.primaryBtn, width: "100%", marginBottom: 20 }}>+ Registrar cardio</button>
      {sorted.length === 0 ? <p style={{ color: "#888", textAlign: "center", fontSize: 14 }}>Sin sesiones a\u00FAn.</p> : sorted.map(c => { const ct = CARDIO_TYPES[c.type]; return (
        <div key={c.id} style={S.card}><div style={{ display: "flex", justifyContent: "space-between" }}><div><span style={{ fontSize: 20, marginRight: 8 }}>{ct?.icon}</span><span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: "#FFF" }}>{ct?.label}</span><p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>{formatDate(c.date)}</p></div><button onClick={() => del(c.id)} style={S.smallBtn}>{"\u2715"}</button></div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}><span style={{ fontSize: 14, color: "#FF6B35", fontWeight: 700 }}>{c.primary} {ct?.unit}</span><span style={{ fontSize: 14, color: "#AAA" }}>{c.secondary} {ct?.secondaryUnit}</span></div>
          {c.notes && <p style={{ fontSize: 12, color: "#999", marginTop: 6, fontStyle: "italic" }}>{c.notes}</p>}
        </div>); })}
    </div>
  );
}

function ProgressTab({ data }) {
  const [sg, setSg] = useState(null);
  const [se, setSe] = useState(null);
  const gs = {};
  Object.keys(MUSCLE_GROUPS).forEach(g => { gs[g] = { sc: new Set(data.sessions.filter(s => s.exercises.some(e => e.muscleGroup === g)).map(s => s.id)).size }; });

  if (se && sg) {
    const hist = data.sessions.flatMap(s => s.exercises.filter(e => e.name === se).map(e => ({ ...e, date: s.date }))).sort((a, b) => a.date.localeCompare(b.date));
    const cd = hist.map(h => ({ date: h.date, mw: Math.max(...h.sets.map(s => s.weight)), vol: h.sets.reduce((sum, s) => sum + s.weight * s.reps, 0) }));
    const pk = cd.length ? Math.max(...cd.map(h => h.mw)) : 0;
    return (
      <div style={S.page}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><button onClick={() => setSe(null)} style={S.smallBtn}>{"\u2190"}</button><h2 style={{ ...S.sectionTitle, margin: 0 }}>{se}</h2></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={S.statCard}><span style={S.statV}>{pk}<span style={S.statU}>kg</span></span><span style={S.statL}>Peso m\u00E1ximo</span></div>
          <div style={S.statCard}><span style={S.statV}>{hist.length}</span><span style={S.statL}>Sesiones</span></div>
        </div>
        {cd.length > 1 && <div style={S.card}><h4 style={{ fontSize: 13, color: "#888", margin: "0 0 12px", fontFamily: "'Oswald', sans-serif" }}>PROGRESI\u00D3N DE PESO</h4><div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120 }}>{cd.map((h, i) => (<div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, color: "#AAA" }}>{h.mw}</span><div style={{ width: "100%", height: `${pk > 0 ? (h.mw / pk) * 100 : 10}%`, minHeight: 4, background: "linear-gradient(180deg, #FF6B35, #D62828)", borderRadius: 4 }} /><span style={{ fontSize: 8, color: "#666" }}>{h.date.slice(5)}</span></div>))}</div></div>}
        {hist.map((h, i) => (<div key={i} style={{ ...S.card, padding: 12 }}><div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{formatDate(h.date)}</div>{h.sets.map((s, j) => (<div key={j} style={{ fontSize: 13, color: "#CCC", display: "flex", gap: 8 }}><span style={{ color: "#888", width: 28 }}>S{j + 1}</span><span style={{ color: "#FF6B35", fontWeight: 700, width: 50 }}>{s.weight}kg</span><span>\u00D7 {s.reps}</span></div>))}</div>))}
      </div>
    );
  }
  if (sg) {
    const names = [...new Set(data.sessions.flatMap(s => s.exercises.filter(e => e.muscleGroup === sg).map(e => e.name)))];
    return (
      <div style={S.page}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><button onClick={() => setSg(null)} style={S.smallBtn}>{"\u2190"}</button><h2 style={{ ...S.sectionTitle, margin: 0, color: MUSCLE_GROUPS[sg].color }}>{MUSCLE_GROUPS[sg].icon} {MUSCLE_GROUPS[sg].label}</h2></div>
        {names.length === 0 ? <p style={{ color: "#888", textAlign: "center" }}>Sin ejercicios.</p> : names.map(n => { const h = data.sessions.flatMap(s => s.exercises.filter(e => e.name === n)); const mw = Math.max(...h.flatMap(x => x.sets.map(s => s.weight)), 0); return <button key={n} onClick={() => setSe(n)} style={S.exOpt}><span>{n}</span><span style={{ color: "#FF6B35", fontSize: 13, fontWeight: 700 }}>{mw}kg \u00B7 {h.length} ses.</span></button>; })}
      </div>
    );
  }
  const ts = data.sessions.length;
  const tv = data.sessions.reduce((sum, s) => sum + s.exercises.reduce((s2, ex) => s2 + ex.sets.reduce((s3, st) => s3 + st.weight * st.reps, 0), 0), 0);
  return (
    <div style={S.page}>
      <h2 style={S.sectionTitle}>{"\u{1F4CA}"} Progreso</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={S.statCard}><span style={S.statV}>{ts}</span><span style={S.statL}>Sesiones</span></div>
        <div style={S.statCard}><span style={S.statV}>{(tv / 1000).toFixed(1)}<span style={S.statU}>t</span></span><span style={S.statL}>Volumen total</span></div>
      </div>
      <h3 style={{ ...S.sectionTitle, fontSize: 14 }}>Grupos musculares</h3>
      <div style={S.muscleGrid}>{Object.entries(MUSCLE_GROUPS).map(([k, v]) => (<button key={k} onClick={() => setSg(k)} style={S.muscleBtn}><span style={{ fontSize: 22 }}>{v.icon}</span><span style={{ fontSize: 11, color: v.color, fontWeight: 600 }}>{v.label}</span><span style={{ fontSize: 10, color: "#888" }}>{gs[k]?.sc || 0} ses.</span></button>))}</div>
    </div>
  );
}

function HistoryTab({ data, setData }) {
  const sorted = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const del = (id) => { const nd = { ...data, sessions: data.sessions.filter(s => s.id !== id), coachNotes: data.coachNotes.filter(n => n.sessionId !== id) }; setData(nd); save(nd); };
  return (
    <div style={S.page}>
      <h2 style={S.sectionTitle}>{"\u{1F4CB}"} Historial</h2>
      {sorted.length === 0 ? <p style={{ color: "#888", textAlign: "center" }}>Sin sesiones.</p> : sorted.map(ses => {
        const grps = [...new Set(ses.exercises.map(e => e.muscleGroup))];
        const vol = ses.exercises.reduce((sum, ex) => sum + ex.sets.reduce((s, st) => s + st.weight * st.reps, 0), 0);
        const note = data.coachNotes.find(n => n.sessionId === ses.id);
        return (
          <div key={ses.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontSize: 12, color: "#888" }}>{formatDate(ses.date)}</div><div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>{grps.map(g => <span key={g} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: `${MUSCLE_GROUPS[g]?.color}22`, color: MUSCLE_GROUPS[g]?.color, fontWeight: 600 }}>{MUSCLE_GROUPS[g]?.label}</span>)}</div></div>
              <button onClick={() => del(ses.id)} style={S.smallBtn}>{"\u2715"}</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#AAA" }}>{ses.exercises.length} ejercicios \u00B7 {vol.toLocaleString()} kg</div>
            {ses.exercises.map(ex => (<div key={ex.id} style={{ marginTop: 6, paddingLeft: 8, borderLeft: `2px solid ${MUSCLE_GROUPS[ex.muscleGroup]?.color}44` }}><div style={{ fontSize: 13, color: "#DDD", fontWeight: 600 }}>{ex.name}</div><div style={{ fontSize: 12, color: "#888" }}>{ex.sets.map(s => `${s.weight}kg\u00D7${s.reps}`).join(" | ")}</div></div>))}
            {ses.feedback && <div style={{ marginTop: 8, padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 8 }}><div style={{ fontSize: 11, color: "#888" }}>{"\u{1F4AC}"} Tu comentario:</div><div style={{ fontSize: 12, color: "#BBB", fontStyle: "italic" }}>{ses.feedback}</div></div>}
            {note && <div style={{ marginTop: 8, padding: 8, background: "rgba(255,107,53,0.08)", borderRadius: 8, borderLeft: "3px solid #FF6B35" }}><div style={{ fontSize: 11, color: "#FF6B35" }}>{"\u{1F9E0}"} Coach:</div><div style={{ fontSize: 12, color: "#CCC", whiteSpace: "pre-wrap" }}>{note.note}</div></div>}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(EMPTY);
  const [tab, setTab] = useState("workout");
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => { const d = load(); if (d) setData(d); setApiKeyState(getKey()); setLoading(false); }, []);
  const handleKey = (k) => { setApiKeyState(k); setKey(k); };

  if (loading) return (<div style={S.loadingScreen}><Logo size={64} /><h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: "#FFF", margin: "16px 0 0" }}>FORJA</h1><p style={{ color: "#888", fontSize: 13 }}>Cargando...</p></div>);

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={S.header}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Logo size={32} /><span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "#FFF" }}>FORJA</span></div><span style={{ fontSize: 10, color: "#666", fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>ENTREN\u00C1 CON CIENCIA</span></div>
      <div style={S.content}>
        {tab === "workout" && <WorkoutTab data={data} setData={setData} apiKey={apiKey} />}
        {tab === "cardio" && <CardioTab data={data} setData={setData} />}
        {tab === "progress" && <ProgressTab data={data} />}
        {tab === "history" && <HistoryTab data={data} setData={setData} />}
        {tab === "settings" && <SettingsTab apiKey={apiKey} onApiKeyChange={handleKey} />}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

const S = {
  app: { fontFamily: "'Source Sans 3', sans-serif", background: "#0A0A0B", minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", color: "#E0E0E0" },
  loadingScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0A0A0B" },
  header: { padding: "16px 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,107,53,0.15)", background: "linear-gradient(180deg, rgba(255,107,53,0.06) 0%, transparent 100%)" },
  content: { flex: 1, overflowY: "auto", paddingBottom: 80 },
  page: { padding: "20px 16px" },
  tabBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, display: "flex", background: "rgba(15,15,16,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "6px 0 env(safe-area-inset-bottom, 8px)", zIndex: 100 },
  tab: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0", background: "none", border: "none", color: "#666", cursor: "pointer" },
  tabActive: { color: "#FF6B35" },
  sectionTitle: { fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, color: "#FFF", margin: "0 0 12px", letterSpacing: 0.5 },
  heroCard: { background: "linear-gradient(135deg, rgba(255,107,53,0.12), rgba(214,40,40,0.08))", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 16, padding: 24, textAlign: "center" },
  primaryBtn: { background: "linear-gradient(135deg, #FF6B35, #D62828)", color: "#FFF", border: "none", borderRadius: 12, padding: "14px 24px", fontSize: 15, fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, cursor: "pointer" },
  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, marginBottom: 10 },
  muscleGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  muscleBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, cursor: "pointer", color: "#CCC" },
  input: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#FFF", fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: "'Source Sans 3', sans-serif" },
  textarea: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "#FFF", fontSize: 14, width: "100%", boxSizing: "border-box", fontFamily: "'Source Sans 3', sans-serif", resize: "vertical" },
  label: { fontSize: 12, color: "#888", marginBottom: 4, display: "block", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Oswald', sans-serif" },
  checkBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" },
  smallBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#888", cursor: "pointer", padding: "4px 10px", fontSize: 14 },
  addSetBtn: { background: "none", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 8, color: "#888", cursor: "pointer", padding: "6px 12px", fontSize: 12, width: "100%", marginTop: 6 },
  exOpt: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, cursor: "pointer", color: "#DDD", fontSize: 14, width: "100%", textAlign: "left", fontFamily: "'Source Sans 3', sans-serif" },
  colH: { fontSize: 11, color: "#666", textAlign: "center", fontWeight: 600, textTransform: "uppercase", fontFamily: "'Oswald', sans-serif" },
  targetBadge: { marginTop: 8, padding: "8px 12px", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 8, fontSize: 12, color: "#FF6B35" },
  aiCard: { background: "linear-gradient(135deg, rgba(255,107,53,0.08), rgba(214,40,40,0.05))", border: "1px solid rgba(255,107,53,0.15)", borderRadius: 16, padding: 20 },
  statCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, textAlign: "center" },
  statV: { fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: "#FF6B35", display: "block" },
  statU: { fontSize: 14, color: "#888", fontWeight: 400 },
  statL: { fontSize: 11, color: "#888", display: "block", marginTop: 4, textTransform: "uppercase", letterSpacing: 1, fontFamily: "'Oswald', sans-serif" },
};
