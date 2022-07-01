"use strict";

const validationResult = require("express-validator").validationResult;
const logger = require("../utils/logger");

/**
* @typedef {import("sequelize").Model} Model
* @typedef {import("express").Request} Request
*/

module.exports.requireReload = path => {
	delete require.cache[require.resolve(path)];
	return require(path);
};

module.exports.chainPromise = (functions, index = 0) => {
	if (functions[index] !== undefined) {
		return functions[index]().then(() => module.exports.chainPromise(functions, index + 1));
	}
};

module.exports.getInitialBenefits = () => {
	const initialBenefits = new Map();

	Object.keys(process.env).forEach(key => {
		const found = key.match(/API_PORTAL_INITIAL_BENEFIT_ID_(\d+)_DAYS$/);

		if (found) {
			const days = Number(process.env[key]);

			if (days > 0) {
				initialBenefits.set(found[1], Math.min(days, 3600));
			}
		}
	});

	return initialBenefits;
};

/**
* @param {Model[]} characters
* @param {Number} lastLoginServer
* @param {string} field1
* @param {string} field2
* @return {string}
*/
module.exports.getCharCountString = (characters, lastLoginServer, field1, field2) =>
	`${lastLoginServer || 0}|`.concat(characters.map(c => `${c.get(field1)},${c.get(field2)}`).join("|")).concat("|")
;

/**
* @param {Model[]} benefits
* @param {string} field1
* @param {string} field2
* @return {Number[][]}
*/
module.exports.getBenefitsArray = (benefits, field1, field2) =>
	benefits.map(b =>
		[b.get(field1), Math.floor((new Date(b.get(field2)).getTime() - Date.now()) / 1000)]
	)
;

/**
* @param {Request} request
*/
module.exports.validationResultLog = request => {
	const result = validationResult(request);

	if (!result.isEmpty()) {
		logger.warn("Validation failed: ".concat(result.array().map(e => `${e.param}="${e.msg}"`).join(", ")));
	}

	return result;
};
