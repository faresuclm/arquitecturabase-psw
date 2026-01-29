const nodemailer = require('nodemailer');
const config = require('../config/config');
// La inicialización se hace lazy para asegurar que config ya tiene los secretos cargados
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false, // true para 465, false para otros puertos
            auth: {
                user: config.email.user,
                pass: config.email.password,
            }
        });
    }
    return transporter;
}
//send();
module.exports.enviarEmail = async function (direccion, key, men) {
    let url = config.app.urlDeployment;
    if (url && !url.endsWith('/')) {
        url += '/';
    }
    const appName = config.app.name;
    const result = await getTransporter().sendMail({
        from: config.email.from,
        to: direccion,
        subject: men,
        text: 'Pulsa aquí para confirmar tu cuenta',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">¡Bienvenido a ${appName}</h2>
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

module.exports.enviarEmailRecuperacion = async function (direccion, token) {
    let url = config.app.urlDeployment;
    if (url && !url.endsWith('/')) {
        url += '/';
    }
    const appName = config.app.name;
    const result = await getTransporter().sendMail({
        from: config.email.from,
        to: direccion,
        subject: 'Recuperación de contraseña - ' + appName,
        text: 'Pulsa aquí para restablecer tu contraseña',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa; border-radius: 10px;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">🔑 Recuperación de Contraseña</h2>
                    <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
                        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ${appName}.
                    </p>
                    <p style="color: #5a6c7d; font-size: 16px; line-height: 1.6;">
                        Para continuar, haz clic en el siguiente botón:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${url}restablecerPassword/${direccion}/${token}" 
                           style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
                                  color: white; padding: 15px 40px; text-decoration: none; border-radius: 12px; 
                                  font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                            Restablecer mi contraseña
                        </a>
                    </div>
                    <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 20px;">
                        Este enlace expirará en 1 hora por razones de seguridad.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e8ecef; margin: 20px 0;">
                    <p style="color: #95a5a6; font-size: 12px; text-align: center;">
                        Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña no será modificada.
                    </p>
                </div>
            </div>
        `
    });
}
