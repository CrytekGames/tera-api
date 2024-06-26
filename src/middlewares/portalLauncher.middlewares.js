"use strict";

/**
 * @typedef {import("express").RequestHandler} RequestHandler
 * @typedef {import("express").Response} Response
 */

const Recaptcha = require("express-recaptcha").RecaptchaV3;
const helpers = require("../utils/helpers");

let recaptcha = null;

if (/^true$/i.test(process.env.API_PORTAL_RECAPTCHA_ENABLE)) {
	recaptcha = new Recaptcha(
		process.env.API_PORTAL_RECAPTCHA_SITE_KEY,
		process.env.API_PORTAL_RECAPTCHA_SECRET_KEY, {
			callback: "bindFormAction"
		}
	);
}

/**
 * @param {Response} res
 */
const resultJson = (res, code, message, params = {}) => res.json({
	Return: code === 0, ReturnCode: code, Msg: message, ...params
});

module.exports.validationHandler = logger =>
	/**
	 * @type {RequestHandler}
	 */
	(req, res, next) => {
		if (!helpers.validationResultLog(req, logger).isEmpty()) {
			return resultJson(res, 2, "invalid parameter");
		}

		next();
	}
;

module.exports.recaptcha = recaptcha;
module.exports.resultJson = resultJson;