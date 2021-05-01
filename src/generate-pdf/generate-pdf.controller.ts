import { Controller, Get, Res, Query, Header } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { Response } from 'express';
import { GeneratePdfService } from './generate-pdf.service';

@ApiUseTags('generate-pdf')
@Controller('generate-pdf')
export class GeneratePdfController {
	constructor(private readonly _generatePdfService: GeneratePdfService) {}

	@ApiOperation({ title: 'Get generated pdf' })
	@ApiResponse({ status: 200, description: 'Return generated pdf.' })
	@ApiResponse({ status: 403, description: 'Forbidden.' })
	@Get()
	@Header('Content-Type', 'application/pdf')
	@Header('Cache-Control', 'no-cache, no-store, must-revalidate')
	@Header('Pragma', 'no-cache')
	@Header('Expires', '0')
	async generatePdf(@Res() res: Response, @Query() query: any): Promise<void> {
		const buffer: Buffer = await this._generatePdfService.generatePdf(query);
		const stream = this._generatePdfService.getReadableStream(buffer);
		const filename = this._generatePdfService.getFilename(query);

		res.set({
			'Content-Disposition': `attachment; filename=${filename}`,
			'Content-Length': (buffer && buffer.length) || 0,
		});

		stream.pipe(res);
	}
}
