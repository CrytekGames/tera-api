"use strict";

/**
 * @typedef {import("../app").modules} modules
 * @typedef {import("express").RequestHandler} RequestHandler
 */

const expressLayouts = require("express-ejs-layouts");
const moment = require("moment-timezone");

const { accessFunctionHandler } = require("../middlewares/admin.middlewares");

/**
 * @param {modules} modules
 */
module.exports.index = ({ logger, queueModel }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { handler, tag } = req.query;

		queueModel.tasks.findAll({
			where: {
				...handler ? { handler } : {},
				...tag ? { tag } : {}
			},
			order: [
				["id", "DESC"]
			]
		}).then(tasks =>
			res.render("adminTasks", {
				layout: "adminLayout",
				moment,
				tag,
				handler,
				tasks
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
module.exports.restartAction = ({ logger, queue }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		queue.start(true).then(() =>
			res.redirect("/tasks")
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.cancelFailedAction = ({ logger, queue }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		const { handler, tag } = req.query;

		queue.clear(queue.status.rejected, handler || null, tag || null).then(() =>
			res.redirect("/tasks")
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];

/**
 * @param {modules} modules
 */
module.exports.cancelAllAction = ({ logger, queue }) => [
	accessFunctionHandler,
	expressLayouts,
	/**
	 * @type {RequestHandler}
	 */
	(req, res) => {
		queue.clear().then(() =>
			res.redirect("/tasks")
		).catch(err => {
			logger.error(err);
			res.render("adminError", { layout: "adminLayout", err });
		});
	}
];