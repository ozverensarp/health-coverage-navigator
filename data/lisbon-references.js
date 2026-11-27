// Self-pay examples only. Ranges use a stated scenario, never an insurer tariff.
function reference(id,name,type,address,lat,lng,specialties,source,items){
  return { id,name,type,city:'Lisboa',address,lat,lng,specialties,services:[],source,
    network:'Not confirmed for your policy',priceVerified:false,
    prices:Object.fromEntries(Object.entries(items).map(([key,[value]])=>[key,value])),
    basis:Object.fromEntries(Object.entries(items).map(([key,[,note]])=>[key,note])) };
}
module.exports=[
  reference('lis-dentisaude','Dentisaúde','dentist','Av. António Augusto de Aguiar 163, 4º Dto',38.7342,-9.1537,['dentistry'],'https://dentisaude.com.pt/precario/',{
    rootcanal:[135,'Example assumes three sessions at €45 each. The number of sessions varies; restoration is not included.'],
    filling:[50,'Uses the published starting price for cavity treatment.'],
    extraction:[60,'Example is for a normal extraction, not an impacted tooth.']}),
  reference('lis-nrd','NRD Lisboa','diagnostic','Av. Columbano Bordalo Pinheiro 11-B',38.7382,-9.1619,['radiology'],'https://www.nrd.pt/exames/ressonancia-magnetica/ressonancia-magnetica-preco',{
    mri:[275,'Published private fee for most MRI scans. Some exams cost more.']}),
  reference('lis-hcv','Hospital Cruz Vermelha','hospital','Rua Duarte Galvão 54',38.7463,-9.1749,['imaging','physiotherapy','urgent care'],'https://hospitalcruzvermelha.pt/tabela-de-precos/',{
    er:[100,'General urgent care visit only; tests, medicines and specialist calls are extra.'],physio:[50,'One physiotherapy session, excluding extra supplies.'],
    hospitalization:[335,'One night in a shared medical room only; treatment and medicines are extra.'],
    ct:[280,'Example midpoint of the published €140–€420 CT range.']})
];
