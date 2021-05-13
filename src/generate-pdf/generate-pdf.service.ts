import moment from 'moment';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { Readable } from 'stream';
import PDFMerger from 'pdf-merger-js';
import rimraf from 'rimraf';
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
		let folderName: string = `temp-${Date.now()}`;
		fs.mkdirSync(`./${folderName}`);
		console.log('folderName : ' + folderName)

		if ('template' in query) {
			template = query['template'];
		} else {
			return Promise.reject('No template on query');
		}

		if ('data' in query) {
			if (template === 'invoice') {
				let dataRaw = query['data'].split(',');
				console.log('nb pages to generate : ' +dataRaw.length);
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
					return await this.generatePdfFiles(templateHtml, data, folderName);
				})
				.then(async (arrayFilename) => {
					const buffer: Buffer = await this.mergePdf(arrayFilename);
					rimraf.sync(`./${folderName}`);
					return buffer;
				})
				.catch((err) => {
					rimraf.sync(`./${folderName}`);
					console.error(err);
					return Promise.reject(err);
				});
		} catch (err) {
			return Promise.reject('Could not generate pdf, err :' + err);
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

	async generatePdfFiles(templateHtml: string, dataTemplates: any[], folderName: string): Promise<string[]> {
		try {
			const templateHandlebars: HandlebarsTemplateDelegate<any> = handlebars.compile(templateHtml, { strict: true });
			let browser: puppeteer.Browser = await puppeteer.launch(configPuppeter);
			const arrayFilename: string[] = [];

			let promiseArrayFilename: Promise<string>[] = dataTemplates.map(async (dataTemplate, index) => {
				return await this.getConcurrencyPdfPage(
					dataTemplate,
					index,
					arrayFilename,
					templateHandlebars,
					browser,
					folderName
				);
			});

			return await Promise.all(promiseArrayFilename)
				.then((arrayFilename) => Promise.resolve(arrayFilename))
				.catch((err) => Promise.reject(err));
		} catch (err) {
			return Promise.reject('Could not generate pdf array filename, err :' + err);
		}
	}

	async getConcurrencyPdfPage(
		dataTemplate: any,
		index: number,
		arrayFilename: string[],
		templateHandlebars: HandlebarsTemplateDelegate<any>,
		browser: puppeteer.Browser,
		folderName: string
	) {
		try {
			let result: string = templateHandlebars(dataTemplate);
			let html = result;
			let filename: string = `pdf${index}.pdf`;
			let path: string = `${folderName}/${filename}`; 
			let page: puppeteer.Page = await browser.newPage();
			await page.setDefaultNavigationTimeout(0); 
			await page.setContent(html);
			// let buffer: Buffer = await page.pdf({});
			await page.pdf({ path: `${path}` });
			await page.close();
			// return Promise.resolve((buffers[index] = buffer));
			return Promise.resolve((arrayFilename[index] = path));
		} catch (err) {
			return Promise.reject('Could not generate pdf puppeter, err : ' + err);
		}
	}

	async mergePdf(arrayFilename: string[]): Promise<Buffer> {
		try {
			let merger = new PDFMerger();
			arrayFilename.forEach((filename) => {
				merger.add(filename);
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