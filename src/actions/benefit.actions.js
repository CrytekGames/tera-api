"use strict";

/**
 * @typedef {import("../app").modules} modules
 */

const moment = require("moment-timezone");

class Benefit {
	/**
	 * @param {modules} modules
	 */
	constructor(modules, userId, serverId, params = {}) {
		this.modules = modules;
		this.userId = userId;
		this.serverId = serverId;
		this.params = params;
	}

	addBenefit(benefitId, days) {
		return this.modules.accountModel.benefits.findOne({
			attributes: ["availableUntil", [this.modules.accountModel.characters.sequelize.fn("NOW"), "dateNow"]],
			where: { accountDBID: this.userId, benefitId }
		}).then(benefit => {
			let promise = null;

			if (benefit === null) {
				promise = this.modules.accountModel.benefits.create({
					accountDBID: this.userId,
					benefitId,
					availableUntil: this.modules.accountModel.sequelize.fn("ADDDATE",
						this.modules.accountModel.sequelize.fn("NOW"), days)
				});
			} else {
				const currentDate = moment(benefit.get("dateNow")).isAfter(benefit.get("availableUntil")) ?
					this.modules.accountModel.sequelize.fn("NOW") :
					this.modules.accountModel.sequelize.col("availableUntil");

				promise = this.modules.accountModel.benefits.update({
					availableUntil: this.modules.accountModel.sequelize.fn("ADDDATE", currentDate, days)
				}, {
					where: { accountDBID: this.userId, benefitId }
				});
			}

			return promise.then(() => {
				if (!/^true$/i.test(process.env.FCGI_GW_WEBAPI_ENABLE)) {
					return Promise.resolve();
				}

				let totalDays = days;

				if (benefit !== null) {
					totalDays += Math.round(
						moment.duration(moment(benefit.get("availableUntil"))
							.diff(moment(benefit.get("dateNow"))))
							.asDays()
					);
				}

				return this.modules.fcgi.addBenefit(this.serverId, this.userId, benefitId, totalDays);
			});
		});
	}
}

module.exports = Benefit;