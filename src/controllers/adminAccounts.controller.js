"use strict";

/**
 * @typedef {import("../app").modules} modules
 * @typedef {import("express").RequestHandler} RequestHandler
 */

const crypto = require("crypto");
const expressLayouts = require("express-ejs-layouts");
const moment = require("moment-timezone");
const body = require("express-validator").body;
const Op = require("sequelize").Op;
const helpers = require("../utils/helpers");

const { accessFunctionHandler } = require("../middlewares/admin.middlewares");
const encryptPasswords = /^true$/i.test(process.env.API_PORTAL_USE_SHA512_PASSWORDS);

/**
 * @param {modules} modules
 */
module.exports.index = ({ logger, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { serverId } = req.query;

		accountModel.info.belongsTo(accountModel.bans, { foreignKey: "accountDBID" });
		accountModel.info.hasOne(accountModel.bans, { foreignKey: "accountDBID" });

		accountModel.info.findAll({
			include: [{
				model: accountModel.bans,
				required: false,
				attributes: []
			}],
			attributes: {
				include: [
					[accountModel.info.sequelize.col("startTime"), "bannedStartTime"],
					[accountModel.info.sequelize.col("endTime"), "bannedEndTime"]
				]
			}
		}).then(accounts => {
			res.render("adminAccounts", {
				layout: "adminLayout",
				accounts,
				moment,
				serverId
			});
		}).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.add = ({ i18n, datasheets }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const benefitIds = [];
		const availableUntils = [];

		const accountBenefits = datasheets.StrSheet_AccountBenefit[i18n.getLocale()] || new Map();

		helpers.getInitialBenefits().forEach((benefitDays, benefitId) => {
			benefitIds.push(benefitId);
			availableUntils.push(moment().add(benefitDays, "days").format("YYYY-MM-DDTHH:mm"));
		});

		res.render("adminAccountsAdd", {
			layout: "adminLayout",
			errors: null,
			moment,
			accountBenefits,
			userName: "",
			passWord: "",
			email: "",
			permission: 0,
			privilege: 0,
			benefitIds,
			availableUntils
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.addAction = ({ i18n, logger, accountModel, datasheets }) => [
	accessFunctionHandler,
	expressLayouts,
	[
		body("userName").trim()
			.isLength({ min: 1, max: 64 }).withMessage(i18n.__("Name field must be between 1 and 64 characters."))
			.custom((value, { req }) => accountModel.info.findOne({
				where: {
					userName: req.body.userName
				}
			}).then(data => {
				if (data) {
					return Promise.reject(i18n.__("Name field contains already existing name."));
				}
			})),
		body("passWord").trim()
			.isLength({ min: 1, max: 128 }).withMessage(i18n.__("Password field must be between 1 and 128 characters.")),
		body("email").optional({ checkFalsy: true }).trim()
			.isEmail().withMessage(i18n.__("Email field must contain a valid email.")),
		body("permission").trim()
			.isNumeric().withMessage(i18n.__("Permission field must contain a valid number.")),
		body("privilege").trim()
			.isNumeric().withMessage(i18n.__("Privilege field must contain a valid number.")),
		body("benefitIds.*").optional()
			.isInt({ min: 0 }).withMessage(i18n.__("Benefit ID field must contain a valid number.")),
		body("availableUntils.*").optional()
			.isISO8601().withMessage("Available field until must contain a valid date.")
	],
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { userName, passWord, email, permission, privilege, benefitIds, availableUntils } = req.body;
		const errors = helpers.validationResultLog(req, logger);
		let passwordString = passWord;

		const accountBenefits = datasheets.StrSheet_AccountBenefit[i18n.getLocale()] || new Map();

		if (encryptPasswords) {
			passwordString = crypto.createHash("sha512").update(process.env.API_PORTAL_USE_SHA512_PASSWORDS_SALT + passWord).digest("hex");
		}

		if (!errors.isEmpty()) {
			return res.render("adminAccountsAdd", {
				layout: "adminLayout",
				errors: errors.array(),
				moment,
				accountBenefits,
				userName,
				passWord,
				email,
				permission,
				privilege,
				benefitIds: benefitIds || [],
				availableUntils: availableUntils || []
			});
		}

		accountModel.sequelize.transaction(transaction =>
			accountModel.info.create({
				userName,
				passWord: passwordString,
				email,
				permission,
				privilege
			}, {
				transaction
			}).then(account => {
				const promises = [];

				if (benefitIds) {
					benefitIds.forEach((benefitId, i) => {
						if (availableUntils[i] === undefined) {
							return;
						}

						promises.push(accountModel.benefits.create({
							accountDBID: account.get("accountDBID"),
							benefitId,
							availableUntil: moment(availableUntils[i]).format("YYYY-MM-DD HH:mm:ss")
						}, {
							transaction
						}));
					});
				}

				return Promise.all(promises).then(() =>
					res.redirect("/accounts")
				);
			})
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.edit = ({ logger, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { accountDBID } = req.query;

		if (!accountDBID) {
			return res.redirect("/accounts");
		}

		accountModel.info.findOne({ where: { accountDBID } }).then(data => {
			if (data === null) {
				return res.redirect("/accounts");
			}

			res.render("adminAccountsEdit", {
				layout: "adminLayout",
				errors: null,
				encryptPasswords,
				moment,
				accountDBID,
				userName: data.get("userName"),
				passWord: data.get("passWord"),
				email: data.get("email"),
				permission: data.get("permission"),
				privilege: data.get("privilege")
			});
		}).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.editAction = ({ i18n, logger, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	[
		body("userName").trim()
			.isLength({ min: 1, max: 64 }).withMessage(i18n.__("Name field must be between 1 and 64 characters."))
			.custom((value, { req }) => accountModel.info.findOne({
				where: {
					userName: req.body.userName,
					accountDBID: { [Op.not]: req.query.accountDBID }
				}
			}).then(data => {
				if (data) {
					return Promise.reject(i18n.__("Name field contains already existing name."));
				}
			})),
		body("passWord").trim().optional({ checkFalsy: true })
			.isLength({ max: 128 }).withMessage(i18n.__("Password field must be between 1 and 128 characters.")),
		body("email").trim().optional({ checkFalsy: true })
			.isEmail().withMessage(i18n.__("Email field must contain a valid email.")),
		body("permission").trim()
			.isNumeric().withMessage(i18n.__("Permission field must contain a valid number.")),
		body("privilege").trim()
			.isNumeric().withMessage(i18n.__("Privilege field must contain a valid number."))
	],
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { accountDBID } = req.query;
		const { userName, passWord, email, permission, privilege, benefitIds, availableUntils } = req.body;
		const errors = helpers.validationResultLog(req, logger);

		if (!accountDBID) {
			return res.redirect("/accounts");
		}

		if (!errors.isEmpty()) {
			return res.render("adminAccountsEdit", {
				layout: "adminLayout",
				errors: errors.array(),
				encryptPasswords,
				moment,
				accountDBID,
				userName,
				passWord,
				email,
				permission,
				privilege
			});
		}

		accountModel.info.update({
			userName,
			...passWord ? { passWord } : {},
			email,
			permission,
			privilege,
			benefitIds,
			availableUntils
		}, {
			where: { accountDBID }
		}).then(() =>
			res.redirect("/accounts")
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.deleteAction = ({ logger, accountModel, shopModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { accountDBID } = req.query;

		if (!accountDBID) {
			return res.redirect("/accounts");
		}

		accountModel.sequelize.transaction(transaction =>
			Promise.all([
				accountModel.info.destroy({
					where: { accountDBID },
					transaction
				}),
				accountModel.benefits.destroy({
					where: { accountDBID },
					transaction
				}),
				accountModel.characters.destroy({
					where: { accountDBID },
					transaction
				}),
				shopModel.accounts.destroy({
					where: { accountDBID },
					transaction
				}),
				shopModel.promoCodeActivated.destroy({
					where: { accountDBID },
					transaction
				})
			]).then(() =>
				res.redirect("/accounts")
			)
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.characters = ({ logger, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { serverId, accountDBID } = req.query;

		accountModel.serverInfo.findAll().then(servers => {
			if (!serverId || !accountDBID) {
				return res.render("adminAccountsCharacters", {
					layout: "adminLayout",
					characters: null,
					servers,
					moment,
					serverId,
					accountDBID
				});
			}

			return accountModel.characters.findAll({
				where: {
					serverId,
					accountDBID
				}
			}).then(characters => {
				res.render("adminAccountsCharacters", {
					layout: "adminLayout",
					characters,
					servers,
					moment,
					serverId,
					accountDBID
				});
			});
		}).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];