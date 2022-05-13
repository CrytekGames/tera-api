"use strict";

const crypto = require("crypto");
const uuid = require("uuid");
const accountModel = require("../models/account.model");

class TeraController {
	/**
	 * @type {import("express").RequestHandler}
	 */
	static serverList(req, res) {
		// @todo
		res.send();
	}

	/**
	 * @type {import("express").RequestHandler}
	 */
	static launcherLoginAction(req, res) {
		const { userID, password } = req.body;

		if (!userID || !password) {
			return res.json({
				"Return": false,
				"ReturnCode": 2,
				"Msg": `userID=${userID}&password=${password}`
			});
		}

		accountModel.info.findOne({
			"where": {
				"userName": userID
			}
		}).then(account => {
			const authKey = uuid.v4();
			let passwordString = password;
			let characterCount = "0";

			if (/^true$/i.test(process.env.API_USE_SHA512_PASSWORDS)) {
				passwordString = crypto.createHash("sha512").update(process.env.API_USE_SHA512_PASSWORDS_SALT + password).digest("hex");
			}

			if (account.get("passWord") !== passwordString) {
				res.json({
					"Return": false,
					"ReturnCode": 50015,
					"Msg": "password error"
				});
			} else {
				accountModel.info.update({
					"authKey": authKey
				}, {
					"where": {
						"accountDBID": account.get("accountDBID")
					}
				}).then(async () => {
					try {
						const characters = await accountModel.characters.findAll({
							"where": {
								"accountDBID": account.get("accountDBID")
							}
						});

						characterCount = `${characters.map((c, i) => `${i}|${c.get("serverId")},${c.get("charCount")}`).join("|")}|`;
					} catch (_) {}

					res.json({
						"Return": true,
						"ReturnCode": 0,
						"Msg": "success",
						"VipitemInfo": "", // @todo
						"PassitemInfo": "", // @todo
						"CharacterCount": characterCount,
						"Permission": account.get("permission"),
						"UserNo": account.get("accountDBID"),
						"AuthKey": authKey
					});
				}).catch(() =>
					res.json({
						"Return": false,
						"ReturnCode": 50811,
						"Msg": "failure insert auth token"
					})
				);
			}
		}).catch((e) => {
			console.log(e);
			res.json({
				"Return": false,
				"ReturnCode": 50000,
				"Msg": "account not exist"
			});
		});
	}

	/**
	 * @type {import("express").RequestHandler}
	 */
	static getAccountInfoByUserNo(req, res) {
		const { id } = req.body;

		if (!id) {
			return res.json({
				"Return": false,
				"ReturnCode": 2,
				"Msg": `id=${id}`
			});
		}

		accountModel.info.findOne({
			"where": {
				"accountDBID": id
			}
		}).then(async account => {
			let characterCount = "0";

			try {
				const characters = await accountModel.characters.findAll({
					"where": {
						"accountDBID": account.get("accountDBID")
					}
				});

				characterCount = `${characters.map((c, i) => `${i}|${c.get("serverId")},${c.get("charCount")}`).join("|")}|`;
			} catch (_) {}

			res.json({
				"Return": true,
				"ReturnCode": 0,
				"Msg": "success",
				"VipitemInfo": "", // @todo
				"PassitemInfo": "", // @todo
				"CharacterCount": characterCount,
				"Permission": account.get("permission")
			});
		}).catch(() =>
			res.json({
				"Return": false,
				"ReturnCode": 50000,
				"Msg": "account not exist"
			})
		);
	}
}

module.exports = TeraController;