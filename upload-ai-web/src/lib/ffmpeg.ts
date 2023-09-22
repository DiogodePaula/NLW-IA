import { FFmpeg } from "@ffmpeg/ffmpeg";
// ?url = carrega o arquivo assincronamente, somente quando for utilizado
import coreURL from "../ffmpeg/ffmpeg-core.js?url";
import wasmURL from "../ffmpeg/ffmpeg-core.wasm?url";
import workerURL from "../ffmpeg/ffmpeg-worker.js?url";

let ffmpeg: FFmpeg | null; // cria um instancia

export async function getFFmpeg() {
	if (ffmpeg) return ffmpeg; // caso ja exista ele reaproveita

	ffmpeg = new FFmpeg(); // caso nao exista recria do zero

	if (!ffmpeg.loaded) {
		await ffmpeg.load({
			coreURL,
			wasmURL,
			workerURL,
		});
	}

	return ffmpeg;
}

// todo esse processo para garantir que o ffmpeg vai ser carregado ja que
// ele e pesadinho cerca de 30 MB
