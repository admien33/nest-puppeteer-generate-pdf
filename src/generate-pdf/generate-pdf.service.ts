import moment from 'moment';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { Readable } from 'stream';
import PDFMerger from 'pdf-merger-js';
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
		let template;

		if ('template' in query) {
			template = query['template'];
		} else {
			return Promise.reject('No template on query');
		}

		if ('data' in query) {
			if (template === 'invoice') {
				let dataRaw = query['data'].split(',');
				data = dataRaw.map((invoice: string) => {
					return { invoice: invoice };
				});
			} else {
				return Promise.reject('No match template with data on query');
			}
		} else {
			return Promise.reject('No data on query');
		}

		try {
			return await this.getTemplateHtml(template)
				.then(async (templateHtml) => {
					return await this.generatePdfBuffers(templateHtml, data);
				})
				.then(async (buffers) => {
					return await this.mergePdfBuffers(buffers);
				})
				.catch((err) => {
					console.error(err);
					return Promise.reject(err);
				});
		} catch (err) {
			return Promise.reject('Could not generate pdf');
		}
	}

	async getTemplateHtml(template: string): Promise<string> {
		try {
			const templatePath = path.resolve(`./templates/${template}.html`);
			return await readFile(templatePath, 'utf8');
		} catch (err) {
			return Promise.reject('Could not load html template');
		}
	}

	async generatePdfBuffers(templateHtml: string, dataTemplates: any[]): Promise<Buffer[]> {
		try {
			const templateHandlebars: HandlebarsTemplateDelegate<any> = handlebars.compile(templateHtml, { strict: true });
			let browser: puppeteer.Browser = await puppeteer.launch(configPuppeter);
			// const browserVersion = await browser.version();
			// console.log(`Started ${browserVersion}`);
			const buffers: Buffer[] = [];

			let promisesBuffers: Promise<Buffer>[] = dataTemplates.map(async (dataTemplate, index) => {
				return await this.getConcurrencyBufferPdfPage(dataTemplate, index, buffers, templateHandlebars, browser);
			});

			return await Promise.all(promisesBuffers)
				.then((buffers) => Promise.resolve(buffers))
				.catch((err) => Promise.reject(err));
		} catch (err) {
			return Promise.reject('Could not generate pdf buffers');
		}
	}

	async getConcurrencyBufferPdfPage(
		dataTemplate: any,
		index: number,
		buffers: Buffer[],
		templateHandlebars: HandlebarsTemplateDelegate<any>,
		browser: puppeteer.Browser
	) {
		try {
			let result: string = templateHandlebars(dataTemplate);
			let html = result;
			let page: puppeteer.Page = await browser.newPage();
			await page.setContent(html);
			let buffer: Buffer = await page.pdf({
				// format: 'A4',
				// printBackground: true,
				// margin: {
				// 	left: '0px',
				// 	top: '0px',
				// 	right: '0px',
				// 	bottom: '0px',
				// },
			});
			await page.close();

			return Promise.resolve((buffers[index] = buffer));
		} catch (err) {
			return Promise.reject('Could not generate pdf buffer');
		}
	}

	async mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
		try {
			let merger = new PDFMerger();

			buffers.forEach((buffer) => {
				merger.add(buffer);
			});
			return await merger.saveAsBuffer();
		} catch (err) {
			return Promise.reject('Could not merge pdf buffers');
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
