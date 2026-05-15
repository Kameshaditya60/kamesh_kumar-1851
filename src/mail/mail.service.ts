import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transportConfigured: boolean;

  constructor(
    private readonly mailer: MailerService,
    config: ConfigService,
  ) {
    this.transportConfigured = !!config.get<string>('MAIL_HOST');
    if (!this.transportConfigured) {
      this.logger.warn(
        'MAIL_HOST is not set — emails will be logged but not delivered. Configure SMTP env vars to enable sending.',
      );
    }
  }

  async sendBrandWelcomeEmail(to: string, password: string): Promise<void> {
    const subject = 'Your brand account credentials';
    const text = [
      'Hi,',
      '',
      'A brand account has been created for you.',
      '',
      `Login email : ${to}`,
      `Password    : ${password}`,
      '',
      'Please log in and change your password as soon as possible.',
    ].join('\n');

    this.logger.log(`Preparing welcome email for ${to}`);
    if (!this.transportConfigured) {
      this.logger.log(`(no-op send) ${subject} → ${to}\n${text}`);
      return;
    }

    try {
      await this.mailer.sendMail({ to, subject, text });
      this.logger.log(`Welcome email delivered to ${to}`);
    } catch (err) {
      this.logger.warn(
        `Welcome email send failed for ${to}: ${(err as Error).message}`,
      );
    }
  }
}
