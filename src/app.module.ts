import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { GeneratePdfModule } from "./generate-pdf/generate-pdf.module";

@Module({
  imports: [
    GeneratePdfModule
  ],
  controllers: [AppController],
  providers: [],
})
export class ApplicationModule {}
