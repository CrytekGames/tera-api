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
	sequelize.define("account_info", {
		"accountDBID": {
			"type": DataTypes.INTEGER,
			"primaryKey": true
		},
		"userName": {
			"type": DataTypes.STRING(64),
			"primaryKey": true
		},
		"passWord": {
			"type": DataTypes.STRING(128)
		},
		"RMB": {
			"type": DataTypes.INTEGER
		},
		"authKey": {
			"type": DataTypes.STRING(128)
		},
		"registerTime": {
			"type": DataTypes.TIME
		},
		"lastLoginTime": {
			"type": DataTypes.INTEGER
		},
		"lastLoginIP": {
			"type": DataTypes.STRING(64)
		},
		"playTimeLast": {
			"type": DataTypes.INTEGER
		},
		"playTimeTotal": {
			"type": DataTypes.INTEGER
		},
		"playCount": {
			"type": DataTypes.INTEGER
		},
		"permission": {
			"type": DataTypes.INTEGER
		},
		"privilege": {
			"type": DataTypes.INTEGER
		}
	})
;