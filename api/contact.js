require("./env");

const https = require("https");

const RESEND_HOST = "api.resend.com";
const RESEND_PATH = "/emails";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";
const DEFAULT_TO_EMAIL = "soporte@avorainc.com";

const json = (res, statusCode, payload) => {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
};

const sanitize = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

const parseBody = async (req) => {
    if (req.body && typeof req.body === "object") {
        return req.body;
    }

    if (typeof req.body === "string") {
        return JSON.parse(req.body || "{}");
    }

    const chunks = [];

    for await (const chunk of req) {
        chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString("utf8");
    return rawBody ? JSON.parse(rawBody) : {};
};

const postResendEmail = (apiKey, payload) =>
    new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const request = https.request(
            {
                hostname: RESEND_HOST,
                path: RESEND_PATH,
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(body),
                },
            },
            (response) => {
                const chunks = [];

                response.on("data", (chunk) => chunks.push(chunk));
                response.on("end", () => {
                    const responseBody = Buffer.concat(chunks).toString("utf8");
                    let data = {};

                    try {
                        data = responseBody ? JSON.parse(responseBody) : {};
                    } catch (error) {
                        data = { message: responseBody };
                    }

                    resolve({
                        ok: response.statusCode >= 200 && response.statusCode < 300,
                        statusCode: response.statusCode,
                        data,
                    });
                });
            }
        );

        request.on("error", reject);
        request.write(body);
        request.end();
    });

const verifyRecaptcha = (secretKey, token, remoteIp) =>
    new Promise((resolve, reject) => {
        const body = new URLSearchParams({
            secret: secretKey,
            response: token,
        });

        if (remoteIp) {
            body.set("remoteip", remoteIp);
        }

        const request = https.request(
            {
                hostname: "www.google.com",
                path: "/recaptcha/api/siteverify",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Content-Length": Buffer.byteLength(body.toString()),
                },
            },
            (response) => {
                const chunks = [];

                response.on("data", (chunk) => chunks.push(chunk));
                response.on("end", () => {
                    try {
                        const data = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        request.on("error", reject);
        request.write(body.toString());
        request.end();
    });

const escapeHtml = (value) =>
    value.replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character];
    });

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return json(res, 405, { message: "Metodo no permitido." });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!apiKey) {
        return json(res, 500, { message: "El formulario no esta configurado todavia." });
    }

    if (!recaptchaSecretKey) {
        return json(res, 500, { message: "La validacion del formulario no esta configurada todavia." });
    }

    let body = {};

    try {
        body = await parseBody(req);
    } catch (error) {
        console.error("Invalid contact form body", error);
        return json(res, 400, { message: "No pudimos leer el formulario. Intenta de nuevo." });
    }

    const nombre = sanitize(body.nombre, 120);
    const email = sanitize(body.email, 180);
    const servicio = sanitize(body.servicio, 160);
    const mensaje = sanitize(body.mensaje, 3000);
    const recaptchaToken = sanitize(
        body.recaptchaToken || body["g-recaptcha-response"],
        4096
    );
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nombre || !emailPattern.test(email) || !mensaje) {
        return json(res, 400, { message: "Revisa tu nombre, email y mensaje." });
    }

    if (!recaptchaToken) {
        return json(res, 400, { message: "Completa el captcha antes de enviar." });
    }

    try {
        const recaptchaResult = await verifyRecaptcha(
            recaptchaSecretKey,
            recaptchaToken,
            req.headers["x-forwarded-for"] || req.socket?.remoteAddress || ""
        );

        if (!recaptchaResult.success) {
            console.error("reCAPTCHA validation failed", recaptchaResult);
            return json(res, 400, { message: "No pudimos validar el captcha. Intenta de nuevo." });
        }
    } catch (error) {
        console.error("reCAPTCHA verification error", error);
        return json(res, 502, { message: "No pudimos validar el captcha. Intenta de nuevo." });
    }

    const to = process.env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
    const subject = `Nueva consulta Avora - ${servicio || "Nuevo proyecto"}`;
    const text = [
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        `Servicio de interes: ${servicio || "No especificado"}`,
        "",
        "Mensaje:",
        mensaje,
    ].join("\n");
    const html = `
        <h2>Nueva consulta desde avorainc.com</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Servicio de interes:</strong> ${escapeHtml(servicio || "No especificado")}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${escapeHtml(mensaje).replace(/\n/g, "<br>")}</p>
    `;

    try {
        const response = await postResendEmail(apiKey, {
            from,
            to,
            reply_to: email,
            subject,
            text,
            html,
        });

        if (!response.ok) {
            console.error("Resend error", response.statusCode, response.data);
            return json(res, 502, { message: "No pudimos enviar tu consulta. Intenta de nuevo." });
        }

        return json(res, 200, { message: "Consulta enviada." });
    } catch (error) {
        console.error("Contact form error", error);
        return json(res, 500, { message: "No pudimos enviar tu consulta. Intenta de nuevo." });
    }
};
