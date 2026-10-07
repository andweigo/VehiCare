<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <meta name="supported-color-schemes" content="dark light">
    <title>VehiCare Verification Code</title>
</head>
<body style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px 12px; width: 100% !important;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #09090b; width: 100%;">
        <tr>
            <td align="center" style="padding: 10px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 520px; background-color: #141416; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.5);">
                    <!-- HEADER -->
                    <tr>
                        <td style="background-color: #0d0d0f; padding: 28px 24px; border-bottom: 2px solid #F63B05; text-align: center;">
                            <span style="color: #F63B05; font-size: 28px; font-weight: 800; letter-spacing: 1.5px; display: inline-block;">VehiCare</span>
                        </td>
                    </tr>
                    
                    <!-- BODY CONTENT -->
                    <tr>
                        <td style="padding: 36px 28px; text-align: center;">
                            @if(($purpose ?? '') === 'password_reset')
                                <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 14px 0; letter-spacing: 0.3px;">Password Reset Verification</h2>
                                <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">Use the 6-digit verification code below to complete your password reset request for your VehiCare account.</p>
                            @else
                                <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 14px 0; letter-spacing: 0.3px;">Verify Your Email Address</h2>
                                <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">Welcome to VehiCare! Please use the 6-digit verification code below to complete your account setup.</p>
                            @endif

                            <!-- OTP CODE BOX -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto 28px auto;">
                                <tr>
                                    <td style="background-color: #09090b; border: 2px dashed #F63B05; border-radius: 12px; padding: 18px 32px; text-align: center;">
                                        <span style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 40px; font-weight: 800; color: #F63B05; letter-spacing: 10px; display: inline-block; padding-left: 10px;">{{ $code }}</span>
                                    </td>
                                </tr>
                            </table>

                            <!-- EXPIRATION WARNING -->
                            <p style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0 0 28px 0; text-align: center;">
                                ⏱️ This code will expire in <strong style="color: #ffffff;">5 minutes</strong>.
                            </p>

                            <!-- SECURITY NOTICE -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #23120b; border-left: 4px solid #F63B05; border-radius: 8px; text-align: left;">
                                <tr>
                                    <td style="padding: 16px 18px;">
                                        <p style="color: #f4f4f5; font-size: 13px; line-height: 1.5; margin: 0;">
                                            <strong style="color: #F63B05;">Security Tip:</strong> Never share this code with anyone. VehiCare support team will never ask for your verification code.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background-color: #0d0d0f; padding: 24px 28px; border-top: 1px solid #27272a; text-align: center;">
                            <p style="color: #a1a1aa; font-size: 12px; line-height: 1.6; margin: 0 0 8px 0;">
                                &copy; {{ date('Y') }} VehiCare. Intelligent Multi-Vehicle Diagnostics & Repair Assistance.
                            </p>
                            <p style="color: #71717a; font-size: 11px; margin: 0;">
                                If you did not request this code, please ignore this email or contact support.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
