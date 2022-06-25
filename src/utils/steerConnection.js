/* eslint-disable no-empty-function */
"use strict";

const net = require("net");
const { PromiseSocket } = require("promise-socket");
const { OpMsg } = require("./protobuf/opMsg").op;
const SteerHelper = require("./steerHelper");

class SteerConnection extends SteerHelper {
	constructor(steerAddr, steerPort, serviceId, serviceName, params = { logger: null }) {
		super(params);

		this.socket = new PromiseSocket(new net.Socket());

		this.connected = false;
		this.registred = false;
		this.biasCount = 0;
		this.uniqueServerId = 0;
		this.reconnectInterval = null;
		this.steerAddr = steerAddr;
		this.steerPort = steerPort;
		this.serviceId = serviceId;
		this.serviceName = serviceName;

		this.socket.socket.on("error", err => {
			if (this.params.logger?.error) {
				this.params.logger.error(`SteerConnection ${err.toString()}`);
			}

			if (err.code === "ECONNRESET") {
				this.connected = false;
				this.registred = false;

				this.reconnect();
			}
		});
	}

	get isConnected() {
		return this.connected;
	}

	get isRegistred() {
		return this.registred;
	}

	connect() {
		clearInterval(this.reconnectInterval);
		this.reconnectInterval = setInterval(() => this.reconnect(), 10000);

		return this.socket.connect(this.steerPort, this.steerAddr).then(() => {
			this.connected = true;
			return this.checkRegistered();
		});
	}

	reconnect() {
		if (!this.connected) {
			this.connect().catch(() => {});
		}
	}

	destroy() {
		this.connected = false;
		this.registred = false;

		return this.socket.destroy();
	}

	checkRegistered() {
		if (!this.connected || this.registred) {
			return Promise.resolve();
		}

		const localEndpoint = `${this.socket.socket.localAddress}:${this.socket.socket.localPort}`.split(/:|\./);

		if (localEndpoint.length > 3) {
			const num = (parseInt(localEndpoint[2]) & 255) << 8;
			const num2 = parseInt(localEndpoint[3]) & 255;
			const num3 = (this.biasCount & 255) << 16;

			this.uniqueServerId = (num | num2 | num3);
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steerhub, 20), // checkRegister
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steerhub, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,
			jobId: 1
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			if (this.getErrorCode(data.resultCode) === this.steerErrorCode.success) {
				if (this.params.logger?.info) {
					this.params.logger.info(`Steer Registred: category ${this.serviceId}, number ${this.uniqueServerId}`);
				}

				this.registred = true;
			} else {
				this.biasCount++;

				if (this.biasCount > 10000) {
					return Promise.reject("Steer Error: can't register server");
				}

				this.connect();
			}
		});
	}

	checkLoginGetSessionKey(loginId, password, clientIp) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steersession, 1), // openSession
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steersession, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,

			arguments: [
				OpMsg.Argument.create({
					name: Buffer.from("loginid"),
					value: Buffer.from(loginId)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("password"),
					value: Buffer.from(password)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("clientIP"),
					value: Buffer.from(clientIp)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("additionalInfo"),
					value: Buffer.from("")
				}),
				OpMsg.Argument.create({
					name: Buffer.from("serviceName"),
					value: Buffer.from(this.serviceName)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("allowMultipleLoginFlag"),
					value: Buffer.from("1")
				})
			]
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				return Promise.resolve(Buffer.from(data.sessionKey).toString());
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}

	validateSessionKey(sessionKey, clientIp) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steersession, 2), // checkSession
			sessionKey: Buffer.from(sessionKey),
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steersession, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,

			arguments: [
				OpMsg.Argument.create({
					name: Buffer.from("clientIP"),
					value: Buffer.from(clientIp)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("additionalInfo"),
					value: Buffer.from("")
				})
			]
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				const resultedSessionLey = Buffer.from(data.sessionKey).toString();

				if (resultedSessionLey === sessionKey) {
					return Promise.resolve(resultedSessionLey);
				} else {
					return Promise.reject(resultCode);
				}
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}

	logoutSessionKey(sessionKey) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steersession, 3), // closeSession
			sessionKey: Buffer.from(sessionKey),
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steersession, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				return Promise.resolve(data);
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}

	getFunction(sessionKey, nextJobId, startPos, rowLength) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steermind, 16), // getFunctionListBySessionAndServerType
			sessionKey: Buffer.from(sessionKey),
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steermind, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,
			jobId: nextJobId,

			arguments: [
				OpMsg.Argument.create({
					name: Buffer.from("serverType"),
					value: Buffer.from(this.serviceId.toString())
				}),
				OpMsg.Argument.create({
					name: Buffer.from("startPos"),
					value: Buffer.from(startPos.toString())
				}),
				OpMsg.Argument.create({
					name: Buffer.from("rowlength"),
					value: Buffer.from(rowLength.toString())
				})
			]
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				return Promise.resolve(data.resultSets[0]);
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}

	getFunctionList(sessionKey, jobId = 2) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		let nextJobId = jobId;

		return this.getFunction(sessionKey, nextJobId, 0, 0).then(({ totalCount }) => {
			const promises = [];

			for (let num = 0; num <= totalCount; num += 512) {
				promises.push(this.getFunction(sessionKey, ++nextJobId, num, 512));
			}

			return Promise.all(promises).then(data => {
				const functions = {};

				for (const row of data[0].rows) {
					if (row.values.length >= 6) {
						functions[row.values[4].toString()] = row.values[5].toString();
					}
				}

				return Promise.resolve(functions);
			});
		});
	}

	getDisplayFunctionList(sessionKey, displayGroupType = 1) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steermind, 35), // getDisplayFunctionListByUserIDintForMenu
			sessionKey: Buffer.from(sessionKey),
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steermind, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,

			arguments: [
				OpMsg.Argument.create({
					name: Buffer.from("displayGroupType"),
					value: Buffer.from(displayGroupType.toString())
				}),
				OpMsg.Argument.create({
					name: Buffer.from("serviceName"),
					value: Buffer.from(this.serviceName)
				})
			]
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				return Promise.resolve(data.resultSets[0]);
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}

	checkFunctionExecutionPrivilege(sessionKey, globalUniqueFunctionIDint, executeArguments = null) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		let strExecuteArguments = "";

		if (executeArguments !== null) {
			if (executeArguments.length === 1) {
				strExecuteArguments = executeArguments[0];
			} else {
				strExecuteArguments = executeArguments.join(",");
			}
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steermind, 18), // checkFunctionExecutionPrivilege
			sessionKey: Buffer.from(sessionKey),
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steermind, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,

			arguments: [
				OpMsg.Argument.create({
					name: Buffer.from("globalUniqueFunctionIDint"),
					value: Buffer.from(globalUniqueFunctionIDint.toString())
				}),
				OpMsg.Argument.create({
					name: Buffer.from("executeArguments"),
					value: Buffer.from(strExecuteArguments)
				})
			]
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				return Promise.resolve(data.resultScalar);
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}

	notifyFunctionResult(sessionKey, strTransId, result, executeComment = null) {
		if (!this.connected || !this.registred) {
			return Promise.reject("Steer Error: not registred");
		}

		const opMsg = OpMsg.create({
			gufid: this.makeGuid(this.serverType.steermind, 19), // notifyFunctionResult
			sessionKey: Buffer.from(sessionKey),
			senderGusid: this.makeGuid(this.serviceId, this.uniqueServerId),
			receiverGusid: this.makeGuid(this.serverType.steermind, 0),
			execType: OpMsg.ExecType.EXECUTE,
			jobType: OpMsg.JobType.REQUEST,

			arguments: [
				OpMsg.Argument.create({
					name: Buffer.from("transactionIDint"),
					value: Buffer.from(strTransId.toString())
				}),
				OpMsg.Argument.create({
					name: Buffer.from("executionResult"),
					value: Buffer.from(result)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("result"),
					value: Buffer.from(result)
				}),
				OpMsg.Argument.create({
					name: Buffer.from("executeComment"),
					value: Buffer.from(executeComment)
				})
			]
		});

		return this.sendAndRecv(this.socket, opMsg).then(data => {
			const resultCode = this.getErrorCode(data.resultCode);

			if (resultCode === this.steerErrorCode.success) {
				return Promise.resolve(resultCode);
			} else {
				return Promise.reject(`Steer Error: ${resultCode}`);
			}
		});
	}
}

module.exports = SteerConnection;