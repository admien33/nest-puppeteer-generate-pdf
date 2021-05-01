import moment from 'moment';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import puppeteer from 'puppeteer';
import handlebars, { template } from 'handlebars';
import { Readable } from 'stream';
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

	async getTemplateHtml(template: string): Promise<string> {
		try {
			const invoicePath = path.resolve(`./templates/${template}.html`);
			return await readFile(invoicePath, 'utf8');
		} catch (err) {
			return Promise.reject('Could not load html template');
		}
	}

	async generatePdf(query: any): Promise<Buffer> {
		let data = {};
		let page;
		let browser;
		let template;

		if ('template' in query) {
			template = query['template'];
		} else {
			return Promise.reject('No template on query');
		}

		if ('data' in query) {
			data = JSON.parse(query['data']);
		}
		data = { invoice: '123' };

		return await this.getTemplateHtml(template)
			.then(async (res) => {
				const templateHandlebars: HandlebarsTemplateDelegate<any> = handlebars.compile(res, { strict: true });
				browser = await puppeteer.launch(configPuppeter);
				// const browserVersion = await browser.version();
				// console.log(`Started ${browserVersion}`);

				const result: string = templateHandlebars(data);
				const html = result;				
				page = await browser.newPage();
				await page.setContent(html);
				const buffer: Buffer = await page.pdf({
					// format: 'A4',
					// printBackground: true,
					margin: {
						left: '0px',
						top: '0px',
						right: '0px',
						bottom: '0px',
					},
				});
				await page.close();


				await browser.close();
				return Promise.resolve(buffer);
			})
			.catch((err) => {
				console.error(err);
				return Promise.reject(err);
			});
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
