import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from "node:path"; //node: = para identificar que e um modulo interno do node
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
// modulo interno do node: path, fs, crypto, util, stream

// stream formas de ler ou escrever dados aos poucos, assim um arquivo que esta sendo carregado ja vai poder
// ir sendo salvo no banco aos poucos, sem isso o file teria que ser totalmente carregado para depois poder
// ser salvo no banco o que seria muito custoso para memoria ram da maquina.

const pump = promisify(pipeline); // o pipeline usa API mais antiga do node que usa callback, o promisify
// transforma uma função mais antiga do node para poder usar Promises async/await

import { prisma } from "../lib/prisma";

export async function uploadVideoRoute(app: FastifyInstance) {
	app.register(fastifyMultipart, {
		limits: {
			fileSize: 1_048_576 * 25, //25MB
		},
	});

	app.post("/videos", async (req, reply) => {
		const data = await req.file();

		if (!data) {
			return reply.status(400).send({ error: "Missing file input" });
		}

		const extension = path.extname(data.filename);

		if (extension !== ".mp3") {
			return reply.status(400).send({ error: "Invalid input type, please upload a MP3." });
		}

		const fileBaseName = path.basename(data.filename, extension); // retorna o nome do arquivo sem a extensão
		const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`; // gerando nomes únicos para os arquivos
		const uploadDestination = path.resolve(__dirname, "../../tmp", fileUploadName);

		await pump(data.file, fs.createWriteStream(uploadDestination)); // primeiro parâmetro recebe o arquivo aos
		// poucos (stream), o segundo vai escrevendo ele aos poucos conforme ele vai chegando

		const video = await prisma.video.create({
			data: {
				name: data.filename,
				path: uploadDestination,
			},
		});

		return { video };
	});
}
