const $=(s,r=document)=>r.querySelector(s), api=(u,o)=>fetch(u,o).then(r=>r.json());
const eur=n=>n==null?"—":"€"+Number(n).toFixed(2).replace(/\.00$/,"");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let S={policies:[],meta:null,pid:null,tab:"dashboard",map:null};
const tabs={dashboard:"Dashboard",policy:"Policy analysis",providers:"Providers & map",estimate:"Cost estimate",chat:"AI chat",cases:"Broker cases"};
const pol=()=>S.policies.find(p=>p.id===S.pid);
async function init(){S.meta=await api("/api/meta");await loadPolicies();
 $("#nav").innerHTML=Object.entries(tabs).map(([k,v])=>`<button data-k="${k}">${v}</button>`).join("");
 $("#nav").onclick=e=>{if(e.target.dataset.k)go(e.target.dataset.k)};
 $("#pol").onchange=e=>{S.pid=e.target.value;go(S.tab)};go("dashboard")}
async function loadPolicies(sel){S.policies=await api("/api/policies");S.pid=sel||S.pid||S.policies[0].id;
 $("#pol").innerHTML=S.policies.map(p=>`<option value="${p.id}" ${p.id===S.pid?"selected":""}>${esc(p.name)}</option>`).join("")}
function go(t){S.tab=t;if(S.map){S.map.remove();S.map=null}
 document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.k===t));views[t]($("#main"))}
const tOpts=(all)=>(all?'<option value="">Any treatment</option>':"")+Object.entries(S.meta.treatments).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
const views={
dashboard(m){const p=pol();m.innerHTML=`<div class="grid">
<div class="card kpi"><b>${p.clauses.filter(c=>!c.excluded).length}</b><span>Covered treatments</span></div>
<div class="card kpi"><b>${p.clauses.filter(c=>c.excluded).length}</b><span>Exclusions</span></div>
<div class="card kpi"><b>${p.annualLimit!=null?eur(p.annualLimit-p.annualUsed):"?"}</b><span>Annual limit remaining</span></div></div>
<div class="card"><h3>Three questions, one place</h3><div class="grid">
<div><b>Am I covered?</b><br>Review extracted clauses in <a href="#" onclick="go('policy');return false">Policy analysis</a>.</div>
<div><b>Where can I go?</b><br>Search the network in <a href="#" onclick="go('providers');return false">Providers & map</a>.</div>
<div><b>How much will I pay?</b><br>Run <a href="#" onclick="go('estimate');return false">Cost estimate</a>.</div></div></div>
<div class="card"><h3>Ask the assistant</h3><p>Try: <i>"I need a root canal in Lisbon. Is it covered, which dentists, and how much will I pay?"</i></p><button class="p" onclick="go('chat')">Open chat</button></div>`},
policy(m){const p=pol();m.innerHTML=`<div class="card"><h3>Upload a policy (PDF)</h3><div class="drop"><input type="file" id="f" accept="application/pdf"><p id="up">Text is extracted and matched to dental treatments. Always verify extracted values.</p></div></div>
<div class="card"><h3>${esc(p.name)} ${p.sample?'<span class="tag">SAMPLE</span>':'<span class="tag warn">AUTO-EXTRACTED</span>'}</h3>
<p>Insurer: ${esc(p.insurer)} · Network: ${esc(p.network)} · Holder: ${esc(p.holder)} · Annual limit: ${eur(p.annualLimit)} (used ${eur(p.annualUsed)})</p>
<table><tr><th>Clause</th><th>Treatment</th><th>Status</th><th>Copay</th><th>Waiting</th><th>Text</th></tr>
${p.clauses.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.title)}</td><td>${c.excluded?'<span class="bad">Excluded</span>':c.coverage==null?'<span class="warn">Review</span>':`<span class="ok">${c.coverage}%</span>`}</td><td>${eur(c.copay)}</td><td>${c.waitingMonths?c.waitingMonths+" mo":"—"}</td><td>${esc(c.text)}</td></tr>`).join("")||'<tr><td colspan=6>No dental clauses found.</td></tr>'}</table></div>`;
 $("#f").onchange=async e=>{const fd=new FormData();fd.append("file",e.target.files[0]);$("#up").textContent="Analysing…";
  const r=await api("/api/policies/upload",{method:"POST",body:fd});if(r.error){$("#up").textContent=r.error;return}
  await loadPolicies(r.id);go("policy")}},
providers(m){m.innerHTML=`<div class="card"><div class="row">
<select id="c"><option value="">All cities</option>${S.meta.cities.map(c=>`<option>${c}</option>`).join("")}</select>
<select id="t">${tOpts(true)}</select>
<select id="y"><option value="">Any type</option><option value="dentist">Dentist</option><option value="clinic">Clinic</option><option value="hospital">Hospital</option></select>
<select id="s"><option value="">Any specialty</option>${S.meta.specialties.map(c=>`<option>${c}</option>`).join("")}</select>
<input id="q" placeholder="Search name/address"></div>
<div class="split"><div id="map"></div><div class="list" id="l"></div></div></div>`;
 S.map=L.map("map").setView([39.5,-8.2],6);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(S.map);
 let layer=L.layerGroup().addTo(S.map);
 const run=async()=>{const q=new URLSearchParams({city:$("#c").value,treatment:$("#t").value,type:$("#y").value,specialty:$("#s").value,q:$("#q").value});
  const ps=await api("/api/providers?"+q);layer.clearLayers();const mk={};
  ps.forEach(p=>{mk[p.id]=L.marker([p.lat,p.lng]).addTo(layer).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.address)}, ${p.city}<br>${p.specialties.join(", ")}`)});
  if(ps.length)S.map.fitBounds(L.latLngBounds(ps.map(p=>[p.lat,p.lng])).pad(.3),{maxZoom:13});
  $("#l").innerHTML=ps.map(p=>`<div class="prov" data-id="${p.id}"><b>${esc(p.name)}</b> <span class="tag">${p.type}</span><br><small>${esc(p.address)}, ${p.city} · ${p.specialties.join(", ")} · prices ${p.priceVerified?"verified":"unverified"}</small></div>`).join("")||"No providers match.";
  $("#l").onclick=e=>{const d=e.target.closest(".prov");if(d)mk[d.dataset.id].openPopup()}};
 m.querySelectorAll("select,input").forEach(i=>i.oninput=run);run()},
estimate(m){m.innerHTML=`<div class="card"><div class="row"><select id="t">${tOpts()}</select><select id="c"><option value="">All cities</option>${S.meta.cities.map(c=>`<option>${c}</option>`).join("")}</select><select id="pv"></select><button class="p" id="go">Estimate</button></div><div id="out"></div></div>`;
 const fill=async()=>{const ps=await api("/api/providers?"+new URLSearchParams({city:$("#c").value,treatment:$("#t").value}));
  $("#pv").innerHTML=ps.map(p=>`<option value="${p.id}">${esc(p.name)} (${p.city})</option>`).join("")||"<option value=''>No provider</option>"};
 $("#t").onchange=$("#c").onchange=fill;fill();
 $("#go").onclick=async()=>{const r=await api("/api/estimate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({policyId:S.pid,treatment:$("#t").value,providerId:$("#pv").value})});
  $("#out").innerHTML=estHtml(r)}},
chat(m){m.innerHTML=`<div class="card"><div class="chat" id="log"><div class="m a">Hello. Ask about coverage, providers and costs for the selected policy.</div></div>
<div class="row" style="margin-top:10px"><input id="in" style="flex:1" placeholder="I need a root canal in Lisbon. Is it covered, which dentists, how much?"><button class="p" id="send">Send</button></div><div id="ex"></div></div>`;
 const add=(c,t)=>{const d=document.createElement("div");d.className="m "+c;d.textContent=t;$("#log").append(d);$("#log").scrollTop=1e9};
 const send=async()=>{const t=$("#in").value.trim();if(!t)return;$("#in").value="";add("u",t);
  const r=await api("/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({policyId:S.pid,message:t})});
  add("a",r.reply||r.error);let h="";
  if(r.clauses?.length)h+=r.clauses.map(c=>`<div class="flag">Clause ${esc(c.id)}: ${esc(c.text)}</div>`).join("");
  if(r.providers?.length)h+="<b>Providers</b>"+r.providers.map(p=>`<div>${esc(p.name)} — ${p.city} (${eur(p.prices[r.treatment])})</div>`).join("");
  if(r.estimate)h+=estHtml(r.estimate);
  if(r.escalated)h+='<p class="warn"><b>Escalated to human broker</b></p>';$("#ex").innerHTML=h};
 $("#send").onclick=send;$("#in").onkeydown=e=>e.key==="Enter"&&send()},
async cases(m){const c=await api("/api/cases");m.innerHTML=`<div class="card"><h3>Escalated to broker</h3><table><tr><th>Time</th><th>Policy</th><th>Question</th></tr>${c.map(x=>`<tr><td>${new Date(x.at).toLocaleString()}</td><td>${esc(x.policy)}</td><td>${esc(x.question)}</td></tr>`).join("")||"<tr><td colspan=3>No escalations yet.</td></tr>"}</table></div>`}};
function estHtml(r){if(r.covered==null)return`<div class="flag">${r.flags.join("<br>")}</div>`;
 return`<div class="grid"><div class="card kpi"><span>Status</span><b class="${r.covered?"ok":"bad"}">${r.covered?"Covered":"Not covered"}</b></div>
<div class="card kpi"><span>Price</span><b>${eur(r.price)}</b></div><div class="card kpi"><span>Insurer pays</span><b>${eur(r.insurer)}</b></div><div class="card kpi"><span>Customer pays</span><b>${eur(r.customer)}</b></div></div>
${r.clause?`<p>Clause ${esc(r.clause.id)}: ${esc(r.clause.text)}</p>`:""}${r.flags.map(f=>`<div class="flag">⚠ ${esc(f)}</div>`).join("")}`}
init();
