"use strict";

/**
* @typedef {import("../data.model").Sequelize} Sequelize
* @typedef {import("../data.model").DataTypes} DataTypes
*/

/**
* @param {Sequelize} sequelize
* @param {DataTypes} DataTypes
*/
module.exports = (sequelize, DataTypes) =>
	sequelize.define("data_item_templates", {
		itemTemplateId: {
			type: DataTypes.BIGINT(20),
			primaryKey: true,
			autoIncrement: true,
			allowNull: false
		},
		icon: {
			type: DataTypes.TEXT(255),
			allowNull: false
		},
		name: {
			type: DataTypes.TEXT(255),
			allowNull: false
		},
		rareGrade: {
			type: DataTypes.INTEGER(11),
			allowNull: false
		},
		category: {
			type: DataTypes.TEXT(255)
		},
		requiredLevel: {
			type: DataTypes.INTEGER(11)
		},
		requiredClass: {
			type: DataTypes.TEXT(255)
		},
		requiredGender: {
			type: DataTypes.TEXT(255)
		},
		requiredRace: {
			type: DataTypes.TEXT(255)
		},
		tradable: {
			type: DataTypes.TINYINT(4)
		},
		boundType: {
			type: DataTypes.TEXT(255)
		},
		periodByWebAdmin: {
			type: DataTypes.TINYINT(4)
		},
		periodInMinute: {
			type: DataTypes.INTEGER(11)
		},
		warehouseStorable: {
			type: DataTypes.TINYINT(4)
		},
		linkSkillId: {
			type: DataTypes.BIGINT(20)
		},
		linkSkillPeriodDay: {
			type: DataTypes.INTEGER(11)
		}
	})
;