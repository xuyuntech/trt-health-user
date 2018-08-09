/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * 支付: 更新订单状态 NotPaid -> Paid ，生成支付记录
 * @param {org.xuyuntech.health.PayAction} paid - the paid to be processed
 * @transaction
 */
async function PayAction(paid){

  // 更新订单状态 NotPaid -> Paid
  paid.order.state = 'Paid';
  let asset_Registry = await getAssetRegistry('org.xuyuntech.health.Order');
  await asset_Registry.update(paid.order);

  var factory = getFactory();
  var NS = 'org.xuyuntech.health';

  // 生成支付记录
  var PaymentHistory = factory.newResource(NS, 'PaymentHistory', paid.id);
  PaymentHistory.spending = paid.order.spending;
  PaymentHistory.created = paid.created;
  PaymentHistory.order = paid.order;
  PaymentHistory.patient = paid.order.registerHistory.patient;

  let assetRegistry_PaymentHistory = await getAssetRegistry(NS + '.PaymentHistory');
  await assetRegistry_PaymentHistory.addAll([PaymentHistory]);


}

/**
   * 取药: 更新订单状态 Paid -> Finished, 生成出库记录
   * @param {org.xuyuntech.health.FinishAction} finish - the finish to be processed
   * @transaction
   */
async function FinishAction(finish){
  if (finish.order.state !== 'Paid') {
    throw new Error('the state is not Paid');
  }
  // 更新订单状态 Paid -> Finished
  finish.order.state = 'Finished';
  let assetRegistry = await getAssetRegistry('org.xuyuntech.health.Order');
  await assetRegistry.update(finish.order);

  var factory = getFactory();
  var NS = 'org.xuyuntech.health';

  // 生成出库记录
  var OutboundHistory = factory.newResource(NS, 'OutboundHistory', finish.id);
  OutboundHistory.created = finish.created;
  OutboundHistory.order = finish.order;
  OutboundHistory.storekeeper = finish.storekeeper;

  let asset_OutboundHistory = await getAssetRegistry(NS + '.OutboundHistory');
  await asset_OutboundHistory.addAll([OutboundHistory]);

  // 更新库存
  for (let n = 0; n < finish.order.orderItem.length; n++) {
    let MedicalItems = await getAssetRegistry('org.xuyuntech.health.MedicalItem');
    let name = finish.order.orderItem[n].medicalItem.id;
    let MedicalItem = await MedicalItems.get(name.toString());
    MedicalItem.quantity -= finish.order.orderItem[n].count;
    await MedicalItems.update(MedicalItem);
  }


}