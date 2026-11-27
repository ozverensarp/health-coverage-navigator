const $=s=>document.querySelector(s), api=(u,o)=>fetch(u,o).then(r=>r.json());
const post=(u,b)=>api(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
const eur=n=>n==null?"–":"€"+Number(n).toFixed(2).replace(/\.00$/,"");
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const S={meta:null,policies:[],pid:null,t:"gp",cat:"consult",city:"Lisboa",map:null,sel:null};
const pol=()=>S.policies.find(p=>p.id===S.pid);
const departments = {
 gp:['General medicine','A family doctor helps with routine check-ups, ongoing conditions and referrals. The estimate is for the visit, not any tests ordered.'],
 pediatrics:['Pediatrics','Care for infants, children and teenagers. This estimate is for a consultation; ask separately about vaccines and tests.'],
 cardiology:['Cardiology','A heart specialist reviews heart and circulation concerns. An ECG or echocardiogram is a separate service.'],
 dermatology:['Dermatology','A dermatologist examines skin, hair and nails. A biopsy or removal may have its own fee.'],
 orthopedics:['Orthopedics','This clinic assesses bones, joints and movement. Scans, physiotherapy and operations are separate services.'],
 ophthalmology:['Ophthalmology','An eye specialist checks eye health and vision. Ask whether extra tests are included in the visit fee.'],
 gynecology:['Gynecology','A specialist provides reproductive health care. This visit estimate does not cover childbirth or a hospital stay.'],
 bloodtest:['Laboratory','Blood samples are analysed here. Ask for a quote for the exact tests on your prescription.'],
 xray:['Radiology · X-ray','An X-ray produces images of a specific body area. Confirm the number of views included in the price.'],
 ultrasound:['Radiology · Ultrasound','This scan uses sound waves. Ask the imaging unit for the price for the body area on your referral.'],
 mri:['Radiology · MRI and CT','MRI and CT are different scans. Confirm which was prescribed, whether contrast is needed and whether your plan requires approval.'],
 physio:['Rehabilitation','Physiotherapists help restore movement and strength. Compare the cost of one session, not a whole course.'],
 er:['Emergency department','Urgent assessment and treatment. Tests and admission can add costs. In a medical emergency in Portugal, call 112 rather than waiting for a coverage check.'],
 surgery:['Day surgery','Patients usually go home on the day of the procedure. Ask for a written quote covering the surgeon, anaesthesia and operating theatre.'],
 hospitalization:['Inpatient wards','Patients stay overnight for care and monitoring. A nightly estimate is not the total bill; confirm room, treatment and length of stay.']
};
const friendly=new Proxy({},{get:(_,k)=>S.meta?.treatments[k]?.short||k});
async function init(){S.meta=await api("/api/meta");await load();
 $("#nav").onclick=e=>e.target.dataset.k&&go(e.target.dataset.k);
 $("#talk").onclick=()=>{$("#modal").hidden=false};$("#cx").onclick=()=>{$("#modal").hidden=true};
 $("#cs").onclick=async()=>{const r=await post("/api/contact",{name:$("#cn").value,contact:$("#cc").value,message:$("#cm").value,policyId:S.pid});
  $("#cmsg").textContent=r.ok?"Thank you. Your broker will be in touch.":(r.error||"Error");if(r.ok)setTimeout(()=>{$("#modal").hidden=true;$("#cmsg").textContent=""},1800)};
 $("#fab").onclick=()=>{$("#chat").hidden=false;$("#fab").hidden=true;$("#in").focus()};
 $("#x").onclick=()=>{$("#chat").hidden=true;$("#fab").hidden=false};
 $("#send").onclick=send;$("#in").onkeydown=e=>e.key==="Enter"&&send();
 add("a","Hello. I can tell you what your plan covers, which providers offer the service and what you would pay.");
 $("#sugg").innerHTML=["I need a root canal in Lisbon","Cardiologist in Porto","Is an MRI covered?","What are my annual limits?"].map(q=>`<button>${q}</button>`).join("");
 $("#sugg").onclick=e=>{if(e.target.tagName==="BUTTON"){$("#in").value=e.target.textContent;send()}};
 go("home")}
async function load(sel){S.policies=await api("/api/policies");S.pid=sel||S.pid||S.policies[0].id}
function add(c,t){const d=document.createElement("div");d.className="m "+c;d.textContent=t;$("#log").append(d);$("#log").scrollTop=1e9}
async function send(){const t=$("#in").value.trim();if(!t)return;$("#in").value="";add("u",t);
 const r=await post("/api/chat",{policyId:S.pid,message:t});add("a",r.reply||r.error);
 if(r.escalated)add("a","I have passed this to your broker, who will follow up. You can also use \"Talk to my broker\".")}
function go(k){if(S.map){S.map.remove();S.map=null}document.querySelectorAll("nav a").forEach(a=>a.classList.toggle("on",a.dataset.k===k));
 window.scrollTo(0,0);k==="plan"?plan($("#main")):home($("#main"))}
function home(m){m.innerHTML=`<h1>Is my treatment covered?</h1><p class="lead">Choose your treatment and city. We will show what your plan covers, where you can go and what you would pay.</p>
<div class="card"><label class="l">What kind of care?</label><div class="chips" id="cats">${Object.entries(S.meta.categories).map(([k,v])=>`<button class="chip ${k===S.cat?"on":""}" data-c="${k}">${v}</button>`).join("")}</div>
<label class="l">What do you need?</label><div class="chips" id="chips"></div><section class="department" id="dept" aria-live="polite"></section>
<label class="l" for="city">Where?</label><div class="chips"><select id="city">${S.meta.cities.map(c=>`<option ${c===S.city?"selected":""}>${c}</option>`).join("")}</select></div>
<button class="btn" id="go">Check my coverage</button></div><div id="res"></div>`;
 const drawChips=()=>{$("#chips").innerHTML=Object.entries(S.meta.treatments).filter(([k,v])=>v.cat===S.cat).map(([k,v])=>`<button class="chip ${k===S.t?"on":""}" data-k="${k}">${v.short}</button>`).join("");const d=departments[S.t];$("#dept").hidden=!d;$("#dept").innerHTML=d?`<strong>${esc(d[0])}</strong><div>${esc(d[1])}</div>`:""};
 const first=()=>Object.keys(S.meta.treatments).find(k=>S.meta.treatments[k].cat===S.cat);
 $("#cats").onclick=e=>{const c=e.target.dataset.c;if(!c)return;S.cat=c;S.t=first();document.querySelectorAll("#cats .chip").forEach(x=>x.classList.toggle("on",x.dataset.c===c));drawChips()};
 drawChips();
 $("#chips").onclick=e=>{const k=e.target.dataset.k;if(!k)return;S.t=k;drawChips()};
 $("#city").onchange=e=>S.city=e.target.value;$("#go").onclick=check;check()}
async function check(){const r=await post("/api/answer",{policyId:S.pid,treatment:S.t,city:S.city});S.r=r;
 const c=r.clause,b=r.base,best=r.providers[0];
 let cov,cls,sub;
 if(!c){cov="Not found";cls="warn";sub="Your plan does not mention this treatment. Ask your broker."}
 else if(c.excluded){cov="Not covered";cls="bad";sub=c.needsPreauth?"Only possible with prior approval from the insurer.":"This treatment is excluded from your plan."}
 else{cov=c.coverage!=null?`Covered at ${c.coverage}%`:"To be confirmed";cls=c.coverage!=null?"ok":"warn";sub=(c.waitingMonths?`Waiting period: ${c.waitingMonths} months from the start of your plan. `:"")+(c.copay?`Fixed fee of ${eur(c.copay)} per visit. `:"")+"Applies at AdvanceCare network providers."}
 const showCost=c&&!c.excluded&&best?.est.price!=null;
 $("#res").innerHTML=`<div class="steps">
 <div class="card ans ${cls}"><div class="q">1. Am I covered?</div><div class="a">${cov}</div><div class="mut">${esc(sub)}</div>${c?`<details><summary class="mut">Policy wording (clause ${esc(c.id)})</summary><p>${esc(c.text)}</p></details>`:""}</div>
 <div class="card ans"><div class="q">2. Where can I go?</div><div class="a">${r.providers.length} provider${r.providers.length===1?"":"s"}</div><div class="mut">AdvanceCare network in ${esc(S.city)} offering ${friendly[S.t].toLowerCase()}.</div></div>
 <div class="card ans ${showCost?"":"warn"}"><div class="q">3. How much will I pay?</div><div class="a">${showCost?"from "+eur(best.est.customer):c?.excluded?"Full price":"Unknown"}</div><div class="mut">${showCost?`Cheapest option for you (price ${eur(best.est.price)}, insurer pays ${eur(best.est.insurer)}).`:"Prices depend on the provider."}</div></div></div>
 ${r.providers.length?`<div class="card"><h2>Providers in ${esc(S.city)}</h2><div class="split"><div id="map"></div><div class="plist" id="pl"></div></div></div>`:`<div class="card">No providers found in ${esc(S.city)} for this treatment. Try another city.</div>`}
 <div id="detail"></div>`;
 if(r.providers.length)drawMap(r)}
function drawMap(r){S.map=L.map("map").setView([39.5,-8.2],6);L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(S.map);
 const mk={};r.providers.forEach(p=>mk[p.id]=L.marker([p.lat,p.lng]).addTo(S.map).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.address)}`));
 S.map.fitBounds(L.latLngBounds(r.providers.map(p=>[p.lat,p.lng])).pad(.4),{maxZoom:14});
 $("#pl").innerHTML=r.providers.map((p,i)=>`<div class="prov" data-id="${p.id}">${p.est.customer!=null?`<div class="pr"><b>${eur(p.est.customer)}</b><span class="mut">you pay</span></div>`:""}<b>${esc(p.name)}</b>${i===0&&p.est.customer!=null&&!r.clause?.excluded?' <span class="pill ok">Lowest cost</span>':""}<br><span class="mut">${esc(p.address)}, ${p.city}</span><br><span class="tag">${p.type}</span> ${(p.services||[]).slice(0,3).map(s=>`<span class="tag">${esc(s)}</span>`).join(" ")} ${p.priceVerified?"":'<span class="tag">price to confirm</span>'}</div>`).join("");
 $("#pl").onclick=e=>{const d=e.target.closest(".prov");if(!d)return;document.querySelectorAll(".prov").forEach(x=>x.classList.toggle("on",x===d));
  const p=r.providers.find(x=>x.id===d.dataset.id);mk[p.id].openPopup();S.map.setView([p.lat,p.lng],14);detail(p)};
 $("#pl .prov").click()}
function detail(p){const e=p.est;$("#detail").innerHTML=`<div class="card"><h2>Your estimate at ${esc(p.name)}</h2>
 ${e.price!=null?`<div class="breakdown"><div><span>Full price</span><b>${eur(e.price)}</b></div><div><span>Insurer pays</span><b>${eur(e.insurer)}</b></div><div><span>You pay</span><b>${eur(e.customer)}</b></div></div>`:`<p>No price available. Ask the clinic for a quote.</p>`}
 ${e.flags.map(f=>`<div class="note">${esc(f)}</div>`).join("")}
 ${p.type==="hospital"?`<h3>Departments at this sample hospital</h3><p>${p.specialties.map(esc).join(" · ")}</p>`:""}
 <p class="mut">${esc(p.address)}, ${p.city}. Always confirm the price with the clinic before treatment.</p>
 <button class="btn ghost" onclick="document.querySelector('#talk').click()">Ask my broker to confirm</button></div>`}
function plan(m){const p=pol();m.innerHTML=`<h1>My plan</h1><p class="lead">${esc(p.name)} ${p.sample?'<span class="pill warn">Sample</span>':""}</p>
<div class="card"><div class="breakdown"><div><span>Insurer</span><b style="font-size:17px">${esc(p.insurer)}</b></div><div><span>Network</span><b style="font-size:17px">${esc(p.network)}</b></div></div></div><div class="card"><h2>Left to use this year</h2><div class="breakdown">${p.limits?Object.entries(p.limits).map(([k,l])=>`<div><span>${S.meta.categories[k]}</span><b>${eur(l.limit-l.used)}</b><span>of ${eur(l.limit)}</span></div>`).join(""):`<div><span>Annual limit</span><b>${p.annualLimit!=null?eur(p.annualLimit-p.annualUsed):"–"}</b></div>`}</div></div>
${Object.entries(S.meta.categories).map(([cat,cl])=>{const rows=p.clauses.filter(c=>S.meta.treatments[c.treatment]?.cat===cat);return rows.length?`<div class="card"><h2>${cl}</h2><table>${rows.map(c=>`<tr><td><b>${esc(friendly[c.treatment]||c.title)}</b></td><td>${c.excluded?'<span class="pill bad">Not covered</span>':c.coverage==null?'<span class="pill warn">To confirm</span>':`<span class="pill ok">${c.coverage}% covered</span>`}</td><td class="mut">${c.waitingMonths?`Waiting period ${c.waitingMonths} months. `:""}${c.copay?`Fee ${eur(c.copay)}. `:""}${c.needsPreauth?"Needs approval. ":""}<br><small>Clause ${esc(c.id)}</small></td></tr>`).join("")}</table></div>`:""}).join("")}
<div class="card"><h2>Use your own policy</h2><div class="drop"><input type="file" id="f" accept="application/pdf"><p class="mut" id="up">Upload your policy PDF. Values are read automatically and may need your broker's confirmation.</p></div></div>`;
 $("#f").onchange=async e=>{const fd=new FormData();fd.append("file",e.target.files[0]);$("#up").textContent="Reading your policy…";
  const r=await api("/api/policies/upload",{method:"POST",body:fd});if(r.error){$("#up").textContent=r.error;return}await load(r.id);plan($("#main"))}}
init();
