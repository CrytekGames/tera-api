"use strict";

/**
 * @typedef {import("../app").modules} modules
 * @typedef {import("express").RequestHandler} RequestHandler
 */

const expressLayouts = require("express-ejs-layouts");
const body = require("express-validator").body;
const helpers = require("../utils/helpers");
const ServerUpActions = require("../actions/serverUp.actions");

const { accessFunctionHandler, writeOperationReport } = require("../middlewares/admin.middlewares");

/**
 * @param {modules} modules
 */
module.exports.index = modules => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const serverUp = new ServerUpActions(modules);

		modules.accountModel.serverInfo.findAll().then(servers => {
			const promises = [];

			servers.forEach(server => {
				if (/^true$/i.test(process.env.SLS_AUTO_SET_AVAILABLE) && !server.get("isAvailable")) {
					promises.push(serverUp.set(
						server.get("serverId"),
						server.get("loginIp"),
						server.get("loginPort")
					));
				}
			});

			Promise.all(promises).then(() =>
				res.render("adminServers", {
					layout: "adminLayout",
					servers
				})
			);
		}).catch(err => {
			modules.logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.add = ({ i18n }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.render("adminServersAdd", {
			layout: "adminLayout",
			errors: null,
			serverId: "",
			loginIp: "",
			loginPort: 7801,
			language: i18n.getLocale(),
			nameString: "",
			descrString: "",
			tresholdLow: 100,
			tresholdMedium: 500,
			isPvE: 0,
			isCrowdness: 0,
			isAvailable: 0,
			isEnabled: 1
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.addAction = ({ i18n, logger, reportModel, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	[
		body("serverId")
			.isInt({ min: 0 }).withMessage(i18n.__("Server ID field must contain the value as a number."))
			.custom((value, { req }) => accountModel.serverInfo.findOne({
				where: {
					serverId: req.body.serverId
				}
			}).then(data => {
				if (data) {
					return Promise.reject(i18n.__("Server ID field contains an existing server ID."));
				}
			})),
		body("loginIp").trim()
			.isIP().withMessage(i18n.__("Login IP field must contain a valid IP value.")),
		body("loginPort")
			.isPort().withMessage(i18n.__("Login port field must contain a valid port value.")),
		body("language").trim().toLowerCase()
			.isAlpha().withMessage(i18n.__("Language field must be a valid value."))
			.isLength({ min: 2, max: 3 }).withMessage(i18n.__("Language field must be between 2 and 3 characters.")),
		body("nameString").trim()
			.isLength({ min: 1, max: 256 }).withMessage(i18n.__("Name string field must be between 1 and 256 characters.")),
		body("descrString").trim()
			.isLength({ min: 1, max: 1024 }).withMessage(i18n.__("Description field string must be between 1 and 1024 characters.")),
		body("tresholdLow").trim()
			.isInt({ min: 0 }).withMessage(i18n.__("Treshold low field must contain the value as a number.")),
		body("tresholdMedium").trim()
			.isInt({ min: 0 }).withMessage(i18n.__("Treshold medium field must contain the value as a number.")),
		body("isPvE").optional()
			.isIn(["on"]).withMessage(i18n.__("Only PvE field has invalid value.")),
		body("isCrowdness").optional()
			.isIn(["on"]).withMessage(i18n.__("Is crowdness field has invalid value.")),
		body("isAvailable").optional()
			.isIn(["on"]).withMessage(i18n.__("Is available field has invalid value.")),
		body("isEnabled").optional()
			.isIn(["on"]).withMessage(i18n.__("Is enabled field has invalid value."))
	],
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		const { serverId, loginIp, loginPort, language, nameString, descrString,
			tresholdLow, tresholdMedium, isPvE, isCrowdness, isAvailable, isEnabled } = req.body;
		const errors = helpers.validationResultLog(req, logger);

		if (!errors.isEmpty()) {
			return res.render("adminServersAdd", {
				layout: "adminLayout",
				errors: errors.array(),
				serverId,
				loginIp,
				loginPort,
				language,
				nameString,
				descrString,
				tresholdLow,
				tresholdMedium,
				isPvE,
				isCrowdness,
				isAvailable,
				isEnabled
			});
		}

		accountModel.serverInfo.create({
			serverId,
			loginIp,
			loginPort,
			language,
			nameString,
			descrString,
			tresholdLow,
			tresholdMedium,
			isPvE: isPvE == "on",
			isCrowdness: isCrowdness == "on",
			isAvailable: isAvailable == "on",
			isEnabled: isEnabled == "on"
		}).then(() =>
			next()
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	},
	writeOperationReport(reportModel),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.redirect("/servers");
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
		const { serverId } = req.query;

		accountModel.serverInfo.findOne({ where: { serverId } }).then(data => {
			if (data === null) {
				return res.redirect("/servers");
			}

			res.render("adminServersEdit", {
				layout: "adminLayout",
				errors: null,
				serverId: data.get("serverId"),
				loginIp: data.get("loginIp"),
				loginPort: data.get("loginPort"),
				language: data.get("language"),
				nameString: data.get("nameString"),
				descrString: data.get("descrString"),
				tresholdLow: data.get("tresholdLow"),
				tresholdMedium: data.get("tresholdMedium"),
				isPvE: data.get("isPvE"),
				isCrowdness: data.get("isCrowdness"),
				isAvailable: data.get("isAvailable"),
				isEnabled: data.get("isEnabled")
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
module.exports.editAction = ({ i18n, logger, reportModel, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	[
		body("loginIp").trim()
			.isIP().withMessage(i18n.__("Login IP field must contain a valid IP value.")),
		body("loginPort")
			.isPort().withMessage(i18n.__("Login port field must contain a valid port value.")),
		body("language").trim().toLowerCase()
			.isAlpha().withMessage(i18n.__("Language field must be a valid value."))
			.isLength({ min: 2, max: 3 }).withMessage(i18n.__("Language field must be between 2 and 3 characters.")),
		body("nameString").trim()
			.isLength({ min: 1, max: 256 }).withMessage(i18n.__("Name string field must be between 1 and 256 characters.")),
		body("descrString").trim()
			.isLength({ min: 1, max: 1024 }).withMessage(i18n.__("Description string field must be between 1 and 1024 characters.")),
		body("tresholdLow").trim()
			.isInt({ min: 0 }).withMessage(i18n.__("Treshold low field must contain the value as a number.")),
		body("tresholdMedium").trim()
			.isInt({ min: 0 }).withMessage(i18n.__("Treshold medium field must contain the value as a number.")),
		body("isPvE").optional()
			.isIn(["on"]).withMessage(i18n.__("Only PvE field has invalid value.")),
		body("isCrowdness").optional()
			.isIn(["on"]).withMessage(i18n.__("Is crowdness field has invalid value.")),
		body("isAvailable").optional()
			.isIn(["on"]).withMessage(i18n.__("Is available field has invalid value.")),
		body("isEnabled").optional()
			.isIn(["on"]).withMessage(i18n.__("Is enabled field has invalid value."))
	],
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		const { serverId } = req.query;
		const { loginIp, loginPort, language, nameString, descrString,
			tresholdLow, tresholdMedium, isPvE, isCrowdness, isAvailable, isEnabled } = req.body;
		const errors = helpers.validationResultLog(req, logger);

		if (!serverId) {
			return res.redirect("/servers");
		}

		if (!errors.isEmpty()) {
			return res.render("adminServersEdit", {
				layout: "adminLayout",
				errors: errors.array(),
				serverId,
				loginIp,
				loginPort,
				language,
				nameString,
				descrString,
				tresholdLow,
				tresholdMedium,
				isPvE,
				isCrowdness,
				isAvailable,
				isEnabled
			});
		}

		accountModel.serverInfo.update({
			loginIp,
			loginPort,
			language,
			nameString,
			descrString,
			tresholdLow,
			tresholdMedium,
			isPvE: isPvE == "on",
			isCrowdness: isCrowdness == "on",
			isAvailable: isAvailable == "on",
			isEnabled: isEnabled == "on"
		}, {
			where: { serverId }
		}).then(() =>
			next()
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	},
	writeOperationReport(reportModel),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.redirect("/servers");
	}
];

/**
 * @param {modules} modules
 */
module.exports.deleteAction = ({ logger, reportModel, accountModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		const { serverId } = req.query;

		if (!serverId) {
			return res.redirect("/servers");
		}

		accountModel.serverInfo.destroy({ where: { serverId } }).then(() =>
			next()
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	},
	writeOperationReport(reportModel),
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.redirect("/servers");
	}
];