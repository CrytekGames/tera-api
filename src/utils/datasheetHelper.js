"use strict";

const fs = require("fs");
const path = require("path");
const xmljs = require("xml-js");
const logger = require("./logger").createLogger("Datasheet Helper");

module.exports.loadXml = (datasheet, language) => {
	const direcory = path.join(__dirname, "..", "..", "data", "datasheets", language, datasheet);

	return fs.promises.readdir(direcory, { withFileTypes: true }).then(filenames => {
		const promises = [];

		filenames.forEach((file, index) => {
			if (path.extname(file.name) !== ".xml") {
				return;
			}

			promises.push(
				fs.promises.readFile(path.join(direcory, file.name), { encoding: "utf8" }).then(content => {
					const elements = [];
					const data = xmljs.xml2js(content, { ignoreComment: true }).elements[0];

					if (data) {
						data.elements.forEach(element =>
							elements.push(element.attributes)
						);
					}

					logger.debug(`Loaded: [${language}] ${filenames.length - index}/${filenames.length}: ${file.name} (${data.elements.length})`);

					return Promise.resolve(elements);
				})
			);
		});

		return Promise.all(promises).then(data =>
			data.reduce((array, row) => array.concat(row), [])
		);
	});
};