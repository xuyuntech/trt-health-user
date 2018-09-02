const bcrypt = require('bcrypt');
var log4js = require('log4js');
var logger = log4js.getLogger('API Users');
const helper = require('../../app/helper')
const db = require('../../db');

module.exports = function(app) {
  app.post('/users/resetPassword', async function(req, res) {
    const { origin_pass, new_pass, confirm_pass } = req.body;
    if (new_pass !== confirm_pass) {
      res.json({
        status: 1,
        err: '新密码与确认密码不一致'
      });
      return;
    }
    try {
      const { rows } = await db.query('select token from users where id=$1', [req.username]);
      if (rows.length !== 1) {
        logger.error(`${req.username} has more than one record in users table.`, rows);
        res.json({
          status: 1,
          err: '获取用户失败'
        });
        return;
      }
      const token = String(rows[0].token);
      if (!await bcrypt.compare(origin_pass, token)) {
        res.json({
          status: 1,
          err: '原始密码不正确',
        });
        return;
      }
      await db.query('BEGIN');
      const hashedPass = await bcrypt.hash(new_pass, 10);
      const result = await db.query('update users set token=$1 where id=$2', [hashedPass, req.username])
      logger.debug('[resetPassword] ok: ', result);
      await helper.revokeUser(req.username, req.orgname);
      await db.query('COMMIT');
      res.json({
        status: 0,
      });
    } catch (e) {
      await db.query('ROLLBACK');
      logger.error(`[resetPassword] for ${req.username} error:`, e);
      res.json({
        status: 1,
        err: '修改密码失败',
      });
    }
  });
};