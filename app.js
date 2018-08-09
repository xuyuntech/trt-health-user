/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
require('dotenv').config();
var log4js = require('log4js');
var logger = log4js.getLogger('SampleWebApp');
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');
const redis = require('redis');
const bcrypt = require('bcrypt');

const db = require('./db');
const bfetch = require('./bfetch');

require('./config.js');
var hfc = require('fabric-client');

var helper = require('./app/helper.js');
var createChannel = require('./app/create-channel.js');
var join = require('./app/join-channel.js');
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');

const clientID = process.env.WX_CLIENTID;
const clientSecret = process.env.WX_CLIENT_SECRET;
const redisURL = process.env.REDIS_URL;

if (!clientID || !clientSecret) {
	logger.error('clientID and clientSecret does not set.');
	process.exit(1);
}

let redisClient = null;

async function createRedisClient() {
	return new Promise((resolve, reject) => {
		if (redisClient) {
			resolve(redisClient);
			return;
		}
		const client = redis.createClient(redisURL, {
			retry_strategy: function(options) {
				if (options.error && options.error.code === 'ECONNREFUSED') {
					return new Error('The server refused the connection');
				}
				if (options.total_retry_time > 1000 * 60 * 60) {
					return new Error('Retry time exhausted');
				}
				if (options.attempt > 10) {
					return undefined;
				}
				return Math.min(options.attempt * 100, 3000);
			}
		});
		client.on('error', function(error) {
			logger.error('redis connect err: ', error);
			redisClient = null;
			reject(error);
		})
		client.on('end', function() {
			redisClient = null;
			logger.debug('redis end.');
			reject('redis end');
		});
		client.on('ready', function(){
			logger.info('redis connected.');
			client.select('1', function(error){
				if (error) {
					logger.error('redis select db err: ', error);
					process.exit(1);
					return;
				}
				redisClient = client;
				resolve(client);
			})
		});
	});
}
createRedisClient();
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
const urlsIgnoreAuth = ['/users', '/users/login', '/users/verifyCode'];
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
// set secret variable
app.set('secret', 'thisismysecret');
app.use(expressJWT({
	secret: 'thisismysecret'
}).unless({
	path: urlsIgnoreAuth
}));
app.use(bearerToken());
app.use(function(req, res, next) {
	logger.debug(' ------>>>>>> new request for %s',req.originalUrl);
	if (urlsIgnoreAuth.indexOf(req.path) >= 0
		// req.originalUrl.indexOf('/users') >= 0
		// || req.originalUrl.indexOf('/user/login') >= 0
		// || req.originalUrl.indexOf('/users/verifyCode') >= 0
	) {
		return next();
	}

	var token = req.token;
	jwt.verify(token, app.get('secret'), function(err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /users call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {
	db.initDB();
});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(msg) {
	var response = {
		status: 1,
		message: msg
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.post('/users/verifyCode', async function(req, res){
	const { phone } = req.body;
	if (!/^1\d{10}$/.test(phone)) {
		res.json(getErrorMessage('phone'));
		return;
	}
	const code = `${Math.round(Math.random()*1000000)}`;
	try {
		// todo 发短信
		// 存储 code 到 redis
		const client = await createRedisClient();
		client.set(phone, code, 'EX', 60 * 5, function(err) {
			if (err) {
				res.json({
					status: 1,
					err,
				})
				return;
			}
			res.json({
				status:0,
				code,
			});
		});
	} catch (e) {
		logger.error('send verifyCode err: ', e);
		res.json({
			status: 1,
			err: e,
		});
	}
});
async function checkVerifyCode(phone, code) {
	return new Promise(async (resolve, reject) => {
		const client = await createRedisClient();
		client.get(phone, function(err, reply){
			console.log('---->', err, reply, arguments);
			if (err) {
				reject(err);
				return;
			}
			resolve(reply);
		});
	});
}
// API 绑定手机号，通过 token 获取用户 id
// API 更新微信 openid，通过 token 获取用户 id
// API 注册用户，1. 通过手机号， 2. 通过微信，返回 token
app.post('/users/login', async function(req, res) {
	const { type } = req.query;
	const { username, password, phone, verifyCode, orgName, wx_code } = req.body;
	let uname = null;
	if (!orgName) {
		res.json(getErrorMessage('请提供组织名称'));
		return;
	}
	try {
		switch(type) {
			case 'password':
			{
				if (!username) {
					res.json(getErrorMessage('请输入用户名'));
					return;
				}
				if (!password) {
					res.json(getErrorMessage('请输入密码'));
					return;
				}
				const { rows } = await db.query(`select username from user_bind where username=$1`, [username]);
				if (rows.length !== 1) {
					res.json({
						status: 1,
						err: `账号 ${username} 不存在`
					});
					return;
				}
				uname = rows[0].username;
				const usersResult = await db.query('select id,token from users where id=$1', [username])
				if (usersResult&&usersResult.rows&&usersResult.rows.length !== 1) {
					res.json({
						status: 1,
						err: `账号 ${username} 不存在链上数据`
					});
					return;
				}
				const passwordHashed = String(usersResult.rows[0].token);
				const ok = await bcrypt.compare(password, passwordHashed)
				if (!ok) {
					res.json({
						status: 1,
						err: '用户名密码不匹配'
					});
					return;
				}
				break;
			}
			case 'phone':
			{
				if (!phone) {
					res.json(getErrorMessage('请输入手机号'));
					return;
				}
				if (!verifyCode) {
					res.json(getErrorMessage('请输入 6 位验证码'));
					return;
				}
				const { rows } = await db.query(`select id from user_bind where phone=$1`, [phone]);
				if (rows.length !== 1) {
					res.json({
						status: 1,
						err: `账号 ${phone} 不存在`
					});
					return;
				}
				uname = rows[0].username;
				if (`${verifyCode}` !== await checkVerifyCode(phone)) {
					res.json({
						status: 1,
						err: '验证码不正确'
					});
				}
				break;
			}
			case 'wx':
			{
				break;
			}
		}

		if (!uname) {
			res.json({
				status: 1,
				err: '登录失败, 未获取到用户'
			});
			return;
		}
		res.json({
			status: 0,
			result: {
				token: generateToken({ username: uname, orgName }, app.get('secret')),
			}
		});
	} catch (e) {
		res.json({
			status: 1,
			err: `${e}`
		})
	}
});
function generateToken({
	username,
	orgName
}, secret) {
	logger.debug('generateToken username: %s, orgName: %s', username, orgName);
	return jwt.sign({
		exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
		username: username,
		orgName: orgName
	}, secret);
}
async function registerUser(regData){
	const { phone = null, email = null, wx_openid = null, username = null, password, nickname = null, orgName } = regData;
	try {
		await db.query('BEGIN');
		const {rows} = await db.query('INSERT INTO user_bind(phone,email,nickname,wx_openid,username) VALUES($1,$2,$3,$4,$5) RETURNING username', [phone, email, nickname, wx_openid, username]);
		if (rows.length !== 1) {
			throw new Error(`insert err: ${rows}`);
		}
		const uname = rows[0].username;
		let response = await helper.getRegisteredUser(uname, password, orgName, true);
		logger.debug('-- returned from registering the username %s phone %s for organization %s',uname, phone,orgName);
		if (response && typeof response !== 'string') {
			logger.debug('Successfully registered the username %s phone %s for organization %s',uname, phone,orgName);
			await db.query('COMMIT');
			return uname;
		} else {
			logger.debug('Failed to register the username %s phone %s for organization %s with::%s',uname, phone,orgName,response);
			throw response;
		}
	} catch (e) {
		await db.query('ROLLBACK');
		throw e;
	}
}
app.post('/users', async function(req, res) {
	const { type } = req.query;
	const { username, password, phone, verifyCode, orgName, wx_code } = req.body;
	let regData = null;
	let tName = null;
	let tValue = null;
	switch(type) {
		case 'password':
			//todo validation username and password
			if (!username) {
				res.json(getErrorMessage('请输入用户名'));
				return;
			}
			if (!password) {
				res.json(getErrorMessage('请输入密码'));
				return;
			}
			regData = {
				username,
				password,
				orgName,
			};
			tName = 'username';
			tValue = username;
			break;
		case 'phone': {
			// check verifyCode
			if (!phone) {
				res.json(getErrorMessage('请输入手机号'));
				return;
			}
			if (!verifyCode || verifyCode.length !== 6) {
				res.json(getErrorMessage('请输入 6 位验证码'));
				return;
			}
			if (`${verifyCode}` !== await checkVerifyCode(phone)) {
				res.json({
					status: 1,
					err: '验证码不正确'
				});
				return;
			}
			regData = {
				phone,
				username: phone,
				orgName,
			};
			tName = 'phone';
			tValue = phone;
			break;
		}
		case 'wx': {
			if (!wx_code) {
				res.json(getErrorMessage('请提供微信验证编码 code'));
				return;
			}
			const {openid, session_key} = await bfetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${clientID}&secret=${clientSecret}&js_code=${wx_code}&grant_type=authorization_code`)
			regData = {
				wx_openid: openid,
				orgName,
			};
			tName = 'wx_openid';
			tValue = openid;
			break;
		}
		default:
			res.json({
				status: 1,
				err: '注册类型错误'
			});
			return;
	}

	try {
		const { rows } = await db.query(`select id from user_bind where ${tName}=$1`, [tValue]);
		if (rows.length >= 1) {
			res.json({
				status: 1,
				err: `用户 ${tValue} 已经注册`
			});
			return;
		}
		const uname = await registerUser(regData);
		const token = generateToken({username: uname, orgName}, app.get('secret'));
		res.json({
			status: 0,
			result: {
				token,
			},
		});
	} catch(e) {
		res.json({
			status: 1,
			err: `${e}`
		});
	}
});

app.post('/users1', async function(req, res) {
	const { type } = req.query;
	const { phone, verifyCode, orgName, wx_code, username, password } = req.body;
	logger.debug(`End point : /users?type=${type} [orgname ${orgName}, phone ${phone}]`);
	let fieldName = 'phone';
	let tType = 'PHONE';
	let tValue = phone;
	if (type === 'phone') {
		if (!phone) {
			res.json(getErrorMessage('\'phone\''));
			return;
		}
		// check verifyCode
		if (`${verifyCode}` !== await checkVerifyCode(phone)) {
			res.json({
				status: 1,
				err: '验证码不正确'
			});
			return;
		}
		fieldName = 'phone';
		tType = 'PHONE';
		tValue = phone;
	}else if (type === 'password') {
		tType = 'PASSWORD';
		fieldName = 'username';
		tValue = username;
	} else if (type === 'wechat') {
		if (!wx_code) {
			res.json(getErrorMessage('\'wx_code\''));
			return;
		}
		fieldName = 'wx_openid';
		tType = 'WX_OPENID';
	} else {
		res.json({
			status: 400,
			err: 'type 参数错误'
		});
		return;
	}

	if (!orgName) {
		res.json(getErrorMessage('\'orgName\''));
		return;
	}
	
	let user_id = null;
	try {
		// if tType is WX_OPENID, then fetch openid from wechat by wx_code.
		if (tType === 'WX_OPENID') {
			// 通过 wx_code 去访问 微信后台 获取 openid
			const {openid, session_key} = await bfetch(`https://api.weixin.qq.com/sns/jscode2session?appid=${clientID}&secret=${clientSecret}&js_code=${wx_code}&grant_type=authorization_code`)
			tValue = openid;
		}
		const { rows } = await db.query(`select id from user_bind where ${fieldName}=$1`, [tValue]);
		await db.query('BEGIN');
		if (rows.length < 1) {
			user_id = await db.createUser({
				type: tType,
				value: tValue,
			});
		} else {
			user_id = rows[0].id;
		}
		var token = jwt.sign({
			exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
			user_id: user_id,
			orgName: orgName
		}, app.get('secret'));
		let response = await helper.getRegisteredUser(user_id, orgName, true);
		logger.debug('-- returned from registering the user_id %s phone %s for organization %s',user_id, phone,orgName);
		if (response && typeof response !== 'string') {
			logger.debug('Successfully registered the user_id %s phone %s for organization %s',user_id, phone,orgName);
			response.token = token;
			await db.query('COMMIT');
			res.json(response);
		} else {
			logger.debug('Failed to register the user_id %s phone %s for organization %s with::%s',user_id, phone,orgName,response);
			throw response;
		}
	} catch(e) {
		await db.query('ROLLBACK');
		logger.error('API[/users] create user err: ', e);
		res.json({
			status: 1,
			err: `${e}`,
		});
		return;
	}

});
// Create Channel
app.post('/channels', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.debug('End point : /channels');
	var channelName = req.body.channelName;
	var channelConfigPath = req.body.channelConfigPath;
	logger.debug('Channel name : ' + channelName);
	logger.debug('channelConfigPath : ' + channelConfigPath); //../artifacts/channel/mychannel.tx
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!channelConfigPath) {
		res.json(getErrorMessage('\'channelConfigPath\''));
		return;
	}

	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgname);
	res.send(message);
});
// Join Channel
app.post('/channels/:channelName/peers', async function(req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	var channelName = req.params.channelName;
	var peers = req.body.peers;
	logger.debug('channelName : ' + channelName);
	logger.debug('peers : ' + peers);
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);

	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}

	let message =  await join.joinChannel(channelName, peers, req.username, req.orgname);
	res.send(message);
});
// Install chaincode on target peers
app.post('/chaincodes', async function(req, res) {
	logger.debug('==================== INSTALL CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodePath = req.body.chaincodePath;
	var chaincodeVersion = req.body.chaincodeVersion;
	var chaincodeType = req.body.chaincodeType;
	logger.debug('peers : ' + peers); // target peers list
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodePath  : ' + chaincodePath);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname)
	res.send(message);});
// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('==================== INSTANTIATE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
	res.send(message);
});
// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== INVOKE ON CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.params.chaincodeName;
	var channelName = req.params.channelName;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgname);
	res.send(message);
});
// Query on chaincode on target peers
app.get('/channels/:channelName/chaincodes/:chaincodeName', async function(req, res) {
	logger.debug('==================== QUERY BY CHAINCODE ==================');
	var channelName = req.params.channelName;
	var chaincodeName = req.params.chaincodeName;
	let args = req.query.args;
	let fcn = req.query.fcn;
	let peer = req.query.peer;

	logger.debug('channelName : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('fcn : ' + fcn);
	logger.debug('args : ' + args);

	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!fcn) {
		res.json(getErrorMessage('\'fcn\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}
	args = args.replace(/'/g, '"');
	args = JSON.parse(args);
	logger.debug(args);

	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	res.send(message);
});
//  Query Get Block by BlockNumber
app.get('/channels/:channelName/blocks/:blockId', async function(req, res) {
	logger.debug('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = req.query.peer;
	logger.debug('channelName : ' + req.params.channelName);
	logger.debug('BlockID : ' + blockId);
	logger.debug('Peer : ' + peer);
	if (!blockId) {
		res.json(getErrorMessage('\'blockId\''));
		return;
	}

	let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgname);
	res.send(message);
});
// Query Get Transaction by Transaction ID
app.get('/channels/:channelName/transactions/:trxnId', async function(req, res) {
	logger.debug('================ GET TRANSACTION BY TRANSACTION_ID ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let trxnId = req.params.trxnId;
	let peer = req.query.peer;
	if (!trxnId) {
		res.json(getErrorMessage('\'trxnId\''));
		return;
	}

	let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, req.username, req.orgname);
	res.send(message);
});
// Query Get Block by Hash
app.get('/channels/:channelName/blocks', async function(req, res) {
	logger.debug('================ GET BLOCK BY HASH ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let hash = req.query.hash;
	let peer = req.query.peer;
	if (!hash) {
		res.json(getErrorMessage('\'hash\''));
		return;
	}

	let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgname);
	res.send(message);
});
//Query for Channel Information
app.get('/channels/:channelName', async function(req, res) {
	logger.debug('================ GET CHANNEL INFORMATION ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgname);
	res.send(message);
});
//Query for Channel instantiated chaincodes
app.get('/channels/:channelName/chaincodes', async function(req, res) {
	logger.debug('================ GET INSTANTIATED CHAINCODES ======================');
	logger.debug('channelName : ' + req.params.channelName);
	let peer = req.query.peer;

	let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgname);
	res.send(message);
});
// Query to fetch all Installed/instantiated chaincodes
app.get('/chaincodes', async function(req, res) {
	var peer = req.query.peer;
	var installType = req.query.type;
	logger.debug('================ GET INSTALLED CHAINCODES ======================');

	let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgname)
	res.send(message);
});
// Query to fetch channels
app.get('/channels', async function(req, res) {
	logger.debug('================ GET CHANNELS ======================');
	logger.debug('peer: ' + req.query.peer);
	var peer = req.query.peer;
	if (!peer) {
		res.json(getErrorMessage('\'peer\''));
		return;
	}

	let message = await query.getChannels(peer, req.username, req.orgname);
	res.send(message);
});
