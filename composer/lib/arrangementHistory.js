'use strict';
/**
 * 更新挂号单状态: Paid -> Visiting
 * @param {org.xuyuntech.health.OperateArrangementAction} tx - the visiting to be processed
 * @transaction
 */
async function OperateArrangementAction(tx){
  const operate = tx.operate;
  const item = tx.arrangementHistory;
  const rh = await getAssetRegistry('org.xuyuntech.health.ArrangementHistory');
  if (operate === 'cancel') {
    item.state = 'Cancel';
    await rh.update(item);
  }
}
