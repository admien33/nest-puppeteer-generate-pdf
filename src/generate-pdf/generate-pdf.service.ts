import moment from 'moment';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { Readable } from 'stream';
import PDFMerger from 'pdf-merger-js';
import QRCode from 'qrcode';
import { INVOICE_LOGO_DATAURI, reverseWord } from './generate-pdf.constant';
const readFile = promisify(fs.readFile);

const configPuppeter = {
	args: [
		// Required for Docker version of Puppeteer
		'--no-sandbox',
		'--disable-setuid-sandbox',
		// This will write shared memory files into /tmp instead of /dev/shm,
		// because Docker’s default for /dev/shm is 64MB
		'--disable-dev-shm-usage',
	],
};

@Injectable()
export class GeneratePdfService {
	constructor() {}

	async generatePdf(query: any): Promise<Buffer> {
		let data: any[] = [];
		let dataRaw: any[] = [];
		let template: string;

		handlebars.registerHelper('reverseWord', reverseWord);

		// handlebars.registerHelper('qrcode', function (qrCode: string) {
		// 	QRCode.toDataURL(qrCode, { errorCorrectionLevel: 'H' }, function (err, url) {
		// 		return url;
		// 	});
		// });

		if ('template' in query) {
			template = query['template'];
		} else {
			return Promise.reject('No template on query');
		}

		if ('data' in query) {
			if (template === 'invoice') {
				dataRaw = query['data'].split(',');
				console.log('nb pages to generate : ' + dataRaw.length);
				// data = dataRaw.map((invoice: string) => {
				// 	return { invoice: invoice, logo_data_uri: INVOICE_LOGO_DATAURI, qrcode_data_uri: INVOICE_LOGO_DATAURI };
				// });
			} else {
				return Promise.reject('No match template with data on query');
			}
		} else {
			return Promise.reject('No data on query');
		}

		try {
			// let nowStart = moment();
			// const generatedArrayData = await this.setDataTemplates(dataRaw);
			// console.log(`generatedArrayData, time duration ms :  ${moment().diff(nowStart)}`);
			// nowStart = moment();
			// const templateHtml: string = await this.getTemplateHtml(template);
			// console.log(`generatedArrayData, time duration ms :  ${moment().diff(nowStart)}`);
			// nowStart = moment();
			// const buffer: Buffer =  await this.getPdfBuffer(templateHtml, generatedArrayData);
			// console.log(`generatedArrayData, time duration ms :  ${moment().diff(nowStart)}`);
			// const arrayBuffer: Buffer[] = await this.generatePdfBuffers(templateHtml, data);
			// return await this.mergePdf(arrayBuffer);
			let generatedArrayData: any[] = [];
			return await this.setDataTemplates(dataRaw)
				.then(async (dataTemplates) => {
					generatedArrayData = dataTemplates;
					// console.log('dataTemplates : ' + JSON.stringify(dataTemplates));
					return await this.getTemplateHtml(template);
				})
				.then(async (templateHtml) => {
					// return await this.generatePdfBuffers(templateHtml, data);
					return await this.getPdfBuffer(templateHtml, generatedArrayData);
				})
				// .then(async (arrayBuffer) => {
				// 	// return await this.mergePdf(arrayBuffer);
				// 	return arrayBuffer[0];
				// })
				.catch((err) => {
					console.error(err);
					return Promise.reject(err);
				});
		} catch (err) {
			return Promise.reject('Could not generate pdf, err :' + err);
		}
	}

	async setDataTemplates(dataTemplates: any[]): Promise<any[]> {
		try {
			const arrayData: any[] = [];

			let promiseArray: Promise<any>[] = dataTemplates.map(async (dataTemplate, index) => {
				const generateQR = await QRCode.toDataURL(dataTemplate);
				return Promise.resolve(
					(arrayData[index] = {
						invoice: dataTemplate,
						logo_data_uri: INVOICE_LOGO_DATAURI,
						qrcode_data_uri: generateQR,
					})
				);
			});

			return await Promise.all(promiseArray)
				.then((arrayData) => Promise.resolve(arrayData))
				.catch((err) => Promise.reject(err));
		} catch (err) {
			return Promise.reject('Could not generate data array, err :' + err);
		}
	}

	async getTemplateHtml(template: string): Promise<string> {
		try {
			const templatePath = path.resolve(`./src/templates/${template}/${template}.html`);
			return await readFile(templatePath, 'utf8');
		} catch (err) {
			return Promise.reject('Could not load html template, err : ' + err);
		}
	}

	async getPdfBuffer(templateHtml: string, dataTemplates: any[]): Promise<Buffer> {
		try {
			const templateHandlebars: HandlebarsTemplateDelegate<any> = handlebars.compile(templateHtml, {
				strict: true,
				knownHelpersOnly: false,
				noEscape: true,
			});
			let browser: puppeteer.Browser = await puppeteer.launch(configPuppeter);
			const arrayBuffer: Buffer[] = [];

			let result: string = templateHandlebars({ dataArray: dataTemplates });
			let html = result;
			let page: puppeteer.Page = await browser.newPage();
			page.setDefaultNavigationTimeout(0);
			await page.setContent(html);
			let buffer: Buffer = await page.pdf({
				preferCSSPageSize: true,
			});
			await page.close();
			return Promise.resolve(buffer);
		} catch (err) {
			return Promise.reject('Could not generate pdf buffer puppeter, err : ' + err);
		}
	}

	async generatePdfBuffers(templateHtml: string, dataTemplates: any[]): Promise<Buffer[]> {
		try {
			const templateHandlebars: HandlebarsTemplateDelegate<any> = handlebars.compile(templateHtml, {
				strict: true,
				knownHelpersOnly: false,
				noEscape: true,
			});
			let browser: puppeteer.Browser = await puppeteer.launch(configPuppeter);
			const arrayBuffer: Buffer[] = [];

			let promiseArrayBuffer: Promise<Buffer>[] = dataTemplates.map(async (dataTemplate, index) => {
				return await this.getConcurrencyPdfBuffer(dataTemplate, index, arrayBuffer, templateHandlebars, browser);
			});

			return await Promise.all(promiseArrayBuffer)
				.then((arrayBuffer) => Promise.resolve(arrayBuffer))
				.catch((err) => Promise.reject(err));
		} catch (err) {
			return Promise.reject('Could not generate pdf array buffer, err :' + err);
		}
	}

	async getConcurrencyPdfBuffer(
		dataTemplate: any,
		index: number,
		arrayBuffer: Buffer[],
		templateHandlebars: HandlebarsTemplateDelegate<any>,
		browser: puppeteer.Browser
	) {
		try {
			let result: string = templateHandlebars(dataTemplate);
			let html = result;
			let page: puppeteer.Page = await browser.newPage();
			page.setDefaultNavigationTimeout(0);
			await page.setContent(html);
			let buffer: Buffer = await page.pdf({
				preferCSSPageSize: true,
				// scale: 0.95,
				// headerTemplate: '<div/>',
				// footerTemplate:
				// '<div style="text-align: right;width: 297mm;font-size: 8px;"><span style="margin-right: 1cm"><span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
			});
			await page.close();
			return Promise.resolve((arrayBuffer[index] = buffer));
		} catch (err) {
			return Promise.reject('Could not generate pdf buffer puppeter, err : ' + err);
		}
	}

	async mergePdf(arrayBuffer: Buffer[]): Promise<Buffer> {
		try {
			let merger = new PDFMerger();
			arrayBuffer.forEach((buffer) => {
				merger.add(buffer);
			});
			return await merger.saveAsBuffer();
		} catch (err) {
			return Promise.reject('Could not merge pdf');
		}
	}

	getReadableStream(buffer: Buffer): Readable {
		const stream = new Readable();

		stream.push(buffer);
		stream.push(null);

		return stream;
	}

	getFilename(query: any): string {
		let filename = 'file';
		if ('filename' in query) {
			filename = query['filename'];
		} else if ('template' in query) {
			filename = query['template'];
		}

		return `${filename}-${moment().format()}.pdf`;
	}
}
