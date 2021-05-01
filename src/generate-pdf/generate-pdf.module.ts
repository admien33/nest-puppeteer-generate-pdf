import { Module } from '@nestjs/common';
import { GeneratePdfController } from './generate-pdf.controller';
import { GeneratePdfService } from './generate-pdf.service';

@Module({
  providers: [GeneratePdfService],
  controllers: [GeneratePdfController],
})
export class GeneratePdfModule {}
