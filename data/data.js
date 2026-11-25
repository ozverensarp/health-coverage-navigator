// ALL DATA BELOW IS SAMPLE / MOCK. Not real Generali Tranquilidade or AdvanceCare data.
const samplePolicy = {
  id: "sample-gt-dental", sample: true,
  name: "SAMPLE – Generali Tranquilidade Saúde Dental Plus",
  insurer: "Generali Tranquilidade", network: "AdvanceCare",
  holder: "Maria Santos (sample)", annualLimit: 500, annualUsed: 120,
  clauses: [
    { id: "3.1", treatment: "checkup", title: "Consultas e rotina", text: "Consultas de medicina dentária e destartarização (1/ano) cobertas a 100% na rede AdvanceCare.", coverage: 100, copay: 0, waitingMonths: 0, perYear: 1 },
    { id: "3.2", treatment: "filling", title: "Dentisteria", text: "Restaurações (obturações) cobertas a 80% na rede, até ao limite anual.", coverage: 80, copay: 0, waitingMonths: 3 },
    { id: "3.3", treatment: "extraction", title: "Cirurgia oral simples", text: "Extrações simples cobertas a 80% na rede; copagamento de 5 € por ato.", coverage: 80, copay: 5, waitingMonths: 3 },
    { id: "3.4", treatment: "rootcanal", title: "Endodontia", text: "Tratamento endodôntico (desvitalização) coberto a 70% na rede AdvanceCare, após carência de 6 meses.", coverage: 70, copay: 0, waitingMonths: 6 },
    { id: "3.5", treatment: "crown", title: "Prótese fixa", text: "Coroas e próteses fixas cobertas a 50%, após carência de 12 meses.", coverage: 50, copay: 0, waitingMonths: 12 },
    { id: "3.6", treatment: "whitening", title: "Estética", text: "Branqueamento e tratamentos estéticos excluídos.", coverage: 0, excluded: true },
    { id: "3.7", treatment: "implant", title: "Implantologia", text: "Implantes dentários excluídos, salvo autorização prévia da seguradora.", coverage: 0, excluded: true, needsPreauth: true },
    { id: "3.8", treatment: "ortho", title: "Ortodontia", text: "Ortodontia excluída para maiores de 18 anos.", coverage: 0, excluded: true },
  ],
  startDate: "2026-01-01",
};
const treatments = {
  checkup: { label: "Dental check-up & cleaning", kw: ["check", "consulta", "cleaning", "limpeza", "destartar", "scale"] },
  filling: { label: "Filling", kw: ["filling", "cavity", "restaura", "obtura"] },
  extraction: { label: "Tooth extraction", kw: ["extract", "extra", "pull"] },
  rootcanal: { label: "Root canal", kw: ["root canal", "root-canal", "endodont", "desvital", "canal"] },
  crown: { label: "Crown", kw: ["crown", "coroa", "bridge", "prosthe"] },
  whitening: { label: "Whitening", kw: ["whiten", "branque"] },
  implant: { label: "Dental implant", kw: ["implant"] },
  ortho: { label: "Orthodontics", kw: ["ortho", "braces", "aligner", "ortodon"] },
};
// Simulated network prices (EUR, full price before insurance)
const P = (c, r, e, f, x, cr, w, i, o) => ({ checkup: c, rootcanal: r, extraction: e, filling: f, crown: cr, whitening: w, implant: i, ortho: o });
const mk = (id, name, type, city, address, lat, lng, spec, prices, verified) =>
  ({ id, name, type, city, address, lat, lng, specialties: spec, prices, priceVerified: verified, network: "AdvanceCare (mock)" });
const providers = [
  mk("p1", "Clínica Dentária Avenidas (mock)", "clinic", "Lisboa", "Av. da República 50", 38.7367, -9.1459, ["general", "endodontics", "prosthodontics"], { checkup: 35, rootcanal: 180, extraction: 60, filling: 55, crown: 350 }, true),
  mk("p2", "Sorriso Chiado Dental (mock)", "dentist", "Lisboa", "Rua Garrett 30", 38.7106, -9.1420, ["general", "endodontics", "cosmetic"], { checkup: 40, rootcanal: 210, extraction: 70, filling: 60, crown: 380, whitening: 180 }, true),
  mk("p3", "Endo Lisboa Especialistas (mock)", "clinic", "Lisboa", "Rua Castilho 14", 38.7248, -9.1535, ["endodontics"], { rootcanal: 260, checkup: 45 }, false),
  mk("p4", "Hospital Oriente Saúde (mock)", "hospital", "Lisboa", "Parque das Nações", 38.7678, -9.0942, ["general", "oral surgery", "endodontics"], { checkup: 50, rootcanal: 240, extraction: 90, filling: 70, implant: 1200 }, true),
  mk("p5", "DentaCare Cascais (mock)", "dentist", "Cascais", "Av. Valbom 22", 38.6979, -9.4215, ["general", "endodontics"], { checkup: 38, rootcanal: 190, extraction: 65, filling: 55, crown: 360 }, true),
  mk("p6", "Clínica do Porto Dental (mock)", "clinic", "Porto", "Rua de Santa Catarina 120", 41.1496, -8.6070, ["general", "endodontics", "orthodontics"], { checkup: 32, rootcanal: 170, extraction: 55, filling: 50, crown: 330, ortho: 900 }, true),
  mk("p7", "Boavista Oral Center (mock)", "clinic", "Porto", "Av. da Boavista 900", 41.1579, -8.6291, ["general", "oral surgery", "prosthodontics"], { checkup: 36, extraction: 75, crown: 340, implant: 1100 }, false),
  mk("p8", "Sorriso Faro (mock)", "dentist", "Faro", "Rua de Santo António 15", 37.0161, -7.9350, ["general", "endodontics"], { checkup: 30, rootcanal: 165, extraction: 55, filling: 48 }, true),
  mk("p9", "Coimbra Dental Hub (mock)", "clinic", "Coimbra", "Rua Ferreira Borges 40", 40.2092, -8.4276, ["general", "endodontics"], { checkup: 30, rootcanal: 160, filling: 45, extraction: 50 }, true),
  mk("p10", "Hospital Privado Braga (mock)", "hospital", "Braga", "Av. Central 10", 41.5503, -8.4200, ["general", "oral surgery"], { checkup: 42, extraction: 80, filling: 60 }, false),
];
module.exports = { samplePolicy, treatments, providers };
