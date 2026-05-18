const crypto = require("crypto");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const cmsPassword = process.env.CMS_PASSWORD || "avora-admin";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
};

const sanitizeText = (value, maxLength) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const slugify = (value) =>
  sanitizeText(value, 120)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `item-${Date.now()}`;

const readRequestBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
};

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value),
  );

const isAuthenticated = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.cms_session) return false;

  try {
    // La cookie vendrá en formato: timestamp.firma
    const [timestamp, signature] = cookies.cms_session.split(".");
    if (!timestamp || !signature) return false;

    // Verificar que no haya expirado (ej. 8 horas = 28800000 ms)
    const expires = Number(timestamp) + 28800000;
    if (Date.now() > expires) return false;

    // Recrear la firma para ver si es válida
    const expectedSignature = crypto
      .createHmac("sha256", cmsPassword)
      .update(timestamp)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch (error) {
    return false;
  }
};

const parseJsonBody = async (req) => {
  const rawBody = await readRequestBody(req);
  return rawBody.length ? JSON.parse(rawBody.toString("utf8")) : {};
};

const splitMultipart = (buffer, boundary) => {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(boundaryBuffer);

  while (start !== -1) {
    start += boundaryBuffer.length;

    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;

    const next = buffer.indexOf(boundaryBuffer, start);
    if (next === -1) break;

    let end = next;
    if (buffer[end - 2] === 13 && buffer[end - 1] === 10) end -= 2;
    parts.push(buffer.slice(start, end));
    start = next;
  }

  return parts;
};

const parseMultipart = async (req) => {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(
    req.headers["content-type"] || "",
  );
  if (!match) throw new Error("Falta el limite multipart.");

  const boundary = match[1] || match[2];
  const body = await readRequestBody(req);
  const fields = {};
  const files = {};

  splitMultipart(body, boundary).forEach((part) => {
    const separator = Buffer.from("\r\n\r\n");
    const headerEnd = part.indexOf(separator);
    if (headerEnd === -1) return;

    const headers = part.slice(0, headerEnd).toString("utf8");
    const content = part.slice(headerEnd + separator.length);
    const name = /name="([^"]+)"/i.exec(headers)?.[1];
    if (!name) return;

    const filename = /filename="([^"]*)"/i.exec(headers)?.[1];
    const contentType =
      /Content-Type:\s*([^\r\n]+)/i.exec(headers)?.[1] ||
      "application/octet-stream";

    if (filename) {
      files[name] = { filename, contentType, content };
      return;
    }

    fields[name] = content.toString("utf8").trim();
  });

  return { fields, files };
};

const readProjects = async () => {
  const file = path.join(root, "proyectos.json");
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeProjects = async (projects) => {
  await fsp.writeFile(
    path.join(root, "proyectos.json"),
    `${JSON.stringify(projects, null, 2)}\n`,
  );
};

const readServices = async () => {
  const file = path.join(root, "servicios.json");
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeServices = async (services) => {
  await fsp.writeFile(
    path.join(root, "servicios.json"),
    `${JSON.stringify(services, null, 2)}\n`,
  );
};

const deleteProjectImage = async (imagePath) => {
  if (!imagePath || !imagePath.startsWith("assets/proyectos/")) return;

  const filePath = path.normalize(path.join(root, imagePath));
  const uploadsPath = path.normalize(path.join(root, "assets", "proyectos"));

  if (!filePath.startsWith(uploadsPath)) return;
  await fsp.unlink(filePath).catch(() => {});
};

const buildProjectPayload = async (fields, files, currentProject = null) => {
  const title = sanitizeText(fields.title, 120);
  const type = sanitizeText(fields.type, 120);
  const description = sanitizeText(fields.description, 900);
  const url = sanitizeText(fields.url, 300);
  const linkLabel = sanitizeText(fields.linkLabel, 80) || "Visitar sitio";
  const alt = sanitizeText(fields.alt, 160) || title;
  const category = fields.category === "avora" ? "avora" : "terceros";
  const softBackground = fields.softBackground === "on";

  if (!title || !type || !description || !url) {
    const error = new Error("Completa titulo, tipo, descripcion y enlace.");
    error.statusCode = 400;
    throw error;
  }

  const image = files.image;
  let relativeImagePath = currentProject?.image || "";

  if (image && image.content.length) {
    const allowedTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]);
    if (!allowedTypes.has(image.contentType)) {
      const error = new Error("Usa una imagen PNG, JPG, WEBP o SVG.");
      error.statusCode = 400;
      throw error;
    }

    const extension = path.extname(image.filename).toLowerCase() || ".webp";
    const filename = `${slugify(title)}-${Date.now()}${extension}`;
    relativeImagePath = `assets/proyectos/${filename}`;
    await fsp.mkdir(path.join(root, "assets", "proyectos"), {
      recursive: true,
    });
    await fsp.writeFile(path.join(root, relativeImagePath), image.content);
  }

  if (!relativeImagePath) {
    const error = new Error("Carga una imagen del proyecto.");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: currentProject?.id || slugify(title),
    title,
    type,
    description,
    image: relativeImagePath,
    alt,
    url,
    linkLabel,
    external: /^https?:\/\//i.test(url),
    category,
    softBackground,
  };
};

const listProjects = async (req, res) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para administrar proyectos.",
    });
  }

  return sendJson(res, 200, { projects: await readProjects() });
};

const saveProject = async (req, res) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para guardar proyectos.",
    });
  }

  const { fields, files } = await parseMultipart(req);
  const projects = await readProjects();
  const project = await buildProjectPayload(fields, files);

  projects.unshift(project);
  await writeProjects(projects);

  return sendJson(res, 201, { message: "Proyecto guardado.", project });
};

const updateProject = async (req, res, id) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para editar proyectos.",
    });
  }

  const { fields, files } = await parseMultipart(req);
  const projects = await readProjects();
  const index = projects.findIndex((project) => project.id === id);

  if (index === -1) {
    return sendJson(res, 404, { message: "Proyecto no encontrado." });
  }

  const currentProject = projects[index];
  const project = await buildProjectPayload(fields, files, currentProject);

  if (project.image !== currentProject.image) {
    await deleteProjectImage(currentProject.image);
  }

  projects[index] = { ...currentProject, ...project };
  await writeProjects(projects);

  return sendJson(res, 200, {
    message: "Proyecto actualizado.",
    project: projects[index],
  });
};

const deleteProject = async (req, res, id) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para eliminar proyectos.",
    });
  }

  const projects = await readProjects();
  const index = projects.findIndex((project) => project.id === id);

  if (index === -1) {
    return sendJson(res, 404, { message: "Proyecto no encontrado." });
  }

  const [project] = projects.splice(index, 1);
  await deleteProjectImage(project.image);
  await writeProjects(projects);

  return sendJson(res, 200, { message: "Proyecto eliminado." });
};

const sanitizeList = (value, maxItems = 8, maxLength = 180) => {
  const source = Array.isArray(value) ? value : String(value || "").split("\n");
  return source
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

const buildServicePayload = (body, currentService = null) => {
  const title = sanitizeText(body.title, 120);
  const icon = sanitizeText(body.icon, 80) || "fa-code";
  const category = sanitizeText(body.category, 100);
  const summary = sanitizeText(body.summary, 240);
  const description = sanitizeText(body.description, 1400);
  const highlights = sanitizeList(body.highlights);
  const deliverables = sanitizeList(body.deliverables);
  const tags = sanitizeList(body.tags, 6, 40);
  const animation = sanitizeText(body.animation, 40) || "orbit";
  const featured = Boolean(body.featured);

  if (
    !title ||
    !category ||
    !summary ||
    !description ||
    !highlights.length ||
    !deliverables.length ||
    !tags.length
  ) {
    const error = new Error(
      "Completa titulo, categoria, descripciones, listas y etiquetas.",
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    id: currentService?.id || slugify(title),
    title,
    icon,
    category,
    summary,
    description,
    highlights,
    deliverables,
    tags,
    animation,
    featured,
  };
};

const listServices = async (req, res) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para administrar servicios.",
    });
  }

  return sendJson(res, 200, { services: await readServices() });
};

const saveService = async (req, res) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para guardar servicios.",
    });
  }

  const body = await parseJsonBody(req);
  const services = await readServices();
  const service = buildServicePayload(body);

  services.push(service);
  await writeServices(services);

  return sendJson(res, 201, { message: "Servicio guardado.", service });
};

const updateService = async (req, res, id) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para editar servicios.",
    });
  }

  const body = await parseJsonBody(req);
  const services = await readServices();
  const index = services.findIndex((service) => service.id === id);

  if (index === -1) {
    return sendJson(res, 404, { message: "Servicio no encontrado." });
  }

  const service = buildServicePayload(body, services[index]);
  services[index] = { ...services[index], ...service };
  await writeServices(services);

  return sendJson(res, 200, {
    message: "Servicio actualizado.",
    service: services[index],
  });
};

const deleteService = async (req, res, id) => {
  if (!isAuthenticated(req)) {
    return sendJson(res, 401, {
      message: "Inicia sesion para eliminar servicios.",
    });
  }

  const services = await readServices();
  const index = services.findIndex((service) => service.id === id);

  if (index === -1) {
    return sendJson(res, 404, { message: "Servicio no encontrado." });
  }

  services.splice(index, 1);
  await writeServices(services);

  return sendJson(res, 200, { message: "Servicio eliminado." });
};

const handleLogin = async (req, res) => {
  const body = await parseJsonBody(req);

  if (body.password !== cmsPassword) {
    return sendJson(res, 401, { message: "Acceso invalido." });
  }

  // Creamos un token basado en el tiempo actual firmado criptográficamente
  const timestamp = String(Date.now());
  const signature = crypto
    .createHmac("sha256", cmsPassword)
    .update(timestamp)
    .digest("hex");

  const token = `${timestamp}.${signature}`;

  res.setHeader(
    "Set-Cookie",
    `cms_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800; Secure`,
  );
  return sendJson(res, 200, { message: "Acceso autorizado." });
};

const serveStatic = async (req, res) => {
  const requestUrl = new URL(req.url, `http://${host}:${port}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fsp.readFile(filePath);
    res.writeHead(200, {
      "Content-Type":
        contentTypes[path.extname(filePath).toLowerCase()] ||
        "application/octet-stream",
    });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
};

// Definimos el manejador principal (la lógica que ya tenías)
const cmsHandler = async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${host}:${port}`);
    const projectRoute = /^\/api\/proyectos\/([^/]+)$/.exec(
      requestUrl.pathname,
    );
    const serviceRoute = /^\/api\/servicios\/([^/]+)$/.exec(
      requestUrl.pathname,
    );

    if (req.method === "POST" && requestUrl.pathname === "/api/cms/login") {
      return handleLogin(req, res);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/proyectos") {
      return listProjects(req, res);
    }

    if (req.method === "GET" && requestUrl.pathname === "/api/servicios") {
      return listServices(req, res);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/proyectos") {
      return saveProject(req, res);
    }

    if (req.method === "POST" && requestUrl.pathname === "/api/servicios") {
      return saveService(req, res);
    }

    if (projectRoute && req.method === "PUT") {
      return updateProject(req, res, decodeURIComponent(projectRoute[1]));
    }

    if (serviceRoute && req.method === "PUT") {
      return updateService(req, res, decodeURIComponent(serviceRoute[1]));
    }

    if (projectRoute && req.method === "DELETE") {
      return deleteProject(req, res, decodeURIComponent(projectRoute[1]));
    }

    if (serviceRoute && req.method === "DELETE") {
      return deleteService(req, res, decodeURIComponent(serviceRoute[1]));
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(req, res);
    }

    res.setHeader("Allow", "GET, HEAD, POST");
    return sendJson(res, 405, { message: "Metodo no permitido." });
  } catch (error) {
    console.error(error);
    return sendJson(res, error.statusCode || 500, {
      message: error.message || "No pudimos procesar la solicitud.",
    });
  }
};

// Si NO estás en Vercel (es decir, estás en tu localhost), levanta el servidor normalmente
if (!process.env.VERCEL) {
  const server = http.createServer(cmsHandler);
  server.listen(port, host, () => {
    console.log(`Avora local CMS listo en http://${host}:${port}/`);
    console.log(`Acceso CMS: http://${host}:${port}/cms.html`);
  });
}

// Exportamos el manejador para que Vercel sepa dónde redirigir las peticiones en producción
module.exports = cmsHandler;
