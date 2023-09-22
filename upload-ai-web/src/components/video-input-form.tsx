import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { FileVideo, Upload } from "lucide-react";
import { fetchFile } from "@ffmpeg/util";

import { getFFmpeg } from "@/lib/ffmpeg";
import { api } from "@/lib/axios";

import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

const statusMessages = {
	converting: "Convertendo...",
	uploading: "Transcrevendo...",
	generating: "Carregando...",
	success: "Success!",
};

interface VideoInputFormProps {
	onVideoUploaded: (id: string) => void;
}

export function VideoInputForm(props: VideoInputFormProps) {
	const [videoFile, setVideoFile] = useState<File | null>(null); //<> = generic
	const promptInputRef = useRef<HTMLTextAreaElement>(null);
	const [status, setStatus] = useState<Status>("waiting");

	function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
		const { files } = event.currentTarget;

		if (!files) {
			return;
		}

		const selectedFile = files[0];

		setVideoFile(selectedFile);
	}

	async function convertVideoToAudio(video: File) {
		console.log("Iniciou a conversão");

		const ffmpeg = await getFFmpeg();

		// quando utilizo WebAssembly e como se estive rodando em um container, um ambiente totalmente isolado
		// vou criar um arquivo que o ffmpeg consegue enxergar "input.mp4" tanto faz o nome
		await ffmpeg.writeFile("input.mp4", await fetchFile(video));

		// ffmpeg.on("log", (log) => {
		// 	console.log(log);
		// });

		ffmpeg.on("progress", (progress) => {
			console.log("Convert progress: " + Math.round(progress.progress * 100));
		});
		// cada comando dentro do array vai ser concatenado em um único comando
		await ffmpeg.exec(["-i", "input.mp4", "-map", "0:a", "-b:a", "20k", "-acodec", "libmp3lame", "output.mp3"]);

		const data = await ffmpeg.readFile("output.mp3");

		const audioFileBlob = new Blob([data], { type: "audio/mp3" });

		const audioFile = new File([audioFileBlob], "output.mp3", {
			type: "audio/mpeg",
		});

		console.log("Fim da conversão");
		return audioFile;
	}

	async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		// REF acessa a versão na DOM do elemento
		const prompt = promptInputRef.current?.value;

		if (!videoFile) return;

		setStatus("converting");

		// converter o video em audio
		const audioFile = await convertVideoToAudio(videoFile);

		const data = new FormData();
		data.append("file", audioFile);
		setStatus("uploading");
		const response = await api.post("/videos", data);

		const videoId = response.data.video.id;
		setStatus("generating");
		await api.post(`/videos/${videoId}/transcription`, { prompt });
		setStatus("success");

		props.onVideoUploaded(videoId);
	}

	const previewURL = useMemo(() => {
		if (!videoFile) return null;

		return URL.createObjectURL(videoFile); // cria uma URL de pre visualização de um arquivo
	}, [videoFile]);

	return (
		<form onSubmit={handleUploadVideo} className="space-y-6 ">
			<label
				htmlFor="video"
				className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5">
				{previewURL ? (
					<video src={previewURL} controls={false} className="pointer-events-none absolute inset-0" />
				) : (
					<>
						<FileVideo className="w-4 h-4" />
						Selecione um video
					</>
				)}
			</label>
			{/* mause em cima do onChange podemos ver o tyoe do evento que o função chama */}
			<input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />

			<Separator />

			<div className="space-y-2">
				<Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
				<Textarea
					ref={promptInputRef}
					disabled={status !== "waiting"}
					id="transcription_prompt"
					className="h-20 leading-relaxed resize-none"
					placeholder="Inclua palavras-chave mencionadas no video separadas por virgula (,)"
				/>
			</div>

			<Button data-success={status === "success"} disabled={status !== "waiting"} className="w-full data-[success=true]:bg-emerald-400">
				{status === "waiting" ? (
					<>
						Carregar video
						<Upload className="h-4 w-4 ml-2" />
					</>
				) : (
					statusMessages[status]
				)}
			</Button>
		</form>
	);
}

// O código que você forneceu parece ser uma chamada de função que utiliza a biblioteca ffmpeg para converter um arquivo
// de vídeo no formato MP4 em um arquivo de áudio no formato MP3. Vou explicar cada parte do código:

// await: A palavra-chave await é usada em funções assíncronas do JavaScript para pausar a execução até que uma determinada
// tarefa assíncrona seja concluída. Neste caso, provavelmente, todo o processo de conversão será assíncrono, e await é usado
// para garantir que o programa espere até que a conversão seja concluída antes de continuar.

// ffmpeg.exec: Isso parece ser uma chamada a uma função chamada exec da biblioteca ffmpeg. O ffmpeg é uma ferramenta de linha
// de comando amplamente utilizada para processar e converter arquivos de multimídia.

// ["-i", "input.mp4", "-map", "0:a", "-b:a", "20k", "libmp3lame", "output.mp3"]: Estes são os argumentos passados para o comando
// ffmpeg. Vamos analisá-los um por um:

// -i: Este é um indicador usado para especificar o arquivo de entrada. No exemplo, o arquivo de entrada é chamado "input.mp4".
// Isso significa que o arquivo MP4 chamado "input.mp4" será usado como entrada para o processo de conversão.

// -map 0:a: Isso indica que estamos mapeando o fluxo de áudio do arquivo de entrada (o "0" refere-se ao primeiro fluxo no arquivo
// de entrada) para o próximo filtro ou parâmetro.

// -b:a 20k: Isso define a taxa de bits de áudio para 20k (20.000 bits por segundo). É a taxa de bits de saída para o arquivo MP3
// resultante.

// libmp3lame: Isso é um codec de áudio usado pelo FFmpeg para codificar o áudio em formato MP3. O FFmpeg precisa saber qual codec
// usar, e "libmp3lame" é o codec para MP3.

// output.mp3: Este é o nome do arquivo de saída. O arquivo resultante da conversão será chamado "output.mp3".

// Portanto, o código que você forneceu executa o FFmpeg para converter o arquivo de vídeo "input.mp4" em um arquivo de áudio MP3
// chamado "output.mp3", usando o codec "libmp3lame" e definindo uma taxa de bits de áudio de 20k. O await é usado para garantir que
// a conversão seja concluída antes de continuar a execução do programa.
