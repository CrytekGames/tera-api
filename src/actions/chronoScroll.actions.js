"use strict";

const EventEmitter = require("events").EventEmitter;
const accountModel = require("../models/account.model");

// @see StrSheet_AccountBenefit
const BENEFIT_ID_ELITE_STATUS = 533; // RU VIP

const сhronoScrollController = {
	// Elite Status Voucher (1-day)
	183455: userId => (new EliteStatusVoucherBenefit(userId)).add(1),

	// Elite Status Voucher (14-day)
	183459: userId => (new EliteStatusVoucherBenefit(userId)).add(14),

	// Elite Status Voucher (180-day)
	183463: userId => (new EliteStatusVoucherBenefit(userId)).add(180),

	// Elite Status Voucher (30-day)
	183460: userId => (new EliteStatusVoucherBenefit(userId)).add(30),

	// Elite Status Voucher (360-day)
	183464: userId => (new EliteStatusVoucherBenefit(userId)).add(360),

	// Elite Status Voucher (5-day)
	183457: userId => (new EliteStatusVoucherBenefit(userId)).add(5),

	// Elite Status Voucher (60-day)
	183461: userId => (new EliteStatusVoucherBenefit(userId)).add(60),

	// Elite Status Voucher (7-day)
	183458: userId => (new EliteStatusVoucherBenefit(userId)).add(7),

	// Elite Status Voucher (90-day)
	183462: userId => (new EliteStatusVoucherBenefit(userId)).add(90)
};

class EliteStatusVoucherBenefit {
	constructor(userId) {
		this.userId = userId;
		this.benefitId = BENEFIT_ID_ELITE_STATUS;
	}

	async add(days) {
		const benefit = await accountModel.benefits.findOne({
			where: { accountDBID: this.userId, benefitId: this.benefitId }
		});

		if (benefit === null) {
			return accountModel.benefits.create({
				accountDBID: this.userId,
				benefitId: this.benefitId,
				availableUntil: accountModel.sequelize.fn("ADDDATE", accountModel.sequelize.fn("NOW"), days)
			});
		} else {
			return accountModel.benefits.update({
				availableUntil: accountModel.sequelize.fn("ADDDATE", accountModel.sequelize.col("availableUntil"), days)
			}, {
				where: { accountDBID: this.userId, benefitId: this.benefitId }
			});
		}
	}
}

class ChronoScrollActions extends EventEmitter {
	constructor(serverId) {
		super();
		this.serverId = serverId;
		this.assign();
	}

	assign() {
		Object.keys(сhronoScrollController).forEach(chronoId =>
			this.on(chronoId, userId => сhronoScrollController[chronoId](userId, this.serverId))
		);
	}
}

module.exports = ChronoScrollActions;