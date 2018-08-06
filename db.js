'use strict';
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
const { Pool } = require('pg');

const pool = new Pool();

const SQL_CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS user_bind(
  id BIGSERIAL PRIMARY KEY,
  phone varchar(11) UNIQUE,
  email varchar(50) UNIQUE,
  nickname varchar(200),
  wx_openid varchar(200) UNIQUE,
  username varchar(200) UNIQUE
)
`;

const SQL_MIGRATES = [
  `ALTER TABLE user_bind ALTER COLUMN phone TYPE VARCHAR(11)`
]

const SQL_INSERT_USER_BIND = `
INSERT INTO user_bind(phone,email,nickname,wx_openid,username) VALUES($1,$2,$3,$4,$5) RETURNING id
`;
const SQL_DELETE_USER_BIND = `DELETE FROM user_bind where id=$1`;

async function query(sql = '', params) {
  try {
    if (Array.isArray(params)) {
      const sqlL = sql;
      logger.debug(`SQL: ${sqlL.replace(/\$(\d)/mg, (a, b) => params[Number(b) - 1])}`);
      return await pool.query(sql, params);
    } else {
      logger.debug(`SQL: ${sql}`);
      return await pool.query(sql);
    }
  } catch (e) {
    logger.error('DB Query err: ', e);
    throw e;
  }
}


async function initDB() {
  logger.info('start to init db...');
  try {
    await query(SQL_CREATE_TABLE);
  } catch (e) {
    logger.error('create table user_bind err: %s', e);
    return;
  }
  logger.info('init db ok...');
  try {
    await migrateDB();
  } catch (e) {
    logger.error('migrate db err: %s', err);
    return;
  }
  logger.info('migrate db ok...');
}
async function migrateDB() {
  try {
    for (let i = 0; i< SQL_MIGRATES.length; i += 1) {
      await pool.query(SQL_MIGRATES[i]);
    }
  } catch (err) {
    throw err;
  }
}
// type: PHONE|EMAIL|USERNAME|WX_OPENID
async function createUser({type, value = null, nickname = null}) {
  logger.info(`create user for type: ${type}, value: ${value}, nickname: ${nickname}`);
  let phone = null;
  let email = null;
  let wx_openid = null;
  let username = null;
  switch(type) {
    case 'PHONE':
      phone = value;
      break;
    case 'WX_OPENID':
      wx_openid = value;
      break;
    default:
  }
  try {
    await query('BEGIN');
    const {rows} = await query(SQL_INSERT_USER_BIND, [phone, email, nickname, wx_openid, username]);
    await query('COMMIT');
    return rows[0].id;
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
  return null;
}

module.exports = {
  query,
  initDB,
  migrateDB,
  createUser,
};