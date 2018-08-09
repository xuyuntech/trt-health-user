'use strict';

/**
 * 用户挂号操作:  RegisterState(Null -> Init)
 * @param {org.xuyuntech.health.InitDepartment} tx - create register history
 * @transaction
 */
async function InitDepartment(tx) {
  const dep1Reg = await getAssetRegistry('org.xuyuntech.health.Department1');
  await dep1Reg.addAll(tx.department1s);
  const dep2Reg = await getAssetRegistry('org.xuyuntech.health.Department2');
  await dep2Reg.addAll(tx.department2s);
}
