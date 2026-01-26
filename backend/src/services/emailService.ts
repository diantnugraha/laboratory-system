import Mailgun from 'mailgun.js'
import formData from 'form-data'

const mailgun = new Mailgun(formData)
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
})

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export const emailService = {
  async send(options: SendEmailOptions): Promise<boolean> {
    try {
      const domain = process.env.MAILGUN_DOMAIN || ''
      const fromName = process.env.MAILGUN_FROM_NAME || 'SIMLab'
      const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`

      await mg.messages.create(domain, {
        from: `${fromName} <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      })
      console.log(`Email sent successfully to ${options.to}`)
      return true
    } catch (error) {
      console.error('Email send error:', error)
      return false
    }
  },

  async sendWelcomeEmail(email: string, displayName: string, token: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const setupUrl = `${frontendUrl}/setup-password?token=${token}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Welcome to SIMLab!</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Hi <strong>${displayName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Your account has been created. Please click the button below to setup your password:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${setupUrl}"
                             style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 32px;
                                    text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                            Setup Your Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.5;">
                      This link will expire in <strong>48 hours</strong>. If you didn't request this, please ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; margin-top: 20px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      SIMLab - Laboratory Information Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    return this.send({
      to: email,
      subject: 'Welcome to SIMLab - Setup Your Password',
      html,
      text: `Welcome to SIMLab!\n\nHi ${displayName},\n\nYour account has been created. Please setup your password here: ${setupUrl}\n\nThis link will expire in 48 hours.`,
    })
  },

  async sendPasswordResetEmail(email: string, displayName: string, token: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Reset Your Password</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Hi <strong>${displayName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${resetUrl}"
                             style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 32px;
                                    text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.5;">
                      This link will expire in <strong>1 hour</strong>. If you didn't request this, please ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; margin-top: 20px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      SIMLab - Laboratory Information Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    return this.send({
      to: email,
      subject: 'SIMLab - Reset Your Password',
      html,
      text: `Reset Your Password\n\nHi ${displayName},\n\nWe received a request to reset your password. Reset your password here: ${resetUrl}\n\nThis link will expire in 1 hour.`,
    })
  },

  /**
   * Send order reviewed notification to customer contact
   */
  async sendOrderReviewedNotification(
    email: string,
    contactName: string,
    orderCode: string,
    customerName: string,
    status: 'Reviewed' | 'To Be Verified' | 'Cancelled',
    reason?: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const orderUrl = `${frontendUrl}/operational/order`

    const statusColor = status === 'Reviewed' ? '#16a34a' : status === 'Cancelled' ? '#dc2626' : '#eab308'
    const statusText = status === 'Reviewed' ? 'telah disetujui' : status === 'Cancelled' ? 'telah dibatalkan' : 'perlu diverifikasi ulang'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Order ${status}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Yth. <strong>${contactName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Order dengan kode <strong>${orderCode}</strong> untuk <strong>${customerName}</strong> ${statusText}.
                    </p>
                    <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="margin: 0; font-size: 14px; color: #71717a;">Order Code</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #18181b;">${orderCode}</p>
                      <p style="margin: 12px 0 0 0; font-size: 14px; color: #71717a;">Status</p>
                      <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: ${statusColor};">${status}</p>
                      ${reason ? `
                      <p style="margin: 12px 0 0 0; font-size: 14px; color: #71717a;">Catatan</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #3f3f46;">${reason}</p>
                      ` : ''}
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${orderUrl}"
                             style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 32px;
                                    text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                            Lihat Order
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; margin-top: 20px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      SIMLab - Laboratory Information Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    return this.send({
      to: email,
      subject: `SIMLab - Order ${orderCode} ${status}`,
      html,
      text: `Order ${status}\n\nYth. ${contactName},\n\nOrder dengan kode ${orderCode} untuk ${customerName} ${statusText}.${reason ? `\n\nCatatan: ${reason}` : ''}\n\nLihat order: ${orderUrl}`,
    })
  },

  /**
   * Send payment upload notification to admin
   */
  async sendPaymentUploadNotification(
    adminEmails: string[],
    orderCode: string,
    customerName: string,
    contactName: string,
    paymentDate?: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const orderUrl = `${frontendUrl}/operational/order`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Bukti Pembayaran Diunggah</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Customer telah mengunggah bukti pembayaran untuk order berikut:
                    </p>
                    <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="margin: 0; font-size: 14px; color: #71717a;">Order Code</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #18181b;">${orderCode}</p>
                      <p style="margin: 12px 0 0 0; font-size: 14px; color: #71717a;">Customer</p>
                      <p style="margin: 4px 0 0 0; font-size: 16px; color: #3f3f46;">${customerName}</p>
                      <p style="margin: 12px 0 0 0; font-size: 14px; color: #71717a;">Contact</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #3f3f46;">${contactName}</p>
                      ${paymentDate ? `
                      <p style="margin: 12px 0 0 0; font-size: 14px; color: #71717a;">Tanggal Pembayaran</p>
                      <p style="margin: 4px 0 0 0; font-size: 14px; color: #3f3f46;">${paymentDate}</p>
                      ` : ''}
                    </div>
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Silakan verifikasi dan konfirmasi pembayaran.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${orderUrl}"
                             style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 32px;
                                    text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                            Verifikasi Pembayaran
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; margin-top: 20px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      SIMLab - Laboratory Information Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    // Send to all admin emails
    const results = await Promise.all(
      adminEmails.map(email =>
        this.send({
          to: email,
          subject: `SIMLab - Bukti Pembayaran Order ${orderCode}`,
          html,
          text: `Bukti Pembayaran Diunggah\n\nCustomer telah mengunggah bukti pembayaran untuk order ${orderCode}.\n\nCustomer: ${customerName}\nContact: ${contactName}${paymentDate ? `\nTanggal Pembayaran: ${paymentDate}` : ''}\n\nSilakan verifikasi dan konfirmasi pembayaran.\n\nLihat order: ${orderUrl}`,
        })
      )
    )

    return results.some(r => r)
  },

  /**
   * Send order status change notification
   */
  async sendStatusChangeNotification(
    email: string,
    contactName: string,
    orderCode: string,
    customerName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const orderUrl = `${frontendUrl}/operational/order`

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Status Order Diperbarui</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 16px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Yth. <strong>${contactName}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; color: #3f3f46; font-size: 16px; line-height: 1.5;">
                      Status order <strong>${orderCode}</strong> untuk <strong>${customerName}</strong> telah diperbarui.
                    </p>
                    <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
                      <p style="margin: 0; font-size: 14px; color: #71717a;">Order Code</p>
                      <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #18181b;">${orderCode}</p>
                      <div style="display: flex; align-items: center; margin-top: 12px;">
                        <div style="flex: 1;">
                          <p style="margin: 0; font-size: 14px; color: #71717a;">Status Sebelumnya</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #71717a; text-decoration: line-through;">${oldStatus}</p>
                        </div>
                        <div style="padding: 0 16px; color: #71717a;">→</div>
                        <div style="flex: 1;">
                          <p style="margin: 0; font-size: 14px; color: #71717a;">Status Baru</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #16a34a;">${newStatus}</p>
                        </div>
                      </div>
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${orderUrl}"
                             style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 14px 32px;
                                    text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 500;">
                            Lihat Order
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #e4e4e7; margin-top: 20px;">
                    <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center;">
                      SIMLab - Laboratory Information Management System
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    return this.send({
      to: email,
      subject: `SIMLab - Status Order ${orderCode} Diperbarui`,
      html,
      text: `Status Order Diperbarui\n\nYth. ${contactName},\n\nStatus order ${orderCode} untuk ${customerName} telah diperbarui.\n\nStatus: ${oldStatus} → ${newStatus}\n\nLihat order: ${orderUrl}`,
    })
  },
}
