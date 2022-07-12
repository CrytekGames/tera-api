"use strict";

/**
* @typedef {import("sequelize").Sequelize} Sequelize
* @typedef {import("sequelize/types")} DataTypes
*/

/**
* @param {Sequelize} sequelize
* @param {DataTypes} DataTypes
*/
module.exports = (sequelize, DataTypes) =>
	sequelize.define("report_admin_op", {
		id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
			autoIncrement: true
		},
		userId: {
			type: DataTypes.STRING(64)
		},
		userType: {
			type: DataTypes.STRING(64)
		},
		userSn: {
			type: DataTypes.BIGINT
		},
		ip: {
			type: DataTypes.STRING(64)
		},
		function: {
			type: DataTypes.STRING(256)
		},
		payload: {
			type: DataTypes.TEXT
		},
		reportType: {
			type: DataTypes.INTEGER
		},
		reportTime: {
			type: DataTypes.DATE
		}
	})
;