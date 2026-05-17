const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";
const DEFAULT_TO_EMAIL = "soporte@avorainc.com";

const json = (res, statusCode, payload) => {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
};

const sanitize = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

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

    if (!apiKey) {
        return json(res, 500, { message: "El formulario no esta configurado todavia." });
    }

    const nombre = sanitize(req.body?.nombre, 120);
    const email = sanitize(req.body?.email, 180);
    const servicio = sanitize(req.body?.servicio, 160);
    const mensaje = sanitize(req.body?.mensaje, 3000);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nombre || !emailPattern.test(email) || !mensaje) {
        return json(res, 400, { message: "Revisa tu nombre, email y mensaje." });
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
        const response = await fetch(RESEND_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from,
                to,
                reply_to: email,
                subject,
                text,
                html,
            }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.error("Resend error", result);
            return json(res, 502, { message: "No pudimos enviar tu consulta. Intenta de nuevo." });
        }

        return json(res, 200, { message: "Consulta enviada." });
    } catch (error) {
        console.error("Contact form error", error);
        return json(res, 500, { message: "No pudimos enviar tu consulta. Intenta de nuevo." });
    }
};
