"use strict";

/**
 * @typedef {import("../app").modules} modules
 * @typedef {import("express").RequestHandler} RequestHandler
 */

const expressLayouts = require("express-ejs-layouts");
const moment = require("moment-timezone");
const body = require("express-validator").body;
const helpers = require("../utils/helpers");

const { accessFunctionHandler, writeOperationReport } = require("../middlewares/admin.middlewares");

/**
 * @param {modules} modules
 */
module.exports.index = ({ logger, serverModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		serverModel.maintenance.findAll().then(maintenances => {
			res.render("adminMaintenance", {
				layout: "adminLayout",
				maintenances,
				moment
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
module.exports.add = () => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		res.render("adminMaintenanceAdd", {
			layout: "adminLayout",
			errors: null,
			startTime: moment(),
			endTime: moment(),
			description: ""
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.addAction = ({ i18n, logger, reportModel, serverModel }) => [
	accessFunctionHandler,
	expressLayouts,
	[
		body("startTime")
			.isISO8601().withMessage(i18n.__("Start time field must contain a valid date.")),
		body("endTime")
			.isISO8601().withMessage(i18n.__("End time field must contain a valid date.")),
		body("description").optional().trim()
			.isLength({ max: 1024 }).withMessage(i18n.__("Description field must be between 1 and 1024 characters."))
	],
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		const { startTime, endTime, description } = req.body;
		const errors = helpers.validationResultLog(req, logger);

		if (!errors.isEmpty()) {
			return res.render("adminMaintenanceAdd", {
				layout: "adminLayout",
				errors: errors.array(),
				startTime: moment.tz(startTime, req.user.tz),
				endTime: moment.tz(endTime, req.user.tz),
				description
			});
		}

		serverModel.maintenance.create({
			startTime: moment.tz(startTime, req.user.tz).toDate(),
			endTime: moment.tz(endTime, req.user.tz).toDate(),
			description
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
		res.redirect("/maintenance");
	}
];

/**
 * @param {modules} modules
 */
module.exports.edit = ({ logger, serverModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { id } = req.query;

		if (!id) {
			return res.redirect("/maintenance");
		}

		serverModel.maintenance.findOne({ where: { id } }).then(data => {
			if (data === null) {
				return res.redirect("/maintenance");
			}

			res.render("adminMaintenanceEdit", {
				layout: "adminLayout",
				errors: null,
				startTime: moment(data.get("startTime")),
				endTime: moment(data.get("endTime")),
				description: data.get("description"),
				id
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
module.exports.editAction = ({ i18n, logger, reportModel, serverModel }) => [
	accessFunctionHandler,
	expressLayouts,
	[
		body("startTime")
			.isISO8601().withMessage(i18n.__("Start time field must contain a valid date.")),
		body("endTime")
			.isISO8601().withMessage(i18n.__("End time field must contain a valid date.")),
		body("description").optional().trim()
			.isLength({ max: 1024 }).withMessage(i18n.__("Description field must be between 1 and 1024 characters."))
	],
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		const { id } = req.query;
		const { startTime, endTime, description } = req.body;
		const errors = helpers.validationResultLog(req, logger);

		if (!id) {
			return res.redirect("/maintenance");
		}

		if (!errors.isEmpty()) {
			return res.render("adminMaintenanceEdit", {
				layout: "adminLayout",
				errors: errors.array(),
				startTime: moment.tz(startTime, req.user.tz),
				endTime: moment.tz(endTime, req.user.tz),
				description,
				id
			});
		}

		serverModel.maintenance.update({
			startTime: moment.tz(startTime, req.user.tz).toDate(),
			endTime: moment.tz(endTime, req.user.tz).toDate(),
			description
		}, {
			where: { id }
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
		res.redirect("/maintenance");
	}
];

/**
 * @param {modules} modules
 */
module.exports.deleteAction = ({ logger, reportModel, serverModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		const { id } = req.query;

		if (!id) {
			return res.redirect("/maintenance");
		}

		serverModel.maintenance.destroy({ where: { id } }).then(() =>
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
		res.redirect("/maintenance");
	}
];