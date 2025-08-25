const song = '/public/slip.mp3'; 

//@ts-ignore
window.AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext();

const decodeAudio = async (url: string) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return audioBuffer;
};

const url = song;
const decodedAudio = await decodeAudio(url);

const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const data = new Uint8Array(analyser.frequencyBinCount);

const source = audioContext.createBufferSource();
source.buffer = decodedAudio;

source.connect(analyser);
analyser.connect(audioContext.destination);

// visualization

const canvas = document.getElementById("visualizer")! as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function draw() {
    canvas.width = window.innerWidth < 1000 ? 320 : 640;

    ctx.fillStyle = `#001131`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    analyser.getByteFrequencyData(data)

    ctx.strokeStyle = `#1A55C3`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);

    for (let i = 0; i < data.length; i++) {
        const value = data[i] / 1024

        const y = canvas.height - canvas.height * value;

        ctx.lineTo(i, y);
    }

    ctx.stroke();
    requestAnimationFrame(draw);
}

draw();

//play button
document.getElementById("play")!.onclick = () => {
    source.start();
};