const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const { samplePolicy, treatments, categories, providers } = require("./data/data");
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15e6 } });
app.use(express.json());
app.use(express.static("public"));
const policies = new Map([[samplePolicy.id, samplePolicy]]);
const cases = []; // broker escalations

const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function detectTreatment(q) {
  const n = norm(q);
  for (const [k, t] of Object.entries(treatments)) if (t.kw.some(w => n.includes(norm(w)))) return k;
  return null;
}
const cities = [...new Set(providers.map(p => p.city))];
function detectCity(q) { const n = norm(q); return cities.find(c => n.includes(norm(c))) || (n.includes("lisbon") ? "Lisboa" : null); }

// Heuristic extraction from PDF text
function extractPolicy(text, filename) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const clauses = [];
  for (const [k, t] of Object.entries(treatments)) {
    const line = lines.find(l => t.kw.some(w => norm(l).includes(norm(w))));
    if (!line) continue;
    const pct = line.match(/(\d{1,3})\s*%/);
    const excluded = /exclu|not covered|nao coberto/.test(norm(line));
    const cop = line.match(/(\d+(?:[.,]\d+)?)\s*(?:€|eur)/i);
    const wait = line.match(/(\d+)\s*(?:meses|months)/i);
    clauses.push({ id: "PDF", treatment: k, title: t.label, text: line.slice(0, 300), coverage: excluded ? 0 : pct ? +pct[1] : null, copay: cop ? parseFloat(cop[1].replace(",", ".")) : 0, waitingMonths: wait ? +wait[1] : 0, excluded, needsReview: !excluded && !pct });
  }
  const lim = text.match(/(?:limite anual|annual limit|capital)[^\d]{0,40}(\d[\d. ]*)/i);
  return {
    id: "up-" + Date.now(), sample: false, name: filename, insurer: /generali|tranquilidade/i.test(text) ? "Generali Tranquilidade" : "Unknown (check)",
    network: /advancecare/i.test(text) ? "AdvanceCare" : "Unknown (check)", holder: "—",
    annualLimit: lim ? parseInt(lim[1].replace(/[. ]/g, "")) : null, annualUsed: 0, clauses, startDate: null,
    extractedAutomatically: true, textLength: text.length,
  };
}

function limitFor(policy, treatment) {
  const cat = treatments[treatment]?.cat;
  if (policy.limits?.[cat]) return policy.limits[cat];
  if (policy.annualLimit != null) return { limit: policy.annualLimit, used: policy.annualUsed || 0 };
  return null;
}
function estimate(policy, treatment, providerId) {
  const clause = policy.clauses.find(c => c.treatment === treatment);
  const prov = providers.find(p => p.id === providerId);
  const flags = [];
  if (prov?.source) flags.push(prov.basis[treatment] + " Private-price illustration; network eligibility and reimbursement are not confirmed.");
  if (!policy.sample) flags.push("Policy values were extracted automatically from PDF; verify against the original.");
  if (!clause) return { covered: null, flags: ["No clause found for this treatment in the policy. Confirm with insurer."] , clause: null };
  const price = prov?.prices[treatment];
  if (clause.excluded) {
    flags.push(clause.needsPreauth ? "Excluded unless insurer pre-authorisation is granted." : "Treatment excluded by the policy.");
    return { covered: false, clause, price: price ?? null, insurer: 0, customer: price ?? null, flags, provider: prov };
  }
  if (clause.coverage == null) return { covered: null, clause, price, flags: [...flags, "Coverage percentage unknown; no split can be calculated."] };
  if (clause.waitingMonths) flags.push(`Waiting period of ${clause.waitingMonths} months from policy start${policy.startDate ? ` (${policy.startDate})` : ""}.`);
  if (price == null) { flags.push(prov ? "Provider has no price on file for this treatment; request a quote." : "Select a provider to estimate cost."); return { covered: true, clause, price: null, flags, provider: prov }; }
  if (!prov.priceVerified) flags.push("Provider pricing is unverified; confirm with the provider.");
  if (clause.needsPreauth) flags.push("Pre-authorisation required.");
  const pct = clause.coverage ?? 0;
  let ins = Math.max(0, price * pct / 100 - (clause.copay || 0));
  const lim = limitFor(policy, treatment);
  const remaining = lim ? Math.max(0, lim.limit - lim.used) : null;
  if (remaining != null && ins > remaining) { ins = remaining; flags.push(`Annual limit nearly exhausted: only €${remaining} remaining.`); }
  ins = Math.round(ins * 100) / 100;
  flags.push("Simulated estimate for illustration. Not a binding quote.");
  return { covered: true, clause, price, insurer: ins, customer: Math.round((price - ins) * 100) / 100, flags, provider: prov, remainingLimit: remaining };
}

function search({ city, treatment, type, specialty, q }) {
  return providers.filter(p =>
    (!city || p.city === city) && (!type || p.type === type) &&
    (!specialty || p.specialties.includes(specialty)) &&
    (!treatment || p.prices[treatment] != null) &&
    (!q || norm(p.name + p.address).includes(norm(q))));
}

app.get("/api/meta", (req, res) => res.json({ treatments, categories, cities, specialties: [...new Set(providers.flatMap(p => p.specialties))], llm: !!process.env.ANTHROPIC_API_KEY }));
app.get("/api/policies", (req, res) => res.json([...policies.values()]));
app.post("/api/policies/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const data = await pdf(req.file.buffer);
    if (!data.text.trim()) return res.status(422).json({ error: "No text found in PDF (scanned?). OCR not supported yet." });
    const p = extractPolicy(data.text, req.file.originalname);
    policies.set(p.id, p); res.json(p);
  } catch (e) { res.status(422).json({ error: "Could not read PDF: " + e.message }); }
});
app.get("/api/providers", (req, res) => res.json(search(req.query)));
app.post("/api/estimate", (req, res) => {
  const { policyId, treatment, providerId } = req.body;
  const pol = policies.get(policyId); if (!pol) return res.status(404).json({ error: "Policy not found" });
  res.json(estimate(pol, treatment, providerId));
});
app.post("/api/answer", (req, res) => {
  const { policyId, treatment, city } = req.body;
  const pol = policies.get(policyId); if (!pol) return res.status(404).json({ error: "Policy not found" });
  const clause = pol.clauses.find(c => c.treatment === treatment) || null;
  const list = search({ city, treatment }).map(p => ({ ...p, est: estimate(pol, treatment, p.id) }));
  list.sort((a, b) => (a.est.customer ?? 1e9) - (b.est.customer ?? 1e9));
  res.json({ clause, treatment, city, base: estimate(pol, treatment), providers: list, policy: { name: pol.name, sample: pol.sample, limits: pol.limits, annualLimit: pol.annualLimit, annualUsed: pol.annualUsed, startDate: pol.startDate } });
});
app.post("/api/contact", (req, res) => {
  const { name, contact, message, policyId } = req.body;
  if (!name || !contact) return res.status(400).json({ error: "Name and contact required" });
  cases.push({ at: new Date().toISOString(), policy: policies.get(policyId)?.name || "-", question: `[Contact request] ${name} (${contact}): ${message || ""}` });
  res.json({ ok: true });
});
app.get("/api/cases", (req, res) => res.json(cases));

app.post("/api/chat", async (req, res) => {
  const { policyId, message } = req.body;
  const pol = policies.get(policyId); if (!pol) return res.status(404).json({ error: "Policy not found" });
  const treatment = detectTreatment(message), city = detectCity(message);
  if (!treatment) {
    let reply = "I could not tell which treatment you mean. I can answer about: " + Object.values(treatments).map(t => t.label).join(", ") + ".";
    if (/limit|limite|annual/i.test(message)) {
      const lims = pol.limits ? Object.entries(pol.limits).map(([k, l]) => `${categories[k]}: €${l.limit - l.used} left of €${l.limit}`) : pol.annualLimit != null ? [`€${pol.annualLimit - pol.annualUsed} left of €${pol.annualLimit}`] : [];
      if (lims.length) reply = "Your annual limits: " + lims.join("; ") + ".";
    }
    const escalate = !/limit|limite|annual/i.test(message);
    if (escalate) cases.push({ at: new Date().toISOString(), policy: pol.name, question: message });
    return res.json({ reply: reply + (escalate ? " I have flagged this question for a human broker." : ""), escalated: escalate, clauses: [], providers: [] });
  }
  const provs = search({ city, treatment }).slice(0, 5);
  const est = provs[0] ? estimate(pol, treatment, provs[0].id) : estimate(pol, treatment);
  const c = est.clause;
  let reply;
  if (!c) reply = `I found no clause for ${treatments[treatment].label} in this policy.`;
  else if (c.excluded) reply = `${treatments[treatment].label} is excluded (clause ${c.id}).${c.needsPreauth ? " It may be possible with prior insurer authorisation." : ""}`;
  else reply = `${treatments[treatment].label} is covered at ${c.coverage ?? "an unclear"}% on the network (clause ${c.id})${c.waitingMonths ? `, with a ${c.waitingMonths}-month waiting period` : ""}.`;
  if (c && !c.excluded && est.customer != null && provs.length) reply += ` Illustrative calculation assuming network benefits apply: ${provs.length} example provider(s) found${city ? " in " + city : ""}. At ${provs[0].name}, price €${est.price}: insurer pays about €${est.insurer}, you pay about €${est.customer}.`;
  else if (c && !c.excluded) reply += ` No matching providers${city ? " in " + city : ""}.`;
  if (est.provider?.source) reply += ' ' + est.provider.basis[treatment];
  const escalated = !c || c.needsReview || c.coverage == null || c.needsPreauth || !policy_ok(pol) || (provs[0] && !provs[0].priceVerified);
  if (escalated) { reply += " Some points need confirmation, so I flagged this for a human broker."; cases.push({ at: new Date().toISOString(), policy: pol.name, question: message }); }
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5", max_tokens: 500, system: "You assist insurance brokers. Answer ONLY from the provided facts; cite clause ids; say when unsure.", messages: [{ role: "user", content: `Facts:\n${JSON.stringify({ clauses: pol.clauses, annualLimit: pol.annualLimit, estimate: est, draft: reply })}\n\nQuestion: ${message}` }] }) });
      const j = await r.json(); if (j.content?.[0]?.text) reply = j.content[0].text;
    } catch {}
  }
  res.json({ reply, escalated, clauses: c ? [c] : [], providers: provs, estimate: est, treatment, city });
});
function policy_ok(p) { return p.sample || false; }

app.listen(process.env.PORT||8080, "0.0.0.0", () => console.log("up"));
