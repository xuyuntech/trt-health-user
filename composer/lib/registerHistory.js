'use strict';

/**
 * 用户挂号操作:  RegisterState(Null -> Init)
 * @param {org.xuyuntech.health.InitRegisterAction} tx - create register history
 * @transaction
 */
async function InitRegisterAction(tx) {
  const factory = getFactory();
  const patient = getCurrentParticipant();
  if (patient.getFullyQualifiedType() !== 'org.xuyuntech.health.Patient') {
    throw new Error(`Current participant is not a patient, got (${patient.getFullyQualifiedType()})`);
  }
  const patientID = patient.name;
  const arrangement = tx.arrangementHistory;
  const arrangementID = arrangement.id;
  const registerHistory = factory.newResource('org.xuyuntech.health', 'RegisterHistory', `${patientID}-${arrangementID}`);
  registerHistory.state = 'Init';
  registerHistory.number = tx.number;
  registerHistory.diseaseInfo = tx.diseaseInfo;
  registerHistory.visitor = tx.visitor;
  registerHistory.type = tx.type;
  registerHistory.arrangementHistory = arrangement;
  registerHistory.patient = patient;
  registerHistory.hospital = arrangement.hospital;
  registerHistory.doctor = arrangement.doctor;
  registerHistory.patientName = patient.realName;
  registerHistory.visitorName = tx.visitor.realName;
  registerHistory.doctorName = arrangement.doctor.realName;
  registerHistory.hospitalName = arrangement.hospital.name;
  registerHistory.visitDate = arrangement.visitDate;
  registerHistory.visitTime = arrangement.visitTime;
  const registry_RegisterHistory = await getAssetRegistry('org.xuyuntech.health.RegisterHistory');
  await registry_RegisterHistory.addAll([registerHistory]);
  const {hospital} = arrangement;
  if (!hospital.reservationQuantity) {
    hospital.reservationQuantity = 0;
  }
  hospital.reservationQuantity += 1;
  const hospitalRegistry = await getAssetRegistry('org.xuyuntech.health.Hospital');
  await hospitalRegistry.update(hospital);
  const {doctor} = arrangement;
  if (!doctor.reservationQuantity) {
    doctor.reservationQuantity = 0;
  }
  doctor.reservationQuantity += 1;
  const doctorRegistry = await getParticipantRegistry('org.xuyuntech.health.Doctor');
  await doctorRegistry.update(doctor);
}

/**
 * 支付挂号费:  Init-> Paid
 * @param {org.xuyuntech.health.PayRegisterAction} tx - the visiting to be processed
 * @transaction
 */
async function PayRegisterAction(tx) {
  const item = tx.registerHistory;
  console.log('PayRegisterAction:', item);
  item.state = 'Paid';
  const registry_RegisterHistory = await getAssetRegistry('org.xuyuntech.health.RegisterHistory');
  await registry_RegisterHistory.update(item);
}
/**
 * 更新挂号单状态: Paid -> Visiting
 * @param {org.xuyuntech.health.VerifyRegisterAction} tx - the visiting to be processed
 * @transaction
 */
async function verifyRegisterHistoryAction(tx){
  const item = tx.registerHistory;
  const hospital = tx.registerHistory.hospital;
  if (item.state !== 'Paid') {
    throw new Error('the state is not Paid');
  }
  console.log('verifyRegisterHistoryAction:', item);
  item.state = 'Visiting';
  const registry_RegisterHistory = await getAssetRegistry('org.xuyuntech.health.RegisterHistory');
  await registry_RegisterHistory.update(item);
  // update hospital reservationQuantity
  // 这步操作在 InitRegisterAction 里做了
  // const pr = await getParticipantRegistry('org.xuyuntech.health.Hospital');
  // hospital.reservationQuantity += 1;
  // await pr.update(hospital);
}
/**
 * 更新挂号单状态: Visiting -> Finish
 * @param {org.xuyuntech.health.FinishRegisterAction} tx - the visiting to be processed
 * @transaction
 */
async function FinishRegisterAction(tx) {
  tx.registerHistory.state = 'Finished';
  const registry_RegisterHistory = await getAssetRegistry('org.xuyuntech.health.RegisterHistory');
  await registry_RegisterHistory.update(tx.registerHistory);
}
// async function finishRegisterHistoryAction1(tx) {
//   var factory = getFactory();
//   var NS = 'org.xuyuntech.health';
//   var date = new Date();
//   const item = tx.registerHistory;
//   console.log('verifyRegisterHistoryAction:', item);
//   const patient = tx.registerHistory.patient;
//   // TODO 校验 state 必须为 Visiting
//   if (item.state !== 'Visiting') {
//     throw new Error('the state is not visiting');
//   }
//   //病例创建
//   // var key = patient.name + date.toLocaleDateString();
//   var CaseItem = factory.newResource(NS, 'CaseItem', tx.id);
//   CaseItem.complained = tx.complained;
//   CaseItem.diagnose = tx.diagnose;
//   CaseItem.history = tx.history;
//   CaseItem.familyHistory = tx.familyHistory;
//   CaseItem.created = tx.created;
//   let assetRegistry_CaseItem = await getAssetRegistry(NS + '.CaseItem');
//   await assetRegistry_CaseItem.addAll([CaseItem]);
//   //处方创建
//   var Prescription = factory.newResource(NS, 'Prescription', tx.id);
//   Prescription.created = tx.created;
//   Prescription.registerHistory = item;
//   Prescription.medicallistform = tx.medicallistform;
//   Prescription.caseItem = factory.newRelationship(NS, 'CaseItem', tx.id);
//   let assetRegistry_Prescription = await getAssetRegistry(NS + '.Prescription');
//   await assetRegistry_Prescription.addAll([Prescription]);

//   var spending_all = 0;
//   for (let index = 0; index < tx.medicallistform.length; index++) {
//     var OrderItem = factory.newResource(NS, 'OrderItem', tx.id + '_' + index.toString());
//     OrderItem.medicalItem = tx.medicallistform[index].medicalItem;
//     OrderItem.count = tx.medicallistform[index].count;
//     OrderItem.spending = tx.medicallistform[index].count * tx.medicallistform[index].medicalItem.price;
//     spending_all +=  OrderItem.spending;
//     let assetRegistry_OrderItem = await getAssetRegistry(NS + '.OrderItem');
//     await assetRegistry_OrderItem.addAll([OrderItem]);
//   }


//   var Order = factory.newResource(NS, 'Order', tx.id);
//   Order.spending = spending_all;
//   Order.state = 'NotPaid';
//   Order.created = tx.created;
//   var items = [];
//   for (let index = 0; index <  tx.medicallistform.length; index++) {
//     items.push(factory.newRelationship(NS, 'OrderItem',tx.id + '_' + index.toString()));
//   }
//   Order.orderItem  = items;
//   Order.registerHistory = tx.registerHistory;
//   let assetRegistrystate_order = await getAssetRegistry(NS + '.Order');
//   await assetRegistrystate_order.addAll([Order]);

//   item.state = 'Finished';
//   const registry = await getAssetRegistry('org.xuyuntech.health.RegisterHistory');
//   await registry.update(item);

//   patient.points += tx.points;
//   const registry_Patient = await getParticipantRegistry('org.xuyuntech.health.Patient');
//   await registry_Patient.update(patient);
// }
