"use strict";

/**
* @typedef {import("../report.model").Sequelize} Sequelize
* @typedef {import("../report.model").DataTypes} DataTypes
*/

/**
* @param {Sequelize} sequelize
* @param {DataTypes} DataTypes
*/
module.exports = (sequelize, DataTypes) =>
	sequelize.define("report_characters", {
		accountDBID: {
			type: DataTypes.BIGINT(20),
			primaryKey: true,
			allowNull: false
		},
		serverId: {
			type: DataTypes.INTEGER(11),
			primaryKey: true,
			allowNull: false
		},
		characterId: {
			type: DataTypes.INTEGER(11),
			primaryKey: true,
			allowNull: false
		},
		name: {
			type: DataTypes.STRING(64)
		},
		classId: {
			type: DataTypes.INTEGER(11)
		},
		genderId: {
			type: DataTypes.INTEGER(11)
		},
		raceId: {
			type: DataTypes.INTEGER(11)
		},
		level: {
			type: DataTypes.INTEGER(11)
		},
		reportType: {
			type: DataTypes.INTEGER(11)
		},
		reportTime: {
			type: DataTypes.DATE,
			defaultValue: DataTypes.NOW
		}
	})
;