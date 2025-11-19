const nodemailer = require('nodemailer');
const url = process.env.URL_DEPLOYMENT;
//const url="tu-url-de-despliegue";
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    }
});
//send();
module.exports.enviarEmail = async function (direccion, key, men) {
    const result = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: direccion,
        subject: men,
        text: 'Pulsa aquí para confirmar tu cuenta',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">¡Bienvenido a BaseArch</h2>
                    <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
                        Gracias por registrarte. Para completar tu registro, por favor confirma tu correo electrónico haciendo clic en el botón de abajo:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${url}confirmarUsuario/${direccion}/${key}" 
                           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                                  color: white; padding: 15px 40px; text-decoration: none; border-radius: 12px; 
                                  font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                            Confirmar mi cuenta
                        </a>
                    </div>
                    <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 20px;">
                        Una vez confirmada tu cuenta, podrás iniciar sesión en el sistema.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e8ecef; margin: 20px 0;">
                    <p style="color: #95a5a6; font-size: 12px; text-align: center;">
                        Si no te has registrado en Sistema, por favor ignora este correo.
                    </p>
                </div>
            </div>
        `
    });
}