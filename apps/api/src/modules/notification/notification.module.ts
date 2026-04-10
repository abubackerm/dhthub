import { Module, OnModuleDestroy } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MsalService } from './services/msal.service';
import { EmailService } from './services/email.service';
import { TemplateService } from './services/template.service';
import { EnquiryEmailListener } from './listeners/enquiry-email.listener';
import { AuthEmailListener } from './listeners/auth-email.listener';
import { UserCreatedListener } from './listeners/user-created.listener';
import { ContactController } from './controllers/contact.controller';

@Module({
  imports: [EventEmitterModule],
  controllers: [ContactController],
  providers: [
    MsalService,
    TemplateService,
    EmailService,
    EnquiryEmailListener,
    AuthEmailListener,
    UserCreatedListener,
  ],
  exports: [EmailService],
})
export class NotificationModule implements OnModuleDestroy {
  constructor(private readonly msalService: MsalService) {}

  onModuleDestroy() {
    return this.msalService.onModuleDestroy();
  }
}
