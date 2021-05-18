import { Controller, Get, Res, Query, Header } from '@nestjs/common';
import { ApiImplicitQuery, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GeneratePdfService } from './generate-pdf.service';
import moment from 'moment';

@ApiUseTags('generate-pdf')
@Controller('generate-pdf')
export class GeneratePdfController {
	constructor(private readonly _generatePdfService: GeneratePdfService) {}

	@ApiOperation({ title: 'Get generated pdf' })
	@ApiResponse({ status: 200, description: 'Return generated pdf.' })
	@ApiResponse({ status: 403, description: 'Forbidden.' })
	@Get()
	@ApiImplicitQuery({
		name: 'template',
		description: 'test with: invoice',
		required: true,
		type: String,
	})
	@ApiImplicitQuery({
		name: 'data',
		description: 'case template invoice: 123,124,125',
		required: true,
		type: String,
	})
	@ApiImplicitQuery({
		name: 'filename',
		required: false,
		type: String,
	})
	@Header('Content-Type', 'application/pdf')
	@Header('Cache-Control', 'no-cache, no-store, must-revalidate')
	@Header('Pragma', 'no-cache')
	@Header('Expires', '0')
	async generatePdf(@Res() res: Response, @Query() query: any): Promise<void> {
		let nowStart = moment();
		const buffer: Buffer = await this._generatePdfService.generatePdf(query);
		const stream = this._generatePdfService.getReadableStream(buffer);
		const filename = this._generatePdfService.getFilename(query);
		let nowEnd = moment();
		console.log(`${filename}, time duration ms :  ${nowEnd.diff(nowStart)}`)
		res.set({
			'Content-Disposition': `attachment; filename=${filename}`,
			'Content-Length': (buffer && buffer.length) || 0,
		});

		stream.pipe(res);
		// res.end(buffer)
	}
}
