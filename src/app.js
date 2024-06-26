"use strict";

/**
 * @typedef {import("sequelize").Sequelize} Sequelize
 * @typedef {import("sequelize/types")} DataTypes
 *
 * @typedef {object} modules
 * @property {Sequelize} sequelize
 * @property {HubFunctions} hub
 * @property {SteerFunctions} steer
 * @property {BackgroundQueue} queue
 * @property {import("./utils/logger").logger} logger
 * @property {import("./lib/expressServer").app} app
 * @property {import("./models/datasheet.model").datasheetModel} datasheetModel
 * @property {import("./models/queue.model").queueModel} queueModel
 * @property {import("./models/data.model").dataModel} dataModel
 * @property {import("./models/account.model").accountModel} accountModel
 * @property {import("./models/server.model").serverModel} serverModel
 * @property {import("./models/report.model").reportModel} reportModel
 * @property {import("./models/shop.model").shopModel} shopModel
 * @property {import("./models/box.model").boxModel} boxModel
 */

require("dotenv").config();

const { Sequelize, DataTypes } = require("sequelize");
const cls = require("cls-hooked");
const createLogger = require("./utils/logger").createLogger;
const cliHelper = require("./utils/cliHelper");
const CoreLoader = require("./lib/coreLoader");
const BackgroundQueue = require("./lib/backgroundQueue");
const ExpressServer = require("./lib/expressServer");
const serverCategory = require("./lib/teraPlatformGuid").serverCategory;
const HubFunctions = require("./lib/hubFunctions");
const SteerFunctions = require("./lib/steerFunctions");
const TasksActions = require("./actions/tasks.actions");
const ServerCheckActions = require("./actions/serverCheck.actions");

const moduleLoader = new CoreLoader();
const logger = createLogger("CL");
const cli = cliHelper(logger);

moduleLoader.setAsync("logger", () => logger);

moduleLoader.setAsync("queue", () => new BackgroundQueue({
	concurrent: 5,
	logger: createLogger("Background Queue")
}));

moduleLoader.setPromise("hub", () => new Promise(resolve => {
	const hub = new HubFunctions(
		process.env.HUB_HOST,
		process.env.HUB_PORT,
		serverCategory.webcstool, {
			logger: createLogger("Hub", { colors: { debug: "magenta" } })
		}
	);

	return hub.connect().then(() =>
		resolve(hub)
	);
}));

moduleLoader.setPromise("steer", () => new Promise(resolve => {
	const steer = new SteerFunctions(
		process.env.STEER_HOST,
		process.env.STEER_PORT,
		serverCategory.webcstool, "WebIMSTool", {
			logger: createLogger("Steer", { colors: { debug: "bold magenta" } })
		}
	);

	if (!/^true$/i.test(process.env.STEER_ENABLE)) {
		steer.params.logger.warn("Not configured or disabled. QA authorization for Admin Panel is used.");
		return resolve(steer);
	}

	return steer.connect().then(() =>
		resolve(steer)
	);
}));

moduleLoader.setPromise("datasheetModel", () =>
	require("./models/datasheet.model")(createLogger("Datasheet", { colors: { debug: "gray" } }))
);

moduleLoader.setPromise("sequelize", () => new Promise((resolve, reject) => {
	if (!process.env.DB_HOST) {
		return reject("Invalid configuration parameter: DB_HOST");
	}

	if (!process.env.DB_DATABASE) {
		return reject("Invalid configuration parameter: DB_DATABASE");
	}

	if (!process.env.DB_USERNAME) {
		return reject("Invalid configuration parameter: DB_USERNAME");
	}

	const sequelizeLogger = createLogger("Database", { colors: { debug: "cyan" } });
	const namespace = cls.createNamespace("sequelize-app");

	Sequelize.useCLS(namespace);

	const sequelize = new Sequelize(
		process.env.DB_DATABASE,
		process.env.DB_USERNAME,
		process.env.DB_PASSWORD,
		{
			logging: msg => sequelizeLogger.debug(msg),
			dialect: "mysql",
			host: process.env.DB_HOST,
			port: process.env.DB_PORT || 3306,
			define: {
				timestamps: false,
				freezeTableName: true
			},
			pool: {
				max: 100,
				min: 0,
				acquire: 1000000,
				idle: 200000
			}
		}
	);

	sequelize.authenticate().then(() => {
		moduleLoader.setAsync("queueModel", require("./models/queue.model"), sequelize, DataTypes);
		moduleLoader.setAsync("serverModel", require("./models/server.model"), sequelize, DataTypes);
		moduleLoader.setAsync("dataModel", require("./models/data.model"), sequelize, DataTypes);
		moduleLoader.setAsync("accountModel", require("./models/account.model"), sequelize, DataTypes);
		moduleLoader.setAsync("reportModel", require("./models/report.model"), sequelize, DataTypes);
		moduleLoader.setAsync("shopModel", require("./models/shop.model"), sequelize, DataTypes);
		moduleLoader.setAsync("boxModel", require("./models/box.model"), sequelize, DataTypes);

		sequelizeLogger.info("Connected.");
		resolve(sequelize);
	}).catch(err => {
		sequelizeLogger.error("Connection error:", err);
		reject();
	});
}));

moduleLoader.final().then(
	/**
	 * @param {modules} modules
	 */
	modules => {
		const serverLoader = new CoreLoader();
		const tasksActions = new TasksActions(modules);
		const serverCheckActions = new ServerCheckActions(modules);

		serverLoader.setPromise("arbiterApi", () => {
			if (!process.env.API_ARBITER_LISTEN_PORT) {
				return Promise.reject("Invalid configuration parameter: API_ARBITER_LISTEN_PORT");
			}

			const es = new ExpressServer(modules, {
				logger: createLogger("Arbiter API", { colors: { debug: "bold blue" } }),
				disableCache: true
			});

			es.setLogging();
			es.setRouter("../routes/arbiter.index");

			return es.bind(
				process.env.API_ARBITER_LISTEN_HOST,
				process.env.API_ARBITER_LISTEN_PORT
			);
		});

		serverLoader.setPromise("portalApi", () => {
			if (!process.env.API_PORTAL_LISTEN_PORT) {
				return Promise.reject("Invalid configuration parameter: API_PORTAL_LISTEN_PORT");
			}

			if (!process.env.API_PORTAL_LOCALE) {
				return Promise.reject("Invalid configuration parameter: API_PORTAL_LOCALE");
			}

			if (!process.env.API_PORTAL_CLIENT_DEFAULT_REGION) {
				return Promise.reject("Invalid configuration parameter: API_PORTAL_CLIENT_DEFAULT_REGION");
			}

			const es = new ExpressServer(modules, {
				logger: createLogger("Portal API", { colors: { debug: "blue" } }),
				disableCache: true
			});

			if (/^true$/i.test(process.env.API_PORTAL_PUBLIC_FOLDER_ENABLE)) {
				es.setStatic("/public/shop/images/tera-icons", "data/tera-icons");
				es.setStatic("/public", "public");
			}

			es.setLogging();
			es.setRouter("../routes/portal.index");

			return es.bind(
				process.env.API_PORTAL_LISTEN_HOST,
				process.env.API_PORTAL_LISTEN_PORT
			);
		});

		serverLoader.setPromise("gatewayApi", () => {
			if (!process.env.API_GATEWAY_LISTEN_PORT) {
				return Promise.reject("Invalid configuration parameter: API_GATEWAY_LISTEN_PORT");
			}

			const es = new ExpressServer(modules, {
				logger: createLogger("Gateway API", { colors: { debug: "italic blue" } }),
				disableCache: true
			});

			es.setLogging();
			es.setRouter("../routes/gateway.index");

			return es.bind(
				process.env.API_GATEWAY_LISTEN_HOST,
				process.env.API_GATEWAY_LISTEN_PORT
			);
		});

		serverLoader.setPromise("adminPanel", () => {
			if (!process.env.ADMIN_PANEL_LISTEN_PORT) {
				return Promise.reject("Invalid configuration parameter: ADMIN_PANEL_LISTEN_PORT");
			}

			if (!process.env.ADMIN_PANEL_LOCALE) {
				return Promise.reject("Invalid configuration parameter: ADMIN_PANEL_LOCALE");
			}

			const es = new ExpressServer(modules, {
				logger: createLogger("Admin Panel", { colors: { debug: "dim blue" } }),
				enableCompression: true
			});

			es.setStatic("/static", "src/static/admin");
			es.setStatic("/static/images/tera-icons", "data/tera-icons");
			es.setLogging();
			es.setRouter("../routes/admin.index");

			return es.bind(
				process.env.ADMIN_PANEL_LISTEN_HOST,
				process.env.ADMIN_PANEL_LISTEN_PORT
			);
		});

		modules.queue.setModel(modules.queueModel.tasks);
		modules.queue.setHandlers(tasksActions);

		return serverLoader.final().then(() => {
			const serversStatusCheck = () => serverCheckActions.all();

			setInterval(serversStatusCheck, 10000);
			serversStatusCheck();

			setInterval(() =>
				modules.queue.start().catch(err =>
					modules.queue.logger.error(err)
				), 60000
			);

			setInterval(() =>
				cli.printMemoryUsage(), 60000 * 30
			);

			cli.printInfo();
			cli.printMemoryUsage();
			cli.printReady();
		});
	})
	.catch(err => {
		if (err) {
			logger.error(err);
		}

		cli.printEnded();
		process.exit();
	})
;